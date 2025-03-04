const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const fetch = require('node-fetch');

// Global flag to hide CSS comments (set via env)
const hideComments = process.env.HIDE_COMMENTS === 'true';
console.log(`Hiding CSS comments from fetched files: ${hideComments}`);

// In-memory cache for fetched URLs to avoid duplicate network calls
const fetchCache = new Map();

// Helper function to fetch CSS from a URL
async function fetchCSS(url) {
  console.log(`Fetching ${url}`);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
    }
    return await res.text();
  } catch (error) {
    console.error(`Error fetching ${url}: ${error.message}`);
    return null;
  }
}

// Fetch with retry and caching
async function fetchCSSWithRetry(url, retries = 3) {
  if (fetchCache.has(url)) {
    return fetchCache.get(url);
  }
  let result = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      result = await fetchCSS(url);
      if (result !== null) {
        fetchCache.set(url, result);
        return result;
      }
    } catch (err) {
      console.error(`Error fetching ${url} on attempt ${attempt}: ${err.message}`);
    }
    console.warn(`Attempt ${attempt} for ${url} failed.`);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  console.error(`All ${retries} attempts failed for ${url}.`);
  fetchCache.set(url, ''); // Cache empty result so we don't retry in the same run
  return '';
}

// A simple CSS minifier (basic implementation)
function minifyCSS(css) {
  return css
  .replace(/\n/g, ' ')    // Remove newlines
  .replace(/\s+/g, ' ')    // Collapse whitespace
  .trim();
}

// Process a snippet entry into an array of source objects
function processSnippet(snippet) {
  const results = [];
  if (snippet.url) {
    // Direct URL snippet
    results.push({
      url: snippet.url,
      order: snippet.order || 0
    });
  } else if (snippet.repo) {
    // Default branch to "main" if not provided
    const branch = snippet.branch || "main";
    if (snippet.sources && Array.isArray(snippet.sources)) {
      snippet.sources.forEach(source => {
        results.push({
          url: `https://raw.githubusercontent.com/${snippet.repo}/${branch}/${source.css_path}`,
          order: source.order || 0
        });
      });
    }
  }
  return results;
}

(async () => {
  try {
    // Directory containing individual config files (one per output bundle)
    const configDir = path.join(__dirname, 'config');
    const files = fs.readdirSync(configDir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));

    for (const file of files) {
      const configPath = path.join(configDir, file);
      console.log(`Processing config: ${configPath}`);
      const configContent = fs.readFileSync(configPath, 'utf8');
      const configData = yaml.load(configContent);

      const metadata = configData.metadata || {};
      const outputFile = metadata.output || 'combined.css';
      // Resolve outputFile: if absolute, convert to repo-root relative path
      let resolvedOutput = outputFile;
      if (path.isAbsolute(outputFile)) {
        resolvedOutput = path.join(process.cwd(), outputFile.substring(1));
      } else {
        resolvedOutput = path.join(process.cwd(), outputFile);
      }
      console.log(`Output file set to: ${resolvedOutput}`);

      // Gather all source objects from snippets
      let allSources = [];
      if (Array.isArray(configData.snippets)) {
        configData.snippets.forEach(snippet => {
          allSources = allSources.concat(processSnippet(snippet));
        });
      }
      // Add an index to each source to maintain stable order for duplicates
      allSources = allSources.map((source, index) => ({ ...source, index }));
      // Stable sort: by order first, then by original index
      allSources.sort((a, b) => (a.order - b.order) || (a.index - b.index));

      // Parallel fetching: fetch all sources concurrently
      const fetchedResults = await Promise.all(
        allSources.map(async (source) => {
          const cssContentOriginal = await fetchCSSWithRetry(source.url);
          let cssContent = cssContentOriginal || '';
          if (hideComments) {
            cssContent = cssContent.replace(/\/\*[\s\S]*?\*\//g, '');
          }
          return {
            order: source.order,
            url: source.url,
            cssContent: cssContent,
            index: source.index
          };
        })
      );

      // Re-sort the fetched results to ensure the intended order
      fetchedResults.sort((a, b) => (a.order - b.order) || (a.index - b.index));
      let mergedCSS = '';

      // Prepend metadata header in JSDoc style
      if (metadata && Object.keys(metadata).length > 0) {
        mergedCSS += `/**\n`;
        if (metadata.name) mergedCSS += ` * @name ${metadata.name}\n`;
        if (metadata.description) mergedCSS += ` * @description ${metadata.description}\n`;
        if (metadata.author) mergedCSS += ` * @author ${metadata.author}\n`;
        if (metadata.authorId) mergedCSS += ` * @authorId ${metadata.authorId}\n`;
        if (metadata.source) mergedCSS += ` * @source ${metadata.source}\n`;
        if (metadata.version) mergedCSS += ` * @version ${metadata.version}\n`;
        if (metadata.website) mergedCSS += ` * @website ${metadata.website}\n`;
        if (metadata.invite) mergedCSS += ` * @invite ${metadata.invite}\n`;
        if (metadata.tags && Array.isArray(metadata.tags)) {
          mergedCSS += ` * @tags ${metadata.tags.join(', ')}\n`;
        }
        mergedCSS += ` */\n\n`;
      }

      // Append each fetched source's content in order
      for (const fetched of fetchedResults) {
        mergedCSS += `\n/* Begin ${fetched.url} */\n`;
        mergedCSS += fetched.cssContent;
        mergedCSS += `\n/* End ${fetched.url} */\n`;
      }

      // If minification is enabled, process accordingly.
      if (metadata.minify === true) {
        console.log("Minifying merged CSS as per config flag.");
        let preserveMetadata = true;
        if (metadata.hasOwnProperty('preserve_metadata') && metadata.preserve_metadata === false) {
          preserveMetadata = false;
        }
        if (preserveMetadata) {
          // Locate the end of the metadata header (first occurrence of "*/")
          const headerEndIndex = mergedCSS.indexOf('*/');
          if (headerEndIndex !== -1) {
            const header = mergedCSS.substring(0, headerEndIndex + 2);
            const cssToMinify = mergedCSS.substring(headerEndIndex + 2);
            mergedCSS = header + minifyCSS(cssToMinify);
          } else {
            mergedCSS = minifyCSS(mergedCSS);
          }
        } else {
          mergedCSS = minifyCSS(mergedCSS);
        }
      }

      // Ensure the output directory exists
      const outDir = path.dirname(resolvedOutput);
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
        console.log(`Created directory: ${outDir}`);
      }

      // Write the merged CSS to the output file
      fs.writeFileSync(resolvedOutput, mergedCSS, 'utf8');
      console.log(`Combined CSS file "${resolvedOutput}" created/updated successfully.`);
    }
  } catch (err) {
    console.error(`Error during CSS merge process: ${err.message}`);
    process.exit(1);
  }
})();
