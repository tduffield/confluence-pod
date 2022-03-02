"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.confluence = void 0;
const unist_util_visit_1 = __importDefault(require("unist-util-visit"));
function plugin(opts) {
    const proc = this;
    function transformer(tree, _file) {
        (0, unist_util_visit_1.default)(tree, 'element', (node) => {
            let enode = node;
            if (enode.tagName === "img") {
                transformImage(enode);
            }
        });
        return tree;
    }
    function transformImage(enode) {
        var _a;
        enode.tagName = "ac:image";
        var riTagName = "ri:attachment";
        var riPropName = "ri:filename";
        var riPropValue = (_a = enode.properties) === null || _a === void 0 ? void 0 : _a.src;
        if (riPropValue.startsWith("http")) {
            riTagName = "ri:url";
            riPropName = "ri:value";
        }
        enode.properties = {};
        enode.children = [
            {
                type: "element",
                tagName: riTagName,
                properties: {
                    [riPropName]: riPropValue,
                },
                children: [],
            }
        ];
        return enode;
    }
    return transformer;
}
exports.confluence = plugin;
//# sourceMappingURL=confluence.js.map