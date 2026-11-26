import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
    return NextResponse.json({ redirectTo: "/login" });
  } catch {
    return NextResponse.json({ redirectTo: "/login" });
  }
}
