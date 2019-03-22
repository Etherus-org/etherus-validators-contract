let Validators = artifacts.require("./validators.sol");

const testRpc = require('./helpers/testRpc');

function getVal(i){
    return "0x0V00000000000000000000000000000000000000000000000000000000000000".replace('V', i.toString(16));
}

const zeroAddress = "0x544CF949C716FACD56188F6712E27A7EE3877886";


const PAUSE_NOT_PAUSED = 0;      //Активное состояние
const PAUSE_CAUSE_VOLUNTARILY = 1;      //Добровольная пауза
const PAUSE_CAUSE_UNTIL_BLOCK = 2; //Пауза до блока
const PAUSE_CAUSE_UNTIL_FINE = 3; //Пауза до выплаты штрафа
const PAUSE_CAUSE_PUNISHMENT = 4;       //Наказание

contract('Validators', async function (accounts) {
    let validators;

    debugger;

    before(async function(){
        validators = await Validators.new();
        
        await validators.setDepositBounds(web3.utils.toWei('25', 'ether'), web3.utils.toWei('0.1', 'ether'));
    });

    it("should users add deposits", async function () {
		await validators.addInitialDeposit(getVal(0), accounts[0], zeroAddress, {from: accounts[0], value: web3.utils.toWei('25', 'ether')});

        assert.equal(await validators.hasDeposit(getVal(0)), true, "An address should have deposit now");
        assert.equal(await validators.hasDeposit(getVal(1)), false, "An address should not have deposit by now");

        let val = await validators.getValidator(getVal(0));
        assert.equal(val.pauseCause.toNumber(), PAUSE_CAUSE_VOLUNTARILY, "New validator should be paused");
    });

    it("should address of validator be right", async function () {
        let ret = await validators.getCompactedValidators();

        assert.equal(ret[0].length, 1, "There should be 1 validator by now");

        let valAddr = accounts[0];
        assert.equal(ret[0][0].substr(26).toUpperCase(), valAddr.toUpperCase().substr(2), "Validator address should match")
        assert.equal(ret[1][0].substr(2).toUpperCase(), getVal(0).toUpperCase().substr(2), "Validator pubKey should match")
    });

    it("should be able to add deposit once more", async function () {
        await validators.addInitialDeposit(getVal(0), accounts[1], zeroAddress, {from: accounts[0], value: web3.utils.toWei('1.5', 'ether')});

        let ret = await validators.getCompactedValidators();
        let addr = await validators.getNodeAddr(getVal(0));

//        console.log(ret[0][0])

        assert.equal(web3.utils.toBN("0x" + ret[0][0].substr(10, 16)).toString(16), web3.utils.toBN(web3.utils.toWei('26.5', 'ether')).divn(256*256).divn(256*256).toString(16), "Validator deposit should have increased")
        assert.equal(addr.toUpperCase(), accounts[0].toUpperCase(), "Validator node address should not change")
    });

    it("There should be no active validators", async () => {
        let ret = await validators.getActiveCompactedValidators();

        assert.equal(ret[0].length, 0, "There should be 0 active validators by now")
    });

    it("We should be able to unpause validator", async () => {
        await validators.resumeValidation(getVal(0));

        let ret = await validators.getActiveCompactedValidators();
        assert.equal(ret[0].length, 1, "There should be 1 active validator by now")
    });

    it("Should not be able to add deposit to inexistent validator", async () => {
        await testRpc.assertThrow("addDeposit on inexistent validator should fail", async () => {
            await validators.addDeposit(getVal(1), {from: accounts[1], value: web3.utils.toWei('25', 'ether')});
        })
    });

    it("Should another validator be created", async () => {
        await validators.addInitialDeposit(getVal(1), accounts[1], zeroAddress, {from: accounts[1], value: web3.utils.toWei('20', 'ether')});

        assert.equal(await validators.hasDeposit(getVal(1)), true, "An address should have deposit by now");
        let ret = await validators.getCompactedValidators();
        assert.equal(ret[0].length, 2, "There should be 2 validators by now");

        let val = await validators.getValidator(getVal(1));
        assert.equal(val.pauseCause.toNumber(), PAUSE_CAUSE_VOLUNTARILY, "New validator should be paused");
    });

    it("Nobody should be able to unpause a validator", async () => {
        await testRpc.assertThrow("Unpausing is possible only from validator address", async () => {
            await validators.resumeValidation(getVal(1), {from: accounts[0]});
        });
        await testRpc.assertThrow("Unpausing is impossible if deposit is too small", async () => {
            await validators.resumeValidation(getVal(1), {from: accounts[1]});
        });

        await validators.addDeposit(getVal(1), {from: accounts[3], value: web3.utils.toWei('6.5', 'ether')});
        await validators.resumeValidation(getVal(1), {from: accounts[1]});

        let ret = await validators.getActiveCompactedValidators();
        assert.equal(ret[0].length, 2, "There should be 2 active validators by now")
    });

    it("Should be able to pause validator", async () => {
        await testRpc.assertThrow("Unpausing is possible only from validator address 1", async () => {
            await validators.pauseValidation(getVal(1), getVal(1), PAUSE_CAUSE_VOLUNTARILY, 0, {from: accounts[2]});
        });
        await testRpc.assertThrow("Unpausing is possible only from validator address 2", async () => {
            await validators.pauseValidation(getVal(1), getVal(0), PAUSE_CAUSE_VOLUNTARILY, 0, {from: accounts[2]});
        });
        await testRpc.assertThrow("Volunary pausing is possible only from validator address 3", async () => {
            await validators.pauseValidation(getVal(1), getVal(0), PAUSE_CAUSE_VOLUNTARILY, 0, {from: accounts[0]});
        });

        await validators.pauseValidation(getVal(1), getVal(1), PAUSE_CAUSE_VOLUNTARILY, 0, {from: accounts[1]});

        let val = await validators.getValidator(getVal(1));
        assert.equal(val.pauseCause.toNumber(), PAUSE_CAUSE_VOLUNTARILY, "Validator 1 should be paused");

        await validators.resumeValidation(getVal(1), {from: accounts[1]});
        val = await validators.getValidator(getVal(1));
        assert.equal(val.pauseCause.toNumber(), PAUSE_NOT_PAUSED, "Validator 1 should be unpaused");

    });

    it("Should owner be able to punish paused validator", async () => {
        await validators.pauseValidation(getVal(1), getVal(1), PAUSE_CAUSE_VOLUNTARILY, 0, {from: accounts[1]});

        await validators.addDeposit(getVal(1), {from: accounts[1], value: web3.utils.toWei('2', 'ether')});

        let val = await validators.getValidator(getVal(1));
        assert.equal(val.pauseCause.toNumber(), PAUSE_CAUSE_VOLUNTARILY, "Validator 1 should be paused");

        await validators.pauseValidation(getVal(1),  getVal(0), PAUSE_CAUSE_UNTIL_FINE, web3.utils.toWei('2', 'ether'), {from: accounts[0]});
        val = await validators.getValidator(getVal(1));
        assert.equal(val.pauseCause.toNumber(), PAUSE_CAUSE_UNTIL_FINE, "Validator 1 should be paused until fine");

        await validators.resumeValidation(getVal(1), {from: accounts[1]});

        assert.equal(await validators.isPaused(getVal(1)), false, "Validator 1 should be unpaused");

    });

    it("Should owner be able to punish", async () => {
        await testRpc.assertThrow("Punishing is possible only from owner", async () => {
            await validators.pauseValidation(getVal(0),  getVal(1), PAUSE_CAUSE_UNTIL_FINE, web3.utils.toWei('2', 'ether'), {from: accounts[1]});
        });

        await validators.pauseValidation(getVal(1),  getVal(0), PAUSE_CAUSE_UNTIL_FINE, web3.utils.toWei('2', 'ether'), {from: accounts[0]});

        let val = await validators.getValidator(getVal(1));
        assert.equal(val.pauseCause.toNumber(), PAUSE_CAUSE_UNTIL_FINE, "Validator 1 should be paused");
        assert.equal(val.punishValue.toString(), web3.utils.toWei('2', 'ether'), "Validator 1 should be fine-paused");
    });

    it("Should be able to recover from punishment", async () => {
        await testRpc.assertThrow("Should not be able to unpause when deposit is not enough", async () => {
            await validators.resumeValidation(getVal(1), {from: accounts[1]});
        });

        await validators.addDeposit(getVal(1), {from: accounts[1], value: web3.utils.toWei('0.5', 'ether')});
        await validators.resumeValidation(getVal(1), {from: accounts[1]});

        let ret = await validators.getActiveCompactedValidators();
        assert.equal(ret[0].length, 2, "There should be 2 active validators by now");

        let val = await validators.getValidator(getVal(1));
        assert.equal(val.deposit.toString(), web3.utils.toWei('25', 'ether'), "Validator should have lost part of deposit");

    });

    it("Should owner be able to punish for blocks", async () => {
        await validators.pauseValidation(getVal(1),  getVal(0), PAUSE_CAUSE_UNTIL_BLOCK, 3, {from: accounts[0]});

        let val = await validators.getValidator(getVal(1));
        assert.equal(val.pauseCause.toNumber(), PAUSE_CAUSE_UNTIL_BLOCK, "Validator 1 should be paused");
        assert.equal(val.punishValue.toNumber(), 3, "Validator 1 should be block-paused");
    });

    it("Should be able to recover from block punishment", async () => {
        await testRpc.assertThrow("Should not be able to unpause when block is not right", async () => {
            await validators.resumeValidation(getVal(1), {from: accounts[1]});
        });

        await web3.eth.sendTransaction({from: accounts[0], to: accounts[0], value: 0});
        await web3.eth.sendTransaction({from: accounts[0], to: accounts[0], value: 0});

        await validators.resumeValidation(getVal(1), {from: accounts[1]});

        let ret = await validators.getActiveCompactedValidators();
        assert.equal(ret[0].length, 2, "There should be 2 active validators by now");
    });

    it("Should validator be able to withdraw", async () => {
        await testRpc.assertThrow("Should not withdraw without pause", async () => {
            await validators.withdraw(getVal(1), {from: accounts[1]});
        });

        await validators.pauseValidation(getVal(1),  getVal(1), PAUSE_CAUSE_VOLUNTARILY, 0, {from: accounts[1]});

        await testRpc.assertThrow("Should not withdraw without waiting", async () => {
            await validators.withdraw(getVal(1), {from: accounts[1]});
        });

        //TODO: skip blocks and check withdraw
    });

});

