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

    mapping(bytes32 => Flight) private flights; //flights
    bytes32[] private flightKeys; //array of keys for the registered flights
    address private contractOwner;    // Account used to deploy contract
    bool private operational = true;  // Blocks all state changes throughout the contract if false
    mapping (address => bool) authorizedContracts; //authorized contracts to call the data contract
    mapping (address => Airline) airlines; //airlines

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
        airlines[msg.sender] = Airline(name, true, true);
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
    }
    
    function validateAirline(address _address) external isAuthorized isOperational {
        airlines[_address].isVerified = true;
    }

    function registerFlight(address airline, bytes32 number, uint256 time, uint8 status)
        external 
        isAuthorized
        isOperational
    {
        bytes32 key = getFlightKey(airline, number, time);
        flights[key] = Flight(airline, number, time, status);
        flightKeys.push(key);
    }

    function getAllFlights() external view isAuthorized isOperational returns(bytes32[] memory){
        bytes32[] memory flightnrs = new bytes32[](flightKeys.length);
        for (uint i = 0; i < flightKeys.length; i++){
            flightnrs[i] = flights[flightKeys[i]].flightNumber;
        }
        return flightnrs;
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
            uint8
        )
    {
        for (uint8 i = 0; i < flightKeys.length; i++){
            if(flights[flightKeys[i]].flightNumber == _flightNumber){
                Flight storage flight = flights[flightKeys[i]];
                return (flight.airline, flight.flightNumber, flight.timestamp, flight.statusCode);
            }
        }
        revert("Flight Number does not exist");
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

    /**
     * @dev Buy insurance for a flight
     */   
    function buy() external payable isAuthorized isOperational {

    }

    /**
     *  @dev Credits payouts to insurees
     */
    function creditInsurees() external view isAuthorized isOperational {
    
    }

    /**
     *  @dev Transfers eligible payout funds to insuree
     */
    function pay() external view isAuthorized isOperational {
    }

    /**
     * @dev Initial funding for the insurance. Unless there are too many delayed flights
     * resulting in insurance payouts, the contract should be self-sustaining.
     * This is the method freshly joined airlines would call to pay their fee after they have been vetted in
     */   
    function fund() public payable isAuthorized isOperational {
    
    }
       
    /**
     * @dev Fallback function for funding smart contract.
     */
    function() external payable isOperational isAuthorized {
        fund();
    }

    /**
     * @dev Get operating status of contract
     * @return A bool that is the current operating status
     */      
    function isContractOperational() external view onlyManagement returns(bool) {
        return operational;
    }

    function getFlightKey (address airline, bytes32 flight, uint256 timestamp)
        view
        internal
        isOperational
        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }
}

