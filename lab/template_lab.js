"use strict";

// const { describe, it } = require("node:test");
const Lab = require("@hapi/lab");
const { after, before, describe, it } = (exports.lab = Lab.script());
const { expect } = require("@hapi/code");
const SDK = require("../app.js");
const fs = require("fs");
const SITE_PWD = "site_password_999";
const SITE_ADMIN = { account: "lucas2", name: "Lucas2", password: "Pwd@123" };
const TPL_ID = "inform_example";

const TID = "tpl1";
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

describe("Test: ", {timeout: 5000}, () => {
  let wfid = "lkh_" + SDK.guid();
  let tmpworkid = "";
  let test_and_or_id = "";
  let new_copy_id = "";
  let new_copy_tplid = "";
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
    let myorg = await SDK.orgMyOrg();
    //console.log(myorg);

    //审批测试用户加入申请
    let accountsToApprove = myorg.joinapps.map((x) => x.account);
    let leftApps = await SDK.orgApprove(accountsToApprove);
    //console.log(leftApps);
    //审批后，返回的joinapps应该是空数组
    expect(leftApps.ret).to.equal("array");
    expect(leftApps.joinapps).to.be.an.array();
    expect(leftApps.joinapps).to.be.empty();
    //取myorg，同样返回的joinapps应该是空数组
    myorg = await SDK.orgMyOrg();
    //console.log(myorg);
    expect(myorg.joinapps).to.be.an.array();
    expect(myorg.joinapps).to.be.empty();
  });

  it("Delete existing test_and_or", async () => {
    let ret = await SDK.deleteTemplateByTplid("test_and_or_copy");
    ret = await SDK.deleteTemplateByTplid("test_and_or");
    if (ret.tplid) {
      expect(ret.tplid).to.equal("test_and_or");
    }
  });

  it("Upload template", async () => {
    const ret = await SDK.putTemplate(
      fs.readFileSync(TEST_TEMPLATE_DIR + "/test_and_or.xml", "utf8"),
      "test_and_or"
    );
    expect(ret.tplid).to.equal("test_and_or");
  });
  it("Check existing test_and_or", async () => {
    let ret = await SDK.readTemplate("test_and_or");
    expect(ret.tplid).to.equal("test_and_or");
    test_and_or_id = ret._id;
  });

  it("Copy template", async () => {
    const ret = await SDK.makeCopyOfTemplate(test_and_or_id);
    new_copy_id = ret._id;
    expect(ret.tplid).to.equal("test_and_or_copy");
  });

  it("Check the copy existing", async () => {
    let ret = await SDK.readTemplate("test_and_or_copy");
    expect(ret.tplid).to.equal("test_and_or_copy");
  });

  it("Copy from tplid to tplid", async () => {
    let ret = await SDK.copyTemplateTo("test_and_or_copy", "test_and_or_copy_copy");
    expect(ret.tplid).to.equal("test_and_or_copy_copy");
  });

  it("Rename the copy to lkh0000", async () => {
    const ret = await SDK.renameTemplateWithIid(new_copy_id, "lkh0000");
    expect(ret.tplid).to.equal("lkh0000");
  });
  it("Rename the copy to lkh1123", async () => {
    const ret = await SDK.renameTemplate("lkh0000", "lkh1123");
    console.log(ret);
    expect(ret.tplid).to.equal("lkh1123");
  });

  it("Download lkh1123", async () => {
    let ret = await SDK.readTemplate("lkh1123");
    expect(ret.tplid).to.equal("lkh1123");
  });

  it("Delete the lkh1123", async () => {
    const ret = await SDK.deleteTemplateByTplid("lkh1123");
    expect(ret.deletedCount).to.equal(1);
  });
  it("Delete the copy_copy", async () => {
    const ret = await SDK.deleteTemplateByTplid("test_and_or_copy_copy");
    expect(ret.deletedCount).to.equal(1);
  });

  it("Check existing lkh1123", async () => {
    let ret = await SDK.readTemplate("lkh1123");
    console.log(ret);
    expect(ret?.error).to.equal("TEMPLATE_NOT_FOUND");
  });

  it("cleaning up", async () => {
    await SDK.sleep(3000);
    const tplids = [
      "test_and_or",
      "test_and_or_copy",
      "test_and_or_copy_copy",
      "lkh0000",
      "lkh1123",
    ];
    for (let i = 0; i < tplids.length; i++) {
      await SDK.destroyWorkflowByTplid(tplids[i]);
      await SDK.deleteTemplateByTplid(tplids[i]);
    }
    await SDK.login(SITE_ADMIN.account, SITE_ADMIN.password);
    for (let i = 0; i < testUsers.length; i++) {
      await SDK.removeUser(testUsers[i].account, SITE_PWD);
    }
  });
});
