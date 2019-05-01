import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';


let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);

const oracles = new Map();
let accounts = [];

flightSuretyApp.events.OracleRequest({
    fromBlock: 0
  }, function (error, event) {
    if (error) console.log(error)
    console.log(event)
});

// const registerInitialOracles = async() => {
//     let accounts = await web3.eth.getAccounts();
//     for (let i=5; i < 25; i++){
//         console.log(`Registering oracle ${accounts[i]}`);
//         let result = await flightSuretyApp.methods.registerOracle({from: accounts[i], value: web3.utils.toWei('1', 'ether'), gas: 250000}); 
//         console.log(result);
//     }
// };

const registerInitialOracles = async () => {
    accounts = await getAccounts();
    console.log(accounts);
    for (let i = 5; i < 25; i++) {
        let tx = await registerOracle(accounts[i]);
        //console.log(`Registered ${accounts[i]} & tx=${tx}`);
        let indexes = await getOracleIndexes(accounts[i]);
        oracles.set(accounts[i], indexes);
        console.log(`Oracle number ${i - 5} - ${accounts[i]} has indexes =  ${indexes}`);
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
                console.log('Error encountered while getOracleIndexes for   '+ address + 'because ' + error);
                reject(error);
            }    
        });
    });
};

const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
});

registerInitialOracles();

export default app;


