/**
 * RÉNOVATION — règles de l'estimation rapide, en fonctions pures (chantier N4 de la revue
 * rénovation / neuf) :
 *
 * - quand le chiffre s'AFFICHE et quand il COMPTE comme une estimation (mesure Vercel
 *   `estimation_terminee` + conversion Google Ads). Ce ne sont plus la même chose : un projet
 *   rouvert a déjà été décrit, il s'affiche d'emblée, mais la conversion attend une vraie action
 *   (même règle que le rapide du neuf, `EstimateurRapideNeuf.tsx`) ;
 * - les réponses enregistrées : la liste des pièces (sans elle, un projet « pièces » rouvert
 *   redevenait un « T3 » de la surface totale) et le suivi de chantier (le PATCH remplace toutes
 *   les réponses : sans eux dans le corps, il était effacé) ;
 * - la reprise d'un projet rouvert en gratuit (`/projets/[id]/modifier`) ;
 * - les réponses rendues au retour de /tarifs (N13, comme le rapide du neuf).
 *
 * Aucun code du moteur à l'exécution (types seulement) : la page de modification, `ClaimDraft`
 * (via `brouillon-reno.ts`) et les tests le lisent sans embarquer le catalogue.
 */
import type { Ctx, Selection, TypeBien, Finition } from "./core";
import type { Ampleur, QuiRealise } from "./presets";
import type { PieceKey, PieceSel } from "./pieces";

/**
 * Un code postal qui existe dans la zone que le moteur chiffre : métropole (01 à 95, Corse comprise)
 * et départements d'outre-mer (971 à 974, 976), ceux qu'ajuste `regionCoef`. Avant, `\d{5}` suffisait :
 * 00000, 99999 ou un code de collectivité du Pacifique (98800) passaient pour la « moyenne
 * nationale », et « Enregistrer » les acceptait.
 */
const CP = /^(?:(?:0[1-9]|[1-8]\d|9[0-5])\d{3}|97[1-46]\d{2})$/;
export const codePostalValide = (cp: string): boolean => CP.test(cp);

/** Surface d'une pièce du mode « pièces » (m²) : au-delà, ce n'est plus une pièce. */
export const SURFACE_MAX_PIECE = 200;

/** Les pièces du mode « une ou plusieurs pièces » (mêmes clés que `PIECES`, recopiées pour ne pas importer le moteur). */
export const CLES_PIECES: readonly PieceKey[] = ["cuisine", "sdb", "chambre", "salon", "suite", "buanderie"];
const AMPLEURS: readonly string[] = ["rafraich", "partielle", "complete", "lourde"];
const FINITIONS: readonly string[] = ["eco", "standard", "premium"];
const QUIS: readonly string[] = ["pros", "partie", "max"];

/* ─── Affichage et conversion ─────────────────────────────────────────────────────────────── */

/**
 * Le chiffre s'affiche-t-il ? Dès que le visiteur a répondu quelque chose (`demarre`), ou d'emblée
 * pour un projet rouvert (`edition`), pour des réponses rendues au retour arrière ou au rechargement
 * (`retour`) — une vraie saisie, faite avant — et pour une pièce venue d'une page de prix
 * (`prerempli`) : le visiteur y a lu une fourchette, il doit retrouver la même sans recliquer.
 * L'affichage seulement : la mesure et la conversion attendent une vraie action (`demarre`).
 *
 * Et jamais sans un bien CHOISI (`typeChoisi`, absent = choisi) : « Maison, 100 m² » sont des valeurs
 * par défaut ; taper son seul code postal affichait le budget d'une maison que personne n'avait décrite.
 */
export function chiffreAfficheRapide(p: { demarre: boolean; edition: boolean; retour?: boolean; prerempli?: boolean; typeChoisi?: boolean }): boolean {
  return (p.demarre || p.edition || !!p.retour || !!p.prerempli) && p.typeChoisi !== false;
}

/**
 * Ce qui fait une estimation RÉELLE, celle qu'on mesure et qu'on déclare à Google Ads : une action
 * du visiteur, un bien choisi, une saisie valide, un total non nul et un code postal qui existe
 * (c'est lui qui rend le chiffre propre au visiteur et qui signale une intention).
 *
 * `demarre`, jamais `edition` : rouvrir un projet affiche son chiffre, mais ne le recompte pas. Et
 * le MODIFIER non plus (`edition` vrai) : la conversion « estimation » compte une création, pas la
 * retouche d'un projet déjà compté. Sans cette séparation, rouvrir un projet enverrait une
 * conversion au bout de 1,8 s.
 */
