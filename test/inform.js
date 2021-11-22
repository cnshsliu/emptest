"use strict";

const Lab = require("@hapi/lab");
const { expect } = require("@hapi/code");
const { afterEach, beforeEach, before, after, describe, it } = (exports.lab = Lab.script());
const fs = require("fs");
const SDK = require("metaflow");
const TEST_USER = process.env.TEST_USER || "liukehong@gmail.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "psammead";
const TEST_TEMPLATE_DIR = process.env.TEST_TEMPLATE_DIR || "unknown_folder";

describe("Test: ", () => {
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
    const ret = await SDK.putTemplate(
      fs.readFileSync(TEST_TEMPLATE_DIR + "/inform_example.xml", "utf8")
    );
    expect(ret.tplid).to.equal("inform example");
  });

  it("START Workflow", async () => {
    const ret = await SDK.startWorkflow("inform example", wfid);
  });

  let action1_workid = "";
  it("Do action1 to trigger inform", { timeout: 5000 }, async () => {
    //get worklist
    await SDK.sleep(500);
    expect(
      (await SDK.getWorklist(TEST_USER, { wfid: wfid, nodeid: "action1", status: "ST_RUN" })).total
    ).to.equal(1);

    let ret = await SDK.doWorkByNode(TEST_USER, wfid, "action1");
    action1_workid = ret.workid;
  });

  it("Do action2", { timeout: 5000 }, async () => {
    let wlist;
    for (let i = 0; i < 100; i++) {
      wlist = await SDK.getWorklist(TEST_USER, { wfid: wfid, status: "ST_RUN" });
      if (wlist.total > 0) {
        break;
      }
      await SDK.sleep(100);
    }
    expect(wlist.total).to.equal(1);
    expect(wlist.objs[0].nodeid).to.equal("action2");
    await SDK.doWorkByNode(TEST_USER, wfid, "action2");
  });

  it("Check workflow status", async () => {
    await SDK.sleep(500);
    let ret = await SDK.getStatus(wfid);
    expect(ret).to.equal("ST_DONE");
  });
});
