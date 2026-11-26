/**
 * Solana Devnet Reward Escrow client & PDA seed constants.
 * Full Anchor IDL bindings and transaction builders are implemented in Milestone 9.
 */

export const BATTLE_ESCROW_SEED_PREFIX = "battle" as const;
export const BATTLE_VAULT_SEED_PREFIX = "battle_vault" as const;

export type OnChainBattleEscrowStatus =
  | "Created"
  | "Funded"
  | "Settled"
  | "Cancelled"
  | "Refunded";

export interface EscrowProgramConfig {
  network: "devnet" | "localnet";
  rpcUrl: string;
  programId: string;
}
