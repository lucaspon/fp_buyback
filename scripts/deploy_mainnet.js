// deploy command on terminal:
// npx hardhat run scripts/deploy_mainnet.js --network mainnet

// flatten contract terminal command:
// npx hardhat flatten contracts/FingerprintsBuyback.sol > flattened/FingerprintsBuyback.sol

// Import ethers from hardhat (ethers.js v6)
const { ethers, run } = require("hardhat");
const defaultAllowlist = require("../default_allowlist.json");
const readline = require('readline');

async function main() {
    const ERC20Address = "0x4dd28568D05f09b02220b09C2cb307bFd837cb95"; // Token contract address
    const ERC721Address = "0xa94161fbe69e08ff5a36dfafa61bdf29dd2fb928"; // NFT contract address

    try {
        // Compile contracts
        await run('compile');

        const [deployer] = await ethers.getSigners();

        // Log all parameters
        console.log("Deploying contracts with the account:", deployer.address);
        console.log("Token Address:", ERC20Address);
        console.log("NFT Address:", ERC721Address);
        console.log("Default Allowlist:", defaultAllowlist);

        // Get FingerprintsBuyback Contract
        const FingerprintsBuyback = await ethers.getContractFactory("FingerprintsBuyback", deployer);

        const gasUnits = BigInt(2700000); // gas units
        const maxGasPrice = BigInt(18 * 1e9); // 200 gwei
        console.log("Max fee per gas:", ethers.formatUnits(maxGasPrice, "gwei"), "gwei");

        // Calculate total cost
        const totalCost = gasUnits * maxGasPrice + BigInt(2 * 1e9); // 0 wei
        console.log("Estimated deployment cost:", ethers.formatEther(totalCost), "ETH");


        // Prompt user for confirmation
        const getUserConfirmation = () => {
            return new Promise((resolve) => {
                const rl = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout
                });
                rl.question("Do you want to proceed with the deployment? (y/n) ", (answer) => {
                    rl.close();
                    resolve(answer);
                });
            });
        };

        const answer = await getUserConfirmation();

        // Do not proceed if user does not confirm
        if (answer.toLowerCase() !== 'y') {
            console.log("Exiting deployment script");
            process.exit();
        }


        console.log("PROCEEDING WITH DEPLOYMENT...");

        // Deploy the contract with the gas limit and fee data
        const tokenSwapContract = await FingerprintsBuyback.deploy(
            ERC20Address,
            ERC721Address,
            18,
            defaultAllowlist,
            // {
            //     gasLimit: gasLimit,
            //     maxGasPrice: maxGasPrice,
            //     maxPriorityFeePerGas: maxPriorityFeePerGas
            // }
        );

        console.log("Deploying contract...");
        await tokenSwapContract.waitForDeployment(); // For ethers.js v6

        const tokenSwapContractAddress = await tokenSwapContract.getAddress();
        console.log("FingerprintsBuyback contract deployed to:", tokenSwapContractAddress);

    } catch (error) {
        console.error("Error deploying contracts:", error);
        process.exit(1); // Exit with failure
    }
}

main().catch((error) => {
    console.error("Error in main function:", error);
    process.exitCode = 1;
});