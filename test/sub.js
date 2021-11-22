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
    let ret = await SDK.putTemplate(fs.readFileSync(TEST_TEMPLATE_DIR + "/parent_1.xml", "utf8"));
    expect(ret.tplid).to.equal("parent_1");
    ret = await SDK.putTemplate(fs.readFileSync(TEST_TEMPLATE_DIR + "/sub_1.xml", "utf8"));
    expect(ret.tplid).to.equal("sub_1");
  });

  it("START Workflow parent_1", async () => {
    let ret = await SDK.startWorkflow("parent_1", wfid);
  });

  it("1> Do action1", { timeout: 60000 }, async () => {
    //get worklist
    await SDK.sleep(200);
    let ret = await SDK.doWorkByNode(TEST_USER, wfid, "action1");
  });

  it("1> Do sub_action1", { timeout: 60000 }, async () => {
    await SDK.sleep(200);
    let tmp = await SDK.workflowGetLatest({ tplid: "sub_1" });
    childwfid = tmp.wfid;
    let wlist = await SDK.getWorklist(TEST_USER, {
      tplid: "sub_1",
      wfid: childwfid,
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(1);
    expect(wlist.objs[0].nodeid).to.equal("sub_action1");
    ret = await SDK.doWorkByNode(TEST_USER, wlist.objs[0].wfid, "sub_action1");
  });

  it("1> Do sub_action2", { timeout: 60000 }, async () => {
    await SDK.sleep(200);
    let wlist = await SDK.getWorklist(TEST_USER, {
      tplid: "sub_1",
      wfid: childwfid,
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(1);
    expect(wlist.objs[0].nodeid).to.equal("sub_action2");
    ret = await SDK.doWorkByNode(TEST_USER, wlist.objs[0].wfid, "sub_action2");
  });

  it("1> Do parent.action2", { timeout: 60000 }, async () => {
    await SDK.sleep(200);
    let wlist = await SDK.getWorklist(TEST_USER, {
      tplid: "parent_1",
      wfid: wfid,
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(1);
    expect(wlist.objs[0].nodeid).to.equal("action2");
    ret = await SDK.doWorkByNode(TEST_USER, wlist.objs[0].wfid, "action2");
  });

  it("2> Do sub_action1", { timeout: 60000 }, async () => {
    await SDK.sleep(200);
    let tmp = await SDK.workflowGetLatest({ tplid: "sub_1" });
    childwfid = tmp.wfid;
    await SDK.sleep(200);
    let wlist = await SDK.getWorklist(TEST_USER, {
      tplid: "sub_1",
      wfid: childwfid,
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(1);
    expect(wlist.objs[0].nodeid).to.equal("sub_action1");
    //在第一个节点上放置一个RET
    ret = await SDK.doWorkByNode(TEST_USER, wlist.objs[0].wfid, "sub_action1", {
      RET: "goto32",
    });
  });

  it("2> Do sub_action2", { timeout: 60000 }, async () => {
    await SDK.sleep(200);
    let wlist = await SDK.getWorklist(TEST_USER, {
      tplid: "sub_1",
      wfid: childwfid,
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(1);
    expect(wlist.objs[0].nodeid).to.equal("sub_action2");
    ret = await SDK.doWorkByNode(TEST_USER, wlist.objs[0].wfid, "sub_action2");
    //sub_action2完成以后，sub流程结束
  });

  // sub完成后，因为sub_action1设置了一个RET goto32
  // 这个会被导入到parent流程中，在parent流程中sub2返回值为goto32
  it("1> Do parent.action32", { timeout: 60000 }, async () => {
    await SDK.sleep(200);
    let wlist = await SDK.getWorklist(TEST_USER, {
      tplid: "sub_1",
      wfid: childwfid,
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(0);
    await SDK.sleep(200);
    wlist = await SDK.getWorklist(TEST_USER, {
      tplid: "parent_1",
      wfid: wfid,
      status: "ST_RUN",
    });
    expect(wlist.total).to.equal(1);
    expect(["action31", "action32"]).to.include(wlist.objs[0].nodeid);
    ret = await SDK.doWorkByNode(TEST_USER, wfid, "action32");
  });
  it("1> Check workflow status", { timeout: 60000 }, async () => {
    await SDK.sleep(1000);
    let ret = await SDK.getStatus(wfid);
    expect(ret).to.equal("ST_DONE");
  });
});
