const Lab = require("@hapi/lab");
const Code = require("@hapi/code");
const { expect } = Code;
const { afterEach, beforeEach, describe, it } = (exports.lab = Lab.script());

const suuid = require("short-uuid");
const SDK = require("metaflow");

const TEST_USER = process.env.TEST_USER || "liukehong@gmail.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "psammead";

describe("Test: ", () => {
  beforeEach(async () => {});

  afterEach(async () => {});

  let username = "";
  let password = "";
  let email = "";
  let verifyEmailToken = "";
  SDK.setServer("http://localhost:5008");

  it("Register", async () => {
    let srand = "test" + suuid.generate();
    email = srand;
    email = email + "@abcd.com";
    username = srand;
    password = "Ab@abcd123";
    let res = await SDK.register(username, password, email);
    expect(res.validation.keys).to.include("username");

    username = "testUser123";
    email = username + "@abcd.com";
    password = "Ab@abcd123";
    res = await SDK.register(username, password, email);
    expect(res.verifyToken).to.exist();
    verifyEmailToken = res.verifyToken;
  });

  it("Verify", async () => {
    console.log("verifyEmailToken:>", verifyEmailToken);
    let res = await SDK.verify(verifyEmailToken);
    console.log(res);
    expect(res).to.include("emailVerified");
  });

  it("Get profile", async () => {
    try {
      let res = await SDK.profile();
      expect(res.username).to.equal(username);
    } catch (error) {}
  });

  it("Login", async () => {
    let ret = await SDK.login(email, password);
    expect(ret.user.username).to.equal(username);
  });

  it("Profile", async () => {
    let ret = await SDK.profile();
    expect(ret.username).to.equal(username);
    expect(ret.email).to.equal(email.toLowerCase());
  });
  it("RemoveUser", async () => {
    await SDK.sleep(1000);
    let ret = await SDK.removeUser(email.toLowerCase(), password);
    expect(ret).to.include("successfully");
  });
});
