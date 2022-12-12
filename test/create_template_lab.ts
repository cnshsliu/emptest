"use strict";
import * as Lab from "@hapi/lab";
import { expect } from "@hapi/code";
const lab = Lab.script();
const { describe, it, before } = lab;

export { lab };
const SDK = require("../app.js");
const fs = require("fs");
const SITE_PWD = "site_password_999";
const SITE_ADMIN = { account: "lucas2", name: "Lucas2", password: "Pwd@123" };

const TID = "crttpl";
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

const TPL_ID = "complete_1_among_many_doers";

const getAccount = (number) => {
  return testUsers[number].account;
};
const getEid = (number) => {
  return getAccount(number) + "_eid";
};
describe("Test: ", { timeout: 5000 }, () => {
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
  it("Create Template", async () => {
    const ret = await SDK.createTemplate("Hello HyperFlow");
    expect(ret.tplid).to.equal("Hello HyperFlow");
  });

  it("Delete Template", async () => {
    const ret = await SDK.deleteTemplateByTplid("Hello HyperFlow");
    expect(ret.deletedCount).to.equal(1);
  });
  it("cleaning up test users", async () => {
    await SDK.sleep(500);
    await SDK.login(SITE_ADMIN.account, SITE_ADMIN.password);
    for (let i = 1; i < testUsers.length; i++) {
      await SDK.removeUser(testUsers[i].account, SITE_PWD);
    }
    await SDK.removeUser(testUsers[0].account, SITE_PWD);
  });
});
