"use strict";

const Lab = require("@hapi/lab");
const { expect } = require("@hapi/code");
const { afterEach, beforeEach, describe, it } = (exports.lab = Lab.script());
const SDK = require("metaflow");

const TEST_USER = process.env.TEST_USER || "liukehong@gmail.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "psammead";

describe("Test: ", () => {
  beforeEach(async () => {});

  afterEach(async () => {});

  SDK.setServer("http://localhost:5008");

  it("Login", async () => {
    const ret = await SDK.login(TEST_USER, TEST_PASSWORD);
    expect(ret.user.username).to.not.be.empty();
  });

  it("Create Template", async () => {
    const ret = await SDK.createTemplate("Hello HyperFlow");
    expect(ret.tplid).to.equal("Hello HyperFlow");
  });

  it("Delete Template", async () => {
    const ret = await SDK.deleteTemplateByName("Hello HyperFlow");
    expect(ret.deletedCount).to.equal(1);
  });
});
