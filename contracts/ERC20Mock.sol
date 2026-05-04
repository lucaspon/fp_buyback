// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ERC20Mock is ERC20 {
    uint8 private _customDecimals;

    constructor(string memory name, string memory symbol, uint8 decimals_) ERC20(name, symbol) {
        _customDecimals = decimals_;
        _mint(msg.sender, 1000000 * (10 ** decimals_));
    }

    function decimals() public view virtual override returns (uint8) {
        return _customDecimals;
    }
}
