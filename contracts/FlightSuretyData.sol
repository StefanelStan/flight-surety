pragma solidity >0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    struct Airline {
        string name;
        bool isRegistered;
        bool isVerified;
    }

    address private contractOwner;    // Account used to deploy contract
    bool private operational = true;  // Blocks all state changes throughout the contract if false
    mapping (address => bool) authorizedContracts;
    mapping (address => Airline) airlines;

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    * This is used on all state changing functions to pause the contract in 
    * the event there is an issue that needs to be fixed
    */
    modifier isOperational() {
        require(operational, "Contract is currently not operational");
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
    constructor(string memory name) public {
        contractOwner = msg.sender;
        airlines[msg.sender] = Airline(name, true, true);
    }

    /**
    * @dev Get operating status of contract
    * @return A bool that is the current operating status
    */      
    function isContractOperational() public view onlyManagement returns(bool) {
        return operational;
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
     * @dev Authorize one contract to use all this contract's methonds
     * @param contractAddress The new authorized contract's address
     */
    function authorizeContract(address contractAddress) public isOperational onlyOwner {
        authorizedContracts[contractAddress] = true;
    }

   /**
    * @dev Add an airline to the registration queue
    * Can only be called from FlightSuretyApp contract
    */   
    function registerAirline(address _address, string calldata name) 
        external
        isOperational
        isAuthorized 
    {
        airlines[_address] = Airline(name, true, false);
    }

    function validateAirline(address _address) external isOperational isAuthorized {
        airlines[_address].isVerified = true;
    }

    function getAirline(address _address) 
        external 
        view 
        isAuthorized 
        isOperational 
        returns(string memory, bool, bool)
    {
        Airline storage airline = airlines[_address];
        return (airline.name, airline.isRegistered, airline.isVerified);
    }

   /**
    * @dev Buy insurance for a flight
    */   
    function buy() external payable isOperational isAuthorized {

    }

    /**
     *  @dev Credits payouts to insurees
     */
    function creditInsurees() external view isOperational isAuthorized {
    
    }

    /**
     *  @dev Transfers eligible payout funds to insuree
     */
    function pay() external view isOperational isAuthorized {

    }

    /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    * resulting in insurance payouts, the contract should be self-sustaining.
    * This is the method freshly joined airlines would call to pay their fee after they have been vetted in
    */   
    function fund() public payable isOperational isAuthorized {
    
    }

    function getFlightKey (address airline, string memory flight, uint256 timestamp)
        view
        internal
        isOperational
        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    */
    function() external payable isOperational isAuthorized {
        fund();
    }
}

