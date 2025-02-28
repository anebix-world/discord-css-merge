const fs = require('fs');
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
    // Load and parse the manifest file
    const manifestContent = fs.readFileSync('css_manifest.yml', 'utf8');
    const manifestData = yaml.load(manifestContent);

    // Get metadata and snippets
    const metadata = manifestData.metadata || {};
    let snippets = manifestData.snippets;
    if (!Array.isArray(snippets)) {
      throw new Error('Manifest "snippets" must be an array of entries.');
    }

    // Sort the snippets by the "order" field
    snippets.sort((a, b) => a.order - b.order);

    let mergedCSS = '';

    // Prepend metadata as a comment block if available
    if (metadata && Object.keys(metadata).length > 0) {
      mergedCSS += `/*\n`;
      if (metadata.name) mergedCSS += ` * ${metadata.name}`;
      if (metadata.version) mergedCSS += ` v${metadata.version}`;
      mergedCSS += `\n`;
      if (metadata.description) mergedCSS += ` * ${metadata.description}\n`;
      if (metadata.author) mergedCSS += ` * Author: ${metadata.author}\n`;
      if (metadata.source) mergedCSS += ` * Source: ${metadata.source}\n`;
      if (metadata.website) mergedCSS += ` * Website: ${metadata.website}\n`;
      if (metadata.invite) mergedCSS += ` * Invite: ${metadata.invite}\n`;
      if (metadata.tags) mergedCSS += ` * Tags: ${metadata.tags.join(', ')}\n`;
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
          // Remove CSS comments (naively, all /* ... */)
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
      fs.writeFileSync('anebix-main.css', mergedCSS, 'utf8');
      console.log('Combined CSS file "anebix-main.css" created/updated successfully.');
    }
  } catch (err) {
    console.error(`Error during CSS merge process: ${err.message}`);
    process.exit(1);
  }
})();
