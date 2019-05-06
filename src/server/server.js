const FlightSuretyApp = require('../../build/contracts/FlightSuretyApp.json');
const FlightSuretyData = require('../../build/contracts/FlightSuretyData.json');
const Config = require('./config.json');
const Web3 = require('web3');
const express = require('express');


let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
let flightSuretyData = new web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
const oracles = new Map();
let accounts = [];
const statuses = [20, 0, 10, 30, 40, 50];

const registerInitialOracles = async () => {
    try {
        accounts = await getAccounts();
        for (let i = 10; i < 40; i++) {
            await registerOracle(accounts[i]);
            //console.log(`Registered ${accounts[i]} & tx=${tx}`);
            let indexes = await getOracleIndexes(accounts[i]);
            oracles.set(accounts[i], indexes);
            console.log(`Oracle number ${i - 10} - ${accounts[i]} has indexes =  ${indexes}`);
        }
        // await authorizeAppContract();
        // await fundAirline();
        // await registerFlight();
        // await fetchFlightStatus(); 
    } catch (error){
        console.log('Unable to register all 20 initial oracles. (Maybe oracle already exists?)');
    };
};

const getAccounts = () => {
    return new Promise((resolve, reject) => {
        web3.eth.getAccounts((error, result) => {
            if (error) {
                console.error('Error encountered while getting accounts');
                reject(error);
            } else {
              resolve(result);
            }
        });        
    });        
};

const registerOracle = (address) => {
    return new Promise((resolve, reject) => {
        flightSuretyApp.methods.registerOracle.send({from: address, value: web3.utils.toWei('1', 'ether'), gas: 3000000}, (error, result) => {
            if (error) {
                console.error('Error encountered while registering oracle  '+ address);
                reject(error)
            } else {
                resolve(result)
            }
        });
    });
};

const getOracleIndexes = (address) => {
    return new Promise((resolve, reject) => {
        flightSuretyApp.methods.getMyIndexes.call({from: address, gas: 500000}, (error, result) => {
            if(!error){
                resolve(result);
            } else {
                console.log('Error encountered while getOracleIndexes for   '+ address + 'because ' + error.message);
                reject(error);
            }    
        });
    });
};

const submitOracleResponses = async(event) =>{
    const oraclesByIndex = getOraclesByIndex(event.returnValues.index);
    oraclesByIndex.forEach(async(oracleAddress) => {
        try {
            await submitOracleResponse(oracleAddress, event.returnValues.index, event.returnValues.airline, event.returnValues.flightNumber, event.returnValues.timestamp);
        } catch(error){
            console.log('Unable to submitOracleResponse for Oracle Address ' + oracleAddress);
        }    
    });
};

const getOraclesByIndex = (desiredIndex) => {
    let matchingOracles = [];
    for (let [address, indexes] of oracles) {
        indexes.forEach(index => {
            if (index == desiredIndex) {
                matchingOracles.push(address);
                console.log(desiredIndex + '->' + address);
            }
        });
    }
    return matchingOracles;
};

const submitOracleResponse = (oracleAddress, index, airline, flightNumber, timestamp) => {
    return new Promise((resolve, reject) => {
        let statusCode = gerRandomFlightStatusCode();
        console.log(`Oracle ${oracleAddress} is submitting flight status code of ${statusCode}`);
        flightSuretyApp.methods.submitOracleResponse(index, airline, flightNumber, timestamp, statusCode)
            .send({from: oracleAddress, gas: 500000}, 
                (error, result) => {
                    if(!error)
                        resolve(result);
                    else {
                        console.log(`oracle ${oracleAddress} was rejected while submitting oracle response with status statusCode ${statusCode}`);
                        reject(error);
                    }                
            });
    });
};

const gerRandomFlightStatusCode = () =>{
    let index = Math.floor(Math.random() * Math.floor(10));
    if (index <= 7)
        return statuses[0];
    else {
        return statuses[Math.floor(Math.random() * Math.floor(5)) + 1];
    }    
};

const authorizeAppContract = () =>{
    return new Promise((resolve, reject) => {
        flightSuretyData.methods.authorizeContract(config.appAddress).send({from: accounts[0], gas: 300000}, (error, result) =>{
            if(error){
                console.log('Unable to authorize AppContract to use DataContract because of ' + error.message);
                reject(error)
            }
            else {
                resolve(result);
            }
        });
    });
};

const fundAirline = () =>{
    return new Promise((resolve, reject) => {
        flightSuretyApp.methods.fundAirline.send({from: accounts[0], value: web3.utils.toWei('10', 'ether'), gas: 500000}, (error, result) =>{
            if(error){
                console.log('Unable to fundAirline due to ' + error.message);
                reject(error);
            }
            else {
                resolve(result);
            }
        });
    });
};

const registerFlight = () =>{
    return new Promise((resolve, reject) => {
        flightSuretyApp.methods.registerFlight(flightNumber, 1122334455).send({from: accounts[0], gas: 500000}, (error, result) =>{
            if(error){
                console.log('Unable to registerFlight due to ' + error.message);
                reject(error);
            }
            else {
                resolve(result);
            }
        });
    });
};

const fetchFlightStatus = () =>{
    return new Promise((resolve, reject) => {
        flightSuretyApp.methods.fetchFlightStatus(flightNumber).send({from: accounts[0], gas: 500000}, (error, result) =>{
            if(error){
                console.log('Unable to fetchFlightStatus due to ' + error.message);
                reject(error);
            }
            else {
                resolve(result);
            }
        });
    });
};

flightSuretyApp.events.OracleRequest({fromBlock: 0}, (error, event) => {
    if (error) 
        console.log(error);
    else {    
        console.log('OracleRequest event received');
        submitOracleResponses(event);
    }
});

flightSuretyApp.events.OracleReport({fromBlock: 0}, (error, event) => {
    if (error) 
        console.log(error);
    else    
        console.log('OracleReport event received');
});

flightSuretyApp.events.FlightStatusInfo({fromBlock: 0}, (error, event) => {
    if (error) 
        console.log(error);
    else {
        console.log(`${event.event} Received with attributes : 
            airline ${event.returnValues.airline} 
            flightNumber ${web3.utils.toUtf8(event.returnValues.flightNumber)} 
            timeStamp ${Number(event.returnValues.timestamp)} 
            statusCode : ${event.returnValues.status}
        `);    
    }
});

const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
});

registerInitialOracles();

module.export = { 
    app
}


