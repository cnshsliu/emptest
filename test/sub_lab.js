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

const TID = "sub";
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
  let childwfid = "";
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
    let ret = await SDK.putTemplate(
      fs.readFileSync(TEST_TEMPLATE_DIR + "/parent_1.xml", "utf8"),
      "parent_1"
    );
    expect(ret.tplid).to.equal("parent_1");
    ret = await SDK.putTemplate(fs.readFileSync(TEST_TEMPLATE_DIR + "/sub_1.xml", "utf8"), "sub_1");
    expect(ret.tplid).to.equal("sub_1");
  });

  it("START Workflow parent_1", async () => {
    let ret = await SDK.startWorkflow("parent_1", wfid);
  });

  it("1> Do action1", { timeout: 60000 }, async () => {
    //get worklist
    await SDK.sleep(200);
    let ret = await SDK.doWorkByNode(getEid(0), wfid, "action1");
  });

  it("1> Do sub_action1", { timeout: 60000 }, async () => {
    await SDK.sleep(200);
    let tmp = await SDK.workflowGetLatest({ tplid: "sub_1" });
    console.log(tmp);
    childwfid = tmp.wfid;
    let wlist = await SDK.getWorklist(getEid(0), {
      tplid: "sub_1",
      wfid: childwfid,
      status: "ST_RUN",
    });
    console.log(wlist);
    expect(wlist.total).to.equal(1);
    expect(wlist.objs[0].nodeid).to.equal("sub_action1");
    let ret = await SDK.doWorkByNode(getEid(0), wlist.objs[0].wfid, "sub_action1");
  });

  it("1> Do sub_action2", { timeout: 60000 }, async () => {
    await SDK.sleep(200);
    let wlist = await SDK.getWorklist(
      getEid(0),
      {
        tplid: "sub_1",
        wfid: childwfid,
        status: "ST_RUN",
      },
      10
    );
    expect(wlist.total).to.equal(1);
    expect(wlist.objs[0].nodeid).to.equal("sub_action2");
    let ret = await SDK.doWorkByNode(getEid(0), wlist.objs[0].wfid, "sub_action2");
  });

  it("1> Do parent.action2", { timeout: 60000 }, async () => {
    await SDK.sleep(2000);
    let wlist = await SDK.getWorklist(
      getEid(0),
      {
        tplid: "parent_1",
        wfid: wfid,
        status: "ST_RUN",
      },
      10
    );
    expect(wlist.total).to.equal(1);
    expect(wlist.objs[0].nodeid).to.equal("action2");
    let ret = await SDK.doWorkByNode(getEid(0), wlist.objs[0].wfid, "action2");
  });

  it("2> Do sub_action1", { timeout: 60000 }, async () => {
    await SDK.sleep(200);
    let tmp = await SDK.workflowGetLatest({ tplid: "sub_1" });
    childwfid = tmp.wfid;
    await SDK.sleep(200);
    let wlist = await SDK.getWorklist(getEid(0), {
      tplid: "sub_1",
      wfid: childwfid,
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(1);
    expect(wlist.objs[0].nodeid).to.equal("sub_action1");
    //在第一个节点上放置一个RET
    let ret = await SDK.doWorkByNode(getEid(0), wlist.objs[0].wfid, "sub_action1", {
      RET: "goto32",
    });
  });

  it("2> Do sub_action2", { timeout: 60000 }, async () => {
    await SDK.sleep(200);
    let wlist = await SDK.getWorklist(getEid(0), {
      tplid: "sub_1",
      wfid: childwfid,
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(1);
    expect(wlist.objs[0].nodeid).to.equal("sub_action2");
    let ret = await SDK.doWorkByNode(getEid(0), wlist.objs[0].wfid, "sub_action2");
    //sub_action2完成以后，sub流程结束
  });

  // sub完成后，因为sub_action1设置了一个RET goto32
  // 这个会被导入到parent流程中，在parent流程中sub2返回值为goto32
  it("1> Do parent.action32", { timeout: 60000 }, async () => {
    await SDK.sleep(200);
    let wlist = await SDK.getWorklist(getEid(0), {
      tplid: "sub_1",
      wfid: childwfid,
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(0);
    await SDK.sleep(200);
    wlist = await SDK.getWorklist(getEid(0), {
      tplid: "parent_1",
      wfid: wfid,
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(1);
    expect(["action31", "action32"]).to.include(wlist.objs[0].nodeid);
    let ret = await SDK.doWorkByNode(getEid(0), wfid, "action32");
  });
  it("1> Check workflow status", { timeout: 60000 }, async () => {
    await SDK.sleep(1000);
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
