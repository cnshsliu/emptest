const Lab = require("@hapi/lab");
const Code = require("@hapi/code");
const { expect } = Code;
const { afterEach, beforeEach, describe, it } = (exports.lab = Lab.script());

const suuid = require("short-uuid");
const SDK = require("metaflow");

const TEST_USER = process.env.TEST_USER || "liukehong@gmail.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "psammead";

describe(`Register: ${TEST_USER}`, () => {
  beforeEach(async () => {});

  afterEach(async () => {});

  let username = "Lucas";
  let password = TEST_PASSWORD;
  let email = "liukehong@gmail.com";
  let verifyEmailToken = "";
  SDK.setServer("http://localhost:5008");
  it("Create site", async () => {});

  it("Register lucas", async () => {
    try {
      let res = await SDK.register("lucas", "password", "liukehong@gmail.com");
      expect(res.status).to.equal(200);
      verifyEmailToken = res.data.verifyToken;
    } catch (error) {
      expect(error).to.be.not.null();
    }
  });

  it("Verify Email", async () => {
    try {
      let res = await SDK.verify(verifyEmailToken);
    } catch (error) {}
  });

  it("Register 5825", async () => {
    try {
      await SDK.register("5825", "password", "582573936@qq.com");
    } catch (error) {}
  });
});
