import {
  ConfluenceAPI,
  ConfluenceAPIConfig,
} from "../confluence-api";

const baseUrl = "https://acme.atlassian.net";
const username = "you@example.com";
const password = "iamafakepassword";

const apiConfigBasic: ConfluenceAPIConfig = {
  username,
  password,
  baseUrl,
  space: "~012345678",
};

describe("constructor", () => {
  test("with only required configuration", () => {
    const inst = new ConfluenceAPI(apiConfigBasic);
    expect(inst.baseUrl).toBe(baseUrl);
    expect(inst.authHeaders).toStrictEqual({ auth: { username, password } });
    expect(inst.defaultPageData).toStrictEqual({
      type: "page",
      space: {
        key: "~012345678",
      },
    });
  });

  test("with parentPageId", () => {
    const apiConfigWithParentPageId = apiConfigBasic;
    apiConfigWithParentPageId.parentPageId = "0123456789";

    const inst = new ConfluenceAPI(apiConfigWithParentPageId);
    expect(inst.baseUrl).toBe(baseUrl);
    expect(inst.authHeaders).toStrictEqual({ auth: { username, password } });
    expect(inst.defaultPageData).toStrictEqual({
      type: "page",
      space: {
        key: "~012345678",
      },
      ancestors: [
        {
          id: "0123456789",
          type: "page",
        },
      ],
    });
  });
});
