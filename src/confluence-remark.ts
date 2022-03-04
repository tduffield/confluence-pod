import { NoteProps } from "@dendronhq/common-all";
import Unified, { Transformer } from "unified";
import { Node, Root, Element } from "hast";
import { VFile } from "vfile";
import visit from "unist-util-visit";
import { MDUtilsV4 } from "@dendronhq/engine-server";

type PluginOpts = {
  includeNote: boolean;
};

/**
 * Convert <img> to <ac:image>
 * @param node
 * @returns
 */
function transformImage(node: Element) {
  node.tagName = "ac:image";

  let riTagName = "ri:attachment";
  let riPropName = "ri:filename";
  const riPropValue = node.properties?.src as string;

  if (riPropValue.startsWith("http")) {
    riTagName = "ri:url";
    riPropName = "ri:value";
  }

  node.properties = {};
  node.children = [
    {
      type: "element",
      tagName: riTagName,
      properties: {
        [riPropName]: riPropValue,
      },
      children: [],
    },
  ];

  return node;
}

/**
 * Convert an <a> link to another note uploaded to Confluence into an <ac:link>
 * @param node
 * @param note
 */
function transformWikiLink(node: Element, note: NoteProps) {
  node.tagName = "ac:link";
  node.properties = {};
  node.children = [
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
        },
      ],
    },
  ];

  return node;
}

/**
  * Prepend an Info Block at the top of the page indicating that this page was exported
  * @param node
  */
function insertInfoBlock(node: Root) {
  node.children.unshift({
    type: "element",
    tagName: "ac:structured-macro",
    properties: {
      "ac:name": "info",
    },
    children: [
      {
        type: "element",
        tagName: "ac:rich-text-body",
        children: [
          {
            type: "element",
            tagName: "p",
            children: [
              {
                type: "text",
                value: "This page was exported from ",
              },
              {
                type: "element",
                tagName: "a",
                properties: {
                  href: "https://www.dendron.so",
                },
                children: [
                  {
                    type: "text",
                    value: "Dendron",
                  },
                ],
              },
              {
                type: "text",
                value: ". Changes made to this page directly may be overwritten.",
              },
            ],
          },
        ],
      },
    ],
  });
  return node;
}

function plugin(this: Unified.Processor, opts?: PluginOpts): Transformer {
  const proc = this;
  function transformer(tree: Node, _file: VFile) {
    visit(tree, (node) => {
      if (node.type === "element") {
        const enode = node as Element;
        if (enode.tagName === "img") {
          transformImage(enode);
        } else if (enode.tagName === "a" && enode.properties?.href) {
          const maybeNoteId = enode.properties.href as string;
          if (maybeNoteId.startsWith("http")) {
            return;
          }

          const { engine } = MDUtilsV4.getEngineFromProc(proc);
          const maybeNote = engine.notes[maybeNoteId];
          if (maybeNote && maybeNote.custom.pageId) {
            transformWikiLink(enode, maybeNote);
          }
        }
      } else if (node.type === "root" && opts?.includeNote) {
        insertInfoBlock(node as Root);
      }
    });
    return tree;
  }
  return transformer;
}

export { plugin as confluence };
export { PluginOpts as ConfluenceOpts };
