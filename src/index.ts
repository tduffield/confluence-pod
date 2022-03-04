import {
  PublishPodConfig,
  PublishPodPlantOpts,
  PublishPod,
  JSONSchemaType,
  PodUtils,
} from "@dendronhq/pods-core";

import * as path from "path";
import { NoteUtils } from "@dendronhq/common-all";
import { MDUtilsV5, ProcFlavor } from "@dendronhq/engine-server";
import { ConfluenceAPI } from "./confluence-api";
import { confluence } from "./confluence-remark";

export type ConfluenceConfig = PublishPodConfig & {
  username: string;
  password: string;
  baseUrl: string;
  space: string;
  parentPageId: string;
  includeNote: boolean;
};

const CONFLUENCE_IMG_REGEX = /!(.+?)!/g;

class ConfluencePod extends PublishPod<ConfluenceConfig> {
  static id = "dendron.confluence";
  static description = "publish note(s) to Atlassian Confluence";

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
        includeNote: {
          type: "boolean",
          description: "whether or not to indicate the note was published from Dendron",
          default: false,
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
          insertTitle: false,
        },
      },
      { flavor: ProcFlavor.REGULAR },
    );
    const settings: any = { include: config.includeNote };
    proc.use(confluence, settings);
    const content = await proc.process(NoteUtils.serialize(note));
    const contentString = content.toString();

    const confluenceApi: ConfluenceAPI = new ConfluenceAPI({ podConfig: config });

    if (!note.custom?.pageId) {
      const newPage = await confluenceApi.createPage({
        title: note.title,
        content: "Upload in progress",
      });

      note.custom.pageId = newPage.id;
      await engine.writeNote(note, { updateExisting: true });
    }

    const page = await confluenceApi.getPage({ pageId: note.custom?.pageId });

    ConfluencePod.extractAttachments(contentString).forEach(async (attachment) => {
      await confluenceApi.uploadAttachment({
        pageId: page.id,
        title: attachment,
        fsPath: path.join(engine.wsRoot, note.vault.fsPath, attachment),
      });
    });

    const updatedPage = await confluenceApi.updatePage({
      pageId: page.id,
      version: (page.version.number + 1),
      title: note.title,
      content: contentString,
    });

    return updatedPage;
  }

  /**
   * Pull out references to all the assets that need to be uploaded as attachments
   */
  static extractAttachments(content: string): string[] {
    return (content.match(CONFLUENCE_IMG_REGEX) || [])
      .map((image: string) => image.replace(CONFLUENCE_IMG_REGEX, "$1"))
      .filter((image: string) => !image.startsWith("http"));
  }
}

export const pods = [ConfluencePod];