export function estimationReelleRapide(p: { demarre: boolean; saisieValide: boolean; ttc: number; codePostal: string; edition?: boolean; typeChoisi?: boolean }): boolean {
  return p.demarre && !p.edition && p.typeChoisi !== false && p.saisieValide && p.ttc > 0 && CP.test(p.codePostal);
}

/* ─── Réponses enregistrées ───────────────────────────────────────────────────────────────── */

/** Les réponses d'un projet rapide (POST à la création, PATCH en édition). */
export type ReponsesRapideReno = {
  v: "estimateur"; mode: "rapide"; ampleur: Ampleur; qui: QuiRealise; ctx: Ctx; sel: Selection; codePostal: string;
  /** Mode « pièces » : la liste telle que saisie, pour rouvrir le formulaire tel quel. */
  pieces?: PieceSel[];
  /** Suivi de chantier d'un projet rouvert : recopié tel quel (les clés disparues sont ignorées à l'affichage). */
  statuts?: Record<string, number>;
};

export function reponsesRapideReno(p: {
  ampleur: Ampleur; qui: QuiRealise; ctx: Ctx; sel: Selection; codePostal: string; pieces?: PieceSel[]; statuts?: Record<string, number>;
}): ReponsesRapideReno {
  return {
    v: "estimateur", mode: "rapide", ampleur: p.ampleur, qui: p.qui, ctx: p.ctx, sel: p.sel, codePostal: p.codePostal,
    ...(p.pieces?.length ? { pieces: p.pieces } : {}),
    ...(p.statuts && Object.keys(p.statuts).length ? { statuts: p.statuts } : {}),
  };
}

/** Relit une liste de pièces (réponses, brouillon) : `null` si elle est absente ou vide ; les entrées mal formées sont écartées. */
export function lirePiecesRapide(x: unknown): PieceSel[] | null {
  if (!Array.isArray(x)) return null;
  const out: PieceSel[] = [];
  for (const e of x) {
    if (!e || typeof e !== "object") continue;
    const { room, surface } = e as { room?: unknown; surface?: unknown };
    const s = Number(surface);
    if (typeof room !== "string" || !CLES_PIECES.includes(room as PieceKey) || !Number.isFinite(s) || s <= 0) continue;
    out.push({ room: room as PieceKey, surface: s });
  }
  return out.length ? out : null;
}

/** Suivi de chantier relu : seulement des états numériques. */
function lireStatuts(x: unknown): Record<string, number> | undefined {
  if (!x || typeof x !== "object" || Array.isArray(x)) return undefined;
  const out = Object.fromEntries(Object.entries(x as Record<string, unknown>).filter(([, v]) => typeof v === "number" && Number.isFinite(v))) as Record<string, number>;
  return Object.keys(out).length ? out : undefined;
}

/* ─── Réponses gardées dans l'onglet (retour arrière, rechargement, /tarifs) ─────────────────── */

/**
 * Les réponses du formulaire, rangées dans l'onglet (sessionStorage) à CHAQUE changement dès qu'un
 * chiffre s'affiche, et relues au montage : un retour arrière (depuis /inscription, /tarifs…) ou un
 * rechargement rend le formulaire tel qu'il était. Avant, elles n'étaient rangées que sur le chemin
 * de /tarifs (N13), que la bêta n'emprunte plus : le visiteur qui hésitait à s'inscrire revenait sur
 * un formulaire vierge. Le chiffre revient, mais pas la mesure : ce n'est pas une nouvelle estimation.
 */
export const CLE_RETOUR_RENO = "avyora-reno-retour";

export type RetourRapideReno = {
  mode: "bien" | "pieces"; type: TypeBien; surface: number; pieces: PieceSel[]; cp: string;
  ampleur: Ampleur; finition: Finition; qui: QuiRealise;
};

/** Relit les réponses rangées dans l'onglet : `null` si une seule est hors des choix du formulaire. */
export function lireRetourRapideReno(x: unknown): RetourRapideReno | null {
  if (!x || typeof x !== "object" || Array.isArray(x)) return null;
  const r = x as Record<string, unknown>;
  const surface = Number(r.surface);
  if (r.mode !== "bien" && r.mode !== "pieces") return null;
  if (r.type !== "Maison" && r.type !== "Appartement") return null;
  // 500 m² : `SURFACE_MAX_RAPIDE` (presets.ts), recopiée pour ne pas importer le moteur.
  if (!Number.isFinite(surface) || surface <= 0 || surface > 500) return null;
  if (typeof r.cp !== "string" || !/^\d{0,5}$/.test(r.cp)) return null;
  if (typeof r.ampleur !== "string" || !AMPLEURS.includes(r.ampleur)) return null;
  if (typeof r.finition !== "string" || !FINITIONS.includes(r.finition)) return null;
  if (typeof r.qui !== "string" || !QUIS.includes(r.qui)) return null;
  const pieces = lirePiecesRapide(r.pieces) ?? [];
  if (r.mode === "pieces" && !pieces.length) return null;
  return {
    // « Appartement » : le type du rapide, que `presetRapide` chiffre (le moteur ne le nomme pas, cf. `editionRapideReno`).
    mode: r.mode, type: r.type as TypeBien, surface, pieces, cp: r.cp,
    ampleur: r.ampleur as Ampleur, finition: r.finition as Finition, qui: r.qui as QuiRealise,
  };
}

