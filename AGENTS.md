# Agent & Developer Guide (`AGENTS.md`)

This guide outlines system-specific instructions for environment configuration and secrets management.

## 1. Secrets Management
The repository stores an age-encrypted `.env.enc` file. The matching plaintext
`.env` file stays local and remains ignored by Git.

### Injected Environment Secrets
The local `.env` file supplies:

| Secret Key | Requirement | Purpose |
| :--- | :--- | :--- |
| `PRIVATE_KEY` | **Highly Critical** | Raw ECDSA private key used for signing on-chain transactions. |
| `MAINNET_URL` | Required | Ethereum Mainnet JSON-RPC node provider URL (Infura). |
| `SEPOLIA_URL` | Required | Ethereum Sepolia testnet JSON-RPC node provider URL (Infura). |
| `ETHERSCAN_API_KEY` | Optional | Etherscan API key to fetch contract verified source codes and ABI. |

## 2. Command Execution Workflow
Restore `.env` only on a trusted machine. `age` prompts for the password:

```nu
^age --decrypt .env.enc | save --force .env
^npm install
^npx hardhat test
```

Never print decrypted secrets or commit `.env`.
