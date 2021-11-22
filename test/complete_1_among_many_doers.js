"use strict";

const Lab = require("@hapi/lab");
const { expect } = require("@hapi/code");
const { afterEach, beforeEach, describe, it } = (exports.lab = Lab.script());
const fs = require("fs");
const SDK = require("metaflow");

const TEST_USER = process.env.TEST_USER || "liukehong@gmail.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "psammead";
const TEST_TEMPLATE_DIR = process.env.TEST_TEMPLATE_DIR || "unknown_folder";

describe("Complete 1 among many doers ", () => {
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
      fs.readFileSync(TEST_TEMPLATE_DIR + "/complete_1_among_many_doers.xml", "utf8")
    );
    expect(ret.tplid).to.equal("complete_1_among_many_doers");
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

  it("START Workflow", async () => {
    const ret = await SDK.startWorkflow("complete_1_among_many_doers", wfid, "simple_leave_team");
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
      reason: "Go hospital...",
      extra: "Thank you",
    });
    expect(ret.workid).to.equal(wlist.objs[0].workid);
  });

  it("Check vars", async () => {
    await SDK.sleep(1000);
    let allvars = await SDK.getKVars(wfid);
    expect(allvars["days"].value).to.equal(leave_days);
    expect(allvars["reason"].value).to.equal("Go hospital...");
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

  it("Do approve_by_any_director ", { timeout: 5000 }, async () => {
    await SDK.sleep(1000);
    //取D1的工作列表，应该有一项
    let wlist = await SDK.getWorklist("director1@abcd.com", {
      wfid: wfid,
      nodeid: "approve_by_any_director",
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(1);
    //取D2的工作列表，应该有一项
    wlist = await SDK.getWorklist("director2@abcd.com", {
      wfid: wfid,
      nodeid: "approve_by_any_director",
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(1);
    //D1完成工作
    await SDK.doWorkByNode("director1@abcd.com", wfid, "approve_by_any_director", {
      days: 3,
    });
    //D1工作项应该没有了
    wlist = await SDK.getWorklist("director1@abcd.com", {
      wfid: wfid,
      nodeid: "approve_by_any_director",
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(0);
    //D2的工作项应该也没有了
    wlist = await SDK.getWorklist("director2@abcd.com", {
      wfid: wfid,
      nodeid: "approve_by_any_director",
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(0);
  });

  it("Do approve_by_all_director ", { timeout: 5000 }, async () => {
    await SDK.sleep(1000);
    let wlist = await SDK.getWorklist("director1@abcd.com", {
      wfid: wfid,
      nodeid: "approve_by_all_director",
      status: "ST_RUN",
    });
    //D1的工作列表应有1项
    expect(wlist.total).to.equal(1);
    wlist = await SDK.getWorklist("director2@abcd.com", {
      wfid: wfid,
      nodeid: "approve_by_all_director",
      status: "ST_RUN",
    });
    //D2的工作列表应有1项
    expect(wlist.total).to.equal(1);
    //D1完成工作
    await SDK.doWorkByNode("director1@abcd.com", wfid, "approve_by_all_director", {
      days: 3,
    });
    wlist = await SDK.getWorklist("director1@abcd.com", {
      wfid: wfid,
      nodeid: "approve_by_all_director",
      status: "ST_RUN",
    });
    //D1工作项应该没有了
    expect(wlist.total).to.equal(0);
    wlist = await SDK.getWorklist("director2@abcd.com", {
      wfid: wfid,
      nodeid: "approve_by_all_director",
      status: "ST_RUN",
    });
    //D2的工作列表依然应有1项
    expect(wlist.total).to.equal(1);
    //D2完成不算做并设置days为6
    await SDK.doWorkByNode("director2@abcd.com", wfid, "approve_by_all_director", {
      days: 6,
    });
  });

  it("Check vars days is 6", { timeout: 5000 }, async () => {
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
    expect(ret.statusCode).to.equal(404);
    expect(ret.error).to.equal("Not Found");
  });
});
