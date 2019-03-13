let Validators = artifacts.require("./validators.sol");

const testRpc = require('./helpers/testRpc');

const decimals = 18;
const zeroes = Math.pow(10, decimals);
const zeroesBN = web3.toBigNumber(10).pow(web3.toBigNumber(decimals));

const validatorPubKey = "0xFDD085C54E9FE40A9B5EBEFB08C9650336ED0A5DE0F9FCD6CF5541B90165501D";
const validatorAddress = "0x544CF949C716FACD56188F6712E27A7EE3877886";

contract('Validators', async function (accounts) {
    let validators;

    debugger;

    before(async function(){
        validators = await Validators.new();
    });

    it("should users add deposits", async function () {
		await validators.addDeposit(validatorPubKey, accounts[0], {from: accounts[0], value: web3.toWei(5, 'ether')});

        assert.equal(await validators.hasDeposit(validatorPubKey), true, "An address should have deposit now");
        assert.equal(await validators.hasDeposit(accounts[1]), false, "An address should not have deposit by now");
    });

    it("should address of validator be right", async function () {
        let ret = await validators.getCompactedValidators();

        assert.equal(ret[0].length, 1, "There should be 1 validator by now")

        var valAddr = "0x0000000000000000000000000000000000000000";
        assert.equal(ret[0][0].substr(26).toUpperCase(), valAddr.substr(2), "Validator address should match")
        assert.equal(ret[1][0].substr(2).toUpperCase(), validatorPubKey.substr(2), "Validator pubKey should match")
    });

    it("should be able to add deposit once more", async function () {
        await validators.addDeposit(validatorPubKey, accounts[1], {from: accounts[0], value: web3.toWei(15, 'ether')});

        let ret = await validators.getCompactedValidators();
        let addr = await validators.getNodeAddr(validatorPubKey);

//        console.log(ret[0][0])

        assert.equal(web3.toBigNumber("0x" + ret[0][0].substr(10, 16)).toString(16), web3.toBigNumber(web3.toWei(20, 'ether')).divToInt(256*256*256*256).toString(16), "Validator deposit should have increased")
        assert.equal(addr.toUpperCase(), accounts[0].toUpperCase(), "Validator node address should not change")
    });

/*
    it("should node add deposits", async function () {
        //Почему-то оверлоад фейлится :(
//        await callOverloadedTransfer(tokenContract, registry.address, 500*zeroes, "0x00000001", {from: accounts[2]});
        await tokenContract.transferAndPay(registry.address, 500*zeroes, "0x00000001", {from: accounts[2]});
        let dep = await registry.getNodeDeposit(accounts[2]);

        assert.equal(dep.toNumber(), 500*zeroes, "500 wasn't in the node account (ERC23)");

        await registry.addNodeDeposit(200*zeroes, {from: accounts[2]});
        dep = await registry.getNodeDeposit(accounts[2]);

        assert.equal(dep.toNumber(), 700*zeroes, "200 wasn't in the node account (ERC20)");
    });

    it("should pay with cheque", async function() {
        let issuer = EU.setLength(EU.toBuffer(accounts[0]), 20);
        let beneficiary = EU.setLength(EU.toBuffer(accounts[2]), 20);
        let amount = EU.setLength(EU.toBuffer(new EU.BN(cheque1.toString())), 32);
        let timestamp = EU.setLength(EU.toBuffer(new EU.BN(0x12345678)), 8);
        let sha3hash = EU.sha3(Buffer.concat([EU.toBuffer("TIE cheque"), issuer, beneficiary, amount, timestamp]));
        let sig = EU.ecsign(sha3hash, EU.toBuffer(secrets[0]));

        let tx = await registry.cashCheque(accounts[0], accounts[2], cheque1, web3.toBigNumber(0x12345678), EU.bufferToHex(sig.v), EU.bufferToHex(sig.r), EU.bufferToHex(sig.s));

        let events = tx.logs;
        let ok = events.find(e => e.event == 'ChequeRedeemed');

        assert.isOk(ok, 'paying with check should have been successful!');
    });

    it("should payment be done", async function() {
        let deposit = await registry.getUserDeposit(accounts[0]);

        assert.equal(deposit.toString(), (100 - 8)*zeroes, "Deposit should have decreased");

        let sent = await registry.getSent(accounts[0], accounts[2]);

        assert.equal(sent.toString(), cheque1.toString(), "Amount should have been sent");

        let balance = await tokenContract.balanceOf(accounts[2]);

        assert.equal(balance.toString(), (4300 + 8)*zeroes, "Amount should have been received");
    }); */
});

