let Validators = artifacts.require("./validators.sol");

const testRpc = require('./helpers/testRpc');
const fetch = require('node-fetch');
const { execSync } = require('child_process');
const sleep = require('sleep-promise');

const decimals = 18;
const zeroes = Math.pow(10, decimals);
const zeroesBN = web3.utils.toBN(10).pow(web3.utils.toBN(decimals));

const PATH_TO_SCRIPTS = 'X:\\ews\\debug';

const VALS = [
	{ //0 - absent
	},
	{ //1
		vaddr: '0xFB49D1BBCE18084AF271526BE38E4729FBE1C95E',
		pkey: '0xac85685277fba446c42272538fa64f3b28bd42a5a8b6f2295b7f2a22ee10bf34',
		addr: '0xee24d0871f6855d4bee6cc46c231535dcba95e5d',
		api: 'http://localhost:16657/',
	},
	{ //2
		vaddr: '0x1AC05FA0DE24A0055151DEF404E8F59C65C728A8',
		pkey: '0xf1a77590cde98599f1da457df010865dcc07a46c4b26aaeca8668ff729f7a5f9',
		addr: '0x0000000000000000000000000000000000000000',
		api: 'http://localhost:26657/',
	},
	{ //3
		vaddr: '0x83BB92A73DFFED5E16FE0424B5147BDCA86B7BC2',
		pkey: '0xccbdebf7705f7a5deae2cd8685e551bb483fd8249160595ce14973d5634ec87a',
		addr: '1df35a8e39ccf39d0cdbfbd581b2866869bd9858',
		api: 'http://localhost:36657/',
	},
	{ //4
		vaddr: '0x4BF5D80FED66CE5BC574B53AB8792E20FD4F59AC',
		pkey: '0x6D84543BCF360E12DDDE803B583BDED80B6A1BD85FC35ADA29E427B86401962D',
		addr: '0xa87437d7eb5515eccbb6fb1ec923b458bc3e207e',
		api: 'http://localhost:46657/',
	},
	{ //5
		vaddr: '0xA2B2B320732C7A6B5C0147DA8EBE26C8C697C74D',
		pkey: '0x60ef344162ea5e8e47c6c7c0bcdf0fed0ca4b8d13dedb264b61e4b3053acf900',
		addr: '0xfa9ee6d368e154bd8be8be74ea6a89b6b628c7d1',
		api: 'http://localhost:56657/',
	},
];

async function checkValidatorSets(vals, num){
    async function getJsons(){
        let promises = [];
        for(let val of vals){
        	promises.push(await fetch(VALS[val].api + 'dump_consensus_state').then(
            	response => response.json()
        	));
        }
        
        let jsons = await Promise.all(promises);
        return jsons;
    }

    let jsons, i=0;
    do{
    	if(i>0)
    		await sleep(1000);
    	jsons = await getJsons();
    	//Until all the heights are the same
    }while(i++ < 3 && jsons.map(j => j.result.round_state.height).filter((value, index, self) => self.indexOf(value) === index).length > 1);

    assert.ok(i <= 3, "Validators return info for different heights!");

    const diff = require('deep-diff');
    for(let i=1; i<jsons.length; ++i){
    	let changes = diff(jsons[i-1].result.round_state.validators.validators, jsons[i].result.round_state.validators.validators);
    	assert.ok(!changes, "There should not be difference in validators (" + vals[i-1] + "<>" + vals[i] + ")");
    	assert.equal(jsons[i-1].result.round_state.validators.proposer.address, jsons[i].result.round_state.validators.proposer.address,
    		`Proposers for validators ${vals[i-1]} and ${vals[i]} should be the same`);
    }
    
    if(num)
    	assert.equal(jsons[0].result.round_state.validators.validators.length, num, "There should be " + num + " validators");
}

