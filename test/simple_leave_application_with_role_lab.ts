"use strict";
import * as Lab from "@hapi/lab";
import { expect } from "@hapi/code";
const lab = Lab.script();
const { describe, it, before } = lab;

export { lab };
import SDK from "../app.js";
import fs from "fs";
const SITE_PWD = "site_password_999";
const SITE_ADMIN = { account: "lucas2", name: "Lucas2", password: "Pwd@123" };
const TPL_ID = "inform_example";

const TID = "spl2";
const testUsers = [
  {
    account: TID + "_" + "test_user_lkh",
    passwd: "Password@123",
    name: "UserLKH_" + SDK.randomString(6),
  },
  {
    account: TID + "_" + "test_user_001",
    passwd: "Password@123",
    name: "User001_" + SDK.randomString(6),
  },
  {
    account: TID + "_" + "test_user_002",
    passwd: "Password@123",
    name: "User002_" + SDK.randomString(6),
  },
  {
    account: TID + "_" + "test_user_003",
    passwd: "Password@123",
    name: "User003_" + SDK.randomString(6),
  },
  {
    account: TID + "_" + "test_user_004",
    passwd: "Password@123",
    name: "User004_" + SDK.randomString(6),
  },
  {
    account: TID + "_" + "test_user_005",
    passwd: "Password@123",
    name: "User005_" + SDK.randomString(6),
  },
  {
    account: TID + "_" + "test_user_006",
    passwd: "Password@123",
    name: "User006_" + SDK.randomString(6),
  },
];

const TEST_TEMPLATE_DIR = process.env.TEST_TEMPLATE_DIR || "./templates";

