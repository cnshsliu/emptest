const Lab = require("@hapi/lab");
const { expect } = require("@hapi/code");
const { afterEach, beforeEach, before, after, describe, it } = (exports.lab = Lab.script());
const { Cheerio, Parser } = require("../src/lib/Parser");
const fs = require("fs");
const SDK = require("metaflow");

const TEST_USER = process.env.TEST_USER || "liukehong@gmail.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "psammead";
const TEST_TEMPLATE_DIR = process.env.TEST_TEMPLATE_DIR || "unknown_folder";

describe("Test: ", () => {
  beforeEach(async () => {});

  afterEach(async () => {});

  let wfid = "lkh_" + SDK.guid();
  let childwfid = "";
  let tmpworkid = "";
  SDK.setServer("http://localhost:5008");
  it("Login", async () => {
    const ret = await SDK.login(TEST_USER, TEST_PASSWORD);
    expect(ret.user.username).to.not.be.empty();
  });

  it("Upload template", async () => {
    let ret = await SDK.putTemplate(fs.readFileSync(TEST_TEMPLATE_DIR + "/callback.xml", "utf8"));
    expect(ret.tplid).to.equal("callback");
  });

  it("START Workflow callback", async () => {
    let ret = await SDK.startWorkflow("callback", wfid);
  });

  it("1> Do action1", { timeout: 60000 }, async () => {
    //get worklist
    await SDK.sleep(200);
    let ret = await SDK.doWorkByNode(TEST_USER, wfid, "action1");
  });

  it("1> Wait 1 seconds then callback", { timeout: 60000 }, async () => {
    await SDK.sleep(1000);
    let cbpFilter = { wfid: wfid };
    let cbps = await SDK.getCallbackPoints(cbpFilter);
    expect(cbps).to.be.array();
    let numberOfCbps = cbps.length;
    expect(numberOfCbps > 0).to.be.true();
    let tmp = await SDK.getLatestCallbackPoint(cbpFilter);
    expect(tmp.workid).to.equal(cbps[numberOfCbps - 1].workid);

    //第二个参数决定callback的节点路径
    let ret = await SDK.doCallback(cbps[numberOfCbps - 1], "NO", { from_cbp: "value from cbp" });
    expect(ret).to.equal(cbps[numberOfCbps - 1].workid);

    cbps = await SDK.getCallbackPoints(cbpFilter);
    expect(cbps.length).to.equal(numberOfCbps - 1);
  });

  it("1> Check vars", { timeout: 60000 }, async () => {
    await SDK.sleep(200);
    let tmp = await SDK.getKVars(wfid);
    expect(tmp.bpo.value).to.equal("Bingo, You found me");
    expect(tmp.intv.value).to.equal(10);
    expect(tmp.RET.value).to.equal("YES");
    expect(tmp.from_cbp.value).to.equal("value from cbp");
  });
  it("1> Check actionNO", { timeout: 60000 }, async () => {
    await SDK.sleep(200);
    let wlist = await SDK.getWorklist(TEST_USER, { wfid: wfid, status: "ST_RUN" });
    expect(wlist.objs.length).to.equal(1);
    //doCallback的第二个参数
    expect(wlist.objs[0].nodeid).to.equal("actionNO");
    await SDK.sleep(200);
    let action_workid = wlist.objs[0].workid;
    tmp = await SDK.doWork(TEST_USER, action_workid);
    expect(tmp.workid).to.equal(action_workid);
    await SDK.sleep(200);

    tmp = await SDK.getStatus(wfid);
    expect(tmp).to.equal("ST_DONE");
  });
});
