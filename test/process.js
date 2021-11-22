"use strict";

const Lab = require("@hapi/lab");
const { expect } = require("@hapi/code");
const { afterEach, beforeEach, describe, it } = (exports.lab = Lab.script());
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
  let tmpwork_iid = "";
  SDK.setServer("http://localhost:5008");
  it("Login", async () => {
    const ret = await SDK.login(TEST_USER, TEST_PASSWORD);
    expect(ret.user.username).to.not.be.empty();
  });

  it("Clear template", async () => {
    const ret = await SDK.deleteTemplateByName("test_and_or_copy");
    expect(ret.deletedCount).to.be.within(0, 1);
  });
  it("Upload template", async () => {
    const ret = await SDK.putTemplate(
      fs.readFileSync(TEST_TEMPLATE_DIR + "/test_and_or.xml", "utf8")
    );
    expect(ret.tplid).to.equal("test_and_or");
    tmpwork_iid = ret._id;
  });

  it("Make a copy", async () => {
    await SDK.makeCopyOfTemplate(tmpwork_iid);
  });

  it("START Workflow", async () => {
    const ret = await SDK.startWorkflow("test_and_or_copy", wfid);
  });

  it("Checking existing from list", async () => {
    let ret = await SDK.workflowGetList({ tplid: "test_and_or_copy" });
    expect(ret.length).to.be.above(0);
    for (let i = 0; i < ret.length; i++) {
      let wfid = ret[i].wfid;
      await SDK.destroyWorkflow(wfid);
    }
    ret = await SDK.workflowGetList({ tplid: "test_and_or_copy" });
    expect(ret.length).to.equal(0);
  });
});
