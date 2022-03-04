# confluence-pod
A Dendron pod to publish notes to your personal Confluence space.

## Disclaimer
This is very much a work-in-progress. I have only tested this pod with a very limited subset of my own notes, so there  are a few limitations and probably tons of edge cases that I'm not taking into account. I'm also relatively new to NodeJS development, so this project is probably poorly managed (also there are no tests).

### Limitations
* I'm currently using the "native" HTML processor (with a few tweaks). However, Confluence will not let you include links to non-existent pages.  As such, there are a few limitations on how this pod can be used at the moment.
  * Notes cannot contain references to other notes (Confluence will throw a 400 saying it can't parse the body).
  * Published page will not include the Children or Backlink sections (I strip them out)
* Right now I've only tested publishling a single note via the CLI. I don't currently respect any heirarchy, so all notes are published as children of your `parentPageId`.
* I've only tested on the Confluence Cloud. I have no idea if this will work on an onprem installation.

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

## Debugging
The most likely bug you'll run into once you get things working is `com.atlassian.confluence.api.service.exceptions.BadRequestException: Content body cannot be converted to new editor format`. This means that there's something in the HTML that Confluence doesn't like. This means that there's probably an edge case that I haven't caught (apologies).
