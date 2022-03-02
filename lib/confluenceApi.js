"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfluenceAPI = void 0;
const common_all_1 = require("@dendronhq/common-all");
const form_data_1 = __importDefault(require("form-data"));
const fs = __importStar(require("fs"));
class ConfluenceAPI {
    constructor({ podConfig }) {
        this._baseUrl = podConfig.baseUrl;
        this._authHeaders = {
            auth: {
                username: podConfig.username,
                password: podConfig.password,
            },
        };
        this._defaultPageData = {
            type: "page",
            space: {
                key: podConfig.space,
            }
        };
        if (podConfig.parentPageId) {
            this._defaultPageData.ancestors = [
                {
                    id: podConfig.parentPageId,
                    type: "page",
                }
            ];
        }
    }
    getPage(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this._apiRequest("get", `/wiki/rest/api/content/${opts.pageId}`);
        });
    }
    createPage(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const formData = Object.assign({ title: opts === null || opts === void 0 ? void 0 : opts.title, body: {
                    storage: {
                        value: "Upload in progress",
                        representation: "storage",
                    },
                } }, this._defaultPageData);
            return yield this._apiRequest("post", "/wiki/rest/api/content", formData);
        });
    }
    updatePage(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const { pageId, title, version, content } = opts;
            const formData = Object.assign({ id: pageId, title: title, version: {
                    number: version,
                    minorEdit: true,
                }, body: {
                    storage: {
                        value: content,
                        representation: "storage"
                    },
                } }, this._defaultPageData);
            return yield this._apiRequest("put", `/wiki/rest/api/content/${pageId}`, formData);
        });
    }
    uploadAttachment(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const { pageId, fsPath, title } = opts;
            const uploadFormData = new form_data_1.default();
            uploadFormData.append("file", fs.createReadStream(fsPath));
            const headers = {
                "X-Atlassian-Token": "nocheck",
                "Content-Type": `multipart/form-data; boundary=${uploadFormData.getBoundary()}`,
            };
            const upload = yield this._apiRequest("put", `/wiki/rest/api/content/${pageId}/child/attachment`, uploadFormData, headers);
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
            };
            return yield this._apiRequest("put", `/wiki/rest/api/content/${pageId}/child/attachment/${confluenceAttachment.id}`, modifyFormData);
        });
    }
    _apiRequest(method, url, formData, headers) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield (0, common_all_1.axios)(Object.assign({ method: method, baseURL: this._baseUrl, url: url, data: formData, headers: headers }, this._authHeaders));
                return response.data;
            }
            catch (err) {
                throw new common_all_1.DendronError({
                    code: err.response.data.statusCode,
                    message: err.response.data.message,
                    payload: formData,
                });
            }
        });
    }
}
exports.ConfluenceAPI = ConfluenceAPI;
//# sourceMappingURL=confluenceApi.js.map