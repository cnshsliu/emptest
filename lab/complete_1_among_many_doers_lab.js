"use strict";

// const { describe, it } = require("node:test");
const Lab = require("@hapi/lab");
const { after, before, describe, it } = (exports.lab = Lab.script());
const { expect } = require("@hapi/code");
const SDK = require("../app.js");
const fs = require("fs");
const SITE_PWD = "site_password_999";
const SITE_ADMIN = { account: "lucas2", name: "Lucas2", password: "Pwd@123" };

const TID = "c1amd";
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

describe("Complete 1 among many doers ", {timeout: 5000}, () => {
  let wfid = "lkh_" + SDK.guid();
  // SDK.setServer("http://emp.localhost:5008");
  SDK.setServer("http://emp.localhost");
  it("prepare admin account ", async () => {
    try {
      await SDK.register(SITE_ADMIN.account, SITE_ADMIN.name, SITE_ADMIN.password);
    } catch (e) {}
  });
  it("Setup Test Users", async () => {
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
      expect((await SDK.orgJoin(joincodeRet.joincode)).code).to.equal("ok");
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

  it("Upload with ID in template", async () => {
    const ret = await SDK.putTemplate(
      fs.readFileSync(TEST_TEMPLATE_DIR + "/complete_1_among_many_doers.xml", "utf8"),
      TPL_ID
    );
    expect(ret.tplid).to.equal(TPL_ID);
  });

  it("Configure team", async () => {
    let teamMap = {
      LEADER: [{ eid: testUsers[1].account, cn: "linyukui" }],
      MANAGER: [
        { eid: testUsers[2].account, cn: "yuanqin" },
        { eid: testUsers[3].account, cn: "xiaoxiaolong" },
      ],
      DIRECTOR: [
        { eid: testUsers[4].account, cn: "chengaoyang" },
        { eid: testUsers[5].account, cn: "chenpeng" },
      ],
    };
    let ret = await SDK.uploadTeam("simple_leave_team", teamMap);
    expect(ret.teamid).to.equal("simple_leave_team");
  });

  it("START Workflow", async () => {
    const ret = await SDK.startWorkflow(TPL_ID, wfid, "simple_leave_team");
  });

  let leave_days = 6;
  it("Do apply", { timeout: 5000 }, async () => {
    //get worklist
    await SDK.sleep(500);
    let wlist = await SDK.getWorklist(testUsers[0].account, {
      wfid: wfid,
      nodeid: "apply",
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(1);
    //expect(wlist.objs[0].from_nodeid).to.equal("start");

    let ret = await SDK.doWork(testUsers[0].account, wlist.objs[0].todoid, {
      days: leave_days,
      reason: "Go hospital...",
      extra: "Thank you",
    });
    expect(ret.workid).to.equal(wlist.objs[0].workid);
  });
  it("Check vars", async () => {
    await SDK.sleep(1000);
    let allvars = await SDK.getKVars(wfid);
    expect(allvars["days"].value).to.equal(leave_days);
    expect(allvars["reason"].value).to.equal("Go hospital...");
    expect(allvars["extra"].value).to.equal("Thank you");
    let wlist = await SDK.getWorklist(testUsers[5].account, {
      wfid: wfid,
      nodeid: "approve_by_director",
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(0);
  });

  it("Do approve_by_leader", { timeout: 5000 }, async () => {
    await SDK.sleep(500);
    let wlist = await SDK.getWorklist(testUsers[1].account, {
      wfid: wfid,
      nodeid: "approve_by_leader",
      status: "ST_RUN",
      //debug: true,
    });
    expect(wlist.total).to.equal(1);
    //expect(wlist.objs[0].from_nodeid).to.equal("apply");
    let ret = await SDK.doWork(testUsers[1].account, wlist.objs[0].todoid, {}, "approve");
    expect(ret.workid).to.equal(wlist.objs[0].workid);
  });

  it("Do approve_by_any_director ", { timeout: 5000 }, async () => {
    await SDK.sleep(1000);
    //取D1的工作列表，应该有一项
    let wlist = await SDK.getWorklist(testUsers[4].account, {
      wfid: wfid,
      nodeid: "approve_by_any_director",
      status: "ST_RUN",
      //debug: true,
    });
    expect(wlist.total).to.equal(1);
    //取D2的工作列表，应该有一项
    let wlist2 = await SDK.getWorklist(testUsers[5].account, {
      wfid: wfid,
      nodeid: "approve_by_any_director",
      status: "ST_RUN",
    });
    expect(wlist2.total).to.equal(1);
    //D1完成工作
    let ret = await SDK.doWork(testUsers[1].account, wlist.objs[0].todoid, {}, "approve");
    await SDK.doWork(testUsers[4].account, wlist.objs[0].todoid, {
      days: 3,
    });
    //D1工作项应该没有了
    wlist = await SDK.getWorklist(testUsers[4].account, {
      wfid: wfid,
      nodeid: "approve_by_any_director",
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(0);
    //D2的工作项应该也没有了
    wlist2 = await SDK.getWorklist(testUsers[5].account, {
      wfid: wfid,
      nodeid: "approve_by_any_director",
      status: "ST_RUN",
    });
    expect(wlist2.total).to.equal(0);
  });

  it("Do approve_by_all_director ", { timeout: 5000 }, async () => {
    await SDK.sleep(1000);
    let wlist = await SDK.getWorklist(testUsers[4].account, {
      wfid: wfid,
      nodeid: "approve_by_all_director",
      status: "ST_RUN",
    });
    //D1的工作列表应有1项
    expect(wlist.total).to.equal(1);
    let wlist2 = await SDK.getWorklist(testUsers[5].account, {
      wfid: wfid,
      nodeid: "approve_by_all_director",
      status: "ST_RUN",
    });
    //D2的工作列表应有1项
    expect(wlist2.total).to.equal(1);
    //D1完成工作
    await SDK.doWork(testUsers[4].account, wlist.objs[0].todoid, {
      days: 3,
    });
    wlist = await SDK.getWorklist(testUsers[4].account, {
      wfid: wfid,
      nodeid: "approve_by_all_director",
      status: "ST_RUN",
    });
    //D1工作项应该没有了
    expect(wlist.total).to.equal(0);
    wlist2 = await SDK.getWorklist(testUsers[5].account, {
      wfid: wfid,
      nodeid: "approve_by_all_director",
      status: "ST_RUN",
    });
    //D2的工作列表依然应有1项
    expect(wlist2.total).to.equal(1);
    //D2完成不算做并设置days为6
    await SDK.doWork(testUsers[5].account, wlist2.objs[0].todoid, {
      days: 6,
    });
  });

  it("Check vars days is 6", { timeout: 5000 }, async () => {
    //await SDK.sleep(500);
    let kvars = await SDK.getKVars(wfid);
    expect(kvars.days.value).to.equal(6);
  });

  it("Check workflow status", async () => {
    await SDK.sleep(1000);
    let ret = await SDK.getStatus(wfid);
    expect(ret).to.equal("ST_DONE");
  });

  it("Delete team", async () => {
    let ret = await SDK.deleteTeam("simple_leave_team");
    expect(ret.deletedCount).to.equal(1);
    ret = await SDK.getTeamFullInfo("simple_leave_team");
    console.log(ret);
    expect(ret.statusCode).to.equal(400);
    expect(ret.error).to.equal("TEAM_NOT_FOUND");
  });

  it("cleaning up test users", async () => {
    await SDK.sleep(3000);
    await SDK.destroyWorkflowByTplid(TPL_ID);
    await SDK.deleteTemplateByTplid(TPL_ID);
    await SDK.login(SITE_ADMIN.account, SITE_ADMIN.password);
    for (let i = 1; i < testUsers.length; i++) {
      await SDK.removeUser(testUsers[i].account, SITE_PWD);
    }
    await SDK.removeUser(testUsers[0].account, SITE_PWD);
  });
});
