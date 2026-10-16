"use server";

import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { verifierLimite, clientIp } from "@/lib/ratelimit";
import { validerMotDePasse } from "@/lib/password";
import { journaliser } from "@/lib/audit";
import { cheminInterne } from "@/lib/next-url";
import { suivreServeur } from "@/lib/track-server";
import { empreinteAdresse } from "@/lib/empreinte";
import {
  COOKIE_DEMANDE, COOKIE_LIEN, COOKIE_VERIFIER, DUREE_DEMANDE_S, ajouterDemande, destinationLien, emailValide, issueEnvoi,
  lireLienEnAttente, lirePageAcces, metadonneesInscription, optionsMarque, suiteVerification, trouverDemande, type MethodeDemande,
} from "@/lib/auth-lien";
import { controlerArrivee, noterArrivee } from "@/lib/auth-arrivee";
import { CHAMP_CAPTCHA, jetonCaptcha } from "@/lib/captcha";

/** État renvoyé aux formulaires (useActionState). */
export type AuthState = { error?: string; message?: string } | undefined;

const TROP_DE_TENTATIVES = "Trop de tentatives. Patiente une minute avant de réessayer.";

/** Anti-brute-force : limite les actions d'auth par IP. true si autorisé. */
async function limiteAuthOk(): Promise<boolean> {
  return verifierLimite("auth", await clientIp());
}

/**
 * Les actions qui ENVOIENT un e-mail (lien d'accès, inscription au mot de passe, mot de passe oublié) : en plus de la
 * limite `auth` (6 / min / IP), 20 par heure et par IP (un robot qui fait défiler les adresses) et 3 par heure et par
 * adresse, en empreinte (une boîte bombardée depuis mille IP : un envoi et deux « Renvoyer »). Supabase garde en plus
 * son intervalle de 60 s par adresse.
 */
async function limitesEnvoiOk(email: string): Promise<boolean> {
  const ip = await clientIp();
  return (
    (await verifierLimite("auth", ip)) &&
    (await verifierLimite("lienIp", ip)) &&
    (await verifierLimite("lienAdresse", empreinteAdresse(email)))
  );
}

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return process.env.NEXT_PUBLIC_SITE_URL ?? `${proto}://${host}`;
}

function cleanEmail(v: FormDataEntryValue | null) {
  return String(v ?? "").trim().toLowerCase();
}

/**
 * Le jeton du CAPTCHA (lib/captcha.ts), à transmettre à Supabase : `{ captchaToken }` s'il est là, sinon rien (CAPTCHA
 * éteint, le site d'avant). Une fois le CAPTCHA activé dans Supabase, une demande sans jeton y est refusée.
 */
function optionsCaptcha(formData: FormData): { captchaToken?: string } {
  const captchaToken = jetonCaptcha(formData.get(CHAMP_CAPTCHA));
  return captchaToken ? { captchaToken } : {};
}

/** Le site est-il servi en HTTPS (cookies `secure`) ? */
async function enHttps(): Promise<boolean> {
  return (await origin()).startsWith("https://");
}

/**
 * La trace d'une demande faite depuis CE navigateur (cookie httpOnly `av-demande`, lib/auth-lien.ts) : au retour du lien,
 * elle dit si ce navigateur avait demandé un lien pour cette adresse, si le mot de passe a été choisi ici, et si la case
 * des nouveautés y a été cochée. L'adresse n'y figure qu'en empreinte.
 */
async function noterDemande(email: string, m: MethodeDemande, newsletter = false): Promise<void> {
  const cookieStore = await cookies();
  const v = ajouterDemande(cookieStore.get(COOKIE_DEMANDE)?.value, {
    e: empreinteAdresse(email), m, t: Math.floor(Date.now() / 1000), ...(newsletter ? { n: true as const } : {}),
  });
  cookieStore.set(COOKIE_DEMANDE, v, { httpOnly: true, sameSite: "lax", secure: await enHttps(), path: "/auth", maxAge: DUREE_DEMANDE_S });
}

