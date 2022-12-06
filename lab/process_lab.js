"use strict";

// const { describe, it } = require("node:test");
const Lab = require("@hapi/lab");
const { after, before, describe, it } = (exports.lab = Lab.script());
const { expect } = require("@hapi/code");
const SDK = require("../app.js");
const fs = require("fs");
const SITE_PWD = "site_password_999";
const SITE_ADMIN = { account: "lucas2", name: "Lucas2", password: "Pwd@123" };

const TID = "proc";
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

const TPL_ID = "test_and_or";

describe("Test: ", {timeout: 5000}, () => {
  let wfid = "lkh_" + SDK.guid();
  let tmpwork_iid = "";
  // SDK.setServer("http://emp.localhost:5008");
  SDK.setServer("http://emp.localhost");

  it("prepare admin account ", async () => {
    try {
      await SDK.register(SITE_ADMIN.account, SITE_ADMIN.name, SITE_ADMIN.password);
    } catch (e) {}
  });
  it("Step 1: Login", async () => {
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
    let myorg = await SDK.orgMyOrg();
    console.log(myorg);

    //审批测试用户加入申请
    let accountsToApprove = myorg.joinapps.map((x) => x.account);
    let leftApps = await SDK.orgApprove(accountsToApprove);
    console.log(leftApps);
    //审批后，返回的joinapps应该是空数组
    expect(leftApps.ret).to.equal("array");
    expect(leftApps.joinapps).to.be.an.array();
    expect(leftApps.joinapps).to.be.empty();
    //取myorg，同样返回的joinapps应该是空数组
    myorg = await SDK.orgMyOrg();
    console.log(myorg);
    expect(myorg.joinapps).to.be.an.array();
    expect(myorg.joinapps).to.be.empty();
  });

  it("Clear template", async () => {
    const ret = await SDK.deleteTemplateByTplid(TPL_ID + "_copy");
    expect(ret.deletedCount).to.be.within(0, 1);
  });

  it("Upload template", async () => {
    const ret = await SDK.putTemplate(
      fs.readFileSync(TEST_TEMPLATE_DIR + "/test_and_or.xml", "utf8"),
      TPL_ID
    );
    expect(ret.tplid).to.equal(TPL_ID);
    tmpwork_iid = ret._id;
  });

  it("Make a copy", async () => {
    await SDK.copyTemplateTo(TPL_ID, TPL_ID + "_copy");
  });

  it("START Workflow", { timeout: 5000 }, async () => {
    const ret = await SDK.startWorkflow(TPL_ID + "_copy", wfid);
    await SDK.sleep(1000);
  });

  it("Checking existing from list", { timeout: 5000 }, async () => {
    await SDK.sleep(1000);
    let ret = await SDK.workflowSearch({ tplid: TPL_ID + "_copy" });
    console.log(ret);
    expect(ret.objs.length).to.be.above(0);
    for (let i = 0; i < ret.objs.length; i++) {
      let wfid = ret.objs[i].wfid;
      await SDK.destroyWorkflow(wfid);
    }
    await SDK.sleep(1000);
    ret = await SDK.workflowSearch({ tplid: TPL_ID + "_copy" });
    expect(ret.objs.length).to.equal(0);
  });

  it("cleaning up", async () => {
    await SDK.sleep(3000);
    await SDK.destroyWorkflowByTplid(TPL_ID);
    await SDK.deleteTemplateByTplid(TPL_ID);
    await SDK.destroyWorkflowByTplid(TPL_ID + "_copy");
    await SDK.deleteTemplateByTplid(TPL_ID + "_copy");
    await SDK.login(SITE_ADMIN.account, SITE_ADMIN.password);
    for (let i = 0; i < testUsers.length; i++) {
      await SDK.removeUser(testUsers[i].account, SITE_PWD);
    }
  });
});
