const { expect } = require("chai");
const { ethers } = require("hardhat");
const defaultAllowlist = require("../default_allowlist.json");

describe("FingerprintsBuyback", function () {
    let mockERC20, mockERC721, buybackContract, deployer, user;
    let mockERC20Address, mockERC721Address, buybackContractAddress;

    beforeEach(async () => {
        [deployer, user] = await ethers.getSigners();

        // Deploy Mock ERC20
        const MockERC20 = await ethers.getContractFactory("ERC20Mock");
        mockERC20 = await MockERC20.deploy("MockToken", "MTK", 18);
        await mockERC20.waitForDeployment();
        mockERC20Address = await mockERC20.getAddress();

        // Deploy Mock ERC721
        const MockERC721 = await ethers.getContractFactory("ERC721Mock");
        mockERC721 = await MockERC721.deploy("MockNFT", "MNFT");
        await mockERC721.waitForDeployment();
        mockERC721Address = await mockERC721.getAddress();

        // Deploy FingerprintsBuyback Contract
        const FingerprintsBuyback = await ethers.getContractFactory("FingerprintsBuyback");
        buybackContract = await FingerprintsBuyback.deploy(
            mockERC20Address,
            mockERC721Address,
            18,
            defaultAllowlist
        );
        await buybackContract.waitForDeployment();
        buybackContractAddress = await buybackContract.getAddress();

        // Fund the contract with some ETH for testing
        await deployer.sendTransaction({
            to: buybackContractAddress,
            value: ethers.parseEther("10"),
        });
    });

    it("should deploy the contract with the correct ERC20 and ERC721 addresses", async () => {
        expect(await buybackContract.token()).to.equal(mockERC20Address);
        expect(await buybackContract.nft()).to.equal(mockERC721Address);
    });

    it("should deploy the contract with the correct token decimals", async () => {
        expect(await buybackContract.tokenDecimals()).to.equal(18);
    });

    it("should allow the owner to set the token exchange rate", async () => {
        const newNftExchangeRate = ethers.parseEther("2"); // BigInt value
        const expectedTokenExchangeRate = newNftExchangeRate / BigInt(5000); // Ensure 5000 is BigInt

        await buybackContract.connect(deployer).setExchangeRateForOneMembership(newNftExchangeRate);

        const tokenExchangeRate = await buybackContract.tokenExchangeRate();
        const nftExchangeRate = await buybackContract.nftExchangeRate();

        expect(nftExchangeRate).to.equal(newNftExchangeRate);
        expect(tokenExchangeRate).to.equal(expectedTokenExchangeRate);
    });

    it("shouldn't allow non-owner to set the token exchange rate", async () => {
        // Try to set the exchange rate
        await expect(buybackContract.connect(user).setExchangeRateForOneMembership(ethers.parseEther("1"))).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should deploy with the correct destination address", async () => {
        expect(await buybackContract.DESTINATION_ADDRESS()).to.equal("0xbC49de68bCBD164574847A7ced47e7475179C76B");
    });

    it("should allow user to swap ERC20 for ETH", async () => {
        // Capture user's initial ETH balance
        const initialUserETHBalance = await ethers.provider.getBalance(user.address);

        // Mint some ERC20 tokens to user
        await mockERC20.transfer(user.address, ethers.parseUnits("10000", 18));

        // Approve the FingerprintsBuyback contract to spend user's tokens
        await mockERC20.connect(user).approve(buybackContractAddress, ethers.parseUnits("10000", 18));

        // allowlist the user
        await buybackContract.addToAllowlist(user.address);

        const swapAmountTokens = ethers.parseUnits("5000", 18);

        // Perform the swap and get the transaction receipt
        const swapTx = await buybackContract.connect(user).swapERC20forETH(swapAmountTokens);
        const receipt = await swapTx.wait();

        // Calculate gas cost
        const gasUsed = receipt.gasUsed; // BigInt
        const gasPrice = receipt.gasPrice; // BigInt
        const gasCost = gasUsed * gasPrice; // BigInt

        // Capture user's ETH balance after the swap
        const finalUserETHBalance = await ethers.provider.getBalance(user.address); // BigInt

        // Calculate expected ETH received based on exchange rate
        const exchangeRate = await buybackContract.tokenExchangeRate(); // BigInt
        const expectedETHReceived = (swapAmountTokens * exchangeRate) / ethers.parseUnits("1", 18); // BigInt

        // Calculate the expected final balance
        const expectedFinalBalance = initialUserETHBalance + expectedETHReceived - gasCost; // BigInt

        // Manually compare the balances using BigInt comparisons
        const balanceDifference = finalUserETHBalance > expectedFinalBalance
            ? finalUserETHBalance - expectedFinalBalance
            : expectedFinalBalance - finalUserETHBalance; // BigInt

        // Define acceptable difference
        const acceptableDifference = ethers.parseEther("0.01"); // BigInt

        // Perform the comparison
        const isWithinRange = balanceDifference <= acceptableDifference;

        // Assert that the balance difference is within the acceptable range
        expect(isWithinRange).to.be.true;
    });

    it("shouldn't allow user to swap ERC20 for ETH if they are not allowlisted", async () => {
        // Mint some ERC20 tokens to user
        await mockERC20.transfer(user.address, ethers.parseUnits("10000", 18));

        // Approve the FingerprintsBuyback contract to spend user's tokens
        await mockERC20.connect(user).approve(buybackContractAddress, ethers.parseUnits("10000", 18));

        // Try to perform the swap
        await expect(buybackContract.connect(user).swapERC20forETH(ethers.parseUnits("5000", 18))).to.be.revertedWith("Address not allowlisted");
    });

    it("shouldn't allow user to swap ERC20 for ETH if their limit has been exceeded", async () => {
        // Mint some ERC20 tokens to user
        await mockERC20.transfer(user.address, ethers.parseUnits("10000", 18));

        // Approve the FingerprintsBuyback contract to spend user's tokens
        await mockERC20.connect(user).approve(buybackContractAddress, ethers.parseUnits("10000", 18));

        // allowlist the user
        await buybackContract.addToAllowlist(user.address);

        // Perform the swap
        await buybackContract.connect(user).swapERC20forETH(ethers.parseUnits("5000", 18));

        // Try to perform the swap again
        await expect(buybackContract.connect(user).swapERC20forETH(ethers.parseUnits("5000", 18))).to.be.revertedWith("Token swap limit exceeded");
    });

    it("should allow user to swap NFT for ETH", async () => {
        // Mint an NFT to the user
        await mockERC721.connect(user).mint();

        // allowlist the user
        await buybackContract.addToAllowlist(user.address);

        // **Add approval step here**
        // User approves the buyback contract to transfer their NFT
        await mockERC721.connect(user).approve(buybackContractAddress, 0); // Token ID 0

        // Perform the NFT swap
        await buybackContract.connect(user).swapNFTforETH(0); // Token ID 0

        // Verify the contract holds the NFT
        expect(await mockERC721.ownerOf(0)).to.equal(buybackContractAddress);

        // Check user received ETH
        const userETHBalance = await ethers.provider.getBalance(user.address);
        expect(userETHBalance).to.be.greaterThan(ethers.parseEther("3.47")); // Assuming initial balance was 0 ETH
    });

    it("shouldn't allow user to swap a second NFT for ETH if he has already done so once", async () => {
        // Mint an NFT to the user
        await mockERC721.connect(user).mint();

        // allowlist the user
        await buybackContract.addToAllowlist(user.address);

        // **Add approval step here**
        // User approves the buyback contract to transfer their NFT
        await mockERC721.connect(user).approve(buybackContractAddress, 0); // Token ID 0

        // Perform the NFT swap
        await buybackContract.connect(user).swapNFTforETH(0); // Token ID 0

        // Verify the contract holds the NFT
        expect(await mockERC721.ownerOf(0)).to.equal(buybackContractAddress);

        // Check user received ETH
        const userETHBalance = await ethers.provider.getBalance(user.address);
        expect(userETHBalance).to.be.greaterThan(ethers.parseEther("3.47")); // Assuming initial balance was 0 ETH

        // Try to swap the NFT again
        await expect(buybackContract.connect(user).swapNFTforETH(0)).to.be.revertedWith("NFT swap limit exceeded");

        // Mint a second NFT to the user
        await mockERC721.connect(user).mint();

        // **Add approval step here**
        // User approves the buyback contract to transfer their NFT
        await mockERC721.connect(user).approve(buybackContractAddress, 1); // Token ID 1

        // Perform the NFT swap, this transaction should fail!
        await expect(buybackContract.connect(user).swapNFTforETH(1)).to.be.revertedWith("NFT swap limit exceeded");
    });

    it("shouldn't allow the user to swap an NFT for ETH if he has already swapped an ERC20 token", async () => {
        // Mint some ERC20 tokens to user
        await mockERC20.transfer(user.address, ethers.parseUnits("10000", 18));

        // Approve the FingerprintsBuyback contract to spend user's tokens
        await mockERC20.connect(user).approve(buybackContractAddress, ethers.parseUnits("10000", 18));

        // allowlist the user
        await buybackContract.addToAllowlist(user.address);

        // Perform the swap
        await buybackContract.connect(user).swapERC20forETH(ethers.parseUnits("5000", 18));

        // Verify ETH balance change for the user
        const userETHBalance = await ethers.provider.getBalance(user.address);
        expect(userETHBalance).to.be.greaterThan(ethers.parseEther("3.4")); // Assuming initial balance was 0 ETH

        // Mint an NFT to the user
        await mockERC721.connect(user).mint();

        // **Add approval step here**
        // User approves the buyback contract to transfer their NFT
        await mockERC721.connect(user).approve(buybackContractAddress, 0); // Token ID 0

        // Perform the NFT swap, this transaction should fail!
        await expect(buybackContract.connect(user).swapNFTforETH(0)).to.be.revertedWith("You've already swapped ERC20 tokens.");
    });

    it("shouldn't allow the user to swap an NFT for ETH if he is not allowlisted", async () => {
        // Mint an NFT to the user
        await mockERC721.connect(user).mint();

        // **Add approval step here**
        // User approves the buyback contract to transfer their NFT
        await mockERC721.connect(user).approve(buybackContractAddress, 0); // Token ID 0

        // Perform the NFT swap, this transaction should fail!
        await expect(buybackContract.connect(user).swapNFTforETH(0)).to.be.revertedWith("Address not allowlisted");
    });

    it("should allow the owner to add and remove addresses from the allowlist", async () => {
        // Add user to allowlist
        await buybackContract.connect(deployer).addToAllowlist(user.address);
        expect(await buybackContract.isAllowlisted(user.address)).to.be.true;

        // Remove user from allowlist
        await buybackContract.connect(deployer).removeFromAllowlist(user.address);
        expect(await buybackContract.isAllowlisted(user.address)).to.be.false;
    });

    it("shouldn't allow non-owner to add or remove addresses from the allowlist", async () => {
        // Try to add user to allowlist
        await expect(buybackContract.connect(user).addToAllowlist(user.address)).to.be.revertedWith("Ownable: caller is not the owner");

        // Try to remove user from allowlist
        await expect(buybackContract.connect(user).removeFromAllowlist(user.address)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should allow the owner to withdraw ETH from the contract", async () => {
        // Capture initial balances
        const initialDeployerBalance = await ethers.provider.getBalance(deployer.address); // BigInt

        // Perform the withdrawal and get the transaction receipt
        const withdrawTx = await buybackContract.connect(deployer).withdrawETH(ethers.parseEther("10"));
        const receipt = await withdrawTx.wait();

        // Calculate gas cost
        const gasUsed = receipt.gasUsed; // BigInt
        const gasPrice = receipt.gasPrice; // BigInt
        const gasCost = gasUsed * gasPrice; // BigInt

        // Capture owner's ETH balance after the withdrawal
        const finalDeployerBalance = await ethers.provider.getBalance(deployer.address); // BigInt

        // Calculate the expected final balance
        const expectedFinalBalance = initialDeployerBalance + ethers.parseEther("10") - gasCost; // BigInt

        // Manually compare the balances using BigInt comparisons
        const balanceDifference = finalDeployerBalance > expectedFinalBalance
            ? finalDeployerBalance - expectedFinalBalance
            : expectedFinalBalance - finalDeployerBalance; // BigInt

        // Define acceptable difference
        const acceptableDifference = ethers.parseEther("0.01"); // BigInt

        // Perform the comparison
        const isWithinRange = balanceDifference <= acceptableDifference;

        // Assert that the balance difference is within the acceptable range
        expect(isWithinRange).to.be.true;
    });

    it("shouldn't allow non-owner to withdraw ETH from the contract", async () => {
        // Try to perform the withdrawal
        await expect(buybackContract.connect(user).withdrawETH(ethers.parseEther("1"))).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should allow anyone to trigger sendTokensToDestination, sending all ERC20 and NFTs to the destination address", async () => {
        // obtain destination address
        const destinationAddress = await buybackContract.DESTINATION_ADDRESS();

        // Mint some ERC20 tokens to the contract
        await mockERC20.transfer(buybackContractAddress, ethers.parseUnits("10000", 18));
        // Mint an NFT and send it to the contract
        await mockERC721.mint();
        const tokenId = 0;
        await mockERC721.transferFrom(deployer.address, buybackContractAddress, tokenId);

        // Verify the contract holds the ERC20 tokens
        expect(await mockERC20.balanceOf(buybackContractAddress)).to.equal(ethers.parseUnits("10000", 18));

        // Verify the contract holds the NFT
        expect(await mockERC721.ownerOf(0)).to.equal(buybackContractAddress);

        // Verify the destination address doesn't hold the ERC20 tokens
        expect(await mockERC20.balanceOf(destinationAddress)).to.equal(0);

        // Verify the destination address doesn't hold the NFT
        expect(await mockERC721.ownerOf(0)).to.not.equal(destinationAddress);

        // Send all ERC20 and NFTs to the destination address
        await buybackContract.sendTokensToDestination();

        // Verify the destination address holds the ERC20 tokens
        expect(await mockERC20.balanceOf(destinationAddress)).to.equal(ethers.parseUnits("10000", 18));

        // Verify the destination address holds the NFT
        expect(await mockERC721.ownerOf(0)).to.equal(destinationAddress);
    });

    it("should revert sendTokensToDestination when there aren't any ERC20s or ERC721s in the contract", async () => {
        // Try to send all ERC20 and NFTs to the destination address
        await expect(buybackContract.sendTokensToDestination()).to.be.revertedWith("No tokens or NFTs to send");
    });

    it("should refuse to receive NFTs sent without a swap", async () => {
        // Mint an NFT and send it to the contract
        await mockERC721.mint();
        const tokenId = 0;
        await expect(mockERC721.safeTransferFrom(deployer.address, buybackContractAddress, tokenId)).to.be.revertedWith("NFTs not accepted without a swap");
    });

    it("should allow the owner to recover ERC20 tokens sent directly to the contract", async () => {
        // Mint some ERC20 tokens to the contract
        await mockERC20.transfer(buybackContractAddress, ethers.parseUnits("10000", 18));

        // Verify the contract holds the ERC20 tokens
        expect(await mockERC20.balanceOf(buybackContractAddress)).to.equal(ethers.parseUnits("10000", 18));

        // Recover the ERC20 tokens
        await buybackContract.connect(deployer).recoverERC20Tokens(mockERC20Address, ethers.parseUnits("10000", 18));

        // Verify the contract no longer holds the ERC20 tokens
        expect(await mockERC20.balanceOf(buybackContractAddress)).to.equal(0);
    });

    it("should allow the owner to recover ERC721 tokens sent directly to the contract", async () => {
        // Mint an NFT and send it to the contract
        await mockERC721.mint();
        const tokenId = 0;
        await mockERC721.transferFrom(deployer.address, buybackContractAddress, tokenId);

        // Verify the contract holds the NFT
        expect(await mockERC721.ownerOf(tokenId)).to.equal(buybackContractAddress);

        //  Try to recover the NFT with the correct function, expect it to succeed
        await buybackContract.connect(deployer).recoverERC721Tokens(mockERC721Address, tokenId);

        // Verify the contract no longer holds the NFT
        expect(await mockERC721.ownerOf(tokenId)).to.equal(deployer.address);

        // Verify the owner now holds the NFT
        expect(await mockERC721.ownerOf(tokenId)).to.equal(deployer.address);
    });

    it("shouldn't allow the owner to recover ERC20 tokens if the contract doesn't hold any", async () => {
        // Try to recover the ERC20 tokens
        await expect(buybackContract.connect(deployer).recoverERC20Tokens(mockERC20Address, ethers.parseUnits("10000", 18))).to.be.revertedWith("Contract does not own the tokens you want to recover");
    });

    it("shouldn't allow non-owner to recover ERC20 tokens", async () => {
        // Mint some ERC20 tokens to the contract
        await mockERC20.transfer(buybackContractAddress, ethers.parseUnits("10000", 18));

        // Try to recover the ERC20 tokens
        await expect(buybackContract.connect(user).recoverERC20Tokens(mockERC20Address, ethers.parseUnits("10000", 18))).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("shouldn't allow non-owner to recover ERC721 tokens", async () => {
        // Mint an NFT and send it to the contract
        await mockERC721.mint();
        const tokenId = 0;
        await mockERC721.transferFrom(deployer.address, buybackContractAddress, tokenId);

        // Try to recover the NFT
        await expect(buybackContract.connect(user).recoverERC721Tokens(mockERC721Address, tokenId)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should allow the owner to set the allowlist to an array of addresses", async () => {
        // Add a random address to the allowlist
        await buybackContract.connect(deployer).addToAllowlist("0x586Bc43937C2eC42348cc83Acf44CED42Fe3d5f7");

        // addresses to allowlist
        const addresses = [
            "0x4Eb40136Eda0b3e2cEC97F0B2b006C8F0066Bf89",
            "0xba7CfbD459dfa75ddBB9901C661804D06fd4DBaC",
            "0xe8Bd796D3002d8756f833E62950f25b719dd4AFA",
            "0x3Ef5F421E155Ed29e6Fa815FD875bFCD5f22eCd1",
            "0x6B796Cc1222e57875AAC57aD8c049137Ea898bb0",
            "0xCb3408baD3192777e561B362e8467c213231Ef9f",
            "0xE61b38b4E61b09345c29e23e978583D254272376",
            "0x988689aD7929968Fca6523F5C54C7377159E58D1"
        ]

        // Set the allowlist
        await buybackContract.connect(deployer).setAllowlist(addresses);

        // Verify the allowlist
        for (let i = 0; i < addresses.length; i++) {
            expect(await buybackContract.isAllowlisted(addresses[i])).to.be.true;
        }

        // Verify the random address is not in the allowlist
        expect(await buybackContract.isAllowlisted(user.address)).to.be.false;
    });

});
