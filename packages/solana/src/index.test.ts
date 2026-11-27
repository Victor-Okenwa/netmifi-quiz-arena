import { describe, expect, it } from "bun:test";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import {
  BATTLE_ESCROW_ACCOUNT_DISCRIMINATOR,
  type DecodedBattleEscrowState,
  INSTRUCTION_DISCRIMINATORS,
  QUIZ_ARENA_ESCROW_IDL,
  QUIZ_ARENA_ESCROW_PROGRAM_ID,
  buildCancelBattleInstruction,
  buildCreateBattleInstruction,
  buildFinalizeBattleInstruction,
  buildJoinBattleInstruction,
  buildRefundExpiredBattleInstruction,
  decodeBattleEscrowState,
  decodeEscrowProgramError,
  deriveBattleEscrowPda,
  deriveBattleVaultPda,
  encodeBattleEscrowState,
  normalizeBattleIdToSeed,
  parseAuthorityKeypair,
} from "./index";

describe("Milestone 9: @repo/solana Anchor Escrow SDK & Client", () => {
  const sampleBattleUuid = "550e8400-e29b-41d4-a716-446655440000";

  it("normalizes 36-char UUIDs to 32-byte PDA seeds and rejects invalid lengths", () => {
    const seed = normalizeBattleIdToSeed(sampleBattleUuid);
    expect(seed).toBe("550e8400e29b41d4a716446655440000");
    expect(Buffer.byteLength(seed, "utf8")).toBe(32);

    expect(() => normalizeBattleIdToSeed("")).toThrow();
    expect(() => normalizeBattleIdToSeed("a".repeat(33))).toThrow();
  });

  it("derives deterministic BattleEscrowState and BattleVault PDAs", () => {
    const escrow1 = deriveBattleEscrowPda(sampleBattleUuid);
    const escrow2 = deriveBattleEscrowPda("550e8400e29b41d4a716446655440000");
    const vault = deriveBattleVaultPda(sampleBattleUuid);

    expect(escrow1.pda.toBase58()).toBe(escrow2.pda.toBase58());
    expect(escrow1.bump).toBe(escrow2.bump);
    expect(escrow1.pda.toBase58()).not.toBe(vault.pda.toBase58());
    expect(PublicKey.isOnCurve(escrow1.pda.toBytes())).toBe(false);
    expect(PublicKey.isOnCurve(vault.pda.toBytes())).toBe(false);
  });

  it("encodes and decodes BattleEscrowState Borsh buffers with 8-byte Anchor discriminator", () => {
    const creator = Keypair.generate().publicKey.toBase58();
    const opponent = Keypair.generate().publicKey.toBase58();
    const authority = Keypair.generate().publicKey.toBase58();

    const state: DecodedBattleEscrowState = {
      battleSeed: normalizeBattleIdToSeed(sampleBattleUuid),
      creator,
      opponent,
      authority,
      stakeAmountLamports: 100_000_000,
      totalPotLamports: 200_000_000,
      status: "Funded",
      winner: PublicKey.default.toBase58(),
      isDraw: false,
      createdAt: 1_700_000_000,
      fundedAt: 1_700_000_120,
      expiryTs: 1_700_003_600,
      settledAt: 0,
      bump: 254,
      vaultBump: 253,
    };

    const encoded = encodeBattleEscrowState(state);
    expect(encoded.subarray(0, 8).equals(BATTLE_ESCROW_ACCOUNT_DISCRIMINATOR)).toBe(true);

    const decoded = decodeBattleEscrowState(encoded);
    expect(decoded).toEqual(state);

    // Tampering with discriminator should throw
    const corrupted = Buffer.from(encoded);
    corrupted[0] = (corrupted[0] ?? 0) ^ 0xff;
    expect(() => decodeBattleEscrowState(corrupted)).toThrow(/discriminator/i);
  });

  it("constructs client-safe create_battle, join_battle, cancel_battle, and refund_expired_battle instructions", () => {
    const creator = Keypair.generate().publicKey;
    const opponent = Keypair.generate().publicKey;
    const authority = Keypair.generate().publicKey;
    const stake = 150_000_000;
    const expiry = 1_750_000_000;

    const { pda: expectedEscrowPda } = deriveBattleEscrowPda(sampleBattleUuid);
    const { pda: expectedVaultPda } = deriveBattleVaultPda(sampleBattleUuid);

    const createIx = buildCreateBattleInstruction({
      battleId: sampleBattleUuid,
      creator,
      authority,
      stakeAmountLamports: stake,
      expiryTs: expiry,
    });

    expect(createIx.programId.toBase58()).toBe(QUIZ_ARENA_ESCROW_PROGRAM_ID);
    expect(createIx.keys).toHaveLength(5);
    expect(createIx.keys[0]?.pubkey.equals(creator)).toBe(true);
    expect(createIx.keys[0]?.isSigner).toBe(true);
    expect(createIx.keys[1]?.pubkey.equals(authority)).toBe(true);
    expect(createIx.keys[2]?.pubkey.equals(expectedEscrowPda)).toBe(true);
    expect(createIx.keys[3]?.pubkey.equals(expectedVaultPda)).toBe(true);
    expect(createIx.keys[4]?.pubkey.equals(SystemProgram.programId)).toBe(true);
    expect(
      createIx.data
        .subarray(0, 8)
        .equals(INSTRUCTION_DISCRIMINATORS.createBattle)
    ).toBe(true);

    const joinIx = buildJoinBattleInstruction({
      battleId: sampleBattleUuid,
      opponent,
    });
    expect(joinIx.keys).toHaveLength(4);
    expect(joinIx.keys[0]?.pubkey.equals(opponent)).toBe(true);
    expect(joinIx.keys[0]?.isSigner).toBe(true);
    expect(joinIx.data.equals(INSTRUCTION_DISCRIMINATORS.joinBattle)).toBe(true);

    const cancelIx = buildCancelBattleInstruction({
      battleId: sampleBattleUuid,
      creator,
    });
    expect(cancelIx.keys[0]?.pubkey.equals(creator)).toBe(true);
    expect(cancelIx.data.equals(INSTRUCTION_DISCRIMINATORS.cancelBattle)).toBe(true);

    const refundIx = buildRefundExpiredBattleInstruction({
      battleId: sampleBattleUuid,
      caller: creator,
      creatorDestination: creator,
      opponentDestination: opponent,
    });
    expect(refundIx.keys).toHaveLength(6);
    expect(
      refundIx.data.equals(INSTRUCTION_DISCRIMINATORS.refundExpiredBattle)
    ).toBe(true);
  });

  it("constructs server-only finalize_battle instruction and parses authority keypair", () => {
    const authorityKp = Keypair.generate();
    const creator = Keypair.generate().publicKey;
    const opponent = Keypair.generate().publicKey;

    const secretJson = JSON.stringify(Array.from(authorityKp.secretKey));
    const parsedKp = parseAuthorityKeypair(secretJson);
    expect(parsedKp.publicKey.toBase58()).toBe(
      authorityKp.publicKey.toBase58()
    );

    const finalizeCreatorWinsIx = buildFinalizeBattleInstruction({
      battleId: sampleBattleUuid,
      authority: parsedKp.publicKey,
      creatorDestination: creator,
      opponentDestination: opponent,
      outcome: "CreatorWins",
    });

    expect(finalizeCreatorWinsIx.keys).toHaveLength(6);
    expect(finalizeCreatorWinsIx.keys[0]?.pubkey.equals(parsedKp.publicKey)).toBe(true);
    expect(finalizeCreatorWinsIx.keys[0]?.isSigner).toBe(true);
    expect(finalizeCreatorWinsIx.data.length).toBe(9);
    expect(finalizeCreatorWinsIx.data[8]).toBe(0); // CreatorWins = 0

    const finalizeDrawIx = buildFinalizeBattleInstruction({
      battleId: sampleBattleUuid,
      authority: parsedKp.publicKey,
      creatorDestination: creator,
      opponentDestination: opponent,
      outcome: "Draw",
    });
    expect(finalizeDrawIx.data[8]).toBe(2); // Draw = 2
  });

  it("decodes Anchor custom program errors by decimal code, hex code, or error name", () => {
    expect(QUIZ_ARENA_ESCROW_IDL.errors).toHaveLength(13);

    const byNumber = decodeEscrowProgramError(6004);
    expect(byNumber?.name).toBe("SelfPlayNotAllowed");

    const byHexLog = decodeEscrowProgramError(
      new Error("Transaction simulation failed: custom program error: 0x1778")
    );
    expect(byHexLog?.code).toBe(6008);
    expect(byHexLog?.name).toBe("UnauthorizedSettlementAuthority");
  });
});
