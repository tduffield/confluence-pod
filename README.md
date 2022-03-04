# confluence-pod
A [V1 Dendron Pod](https://wiki.dendron.so/notes/66727a39-d0a7-449b-a10d-f6c438185d7f/) to publish notes to your personal Confluence space.

## Installation

```bash
cd {workspace}
{workspace} $ npm init -y
{workspace} $ npm install --global dendron-cli
{workspace} $ npm install --save @tomduffield/confluence-pod
```

### Install From Source
```bash
~/code $ git clone https://github.com/tduffield/confluence-pod.git
~/code/confluence-pod $ yarn install
~/code/confluence-pod $ npm link
{workspace} $ npm init -y
{workspace} $ npm install --global dendron-cli
{workspace} $ npm link confluence-pod
```
## Usage

```bash
cd {workspace}
dendron publishPod \
  --wsRoot . \
  --vault vault \
  --podId dendron.confluence \
  --podPkg confluence-pod \
  --podSource custom \
  --configPath './pods/dendron.confluence/config.yml' \
  --query '<YOUR_NOTE>'
```

### Bash Helper
You can copy and paste this function into your shell profile (e.g., `~/.bashrc`) to give yourself a nifty helper. Just replace `{workspace}` with the fully-qualified path to your Dendron workspace. You can also replace the fallback `vault` value to whatever your default vault might be.

```bash
function publish-note-to-confluence() {
  query="$1"
  vault="${2:-vault}"
  workspace="{workspace}"
  dendron-cli publishPod --wsRoot "$workspace" --vault "$vault" \
    --podId dendron.confluence --podPkg confluence-pod --podSource custom \
    --configPath "${workspace}/pods/dendron.confluence/config.yml" \
    --query "$query"
}
```

## Configuration

Create the Pod configuration file in `./pods/dendron.confluence/config.yml`.

```yaml
username: <your_email>
password: <your_api_key>
baseUrl: https://<your_organization>.atlassian.net
space: "~012345678" # e.g., "~[0-9]{9}"
parentPageId: "0123456789" # e.g., "[0-9]{10}"
includeNote: false
```

Option | Description | Default
--- | --- | ---
username | The username you use to log in to Confluence (typically your email) | _required_
password | An [API Token](https://id.atlassian.com/manage/api-tokens) you generated | _required_
baseUrl | The domain root for your Confluence installation | _required_
space | The reference to the space where you want to upload | _required_
parentPageId | The page under which all pages are published | None: uploads directly to the space.
includeNote | Whether or not to include an info panel at the top of the page indicating the page is exported from Dendron | `false`

## Confluence Storage Format Support
Atlassian Confluence's [Storage Format](https://confluence.atlassian.com/doc/confluence-storage-format-790796544.html) is XHTML based, which means that Dendron's built-in HTML processor gets us 95% of the way there. Where there are exceptions, this Pod leverages a custom unified plugin to re-process the HTML appropriately.

Format Type | Status
--- | ---
Basic HTML | ✅
Task Lists | 🚧
Link to Another Confluence Page | ✅
Attached Image | ✅
External Image | ✅
Image Attributes | 🚧

## Limitations
* Exported notes do not include the Children or Backlink sections. _This is something we'd like to support in the future however._
* All notes are published as children pages to your `parentPageId`. We do re-create your hierarchy.
* This pod has only been tested on the Confluence Cloud.

## Features
### Cross-note Links
If you include a reference to another note that is also published to Confluence (i.e., the note has a `pageId` in its frontmatter), then this pod _should_ properly create an `<ac:link>` to that page. Otherwise, this pod will leave the the `<a>` tag alone and it _should_ get stripped out by Confluence (leaving just the text).

### Image Attachments
This pod will upload any referenced images from `./assets` as attachments and convert the `<img>` element to `<ac:image>`.

### Info Block
If you set `includeNote` in your config to `true`, this pod will prepend an info block to the top of your page indicating that this note was exported from Dendron and that changes made to the page directly may be overwritten.

## Debugging
The most likely bug you'll run into once you get things working is `com.atlassian.confluence.api.service.exceptions.BadRequestException: Content body cannot be converted to new editor format`. This means that there's something in the HTML that Confluence doesn't like. This means that there's probably an edge case that I haven't caught (apologies).
