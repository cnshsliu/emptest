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
      fs.readFileSync(TEST_TEMPLATE_DIR + "/test_and_or.xml", "utf8")
    );
    expect(ret.tplid).to.equal("test_and_or");
  });

  it("Read Template", async () => {
    const ret = await SDK.readTemplate("test_and_or");
    expect(ret.tplid).to.equal("test_and_or");
  });

  it("START Workflow", async () => {
    const ret = await SDK.startWorkflow("test_and_or", wfid);
  });

  it("Read workflow", async () => {
    const ret = await SDK.readWorkflow(wfid);
    expect(ret.wfid).to.equal(wfid);
    expect(ret.tplid).to.equal("test_and_or");
  });

  let action1_workid = "";
  it("Do action1", { timeout: 5000 }, async () => {
    //get worklist
    await SDK.sleep(500);
    let wlist = await SDK.getWorklist(TEST_USER, {
      wfid: wfid,
      nodeid: "action1",
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(1);

    // let fullInfo = await SDK.getWorkitemFullInfo(wfid, wlist.objs[0].workid);
    // expect(fullInfo.from_action_workid).to.be.undefined();

    let ret = await SDK.doWork(TEST_USER, wlist.objs[0].workid, {
      input_action1: "action1",
    });
    expect(ret.workid).to.equal(wlist.objs[0].workid);
    action1_workid = ret.workid;
  });

  it("Check worklistafter action1", { timeout: 600000 }, async () => {
    await SDK.sleep(500);
    let wlist = await SDK.getWorklist(TEST_USER, { wfid: wfid, status: "ST_RUN" });
    expect(wlist.total).to.equal(2);
    expect(["action21", "action22"]).to.include(wlist.objs[0].nodeid);
    expect(["action21", "action22"]).to.include(wlist.objs[1].nodeid);

    let fullInfo = await SDK.getWorkitemFullInfo(wfid, action1_workid);
    expect(fullInfo.following_actions).to.have.length(2);
    expect(fullInfo.following_actions[0].nodeid).to.equal("action21");
    expect(fullInfo.following_actions[1].nodeid).to.equal("action22");
    expect(fullInfo.following_actions[0].status).to.equal("ST_RUN");
    expect(fullInfo.following_actions[1].status).to.equal("ST_RUN");
    expect(fullInfo.revocable).to.equal(true);
  });

  let action21_workid = "";
  it("Revoke", async () => {
    let ret = await SDK.revoke(wfid, action1_workid);
    await SDK.sleep(500);
    let wlist = await SDK.getWorklist(TEST_USER, { wfid: wfid, status: "ST_RUN" });
    expect(wlist.total).to.equal(1);
    expect(wlist.objs[0].nodeid).to.include("action1");
  });

  it("Fast forward to action3", { timeout: 5000 }, async () => {
    //get worklist
    await SDK.sleep(500);
    let ret = await SDK.doWorkByNode(TEST_USER, wfid, "action1");
    //action1_workid = ret.workid;
    await SDK.sleep(500);
    await SDK.doWorkByNode(TEST_USER, wfid, "action21");
    await SDK.sleep(500);
    await SDK.doWorkByNode(TEST_USER, wfid, "action22");
  });

  it("Revoke action1", async () => {
    let ret = await SDK.revoke(wfid, action1_workid);
    expect(ret.error).to.equals("WORK_NOT_REVOCABLE");
  });
  it("Revoke and redo many times", { timeout: 30000 }, async () => {
    await SDK.sleep(200);
    let action3_workid = "";
    let ret = await SDK.doWorkByNode(TEST_USER, wfid, "action3");
    action3_workid = ret.workid;
    await SDK.sleep(200);
    let wlist = await SDK.getWorklist(TEST_USER, { wfid: wfid, status: "ST_RUN" });
    expect(wlist.total).to.equal(2);
    ret = await SDK.revoke(wfid, action3_workid);
    expect(ret).to.equal(action3_workid);
    await SDK.sleep(200);
    wlist = await SDK.getWorklist(TEST_USER, { wfid: wfid, status: "ST_RUN" });
    expect(wlist.total).to.equal(1);
    expect(wlist.objs[0].nodeid).to.equal("action3");
    await SDK.sleep(200);
    ret = await SDK.revoke(wfid, wlist.objs[0].workid);
    expect(ret.error).to.equals("WORK_NOT_REVOCABLE");
    await SDK.sleep(200);
    ret = await SDK.doWorkByNode(TEST_USER, wfid, "action3");
    await SDK.sleep(200);
  });
  it("Complete following actions", { timeout: 10000 }, async () => {
    try {
      await SDK.sleep(200);
      await SDK.doWorkByNode(TEST_USER, wfid, "action3");
    } catch (error) {}
    try {
      await SDK.sleep(200);
      await SDK.doWorkByNode(TEST_USER, wfid, "action3");
    } catch (error) {}
    try {
      await SDK.sleep(200);
      await SDK.doWorkByNode(TEST_USER, wfid, "action3");
    } catch (error) {}
    try {
      await SDK.sleep(200);
      await SDK.doWorkByNode(TEST_USER, wfid, "action3");
    } catch (error) {}
    try {
      await SDK.sleep(500);
      await SDK.doWorkByNode(TEST_USER, wfid, "action41");
    } catch (error) {}
    try {
      await SDK.sleep(500);
      await SDK.doWorkByNode(TEST_USER, wfid, "action5");
    } catch (error) {}
    await SDK.sleep(500);
    expect(await SDK.getStatus(wfid)).to.equal("ST_DONE");
  });
});

//TODO: stop /cancel a workflow
