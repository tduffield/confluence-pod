import * as path from "path";
import heredoc from "tsheredoc";
import { runEngineTestV5, WorkspaceOpts } from "@dendronhq/engine-test-utils";
import { NoteTestUtilsV4 } from "@dendronhq/common-test-utils";
import { ConfluencePublisher, ConfluencePublisherConfig } from "../confluence-publisher";
import { ConfluenceAPI, ConfluenceAPIConfig } from "../confluence-api";
import { ConfluenceContent } from "../confluence-api-types";

jest.mock("../confluence-api");

const apiConfig: ConfluenceAPIConfig = {
  username: "you@example.com",
  // deepcode ignore NoHardcodedPasswords/test: mock data
  password: "iamafakepassword",
  baseUrl: "https://acmeco.atlassian.net",
  space: "~012345678",
};

const pubConfig: ConfluencePublisherConfig = {
  includeNote: false,
};

const mockedApi = ConfluenceAPI as jest.MockedClass<typeof ConfluenceAPI>;

const nameSingleWithoutPageId = "single-without-page-id";
const nameSingleWithPageId = "single-with-page-id";
const setupBasic = async (opts: WorkspaceOpts) => {
  const { wsRoot, vaults } = opts;
  await NoteTestUtilsV4.createNote({
    wsRoot,
    vault: vaults[0],
    fname: nameSingleWithoutPageId,
    body: "",
  });
  await NoteTestUtilsV4.createNote({
    wsRoot,
    vault: vaults[0],
    fname: nameSingleWithPageId,
    body: "",
    custom: {
      pageId: "5555544444",
    },
  });
};

describe("fetchOrCreateConfluencePage", () => {
  test("create page if missing, then fetch page", async () => {
    await runEngineTestV5(
      async ({ engine }) => {
        const page: ConfluenceContent = {
          id: "0123456789",
          title: "Single without Page Id",
          type: "page",
          status: "current",
        };

        const inst = new ConfluencePublisher(engine, pubConfig, apiConfig);
        mockedApi.prototype.createPage.mockResolvedValue(page);
        mockedApi.prototype.getPage.mockResolvedValue(page);

        const response = await inst.fetchOrCreateConfluencePage(engine.notes[nameSingleWithoutPageId]);

        expect(response).toStrictEqual(page);
        expect(mockedApi.prototype.createPage).toBeCalledWith({
          title: page.title,
          content: "Upload in progress",
        });
        expect(mockedApi.prototype.getPage).toBeCalledWith({ pageId: "0123456789" });
        expect(engine.notes[nameSingleWithoutPageId].custom.pageId).toBe("0123456789");
      },
      { expect, preSetupHook: setupBasic },
    );
  });

  test("fetch existing page", async () => {
    await runEngineTestV5(
      async ({ engine }) => {
        const page: ConfluenceContent = {
          id: "5555544444",
          title: "Single with Page Id",
          type: "page",
          status: "current",
        };

        const inst = new ConfluencePublisher(engine, pubConfig, apiConfig);
        mockedApi.prototype.getPage.mockResolvedValue(page);

        const response = await inst.fetchOrCreateConfluencePage(engine.notes[nameSingleWithPageId]);

        expect(response).toStrictEqual(page);
        expect(mockedApi.prototype.createPage).not.toBeCalled();
        expect(mockedApi.prototype.getPage).toBeCalledWith({ pageId: "5555544444" });
        expect(engine.notes[nameSingleWithPageId].custom.pageId).toBe("5555544444");
      },
      { expect, preSetupHook: setupBasic },
    );
  });

  // TODO: What happens when we have a pageId but the page does not exist?
  test.todo("re-create missing page");
});

