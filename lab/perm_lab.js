"use strict";

// const { describe, it } = require("node:test");
const Lab = require("@hapi/lab");
const { after, before, describe, it } = (exports.lab = Lab.script());
const { expect } = require("@hapi/code");
const SDK = require("../app.js");
const fs = require("fs");
const SITE_PWD = "site_password_999";
const SITE_ADMIN = { account: "lucas2", name: "Lucas2", password: "Pwd@123" };

const TID = "perm";
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

const TPL_ID = "inform_example";

describe("Test Permission Control: ", { timeout: 5000 }, () => {
  let username = "";
  let password = "";
  let email = "";
  let verifyEmailToken = "";
  let res;
  let joincode;
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
    for (let i = 1; i < testUsers.length; i++) {
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
    res = await SDK.orgSetEmployeeGroup([testUsers[1].account], "DOER");
    res = await SDK.orgSetEmployeeGroup([testUsers[2].account], "OBSERVER");
  });
  it("check admin's perm", async () => {
    res = await SDK.myPerm("template", "create");
    console.log(res);
    expect(res).to.be.true();
    res = await SDK.myPerm("template", "read");
    expect(res).to.be.true();
    res = await SDK.myPerm("template", "update");
    expect(res).to.be.true();
    res = await SDK.myPerm("template", "delete");
    expect(res).to.be.true();

    res = await SDK.myPerm("workflow", "create");
    expect(res).to.be.true();
    res = await SDK.myPerm("workflow", "read");
    expect(res).to.be.true();
    res = await SDK.myPerm("workflow", "update");
    expect(res).to.be.true();
    res = await SDK.myPerm("workflow", "delete");
    expect(res).to.be.true();

    res = await SDK.myPerm("work", "create");
    expect(res).to.be.true();
    res = await SDK.myPerm("work", "read");
    expect(res).to.be.true();
    res = await SDK.myPerm("work", "update");
    expect(res).to.be.true();
    res = await SDK.myPerm("work", "delete");
    expect(res).to.be.true();

    res = await SDK.myPerm("team", "create");
    expect(res).to.be.true();
    res = await SDK.myPerm("team", "read");
    expect(res).to.be.true();
    res = await SDK.myPerm("team", "update");
    expect(res).to.be.true();
    res = await SDK.myPerm("team", "delete");
    expect(res).to.be.true();
  });

  it("check DOER's perm", async () => {
    res = await SDK.employeePerm(testUsers[1].account, "template", "create");
    expect(res).to.be.true();
    res = await SDK.employeePerm(testUsers[1].account, "template", "read");
    expect(res).to.be.true();
    res = await SDK.employeePerm(testUsers[1].account, "template", "update");
    expect(res).to.be.false();
    res = await SDK.employeePerm(testUsers[1].account, "template", "delete");
    expect(res).to.be.false();

    res = await SDK.employeePerm(testUsers[1].account, "workflow", "create");
    expect(res).to.be.true();
    res = await SDK.employeePerm(testUsers[1].account, "workflow", "read");
    expect(res).to.be.true();
    res = await SDK.employeePerm(testUsers[1].account, "workflow", "update");
    expect(res).to.be.false();
    res = await SDK.employeePerm(testUsers[1].account, "workflow", "delete");
    expect(res).to.be.false();

    res = await SDK.employeePerm(testUsers[1].account, "work", "create");
    expect(res).to.be.true();
    res = await SDK.employeePerm(testUsers[1].account, "work", "read");
    expect(res).to.be.true();
    res = await SDK.employeePerm(testUsers[1].account, "work", "update");
    expect(res).to.be.false();
    res = await SDK.employeePerm(testUsers[1].account, "work", "delete");
    expect(res).to.be.false();

    res = await SDK.employeePerm(testUsers[1].account, "team", "create");
    expect(res).to.be.true();
    res = await SDK.employeePerm(testUsers[1].account, "team", "read");
    expect(res).to.be.true();
    res = await SDK.employeePerm(testUsers[1].account, "team", "update");
    expect(res).to.be.false();
    res = await SDK.employeePerm(testUsers[1].account, "team", "delete");
    expect(res).to.be.false();
    res = await SDK.employeePerm(testUsers[1].account, "*", "admin");
    expect(res).to.be.false();
  });
  it("check ADMIN's perm", async () => {
    res = await SDK.employeePerm(testUsers[0].account, "*", "admin");
    expect(res).to.be.true();
  });
  it("check OBSERVER's perm", async () => {
    res = await SDK.employeePerm(testUsers[2].account, "template", "create");
    expect(res).to.be.false();
    res = await SDK.employeePerm(testUsers[2].account, "template", "read");
    expect(res).to.be.true();
    res = await SDK.employeePerm(testUsers[2].account, "template", "update");
    expect(res).to.be.false();
    res = await SDK.employeePerm(testUsers[2].account, "template", "delete");
    expect(res).to.be.false();

    res = await SDK.employeePerm(testUsers[2].account, "workflow", "create");
    expect(res).to.be.false();
    res = await SDK.employeePerm(testUsers[2].account, "workflow", "read");
    expect(res).to.be.true();
    res = await SDK.employeePerm(testUsers[2].account, "workflow", "update");
    expect(res).to.be.false();
    res = await SDK.employeePerm(testUsers[2].account, "workflow", "delete");
    expect(res).to.be.false();

    res = await SDK.employeePerm(testUsers[2].account, "work", "create");
    expect(res).to.be.false();
    res = await SDK.employeePerm(testUsers[2].account, "work", "read");
    expect(res).to.be.true();
    res = await SDK.employeePerm(testUsers[2].account, "work", "update");
    expect(res).to.be.false();
    res = await SDK.employeePerm(testUsers[2].account, "work", "delete");
    expect(res).to.be.false();

    res = await SDK.employeePerm(testUsers[2].account, "team", "create");
    expect(res).to.be.false();
    res = await SDK.employeePerm(testUsers[2].account, "team", "read");
    expect(res).to.be.true();
    res = await SDK.employeePerm(testUsers[2].account, "team", "update");
    expect(res).to.be.false();
    res = await SDK.employeePerm(testUsers[2].account, "team", "delete");
    expect(res).to.be.false();
    res = await SDK.employeePerm(testUsers[2].account, "*", "admin");
    expect(res).to.be.false();
  });

  it("cleaning up", async () => {
    await SDK.sleep(3000);
    await SDK.destroyWorkflowByTplid("test_and_or");
    await SDK.deleteTemplateByTplid("test_and_or");
    await SDK.login(SITE_ADMIN.account, SITE_ADMIN.password);
    for (let i = 1; i < testUsers.length; i++) {
      await SDK.removeUser(testUsers[i].account, SITE_PWD);
    }
    await SDK.removeUser(testUsers[0].account, SITE_PWD);
  });
});
