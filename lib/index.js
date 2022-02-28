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
Object.defineProperty(exports, "__esModule", { value: true });
exports.pods = void 0;
const pods_core_1 = require("@dendronhq/pods-core");
const path = __importStar(require("path"));
const confluenceApi_1 = require("./confluenceApi");
var markdown2confluence = require("@shogobg/markdown2confluence");
const CONFLUNCE_IMG_REGEX = /\!(.+?)\!/g;
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
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const { config, engine, note } = opts;
            const confluenceApi = new confluenceApi_1.ConfluenceAPI({ podConfig: config });
            const content = markdown2confluence(note.body);
            if (!((_a = note.custom) === null || _a === void 0 ? void 0 : _a.pageId)) {
                const newPage = yield confluenceApi.createPage();
                note.custom.pageId = newPage.id;
                yield engine.writeNote(note, { updateExisting: true });
            }
            const page = yield confluenceApi.getPage({ pageId: (_b = note.custom) === null || _b === void 0 ? void 0 : _b.pageId });
            this.extractAttachments(content).forEach((attachment) => __awaiter(this, void 0, void 0, function* () {
                yield confluenceApi.uploadAttachment({
                    pageId: page.id,
                    title: attachment,
                    fsPath: path.join(engine.wsRoot, note.vault.fsPath, attachment),
                });
            }));
            const updatedPage = yield confluenceApi.updatePage({
                pageId: page.id,
                version: (page.version.number + 1),
                title: note.title,
                content: content,
            });
            return updatedPage;
        });
    }
    extractAttachments(content) {
        return (content.match(CONFLUNCE_IMG_REGEX) || [])
            .map((image) => image.replace(CONFLUNCE_IMG_REGEX, "$1"))
            .filter((image) => !image.startsWith("http"));
    }
}
ConfluencePod.id = "dendron.confluence";
ConfluencePod.description = "publish note(s) to Atlassian Confluence";
exports.pods = [ConfluencePod];
//# sourceMappingURL=index.js.map