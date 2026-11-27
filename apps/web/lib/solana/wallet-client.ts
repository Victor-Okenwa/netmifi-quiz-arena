/**
 * Client-Side Solana Wallet Utilities & On-Chain Devnet Transaction Builders.
 *
 * Interacts with injected Solana browser wallets (Phantom, Solflare) to execute
 * real on-chain transfers for Reward Battle escrow deposits and settlements.
 */

import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@repo/solana";

export interface InjectedSolanaProvider {
  isPhantom?: boolean;
  isSolflare?: boolean;
  publicKey?: {
    toString(): string;
    toBase58?(): string;
  };
  connect(opts?: { onlyIfTrusted?: boolean }): Promise<{
    publicKey?: {
      toString(): string;
    };
  }>;
  signMessage(
    message: Uint8Array,
    encoding?: string,
  ): Promise<{ signature: Uint8Array }>;
  signAndSendTransaction?(
    transaction: Transaction,
    options?: { skipPreflight?: boolean },
  ): Promise<{ signature: string } | string>;
  signTransaction?(transaction: Transaction): Promise<Transaction>;
}

/**
 * Returns the injected Solana provider from Phantom, Solflare, or standard window.solana.
 */
export function getInjectedSolanaProvider():
  InjectedSolanaProvider | undefined {
  if (typeof window === "undefined") return undefined;
  const win = window as unknown as {
    phantom?: { solana?: InjectedSolanaProvider };
    solflare?: InjectedSolanaProvider;
    solana?: InjectedSolanaProvider;
  };
  return win.phantom?.solana ?? win.solana ?? win.solflare;
}

/**
 * Converts a raw Uint8Array into a Base64 string in browser environments.
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i] ?? 0);
  }
  return typeof window !== "undefined" ? window.btoa(binary) : "";
}

/**
 * Sends a real on-chain SOL deposit from the user's browser wallet (Phantom/Solflare)
 * to the Netmifi Escrow Authority / Vault address on Solana Devnet.
 *
 * @param params.provider - Connected injected Solana wallet provider.
 * @param params.authorityPublicKey - Base58 public key of the backend escrow authority.
 * @param params.stakeAmountLamports - Exact stake in lamports to deposit.
 * @param params.rpcUrl - Optional custom RPC URL.
 * @returns Confirmed on-chain transaction signature.
 */
export async function sendEscrowStakeDeposit(params: {
  provider: InjectedSolanaProvider;
  authorityPublicKey: string;
  stakeAmountLamports: number;
  rpcUrl?: string;
}): Promise<string> {
  const rpcUrl =
    params.rpcUrl ||
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
    "https://api.devnet.solana.com";
  const connection = new Connection(rpcUrl, "confirmed");

  let userPubkey = params.provider.publicKey
    ? new PublicKey(params.provider.publicKey.toString())
    : null;

  if (!userPubkey) {
    const conn = await params.provider.connect();
    if (!conn.publicKey) {
      throw new Error("Could not connect to Solana browser wallet.");
    }
    userPubkey = new PublicKey(conn.publicKey.toString());
  }

  const toPubkey = new PublicKey(params.authorityPublicKey);
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: userPubkey,
      toPubkey,
      lamports: params.stakeAmountLamports,
    }),
  );

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.feePayer = userPubkey;

  if (typeof params.provider.signAndSendTransaction !== "function") {
    throw new Error(
      "Your browser wallet extension does not support signAndSendTransaction.",
    );
  }

  const sendResult = await params.provider.signAndSendTransaction(tx);
  const signature =
    typeof sendResult === "string" ? sendResult : sendResult.signature;

  await connection.confirmTransaction(
    {
      signature,
      blockhash,
      lastValidBlockHeight,
    },
    "confirmed",
  );

  return signature;
}
