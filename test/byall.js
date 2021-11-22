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

describe("byall", () => {
  beforeEach(async () => {});

  afterEach(async () => {});

  let wfid = "lkh_" + SDK.guid();
  let tmp1, tmp2;
  SDK.setServer("http://localhost:5008");
  it("Login", async () => {
    const ret = await SDK.login(TEST_USER, TEST_PASSWORD);
    expect(ret.user.username).to.not.be.empty();
  });

  it("Upload template", async () => {
    const ret = await SDK.putTemplate(fs.readFileSync(TEST_TEMPLATE_DIR + "/byall.xml", "utf8"));
    expect(ret.tplid).to.equal("my_byall");
  });

  it("Configure byall team", async () => {
    let teamMap = {
      alldoers: [
        { uid: "manager1@abcd.com", dname: "manager1" },
        { uid: "manager2@abcd.com", dname: "manager2" },
      ],
    };
    let ret = await SDK.uploadTeam("byall_team", teamMap);
    expect(ret.teamid).to.equal("byall_team");
  });

  it("START Workflow", async () => {
    let ret = await SDK.startWorkflow("my_byall", wfid, "byall_team");
    //get worklist
    await SDK.sleep(500);
    tmp1 = await SDK.getWorklist("manager1@abcd.com", {
      wfid: wfid,
      nodeid: "hellohyperflow",
      status: "ST_RUN",
    });
    expect(tmp1.total).to.equal(1);
    expect(tmp1.objs.length).to.equal(1);
  });

  it("Check manager2's worklist", async () => {
    await SDK.sleep(500);
    tmp2 = await SDK.getWorklist("manager2@abcd.com", {
      wfid: wfid,
      nodeid: "hellohyperflow",
      status: "ST_RUN",
    });
    expect(tmp2.total).to.equal(1);
    expect(tmp2.objs.length).to.equal(1);
  });

  it("do manager1 work", async () => {
    await SDK.sleep(500);
    let ret = await SDK.doWork("manager1@abcd.com", tmp1.objs[0].workid, {
      reason: "Go hospital",
      extra: "Thank you",
    });
    expect(ret.workid).to.equal(tmp1.objs[0].workid);
  });

  it("Check workflow status", async () => {
    await SDK.sleep(1000);
    let ret = await SDK.getStatus(wfid);
    expect(ret).to.equal("ST_RUN");
  });

  it("do manager2's work", async () => {
    await SDK.sleep(500);
    let ret = await SDK.doWork("manager2@abcd.com", tmp2.objs[0].workid, {
      reason: "Go hospital",
      extra: "Thank you",
    });
    expect(ret.workid).to.equal(tmp2.objs[0].workid);
  });

  it("Check workflow status", async () => {
    await SDK.sleep(1000);
    let ret = await SDK.getStatus(wfid);
    expect(ret).to.equal("ST_DONE");
  });

  /* it("Delete team", async () => {
    let ret = await SDK.deleteTeam("byall_team");
    expect(ret.deletedCount).to.equal(1);
    ret = await SDK.getTeamFullInfo("byall_team");
    expect(ret.teamid).to.be.undefined();
  }); */
});
