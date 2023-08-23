'use strict';
import * as Lab from '@hapi/lab';
import { expect } from '@hapi/code';
const lab = Lab.script();
const { describe, it, before } = lab;

export { lab };
import SDK from '../app.js';
import fs from 'fs';
const SITE_PWD = 'site_password_999';
const SITE_ADMIN = { account: 'lucas2', name: 'Lucas2', password: 'Pwd@123' };

const testUsers = [
	{
		account: 'comment_test_user_lkh',
		passwd: 'Password@123',
		name: 'UserLKH_' + SDK.randomString(7),
	},
	{
		account: 'comment_test_user_001',
		passwd: 'Password@123',
		name: 'User001_' + SDK.randomString(7),
	},
	{
		account: 'comment_test_user_002',
		passwd: 'Password@123',
		name: 'User002_' + SDK.randomString(7),
	},
	{
		account: 'comment_test_user_003',
		passwd: 'Password@123',
		name: 'User003_' + SDK.randomString(7),
	},
	{
		account: 'comment_test_user_004',
		passwd: 'Password@123',
		name: 'User004_' + SDK.randomString(7),
	},
	{
		account: 'comment_test_user_005',
		passwd: 'Password@123',
		name: 'User005_' + SDK.randomString(7),
	},
	{
		account: 'comment_test_user_006',
		passwd: 'Password@123',
		name: 'User006_' + SDK.randomString(7),
	},
];
const TEST_TEMPLATE_DIR = process.env.TEST_TEMPLATE_DIR || './templates';

