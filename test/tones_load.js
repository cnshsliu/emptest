"use strict";

const Lab = require("@hapi/lab");
const { expect } = require("@hapi/code");
const { afterEach, beforeEach, describe, it } = (exports.lab = Lab.script());
const { Cheerio, Parser } = require("../src/lib/Parser");
const fs = require("fs");
const SDK = require("metaflow");

const TEST_USER = process.env.TEST_USER || "liukehong@gmail.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "psammead";
const TEST_TEMPLATE_DIR = process.env.TEST_TEMPLATE_DIR || "unknown_folder";

describe("Tones load: ", () => {
  beforeEach(async () => {});

  afterEach(async () => {});

  let wfid = "lkh_" + SDK.guid();
  SDK.setServer("http://localhost:5008");
  it("Login", async () => {
    const ret = await SDK.login(TEST_USER, TEST_PASSWORD);
    expect(ret.user.username).to.not.be.empty();
  });

  it("Upload with ID in template", async () => {
    const ret = await SDK.putTemplate(
      fs.readFileSync(TEST_TEMPLATE_DIR + "/tones_load.xml", "utf8")
    );
    expect(ret.tplid).to.equal("tones_load");
  });

  it("START Workflow tones_load", async () => {
    const ret = await SDK.startWorkflow("tones_load", wfid);
  });

  let leave_days = 6;
  it("Step 1", { timeout: 5000 }, async () => {
    //get worklist
    await SDK.sleep(500);
    let wlist = await SDK.getWorklist(TEST_USER, { wfid: wfid, status: "ST_RUN" });
    expect(wlist.total > 0).to.be.true();
    expect(wlist.objs[0].title).to.equal("test set multiple variables");

    let ret = await SDK.doWork(TEST_USER, wlist.objs[0].workid, {
      days: { value: leave_days },
      reason: { value: "Go hospital" },
      extra: { value: "Thank you", label: "Extra Title" },
      alpharray: { value: ["A", "B", "C", "D"], label: "test_array" },
    });
    expect(ret.workid).to.equal(wlist.objs[0].workid);
  });

  let ret;
  let repeat_times = 200;

  for (let i = 0; i < repeat_times; i++) {
    it("Revoke", async () => {
      ret = await SDK.getWorklist(TEST_USER, { wfid: wfid, status: "ST_RUN" }, 10);
      expect(ret.objs[0].title).to.equal("test check variables");
      ret = await SDK.sendback(TEST_USER, wfid, ret.objs[0].workid);
      ret = await SDK.getWorklist(TEST_USER, { wfid: wfid, status: "ST_RUN" }, 10);
      expect(ret.objs[0].title).to.equal("test set multiple variables");
      let retDoWork = await SDK.doWork(TEST_USER, ret.objs[0].workid, {
        days: { value: leave_days + i },
        reason: { value: "Go hospital_" + i },
        extra: { value: "Thank you_" + i, label: "Extra Title" },
        alpharray: { value: ["A", "B", "C", "D", `${i}`], label: "test_array" },
      });
      expect(retDoWork.workid).to.equal(ret.objs[0].workid);
      let kvars = await SDK.getKVars(wfid);
    });
  }

  it("检查变量", async () => {
    let allvars = await SDK.getKVars(wfid);
    expect(allvars["days"].value).to.equal(leave_days + repeat_times - 1);
    expect(allvars["reason"].value).to.equal("Go hospital_" + (repeat_times - 1));
    expect(allvars["extra"].value).to.equal("Thank you_" + (repeat_times - 1));
  });

  it("Do check variables with 999999", { timeout: 5000 }, async () => {
    ret = await SDK.getWorklist(TEST_USER, { wfid: wfid, status: "ST_RUN" }, 10);
    expect(ret.objs[0].title).to.equal("test check variables");
    let retDoWork = await SDK.doWork(TEST_USER, ret.objs[0].workid, {
      days: { value: 999999 },
    });
    expect(retDoWork.workid).to.equal(ret.objs[0].workid);
    let allvars = await SDK.getKVars(wfid);
    expect(allvars["days"].value).to.equal(999999);
    expect(allvars["reason"].value).to.equal("Go hospital_" + (repeat_times - 1));
    expect(allvars["extra"].value).to.equal("Thank you_" + (repeat_times - 1));
  });

  it("Do activity3 ", { timeout: 5000 }, async () => {
    //wait script node complete by trying to get next running work many times
    ret = await SDK.getWorklist(TEST_USER, { wfid: wfid, status: "ST_RUN" }, 20);
    expect(ret.total).to.equal(1);
    expect(ret.objs[0].title).to.equal("Activity3");

    let allvars = await SDK.getKVars(wfid);
    //The days values was changed to 1000 in SCRIPT node
    expect(allvars["days"].value).to.equal(1000);
    expect(allvars["reason"].value).to.equal("Go hospital_" + (repeat_times - 1));
    expect(allvars["extra"].value).to.equal("Thank you_" + (repeat_times - 1));
    expect(allvars["script_echo"].value).to.equal("hello script");

    ret = await SDK.doWork(TEST_USER, ret.objs[0].workid, { days: 3 });

    allvars = await SDK.getKVars(wfid);
    expect(allvars["days"].value).to.equal(3);
    expect(allvars["reason"].value).to.equal("Go hospital_" + (repeat_times - 1));
    expect(allvars["extra"].value).to.equal("Thank you_" + (repeat_times - 1));
    expect(allvars["script_echo"].value).to.equal("hello script");
  });

  it("Should have no workitem now", { timeout: 5000 }, async () => {
    let wlist = await SDK.getWorklist(TEST_USER, { wfid: wfid, status: "ST_RUN" }, 5);
    expect(wlist.total).to.equal(0);
  });

  it("Check workflow status", async () => {
    let ret = await SDK.getStatus(wfid);
    expect(ret).to.equal("ST_DONE");
  });
});
