"use client";

import { ProfileAvatar } from "@/assets/profiles";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Badge } from "@/components/ui/badge";
import type { AuthenticatedStudentProfile } from "@/lib/supabase/auth";
import {
  ChevronDown,
  Factory,
  GraduationCap,
  UserCog,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

interface ProfileMenuPopoverProps {
  profile: AuthenticatedStudentProfile;
}

function formatTruncatedWallet(address: string): string {
  const clean = address.trim();
  if (clean.length <= 10) return `${clean} (Devnet)`;
  return `${clean.slice(0, 4)}...${clean.slice(-4)} (Devnet)`;
}

export function ProfileMenuPopover({ profile }: ProfileMenuPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(
    profile.walletAddress ?? null,
  );
  // `null` = balance unknown (RPC lookup failed or not loaded yet).
  const [balanceSol, setBalanceSol] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profile.walletAddress !== undefined) {
      setWalletAddress(profile.walletAddress ?? null);
    }
  }, [profile.walletAddress]);

  const syncLinkedWallet = useCallback(async () => {
    try {
      const res = await fetch("/api/wallet", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        linkedWallet?: {
          walletAddress?: string;
          balanceSol?: number | null;
        } | null;
      };
      setWalletAddress(data.linkedWallet?.walletAddress ?? null);
      setBalanceSol(
        typeof data.linkedWallet?.balanceSol === "number"
          ? data.linkedWallet.balanceSol
          : null,
      );
    } catch {
      // Ignore network errors
    }
  }, []);

  useEffect(() => {
    void syncLinkedWallet();

    function handleWalletUpdated(event: Event) {
      const custom = event as CustomEvent<{
        walletAddress?: string | null;
        balanceSol?: number | null;
      }>;
      if (custom.detail && "walletAddress" in custom.detail) {
        setWalletAddress(custom.detail.walletAddress ?? null);
        setBalanceSol(
          typeof custom.detail.balanceSol === "number"
            ? custom.detail.balanceSol
            : null,
        );
      } else {
        void syncLinkedWallet();
      }
    }

    window.addEventListener("netmifi:wallet-updated", handleWalletUpdated);
    return () => {
      window.removeEventListener("netmifi:wallet-updated", handleWalletUpdated);
    };
  }, [syncLinkedWallet]);

  useEffect(() => {
    if (!isOpen) return;

    void syncLinkedWallet();

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, syncLinkedWallet]);

  const isWalletConnected = Boolean(walletAddress);

  return (
    <div ref={containerRef} className="relative">
      <div
        className={
          isWalletConnected
            ? "rounded-full bg-gradient-to-r from-emerald-400 via-green-500 to-teal-400 p-[2px] shadow-sm shadow-emerald-500/25 transition-all"
            : ""
        }
      >
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          className={`flex items-center gap-2 rounded-full bg-card py-1 pr-2.5 pl-1 transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
            isWalletConnected ? "border-0" : "border border-border"
          }`}
        >
          <div
            className={
              isWalletConnected
                ? "rounded-full bg-gradient-to-tr from-emerald-400 via-green-500 to-teal-400 p-[1.5px]"
                : ""
            }
          >
            <ProfileAvatar
              avatarUrl={profile.avatarUrl}
              avatarNumber={profile.avatarNumber}
              displayName={profile.displayName}
              className="size-7"
            />
          </div>
          <span className="hidden max-w-[120px] truncate text-xs font-medium sm:inline">
            {profile.displayName}
          </span>
          <ChevronDown
            className={`size-3.5 text-muted-foreground transition-transform duration-150 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {isOpen ? (
        <div
          role="dialog"
          aria-label="Profile menu"
          className="absolute right-0 z-50 mt-2 w-68 rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-xl"
        >
          {/* Profile header */}
          <div className="flex items-center gap-3 border-b border-border pb-3">
            <div
              className={
                isWalletConnected
                  ? "shrink-0 rounded-full bg-gradient-to-tr from-emerald-400 via-green-500 to-teal-400 p-[2px]"
                  : "shrink-0"
              }
            >
              <ProfileAvatar
                avatarUrl={profile.avatarUrl}
                avatarNumber={profile.avatarNumber}
                displayName={profile.displayName}
                className="size-10 shrink-0"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-game text-xs font-bold text-foreground">
                {profile.displayName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                @{profile.username}
              </p>
            </div>
          </div>

          {/* Academic badge info */}
          <div className="flex items-center justify-between border-b border-border py-2.5">
            <Badge variant="secondary" className="gap-1.5 text-[11px]">
              <GraduationCap className="size-3.5 text-primary" />
              {profile.universityShortCode ?? "UNI"} •{" "}
              {profile.academicLevel ?? "200L"}
            </Badge>
            <span className="font-game text-xs font-bold text-primary">
              {profile.xp} XP
            </span>
          </div>

          {/* Menu actions */}
          <div className="mt-2.5 flex flex-col gap-1.5">
            <Link
              href="/settings/wallet"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              <div className="flex min-w-0 items-center gap-2">
                <Wallet
                  className={`size-4 shrink-0 ${
                    isWalletConnected ? "text-emerald-500" : "text-primary"
                  }`}
                />
                <span
                  className={`truncate ${
                    isWalletConnected
                      ? "font-mono font-semibold text-emerald-500"
                      : ""
                  }`}
                >
                  {walletAddress
                    ? formatTruncatedWallet(walletAddress)
                    : "Solana Wallet (Devnet)"}
                </span>
              </div>

              {isWalletConnected ? (
                <Badge
                  variant="outline"
                  className="shrink-0 border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0 font-mono text-[10px] font-bold text-emerald-500"
                >
                  {balanceSol === null ? "--" : balanceSol.toFixed(2)} SOL
                </Badge>
              ) : null}
            </Link>

            <Link
              href="/arena/factory"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Factory className="size-4 text-primary" />
              Question Factory
            </Link>

            <Link
              href="/onboarding"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              <UserCog className="size-4 text-primary" />
              Profile
            </Link>

            <SignOutButton className="w-full justify-start" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
