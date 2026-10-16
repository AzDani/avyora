import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { COOKIE_VERIFIER, optionsMarque, verificationEnAttente } from "@/lib/auth-verifier";

/**
 * Proxy Next.js 16 (ex-"middleware") — rafraîchit la session Supabase à chaque requête
 * en relayant les cookies. PUREMENT ADDITIF pour l'instant : aucune redirection ni gating,
 * donc n'affecte pas l'app SQLite existante. Le gating d'accès viendra avec les pages d'auth.
 *
 * ⚠ Ne rien exécuter entre createServerClient et supabase.auth.getUser() (refresh du token).
 */
/**
 * Langue courante → en-tête interne `x-av-locale`. Le middleware a toujours accès à la requête
 * brute (dev ET prod), contrairement à cookies() dans le layout racine qui, en build de prod,
 * ne voyait pas le cookie av-lang. Les server components lisent cet en-tête via headers().
 */
function withLocale(request: NextRequest): Headers {
  const lang = request.cookies.get("av-lang")?.value;
  const h = new Headers(request.headers);
  h.set("x-av-locale", lang === "en" ? "en" : "fr");
  return h;
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: withLocale(request) } });

  // « Rester connecté » : si l'utilisateur a décoché (cookie av-remember="0"), les cookies d'auth
  // rafraîchis restent des cookies de session (effacés à la fermeture du navigateur).
  const remember = request.cookies.get("av-remember")?.value !== "0";
  const withRemember = (o: Record<string, unknown>) => {
    if (remember) return o;
    const c = { ...o };
    delete c.maxAge;
    delete c.expires;
    return c;
  };

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
          response = NextResponse.next({ request: { headers: withLocale(request) } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, withRemember(options as Record<string, unknown>))
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
    (pathname.startsWith("/projets") && !pathname.startsWith("/projets/nouveau")) ||
    pathname.startsWith("/artisans") ||
    pathname.startsWith("/admin");

  if (estPrive && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // ── Arrivée à vérifier (lib/auth-verifier.ts) ──
  // Un lien d'accès ouvert dans un navigateur qui ne l'avait pas demandé (ou par-dessus une autre session) : tant que la
  // personne n'a pas dit « Oui, c'est mon compte » ou « Ce n'est pas moi » sur /auth/verifier, toute PAGE y mène (et la
  // marque est renouvelée : elle dure autant que la session). Rien ne part donc dans ce compte avant (ClaimDraft,
  // ClaimPlan sur /projets, l'éditeur de plan, une estimation enregistrée) ; toute écriture hors de /auth est refusée :
  // les écritures /api et les actions serveur (POST d'une page, en-tête `Next-Action`) d'un onglet resté ouvert, qui
  // rangeraient sinon un profil ou un pseudo dans ce compte. /auth/* (dont la page elle-même et ses deux boutons) et les
  // lectures passent ; les cookies de session rafraîchis suivent.
  if (user && verificationEnAttente(request.cookies.get(COOKIE_VERIFIER)?.value, user.id)) {
    const relayer = (r: NextResponse) => {
      response.cookies.getAll().forEach((c) => r.cookies.set(c));
      return r;
    };
    if (!pathname.startsWith("/auth/") && !["GET", "HEAD", "OPTIONS"].includes(request.method)) {
      return relayer(NextResponse.json({ error: "verification_requise" }, { status: 403 }));
    }
    if (request.method === "GET" && !pathname.startsWith("/auth/") && !pathname.startsWith("/api/")) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/verifier";
      url.search = "";
      url.searchParams.set("next", pathname + request.nextUrl.search);
      const redirection = relayer(NextResponse.redirect(url));
      redirection.cookies.set(COOKIE_VERIFIER, user.id, optionsMarque(request.nextUrl.protocol === "https:"));
      return redirection;
    }
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
      url.pathname = "/projets";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  // Exécute sur tout sauf les assets statiques et images. /vendor (Three.js) et /fonts (Geist) sont des
  // fichiers de public/ servis à l'éditeur de plan : ils ne paient pas un auth.getUser() chacun.
  matcher: [
    "/((?!_next/static|_next/image|vendor/|fonts/|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
