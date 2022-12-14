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

const testUsers = [
  { account: "bya_test_user_lkh", passwd: "Password@123", name: "UserLKH_" + SDK.randomString(7) },
  { account: "bya_test_user_001", passwd: "Password@123", name: "User001_" + SDK.randomString(7) },
  { account: "bya_test_user_002", passwd: "Password@123", name: "User002_" + SDK.randomString(7) },
  { account: "bya_test_user_003", passwd: "Password@123", name: "User003_" + SDK.randomString(7) },
  { account: "bya_test_user_004", passwd: "Password@123", name: "User004_" + SDK.randomString(7) },
  { account: "bya_test_user_005", passwd: "Password@123", name: "User005_" + SDK.randomString(7) },
  { account: "bya_test_user_006", passwd: "Password@123", name: "User006_" + SDK.randomString(7) },
];

const TEST_TEMPLATE_DIR = process.env.TEST_TEMPLATE_DIR || "./templates";

const TPL_ID = "my_byall";

const getAccount = (idx: number) => {
  return testUsers[idx].account;
};
const getEid = (idx: number) => {
  return getAccount(idx) + "_eid";
};
describe("byall", { timeout: 5000 }, () => {
  let wfid = "lkh_" + SDK.guid();
  let tmp1, tmp2;
  // SDK.setServer("http://emp.localhost:5008");
  SDK.setServer("http://emp.localhost");
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
  it("Upload template", async () => {
    const ret = await SDK.putTemplate(
      fs.readFileSync(TEST_TEMPLATE_DIR + "/byall.xml", "utf8"),
      TPL_ID
    );
    expect(ret.tplid).to.equal(TPL_ID);
  });

  it("Configure byall team", async () => {
    let teamMap = {
      alldoers: [
        { eid: getEid(1), cn: "manager1" },
        { eid: getEid(2), cn: "manager2" },
      ],
    };
    let ret = await SDK.uploadTeam("byall_team", teamMap);
    expect(ret.teamid).to.equal("byall_team");
  });

  it("START Workflow", async () => {
    let ret = await SDK.startWorkflow(TPL_ID, wfid, "byall_team");
    //get worklist
    await SDK.sleep(500);
    tmp1 = await SDK.getWorklist(getEid(1), {
      wfid: wfid,
      nodeid: "hellohyperflow",
      status: "ST_RUN",
    });
    expect(tmp1.total).to.equal(1);
    expect(tmp1.objs.length).to.equal(1);
  });

  it("Check manager2's worklist", async () => {
    await SDK.sleep(500);
    tmp2 = await SDK.getWorklist(getEid(2), {
      wfid: wfid,
      nodeid: "hellohyperflow",
      status: "ST_RUN",
    });
    expect(tmp2.total).to.equal(1);
    expect(tmp2.objs.length).to.equal(1);
  });

  it("do manager1 work", async () => {
    await SDK.sleep(500);
    let ret = await SDK.doWork(getEid(1), tmp1.objs[0].todoid, {
      reason: "Go hospital",
      extra: "Thank you",
    });
    expect(ret.todoid).to.equal(tmp1.objs[0].todoid);
  });

  it("Check workflow status", async () => {
    await SDK.sleep(1000);
    let ret = await SDK.getStatus(wfid);
    expect(ret).to.equal("ST_RUN");
  });

  it("do manager2's work", async () => {
    await SDK.sleep(500);
    let ret = await SDK.doWork(getEid(2), tmp2.objs[0].todoid, {
      reason: "Go hospital",
      extra: "Thank you",
    });
    expect(ret.todoid).to.equal(tmp2.objs[0].todoid);
  });

  it("Check workflow status", async () => {
    await SDK.sleep(1000);
    let ret = await SDK.getStatus(wfid);
    expect(ret).to.equal("ST_DONE");
  });
  /*
   */

  it("Delete team", async () => {
    let ret = await SDK.deleteTeam("byall_team");
    expect(ret.deletedCount).to.equal(1);
    ret = await SDK.getTeamFullInfo("byall_team");
    expect(ret.teamid).to.be.undefined();
  });

  it("cleaning up", async () => {
    await SDK.sleep(3000);
    await SDK.destroyWorkflowByTplid(TPL_ID);
    await SDK.deleteTemplateByTplid(TPL_ID);
    await SDK.login(SITE_ADMIN.account, SITE_ADMIN.password);
    for (let i = 1; i < testUsers.length; i++) {
      await SDK.removeUser(testUsers[i].account, SITE_PWD);
    }
    await SDK.removeUser(testUsers[0].account, SITE_PWD);
    await SDK.removeUser(SITE_ADMIN.account, SITE_PWD);
  });
});
