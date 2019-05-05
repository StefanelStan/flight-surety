pragma solidity >0.4.25;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyApp {
    using SafeMath for uint256;

    // Flight status codees
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    uint256 private AIRLINE_FEE =  10 ether;
    uint256 private MAX_INSURANCE =  1 ether; 
    uint256 private CONSENSUS = 4; //max number of airlines without consensus rule
    uint256 private CONSENSUS_RULE = 5; // percentage of airlines to vote for consensus
    uint8 private INSURANCE_MULTIPLIER = 5;
    address private contractOwner;          // Account used to deploy contract
    bool private operational = true; 
    FlightSuretyData data; //data contract
    address private dataAddress;

    mapping(address => address[]) airlineVotes; //airlineAddress -> address[] voters   

    event AirlineRegistered(address indexed airline, uint256 votes);

    event AirlineFunded(address indexed airline, uint256 value);

    event InsurancePurchased(address indexed passenger, bytes32 flightNumber, uint256 amount);
    /**
     * @dev Modifier that requires the "operational" boolean variable to be "true"
     * This is used on all state changing functions to pause the contract in 
     * the event there is an issue that needs to be fixed
     */
    modifier isOperational() {
         // Modify to call data contract's status
        require(operational == true, "Contract is currently not operational");  
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
     * @dev Modifier that requires the "ContractOwner" account to be the function caller
     */
    modifier onlyOwner(){
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier airlineRegistered {
        bool isRegistered;
        (,isRegistered,) = data.getAirline(msg.sender);
        require(isRegistered == true, 'Caller is not a registered airline');
        _;
    }

    modifier airlineValidated {
        bool isValidated;
        (,,isValidated) = data.getAirline(msg.sender);
        require(isValidated == true, 'Caller is not a validated airline');
        _;
    }

    modifier newValidAirline(address newAirline) {
        require (address(0x0) != newAirline, 'Invalid address to register');
        bool isRegistered;
        bool isValidated;
        (,isRegistered,isValidated) = data.getAirline(newAirline);
        require (!isRegistered && !isValidated, 'Airline is already validated');
        _;
    }

    modifier minimumFee(uint256 fee){
        require(msg.value >= fee, 'Minimum fee is required'); 
        _;
    }

    modifier flightInexistent(bytes32 flightNumber) {
        address airline;
        (airline,,,,) = data.getFlightDetails(flightNumber);
        require(airline == address(0), 'Flight already registered');
        _;
    }

    modifier flightExistent(bytes32 flightNumber) {
        address airline;
        (airline,,,,) = data.getFlightDetails(flightNumber);
        require(airline != address(0), 'Flight does not exist');
        _;
    }

    modifier notInsured(bytes32 flightNumber) {
        bytes32 flightKey;
        (,,,,flightKey) = data.getFlightDetails(flightNumber);
        bytes32 insuranceKey = generateKey(msg.sender, flightKey, 0);
        address insuree;
        (insuree,,) = data.getInsuranceDetails(insuranceKey);
        require(insuree == address(0), 'Insurance exists already');
        _;
    }

    modifier authorizedOracle(uint8 index){
        require(
            oracles[msg.sender].indexes[0] == index 
            || oracles[msg.sender].indexes[1] == index
            || oracles[msg.sender].indexes[2] == index,
            'Index does not match oracle request'
        );
        _;
    }

    /**
     * @dev Contract constructor
     */
    constructor(address _dataContractAddress) public {
        contractOwner = msg.sender;
        data = FlightSuretyData(_dataContractAddress);
    }

    function setOperatingStatus(bool mode) external onlyOwner {
        require(mode != operational, "Contract is already in this state");
        operational = mode;
    }
    
    function isContractOperational() public view returns(bool) {
        return operational; 
    }
 
    /**
     * @dev Add an airline to the registration queue
     */   
    function registerAirline(address _newAirline, bytes32 airlineName) 
        external 
        isOperational
        airlineValidated
        newValidAirline(_newAirline)
    { 
        uint256 numberOfAirlines = data.getNumberOfAirlines();
        if (CONSENSUS > numberOfAirlines) {
            registerValidAirline(_newAirline, airlineName, 1);
        } else {
            voteIfHasNotVoted(msg.sender, _newAirline);
            registerIfConsensusAchieved(_newAirline, numberOfAirlines, airlineName);
        }
    }

    function fundAirline() external payable isOperational airlineRegistered minimumFee(AIRLINE_FEE) {
        address payable dataContractAddress = address(uint160(address(data)));
        dataContractAddress.transfer(msg.value);
        data.fundAirline(msg.sender, msg.value);
        data.validateAirline(msg.sender);
        emit AirlineFunded(msg.sender, msg.value);
    }

    function getFlightDetails(bytes32 _flightNumber) external view isOperational
        returns (
            address, 
            bytes32, 
            uint256, 
            uint8
        )
    {
        address airline;
        bytes32 flightNumber;
        uint256 timestamp;
        uint8 statusCode;
        (airline, flightNumber, timestamp, statusCode,) = data.getFlightDetails(_flightNumber);
        return (airline, flightNumber, timestamp, statusCode);
    }        
    
    /**
     * @dev Register a future flight for insuring.
     */  
    function registerFlight(bytes32 flightNumber, uint256 timestamp) 
        external 
        isOperational
        airlineValidated
        flightInexistent(flightNumber)
    {
        data.registerFlight(msg.sender, flightNumber, timestamp, STATUS_CODE_UNKNOWN);
    }

    function getAllFlights() external view isOperational returns(bytes32[] memory) {
        return data.getAllFlights();
    }

    function buyInsurance(bytes32 flightNumber) 
        external 
        payable 
        isOperational 
        flightExistent(flightNumber)
        notInsured(flightNumber) 
    {
        //send the money and buy insurance and top up the airline balance
        require(msg.value <= MAX_INSURANCE, 'Exceeded maximum allowed insurance');
        bytes32 flightKey;
        (,,,,flightKey) = data.getFlightDetails(flightNumber);
        address payable dataContractAddress = address(uint160(address(data)));
        dataContractAddress.transfer(msg.value);
        data.buyInsurance(flightKey, msg.sender, msg.value);
        emit InsurancePurchased(msg.sender, flightNumber, msg.value);
    }
    
    /**
     * @dev Called after min 3 oracles have submitted the same statusCode
     * For exercise purpose, only status 20 will be considered and taken action upon
     */  
    function processFlightStatus(
        bytes32 oracleRequestKey,
        address airline, 
        bytes32 flightNumber, 
        uint256 timestamp, 
        uint8 statusCode
    )
       private
    {
        if(statusCode == STATUS_CODE_LATE_AIRLINE){
            bytes32 flightKey = getFlightKey(airline, flightNumber, timestamp);
            uint256 airlineBalance = data.getBalanceOfAirline(airline);
            uint256 boughtInsurance = data.getEstimativeCreditingCost(flightKey);
            uint8 multiplier = getInsuranceMultiplier(airlineBalance, boughtInsurance);
            
            data.creditInsurees(flightKey, multiplier);
            data.setFlightStatus(flightKey, STATUS_CODE_LATE_AIRLINE);
            oracleResponses[oracleRequestKey].isOpen = false;
        }
    }


    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus(bytes32 flightNumber) 
        external
        isOperational
        onlyOwner
    {
        address airline;
        uint256 timestamp;
        uint8 statusCode;
        (airline,,timestamp, statusCode,) = data.getFlightDetails(flightNumber);
        require(airline != address(0), 'Flight does not exist');
        require(statusCode == STATUS_CODE_UNKNOWN, 'Flight status already fetched');
        
        uint8 index = getRandomIndex(msg.sender);
        // Generate a unique key for storing the request //i would use the flight key for it
        bytes32 key = keccak256(abi.encodePacked(index, airline, flightNumber, timestamp));
        oracleResponses[key] = ResponseInfo(msg.sender,true);
        // Oracles will need to know the airline number, flight and time to they can look up to it. 
        // The index 0-9 will tell them if they should bother with the info or not
        emit OracleRequest(index, airline, flightNumber, timestamp);
    } 

    function withdraw(uint256 amount) external isOperational {
        data.pay(msg.sender, amount);
    }

    function getBalanceOfInsuree() external view isOperational returns(uint256){
        uint256 balance = data.getBalanceOfInsuree(msg.sender);
        return balance;
    }

    function voteIfHasNotVoted(address voter, address _newAirline) private {
        bool hasVoted = false; 
        for (uint i=0; i< airlineVotes[_newAirline].length; i++){
            if (airlineVotes[_newAirline][i] == voter){
                hasVoted = true;
                break;
            }
        }
        if(!hasVoted){
            airlineVotes[_newAirline].push(voter);
        }
    }

    function registerIfConsensusAchieved(address airline, uint256 nrOfAirlines, bytes32 name) 
        private
    {
        uint256 requiredVotes = nrOfAirlines.mul(CONSENSUS_RULE).div(10);
        uint256 mod10 = nrOfAirlines.mul(CONSENSUS_RULE).mod(10);
        if (mod10 >= 1) {
            requiredVotes = requiredVotes.add(1);
        }
        if(airlineVotes[airline].length >= requiredVotes) {
            registerValidAirline(airline, name, airlineVotes[airline].length);
        }
    }

    function registerValidAirline(address airline, bytes32 name, uint256 votes) private {
        data.registerAirline(airline, name);
        emit AirlineRegistered(airline, votes);
    }

    function generateKey (address _address, bytes32 key, uint256 value)
        internal
        view
        isOperational
        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(_address, key, value));
    }

    function getInsuranceMultiplier(uint256 airlineBalance, uint256 boughtInsurance) 
        private 
        view
        returns(uint8)
    {
        uint8 multiplier = INSURANCE_MULTIPLIER;
        uint256 maxCredit = boughtInsurance.mul(multiplier).div(10);
        while(airlineBalance <= maxCredit && multiplier > 0){
            multiplier--;
            maxCredit = boughtInsurance.mul(multiplier).div(10);
        }
        return multiplier;
    }

// region ORACLE MANAGEMENT

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;    

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;

    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;        
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester;                              // Account that requested status
        bool isOpen;                                    // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses;          // Mapping key is the status code reported
                                                        // This lets us group responses and identify
                                                        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(address airline, bytes32 flightNumber, uint256 timestamp, uint8 status);

    event OracleReport(address airline, bytes32 flightNumber, uint256 timestamp, uint8 status);

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(uint8 index, address airline, bytes32 flightNumber, uint256 timestamp);

    // Register an oracle with the contract
    function registerOracle() external payable isOperational minimumFee(REGISTRATION_FEE){
        require(oracles[msg.sender].isRegistered == false, "Oracle already registered");

        uint8[3] memory indexes = generateIndexes(msg.sender);
        oracles[msg.sender] = Oracle(true, indexes);
    }

    function getMyIndexes() view external isOperational returns(uint8[3] memory) {
        require(oracles[msg.sender].isRegistered, "Not registered as an oracle");

        return oracles[msg.sender].indexes;
    }

    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse(
        uint8 index, 
        address airline, 
        bytes32 flight, 
        uint256 timestamp,
        uint8 statusCode
    )
        external
        isOperational
        authorizedOracle(index)
    {
        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp)); 
        require(oracleResponses[key].isOpen, "Flight or timestamp do not match oracle request");
        require(hasOracleAlreadyResponded(key) == false, 'This oracle has already submitted response');

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);
        if (oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES) {

            emit FlightStatusInfo(airline, flight, timestamp, statusCode);

            // Handle flight status as appropriate. 
            processFlightStatus(key, airline, flight, timestamp, statusCode);
        }
    }


    function getFlightKey(address airline, bytes32 flight, uint256 timestamp) 
        pure 
        internal 
        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes(address account) internal returns(uint8[3] memory)
    {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);
        
        indexes[1] = indexes[0];
        while(indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex(address account) internal returns (uint8) {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(uint256(keccak256(abi.encodePacked(blockhash(block.number - ++nonce), account))) % maxValue);

        if (nonce > 250) {
            nonce = 0;  // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }

    /**
     * @dev Only checks if this oracle has already replied 20 (delayed) as 20 is scope of exercise
     */
    function hasOracleAlreadyResponded(bytes32 key) private view returns(bool) {
        bool hasResponded = false;
        for(uint i = 0; i < oracleResponses[key].responses[STATUS_CODE_LATE_AIRLINE].length; i++){
            if(oracleResponses[key].responses[STATUS_CODE_LATE_AIRLINE][i] == msg.sender){
                hasResponded = true;
                break;
            }
        }
        return hasResponded;
    }
}   

contract FlightSuretyData {
    function getAirline(address _address) external view returns(bytes32, bool, bool);
    function validateAirline(address _address) external;
    function fundAirline(address airline, uint256 amount) external;
    function getNumberOfAirlines() external view returns(uint256);
    function registerAirline(address _address, bytes32 name) external;
    function getFlightDetails(bytes32 _flightNumber) external view 
        returns (
            address, 
            bytes32, 
            uint256, 
            uint8, 
            bytes32
        );
    function registerFlight(address airline, bytes32 number, uint256 time, uint8 status) external;
    function getAllFlights() external view returns(bytes32[] memory);
    function getInsuranceDetails(bytes32 insuranceKey) external view returns(address, uint256, bool);
    function buyInsurance(bytes32 flightKey, address _insuree, uint256 amount) external;
    function getBalanceOfAirline(address _airline) external view returns(uint256);
    function getEstimativeCreditingCost(bytes32 flightKey) external view returns(uint256);
    function setFlightStatus(bytes32 flightKey, uint8 _statusCode) external;
    function creditInsurees(bytes32 flightKey, uint8 delta) external;
    function pay(address _insuree, uint256 amount) external;
    function getBalanceOfInsuree(address _insuree) external view returns(uint256);
}
