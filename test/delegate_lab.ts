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

const TID = "dlgt";
const testUsers = [
  {
    account: TID + "_user_test_lkh",
    passwd: "Password@123",
    name: "UserLKH_" + SDK.randomString(7),
  },
  {
    account: TID + "_user_test_001",
    passwd: "Password@123",
    name: "User001_" + SDK.randomString(7),
  },
  {
    account: TID + "_user_test_002",
    passwd: "Password@123",
    name: "User002_" + SDK.randomString(7),
  },
  {
    account: TID + "_user_test_003",
    passwd: "Password@123",
    name: "User003_" + SDK.randomString(7),
  },
  {
    account: TID + "_user_test_004",
    passwd: "Password@123",
    name: "User004_" + SDK.randomString(7),
  },
  {
    account: TID + "_user_test_005",
    passwd: "Password@123",
    name: "User005_" + SDK.randomString(7),
  },
  {
    account: TID + "_user_test_006",
    passwd: "Password@123",
    name: "User006_" + SDK.randomString(7),
  },
];

const TEST_TEMPLATE_DIR = process.env.TEST_TEMPLATE_DIR || "./templates";

const TPL_ID = "simple_leave_application";

const getAccount = (idx:number) => {
  return testUsers[idx].account;
};
const getEid = (idx:number) => {
  return getAccount(idx) + "_eid";
};
describe("Test Delegation: ", { timeout: 5000 }, () => {
  let wfid = "lkh_" + SDK.guid();
  let username = "";
  let password = "";
  let email = "";
  let verifyEmailToken = "";
  let res;
  let joincode;
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
  it("set member's group", async () => {
    res = await SDK.orgSetEmployeeGroup([getEid(1)], "DOER");
    res = await SDK.orgSetEmployeeGroup([getEid(2)], "DOER");
    res = await SDK.orgGetEmployees({ eids: [getEid(1)] });
    expect(res[0].group).to.equal("DOER");
    res = await SDK.orgGetEmployees({ eids: [getEid(2)] });
    expect(res[0].group).to.equal("DOER");
  });
  it("test delegation", async () => {
    res = await SDK.login(testUsers[1].account, testUsers[1].passwd);
    res = await SDK.putTemplate(
      fs.readFileSync(TEST_TEMPLATE_DIR + "/simple_leave_application.xml", "utf8"),
      TPL_ID
    );
    expect(res.tplid).to.equal(TPL_ID);
    res = await SDK.startWorkflow(TPL_ID, wfid);
    await SDK.sleep(1000);
    res = await SDK.getWorklist(getEid(1), 10);
    expect(res.total).to.be.greaterThan(0);
    expect(res.objs[0].doer).to.equal(getEid(1));

    wfid = "lkh_" + SDK.guid();
    res = await SDK.login(testUsers[2].account, testUsers[2].passwd);
    res = await SDK.startWorkflow(TPL_ID, wfid);
    await SDK.sleep(1000);
    res = await SDK.getWorklist(getEid(2), 10);
    let no_of_user_2 = res.total;
    expect(res.total).to.be.greaterThan(0);
    expect(res.objs[0].doer).to.equal(getEid(2));

    ////   user  1     delegate  to  user   2
    res = await SDK.login(testUsers[1].account, testUsers[1].passwd);
    res = await SDK.getWorklist(getEid(1), 10);
    let no_of_user_1 = res.total;
    let today = new Date();
    let begindate = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    today.setDate(today.getDate() + 3);
    let enddate = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;

    begindate = new moment().format("YYYY-MM-DD");
    enddate = new moment().add(3, "days").format("YYYY-MM-DD");
    res = await SDK.post("delegate", {
      delegatee: getEid(2),
      begindate: begindate,
      enddate: enddate,
    });
    res = await SDK.post("delegation/from/me");
    expect(res.length).to.equal(1);

    ////   user  2 check delegation to him
    res = await SDK.login(testUsers[2].account, testUsers[2].passwd);
    res = await SDK.post("delegation/to/me");
    let number_of_delegation_to_me = res.length;
    res = await SDK.post("delegation/to/me/today");
    let number_of_delegation_to_me_today = res.length;
    expect(number_of_delegation_to_me).to.equal(1);
    expect(number_of_delegation_to_me_today).to.equal(1);
    expect(number_of_delegation_to_me >= number_of_delegation_to_me_today).to.be.true();
    res = await SDK.getWorklist(getEid(2), 10, { debug: false });
    let no_of_user_2_all = res.total;
    expect(res.total > 0).to.be.true();

    //// user    1     undelegate
    res = await SDK.login(testUsers[1].account, testUsers[1].passwd);
    res = await SDK.post("delegation/from/me");
    let ids = res.map((x) => x._id);
    res = await SDK.post("undelegate", { ids });

    //// user   2   should have no work now
    res = await SDK.login(testUsers[2].account, testUsers[2].passwd);
    res = await SDK.getWorklist(getEid(2), 10);
    res = await SDK.post("delegation/to/me");
    ids = res.map((x) => x._id);
    expect(ids.length).to.equal(0);
  });

  it("cleaning up", async () => {
    await SDK.sleep(3000);
    res = await SDK.login(testUsers[0].account, testUsers[0].passwd);
    await SDK.destroyWorkflowByTplid(TPL_ID);
    await SDK.deleteTemplateByTplid(TPL_ID);
    await SDK.login(SITE_ADMIN.account, SITE_ADMIN.password);
    for (let i = 1; i < testUsers.length; i++) {
      await SDK.removeUser(testUsers[i].account, SITE_PWD);
    }
    await SDK.removeUser(testUsers[0].account, SITE_PWD);
  });
});
