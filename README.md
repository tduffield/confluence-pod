# confluence-pod
A Dendron pod to publish notes to your personal Confluence space.

## Disclaimer
This is very much a work-in-progress. I have only tested this pod with a very limited subset of my own notes, so there  are a few limitations and probably tons of edge cases that I'm not taking into account. I'm also relatively new to NodeJS development, so this project is probably poorly managed (also there are no tests).

### Limitations
* I'm currently using the "native" HTML processor (with a few tweaks). However, Confluence can be picky about what you give it. As such, there are a few limitations on how this pod can be used at the moment.
  * Published page will not include the Children or Backlink sections (I strip them out)
* Right now I've only tested publishling a single note via the CLI. I don't currently respect any heirarchy, so all notes are published as children of your `parentPageId`.
* I've only tested on the Confluence Cloud. I have no idea if this will work on an onprem installation.

### Confluence Storage Format Support
I'm doing my best to add support for Atlassian's [Storage Format](https://confluence.atlassian.com/doc/confluence-storage-format-790796544.html). Since it's largely based on HTML, the native Remark HTML parser that comes with Dendron should get us 95% of the way there. Over time I'll try and expand my custom processor to leverage the storage format where possible.

Format Type | Status
--- | ---
Task Lists | To Do
Link to Another Confluence Page | Complete (see Cross-note Links)
Attached Image | Complete
External Image | Complete
Image Attributes | To Do

### Behavior
#### Cross-note Links
You can include links to other notes. If that note is also published (e.g., the node frontmatter has a pageId), this pod _should_ properly create the `<ac:link>`. Otherwise, we leave the default `<a>` link which gets stripped out by Confluence, leaving just the text.
#### Image Attachments
I will upload any referenced images from `./assets` as attachments and convert the `<img>` element to `<ac:image>`.

#### Info Block
If you set `includeNote` in your config to `true`, this plugin will prepend an info block to the top of your page indicating that this note was exported from Dendron and that changes made to the page directly may be overwritten. On a personal note, I added this functionality when I had a co-worker get mad that changes he made got overwritten.

## Installation

I'm not publishing to NPM yet, so you'll need to check out this repository locally.

```bash
~/code $ git clone https://github.com/tduffield/confluence-pod.git
```

Next, you'll need to follow the symlink instructions to symlink the pod into your workspace.

```bash
~/code/confluence-pod $ npm install
~/code/confluence-pod $ npm link
~/Dendron $ npm link confluence-pod
```

Create the Pod configuration file in `./pods/dendron.confluence/config.yml`. You'll need to create an [API Token](https://id.atlassian.com/manage/api-tokens) to use as your password and put it in plain text in the config file. You can find the `space` and `parentPageId` variables in the URL of the appropriate pages.
```yaml
username: <your_email>
password: <your_api_key>
baseUrl: https://<your_organization>.atlassian.net
space: "~012345678" # e.g., "~[0-9]{9}" for your personal space
parentPageId: "0123456789" # e.g., "[0-9]{10}"
includeNote: false
```

At this point, you should be able to publish a note via the Dendron CLI.

```bash
~/Dendron $ dendron publishPod \
  --wsRoot . \
  --vault vault \
  --podId dendron.confluence \
  --podPkg confluence-pod \
  --podSource custom \
  --configPath './pods/dendron.confluence/config.yml' \
  --query '<YOUR_NOTE>'
```

## Config Options
Option | Description | Default
--- | --- | ---
username | The username you use to log in to Confluence (typically your email) | required
password | An [API Token](https://id.atlassian.com/manage/api-tokens) you generated | required
baseUrl | The domain root for your Confluence installation | required
space | The reference to the space where you want to upload | required
parentPageId | The page under which all pages are published | nil
includeNote | Whether or not to include an info panel at the top of the page indicating the page is exported from Dendron | false

## Debugging
The most likely bug you'll run into once you get things working is `com.atlassian.confluence.api.service.exceptions.BadRequestException: Content body cannot be converted to new editor format`. This means that there's something in the HTML that Confluence doesn't like. This means that there's probably an edge case that I haven't caught (apologies).
