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
    let manifest = yaml.load(manifestContent);
    if (!Array.isArray(manifest)) {
      throw new Error('Manifest must be an array of entries.');
    }

    // Sort the manifest by the "order" field
    manifest.sort((a, b) => a.order - b.order);
    let mergedCSS = '';

    // Process each entry in the manifest
    for (const entry of manifest) {
      // Construct raw URL: https://raw.githubusercontent.com/<repo>/<branch>/<css_path>
      const rawUrl = `https://raw.githubusercontent.com/${entry.repo}/${entry.branch}/${entry.css_path}`;
      const cssContentOriginal = await fetchCSS(rawUrl);
      if (cssContentOriginal !== null) {
        let cssContent = cssContentOriginal;
        if (hideComments) {
          // Remove comments from the fetched CSS content (naively removes all /*...*/)
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
