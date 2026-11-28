import {
  bigint,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { profiles } from "./academic";
import { battles } from "./battles";
import { rewardTxStatusEnum, rewardTxTypeEnum } from "./enums";

/**
 * 1:1 verified Solana wallet association for an authenticated Netmifi student account.
 */
export const walletLinks = pgTable(
  "wallet_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    walletAddress: text("wallet_address").notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("wallet_links_user_id_idx").on(table.userId),
    uniqueIndex("wallet_links_wallet_address_idx").on(table.walletAddress),
  ],
);

/**
 * Expiring cryptographic nonces for verifying Solana wallet ownership via ed25519 signature.
 */
export const walletNonces = pgTable(
  "wallet_nonces",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    walletAddress: text("wallet_address").notNull(),
    nonce: text("nonce").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("wallet_nonces_nonce_idx").on(table.nonce),
    index("wallet_nonces_user_id_idx").on(table.userId),
  ],
);

/**
 * On-chain Solana Devnet transaction audit trail for reward battles.
 */
export const rewardTransactions = pgTable(
  "reward_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    battleId: uuid("battle_id")
      .notNull()
      .references(() => battles.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    walletAddress: text("wallet_address").notNull(),
    txType: rewardTxTypeEnum("tx_type").notNull(),
    txSignature: text("tx_signature").notNull(),
    amountLamports: bigint("amount_lamports", { mode: "number" }).notNull(),
    status: rewardTxStatusEnum("status").notNull().default("confirmed"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("reward_transactions_tx_signature_idx").on(table.txSignature),
    index("reward_transactions_battle_id_idx").on(table.battleId),
  ],
);
