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

describe("Test Delegation: ", () => {
  beforeEach(async () => {});

  afterEach(async () => {});

  let wfid = "lkh_" + SDK.guid();
  let username = "";
  let password = "";
  let email = "";
  let verifyEmailToken = "";
  let res;
  let joincode;
  SDK.setServer("http://localhost:5008");

  it("Register Test Admin Users testu001 if not exist", async () => {
    password = "Ab@abcd123";
    try {
      res = await SDK.register("testu001", password, "testu001@abcd.com");
      res = await SDK.verify(res.verifyToken);
    } catch (e) {}

    res = await SDK.login("testu001@abcd.com", "Ab@abcd123");
    res = await SDK.orgMyOrg();
    if (res.orgmode === false) {
      res = await SDK.post("/tnt/my/org/set/orgmode", { password: "Ab@abcd123", orgmode: true });
      res = await SDK.orgMyOrgSetOrgmode(true, "Ab@abcd123");
      res = await SDK.orgMyOrg();
    }
    expect(res.orgmode).to.be.true();
  });

  it("Register testu002 and testu003", async () => {
    try {
      res = await SDK.register("testu002", password, "testu002@abcd.com");
      res = await SDK.verify(res.verifyToken);
    } catch (e) {}
    try {
      res = await SDK.register("testu003", password, "testu003@abcd.com");
      res = await SDK.verify(res.verifyToken);
    } catch (e) {}
  });

  it("testu001 generate joincode", async () => {
    res = await SDK.login("testu001@abcd.com", "Ab@abcd123");
    res = await SDK.orgJoinCodeNew("Ab@abcd123");
    joincode = res.joincode;
  });

  it("test002 apply join", async () => {
    res = await SDK.login("testu002@abcd.com", "Ab@abcd123");
    res = await SDK.orgJoin(joincode);
  });
  it("test003 apply join", async () => {
    res = await SDK.login("testu003@abcd.com", "Ab@abcd123");
    res = await SDK.orgJoin(joincode);
  });
  it("testu001 approve applications", async () => {
    res = await SDK.login("testu001@abcd.com", "Ab@abcd123");
    res = await SDK.orgMyOrg();
    expect(res.joinapps.length).to.equal(2);
    res = await SDK.orgApprove("testu002@abcd.com:testu003@abcd.com", "Ab@abcd123");
    res = await SDK.orgMyOrg();
    expect(res.joinapps.length).to.equal(0);
  });
  it("set member's group", async () => {
    res = await SDK.orgSetMemberGroup("testu002@abcd.com", "Ab@abcd123", "DOER");
    res = await SDK.orgSetMemberGroup("testu003@abcd.com", "Ab@abcd123", "OBSERVER");
  });
  it("test delegation", async () => {
    res = await SDK.login("testu001@abcd.com", "Ab@abcd123");
    res = await SDK.putTemplate(
      fs.readFileSync(TEST_TEMPLATE_DIR + "/simple_leave_application.xml", "utf8")
    );
    expect(res.tplid).to.equal("simple_leave_application");
    res = await SDK.startWorkflow("simple_leave_application", wfid);
    res = await SDK.getWorklist("testu001@abcd.com", 10);
    expect(res.total).to.be.greaterThan(0);
    expect(res.objs[0].doer).to.equal("testu001@abcd.com");

    wfid = "lkh_" + SDK.guid();
    res = await SDK.login("testu002@abcd.com", "Ab@abcd123");
    res = await SDK.startWorkflow("simple_leave_application", wfid);
    res = await SDK.getWorklist("testu002@abcd.com", 10);
    expect(res.total).to.be.greaterThan(0);
    expect(res.objs[0].doer).to.equal("testu002@abcd.com");

    /** Cleanup delegation **/
    res = await SDK.login("testu001@abcd.com", "Ab@abcd123");
    res = await SDK.post("delegation/from/me");
    let ids = res.map((x) => x._id).join(":");
    res = await SDK.post("undelegate", { ids });

    res = await SDK.login("testu002@abcd.com", "Ab@abcd123");
    res = await SDK.getWorklist("testu001@abcd.com", 10);
    expect(res.total).to.equal(0);

    /** New delegation **/
    res = await SDK.login("testu001@abcd.com", "Ab@abcd123");
    let today = new Date();
    let begindate = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    today.setDate(today.getDate() + 3);
    let enddate = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;

    res = await SDK.post("delegate", {
      delegatee: "testu002@abcd.com",
      begindate: begindate,
      enddate: enddate,
    });
    res = await SDK.post("delegation/from/me");
    expect(res.length).to.equal(1);

    res = await SDK.login("testu002@abcd.com", "Ab@abcd123");
    res = await SDK.post("delegation/to/me");
    let number_of_delegation_to_me = res.length;
    res = await SDK.post("delegation/to/me/today");
    let number_of_delegation_to_me_today = res.length;
    expect(number_of_delegation_to_me).to.equal(1);
    expect(number_of_delegation_to_me_today).to.equal(1);
    expect(number_of_delegation_to_me >= number_of_delegation_to_me_today).to.be.true();
    res = await SDK.getWorklist("testu001@abcd.com", 10);
    expect(res.total > 0).to.be.true();

    res = await SDK.login("testu001@abcd.com", "Ab@abcd123");
    await SDK.removeUser("testu003@abcd.com", "Ab@abcd123");
    await SDK.removeUser("testu002@abcd.com", "Ab@abcd123");
    await SDK.removeUser("testu001@abcd.com", "Ab@abcd123");
  });
});
