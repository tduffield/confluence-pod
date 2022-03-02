import {
  NoteUtils,
} from "@dendronhq/common-all";

import {
  PublishPodConfig,
  PublishPodPlantOpts,
  PublishPod,
  JSONSchemaType,
  PodUtils,
} from "@dendronhq/pods-core";

import * as path from "path";

import {
  ConfluenceAPI,
} from "./confluenceApi";

import {
  MDUtilsV5,
  ProcFlavor,
} from "@dendronhq/engine-server";

import { confluence } from './remark/confluence';

export type ConfluenceConfig = PublishPodConfig & {
  username: string;
  password: string;
  baseUrl: string;
  space: string;
  parentPageId: string;
};

const CONFLUNCE_IMG_REGEX = /\!(.+?)\!/g

class ConfluencePod extends PublishPod<ConfluenceConfig> {
  static id: string = "dendron.confluence";
  static description: string = "publish note(s) to Atlassian Confluence";

  get config() :JSONSchemaType<ConfluenceConfig> {
    return PodUtils.createPublishConfig({
      required: ["username", "password", "baseUrl", "space", "parentPageId"],
      properties: {
        username: {
          type: "string",
          description: "confluence username (typically an email)",
        },
        password: {
          type: "string",
          description: "confluence password (typically an API key)",
        },
        baseUrl: {
          type: "string",
          description: "the base URL for your confluence installation",
        },
        space: {
          type: "string",
          description: "the name of the space where pages should be uploaded",
        },
        parentPageId: {
          type: "string",
          description: "the ID for the page all notes should be nested under",
        },
      },
    }) as JSONSchemaType<ConfluenceConfig>;
  }

  async plant(opts: PublishPodPlantOpts) {
    const { config, engine, note } = opts;

    const proc = MDUtilsV5.procRehypeFull(
      {
        engine,
        fname: note.fname,
        vault: note.vault,
        // force "single note" behavior
        insideNoteRef: true,
        publishOpts: {
          insertTitle: false
        }
      },
      { flavor: ProcFlavor.REGULAR }
    );
    proc.use(confluence);
    const content = await proc.process(NoteUtils.serialize(note));
    const contentString = content.toString();

    const confluenceApi: ConfluenceAPI = new ConfluenceAPI({ podConfig: config });

    if (!note.custom?.pageId) {
      const newPage = await confluenceApi.createPage();

      note.custom.pageId = newPage.id;
      await engine.writeNote(note, { updateExisting: true });
    }

    const page = await confluenceApi.getPage({ pageId: note.custom?.pageId });

    this.extractAttachments(contentString).forEach(async(attachment) => {
      await confluenceApi.uploadAttachment({
        pageId: page.id,
        title: attachment,
        fsPath: path.join(engine.wsRoot, note.vault.fsPath, attachment),
      });
    });

    const updatedPage: any = await confluenceApi.updatePage({
      pageId: page.id,
      version: (page.version.number + 1),
      title: note.title,
      content: contentString,
    })

    return updatedPage;
  }

  /**
   * Pull out references to all the assets that need to be uploaded as attachments
   */
  extractAttachments(content: string): string[] {
    return (content.match(CONFLUNCE_IMG_REGEX) || [])
      .map((image: string) => image.replace(CONFLUNCE_IMG_REGEX, "$1"))
      .filter((image: string) => !image.startsWith("http"))
  }
}

export const pods = [ConfluencePod];
