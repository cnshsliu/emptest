"use strict";

const Lab = require("@hapi/lab");
const { expect } = require("@hapi/code");
const { afterEach, beforeEach, describe, it } = (exports.lab = Lab.script());
const SDK = require("metaflow");

const TEST_USER = process.env.TEST_USER || "liukehong@gmail.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "psammead";

describe("Test Permission Control: ", () => {
  beforeEach(async () => {});

  afterEach(async () => {});

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
    res = await SDK.post("/tnt/my/org");
    if (res.orgmode === false) {
      console.log("Please set testu001's tenant orgmode to true manually");
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
  it("check admin's perm", async () => {
    res = await SDK.myPerm("template", "create");
    expect(res).to.be.true();
    res = await SDK.myPerm("template", "read");
    expect(res).to.be.true();
    res = await SDK.myPerm("template", "update");
    expect(res).to.be.true();
    res = await SDK.myPerm("template", "delete");
    expect(res).to.be.true();

    res = await SDK.myPerm("workflow", "create");
    expect(res).to.be.true();
    res = await SDK.myPerm("workflow", "read");
    expect(res).to.be.true();
    res = await SDK.myPerm("workflow", "update");
    expect(res).to.be.true();
    res = await SDK.myPerm("workflow", "delete");
    expect(res).to.be.true();

    res = await SDK.myPerm("work", "create");
    expect(res).to.be.true();
    res = await SDK.myPerm("work", "read");
    expect(res).to.be.true();
    res = await SDK.myPerm("work", "update");
    expect(res).to.be.true();
    res = await SDK.myPerm("work", "delete");
    expect(res).to.be.true();

    res = await SDK.myPerm("team", "create");
    expect(res).to.be.true();
    res = await SDK.myPerm("team", "read");
    expect(res).to.be.true();
    res = await SDK.myPerm("team", "update");
    expect(res).to.be.true();
    res = await SDK.myPerm("team", "delete");
    expect(res).to.be.true();
  });

  it("check DOER's perm", async () => {
    res = await SDK.memberPerm("testu002@abcd.com", "template", "create");
    expect(res).to.be.true();
    res = await SDK.memberPerm("testu002@abcd.com", "template", "read");
    expect(res).to.be.true();
    res = await SDK.memberPerm("testu002@abcd.com", "template", "update");
    expect(res).to.be.false();
    res = await SDK.memberPerm("testu002@abcd.com", "template", "delete");
    expect(res).to.be.false();

    res = await SDK.memberPerm("testu002@abcd.com", "workflow", "create");
    expect(res).to.be.true();
    res = await SDK.memberPerm("testu002@abcd.com", "workflow", "read");
    expect(res).to.be.true();
    res = await SDK.memberPerm("testu002@abcd.com", "workflow", "update");
    expect(res).to.be.false();
    res = await SDK.memberPerm("testu002@abcd.com", "workflow", "delete");
    expect(res).to.be.false();

    res = await SDK.memberPerm("testu002@abcd.com", "work", "create");
    expect(res).to.be.true();
    res = await SDK.memberPerm("testu002@abcd.com", "work", "read");
    expect(res).to.be.true();
    res = await SDK.memberPerm("testu002@abcd.com", "work", "update");
    expect(res).to.be.false();
    res = await SDK.memberPerm("testu002@abcd.com", "work", "delete");
    expect(res).to.be.false();

    res = await SDK.memberPerm("testu002@abcd.com", "team", "create");
    expect(res).to.be.true();
    res = await SDK.memberPerm("testu002@abcd.com", "team", "read");
    expect(res).to.be.true();
    res = await SDK.memberPerm("testu002@abcd.com", "team", "update");
    expect(res).to.be.false();
    res = await SDK.memberPerm("testu002@abcd.com", "team", "delete");
    expect(res).to.be.false();
    res = await SDK.memberPerm("testu001@abcd.com", "*", "admin");
    expect(res).to.be.true();
    res = await SDK.memberPerm("testu002@abcd.com", "*", "admin");
    expect(res).to.be.false();
  });
});
