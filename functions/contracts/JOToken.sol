pragma solidity ^0.4.23;

import "./ERC865Token.sol";
import "openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol";

// JOToken follows ERC20 & ERC865 standard
// ERC865 allows users paying transfers in tokens instead of gas
contract JOToken is ERC865Token {

    string public name = "JOToken";
    string public symbol = "JO";
    uint public decimals = 18;
    uint public INITIAL_SUPPLY = 1000000000 * (10 ** decimals);

    constructor()
        public 
    {
        totalSupply_ = INITIAL_SUPPLY;
        balances[msg.sender] = INITIAL_SUPPLY;
    }
}
