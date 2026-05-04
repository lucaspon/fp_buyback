# FingerprintsBuyback Contract

## Overview
The **FingerprintsBuyback** smart contract allows selected users to exchange ERC20 tokens or ERC721 NFTs for ETH, as part of a buyback program. The contract enforces specific rules for participation, including the use of allowlists and configurable exchange rates.

## Features
1. **ERC20 & ERC721 Swaps for ETH**:
   - Swap ERC20 tokens up to a set maximum for ETH.
   - Swap one NFT for ETH if no ERC20 tokens have been swapped.

2. **Allowlist System**:
   - Only allowlisted addresses can participate in the swaps.
   - The contract owner can add/remove addresses to/from the allowlist.

3. **Configurable Exchange Rates**:
   - The contract owner can set a new exchange rate for the ERC721 NFTs, which automatically updates the corresponding ERC20 rate.

4. **Pausing and Recovery**:
   - The contract can be paused or unpaused by the owner.
   - ERC20 and ERC721 tokens mistakenly sent to the contract can be recovered by the owner.

## Deployment Parameters
- `_tokenAddress`: The address of the ERC20 token to be swapped.
- `_nftAddress`: The address of the ERC721 contract.
- `_tokenDecimals`: The number of decimals in the ERC20 token.
- `_defaultAllowlist`: Array of addresses to be added to the initial allowlist.

## Functions
### Swaps
- **`swapERC20forETH(uint256 tokenAmount)`**: Swaps a specified amount of ERC20 tokens for ETH.
- **`swapNFTforETH(uint256 tokenId)`**: Swaps one NFT for ETH.

### Allowlist Management
- **`addToAllowlist(address _address)`**: Adds a single address to the allowlist.
- **`removeFromAllowlist(address _address)`**: Removes an address from the allowlist.
- **`setAllowlist(address[] calldata _addresses)`**: Adds multiple addresses to the allowlist.

### Administrative Functions
- **`pause()` / `unpause()`**: Pauses/unpauses the contract.
- **`setExchangeRateForOneMembership(uint256 _nftExchangeRate)`**: Sets a new exchange rate for NFTs and updates the token rate accordingly.
- **`sendTokensToDestination()`**: Transfers all held ERC20 tokens and NFTs to the destination address.
- **`withdrawETH(uint256 amount)`**: Withdraws a specified amount of ETH to the contract owner.

### Token Recovery
- **`recoverERC20Tokens(address tokenAddress, uint256 tokenAmount)`**: Recovers ERC20 tokens mistakenly sent to the contract.
- **`recoverERC721Tokens(address tokenAddress, uint256 tokenId)`**: Recovers ERC721 tokens mistakenly sent to the contract.

## Events
- `Swapped(address indexed user, uint256 tokenAmount, uint256 ethAmount)`
- `NFTSwapped(address indexed user, uint256 tokenId, uint256 ethAmount)`
- `TokensSentToDestination(uint256 tokenAmount)`
- `ETHWithdrawn(address indexed owner, uint256 amount)`
- `AddressAllowlisted(address indexed user)`
- `AddressRemovedFromAllowlist(address indexed user)`
- `ExchangeRateUpdated(uint256 newTokenExchangeRate, uint256 newNftExchangeRate)`
- `ETHReceived(address indexed sender, uint256 amount)`
- `ContractPaused(address indexed owner)`
- `ContractUnpaused(address indexed owner)`

## Security Considerations
- The contract includes reentrancy protection using `nonReentrant`.
- Tokens and NFTs sent directly without using the provided swap functions will not be accepted.

## License
This contract is licensed under the MIT License.
