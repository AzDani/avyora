import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Proxy Next.js 16 (ex-"middleware") — rafraîchit la session Supabase à chaque requête
 * en relayant les cookies. PUREMENT ADDITIF pour l'instant : aucune redirection ni gating,
 * donc n'affecte pas l'app SQLite existante. Le gating d'accès viendra avec les pages d'auth.
 *
 * ⚠ Ne rien exécuter entre createServerClient et supabase.auth.getUser() (refresh du token).
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // ── Gating d'accès ──
  // Routes privées : nécessitent une session. Le reste (accueil, funnel /projets/nouveau,
  // pages d'auth, /auth/*, assets) reste public. La RLS reste le vrai garde-fou côté données ;
  // ce contrôle est un raccourci UX (évite d'afficher une coquille vide au visiteur déconnecté).
  const { pathname } = request.nextUrl;
  const estPrive =
    pathname.startsWith("/mon-espace") ||
    (pathname.startsWith("/projets") && pathname !== "/projets/nouveau") ||
    pathname.startsWith("/artisans") ||
    pathname.startsWith("/admin");

  if (estPrive && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // ── Gating ADMIN (pages) ──
  // Les pages /admin éditent des données GLOBALES partagées entre tous les tenants
  // (référentiel de prix, questionnaire) : réservées à l'allow-list ADMIN_EMAILS.
  // Les routes /api/admin/* et /api/questions sont protégées côté handler (gardeAdmin).
  if (pathname.startsWith("/admin")) {
    const allow = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const estAdmin = !!user?.email && allow.includes(user.email.toLowerCase());
    if (!estAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = "/mon-espace";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  // Exécute sur tout sauf les assets statiques et images.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
