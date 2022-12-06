"use strict";
const Lab = require("@hapi/lab")
const Code = require("@hapi/code")
const { expect } = Code
const { after, before, describe, it } = exports.lab = Lab.script({
  cli: {
    timeout: 10000
  }
});
const SDK = require("../app.js");
const fs = require("fs");
const SITE_PWD = "site_password_999";
const SITE_ADMIN = { account: "lucas2", name: "Lucas2", password: "Pwd@123" };
const TPL_ID = "test_and_or";

const TID = "ocht";
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
  let wfid = "lkh_" + SDK.guid();
  let wfid2 = "lkh_" + SDK.guid();
  SDK.setServer("https://emp.localhost");
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
    // console.log(myorg);

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

  it("orgchart manage", async () => {
      await SDK.login(testUsers[0].account, testUsers[0].passwd);
      //判断是否组织模式
      let myorg = await SDK.orgMyOrg();
      console.log('myorg-------')
      console.log(myorg)
      expect(myorg.orgmode).to.equal(true);      
      
      // todo 其他校验
      
      // 添加部门
      let addOrgRes1 = await SDK.addOrgchart({
          "password":"123456",
          "content":"root,12345,技术部,,,,,",
          "default_user_password":"not required"
        }
      )
      expect(addOrgRes1.ret).to.equal("ok");
      expect(addOrgRes1.logs).to.be.an.array();
      // 单条添加员工
      let addOrgRes2 = await SDK.addOrgchart({
        "password":"Password@2022",
        "content":"root,12345,testaaa,putaway@163.com,,,,",
        "default_user_password":"Password@2022"
      })
      expect(addOrgRes2.ret).to.equal("ok");
      
      // 获取所有ous
      let allousFromOrgchart = await SDK.getAllousFromOrgchart()
      expect(allousFromOrgchart).to.be.an.array();

      // 复制员工
      // let copyStaff = await SDK.copyOrMoveStaff({
      //   "action":"copy",
      //   "from":"12345",
      //   "to":"root",
      //   "eid": 'zsl111'
      // })
      // console.log('copyStaff=========')
      // console.log(copyStaff)
      // expect(copyStaff).to.equal("Done");

      // 移动员工
      // let moveStaff = await SDK.copyOrMoveStaff({
      //   "action":"move",
      //   "from":"12345",
      //   "to":"root",
      //   "eid": 'zsl11'
      // })
      // expect(moveStaff).to.equal('Done');

      let expandOrg = await SDK.expandOrgchart({
        "ou":"root",
        "include":true
      })
      console.log('expandOrg------')
      console.log(expandOrg)
      expect(expandOrg).to.be.an.array();

      // 删除部门
      let delOrg = await SDK.addOrgchart({
        "password":"Qwe22!",
        "content":"D,12345,,,,,,",
        "default_user_password": "not required"
      })
      console.log('del======')
      console.log(delOrg)
      expect(delOrg.ret).to.equal("ok");

      // ou list
      let listOrgchartOU = await SDK.listOrgchartOU({ top: 'root', withTop: 'yes' })
      expect(listOrgchartOU).to.be.an.array();

      // 组织list
      let listOrgchart = await SDK.listOrgchart({})
      expect(listOrgchart).to.be.an.array();

      // 获取所有工作人员
      let getStaffWithinOrgchart = await SDK.getStaffWithinOrgchart({qstr: 'zsl111'})
      expect(getStaffWithinOrgchart).to.be.an.array();

      // 获取员工所有leader
      let allLeader= await SDK.getLeaderWithinOrgchart({ leader: 'zsl111', eid: "zsl111" })
      expect(allLeader).to.be.an.array();

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
