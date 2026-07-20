import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Confirmation des liens email au format OTP (token_hash) : inscription, recovery, magic link.
 * C'est le flux utilisé par admin.generateLink et par les templates email par défaut.
 * verifyOtp établit la session via les cookies, puis on redirige.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/projets";

  if (token_hash && type) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next.startsWith("/") ? next : "/projets"}`);
    }
  }
  return NextResponse.redirect(`${origin}/connexion?erreur=lien_invalide`);
}
