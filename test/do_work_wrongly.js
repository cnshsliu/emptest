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
  SDK.setServer("http://localhost:5008");
  it("Login", async () => {
    const ret = await SDK.login(TEST_USER, TEST_PASSWORD);
    expect(ret.user.username).to.not.be.empty();
  });

  it("Upload with ID in template", async () => {
    const ret = await SDK.putTemplate(
      fs.readFileSync(TEST_TEMPLATE_DIR + "/simple_leave_application.xml", "utf8")
    );
    expect(ret.tplid).to.equal("simple_leave_application");
  });

  it("START Workflow", async () => {
    const ret = await SDK.startWorkflow("simple_leave_application", wfid);
  });

  let leave_days = 6;
  it("Do apply", { timeout: 5000 }, async () => {
    //get worklist
    await SDK.sleep(500);
    let wlist = await SDK.getWorklist(TEST_USER, { wfid: wfid, nodeid: "apply", status: "ST_RUN" });
    expect(wlist.total).to.equal(1);
    //expect(wlist.objs[0].from_nodeid).to.equal("start");

    let ret = await SDK.doWork(TEST_USER, wlist.objs[0].workid, {
      days: leave_days,
      reason: "Go hospital",
      extra: "Thank you",
    });
    expect(ret.workid).to.equal(wlist.objs[0].workid);
  });

  it("检查变量", async () => {
    await SDK.sleep(1000);
    let allvars = await SDK.getKVars(wfid);
    expect(allvars["days"].value).to.equal(leave_days);
    expect(allvars["reason"].value).to.equal("Go hospital");
    expect(allvars["extra"].value).to.equal("Thank you");
  });

  it("Do approve_by_leader", { timeout: 5000 }, async () => {
    await SDK.sleep(500);
    let wlist = await SDK.getWorklist(TEST_USER, {
      wfid: wfid,
      nodeid: "approve_by_leader",
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(1);
    //expect(wlist.objs[0].from_nodeid).to.equal("apply");
    let ret = await SDK.doWork(TEST_USER, wlist.objs[0].workid, {}, "approve");
    expect(ret.workid).to.equal(wlist.objs[0].workid);
  });

  it("Do approve_by_director ", { timeout: 5000 }, async () => {
    await SDK.sleep(2000);
    let wlist = await SDK.getWorklist(TEST_USER, {
      wfid: wfid,
      nodeid: "approve_by_director",
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(1);
    //expect(wlist.objs[0].from_nodeid).to.equal("approve_by_leader");
    let ret = await SDK.doWorkByNode(TEST_USER, wfid, "approve_by_director", {
      days: 3,
    });

    expect(ret.workid).to.equal(wlist.objs[0].workid);
  });

  it("Do a not exist work ", { timeout: 5000 }, async () => {
    await SDK.sleep(2000);
    //expect(wlist.objs[0].from_nodeid).to.equal("approve_by_leader");
    let ret = await SDK.doWorkByNode(TEST_USER, wfid, "approve_by_director_not_exist", {
      days: 3,
    });
    expect(ret.error).to.equal("WORK_RUNNING_NOT_EXIST");
    expect(ret.message).to.include("not found");
  });
  it("Do a alreay ST_DONE work ", { timeout: 5000 }, async () => {
    await SDK.sleep(2000);
    //expect(wlist.objs[0].from_nodeid).to.equal("approve_by_leader");
    let ret = await SDK.doWorkByNode(TEST_USER, wfid, "approve_by_director", {
      days: 3,
    });
    expect(ret.error).to.equal("WORK_RUNNING_NOT_EXIST");
    expect(ret.message).to.include("not found");
  });

  it("检查变量 days is 3", { timeout: 5000 }, async () => {
    await SDK.sleep(500);
    let kvars = await SDK.getKVars(wfid);
    expect(kvars.days.value).to.equal(3);
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
