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
const TID = "sbck";
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

describe("Test: ", { timeout: 5000 }, () => {
  let wfid = "lkh_" + SDK.guid();
  let tmptodoid = "";
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
  it("Upload template", async () => {
    const ret = await SDK.putTemplate(
      fs.readFileSync(TEST_TEMPLATE_DIR + "/test_and_or.xml", "utf8"),
      TPL_ID
    );
    expect(ret.tplid).to.equal(TPL_ID);
  });

  it("START Workflow", async () => {
    const ret = await SDK.startWorkflow(TPL_ID, wfid);
  });

  let action1_todoid = "";
  it("Do action1", { timeout: 5000 }, async () => {
    //get worklist
    await SDK.sleep(500);
    let wlist = await SDK.getWorklist(testUsers[0].account, {
      wfid: wfid,
      nodeid: "action1",
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(1);

    // let fullInfo = await SDK.getWorkInfo(wfid, wlist.objs[0].todoid);
    // expect(fullInfo.from_action_todoid).to.be.undefined();

    let ret = await SDK.doWork(testUsers[0].account, wlist.objs[0].todoid, {
      input_action1: "action1",
    });
    expect(ret.todoid).to.equal(wlist.objs[0].todoid);
    action1_todoid = ret.todoid;
  });

  let action21_todoid = "";
  let action22_todoid = "";
  it("Check worklist after action1", { timeout: 600000 }, async () => {
    await SDK.sleep(500);
    let wlist = await SDK.getWorklist(testUsers[0].account, { wfid: wfid, status: "ST_RUN" });
    expect(wlist.total).to.equal(2);
    expect(["action21", "action22"]).to.include(wlist.objs[0].nodeid);
    expect(["action21", "action22"]).to.include(wlist.objs[1].nodeid);
    if (wlist.objs[0].nodeid === "action21") {
      action21_todoid = wlist.objs[0].todoid;
      action22_todoid = wlist.objs[1].todoid;
    } else {
      action21_todoid = wlist.objs[1].todoid;
      action22_todoid = wlist.objs[0].todoid;
    }

    let fullInfo = await SDK.getWorkInfo(wfid, action1_todoid);
    expect(fullInfo.following_actions).to.have.length(2);
    expect(fullInfo.following_actions[0].nodeid).to.equal("action21");
    expect(fullInfo.following_actions[1].nodeid).to.equal("action22");
    expect(fullInfo.following_actions[0].status).to.equal("ST_RUN");
    expect(fullInfo.following_actions[1].status).to.equal("ST_RUN");
    expect(fullInfo.revocable).to.equal(true);
    expect(fullInfo.returnable).to.equal(false);
  });

  it("sendback a work in parallels", async () => {
    let fullInfo = await SDK.getWorkInfo(wfid, action22_todoid);
    expect(fullInfo.returnable).to.equal(false);
    let errThrown = false;
    await SDK.sleep(500);
    let ret = await SDK.sendback(testUsers[0].account, wfid, action22_todoid);
    //Should not be able to sendback, keep stay on action22
    expect(ret.error).to.equal("WORK_NOT_RETURNABLE");
    await SDK.sleep(500);
    let wlist = await SDK.getWorklist(testUsers[0].account, { wfid: wfid, status: "ST_RUN" });
    expect(wlist.total).to.equal(2);
  });
  let action3_todoid = "";
  it("do task action21/22", { timeout: 10000 }, async () => {
    await SDK.sleep(200);
    await SDK.doWorkByNode(testUsers[0].account, wfid, "action21");
    await SDK.sleep(200);
    await SDK.doWorkByNode(testUsers[0].account, wfid, "action22");
    await SDK.sleep(500);
    let wlist = await SDK.getWorklist(testUsers[0].account, { wfid: wfid, status: "ST_RUN" });
    action3_todoid = wlist.objs[0].todoid;
    expect(wlist.objs[0].nodeid).to.equal("action3");
  });

  it("Sendback from action3", { timeout: 5000 }, async () => {
    await SDK.sendback(testUsers[0].account, wfid, action3_todoid);
    await SDK.sleep(2000);
    let wlist = await SDK.getWorklist(testUsers[0].account, { wfid: wfid, status: "ST_RUN" });
    expect(wlist.total).to.equal(2);
    expect(["action21", "action22"]).to.include(wlist.objs[0].nodeid);
    expect(["action21", "action22"]).to.include(wlist.objs[1].nodeid);
  });
  let action41_todoid = "";
  let action42_todoid = "";
  it("do task to action3", { timeout: 10000 }, async () => {
    await SDK.sleep(200);
    await SDK.doWorkByNode(testUsers[0].account, wfid, "action21");
    await SDK.sleep(200);
    await SDK.doWorkByNode(testUsers[0].account, wfid, "action22");
    await SDK.sleep(200);
    await SDK.doWorkByNode(testUsers[0].account, wfid, "action3");
    await SDK.sleep(500);
    let wlist = await SDK.getWorklist(testUsers[0].account, { wfid: wfid, status: "ST_RUN" });
    expect(wlist.total).to.equal(2);
    action41_todoid =
      wlist.objs[0].nodeid === "action41" ? wlist.objs[0].todoid : wlist.objs[1].todoid;
  });

  it("Sendback from action41", async () => {
    try {
      let ret = await SDK.sendback(testUsers[0].account, wfid, action41_todoid);
      expect(ret).to.not.equal(action41_todoid);
    } catch (err) {
      expect(err.message.indexOf("Not Returnable")).to.be.above(0);
    }
    await SDK.sleep(200);
    let wlist = await SDK.getWorklist(testUsers[0].account, { wfid: wfid, status: "ST_RUN" });
    expect(wlist.total).to.equal(2);
  });

  let action5_todoid = "";
  it("do task action41/42", { timeout: 10000 }, async () => {
    await SDK.sleep(2000);
    action41_todoid = await SDK.doWorkByNode(testUsers[0].account, wfid, "action41");
    await SDK.sleep(2000);
    let wlist = await SDK.getWorklist(testUsers[0].account, { wfid: wfid, status: "ST_RUN" });
    expect(wlist.total).to.equal(1);
    action5_todoid = wlist.objs[0].todoid;
    expect(wlist.objs[0].nodeid).to.equal("action5");
  });

  it("Sendback from action5", { timeout: 5000 }, async () => {
    let ret = await SDK.sendback(testUsers[0].account, wfid, action5_todoid);
    expect(ret).to.equal(action5_todoid);
  });

  it("Get worllist after sendback action5", { timeout: 5000 }, async () => {
    //这里一定要注意，目前action41和 action42 为OR关系，
    //前面路径为 action41 ---> action5.... 因此，退出 action5时，只返回到action41
    //TODO: 应该返回到 action41和action42
    await SDK.sleep(2000);
    let wlist = await SDK.getWorklist(testUsers[0].account, { wfid: wfid, status: "ST_RUN" });
    console.log(wlist.objs);
    expect(wlist.total).to.equal(1);
  });

  it("do task action41/42/5", { timeout: 10000 }, async () => {
    await SDK.sleep(200);
    await SDK.doWorkByNode(testUsers[0].account, wfid, "action41");
    await SDK.sleep(200);
    try {
      //action42和41后是OR，所以，只要一个完成了，第二个就被ignore了
      await SDK.doWorkByNode(testUsers[0].account, wfid, "action42");
      await SDK.sleep(200);
    } catch (err) {
      expect(err.message).to.include("Status is not ST_RUN");
    }
    await SDK.doWorkByNode(testUsers[0].account, wfid, "action5");
    await SDK.sleep(200);
    let wlist = await SDK.getWorklist(testUsers[0].account, {
      wfid: wfid,
      status: "ST_RUN",
      wfstatus: "ST_RUN",
    });
    expect(wlist.total).to.equal(0);
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
