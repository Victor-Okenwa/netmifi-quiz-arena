import { ArenaNavbar } from "@/components/arena/arena-navbar";
import { WalletLinkStudio } from "@/components/wallet/wallet-link-studio";
import { requireOnboardedStudent } from "@/lib/supabase/auth";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function WalletSettingsPage() {
  const { profile } = await requireOnboardedStudent();

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background text-foreground">
      <ArenaNavbar profile={profile} />

      <main className="mx-auto flex w-full max-w-6xl min-w-0 flex-1 flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-10 lg:px-8">
        <div>
          <Link
            href="/arena"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Back to Arena Lobby
          </Link>
        </div>

        <WalletLinkStudio />
      </main>
    </div>
  );
}
