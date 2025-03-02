Portions of this codebase were LLM generated.

# Discord CSS Merge
A tool to merge specified GitHub hosted CSS scripts together to help with performance and loading time

## Docs

### [css_manifest.yml](./merge/css_manifest.yml)
The base config file for the merger tool.
#### Metadata
Metadata tags for displaying extra info for those using GUI tools to add.


Adding the output CSS file to your QuickCSS (QCSS) via raw or import will **NOT** show this information.


The structure goes as follows:


```
metadata:
  output:
  name:
  description:
  author:
  authorId:
  source:
  version:
  website:
  invite:
  tags:
```


- `metadata`:    The parent node specifying the below values are for metadata
- `output`:      File output, compatible with specifying path
- `name`:        Visible to "Online Theme" users only. The displayed name of the CSS theme
- `description`: Visible to "Online Theme" users only. The displayed description of the CSS theme
- `author`:      Visible to "Online Theme" users only. The displayed author of the CSS theme
- `authorId`:    Visible to "Online Theme" users only. The displayed user of the CSS theme
- `source`:      Visible to "Online Theme" users only. The URL to the source code
- `version`:     Visible to "Online Theme" users only. The displayed version
- `website`:     Visible to "Online Theme" users only. The URL to the website of the author's choice
- `invite`:      Visible to "Online Theme" users only. The URL invite to a Discord server of the author's choice
- `tags`:        Visible to "Theme Library" users only. The tags displayed on the Theme Library plugin and on [discord-themes.com](https://discord-themes.com)


##### Example Config

```
metadata:
  name: Anebix Main CSS
  output: /css/anebix-main.css
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
```


#### Snippets
Snippets to add to merge into the final output file.


Currently only working with GitHub.


The structure goes as follows:



```
snippets:
  - repo:
    branch:
    css_path:
    order:
```


- `snippets`: The parent node specifying the below values are for snippets to merge
- `- repo`:   The GitHub repository that the file to merge from is in
- `branch`:   The branch in the repository to get the file from
- `css_path`: The path of the CSS file you want to merge from
- `order`:    The order of the snippet, being able to raise and lower where it is in the merged list

##### Example Config

```
snippets:
  - repo: anebix-world/test
    branch: main
    css_path: css/discord-css-merge.css
    order: 1
  - repo: anebix-world/test
    branch: main
    css_path: css/discord-css-merge2.css
    order: 2
```


Of course you can add as many as you want.

## Contributing
Please feel free to make any edits or improvements and submit issues or pull requests
