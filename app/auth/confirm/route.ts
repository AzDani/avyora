import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { cheminInterne } from "@/lib/next-url";
import { noterArrivee } from "@/lib/auth-arrivee";

/**
 * Confirmation des liens email au format OTP (token_hash) : inscription, recovery, magic link.
 * C'est le flux utilisé par admin.generateLink et par les templates email par défaut.
 * verifyOtp établit la session via les cookies, puis on redirige (chemin interne seulement).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = cheminInterne(searchParams.get("next") ?? undefined);

  if (token_hash && type) {
    const supabase = await supabaseServer();
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      await noterArrivee(supabase, data.user, next);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  const retour = new URLSearchParams({ erreur: "lien_invalide" });
  if (next !== "/projets") retour.set("next", next);
  return NextResponse.redirect(`${origin}/connexion?${retour}`);
}