/**
 * Tolérance entre l'horloge de Supabase (`created_at`) et la nôtre, pour reconnaître un compte né de CETTE inscription :
 * sa date de création doit suivre l'heure lue juste avant l'appel, à cette marge près (serveurs synchronisés en NTP).
 */
const DECALAGE_HORLOGES_MS = 5_000;

/** L'arrivée n'est plus « à vérifier » (connexion de la personne elle-même, « Oui, c'est mon compte », déconnexion). */
async function oublierVerification(): Promise<void> {
  (await cookies()).set(COOKIE_VERIFIER, "", { path: "/", maxAge: 0, httpOnly: true, sameSite: "lax" });
}


// ── Connexion ──
export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = cleanEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/projets");
  const remember = String(formData.get("remember") ?? "") === "on"; // case cochée par défaut
  if (!email || !password) return { error: "Renseigne ton email et ton mot de passe." };
  if (!(await limiteAuthOk())) return { error: TROP_DE_TENTATIVES };

  const supabase = await supabaseServer({ remember });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password, options: optionsCaptcha(formData) });
  if (error) {
    // L'adresse tapée peut être celle de n'importe qui : le journal n'en garde que l'empreinte.
    await journaliser("connexion_echouee", { payload: { empreinte: empreinteAdresse(email) } });
    return { error: error.message === "Invalid login credentials"
      ? "Email ou mot de passe incorrect."
      : error.message };
  }
  // Mémorise la préférence pour que le middleware garde la même politique de cookies au refresh.
  const cookieStore = await cookies();
  if (remember) cookieStore.delete("av-remember");
  else cookieStore.set("av-remember", "0", { path: "/", httpOnly: true, sameSite: "lax" }); // cookie de session

  // La personne entre avec SES identifiants : une arrivée « à vérifier » d'avant (lien d'un autre) ne la concerne plus.
  await oublierVerification();
  await journaliser("connexion_reussie", { userId: data.user?.id, email });
  redirect(cheminInterne(next));
}