describe("updateConfluencePage", () => {
  test("with no attachments", async () => {
    await runEngineTestV5(
      async ({ engine }) => {
        const page: ConfluenceContent = {
          id: "0123456789",
          title: "Single with Page Id",
          type: "page",
          status: "current",
          version: {
            number: 1,
          },
        };

        const content = heredoc`
          I am some content
          and I have no attachments
        `;

        const inst = new ConfluencePublisher(engine, pubConfig, apiConfig);
        mockedApi.prototype.updatePage.mockResolvedValue(page);

        const response = await inst.updateConfluencePage(engine.notes[nameSingleWithPageId], page, content);

        expect(response).toStrictEqual(page);
        expect(mockedApi.prototype.uploadAttachment).not.toBeCalled();
        expect(mockedApi.prototype.updatePage).toBeCalledWith({
          pageId: "0123456789",
          version: 2,
          title: "Single with Page Id",
          content,
        });
      },
      { expect, preSetupHook: setupBasic },
    );
  });

  test("with image attachments", async () => {
    await runEngineTestV5(
      async ({ engine, wsRoot }) => {
        const note = engine.notes[nameSingleWithPageId];
        const page: ConfluenceContent = {
          id: "0123456789",
          title: "Single with Page Id",
          type: "page",
          status: "current",
          version: {
            number: 1,
          },
        };

        const content = heredoc`
          I have two image attachments
          !/assets/images/horse.png!
          !/assets/images/donkey.jpg!
        `;

        const inst = new ConfluencePublisher(engine, pubConfig, apiConfig);
        mockedApi.prototype.updatePage.mockResolvedValue(page);

        const response = await inst.updateConfluencePage(note, page, content);

        expect(response).toStrictEqual(page);
        expect(mockedApi.prototype.uploadAttachment).toBeCalledTimes(2);
        expect(mockedApi.prototype.uploadAttachment).toBeCalledWith({
          pageId: "0123456789",
          title: "/assets/images/horse.png",
          fsPath: path.join(wsRoot, note.vault.fsPath, "/assets/images/horse.png"),
        });
        expect(mockedApi.prototype.uploadAttachment).toBeCalledWith({
          pageId: "0123456789",
          title: "/assets/images/donkey.jpg",
          fsPath: path.join(wsRoot, note.vault.fsPath, "/assets/images/donkey.jpg"),
        });
        expect(mockedApi.prototype.updatePage).toBeCalledWith({
          pageId: "0123456789",
          version: 2,
          title: "Single with Page Id",
          content,
        });
      },
      { expect, preSetupHook: setupBasic },
    );
  });

  // TODO: Be able to provide other references to attachments (e.g., links to PDFs)
  test.todo("with multiple types of attachments");
});

