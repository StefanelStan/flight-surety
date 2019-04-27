
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
    const flightNumberOne = web3.utils.utf8ToHex('LT3214');
    const flightNumberTwo = web3.utils.utf8ToHex('LT3224');
    const flightNumberThree = web3.utils.utf8ToHex('LT3234');
    const oneEther = web3.utils.toWei('1', 'ether');
    const oneAndAHalfEther = web3.utils.toWei('1.5', 'ether');
    const twoEther = web3.utils.toWei('2', 'ether');
    const threeEther = web3.utils.toWei('3', 'ether');
    const tenEther = web3.utils.toWei('10', 'ether');
    const twelveEther = web3.utils.toWei('12', 'ether');
    const eightAndAHalfEther = web3.utils.toWei('8.5', 'ether');
    const zeroAddress = '0x0000000000000000000000000000000000000000';
/*
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
            // 5 validated airlines so a consensus of 3 is required
            // Register 6th airline by making accounts[2,3,4] to vouch for accounts[5] as new airline.
            let tx = await contractInstance.registerAirline(accounts[5], web3.utils.utf8ToHex('SixthAirline'),{from: accounts[2]});
            truffleAssert.eventNotEmitted(tx, 'AirlineRegistered');
            // as airline is not registered - accepted, it cannot fund itself
            await expectToRevert(contractInstance.fundAirline({from: accounts[5], value: tenEther}), 'Caller is not a registered airline');
           
            tx = await contractInstance.registerAirline(accounts[5], web3.utils.utf8ToHex('SixthAirline'),{from: accounts[3]});
            truffleAssert.eventNotEmitted(tx, 'AirlineRegistered');
            await expectToRevert(contractInstance.fundAirline({from: accounts[5], value: tenEther}), 'Caller is not a registered airline');

            //Attempt to simulate that multi-party doesn't count the same caller twice 
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
    
    describe('Test suite: getFlightDetails', () => {
        let dataContract;
        before(async() => {
            dataContract = await dataContractDefinition.new(web3.utils.utf8ToHex(firstAirline), {from:owner});
            contractInstance = await appContractDefinition.new(dataContract.address, {from:owner});
            await dataContract.authorizeContract(contractInstance.address, {from: owner});
            await dataContract.authorizeContract(owner, {from: owner});
        });

        it('should return empty values if the flight does not exist', async() => {
            const flight = await contractInstance.getFlightDetails.call(flightNumberOne, {from: accounts[1]});
            expectFlightToHaveProperties(flight, zeroAddress, '', 0, 0);
        });

        it('should return the correct values upon getFlightDetails', async() => {
            await dataContract.registerFlight(accounts[0], flightNumberOne, 1122334455, 20, {from: owner});
            const flight = await contractInstance.getFlightDetails.call(flightNumberOne, {from: accounts[1]});
            expectFlightToHaveProperties(flight, owner, 'LT3214', 1122334455, 20);
        });

        it('should NOT allow to getFlightDetails if contract is paused', async() => {
            await contractInstance.setOperatingStatus(false, {from: owner});
            await expectToRevert(contractInstance.getFlightDetails.call(flightNumberOne, {from: owner}), 'Contract is currently not operational');
        });
    });

    describe('Test suite: registerFlight', () => {
        before(async() => {
            const dataContract = await dataContractDefinition.new(web3.utils.utf8ToHex(firstAirline), {from:owner});
            contractInstance = await appContractDefinition.new(dataContract.address, {from:owner});
            await dataContract.authorizeContract(contractInstance.address, {from: owner});
        });

        it('should NOT allow unauthorized users/airlines to registerFlight', async() => {
            await expectToRevert(contractInstance.registerFlight(flightNumberOne, 1122334455, {from: accounts[1]}), 'Caller is not a validated airline');
        });

        it('should NOT allow registered but unvalidated airlines to registerFlight', async() => {
            await expectToRevert(contractInstance.registerFlight(flightNumberOne, 1122334455, {from: owner}), 'Caller is not a validated airline');
        });

        it('should allow validated airlines to registerFlight and verify this', async() => {
            await contractInstance.fundAirline({from: owner, value:tenEther});
            
            await contractInstance.registerFlight(flightNumberOne, 1122334455, {from: owner});
            let flight = await contractInstance.getFlightDetails.call(flightNumberOne, {from: accounts[1]});
            expectFlightToHaveProperties(flight, owner, 'LT3214', 1122334455, 0);
        });

        it('should NOT allow to registerFlight an already existing flight number', async() => {
            await expectToRevert(contractInstance.registerFlight(flightNumberOne, 22334455, {from: owner}), 'Flight already registered');
        });
        
        it('should NOT allow a validated airline to registerFlight if contract is paused', async() => {
            await contractInstance.setOperatingStatus(false, {from: owner});
            await expectToRevert(contractInstance.registerFlight(flightNumberOne, 22334455, {from: owner}), 'Contract is currently not operational');
        });
    });

    // 25/04/2019 21:20 : continue with getAllFlights and then purchase flight insurance and credit insurance
    describe('Test suite: getAllFlights', () => {
        before(async() => {
            const dataContract = await dataContractDefinition.new(web3.utils.utf8ToHex(firstAirline), {from:owner});
            contractInstance = await appContractDefinition.new(dataContract.address, {from:owner});
            await dataContract.authorizeContract(contractInstance.address, {from: owner});
        });

        it('should return empty list if no flights are recorded', async() => {
            let flights = await contractInstance.getAllFlights.call({from: accounts[3]});
            expect(flights).to.have.lengthOf(0);
        });

        it('should return the list of existing registered flights and verify this', async() => {
            // register 3 airlines (one should be enought but I can also test multiple registrations)
            await contractInstance.fundAirline({from: owner, value:tenEther});
            await contractInstance.registerAirline(accounts[1], web3.utils.utf8ToHex(secondAirline),{from: owner});
            await contractInstance.fundAirline({from: accounts[1], value: tenEther});
            await contractInstance.registerAirline(accounts[2], web3.utils.utf8ToHex(thirdAirline),{from: accounts[1]});
            await contractInstance.fundAirline({from: accounts[2], value: tenEther});

            // register 3 flights from 3 different companies
            await contractInstance.registerFlight(flightNumberOne, 1122334455, {from: owner});
            await contractInstance.registerFlight(flightNumberTwo, 1122334466, {from: accounts[1]});
            await contractInstance.registerFlight(flightNumberThree, 1122334477, {from: accounts[2]});

            // get the list of flights //they should be in the same order as registration
            const flights = await await contractInstance.getAllFlights.call({from: accounts[3]});
            expect(flights).to.have.lengthOf(3);

            // verify each flight from the list
            const flightOne = await contractInstance.getFlightDetails.call(flights[0], {from: accounts[1]});
            expectFlightToHaveProperties(flightOne, owner, 'LT3214', 1122334455, 0);

            const flightTwo = await contractInstance.getFlightDetails.call(flights[1], {from: accounts[1]});
            expectFlightToHaveProperties(flightTwo, accounts[1], 'LT3224', 1122334466, 0);

            const flightThree = await contractInstance.getFlightDetails.call(flights[2], {from: accounts[7]});
            expectFlightToHaveProperties(flightThree, accounts[2], 'LT3234', 1122334477, 0);
        });

        it('should NOT return a list of flights if contract is paused', async() => {
            await contractInstance.setOperatingStatus(false, {from: owner});
            await expectToRevert(contractInstance.getAllFlights.call({from: owner}), 'Contract is currently not operational');
        });
    });
*/
    describe('Test suite: buyInsurance', () => {
        let flightKey;
        let dataContract;
        before(async() => {
            dataContract = await dataContractDefinition.new(web3.utils.utf8ToHex(firstAirline), {from:owner});
            contractInstance = await appContractDefinition.new(dataContract.address, {from:owner});
            await dataContract.authorizeContract(contractInstance.address, {from: owner});
            await dataContract.authorizeContract(owner, {from: owner});
        });

        it('should NOT allow to buyInsurance for an inexistent flight', async() => {
            await expectToRevert(contractInstance.buyInsurance(flightNumberOne, {from: accounts[1]}), 'Flight does not exist')    
        });

        it('should allow to buyInsurance for a registered flight, transfer the eth to dataContract, credit balance of airline and emit event', async() => {
            await contractInstance.fundAirline({from: owner, value:tenEther});
            await contractInstance.registerFlight(flightNumberOne, 1122334455, {from: owner});
            flightKey = (await dataContract.getFlightDetails.call(flightNumberOne, {from: owner}))[4];
            
            // record passenger, dataContract and airline (credited balance) before the purchase of insurance
            const passengerWalletBalanceBefore = await web3.eth.getBalance(accounts[2]);
            const dataContractWalletBalanceBefore = await web3.eth.getBalance(dataContract.address);
            const airlineBalanceBefore = await dataContract.getBalanceOfAirline(owner, {from: owner});

            //purchase the insurance and assert events and insurance has the correct properties
            let tx = await contractInstance.buyInsurance(flightNumberOne, {from: accounts[2], value: oneEther});
            truffleAssert.eventEmitted(tx, 'InsurancePurchased', (ev) => {
                return expect(ev.passenger).to.deep.equal(accounts[2]) 
                       && expect(web3.utils.hexToUtf8(ev.flightNumber)).to.equal('LT3214')
                       && expect(Number(ev.amount)).to.equal(Number(oneEther));
            });
            const insuranceKey = web3.utils.soliditySha3(accounts[2], flightKey, 0);
            const insuranceDetails = await dataContract.getInsuranceDetails(insuranceKey, {from: owner});
            expect(insuranceDetails[0]).to.equal(accounts[2]);
            expect(Number(insuranceDetails[1])).to.equal(Number(oneEther));
            expect(insuranceDetails[2]).to.be.false;

            // get the After balances and check if there is a 1 eth difference between them.
            const passengerWalletBalanceAfter = await web3.eth.getBalance(accounts[2]);
            const dataContractWalletBalanceAfter = await web3.eth.getBalance(dataContract.address);
            const airlineBalanceAfter = await dataContract.getBalanceOfAirline(owner, {from: owner});
            expect(Number(passengerWalletBalanceBefore) - Number(passengerWalletBalanceAfter)).to.be.above(Number(oneEther));
            expect(Number(dataContractWalletBalanceAfter) - Number(dataContractWalletBalanceBefore)).to.equal(Number(oneEther));
            expect(Number(airlineBalanceAfter) - Number(airlineBalanceBefore)).to.equal(Number(oneEther));
        });

        it('should NOT allow the same customer to buyInsurance for the same registered flight twice', async() => {
            await expectToRevert(contractInstance.buyInsurance(flightNumberOne, {from: accounts[2], value: oneEther}), 'Insurance exists already');
        });

        it('should NOT allow to buyInsurance if contract is paused', async() => {
            await contractInstance.setOperatingStatus(false, {from: owner});
            await expectToRevert(contractInstance.buyInsurance(flightNumberOne, {from: accounts[3], value: oneEther}), 'Contract is currently not operational');
        });

    });

    // 27/04/2019 21:32 continue with credit insuree (withdraw eth from customer) and an oracle mechanism 
    // This should have no effect if insuree has no balance. Also make sure you have a mechanism to protect the other airlines from draining
    // Also have to calculate delta for insurances percentages

});   

const expectToRevert = (promise, errorMessage) => {
    return truffleAssert.reverts(promise, errorMessage);
};

const expectFlightToHaveProperties = (flight, airlineAddress, flightNumber, timeStamp, statusCode) => {
    expect(flight[0]).to.equal(airlineAddress);
    expect(web3.utils.hexToUtf8(flight[1])).to.equal(flightNumber);
    expect(Number(flight[2])).to.equal(timeStamp);
    expect(Number(flight[3])).to.equal(statusCode);
};
