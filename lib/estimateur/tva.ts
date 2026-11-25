/**
 * HT / TTC et TVA ligne par ligne (25/11/2026, maquette V4 validée par Dani). Fonctions pures, partagées
 * par la rénovation et le neuf. Le moteur ne change pas de logique : il calcule toujours chaque ligne en HT
 * puis lui ajoute sa TVA. Ce module ajoute seulement :
 *  - les réglages du projet : qui paie (`ctx.payeur`, « pro » = récupère la TVA), l'affichage (`ctx.affichage`) ;
 *  - les retouches d'une ligne : taux forcé (`s.tva`), prix tapé TTC (`s.puTtc` / `s.pmTtc`) ;
 *  - « Qui fait les travaux » pour tout le projet, « Tout remettre en automatique », la TVA par taux.
 * Par défaut (particulier, TTC, rien de retouché), tout est exactement comme avant.
 */
import { effRate, isLoc, key, lineHT, peutFaireSoiMeme, prixHTPerso, visible, visibleTask, type Ctx, type CustomLine, type Lot, type Selection, type Tache, type Totaux } from "./core";

/** Taux proposés par le sélecteur d'une ligne. */
export const TAUX_TVA = [5.5, 10, 20] as const;

/** Taux automatique d'une ligne : celui du moteur, sans le taux forcé. */
export function tauxAuto(l: Lot, t: Tache, sel: Selection, ctx: Ctx): number {
  const k = key(l.c, t.n), s = sel[k];
  if (!s || s.tva == null) return effRate(l, t, sel, ctx);
  const { tva: _forcé, ...reste } = s;
  void _forcé;
  return effRate(l, t, { ...sel, [k]: reste }, ctx);
}

/** Pourquoi le taux automatique vaut ce qu'il vaut (texte choisi par l'écran). */
export type RaisonTaux = "location" | "neuf" | "local" | "soi" | "option" | "energie" | "reduit" | "plein";
export function raisonTaux(l: Lot, t: Tache, sel: Selection, ctx: Ctx): RaisonTaux {
  const s = sel[key(l.c, t.n)];
  if (isLoc(l.c)) return "location";
  if (ctx.nature === "neuf") return "neuf";
  if (s && s.self) return "soi";
  if (ctx.fiscal === "pro") return "local";
  if (t.vars && t.vars.some((g) => g.opts.some((o) => o.tva != null))) return "option";
  const r = tauxAuto(l, t, sel, ctx);
  return r === 5.5 ? "energie" : r === 10 ? "reduit" : "plein";
}

/** Avertissement quand le taux forcé contredit la règle : taux réduit sur des matériaux achetés soi-même,
 *  ou en neuf / local pro. « Prévenir sans bloquer » (décision de Dani du 25/11/2026). */
export type AlerteTaux = "soi" | "neuf" | "energie" | null;
export function alerteTaux(l: Lot, t: Tache, sel: Selection, ctx: Ctx): AlerteTaux {
  const s = sel[key(l.c, t.n)];
  if (!s || s.tva == null) return null;
  if (s.tva < 20 && s.self && !isLoc(l.c)) return "soi";
  if (s.tva < 20 && (ctx.nature === "neuf" || ctx.fiscal === "pro")) return "neuf";
  if (s.tva === 5.5) return "energie";
  return null;
}

