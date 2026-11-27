"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CheckCircle2,
  Coins,
  ExternalLink,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface LinkedWalletInfo {
  id: string;
  walletAddress: string;
  verifiedAt: string;
  createdAt: string;
  explorerUrl: string;
}

interface SolanaConfigInfo {
  network: string;
  rpcUrl: string;
  programId: string;
  authorityPublicKey: string;
}

interface RewardTransactionItem {
  id: string;
  battleId: string;
  walletAddress: string;
  txType: "deposit" | "settle" | "cancel" | "refund";
  txSignature: string;
  amountLamports: number;
  status: "pending" | "confirmed" | "failed";
  createdAt: string;
  courseCode: string | null;
  inviteCode: string | null;
  explorerUrl: string;
}

interface InjectedSolanaProvider {
  isPhantom?: boolean;
  isSolflare?: boolean;
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  signMessage?: (
    message: Uint8Array,
    display?: "utf8" | "hex"
  ) => Promise<{ signature: Uint8Array } | Uint8Array>;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i] ?? 0);
  }
  return typeof window !== "undefined" ? window.btoa(binary) : "";
}

export function WalletLinkStudio() {
  const [linkedWallet, setLinkedWallet] = useState<LinkedWalletInfo | null>(
    null
  );
  const [solanaConfig, setSolanaConfig] = useState<SolanaConfigInfo | null>(
    null
  );
  const [transactions, setTransactions] = useState<RewardTransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnectingBrowser, setIsConnectingBrowser] = useState(false);
  const [isLinkingDemo, setIsLinkingDemo] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);

  const loadWalletState = useCallback(async () => {
    try {
      const res = await fetch("/api/wallet", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        linkedWallet: LinkedWalletInfo | null;
        solanaConfig: SolanaConfigInfo;
        transactions: RewardTransactionItem[];
      };
      setLinkedWallet(data.linkedWallet);
      setSolanaConfig(data.solanaConfig);
      setTransactions(data.transactions ?? []);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("netmifi:wallet-updated", {
            detail: {
              walletAddress: data.linkedWallet?.walletAddress ?? null,
            },
          })
        );
      }
    } catch {
      // Non-fatal
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWalletState();
  }, [loadWalletState]);

  async function handleConnectBrowserWallet() {
    setIsConnectingBrowser(true);
    try {
      const provider = (
        typeof window !== "undefined"
          ? (window as unknown as { solana?: InjectedSolanaProvider }).solana
          : undefined
      );

      if (!provider || typeof provider.connect !== "function") {
        toast.error("No Solana browser wallet detected", {
          description:
            "Install Phantom or Solflare, or click '1-Click Devnet Demo Wallet' to test immediately without an extension.",
        });
        return;
      }

      const connectRes = await provider.connect();
      const walletAddress = connectRes.publicKey.toString();

      // 1. Request challenge nonce from server
      const nonceRes = await fetch("/api/wallet/nonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
      });

      const nonceData = (await nonceRes.json()) as {
        error?: string;
        nonce?: string;
        message?: string;
      };

      if (!nonceRes.ok || !nonceData.nonce || !nonceData.message) {
        toast.error("Failed to request challenge nonce", {
          description: nonceData.error ?? "Please try again.",
        });
        return;
      }

      if (typeof provider.signMessage !== "function") {
        toast.error("Wallet does not support message signing.");
        return;
      }

      // 2. Prompt wallet to sign the challenge message (Ed25519)
      const encodedMessage = new TextEncoder().encode(nonceData.message);
      const signedResult = await provider.signMessage(encodedMessage, "utf8");
      const rawSignature =
        signedResult instanceof Uint8Array
          ? signedResult
          : signedResult.signature;
      const signatureBase64 = uint8ArrayToBase64(rawSignature);

      // 3. Submit signature to server for Ed25519 verification
      const verifyRes = await fetch("/api/wallet/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress,
          nonce: nonceData.nonce,
          signatureBase64,
        }),
      });

      const verifyData = (await verifyRes.json()) as {
        error?: string;
        verified?: boolean;
        walletAddress?: string;
      };

      if (!verifyRes.ok || !verifyData.verified) {
        toast.error("Wallet verification failed", {
          description: verifyData.error ?? "Invalid signature.",
        });
        return;
      }

      toast.success("Solana Wallet Linked & Verified!", {
        description: `Verified ownership of ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)} on Devnet.`,
      });
      await loadWalletState();
    } catch (err) {
      toast.error("Wallet connection cancelled or failed", {
        description:
          err instanceof Error ? err.message : "Could not connect wallet.",
      });
    } finally {
      setIsConnectingBrowser(false);
    }
  }

  async function handleLinkDemoWallet() {
    setIsLinkingDemo(true);
    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = (await res.json()) as {
        error?: string;
        linked?: boolean;
        walletAddress?: string;
      };

      if (!res.ok || !data.linked) {
        toast.error("Failed to link Devnet Demo Wallet", {
          description: data.error ?? "Please try again.",
        });
        return;
      }

      toast.success("Devnet Demo Wallet Linked & Verified!", {
        description: `Ed25519 challenge signed and verified for ${data.walletAddress?.slice(0, 8)}...`,
      });
      await loadWalletState();
    } catch {
      toast.error("Network error while linking Devnet wallet.");
    } finally {
      setIsLinkingDemo(false);
    }
  }

  async function handleUnlinkWallet() {
    setIsUnlinking(true);
    try {
      const res = await fetch("/api/wallet", { method: "DELETE" });
      if (res.ok) {
        toast.info("Solana wallet unlinked from your profile.");
        await loadWalletState();
      }
    } catch {
      toast.error("Failed to unlink wallet.");
    } finally {
      setIsUnlinking(false);
    }
  }

  if (isLoading) {
    return (
      <Card className="border-border bg-card py-16 text-center">
        <CardContent className="flex flex-col items-center justify-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="font-game text-sm font-bold">
            LOADING SOLANA DEVNET WALLET STUDIO...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-game text-2xl font-extrabold tracking-tight sm:text-3xl">
              SOLANA <span className="text-primary">REWARD WALLET</span>
            </h1>
            <Badge variant="outline" className="font-mono text-xs text-primary">
              DEVNET ESCROW
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Link a verified Solana Devnet wallet via Ed25519 cryptographic
            challenge to stake SOL in Reward Battles and receive automatic
            winner payouts.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadWalletState()}
          className="gap-1.5 self-start sm:self-center"
        >
          <RefreshCw className="size-3.5" />
          Refresh
        </Button>
      </div>

      {/* Active Wallet Status & Linking Controls */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="border-primary/30 bg-card shadow-sm lg:col-span-7">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 font-game text-lg">
                <Wallet className="size-5 text-primary" />
                WALLET OWNERSHIP & VERIFICATION
              </CardTitle>
              {linkedWallet ? (
                <Badge className="gap-1 bg-emerald-600 text-xs text-white hover:bg-emerald-600">
                  <CheckCircle2 className="size-3.5" />
                  ED25519 VERIFIED
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  NOT LINKED
                </Badge>
              )}
            </div>
            <CardDescription>
              Free battles never require a wallet. Link a wallet only when you
              want to participate in staked Devnet Reward Battles.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {linkedWallet ? (
              <div className="space-y-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Verified Linked Solana Wallet (1:1 Student Binding)
                  </p>
                  <p className="font-mono text-xs font-bold break-all text-foreground sm:text-sm">
                    {linkedWallet.walletAddress}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
                  <a
                    href={linkedWallet.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                  >
                    View Wallet on Solana Explorer (Devnet)
                    <ExternalLink className="size-3.5" />
                  </a>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isLinkingDemo}
                      onClick={() => void handleLinkDemoWallet()}
                      className="gap-1.5 text-xs"
                    >
                      {isLinkingDemo ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="size-3.5 text-primary" />
                      )}
                      Rotate Demo Wallet
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isUnlinking}
                      onClick={() => void handleUnlinkWallet()}
                      className="gap-1 text-xs text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-3.5" />
                      Unlink
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-muted/20 p-4 text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground">
                    How Cryptographic Linking Works:
                  </p>
                  <ol className="mt-1.5 list-inside list-decimal space-y-1">
                    <li>
                      Server issues an expiring 32-byte challenge nonce in{" "}
                      <span className="font-mono">wallet_nonces</span>.
                    </li>
                    <li>
                      Your wallet signs the challenge message using its Ed25519
                      private key.
                    </li>
                    <li>
                      Server verifies the 64-byte signature via{" "}
                      <span className="font-mono">node:crypto</span> and binds
                      your wallet 1:1 in{" "}
                      <span className="font-mono">wallet_links</span>.
                    </li>
                  </ol>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Button
                    onClick={() => void handleConnectBrowserWallet()}
                    disabled={isConnectingBrowser || isLinkingDemo}
                    className="gap-2 font-game text-xs font-bold"
                  >
                    {isConnectingBrowser ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <KeyRound className="size-4" />
                    )}
                    Connect Phantom / Solflare
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={() => void handleLinkDemoWallet()}
                    disabled={isConnectingBrowser || isLinkingDemo}
                    className="gap-2 font-game text-xs font-bold"
                  >
                    {isLinkingDemo ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Sparkles className="size-4 text-primary" />
                    )}
                    1-Click Devnet Demo Wallet
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Anchor Escrow Program & Authority Metadata */}
        <Card className="border-border bg-card shadow-sm lg:col-span-5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-game text-lg">
              <ShieldCheck className="size-5 text-primary" />
              ANCHOR ESCROW ARCHITECTURE
            </CardTitle>
            <CardDescription>
              Trust-minimized Solana Devnet PDA escrow and authorized backend
              settlement configuration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-muted-foreground">Cluster Network</p>
              <p className="mt-0.5 font-game font-bold uppercase text-primary">
                Solana {solanaConfig?.network ?? "devnet"}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-muted-foreground">
                Anchor Escrow Program ID (quiz_arena_escrow)
              </p>
              <p className="mt-0.5 font-mono text-[11px] font-semibold break-all text-foreground">
                {solanaConfig?.programId ??
                  "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-muted-foreground">
                Authorized Backend Settlement Signer
              </p>
              <p className="mt-0.5 font-mono text-[11px] font-semibold break-all text-foreground">
                {solanaConfig?.authorityPublicKey ??
                  "EmQqKQtRvnpLRuE8Vaqo2Fg5u4rqr425PLrx4WgEucYZ"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* On-Chain Reward Escrow Transaction Audit Trail */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-game text-lg">
            <Coins className="size-5 text-primary" />
            REWARD ESCROW & SETTLEMENT TRANSACTIONS
          </CardTitle>
          <CardDescription>
            Verifiable audit log of your Reward Battle stake deposits, winner
            settlements, and refunds.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No Reward Battle transactions recorded yet. Create or join a
              Reward Battle in the Arena to stake and settle Devnet SOL!
            </p>
          ) : (
            <div className="divide-y divide-border/60">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex flex-col justify-between gap-3 py-3.5 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          tx.txType === "settle"
                            ? "default"
                            : tx.txType === "deposit"
                              ? "secondary"
                              : "outline"
                        }
                        className="font-game text-[10px] uppercase"
                      >
                        {tx.txType}
                      </Badge>
                      {tx.courseCode ? (
                        <span className="font-game text-xs font-bold text-foreground">
                          {tx.courseCode}
                        </span>
                      ) : null}
                      <span className="font-mono text-xs font-semibold text-primary">
                        {(tx.amountLamports / 1_000_000_000).toFixed(2)} SOL
                      </span>
                    </div>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">
                      Tx: {tx.txSignature}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <a
                      href={tx.explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-muted"
                    >
                      Solana Explorer
                      <ExternalLink className="size-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
