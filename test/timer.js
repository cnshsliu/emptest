"use strict";

const Lab = require("@hapi/lab");
const { expect } = require("@hapi/code");
const { afterEach, beforeEach, before, after, describe, it } = (exports.lab = Lab.script());
const fs = require("fs");
const SDK = require("metaflow");

const TEST_USER = process.env.TEST_USER || "liukehong@gmail.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "psammead";
const TEST_TEMPLATE_DIR = process.env.TEST_TEMPLATE_DIR || "unknown_folder";

describe("timer.js: ", () => {
  beforeEach(async () => {});

  afterEach(async () => {});

  let wfid = "lkh_" + SDK.guid();
  let tmpworkid = "";
  SDK.setServer("http://localhost:5008");
  it("Login", async () => {
    const ret = await SDK.login(TEST_USER, TEST_PASSWORD);
    expect(ret.user.username).to.not.be.empty();
  });

  it("Upload template", async () => {
    const ret = await SDK.putTemplate(fs.readFileSync(TEST_TEMPLATE_DIR + "/timer.xml", "utf8"));
    expect(ret.tplid).to.equal("test_timer");
  });

  it("START Workflow test_timer", async () => {
    const ret = await SDK.startWorkflow("test_timer", wfid);
  });

  let workid_action1_round_1 = "";
  it("1> Do action1, wait timer for action2", { timeout: 90000 }, async () => {
    //get worklist
    let ret = await SDK.doWorkByNode(TEST_USER, wfid, "action1");
    let i = 0;
    for (i = 0; i < 30; i++) {
      ret = await SDK.getWorklist(TEST_USER, { wfid: wfid, status: "ST_RUN" });
      if (ret.objs.length > 0 && ret.objs[0].nodeid === "action2") {
        break;
      } else await SDK.sleep(1000);
    }
    ret = await SDK.doWorkByNode(TEST_USER, wfid, "action2");
    expect(ret.workid).to.be.string();
    for (i = 0; i < 30; i++) {
      ret = await SDK.getWorklist(TEST_USER, { wfid: wfid, status: "ST_RUN" });
      if (ret.objs.length > 0 && ret.objs[0].nodeid === "action3") {
        break;
      } else await SDK.sleep(1000);
    }
    ret = await SDK.doWorkByNode(TEST_USER, wfid, "action3");
    expect(ret.workid).to.be.string();
    await SDK.sleep(500);
    ret = await SDK.getStatus(wfid);
    expect(ret).to.equal("ST_DONE");
  });
});
