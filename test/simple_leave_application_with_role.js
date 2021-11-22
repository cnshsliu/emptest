"use strict";

const Lab = require("@hapi/lab");
const { expect } = require("@hapi/code");
const { afterEach, beforeEach, describe, it } = (exports.lab = Lab.script());
const fs = require("fs");
const SDK = require("metaflow");

const TEST_USER = process.env.TEST_USER || "liukehong@gmail.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "psammead";
const TEST_TEMPLATE_DIR = process.env.TEST_TEMPLATE_DIR || "unknown_folder";

describe("Simple leave application with roles ", () => {
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
      fs.readFileSync(TEST_TEMPLATE_DIR + "/simple_leave_application_with_role.xml", "utf8")
    );
    expect(ret.tplid).to.equal("simple_leave_application_with_role");
  });

  it("START Workflow", async () => {
    const ret = await SDK.startWorkflow(
      "simple_leave_application_with_role",
      wfid,
      "simple_leave_team"
    );
  });

  it("Configure team", async () => {
    let teamMap = {
      LEADER: [{ uid: "leader1@abcd.com", dname: "leader1" }],
      MANAGER: [
        { uid: "manager1@abcd.com", dname: "manager1" },
        { uid: "manager2@qq.com", dname: "manager2" },
      ],
      DIRECTOR: [
        { uid: "director1@abcd.com", dname: "director1" },
        { uid: "director2@abcd.com", dname: "director2" },
      ],
    };
    let ret = await SDK.uploadTeam("simple_leave_team", teamMap);
    expect(ret.teamid).to.equal("simple_leave_team");
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

  it("Check Vars", async () => {
    await SDK.sleep(1000);
    let allvars = await SDK.getKVars(wfid);
    expect(allvars["days"].value).to.equal(leave_days);
    expect(allvars["reason"].value).to.equal("Go hospital");
    expect(allvars["extra"].value).to.equal("Thank you");
    let wlist = await SDK.getWorklist("director2@abcd.com", {
      wfid: wfid,
      nodeid: "approve_by_director",
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(0);
  });

  it("Do approve_by_leader", { timeout: 5000 }, async () => {
    await SDK.sleep(500);
    let wlist = await SDK.getWorklist("leader1@abcd.com", {
      wfid: wfid,
      nodeid: "approve_by_leader",
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(1);
    //expect(wlist.objs[0].from_nodeid).to.equal("apply");
    let ret = await SDK.doWork("leader1@abcd.com", wlist.objs[0].workid, {}, "approve");
    expect(ret.workid).to.equal(wlist.objs[0].workid);
  });

  it("Do approve_by_director ", { timeout: 5000 }, async () => {
    await SDK.sleep(1000);
    let wlist = await SDK.getWorklist("director1@abcd.com", {
      wfid: wfid,
      nodeid: "approve_by_director",
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(1);
    wlist = await SDK.getWorklist("director2@abcd.com", {
      wfid: wfid,
      nodeid: "approve_by_director",
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(1);
    await SDK.doWorkByNode("director1@abcd.com", wfid, "approve_by_director", {
      days: 3,
    });
    wlist = await SDK.getWorklist("director1@abcd.com", {
      wfid: wfid,
      nodeid: "approve_by_director",
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(0);
    wlist = await SDK.getWorklist("director2@abcd.com", {
      wfid: wfid,
      nodeid: "approve_by_director",
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(0);
  });

  it("Do approve_by_director2 ", { timeout: 5000 }, async () => {
    await SDK.sleep(1000);
    let wlist = await SDK.getWorklist("director1@abcd.com", {
      wfid: wfid,
      nodeid: "approve_by_director2",
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(1);
    wlist = await SDK.getWorklist("director2@abcd.com", {
      wfid: wfid,
      nodeid: "approve_by_director2",
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(1);
    await SDK.doWorkByNode("director1@abcd.com", wfid, "approve_by_director2", {
      days: 3,
    });
    wlist = await SDK.getWorklist("director1@abcd.com", {
      wfid: wfid,
      nodeid: "approve_by_director2",
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(0);
    wlist = await SDK.getWorklist("director2@abcd.com", {
      wfid: wfid,
      nodeid: "approve_by_director2",
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(1);
    await SDK.doWorkByNode("director2@abcd.com", wfid, "approve_by_director2", {
      days: 6,
    });
  });

  it("Check vars days is 3", { timeout: 5000 }, async () => {
    //await SDK.sleep(500);
    let kvars = await SDK.getKVars(wfid);
    expect(kvars.days.value).to.equal(6);
  });

  it("Check workflow status", async () => {
    await SDK.sleep(1000);
    let ret = await SDK.getStatus(wfid);
    expect(ret).to.equal("ST_DONE");
  });

  it("Delete team", async () => {
    let ret = await SDK.deleteTeam("simple_leave_team");
    expect(ret.deletedCount).to.equal(1);
    ret = await SDK.getTeamFullInfo("simple_leave_team");
    expect(ret.teamid).to.be.undefined();
  });
});
