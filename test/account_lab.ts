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

// SDK.setServer("http://emp.localhost:5008");

const testUsers = [
  {
    account: "account_test_user_lkh",
    passwd: "Password@123",
    name: "UserLKH_" + SDK.randomString(7),
  },
  {
    account: "account_test_user_001",
    passwd: "Password@123",
    name: "User001_" + SDK.randomString(7),
  },
  {
    account: "account_test_user_002",
    passwd: "Password@123",
    name: "User002_" + SDK.randomString(7),
  },
  {
    account: "account_test_user_003",
    passwd: "Password@123",
    name: "User003_" + SDK.randomString(7),
  },
  {
    account: "account_test_user_004",
    passwd: "Password@123",
    name: "User004_" + SDK.randomString(7),
  },
  {
    account: "account_test_user_005",
    passwd: "Password@123",
    name: "User005_" + SDK.randomString(7),
  },
  {
    account: "account_test_user_006",
    passwd: "Password@123",
    name: "User006_" + SDK.randomString(7),
  },
];
const getAccount = (idx: number) => {
  return testUsers[idx].account;
};
const getEid = (idx: number) => {
  return getAccount(idx) + "_eid";
};
describe("Test: ", () => {
  SDK.setServer("https://emp.localhost");
  it("prepare admin account ", async () => {
    try {
      await SDK.register(SITE_ADMIN.account, SITE_ADMIN.name, SITE_ADMIN.password);
    } catch (e) {}
  });
  it("Login ", async () => {
    let ret = await SDK.register(testUsers[0].account, testUsers[0].name, testUsers[0].passwd);
    expect(ret.account).to.equal(testUsers[0].account);
    ret = await SDK.login(testUsers[0].account, testUsers[0].passwd);
    expect(ret.user.account).to.equal(testUsers[0].account);
    expect(ret.user.username).to.equal(ret.user.nickname);
    expect(ret.user.username).to.equal(testUsers[0].name);
    expect(ret.user.domain).to.equal(testUsers[0].account + ".mtc123");
    expect(ret.user.domain).to.equal(ret.user.tenant.domain);
    expect(ret.user.tenant.owner).to.equal(testUsers[0].account);
    expect(ret.user.nickname).to.equal(testUsers[0].name);
    expect(ret.user.tenant.orgmode).to.equal(false);
    expect(ret.user.password).to.equal(undefined);
    expect(ret.user.tenant.owner).to.equal(testUsers[0].account);
  });

  it("Register the same account again should fail", async () => {
    SDK.setHttpTimeout(5000);
    let res = await SDK.register(testUsers[0].account, testUsers[0].name, testUsers[0].passwd);
    expect(res?.error).to.equal("DUPLICATE_TENANT_DOMAIN");
    expect(res.message).to.include("already exists");
  });

  it("Profile", async () => {
    let ret = await SDK.profile();
    expect(ret.user.username).to.equal(testUsers[0].name);
    expect(ret.employee.nickname).to.equal(testUsers[0].name);
    expect(ret.tenant.name).to.equal("Org of " + testUsers[0].name);

    //登出
    ret = await SDK.logout();

    //取profile应该取不到
    ret = await SDK.profile();
    expect(ret.error).to.equal("Unauthorized");

    //重新登录
    ret = await SDK.login(testUsers[0].account, testUsers[0].passwd);
    expect(ret.user.account).to.equal(testUsers[0].account);
    expect(ret.user.username).to.equal(ret.user.nickname);
    expect(ret.user.username).to.equal(testUsers[0].name);
    expect(ret.user.domain).to.equal(testUsers[0].account + ".mtc123");
    expect(ret.user.domain).to.equal(ret.user.tenant.domain);
    expect(ret.user.tenant.owner).to.equal(testUsers[0].account);
    expect(ret.user.nickname).to.equal(testUsers[0].name);
    expect(ret.user.tenant.orgmode).to.equal(false);
    expect(ret.user.password).to.equal(undefined);
    expect(ret.user.tenant.owner).to.equal(testUsers[0].account);
    //再取Profile
    ret = await SDK.profile();
    expect(ret.user.username).to.equal(testUsers[0].name);
    expect(ret.tenant.owner).to.equal(ret.user.account);
    expect(ret.employee.eid).to.equal(ret.user.account);
    expect(ret.employee.userid).to.equal(ret.user._id);
  });

  it("change name", async () => {
    let ret = await SDK.setUserName("NEW_USERNAME@");
    expect(ret.statusCode).to.equal(400);
    expect(ret.error).to.equal("Bad Request");
    expect(ret.validation?.source).to.equal("payload");
    expect(ret.validation?.keys).to.include("username");
    ret = await SDK.setUserName("newusername");
    expect(ret.user.username).to.equal("newusername");
    ret = await SDK.profile();
    expect(ret.user.username).to.equal("newusername");
  });
  it("change password", async () => {
    await SDK.setUserPassword(testUsers[0].passwd, "NEW_PASSWORD");
    let ret = await SDK.logout();
    ret = await SDK.login(testUsers[0].account, "NEW_PASSWORD");
    expect(ret.user.account).to.equal(testUsers[0].account);
    expect(ret.user.username).to.equal("newusername");
  });

  it("Availability", async () => {
    let ret = await SDK.post("/account/check/availability", {
      account: testUsers[1].account,
    });
    expect(ret).to.equal("ACCOUNT_AVAILABLE");

    ret = await SDK.register(testUsers[1].account, testUsers[1].name, testUsers[1].passwd);
    expect(ret.account).to.equal(testUsers[1].account);

    ret = await SDK.post("/account/check/availability", {
      account: testUsers[1].account,
    });
    expect(ret.error).to.equal("ACCOUNT_OCCUPIED");
  });

  it("Clean up", async () => {
    await SDK.login(SITE_ADMIN.account, SITE_ADMIN.password);
    await SDK.sleep(1000);
    await SDK.removeUser(testUsers[0].account, SITE_PWD);
    await SDK.removeUser(testUsers[1].account, SITE_PWD);
  });
});
