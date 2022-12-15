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
const TPL_ID = "test_and_or";

const TID = "wsc1";
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

const getAccount = (idx: number) => {
  return testUsers[idx].account;
};
const getEid = (idx: number) => {
  return getAccount(idx) + "_eid";
};
describe("Test: ", { timeout: 5000 }, () => {
  let wfid = "lkh_" + SDK.guid();
  let wfid2 = "lkh_" + SDK.guid();
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
    expect(myorg.joinapps).to.be.an.array();
    expect(myorg.joinapps).to.be.empty();
  });
  it("Upload template", async () => {
    let ret = await SDK.putTemplate(
      fs.readFileSync(TEST_TEMPLATE_DIR + "/test_and_or.xml", "utf8"),
      TPL_ID
    );
    expect(ret.tplid).to.equal(TPL_ID);
  });

  it("START Workflow", async () => {
    let ret = await SDK.startWorkflow(TPL_ID, wfid);
  });

  let action1_todoid = "";
  it("Do action1", { timeout: 5000 }, async () => {
    //get worklist
    await SDK.sleep(500);
    let tmp = await SDK.getWorklist(getEid(0), {
      wfid: wfid,
      nodeid: "action1",
      status: "ST_RUN",
      wfstatus: "ST_RUN",
    });
    expect(tmp.total).to.equal(1);

    // let fullInfo = await SDK.getWorkInfo(wfid, tmp.objs[0].todoid);
    // expect(fullInfo.from_action_todoid).to.be.undefined();

    let ret = await SDK.doWork(getEid(0), tmp.objs[0].todoid, {
      input_action1: "action1",
    });
    expect(ret.todoid).to.equal(tmp.objs[0].todoid);
    action1_todoid = ret.todoid;
  });

  it("Check worklistafter action1", { timeout: 5000 }, async () => {
    await SDK.sleep(500);
    let tmp = await SDK.getWorklist(getEid(0), {
      wfid: wfid,
      status: "ST_RUN",
      wfstatus: "ST_RUN",
    });
    expect(tmp.total).to.equal(2);
    expect(["action21", "action22"]).to.include(tmp.objs[0].nodeid);
    expect(["action21", "action22"]).to.include(tmp.objs[1].nodeid);

    let fullInfo = await SDK.getWorkInfo(wfid, action1_todoid);
    expect(fullInfo.following_actions).to.have.length(2);
    expect(fullInfo.following_actions[0].nodeid).to.equal("action21");
    expect(fullInfo.following_actions[1].nodeid).to.equal("action22");
    expect(fullInfo.following_actions[0].status).to.equal("ST_RUN");
    expect(fullInfo.following_actions[1].status).to.equal("ST_RUN");
    expect(fullInfo.revocable).to.equal(true);
  });

  it("Pause/Resume workflow", { timeout: 5000 }, async () => {
    await SDK.sleep(500);
    expect(await SDK.getStatus(wfid)).to.equal("ST_RUN");
    expect(
      (
        await SDK.getWorklist(getEid(0), {
          wfid: wfid,
          status: "ST_RUN",
          wfstatus: "ST_RUN",
        })
      ).total
    ).to.equal(2);
    //Both will work
    //let ret = await SDK.pauseWorkflow(wfid);
    let ret = await SDK.opWorkflow(wfid, "pause");
    expect(ret.status).to.equal("ST_PAUSE");
    expect(
      (
        await SDK.getWorklist(getEid(0), {
          wfid: wfid,
          status: "ST_RUN",
          wfstatus: "ST_RUN",
        })
      ).total
    ).to.equal(0);
    expect((await SDK.resumeWorkflow(wfid)).status).to.equal("ST_RUN");
    expect(
      (
        await SDK.getWorklist(getEid(0), {
          wfid: wfid,
          status: "ST_RUN",
          wfstatus: "ST_RUN",
        })
      ).total
    ).to.equal(2);
  });
  it("Stop workflow", { timeout: 5000 }, async () => {
    await SDK.sleep(500);
    expect((await SDK.stopWorkflow(wfid)).status).to.equal("ST_STOP");
    expect(await SDK.getStatus(wfid)).to.equal("ST_STOP");
    expect((await SDK.resumeWorkflow(wfid)).status).to.equal("ST_STOP");
    expect(
      (
        await SDK.getWorklist(getEid(0), {
          wfid: wfid,
          status: "ST_RUN",
          wfstatus: "ST_RUN",
        })
      ).total
    ).to.equal(0);
  });

  it("2>START Another Workflow", async () => {
    let ret = await SDK.startWorkflow(TPL_ID, wfid2);
  });

  it("2>Do until action41/42", { timeout: 5000 }, async () => {
    await SDK.sleep(500);
    await SDK.doWorkByNode(getEid(0), wfid2, "action1");
    await SDK.sleep(500);
    await SDK.doWorkByNode(getEid(0), wfid2, "action21");
    await SDK.sleep(500);
    await SDK.doWorkByNode(getEid(0), wfid2, "action22");
    await SDK.sleep(500);
    await SDK.doWorkByNode(getEid(0), wfid2, "action3");
  });

  it("2>Pause/Resume workflow", { timeout: 5000 }, async () => {
    await SDK.sleep(500);
    expect(await SDK.getStatus(wfid2)).to.equal("ST_RUN");
    expect(
      (
        await SDK.getWorklist(getEid(0), {
          wfid: wfid2,
          status: "ST_RUN",
          wfstatus: "ST_RUN",
        })
      ).total
    ).to.equal(2);
    expect((await SDK.pauseWorkflow(wfid2)).status).to.equal("ST_PAUSE");
    expect(
      (
        await SDK.getWorklist(getEid(0), {
          wfid: wfid2,
          status: "ST_RUN",
          wfstatus: "ST_RUN",
        })
      ).total
    ).to.equal(0);
    expect((await SDK.resumeWorkflow(wfid2)).status).to.equal("ST_RUN");
    expect(
      (
        await SDK.getWorklist(getEid(0), {
          wfid: wfid2,
          status: "ST_RUN",
          wfstatus: "ST_RUN",
        })
      ).total
    ).to.equal(2);
  });

  it("2>Do action42 - action5", { timeout: 5000 }, async () => {
    await SDK.sleep(500);
    await SDK.doWorkByNode(getEid(0), wfid2, "action42");
    await SDK.sleep(500);
    await SDK.doWorkByNode(getEid(0), wfid2, "action5");
  });

  it("Should have no workitem now", { timeout: 5000 }, async () => {
    await SDK.sleep(500);
    expect(
      (
        await SDK.getWorklist(getEid(0), {
          wfid: wfid2,
          status: "ST_RUN",
          wfstatus: "ST_RUN",
        })
      ).total
    ).to.equal(0);
  });

  it("Check workflow status", async () => {
    expect(await SDK.getStatus(wfid2)).to.equal("ST_DONE");
  });

  it("cleaning up", async () => {
    await SDK.sleep(3000);
    await SDK.destroyWorkflowByTplid(TPL_ID);
    await SDK.deleteTemplateByTplid(TPL_ID);
    await SDK.login(SITE_ADMIN.account, SITE_ADMIN.password);
    for (let i = 0; i < testUsers.length; i++) {
      await SDK.removeUser(testUsers[i].account, SITE_PWD);
    }
    await SDK.removeUser(SITE_ADMIN.account, SITE_PWD);
  });
});