/* ─── Projet rouvert en gratuit ───────────────────────────────────────────────────────────── */

/** Ce que le rapide reprend d'un projet existant (prop `edit` d'`EstimateurRapide`). */
export type RapideEdit = {
  projectId: string; type?: TypeBien; surface?: number; cp?: string; ampleur?: Ampleur; finition?: Finition; qui?: QuiRealise;
  /** Projet « pièces » : il rouvre en mode pièces, avec sa liste. */
  pieces?: PieceSel[];
  /** Suivi de chantier : remis dans le PATCH. */
  statuts?: Record<string, number>;
  /** Projet DÉTAILLÉ rouvert en gratuit : on prévient que ses réglages poste par poste seront remplacés. */
  detaille?: boolean;
  /** Projet « pièces » enregistré avant que la liste soit gardée : il rouvre en mode pièces, liste à refaire. */
  piecesPerdues?: boolean;
  /** Provision pour aléas du projet enregistré : il la GARDE (D7). Sans elle, rouvrir un projet de
   *  7 % le rechiffrait à 10 % (le défaut des nouveaux projets) et l'enregistrer réécrivait ses aléas. */
  aleas?: number;
};

/** Les réponses d'un projet telles qu'enregistrées (les champs non lus ici, `sel`, `custom`…, sont permis). */
type ReponsesStockees = { ctx?: Partial<Ctx>; codePostal?: string; ampleur?: unknown; qui?: unknown; mode?: unknown; pieces?: unknown; statuts?: unknown; [autre: string]: unknown };

/**
 * Le rapide d'un projet rénovation rouvert en gratuit, à partir de ses réponses enregistrées.
 * Le code postal de la ligne du projet passe avant celui des réponses (il est validé au serveur).
 *
 * Le rapide ne connaît que « Maison » et « Appartement » : un détaillé en Studio, T2, T3 ou T4 est
 * un appartement (c'est déjà ainsi que `presetRapide` le chiffre). Un rapide « pièces » range son
 * contexte en « T3 » (`ctxPiece`) : sans liste enregistrée, c'est un projet d'avant N4, dont les
 * pièces sont perdues ; il rouvre en mode pièces plutôt qu'en appartement entier.
 */
export function editionRapideReno(projectId: string, rep: ReponsesStockees | null | undefined, codePostalProjet?: string | null): RapideEdit {
  const r = rep ?? {};
  const ctx = r.ctx ?? {};
  const detaille = r.mode !== "rapide";
  const pieces = detaille ? null : lirePiecesRapide(r.pieces);
  const piecesPerdues = !detaille && !pieces && !!ctx.type && ctx.type !== "Maison" && (ctx.type as string) !== "Appartement";
  const statuts = lireStatuts(r.statuts);
  const surface = Number(ctx.surface);
  const aleas = ctx.aleas;
  const cp = codePostalProjet ?? r.codePostal;
  return {
    projectId,
    type: ctx.type === "Maison" ? "Maison" : ctx.type ? ("Appartement" as TypeBien) : undefined,
    surface: Number.isFinite(surface) && surface > 0 ? surface : undefined,
    cp: typeof cp === "string" ? cp : undefined,
    ampleur: typeof r.ampleur === "string" && AMPLEURS.includes(r.ampleur) ? (r.ampleur as Ampleur) : undefined,
    finition: typeof ctx.finition === "string" && FINITIONS.includes(ctx.finition) ? ctx.finition : undefined,
    qui: typeof r.qui === "string" && QUIS.includes(r.qui) ? (r.qui as QuiRealise) : undefined,
    ...(pieces ? { pieces } : {}),
    ...(statuts ? { statuts } : {}),
    ...(detaille ? { detaille: true } : {}),
    ...(piecesPerdues ? { piecesPerdues: true } : {}),
    ...(typeof aleas === "number" && Number.isFinite(aleas) && aleas >= 0 ? { aleas } : {}),
  };
}
