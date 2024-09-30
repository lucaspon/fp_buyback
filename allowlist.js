const { ethers, isAddress } = require("ethers");
const fs = require("fs");

// Define the provider using the updated v6 syntax
const provider = new ethers.JsonRpcProvider('https://mainnet.infura.io/v3/27f2653681924dc880f3c24ed0f1c6de');

// Array of addresses and ENS names
const addresses = [
    "0x5400DB91661Ad2b2a5664cAaF81C5Cae8AafF514",
    "0x0bcd26fddecfb8378c665cc1043d930c5338d913",
    "0x134309c4cf57BfA43EF66bF20bD0EEcCDEb2D80c",
    "0x8441350afbda23ba2476a4b92823be0a0402472f",
    "0x8fd5e8D8b3d6a407Eb9F5f8A6572A0410aB26685",
    "brennen.eth",
    "0xD7D184Fec20A50aa7e522aa2f92971B5B1bb2A88",
    "0x9bDc866b4B03452Df00c8C67a4A215C104Dc8D41",
    "dianarh7515",
    "0x85b6aA398ADc6272bb57D50f7f2B9fa904f5C2CF",
    "0xaf12f9Ff76FBBc5e59b95351444F9894f9978CEB",
    "0x6E6846E85a737E3a79c754BbD3Eb57aEf14ca60A",
    "0x96657983C61204DFB339363446d7ef834c8cd7B6",
    "0x2013327cFD7D84E95655A6D5c95eFCfd14C24C98",
    "0x639471e8f268868777f1196AC33cB3FE1BdB2440",
    "0x7939FA1aFc7D8C6CeB0b5873424033d9187aCF71",
    "Steviep.eth",
    "0xBDCa0A84C5c9f67cDCC615e60221c088971620e4",
    "0x8d8100705Fb6676B97BCaC87617eE4704c5d00F3",
    "0x2c87fD92DA54Ab1af3683B5E70E6Dc065F5Df490",
    "0xA96F33ff60b0ea64696543A244bAf95b71584358",
    "0x0DDA698d2Fe2Fc1Fb8F5b54ee9cD77FBd5a1d08b",
    "0x14df40586e0F2Ca5CA222DB0dAc8Df2f4C5b1AAb",
    "Mb-vault.eth",
];



// Function to resolve ENS names and save only addresses
async function resolveAddresses(addressArray) {
    let results = [];

    for (const addr of addressArray) {
        try {
            if (ethers.isAddress(addr)) {
                // If it's already an address, add it directly
                results.push(addr);
            } else {
                // Resolve ENS name to Ethereum address
                const resolvedAddress = await provider.resolveName(addr);
                if (resolvedAddress) results.push(resolvedAddress);
            }
        } catch (error) {
            console.error(`Error resolving ${addr}: ${error.message}`);
        }
    }

    // Save the results as a JSON array
    fs.writeFileSync("default_allowlist.json", JSON.stringify(results, null, 2), "utf8");
    console.log("Resolved addresses saved to default_allowlist.json");
}

function convertToWei(amount, decimals) {
    const wei_amount = amount * Math.pow(10, decimals);
    console.log(wei_amount.toString());
    return wei_amount;
}

// Call the function to resolve addresses
resolveAddresses(addresses);


