"use strict";

// const { describe, it } = require("node:test");
const Lab = require("@hapi/lab");
const { after, before, describe, it } = (exports.lab = Lab.script());
const { expect } = require("@hapi/code");
const SDK = require("../app.js");
const fs = require("fs");
const SITE_PWD = "site_password_999";
const SITE_ADMIN = { account: "lucas2", name: "Lucas2", password: "Pwd@123" };
const TPL_ID = "tones_load";

const TID = "tld1";
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

describe("Tones load: ", {timeout: 5000}, () => {
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

  it("Upload with ID in template", async () => {
    const ret = await SDK.putTemplate(
      fs.readFileSync(TEST_TEMPLATE_DIR + "/tones_load.xml", "utf8"),
      TPL_ID
    );
    expect(ret.tplid).to.equal(TPL_ID);
  });

  it("START Workflow tones_load", async () => {
    const ret = await SDK.startWorkflow(TPL_ID, wfid);
  });

  let leave_days = 6;
  it("Step 1", { timeout: 5000 }, async () => {
    //get worklist
    await SDK.sleep(500);
    let wlist = await SDK.getWorklist(testUsers[0].account, { wfid: wfid, status: "ST_RUN" });
    expect(wlist.total > 0).to.be.true();
    expect(wlist.objs[0].title).to.equal("test set multiple variables");

    let ret = await SDK.doWork(testUsers[0].account, wlist.objs[0].todoid, {
      days: { value: leave_days },
      reason: { value: "Go hospital" },
      extra: { value: "Thank you", label: "Extra Title" },
      alpharray: { value: ["A", "B", "C", "D"], label: "test_array" },
    });
    expect(ret.todoid).to.equal(wlist.objs[0].todoid);
  });

  let ret;
  let repeat_times = 10;

  for (let i = 0; i < repeat_times; i++) {
    it(`Revoke_${i}`, { timeout: 20000 }, async () => {
      ret = await SDK.getWorklist(testUsers[0].account, { wfid: wfid, status: "ST_RUN" }, 10);
      expect(ret.objs[0].title).to.equal("test check variables");
      ret = await SDK.sendback(testUsers[0].account, wfid, ret.objs[0].todoid);
      ret = await SDK.getWorklist(testUsers[0].account, { wfid: wfid, status: "ST_RUN" }, 10);

      expect(ret.objs[0].title).to.equal("test set multiple variables");
      let retDoWork = await SDK.doWork(testUsers[0].account, ret.objs[0].todoid, {
        days: { value: leave_days + i },
        reason: { value: "Go hospital_" + i },
        extra: { value: "Thank you_" + i, label: "Extra Title" },
        alpharray: { value: ["A", "B", "C", "D", `${i}`], label: "test_array" },
      });
      expect(retDoWork.todoid).to.equal(ret.objs[0].todoid);
    });
  }
  it("检查变量", async () => {
    let allvars = await SDK.getKVars(wfid);
    console.log(allvars);
    expect(allvars["days"].value).to.equal(leave_days + repeat_times - 1);
    expect(allvars["reason"].value).to.equal("Go hospital_" + (repeat_times - 1));
    expect(allvars["extra"].value).to.equal("Thank you_" + (repeat_times - 1));
  });

  it("Do check variables with 999999", { timeout: 5000 }, async () => {
    ret = await SDK.getWorklist(testUsers[0].account, { wfid: wfid, status: "ST_RUN" }, 10);
    expect(ret.objs[0].title).to.equal("test check variables");
    let retDoWork = await SDK.doWork(testUsers[0].account, ret.objs[0].todoid, {
      days: { value: 999999 },
    });
    expect(retDoWork.todoid).to.equal(ret.objs[0].todoid);
    let allvars = await SDK.getKVars(wfid);
    expect(allvars["days"].value).to.equal(999999);
    expect(allvars["reason"].value).to.equal("Go hospital_" + (repeat_times - 1));
    expect(allvars["extra"].value).to.equal("Thank you_" + (repeat_times - 1));
  });

  it("Do activity3 ", { timeout: 5000 }, async () => {
    //wait script node complete by trying to get next running work many times
    ret = await SDK.getWorklist(testUsers[0].account, { wfid: wfid, status: "ST_RUN" }, 20);
    console.log(ret);
    expect(ret.total).to.equal(1);
    expect(ret.objs[0].title).to.equal("Activity3");

    let allvars = await SDK.getKVars(wfid);
    //The days values was changed to 1000 in SCRIPT node
    expect(allvars["days"].value).to.equal(1000);
    expect(allvars["reason"].value).to.equal("Go hospital_" + (repeat_times - 1));
    expect(allvars["extra"].value).to.equal("Thank you_" + (repeat_times - 1));
    expect(allvars["script_echo"].value).to.equal("hello script");

    ret = await SDK.doWork(testUsers[0].account, ret.objs[0].todoid, { days: 3 });

    allvars = await SDK.getKVars(wfid);
    expect(allvars["days"].value).to.equal(3);
    expect(allvars["reason"].value).to.equal("Go hospital_" + (repeat_times - 1));
    expect(allvars["extra"].value).to.equal("Thank you_" + (repeat_times - 1));
    expect(allvars["script_echo"].value).to.equal("hello script");
  });

  it("Should have no workitem now", { timeout: 10000 }, async () => {
    let wlist = await SDK.getWorklist(testUsers[0].account, { wfid: wfid, status: "ST_RUN" }, 3);
    console.log(wlist);
    expect(wlist.total).to.equal(0);
  });

  it("Check workflow status", async () => {
    let ret = await SDK.getStatus(wfid);
    expect(ret).to.equal("ST_DONE");
  });

  it("cleaning up", async () => {
    await SDK.sleep(3000);
    await SDK.destroyWorkflowByTplid(TPL_ID);
    await SDK.deleteTemplateByTplid(TPL_ID);
    await SDK.login(SITE_ADMIN.account, SITE_ADMIN.password);
    for (let i = 0; i < testUsers.length; i++) {
      await SDK.removeUser(testUsers[i].account, SITE_PWD);
    }
  });
});
