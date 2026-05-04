# FingerprintsBuyback — Audit Findings & Improvement Notes

> Status: documented only — not fixed.

---

## 1. Smart Contract (`FingerprintsBuyback.sol`)

### 🔴 Bugs

| # | Issue | Location / Details |
|---|-------|-------------------|
| 1.1 | **Dead code in `withdrawETH`** | `require(amount > 0, ...)` makes the subsequent `if (amount == 0)` branch unreachable. If the intent was to allow `0` as a sentinel for "withdraw all", the `require` should be removed or changed. |
| 1.2 | **`sendTokensToDestination` never emits `TokensSentToDestination` when NFTs are present** | The event is only emitted inside `if (nftBalance == 0)`. If the contract holds ≥1 NFT, the function returns after the loop without emitting anything, even though ERC20 tokens may also have been transferred. |
| 1.3 | **`sendTokensToDestination` ignores ERC20 `transfer` return value** | `token.transfer(DESTINATION_ADDRESS, contractTokenBalance)` is unchecked. If the token returns `false` instead of reverting (e.g., some non-standard ERC20s), the function silently continues and emits success. |
| 1.4 | **Missing event emissions for recovery functions** | `recoverERC20Tokens` and `recoverERC721Tokens` should emit events (e.g., `TokensRecovered`, `NFTRecovered`) for off-chain traceability. |
| 1.5 | **`tokenDecimals` passed manually instead of reading from `IERC20Metadata`** | The constructor accepts `_tokenDecimals` but also imports `IERC20Metadata`. Passing the wrong value breaks all `swapERC20forETH` math. Should call `IERC20Metadata(_tokenAddress).decimals()` and validate it matches, or remove the parameter. |
| 1.6 | **Constructor lacks zero-address validation** | `_tokenAddress` and `_nftAddress` are not checked against `address(0)`. |
| 1.7 | **`setAllowlist` can emit duplicate `AddressAllowlisted` events** | If an address is already allowlisted, it is overwritten but still emits an event. Should skip or require `!allowlist[addr]`. |
| 1.8 | **`sendTokensToDestination` is permissionless** | Anyone can force the contract to dump all held tokens/NFTs to the hardcoded destination at any time. This removes owner discretion on timing and could be griefed (e.g., front-running a planned multi-step operation). Consider `onlyOwner`. |
| 1.9 | **ERC20 recovery uses bare `transfer` without checking return value** | `recoverERC20Tokens` does `IERC20(tokenAddress).transfer(owner(), tokenAmount)` without a `require(success)` or `safeTransfer` wrapper. |
| 1.10 | **`recoverERC721Tokens` uses `safeTransferFrom` without `nonReentrant`** | While restricted to `onlyOwner`, if the owner is a contract it introduces a reentrancy surface. Consider adding `nonReentrant`. |
| 1.11 | **Integer division precision loss in exchange rate** | `tokenExchangeRate = _nftExchangeRate / 5000` truncates. The aggregate payout for exactly 5000 tokens may be slightly less than 1 NFT’s worth of ETH due to rounding (e.g., if `_nftExchangeRate` is not evenly divisible by 5000). Document this or use a scaled-math approach. |

### 🟡 Improvements

| # | Issue | Suggestion |
|---|-------|-----------|
| 1.12 | **CEI pattern partially violated** | In `swapERC20forETH` and `swapNFTforETH`, state updates happen *after* the token/NFT transfer but *before* the ETH transfer. Add `nonReentrant` mitigates risk, but moving state updates before any external calls is cleaner. |
| 1.13 | **`sendTokensToDestination` should emit a unified event** | Consider emitting one event that includes both token amount and NFT count, regardless of which assets are present. |
| 1.14 | **`sendTokensToDestination` uses `transferFrom` for NFTs** | Since `DESTINATION_ADDRESS` is currently an EOA this is fine, but if it ever changes to a contract, NFTs could be lost. Use `safeTransferFrom` (with a try/catch if you want to continue on failure). |
| 1.15 | **No batch allowlist removal function** | `setAllowlist` only adds. There is no efficient way to clear the allowlist or bulk-remove addresses. |
| 1.16 | **`onERC721Received` is `pure`** | Correct behavior (always revert), but consider adding a comment explaining *why* it reverts, since `pure` + `revert` is slightly unusual. |
| 1.17 | **Hardcoded `DESTINATION_ADDRESS`** | Fine for a one-off deployment, but reduces flexibility. Consider making it an immutable constructor param. |
| 1.18 | **No upper bound on `setAllowlist` array length** | A malicious or mistaken owner could pass a gas-heavy array and brick the function. Add a reasonable batch-size limit (e.g., 500). |
| 1.19 | **Missing `indexed` on `Swapped`/`NFTSwapped` `tokenAmount`/`tokenId`** | Not required, but improves log filtering. |
| 1.20 | **Solidity version `^0.8.0` is dated** | Bump to at least `^0.8.19` (or `^0.8.24` for PUSH0 gas savings). |

