// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Enumerable.sol";

contract FingerprintsBuyback is ReentrancyGuard, Ownable, Pausable {
    // Developer: lucaspon
    address public constant DESTINATION_ADDRESS =
        0xbC49de68bCBD164574847A7ced47e7475179C76B;

    uint256 public constant MAX_TOKENS = 5000; // Maximum tokens per wallet
    uint256 public constant MAX_NFTS = 1; // Maximum NFTs per wallet

    mapping(address => uint256) public tokensSwapped;
    mapping(address => uint256) public nftsSwapped;
    mapping(address => bool) public allowlist;

    uint256 public tokenExchangeRate; // Wei per token unit
    uint256 public nftExchangeRate; // Wei per NFT

    IERC20 public token;
    IERC721Enumerable public nft;

    uint8 public tokenDecimals;

    event Swapped(address indexed user, uint256 tokenAmount, uint256 ethAmount);
    event TokensSentToDestination(uint256 tokenAmount);
    event ETHWithdrawn(address indexed owner, uint256 amount);
    event NFTSwapped(address indexed user, uint256 tokenId, uint256 ethAmount);
    event AddressAllowlisted(address indexed user);
    event AddressRemovedFromAllowlist(address indexed user);
    event ExchangeRateUpdated(
        uint256 newTokenExchangeRate,
        uint256 newNftExchangeRate
    );
    event ETHReceived(address indexed sender, uint256 amount);
    event ContractPaused(address indexed owner);
    event ContractUnpaused(address indexed owner);

    constructor(
        address _tokenAddress,
        address _nftAddress,
        uint8 _tokenDecimals,
        address[] memory _defaultAllowlist
    ) {
        token = IERC20(_tokenAddress);
        nft = IERC721Enumerable(_nftAddress);
        tokenDecimals = _tokenDecimals;

        nftExchangeRate = 3.47 ether; // Default exchange rate for NFTs in wei
        tokenExchangeRate = nftExchangeRate / 5000; // Wei per token unit

        require(tokenExchangeRate > 0, "Token exchange rate too low");
        require(nftExchangeRate > 0, "NFT exchange rate too low");

        // Add default addresses to the allowlist
        for (uint256 i = 0; i < _defaultAllowlist.length; i++) {
            allowlist[_defaultAllowlist[i]] = true;
            emit AddressAllowlisted(_defaultAllowlist[i]);
        }
    }

    // Pause contract functions
    function pause() external onlyOwner {
        _pause();
        emit ContractPaused(msg.sender);
    }

    // Unpause contract functions
    function unpause() external onlyOwner {
        _unpause();
        emit ContractUnpaused(msg.sender);
    }

    // Set exchange rate for 1 membership
    function setExchangeRateForOneMembership(
        uint256 _nftExchangeRate
    ) external onlyOwner {
        require(
            _nftExchangeRate > 0,
            "NFT exchange rate must be greater than zero"
        );

        // check if the new exchange rate is different from the current one
        require(
            _nftExchangeRate != nftExchangeRate,
            "New exchange rates must be different from the current ones"
        );

        // cap them at 1000 ETH
        require(
            _nftExchangeRate <= 1000 ether,
            "Exchange rates must be less than or equal to 1000 ETH"
        );

        // require that the new exchange rate is at least 0.01 ETH
        require(
            _nftExchangeRate >= 0.01 ether,
            "Exchange rates must be greater than or equal to 0.01 ETH"
        );

        tokenExchangeRate = _nftExchangeRate / 5000;
        nftExchangeRate = _nftExchangeRate;
        emit ExchangeRateUpdated(tokenExchangeRate, _nftExchangeRate);
    }

    // Swap ERC20 tokens for ETH
    function swapERC20forETH(
        uint256 tokenAmount
    ) external nonReentrant whenNotPaused {
        require(allowlist[msg.sender], "Address not allowlisted");
        require(
            tokensSwapped[msg.sender] + tokenAmount <=
                MAX_TOKENS * (10 ** tokenDecimals),
            "Token swap limit exceeded"
        );
        require(
            nftsSwapped[msg.sender] == 0,
            "NFTs have already been swapped."
        );

        uint256 ethAmount = (tokenAmount * tokenExchangeRate) /
            (10 ** tokenDecimals);

        require(
            address(this).balance >= ethAmount,
            "Not enough ETH in contract"
        );

        // Transfer the tokens from the user to the contract
        bool success = token.transferFrom(
            msg.sender,
            address(this),
            tokenAmount
        );
        require(success, "Token transfer failed");

        // Update state
        tokensSwapped[msg.sender] += tokenAmount;

        // Transfer the ETH to the user
        (success, ) = payable(msg.sender).call{value: ethAmount}("");
        require(success, "ETH transfer failed");

        emit Swapped(msg.sender, tokenAmount, ethAmount);
    }

    // Swap NFT for ETH
    function swapNFTforETH(
        uint256 tokenId
    ) external nonReentrant whenNotPaused {
        require(allowlist[msg.sender], "Address not allowlisted");
        require(nftsSwapped[msg.sender] < MAX_NFTS, "NFT swap limit exceeded");
        require(
            tokensSwapped[msg.sender] == 0,
            "You've already swapped ERC20 tokens."
        );
        require(nft.ownerOf(tokenId) == msg.sender, "You do not own this NFT");

        uint256 ethAmount = nftExchangeRate;

        require(
            address(this).balance >= ethAmount,
            "Not enough ETH in contract to swap NFT."
        );

        // Transfer the NFT from the user to the contract
        nft.transferFrom(msg.sender, address(this), tokenId);

        // Update state
        nftsSwapped[msg.sender] += 1;

        // Transfer the ETH to the user
        (bool success, ) = payable(msg.sender).call{value: ethAmount}("");
        require(success, "ETH transfer failed");

        emit NFTSwapped(msg.sender, tokenId, ethAmount);
    }

    // Allow ETH deposits with event emission
    receive() external payable {
        emit ETHReceived(msg.sender, msg.value);
    }

    // Send all contract tokens and NFTs to the destination address
    function sendTokensToDestination() external nonReentrant {
        uint256 contractTokenBalance = token.balanceOf(address(this));
        // require a balance of either tokens or NFTs to send
        require(
            contractTokenBalance > 0 || nft.balanceOf(address(this)) > 0,
            "No tokens or NFTs to send"
        );

        // Transfer all tokens to the destination address
        token.transfer(DESTINATION_ADDRESS, contractTokenBalance);

        // Transfer all NFTs to the destination address
        uint256 nftBalance = nft.balanceOf(address(this));

        if (nftBalance == 0) {
            emit TokensSentToDestination(contractTokenBalance);
            return;
        } else if (nftBalance >= 1) {
            for (uint256 i = 0; i < nftBalance; i++) {
                uint256 tokenId = nft.tokenOfOwnerByIndex(address(this), 0);
                nft.transferFrom(address(this), DESTINATION_ADDRESS, tokenId);
            }
        }
    }

    // Withdraw ETH from the contract to the owner's address
    function withdrawETH(uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0, "Amount must be greater than zero");
        require(address(this).balance >= amount, "Not enough ETH in contract");

        // if amount provided is zero or null, withdraw the entire balance
        if (amount == 0) {
            amount = address(this).balance;
        }

        // Transfer the ETH to the owner
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "ETH transfer failed");

        emit ETHWithdrawn(owner(), amount);
    }

    // Add an address to the allowlist
    function addToAllowlist(address _address) external onlyOwner {
        require(_address != address(0), "Invalid address");
        require(!allowlist[_address], "Address already allowlisted");

        allowlist[_address] = true;
        emit AddressAllowlisted(_address);
    }

    // Remove an address from the allowlist
    function removeFromAllowlist(address _address) external onlyOwner {
        require(allowlist[_address], "Address not in allowlist");

        allowlist[_address] = false;
        emit AddressRemovedFromAllowlist(_address);
    }

    // Set multiple addresses in the allowlist
    function setAllowlist(address[] calldata _addresses) external onlyOwner {
        require(_addresses.length > 0, "No addresses provided");

        // Note: This approach does not delete previous mappings but updates the allowlist efficiently
        for (uint256 i = 0; i < _addresses.length; i++) {
            if (_addresses[i] != address(0)) {
                allowlist[_addresses[i]] = true;
                emit AddressAllowlisted(_addresses[i]);
            }
        }
    }

    // Return whether an address is allowlisted
    function isAllowlisted(address _address) external view returns (bool) {
        return allowlist[_address];
    }

    // Refuse to receive NFTs sent directly to the contract
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        revert("NFTs not accepted without a swap");
    }

    //  Recover ERC20 tokens sent directly to the contract
    function recoverERC20Tokens(
        address tokenAddress,
        uint256 tokenAmount
    ) external onlyOwner {
        // Require the contract to own the tokens
        require(
            IERC20(tokenAddress).balanceOf(address(this)) >= tokenAmount,
            "Contract does not own the tokens you want to recover"
        );
        IERC20(tokenAddress).transfer(owner(), tokenAmount);
    }

    // Recover ERC721 tokens sent directly to the contract
    function recoverERC721Tokens(
        address tokenAddress,
        uint256 tokenId
    ) external onlyOwner {
        IERC721(tokenAddress).safeTransferFrom(address(this), owner(), tokenId);
    }
}
