/**
 * « Modifier l'estimation » : ce que le PATCH complet d'un projet a le droit de changer.
 *
 * Les éditeurs (détaillé et rapide, rénovation et neuf) renvoient TOUT le projet : un nom généré et
 * des réponses d'estimation. Le serveur remplaçait `nom` et `reponses` tels quels, donc :
 * - un nom choisi à la main (crayon du titre) redevenait « Rénovation — T3 65 m² » ;
 * - la simulation Investissement (`reponses.invest`), que les éditeurs ne connaissent pas, était effacée ;
 * - le suivi de chantier repartait de la copie lue à l'ouverture de l'éditeur (les statuts cliqués entre-temps
 *   dans un autre onglet disparaissaient) ;
 * - l'origine (le plan dont la maison est née) disparaissait quand l'éditeur ne la renvoyait pas.
 *
 * Règles (fonctions pures, testées par `tests/espace-connecte.test.ts`) : l'estimation vient de l'éditeur,
 * le reste vient du projet enregistré ; le nom ne suit l'estimation que s'il est encore un nom
 * généré par AVYORA, comme pour une estimation mise à jour depuis un plan (`lib/plans/estimation.ts`).
 */
import { nomProjetReno, type MotsNomReno } from "./detaille-reno";
import { nomProjetNeuf } from "./brouillon-neuf";
import { ESPACES, selectedEspaces, type Ctx } from "./core";
import type { MaisonNeuve } from "./neuf";
import { dictDetail } from "../i18n/detail";
import { dict } from "../i18n/dictionaries";
import { LOCALES } from "../i18n/config";

type Obj = Record<string, unknown>;
const obj = (x: unknown): Obj => (x && typeof x === "object" && !Array.isArray(x) ? (x as Obj) : {});

/**
 * Les clés de `reponses` qui n'appartiennent PAS à l'estimation : le projet enregistré les garde quoi
 * que l'éditeur envoie. `invest` : la simulation Investissement (module M3). `statuts` : le suivi de
 * chantier, écrit clic par clic (la version enregistrée est la plus récente). Une clé de module à venir
 * s'ajoute ici.
 */
export const CLES_HORS_ESTIMATION = ["invest", "statuts"] as const;
/** Clés gardées seulement quand l'éditeur ne les renvoie pas (le neuf renvoie l'origine qu'il a relue). */
export const CLES_GARDEES_SI_ABSENTES = ["origine"] as const;

/** Les réponses à enregistrer : l'estimation de l'éditeur, plus ce qui ne lui appartient pas. */
export function fusionnerReponses(avant: unknown, apres: unknown): Obj {
  const a = obj(avant);
  const out: Obj = { ...obj(apres) };
  for (const k of CLES_HORS_ESTIMATION) {
    if (a[k] !== undefined && a[k] !== null) out[k] = a[k];
  }
  for (const k of CLES_GARDEES_SI_ABSENTES) {
    if (out[k] === undefined && a[k] !== undefined && a[k] !== null) out[k] = a[k];
  }
  return out;
}

/* ── Noms générés ─────────────────────────────────────────────────────────────────────────────── */

/** Mots du nom d'un détaillé rénovation, comme `components/Estimateur.tsx` les passe. */
function motsReno(locale: (typeof LOCALES)[number]): MotsNomReno {
  const dl = dictDetail(locale);
  const types = dl.bien.types as Record<string, string>;
  const espaces = dl.bien.espaces as Record<string, string>;
  return { projet: dl.projet, type: (t) => types[t] ?? t, espace: (nom) => espaces[nom] ?? nom };
}

/** Ancien format du détaillé (« Rénovation — 2 Chambre + Salle de bain · 28 m² »), avant « Chambre ×2 » :
 *  les projets enregistrés avant gardent ce nom, qui reste reconnu comme généré. */
function nomRenoAncien(ctx: Ctx, mots: MotsNomReno): string | null {
  if (ctx.perimetre !== "piece") return null;
  const esp = selectedEspaces(ctx).map(({ k, surfaces }) => `${surfaces.length > 1 ? surfaces.length + " " : ""}${mots.espace(ESPACES[k]?.nom ?? k)}`).join(" + ");
  return esp ? `${mots.projet} — ${esp} · ${ctx.surface} m²`.slice(0, 110) : null;
}

/** Noms du rapide rénovation (`components/EstimateurRapide.tsx`, `nomProjet`). */
function nomsRapideReno(r: Obj, ctx: Partial<Ctx>, locale: (typeof LOCALES)[number]): string[] {
  const t = dict(locale).rapide;
  const pieces = Array.isArray(r.pieces) ? (r.pieces as { room?: unknown }[]) : [];
  if (pieces.length) {
    const counts = new Map<string, number>();
    for (const p of pieces) if (typeof p?.room === "string") counts.set(p.room, (counts.get(p.room) ?? 0) + 1);
    const parts = [...counts].map(([k, n]) => `${t.rooms[k] ?? k}${n > 1 ? ` ×${n}` : ""}`);
    return [`${t.projetNom} — ${parts.join(" + ")}`.slice(0, 110)];
  }
  const s = Number(ctx.surface);
  if (!(s > 0)) return [];
  // Le type écrit dans le nom (maison ou appartement) : les deux, le rapide ne range pas le choix à part.
  return [t.typeMaison, t.typeAppart].map((ty) => `${t.projetNom} — ${ty} ${s} m²`.slice(0, 110));
}

/**
 * Tous les noms qu'AVYORA a pu générer pour ces réponses, en français et en anglais (la langue de
 * l'écran au moment de l'enregistrement n'est pas gardée). Un nom absent de cette liste a été choisi
 * à la main… ou vient d'un générateur qu'on ne sait pas refaire ici (plan) : dans le doute, on le garde.
 */
export function nomsGeneres(reponses: unknown): string[] {
  const r = obj(reponses);
  const ctx = obj(r.ctx) as Partial<Ctx>;
  if (!Object.keys(ctx).length) return [];
  const out = new Set<string>();
  for (const locale of LOCALES) {
    try {
      if (ctx.nature === "neuf") {
        if (ctx.neuf && typeof ctx.neuf === "object") out.add(nomProjetNeuf(ctx.neuf as MaisonNeuve, locale).slice(0, 110));
        continue;
      }
      if (r.mode === "rapide") { for (const n of nomsRapideReno(r, ctx, locale)) out.add(n); continue; }
      const mots = motsReno(locale);
      out.add(nomProjetReno(ctx as Ctx, mots));
      const ancien = nomRenoAncien(ctx as Ctx, mots);
      if (ancien) out.add(ancien);
    } catch { /* réponses inattendues : aucun nom reconnu, le nom actuel est gardé */ }
  }
  return [...out];
}

/** Le nom à enregistrer après « Modifier l'estimation » : le nouveau nom généré si l'actuel l'était
 *  aussi (il suit la surface, les pièces…), sinon le nom actuel, choisi par l'utilisateur. */
export function nomApresModification(nomActuel: string | null | undefined, reponsesAvant: unknown, nomPropose: string): string {
  const actuel = String(nomActuel ?? "").trim();
  if (!actuel) return nomPropose;
  return nomsGeneres(reponsesAvant).includes(actuel) ? nomPropose : actuel;
}
