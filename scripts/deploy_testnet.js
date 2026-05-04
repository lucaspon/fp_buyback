// deploy command on terminal:
// npx hardhat run scripts/deploy_testnet.js --network sepolia

// flatten contract terminal command:
// npx hardhat flatten contracts/FingerprintsBuyback.sol > flattened/FingerprintsBuyback.sol

// Import ethers from hardhat (ethers.js v6)
const { ethers, run } = require("hardhat");
const readline = require('readline');
const fs = require('fs'); // Import fs module to handle file operations

const defaultAllowlist = require("../default_allowlist.json");

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

        const gasUnits = BigInt(4000000); // gas units
        const maxGasPrice = BigInt(150 * 1e9); // 150 gwei
        console.log("Max fee per gas:", ethers.formatUnits(maxGasPrice, "gwei"), "gwei");

        // Calculate total cost
        const totalCost = gasUnits * maxGasPrice; // Adjusted calculation
        console.log("Estimated deployment cost:", ethers.formatEther(totalCost), "ETH");

        // Encode constructor arguments
        const constructorTypes = ['address', 'address', 'uint8', 'address[]'];
        const constructorArgs = [ERC20Address, ERC721Address, 18, defaultAllowlist];

        const abiCoder = ethers.AbiCoder.defaultAbiCoder();
        const encodedArgs = abiCoder.encode(constructorTypes, constructorArgs);

        // Remove the '0x' prefix if present
        const encodedArgsHex = encodedArgs.startsWith('0x') ? encodedArgs.slice(2) : encodedArgs;

        // Save the encoded arguments to arguments.txt
        fs.writeFileSync('arguments.txt', encodedArgsHex);

        console.log('Constructor arguments ABI encoded and saved to arguments.txt');


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

        // Deploy the contract
        const tokenSwapContract = await FingerprintsBuyback.deploy(
            ERC20Address,
            ERC721Address,
            18,
            defaultAllowlist
            // You can add gas parameters if needed
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
