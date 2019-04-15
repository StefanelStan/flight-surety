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
            contractInstance = await contractDefinition.new(firstAirline, {from:owner});
        });

        it('should NOT allow unauthorized users to query isContractOperational', async() => {
            expectToRevert(contractInstance.isContractOperational.call({from: appContractAddress}), 'Caller is not authorized');
        })

        it('should make the contract operational after deployment and allow the owner to query isContractOperational', async() => {
            let isOperational = await contractInstance.isContractOperational.call({from: owner});
            expect(isOperational).to.be.true;
        });
    });

    describe('Test suite: setOperatingStatus', () => {
        before(async() => {
            contractInstance = await contractDefinition.new(firstAirline, {from:owner});
        });

        it('should NOT allow unauthorized users to setOperatingStatus', async() => {
            expectToRevert(contractInstance.setOperatingStatus(false, {from: appContractAddress}), 'Caller is not authorized');
        });

        it('should NOT allow to setOperatingStatus the SAME operating status', async() => {
            expectToRevert(contractInstance.setOperatingStatus(true, {from: owner}), 'Contract is already in this state');
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
            contractInstance = await contractDefinition.new(firstAirline, {from:owner});
        });

        it('should NOT allow unauthorized user to getAirline', async() => {
            expectToRevert(contractInstance.getAirline.call(owner, {from: appContractAddress}), 'Caller is not authorized');
            expectToRevert(contractInstance.getAirline.call(owner, {from: owner}), 'Caller is not authorized');
        });
    });

    describe('Testing suite: authorizeContract', () => { //continue on 15/04/2019 @ 21:27
        it('should NOT allow unauthorized users to authorizeContract', async()=>{});
        it('should allow unauthorized users to authorizeContract', async()=>{});
        it('should deploy the first airline and allow ONLY authorizedContracts to query for it', async() => {});
        it('should allow authorizedContracts to pause the contract', async() => {});
    });
     
});

const expectToRevert = async(promise, errorMessage) => {
    return await truffleAssert.reverts(promise, errorMessage);
}