const getAccount = (idx: number) => {
  return testUsers[idx].account;
};
const getEid = (idx: number) => {
  return getAccount(idx) + "_eid";
};
describe("Simple leave application with roles ", { timeout: 5000 }, () => {
  let wfid = "lkh_" + SDK.guid();
  SDK.setServer("http://emp.localhost");
  // SDK.setServer("http://emp.localhost:5008");
  it("prepare admin account ", async () => {
    try {
      await SDK.register(SITE_ADMIN.account, SITE_ADMIN.name, SITE_ADMIN.password);
    } catch (e) {}
  });

  it("Step 1: Prepare test account", async () => {
    //清理掉遗留的测试用户
    try {
      await SDK.login(SITE_ADMIN.account, SITE_ADMIN.password);
      for (let i = 0; i < testUsers.length; i++) {
        await SDK.removeUser(testUsers[i].account, SITE_PWD);
      }
    } finally {
    }
    //重新注册所有测试用户
    for (let i = 0; i < testUsers.length; i++) {
      await SDK.register(testUsers[i].account, testUsers[i].name, testUsers[i].passwd);
    }
    let ret = await SDK.login(testUsers[0].account, testUsers[0].passwd);
    let tenant_id = ret.user.tenant._id.toString();
    expect(ret.user.username).to.not.be.empty();
    //清理遗留的申请信息
    await SDK.orgClearJoinApplications();
    //将当前用户的tenant设为组织

    //将当前用户的tenant设为组织
    await SDK.login(SITE_ADMIN.account, SITE_ADMIN.password);
    ret = await SDK.post("/tnt/set/orgmode", { password: SITE_PWD, tenant_id: tenant_id });
    expect(ret).to.equal(true);
    await SDK.login(testUsers[0].account, testUsers[0].passwd);

    let joincodeRet = await SDK.orgJoinCodeNew();
    //申请加入组织
    for (let i = 0; i < testUsers.length; i++) {
      await SDK.login(testUsers[i].account, testUsers[i].passwd);
      let ret = await SDK.orgJoin(joincodeRet.joincode);
      expect(ret.code).to.equal("ok");
    }

    await SDK.login(testUsers[0].account, testUsers[0].passwd);
    //获得组织全部信息
    // console.log(myorg);
    let employees = await SDK.orgGetEmployees({ eids: [], active: 1 });
    console.log(employees);
    expect(employees.length).to.equal(1);

    //审批测试用户加入申请
    let myorg = await SDK.orgMyOrg();
    let accountsToApprove = myorg.joinapps.map((x) => x.account);
    let account_eids = accountsToApprove.map((x) => {
      return {
        account: x,
        eid: x + "_eid",
      };
    });
    let leftApps = await SDK.orgApprove(account_eids);
    //审批后，返回的joinapps应该是空数组
    expect(leftApps.ret).to.equal("array");
    expect(leftApps.joinapps).to.be.an.array();
    expect(leftApps.joinapps).to.be.empty();
    employees = await SDK.orgGetEmployees({ eids: [], active: 1 });
    expect(employees.length).to.equal(testUsers.length);
    //取myorg，同样返回的joinapps应该是空数组
    myorg = await SDK.orgMyOrg();
    //console.log(myorg);
    expect(myorg.joinapps).to.be.an.array();
    expect(myorg.joinapps).to.be.empty();
  });
  it("Upload with ID in template", async () => {
    const ret = await SDK.putTemplate(
      fs.readFileSync(TEST_TEMPLATE_DIR + "/simple_leave_application_with_role.xml", "utf8"),
      TPL_ID
    );
    expect(ret.tplid).to.equal(TPL_ID);
  });

  it("START Workflow", async () => {
    const ret = await SDK.startWorkflow(TPL_ID, wfid, "simple_leave_team");
  });

  it("Configure team", async () => {
    let teamMap = {
      LEADER: [{ eid: getEid(0), cn: "leader1" }],
      MANAGER: [
        { eid: getEid(1), cn: "manager1" },
        { eid: getEid(2), cn: "manager2" },
      ],
      DIRECTOR: [
        { eid: getEid(3), cn: "director1" },
        { eid: getEid(4), cn: "director2" },
      ],
    };
    let ret = await SDK.uploadTeam("simple_leave_team", teamMap);
    expect(ret.teamid).to.equal("simple_leave_team");
  });

  let leave_days = 6;
  it("Do apply", { timeout: 5000 }, async () => {
    //get worklist
    await SDK.sleep(500);
    let wlist = await SDK.getWorklist(getEid(0), {
      wfid: wfid,
      nodeid: "apply",
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(1);
    //expect(wlist.objs[0].from_nodeid).to.equal("start");

    let ret = await SDK.doWork(getEid(0), wlist.objs[0].todoid, {
      days: leave_days,
      reason: "Go hospital",
      extra: "Thank you",
    });
    expect(ret.todoid).to.equal(wlist.objs[0].todoid);
  });

  it("Check Vars", async () => {
    await SDK.sleep(1000);
    let allvars = await SDK.getKVars(wfid);
    expect(allvars["days"].value).to.equal(leave_days);
    expect(allvars["reason"].value).to.equal("Go hospital");
    expect(allvars["extra"].value).to.equal("Thank you");
    let wlist = await SDK.getWorklist(getEid(4), {
      wfid: wfid,
      nodeid: "approve_by_director",
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(0);
  });

  it("Do approve_by_leader", { timeout: 5000 }, async () => {
    await SDK.sleep(500);
    let wlist = await SDK.getWorklist(getEid(0), {
      wfid: wfid,
      nodeid: "approve_by_leader",
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(1);
    //expect(wlist.objs[0].from_nodeid).to.equal("apply");
    //the LEADER participant
    let ret = await SDK.doWork(getEid(0), wlist.objs[0].todoid, {}, "approve");
    expect(ret.todoid).to.equal(wlist.objs[0].todoid);
  });

  it("Do approve_by_director ", { timeout: 5000 }, async () => {
    await SDK.sleep(1000);
    let wlist = await SDK.getWorklist(getEid(3), {
      wfid: wfid,
      nodeid: "approve_by_director",
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(1);
    wlist = await SDK.getWorklist(getEid(4), {
      wfid: wfid,
      nodeid: "approve_by_director",
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(1);
    await SDK.doWorkByNode(getEid(3), wfid, "approve_by_director", {
      days: 3,
    });
    wlist = await SDK.getWorklist(getEid(3), {
      wfid: wfid,
      nodeid: "approve_by_director",
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(0);
    wlist = await SDK.getWorklist(getEid(4), {
      wfid: wfid,
      nodeid: "approve_by_director",
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(0);
  });

  it("Do approve_by_director2 ", { timeout: 5000 }, async () => {
    await SDK.sleep(1000);
    let wlist = await SDK.getWorklist(getEid(3), {
      wfid: wfid,
      nodeid: "approve_by_director2",
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(1);
    wlist = await SDK.getWorklist(getEid(4), {
      wfid: wfid,
      nodeid: "approve_by_director2",
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(1);
    await SDK.doWorkByNode(getEid(3), wfid, "approve_by_director2", {
      days: 3,
    });
    wlist = await SDK.getWorklist(getEid(3), {
      wfid: wfid,
      nodeid: "approve_by_director2",
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(0);
    wlist = await SDK.getWorklist(getEid(4), {
      wfid: wfid,
      nodeid: "approve_by_director2",
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(1);
    await SDK.doWorkByNode(getEid(4), wfid, "approve_by_director2", {
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

  it("cleaning up", async () => {
    await SDK.sleep(3000);
    await SDK.destroyWorkflowByTplid(TPL_ID);
    await SDK.deleteTemplateByTplid(TPL_ID);
    await SDK.login(SITE_ADMIN.account, SITE_ADMIN.password);
    for (let i = 0; i < testUsers.length; i++) {
      await SDK.removeUser(testUsers[i].account, SITE_PWD);
    }
    await SDK.removeUser(SITE_ADMIN.account, SITE_PWD);
  });
});
