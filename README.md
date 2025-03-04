# Discord CSS Merge

A tool to merge specified GitHub‑hosted CSS scripts (or any CSS URLs) together to help with performance and loading time.

*Portions of this codebase were LLM generated.*

## Overview

Before using, set up a [Personal Access Token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens) (a Fine‑Grained PAT is best) and add it as a [secret](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions) to your repository under the name `GH_PAT`.

This project now supports multiple configuration files—one per output CSS bundle. Each configuration file lives in the `/merge/config` folder and defines its own metadata and snippets. The merge script will process every config file in that folder, producing a separate merged CSS file for each.

## Repository Structure

```
/merge
  merge-css.js         # The merge script that processes config files and merges CSS.
  /config              # Folder for individual configuration files.
    anebix-main.yml    # Example config file for one merged CSS bundle.
    second.yml         # Another config file for a separate CSS bundle.
  
/.github/workflows
  merge-css.yml        # The GitHub Actions workflow file.
```

## Configuration Files

Each configuration file in `/merge/config` describes one merged CSS bundle. The file is written in YAML and consists of two main parts: **metadata** and **snippets**.

### Metadata

The `metadata` block provides extra information about the CSS bundle. Note that when users import your output CSS (via raw URLs or `@import`), this metadata is not included in the final CSS—they only see it in GUI tools or documentation.

The structure is as follows:

```yaml
metadata:
  output: <file output path>      # e.g. "test/anebix-main.css" (relative) or "/test/anebix-main.css" (absolute, will be converted to repo-root)
  name: <Theme Name>              # Displayed to "Online Theme" users only.
  description: <Description>      # Displayed to "Online Theme" users only.
  author: <Author Name>
  authorId: <Author ID>
  source: <Source Code URL>
  version: <Version>
  website: <Website URL>
  invite: <Discord Invite URL>
  tags:                           # List of tags shown in the Theme Library.
    - tag1
    - tag2
  minify: <true/false>            # Optional flag to minify the merged output (default is false).
```

**Example:**

```yaml
metadata:
  name: Anebix Main CSS
  output: /test/anebix-main.css
  description: All of the CSS ever needed, all in one package.
  author: Anebix
  authorId: "1249116126139519009"
  source: https://github.com/anebix-world/discord-css
  version: "0.0.1"
  website: https://github.com/anebix-world
  invite: vpQtzES4sn
  tags:
    - theme
    - custom
  minify: true
```

### Snippets

The `snippets` block specifies the CSS sources to merge. There are two supported types:

1. **Repo‑Based Snippets:**  
   These fetch CSS files from GitHub repositories. You can list multiple sources from one repo by using a nested `sources` list. If no branch is specified, it defaults to `"main"`.

2. **Direct URL Snippets:**  
   Use the `url` key to specify any CSS file from anywhere.

The structure for repo‑based snippets:

```yaml
snippets:
  - repo: <repository in owner/repo format>
    branch: <branch>           # Optional; defaults to "main" if omitted.
    sources:
      - css_path: <path to CSS file>
        order: <order number>
      - css_path: <another path>
        order: <order number>
```

And for direct URL snippets:

```yaml
snippets:
  - url: "https://example.com/some.css"
    order: <order number>
```

**Example (combining multiple sources):**

```yaml
snippets:
  - repo: anebix-world/discord-css
    branch: main
    sources:
      - css_path: css/anebix-tweaks.css
        order: 1
      - css_path: css/toggleable/add-servers-mentionedfirst.css
        order: 2
  - url: "https://example.com/another.css"
    order: 3
```

## How It Works

- **Multiple Config Files:**  
  Each YAML file under `/merge/config` represents one merged CSS output. The merge script (`merge-css.js`) reads every config file in this folder, processes its metadata and snippets, and writes the merged content to the file specified in `metadata.output`.

- **Flexible Sources:**  
  You can mix repo‑based snippets (with multiple sources from one repository) and direct URLs. For repo snippets, if you omit the `branch`, `"main"` is assumed.

- **Output Path:**  
  The `output` value in the metadata may include a directory path. The merge script will create the directory if it doesn’t exist.

- **Minification:**  
  If `minify: true` is set in the metadata, the merged CSS output will be minified using a basic minification routine.

- **Parallel Fetching with Retry & Caching:**  
  CSS sources are fetched concurrently with retries (up to 3 attempts per source) and cached in-memory during the run, reducing network calls and speeding up the process.

- **Stable Ordering:**  
  Sources are sorted by their `order` value; if multiple sources share the same order, the one that appears first in the config file (preserved by an internal index) is processed first.

## GitHub Actions Workflow

The workflow file (located at `.github/workflows/merge-css.yml`) is set up to run:
- On a repository dispatch event (e.g., from external triggers),
- On a scheduled basis (midnight, 06:00, 12:00, and 18:00 UTC),
- When a config file in `/merge/config` is updated, and
- Manually via the "Run workflow" button.

## Contributing

Feel free to make any edits or improvements and submit issues or pull requests.
