/**
 * Consentement aux traceurs publicitaires (CNIL, art. 82 de la loi Informatique et Libertés).
 *
 * Un seul usage soumis à consentement sur le site : Google Ads (mesure des conversions et remarketing, balise
 * gtag.js de lib/gtag.ts). Tout le reste est exempté : cookies de session et de préférence, Vercel Analytics (sans
 * cookie). Le choix du visiteur (« Tout accepter » / « Tout refuser ») est rangé dans le localStorage de ce navigateur
 * (propre au site, jamais envoyé au serveur) et vaut 6 mois : passé ce délai, le bandeau le redemande.
 *
 * Tant qu'aucun choix valable n'est enregistré, la réponse est « refusé » : gtag.js n'est jamais chargé et aucune
 * conversion ne part (refus par défaut). Ce module est pur côté logique (lireChoix, ecrireChoix) et prudent côté
 * navigateur : un stockage indisponible (navigation privée stricte, cookies bloqués) vaut « pas de choix ».
 */

/** La clé du localStorage. */
export const CLE_CONSENTEMENT = "av-consentement";

/** La version du texte du bandeau : la changer redemande le choix à tout le monde (nouvelle finalité, nouveau tiers). */
export const VERSION_CONSENTEMENT = 1;

/** Durée de validité d'un choix (accepté comme refusé) : 6 mois, recommandation de la CNIL. */
export const DUREE_CONSENTEMENT_MS = 182 * 24 * 60 * 60 * 1000;

/** L'événement (sur window) qui rouvre le bandeau : lien « Gérer mes cookies » du pied de page. */
export const EVENEMENT_OUVRIR = "av-consentement-ouvrir";

/** L'événement (sur window) émis après chaque choix, avec `detail` = le choix. */
export const EVENEMENT_CHOIX = "av-consentement-choix";

export type Choix = "accepte" | "refuse";

type Enregistrement = { choix: Choix; le: string; v: number };

/**
 * Le choix enregistré, s'il est encore valable à `maintenant` : `null` si absent, illisible, d'une autre version du
 * bandeau, daté dans le futur (horloge trafiquée) ou vieux de plus de 6 mois.
 */
export function lireChoix(brut: string | null | undefined, maintenant: number = Date.now()): Choix | null {
  if (!brut) return null;
  let e: Partial<Enregistrement>;
  try {
    e = JSON.parse(brut) as Partial<Enregistrement>;
  } catch {
    return null;
  }
  if (!e || typeof e !== "object") return null;
  if (e.choix !== "accepte" && e.choix !== "refuse") return null;
  if (e.v !== VERSION_CONSENTEMENT) return null;
  const le = Date.parse(String(e.le ?? ""));
  if (!Number.isFinite(le)) return null;
  // Une minute de tolérance pour une horloge qui recule un peu ; au-delà, l'enregistrement n'est pas crédible.
  if (le > maintenant + 60_000) return null;
  if (maintenant - le > DUREE_CONSENTEMENT_MS) return null;
  return e.choix;
}

/** Ce que l'on range pour un choix fait à `maintenant`. */
export function serialiserChoix(choix: Choix, maintenant: number = Date.now()): string {
  const e: Enregistrement = { choix, le: new Date(maintenant).toISOString(), v: VERSION_CONSENTEMENT };
  return JSON.stringify(e);
}

/* ─── Navigateur ─────────────────────────────────────────────────────────────── */

/** Le choix valable de ce navigateur, ou `null` (côté serveur, ou stockage indisponible : `null`). */
export function choixEnregistre(): Choix | null {
  if (typeof window === "undefined") return null;
  try {
    return lireChoix(window.localStorage.getItem(CLE_CONSENTEMENT));
  } catch {
    return null;
  }
}

/** Vrai seulement si le visiteur a accepté, il y a moins de 6 mois. Refus par défaut. */
export function consentementPublicitaire(): boolean {
  return choixEnregistre() === "accepte";
}

/** Range le choix (6 mois) et le signale aux écouteurs. Un stockage indisponible : le choix vaut pour la page. */
export function enregistrerChoix(choix: Choix): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CLE_CONSENTEMENT, serialiserChoix(choix));
  } catch {
    /* stockage indisponible : le bandeau reviendra à la prochaine page */
  }
  try {
    window.dispatchEvent(new CustomEvent(EVENEMENT_CHOIX, { detail: choix }));
  } catch {
    /* noop */
  }
}

/** Rouvre le bandeau (lien « Gérer mes cookies »). */
export function ouvrirChoixCookies(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENEMENT_OUVRIR));
}

/** Les cookies et clés de stockage que la balise Google Ads pose sur getavyora.fr (propres au site). */
export const TRACEURS_GOOGLE = /^_(gcl|gac|ga|gid)(_|$)/;

/**
 * Au retrait du consentement : efface les traceurs Google posés sur notre domaine (cookies `_gcl_au`… et la clé
 * `_gcl_ls` du localStorage). Ceux de doubleclick.net appartiennent à Google : le navigateur seul peut les effacer.
 */
export function effacerTraceursGoogle(): void {
  if (typeof document === "undefined") return;
  const hote = window.location.hostname;
  // Le cookie peut avoir été posé sur l'hôte exact ou sur le domaine parent (.getavyora.fr).
  const domaines = ["", hote, "." + hote.split(".").slice(-2).join(".")];
  for (const morceau of document.cookie.split(";")) {
    const nom = morceau.split("=")[0]?.trim();
    if (!nom || !TRACEURS_GOOGLE.test(nom)) continue;
    for (const d of domaines) {
      document.cookie = `${nom}=; Max-Age=0; path=/${d ? `; domain=${d}` : ""}`;
    }
  }
  try {
    const ls = window.localStorage;
    const cles: string[] = [];
    for (let i = 0; i < ls.length; i++) {
      const cle = ls.key(i);
      if (cle && TRACEURS_GOOGLE.test(cle)) cles.push(cle);
    }
    for (const cle of cles) ls.removeItem(cle);
  } catch {
    /* noop */
  }
}