contract('Validators', async function (accounts) {
    let validators;

    debugger;

    before(async function(){
        validators = await Validators.at('0x0000000000000000000000000000000000000fff');
    });
/*
    it("should validators set of 2 and 3 be the same", async function () {
        await checkValidatorSets([2, 3], 2);
    }); */
    
    it("should users add deposits", async function () {
		await validators.addInitialDeposit(VALS[3].pkey, VALS[3].addr, VALS[3].addr, {from: accounts[0], value: web3.utils.toWei('2500', 'ether')});
		 
        assert.equal(await validators.hasDeposit(VALS[3].pkey), true, "An address should have deposit now");
        assert.equal(await validators.hasDeposit(VALS[4].pkey), false, "An address should not have deposit by now");
    });

    it("should address of validator be right", async function () {
        let ret = await validators.getCompactedValidators();

        assert.equal(ret[0].length, 1, "There should be 1 validator by now")

        assert.equal(ret[0][0].substr(28).toUpperCase(), VALS[3].addr.substr(2).toUpperCase(), "Validator 3 address should match")
        assert.equal(ret[1][0].substr(2).toUpperCase(), VALS[3].pkey.substr(2).toUpperCase(), "Validator 3 pubKey should match")
        assert.equal(ret[0][0].substr(8, 2).toUpperCase(), '01', "Validator 3 should be paused")

        let activeCount = await validators.getActiveCount();
        assert.equal(+activeCount, 0, "There should be 0 active validators")
    });

    it("add money to val 3", async function () {
    	await web3.eth.sendTransaction({from: accounts[0], to: VALS[3].addr, value: web3.utils.toWei('100', 'ether')});
        assert.equal((await web3.eth.getBalance(VALS[3].addr)).toString(), web3.utils.toWei('100', 'ether'), "Validator 3 should have money now");

        await validators.resumeValidation(VALS[3].pkey, {from: VALS[3].addr});
        
        let ret = await validators.getCompactedValidators();
        assert.equal(ret[0][0].substr(8, 2).toUpperCase(), '00', "Validator 3 should be active")
    });
    

    it("should give money to other validators", async function () {
    	await web3.eth.sendTransaction({from: accounts[0], to: VALS[1].addr, value: web3.utils.toWei('100', 'ether')});
    	await web3.eth.sendTransaction({from: accounts[0], to: VALS[4].addr, value: web3.utils.toWei('100', 'ether')});
    	await web3.eth.sendTransaction({from: accounts[0], to: VALS[5].addr, value: web3.utils.toWei('100', 'ether')});
        
        assert.equal((await web3.eth.getBalance(VALS[1].addr)).toString(), web3.utils.toWei('100', 'ether'), "Validator 1 should have money now");
        assert.equal((await web3.eth.getBalance(VALS[4].addr)).toString(), web3.utils.toWei('100', 'ether'), "Validator 4 should have money now");
        assert.equal((await web3.eth.getBalance(VALS[5].addr)).toString(), web3.utils.toWei('100', 'ether'), "Validator 5 should have money now");
    });


    it("should validators set of 2 and 3 be the same", async function () {
        await checkValidatorSets([2, 3], 2);
    });

    it("should add another validator", async function () {
		await validators.addInitialDeposit(VALS[4].pkey, VALS[4].addr, VALS[4].addr, {from: accounts[0], value: web3.utils.toWei('2800', 'ether')});

        assert.equal(await validators.hasDeposit(VALS[4].pkey), true, "An address should have deposit now");

        await validators.resumeValidation(VALS[4].pkey, {from: VALS[4].addr});

		await validators.addInitialDeposit(VALS[5].pkey, VALS[5].addr, VALS[5].addr, {from: accounts[0], value: web3.utils.toWei('700', 'ether')});
		await validators.addDeposit(VALS[5].pkey, {from: accounts[0], value: web3.utils.toWei('1400', 'ether')});

		await testRpc.assertThrow("should throw if trying to unpause too small deposit", async function() {
        	await validators.resumeValidation(VALS[5].pkey, {from: VALS[5].addr});
        });

        await validators.addDeposit(VALS[5].pkey, {from: accounts[0], value: web3.utils.toWei('500', 'ether')});
        await validators.resumeValidation(VALS[5].pkey, {from: VALS[5].addr});
    });

    it("should validators set of 2, 3, 4 be the same", async function () {
    	//await sleep(2000);
        await checkValidatorSets([2, 3, 4], 3);
    });

    it("should add more validators", async function () {
		await validators.addInitialDeposit(VALS[1].pkey, VALS[1].addr, VALS[1].addr, {from: accounts[0], value: web3.utils.toWei('2700', 'ether')});

        assert.equal(await validators.hasDeposit(VALS[1].pkey), true, "An address should have deposit now");

        await validators.resumeValidation(VALS[1].pkey, {from: VALS[1].addr});

    	await web3.eth.sendTransaction({from: accounts[0], to: accounts[0], value: web3.utils.toWei('0', 'ether')});
    	await web3.eth.sendTransaction({from: accounts[0], to: accounts[0], value: web3.utils.toWei('0', 'ether')});
    });
 
    it("should validators set of 2, 3, 4, 5 be the same", async function () {
    	//await sleep(2000);
        await checkValidatorSets([2, 3, 4, 5], 5);
    });

    it("should be able to do a lot of operations", async function () {
    	let promises = [];
    	for(let i=0; i<10; ++i){
    		promises.push(
    			web3.eth.sendTransaction({from: accounts[0], to: accounts[0], value: web3.utils.toWei('0', 'ether')})
    		);	
    	}
    	await Promise.all(promises);
    });

    it("should validators set of 2, 3, 4, 5 be the same", async function () {
    	//await sleep(2000);
        await checkValidatorSets([2, 3, 4, 5], 5);
    });

    it("should validator 1 run", async function() {
    	execSync(PATH_TO_SCRIPTS + '\\run1.cmd');
    	await sleep(20*1000);

    	await checkValidatorSets([1, 2, 3, 4, 5], 5);
    });

    it("should be able to do a lot of operations with 5 validators", async function () {
    	let promises = [];
    	for(let i=0; i<100; ++i){
    		promises.push(
    			web3.eth.sendTransaction({from: accounts[0], to: accounts[i%5], value: web3.utils.toWei(Math.random().toFixed(15), 'ether')})
    		);	
    	}
    	await Promise.all(promises);
    });

    it("should validators set of 1, 2, 3, 4, 5 be the same again", async function () {
        await checkValidatorSets([1, 2, 3, 4, 5], 5);
    });

    it("should validator 2 stop", async function() {
    	execSync(PATH_TO_SCRIPTS + '\\stop.cmd 2');
    	await sleep(2*1000);

    	for(let i=0; i<3; ++i){
    		await web3.eth.sendTransaction({from: accounts[0], to: accounts[i%5], value: web3.utils.toWei(Math.random().toFixed(15), 'ether')})
    	}

    	await checkValidatorSets([1, 3, 4, 5], 5);
    });

    it("should validator 4 stop", async function() {
    	execSync(PATH_TO_SCRIPTS + '\\stop.cmd 4');
    	await sleep(2*1000);

    	let block = await web3.eth.getBlockNumber();

    	web3.eth.sendTransaction({from: accounts[0], to: accounts[0], value: web3.utils.toWei(Math.random().toFixed(15), 'ether')})

    	await sleep(10)

    	assert.equal(await web3.eth.getBlockNumber(), block, "There should not be any new block without +2/3 of validators");

    	await checkValidatorSets([1, 3, 5], 5);
    });

    it("should validator 4 start", async function() {
    	let block = await web3.eth.getBlockNumber();
    	
    	execSync(PATH_TO_SCRIPTS + '\\run4.cmd');
    	await sleep(10*1000);

    	assert.equal(await web3.eth.getBlockNumber(), block+1, "The block should have been generated using +2/3");

    	await checkValidatorSets([1, 3, 4, 5], 5);

    });

    it("should validator 4 be paused", async function() {
    	await validators.pauseValidation(VALS[4].pkey, VALS[4].pkey, 1, {from: VALS[4].addr});

    	await web3.eth.sendTransaction({from: accounts[0], to: accounts[0], value: web3.utils.toWei(Math.random().toFixed(15), 'ether')})
    	
    	await checkValidatorSets([1, 3, 4, 5], 4);

    });

    it("should validator 2 start, 4 and 5 stop and network still be alive", async function() {
    	execSync(PATH_TO_SCRIPTS + '\\run2.cmd');
    	execSync(PATH_TO_SCRIPTS + '\\stop.cmd 4');
    	execSync(PATH_TO_SCRIPTS + '\\stop.cmd 5');
    	await sleep(2*1000);

    	let block = await web3.eth.getBlockNumber();

    	await web3.eth.sendTransaction({from: accounts[0], to: accounts[0], value: web3.utils.toWei(Math.random().toFixed(15), 'ether')})

    	assert.equal(await web3.eth.getBlockNumber(), block+1, "There should be new block with +2/3 of validators");

    	await checkValidatorSets([1, 2, 3], 4);
    });

    it("should validator 4 be resumed", async function() {
    	execSync(PATH_TO_SCRIPTS + '\\run4.cmd');
    	
    	await Promise.all([
    		validators.resumeValidation(VALS[4].pkey, {from: VALS[4].addr}),
    		validators.pauseValidation(VALS[5].pkey, VALS[5].pkey, 1, {from: VALS[5].addr}),
    	]);

    	await web3.eth.sendTransaction({from: accounts[0], to: accounts[0], value: web3.utils.toWei(Math.random().toFixed(15), 'ether')})
    	
    	let block = await web3.eth.getBlockNumber();

    	await web3.eth.sendTransaction({from: accounts[0], to: accounts[0], value: web3.utils.toWei(Math.random().toFixed(15), 'ether')})

    	assert.equal(await web3.eth.getBlockNumber(), block+1, "There should be new block with +2/3 of validators");

    	await checkValidatorSets([1, 2, 3, 4], 4);

    }); 

    it("should all validators but 2nd be paused", async function() {
    	await Promise.all([
    		validators.pauseValidation(VALS[4].pkey, VALS[4].pkey, 1, {from: VALS[4].addr}),
    		validators.pauseValidation(VALS[1].pkey, VALS[1].pkey, 1, {from: VALS[1].addr}),
    		validators.pauseValidation(VALS[3].pkey, VALS[3].pkey, 1, {from: VALS[3].addr}),
    	]);

    	await web3.eth.sendTransaction({from: accounts[0], to: accounts[0], value: web3.utils.toWei(Math.random().toFixed(15), 'ether')})

    	await checkValidatorSets([1, 2, 3, 4], 1);

    	let block = await web3.eth.getBlockNumber();

    	execSync(PATH_TO_SCRIPTS + '\\stop.cmd 1');
    	execSync(PATH_TO_SCRIPTS + '\\stop.cmd 4');

    	await web3.eth.sendTransaction({from: accounts[0], to: accounts[0], value: web3.utils.toWei(Math.random().toFixed(15), 'ether')})

    	assert.equal(await web3.eth.getBlockNumber(), block+1, "There should be new block with +2/3 of validators");

    	await checkValidatorSets([2, 3], 1);
    });

    it("should restore other validators", async function() {
    	execSync(PATH_TO_SCRIPTS + '\\run4.cmd');
    	execSync(PATH_TO_SCRIPTS + '\\run5.cmd');

    	await Promise.all([
    		validators.resumeValidation(VALS[4].pkey, {from: VALS[4].addr}),
    		validators.resumeValidation(VALS[1].pkey, {from: VALS[1].addr}),
    		validators.resumeValidation(VALS[3].pkey, {from: VALS[3].addr}),
    		validators.resumeValidation(VALS[5].pkey, {from: VALS[5].addr}),
    	]);

    	await web3.eth.sendTransaction({from: accounts[0], to: accounts[0], value: web3.utils.toWei(Math.random().toFixed(15), 'ether')})

    	await checkValidatorSets([2, 3, 4, 5], 5);
    });

    it("should be able to do a lot of operations and blocks - 50", async function () {
    	let block = await web3.eth.getBlockNumber();
    	for(let i=0; i<50; ++i){
    		await web3.eth.sendTransaction({from: accounts[0], to: accounts[i%5], value: web3.utils.toWei(Math.random().toFixed(15), 'ether')})
    	}
    	assert.isAtLeast(await web3.eth.getBlockNumber(), block + 50, "We should have added 50+ blocks!");
    });

    it("should be able to do a lot of operations and blocks - 100", async function () {
    	let block = await web3.eth.getBlockNumber();
    	for(let i=0; i<50; ++i){
    		await web3.eth.sendTransaction({from: accounts[0], to: accounts[i%5], value: web3.utils.toWei(Math.random().toFixed(15), 'ether')})
    	}
    	assert.isAtLeast(await web3.eth.getBlockNumber(), block + 50, "We should have added 50+ blocks!");
    });

    it("should be able to do a lot of operations and blocks - 150", async function () {
    	let block = await web3.eth.getBlockNumber();
    	for(let i=0; i<50; ++i){
    		await web3.eth.sendTransaction({from: accounts[0], to: accounts[i%5], value: web3.utils.toWei(Math.random().toFixed(15), 'ether')})
    	}
    	assert.isAtLeast(await web3.eth.getBlockNumber(), block + 50, "We should have added 50+ blocks!");
    });

    it("should be able to do a lot of operations and blocks - 200", async function () {
    	let block = await web3.eth.getBlockNumber();
    	for(let i=0; i<50; ++i){
    		await web3.eth.sendTransaction({from: accounts[0], to: accounts[i%5], value: web3.utils.toWei(Math.random().toFixed(15), 'ether')})
    	}
    	assert.isAtLeast(await web3.eth.getBlockNumber(), block + 50, "We should have added 50+ blocks!");
    });

    it("should be able to do a lot of operations and blocks - 250", async function () {
    	let block = await web3.eth.getBlockNumber();
    	for(let i=0; i<50; ++i){
    		await web3.eth.sendTransaction({from: accounts[0], to: accounts[i%5], value: web3.utils.toWei(Math.random().toFixed(15), 'ether')})
    	}
    	assert.isAtLeast(await web3.eth.getBlockNumber(), block + 50, "We should have added 50+ blocks!");
    });

    it("should be able to do a lot of operations and blocks - 300", async function () {
    	let block = await web3.eth.getBlockNumber();
    	for(let i=0; i<50; ++i){
    		await web3.eth.sendTransaction({from: accounts[0], to: accounts[i%5], value: web3.utils.toWei(Math.random().toFixed(15), 'ether')})
    	}
    	assert.isAtLeast(await web3.eth.getBlockNumber(), block + 50, "We should have added 50+ blocks!");
    });

    it("should validator 1 syncronize with 300 blocks history", async function () {
    	execSync(PATH_TO_SCRIPTS + '\\run1.cmd');
    	await sleep(60000);                     

    	await checkValidatorSets([1, 2, 3, 4, 5], 5);
    });





//*/
});



