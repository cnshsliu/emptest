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
  let wfid2 = "lkh_" + SDK.guid();
  let tmpworkid = "";
  SDK.setServer("http://localhost:5008");
  it("Login", async () => {
    const ret = await SDK.login(TEST_USER, TEST_PASSWORD);
    expect(ret.user.username).to.not.be.empty();
  });

  it("Upload template", async () => {
    let ret = await SDK.putTemplate(
      fs.readFileSync(TEST_TEMPLATE_DIR + "/test_and_or.xml", "utf8")
    );
    expect(ret.tplid).to.equal("test_and_or");
  });

  it("START Workflow", async () => {
    let ret = await SDK.startWorkflow("test_and_or", wfid);
  });

  let action1_workid = "";
  it("Do action1", { timeout: 5000 }, async () => {
    //get worklist
    await SDK.sleep(500);
    let tmp = await SDK.getWorklist(TEST_USER, {
      wfid: wfid,
      nodeid: "action1",
      status: "ST_RUN",
      wfstatus: "ST_RUN",
    });
    expect(tmp.total).to.equal(1);

    // let fullInfo = await SDK.getWorkitemFullInfo(wfid, tmp.objs[0].workid);
    // expect(fullInfo.from_action_workid).to.be.undefined();

    let ret = await SDK.doWork(TEST_USER, tmp.objs[0].workid, {
      input_action1: "action1",
    });
    expect(ret.workid).to.equal(tmp.objs[0].workid);
    action1_workid = ret.workid;
  });

  it("Check worklistafter action1", { timeout: 5000 }, async () => {
    await SDK.sleep(500);
    let tmp = await SDK.getWorklist(TEST_USER, {
      wfid: wfid,
      status: "ST_RUN",
      wfstatus: "ST_RUN",
    });
    expect(tmp.total).to.equal(2);
    expect(["action21", "action22"]).to.include(tmp.objs[0].nodeid);
    expect(["action21", "action22"]).to.include(tmp.objs[1].nodeid);

    let fullInfo = await SDK.getWorkitemFullInfo(wfid, action1_workid);
    expect(fullInfo.following_actions).to.have.length(2);
    expect(fullInfo.following_actions[0].nodeid).to.equal("action21");
    expect(fullInfo.following_actions[1].nodeid).to.equal("action22");
    expect(fullInfo.following_actions[0].status).to.equal("ST_RUN");
    expect(fullInfo.following_actions[1].status).to.equal("ST_RUN");
    expect(fullInfo.revocable).to.equal(true);
  });

  it("Pause/Resume workflow", { timeout: 5000 }, async () => {
    await SDK.sleep(500);
    expect(await SDK.getStatus(wfid)).to.equal("ST_RUN");
    expect(
      (await SDK.getWorklist(TEST_USER, { wfid: wfid, status: "ST_RUN", wfstatus: "ST_RUN" })).total
    ).to.equal(2);
    //Both will work
    //let ret = await SDK.pauseWorkflow(wfid);
    let ret = await SDK.opWorkflow(wfid, "pause");
    expect(ret.status).to.equal("ST_PAUSE");
    expect(
      (await SDK.getWorklist(TEST_USER, { wfid: wfid, status: "ST_RUN", wfstatus: "ST_RUN" })).total
    ).to.equal(0);
    expect((await SDK.resumeWorkflow(wfid)).status).to.equal("ST_RUN");
    expect(
      (await SDK.getWorklist(TEST_USER, { wfid: wfid, status: "ST_RUN", wfstatus: "ST_RUN" })).total
    ).to.equal(2);
  });
  it("Stop workflow", { timeout: 5000 }, async () => {
    await SDK.sleep(500);
    expect((await SDK.stopWorkflow(wfid)).status).to.equal("ST_STOP");
    expect(await SDK.getStatus(wfid)).to.equal("ST_STOP");
    expect((await SDK.resumeWorkflow(wfid)).status).to.equal("ST_STOP");
    expect(
      (await SDK.getWorklist(TEST_USER, { wfid: wfid, status: "ST_RUN", wfstatus: "ST_RUN" })).total
    ).to.equal(0);
  });

  it("2>START Another Workflow", async () => {
    let ret = await SDK.startWorkflow("test_and_or", wfid2);
  });

  it("2>Do until action41/42", { timeout: 5000 }, async () => {
    await SDK.sleep(500);
    await SDK.doWorkByNode(TEST_USER, wfid2, "action1");
    await SDK.sleep(500);
    await SDK.doWorkByNode(TEST_USER, wfid2, "action21");
    await SDK.sleep(500);
    await SDK.doWorkByNode(TEST_USER, wfid2, "action22");
    await SDK.sleep(500);
    await SDK.doWorkByNode(TEST_USER, wfid2, "action3");
  });

  it("2>Pause/Resume workflow", { timeout: 5000 }, async () => {
    await SDK.sleep(500);
    expect(await SDK.getStatus(wfid2)).to.equal("ST_RUN");
    expect(
      (await SDK.getWorklist(TEST_USER, { wfid: wfid2, status: "ST_RUN", wfstatus: "ST_RUN" }))
        .total
    ).to.equal(2);
    expect((await SDK.pauseWorkflow(wfid2)).status).to.equal("ST_PAUSE");
    expect(
      (await SDK.getWorklist(TEST_USER, { wfid: wfid2, status: "ST_RUN", wfstatus: "ST_RUN" }))
        .total
    ).to.equal(0);
    expect((await SDK.resumeWorkflow(wfid2)).status).to.equal("ST_RUN");
    expect(
      (await SDK.getWorklist(TEST_USER, { wfid: wfid2, status: "ST_RUN", wfstatus: "ST_RUN" }))
        .total
    ).to.equal(2);
  });

  it("2>Do action42 - action5", { timeout: 5000 }, async () => {
    await SDK.sleep(500);
    await SDK.doWorkByNode(TEST_USER, wfid2, "action42");
    await SDK.sleep(500);
    await SDK.doWorkByNode(TEST_USER, wfid2, "action5");
  });

  it("Should have no workitem now", { timeout: 5000 }, async () => {
    await SDK.sleep(500);
    expect(
      (await SDK.getWorklist(TEST_USER, { wfid: wfid2, status: "ST_RUN", wfstatus: "ST_RUN" }))
        .total
    ).to.equal(0);
  });

  it("Check workflow status", async () => {
    expect(await SDK.getStatus(wfid2)).to.equal("ST_DONE");
  });
});
