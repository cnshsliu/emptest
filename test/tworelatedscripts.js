"use strict";

const Lab = require("@hapi/lab");
const { expect } = require("@hapi/code");
const { afterEach, beforeEach, describe, it } = (exports.lab = Lab.script());
const { Cheerio, Parser } = require("../src/lib/Parser");
const fs = require("fs");
const Tools = require("../src/tools/tools");
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
      fs.readFileSync(TEST_TEMPLATE_DIR + "/tworelatedscripts.xml", "utf8"),
      "tworelatedscripts"
    );
    expect(ret.tplid).to.equal("tworelatedscripts");
  });

  it("START Workflow", async () => {
    const ret = await SDK.startWorkflow("tworelatedscripts", wfid);
  });

  let leave_days = 6;
  it("get first activity ", { timeout: 5000 }, async () => {
    //get worklist
    let wlist = await SDK.getWorklist(TEST_USER, { wfid: wfid, status: "ST_RUN" });
    expect(wlist.total > 0).to.be.true();
    expect(wlist.objs[0].title).to.equal("Activity");

    let ret = await SDK.doWork(TEST_USER, wlist.objs[0].workid, {
      alpharray: { value: ["A", "B", "C", "D"], label: "test_array" },
    });
    expect(ret.workid).to.equal(wlist.objs[0].workid);
  });

  let ret;
  let repeat_times = 200;

  ret = await SDK.getWorklist(TEST_USER, { wfid: wfid, status: "ST_RUN" }, 10);
  expect(ret.objs[0].title).to.equal("AAA");

  let allvars = await SDK.getKVars(wfid);
  expect(allvars["reason"].value).to.equal("AAA");

  it("Should have no workitem now", { timeout: 5000 }, async () => {
    let wlist = await SDK.getWorklist(TEST_USER, { wfid: wfid, status: "ST_RUN" }, 5);
    expect(wlist.total).to.equal(0);
  });

  it("Check workflow status", async () => {
    let ret = await SDK.getStatus(wfid);
    expect(ret).to.equal("ST_DONE");
  });
});
