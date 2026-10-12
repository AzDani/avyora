/**
 * RÉNOVATION — le contexte d'une estimation détaillée née d'un plan de rénovation (« Mes plans », C7).
 *
 * Module PUR : il prend le contrat que l'éditeur a émis (`contratPlan()`, relu EN BASE par
 * `lib/plans/estimation.ts`) et rend le `ctx` de l'estimateur détaillé. Il ne choisit aucun poste (c'est
 * `contributionsDuPlan` puis `injecterPlan`) et ne calcule aucun prix (c'est le moteur).
 *
 * Ce que le ctx pilote encore quand le plan a injecté ses mesures : les postes que le plan ne mesure pas
 * (électricité, ventilation, seuils…), qui dépendent de la surface, des niveaux et des pièces. D'où les
 * règles (plan § C7, décisions D3 et D4) :
 *  - périmètre « logement entier » (D3) ;
 *  - surface = l'aire APRÈS travaux (`area`), arrondie ; emprise = celle du rez-de-chaussée, saisie ;
 *  - les HUIT compteurs toujours écrits, zéros compris (`compteursDepuisPlan`, règle 3 de D4) : sinon les
 *    défauts de `defaultCtx()` (3 chambres, 1 séjour…) chiffreraient des pièces qui n'existent pas ;
 *  - les pièces comptées sont celles du logement APRÈS travaux : un appareil à démolir ne fait plus une
 *    pièce d'eau, une fenêtre à démolir ou à boucher ne compte plus.
 *
 * Le contrat est une donnée du client (il a traversé `PATCH /api/plans/[id]`, contrôlé par le schéma
 * ouvert `planImportSchema`) : chaque valeur est relue, typée et bornée ici. Rien n'est lu qui ne soit
 * un nombre fini ou une valeur d'une liste fermée.
 */
import { defaultCtx, type Ctx, type Finition, type TypeBien } from "./core";
import { compteursDepuisPlan, MAPPAGE_PIECES, type PiecePlan, type TypePiecePlan } from "./plan-mapping";

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const tab = (v: unknown): Obj[] => (Array.isArray(v) ? v.filter((x) => x && typeof x === "object" && !Array.isArray(x)) as Obj[] : []);
const nombre = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const borne = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Bornes du ctx repris (au-delà, ce n'est plus un logement : on ramène dans l'intervalle). */
export const PLAN_CTX_SURFACE_MAX = 2000;
const NIVEAUX_MAX = 6;
const HAUTEUR_MIN = 1.8;
const HAUTEUR_MAX = 6;

const FINITIONS = new Set<Finition>(["eco", "standard", "premium"]);
const EAU = new Set(["douche", "baignoire"]);
/** Ouvertures qui comptent comme fenêtres dans le ctx (le moteur en tire volets, appuis…). */
const FENETRES = new Set(["fenetre", "fenetre_p", "porte_fenetre", "baie"]);
/** États d'un élément qui n'existera plus après les travaux. */
const DISPARAIT = new Set(["demolir", "boucher"]);

const estTypePiece = (t: unknown): t is TypePiecePlan => typeof t === "string" && Object.hasOwn(MAPPAGE_PIECES, t);

/** Le code postal du contrat, s'il est un vrai code postal (5 chiffres). */
export function codePostalDuContrat(contrat: unknown): string | null {
  const cp = obj(obj(contrat).contexte).codePostal;
  return typeof cp === "string" && /^\d{5}$/.test(cp) ? cp : null;
}

/**
 * Type de bien du moteur. Une maison reste « Maison » (défaut, comme le plan § C7). Un appartement prend
 * le type que l'intake détaillé propose (« Studio », « T2 », « T3 », « T4 ») : le moteur n'a pas de
 * type « Appartement » et l'écran ne saurait pas l'afficher. T(n) = chambres + 1, plafonné à T4.
 */
function typeDuBien(typeBien: unknown, chambres: number): TypeBien {
  if (typeBien !== "appartement") return "Maison";
  if (chambres <= 0) return "Studio";
  return chambres === 1 ? "T2" : chambres === 2 ? "T3" : "T4";
}

/**
 * Le ctx de l'estimation détaillée, depuis le contrat d'un plan de rénovation. Part de `defaultCtx()` :
 * ce que le plan ne dit pas (budget, aléas…) garde la valeur par défaut. `codePostal` n'est posé que si
 * le contrat en porte un valide.
 */
export function ctxDepuisPlan(contrat: unknown): Ctx {
  const c = obj(contrat);
  const bien = obj(c.bien);
  const contexte = obj(c.contexte);
  const niveauxDetail = tab(c.detailNiveaux);

  /* Les pièces du logement après travaux, et ce qui y est posé (un appareil à démolir ne compte plus). */
  const pieces: PiecePlan[] = [];
  let fenetres = 0;
  for (const n of niveauxDetail) {
    const equipements = tab(n.equipements).filter((e) => !DISPARAIT.has(String(e.etat)));
    for (const r of tab(n.rooms)) {
      if (!estTypePiece(r.type)) continue;
      const ici = equipements.filter((e) => e.piece != null && e.piece === r.id);
      pieces.push({
        type: r.type,
        doucheOuBaignoire: ici.some((e) => EAU.has(String(e.type))),
        cuvettes: ici.filter((e) => e.type === "wc").length,
      });
    }
    fenetres += tab(n.menuiseries).filter((m) => FENETRES.has(String(m.type)) && !DISPARAIT.has(String(m.etat))).length;
  }
  const k = compteursDepuisPlan(pieces);

  const base = defaultCtx();
  const area = nombre(c.area);
  const surface = area != null && area > 0 ? borne(Math.round(area), 1, PLAN_CTX_SURFACE_MAX) : base.surface;

  const nNiveaux = nombre(bien.niveaux) ?? (niveauxDetail.length || null);
  const niveaux = nNiveaux != null ? borne(Math.round(nNiveaux), 1, NIVEAUX_MAX) : base.niveaux;

  const rdc = niveauxDetail[0] ?? {};
  const emprise = nombre(rdc.emprise) ?? nombre(bien.emprise);
  const surfaceSol = emprise != null && emprise > 0
    ? borne(Math.round(emprise), 1, PLAN_CTX_SURFACE_MAX)
    : Math.max(1, Math.round(surface / niveaux));

  const h = nombre(rdc.hauteur) ?? nombre(bien.hauteurParDefaut);
  const hauteur = h != null ? Math.round(borne(h, HAUTEUR_MIN, HAUTEUR_MAX) * 100) / 100 : base.hauteur;

  const finition = FINITIONS.has(contexte.finition as Finition) ? (contexte.finition as Finition) : base.finition;
  const cp = codePostalDuContrat(c);

  const ctx: Ctx = {
    ...base,
    perimetre: "entier",
    type: typeDuBien(contexte.typeBien, k.chambres + k.suites),
    surface,
    surfaceSol,
    surfaceSolManual: true,
    niveaux,
    hauteur,
    sejour: k.sejour,
    cuisine: k.cuisine,
    chambres: k.chambres,
    suites: k.suites,
    couloir: k.couloir,
    buanderie: k.buanderie,
    sdb: k.sdb,
    wc: k.wc,
    pieces: k.sejour + k.cuisine + k.chambres + k.suites + k.couloir + k.buanderie,
    fenetres,
    finition,
    /* Logement de moins de deux ans : TVA à 20 % (le régime « pro » du moteur). Sinon, le défaut. */
    ...(contexte.logementPlus2Ans === false ? { fiscal: "pro" as const } : {}),
    ...(cp ? { codePostal: cp } : {}),
  };
  return ctx;
}