// ── Inscription ──
export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = cleanEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  const nom = String(formData.get("nom") ?? "").trim();
  const newsletter = String(formData.get("newsletter") ?? "") === "on"; // case facultative, non cochée par défaut
  // Où l'on envoie l'inscrit. Par défaut /onboarding : les six questions de profil, avec un
  // bouton « Passer ». Mais quand l'inscription vient d'une INTENTION D'ACHAT (le visiteur a
  // cliqué un plan sur /tarifs, donc `next=/tarifs?plan=…`), on ne lui inflige pas un
  // questionnaire entre son oui et l'écran de paiement : on l'emmène là où il allait.
  const dest = cheminInterne(String(formData.get("next") ?? ""), "/onboarding");
  if (!email || !password) return { error: "Renseigne ton email et ton mot de passe." };
  // Le mot de passe d'abord : un refus (« Ajoute au moins un chiffre ») ne consomme pas les envois de l'adresse, que la
  // demande d'un lien d'accès partage (3 / h).
  const faible = validerMotDePasse(password);
  if (faible) return { error: faible };
  if (!(await limitesEnvoiOk(email))) return { error: TROP_DE_TENTATIVES };

  const supabase = await supabaseServer();
  const avantAppel = Date.now();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Le lien de confirmation doit ramener le visiteur À SON INTENTION, pas au questionnaire :
    // /auth/callback échange le code puis redirige sur ce `next` (app/auth/callback/route.ts:11).
    // L'acceptation des CGU (mention sous le bouton), datée (B2). Les nouveautés : pas ici (n'importe qui peut taper
    // n'importe quelle adresse), mais à l'arrivée confirmée, dans ce navigateur (cookie `av-demande`).
    options: {
      data: { nom, ...metadonneesInscription({ methode: "mot_de_passe", newsletter: false }) },
      emailRedirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(dest)}`,
      ...optionsCaptcha(formData),
    },
  });
  if (error) return { error: error.message };

  // Le mot de passe n'est « choisi ici » que si le compte est né de CET appel (créé après l'heure lue juste avant) : un
  // compte déjà là et non confirmé (inscrit plus tôt, même une minute avant, peut-être par un tiers) garde l'ancien mot
  // de passe chez Supabase, qui sera donc remplacé par un aléa à la confirmation (lib/auth-arrivee.ts). Un compte
  // confirmé déjà là répond comme un nouveau (Supabase masque) : sans effet.
  const cree = Date.parse(data.user?.created_at ?? "");
  const neuf = Number.isFinite(cree) && cree >= avantAppel - DECALAGE_HORLOGES_MS && cree <= Date.now() + DECALAGE_HORLOGES_MS;
  await noterDemande(email, neuf ? "mdp" : "lien", newsletter);
  // Sans confirmation d'e-mail (réglage Supabase), la session est ouverte ici même, dans ce navigateur : le consentement aussi.
  if (data.session && newsletter) {
    try {
      await supabase.auth.updateUser({ data: { newsletter: true, newsletter_le: new Date().toISOString() } });
    } catch { /* consentement non enregistré : la case reste à cocher plus tard */ }
  }

  // Compte pas encore confirmé, adresse peut-être celle d'un tiers : l'empreinte seulement (l'adresse est écrite à
  // l'arrivée confirmée, lib/auth-arrivee.ts).
  await journaliser("inscription", { userId: data.user?.id, payload: { methode: "mot_de_passe", empreinte: empreinteAdresse(email) } });
  // `compte_cree` part d'ICI, là où le fait est établi, et non d'une page d'atterrissage.
  // `confirme` distingue les deux issues ci-dessous : compte utilisable tout de suite, ou
  // compte en attente d'un clic dans un email — c'est-à-dire un visiteur qui quitte le site.
  await suivreServeur("compte_cree", { confirme: !!data.session, destination: dest, methode: "mot_de_passe" });
  // Selon la config Supabase : si la confirmation email est requise, pas de session tout de suite. Ouverte ici, par la
  // personne elle-même : une arrivée « à vérifier » d'avant ne la concerne plus.
  if (data.session) {
    await oublierVerification();
    redirect(dest);
  }
  // La confirmation d'email étant active, cet écran est la pièce maîtresse du parcours d'achat :
  // c'est le seul moment où le visiteur doit quitter le site. Le lien de l'email OUVRE la session
  // et le ramène à `dest` (cf. emailRedirectTo ci-dessus) — lui dire « puis connecte-toi »
  // l'envoyait faire une étape dont il n'a pas besoin, juste avant de payer.
  const suite = dest.startsWith("/tarifs")
    ? "Le lien te ramènera directement à ton abonnement."
    : "Le lien te connectera directement.";
  return { message: `Compte créé ! Ouvre ta boîte mail pour confirmer ton adresse. ${suite}` };
}

// ── Lien d'accès : inscription et connexion sans mot de passe (B2) ──

/**
 * Ce que le formulaire « Recevoir mon lien d'accès » reçoit : l'adresse à rappeler sur l'écran « C'est envoyé »,
 * ou un code d'erreur qu'il traduit (FR / EN). `renvoi` : la demande venait du bouton « Renvoyer ».
 */
export type LienState =
  | { envoye: true; email: string; renvoi: boolean }
  | { erreur: "email" | "limite" | "envoi" }
  | undefined;

/**
 * Envoie le lien d'accès (Supabase `signInWithOtp`). Une adresse inconnue reçoit un lien qui CRÉE le compte
 * (`shouldCreateUser`) ; une adresse connue, un lien de connexion : il confirme l'adresse et ouvre la session, puis
 * ramène à l'intention (`next`, assaini). `emailRedirectTo` sert aux deux formes de lien (docs/beta.md §6) : le lien
 * PKCE des modèles par défaut y revient (/auth/callback) ; les modèles au format token_hash le transmettent à
 * /auth/confirm (`next={{ .RedirectTo }}`), qui en tire l'intention. La réponse est la même que l'adresse ait un
 * compte ou non (pas d'énumération). Limites : `limitesEnvoiOk` (par IP, et par adresse en empreinte HMAC). Les CGU
 * datées s'écrivent à la création du compte ; les nouveautés, seulement à l'arrivée confirmée dans ce navigateur
 * (`noterDemande`, puis `controlerArrivee`).
 */
export async function envoyerLienAcces(_prev: LienState, formData: FormData): Promise<LienState> {
  const email = cleanEmail(formData.get("email"));
  const page = lirePageAcces(formData.get("page"));
  const dest = destinationLien(String(formData.get("next") ?? ""), page);
  // La case des nouveautés n'existe que sur /inscription ; une connexion ne consent à rien.
  const newsletter = page === "inscription" && String(formData.get("newsletter") ?? "") === "on";
  const renvoi = String(formData.get("renvoi") ?? "") === "1";
  if (!emailValide(email)) return { erreur: "email" };
  // Les compteurs : l'IP (un robot qui essaie mille adresses) et l'adresse (une boîte bombardée depuis mille IP).
  // L'adresse n'est jamais une clé en clair (Upstash, mémoire) : son empreinte (HMAC du serveur) suffit à la compter.
  if (!(await limitesEnvoiOk(email))) return { erreur: "limite" };

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(dest)}`,
      // Les CGU datées. Les nouveautés : jamais à la création (n'importe qui peut taper l'adresse d'un autre, et Supabase
      // ne met plus à jour un compte non confirmé) ; la case part dans la trace de ce navigateur et n'est enregistrée
      // qu'à l'arrivée confirmée, ici (lib/auth-arrivee.ts).
      data: metadonneesInscription({ methode: "lien", newsletter: false }),
      ...optionsCaptcha(formData),
    },
  });
  const issue = issueEnvoi(error);
  // Le journal ne garde que l'empreinte : l'adresse tapée peut être celle d'un tiers (minimisation).
  await journaliser("lien_acces_demande", { payload: { page, issue, empreinte: empreinteAdresse(email), ...(error?.code ? { code: error.code } : {}) } });
  if (issue !== "envoye") return { erreur: issue };
  await noterDemande(email, "lien", newsletter);
  return { envoye: true, email, renvoi };
}

