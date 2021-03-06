import {
  axios,
  DendronError,
} from "@dendronhq/common-all";

import FormData from "form-data";
import * as fs from "fs";
import { ConfluenceConfig } from ".";

export type GetPageOpts = {
  pageId: string,
}

export type CreatePageOpts = {
  title: string,
  content: string,
}

export type UpdatePageOpts = GetPageOpts & CreatePageOpts & {
  version: number,
}

export type UploadAttachmentOpts = GetPageOpts & {
  title: string,
  fsPath: string,
  comment?: string,
}

export type DeleteAttachmentOpts = GetPageOpts;

export class ConfluenceAPI {
  private baseUrl: string;
  private authHeaders: any;
  private defaultPageData: any;

  constructor({
    podConfig,
  }: {
    podConfig: ConfluenceConfig,
  }) {
    this.baseUrl = podConfig.baseUrl;
    this.authHeaders = {
      auth: {
        username: podConfig.username,
        password: podConfig.password,
      },
    };

    this.defaultPageData = {
      type: "page",
      space: {
        key: podConfig.space,
      },
    };

    if (podConfig.parentPageId) {
      this.defaultPageData.ancestors = [
        {
          id: podConfig.parentPageId,
          type: "page",
        },
      ];
    }
  }

  async getPage(opts: GetPageOpts): Promise<any> {
    return this.apiRequest("get", `/wiki/rest/api/content/${opts.pageId}`);
  }

  async createPage(opts?: CreatePageOpts): Promise<any> {
    const formData = {
      title: opts?.title,
      body: {
        storage: {
          value: opts?.content,
          representation: "storage",
        },
      },
      ...this.defaultPageData,
    };

    return this.apiRequest("post", "/wiki/rest/api/content", formData);
  }

  async updatePage(opts: UpdatePageOpts): Promise<any> {
    const { pageId, title, version, content } = opts;
    const formData = {
      id: pageId,
      title,
      version: {
        number: version,
        minorEdit: true,
      },
      body: {
        storage: {
          value: content,
          representation: "storage",
        },
      },
      ...this.defaultPageData,
    };

    return this.apiRequest("put", `/wiki/rest/api/content/${pageId}`, formData);
  }

  async uploadAttachment(opts: UploadAttachmentOpts) {
    const { pageId, fsPath, title } = opts;
    const uploadFormData = new FormData();
    uploadFormData.append("file", fs.createReadStream(fsPath));

    const headers = {
      "X-Atlassian-Token": "nocheck",
      "Content-Type": `multipart/form-data; boundary=${uploadFormData.getBoundary()}`,
    };

    const upload = await this.apiRequest(
      "put",
      `/wiki/rest/api/content/${pageId}/child/attachment`,
      uploadFormData,
      headers,
    );

    const confluenceAttachment = upload.results[0];

    const modifyFormData = {
      id: confluenceAttachment.id,
      title,
      type: "attachment",
      status: "current",
      version: {
        number: (confluenceAttachment.version.number + 1),
        minorEdit: true,
      },
    };

    return this.apiRequest(
      "put",
      `/wiki/rest/api/content/${pageId}/child/attachment/${confluenceAttachment.id}`,
      modifyFormData,
    );
  }

  async apiRequest(method: string, url: string, formData?: any, headers?: any) {
    try {
      const response = await axios({
        method,
        baseURL: this.baseUrl,
        url,
        data: formData,
        headers,
        ...this.authHeaders,
      });

      return response.data;
    } catch (err: any) {
      throw new DendronError({
        code: err.response.data.statusCode,
        message: err.response.data.message,
        payload: formData,
      });
    }
  }
}
