const axios = require("axios").default;

const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const HyperAutomation = {
  sleep: async function (miliseconds) {
    await new Promise((resolve) => setTimeout(resolve, miliseconds));
  },
  randomString: (length) => {
    var result = "";
    for (var i = length; i > 0; --i)
      result += chars[Math.round(Math.random() * (chars.length - 1))];
    return result;
  },
  guid: () => {
    let s4 = () => {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    };
    //return id of format 'aaaaaaaa'-'aaaa'-'aaaa'-'aaaa'-'aaaaaaaaaaaa'
    return s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4();
  },
  hasValue: function (obj) {
    if (obj === undefined) return false;
    if (obj === null) return false;
    if (obj === "") return false;

    return true;
  },
  isEmpty: function (obj) {
    return !this.hasValue(obj);
  },
  debug: function (flag) {
    HyperAutomation.axiosOptions.debug = flag;
  },

  axiosOptions: {
    debug: false,
    baseURL: "http://localhost:5008",
    timeout: 3000, // 3 second, default: unlimited
    headers: {
      /* http headers */
    },
    responseType: "json",
    xsrfCookieName: "XSRF-TOKEN",
    xsrfHeaderName: "X-XSRF-TOKEN",
    onUploadProgress: function (progressEvent) {
      // Do whatever you want with the native progress event
    },
    onDownloadProgress: function (progressEvent) {
      // Do whatever you want with the native progress event
    },

    // `maxContentLength` defines the max size of the http response content in bytes allowed in node.js
    //maxContentLength: 20000,

    // `maxBodyLength` (Node only option) defines the max size of the http request content in bytes allowed
    maxBodyLength: 20000,
    maxRedirects: 3,
    /* httpAgent: new http.Agent({ keepAlive: true }),
     * httpsAgent: new https.Agent({ keepAlive: true }), */
  },

  setHeader: function (k, v) {
    HyperAutomation.axiosOptions.headers[k] = v;
  },

  setHttpTimeout: function (v) {
    HyperAutomation.axiosOptions.timeout = v;
  },

  post: async function (uri, payload) {
    payload = payload ?? {};
    if (HyperAutomation.axiosOptions.debug) console.log("post", uri, payload);
    let ret = await HyperAutomation._post(uri, payload);
    return ret?.data;
  },
  //return full response body.
  _post: async function (endpoint, payload) {
    try {
      let res = await axios.post(endpoint, payload, HyperAutomation.axiosOptions);
      return res;
    } catch (err) {
      if (err.response) return err.response;
      else return { data: { error: err.message } };
    }
  },
  _download: async function (uri, payload) {
    await axios.post(uri, payload, HyperAutomation.axiosOptions);
  },
  get: async function (uri) {
    let ret = await HyperAutomation._get(uri);
    if (ret && ret.data) return ret.data;
    else {
      console.log(uri);
      console.log(ret);
    }
  },

  _get: async function (uri) {
    try {
      let ret = await axios.get(uri, HyperAutomation.axiosOptions);
      return ret;
    } catch (error) {
      return error.response;
    }
  },
  setServer: function (url) {
    HyperAutomation.axiosOptions.baseURL = url;
  },

  /* filter = {tplid:string; wfid:string; nodeid: string; todoid:string;status: string; wfstatus: string} */
  getWorklist: async function (doer, arg1, arg2) {
    let filter = {};
    let repeatTimesUntilGotOne = 1;
    if (arg1 && !arg2) {
      if (typeof arg1 === "number") {
        repeatTimesUntilGotOne = arg1;
      } else {
        filter = arg1;
      }
    } else if (arg1 && arg2) {
      if (typeof arg1 === "number") {
        repeatTimesUntilGotOne = arg1;
        filter = arg2;
      } else {
        repeatTimesUntilGotOne = arg2;
        filter = arg1;
      }
    }

    let res;
    filter = filter ? filter : {};
    for (let i = 0; i < repeatTimesUntilGotOne; i++) {
      res = await HyperAutomation.post("/work/search", {
        doer: doer,
        ...filter,
      });
      if (!res) {
        throw new Error("EMP server response is nullish");
      }
      if (res.total > 0) break;
      else if (repeatTimesUntilGotOne > 1) {
        await HyperAutomation.sleep(1000);
      }
    }
    return res;
  },

  createTemplate: async function (tplid, desc = "") {
    let ret = await HyperAutomation.post("/template/create", { tplid: tplid, desc });
    return ret;
  },

  putTemplate: async function (tpl_data, tplid, desc = "") {
    if (!tplid) throw new Error("Tplid must be provided");
    let ret = await HyperAutomation.post("/template/put", {
      doc: tpl_data,
      tplid,
      forceupdate: true,
      desc,
    });
    return ret;
  },

  importTemplateXML: async function (tplid, fileObj) {
    var formData = new FormData();
    formData.append("tplid", tplid);
    formData.append("file", fileObj, fileObj.name);
    let option = HyperAutomation.axiosOptions;
    let token = this.getSessionToken();
    if (token === null) {
      console.error("No session token in localStorage");
      return;
    }
    option.headers = {
      "Content-Type": "multipart/form-data",
      authorization: token,
    };
    let res = await axios.post("/template/import", formData, option);
    return res;
  },

  readTemplate: async function (tpl_id) {
    let ret = await HyperAutomation.post("/template/read", {
      tplid: tpl_id,
    });
    return ret;
  },
  readWorkflow: async function (wfid) {
    let ret = await HyperAutomation.post("/workflow/read", {
      wfid: wfid,
    });
    return ret;
  },
  exportTemplate: async function (tpl_id) {
    //拷贝一份option，不影响原option
    let tmpOption = HyperAutomation.axiosOptions;
    //需要设置responseType为blob
    //原axiosOptions中的responseType为json, 服务端返回的数据如果不是json格式, 数据会变为null
    tmpOption.responseType = "blob";
    axios
      .post(
        "/template/download",
        {
          tplid: tpl_id,
        },
        tmpOption
      )
      .then((response) => {
        //构建这个内部数据的访问url
        const url = window.URL.createObjectURL(new Blob([response.data]));
        //删除之前添加的临时连接
        $(".tempLink").remove();
        //创建一个新的临时连接
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `${tpl_id}.xml`); //or any other extension
        link.setAttribute("class", "tempLink");
        document.body.appendChild(link);
        //点击这个临时连接实现内容下载
        link.click();
      });
  },

  listTemplate: async function () {
    let ret = await HyperAutomation.get("/template/list");
    return ret;
  },

  //Rename with internal _id
  renameTemplateWithIid: async function (_id, tplid) {
    let ret = await HyperAutomation.post("/template/renamewithiid", {
      _id: _id,
      tplid: tplid,
    });
    return ret;
  },

  renameTemplate: async function (fromid, tplid) {
    let ret = await HyperAutomation.post("/template/rename", {
      fromid: fromid,
      tplid: tplid,
    });
    return ret;
  },

  /**
   * return object {n: 1, deletedCount:1, ok:1}
   */
  deleteTemplate: async function (_id) {
    let ret = await HyperAutomation.post("/template/delete", {
      _id: _id,
    });
    return ret;
  },

  /**
   * return object {n: 1, deletedCount:1, ok:1}
   */
  deleteTemplateByTplid: async function (tplid) {
    let ret = await HyperAutomation.post("/template/delete/by/tplid", {
      tplid: tplid,
    });
    return ret;
  },
  makeCopyOfTemplate: async function (_id) {
    let ret = await HyperAutomation.post("/template/makecopy", {
      _id: _id,
    });
    return ret;
  },

  copyTemplateTo: async function (fromid, tplid) {
    let ret = await HyperAutomation.post("/template/copyto", {
      fromid: fromid,
      tplid: tplid,
    });
    return ret;
  },
  getPbo: async function (wfid, pbotype = "text") {
    let ret = await HyperAutomation.post("/workflow/get/pbo", {
      wfid: wfid,
      pbotype: pbotype,
    });
    return ret;
  },
  setPbo: async function (wfid, pbo, pbotype = "text") {
    let ret = await HyperAutomation.post("/workflow/set/pbo", {
      wfid: wfid,
      pbo: pbo,
      pbotype: pbotype,
    });
    return ret;
  },

  startWorkflow: async function (tplid, wfid, teamid = "", pbo = "", kvars = {}) {
    let ret = await HyperAutomation.post("/workflow/start", {
      tplid: tplid,
      wfid: wfid,
      teamid: teamid,
      textPbo: pbo,
      kvars: kvars,
    });
    return ret;
  },

  opWorkflow: async function (wfid, op) {
    return await HyperAutomation.post("/workflow/op", { wfid, op });
  },

  pauseWorkflow: async function (wfid) {
    let ret = await HyperAutomation.post("/workflow/pause", {
      wfid: wfid,
    });
    return ret;
  },

  resumeWorkflow: async function (wfid) {
    let ret = await HyperAutomation.post("/workflow/resume", {
      wfid: wfid,
    });
    return ret;
  },
  stopWorkflow: async function (wfid) {
    let ret = await HyperAutomation.post("/workflow/stop", {
      wfid: wfid,
    });
    return ret;
  },

  workflowSearch: async function (filter) {
    let ret = await HyperAutomation.post("/workflow/search", filter);
    return ret;
  },

  workflowGetLatest: async function (filter) {
    let ret = await HyperAutomation.post("/workflow/latest", {
      filter: filter,
    });
    return ret;
  },

  destroyWorkflow: async function (wfid) {
    let ret = await HyperAutomation.post("/workflow/destroy", { wfid: wfid });
    return ret;
  },
  destroyMultiWorkflows: async function (wfids) {
    let ret = await HyperAutomation.post("/workflow/destroy/multi", { wfids });
    return ret;
  },
  destroyWorkflowByWfTitle: async function (wftitle) {
    let ret = await HyperAutomation.post("/workflow/destroy/by/title", { wftitle });
    return ret;
  },
  destroyWorkflowByTplid: async function (tplid) {
    let ret = await HyperAutomation.post("/workflow/destroy/by/tplid", { tplid });
    return ret;
  },

  doWork: async function (doer, todoid, kvars = {}, route = "DEFAULT") {
    let ret = await HyperAutomation.post("/work/do", {
      doer: doer,
      todoid: todoid,
      route: route,
      kvars: kvars,
    });
    return ret;
  },
  //根据wfid， 和nodeid，执行wfid里的一个nodeid的todo
  doWorkByNode: async function (doer, wfid, nodeid, kvars = {}, route = "DEFAULT") {
    let ret = await HyperAutomation.post("/work/do/bynode", {
      doer: doer,
      wfid: wfid,
      nodeid: nodeid,
      route: route,
      kvars: kvars,
    });
    return ret;
  },

  getKVars: async function (wfid, workid) {
    let ret = await HyperAutomation.post(
      "/workflow/kvars",
      workid
        ? {
            wfid: wfid,
            workid: workid,
          }
        : {
            wfid: wfid,
          }
    );
    return ret;
  },

  getStatus: async function (wfid, todoid) {
    let ret = "ST_UNKNOWN";
    if (todoid)
      ret = await HyperAutomation.post("/work/status", {
        wfid: wfid,
        todoid: todoid,
      });
    else
      ret = await HyperAutomation.post("/workflow/status", {
        wfid: wfid,
      });

    return ret;
  },

  revoke: async function (wfid, todoid) {
    let ret = await HyperAutomation.post("/work/revoke", {
      tenant: HyperAutomation.tenant,
      wfid: wfid,
      todoid: todoid,
    });
    return ret;
  },

  sendback: async function (doer, wfid, todoid, kvars = {}) {
    let ret = await HyperAutomation.post("/work/sendback", {
      doer: doer,
      wfid: wfid,
      todoid: todoid,
      kvars,
    });
    return ret;
  },

  getWorkInfo: async function (wfid, todoid) {
    let ret = await HyperAutomation.post("/work/info", {
      todoid: todoid,
    });

    return ret;
  },

  uploadTeam: async function (name, tmap) {
    let payload = { teamid: name, tmap: tmap };
    let ret = await HyperAutomation.post("/team/upload", payload);
    return ret;
  },
  setRole: async function (teamid, role, members) {
    let payload = { teamid: teamid, role: role, members: members };
    let ret = await HyperAutomation.post("/team/role/set", payload);
    return ret;
  },
  addRoleMembers: async function (teamid, role, members) {
    let payload = { teamid: teamid, role: role, members: members };
    let ret = await HyperAutomation.post("/team/role/member/add", payload);
    return ret;
  },
  deleteRoleMembers: async function (teamid, role, members) {
    let payload = { teamid: teamid, role: role, eids: members };
    let ret = await HyperAutomation.post("/team/role/member/delete", payload);
    return ret;
  },
  copyRole: async function (teamid, role, newrole) {
    let payload = { teamid: teamid, role: role, newrole: newrole };
    let ret = await HyperAutomation.post("/team/role/copy", payload);
    return ret;
  },
  importTeamCSV: async function (teamid, fileObj) {
    if (this.isEmpty(teamid)) return;
    var formData = new FormData();
    formData.append("teamid", teamid);
    formData.append("file", fileObj, fileObj.name);
    let option = HyperAutomation.axiosOptions;
    let token = this.getSessionToken();
    if (token === null) {
      console.error("No session token in localStorage");
      return;
    }
    option.headers = {
      "Content-Type": "multipart/form-data",
      authorization: token,
    };
    let res = await axios.post("/team/import", formData, option);
    return res;
  },

  getTeamFullInfo: async function (teamid) {
    let ret = await HyperAutomation.get(`/team/fullinfo/${teamid}`);
    return ret;
  },

  getTeamList: async function (payload) {
    payload = payload ? payload : { limit: 1000 };
    ret = await HyperAutomation.post("/team/search", payload);
    return ret;
  },

  getCallbackPoints: async function (cbpFilter) {
    let ret = await HyperAutomation.post("/workflow/cbps", cbpFilter);
    return ret;
  },

  getLatestCallbackPoint: async function (cbpFilter) {
    let ret = await HyperAutomation.post("/workflow/cbps/latest", cbpFilter);
    return ret;
  },

  /**
   *     workflow/docallback: callback to workflow
   *
   * @param {...} cbp - Callback point
   * @param {...} kvars - kvars to inject
   * @param {...} atts - attachments to inject
   *
   * @return {...}
   */
  doCallback: async function (cbpid, decision, kvars, atts) {
    let payload = { cbpid, decision };
    if (kvars) {
      payload.kvars = kvars;
      if (atts) {
        payload.atts = atts;
      }
    }
    let ret = await HyperAutomation.post("/workflow/docallback", payload);
    return ret;
  },

  deleteTeam: async function (name) {
    let payload = { teamid: name };
    let ret = await HyperAutomation.post("/team/delete", payload);
    return ret;
  },

  __checkError: function (ret) {
    if (ret.errors) {
      throw new Error(ret.errors);
    }
  },

  register: async function (account, username, password) {
    HyperAutomation.setHeader("Content-type", "application/json");
    let endpoint = "/account/register";
    let payload = {
      account: account,
      username: username,
      password: password,
    };
    let response = await HyperAutomation.post(endpoint, payload);
    //console.error("=============== Regsiter Response =====");
    //console.error(response);
    //console.error("=============== Regsiter Response =====");
    if (response?.sessionToken) {
      HyperAutomation.setHeader("authorization", response.sessionToken);
    }
    return response;
  },
  verify: async function (token) {
    let response = await HyperAutomation.post("/account/verifyEmail", { token });
    return response;
  },
  removeUser: async function (account, site_passwd) {
    let ret = await HyperAutomation.post("/admin/remove/account", {
      account: account,
      password: site_passwd,
    });

    return ret;
  },

  login: async function (account, password) {
    HyperAutomation.setHeader("Content-type", "application/json");
    let response = await HyperAutomation.post("/account/login", {
      account: account,
      password: password,
    });
    if (response.sessionToken) {
      HyperAutomation.setHeader("authorization", response.sessionToken);
    }
    return response;
  },

  setUserName: async function (username) {
    HyperAutomation.setHeader("Content-type", "application/json");
    let response = await HyperAutomation.post("/account/set/username", {
      username,
    });
    return response;
  },

  setUserPassword: async function (oldpassword, password) {
    HyperAutomation.setHeader("Content-type", "application/json");
    let response = await HyperAutomation.post("/account/set/password", {
      oldpassword,
      password,
    });
    return response;
  },

  getSessionToken: function () {
    if (localStorage) {
      let token = localStorage.getItem("sessionToken");
      if (token) {
        return `Bearer ${token}`;
      } else {
        return null;
      }
    } else {
      return null;
    }
  },
  setSessionToken: function (token) {
    if (token) {
      //console.log("HyperAutomation authorization token", token);
      HyperAutomation.setHeader("authorization", `Bearer ${token}`);
    } else {
      if (localStorage) {
        let token = localStorage.getItem("sessionToken");
        if (token) {
          HyperAutomation.setHeader("authorization", `Bearer ${token}`);
          //console.log("HyperAutomation authorization token", token);
        }
      }
    }
  },

  profile: async function () {
    let response = await HyperAutomation.get("/account/profile/me");
    return response;
  },

  logout: async function (token) {
    if (token) {
      HyperAutomation.setHeader("authorization", token);
    }
    let response = await HyperAutomation.post("/account/logout", {});
    return response;
  },

  //管理员设置同邮箱后缀用户的 emailVerified 的值
  adminSetVerified: async function (userids) {
    let ret = await HyperAutomation.post("/admin/set/emailVerified", { userids });
    return ret;
  },
  //用户登录后设置 emailVerified 的值
  mySetVerified: async function () {
    let ret = await HyperAutomation.post("/my/set/emailVerified");
    return ret;
  },

  orgJoinCodeNew: async function () {
    let ret = await HyperAutomation.post("/tnt/joincode/new");
    return ret;
  },
  orgJoin: async function (joincode) {
    let ret = await HyperAutomation.post("/tnt/join", {
      joincode: joincode,
    });
    return ret;
  },
  orgClearJoinApplications: async function (joincode) {
    let ret = await HyperAutomation.post("/tnt/join/clear", {});
    return ret;
  },
  orgSetRegfree: async function (regfree) {
    let ret = await HyperAutomation.post("/tnt/set/regfree", { regfree: regfree });
    return ret;
  },
  orgMyOrg: async function () {
    let ret = await HyperAutomation.post("/tnt/my/org");
    return ret;
  },
  orgMyOrgSetOrgmode: async function (orgmode, password) {
    let ret = await HyperAutomation.post("/tnt/my/org/set/orgmode", {
      password: password,
      orgmode: orgmode,
    });
    return ret;
  },
  orgApprove: async function (account_eids) {
    let ret = await HyperAutomation.post("/tnt/approve", { account_eids: account_eids });
    return ret;
  },
  orgSetEmployeeGroup: async function (eids, group) {
    let ret = await HyperAutomation.post("/tnt/employee/setgroup", { eids, group });
    return ret;
  },
  orgGetEmployees: async function (payload) {
    let ret = await HyperAutomation.post("/tnt/employees", payload);
    return ret;
  },
  myPerm: async function (what, op, instance_id = undefined) {
    let ret = await HyperAutomation.post("/my/sysperm", { what, instance_id, op });
    return ret;
  },
  employeePerm: async function (eid, what, op, instance_id = undefined) {
    let ret = await HyperAutomation.post("/employee/sysperm", {
      eid,
      what,
      instance_id,
      op,
    });
    return ret;
  },
  // 组织
  getLeaderWithinOrgchart: async function (param) {
    let ret = await HyperAutomation.post("orgchart/getleader", param);
    return ret;
  },
  getStaffWithinOrgchart: async function (param) {
    let ret = await HyperAutomation.post("orgchart/getstaff", param);
    return ret;
  },
  importFromExcel: async function (param) {
    const headers = {
      authorization: HyperAutomation.axiosOptions.headers.authorization,
      ...param.getHeaders()
    };
    HyperAutomation.axiosOptions.headers = headers
    let ret = await HyperAutomation.post("orgchart/import/excel", param);
    return ret;
  },
  listOrgchart: async function (param) {
    let ret = await HyperAutomation.post("orgchart/list", param);
    return ret;
  },
  listOrgchartOU: async function (param) {
    let ret = await HyperAutomation.post("orgchart/listou", param);
    return ret;
  },
};

module.exports = HyperAutomation;
