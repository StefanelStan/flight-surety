const expect = require('chai').expect;
const truffleAssert = require('truffle-assertions');

const contractDefinition = artifacts.require('FlightSuretyData');

contract('FlightSuretyData', accounts => {
    const firstAirline = 'Lufthansa';
    const appContractAddress = accounts[9];
    let contractInstance;
    const owner = accounts[0];
    
    describe ('Test suite: isContractOperational', () => {
        before(async() => {
            contractInstance = await contractDefinition.new(web3.utils.utf8ToHex(firstAirline), {from:owner});
        });

        it('should NOT allow unauthorized users to query isContractOperational', async() => {
            await expectToRevert(contractInstance.isContractOperational.call({from: appContractAddress}), 'Caller is not authorized');
        })

        it('should make the contract operational after deployment and allow the owner to query isContractOperational', async() => {
            let isOperational = await contractInstance.isContractOperational.call({from: owner});
            expect(isOperational).to.be.true;
        });
    });

    describe('Test suite: setOperatingStatus', () => {
        before(async() => {
            contractInstance = await contractDefinition.new(web3.utils.utf8ToHex(firstAirline), {from:owner});
        });

        it('should NOT allow unauthorized users to setOperatingStatus', async() => {
            await expectToRevert(contractInstance.setOperatingStatus(false, {from: appContractAddress}), 'Caller is not authorized');
        });

        it('should NOT allow to setOperatingStatus the SAME operating status', async() => {
            await expectToRevert(contractInstance.setOperatingStatus(true, {from: owner}), 'Contract is already in this state');
        });

        it('should allow the owner to setOperatingStatus', async() => {
            let isOperational = await contractInstance.isContractOperational.call({from: owner});
            expect(isOperational).to.be.true;
            await contractInstance.setOperatingStatus(false, {from: owner});
            isOperational = await contractInstance.isContractOperational.call({from: owner});
            expect(isOperational).to.be.false;
        });
    });
    
    describe('Test suite: getAirline', () => {
        before(async() => {
            contractInstance = await contractDefinition.new(web3.utils.utf8ToHex(firstAirline), {from:owner});
        });

        it('should NOT allow unauthorized user to getAirline', async() => {
            await expectToRevert(contractInstance.getAirline.call(owner, {from: appContractAddress}), 'Caller is not authorized');
            await expectToRevert(contractInstance.getAirline.call(owner, {from: owner}), 'Caller is not authorized');
        });
    });

    describe('Testing suite: authorizeContract', () => { //continue on 15/04/2019 @ 21:27
        before(async() => {
            contractInstance = await contractDefinition.new(web3.utils.utf8ToHex(firstAirline), {from:owner});
        });

        it('should NOT allow unauthorized users to authorizeContract', async() => {
            await expectToRevert(contractInstance.authorizeContract(owner, {from: appContractAddress}), 'Caller is not contract owner');
        });

        it('should allow ONLY owner to authorizeContract', async() => {
            await contractInstance.authorizeContract(appContractAddress, {from: owner});
        });

        it('should deploy the first airline and allow ONLY authorizedContracts to query for it', async() => {
            let airline = await contractInstance.getAirline.call(owner, {from: appContractAddress});
            expect(web3.utils.hexToUtf8(airline[0])).to.equal(firstAirline);
            expect(airline[1]).to.be.true;
            expect(airline[2]).to.be.true;
        });

        it('should allow authorizedContracts to pause the contract', async() => {
            let isOperational = await contractInstance.isContractOperational.call({from: appContractAddress});
            expect(isOperational).to.be.true;
            await contractInstance.setOperatingStatus(false, {from: appContractAddress});
            isOperational = await contractInstance.isContractOperational.call({from: appContractAddress});
            expect(isOperational).to.be.false;
        });
    });

    describe('Test suite: registerAirline', () => {
        before(async() => {
            contractInstance = await contractDefinition.new(web3.utils.utf8ToHex(firstAirline), {from:owner});
            await contractInstance.authorizeContract(appContractAddress, {from: owner});
        });
        
        it('should NOT allow unauthorized user/address to registerAirline', async () => {
            await expectToRevert(contractInstance.registerAirline(accounts[1], web3.utils.utf8ToHex('Air Pacific'), {from: owner}), 'Caller is not authorized');
        });

        
        it('should allow authorized address to registerAirline and set register true and validated not', async () => {
            await contractInstance.registerAirline(accounts[1], web3.utils.utf8ToHex('Air Pacific'), {from: appContractAddress});
            let airline = await contractInstance.getAirline.call(accounts[1], {from: appContractAddress});
            expect(web3.utils.hexToUtf8(airline[0])).to.equal('Air Pacific');
            expect(airline[1]).to.be.true;
            expect(airline[2]).to.be.false;
        });
        
        it('should NOT allow authorized address to registerAirline if contract is paused', async () => {
            await contractInstance.setOperatingStatus(false, {from: appContractAddress});
            await expectToRevert(contractInstance.registerAirline(accounts[2], web3.utils.utf8ToHex('WizzAir'), {from: appContractAddress}),' Contract is currently not operational');
        });

    });
     
});

const expectToRevert = (promise, errorMessage) => {
    return truffleAssert.reverts(promise, errorMessage);
}

var expectToFail = async(promise, errorType, errorMessage) => {
    try {
        await promise;
    }
    catch(error){
        expect(error).to.be.an(errorType);
        expect(error.message).to.have.string(errorMessage);
        return;
    }
    assert.fail(`Expected to throw an ${errorType} with message ${errorMessage}`);
}