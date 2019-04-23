const expect = require('chai').expect;
const truffleAssert = require('truffle-assertions');

const appContractDefinition = artifacts.require('FlightSuretyApp');
const dataContractDefinition = artifacts.require('FlightSuretyData');

contract('FlightSuretyApp', accounts => {
    const firstAirline = 'Lufthansa';
    let contractInstance;
    const owner = accounts[0];
    const flightNumber = web3.utils.utf8ToHex('LT3214');
    const oneEther = web3.utils.toWei('1', 'ether');
    const oneAndAHalfEther = web3.utils.toWei('1.5', 'ether');
    const twoEther = web3.utils.toWei('2', 'ether');
    const threeEther = web3.utils.toWei('3', 'ether');
    const tenEther = web3.utils.toWei('10', 'ether');
    const twelveEther = web3.utils.toWei('12', 'ether');
    const eightAndAHalfEther = web3.utils.toWei('8.5', 'ether');

    describe ('Test suite: isContractOperational', () => {
        before(async() => {
            const dataContract = await dataContractDefinition.new(web3.utils.utf8ToHex(firstAirline), {from:owner});
            contractInstance = await appContractDefinition.new(dataContract.address, {from:owner});
        });

        it('should make the contract operational after deployment and allow to query isContractOperational', async() => {
            let isOperational = await contractInstance.isContractOperational.call({from: owner});
            expect(isOperational).to.be.true;

            isOperational = await contractInstance.isContractOperational.call({from: accounts[5]});
            expect(isOperational).to.be.true;
        });
    });

    describe('Test suite: setOperatingStatus', () => {
        before(async() => {
            const dataContract = await dataContractDefinition.new(web3.utils.utf8ToHex(firstAirline), {from:owner});
            contractInstance = await appContractDefinition.new(dataContract.address, {from:owner});
        });

        it('should NOT allow unauthorized users to setOperatingStatus', async() => {
            await expectToRevert(contractInstance.setOperatingStatus(false, {from: accounts[1]}), 'Caller is not contract owner');
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

    describe('Test suite: fundAirline', () => {
        before(async() => {
            const dataContract = await dataContractDefinition.new(web3.utils.utf8ToHex(firstAirline), {from:owner});
            contractInstance = await appContractDefinition.new(dataContract.address, {from:owner});
            await dataContract.authorizeContract(contractInstance.address, {from: owner});
        });

        it('should NOT allow unauthorized unregistered users/airlines to fundAirline', async() => {
            await expectToRevert(contractInstance.fundAirline({from: accounts[1], value: tenEther}), 'Caller is not a registered airline');
        });

        it('should NOT allow the airline to fundAirline itself if value sent if less than minimum', async() => {
            await expectToRevert(contractInstance.fundAirline({from: owner, value: threeEther}), 'Minimum fee required for funding');
        });

        it('should allow the airline to fundAirline itself only and send event', async() => {
            let tx = await contractInstance.fundAirline({from: owner, value:tenEther});
            truffleAssert.eventEmitted(tx, 'AirlineFunded', (ev) => {
                return expect(ev.airline).to.deep.equal(owner) && expect(Number(ev.value)).to.deep.equal(Number(tenEther));
            });

            tx = await contractInstance.fundAirline({from: owner, value:twelveEther});
            truffleAssert.eventEmitted(tx, 'AirlineFunded', (ev) => {
                return expect(ev.airline).to.deep.equal(owner) && expect(Number(ev.value)).to.deep.equal(Number(twelveEther));
            });
        });
        
        it('should NOT allow registered airlines to fundAirline if contract is paused', async() => {
            await contractInstance.setOperatingStatus(false, {from: owner});
            await expectToRevert(contractInstance.fundAirline({from: owner, value: tenEther}), 'Contract is currently not operational');
        });
    });


    describe('Test suite: registerAirline', () => {
        before(async() => {
            const dataContract = await dataContractDefinition.new(web3.utils.utf8ToHex(firstAirline), {from:owner});
            contractInstance = await appContractDefinition.new(dataContract.address, {from:owner});
        });

        it('should NOT allow unauthorized users to registerAirline', async() => {
            await expectToRevert(contractInstance.setOperatingStatus(false, {from: accounts[1]}), 'Caller is not authorized');
        });

        it('should NOT allow to unvalidated airlines to register flight the SAME operating status', async() => {
            await expectToRevert(contractInstance.setOperatingStatus(true, {from: owner}), 'Contract is already in this state');
        });

        it('should allow the owner to setOperatingStatus', async() => {
            let isOperational = await contractInstance.isContractOperational.call({from: owner});
            expect(isOperational).to.be.true;
            await contractInstance.setOperatingStatus(false, {from: owner});
            isOperational = await contractInstance.isContractOperational.call({from: owner});
            expect(isOperational).to.be.false;
        });

        it('should NOT allow users to registerAirline if contract is paused', async() => {} //continue 23/04/2019 21:56
    });


});   

const expectToRevert = (promise, errorMessage) => {
    return truffleAssert.reverts(promise, errorMessage);
};

const expectFlightToHaveProperties = (flight, airline, flightNumber, timeStamp, statusCode) => {
    expect(flight[0]).to.equal(airline);
    expect(web3.utils.hexToUtf8(flight[1])).to.equal(flightNumber);
    expect(Number(flight[2])).to.equal(timeStamp);
    expect(Number(flight[3])).to.equal(statusCode);
};