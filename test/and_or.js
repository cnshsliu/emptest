"use strict";

const Lab = require("@hapi/lab");
const { expect } = require("@hapi/code");
const { afterEach, beforeEach, describe, it } = (exports.lab = Lab.script());
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

  it("START Workflow", async () => {
    const pbo = "http://www.google.com";
    const ret = await SDK.startWorkflow("test_and_or", wfid, "", pbo);
  });
  it("Check PBO", async () => {
    let pbo = await SDK.getPbo(wfid);
    expect(pbo).to.equal("http://www.google.com");
    await SDK.setPbo(wfid, "abcd");
    pbo = await SDK.getPbo(wfid);
    expect(pbo).to.equal("abcd");

    await SDK.setPbo(wfid, ["abcd", "hahaha"]);
    pbo = await SDK.getPbo(wfid);
    expect(Array.isArray(pbo)).to.equal(true);
    expect(pbo.length).to.equal(2);
  });

  let action1_workid = "";
  it("Do action1", { timeout: 5000 }, async () => {
    //get worklist
    await SDK.sleep(500);
    let wlist = await SDK.getWorklist(TEST_USER, {
      wfid: wfid,
      nodeid: "action1",
      status: "ST_RUN",
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

  it("Check worklist after action1", { timeout: 5000 }, async () => {
    await SDK.sleep(500);
    let wlist = await SDK.getWorklist(TEST_USER, {
      wfid: wfid,
      status: "ST_RUN",
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(2);
    expect(["action21", "action22"]).to.include(wlist.objs[0].nodeid);
    expect(["action21", "action22"]).to.include(wlist.objs[1].nodeid);

    let fullInfo = await SDK.getWorkitemFullInfo(wfid, action1_workid);
    expect(fullInfo.following_actions.length).to.equal(2);
    expect(fullInfo.following_actions[0].nodeid).to.equal("action21");
    expect(fullInfo.following_actions[1].nodeid).to.equal("action22");
    expect(fullInfo.following_actions[0].status).to.equal("ST_RUN");
    expect(fullInfo.following_actions[1].status).to.equal("ST_RUN");
    expect(fullInfo.revocable).to.equal(true);
  });

  let action21_workid = "";
  it("Do action21", async () => {
    let ret = await SDK.doWorkByNode(TEST_USER, wfid, "action21", {
      input_action21: "action21",
    });
    expect(ret.workid).to.be.a.string();
    action21_workid = ret.workid;
    await SDK.sleep(500);
    let fullInfo = await SDK.getWorkitemFullInfo(wfid, action21_workid);
    expect(fullInfo.following_actions).to.have.length(0);
  });

  it("Check worklist after action21", { timeout: 5000 }, async () => {
    await SDK.sleep(500);
    let wlist = await SDK.getWorklist(TEST_USER, { wfid: wfid, status: "ST_RUN" });
    expect(wlist.total).to.equal(1);
    expect(wlist.objs[0].nodeid).to.equal("action22");
    let fullInfo = await SDK.getWorkitemFullInfo(wfid, action1_workid);
    expect(fullInfo.revocable).to.equal(false);
  });
  it("Do action22", async () => {
    let ret = await SDK.doWorkByNode(TEST_USER, wfid, "action22", {
      input_action22: "action22",
    });
    expect(ret.workid).to.be.a.string();
  });
  it("Check worklist after action 22 -> AND", { timeout: 5000 }, async () => {
    await SDK.sleep(500);
    let wlist = await SDK.getWorklist(TEST_USER, { wfid: wfid, status: "ST_RUN" });
    expect(wlist.total).to.equal(1);
    expect(wlist.objs[0].nodeid).to.equal("action3");
    let action3_fullInfo = await SDK.getWorkitemFullInfo(wfid, wlist.objs[0].workid);
    expect(action3_fullInfo.from_actions.length).to.equal(2);
    let action21_fullInfo = await SDK.getWorkitemFullInfo(wfid, action21_workid);
    expect(action21_fullInfo.following_actions).to.have.length(1);
    expect(action21_fullInfo.following_actions[0].nodeid).to.equal("action3");
    expect(action21_fullInfo.revocable).to.equal(true);
    let fullInfo = await SDK.getWorkitemFullInfo(wfid, action1_workid);
    expect(fullInfo.revocable).to.equal(false);
  });
  it("Do action3", async () => {
    let ret = await SDK.doWorkByNode(TEST_USER, wfid, "action3", {
      input_action3: "action3",
    });
    let workid = ret.workid;
    expect(workid).to.be.a.string();
    await SDK.sleep(1000);
    let fullInfo = await SDK.getWorkitemFullInfo(wfid, workid);
    expect(fullInfo.from_actions.length).to.equal(2);
    expect(fullInfo.following_actions.length).to.equal(2);
  });
  it("Do action41", { timeout: 5000 }, async () => {
    await SDK.sleep(500);
    let wlist = await SDK.getWorklist(TEST_USER, { wfid: wfid, status: "ST_RUN" });
    expect(wlist.total).to.equal(2);
    expect(["action41", "action42"]).to.include(wlist.objs[0].nodeid);
    expect(["action41", "action42"]).to.include(wlist.objs[1].nodeid);
    let workid_41 = "";
    if (wlist.objs[0].nodeid === "action41") workid_41 = wlist.objs[0].workid;
    else workid_41 = wlist.objs[1].workid;

    let fullInfo = await SDK.getWorkitemFullInfo(wfid, workid_41);
    expect(fullInfo.from_actions.length).to.equal(1);
    expect(fullInfo.from_actions[0].nodeid).to.equal("action3");

    let ret = await SDK.doWorkByNode(TEST_USER, wfid, "action41", {
      input_action41: "action41",
    });
    expect(ret.workid).to.equal(workid_41);
    ret = await SDK.doWorkByNode(TEST_USER, wfid, "action42");
    expect(ret.error).to.equal("WORK_RUNNING_NOT_EXIST");
  });
  it("Check action5", { timeout: 5000 }, async () => {
    await SDK.sleep(500);
    let wlist = await SDK.getWorklist(TEST_USER, {
      wfid: wfid,
      nodeid: "action5",
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(1);
    tmpworkid = wlist.objs[0].workid;

    let fullInfo = await SDK.getWorkitemFullInfo(wfid, tmpworkid);
    expect(fullInfo.from_actions).to.have.length(2);
    expect(fullInfo.from_actions[0].nodeid).to.equal("action41");
  });

  it("Do action5", { timeout: 5000 }, async () => {
    let ret = await SDK.doWork(TEST_USER, tmpworkid, {
      input_action5: "action5",
    });
    expect(ret.workid).to.equal(tmpworkid);
  });

  it("Check Vars", { timeout: 5000 }, async () => {
    await SDK.sleep(500);
    let kvs = await SDK.getKVars(wfid);
    expect(kvs["input_action1"].value).to.equal("action1");
    expect(kvs["input_action21"].value).to.equal("action21");
    expect(kvs["input_action22"].value).to.equal("action22");
    expect(kvs["input_action3"].value).to.equal("action3");
    expect(kvs["input_action41"].value).to.equal("action41");
    expect(kvs["input_action5"].value).to.equal("action5");
  });

  it("Should have no workitem now", { timeout: 5000 }, async () => {
    await SDK.sleep(500);
    let wlist = await SDK.getWorklist(TEST_USER, { wfid: wfid, status: "ST_RUN" });
    expect(wlist.total).to.equal(0);
  });

  it("Check workflow status", async () => {
    let ret = await SDK.getStatus(wfid);
    expect(ret).to.equal("ST_DONE");
  });
});
