"use strict";
import * as Lab from "@hapi/lab";
import { expect } from "@hapi/code";
const lab = Lab.script();
const { describe, it, before } = lab;
const FormData = require("form-data");
export { lab };
import SDK from "../app.js";
import HyperAutomation from "../app.js";
const fs = require("fs");
// const a = require("../static/orgchart.xlsx")
// import fs  from "fs";
const SITE_PWD = "site_password_999";
const SITE_ADMIN = { account: "lucas2", name: "Lucas2", password: "Pwd@123" };
const TPL_ID = "test_and_or";

const TID = "ocht";
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

// const TEST_TEMPLATE_DIR = process.env.TEST_TEMPLATE_DIR || "./templates";

const getAccount = (number) => {
  return testUsers[number].account;
};
const getEid = (number) => {
  return getAccount(number) + "_eid";
};
describe("Test: ", { timeout: 5000 }, () => {
  SDK.setServer("https://emp.localhost");

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
  });
  it("xlsximport", async () => {
    let data = new FormData();
    await data.append("file", fs.createReadStream("./static/orgchart.xlsx"));
    let ret = await SDK.importFromExcel(data);
    expect(ret.ret).to.equal("ok");

    HyperAutomation.setHeader("Content-type", "application/json");
    //
    ret = await SDK.post("orgchart/allous", {});
    // cons
    expect(ret.length).to.equal(4);
    expect(ret[0].ou).to.equal("root");
    expect(ret[0].level).to.equal(0);
    expect(ret[1].level).to.equal(1);
    expect(ret[1].eid).to.equal("OU---");

    ret = await SDK.post("orgchart/expand", { ou: "root", include: true });
    expect(ret.length).to.equal(5);
    expect(ret[0].ou).to.equal("root");
    expect(ret[0].account).to.equal(getAccount(0));
    expect(ret[1].account).to.equal(getAccount(1));
    expect(ret[1].eid).to.equal(getEid(1));
    expect(ret[1].position[0]).to.equal("CEO");
  });
  it("cleaning up", async () => {
    await SDK.login(testUsers[0].account, testUsers[0].passwd);
    await SDK.sleep(1000);
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
