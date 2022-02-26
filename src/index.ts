import {
  axios,
  DendronError,
  stringifyError
} from "@dendronhq/common-all";

import {
  PublishPodConfig,
  PublishPodPlantOpts,
  PublishPod,
  JSONSchemaType,
  PodUtils,
} from "@dendronhq/pods-core";

var markdown2confluence = require("@shogobg/markdown2confluence");

export type ConfluencePayload = {
  dendronId: string;
  title: string;
  content: string;
};

type ConfluenceConfig = PublishPodConfig & {
  username: string;
  password: string;
  baseUrl: string;
  space: string;
  parentPageId: string;
};

export type ExistingConfluencePayload = ConfluencePayload & {
  pageId: string;
  pageVersion: number;
};

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
    const { engine, note } = opts;
    var result: any;

    const content = markdown2confluence(note.body);

    try {
      if (note.custom?.pageId) {
        const pageContent = await this.getConfluencePage(opts);
        const newPageVersion = pageContent.version.number + 1;

        const page = {
          pageId: pageContent.id,
          pageVersion: newPageVersion,
          dendronId: note.id,
          title: note.title,
          content: content
        }

        result = await this.updateConfluencePage(opts, page);
      } else {
        const page = {
          dendronId: note.id,
          title: note.title,
          content: content
        }

        result = await this.createConfluencePage(opts, page);
      }
    } catch (err: any) {
      throw new DendronError({ message: stringifyError(err) });
    }

    // save updated note frontmatter (e.g., pageId)
    note.custom.pageId = result.id;
    await engine.writeNote(note, { updateExisting: true });

    return result.data;
  }

  /**
   * Get the specified Confluence page
   * @params opts
   * @returns confluence page object
   */
  // Get the latest version.number for the given document
   async getConfluencePage(opts: PublishPodPlantOpts) {
    const { note, config } = opts;

    try {
      const content = await axios({
        method: "GET",
        baseURL: config.baseUrl,
        url: `/wiki/rest/api/content/${note.custom?.pageId}`,
        auth: {
          username: config.username,
          password: config.password,
        },
      });

      return content.data
    } catch (err: any) {
      console.log(err);
      throw new DendronError({ message: stringifyError(err) });
    }

  }

  /**
   * Create a brand new Confluence document
   * @params
   * @returns confluence page object
   */
  async createConfluencePage(opts: PublishPodPlantOpts, page: ConfluencePayload) {
    const {config } = opts;

    var formData: any = {
      type: "page",
      title: page.title,
      space: {
        key: config.space,
      },
      body: {
        storage: {
          value: page.content,
          representation: "wiki",
        },
      },
    };

    if (config.parentPageId) {
      formData.ancestors = [
        {
          id: config.parentPageId,
          type: "page",
        },
      ];
    }

    try {
      const resp = await axios({
        method: "POST",
        baseURL: config.baseUrl,
        url: "/wiki/rest/api/content",
        auth: {
          username: config.username,
          password: config.password,
        },
        data: formData,
      });

      return resp.data;
    } catch (err: any) {
      throw new DendronError({ message: stringifyError(err) });
    }
  }

  /**
   * Update an existing pageId
   *
   * @returns confluence page object
   */
   async updateConfluencePage(opts: PublishPodPlantOpts, page: ExistingConfluencePayload) {
    const { config } = opts;

    var formData: any = {
      id: page.pageId,
      type: "page",
      title: page?.title,
      space: {
        key: config.space,
      },
      version: {
        number: page.pageVersion,
        minorEdit: false,
      },
      body: {
        storage: {
          value: page.content,
          representation: "wiki",
        },
      },
    };

    if (config.parentPageId) {
      formData.ancestors = [
        {
          id: config.parentPageId,
          type: "page",
        },
      ];
    }

    try {
      const resp = await axios({
        method: "PUT",
        baseURL: config.baseUrl,
        url: `/wiki/rest/api/content/${page.pageId}`,
        auth: {
          username: config.username,
          password: config.password,
        },
        data: formData,
      });

      return resp.data;
    } catch (err: any) {
      throw new DendronError({ message: stringifyError(err) });
    }
  }
}

export const pods = [ConfluencePod];
