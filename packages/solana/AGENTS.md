# Solana TypeScript Client & IDL Rules (`packages/solana`)

## Rule 3: Solana and Anchor Development Rules (Client & SDK)

1. **IDL & Program ID Synchronization**:
   - Export strongly typed program clients, PDA derivation helpers, and transaction builders generated from the latest Anchor IDL in `programs/`.
   - Ensure PDA seeds in TypeScript match the Rust program's exact byte seeds (`[Buffer.from("battle"), Buffer.from(battleId)]`).
   - Read `NEXT_PUBLIC_SOLANA_NETWORK`, `NEXT_PUBLIC_SOLANA_RPC_URL`, and `SOLANA_PROGRAM_ID` from validated environment configuration (defaulting to Devnet for the hackathon).
2. **Transaction Construction & Security**:
   - Never include or expose the backend settlement authority keypair in client-importable modules. Separate client transaction builders (deposit/join/cancel) from server-only authority instructions (`finalize_battle`).
   - Verify account states and balances before submitting transactions and surface deterministic Anchor error descriptions.
   - Never store or log private keys or seed phrases.
