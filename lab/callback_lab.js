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
  { account: "cbk_test_user_lkh", passwd: "Password@123", name: "UserLKH_" + SDK.randomString(7) },
  { account: "cbk_test_user_001", passwd: "Password@123", name: "User001_" + SDK.randomString(7) },
  { account: "cbk_test_user_002", passwd: "Password@123", name: "User002_" + SDK.randomString(7) },
  { account: "cbk_test_user_003", passwd: "Password@123", name: "User003_" + SDK.randomString(7) },
  { account: "cbk_test_user_004", passwd: "Password@123", name: "User004_" + SDK.randomString(7) },
  { account: "cbk_test_user_005", passwd: "Password@123", name: "User005_" + SDK.randomString(7) },
  { account: "cbk_test_user_006", passwd: "Password@123", name: "User006_" + SDK.randomString(7) },
];

const TEST_TEMPLATE_DIR = process.env.TEST_TEMPLATE_DIR || "./templates";

const TPL_ID = "callback";

describe("Callback: ", {timeout: 5000}, () => {
  let wfid = "lkh_" + SDK.guid();
  let childwfid = "";
  let tmpworkid = "";
  // SDK.setServer("http://emp.localhost:5008");
  SDK.setServer("http://emp.localhost");
  SDK.debug(true);
  it("prepare admin account ", async () => {
    try {
      await SDK.register(SITE_ADMIN.account, SITE_ADMIN.name, SITE_ADMIN.password);
    } catch (e) {}
  });
  it("test Login", async () => {
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

  it("Upload template", async () => {
    let ret = await SDK.putTemplate(
      fs.readFileSync(TEST_TEMPLATE_DIR + "/callback.xml", "utf8"),
      TPL_ID
    );
    expect(ret.tplid).to.equal(TPL_ID);
  });

  let action1_todoid = "";
  it("START Workflow ", async () => {
    let ret = await SDK.startWorkflow(TPL_ID, wfid);
    await SDK.sleep(2000);
    let tmp1 = await SDK.getWorklist(testUsers[0].account, {
      wfid: wfid,
      status: "ST_RUN",
    });
    expect(tmp1.total).to.equal(1);
    expect(tmp1.objs.length).to.equal(1);
    action1_todoid = tmp1.objs[0].todoid;
  });

  //先完成action1， action1完成后，下一个节点是脚本, 内容是
  //MtcSet("bpo","Bingo, You found me"); MtcSet("intv", 10); ret = "YES";
  //因为这个脚本是异步方式运行，那么，就需要等待一个callack
  it("1> Do action1", { timeout: 60000 }, async () => {
    //get worklist
    await SDK.sleep(200);
    let ret = await SDK.doWork(testUsers[0].account, action1_todoid);
    expect(ret.workid).to.exist();
    expect(ret.todoid).to.exist();
    expect(ret.doneat).to.exist();
    expect(ret.status).to.equal("ST_DONE");
  });

  //现在我们调用这个callback
  it("1> Wait 1 seconds then callback", { timeout: 60000 }, async () => {
    await SDK.sleep(1000);
    let cbpFilter = { wfid: wfid };
    let cbps = await SDK.getCallbackPoints(cbpFilter);
    expect(cbps).to.be.array();
    let numberOfCbps = cbps.length;
    expect(numberOfCbps > 0).to.be.true();
    expect(cbps).to.have.length(1);
    let tmp = await SDK.getLatestCallbackPoint(cbpFilter);
    expect(tmp.workid).to.equal(cbps[0].workid);
    let cbpid = tmp._id;

    //第二个参数决定callback的节点路径
    //第二个参数，决定脚本节点后的路径
    let ret = await SDK.doCallback(cbpid, "NO", { from_cbp: "value from cbp" });
    expect(ret).to.equal(cbpid);

    cbps = await SDK.getCallbackPoints(cbpFilter);
    expect(cbps.length).to.equal(0);
  });

  it("1> Check vars", { timeout: 60000 }, async () => {
    await SDK.sleep(200);
    let tmp = await SDK.getKVars(wfid);
    //这两个值是从脚本运行时带入的
    expect(tmp.bpo.value).to.equal("Bingo, You found me");
    expect(tmp.intv.value).to.equal(10);
    //这个值是callback带入的
    expect(tmp.from_cbp.value).to.equal("value from cbp");
  });
  //callback时，decision指向NO，因此，会运行的到 actionNO节点
  it("1> Check actionNO", { timeout: 60000 }, async () => {
    await SDK.sleep(200);
    let wlist = await SDK.getWorklist(testUsers[0].account, {
      wfid: wfid,
      status: "ST_RUN",
    });
    expect(wlist.objs.length).to.equal(1);
    //doCallback的第二个参数
    expect(wlist.objs[0].nodeid).to.equal("actionNO");
    await SDK.sleep(200);
    let action_todoid = wlist.objs[0].todoid;
    let tmp = await SDK.doWork(testUsers[0].account, action_todoid);
    expect(tmp.todoid).to.equal(action_todoid);
    await SDK.sleep(200);

    tmp = await SDK.getStatus(wfid);
    expect(tmp).to.equal("ST_DONE");
  });
  it("cleaning up", async () => {
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
