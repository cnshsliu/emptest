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

const getAccount = (idx:number) => {
  return testUsers[idx].account;
};
const getEid = (idx:number) => {
  return getAccount(idx) + "_eid";
};
describe("Test: ", { timeout: 5000 }, () => {
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
    expect(myorg.joinapps).to.be.an.array();
    expect(myorg.joinapps).to.be.empty();
  });
  it("orgchart orgmode", async () => {
    await SDK.login(testUsers[0].account, testUsers[0].passwd);
    //判断是否组织模式
    let myorg = await SDK.orgMyOrg();
    expect(myorg.orgmode).to.equal(true);
  });

  const hasEntry = (entries, ou, eid, cn) => {
    let found = false;
    for (let i = 0; i < entries.length; i++) {
      if (entries[i].ou === ou && entries[i].eid === eid && entries[i].cn === cn) {
        found = true;
        break;
      }
    }
    return found;
  };
  const findEntry = (entries, ou, eid) => {
    for (let i = 0; i < entries.length; i++) {
      if (entries[i].ou === ou && entries[i].eid === eid) {
        return entries[i];
      }
    }
    return null;
  };

  const getAccount = (number) => {
    return testUsers[number].account;
  };
  const getEid = (number) => {
    return getAccount(number) + "_eid";
  };

  it("orgchart admins", async () => {
    //检查现有的orgchart 管理员有哪些
    let ret = await SDK.post("orgchart/list/admin", {});
    //此时，管理员应该是没有的
    expect(ret).to.equal([]);
    //添加testUsers[1]到管理员
    ret = await SDK.post("orgchart/add/admin", { eid: testUsers[1].account + "_eid" });
    //再次拉取管理员列表
    ret = await SDK.post("orgchart/list/admin", {});
    //应该能找到 testUsers[1] 已经是管理员
    expect(ret[0].eid).to.equal(testUsers[1].account + "_eid");
    // 从管理员中删掉 testUsers[1]
    await SDK.post("orgchart/del/admin", { eid: testUsers[1].account + "_eid" });
    // 再次拉取管理员列表
    ret = await SDK.post("orgchart/list/admin", {});
    // 此时,管理员列表应该为空
    expect(ret.length).to.equal(0);

    // 把两个用户添加为管理员
    ret = await SDK.post("orgchart/add/admin", { eid: testUsers[1].account + "_eid" });
    ret = await SDK.post("orgchart/add/admin", { eid: testUsers[2].account + "_eid" });
    // 再次拉取管理列表
    ret = await SDK.post("orgchart/list/admin", {});
    // 此时,第一个管理员应该是 testUsers[1]
    // 此时,第二个管理员应该是 testUsers[2]
    expect(ret[0].eid).to.equal(testUsers[1].account + "_eid");
    expect(ret[1].eid).to.equal(testUsers[2].account + "_eid");
  });
  it("Insert entries", async () => {
    //testUsers[2]  应该可以正常管理orgchart
    await SDK.login(testUsers[2].account, testUsers[2].passwd);

    //添加root
    await SDK.post("orgchart/create/or/modify/ou/entry", { ou: "root", cn: "你的公司名" });
    let ret = await SDK.post("orgchart/list");
    //应该能检查到root已存在
    expect(ret[0].ou === "root" && ret[0].eid === "OU---" && ret[0].cn === "你的公司名").to.equal(
      true
    );

    //再添加两个部门
    await SDK.post("orgchart/create/or/modify/ou/entry", { ou: "F0001", cn: "部门一" });
    await SDK.post("orgchart/create/or/modify/ou/entry", { ou: "F0002", cn: "部门二" });
    ret = await SDK.post("orgchart/list");
    //root-你的公司名 应该正常
    expect(hasEntry(ret, "root", "OU---", "你的公司名")).to.equal(true);
    //root-我的公司名 应该不对
    expect(hasEntry(ret, "root", "OU---", "我的公司名")).to.equal(false);
    //F0001,部门一 应该存在
    expect(hasEntry(ret, "F0001", "OU---", "部门一")).to.equal(true);
    //F0002,部门二 应该存在
    expect(hasEntry(ret, "F0002", "OU---", "部门二")).to.equal(true);
    //F0003,应该不存在
    expect(hasEntry(ret, "F0003", "OU---", "部门二")).to.equal(false);
    //将test users添加到部门
    await SDK.post("orgchart/create/employee/entry", {
      ou: "F0001",
      eid: testUsers[1].account + "_eid",
      account: testUsers[1].account,
      cn: "测试用户1",
    });
    await SDK.post("orgchart/create/employee/entry", {
      ou: "F0002",
      eid: testUsers[2].account + "_eid",
      account: testUsers[2].account,
      cn: "测试用户2",
    });
    ret = await SDK.post("orgchart/list");
    expect(hasEntry(ret, "F0001", testUsers[1].account + "_eid", "测试用户1")).to.equal(true);
    expect(hasEntry(ret, "F0002", testUsers[2].account + "_eid", "测试用户2")).to.equal(true);
    //因为user2 不再F0001中,下面的move应该没有变化
    await SDK.post("orgchart/move/employee/entry", {
      eid: testUsers[2].account + "_eid",
      from: "F0001",
      to: "root",
    });
    //用户的位置应该没有变化
    ret = await SDK.post("orgchart/list");
    expect(hasEntry(ret, "F0001", testUsers[1].account + "_eid", "测试用户1")).to.equal(true);
    expect(hasEntry(ret, "F0002", testUsers[2].account + "_eid", "测试用户2")).to.equal(true);

    await SDK.post("orgchart/move/employee/entry", {
      eid: testUsers[1].account + "_eid",
      from: "F0001",
      to: "root",
    });
    await SDK.post("orgchart/move/employee/entry", {
      eid: testUsers[2].account + "_eid",
      from: "F0002",
      to: "F0001",
    });
    ret = await SDK.post("orgchart/list");
    expect(hasEntry(ret, "root", testUsers[1].account + "_eid", "测试用户1")).to.equal(true);
    expect(hasEntry(ret, "F0001", testUsers[2].account + "_eid", "测试用户2")).to.equal(true);
    await SDK.post("orgchart/copy/employee/entry", {
      eid: testUsers[2].account + "_eid",
      from: "F0001",
      to: "F0002",
    });
    await SDK.post("orgchart/copy/employee/entry", {
      eid: testUsers[1].account + "_eid",
      from: "root",
      to: "F0001",
    });
    await SDK.post("orgchart/copy/employee/entry", {
      eid: testUsers[1].account + "_eid",
      from: "root",
      to: "F0002",
    });
    ret = await SDK.post("orgchart/list");
    expect(hasEntry(ret, "root", testUsers[1].account + "_eid", "测试用户1")).to.equal(true);
    expect(hasEntry(ret, "F0001", testUsers[1].account + "_eid", "测试用户1")).to.equal(true);
    expect(hasEntry(ret, "F0002", testUsers[1].account + "_eid", "测试用户1")).to.equal(true);
    expect(hasEntry(ret, "F0001", testUsers[2].account + "_eid", "测试用户2")).to.equal(true);
    expect(hasEntry(ret, "F0002", testUsers[2].account + "_eid", "测试用户2")).to.equal(true);

    await SDK.post("orgchart/addpos", {
      ou: "root",
      eid: testUsers[1].account + "_eid",
      pos: "CEO;CTO,hello",
    });
    ret = await SDK.post("orgchart/list");
    expect(findEntry(ret, "root", testUsers[1].account + "_eid").position.length).to.equal(3);
    expect(findEntry(ret, "root", testUsers[1].account + "_eid").position).to.include([
      "CEO",
      "CTO",
      "hello",
    ]);

    await SDK.post("orgchart/delpos", {
      ou: "root",
      eid: testUsers[1].account + "_eid",
      pos: "hello, hello2",
    });
    ret = await SDK.post("orgchart/list");
    expect(findEntry(ret, "root", testUsers[1].account + "_eid").position).to.include([
      "CEO",
      "CTO",
    ]);
    //
    //
    //
    //user_2 in F0001 and F0002 at this moment.
    await SDK.post("orgchart/create/employee/entry", {
      ou: "F0001",
      eid: testUsers[3].account + "_eid",
      account: testUsers[3].account,
      cn: "测试用户3",
    });
    await SDK.post("orgchart/addpos", {
      ou: "F0001",
      eid: testUsers[3].account + "_eid",
      pos: "Director",
    });

    ret = await SDK.post("explain/pds", { pds: "L:Director" });
    expect(ret[0]?.eid).to.equal(testUsers[3].account + "_eid");
    ret = await SDK.post("explain/pds", { pds: "L:Director__not-exist" });
    expect(ret[0]?.eid).to.equal(undefined);
    await SDK.post("orgchart/addpos", {
      ou: "F0001",
      eid: getEid(3),
      pos: "Manager,AA",
    });
    //L: 找同级及以上
    ret = await SDK.post("explain/pds", { pds: "L:Manager" });
    expect(ret[0]?.eid).to.equal(testUsers[3].account + "_eid");
    ret = await SDK.post("explain/pds", { pds: "L:AA" });
    expect(ret[0]?.eid).to.equal(testUsers[3].account + "_eid");
    //P: 找同级
    ret = await SDK.post("explain/pds", { pds: "P:Manager" });
    expect(ret[0]?.eid).to.equal(testUsers[3].account + "_eid");
    ret = await SDK.post("explain/pds", { pds: "P:AA" });
    expect(ret[0]?.eid).to.equal(testUsers[3].account + "_eid");
    //L: 找同级及以上
    ret = await SDK.post("explain/pds", { pds: "L:CTO" });
    expect(ret[0]?.eid).to.equal(testUsers[1].account + "_eid");
    //P: 找同级
    ret = await SDK.post("explain/pds", { pds: "P:CTO" });
    expect(ret[0]?.eid).to.not.exist();
    //Q: 任意查询
    // ouReg1/pos1:pos2&ouReg2/pos3:pos4
    await SDK.post("orgchart/addpos", {
      ou: "root",
      eid: getEid(1),
      pos: "Manager",
    });

    await SDK.post("orgchart/create/or/modify/ou/entry", { ou: "F000100001", cn: "部门1-1" });
    ret = await SDK.post("orgchart/allous");
    expect(ret.length).to.equal(4);
    ret = await SDK.post("orgchart/listou", { top: "F0001", withTop: "yes" });
    expect(ret.length).to.equal(2);
    ret = await SDK.post("orgchart/listou", { top: "F0001", withTop: "no" });
    expect(ret.length).to.equal(1);
    await SDK.post("orgchart/create/employee/entry", {
      ou: "F000100001",
      eid: getEid(4),
      account: getAccount(4),
      cn: "测试用户4",
    });
    await SDK.post("orgchart/addpos", {
      ou: "F000100001",
      eid: getEid(4),
      pos: "Manager",
    });

    //找所有的Manager
    // 现在的情况是:
    // root        user1    Manager
    // F0001       user3    Manager      current eid: user2 is here
    // F000100001  user4   Manager
    ret = await SDK.post("explain/pds", { pds: "Q:Manager" });
    expect(ret.length).to.equal(3);
    expect(ret.map((x) => x.eid)).to.include([getEid(3), getEid(1), getEid(4)]);
    //找本级及以下的Manager, user 3 and user 4
    ret = await SDK.post("explain/pds", { pds: "Q:/Manager" });
    expect(ret.map((x) => x.eid)).to.include([getEid(3), getEid(4)]);
    //找上级,找到一个即停止
    ret = await SDK.post("explain/pds", { pds: "Q://Manager" });
    expect(ret.length).to.equal(1);
    expect(ret.map((x) => x.eid)).to.include(getEid(3));
    ret = await SDK.post("explain/pds", { pds: "Q:///Manager" });
    expect(ret.length).to.equal(2);
    expect(ret.map((x) => x.eid)).to.include([getEid(3), getEid(1)]);
    ret = await SDK.post("explain/pds", { pds: "Q:/CTO" });
    expect(ret[0]?.eid).to.not.exist();
    ret = await SDK.post("explain/pds", { pds: "Q:CTO" });
    expect(ret[0]?.eid).to.equal(getEid(1));
    ret = await SDK.post("explain/pds", { pds: "Q:///CTO" });
    expect(ret[0]?.eid).to.equal(getEid(1));
    ret = await SDK.post("explain/pds", { pds: "Q://CTO" });
    expect(ret[0]?.eid).to.equal(getEid(1));
    // ouReg1/pos1:pos2&ouReg2/pos3:pos4
    ret = await SDK.post("explain/pds", { pds: `Q://CTO&//Manager` });
    expect(ret.length).to.equal(2);
    expect(ret.map((x) => x.eid)).to.include([getEid(3), getEid(1)]);
    ret = await SDK.post("explain/pds", { pds: "Q://CTO&//Manager;@" + getEid(6) });
    expect(ret.length).to.equal(3);
    expect(ret.map((x) => x.eid)).to.include([getEid(3), getEid(1), getEid(6)]);

    //@: @user1;@user2;@user3
    ret = await SDK.post("explain/pds", {
      pds: [0, 1, 2, 3, 4, 5, 6].map((x) => "@" + testUsers[x].account + "_eid").join(";"),
    });
    for (let i = 0; i < 7; i++) {
      expect(ret[i]?.eid).to.equal(testUsers[i].account + "_eid");
    }
    //
    //
    //
    //
    //

    await SDK.post("orgchart/remove/one/employee/entry", {
      eid: testUsers[1].account + "_eid",
      ou: "root",
    });
    ret = await SDK.post("orgchart/list");
    expect(hasEntry(ret, "root", testUsers[1].account + "_eid", "测试用户1")).to.equal(false);
    expect(hasEntry(ret, "F0001", testUsers[1].account + "_eid", "测试用户1")).to.equal(true);
    expect(hasEntry(ret, "F0002", testUsers[1].account + "_eid", "测试用户1")).to.equal(true);
    expect(hasEntry(ret, "F0001", testUsers[2].account + "_eid", "测试用户2")).to.equal(true);
    expect(hasEntry(ret, "F0002", testUsers[2].account + "_eid", "测试用户2")).to.equal(true);

    await SDK.post("orgchart/remove/all/employee/entries", {
      eid: testUsers[2].account + "_eid",
    });
    ret = await SDK.post("orgchart/list");
    expect(hasEntry(ret, "root", testUsers[1].account + "_eid", "测试用户1")).to.equal(false);
    expect(hasEntry(ret, "root", testUsers[2].account + "_eid", "测试用户2")).to.equal(false);
    expect(hasEntry(ret, "F0001", testUsers[2].account + "_eid", "测试用户2")).to.equal(false);
    expect(hasEntry(ret, "F0002", testUsers[2].account + "_eid", "测试用户2")).to.equal(false);
  });

  it("cleaning up", async () => {
    await SDK.login(testUsers[0].account, testUsers[0].passwd);
    await SDK.sleep(1000);
    await SDK.destroyWorkflowByTplid(TPL_ID);
    await SDK.deleteTemplateByTplid(TPL_ID);
    await SDK.login(SITE_ADMIN.account, SITE_ADMIN.password);
    for (let i = 1; i < testUsers.length; i++) {
      await SDK.removeUser(testUsers[i].account, SITE_PWD);
    }
    await SDK.removeUser(testUsers[0].account, SITE_PWD);
  });
});
