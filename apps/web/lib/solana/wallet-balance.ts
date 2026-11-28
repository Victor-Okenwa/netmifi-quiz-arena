/**
 * Server-only helpers for reading Solana Devnet wallet balances and checking
 * whether a student can afford a Reward Battle stake.
 */
import { getServerEnv } from "@/lib/env";
import { isDemoWalletForUser } from "@/lib/solana/wallet-auth";
import { db, eq, walletLinks } from "@repo/db";
import { formatSol } from "@repo/validators";

/**
 * Lamports kept aside for the deposit transaction's network fee, so a wallet
 * holding exactly the stake amount is not left unable to pay the fee.
 */
export const STAKE_FEE_RESERVE_LAMPORTS = 10_000;

/** Per-attempt RPC timeout. Public Devnet RPC regularly takes 2-3s to respond. */
const RPC_TIMEOUT_MS = 8_000;
/** Total attempts per lookup (public Devnet RPC intermittently returns 429/5xx). */
const RPC_MAX_ATTEMPTS = 3;
/** How long a successful balance read is reused, to avoid hammering the RPC. */
const BALANCE_CACHE_TTL_MS = 10_000;

const balanceCache = new Map<string, { lamports: number; fetchedAt: number }>();

/**
 * Performs a single `getBalance` JSON-RPC call.
 *
 * @param rpcUrl - Solana JSON-RPC endpoint URL.
 * @param walletAddress - Base58 wallet public key.
 * @returns Balance in lamports, or `null` on any HTTP/RPC/timeout failure.
 */
async function requestBalanceOnce(
  rpcUrl: string,
  walletAddress: string,
): Promise<number | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);
  try {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getBalance",
        params: [walletAddress, { commitment: "confirmed" }],
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: { value?: number } };
    return typeof data.result?.value === "number" ? data.result.value : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Reads the live balance of the given wallet (the user's currently linked
 * wallet, whether a browser wallet or a demo wallet) from the Solana RPC.
 * Retries transient failures and briefly caches successful reads.
 *
 * Callers MUST treat `null` as "unknown", never as a zero balance.
 *
 * @param rpcUrl - Solana JSON-RPC endpoint URL.
 * @param walletAddress - Base58 wallet public key.
 * @returns Balance in lamports, or `null` when every attempt failed.
 */
export async function fetchWalletBalanceLamports(
  rpcUrl: string,
  walletAddress: string,
): Promise<number | null> {
  const cached = balanceCache.get(walletAddress);
  if (cached && Date.now() - cached.fetchedAt < BALANCE_CACHE_TTL_MS) {
    return cached.lamports;
  }

  for (let attempt = 1; attempt <= RPC_MAX_ATTEMPTS; attempt++) {
    const lamports = await requestBalanceOnce(rpcUrl, walletAddress);
    if (lamports !== null) {
      balanceCache.set(walletAddress, { lamports, fetchedAt: Date.now() });
      return lamports;
    }
    if (attempt < RPC_MAX_ATTEMPTS) {
      // Linear backoff gives a rate-limited public RPC time to recover.
      await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
    }
  }
  return null;
}

export type StakeAffordabilityResult =
  | { ok: true; walletAddress: string; balanceLamports: number }
  | { ok: false; error: string; status: number };

/**
 * Verifies that a user's linked wallet holds enough SOL to cover a Reward
 * Battle stake (plus a small fee reserve). Fails closed: if the balance cannot
 * be read, the stake is rejected rather than assumed affordable.
 *
 * @param userId - Supabase user ID of the staker.
 * @param stakeAmountLamports - Stake the user must deposit, in lamports.
 * @param walletAddressOverride - Wallet to check instead of the user's linked wallet.
 * @returns Success with the checked wallet and balance, or an error message and HTTP status.
 */
export async function checkStakeAffordability(
  userId: string,
  stakeAmountLamports: number,
  walletAddressOverride?: string,
): Promise<StakeAffordabilityResult> {
  let walletAddress = walletAddressOverride;
  if (!walletAddress) {
    const [linked] = await db
      .select({ walletAddress: walletLinks.walletAddress })
      .from(walletLinks)
      .where(eq(walletLinks.userId, userId))
      .limit(1);
    walletAddress = linked?.walletAddress;
  }

  if (!walletAddress) {
    return {
      ok: false,
      status: 400,
      error:
        "Link a Solana Devnet wallet in Wallet Settings before joining a Reward Battle.",
    };
  }

  const isDemo = isDemoWalletForUser(userId, walletAddress);

  let balanceLamports = await fetchWalletBalanceLamports(
    getServerEnv().NEXT_PUBLIC_SOLANA_RPC_URL,
    walletAddress,
  );

  // If this is a demo wallet without funded Devnet SOL, provision a 5.0 SOL sandbox balance
  // so judges and testers can immediately create, join, and deposit into Reward Battles.
  if (isDemo && (balanceLamports === null || balanceLamports === 0)) {
    balanceLamports = 5_000_000_000;
  }

  if (balanceLamports === null) {
    return {
      ok: false,
      status: 503,
      error:
        "Could not verify your wallet balance on Solana Devnet. Please try again shortly.",
    };
  }

  const requiredLamports = stakeAmountLamports + STAKE_FEE_RESERVE_LAMPORTS;
  if (balanceLamports < requiredLamports) {
    return {
      ok: false,
      status: 402,
      error: `Insufficient wallet balance: this battle needs a ${formatSol(stakeAmountLamports)} SOL stake (plus network fee) but your wallet holds ${formatSol(balanceLamports)} SOL.`,
    };
  }

  return { ok: true, walletAddress, balanceLamports };
}
