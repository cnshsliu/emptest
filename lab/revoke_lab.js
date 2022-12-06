"use strict";

// const { describe, it } = require("node:test");
const Lab = require("@hapi/lab");
const { after, before, describe, it } = (exports.lab = Lab.script());
const { expect } = require("@hapi/code");
const SDK = require("../app.js");
const fs = require("fs");
const SITE_PWD = "site_password_999";
const SITE_ADMIN = { account: "lucas2", name: "Lucas2", password: "Pwd@123" };
const TPL_ID = "test_and_or";

const TID = "revk";
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

describe("Test Revoke: ", {timeout: 5000}, () => {
  let wfid = "lkh_" + SDK.guid();
  let tmpworkid = "";
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

    //审批测试用户加入申请
    let accountsToApprove = myorg.joinapps.map((x) => x.account);
    let leftApps = await SDK.orgApprove(accountsToApprove);
    //审批后，返回的joinapps应该是空数组
    expect(leftApps.ret).to.equal("array");
    expect(leftApps.joinapps).to.be.an.array();
    expect(leftApps.joinapps).to.be.empty();
    //取myorg，同样返回的joinapps应该是空数组
    myorg = await SDK.orgMyOrg();
    expect(myorg.joinapps).to.be.an.array();
    expect(myorg.joinapps).to.be.empty();
  });

  it("Upload template", async () => {
    const ret = await SDK.putTemplate(
      fs.readFileSync(TEST_TEMPLATE_DIR + "/test_and_or.xml", "utf8"),
      TPL_ID
    );
    expect(ret.tplid).to.equal(TPL_ID);
  });

  it("Read Template", async () => {
    const ret = await SDK.readTemplate(TPL_ID);
    expect(ret.tplid).to.equal(TPL_ID);
  });

  it("START Workflow", async () => {
    const ret = await SDK.startWorkflow(TPL_ID, wfid);
  });

  it("Read workflow", async () => {
    const ret = await SDK.readWorkflow(wfid);
    expect(ret.wfid).to.equal(wfid);
    expect(ret.tplid).to.equal(TPL_ID);
  });

  let action1_todoid = "";
  let action21_todoid = "";
  let action22_todoid = "";
  it("Do action1", { timeout: 5000 }, async () => {
    //get worklist
    await SDK.sleep(500);
    let wlist = await SDK.getWorklist(testUsers[0].account, {
      wfid: wfid,
      nodeid: "action1",
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(1);

    // let fullInfo = await SDK.getWorkInfo(wfid, wlist.objs[0].workid);
    // expect(fullInfo.from_action_workid).to.be.undefined();

    let ret = await SDK.doWork(testUsers[0].account, wlist.objs[0].todoid, {
      input_action1: "action1",
    });
    console.log(ret);
    expect(ret.todoid).to.equal(wlist.objs[0].todoid);
    action1_todoid = ret.todoid;
  });

  it("Check worklistafter action1", { timeout: 600000 }, async () => {
    await SDK.sleep(500);
    let wlist = await SDK.getWorklist(testUsers[0].account, { wfid: wfid, status: "ST_RUN" });
    expect(wlist.total).to.equal(2);
    expect(["action21", "action22"]).to.include(wlist.objs[0].nodeid);
    expect(["action21", "action22"]).to.include(wlist.objs[1].nodeid);

    let fullInfo = await SDK.getWorkInfo(wfid, action1_todoid);
    console.log(fullInfo);
    expect(fullInfo.following_actions).to.have.length(2);
    expect(fullInfo.following_actions[0].nodeid).to.equal("action21");
    expect(fullInfo.following_actions[1].nodeid).to.equal("action22");
    expect(fullInfo.following_actions[0].status).to.equal("ST_RUN");
    expect(fullInfo.following_actions[1].status).to.equal("ST_RUN");
    expect(fullInfo.revocable).to.equal(true);
  });

  it("Revoke DONEed action1", async () => {
    let ret = await SDK.revoke(wfid, action1_todoid);
    await SDK.sleep(500);
    let wlist = await SDK.getWorklist(testUsers[0].account, { wfid: wfid, status: "ST_RUN" });
    expect(wlist.total).to.equal(1);
    expect(wlist.objs[0].nodeid).to.include("action1");
    action1_todoid = wlist.objs[0].todoid;
  });

  it("Fast forward to action3", { timeout: 5000 }, async () => {
    //get worklist
    await SDK.sleep(500);
    let ret = await SDK.doWork(testUsers[0].account, action1_todoid);
    //action1_todoid = ret.workid;
    await SDK.sleep(1000);
    let wlist = await SDK.getWorklist(testUsers[0].account, { wfid: wfid, status: "ST_RUN" });
    expect(wlist.total).to.equal(2);
    if (wlist.objs[0].nodeid === "action21") {
      action21_todoid = wlist.objs[0].todoid;
      action22_todoid = wlist.objs[1].todoid;
    } else {
      action21_todoid = wlist.objs[1].todoid;
      action22_todoid = wlist.objs[0].todoid;
    }
    await SDK.sleep(500);
    await SDK.doWork(testUsers[0].account, action21_todoid);
    await SDK.sleep(500);
    await SDK.doWork(testUsers[0].account, action22_todoid);
  });

  it("Revoke action1 should fail", async () => {
    let ret = await SDK.revoke(wfid, action1_todoid);
    expect(ret.error).to.equals("WORK_NOT_REVOCABLE");
  });
  it("Revoke and redo many times", { timeout: 30000 }, async () => {
    await SDK.sleep(200);
    let action3_todoid = "";
    // 完成action3
    let ret = await SDK.doWorkByNode(testUsers[0].account, wfid, "action3");
    action3_todoid = ret.todoid;
    await SDK.sleep(200);
    // 完成 action3后，后面应该有两个todo
    let wlist = await SDK.getWorklist(testUsers[0].account, { wfid: wfid, status: "ST_RUN" });
    expect(wlist.total).to.equal(2);
    // 撤回 action3
    ret = await SDK.revoke(wfid, action3_todoid);
    expect(ret).to.equal(action3_todoid);
    await SDK.sleep(200);
    // 此时， 工作任务应该就是回到了action3一项
    wlist = await SDK.getWorklist(testUsers[0].account, { wfid: wfid, status: "ST_RUN" });
    expect(wlist.total).to.equal(1);
    expect(wlist.objs[0].nodeid).to.equal("action3");
    await SDK.sleep(200);
    // 此时，因为aciton3是当前活动，不能revoke
    ret = await SDK.revoke(wfid, wlist.objs[0].todoid);
    expect(ret.error).to.equals("WORK_NOT_REVOCABLE");
    await SDK.sleep(200);
    ret = await SDK.doWorkByNode(testUsers[0].account, wfid, "action3");
    // 把这个action3完成
    await SDK.sleep(200);
    await SDK.post("/print/log", { msg: "--------after action3--------" });
  });
  it("Complete following actions", { timeout: 10000 }, async () => {
    try {
      await SDK.sleep(500);
      await SDK.doWorkByNode(testUsers[0].account, wfid, "action41");
    } catch (error) {}
    try {
      await SDK.sleep(500);
      await SDK.doWorkByNode(testUsers[0].account, wfid, "action5");
    } catch (error) {}
    await SDK.sleep(500);
    expect(await SDK.getStatus(wfid)).to.equal("ST_DONE");
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

//TODO: stop /cancel a workflow