describe("convertNoteToXHTML", () => {
  test("standard text with simple headers and body", async () => {
    const markdown = heredoc`
      # Heading 1
      This is paragraph a.

      ## Heading 2
      This is paragraph b.
    `;

    await runEngineTestV5(
      async ({ engine }) => {
        const expectedHTML = heredoc`
          <h1 id="heading-1">Heading 1</h1>
          <p>This is paragraph a.</p>
          <h2 id="heading-2">Heading 2</h2>
          <p>This is paragraph b.</p>
        `.trim();

        const inst = new ConfluencePublisher(engine, pubConfig, apiConfig);
        const response = await inst.convertNoteToXHTML(engine.notes["simple-note"]);
        expect(response).toStrictEqual(expectedHTML);
      },
      {
        expect,
        preSetupHook: async (opts: WorkspaceOpts) => {
          const { wsRoot, vaults } = opts;
          await NoteTestUtilsV4.createNote({
            wsRoot,
            vault: vaults[0],
            fname: "simple-note",
            body: markdown,
          });
        },
      },
    );
  });

  test("note with children replaces navigation at the bottom", async () => {
    const markdown = heredoc`
      The content doesn't actually matter.
    `;

    await runEngineTestV5(
      async ({ engine, wsRoot, vaults }) => {
        const expectedHTML = heredoc`
          <p>The content doesn't actually matter.</p>
        `.trim();

        const note = await NoteTestUtilsV4.createNote({
          wsRoot,
          vault: vaults[0],
          fname: "root",
          body: markdown,
        });

        const inst = new ConfluencePublisher(engine, pubConfig, apiConfig);
        const response = await inst.convertNoteToXHTML(note);
        expect(response).toStrictEqual(expectedHTML);
      },
      { expect, preSetupHook: setupBasic },
    );
  });

  test("replaces local <img> with <ac:image><ri:attachment>", async () => {
    const markdown = heredoc`
      ![Has a comment](/assets/images/logo_small.png)
    `;

    await runEngineTestV5(
      async ({ engine }) => {
        const expectedHTML = heredoc`
          <p><ac:image><ri:attachment ri:filename="/assets/images/logo_small.png"></ri:attachment></ac:image></p>
        `.trim();

        const inst = new ConfluencePublisher(engine, pubConfig, apiConfig);
        const response = await inst.convertNoteToXHTML(engine.notes["simple-note"]);
        expect(response).toStrictEqual(expectedHTML);
      },
      {
        expect,
        preSetupHook: async (opts: WorkspaceOpts) => {
          const { wsRoot, vaults } = opts;
          await NoteTestUtilsV4.createNote({
            wsRoot,
            vault: vaults[0],
            fname: "simple-note",
            body: markdown,
          });
        },
      },
    );
  });

  test("replaces remote <img> with <ac:image><ri:url>", async () => {
    const markdown = heredoc`
      ![Has a comment](https://example.com/logo.png)
    `;

    await runEngineTestV5(
      async ({ engine }) => {
        const expectedHTML = heredoc`
          <p><ac:image><ri:url ri:value="https://example.com/logo.png"></ri:url></ac:image></p>
        `.trim();

        const inst = new ConfluencePublisher(engine, pubConfig, apiConfig);
        const response = await inst.convertNoteToXHTML(engine.notes["simple-note"]);
        expect(response).toStrictEqual(expectedHTML);
      },
      {
        expect,
        preSetupHook: async (opts: WorkspaceOpts) => {
          const { wsRoot, vaults } = opts;
          await NoteTestUtilsV4.createNote({
            wsRoot,
            vault: vaults[0],
            fname: "simple-note",
            body: markdown,
          });
        },
      },
    );
  });

  test("replaces <a> to published note with <ac:link>", async () => {
    const markdown = heredoc`
      [[single-with-page-id]]
      [[single-without-page-id]]
    `;

    await runEngineTestV5(
      async ({ engine, wsRoot, vaults }) => {
        const expectedHTML = heredoc`
          <p><ac:link><ri:page ri:content-title="Single with Page Id"></ri:page><ac:plain-text-link-body>Single with Page Id</ac:plain-text-link-body></ac:link>
          <a href="single-without-page-id">Single without Page Id</a></p>
        `.trim();

        const note = await NoteTestUtilsV4.createNote({
          wsRoot,
          vault: vaults[0],
          fname: "simple-note",
          body: markdown,
        });

        const inst = new ConfluencePublisher(engine, pubConfig, apiConfig);
        const response = await inst.convertNoteToXHTML(note);
        expect(response).toStrictEqual(expectedHTML);
      },
      { expect, preSetupHook: setupBasic },
    );
  });

  describe("config.includeNote is true", () => {
    const myPubConfig: ConfluencePublisherConfig = {
      includeNote: true,
    };

    test("prepend <ac:structured-macro> info block as first element in Root", async () => {
      const markdown = heredoc`
        The content doesn't actually matter.
      `;

      await runEngineTestV5(
        async ({ engine, wsRoot, vaults }) => {
          const expectedHTML = heredoc`
            <ac:structured-macro ac:name="info"><ac:rich-text-body><p>This page was exported from <a href="https://www.dendron.so">Dendron</a>. Changes made to this page directly may be overwritten.</p></ac:rich-text-body></ac:structured-macro><p>The content doesn't actually matter.</p>
          `.trim();

          const note = await NoteTestUtilsV4.createNote({
            wsRoot,
            vault: vaults[0],
            fname: "simple-note",
            body: markdown,
          });

          const inst = new ConfluencePublisher(engine, myPubConfig, apiConfig);
          const response = await inst.convertNoteToXHTML(note);
          expect(response).toStrictEqual(expectedHTML);
        },
        { expect, preSetupHook: setupBasic },
      );
    });
  });
});
