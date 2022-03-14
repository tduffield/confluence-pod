import {
  PublishPodConfig,
  PublishPodPlantOpts,
  PublishPod,
  JSONSchemaType,
  PodUtils,
} from "@dendronhq/pods-core";

import { ConfluenceAPIConfig } from "./confluence-api";
import { ConfluencePublisher, ConfluencePublisherConfig } from "./confluence-publisher";

export type ConfluencePodConfig = ConfluencePublisherConfig & ConfluenceAPIConfig;
export type ConfluencePublishConfig = PublishPodConfig & ConfluencePodConfig;

export class ConfluencePublishPod extends PublishPod<ConfluencePublishConfig> {
  static id = "dendron.confluence";
  static description = "publish note(s) to Atlassian Confluence";

  get config() :JSONSchemaType<ConfluencePublishConfig> {
    return PodUtils.createPublishConfig({
      required: ["username", "password", "baseUrl", "space"],
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
    }) as JSONSchemaType<ConfluencePublishConfig>;
  }

  async plant(opts: PublishPodPlantOpts) {
    const { config, engine, note } = opts;

    const apiConfig: ConfluenceAPIConfig = {
      username: config.username,
      password: config.password,
      baseUrl: config.baseUrl,
      space: config.space,
      parentPageId: config.parentPageId,
    };

    const pubConfig: ConfluencePublisherConfig = {
      includeNote: config.includeNote,
    };

    const publisher = new ConfluencePublisher(engine, pubConfig, apiConfig);
    const page = await publisher.exportNoteToConfluence(note);

    return page.id;
  }
}

export const pods = [ConfluencePublishPod];
