/**
 * La bêta gratuite (chantier B1, décision de Dani du 13/10/2026) : jusqu'à la fin du 31 décembre 2026,
 * heure de Paris, TOUT AVYORA est offert à qui a un compte. Il faut un compte (on veut l'adresse e-mail),
 * mais aucun moyen de paiement : rien n'est vendu, rien ne sera prélevé.
 *
 * Source de vérité unique de la bêta : sa date de fin, son interrupteur, le tarif promis aux membres
 * fondateurs, et la liste fermée des « sources » qui envoient un visiteur vers l'inscription. Le reste du site lit ce module ; `estPro` (lib/auth.ts) en tire les droits.
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
 * Le tarif de lancement promis aux membres fondateurs, en euros par mois. UNE constante : la changer ici
 * change tous les textes qui le citent (accueil, Tarifs, inscription, Mon compte, CGU).
 */
export const TARIF_FONDATEUR_MOIS = 18.85;

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
 * Membre fondateur : un compte créé avant la fin de la bêta (`user.created_at` de Supabase). Le statut
 * reste après la bêta (c'est lui qui garde le tarif de lancement) ; seule la coupure manuelle le masque.
 */
export function estMembreFondateur(user: { created_at?: string | null } | null | undefined): boolean {
  if (!user?.created_at || betaCoupee()) return false;
  const cree = new Date(user.created_at).getTime();
  return Number.isFinite(cree) && cree < finBeta().getTime();
}

/* ─── Les textes datés ───────────────────────────────────────────────────────── */

/** Le tarif fondateur écrit dans la langue (« 18,85 € », espace insécable avant l'euro ; « €18.85 »). */
export function tarifFondateur(locale: Locale): string {
  const n = TARIF_FONDATEUR_MOIS.toFixed(2);
  return locale === "en" ? `€${n}` : `${n.replace(".", ",")}\u00a0€`;
}

export type LibellesBeta = {
  /** Le dernier jour de la bêta : « 31 décembre 2026 », « December 31, 2026 ». */
  fin: string;
  /** Le premier jour après la bêta : « 1er janvier 2027 », « January 1, 2027 ». */
  reprise: string;
  /** Le tarif de lancement des membres fondateurs : « 18,85 € », « €18.85 ». */
  tarif: string;
};

/** Les dates et le tarif que les textes de la bêta citent, suivant `NEXT_PUBLIC_BETA_FIN` et la constante. */
export function libellesBeta(locale: Locale): LibellesBeta {
  const fin = finBeta();
  const fmt = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "fr-FR", {
    day: "numeric", month: "long", year: "numeric", timeZone: PARIS,
  });
  const reprise = fmt.format(fin);
  return {
    fin: fmt.format(new Date(fin.getTime() - 1)),
    reprise: locale === "en" ? reprise : reprise.replace(/^1 /, "1er "),
    tarif: tarifFondateur(locale),
  };
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
 * que la bêta court : `prix` remplace la phrase du prix de Pro (« Pro gratuit pendant la bêta… ») ; `passer` remplace
 * le libellé « Passer Pro » dans le texte du script, des lettres et des espaces seulement (l'amorçage le revérifie).
 * L'intérieur de l'éditeur reste en français.
 */
export function betaEditeurPlan(): { prix: string; passer: string } {
  return { prix: `gratuit pendant la bêta, jusqu'au ${libellesBeta("fr").fin}, avec un compte`, passer: "Compte gratuit" };
}
