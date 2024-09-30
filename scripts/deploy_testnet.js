// deploy command on terminal:
// npx hardhat run scripts/deploy_testnet.js --network sepolia

// flatten contract terminal command:
// npx hardhat flatten contracts/FingerprintsBuyback.sol > flattened/FingerprintsBuyback.sol

// Import ethers from hardhat (ethers.js v6)
const { ethers, run } = require("hardhat");
const readline = require('readline');
const fs = require('fs'); // Import fs module to handle file operations

const defaultAllowlist = [
    "0x5400DB91661Ad2b2a5664cAaF81C5Cae8AafF514",
    "0x0bcd26fddecfb8378c665cc1043d930c5338d913",
    "0x134309c4cf57BfA43EF66bF20bD0EEcCDEb2D80c",
    "0x8441350afbda23ba2476a4b92823be0a0402472f",
    "0x8fd5e8D8b3d6a407Eb9F5f8A6572A0410aB26685",
    "0x2666f0C8FB58d182f2Dd79475DCA4A07B3724607",
    "0x9bDc866b4B03452Df00c8C67a4A215C104Dc8D41",
    "0x85b6aA398ADc6272bb57D50f7f2B9fa904f5C2CF",
    "0xaf12f9Ff76FBBc5e59b95351444F9894f9978CEB",
    "0x6E6846E85a737E3a79c754BbD3Eb57aEf14ca60A",
    "0xE61b38b4E61b09345c29e23e978583D254272376",
    "0x2013327cFD7D84E95655A6D5c95eFCfd14C24C98",
    "0x639471e8f268868777f1196AC33cB3FE1BdB2440",
    "0x988689aD7929968Fca6523F5C54C7377159E58D1",
    "0x7939FA1aFc7D8C6CeB0b5873424033d9187aCF71",
    "0x47144372eb383466D18FC91DB9Cd0396Aa6c87A4",
    "0xBDCa0A84C5c9f67cDCC615e60221c088971620e4",
    "0x8d8100705Fb6676B97BCaC87617eE4704c5d00F3",
    "0x2c87fD92DA54Ab1af3683B5E70E6Dc065F5Df490",
    "0xA96F33ff60b0ea64696543A244bAf95b71584358",
    "0x0DDA698d2Fe2Fc1Fb8F5b54ee9cD77FBd5a1d08b",
    "0x380a813796131eae4d80A5F2B358243C0D40a1bB"
];

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
