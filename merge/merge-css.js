const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const fetch = require('node-fetch');

// Check whether to hide original CSS comments
const hideComments = process.env.HIDE_COMMENTS === 'true';
console.log(`Hiding CSS comments from fetched files: ${hideComments}`);

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

(async () => {
  try {
    // Load and parse the manifest file from the same folder as this script
    const manifestPath = path.join(__dirname, 'css_manifest.yml');
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    const manifestData = yaml.load(manifestContent);

    // Extract metadata and snippet entries
    const metadata = manifestData.metadata || {};
    let snippets = manifestData.snippets;
    if (!Array.isArray(snippets)) {
      throw new Error('Manifest "snippets" must be an array of entries.');
    }

    // Get output file name from metadata; default to combined.css if not provided.
    let outputFile = metadata.output || 'combined.css';
    console.log(`Output file set to: ${outputFile}`);

    // If the outputFile is absolute, convert it to a relative path based on the repository root
    if (path.isAbsolute(outputFile)) {
      outputFile = path.join(process.cwd(), outputFile);
      console.log(`Converted absolute path to: ${outputFile}`);
    }

    // Ensure the output directory exists, if a path is specified
    const outputDir = path.dirname(outputFile);
    if (outputDir !== '.' && !fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`Created directory: ${outputDir}`);
    }

    // Sort the snippets by the "order" field
    snippets.sort((a, b) => a.order - b.order);

    let mergedCSS = '';

    // Prepend metadata as a JSDoc-style comment block
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

    // Process each snippet entry
    for (const entry of snippets) {
      // Construct raw URL: https://raw.githubusercontent.com/<repo>/<branch>/<css_path>
      const rawUrl = `https://raw.githubusercontent.com/${entry.repo}/${entry.branch}/${entry.css_path}`;
      const cssContentOriginal = await fetchCSS(rawUrl);
      if (cssContentOriginal !== null) {
        let cssContent = cssContentOriginal;
        if (hideComments) {
          // Remove all CSS comments (naively, all /* ... */)
          cssContent = cssContent.replace(/\/\*[\s\S]*?\*\//g, '');
        }
        mergedCSS += `\n/* Begin ${entry.repo}/${entry.css_path} */\n`;
        mergedCSS += cssContent;
        mergedCSS += `\n/* End ${entry.repo} */\n`;
      } else {
        console.warn(`Skipping ${rawUrl} due to fetch error.`);
      }
    }

    // Dry-run mode: log the result without writing to disk
    const isDryRun = process.env.DRY_RUN === 'true';
    if (isDryRun) {
      console.log('Dry run mode - merged CSS content:');
      console.log(mergedCSS);
    } else {
      fs.writeFileSync(outputFile, mergedCSS, 'utf8');
      console.log(`Combined CSS file "${outputFile}" created/updated successfully.`);
    }
  } catch (err) {
    console.error(`Error during CSS merge process: ${err.message}`);
    process.exit(1);
  }
})();
