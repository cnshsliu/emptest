"use strict";

const Lab = require("@hapi/lab");
const { expect } = require("@hapi/code");
const { afterEach, beforeEach, describe, it } = (exports.lab = Lab.script());
const { Cheerio, Parser } = require("../src/lib/Parser");
const fs = require("fs");
const Tools = require("../src/tools/tools");
const SDK = require("metaflow");

const TEST_USER = process.env.TEST_USER || "liukehong@gmail.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "psammead";
const TEST_TEMPLATE_DIR = process.env.TEST_TEMPLATE_DIR || "unknown_folder";

describe("Test: ", () => {
  beforeEach(async () => {});

  afterEach(async () => {});

  let wfid = "lkh_" + SDK.guid();
  let tmpworkid = "";
  let test_and_or_id = "";
  let new_copy_id = "";
  let new_copy_tplid = "";
  SDK.setServer("http://localhost:5008");
  it("ENV", async () => {
    expect(TEST_USER).to.be.string();
    expect(TEST_PASSWORD).to.be.string();
    //console.log(`Test with user ${TEST_USER}/${TEST_PASSWORD}`);
  });
  it("Login", async () => {
    const ret = await SDK.login(TEST_USER, TEST_PASSWORD);
    expect(ret.user.username).to.not.be.empty();
  });
  it("Delete existing test_and_or", async () => {
    let ret = await SDK.deleteTemplateByName("test_and_or_copy");
    ret = await SDK.deleteTemplateByName("test_and_or");
    if (ret.tplid) {
      expect(ret.tplid).to.equal("test_and_or");
    }
  });

  it("Upload template", async () => {
    const ret = await SDK.putTemplate(
      fs.readFileSync(TEST_TEMPLATE_DIR + "/test_and_or.xml", "utf8")
    );
    expect(ret.tplid).to.equal("test_and_or");
  });
  it("Check existing test_and_or", async () => {
    let ret = await SDK.readTemplate("test_and_or");
    expect(ret.tplid).to.equal("test_and_or");
    test_and_or_id = ret._id;
  });

  it("Copy template", async () => {
    const ret = await SDK.makeCopyOfTemplate(test_and_or_id);
    new_copy_id = ret._id;
    expect(ret.tplid).to.equal("test_and_or_copy");
  });

  it("Check the copy existing", async () => {
    let ret = await SDK.readTemplate("test_and_or_copy");
    expect(ret.tplid).to.equal("test_and_or_copy");
  });

  it("Copy from tplid to tplid", async () => {
    let ret = await SDK.copyTo("test_and_or_copy", "test_and_or_copy_copy");
    expect(ret.tplid).to.equal("test_and_or_copy_copy");
  });

  it("Rename the copy to lkh0000", async () => {
    const ret = await SDK.renameTemplateWithIid(new_copy_id, "lkh0000");
    expect(ret.tplid).to.equal("lkh0000");
  });
  it("Rename the copy to lkh1123", async () => {
    const ret = await SDK.renameTemplate("lkh0000", "lkh1123");
    expect(ret.tplid).to.equal("lkh1123");
  });

  it("Download lkh1123", async () => {
    let ret = await SDK.readTemplate("lkh1123");
    expect(ret.tplid).to.equal("lkh1123");
  });

  it("Delete the lkh1123", async () => {
    const ret = await SDK.deleteTemplateByName("lkh1123");
    expect(ret.deletedCount).to.equal(1);
  });
  it("Delete the copy_copy", async () => {
    const ret = await SDK.deleteTemplateByName("test_and_or_copy_copy");
    expect(ret.deletedCount).to.equal(1);
  });

  it("Check existing lkh1123", async () => {
    let ret = await SDK.readTemplate("lkh1123");
    expect(ret).to.be.empty();
  });
});
