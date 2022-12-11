"use strict";

// const { describe, it } = require("node:test");
const Lab = require("@hapi/lab");
const { after, before, describe, it } = (exports.lab = Lab.script());
const { expect } = require("@hapi/code");
const SDK = require("../app.js");
const fs = require("fs");
const SITE_PWD = "site_password_999";
const SITE_ADMIN = { account: "lucas2", name: "Lucas2", password: "Pwd@123" };

const testUsers = [
  {
    account: "and_or_test_user_lkh",
    passwd: "Password@123",
    name: "UserLKH_" + SDK.randomString(7),
  },
  {
    account: "and_or_test_user_001",
    passwd: "Password@123",
    name: "User001_" + SDK.randomString(7),
  },
  {
    account: "and_or_test_user_002",
    passwd: "Password@123",
    name: "User002_" + SDK.randomString(7),
  },
  {
    account: "and_or_test_user_003",
    passwd: "Password@123",
    name: "User003_" + SDK.randomString(7),
  },
  {
    account: "and_or_test_user_004",
    passwd: "Password@123",
    name: "User004_" + SDK.randomString(7),
  },
  {
    account: "and_or_test_user_005",
    passwd: "Password@123",
    name: "User005_" + SDK.randomString(7),
  },
  {
    account: "and_or_test_user_006",
    passwd: "Password@123",
    name: "User006_" + SDK.randomString(7),
  },
];
const TEST_TEMPLATE_DIR = process.env.TEST_TEMPLATE_DIR || "./templates";

