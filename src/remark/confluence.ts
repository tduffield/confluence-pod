import { DNoteLoc } from "@dendronhq/common-all";
import Unified, { Transformer } from "unified";
import { Node, Element } from "hast";
import visit from "unist-util-visit";
import { VFile } from "vfile";

type PluginOpts = {
  from: DNoteLoc;
  to: DNoteLoc;
};

function plugin(this: Unified.Processor, opts?: PluginOpts): Transformer {
  // @ts-ignore
  const proc = this;
  function transformer(tree: Node, _file: VFile) {
    visit(tree, 'element', (node) => {
      let enode = node as Element;
      if (enode.tagName === "img") {
        transformImage(enode);
      }
      // We _could_ try and undo remark's parsing of the fenced code block, but it looks "fine"
    });
    return tree;
  }

  /**
   * Convert <img> to <ac:image>
   * @param enode Element
   * @returns
   */
  function transformImage(enode: Element) {
    enode.tagName = "ac:image";

    var riTagName = "ri:attachment";
    var riPropName = "ri:filename";
    var riPropValue = enode.properties?.src as string;

    if (riPropValue.startsWith("http")) {
      riTagName = "ri:url";
      riPropName = "ri:value";
    }

    enode.properties = {}
    enode.children = [
      {
        type: "element",
        tagName: riTagName,
        properties: {
          [riPropName]: riPropValue,
        },
        children: [],
      }
    ]

    return enode;
  }
  return transformer;
}

export { plugin as confluence };
export { PluginOpts as ConfluenceOpts };
