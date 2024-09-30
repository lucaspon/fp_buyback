// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

contract ERC721Mock is ERC721Enumerable {
    uint256 public nextTokenId;

    constructor(string memory name, string memory symbol) ERC721(name, symbol) {}

    function mint() public {
        _mint(msg.sender, nextTokenId);
        nextTokenId++;
    }
}