const getAccount = (idx: number) => {
	return testUsers[idx].account;
};
const getEid = (idx: number) => {
	return getAccount(idx) + '_eid';
};
describe('Test and_or logic', { timeout: 5000 }, () => {
	SDK.setServer('https://emp.localhost');
	let wfid = 'lkh_' + SDK.guid();
	let tmptodoid = '';
	// SDK.setServer("http://emp.localhost:5008");
	SDK.debug(false);

	it('prepare admin account ', async () => {
		try {
			await SDK.register(SITE_ADMIN.account, SITE_ADMIN.name, SITE_ADMIN.password);
		} catch (e) {}
	});

	it('Step 1: Prepare test account', async () => {
		//清理掉遗留的测试用户
		try {
			await SDK.login(SITE_ADMIN.account, SITE_ADMIN.password);
			for (let i = 0; i < testUsers.length; i++) {
				await SDK.removeUser(testUsers[i].account, SITE_PWD);
			}
		} finally {
		}
		//重新注册所有测试用户
		for (let i = 0; i < testUsers.length; i++) {
			await SDK.register(testUsers[i].account, testUsers[i].name, testUsers[i].passwd);
		}
		let ret = await SDK.login(testUsers[0].account, testUsers[0].passwd);
		let tenant_id = ret.user.tenant._id.toString();
		expect(ret.user.username).to.not.be.empty();
		//清理遗留的申请信息
		await SDK.orgClearJoinApplications();
		//将当前用户的tenant设为组织

		//将当前用户的tenant设为组织
		await SDK.login(SITE_ADMIN.account, SITE_ADMIN.password);
		ret = await SDK.post('/tnt/set/orgmode', { password: SITE_PWD, tenant_id: tenant_id });
		expect(ret).to.equal(true);
		await SDK.login(testUsers[0].account, testUsers[0].passwd);

		let joincodeRet = await SDK.orgJoinCodeNew();
		//申请加入组织
		for (let i = 0; i < testUsers.length; i++) {
			await SDK.login(testUsers[i].account, testUsers[i].passwd);
			let ret = await SDK.orgJoin(joincodeRet.joincode);
			expect(ret.code).to.equal('ok');
		}

		await SDK.login(testUsers[0].account, testUsers[0].passwd);
		//获得组织全部信息
		let employees = await SDK.orgGetEmployees({ eids: [], active: 1 });
		expect(employees.length).to.equal(1);

		//审批测试用户加入申请
		let myorg = await SDK.orgMyOrg();
		let accountsToApprove = myorg.joinapps.map((x) => x.account);
		let account_eids = accountsToApprove.map((x) => {
			return {
				account: x,
				eid: x + '_eid',
			};
		});
		let leftApps = await SDK.orgApprove(account_eids);
		//审批后，返回的joinapps应该是空数组
		expect(leftApps.ret).to.equal('array');
		expect(leftApps.joinapps).to.be.an.array();
		expect(leftApps.joinapps).to.be.empty();
		employees = await SDK.orgGetEmployees({ eids: [], active: 1 });
		expect(employees.length).to.equal(testUsers.length);
		//取myorg，同样返回的joinapps应该是空数组
		myorg = await SDK.orgMyOrg();
		expect(myorg.joinapps).to.be.an.array();
		expect(myorg.joinapps).to.be.empty();
	});
	it('Step 2: Upload template', async () => {
		const ret = await SDK.putTemplate(
			fs.readFileSync(TEST_TEMPLATE_DIR + '/test_and_or.xml', 'utf8'),
			'test_comment',
			'Desc: Test And Or Logic',
		);
		expect(ret.tplid).to.equal('test_comment');
		expect(ret.desc).to.equal('Desc: Test And Or Logic');
	});

	it('Step 3: Start Workflow', async () => {
		await SDK.login(testUsers[0].account, testUsers[0].passwd);
		const pbo = 'http://www.google.com';
		const ret = await SDK.startWorkflow('test_comment', wfid, '', pbo);
		expect(ret.wfid).to.equal(wfid);
	});

	it('Step 4: Check PBO', async () => {
		await SDK.sleep(500);
		let pbo = await SDK.getPbo(wfid, 'text');
		expect(pbo[0].text).to.equal('http://www.google.com');
		pbo = await SDK.setPbo(wfid, 'abcd', 'text', 'step1');
		await SDK.sleep(3000);
		pbo = await SDK.getPbo(wfid, 'text');
		expect(pbo[1].text).to.equal('abcd');

		await SDK.setPbo(wfid, ['abcd', 'hahaha'], 'text', 'step1');
		pbo = await SDK.getPbo(wfid, 'text');
		expect(Array.isArray(pbo)).to.equal(true);
		expect(pbo.length).to.equal(4);
		expect(pbo[3].text).to.equal('hahaha');
	});

	let action1_todoid = '';
	it('Step 5: Do action1', { timeout: 5000 }, async () => {
		//get worklist
		await SDK.sleep(1000);
		let wlist = await SDK.getWorklist(getEid(0), {
			wfid: wfid,
			nodeid: 'action1',
			status: 'ST_RUN',
		});
		expect(wlist.total).to.equal(1);

		// let fullInfo = await SDK.getWorkInfo(wfid, wlist.objs[0].todoid);
		// expect(fullInfo.from_action_todoid).to.be.undefined();

		let action1_todoid = wlist.objs[0].todoid;
		let ret = await SDK.post('/comment/addforbiz', {
			objtype: 'TODO',
			objid: action1_todoid,
			content: 'test comment 1',
		});
		expect(ret.comments.length).to.equal(1);
		expect(ret.thisComment.content).to.equal(ret.comments[0].content);
		ret = await SDK.post('/comment/addforbiz', {
			objtype: 'TODO',
			objid: action1_todoid,
			content: 'test comment 2',
		});
		expect(ret.comments.length).to.equal(2);
		expect(ret.thisComment.content).to.equal(ret.comments[0].content);
		expect(ret.comments[0].content).to.equal('test comment 2');
		expect(ret.comments[1].content).to.equal('test comment 1');

		ret = await SDK.post('/comment/workflow/load', {
			wfid: wlist.objs[0].wfid,
		});
		expect(ret[0].content).to.equal('test comment 2');
		expect(ret[1].content).to.equal('test comment 1');
	});

	it('cleaning up', async () => {
		await SDK.sleep(3000);
		await SDK.destroyWorkflowByTplid('test_comment');
		await SDK.deleteTemplateByTplid('test_comment');
		await SDK.login(SITE_ADMIN.account, SITE_ADMIN.password);
		for (let i = 0; i < testUsers.length; i++) {
			await SDK.removeUser(testUsers[i].account, SITE_PWD);
		}
		await SDK.removeUser(SITE_ADMIN.account, SITE_PWD);
	});
});