const getAccount = (number) => {
  return testUsers[number].account;
};
const getEid = (number) => {
  return getAccount(number) + "_eid";
};
describe("Test and_or logic", { timeout: 5000 }, () => {
  SDK.setServer("https://emp.localhost");
  let wfid = "lkh_" + SDK.guid();
  let tmptodoid = "";
  // SDK.setServer("http://emp.localhost:5008");
  SDK.debug(false);

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
  it("Step 2: Upload template", async () => {
    const ret = await SDK.putTemplate(
      fs.readFileSync(TEST_TEMPLATE_DIR + "/test_and_or.xml", "utf8"),
      "test_and_or",
      "Desc: Test And Or Logic"
    );
    expect(ret.tplid).to.equal("test_and_or");
    expect(ret.desc).to.equal("Desc: Test And Or Logic");
  });

  it("Step 3: Start Workflow", async () => {
    await SDK.login(testUsers[0].account, testUsers[0].passwd);
    const pbo = "http://www.google.com";
    const ret = await SDK.startWorkflow("test_and_or", wfid, "", pbo);
    expect(ret.wfid).to.equal(wfid);
  });

  it("Step 4: Check PBO", async () => {
    await SDK.sleep(500);
    let pbo = await SDK.getPbo(wfid, "text");
    expect(pbo[0]).to.equal("http://www.google.com");
    pbo = await SDK.setPbo(wfid, "abcd");
    await SDK.sleep(3000);
    pbo = await SDK.getPbo(wfid, "text");
    expect(pbo[0]).to.equal("abcd");

    await SDK.setPbo(wfid, ["abcd", "hahaha"]);
    pbo = await SDK.getPbo(wfid, "text");
    expect(Array.isArray(pbo)).to.equal(true);
    expect(pbo.length).to.equal(2);
  });

  let action1_todoid = "";
  it("Step 5: Do action1", { timeout: 5000 }, async () => {
    //get worklist
    await SDK.sleep(1000);
    let wlist = await SDK.getWorklist(getEid(0), {
      wfid: wfid,
      nodeid: "action1",
      status: "ST_RUN",
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(1);

    // let fullInfo = await SDK.getWorkInfo(wfid, wlist.objs[0].todoid);
    // expect(fullInfo.from_action_todoid).to.be.undefined();

    let ret = await SDK.doWork(getEid(0), wlist.objs[0].todoid, {
      input_action1: "action1",
    });
    expect(ret.todoid).to.equal(wlist.objs[0].todoid);
    action1_todoid = ret.todoid;
  });

  let wlist = [];
  let action21_todoid = "";
  let action22_todoid = "";
  it("Step 6: Check worklist after action1", { timeout: 5000 }, async () => {
    await SDK.sleep(500);
    wlist = await SDK.getWorklist(getEid(0), {
      wfid: wfid,
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(2);
    expect(wlist.objs.map((x) => x.nodeid)).to.only.include(["action21", "action22"]);

    let fullInfo = await SDK.getWorkInfo(wfid, action1_todoid);
    expect(fullInfo.following_actions.length).to.equal(2);
    expect(fullInfo.following_actions[0].nodeid).to.equal("action21");
    expect(fullInfo.following_actions[1].nodeid).to.equal("action22");
    expect(fullInfo.following_actions[0].status).to.equal("ST_RUN");
    expect(fullInfo.following_actions[1].status).to.equal("ST_RUN");
    //expect(fullInfo.revocable).to.equal(true);

    if (wlist.objs[0].nodeid === "action21") {
      action21_todoid = wlist.objs[0].todoid;
      action22_todoid = wlist.objs[1].todoid;
    } else {
      action21_todoid = wlist.objs[1].todoid;
      action22_todoid = wlist.objs[0].todoid;
    }
  });

  it("Step 7: Do action21", async () => {
    let ret = await SDK.doWork(getEid(0), action21_todoid, {
      input_action21: "action21",
    });
    expect(ret.todoid).to.be.a.string();
    await SDK.sleep(500);
    let fullInfo = await SDK.getWorkInfo(wfid, action21_todoid);
    expect(fullInfo.following_actions).to.have.length(0);
  });

  it("Step 8: Check worklist after action21", { timeout: 5000 }, async () => {
    await SDK.sleep(500);
    let wlist = await SDK.getWorklist(getEid(0), { wfid: wfid, status: "ST_RUN" });
    expect(wlist.total).to.equal(1);
    expect(wlist.objs[0].nodeid).to.equal("action22");
    let fullInfo = await SDK.getWorkInfo(wfid, action21_todoid);
    expect(fullInfo.revocable).to.equal(false);
  });

  it("Step 9: Do action22", async () => {
    let ret = await SDK.doWork(getEid(0), action22_todoid, {
      input_action22: "action22",
    });
    expect(ret.todoid).to.be.a.string();
  });
  let action3_todoid = "";
  it("Step 10: Check worklist after action 22 -> AND", { timeout: 5000 }, async () => {
    await SDK.sleep(500);
    let wlist = await SDK.getWorklist(getEid(0), { wfid: wfid, status: "ST_RUN" });
    expect(wlist.total).to.equal(1);
    expect(wlist.objs[0].nodeid).to.equal("action3");
    action3_todoid = wlist.objs[0].todoid;
    let action3_fullInfo = await SDK.getWorkInfo(wfid, wlist.objs[0].todoid);
    expect(action3_fullInfo.from_actions.length).to.equal(3);
    let action21_fullInfo = await SDK.getWorkInfo(wfid, action21_todoid);
    expect(action21_fullInfo.following_actions).to.have.length(2);
    expect(action21_fullInfo.following_actions[1].nodeid).to.equal("action3");
    expect(action21_fullInfo.revocable).to.equal(false);
    let fullInfo = await SDK.getWorkInfo(wfid, action1_todoid);
    expect(fullInfo.revocable).to.equal(false);
  });

  it("Step 11: Do action3", async () => {
    let ret = await SDK.doWork(getEid(0), action3_todoid, {
      input_action3: "action3",
    });
    let todoid = ret.todoid;
    expect(todoid).to.be.a.string();
    await SDK.sleep(1000);
    let fullInfo = await SDK.getWorkInfo(wfid, todoid);
    expect(fullInfo.from_actions.length).to.equal(3);
    expect(fullInfo.from_actions.filter((x) => x.nodeType !== "AND").length).to.equal(2);
    expect(fullInfo.following_actions.length).to.equal(2);
  });
  let action41_todoid = "";
  let action42_todoid = "";
  it("Step 12: Do action41", { timeout: 5000 }, async () => {
    await SDK.sleep(500);
    let wlist = await SDK.getWorklist(getEid(0), { wfid: wfid, status: "ST_RUN" });
    expect(wlist.total).to.equal(2);
    expect(["action41", "action42"]).to.include(wlist.objs[0].nodeid);
    expect(["action41", "action42"]).to.include(wlist.objs[1].nodeid);
    if (wlist.objs[0].nodeid === "action41") {
      action41_todoid = wlist.objs[0].todoid;
      action42_todoid = wlist.objs[1].todoid;
    } else {
      action41_todoid = wlist.objs[1].todoid;
      action42_todoid = wlist.objs[0].todoid;
    }

    let fullInfo = await SDK.getWorkInfo(wfid, action41_todoid);
    expect(fullInfo.from_actions.length).to.equal(1);
    expect(fullInfo.from_actions[0].nodeid).to.equal("action3");

    let ret = await SDK.doWork(getEid(0), action41_todoid, {
      input_action41: "action41",
    });
    expect(ret.todoid).to.equal(action41_todoid);
    await SDK.sleep(3000);
    ret = await SDK.doWork(getEid(0), action42_todoid);
    expect(ret.error).to.equal("WORK_RUNNING_NOT_EXIST");
  });

  it("Step 13: Check action5", { timeout: 5000 }, async () => {
    await SDK.sleep(500);
    let wlist = await SDK.getWorklist(getEid(0), {
      wfid: wfid,
      nodeid: "action5",
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(1);
    tmptodoid = wlist.objs[0].todoid;

    let fullInfo = await SDK.getWorkInfo(wfid, tmptodoid);
    expect(fullInfo.from_actions).to.have.length(3);
    expect(fullInfo.from_actions[1].nodeid).to.equal("action41");
  });

  it("Step 14: Do action5", { timeout: 5000 }, async () => {
    let ret = await SDK.doWork(getEid(0), tmptodoid, {
      input_action5: "action5",
    });
    expect(ret.todoid).to.equal(tmptodoid);
  });

  it("Step 15: Check Vars", { timeout: 5000 }, async () => {
    await SDK.sleep(500);
    let kvs = await SDK.getKVars(wfid);
    expect(kvs["input_action1"].value).to.equal("action1");
    expect(kvs["input_action21"].value).to.equal("action21");
    expect(kvs["input_action22"].value).to.equal("action22");
    expect(kvs["input_action3"].value).to.equal("action3");
    expect(kvs["input_action41"].value).to.equal("action41");
    expect(kvs["input_action5"].value).to.equal("action5");
  });

  it("Step 16: Should have no workitem now", { timeout: 5000 }, async () => {
    await SDK.sleep(500);
    let wlist = await SDK.getWorklist(getEid(0), { wfid: wfid, status: "ST_RUN" });
    expect(wlist.total).to.equal(0);
  });

  it("Step 17: Check workflow status", async () => {
    let ret = await SDK.getStatus(wfid);
    expect(ret).to.equal("ST_DONE");
  });
  //clearnup tenant;
  it("cleaning up", async () => {
    await SDK.sleep(3000);
    await SDK.destroyWorkflowByTplid("test_and_or");
    await SDK.deleteTemplateByTplid("test_and_or");
    await SDK.login(SITE_ADMIN.account, SITE_ADMIN.password);
    for (let i = 0; i < testUsers.length; i++) {
      await SDK.removeUser(testUsers[i].account, SITE_PWD);
    }
  });
});
