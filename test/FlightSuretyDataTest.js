const expect = require('chai').expect;
const truffleAssert = require('truffle-assertions');

const contractDefinition = artifacts.require('FlightSuretyData');

contract('FlightSuretyData', accounts => {

    let contractInstance;
    let owner = accounts[0];
    
    describe ('Test suite: isContractOperational', () => {
        before(async() => {
            contractInstance = await contractDefinition.new({from:owner});
        });

        it('should make the contract operational on the first deployment', async() => {
            let isOperational = await contractInstance.isContractOperational.call({from: owner});
            expect(isOperational).to.be.true;
        });
    });
     

});