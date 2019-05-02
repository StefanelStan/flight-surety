import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';


let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
let flightSuretyData = new web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
const oracles = new Map();
let accounts = [];
let flightNumber = web3.utils.fromAscii('LT3214');
// const registerInitialOracles = async() => {
//     let accounts = await web3.eth.getAccounts();
//     for (let i=5; i < 25; i++){
//         console.log(`Registering oracle ${accounts[i]}`);
//         let result = await flightSuretyApp.methods.registerOracle({from: accounts[i], value: web3.utils.toWei('1', 'ether'), gas: 250000}); 
//         console.log(result);
//     }
// };

const registerInitialOracles = async () => {
    try {
        accounts = await getAccounts();
        console.log(accounts);
        for (let i = 5; i < 25; i++) {
            await registerOracle(accounts[i]);
            //console.log(`Registered ${accounts[i]} & tx=${tx}`);
            let indexes = await getOracleIndexes(accounts[i]);
            oracles.set(accounts[i], indexes);
            console.log(`Oracle number ${i - 5} - ${accounts[i]} has indexes =  ${indexes}`);
        }
        await authorizeAppContract();
        await fundAirline();
        await registerFlight();
        await fetchFlightStatus(); 
    } catch (error){
        console.log('Unable to registerInitialOracles because' + error.message);
    };
};

const submitOracleResponses = async(event) =>{
    try {
        const oraclesByIndex = getOraclesByIndex(event.returnValues.index);
        oraclesByIndex.forEach(async(oracleAddress) => {
            await submitOracleResponse(oracleAddress, event.returnValues.index, event.returnValues.airline, event.returnValues.flightNumber, event.returnValues.timestamp);
        });
    } catch(error){
        console.log('Unable to submitOracleResponses due to ' + error.message);
    }    
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


const submitOracleResponse = (address, index, airline, flightNumber, timestamp) => {
    return new Promise((resolve, reject) => {
        let status = getRandomStatusCode();
        flightSuretyApp.methods.submitOracleResponse(index, airline, flightNumber, timestamp, status)
            .send({from: address, gas: 500000}, 
                (error, result) => {
                    if(!error)
                        resolve(result);
                    else {
                        console.log('Unable to submit oracle response because ' + error.message);
                        reject(error);
                    }                
            });
    });
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

const getRandomStatusCode = () =>{
    let index = Math.floor(Math.random() * Math.floor(10));
    if (index < 5)
        return 20;
    return index+1;    
};

const registerOracle = (address) => {
    return new Promise((resolve, reject) => {
        flightSuretyApp.methods.registerOracle.send({from: address, value: web3.utils.toWei('1', 'ether'), gas: 3000000}, (error, result) => {
            if (error) {
                console.error('Error encountered while registering oracle  '+ address + 'because ' + error);
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
    else    
        console.log(event);
});

const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
});

registerInitialOracles();

export default app;