// ── Le bouton de /auth/confirmer : le lien au format token_hash est consommé ICI, au clic (B2) ──

/**
 * « Entrer dans AVYORA » : /auth/confirm a rangé le lien (jeton, type, intention) dans un cookie httpOnly ; le clic
 * le consomme (`verifyOtp`, sans PKCE : n'importe quel appareil). Réussi : la session est ouverte (cookies), l'arrivée
 * est contrôlée (`controlerArrivee` : mot de passe, nouveautés), le compte qui vient de naître est mesuré
 * (`noterArrivee`), puis l'intention. Échoué (lien déjà servi, expiré, remplacé par un plus récent) ou cookie absent :
 * /connexion le dit et garde l'intention.
 *
 * Connexion forcée (un lien relayé par quelqu'un d'autre ouvrirait SA session ici, et l'estimation de ce navigateur
 * partirait dans son compte) : si ce navigateur n'a demandé aucun lien pour cette adresse (cookie `av-demande`), ou si
 * une autre session y était ouverte, l'arrivée est « à vérifier » : /auth/verifier montre l'adresse du compte ouvert,
 * « Oui, c'est mon compte » ou « Ce n'est pas moi », et rien n'est rangé dans le compte avant ce choix, si longtemps
 * qu'il se fasse attendre (proxy ; la marque dure autant que la session, lib/auth-verifier.ts).
 */
