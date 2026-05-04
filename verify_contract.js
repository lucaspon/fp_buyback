require('dotenv').config();
const { run } = require("hardhat");

async function verifyContract() {
    const contractAddress = process.env.CONTRACT_ADDRESS;
    if (!contractAddress) {
        console.error("Set CONTRACT_ADDRESS in .env");
        process.exit(1);
    }

    const constructorArgs = [
        process.env.TOKEN_ADDRESS || "0x4dd28568D05f09b02220b09C2cb307bFd837cb95",
        process.env.NFT_ADDRESS || "0xa94161fbe69e08ff5a36dfafa61bdf29dd2fb928",
        18,
        require("./default_allowlist.json")
    ];

    console.log("Verifying contract at:", contractAddress);

    try {
        await run("verify:verify", {
            address: contractAddress,
            constructorArguments: constructorArgs,
        });
    } catch (error) {
        if (error.message.toLowerCase().includes("already verified")) {
            console.log("Contract already verified");
        } else {
            console.error("Verification failed:", error);
            process.exit(1);
        }
    }
}

verifyContract().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
