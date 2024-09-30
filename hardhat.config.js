require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: {
    version: "0.8.0",
    settings: {
      outputSelection: {
        "*": {
          "*": ["metadata", "evm.bytecode", "evm.deployedBytecode", "abi"],
          "": ["ast"]
        },
      },
      optimizer: {
        enabled: true,
        runs: 150
      },
    }
  },
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_URL,
      accounts: [`0x${process.env.PRIVATE_KEY}`],
      // gasPrice: 20 * 1e9 // Set a specific gas price in gwei (e.g., 120 gwei)
    },
    mainnet: {
      url: process.env.MAINNET_URL,
      accounts: [`0x${process.env.PRIVATE_KEY}`],
      gasPrice: 17 * 1e9 // Set a specific gas price in gwei (e.g., 120 gwei)
    },
    // etherscan: {
    //   apiKey: {
    //     mainnet: "YOUR_ETHERSCAN_API_KEY",  // Replace with your Etherscan API key for mainnet
    //     sepolia: "YOUR_ETHERSCAN_API_KEY",  // Replace with your Etherscan API key for Sepolia
    //   },
    // },
  }
};
