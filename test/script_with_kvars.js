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
    let ret = await SDK.putTemplate(
      fs.readFileSync(TEST_TEMPLATE_DIR + "/script_with_kvars.xml", "utf8")
    );
    expect(ret.tplid).to.equal("script_with_kvars");
  });

  it("START Workflow script_with_kvars", async () => {
    let ret = await SDK.startWorkflow("script_with_kvars", wfid);
  });

  it("1> Do action1", { timeout: 60000 }, async () => {
    //get worklist
    await SDK.sleep(200);
    let ret = await SDK.doWorkByNode(TEST_USER, wfid, "action1");
  });

  it("1> Check vars", { timeout: 60000 }, async () => {
    await SDK.sleep(200);
    let tmp = await SDK.getKVars(wfid);
    expect(tmp.bpo.value).to.equal("Bingo, You found me");
    expect(tmp.intv.value).to.equal(10);
    expect(tmp.RET.value).to.equal("YES");
  });
  it("1> Check actionYES", { timeout: 60000 }, async () => {
    await SDK.sleep(200);
    let wlist = await SDK.getWorklist(TEST_USER, { wfid: wfid, status: "ST_RUN" });
    expect(wlist.total).to.equal(1);
    expect(wlist.objs[0].nodeid).to.equal("actionYES");
    await SDK.sleep(200);
    let actionYES_workid = wlist.objs[0].workid;
    tmp = await SDK.doWork(TEST_USER, actionYES_workid);
    expect(tmp.workid).to.equal(actionYES_workid);
    await SDK.sleep(200);

    tmp = await SDK.getStatus(wfid);
    expect(tmp).to.equal("ST_DONE");
  });
});
