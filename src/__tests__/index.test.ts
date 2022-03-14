import {
  ENGINE_HOOKS,
  runEngineTestV5,
} from "@dendronhq/engine-test-utils";
import { VaultUtils } from "@dendronhq/common-all";

import { ConfluencePublishPod } from "../index";
import { ConfluencePublisher, ConfluencePublisherConfig } from "../confluence-publisher";
import { ConfluenceAPIConfig } from "../confluence-api";
import { ConfluenceContent } from "../confluence-api-types";

jest.mock("../confluence-publisher");

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

const confluencePage: ConfluenceContent = {
  id: "0123456789",
  type: "page",
  title: "My Fake Page",
  status: "current",
};

describe("ConfluencePublishPod", () => {
  test("exports a single note", async () => {
    await runEngineTestV5(
      async ({ engine, vaults, wsRoot }) => {
        const pod = new ConfluencePublishPod();
        const vaultName = VaultUtils.getName(vaults[0]);

        const mockedPublisher = ConfluencePublisher as jest.MockedClass<typeof ConfluencePublisher>;
        mockedPublisher.prototype.exportNoteToConfluence.mockResolvedValue(confluencePage);

        const pageId = await pod.execute({
          engine,
          vaults,
          wsRoot,
          config: {
            fname: "root",
            vaultName,
            dest: "stdout",
            ...apiConfig,
            ...pubConfig,
          },
        });

        expect(mockedPublisher).toBeCalledWith(engine, pubConfig, apiConfig);
        expect(pageId).toBe("0123456789");
      },
      { expect, preSetupHook: ENGINE_HOOKS.setupBasic },
    );
  });
});
