pragma solidity >0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    struct Airline {
        bytes32 name;
        bool isRegistered;
        bool isVerified;
    }

    struct Flight {
        address airline;
        bytes32 flightNumber;
        uint256 timestamp;        
        uint8 statusCode;
    }

    struct Insurance {
        address client;
        uint256 value;
        bool paid;
    }

    bool private operational = true;  // Blocks all state changes throughout the contract if false
    address private contractOwner;    // Account used to deploy contract
    uint256 private numberOfAirlines; //counter to keep how many registered airlines are there

    mapping (address => bool) authorizedContracts; //authorized contracts to call the data contract
    mapping (address => Airline) airlines; //airlines
    mapping (address => uint256) airlineBalances; //balance for each airline.

    bytes32[] private flightKeys; //array of keys for the registered flights
    mapping (bytes32 => Flight) private flights; //flightsKeys to Flight
    mapping (bytes32 => bytes32[]) private flightInsurances; //flightKeys to InsurancesKeys;
    mapping (bytes32 => Insurance) private insurances; //insuranceKey to InsuranceDetails
    mapping (address => uint256) private insureeBalances; //balance for each insuree

    /**
     * @dev Modifier that requires the "operational" boolean variable to be "true"
     * This is used on all state changing functions to pause the contract in 
     * the event there is an issue that needs to be fixed
     */
    modifier isOperational() {
        require(operational == true, "Contract is currently not operational");
        _;  
    }

    /**
     * @dev Modifier that requires the "ContractOwner" account to be the function caller
     */
    modifier onlyOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    /** 
     * @dev Modifier that requires the caller to be an authorized contract 
     */
    modifier isAuthorized(){
        require (authorizedContracts[msg.sender] == true, "Caller is not authorized");
        _;
    }

    modifier onlyManagement(){
        require (msg.sender == contractOwner || authorizedContracts[msg.sender] == true,
                "Caller is not authorized");
        _;        
    }

    /**
     * @dev Constructor The deploying account becomes contractOwner
     */
    constructor(bytes32 name) public {
        contractOwner = msg.sender;
        airlines[msg.sender] = Airline(name, true, false);
        numberOfAirlines = numberOfAirlines.add(1);
    }

    function () external payable {

    }

    /**
     * @dev Authorize one contract to use all this contract's methonds
     * @param contractAddress The new authorized contract's address
     */
    function authorizeContract(address contractAddress) external isOperational onlyOwner {
        authorizedContracts[contractAddress] = true;
    }

    /**
     * @dev Sets contract operations on/off
     * When operational mode is disabled, all write transactions except for this one will fail
     */    
    function setOperatingStatus(bool mode) external onlyManagement {
        require(operational != mode, "Contract is already in this state");
        operational = mode;
    }

    /**
     * @dev Add an airline to the registration queue
     * Can only be called from FlightSuretyApp contract
     */   
    function registerAirline(address _address, bytes32 name) 
        external
        isAuthorized
        isOperational
    {
        airlines[_address] = Airline(name, true, false);
        numberOfAirlines = numberOfAirlines.add(1);
    }
    
    function validateAirline(address _address) external isAuthorized isOperational {
        airlines[_address].isVerified = true;
    }

    function registerFlight(address airline, bytes32 number, uint256 time, uint8 status)
        external 
        isAuthorized
        isOperational
    {
        bytes32 key = generateKey(airline, number, time);
        flights[key] = Flight(airline, number, time, status);
        flightKeys.push(key);
    }

    function setFlightStatus(bytes32 flightKey, uint8 _statusCode) 
        external
        isAuthorized 
        isOperational
    {
        flights[flightKey].statusCode = _statusCode;
    }

    /**
     * @dev Client buys insurance for a flight; AppContract should send the ether first before insuring the passenger
     */   
    function buyInsurance(bytes32 flightKey, address _insuree, uint256 amount) external isAuthorized isOperational {
        bytes32 insuranceKey = generateKey(_insuree, flightKey, 0);
        insurances[insuranceKey] = Insurance(_insuree, amount, false);
        flightInsurances[flightKey].push(insuranceKey);
        airlineBalances[flights[flightKey].airline] = airlineBalances[flights[flightKey].airline].add(amount);
    }

    /**
     * @dev credits all ensurees for the given flight (flight key) using the delta percentage   
     * This method should be mostly in AppContract but calling this from AppContract 
     * X times for X insurees would cause mtoo any calls on the stack which might result in block fail.   
     */
    function creditInsurees(bytes32 flightKey, uint8 delta) external isAuthorized isOperational {
        address airlineAddress = flights[flightKey].airline;
        for (uint i=0; i < flightInsurances[flightKey].length; i++) {
            Insurance storage insurance = insurances[flightInsurances[flightKey][i]];
            if (insurance.paid == false) {
                uint256 amount = insurance.value.div(10).mul(delta);
                creditInsuree(insurance, amount);
                airlineBalances[airlineAddress] = airlineBalances[airlineAddress].sub(amount).sub(insurance.value);
            }
        }
    }

    /**
     *  @dev Credits payouts to insurees
     */
    function creditInsuree(Insurance storage insurance, uint256 amount) private isAuthorized isOperational {
        insureeBalances[insurance.client] = insureeBalances[insurance.client].add(amount).add(insurance.value);
        insurance.paid = true;
    }

    /**
     * @dev Initial funding for the insurance. Unless there are too many delayed flights
     * resulting in insurance payouts, the contract should be self-sustaining.
     * This is the method freshly joined airlines would call to pay their fee after they have been vetted in
     */   
    function fundAirline(address airline, uint256 amount) external isAuthorized isOperational {
        airlineBalances[airline] = airlineBalances[airline].add(amount);
    }

    function getAirline(address _address) 
        external 
        view 
        isAuthorized 
        isOperational 
        returns(bytes32, bool, bool)
    {
        Airline storage airline = airlines[_address];
        return (airline.name, airline.isRegistered, airline.isVerified);
    }

    function getNumberOfAirlines() external view isAuthorized isOperational returns(uint256) {
        return numberOfAirlines;
    }

    function getFlightDetails(bytes32 _flightNumber) 
        external 
        view 
        isAuthorized
        isOperational 
        returns (
            address,
            bytes32,
            uint256,
            uint8,
            bytes32
        )
    {
        Flight storage flight = flights[bytes32(0)];
        for (uint8 i = 0; i < flightKeys.length; i++){
            if(flights[flightKeys[i]].flightNumber == _flightNumber){
                flight = flights[flightKeys[i]];
                return (flight.airline, flight.flightNumber, 
                        flight.timestamp, flight.statusCode, flightKeys[i]
                );
            }
        }
        return (flight.airline, flight.flightNumber, 
                flight.timestamp, flight.statusCode, bytes32(0));
    }

    function getAllFlights() external view isAuthorized isOperational returns(bytes32[] memory){
        bytes32[] memory flightnrs = new bytes32[](flightKeys.length);
        for (uint i = 0; i < flightKeys.length; i++){
            flightnrs[i] = flights[flightKeys[i]].flightNumber;
        }
        return flightnrs;
    }

    function getBalanceOfAirline(address _airline) 
        external 
        view 
        isAuthorized 
        isOperational 
        returns(uint256) 
    {
        return airlineBalances[_airline];
    }

    function getBalanceOfInsuree(address _insuree) 
        external 
        view 
        isAuthorized 
        isOperational 
        returns(uint256)
    {
        return insureeBalances[_insuree];
    }

    function getInsuraceKeysForFlight(bytes32 flightKey) 
        external 
        view
        isAuthorized
        isOperational
        returns(bytes32[] memory)
    {
        return flightInsurances[flightKey];
    }

    function getInsuranceDetails(bytes32 insuranceKey)
        external 
        view
        isAuthorized
        isOperational
        returns(address, uint256, bool)
    {
        Insurance storage insurance = insurances[insuranceKey];
        return (insurance.client, insurance.value, insurance.paid);
    }

    /**
     *  @dev Transfers eligible payout funds to insuree
     */
    function pay(address _insuree, uint256 amount) external isAuthorized isOperational {
        require(address(this).balance >= amount, "There are no enough funds available on the contract to pay the insuree");
        require(insureeBalances[_insuree] >= amount, 'The desired amount exceedes insuree balance');
        address payable payableInsuree = address(uint160(_insuree));
        uint256 availableBalance = insureeBalances[_insuree];
        uint256 newBalance = availableBalance.sub(amount);
        insureeBalances[_insuree] = newBalance;
        payableInsuree.transfer(amount);
    }

    function getEstimativeCreditingCost(bytes32 flightKey) 
        external
        view
        isAuthorized
        isOperational
        returns(uint256)
    {
        uint256 totalCredit = 0;
        for (uint i=0; i < flightInsurances[flightKey].length; i++) {
            Insurance storage insurance = insurances[flightInsurances[flightKey][i]];
            if (insurance.paid == false) {
                totalCredit = totalCredit.add(insurance.value);
            }
        }
        
        return totalCredit;
    }

    /**
     * @dev Get operating status of contract
     * @return A bool that is the current operating status
     */      
    function isContractOperational() external view onlyManagement returns(bool) {
        return operational;
    }

    function generateKey (address _address, bytes32 key, uint256 value)
        internal
        view
        isOperational
        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(_address, key, value));
    }
}

