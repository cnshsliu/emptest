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
const TPL_ID = "test_timer";

const TID = "timr1";
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
describe("timer.js: ", { timeout: 5000 }, () => {
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
    const ret = await SDK.putTemplate(
      fs.readFileSync(TEST_TEMPLATE_DIR + "/timer.xml", "utf8"),
      TPL_ID
    );
    expect(ret.tplid).to.equal(TPL_ID);
  });

  it("START Workflow test_timer", async () => {
    const ret = await SDK.startWorkflow(TPL_ID, wfid);
  });

  it(" Get worklist", { timeout: 90000 }, async () => {
    //get worklist
    await SDK.sleep(1000);
    let ret = await SDK.getWorklist(getEid(0), { wfid: wfid, status: "ST_RUN" });
    expect(ret.objs[0].nodeid).to.equal("action1");
    ret = await SDK.doWorkByNode(getEid(0), wfid, "action1");
  });

  let workid_action1_round_1 = "";
  it("1> Do action1, wait timer for action2", { timeout: 90000 }, async () => {
    //get worklist

    let ret = await SDK.doWorkByNode(getEid(0), wfid, "action1");
    let i = 0;
    for (i = 0; i < 30; i++) {
      ret = await SDK.getWorklist(getEid(0), { wfid: wfid, status: "ST_RUN" });
      if (ret.objs.length > 0 && ret.objs[0].nodeid === "action2") {
        break;
      } else await SDK.sleep(1000);
    }
    ret = await SDK.doWorkByNode(getEid(0), wfid, "action2");
    expect(ret.workid).to.be.string();
    for (i = 0; i < 30; i++) {
      ret = await SDK.getWorklist(getEid(0), { wfid: wfid, status: "ST_RUN" });
      if (ret.objs.length > 0 && ret.objs[0].nodeid === "action3") {
        break;
      } else await SDK.sleep(1000);
    }
    ret = await SDK.doWorkByNode(getEid(0), wfid, "action3");
    expect(ret.workid).to.be.string();
    await SDK.sleep(500);
    ret = await SDK.getStatus(wfid);
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
    await SDK.removeUser(SITE_ADMIN.account, SITE_PWD);
  });
});
