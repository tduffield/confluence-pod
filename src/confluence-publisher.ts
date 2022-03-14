import * as path from "path";
import {
  DEngineClient,
  NoteUtils,
  NoteProps,
} from "@dendronhq/common-all";
import { MDUtilsV5, ProcFlavor } from "@dendronhq/engine-server";
import { ConfluenceAPIConfig, ConfluenceAPI } from "./confluence-api";
import { confluence, ConfluenceOpts } from "./confluence-remark";
import { ConfluenceContent } from "./confluence-api-types";

export type ConfluencePublisherConfig = ConfluenceOpts;

const CONFLUENCE_IMG_REGEX = /!(.+?)!/g;

export class ConfluencePublisher {
  private api: ConfluenceAPI;
  private config: ConfluencePublisherConfig;
  private engine: DEngineClient;

  constructor(engine: DEngineClient, config: ConfluencePublisherConfig, apiConfig: ConfluenceAPIConfig) {
    this.engine = engine;
    this.config = config;
    this.api = new ConfluenceAPI(apiConfig);
  }

  /**
   * Export Dendron note to Confluence page
   * @param opts
   * @returns confluence page object
   */
  async exportNoteToConfluence(note: NoteProps): Promise<ConfluenceContent> {
    const page = await this.fetchOrCreateConfluencePage(note);
    const content = await this.convertNoteToXHTML(note);

    return this.updateConfluencePage(note, page, content);
  }

  /**
   * Convert the raw Dendron note into Confluence's XHTML Storage Format
   * @param opts
   * @returns
   */
  async convertNoteToXHTML(note: NoteProps): Promise<string> {
    const proc = MDUtilsV5.procRehypeFull(
      {
        engine: this.engine,
        fname: note.fname,
        vault: note.vault,
        insideNoteRef: true, // force not to print children
        publishOpts: {
          insertTitle: false,
        },
      },
      { flavor: ProcFlavor.REGULAR },
    );
    proc.use(confluence, this.config as any);
    const content = await proc.process(NoteUtils.serialize(note));

    return content.toString();
  }

  /**
   * Create or fetch the Confluence page associated with the note
   * @param opts
   * @returns
   */
  async fetchOrCreateConfluencePage(note: NoteProps): Promise<ConfluenceContent> {
    if (!note.custom?.pageId) {
      const newPage = await this.api.createPage({
        title: note.title,
        content: "Upload in progress",
      });

      note.custom.pageId = newPage.id;
      await this.engine.writeNote(note, { updateExisting: true });
    }

    return this.api.getPage({ pageId: note.custom?.pageId });
  }

  /**
   * Update the Confluence page with the latest content from the note
   * @param opts
   */
  async updateConfluencePage(note: NoteProps, page: ConfluenceContent, content: string): Promise<ConfluenceContent> {
    ConfluencePublisher.extractAttachments(content).forEach(async (attachment: string) => {
      await this.api.uploadAttachment({
        pageId: page.id,
        title: attachment,
        fsPath: path.join(this.engine.wsRoot, note.vault.fsPath, attachment),
      });
    });

    return this.api.updatePage({
      pageId: page.id,
      version: (page.version!.number + 1),
      title: note.title,
      content,
    });
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