/** Une ligne est « retouchée » quand l'utilisateur a forcé son taux ou tapé un prix. */
export function retouchee(s: Selection[string] | undefined): boolean {
  return !!s && (s.tva != null || s.pu != null || s.pm != null);
}
/** Nombre de retouches du projet (un taux forcé = 1, chaque prix tapé = 1), sur les lignes cochées. */
export function nbRetouches(sel: Selection): number {
  let n = 0;
  for (const s of Object.values(sel)) {
    if (!s || !s.on) continue;
    if (s.tva != null) n++;
    if (s.pu != null) n++;
    if (s.pm != null) n++;
  }
  return n;
}
/** Une ligne sans ses retouches de taux et de prix (« Revenir à l'automatique »). */
export function sansRetouche(s: Selection[string]): Selection[string] {
  const { tva: _a, pu: _b, pm: _c, puTtc: _d, pmTtc: _e, ...reste } = s;
  void _a; void _b; void _c; void _d; void _e;
  return reste;
}
/** « Revenir à l'automatique » sur une ligne : taux et prix tapés effacés, la quantité ne bouge pas. */
export function revenirAuto(sel: Selection, c: string, n: string): Selection {
  const k = key(c, n), s = sel[k];
  return s ? { ...sel, [k]: sansRetouche(s) } : sel;
}
/** « Tout remettre en automatique » : toutes les retouches de taux et de prix, jamais les quantités. */
export function toutAutomatique(sel: Selection): Selection {
  const out: Selection = {};
  for (const [k, s] of Object.entries(sel)) out[k] = s ? sansRetouche(s) : s;
  return out;
}
/** Forcer (ou rendre automatique avec `null`) le taux d'une ligne. */
export function forcerTaux(sel: Selection, c: string, n: string, taux: number | null): Selection {
  const k = key(c, n), s = sel[k] ?? {};
  if (taux == null) { const { tva: _t, ...reste } = s; void _t; return { ...sel, [k]: reste }; }
  return { ...sel, [k]: { ...s, tva: taux } };
}
/** Changer la base (HT / TTC) d'un prix déjà tapé : le chiffre reste, sa base change. */
export function baseDuPrix(sel: Selection, c: string, n: string, quel: "pu" | "pm", ttc: boolean): Selection {
  const k = key(c, n), s = sel[k] ?? {};
  const champ = quel === "pu" ? "puTtc" : "pmTtc";
  const { [champ]: _x, ...reste } = s;
  void _x;
  return { ...sel, [k]: ttc ? { ...reste, [champ]: true } : reste };
}

/** Les lignes qu'on peut passer d'un coup en « Artisans » ou en « Moi » : cochées, visibles, et
 *  faisables soi-même (même règle que la puce « Je le fais » de la ligne). */
function lignesBasculables(cat: Lot[], ctx: Ctx, sel: Selection): Array<[Lot, Tache]> {
  const out: Array<[Lot, Tache]> = [];
  for (const l of cat) {
    if (!visible(ctx, l)) continue;
    for (const t of l.t) {
      const s = sel[key(l.c, t.n)];
      if (!s || !s.on || !visibleTask(ctx, t)) continue;
      if (!peutFaireSoiMeme(l, t) && !s.self) continue;
      out.push([l, t]);
    }
  }
  return out;
}
/** « Qui fait les travaux » du projet : tout par des artisans, tout soi-même, ou au cas par cas. */
export function quiFait(cat: Lot[], ctx: Ctx, sel: Selection): "art" | "soi" | "mix" | null {
  const ls = lignesBasculables(cat, ctx, sel);
  if (!ls.length) return null;
  const soi = ls.filter(([l, t]) => !!sel[key(l.c, t.n)]?.self).length;
  return soi === 0 ? "art" : soi === ls.length ? "soi" : "mix";
}
/** Passer toutes les lignes faisables soi-même en « Moi » (`soi` vrai) ou en « Artisan » (faux). */
export function toutFaire(cat: Lot[], ctx: Ctx, sel: Selection, soi: boolean): Selection {
  const out: Selection = { ...sel };
  for (const [l, t] of lignesBasculables(cat, ctx, sel)) {
    if (soi && !peutFaireSoiMeme(l, t)) continue; // un poste réservé aux pros ne passe jamais en « Moi »
    const k = key(l.c, t.n);
    out[k] = { ...out[k], self: soi };
  }
  return out;
}

/** HT et TVA par taux (lignes du catalogue et lignes perso validées), pour le détail du total. */
export function tvaParTaux(cat: Lot[], ctx: Ctx, sel: Selection, custom: CustomLine[] = []): Array<{ taux: number; ht: number; tva: number }> {
  const m = new Map<number, number>();
  for (const l of cat) {
    if (!visible(ctx, l)) continue;
    for (const t of l.t) {
      const h = lineHT(ctx, sel, l, t);
      if (!h) continue;
      const r = effRate(l, t, sel, ctx);
      m.set(r, (m.get(r) ?? 0) + h);
    }
  }
  for (const x of custom) {
    if (x.on === false || x.draft) continue;
    const h = prixHTPerso(x) * (x.qte || 0);
    if (!h) continue;
    m.set(x.tva || 0, (m.get(x.tva || 0) ?? 0) + h);
  }
  return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([taux, ht]) => ({ taux, ht, tva: (ht * taux) / 100 }));
}

