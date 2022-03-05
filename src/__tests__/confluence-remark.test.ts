import { podClassEntryToPodItemV4 } from "@dendronhq/pods-core";
import { confluence } from "../confluence-remark";


describe("transformImage", () => {
  describe("local image", () => {
    test.todo("replaces <img> with <ac:image><ri:attachment>");
  });

  describe("remote image", () => {
    test.todo("replaces <img> with <ac:image><ri:url>");
  });
});

describe("transformWikiLink", () => {
  test.todo("replaces <a> with <ac:link>");
});

describe("insertInfoBlock", () => {
  test.todo("prepend <ac:structured-macro> info block as first element in Root");
})


describe("transformer", () => {
  describe("note with no required transformations", () => {
    test.todo("makes no modifications");
  });

  describe("note contains an image", () => {
    test.todo("calls transformImage");
  });

  describe("note contains a link", () => {
    describe("to remote URL", () => {
      test.todo("does nothing");
    });

    describe("to unpublished note", () => {
      test.todo("does nothing");
    });

    describe("to published note", () => {
      test.todo("calls transformWikiLink");
    })
  });

  describe("config.includeNote is true", () => {
    test.todo("calls insertInfoBlock");
  });
});
