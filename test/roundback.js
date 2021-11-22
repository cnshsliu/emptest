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
      fs.readFileSync(TEST_TEMPLATE_DIR + "/test_roundback.xml", "utf8")
    );
    expect(ret.tplid).to.equal("test_roundback");
  });

  it("START Workflow", async () => {
    const ret = await SDK.startWorkflow("test_roundback", wfid);
  });

  let workid_action1_round_1 = "";
  it("1> Do action1", { timeout: 5000 }, async () => {
    //get worklist
    await SDK.sleep(500);
    let wlist = await SDK.getWorklist(TEST_USER, {
      wfid: wfid,
      nodeid: "action1",
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(1);
    let fullInfo = await SDK.getWorkitemFullInfo(wfid, wlist.objs[0].workid);
    expect(fullInfo.from_actions).to.have.length(0);
    workid_action1_round_1 = wlist.objs[0].workid;
    let ret = await SDK.doWork(TEST_USER, wlist.objs[0].workid, {
      days: 10,
    });
    expect(ret.workid).to.equal(wlist.objs[0].workid);
  });

  let workid_action2_round_1 = "";
  it("1> Do action2", { timeout: 5000 }, async () => {
    await SDK.sleep(1000);
    let ret = await SDK.doWorkByNode(TEST_USER, wfid, "action2");
    expect(ret.workid).to.be.a.string();
    workid_action2_round_1 = ret.workid;
  });

  it("1> Check worklist", { timeout: 5000 }, async () => {
    await SDK.sleep(500);
    let wlist = await SDK.getWorklist(TEST_USER, { wfid: wfid, status: "ST_RUN" });
    expect(wlist.total).to.equal(1);
    expect(wlist.objs[0].nodeid).to.equal("action3");
    let fullInfo = await SDK.getWorkitemFullInfo(wfid, workid_action2_round_1);
    expect(fullInfo.from_actions[0].workid).to.equal(workid_action1_round_1);
  });
  it("1> Do action3", { timeout: 5000 }, async () => {
    await SDK.sleep(1000);
    let ret = await SDK.doWorkByNode(TEST_USER, wfid, "action3");
    expect(ret.workid).to.be.a.string();
  });
  let workid_action1_round_2 = "";
  it("2> Do action1", async () => {
    let ret = await SDK.doWorkByNode(TEST_USER, wfid, "action1", {
      days: 8,
    });
    expect(ret.workid).to.be.a.string();
    workid_action1_round_2 = ret.workid; //Action1 最新workitemde id
    let kvars = await SDK.getKVars(wfid, workid_action1_round_2);
    expect(kvars.days.value).to.equal(8);
  });
  let workid_action2_round_2 = "";
  it("2> Do action2", { timeout: 5000 }, async () => {
    await SDK.sleep(1000);
    let ret = await SDK.doWorkByNode(TEST_USER, wfid, "action2");
    expect(ret.workid).to.be.a.string();
    let workid = ret.workid;
    workid_action2_round_2 = workid;
    let fullInfo = await SDK.getWorkitemFullInfo(wfid, workid);
    expect(fullInfo.from_actions.length).to.equal(1);
    expect(fullInfo.from_actions[0].workid).to.equal(workid_action1_round_2);
  });
  it("2> Check worklist", { timeout: 5000 }, async () => {
    await SDK.sleep(500);
    let wlist = await SDK.getWorklist(TEST_USER, { wfid: wfid, status: "ST_RUN" });
    expect(wlist.total).to.equal(1);
    expect(wlist.objs[0].nodeid).to.equal("action3");
    /* console.log("workid_action1_round_1", workid_action1_round_1);
     * console.log("workid_action1_round_2", workid_action1_round_2);
     * console.log("workid_action2_round_1", workid_action2_round_1); */
    let fullInfo = await SDK.getWorkitemFullInfo(wfid, workid_action2_round_1);
    expect(fullInfo.from_actions[0].workid).to.equal(workid_action1_round_1);
  });
  it("2> Do action3", { timeout: 5000 }, async () => {
    await SDK.sleep(1000);
    let ret = await SDK.doWorkByNode(TEST_USER, wfid, "action3");
    expect(ret.workid).to.be.a.string();
  });
  it("3> Do action1", async () => {
    let ret = await SDK.doWorkByNode(TEST_USER, wfid, "action1", {
      days: 3,
    });
    expect(ret.workid).to.be.a.string();
  });

  it("Check worklist 2", { timeout: 5000 }, async () => {
    await SDK.sleep(500);
    let wlist = await SDK.getWorklist(TEST_USER, { wfid: wfid, status: "ST_RUN" });
    expect(wlist.total).to.equal(0);
  });

  it("Check vars ", { timeout: 5000 }, async () => {
    await SDK.sleep(500);
    let kvs = await SDK.getKVars(wfid);
    expect(kvs["days"].value).to.equal(3);
  });

  it("Check workflow status", async () => {
    let ret = await SDK.getStatus(wfid);
    expect(ret).to.equal("ST_DONE");
  });
});
