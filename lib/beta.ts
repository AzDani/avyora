/**
 * La bêta gratuite (chantier B1, décision de Dani du 13/10/2026) : jusqu'à la fin du 31 décembre 2026,
 * heure de Paris, TOUT AVYORA est offert à qui a un compte. Il faut un compte (on veut l'adresse e-mail),
 * mais aucun moyen de paiement : rien n'est vendu, rien ne sera prélevé.
 *
 * Source de vérité unique de la bêta : sa date de fin, son interrupteur, le plafond des plans d'un inscrit, et la liste
 * fermée des « sources » qui envoient un visiteur vers l'inscription. Le reste du site lit ce module ; `estPro`
 * (lib/auth.ts) en tire les droits.
 *
 * Membres fondateurs (décision de Dani du 16/10/2026) : AUCUN CHIFFRE pendant la bêta. La promesse est « un tarif
 * préférentiel garanti à vie, annoncé avant la fin de la bêta » ; aucun prix d'après la bêta n'est affiché.
 *
 * Réglages, dans les variables de Vercel (lues AU BUILD : elles commencent par NEXT_PUBLIC_, un
 * redéploiement est nécessaire pour qu'un changement s'applique) :
 *  - `NEXT_PUBLIC_BETA_FIN` : le DERNIER JOUR de la bêta, en date ISO (`2027-01-31`) ; la bêta s'arrête à
 *    minuit, heure de Paris, à la fin de ce jour. Un instant ISO complet avec son fuseau
 *    (`2027-01-31T18:00:00+01:00`) est aussi accepté, à la seconde près. Absente ou illisible : 31/12/2026.
 *  - `NEXT_PUBLIC_BETA=0` : coupe la bêta tout de suite, comme si elle n'avait jamais existé (droits,
 *    textes, pastille « Membre fondateur ») : le site redevient exactement celui d'avant B1.
 *
 * La fin est automatique : tout ce qui est rendu à la requête compare l'heure du serveur à la fin
 * (`betaActive()`), sans redéploiement. Ce qu'il reste à faire le 1er janvier : docs/beta.md.
 *
 * Fonctions pures (aucune session, aucune base, aucun stockage) : testées dans tests/beta.test.ts.
 */
import type { Locale } from "@/lib/i18n/config";

/** Dernier jour de la bêta, par défaut (heure de Paris). */
export const BETA_DERNIER_JOUR = "2026-12-31";

/**
 * Pendant la bêta, les plans qu'un inscrit NON ABONNÉ peut enregistrer (contre-examen, R4) : de quoi travailler à l'aise,
 * pas de quoi remplir la base (1,2 Mo par plan au plus). Hors bêta : 1 en gratuit, sans limite pour un abonné (le
 * plafond SQL de 200 vaut pour tous). Les textes de la bêta qui parlent des plans citent cette constante.
 */
export const PLANS_MAX_BETA = 30;

/* ─── Heure de Paris ─────────────────────────────────────────────────────────── */

const PARIS = "Europe/Paris";

/** Décalage de Paris sur l'UTC à cet instant, en minutes (+60 l'hiver, +120 l'été). */
function decalageParis(instant: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PARIS, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(instant));
  const v = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const local = Date.UTC(v("year"), v("month") - 1, v("day"), v("hour"), v("minute"), v("second"));
  return Math.round((local - Math.floor(instant / 1000) * 1000) / 60000);
}

/** L'instant où commence le jour (a, m, j) à Paris : minuit, heure de Paris. `j` peut déborder (32 → mois suivant). */
export function minuitParis(a: number, m: number, j: number): Date {
  const naif = Date.UTC(a, m - 1, j);
  // Deux passes : le décalage à minuit peut différer de celui de l'instant naïf (passage à l'heure d'été).
  let t = naif - decalageParis(naif) * 60000;
  t = naif - decalageParis(t) * 60000;
  return new Date(t);
}

/* ─── La fin de la bêta ──────────────────────────────────────────────────────── */

/**
 * La fin (exclue) d'une valeur de `NEXT_PUBLIC_BETA_FIN`, ou rien si elle est illisible. Une date seule
 * est le dernier jour (la bêta finit à minuit, heure de Paris, à la fin de ce jour) ; un instant doit
 * porter son fuseau (`Z` ou `+01:00`), sans quoi il serait lu dans le fuseau du serveur.
 */
