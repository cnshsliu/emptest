"use strict";
import * as Lab from "@hapi/lab";
import { expect } from "@hapi/code";
const lab = Lab.script();
const { describe, it, before } = lab;

export { lab };
import SDK from "../app.js";
import fs from "fs";
import path from "path";
const SITE_PWD = "site_password_999";
const SITE_ADMIN = { account: "lucas2", name: "Lucas2", password: "Pwd@123" };

const TID = "htsp";

const TEST_TEMPLATE_DIR = process.env.TEST_TEMPLATE_DIR || "./templates";
const globalDebug = process.env.LAB_DEBUG === "true";

const TPL_FILE = "合同审批.xml";
const TPL_ID = TID + "_合同审批";

const getAccount = (idx: number) => {
  return testUsers[idx].account;
};
const getEid = (idx: number) => {
  return testUsers[idx].eid;
};

const getUserByEid = (eid: string) => {
  for (let i = 0; i < testUsers.length; i++) {
    if (testUsers[i].eid === eid) {
      return testUsers[i];
    }
  }
  throw new Error(`User eid:${eid} not found`);
};
const getUserByAccount = (acct: string) => {
  for (let i = 0; i < testUsers.length; i++) {
    if (testUsers[i].account === acct) {
      return testUsers[i];
    }
  }
  throw new Error(`User account:${acct} not found`);
};

const testUsers = [
  {
    account: TID + "_user_test_lkh",
    passwd: "Password@123",
    name: "UserLKH_" + SDK.randomString(7),
    eid: "user_test_lkh",
  },
  {
    account: TID + "_user_test_001",
    passwd: "Password@123",
    name: "User001_" + SDK.randomString(7),
    eid: "user_test_001",
  },
  {
    account: TID + "_user_test_002",
    passwd: "Password@123",
    name: "User002_" + SDK.randomString(7),
    eid: "user_test_002",
  },
  {
    account: TID + "_user_test_003",
    passwd: "Password@123",
    name: "User003_" + SDK.randomString(7),
    eid: "user_test_003",
  },
  {
    account: TID + "_user_test_004",
    passwd: "Password@123",
    name: "User004_" + SDK.randomString(7),
    eid: "user_test_004",
  },
  {
    account: TID + "_user_test_005",
    passwd: "Password@123",
    name: "User005_" + SDK.randomString(7),
    eid: "user_test_005",
  },
  {
    account: TID + "_user_test_006",
    passwd: "Password@123",
    name: "User006_" + SDK.randomString(7),
    eid: "user_test_006",
  },
  {
    account: TID + "_zhengwenpeng",
    passwd: "Password@123",
    name: "郑文鹏",
    eid: "zhengwenpeng",
  },
  {
    account: TID + "_liuhong",
    passwd: "Password@123",
    name: "刘红",
    eid: "liuhong",
  },
  {
    account: TID + "_duluqing",
    passwd: "Password@123",
    name: "杜鹭清",
    eid: "duluqing",
  },
  {
    account: TID + "_zhoubo",
    passwd: "Password@123",
    name: "周波",
    eid: "zhoubo",
  },
  {
    account: TID + "_lingxiaoping",
    passwd: "Password@123",
    name: "凌小萍",
    eid: "lingxiaoping",
  },
  {
    account: TID + "_xuchunsheng",
    passwd: "Password@123",
    name: "许董",
    eid: "xuchunsheng",
  },
  {
    account: TID + "_zhanghaoyu",
    passwd: "Password@123",
    name: "张浩宇",
    eid: "zhanghaoyu",
  },
  {
    account: TID + "_liushanshan",
    passwd: "Password@123",
    name: "刘珊珊",
    eid: "liushanshan",
  },
  {
    account: TID + "_linjingkai",
    passwd: "Password@123",
    name: "林靖凯",
    eid: "linjingkai",
  },
  {
    account: TID + "_xiaomin",
    passwd: "Password@123",
    name: "肖敏",
    eid: "xiaomin",
  },
  {
    account: TID + "_linyukui",
    passwd: "Password@123",
    name: "林玉葵",
    eid: "linyukui",
  },
  {
    account: TID + "_chenancheng",
    passwd: "Password@123",
    name: "陈安成",
    eid: "chenancheng",
  },
  {
    account: TID + "_xiexiaolong",
    passwd: "Password@123",
    name: "解晓龙",
    eid: "xiexiaolong",
  },
  {
    account: TID + "_lucas",
    passwd: "Password@123",
    name: "Lucas",
    eid: "lucas",
  },
  {
    account: TID + "_yuanqin",
    passwd: "Password@123",
    name: "袁琴",
    eid: "yuanqin",
  },
  {
    account: TID + "_guozhiduo",
    passwd: "Password@123",
    name: "郭智夺",
    eid: "guozhiduo",
  },
];

