const expect = require('chai').expect;
const truffleAssert = require('truffle-assertions');

const contractDefinition = artifacts.require('FlightSuretyData');

contract('FlightSuretyData', accounts => {
    const firstAirline = 'Lufthansa';
    const appContractAddress = accounts[9];
    let contractInstance;
    const owner = accounts[0];
    const flightNumber = web3.utils.utf8ToHex('LT3214');
    const oneEther = web3.utils.toWei('1', 'ether');
    const oneAndAHalfEther = web3.utils.toWei('1.5', 'ether');
    const twoEther = web3.utils.toWei('2', 'ether');
    const threeEther = web3.utils.toWei('3', 'ether');
    const tenEther = web3.utils.toWei('10', 'ether');
    const eightAndAHalfEther = web3.utils.toWei('8.5', 'ether');
    const zeroAddress = '0x0000000000000000000000000000000000000000';

    describe ('Test suite: isContractOperational', () => {
        before(async() => {
            contractInstance = await contractDefinition.new(web3.utils.utf8ToHex(firstAirline), {from:owner});
        });

        it('should NOT allow unauthorized users to query isContractOperational', async() => {
            await expectToRevert(contractInstance.isContractOperational.call({from: appContractAddress}), 'Caller is not authorized');
        });

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
            expect(airline[2]).to.be.false;
        });

        it('should allow authorizedContracts to pause the contract', async() => {
            let isOperational = await contractInstance.isContractOperational.call({from: appContractAddress});
            expect(isOperational).to.be.true;
            await contractInstance.setOperatingStatus(false, {from: appContractAddress});
            isOperational = await contractInstance.isContractOperational.call({from: appContractAddress});
            expect(isOperational).to.be.false;
        });
    });

    describe('Test suite: registerAirline and getNumberOfAirlines', () => {
        before(async() => {
            contractInstance = await contractDefinition.new(web3.utils.utf8ToHex(firstAirline), {from:owner});
            await contractInstance.authorizeContract(appContractAddress, {from: owner});
        });
        
        it('should NOT allow unauthorized user/address to registerAirline', async () => {
            await expectToRevert(contractInstance.registerAirline(accounts[1], web3.utils.utf8ToHex('Air Pacific'), {from: owner}), 'Caller is not authorized');
        });
        
        it('should allow authorizedContract to registerAirline and set register true and validated not', async () => {
            let numberOfAirlines = await contractInstance.getNumberOfAirlines.call({from: appContractAddress});
            expect(Number(numberOfAirlines)).to.equal(1);
            
            await contractInstance.registerAirline(accounts[1], web3.utils.utf8ToHex('Air Pacific'), {from: appContractAddress});
            
            numberOfAirlines = await contractInstance.getNumberOfAirlines.call({from: appContractAddress});
            expect(Number(numberOfAirlines)).to.equal(2);

            let airline = await contractInstance.getAirline.call(accounts[1], {from: appContractAddress});
            expect(web3.utils.hexToUtf8(airline[0])).to.equal('Air Pacific');
            expect(airline[1]).to.be.true;
            expect(airline[2]).to.be.false;
        });
        
        it('should NOT allow authorizedContract to registerAirline if contract is paused', async () => {
            await contractInstance.setOperatingStatus(false, {from: appContractAddress});
            await expectToRevert(contractInstance.registerAirline(accounts[2], web3.utils.utf8ToHex('WizzAir'), {from: appContractAddress}), 'Contract is currently not operational');
        });
    });

    describe('Test suite: validateAirline', async() => {
        before(async() => {
            contractInstance = await contractDefinition.new(web3.utils.utf8ToHex(firstAirline), {from:owner});
            await contractInstance.authorizeContract(appContractAddress, {from: owner});
        });

        it('should NOT allow unauthorized user/address to validateAirline', async() => {
            await expectToRevert(contractInstance.validateAirline(accounts[1], {from: owner}), 'Caller is not authorized');
        });
                
        it('should allow authorizedContract to validateAirline and verify this', async () => {
            await contractInstance.validateAirline(accounts[2], {from: appContractAddress});
            let airline = await contractInstance.getAirline.call(accounts[2], {from: appContractAddress});
            expect(web3.utils.hexToUtf8(airline[0])).to.equal('');
            expect(airline[1]).to.be.false;
            expect(airline[2]).to.be.true;
        });

        it('should NOT allow authorizedContract to validateAirline if contract is paused', async () => {
            await contractInstance.setOperatingStatus(false, {from: appContractAddress});
            await expectToRevert(contractInstance.validateAirline(accounts[2], {from: appContractAddress}), 'Contract is currently not operational');
        });
    });

    describe('Test suite: getFlightDetails', () => {
        
        const flightNumber = web3.utils.utf8ToHex('LT3214');
        
        before(async() => {
            contractInstance = await contractDefinition.new(web3.utils.utf8ToHex(firstAirline), {from:owner});
            await contractInstance.authorizeContract(appContractAddress, {from: owner});
        });
        
        it('should NOT allow unauthorized user/address to getFlightDetails', async() => {
            await expectToRevert(contractInstance.getFlightDetails(flightNumber, {from: owner}), 'Caller is not authorized');
        });

        it('should return empty values if the flight does not exist', async() => {
            let flight =  await contractInstance.getFlightDetails(flightNumber, {from: appContractAddress});
            expectFlightToHaveProperties(flight, zeroAddress, '', 0, 0);
        });

        it('should NOT allow authorizedContract to getFlightDetails if contract is paused', async () => {
            await contractInstance.setOperatingStatus(false, {from: appContractAddress});
            await expectToRevert(contractInstance.getFlightDetails(flightNumber, {from: appContractAddress}), 'Contract is currently not operational');
        });
    });

    describe('Test suite: registerFlight', () =>{
        const flightNumber = web3.utils.utf8ToHex('LT3214');
        
        before(async() => {
            contractInstance = await contractDefinition.new(web3.utils.utf8ToHex(firstAirline), {from:owner});
            await contractInstance.authorizeContract(appContractAddress, {from: owner});
        });

        it('should NOT allow unauthorized user/address to registerFlight', async() => {
            await expectToRevert(contractInstance.registerFlight(accounts[1], flightNumber, 1122334455, 20, {from: owner}), 'Caller is not authorized');
        });

        it('should allow authorizedContract to registerFlight and verify this', async() => {
            await contractInstance.registerFlight(accounts[1], flightNumber, 1122334455, 20, {from: appContractAddress});
            let flight = await contractInstance.getFlightDetails(flightNumber, {from: appContractAddress});
            expectFlightToHaveProperties(flight, accounts[1], 'LT3214', 1122334455, 20);
        });

        it('should NOT allow authorizedContract to registerFlight if contract is paused', async () => {
            await contractInstance.setOperatingStatus(false, {from: appContractAddress});
            await expectToRevert(contractInstance.registerFlight(accounts[1], flightNumber, 1122334455, 20, {from: appContractAddress}), 'Contract is currently not operational');
        });
    });

    describe('Test suite: setFlightStatus', () => {
        const flightNumber = web3.utils.utf8ToHex('LT3214');

        before(async() => {
            contractInstance = await contractDefinition.new(web3.utils.utf8ToHex(firstAirline), {from:owner});
            await contractInstance.authorizeContract(appContractAddress, {from: owner});
            await contractInstance.registerFlight(accounts[1], flightNumber, 1122334455, 20, {from: appContractAddress});
        });

        it('should NOT allow unauthorized user/address to setFlightStatus', async() => {
            await expectToRevert(contractInstance.setFlightStatus(flightNumber, 30, {from: owner}), 'Caller is not authorized');
        });

        it('should allow authorizedContract to setFlightStatus and verify this', async() => {
            let flight = await contractInstance.getFlightDetails(flightNumber, {from: appContractAddress});
            expect(Number(flight[3])).to.equal(20);
            
            await contractInstance.setFlightStatus(flight[4], 30, {from: appContractAddress});
            flight = await contractInstance.getFlightDetails(flightNumber, {from: appContractAddress});
            expect(Number(flight[3])).to.equal(30);
        });

        it('should NOT allow authorizedContract to setFlightStatus if contract is paused', async () => {
            await contractInstance.setOperatingStatus(false, {from: appContractAddress});
            await expectToRevert(contractInstance.setFlightStatus(flightNumber, 30, {from: appContractAddress}), 'Contract is currently not operational');
        });


    });

    describe('Test suite: getAllFlights', () => {
        before(async() => {
            contractInstance = await contractDefinition.new(web3.utils.utf8ToHex(firstAirline), {from:owner});
            await contractInstance.authorizeContract(appContractAddress, {from: owner});
        });

        const airlines = [accounts[1], accounts[2], accounts[3]];
        const flightNumbers = ['LT1111','LT2222','LT3333'];
        const timestamps = [11111111, 11112222, 11113333];
        const statusCodes = [20, 30, 40];

        it('should NOT allow unauthorized user/address to getAllFlights', async() => {
            await expectToRevert(contractInstance.getAllFlights.call({from: owner}),'Caller is not authorized');
        });

        it('should allow authorizedContract to getAllFlights and return nothing if no flights registered', async() => {
            let noFlight = await contractInstance.getAllFlights.call({from: appContractAddress});
            expect(noFlight).to.be.empty;
        });

        it('should allow authorizedContract to getAllFlights and return a single flightNumber if one flight is registered', async() => {
            await contractInstance.registerFlight(airlines[0], web3.utils.utf8ToHex(flightNumbers[0]), timestamps[0], statusCodes[0], {from: appContractAddress});
            
            let flights = await contractInstance.getAllFlights.call({from: appContractAddress});
            expect(flights).to.have.lengthOf(1);
            expect(web3.utils.hexToUtf8(flights[0])).to.equal(flightNumbers[0]);

            let flight = await contractInstance.getFlightDetails(flights[0], {from: appContractAddress});
            expectFlightToHaveProperties(flight, airlines[0], flightNumbers[0], timestamps[0], statusCodes[0]);
        });

        it('should allow authorizedContract to getAllFlights and return a list of flightNumbers', async() => {
            await contractInstance.registerFlight(airlines[1], web3.utils.utf8ToHex(flightNumbers[1]), timestamps[1], statusCodes[1], {from: appContractAddress});
            await contractInstance.registerFlight(airlines[2], web3.utils.utf8ToHex(flightNumbers[2]), timestamps[2], statusCodes[2], {from: appContractAddress});
            
            let flights = await contractInstance.getAllFlights.call({from: appContractAddress});
            expect(flights).to.have.lengthOf(3);
            expect(flightNumbers).to.include.members([web3.utils.hexToUtf8(flights[0]), web3.utils.hexToUtf8(flights[1]), web3.utils.hexToUtf8(flights[2])]);
        });
        
        it('should NOT allow authorizedContract to getAllFlights if contract is paused', async () => {
            await contractInstance.setOperatingStatus(false, {from: appContractAddress});
            await expectToRevert(contractInstance.getAllFlights.call({from: appContractAddress}), 'Contract is currently not operational');
        });
    });

    describe('Test suite: fundAirline and getBalanceOfAirline', () => {

        let tenEther = web3.utils.toWei('10', 'ether');
        let twentyEther = web3.utils.toWei('20', 'ether');

        before(async() => {
            contractInstance = await contractDefinition.new(web3.utils.utf8ToHex(firstAirline), {from:owner});
            await contractInstance.authorizeContract(appContractAddress, {from: owner});
        });

        it('should NOT allow unauthorized user/address to fundAirline OR getBalanceOfAirline', async() => {
            await expectToRevert(contractInstance.getBalanceOfAirline.call(accounts[1], {from: owner}), 'Caller is not authorized');
            await expectToRevert(contractInstance.fundAirline(accounts[1], tenEther, {from: owner}), 'Caller is not authorized');
        });

        it('should return 0 if airline does not exist', async() => {
            let balance = await contractInstance.getBalanceOfAirline.call(accounts[1], {from: appContractAddress});
            expect(Number(balance)).to.equal(0);
        });

        it('should return 0 if airline exists but has no balance', async() => {
            await contractInstance.registerAirline(accounts[1], web3.utils.utf8ToHex('Air Pacific'), {from: appContractAddress});
            const balance = await contractInstance.getBalanceOfAirline.call(accounts[1], {from: appContractAddress});
            expect(Number(balance)).to.equal(0);
        });

        it('should allow authorizedContract to fundAirline and return the getBalanceOfAirline', async() => {
            await contractInstance.fundAirline(accounts[0], tenEther, {from: appContractAddress});
            await contractInstance.fundAirline(accounts[1], twentyEther, {from: appContractAddress});

            let balance = await contractInstance.getBalanceOfAirline.call(accounts[0], {from: appContractAddress}); 
            expect(Number(balance)).to.equal(Number(tenEther));
            balance = await contractInstance.getBalanceOfAirline.call(accounts[1], {from: appContractAddress}); 
            expect(Number(balance)).to.equal(Number(twentyEther));
        });

        it('should NOT allow authorizedContract to fundAirline OR getBalanceOfAirline if contract is paused', async() => {
            await contractInstance.setOperatingStatus(false, {from: appContractAddress});
            await expectToRevert(contractInstance.getBalanceOfAirline.call(accounts[1], {from: appContractAddress}), 'Contract is currently not operational');
            await expectToRevert(contractInstance.fundAirline(accounts[1], tenEther, {from: appContractAddress}), 'Contract is currently not operational');
        });
    });

    describe('Test suite: getBalanceOfInsuree', () => {
        before(async() => {
            contractInstance = await contractDefinition.new(web3.utils.utf8ToHex(firstAirline), {from:owner});
            await contractInstance.authorizeContract(appContractAddress, {from: owner});
        });

        it('should NOT allow unauthorized user/address to getBalanceOfInsuree', async() => {
            await expectToRevert(contractInstance.getBalanceOfInsuree.call(accounts[1], {from: owner}), 'Caller is not authorized');

        });

        it('should return the balance of an insuree', async() => {
            let balance = await contractInstance.getBalanceOfInsuree.call(accounts[1], {from: appContractAddress});
            expect(Number(balance)).to.equal(0);
        });

        it('should NOT allow authorizedContract to getBalanceOfInsuree if contract is paused', async() => {
            await contractInstance.setOperatingStatus(false, {from: appContractAddress});
            await expectToRevert(contractInstance.getBalanceOfInsuree.call(accounts[1], {from: appContractAddress}), 'Contract is currently not operational');
        });

    });

    describe('Test suite: getInsuraceKeysForFlight', async() => {
        const flightNumber = web3.utils.utf8ToHex('LT3214');
        let flightKey;
        
        before(async() => {
            contractInstance = await contractDefinition.new(web3.utils.utf8ToHex(firstAirline), {from:owner});
            await contractInstance.authorizeContract(appContractAddress, {from: owner});
            await contractInstance.registerFlight(accounts[1], flightNumber, 1122334455, 20, {from: appContractAddress});
            flightKey = (await contractInstance.getFlightDetails(flightNumber, {from: appContractAddress}))[4];
        });

        it('should NOT allow unauthorized user/address to getInsuraceKeysForFlight', async() => {
            await expectToRevert(contractInstance.getInsuraceKeysForFlight.call(flightKey, {from: owner}), 'Caller is not authorized');
        });

        it('should return empty value if flight has no insurances', async() => {
            let insuranceKeys = await contractInstance.getInsuraceKeysForFlight.call(flightKey, {from: appContractAddress});
            expect(insuranceKeys).to.have.lengthOf(0);
        });

        it('should NOT allow authorizedContract to getInsuraceKeysForFlight if contract is paused', async() => {
            await contractInstance.setOperatingStatus(false, {from: appContractAddress});
            await expectToRevert(contractInstance.getInsuraceKeysForFlight.call(flightKey, {from: appContractAddress}), 'Contract is currently not operational');
        });
    });

    describe('Test suite: getInsuranceDetails', async() => {
        const flightNumber = web3.utils.utf8ToHex('LT3214');
        let flightKey;
        
        before(async() => {
            contractInstance = await contractDefinition.new(web3.utils.utf8ToHex(firstAirline), {from:owner});
            await contractInstance.authorizeContract(appContractAddress, {from: owner});
            await contractInstance.registerFlight(accounts[1], flightNumber, 1122334455, 20, {from: appContractAddress});
            flightKey = (await contractInstance.getFlightDetails(flightNumber, {from: appContractAddress}))[4];
        });

        it('should NOT allow unauthorized user/address to getInsuraceKeysForFlight', async() => {
            await expectToRevert(contractInstance.getInsuranceDetails.call(flightKey, {from: owner}), 'Caller is not authorized');
        });

        it('should return empty value if flight has no insurances', async() => {
            let insuranceDetails = await contractInstance.getInsuranceDetails.call(flightKey, {from: appContractAddress});
            expect(insuranceDetails[0]).to.equal('0x0000000000000000000000000000000000000000');
            expect(Number(insuranceDetails[1])).to.equal(0);
            expect(insuranceDetails[2]).to.be.false;
        });

        it('should NOT allow authorizedContract to getInsuraceKeysForFlight if contract is paused', async() => {
            await contractInstance.setOperatingStatus(false, {from: appContractAddress});
            await expectToRevert(contractInstance.getInsuraceKeysForFlight.call(flightKey, {from: appContractAddress}), 'Contract is currently not operational');
        });
    });

    describe('Test suite: buyInsurance', async() => {
        let flightKey;
        const flightNumber = web3.utils.utf8ToHex('LT3214');
        const oneEther = web3.utils.toWei('1', 'ether');
        before(async() => {
            contractInstance = await contractDefinition.new(web3.utils.utf8ToHex(firstAirline), {from:owner});
            await contractInstance.authorizeContract(appContractAddress, {from: owner});
            await contractInstance.registerFlight(accounts[0], flightNumber, 1122334455, 20, {from: appContractAddress});
            flightKey = (await contractInstance.getFlightDetails(flightNumber, {from: appContractAddress}))[4];
        });

        it('should NOT allow unauthorized user/address to buyInsurance', async() => {
            await expectToRevert(contractInstance.buyInsurance(flightKey, accounts[1], oneEther, {from: owner}), 'Caller is not authorized');
        });

        it('should allow authorizedContract to buyInsurance for a client & flight and update the insurance keys, details and balances', async() => {
            await contractInstance.buyInsurance(flightKey, accounts[1], oneEther, {from: appContractAddress});
            
            let insuranceKeys = await contractInstance.getInsuraceKeysForFlight.call(flightKey, {from: appContractAddress});
            expect(insuranceKeys).to.have.lengthOf(1);
            
            let insuranceDetails = await contractInstance.getInsuranceDetails.call(insuranceKeys[0], {from: appContractAddress});
            expect(insuranceDetails[0]).to.equal(accounts[1]);
            expect(Number(insuranceDetails[1])).to.equal(Number(oneEther));
            expect(insuranceDetails[2]).to.be.false;

            let airlineBalance =  await contractInstance.getBalanceOfAirline.call(accounts[0], {from: appContractAddress}); 
            expect(Number(airlineBalance)).to.equal(Number(oneEther));
        });
    
        it('should NOT allow authorizedContract to buyInsurance if contract is paused', async() => {
            await contractInstance.setOperatingStatus(false, {from: appContractAddress});
            await expectToRevert(contractInstance.buyInsurance(flightKey, accounts[2], oneEther, {from: appContractAddress}), 'Contract is currently not operational');
        });
    });

    describe('Test suite: creditInsurees and getEstimativeCreditingCost', () => {
        let flightKey;
        const thirteenEther = web3.utils.toWei('13', 'ether');
        const delta = 5; //1.5 X amount
        before(async() => {
            contractInstance = await contractDefinition.new(web3.utils.utf8ToHex(firstAirline), {from:owner});
            await contractInstance.authorizeContract(appContractAddress, {from: owner});
            await contractInstance.registerFlight(accounts[0], flightNumber, 1122334455, 20, {from: appContractAddress});
            await contractInstance.fundAirline(accounts[0], tenEther, {from: appContractAddress});
            flightKey = (await contractInstance.getFlightDetails(flightNumber, {from: appContractAddress}))[4];
        });

        it('should NOT allow unauthorized user/address to creditInsurees', async() => {
            await expectToRevert(contractInstance.creditInsurees(flightKey, 5, {from: owner}), 'Caller is not authorized');
        });

        it('should credit all insurees for the given flight and verify this', async() => {
            await contractInstance.buyInsurance(flightKey, accounts[1], oneEther, {from: appContractAddress});
            await contractInstance.buyInsurance(flightKey, accounts[2], twoEther, {from: appContractAddress});

            let insuranceKeys = await contractInstance.getInsuraceKeysForFlight.call(flightKey, {from: appContractAddress});
            expect(insuranceKeys).to.have.lengthOf(2);

            //Verify balances before creditInsurees: [Client1, Client2, Airline] -> [0,0, 13];
            let airlineBalance = await contractInstance.getBalanceOfAirline.call(accounts[0], {from: appContractAddress}); 
            expect(Number(airlineBalance)).to.equal(Number(thirteenEther));

            let balanceOne = await contractInstance.getBalanceOfInsuree.call(accounts[1], {from: appContractAddress});
            expect(Number(balanceOne)).to.equal(0);
            let balanceTwo = await contractInstance.getBalanceOfInsuree.call(accounts[2], {from: appContractAddress});
            expect(Number(balanceTwo)).to.equal(0);

            let estimativeCredit = await contractInstance.getEstimativeCreditingCost(flightKey, {from: appContractAddress});
            expect(Number(estimativeCredit)).to.equal(Number(web3.utils.toWei('3', 'ether')));

            await contractInstance.creditInsurees(flightKey, delta, {from: appContractAddress});

            //Verify balances after creditInsurees: [Client1, Client2, Airline] -> [1.5, 3, 8.5];
            balanceOne = await contractInstance.getBalanceOfInsuree.call(accounts[1], {from: appContractAddress});
            expect(Number(balanceOne)).to.equal(Number(oneAndAHalfEther));
            balanceTwo = await contractInstance.getBalanceOfInsuree.call(accounts[2], {from: appContractAddress});
            expect(Number(balanceTwo)).to.equal(Number(threeEther));

            airlineBalance = await contractInstance.getBalanceOfAirline.call(accounts[0], {from: appContractAddress}); 
            expect(Number(airlineBalance)).to.equal(Number(eightAndAHalfEther));

            estimativeCredit = await contractInstance.getEstimativeCreditingCost(flightKey, {from: appContractAddress});
            expect(Number(estimativeCredit)).to.equal(0);
        });

        it('should NOT credit TWICE all insurees for the given flight', async() =>{
            await contractInstance.creditInsurees(flightKey, delta, {from: appContractAddress});
            
            let balanceOne = await contractInstance.getBalanceOfInsuree.call(accounts[1], {from: appContractAddress});
            expect(Number(balanceOne)).to.equal(Number(oneAndAHalfEther));
            let balanceTwo = await contractInstance.getBalanceOfInsuree.call(accounts[2], {from: appContractAddress});
            expect(Number(balanceTwo)).to.equal(Number(threeEther));

            let airlineBalance = await contractInstance.getBalanceOfAirline.call(accounts[0], {from: appContractAddress}); 
            expect(Number(airlineBalance)).to.equal(Number(eightAndAHalfEther));
        });

        it('should NOT allow authorizedContract to creditInsurees if contract is paused', async() => {
            await contractInstance.setOperatingStatus(false, {from: appContractAddress});
            await expectToRevert(contractInstance.creditInsurees(flightKey, 5, {from: appContractAddress}), 'Contract is currently not operational');
        });
    });

    describe('Test suite: pay', () => {
        let flightKey;
        const delta = 5; //1.5 X amount
        before(async() => {
            contractInstance = await contractDefinition.new(web3.utils.utf8ToHex(firstAirline), {from:owner});
            await contractInstance.authorizeContract(appContractAddress, {from: owner});
            await contractInstance.registerFlight(accounts[0], flightNumber, 1122334455, 20, {from: appContractAddress});
            flightKey = (await contractInstance.getFlightDetails(flightNumber, {from: appContractAddress}))[4];
        });

        it('should NOT allow unauthorized user/address to pay', async() => {
            await expectToRevert(contractInstance.pay(accounts[1], 5, {from: owner}), 'Caller is not authorized');
        });

        it('should NOT pay if contract does not have enough funds', async() => {
            await expectToRevert(contractInstance.pay(accounts[1], threeEther, {from: appContractAddress}), 
                                'There are no enough funds available on the contract to pay the insuree');
        });

        it('should NOT pay if insuree does not have enough balance', async() => {
            await contractInstance.fundAirline(accounts[0], tenEther, {from: appContractAddress});
            
            //simulate that appcontract has sent some ether on the data contract
            await contractInstance.sendTransaction({from: owner, value:tenEther});
            await expectToRevert(contractInstance.pay(accounts[1], threeEther, {from: appContractAddress}), 
                                'The desired amount exceedes insuree balance');
        });

        it('should allow authorizedContract to pay/transfer ether to the customer and deduct from insuree Balance', async() => {
            await contractInstance.buyInsurance(flightKey, accounts[2], twoEther, {from: appContractAddress});
            
            
            let insureeContractBalance = await contractInstance.getBalanceOfInsuree.call(accounts[2], {from: appContractAddress});
            expect(Number(insureeContractBalance)).to.equal(0);
            
            await contractInstance.creditInsurees(flightKey, delta, {from: appContractAddress});
            insureeContractBalance = await contractInstance.getBalanceOfInsuree.call(accounts[2], {from: appContractAddress});
            expect(Number(insureeContractBalance)).to.equal(Number(threeEther));

            let insureeWalletBalanceBefore = await web3.eth.getBalance(accounts[2]);
            let contractWalletBalanceBefore = await web3.eth.getBalance(contractInstance.address);
            await contractInstance.pay(accounts[2], threeEther, {from: appContractAddress});

            let insureeWalletBalanceAfter = await web3.eth.getBalance(accounts[2]);
            let contractWalletBalanceAfter = await web3.eth.getBalance(contractInstance.address);

            let maxGasDifference = web3.utils.toWei('2.8', 'ether');
            expect(Number(insureeWalletBalanceAfter) - Number(insureeWalletBalanceBefore)).to.be.within(Number(maxGasDifference), Number(threeEther));
            expect(Number(contractWalletBalanceBefore) - Number(contractWalletBalanceAfter)).to.be.within(Number(maxGasDifference), Number(threeEther));
        });

        it('should NOT allow authorizedContract to pay if contract is paused', async() => {
            await contractInstance.setOperatingStatus(false, {from: appContractAddress});
            await expectToRevert(contractInstance.pay(accounts[1], 5, {from: appContractAddress}), 'Contract is currently not operational');
        });
    });

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