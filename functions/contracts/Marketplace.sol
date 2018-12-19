pragma solidity ^0.4.23;

import 'openzeppelin-solidity/contracts/token/ERC721/ERC721Token.sol';

contract Marketplace is ERC721Token {
    string public name = "Marketplace";
    string public symbol = "MP";

    constructor()
        ERC721Token(name,symbol)
        public 
    {}
}