/** Le professionnel récupère la TVA : son vrai coût est le HT (aléas compris). */
export const estPro = (ctx: Pick<Ctx, "payeur">): boolean => ctx.payeur === "pro";
export const enHT = (ctx: Pick<Ctx, "affichage">): boolean => ctx.affichage === "ht";
/** Coût retenu pour le budget réel et la rentabilité : HT + aléas pour un pro, TTC sinon. */
export function coutRetenu(tot: Totaux, ctx: Pick<Ctx, "payeur">): number {
  return estPro(ctx) ? tot.ht + tot.aleas : tot.ttc;
}
/** Total affiché : HT + aléas en affichage HT, TTC sinon. */
export function totalAffiche(tot: Totaux, ctx: Pick<Ctx, "affichage">): number {
  return enHT(ctx) ? tot.ht + tot.aleas : tot.ttc;
}
/** Un montant HT à afficher au taux `taux` : tel quel en HT, TVA ajoutée en TTC. */
export function montant(ht: number, taux: number, ctx: Pick<Ctx, "affichage">): number {
  return enHT(ctx) ? ht : ht * (1 + taux / 100);
}
/** Choisir qui paie : « pro » passe l'affichage en HT, particulier le remet en TTC (on peut le changer ensuite). */
export function choisirPayeur(ctx: Ctx, pro: boolean): Ctx {
  const { payeur: _p, affichage: _a, ...reste } = ctx;
  void _p; void _a;
  return pro ? { ...reste, payeur: "pro", affichage: "ht" } : reste;
}
export function choisirAffichage(ctx: Ctx, ht: boolean): Ctx {
  const { affichage: _a, ...reste } = ctx;
  void _a;
  return ht ? { ...reste, affichage: "ht" } : reste;
}

/** Réglages d'une ligne, à passer à `maj(lot, poste, réglage)` : forcer un taux (`null` = automatique)… */
export const ligneTaux = (taux: number | null) => (s: Selection[string]): Selection[string] => {
  if (taux == null) { const { tva: _t, ...reste } = s; void _t; return reste; }
  return { ...s, tva: taux };
};
/** … changer la base (HT / TTC) d'un prix tapé (le chiffre reste) … */
export const ligneBase = (quel: "pu" | "pm", ttc: boolean) => (s: Selection[string]): Selection[string] => {
  const champ = quel === "pu" ? "puTtc" : "pmTtc";
  const { [champ]: _x, ...reste } = s;
  void _x;
  return ttc ? { ...reste, [champ]: true } : reste;
};
/** … ou revenir à l'automatique (taux et prix tapés effacés). */
export const ligneAuto = () => (s: Selection[string]): Selection[string] => sansRetouche(s);

/** Montant d'un lot dans l'affichage du projet : ses lignes et ses lignes perso validées, chacune à son taux. */
export function lotAffiche(ctx: Ctx, sel: Selection, l: Lot, custom: CustomLine[] = []): number {
  let v = 0;
  for (const t of l.t) {
    const h = lineHT(ctx, sel, l, t);
    if (h) v += montant(h, effRate(l, t, sel, ctx), ctx);
  }
  for (const x of custom) {
    if (x.lot !== l.c || x.on === false || x.draft) continue;
    v += montant(prixHTPerso(x) * (x.qte || 0), x.tva || 0, ctx);
  }
  return v;
}

/** Lignes perso validées d'un lot, dans l'affichage du projet (chacune à son taux). */
export function persoAffiche(custom: CustomLine[], lot: string, ctx: Pick<Ctx, "affichage">): number {
  let v = 0;
  for (const x of custom) {
    if (x.lot !== lot || x.on === false || x.draft) continue;
    v += montant(prixHTPerso(x) * (x.qte || 0), x.tva || 0, ctx);
  }
  return v;
}
