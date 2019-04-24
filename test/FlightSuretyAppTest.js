
const expect = require('chai').expect;
const truffleAssert = require('truffle-assertions');

const appContractDefinition = artifacts.require('FlightSuretyApp');
const dataContractDefinition = artifacts.require('FlightSuretyData');

contract('FlightSuretyApp', accounts => {
    const firstAirline = 'Lufthansa';
    const secondAirline = 'WizzAir';
    const thirdAirline = 'PacificAir';
    const fourthAirline = 'AtlanticAir';
    const fifthAirline = 'BritishAirways';
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
    const zeroAddress = '0x0000000000000000000000000000000000000000';

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
        let dataContract
        before(async() => {
            dataContract = await dataContractDefinition.new(web3.utils.utf8ToHex(firstAirline), {from:owner});
            contractInstance = await appContractDefinition.new(dataContract.address, {from:owner});
            await dataContract.authorizeContract(contractInstance.address, {from: owner});
        });

        it('should NOT allow unauthorized unregistered users/airlines to fundAirline', async() => {
            await expectToRevert(contractInstance.fundAirline({from: accounts[1], value: tenEther}), 'Caller is not a registered airline');
        });

        it('should NOT allow the airline to fundAirline itself if value sent if less than minimum', async() => {
            await expectToRevert(contractInstance.fundAirline({from: owner, value: threeEther}), 'Minimum fee required for funding');
        });

        it('should allow the airline to fundAirline itself only, send event and store eth on data contract', async() => {
            let dataContractBalanceBefore = await web3.eth.getBalance(dataContract.address);
            let tx = await contractInstance.fundAirline({from: owner, value:tenEther});
            
            let dataContractBalanceAfter = await web3.eth.getBalance(dataContract.address);
            expect(Number(dataContractBalanceAfter) - Number(dataContractBalanceBefore)).to.equal(Number(tenEther));
            truffleAssert.eventEmitted(tx, 'AirlineFunded', (ev) => {
                return expect(ev.airline).to.deep.equal(owner) && expect(Number(ev.value)).to.deep.equal(Number(tenEther));
            });

            dataContractBalanceBefore = await web3.eth.getBalance(dataContract.address);
            tx = await contractInstance.fundAirline({from: owner, value:twelveEther});
            
            dataContractBalanceAfter = await web3.eth.getBalance(dataContract.address);
            expect(Number(dataContractBalanceAfter)).to.equal(Number(web3.utils.toWei('22', 'ether')));
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
            await dataContract.authorizeContract(contractInstance.address, {from: owner});
        });

        it('should NOT allow unauthorized users to registerAirline', async() => {
            await expectToRevert(contractInstance.registerAirline(accounts[1], web3.utils.utf8ToHex(secondAirline), {from: accounts[1]}), 'Caller is not a validated airline');
        });

        it('should NOT allow to unvalidated(unfunded) airlines to registerAirline', async() => {
            await expectToRevert(contractInstance.registerAirline(accounts[1], web3.utils.utf8ToHex(secondAirline), {from: owner}), 'Caller is not a validated airline');
        });

        it('snould NOT allow validated airlines to registerAirline a 0x0 address airline', async() => {
            await contractInstance.fundAirline({from: owner, value:tenEther});
            await expectToRevert(contractInstance.registerAirline(zeroAddress, web3.utils.utf8ToHex(secondAirline),{from: owner}), 'Invalid address to register');
        });

        it('should allow only a validated (funded) airline to registerAirline another airline', async() => {
            let tx = await contractInstance.registerAirline(accounts[1], web3.utils.utf8ToHex(secondAirline),{from: owner});
            truffleAssert.eventEmitted(tx, 'AirlineRegistered', (ev) => {
                return expect(ev.airline).to.deep.equal(accounts[1]) && expect(Number(ev.votes)).to.equal(Number(1));
            });

            tx = await contractInstance.fundAirline({from: accounts[1], value: tenEther});
            truffleAssert.eventEmitted(tx, 'AirlineFunded', (ev) => {
                return expect(ev.airline).to.deep.equal(accounts[1]) && expect(Number(ev.value)).to.deep.equal(Number(tenEther));
            });
        });

        it('should NOT allow validated airlines to register an already validated airline', async() => {
            await expectToRevert(contractInstance.registerAirline(accounts[1], web3.utils.utf8ToHex(secondAirline),{from: owner}), 'Airline is already validated');
        });

        it('(multi-party consensus) should ask for consensus before accepting validation/funding', async() => {
            // register total of 4 airlines and check consensus for 5th one

            // Register 3rd airline
            let tx = await contractInstance.registerAirline(accounts[2], web3.utils.utf8ToHex(thirdAirline),{from: accounts[1]});
            truffleAssert.eventEmitted(tx, 'AirlineRegistered', (ev) => {
                return expect(ev.airline).to.deep.equal(accounts[2]) && expect(Number(ev.votes)).to.equal(Number(1));
            });

            tx = await contractInstance.fundAirline({from: accounts[2], value: tenEther});
            truffleAssert.eventEmitted(tx, 'AirlineFunded', (ev) => {
                return expect(ev.airline).to.deep.equal(accounts[2]) && expect(Number(ev.value)).to.deep.equal(Number(tenEther));
            });

            // Register 4th airline
            tx = await contractInstance.registerAirline(accounts[3], web3.utils.utf8ToHex(fourthAirline),{from: accounts[2]});
            truffleAssert.eventEmitted(tx, 'AirlineRegistered', (ev) => {
                return expect(ev.airline).to.deep.equal(accounts[3]) && expect(Number(ev.votes)).to.equal(Number(1));
            });

            tx = await contractInstance.fundAirline({from: accounts[3], value: tenEther});
            truffleAssert.eventEmitted(tx, 'AirlineFunded', (ev) => {
                return expect(ev.airline).to.deep.equal(accounts[3]) && expect(Number(ev.value)).to.deep.equal(Number(tenEther));
            });

            // 5th airline would need a consensus of min 2 airlines
            tx = await contractInstance.registerAirline(accounts[4], web3.utils.utf8ToHex(fifthAirline),{from: owner});
            truffleAssert.eventNotEmitted(tx, 'AirlineRegistered');
            await expectToRevert(contractInstance.fundAirline({from: accounts[4], value: tenEther}), 'Caller is not a registered airline');

            tx = await contractInstance.registerAirline(accounts[4], web3.utils.utf8ToHex(fifthAirline),{from: accounts[3]});
            truffleAssert.eventEmitted(tx, 'AirlineRegistered', (ev) => {
                return expect(ev.airline).to.deep.equal(accounts[4]) && expect(Number(ev.votes)).to.equal(Number(2));
            });

            tx = await contractInstance.fundAirline({from: accounts[4], value: tenEther});
            truffleAssert.eventEmitted(tx, 'AirlineFunded', (ev) => {
                return expect(ev.airline).to.deep.equal(accounts[4]) && expect(Number(ev.value)).to.deep.equal(Number(tenEther));
            });    

        });

        it('(multi-party consensus) should allow new voted airlines to participate in contract and increase min voters', async() => {
            //5 validated airlines so a consensus of 3 is required
            // Register 6th airline
            let tx = await contractInstance.registerAirline(accounts[5], web3.utils.utf8ToHex('SixthAirline'),{from: accounts[2]});
            truffleAssert.eventNotEmitted(tx, 'AirlineRegistered');
            await expectToRevert(contractInstance.fundAirline({from: accounts[5], value: tenEther}), 'Caller is not a registered airline');
           
           
            tx = await contractInstance.registerAirline(accounts[5], web3.utils.utf8ToHex('SixthAirline'),{from: accounts[3]});
            truffleAssert.eventNotEmitted(tx, 'AirlineRegistered');
            await expectToRevert(contractInstance.fundAirline({from: accounts[5], value: tenEther}), 'Caller is not a registered airline');

            //Attempt to simulate that multi-party doesn't count twice the same caller
            tx = await contractInstance.registerAirline(accounts[5], web3.utils.utf8ToHex('SixthAirline'), {from: accounts[3]});
            truffleAssert.eventNotEmitted(tx, 'AirlineRegistered');
            await expectToRevert(contractInstance.fundAirline({from: accounts[5], value: tenEther}), 'Caller is not a registered airline');

            //finally the 3rd valid caller will cause the 6th airline to be registered
            tx = await contractInstance.registerAirline(accounts[5], web3.utils.utf8ToHex('SixthAirline'), {from: accounts[4]});
            truffleAssert.eventEmitted(tx, 'AirlineRegistered', (ev) => {
                return expect(ev.airline).to.deep.equal(accounts[5]) && expect(Number(ev.votes)).to.equal(Number(3));
            });

            tx = await contractInstance.fundAirline({from: accounts[5], value: tenEther});
            truffleAssert.eventEmitted(tx, 'AirlineFunded', (ev) => {
                return expect(ev.airline).to.deep.equal(accounts[5]) && expect(Number(ev.value)).to.deep.equal(Number(tenEther));
            });    
        });

        it('should NOT allow validated airlines to registerAirline if contract is paused', async() => {
            await contractInstance.setOperatingStatus(false, {from: owner});
            await expectToRevert(contractInstance.registerAirline(accounts[7], web3.utils.utf8ToHex(secondAirline), {from: owner}), 'Contract is currently not operational');
        }); 
    });
    
    //further test for airlines to register flights
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