export async function confirmerLien(): Promise<void> {
  const cookieStore = await cookies();
  const lien = lireLienEnAttente(cookieStore.get(COOKIE_LIEN)?.value);
  cookieStore.set(COOKIE_LIEN, "", { path: "/auth", maxAge: 0, httpOnly: true, sameSite: "lax" }); // à usage unique, comme le lien
  if (lien) {
    const supabase = await supabaseServer();
    let avant: string | null = null;
    try {
      avant = (await supabase.auth.getUser()).data?.user?.id ?? null;
    } catch {
      avant = null;
    }
    const { data, error } = await supabase.auth.verifyOtp({ type: lien.type, token_hash: lien.jeton });
    if (!error) {
      const user = data.user;
      const demande = user?.email ? trouverDemande(cookieStore.get(COOKIE_DEMANDE)?.value, empreinteAdresse(user.email)) : null;
      await controlerArrivee(supabase, user, demande);
      await noterArrivee(supabase, user, lien.next);
      const autreSession = !!avant && avant !== user?.id;
      if (user && (!demande || autreSession)) {
        // La marque porte le compte ouvert et dure autant que la session (lib/auth-verifier.ts).
        cookieStore.set(COOKIE_VERIFIER, user.id, optionsMarque(await enHttps()));
        await journaliser("arrivee_a_verifier", { userId: user.id, payload: { type: lien.type, autreSession } });
        redirect(`/auth/verifier?next=${encodeURIComponent(lien.next)}`);
      }
      await oublierVerification();
      redirect(lien.next);
    }
  }
  const retour = new URLSearchParams({ erreur: "lien_invalide" });
  if (lien && lien.next !== "/projets") retour.set("next", lien.next);
  redirect(`/connexion?${retour}`);
}

// ── /auth/verifier : « C'est bien ton compte ? » ──

/** « Oui, c'est mon compte » : l'arrivée est vérifiée, l'intention (assainie, hors /auth). */
export async function continuerArrivee(formData: FormData): Promise<void> {
  await oublierVerification();
  redirect(suiteVerification(String(formData.get("next") ?? "")));
}

/** « Ce n'est pas moi » : déconnexion de CE navigateur ; rien n'a été rangé dans ce compte. */
export async function refuserArrivee(): Promise<void> {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  await journaliser("arrivee_refusee", { userId: data.user?.id });
  await supabase.auth.signOut({ scope: "local" });
  await oublierVerification();
  redirect("/connexion");
}

// ── Demande de réinitialisation (envoie l'email) ──
export async function requestReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = cleanEmail(formData.get("email"));
  if (!email) return { error: "Renseigne ton email." };
  if (!(await limitesEnvoiOk(email))) return { error: TROP_DE_TENTATIVES };

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await origin()}/auth/callback?next=/reset/definir`,
    ...optionsCaptcha(formData),
  });
  if (error) return { error: error.message };
  await noterDemande(email, "reset");
  // L'adresse tapée peut être celle d'un tiers : le journal n'en garde que l'empreinte.
  await journaliser("reset_demande", { payload: { empreinte: empreinteAdresse(email) } });
  return { message: "Si un compte existe pour cet email, tu recevras un lien pour définir ton mot de passe." };
}

// ── Définition du nouveau mot de passe (après clic sur le lien de l'email) ──
export async function updatePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const faible = validerMotDePasse(password);
  if (faible) return { error: faible };
  if (password !== confirm) return { error: "Les deux mots de passe ne correspondent pas." };

  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: error.message.includes("session")
      ? "Lien expiré ou invalide. Redemande un email de réinitialisation."
      : error.message };
  }
  await journaliser("mot_de_passe_change", { userId: data.user?.id, email: data.user?.email });
  redirect("/projets");
}

// ── Déconnexion ──
export async function logout() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  await journaliser("deconnexion", { userId: data.user?.id, email: data.user?.email });
  await supabase.auth.signOut();
  await oublierVerification();
  redirect("/");
}
