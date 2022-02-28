import {
  ConfluenceConfig
} from ".";

import {
  axios,
  DendronError,
  stringifyError
} from "@dendronhq/common-all";

import FormData from "form-data";

import * as path from "path";
import * as fs from "fs";

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
  private _baseUrl: string;
  private _authHeaders: any;
  private _defaultPageData: any;

  constructor({
    podConfig
  }: {
    podConfig: ConfluenceConfig,
  }) {
    this._baseUrl = podConfig.baseUrl;
    this._authHeaders = {
      auth: {
        username: podConfig.username,
        password: podConfig.password,
      },
    }

    this._defaultPageData = {
      type: "page",
      space: {
        key: podConfig.space,
      }
    }


    if (podConfig.parentPageId) {
      this._defaultPageData.ancestors = [
        {
          id: podConfig.parentPageId,
          type: "page",
        }
      ]
    }
  }

  async getPage(opts: GetPageOpts): Promise<any> {
    return await this._apiRequest("get", `/wiki/rest/api/content/${opts.pageId}`);
  }

  async createPage(opts?: CreatePageOpts): Promise<any> {
    const formData = {
      title: opts?.title,
      body: {
        storage: {
          content: "Upload in progress",
          representation: "storage",
        },
      },
      ...this._defaultPageData
    }

    return await this._apiRequest("post", "/wiki/rest/api/content", formData);
  }

  async updatePage(opts: UpdatePageOpts): Promise<any> {
    const { pageId, title, version, content } = opts;
    const formData = {
      id: pageId,
      title: title,
      version: {
        number: version,
        minorEdit: true,
      },
      body: {
        storage: {
          value: content,
          representation: "wiki"
        },
      },
      ...this._defaultPageData
    }

    return await this._apiRequest("put", `/wiki/rest/api/content/${pageId}`, formData);
  }

  async uploadAttachment(opts: UploadAttachmentOpts) {
    const { pageId, fsPath, title } = opts;
    const uploadFormData = new FormData();
    uploadFormData.append("file", fs.createReadStream(fsPath));

    const headers = {
      "X-Atlassian-Token": "nocheck",
      "Content-Type": `multipart/form-data; boundary=${uploadFormData.getBoundary()}`,
    };

    const upload = await this._apiRequest(
      "put",
      `/wiki/rest/api/content/${pageId}/child/attachment`,
      uploadFormData,
      headers
    );

    const confluenceAttachment = upload.results[0];

    const modifyFormData = {
      id: confluenceAttachment.id,
      title: title,
      type: "attachment",
      status: "current",
      version: {
        number: (confluenceAttachment.version.number + 1),
        minorEdit: true
      }
    }

    return await this._apiRequest(
      "put",
      `/wiki/rest/api/content/${pageId}/child/attachment/${confluenceAttachment.id}`,
      modifyFormData
    );
  }

  async _apiRequest(method: string, url: string, formData?: any, headers?: any) {
    try {
      const response = await axios({
        method: method,
        baseURL: this._baseUrl,
        url: url,
        data: formData,
        headers: headers,
        ...this._authHeaders,
      });

      return response.data
    } catch (err: any) {
      throw new DendronError({
        code: err.response.data.statusCode,
        message: err.response.data.message,
        payload: formData,
      });
    }
  }
}