---

## 2. Tests (`test/testBuyback.js`)

| # | Issue | Details |
|---|-------|---------|
| 2.1 | **No event-assertion tests** | None of the tests verify that events (`Swapped`, `NFTSwapped`, `AddressAllowlisted`, etc.) are emitted with correct arguments. |
| 2.2 | **Unreachable `amount == 0` branch not tested** | Because of bug 1.1, there is no test for withdrawing the full balance by passing `0`. |
| 2.3 | **No boundary tests for `setExchangeRateForOneMembership`** | Missing tests for minimum (0.01 ether), maximum (1000 ether), and same-rate reverts. |
| 2.4 | **`sendTokensToDestination` event emission not tested** | No test checks whether the event fires when NFTs are present (it doesn't — see 1.2). |
| 2.5 | **No test for `setAllowlist` duplicate behavior** | Should verify that already-allowlisted addresses remain allowlisted and events fire (or don't fire) accordingly. |
| 2.6 | **No test for `recoverERC20Tokens` with a non-token address** | Should test recovery of arbitrary ERC20s, including ones the contract doesn't own. |
| 2.7 | **No test for precision/rounding in `swapERC20forETH`** | E.g., swapping 1 token when rate is fractional should be tested. |
| 2.8 | **No test for `receive()` ETH deposit event** | Should verify `ETHReceived` is emitted. |
| 2.9 | **`package.json` test script is broken** | `"test": "echo \"Error: no test specified\" && exit 1"` prevents `npm test` from running the actual test suite. Should point to Hardhat: `"test": "hardhat test"`. |
| 2.10 | **No test for `swapNFTforETH` without NFT approval** | Should verify the correct revert when user hasn't `approve`d or `setApprovalForAll`. |
| 2.11 | **No test for reentrancy attempts** | Even with `nonReentrant`, it’s worth having a mock attacker contract attempt reentry and assert it reverts. |

---

## 3. Deployment Scripts

### `scripts/deploy_local.js`

| # | Issue | Details |
|---|-------|---------|
| 3.1 | **Missing `await mockERC20.waitForDeployment()`** | `mockERC20.target` is accessed before the deployment is confirmed. Add `.waitForDeployment()`. |
| 3.2 | **Typo in variable name** | `tokenSwapContractAdress` → should be `tokenSwapContractAddress`. |

### `scripts/deploy_testnet.js`

| # | Issue | Details |
|---|-------|---------|
| 3.3 | **Hardcoded inline `defaultAllowlist` diverges from `default_allowlist.json`** | The script maintains a separate 22-entry array that differs from the JSON file (23 entries). This is a maintenance risk — import the JSON instead. |
| 3.4 | **Encodes constructor args but never uses them** | Writes ABI-encoded args to `arguments.txt` for Etherscan, but the actual deployment passes the raw array. The encoded args and live deployment could drift. |
| 3.5 | **No deployment artifact saved** | Contract address, block number, timestamp, and constructor args should be written to a JSON file for future reference. |

### `scripts/deploy_mainnet.js`

| # | Issue | Details |
|---|-------|---------|
| 3.6 | **Comment says "0 wei" but adds `BigInt(2 * 1e9)`** | The cost calculation comment is wrong — `2 * 1e9` is 2 Gwei, not 0 wei. |
| 3.7 | **Same as 3.5 — no deployment artifact saved** | |
| 3.8 | **Gas parameter math is inconsistent** | `gasUnits` is declared but the commented-out deployment options don't use it consistently. Clean up or remove dead code. |

---

## 4. Configuration & Tooling

| # | Issue | Details |
|---|-------|---------|
| 4.1 | **`hardhat.config.js`: `etherscan` block is inside `networks`** | Etherscan config should be a top-level key, not nested under `networks`. Currently it is commented out and misplaced. |
| 4.2 | **`hardhat.config.js`: `outputSelection` override is unnecessary** | `hardhat-toolbox` handles artifact generation; this override bloats build output. |
| 4.3 | **`package.json` has deprecated `@nomiclabs/hardhat-etherscan`** | Should be removed in favor of `@nomicfoundation/hardhat-verify` (which is already present). |
| 4.4 | **TypeScript deps installed but unused** | `ts-node`, `typescript`, `@types/*`, `typechain` are in `devDependencies` but there are no `.ts` files. If unused, remove to slim install. |
| 4.5 | **Solidity version locked to `0.8.0`** | Bump to a newer 0.8.x for better gas and security. |

---

## 5. Auxiliary / Utility Files

### `allowlist.js`

| # | Issue | Severity |
|---|-------|----------|
| 5.1 | **Hardcoded Infura API key exposed in source** | `https://mainnet.infura.io/v3/YOUR_INFURA_KEY` — rotate this key immediately and move to environment variables. |
| 5.2 | **`convertToWei` is defined but never used** | Dead code; remove or use it. |
| 5.3 | **No input validation on resolved addresses** | If ENS resolution returns `null`, it is silently skipped but the script continues. Should fail loudly or produce a warning list. |
| 5.4 | **`isAddress` is imported but `ethers.isAddress` is used instead** | Minor inconsistency; `isAddress` is unused. |

### `verify_contract.js`

| # | Issue | Severity |
|---|-------|----------|
| 5.5 | **`axios` is not in `package.json`** | `verify_contract.js` requires `axios`, which is not listed in dependencies. Script will fail on a fresh install. |
| 5.6 | **Hardcoded flattened source code string** | The entire contract is pasted as a template literal. Any contract change requires manually regenerating and pasting the flattened output. Use `fs.readFileSync` on the flattened file, or better, use `hardhat-verify` instead. |
| 5.7 | **Hardcoded contract address and constructor args** | `contractAddress` and `constructorArguments` are hardcoded. Should accept CLI args or read from a deployment artifact. |
| 5.8 | **Should be replaced by `hardhat-verify`** | `npx hardhat verify` (or programmatic `run("verify:verify", ...)`) is the idiomatic, maintained approach. This custom script is brittle and redundant. |

### `default_allowlist.json`

| # | Issue | Details |
|---|-------|---------|
| 5.9 | **Inconsistent address casing** | Some addresses are checksummed, others lowercase. Standardize to checksummed format for safety. |
| 5.10 | **Diverges from `deploy_testnet.js` inline array** | As noted in 3.3, keep a single source of truth. |

---

## 6. Repository Hygiene

| # | Issue | Details |
|---|-------|---------|
| 6.1 | **Generated files committed** | `flattened/FingerprintsBuyback.sol`, `arguments.txt`, and possibly `resolved_addresses.json` should not be in git. Add them to `.gitignore`. |
| 6.2 | **Default Hardhat example file still present** | `ignition/modules/Lock.js` is leftover from `npx hardhat init`. Remove it. |
| 6.3 | **`.DS_Store` committed** | macOS system file; add to `.gitignore`. |
| 6.4 | **`README.md` events list is stale** | `ContractPaused` / `ContractUnpaused` are emitted, but `Paused`/`Unpaused` from OpenZeppelin are also emitted by `_pause()` / `_unpause()`. The README only lists the custom events. |
| 6.5 | **No `.env.example`** | Since `.env` is gitignored, provide an `.env.example` with dummy values so new devs know what variables are expected (`SEPOLIA_URL`, `MAINNET_URL`, `PRIVATE_KEY`, `ETHERSCAN_API_KEY`). |

---

## Summary — Priority Ranking

| Priority | Items |
|----------|-------|
| **P0 — Fix before mainnet** | 1.1 (dead code / broken withdraw-all), 1.2 (missing event), 1.3 (unchecked transfer), 1.5 (wrong decimals param), 1.8 (permissionless sendTokensToDestination), 5.1 (exposed Infura key) |
| **P1 — Fix soon** | 1.4 (missing events), 1.6 (zero-address check), 1.9 (unchecked transfer in recover), 1.10 (reentrancy on recover), 1.11 (precision loss), 3.1 (missing waitForDeployment), 3.3 (divergent allowlist), 5.5 (missing axios dep), 5.6 (hardcoded source) |
| **P2 — Nice to have** | 1.12 (CEI pattern), 1.13 (unified event), 1.14 (safeTransferFrom), 1.15 (batch removal), 1.18 (batch size limit), 1.20 (bump solc), 2.1–2.11 (test coverage), 3.5/3.7 (deployment artifacts), 4.x (config cleanup), 6.x (repo hygiene) |
