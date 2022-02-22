"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pods = void 0;
const common_all_1 = require("@dendronhq/common-all");
const pods_core_1 = require("@dendronhq/pods-core");
var markdown2confluence = require("@shogobg/markdown2confluence");
class ConfluencePod extends pods_core_1.PublishPod {
    get config() {
        return pods_core_1.PodUtils.createPublishConfig({
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
        });
    }
    plant(opts) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const { engine, note } = opts;
            var result;
            // convert to atlassian format
            const confluenceBody = markdown2confluence(note.body);
            try {
                if ((_a = note.custom) === null || _a === void 0 ? void 0 : _a.documentId) {
                    const pageContent = yield this.getConfluencePage(opts);
                    const page = {
                        pageId: pageContent.id,
                        pageVersion: pageContent.version.number,
                        dendronId: note.id,
                        title: note.title,
                        content: confluenceBody
                    };
                    result = yield this.updateConfluencePage(opts, page);
                }
                else {
                    const page = {
                        dendronId: note.id,
                        title: note.title,
                        content: confluenceBody
                    };
                    result = yield this.createConfluencePage(opts, page);
                }
            }
            catch (err) {
                throw new common_all_1.DendronError({ message: (0, common_all_1.stringifyError)(err) });
            }
            // save updated note frontmatter (e.g., pageId)
            note.custom.pageId = result.id;
            yield engine.writeNote(note, { updateExisting: true });
            return result.data;
        });
    }
    /**
     * Get the specified Confluence page
     * @params documentId
     * @returns confluence page object
     */
    // Get the latest version.number for the given document
    getConfluencePage(opts) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const { note, config } = opts;
            try {
                const content = yield (0, common_all_1.axios)({
                    method: "GET",
                    baseURL: config.baseUrl,
                    url: `/wiki/rest/api/content/${(_a = note.custom) === null || _a === void 0 ? void 0 : _a.documentId}`,
                    auth: {
                        username: config.username,
                        password: config.password,
                    },
                });
                return content.data;
            }
            catch (err) {
                throw new common_all_1.DendronError({ message: (0, common_all_1.stringifyError)(err) });
            }
        });
    }
    /**
     * Create a brand new Confluence document
     * @params
     * @returns confluence page object
     */
    createConfluencePage(opts, page) {
        return __awaiter(this, void 0, void 0, function* () {
            const { config } = opts;
            var formData = {
                type: "page",
                title: page.title,
                space: {
                    key: config.space,
                },
                body: {
                    storage: {
                        value: page.content,
                        representation: "storage",
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
                const resp = yield (0, common_all_1.axios)({
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
            }
            catch (err) {
                throw new common_all_1.DendronError({ message: (0, common_all_1.stringifyError)(err) });
            }
        });
    }
    /**
     * Update an existing documentId
     *
     * @returns confluence page object
     */
    updateConfluencePage(opts, page) {
        return __awaiter(this, void 0, void 0, function* () {
            const { config } = opts;
            var formData = {
                type: "page",
                title: page === null || page === void 0 ? void 0 : page.title,
                space: {
                    key: config.space,
                },
                version: {
                    number: page.pageVersion++,
                    minorEdit: false,
                },
                body: {
                    storage: {
                        value: page === null || page === void 0 ? void 0 : page.content,
                        representation: "storage",
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
                const resp = yield (0, common_all_1.axios)({
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
            }
            catch (err) {
                throw new common_all_1.DendronError({ message: (0, common_all_1.stringifyError)(err) });
            }
        });
    }
}
ConfluencePod.id = "dendron.confluence";
ConfluencePod.description = "publish note(s) to Atlassian Confluence";
exports.pods = [ConfluencePod];