const kvarKeys = ["name", "value", "ui", "label", "type"];
type stepType = {
  nodeid: string; //节点的nodeid
  nodecn?: string; //节点的显示名称
  doer: string;
  decision?: string;
  input?: Record<string, any>;
  sleep?: number;
  showKVarsBefore?: boolean; // 在doWork之前,是否需要显示kvar的值
  showKVarsAfter?: boolean; // 在doWork之后,是否需要显示kvar的值
  noft?: number; //该步骤完成后,再次检查当前用户的工作项,应该有几个,缺省为0,
  checkKVarsAfter?: Record<string, any>; // 在doWork之后, 检查当下的kvar的值
  checkKVarsBefore?: Record<string, any>; //在doWork之前,检查当下的kvar的值
  //以上两个变量中,有kvarsKeys中的那些key,就检查哪些key
};
type testRound = {
  debug?: boolean;
  desc: string;
  starter: string;
  steps: stepType[];
};

const compareObject = (A, B) => {
  let ret = true;
  let keys = Object.keys(B);
  for (let k = 0; k < keys.length; k++) {
    let allKvarKeysOk = true;
    for (let indx = 0; indx < kvarKeys.length; indx++) {
      if (B[keys[k]][kvarKeys[indx]] && A[keys[k]][kvarKeys[indx]] !== B[keys[k]][kvarKeys[indx]]) {
        allKvarKeysOk = false;
        break;
      }
    }
    if (!allKvarKeysOk) {
      ret = false;
      break;
    }
  }
  return ret;
};
const testData: testRound[] = [
  {
    desc: "两个章都需要,就得盖章",
    starter: "guozhiduo",
    steps: [
      {
        nodeid: "hellohyperflow",
        nodecn: "Apply",
        doer: "guozhiduo",
        decision: "提交",
        input: {
          customer_name: "客户公司一",
          contract_name: "采购合同一",
          contract_amount: 49990,
          sl_contract: "新力",
          sl_yewu: "总办",
          usr_negotiator: "guozhiduo",
          cb_gz: true,
          cb_htz: true,
        },
        showKVarsAfter: false,
        checkKVarsAfter: {
          sl_yewu: { value: "总办", label: "sl_yewu" },
        },
      },
      {
        nodeid: "kdNY5z1QMGHGEXLGFzJ336",
        nodecn: "业务审批",
        doer: "yuanqin",
        decision: "通过",
        showKVarsBefore: false,
        checkKVarsBefore: {
          bizOwner: { value: "yuanqin" },
        },
      },
      {
        nodeid: "dzmtWP7rXEomcqaXghpo2m",
        nodecn: "法务初审",
        doer: "zhengwenpeng",
        decision: "通过",
      },
      { nodeid: "n53crFwaUR3DxLtB6XDzTqB", nodecn: "法务终审", doer: "liuhong", decision: "通过" },
      { nodeid: "hZjRDcWEU3D21J7Z5o1VCg", nodecn: "财务审核", doer: "duluqing", decision: "通过" },
      { nodeid: "5TwG6bdwJb75NfMALTtRZ6", nodecn: "Lucas审批", doer: "lucas", decision: "通过" },
      { nodeid: "7ybw53uTXLbRhHBroeLv3c", nodecn: "总裁办审批", doer: "zhoubo", decision: "通过" },
      { nodeid: "6on3A574Kf3Ag8ztUTdc2H", nodecn: "盖章", doer: "lingxiaoping", decision: "通过" },
      {
        nodeid: "eTKr14WohDCdWoYzhhkgXQ",
        nodecn: "发起人确认",
        doer: "guozhiduo",
        decision: "确定结束合同审批流程",
      },
    ],
  },

  {
    desc: "只要需要公章和合同章之一就需要盖章",
    starter: "guozhiduo",
    steps: [
      {
        nodeid: "hellohyperflow",
        nodecn: "Apply",
        doer: "guozhiduo",
        decision: "提交",
        input: {
          customer_name: "客户公司一",
          contract_name: "采购合同一",
          contract_amount: 49990,
          sl_contract: "新力",
          sl_yewu: "总办",
          usr_negotiator: "guozhiduo",
          cb_gz: false,
          cb_htz: true,
        },
      },
      {
        nodeid: "kdNY5z1QMGHGEXLGFzJ336",
        nodecn: "业务审批",
        doer: "yuanqin",
        decision: "通过",
      },
      {
        nodeid: "dzmtWP7rXEomcqaXghpo2m",
        nodecn: "法务初审",
        doer: "zhengwenpeng",
        decision: "通过",
      },
      { nodeid: "n53crFwaUR3DxLtB6XDzTqB", nodecn: "法务终审", doer: "liuhong", decision: "通过" },
      { nodeid: "hZjRDcWEU3D21J7Z5o1VCg", nodecn: "财务审核", doer: "duluqing", decision: "通过" },
      { nodeid: "5TwG6bdwJb75NfMALTtRZ6", nodecn: "Lucas审批", doer: "lucas", decision: "通过" },
      { nodeid: "7ybw53uTXLbRhHBroeLv3c", nodecn: "总裁办审批", doer: "zhoubo", decision: "通过" },
      { nodeid: "6on3A574Kf3Ag8ztUTdc2H", nodecn: "盖章", doer: "lingxiaoping", decision: "通过" },
      {
        nodeid: "eTKr14WohDCdWoYzhhkgXQ",
        nodecn: "发起人确认",
        doer: "guozhiduo",
        decision: "确定结束合同审批流程",
      },
    ],
  },

  {
    desc: "无须盖章",
    starter: "guozhiduo",
    steps: [
      {
        nodeid: "hellohyperflow",
        nodecn: "Apply",
        doer: "guozhiduo",
        decision: "提交",
        input: {
          customer_name: "客户公司一",
          contract_name: "采购合同一",
          contract_amount: 49990,
          sl_contract: "新力",
          sl_yewu: "总办",
          usr_negotiator: "guozhiduo",
          cb_gz: false,
          cb_htz: false,
        },
      },
      {
        nodeid: "kdNY5z1QMGHGEXLGFzJ336",
        nodecn: "业务审批",
        doer: "yuanqin",
        decision: "通过",
      },
      {
        nodeid: "dzmtWP7rXEomcqaXghpo2m",
        nodecn: "法务初审",
        doer: "zhengwenpeng",
        decision: "通过",
      },
      { nodeid: "n53crFwaUR3DxLtB6XDzTqB", nodecn: "法务终审", doer: "liuhong", decision: "通过" },
      { nodeid: "hZjRDcWEU3D21J7Z5o1VCg", nodecn: "财务审核", doer: "duluqing", decision: "通过" },
      { nodeid: "5TwG6bdwJb75NfMALTtRZ6", nodecn: "Lucas审批", doer: "lucas", decision: "通过" },
    ],
  },
  {
    desc: "行政,合同金额 >= 50000, 须通过徐董",
    starter: "guozhiduo",
    steps: [
      {
        nodeid: "hellohyperflow",
        nodecn: "Apply",
        doer: "guozhiduo",
        decision: "提交",
        input: {
          customer_name: "客户公司一",
          contract_name: "采购合同一",
          contract_amount: 50000,
          sl_contract: "新力",
          sl_yewu: "行政",
          usr_negotiator: "guozhiduo",
          cb_gz: true,
          cb_htz: true,
        },
      },
      {
        nodeid: "kdNY5z1QMGHGEXLGFzJ336",
        nodecn: "业务审批",
        doer: "linyukui",
        decision: "通过",
      },
      {
        nodeid: "dzmtWP7rXEomcqaXghpo2m",
        nodecn: "法务初审",
        doer: "zhengwenpeng",
        decision: "通过",
      },
      { nodeid: "n53crFwaUR3DxLtB6XDzTqB", nodecn: "法务终审", doer: "liuhong", decision: "通过" },
      { nodeid: "hZjRDcWEU3D21J7Z5o1VCg", nodecn: "财务审核", doer: "duluqing", decision: "通过" },
      { nodeid: "5TwG6bdwJb75NfMALTtRZ6", nodecn: "Lucas审批", doer: "lucas", decision: "通过" },
      {
        nodeid: "5TwG6bdwJb75NfMALTtRZ6",
        nodecn: "许董审批",
        doer: "xuchunsheng",
        decision: "通过",
      },
      { nodeid: "7ybw53uTXLbRhHBroeLv3c", nodecn: "总裁办审批", doer: "zhoubo", decision: "通过" },
      { nodeid: "6on3A574Kf3Ag8ztUTdc2H", nodecn: "盖章", doer: "lingxiaoping", decision: "通过" },
      {
        nodeid: "eTKr14WohDCdWoYzhhkgXQ",
        nodecn: "发起人确认",
        doer: "guozhiduo",
        decision: "确定结束合同审批流程",
      },
    ],
  },
  {
    desc: "招商,合同金额 >= 50000, 须通过徐董",
    starter: "guozhiduo",
    steps: [
      {
        nodeid: "hellohyperflow",
        nodecn: "Apply",
        doer: "guozhiduo",
        decision: "提交",
        input: {
          customer_name: "客户公司一",
          contract_name: "采购合同一",
          contract_amount: 50000,
          sl_contract: "新力",
          sl_yewu: "招商",
          usr_negotiator: "guozhiduo",
          cb_gz: true,
          cb_htz: true,
        },
      },
      {
        nodeid: "kdNY5z1QMGHGEXLGFzJ336",
        nodecn: "业务审批",
        doer: "chenancheng",
        decision: "通过",
      },
      {
        nodeid: "dzmtWP7rXEomcqaXghpo2m",
        nodecn: "法务初审",
        doer: "zhengwenpeng",
        decision: "通过",
      },
      { nodeid: "n53crFwaUR3DxLtB6XDzTqB", nodecn: "法务终审", doer: "liuhong", decision: "通过" },
      { nodeid: "hZjRDcWEU3D21J7Z5o1VCg", nodecn: "财务审核", doer: "duluqing", decision: "通过" },
      { nodeid: "5TwG6bdwJb75NfMALTtRZ6", nodecn: "Lucas审批", doer: "lucas", decision: "通过" },
      {
        nodeid: "5TwG6bdwJb75NfMALTtRZ6",
        nodecn: "许董审批",
        doer: "xuchunsheng",
        decision: "通过",
      },
      { nodeid: "7ybw53uTXLbRhHBroeLv3c", nodecn: "总裁办审批", doer: "zhoubo", decision: "通过" },
      { nodeid: "6on3A574Kf3Ag8ztUTdc2H", nodecn: "盖章", doer: "lingxiaoping", decision: "通过" },
      {
        nodeid: "eTKr14WohDCdWoYzhhkgXQ",
        nodecn: "发起人确认",
        doer: "guozhiduo",
        decision: "确定结束合同审批流程",
      },
    ],
  },
];
describe("HeTongShenPi", { timeout: 5000 }, () => {
  let wfid = "lkh_" + SDK.guid();
  // SDK.setServer("http://emp.localhost:5008");
  SDK.setServer("http://emp.localhost");
  it("prepare admin account ", async () => {
    try {
      await SDK.register(SITE_ADMIN.account, SITE_ADMIN.name, SITE_ADMIN.password);
    } catch (e) {
      console.error(e);
    }
  });

  it("Step 1: Prepare test account", { timeout: 20000 }, async () => {
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
    ret = await SDK.login(SITE_ADMIN.account, SITE_ADMIN.password);
    ret = await SDK.post("/tnt/set/orgmode", { password: SITE_PWD, tenant_id: tenant_id });
    expect(ret).to.equal(true);
    await SDK.login(testUsers[0].account, testUsers[0].passwd);

    let joincodeRet = await SDK.orgJoinCodeNew();
    //申请加入组织
    for (let i = 0; i < testUsers.length; i++) {
      await SDK.login(testUsers[i].account, testUsers[i].passwd);
      let ret = await SDK.orgJoin(joincodeRet.joincode);
      expect(ret.code).to.equal("ok");
      await SDK.sleep(100);
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
        eid: getUserByAccount(x).eid,
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
  it("Upload with ID in template", async () => {
    const ret = await SDK.putTemplate(
      fs.readFileSync(path.join(TEST_TEMPLATE_DIR, TPL_FILE), "utf8"),
      TPL_ID
    );
    expect(ret.tplid).to.equal(TPL_ID);
  });

  let activeUser = null;
  let todoIds: Record<string, string> = {};

  for (let i = 0; i < testData.length; i++) {
    todoIds = {};
    it("Show round info", async () => {
      if (globalDebug || (testData[i].debug ?? false))
        console.log(`轮次 ${i}: ${testData[i].desc}`);
    });
    it("START Workflow", async () => {
      activeUser = getUserByEid(testData[i].starter);
      await SDK.login(activeUser);
      const ret = await SDK.startWorkflow(TPL_ID, wfid);
    });
    let steps = testData[i].steps;
    for (let s = 0; s < steps.length; s++) {
      it(steps[s].nodeid, async () => {
        activeUser = getUserByEid(steps[s].doer);
        expect(activeUser.eid).to.not.be.empty();
        await SDK.login(activeUser);
        await SDK.sleep(steps[s].sleep ?? 500);
        let wlist: any;
        for (let i = 0; i < 30; i++) {
          wlist = await SDK.getWorklist(activeUser.eid, {
            wfid: wfid,
            status: "ST_RUN",
          });
          if (wlist && wlist.objs && wlist.objs.length > 0) {
            break;
          }
          if (globalDebug || (testData[i].debug ?? false))
            console.log(`Wait TODO for ${steps[s].nodeid}  --- ${activeUser.eid}:    ${i}`);
          await SDK.sleep(200);
        }
        expect(wlist.objs[0].status).to.equal("ST_RUN");
        let thisTodoid = wlist.objs[0].todoid;
        todoIds[steps[s].nodeid] = thisTodoid;
        if (globalDebug || (testData[i].debug ?? false))
          console.log(
            `Step ${i}-${s} Do ${steps[s].nodecn ?? steps[s].nodeid} by ${steps[s].doer}`
          );

        if (steps[s].showKVarsBefore || steps[s].checkKVarsBefore) {
          let ret = await SDK.post("workflow/kvars", { wfid: wfid });
          if (steps[s].showKVarsBefore) console.log(ret);
          if (steps[s].checkKVarsBefore) {
            expect(compareObject(ret, steps[s].checkKVarsBefore)).to.be.true();
          }
        }
        let ret = await SDK.doWork(
          activeUser.eid,
          thisTodoid,
          steps[s].input ?? {},
          steps[s].decision ?? "Default"
        );
        expect(ret.todoid).to.equal(thisTodoid);

        if (steps[s].showKVarsAfter || steps[s].checkKVarsAfter) {
          let ret = await SDK.post("workflow/kvars", { wfid: wfid });
          if (steps[s].showKVarsAfter) console.log(ret);

          if (steps[s].checkKVarsAfter) {
            expect(compareObject(ret, steps[s].checkKVarsAfter)).to.be.true();
          }
        }
        let thisNoft = steps[s].noft ?? 0;
        await SDK.sleep(500);
        wlist = await SDK.getWorklist(activeUser.eid, { wfid: wfid, status: "ST_RUN" });
        expect(wlist.total).to.equal(thisNoft);
      });
    }
    it("Check workflow status", async () => {
      await SDK.sleep(1000);
      let ret = await SDK.getStatus(wfid);
      expect(ret).to.equal("ST_DONE");
    });
    it("Destroy Workflow ", async () => {
      await SDK.login(testUsers[0].account, testUsers[0].passwd);
      await SDK.destroyWorkflowByTplid(TPL_ID);
    });
  }

  it("cleaning up test users", async () => {
    await SDK.login(testUsers[0].account, testUsers[0].passwd);
    await SDK.sleep(3000);
    await SDK.destroyWorkflowByTplid(TPL_ID);
    await SDK.deleteTemplateByTplid(TPL_ID);
    await SDK.login(SITE_ADMIN.account, SITE_ADMIN.password);
    for (let i = 1; i < testUsers.length; i++) {
      await SDK.removeUser(testUsers[i].account, SITE_PWD);
    }
    await SDK.removeUser(testUsers[0].account, SITE_PWD);
    await SDK.removeUser(SITE_ADMIN.account, SITE_PWD);
  });
});
