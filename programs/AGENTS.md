# Solana & Anchor Smart Contract Rules (`programs/`)

## Rule 3: Solana and Anchor Development Rules

1. **Hybrid Trust Model**:
   - The Solana program manages **optional reward-battle deposits, program-controlled escrow, and settlement on Devnet**.
   - Quiz delivery and answer evaluation occur off-chain. An **authorized backend authority signer** submits the verified battle outcome to the program to trigger settlement. Never claim on-chain answer verification.
2. **Account Validation & PDA Design**:
   - Derive all Battle State and Escrow Vault accounts deterministically using canonical PDA seeds (e.g., `[b"battle", battle_id.as_bytes()]`) and store/verify canonical bump seeds.
   - Enforce strict Anchor account constraints on every instruction: `has_one`, `seeds`, `bump`, `constraint`, token `mint`, and `authority`.
   - Verify signer requirements explicitly (`Signer<'info>`) for player deposits, cancellations, and backend authority finalization.
   - Validate SPL Token accounts (`token::mint`, `token::authority`) to prevent token mint or vault substitution attacks.
3. **Escrow State Machine & Arithmetic Safety**:
   - Enforce strict state transitions:
     - `create_battle`: Initializes battle PDA and escrow vault; Creator deposits stake.
     - `join_battle`: Opponent deposits matching stake; transitions battle to funded/ready.
     - `finalize_battle` / `claim_reward`: Requires authorized backend authority signature; settles escrow to winner (or splits on draw) and marks battle `Settled`.
     - `cancel_battle` / `refund_battle`: Permits refund only if opponent never joined or battle expired/cancelled under defined timeout rules.
   - Prevent double settlement or duplicate refunds via terminal state flags and/or account closure (`close = ...`).
   - Use checked integer arithmetic (`checked_add`, `checked_sub`, `checked_mul`, `checked_div`) exclusively; fail with explicit Anchor `#[error_code]` variants on overflow.
4. **Events, IDL & Client Consistency**:
   - Emit Anchor events (`emit!`) for battle creation, join, settlement, cancellation, and refund.
   - Keep `SOLANA_PROGRAM_ID`, `Anchor.toml`, `declare_id!`, and the exported IDL/TypeScript client in `packages/solana` synchronized after every build.
   - Never commit keypairs (`*.json` wallet files), private keys, or seed phrases to version control.
