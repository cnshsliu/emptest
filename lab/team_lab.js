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

const TID = "team";
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
  let teamid = "team_test1";
  let team_iid = "";
  let the_map = {};
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

  it("Upload a team", async () => {
    let teamMap = {
      TEAM_LEADER: [{ eid: testUsers[1].account }],
      MANAGER: [{ eid: testUsers[2].account }, { eid: testUsers[3].account }],
      DIRECTOR: [{ eid: testUsers[4].account }],
    };
    let ret = await SDK.uploadTeam(teamid, teamMap);
    expect(ret.teamid).to.equal(teamid);
    team_iid = ret._id;
  });

  it("Test check tmap", async () => {
    let ret = await SDK.getTeamFullInfo(teamid);
    expect(ret.tmap.MANAGER[1].cn).to.equal(testUsers[3].name);
    expect(ret.tmap.MANAGER[0].cn).to.equal(testUsers[2].name);
    expect(ret.tmap.DIRECTOR[0].eid).to.equal(testUsers[4].account);
    the_map = ret.tmap;
  });

  it("Upload a team again to overwrite tmap", async () => {
    let teamMap = {
      TEAM_LEADER: [{ eid: testUsers[1].account }],
      DIRECTOR: [{ eid: testUsers[4].account }],
    };
    let ret = await SDK.uploadTeam(teamid, teamMap);
    expect(ret.teamid).to.equal(teamid);
    team_iid = ret._id;
    ret = await SDK.getTeamFullInfo(teamid);
    expect(ret.tmap.TEAM_LEADER[0].cn).to.equal(testUsers[1].name);
    expect(ret.tmap.MANAGER).to.equal(undefined);
    expect(ret.tmap.DIRECTOR[0].eid).to.equal(testUsers[4].account);
    the_map = ret.tmap;
  });
  it("Step4", async () => {
    let ret = await SDK.addRoleMembers(teamid, "TEAM_LEADER", [
      { eid: testUsers[1].account },
      { eid: testUsers[2].account },
      { eid: testUsers[3].account },
    ]);
    console.log(JSON.stringify(ret));
    expect(ret.tmap.TEAM_LEADER.length).to.equal(3);
    expect(ret.tmap.TEAM_LEADER[0].cn).to.equal(testUsers[1].name);
    ret = await SDK.getTeamFullInfo(teamid);
    expect(ret.tmap.TEAM_LEADER.length).to.equal(3);
    expect(ret.tmap.TEAM_LEADER[0].cn).to.equal(testUsers[1].name);
  });
  it("Step5", async () => {
    await SDK.addRoleMembers(teamid, "TEAM_LEADER", [
      { eid: testUsers[1].account },
      { eid: testUsers[2].account },
      { eid: testUsers[3].account },
    ]);
    let ret = await SDK.getTeamFullInfo(teamid);
    expect(ret.tmap.TEAM_LEADER.length).to.equal(3);
    expect(ret.tmap.TEAM_LEADER[0].cn).to.equal(testUsers[1].name);
  });

  it("Step6", async () => {
    await SDK.addRoleMembers(teamid, "MANAGER", [
      { eid: testUsers[2].account },
      { eid: testUsers[3].account },
    ]);
    let ret = await SDK.getTeamFullInfo(teamid);
    expect(ret.tmap.MANAGER[1].cn).to.equal(testUsers[3].name);
    expect(ret.tmap.MANAGER[0].cn).to.equal(testUsers[2].name);
    expect(ret.tmap.DIRECTOR[0].eid).to.equal(testUsers[4].account);
  });

  it("Step7", async () => {
    await SDK.deleteRoleMembers(teamid, "TEAM_LEADER", [{ eid: testUsers[1].account }]);
    let ret = await SDK.getTeamFullInfo(teamid);
    console.log('-------')
    console.log(ret.tmap.TEAM_LEADER)
    expect(ret.tmap.TEAM_LEADER.length).to.equal(2);
    expect(ret.tmap.TEAM_LEADER[1].cn).to.equal(testUsers[3].name);
    await SDK.deleteRoleMembers(teamid, "TEAM_LEADER", [
      { eid: testUsers[2].account },
      { eid: testUsers[3].account },
    ]);
    ret = await SDK.getTeamFullInfo(teamid);
    expect(ret.tmap.TEAM_LEADER.length).to.equal(0);
  });

  it("Set roles", async () => {
    await SDK.setRole(teamid, "APPROVER", [
      { eid: testUsers[2].account },
      { eid: testUsers[3].account },
      { eid: testUsers[4].account },
    ]);
    await SDK.setRole(teamid, "MANAGER", [
      { eid: testUsers[2].account },
      { eid: testUsers[4].account },
    ]);
    let ret = await SDK.getTeamFullInfo(teamid);
    expect(ret.tmap.MANAGER[1].cn).to.equal(testUsers[4].name);
    expect(ret.tmap.MANAGER[0].cn).to.equal(testUsers[2].name);
    expect(ret.tmap.DIRECTOR[0].eid).to.equal(testUsers[4].account);
    expect(ret.tmap.APPROVER[0].eid).to.equal(testUsers[2].account);
    expect(ret.tmap.APPROVER[2].eid).to.equal(testUsers[4].account);
    the_map = ret.tmap;
  });

  it("Test team list not empty", async () => {
    let ret = await SDK.getTeamList();
    expect(ret.objs.length > 0).to.be.true();
  });

  it("Test add person to team", async () => {
    the_map["DIRECTOR"].push({ eid: testUsers[5].account });
    let ret = await SDK.uploadTeam(teamid, the_map);
    ret = await SDK.getTeamFullInfo(teamid);
    expect(ret.tmap["DIRECTOR"].length).to.equal(2);
    expect(ret.tmap["DIRECTOR"][1].cn).to.equal(testUsers[5].name);
  });
  it("Test copy role", async () => {
    await SDK.copyRole(teamid, "DIRECTOR", "DIRECTOR_COPY");
    ret = await SDK.getTeamFullInfo(teamid);
    expect(ret.tmap["DIRECTOR_COPY"].length).to.equal(2);
    expect(ret.tmap["DIRECTOR_COPY"][1].cn).to.equal(testUsers[5].name);
  });

  it("Delete temp team", async () => {
    let ret = await SDK.deleteTeam(teamid);
    expect(ret.deletedCount).to.equal(1);
    ret = await SDK.getTeamFullInfo(teamid);
    expect(ret.teamid).to.be.undefined();
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
