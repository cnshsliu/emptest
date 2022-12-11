"use strict";

// const { describe, it } = require("node:test");
const Lab = require("@hapi/lab");
const { after, before, describe, it } = (exports.lab = Lab.script());
const { expect } = require("@hapi/code");
const SDK = require("../app.js");
const fs = require("fs");
const SITE_PWD = "site_password_999";
const SITE_ADMIN = { account: "lucas2", name: "Lucas2", password: "Pwd@123" };
const TPL_ID = "test_roundback";

const TID = "rdbk";
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

const getAccount = (number) => {
  return testUsers[number].account;
};
const getEid = (number) => {
  return getAccount(number) + "_eid";
};
describe("Test: ", { timeout: 5000 }, () => {
  let wfid = "lkh_" + SDK.guid();
  let tmpworkid = "";
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
  it("Upload template", async () => {
    const ret = await SDK.putTemplate(
      fs.readFileSync(TEST_TEMPLATE_DIR + "/test_roundback.xml", "utf8"),
      TPL_ID
    );
    expect(ret.tplid).to.equal(TPL_ID);
  });

  it("START Workflow", async () => {
    const ret = await SDK.startWorkflow(TPL_ID, wfid);
  });

  let todoid_action1_round_1 = "";
  it("1> Do action1", { timeout: 5000 }, async () => {
    //get worklist
    await SDK.sleep(500);
    let wlist = await SDK.getWorklist(getEid(0), {
      wfid: wfid,
      nodeid: "action1",
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(1);
    let fullInfo = await SDK.getWorkInfo(wfid, wlist.objs[0].todoid);
    console.log(fullInfo);
    expect(fullInfo.from_actions).to.have.length(0);
    todoid_action1_round_1 = wlist.objs[0].todoid;
    let ret = await SDK.doWork(getEid(0), wlist.objs[0].todoid, {
      days: 10,
    });
    //days > 5 , 将导致脚本运行返回值为to_action2
    expect(ret.todoid).to.equal(wlist.objs[0].todoid);
  });

  let todoid_action2_round_1 = "";
  it("1> Do action2", { timeout: 5000 }, async () => {
    await SDK.sleep(1000);
    let ret = await SDK.doWorkByNode(getEid(0), wfid, "action2");
    expect(ret.todoid).to.be.a.string();
    todoid_action2_round_1 = ret.todoid;
  });

  it("1> Check worklist", { timeout: 5000 }, async () => {
    await SDK.sleep(500);
    let wlist = await SDK.getWorklist(getEid(0), { wfid: wfid, status: "ST_RUN" });
    expect(wlist.total).to.equal(1);
    expect(wlist.objs[0].nodeid).to.equal("action3");
    let fullInfo = await SDK.getWorkInfo(wfid, todoid_action2_round_1);
    console.log(fullInfo);
    expect(fullInfo.from_actions[0].nodeid).to.equal("switch1");
    expect(fullInfo.from_actions[0].level).to.equal(0);
    expect(fullInfo.from_actions[1].nodeid).to.equal("action1");
    expect(fullInfo.from_actions[1].level).to.equal(1);
  });
  it("1> Do action3", { timeout: 5000 }, async () => {
    await SDK.sleep(1000);
    let ret = await SDK.doWorkByNode(getEid(0), wfid, "action3");
    expect(ret.todoid).to.be.a.string();
  });
  let workid_action1_round_2 = "";
  it("2> Do action1", { timeout: 50000 }, async () => {
    await SDK.sleep(1000);
    let ret = await SDK.doWorkByNode(getEid(0), wfid, "action1", {
      days: 8,
    });
    console.log(ret);
    expect(ret.workid).to.be.a.string();
    workid_action1_round_2 = ret.workid; //Action1 最新workitemde id
    let kvars = await SDK.getKVars(wfid, workid_action1_round_2);
    console.log(kvars);
    expect(kvars.days.value).to.equal(8);
  });
  let workid_action2_round_2 = "";
  it("2> Do action2", { timeout: 5000 }, async () => {
    await SDK.sleep(1000);
    let ret = await SDK.doWorkByNode(getEid(0), wfid, "action2");
    expect(ret.workid).to.be.a.string();
    let workid = ret.workid;
    workid_action2_round_2 = workid;
    let fullInfo = await SDK.getWorkInfo(wfid, ret.todoid);
    console.log(fullInfo.from_actions);
    expect(fullInfo.from_actions.length).to.equal(2);
    expect(fullInfo.from_actions[0].nodeid).to.equal("switch1");
    expect(fullInfo.from_actions[1].nodeid).to.equal("action1");
  });
  it("2> Check worklist", { timeout: 5000 }, async () => {
    await SDK.sleep(500);
    let wlist = await SDK.getWorklist(getEid(0), { wfid: wfid, status: "ST_RUN" });
    expect(wlist.total).to.equal(1);
    expect(wlist.objs[0].nodeid).to.equal("action3");
  });
  it("2> Do action3", { timeout: 5000 }, async () => {
    await SDK.sleep(1000);
    let ret = await SDK.doWorkByNode(getEid(0), wfid, "action3");
    console.log(ret);
    expect(ret.nodeid).to.equal("action3");
    expect(ret.status).to.equal("ST_DONE");
  });
  it("3> Do action1", { timeout: 5000 }, async () => {
    await SDK.getWorklist(getEid(0), 10);
    let ret = await SDK.doWorkByNode(getEid(0), wfid, "action1", {
      days: 3,
    });
    console.log(ret);
    expect(ret.nodeid).to.equal("action1");
    expect(ret.status).to.equal("ST_DONE");
  });

  //days小于3， 直接到  end
  it("Check worklist 2", { timeout: 5000 }, async () => {
    await SDK.sleep(500);
    let wlist = await SDK.getWorklist(getEid(0), { wfid: wfid, status: "ST_RUN" });
    expect(wlist.total).to.equal(0);
  });

  it("Check vars ", { timeout: 5000 }, async () => {
    await SDK.sleep(500);
    let kvs = await SDK.getKVars(wfid);
    expect(kvs["days"].value).to.equal(3);
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
