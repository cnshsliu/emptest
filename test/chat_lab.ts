"use strict";
import * as Lab from "@hapi/lab";
import { expect } from "@hapi/code";
const lab = Lab.script();
const { describe, it, before } = lab;

export { lab };
import SDK from "../app.js";
import fs from "fs";

describe("Test chat ", { timeout: 5000 }, () => {
  SDK.setServer("https://emp.localhost");
  SDK.debug(true);

  it("Step 1: login", async () => {
    await SDK.login("test001", "Jerome@99");
  });
  it("Get Context", async () => {
    const context = await SDK.get("caishen/getContext");
    expect(context.scenarioList[0].id).to.equals("G-general");
  });
  it("Post getBizSession", async () => {
    const ret = await SDK.post("caishen/getGptLog");
    expect(
      ret.length === 0 || (ret.length > 0 && ret[0]["scenarioId"] !== ""),
    ).to.be.true();
  });
});
