App = {
    web3Provider: null,
    contracts: {},
    
    init: async () => {
        return await App.initWeb3();
    },

    initWeb3: async () => {
        /// Find or Inject Web3 Provider
        /// Modern dapp browsers...
        if (window.ethereum) {
            App.web3Provider = window.ethereum;
            try {
                // Request account access
                await window.ethereum.enable();
            } catch (error) {
                // User denied account access...
                console.error("User denied account access");
            }
        }
        // Legacy dapp browsers...
        else if (window.web3) {
            App.web3Provider = window.web3.currentProvider;
        }
        // If no injected web3 instance is detected, fall back to Ganache
        else {
            App.web3Provider = new Web3.providers.HttpProvider('http://localhost:8545');
            console.log('Using localhost ganache as provider!');
        }

        App.getMetaskAccountID();

        return App.initContracts();
    },

    getMetaskAccountID: function () {
        web3 = new Web3(App.web3Provider);

        // Retrieving accounts
        web3.eth.getAccounts(function(err, res) {
            if (err) {
                console.log('Error:',err);
                return;
            }
            //console.log('getMetaskID:',res);
            App.metamaskAccountID = res[0];

        })
    },

    initContracts: async() => {
        /// Source the truffle compiled smart contracts
        var jsonAppContract ='../../build/contracts/FlightSuretyApp.json';
        var jsonDataContract ='../../build/contracts/FlightSuretyData.json';

        /// JSONfy the smart contracts
        $.getJSON(jsonDataContract, (data) => {
            //console.log('data', data);
            var ContractArtifact = data;
            App.contracts.DataContract = TruffleContract(ContractArtifact);
            App.contracts.DataContract.setProvider(App.web3Provider);
        });
        
        $.getJSON(jsonAppContract, (data) => {
            //console.log('data', data);
            var ContractArtifact = data;
            App.contracts.AppContract = TruffleContract(ContractArtifact);
            App.contracts.AppContract.setProvider(App.web3Provider);
            App.fetchEvents();
        });

        return App.bindEvents();
    },

    bindEvents: function() {
        $(document).on('click', App.handleButtonClick);
        $(document).on('change', App.handleChange);
    },

    handleChange: async (event) => {
        if (event.target.id == "flights") {
            return await App.getFlightDetailsForInsurance();
        } else if (event.target.id == "flightsOracles") {
            return await App.getFlightDetailsForWithdraw();
        }
    },

    getFlightDetailsForInsurance: async(event) => {
        let flightNumber = $("select#flights option:selected").text();
            try {
                const instance = await App.contracts.AppContract.deployed(); 
                let flightDetails = await instance.getFlightDetails(web3.fromUtf8(flightNumber));
                if (flightDetails && flightDetails.length > 0){
                    $("#flightCompany").val(flightDetails[0]);
                    $("#flightTimestamp").val(new Date(flightDetails[2]*1000));
                    $("#flightStatus").val(flightDetails[3]);
                } else {
                    console.log(`Unable to find the flight details for flight ${flightNumber}`);
                }
                console.log(`Successfully got the flight details for flight ${flightNumber} -> ${flightDetails}`);
            } catch (exception){
                console.log(`Unable to get the flight details for flight ${flightNumber} due to ${exception.message}`);
            }
    },

    getFlightDetailsForWithdraw: async(event) => {
        let flightNumber = $("select#flightsOracles option:selected").text();
        try {
            const instance = await App.contracts.AppContract.deployed(); 
            let flightDetails = await instance.getFlightDetails(web3.fromUtf8(flightNumber));
            let maxAmountToWithdraw = await instance.getBalanceOfInsuree();
            if (flightDetails && flightDetails.length > 0){
                $("#flightCompanyOracles").val(flightDetails[0]);
                $("#flightTimestampOracles").val(new Date(flightDetails[2]*1000));
                $("#flightStatusOracles").val(flightDetails[3]);
                $("#insuranceAmountToWithdraw").val(web3.fromWei(maxAmountToWithdraw, 'finney'));
            } else {
                console.log(`Unable to find the flight details for flight ${flightNumber}`);
            }
            console.log(`Successfully got the flight details for withdraw for flight ${flightNumber} -> ${flightDetails}`);
        } catch (exception){
            console.log(`Unable to get the flight details for flight ${flightNumber} due to ${exception.message}`);
        }
    },

    handleButtonClick: async (event) => {
        App.getMetaskAccountID();
        
        var processId = parseInt($(event.target).data('id'));
        if((event.target.id == "flights" && $('#flights > option').length == 1) 
            ||(event.target.id == "flightsOracles" && $('#flightsOracles > option').length == 1)){
                return $("#" + event.target.id + "").change();
            }
        switch (processId) {
            case 0:
                return await App.getAppContractAddress(event);
            case 1:
                return await App.getAppContractStatus(event);
            case 2:
                return await App.setAppContractStatus(event);
            case 3:
                return await App.getDataContractStatus(event)
            case 4:
                return await App.setDataContractStatus(event);
            case 5:
                return await App.authorizeAppContractToDataContract(event);
            case 6:
                return await App.registerAirline(event);
            case 7:
                return await App.fundAirline(event);
            case 8:
                return await App.registerFlight(event);
            case 9:
                return await App.getFlights(event);
            case 10:
                return await App.buyInsurance(event);
            case 11:
                return await App.fetchFlightStatus(event);
            case 12:
                return await App.withdraw(event);
        }
    },
    getAppContractAddress: async(event) => {
        try {
            event.preventDefault();
            const instance = await App.contracts.AppContract.deployed(); 
            const result = await instance.address;
            console.log('Get AppContract Address', result);
            $("#appAddress").val(result);
            $("#appAddress2").val(result);
        } catch(err) {
            console.log(err.message);
        };
    },

    getAppContractStatus: async (event) => {
        try {
            event.preventDefault();
            const instance = await App.contracts.AppContract.deployed(); 
            const result = await instance.isContractOperational();
            console.log('Get AppContract Status', result);
            if (result == true) 
                $("#appStatus_radio_2").prop("checked", true);
            else 
                $("#appStatus_radio_1").prop("checked", true); 
        } catch(err) {
            console.log(err);
        };
    },

    setAppContractStatus: async (event) => {
        try {
            event.preventDefault();
            const instance = await App.contracts.AppContract.deployed();
            const newOperatingStatus = $("input[name='appContractStatus']:checked").val();
            let newStatus = false;
            if(newOperatingStatus){
                if (newOperatingStatus === "operational")
                   newStatus = true;
                let result = await instance.setOperatingStatus(newStatus);
                console.log(`Set AppContract Status to + ${newOperatingStatus} -> ${result}`);
            } else {
                alert ('Please select the new status for the App Contract');
            }
        } catch(err) {
            console.log(err.message);
        };
    },

    getDataContractStatus: async (event) => {
        try {
            event.preventDefault();
            const instance = await App.contracts.DataContract.deployed(); 
            const result = await instance.isContractOperational();
            console.log('Get DataContract Status', result);
            if (result == true) 
                $("#dataStatus_radio_2").prop("checked", true);
            else 
                $("#dataStatus_radio_1").prop("checked", true); 
        } catch(err) {
            console.log(err);
        };
    },

    setDataContractStatus: async (event) => {
        try {
            event.preventDefault();
            const instance = await App.contracts.DataContract.deployed();
            const newOperatingStatus = $("input[name='dataContractStatus']:checked").val();
            let newStatus = false;
            if(newOperatingStatus){
                if (newOperatingStatus === "operational")
                    newStatus = true;
                let result = await instance.setOperatingStatus(newStatus);
                console.log(`Set DataContract Status to ${newOperatingStatus} -> ${result}`);
            } else {
                alert ('Please select the new status for the Data Contract');
            }
        } catch(err) {
            console.log(err.message);
        };
    },
    
    authorizeAppContractToDataContract: async (event) => {
        try {
            event.preventDefault();
            const instance = await App.contracts.DataContract.deployed();
            const appAddress = $("#appAddress2").val();
            if(!appAddress || appAddress === '0x0000000000000000000000000000000000000000')
                alert ('Please Get AppContract address or paste a valid address');
            else {
                await instance.authorizeContract(appAddress);
                console.log(`Succeesfully authorized AppContract ${appAddress} to DataContract`);
            }    
        } catch(err) {
            console.log(err.message);
        };
    },

    registerAirline: async (event) => {
        try {
            event.preventDefault();
            const instance = await App.contracts.AppContract.deployed();
            const newAirlineAddress = $("#newAirlineAddress").val();
            const newAirlineName = web3.fromAscii($("#newAirlineName").val());
            await instance.registerAirline(newAirlineAddress, newAirlineName);
            console.log(`Succeesfully registered or voted airline ${newAirlineAddress}`);
        } catch(err) {
            console.log(err.message);
        };
    },

    fundAirline: async (event) => {
        try {
            event.preventDefault();
            const instance = await App.contracts.AppContract.deployed();
            const amount = web3.toWei($("#fundAirlineFee").val(), 'ether');
            const result = await instance.fundAirline({value: amount});
            console.log('Successsfully funded airline');
        } catch(err) {
            console.log(err.message);
        };
    },
    
    registerFlight: async (event) => {
        try {
            event.preventDefault();
            const instance = await App.contracts.AppContract.deployed();
            const flightNumber = $("#newFlightNumber").val();
            const flightTimestamp = Number($("#newFlightTimestamp").val());
            if(flightNumber){
                const fNumber = web3.fromAscii(flightNumber);
                await instance.registerFlight(fNumber, flightTimestamp);
                console.log(`Successsfully registered flight number ${flightNumber} at time ${flightTimestamp}`);
            } else {
                alert('Please insert a flight number');
            }
        } catch(err) {
            console.log(err.message);
        };
    },

    getFlights: async (event) => {
       try {
            event.preventDefault();
            const instance = await App.contracts.AppContract.deployed();
            let flights = await instance.getAllFlights();
            if(flights && flights.length > 0){
                var option = '';
                let flightToUtf8;
                flights.forEach(flight => {
                    flightToUtf8 = web3.toUtf8(flight);
                    option += '<option value="'+ flightToUtf8 + '">' + flightToUtf8 + '</option>';
                });
                $("#flights").empty();
                $("#flights").append(option);
                $("#flights").val(web3.toUtf8(flights[0])).change();

                $("#flightsOracles").empty();
                $("#flightsOracles").append(option);
                $("#flightsOracles").val(web3.toUtf8(flights[0])).change();
            }
            console.log(`Successfully got a list of ${flights.length} flight(s)`);
        } catch(err) {
            console.log(err.message);
        };
    },
    
    buyInsurance: async (event) => {
        try {
            event.preventDefault();
            const instance = await App.contracts.AppContract.deployed();
            let flightNumber = $("select#flights option:selected").text();
            let amount = $("#insuranceAmount").val();
            if(flightNumber && amount){
                const amountInWei = web3.toWei(amount, 'finney');
                const flightNumberInHex = web3.fromAscii(flightNumber);
                await instance.buyInsurance(flightNumberInHex, {value: amountInWei});
                console.log(`Successsfully bought insurace worth ${amount} finney for flight number ${flightNumber}`);
            } else {
                alert('Please select a flight number and an insurance amount');
            }
        } catch(err) {
            console.log(err.message);
        };
    },

    fetchFlightStatus: async (event) => {
        try {
            event.preventDefault();
            const instance = await App.contracts.AppContract.deployed();
            let flightNumber = $("select#flightsOracles option:selected").text();
            if(flightNumber){
                const flightNumberInHex = web3.fromAscii(flightNumber);
                await instance.fetchFlightStatus(flightNumberInHex);
                console.log(`Successsfully sent the Fetch Flight Status command for flight ${flightNumber}`);
            } else {
                alert('Please select a flight number in order to fetch its status');
            }
        } catch(err) {
            console.log(err.message);
        };
    },

    withdraw: async (event) => {
        try {
            event.preventDefault();
            let amountToWithdraw = $("#insuranceAmountToWithdraw").val();
            if(amountToWithdraw && Number(amountToWithdraw) > 0){
                const instance = await App.contracts.AppContract.deployed();
                await instance.withdraw(web3.toWei(amountToWithdraw, 'finney'));
                console.log(`Successsfully sent the withdraw command`);
            } else {
                alert('Please input an amount of finney to withdraw');
            }
        } catch(err) {
            console.log(err.message);
        };
    },
    
    fetchEvents: async () => {
        if (typeof App.contracts.AppContract.currentProvider.sendAsync !== "function") {
            App.contracts.AppContract.currentProvider.sendAsync = function () {
                return App.contracts.AppContract.currentProvider.send.apply(App.contracts.AppContract.currentProvider, arguments);
            };
        }
        try {
            const instance = await App.contracts.AppContract.deployed();
            instance.allEvents((err, log) => {
                if (!err) {
                    App.handleEvent(log);
                }
            });
        } catch (err) {
            console.log(err.message);
        };
    },

    handleEvent: (log) =>{
        let eventLog = '';
        switch(log.event) {
            case "AirlineRegistered": 
                eventLog = `${log.event} : Airline ${log.args.airline} votes: ${log.args.votes}`;
                break;
            case "AirlineFunded":
                eventLog = `${log.event} : Airline ${log.args.airline} amount: ${web3.fromWei(log.args.value, 'ether')} ETH`;
                break;
            case "InsurancePurchased":
                eventLog = `${log.event} : Passenger ${log.args.passenger} flight number: ${web3.toUtf8(log.args.flightNumber)} amount: ${web3.fromWei(log.args.amount, 'finney')} FINNEY`;
                break;
            case "FlightStatusInfo":
                eventLog = `${log.event} : Airline ${log.args.airline} flight number: ${web3.toUtf8(log.args.flightNumber)} timeStamp: ${log.args.timestamp} status ${log.args.status}`;  
                break;
            case "OracleReport":
                eventLog = `${log.event} : Airline ${log.args.airline} flight number: ${web3.toUtf8(log.args.flightNumber)} timeStamp: ${log.args.timestamp} status ${log.args.status}`;  
                break;    
            case "OracleRequest":
                eventLog = `${log.event} : Index ${log.args.index} Airline: ${log.args.airline} flight number: ${web3.toUtf8(log.args.flightNumber)} timeStamp: ${log.args.timestamp}`;  
                break;
        }
        console.log(eventLog);
        $("#ftc-events").append('<li>' + eventLog + '</li>');
    }
};

$(function () {
    $(window).load(function () {
        App.init();
    });
});
