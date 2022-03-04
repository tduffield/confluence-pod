import { DNoteLoc, NoteProps } from "@dendronhq/common-all";
import Unified, { Transformer } from "unified";
import { Node, Element } from "hast";
import visit from "unist-util-visit";
import { VFile } from "vfile";
import { MDUtilsV4 } from "@dendronhq/engine-server";

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
      } else if (enode.tagName === "a" && enode.properties?.href) {
        let maybeNoteId = enode.properties.href as string;
        if (maybeNoteId.startsWith("http")) {
          return;
        }

        const { engine } = MDUtilsV4.getEngineFromProc(proc);
        let maybeNote = engine.notes[maybeNoteId];
        if (maybeNote && maybeNote.custom!.pageId) {
          transformWikiLink(enode, maybeNote);
        }
      }
      // We _could_ try and undo remark's parsing of the fenced code block, but it looks "fine"
    });
    return tree;
  }

  /**
   * Convert <img> to <ac:image>
   * @param enode
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

  /**
   * Convert an <a> link to another note uploaded to Confluence into an <ac:link>
   * @param enode
   * @param note
   */
  function transformWikiLink(enode: Element, note: NoteProps) {
    enode.tagName = "ac:link"
    enode.properties = {}
    enode.children = [
      {
        type: "element",
        tagName: "ri:page",
        properties: {
          "ri:content-title": note.title,
        },
        children: [],
      },
      {
        type: "element",
        tagName: "ac:plain-text-link-body",
        properties: {},
        children: [
          {
            type: "text",
            value: note.title,
          }
        ],
      },
    ]

    return enode;
  }
  return transformer;
}

export { plugin as confluence };
export { PluginOpts as ConfluenceOpts };
