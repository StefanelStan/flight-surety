App = {
    web3Provider: null,
    contracts: {},
    emptyAddress: "0x0000000000000000000000000000000000000000",
    sku: 0,
    upc: 0,
    metamaskAccountID: "0x0000000000000000000000000000000000000000",
    ownerID: "0x0000000000000000000000000000000000000000",
    miner: "0x0000000000000000000000000000000000000000",
    minerName: null,
    mineInformation: null,
    mineLatitude: null,
    mineLongitude: null,
    itemNotes: null,
    itemPrice: 0,
    productPrice: 0,
    manufacturer: "0x0000000000000000000000000000000000000000",
    retailer: "0x0000000000000000000000000000000000000000",
    customer: "0x0000000000000000000000000000000000000000",

    init: async () => {
        App.readForm();
        return await App.initWeb3();
        /// Setup access to blockchain
    },

    readForm: function () {
        App.sku = $("#sku").val();
        App.upc = $("#upc").val();
        App.ownerID = $("#ownerID").val();
        App.miner = $("#miner").val();
        App.minerName = $("#minerName").val();
        App.mineInformation = $("#mineInformation").val();
        App.mineLatitude = $("#mineLatitude").val();
        App.mineLongitude = $("#mineLongitude").val();
        App.itemNotes = $("#itemNotes").val();
        App.itemPrice = $("#itemPrice").val();
        App.productPrice = $("#productPrice").val();
        App.manufacturer = $("#manufacturer").val();
        App.masterjeweler = $("#masterjeweler").val();
        App.retailer = $("#retailer").val();
        App.customer = $("#customer").val();

        // console.log(
        //     App.sku,
        //     App.upc,
        //     App.ownerID, 
        //     App.miner, 
        //     App.minerName, 
        //     App.mineInformation, 
        //     App.mineLatitude, 
        //     App.mineLongitude, 
        //     App.itemNotes, 
        //     App.itemPrice, 
        //     App.manufacturer, 
        //     App.retailer, 
        //     App.customer
        // );
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

    initContracts: function () {
        /// Source the truffle compiled smart contracts
        var jsonAppContract ='../../build/contracts/FlightSuretyApp.json';
        var jsonDataContract ='../../build/contracts/FlightSuretyData.json';
        
        /// JSONfy the smart contracts
        $.getJSON(jsonAppContract, function(data) {
            //console.log('data', data);
            var ContractArtifact = data;
            App.contracts.AppContract = TruffleContract(ContractArtifact);
            App.contracts.AppContract.setProvider(App.web3Provider);
        });

        $.getJSON(jsonDataContract, function(data) {
            //console.log('data', data);
            var ContractArtifact = data;
            App.contracts.DataContract = TruffleContract(ContractArtifact);
            App.contracts.DataContract.setProvider(App.web3Provider);
        });
        return App.bindEvents();
    },

    bindEvents: function() {
        $(document).on('click', App.handleButtonClick);
        $(document).on('change', App.handleChange);
    },

    handleChange: async (event) => {
        if (event.target.id == "file-input") {
            const file = event.target.files[0];
            $('#selectedIpfsFile').val(file.name);
            console.log(file);
        }
    },

    handleButtonClick: async (event) => {
        App.getMetaskAccountID();
        
        App.readForm();
        var processId = parseInt($(event.target).data('id'));
        
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
                return await App.returnCutItem(event);
            case 10:
                return await App.receiveCutItem(event);
            case 11:
                return await App.markForPurchasing(event);
            case 12:
                return await App.sendItemForPurchasing(event);
            case 13:
                return await App.receiveItemForPurchasing(event);
            case 14:
                return await App.putUpForPurchasing(event);
            case 15:
                return await App.purchaseItem(event);
            case 16:
                return await App.fetchItem(event);
            case 17:
                return await App.fetchItemBufferOne(event);
            case 18:
                return await App.fetchItemBufferTwo(event);
            case 19:
                $('#file-input').click();
                break;
            case 20:
                return await App.readHash(event);
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

    receiveItemToCut: async (event) => {
        try {
            event.preventDefault();
            const instance = await App.contracts.SupplyChain.deployed();
            const result = await instance.receiveItemToCut(App.upc);
            console.log('receiveItemToCut', result);
        } catch(err) {
            console.log(err.message);
        };
    },
    
    cutItem: async (event) => {
        try {
            event.preventDefault();
            const instance = await App.contracts.SupplyChain.deployed();
            const result = await instance.cutItem(App.upc);
            console.log('cutItem', result);
        } catch(err) {
            console.log(err.message);
        };
    },
    
    returnCutItem: async (event) => {
        try {
            event.preventDefault();
            const instance = await App.contracts.SupplyChain.deployed();
            const result = await instance.returnCutItem(App.upc);
            console.log('returnCutItem', result);
        } catch(err) {
            console.log(err.message);
        };
    },
    
    receiveCutItem: async (event) => {
        try {
            event.preventDefault();
            const instance = await App.contracts.SupplyChain.deployed();
            const result = await instance.receiveCutItem(App.upc);
            console.log('receiveCutItem', result);
        } catch(err) {
            console.log(err.message);
        };
    },
    
    markForPurchasing: async (event) => {
        try {
            event.preventDefault();
            const instance = await App.contracts.SupplyChain.deployed();
            let productPrice = web3.toWei(App.productPrice, "ether");
            const result = await instance.markForPurchasing(App.upc, productPrice);
            console.log('markForPurchasing', result);
        } catch(err) {
            console.log(err.message);
        };
    },    

    sendItemForPurchasing: async (event) => {
        try {
            event.preventDefault();
            const instance = await App.contracts.SupplyChain.deployed();
            const result = await instance.sendItemForPurchasing(App.upc, App.retailer);
            console.log('sendItemForPurchasing', result);
        } catch(err) {
            console.log(err.message);
        };
    },
    
    receiveItemForPurchasing: async (event) => {
        try {
            event.preventDefault();
            const instance = await App.contracts.SupplyChain.deployed();
            const result = await instance.receiveItemForPurchasing(App.upc);
            console.log('receiveItemForPurchasing', result);
        } catch(err) {
            console.log(err.message);
        };
    },
    
    putUpForPurchasing: async (event) => {
        try {
            event.preventDefault();
            const instance = await App.contracts.SupplyChain.deployed();
            const result = await instance.putUpForPurchasing(App.upc);
            console.log('putUpForPurchasing', result);
        } catch(err) {
            console.log(err.message);
        };
    },

    purchaseItem: async (event) => {
        try {
            event.preventDefault();
            const instance = await App.contracts.SupplyChain.deployed();
            let value = Number(prompt("Please enter value to send in ether"));
            if (value > 0) {
                const walletValue = web3.toWei(value, "ether");
                const result = await instance.purchaseItem(App.upc, {value: walletValue});
                console.log('purchaseItem', result);
            }
        } catch(err) {
            console.log(err.message);
        };
    },

    fetchItem: async (event) => {
        try {
            event.preventDefault();
            const instance = await App.contracts.SupplyChain.deployed();
            const result = await instance.fetchItem(App.upc);
            console.log('fetchItem', result);
        } catch(err) {
            console.log(err.message);
        };
    },

    fetchItemBufferOne: async () => {
        App.upc = $('#upc').val();
        console.log('upc', App.upc);
        try {
            const instance = await App.contracts.SupplyChain.deployed();
            const result = await instance.fetchItemBufferOne.call(App.upc);
            App.consoleLogfetchItemBufferOne(result);
            App.updateFieldsBufferOne(result);
        } catch(err) {
          console.log(err.message);
        };
    },

    fetchItemBufferTwo: async () => {
        try {                
            const instance = await App.contracts.SupplyChain.deployed();
            let result = await instance.fetchItemBufferTwo.call(App.upc);
            App.consoleLogfetchItemBufferTwo(result);
            App.updateFieldsBufferTwo(result);
        } catch(err) {
          console.log(err.message);
        };
    },

    fetchEvents: function () {
        if (typeof App.contracts.SupplyChain.currentProvider.sendAsync !== "function") {
            App.contracts.SupplyChain.currentProvider.sendAsync = function () {
                return App.contracts.SupplyChain.currentProvider.send.apply(
                App.contracts.SupplyChain.currentProvider,
                    arguments
              );
            };
        }

        App.contracts.SupplyChain.deployed().then(function(instance) {
        var events = instance.allEvents(function(err, log){
          if (!err)
            $("#ftc-events").append('<li>' + log.event + ' - ' + log.transactionHash + '</li>');
        });
        }).catch(function(err) {
          console.log(err.message);
        });
    },
    
    uploadHash: async(hash) => {
        try {
            const instance = await App.contracts.SupplyChain.deployed();
            const result = await instance.uploadHash(App.upc, hash);
            console.log('uploadHash', result);
        } catch(err) {
            console.log
            console.log(err.message);
        };
    },

    readHash: async(event) => {
        try {
            event.preventDefault();
            const instance = await App.contracts.SupplyChain.deployed();
            const result = await instance.readHash.call(App.upc);
            $('#selectedIpfsFile').val(result);
            console.log('readHash', result);
        } catch(err) {
            console.log(err.message);
        }
    },

    consoleLogfetchItemBufferOne: (result) => {
        console.log('sku:' + Number(result[0]));
        console.log('upc:' + Number(result[1]));
        console.log('owner:' + result[2]);
        console.log('miner:' + result[3]);
        console.log('minerName:' + result[4]);
        console.log('mineInformation:' + result[5]);
        console.log('mineLatitude:' + result[6]);
        console.log('mineLongitude:' + result[7]);
    },

    consoleLogfetchItemBufferTwo: (result) => {
        console.log('sku:' + Number(result[0]));
        console.log('upc:' + Number(result[1]));
        console.log('productID:' + Number(result[2]));
        console.log('itemNotes:' + result[3]);
        console.log('itemPrice:' + web3.fromWei(result[4], "ether"));
        console.log('productPrice:' + web3.fromWei(result[5], "ether"));
        console.log('itemState:' + Number(result[6]));
        console.log('manufacturer:' + result[7]);
        console.log('masterjeweler:' + result[8]);
        console.log('retailer:' + result[9]);
        console.log('customer:' + result[10]);
    },

    updateFieldsBufferOne: (result) => {
        $("#sku").val(Number(result[0]));
        $("#upc").val(Number(result[1]));
        $("#ownerID").val(result[2]);
        $("#miner").val(result[3]);
        $("#minerName").val(result[4]);
        $("#mineInformation").val(result[5]);
        $("#mineLatitude").val(result[6]);
        $("#mineLongitude").val(result[7]);
    },

    updateFieldsBufferTwo: (result) => {
        $("#sku").val(Number(result[0]));
        $("#upc").val(Number(result[1]));
        $("#itemNotes").val(result[3]);
        $("#itemPrice").val(web3.fromWei(result[4], "ether"));
        $("#productPrice").val(web3.fromWei(result[5], "ether"));
        $("#manufacturer").val(result[7]);
        $("#masterjeweler").val(result[8]);
        $("#retailer").val(result[9]);
        $("#customer").val(result[10]);
    }
};

$(function () {
    $(window).load(function () {
        App.init();
    });
});
