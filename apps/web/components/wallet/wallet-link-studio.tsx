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
  getInjectedSolanaProvider,
  uint8ArrayToBase64,
} from "@/lib/solana/wallet-client";
import { formatSol } from "@repo/validators";
import {
  AlertCircle,
  CheckCircle2,
  Coins,
  ExternalLink,
  KeyRound,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface LinkedWalletInfo {
  id: string;
  walletAddress: string;
  isDemo?: boolean;
  /** `null` when the Devnet RPC balance lookup failed (unknown, not zero). */
  balanceLamports: number | null;
  balanceSol: number | null;
  verifiedAt: string;
  createdAt: string;
  explorerUrl: string;
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

export function WalletLinkStudio() {
  const [linkedWallet, setLinkedWallet] = useState<LinkedWalletInfo | null>(
    null,
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
        transactions: RewardTransactionItem[];
      };
      setLinkedWallet(data.linkedWallet);
      setTransactions(data.transactions ?? []);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("netmifi:wallet-updated", {
            detail: {
              walletAddress: data.linkedWallet?.walletAddress ?? null,
              balanceSol: data.linkedWallet?.balanceSol ?? null,
            },
          }),
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
      const provider = getInjectedSolanaProvider();

      if (!provider || typeof provider.connect !== "function") {
        toast.error("No Solana browser wallet detected", {
          description:
            "Install Phantom or Solflare, or click 'Use Demo Wallet' to connect a test wallet.",
        });
        return;
      }

      const connectRes = await provider.connect();
      const pubkeyObj = connectRes?.publicKey ?? provider.publicKey;
      if (!pubkeyObj) {
        toast.error("Could not read public key from wallet.");
        return;
      }
      const walletAddress = pubkeyObj.toString();

      const nonceRes = await fetch("/api/wallet/nonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
      });

      const nonceData = (await nonceRes.json()) as {
        error?: string;
        alreadyVerified?: boolean;
        verified?: boolean;
        nonce?: string;
        message?: string;
      };

      if (!nonceRes.ok) {
        toast.error("Failed to connect wallet", {
          description: nonceData.error ?? "Please try again.",
        });
        return;
      }

      // If this user previously verified this exact Phantom wallet, it re-links immediately
      if (nonceData.alreadyVerified && nonceData.verified) {
        toast.success("Phantom / Solflare Wallet Switched & Connected!", {
          description: `Active wallet: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
        });
        await loadWalletState();
        return;
      }

      if (!nonceData.nonce || !nonceData.message) {
        toast.error("Failed to request verification challenge.");
        return;
      }

      if (typeof provider.signMessage !== "function") {
        toast.error("Wallet does not support message signing.");
        return;
      }

      const encodedMessage = new TextEncoder().encode(nonceData.message);
      const signedResult = await provider.signMessage(encodedMessage, "utf8");
      const rawSignature =
        signedResult instanceof Uint8Array
          ? signedResult
          : signedResult.signature;
      const signatureBase64 = uint8ArrayToBase64(rawSignature);

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

      toast.success("Solana Wallet Connected!", {
        description: `Connected ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)} on Devnet.`,
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
        toast.error("Failed to connect Demo Wallet", {
          description: data.error ?? "Please try again.",
        });
        return;
      }

      toast.success("Demo Wallet Connected!", {
        description: `Linked ${data.walletAddress?.slice(0, 6)}...${data.walletAddress?.slice(-4)}`,
      });
      await loadWalletState();
    } catch {
      toast.error("Network error while connecting Demo wallet.");
    } finally {
      setIsLinkingDemo(false);
    }
  }

  async function handleUnlinkWallet() {
    setIsUnlinking(true);
    try {
      const res = await fetch("/api/wallet", { method: "DELETE" });
      if (res.ok) {
        toast.info("Solana wallet disconnected.");
        await loadWalletState();
      }
    } catch {
      toast.error("Failed to disconnect wallet.");
    } finally {
      setIsUnlinking(false);
    }
  }

  if (isLoading) {
    return (
      <Card className="border-border bg-card py-16 text-center">
        <CardContent className="flex flex-col items-center justify-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="font-game text-sm font-bold">LOADING WALLET...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-game text-2xl font-extrabold tracking-tight sm:text-3xl">
            SOLANA <span className="text-primary">WALLET</span>
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Connect your Solana Devnet wallet to stake SOL in Reward Battles and
            receive winner payouts.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadWalletState()}
          className="gap-1.5 self-start sm:self-center"
        >
          <RefreshCw className="size-3.5" />
          Refresh Balance
        </Button>
      </div>

      {/* Connected Wallet & Balance Card */}
      <Card className="border-primary/30 bg-card shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 font-game text-lg">
              <Wallet className="size-5 text-primary" />
              DEVNET WALLET
            </CardTitle>
            {linkedWallet ? (
              <Badge className="gap-1 bg-emerald-600 text-xs text-white hover:bg-emerald-600">
                <CheckCircle2 className="size-3.5" />
                CONNECTED
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                NOT CONNECTED
              </Badge>
            )}
          </div>
          <CardDescription>
            Free battles never require a wallet. Connect a wallet when you want
            to play staked Reward Battles.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {linkedWallet ? (
            <div className="space-y-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Wallet Address (Devnet)
                    </p>
                    {linkedWallet.isDemo ? (
                      <Badge
                        variant="outline"
                        className="border-primary/50 text-[10px] text-primary"
                      >
                        DEMO WALLET
                      </Badge>
                    ) : null}
                  </div>
                  <p className="font-mono text-xs font-bold break-all text-foreground sm:text-sm">
                    {linkedWallet.walletAddress}
                  </p>
                </div>

                <div className="shrink-0 rounded-xl border border-emerald-500/30 bg-card px-4 py-2.5 text-left sm:text-right">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    Available Balance
                  </p>
                  <p className="font-game text-lg font-extrabold text-emerald-500 sm:text-xl">
                    {linkedWallet.balanceSol === null
                      ? "Unavailable"
                      : `${linkedWallet.balanceSol.toFixed(4)} SOL`}
                  </p>
                </div>
              </div>

              {/* Devnet Network Notice */}
              <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-300">
                <AlertCircle className="size-4 shrink-0" />
                <span>
                  <strong>Network:</strong> Solana Devnet. When connecting
                  Phantom or Solflare, make sure your extension is toggled to{" "}
                  <strong>Solana Devnet</strong> (in Phantom:{" "}
                  <em>
                    Settings ⚙️ → Developer Settings → Testnet Mode → Solana
                    Devnet
                  </em>
                  ). If set to Mainnet, Phantom will show an "Insufficient
                  balance" error when depositing.
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
                <a
                  href={linkedWallet.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  View on Solana Explorer (Devnet)
                  <ExternalLink className="size-3.5" />
                </a>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isConnectingBrowser || isLinkingDemo}
                    onClick={() => void handleConnectBrowserWallet()}
                    className="gap-1.5 text-xs"
                  >
                    {isConnectingBrowser ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <KeyRound className="size-3.5 text-primary" />
                    )}
                    Switch to Phantom / Solflare
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isLinkingDemo || isConnectingBrowser}
                    onClick={() => void handleLinkDemoWallet()}
                    className="gap-1.5 text-xs"
                  >
                    {isLinkingDemo ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="size-3.5 text-primary" />
                    )}
                    Use Demo Wallet
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isUnlinking}
                    onClick={() => void handleUnlinkWallet()}
                    className="gap-1 text-xs text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="size-3.5" />
                    Disconnect
                  </Button>
                </div>
              </div>
            </div>
          ) : (
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
                Use Demo Wallet
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reward Battle Transactions */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-game text-lg">
            <Coins className="size-5 text-primary" />
            REWARD BATTLE TRANSACTIONS
          </CardTitle>
          <CardDescription>
            Your recent stake deposits, winner payouts, and refunds.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No Reward Battle transactions yet.
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
                        {formatSol(tx.amountLamports)} SOL
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
                      <ExternalLink className="size-3.5" />
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