export function lireFinBeta(brut: string | undefined): Date | null {
  const s = (brut ?? "").trim();
  const jour = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (jour) {
    const [a, m, j] = [Number(jour[1]), Number(jour[2]), Number(jour[3])];
    const d = new Date(Date.UTC(a, m - 1, j));
    if (d.getUTCFullYear() !== a || d.getUTCMonth() !== m - 1 || d.getUTCDate() !== j) return null; // 31 février…
    return minuitParis(a, m, j + 1);
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(s)) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** La fin de la bêta (exclue) : le premier instant où elle n'est plus active. */
export function finBeta(): Date {
  return lireFinBeta(process.env.NEXT_PUBLIC_BETA_FIN) ?? (lireFinBeta(BETA_DERNIER_JOUR) as Date);
}

/** La bêta a été coupée à la main (`NEXT_PUBLIC_BETA=0`) : le site d'avant B1, au caractère près. */
export function betaCoupee(): boolean {
  return process.env.NEXT_PUBLIC_BETA === "0";
}

/** La bêta est-elle en cours à cet instant ? Vrai jusqu'à la fin du dernier jour, heure de Paris. */
export function betaActive(maintenant: Date = new Date()): boolean {
  if (betaCoupee()) return false;
  return maintenant.getTime() < finBeta().getTime();
}

/**
 * Membre fondateur : un compte dont l'adresse a été CONFIRMÉE avant la fin de la bêta (`user.email_confirmed_at` de
 * Supabase). Pas la date de création : n'importe qui peut créer un compte (non confirmé) à l'adresse d'un autre avant
 * la fin, confirmé en 2027 il ne doit pas devenir fondateur. Le statut reste après la bêta (c'est lui qui garde le
 * tarif préférentiel) ; seule la coupure manuelle le masque.
 */
export function estMembreFondateur(user: { email_confirmed_at?: string | null } | null | undefined): boolean {
  if (!user?.email_confirmed_at || betaCoupee()) return false;
  const confirme = new Date(user.email_confirmed_at).getTime();
  return Number.isFinite(confirme) && confirme < finBeta().getTime();
}

/* ─── Les textes datés ───────────────────────────────────────────────────────── */

export type LibellesBeta = {
  /** Le dernier jour de la bêta : « 31 décembre 2026 », « December 31, 2026 ». */
  fin: string;
  /** Le premier jour après la bêta : « 1er janvier 2027 », « January 1, 2027 ». */
  reprise: string;
};

/** Les dates que les textes de la bêta citent, suivant `NEXT_PUBLIC_BETA_FIN`. */
export function libellesBeta(locale: Locale): LibellesBeta {
  const fin = finBeta();
  const fmt = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "fr-FR", {
    day: "numeric", month: "long", year: "numeric", timeZone: PARIS,
  });
  const reprise = fmt.format(fin);
  return {
    fin: fmt.format(new Date(fin.getTime() - 1)),
    reprise: locale === "en" ? reprise : reprise.replace(/^1 /, "1er "),
  };
}

/**
 * Une date qui ne se coupe pas en fin de ligne (« 31 décembre 2026 » sur un téléphone se lisait « 31 » puis « décembre
 * 2026 ») : ses espaces deviennent insécables. Pour les titres et le bandeau ; le texte suivi garde la date d'origine.
 */
export function dateInsecable(date: string): string {
  return date.replace(/ /g, "\u00a0");
}

/* ─── Vers l'inscription ─────────────────────────────────────────────────────── */

/**
 * D'où vient un visiteur envoyé vers l'inscription par une fonction de la bêta. Liste FERMÉE : la mesure
 * `vers_inscription { source }` (émise à l'arrivée sur /inscription) ignore toute autre valeur.
 */
export const SOURCES_BETA = [
  "choix-reno", "choix-neuf", "choix-plan",
  "affiner-reno", "affiner-neuf", "multi-pieces",
  "enregistrer-reno", "enregistrer-neuf",
  "detaille", "construction",
  "editeur-plan", "vitrine-plan",
  "tarifs", "accueil",
] as const;
export type SourceBeta = (typeof SOURCES_BETA)[number];

/** Une source de la liste fermée, ou rien. */
export function lireSourceBeta(v: unknown): SourceBeta | undefined {
  return typeof v === "string" && (SOURCES_BETA as readonly string[]).includes(v) ? (v as SourceBeta) : undefined;
}

/**
 * L'adresse de l'inscription pour une fonction de la bêta : `next` est l'intention (où l'emmener une fois
 * son adresse confirmée ; absente, l'inscription mène aux questions de profil, puis à ses projets), `source`
 * dit d'où il vient. `next` doit être un chemin interne : /inscription le revérifie (`cheminInterne`).
 */
export function lienInscriptionBeta(next: string | undefined, source: SourceBeta): string {
  return `/inscription?${next ? `next=${encodeURIComponent(next)}&` : ""}source=${source}`;
}

/* ─── L'éditeur de plan ──────────────────────────────────────────────────────── */

/**
 * Ce que `/api/plans/session` (rendue à la requête) donne à l'amorçage de l'éditeur (lib/editeur/heberger.ts) tant
 * que la bêta court :
 *  - `prix` remplace la phrase du prix de Pro (« Gratuit pendant la bêta… », sans « Pro » devant : l'amorçage le retire,
 *    `TEXTES_BETA_EDITEUR` ; avec sa majuscule et son point : l'éditeur l'écrit après une phrase, dans le dossier PDF) ;
 *  - `passer` remplace le libellé « Passer Pro » dans le texte du script, des lettres et des espaces seulement ;
 *  - `reserve` remplace « est réservé à Pro » (le projet rénovation ouvert sans compte), lettres, espaces et virgules ;
 *  - `plans` remplace « des plans enregistrés sans limite » (le droit Pro des plans) : pendant la bêta, un inscrit en
 *    enregistre {@link PLANS_MAX_BETA} au plus ; lettres, chiffres, espaces et apostrophe typographique (la phrase vit
 *    dans une chaîne entre apostrophes droites du script) ;
 *  - `inscription` : l'adresse de l'inscription (intention /plan, source `editeur-plan`) ; « Compte gratuit » (la barre,
 *    les liens et les boutons qui menaient à /tarifs dans un nouvel onglet) y mène directement, comme l'invitation
 *    « Garde ce plan dans ton compte », avec le drapeau de reprise du plan.
 * L'amorçage revérifie chaque valeur. L'intérieur de l'éditeur reste en français.
 */
export function betaEditeurPlan(): { prix: string; passer: string; reserve: string; plans: string; inscription: string } {
  return {
    prix: `Gratuit pendant la bêta, jusqu'au ${libellesBeta("fr").fin}, avec un compte.`,
    passer: "Compte gratuit",
    reserve: "demande un compte, gratuit pendant la bêta",
    plans: `jusqu\u2019à ${PLANS_MAX_BETA} plans enregistrés`,
    inscription: lienInscriptionBeta("/plan", "editeur-plan"),
  };
}
