// npx hardhat node
// npx hardhat run scripts/deploy_local.js --network localhost

// flatten contract command:
// npx hardhat flatten contracts/FingerprintsBuyback.sol > flattened/FingerprintsBuyback.sol

const { ethers } = require("hardhat");
const defaultAllowlist = require("../default_allowlist.json");

async function main() {
    try {
        // Compile contracts
        await hre.run('compile');
        const [deployer] = await ethers.getSigners();
        console.log("Deploying contracts with the account:", deployer.address);

        // Deploy Mock ERC20 Token
        const MockERC20 = await ethers.getContractFactory("ERC20Mock");
        const mockERC20 = await MockERC20.deploy("MockToken", "MTK", 18);
        const tokenAddress = mockERC20.target;
        if (!tokenAddress) throw new Error("Failed to deploy MockERC20");
        console.log("MockERC20 deployed at:", tokenAddress);

        // Deploy Mock ERC721 Token
        const MockERC721 = await ethers.getContractFactory("ERC721Mock");
        const mockERC721 = await MockERC721.deploy("MockNFT", "MNFT");
        await mockERC721.waitForDeployment();
        const nftAddress = mockERC721.target;
        if (!nftAddress) throw new Error("Failed to deploy MockERC721");
        console.log("MockERC721 deployed at:", nftAddress);

        // Deploy FingerprintsBuyback Contract with Mock Token/NFT
        const FingerprintsBuyback = await ethers.getContractFactory("FingerprintsBuyback");
        const tokenSwapContract = await FingerprintsBuyback.deploy(tokenAddress, nftAddress, 18, defaultAllowlist);
        await tokenSwapContract.waitForDeployment();
        const tokenSwapContractAdress = tokenSwapContract.target;
        console.log("FingerprintsBuyback contract deployed to:", tokenSwapContractAdress);

    } catch (error) {
        console.error("Error deploying contracts:", error);
    }
}

main().catch((error) => {
    console.error("Error in main function:", error);
    process.exitCode = 1;
});