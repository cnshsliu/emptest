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

  let teamid = "team_test1";
  let team_iid = "";
  let the_map = {};
  SDK.setServer("http://localhost:5008");
  it("Login", async () => {
    const ret = await SDK.login(TEST_USER, TEST_PASSWORD);
    expect(ret.user.username).to.not.be.empty();
  });

  it("Upload a team", async () => {
    let teamMap = {
      TEAM_LEADER: [{ uid: "582573936@qq.com", dname: "58725" }],
      MANAGER: [
        { uid: "chillaxall@qq.com", dname: "chillax" },
        { uid: "3506345550@qq.com", dname: "350634" },
      ],
      DIRECTOR: [{ uid: "liukehong@gmail.com", dname: "liukehong" }],
    };
    let ret = await SDK.uploadTeam(teamid, teamMap);
    expect(ret.teamid).to.equal(teamid);
    team_iid = ret._id;
  });

  it("Test check tmap", async () => {
    let ret = await SDK.getTeamFullInfo(teamid);
    expect(ret.tmap.MANAGER[1].dname).to.equal("350634");
    expect(ret.tmap.MANAGER[0].dname).to.equal("chillax");
    expect(ret.tmap.DIRECTOR[0].uid).to.equal("liukehong@gmail.com");
    the_map = ret.tmap;
  });

  it("Upload a team again to overwrite tmap", async () => {
    let teamMap = {
      TEAM_LEADER: [{ uid: "582573936@qq.com", dname: "58725" }],
      DIRECTOR: [{ uid: "liukehong@gmail.com", dname: "liukehong" }],
    };
    let ret = await SDK.uploadTeam(teamid, teamMap);
    expect(ret.teamid).to.equal(teamid);
    team_iid = ret._id;
    ret = await SDK.getTeamFullInfo(teamid);
    expect(ret.tmap.TEAM_LEADER[0].dname).to.equal("58725");
    expect(ret.tmap.MANAGER).to.equal(undefined);
    expect(ret.tmap.DIRECTOR[0].uid).to.equal("liukehong@gmail.com");
    the_map = ret.tmap;
  });
  it("Step4", async () => {
    let ret = await SDK.addRoleMembers(teamid, "TEAM_LEADER", [
      { uid: "582573936@qq.com", dname: "58725" },
      { uid: "chillaxall@qq.com", dname: "chillax" },
      { uid: "3506345550@qq.com", dname: "350634" },
    ]);
    expect(ret.tmap.TEAM_LEADER.length).to.equal(3);
    expect(ret.tmap.TEAM_LEADER[0].dname).to.equal("58725");
    ret = await SDK.getTeamFullInfo(teamid);
    expect(ret.tmap.TEAM_LEADER.length).to.equal(3);
    expect(ret.tmap.TEAM_LEADER[0].dname).to.equal("58725");
  });
  it("Step5", async () => {
    await SDK.addRoleMembers(teamid, "TEAM_LEADER", [
      { uid: "582573936@qq.com", dname: "99999" },
      { uid: "chillaxall@qq.com", dname: "chillax" },
      { uid: "3506345550@qq.com", dname: "350634" },
    ]);
    let ret = await SDK.getTeamFullInfo(teamid);
    expect(ret.tmap.TEAM_LEADER.length).to.equal(3);
    expect(ret.tmap.TEAM_LEADER[0].dname).to.equal("99999");
  });

  it("Step6", async () => {
    await SDK.addRoleMembers(teamid, "MANAGER", [
      { uid: "chillaxall@qq.com", dname: "chillax" },
      { uid: "3506345550@qq.com", dname: "350634" },
    ]);
    let ret = await SDK.getTeamFullInfo(teamid);
    expect(ret.tmap.MANAGER[1].dname).to.equal("350634");
    expect(ret.tmap.MANAGER[0].dname).to.equal("chillax");
    expect(ret.tmap.DIRECTOR[0].uid).to.equal("liukehong@gmail.com");
  });

  it("Step7", async () => {
    await SDK.deleteRoleMembers(teamid, "TEAM_LEADER", [
      { uid: "582573936@qq.com", dname: "99999" },
    ]);
    let ret = await SDK.getTeamFullInfo(teamid);
    expect(ret.tmap.TEAM_LEADER.length).to.equal(2);
    expect(ret.tmap.TEAM_LEADER[1].dname).to.equal("350634");
    await SDK.deleteRoleMembers(teamid, "TEAM_LEADER", [
      { uid: "chillaxall@qq.com", dname: "99999" },
      { uid: "3506345550@qq.com", dname: "350634" },
    ]);
    ret = await SDK.getTeamFullInfo(teamid);
    expect(ret.tmap.TEAM_LEADER.length).to.equal(0);
  });

  it("Set roles", async () => {
    await SDK.setRole(teamid, "APPROVER", [
      { uid: "chillaxall@qq.com", dname: "chillax" },
      { uid: "3506345550@qq.com", dname: "350634" },
      { uid: "liukehong@gmail.com", dname: "liukehong" },
    ]);
    await SDK.setRole(teamid, "MANAGER", [
      { uid: "chillaxall@qq.com", dname: "chillax0" },
      { uid: "liukehong@gmail.com", dname: "liukehongATgmail" },
    ]);
    let ret = await SDK.getTeamFullInfo(teamid);
    expect(ret.tmap.MANAGER[1].dname).to.equal("liukehongATgmail");
    expect(ret.tmap.MANAGER[0].dname).to.equal("chillax0");
    expect(ret.tmap.DIRECTOR[0].uid).to.equal("liukehong@gmail.com");
    expect(ret.tmap.APPROVER[0].uid).to.equal("chillaxall@qq.com");
    expect(ret.tmap.APPROVER[2].uid).to.equal("liukehong@gmail.com");
    the_map = ret.tmap;
  });

  it("Test team list not empty", async () => {
    let ret = await SDK.getTeamList();
    expect(ret.objs.length > 0).to.be.true();
  });

  it("Test add person to team", async () => {
    the_map["DIRECTOR"].push({ uid: "liuzijin@gmail.com", dname: "liuzijin" });
    let ret = await SDK.uploadTeam(teamid, the_map);
    ret = await SDK.getTeamFullInfo(teamid);
    expect(ret.tmap["DIRECTOR"].length).to.equal(2);
    expect(ret.tmap["DIRECTOR"][1].dname).to.equal("liuzijin");
  });
  it("Test copy role", async () => {
    await SDK.copyRole(teamid, "DIRECTOR", "DIRECTOR_COPY");
    ret = await SDK.getTeamFullInfo(teamid);
    expect(ret.tmap["DIRECTOR_COPY"].length).to.equal(2);
    expect(ret.tmap["DIRECTOR_COPY"][1].dname).to.equal("liuzijin");
  });

  it("Delete temp team", async () => {
    let ret = await SDK.deleteTeam(teamid);
    expect(ret.deletedCount).to.equal(1);
    ret = await SDK.getTeamFullInfo(teamid);
    expect(ret.teamid).to.be.undefined();
  });
});
