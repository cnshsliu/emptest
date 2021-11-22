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

  it("START Workflow", async () => {
    const ret = await SDK.startWorkflow("test_and_or", wfid);
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

  let action21_workid = "";
  let action22_workid = "";
  it("Check worklist after action1", { timeout: 600000 }, async () => {
    await SDK.sleep(500);
    let wlist = await SDK.getWorklist(TEST_USER, { wfid: wfid, status: "ST_RUN" });
    expect(wlist.total).to.equal(2);
    expect(["action21", "action22"]).to.include(wlist.objs[0].nodeid);
    expect(["action21", "action22"]).to.include(wlist.objs[1].nodeid);
    if (wlist.objs[0].nodeid === "action21") {
      action21_workid = wlist.objs[0].workid;
      action22_workid = wlist.objs[1].workid;
    } else {
      action21_workid = wlist.objs[1].workid;
      action22_workid = wlist.objs[0].workid;
    }

    let fullInfo = await SDK.getWorkitemFullInfo(wfid, action1_workid);
    expect(fullInfo.following_actions).to.have.length(2);
    expect(fullInfo.following_actions[0].nodeid).to.equal("action21");
    expect(fullInfo.following_actions[1].nodeid).to.equal("action22");
    expect(fullInfo.following_actions[0].status).to.equal("ST_RUN");
    expect(fullInfo.following_actions[1].status).to.equal("ST_RUN");
    expect(fullInfo.revocable).to.equal(true);
    expect(fullInfo.returnable).to.equal(false);
  });

  it("sendback a work in parallels", async () => {
    let fullInfo = await SDK.getWorkitemFullInfo(wfid, action22_workid);
    expect(fullInfo.returnable).to.equal(false);
    let errThrown = false;
    await SDK.sleep(500);
    let ret = await SDK.sendback(TEST_USER, wfid, action22_workid);
    //Should not be able to sendback, keep stay on action22
    expect(ret.error).to.equal("WORK_NOT_RETURNABLE");
    let wlist = await SDK.getWorklist(TEST_USER, { wfid: wfid, status: "ST_RUN" });
    expect(wlist.total).to.equal(2);
  });
  let action3_workid = "";
  it("do task action21/22", { timeout: 10000 }, async () => {
    await SDK.sleep(200);
    await SDK.doWorkByNode(TEST_USER, wfid, "action21");
    await SDK.sleep(200);
    await SDK.doWorkByNode(TEST_USER, wfid, "action22");
    await SDK.sleep(500);
    let wlist = await SDK.getWorklist(TEST_USER, { wfid: wfid, status: "ST_RUN" });
    action3_workid = wlist.objs[0].workid;
    expect(wlist.objs[0].nodeid).to.equal("action3");
  });

  it("Sendback from action3", async () => {
    await SDK.sendback(TEST_USER, wfid, action3_workid);
    await SDK.sleep(500);
    let wlist = await SDK.getWorklist(TEST_USER, { wfid: wfid, status: "ST_RUN" });
    expect(wlist.total).to.equal(2);
    expect(["action21", "action22"]).to.include(wlist.objs[0].nodeid);
    expect(["action21", "action22"]).to.include(wlist.objs[1].nodeid);
  });

  let action41_workid = "";
  let action42_workid = "";
  it("do task to action3", { timeout: 10000 }, async () => {
    await SDK.sleep(200);
    await SDK.doWorkByNode(TEST_USER, wfid, "action21");
    await SDK.sleep(200);
    await SDK.doWorkByNode(TEST_USER, wfid, "action22");
    await SDK.sleep(200);
    await SDK.doWorkByNode(TEST_USER, wfid, "action3");
    await SDK.sleep(500);
    let wlist = await SDK.getWorklist(TEST_USER, { wfid: wfid, status: "ST_RUN" });
    expect(wlist.total).to.equal(2);
    action41_workid =
      wlist.objs[0].nodeid === "action41" ? wlist.objs[0].workid : wlist.objs[1].workid;
  });

  it("Sendback from action41", async () => {
    try {
      let ret = await SDK.sendback(TEST_USER, wfid, action41_workid);
      expect(ret).to.not.equal(action41_workid);
    } catch (err) {
      expect(err.message.indexOf("Not Returnable")).to.be.above(0);
    }
    await SDK.sleep(200);
    let wlist = await SDK.getWorklist(TEST_USER, { wfid: wfid, status: "ST_RUN" });
    expect(wlist.total).to.equal(2);
  });

  let action5_workid = "";
  it("do task action41/42", { timeout: 10000 }, async () => {
    await SDK.sleep(200);
    action41_workid = await SDK.doWorkByNode(TEST_USER, wfid, "action41");
    await SDK.sleep(200);
    let wlist = await SDK.getWorklist(TEST_USER, { wfid: wfid, status: "ST_RUN" });
    expect(wlist.total).to.equal(1);
    action5_workid = wlist.objs[0].workid;
    expect(wlist.objs[0].nodeid).to.equal("action5");
  });

  it("Sendback from action5", async () => {
    let ret = await SDK.sendback(TEST_USER, wfid, action5_workid);
    expect(ret).to.equal(action5_workid);
    await SDK.sleep(200);
    let wlist = await SDK.getWorklist(TEST_USER, { wfid: wfid, status: "ST_RUN" });
    expect(wlist.total).to.equal(2);
  });

  it("do task action41/42/5", { timeout: 10000 }, async () => {
    await SDK.sleep(200);
    await SDK.doWorkByNode(TEST_USER, wfid, "action42");
    await SDK.sleep(200);
    try {
      //action42和41后是OR，所以，只要一个完成了，第二个就被ignore了
      await SDK.doWorkByNode(TEST_USER, wfid, "action41");
      await SDK.sleep(200);
    } catch (err) {
      expect(err.message).to.include("Status is not ST_RUN");
    }
    await SDK.doWorkByNode(TEST_USER, wfid, "action5");
    await SDK.sleep(200);
    let wlist = await SDK.getWorklist(TEST_USER, {
      wfid: wfid,
      status: "ST_RUN",
      wfstatus: "ST_RUN",
    });
    expect(wlist.total).to.equal(0);
    expect(await SDK.getStatus(wfid)).to.equal("ST_DONE");
  });
});
