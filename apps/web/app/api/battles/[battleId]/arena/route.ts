import { getSanitizedBattleArenaState } from "@/lib/battle-engine/engine";
import { getCurrentAuthContext } from "@/lib/supabase/auth";
import { NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{
    battleId: string;
  }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const authContext = await getCurrentAuthContext();
    if (!authContext) {
      return NextResponse.json(
        { error: "Please sign in to access this battle." },
        { status: 401 },
      );
    }

    const { battleId } = await context.params;
    const arenaState = await getSanitizedBattleArenaState(
      battleId,
      authContext.user.id,
    );

    if (!arenaState) {
      return NextResponse.json(
        { error: "Battle arena not found or access denied." },
        { status: 404 },
      );
    }

    return NextResponse.json(arenaState);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load battle arena.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
