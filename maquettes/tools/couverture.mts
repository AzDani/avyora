/**
 * Couverture maquette ↔ estimateur : chaque ACTION dessinée a-t-elle sa réponse au devis ?
 *
 * `coherence.mjs` compare des PRIX unitaires ; il ne dit rien de ce qu'une action DEVIENT. On peut
 * très bien avoir 97/97 prix alignés et un compteur qui annonce un total que le devis ne fera pas
 * — parce qu'il oublie un ouvrage, parce qu'il en compte un que l'estimateur dérive autrement, ou
 * parce qu'une règle (D8 : parquet sur parquet = ponçage) n'existe que d'un seul côté.
 *
 * On construit la scène de référence, on lit ce que la maquette ANNONCE (ses tâches, avec leur
 * prix) et ce qu'elle ÉMET (son contrat), on passe le contrat dans la vraie table de
 * correspondance, on valorise les lignes au catalogue, et on rapproche les deux par l'identifiant
 * public de l'élément — jamais par le libellé, qui ne prouve rien.
 *
 *   npx tsx maquettes/tools/couverture.mts "$(pwd)/maquettes"
 *
 * Sort en code 1 si l'écart global dépasse le seuil toléré, ou si un élément dessiné n'a
 * absolument aucune réponse au devis (ni l'inverse).
 */
import { readFileSync } from "node:fs";
import { ouvrirMaquette, scene, sceneVariantes } from "./scene-reference.mjs";
import { contributionsDuPlan, type PlanPourCorrespondance } from "../../lib/estimateur/plan-correspondance";
import { effPrices, defaultCtx } from "../../lib/estimateur/core";

type Tache = { label: string; lot: string; prix: number; inclus: boolean; pid: string };
type Poste = { n: string; u: string; fp: number; vars?: Array<{ k: string; opts: Array<{ k: string; coef: number }> }> };

const SP = process.argv[2];
if (!SP) { console.error("usage : npx tsx maquettes/tools/couverture.mts <dossier maquettes>"); process.exit(2); }

/* Seuil d'écart global toléré entre le compteur du plan et le devis, sur la scène de référence.
   Il n'est pas là pour excuser une dérive : il est là pour qu'une dérive NOUVELLE se voie. Il
   valait 13 % le matin du 19/09/2026 ; la dette a été refermée le soir même (D22) et il vaut
   maintenant 1 %, la marge d'arrondi. On le baisse à chaque fois qu'on aligne un poste — jamais
   on ne le monte pour faire passer le contrôle. */
const SEUIL_ECART_PC = 1;

const CAT = JSON.parse(readFileSync("lib/estimateur/catalog.json", "utf8"));
const lots = Array.isArray(CAT) ? CAT : (CAT.lots ?? Object.values(CAT)[0]);
const postes: Record<string, Poste> = {};
for (const l of lots as Array<{ t: Array<Poste & { id: string }> }>) for (const t of l.t) postes[t.id] = t;

/* Prix d'une ligne tel que le DEVIS le facturera. On appelle `effPrices`, le calcul du moteur
   lui-même, au lieu de refaire les coefficients à la main : la première version multipliait les
   variantes et s'arrêtait là, donc elle ignorait le matériau, le vitrage, la motorisation et la
   taille — et validait « 0 % d'écart » en comparant à un prix que personne ne facture.
   Le contexte est celui par défaut, le même que celui d'un projet neuf. */
const CTX = defaultCtx();
const valoriser = (c: { poste: string; quantite: number; variante?: Record<string, string>; mat?: string; vit?: string }) => {
  const t = postes[c.poste];
  if (!t) return null;
  const { fp } = effPrices(t as never, { on: true, vsel: c.variante, mat: c.mat, vit: c.vit } as never, CTX);
  return (fp ?? 0) * c.quantite;
};

const LECTURE = `(() => {
  /* Le pid de l'élément que la tâche concerne. Un identifiant de tâche colle des jetons
     (w:<id>:demolir, i:<id>:creer, sol-rev:<id>) : on essaie chaque jeton comme identifiant brut.
     Les tâches globales (toiture, étude, percements) n'en ont aucun — elles ne parlent pas d'un
     élément précis, et se comparent entre elles sous la clé « (global) ». */
  function brutVersPid(raw){
    for (const lv of state.levels)
      for (const coll of [lv.walls, lv.openings, lv.items, lv.rooms]) {
        const x = coll.find(e => e.id === raw);
        if (x) return x.pid || null;
      }
    return null;
  }
  return {
    contrat: JSON.parse(JSON.stringify(contratPlan())),
    taches: chantierTasks().map(t => ({
      label: t.label, lot: t.lot, prix: Math.round(t.prix || 0), inclus: !!t.inclus,
      pid: t.id.split(":").map(brutVersPid).filter(Boolean)[0] || "(global)",
    })),
  };
})()`;

const { b, p, errs } = await ouvrirMaquette(SP);
await p.evaluate(scene);
const base = (await p.evaluate(LECTURE)) as { contrat: unknown; taches: Tache[] };
/* La seconde scène existe parce que la première ne parcourt pas tous les chemins : elle n'a ni
   bois, ni triple vitrage, ni galandage, ni trémie, ni doublage existant. Le bug de la chape est
   passé exactement par ce trou-là — un chemin jamais emprunté par le témoin. */
await p.evaluate(sceneVariantes);
const variantes = (await p.evaluate(LECTURE)) as { contrat: unknown; taches: Tache[] };
await b.close();
if (errs.length) { console.error("erreurs de page :", errs); process.exit(1); }


let dur = 0;
const KO = (quoi: string, d: string) => { dur++; console.log(`  ✗ ${quoi}\n      ${d}`); };

/* Deux tableaux de bord par élément : ce que la maquette annonce, ce que le devis facturera.
   Une ligne à plusieurs sources est rangée sous la première — ce qui suffit pour repérer un
   élément TOTALEMENT muet, le seul défaut qu'on veut rendre bloquant ici. */
/* Il y avait ici une exception pour le doublage, que le devis portait sous « (global) » faute
   d'identifiant de mur. Elle n'a plus lieu d'être : la correspondance lit désormais
   `provenance.doublages` et chaque ligne dit de quel mur elle vient (D23). Si un jour un autre
   ouvrage arrive en agrégat, c'est ici qu'il faudra le déclarer — et surtout le corriger. */
function comparer(nom: string, jeu: { contrat: unknown; taches: Tache[] }) {
const { contrat, taches } = jeu;
const { contributions, ignores } = contributionsDuPlan(contrat as PlanPourCorrespondance);
const repartis = new Set<string>();
const annonce: Record<string, number> = {}, facture: Record<string, number> = {};
for (const t of taches) annonce[t.pid] = (annonce[t.pid] ?? 0) + t.prix;
for (const c of contributions) {
  const v = valoriser(c);
  if (v === null) { KO(`poste inconnu au catalogue : ${c.poste}`, "identifiant renommé ?"); continue; }
  const k = c.sources?.[0] ?? "(global)";
  facture[k] = (facture[k] ?? 0) + v;
  /* Une ligne qui porte PLUSIEURS sources (les plinthes de trois pièces fusionnées en un seul
     linéaire) est rangée sous la première : la comparaison par élément devient alors fausse des
     deux côtés — un excédent sur la première, un manque sur les autres. Le total, lui, reste
     juste. On note donc ces éléments et on ne rend PAS de verdict sur eux. */
  if ((c.sources?.length ?? 0) > 1) for (const q of c.sources) repartis.add(q);
}

const totalPlan = Object.values(annonce).reduce((a, x) => a + x, 0);
const totalDevis = Object.values(facture).reduce((a, x) => a + x, 0);
const ecartPc = Math.round((totalDevis / totalPlan - 1) * 1000) / 10;

console.log(`\n━━ ${nom}\n\n1. Le compteur du plan et le devis`);
console.log(`  compteur maquette  ${Math.round(totalPlan).toLocaleString("fr-FR")} €`);
console.log(`  devis estimateur   ${Math.round(totalDevis).toLocaleString("fr-FR")} €   (fourni-posé, hors finition / région / TVA)`);
console.log(`  écart              ${ecartPc > 0 ? "+" : ""}${ecartPc} %`);
if (Math.abs(ecartPc) > SEUIL_ECART_PC) KO(`écart de ${ecartPc} % · toléré : ${SEUIL_ECART_PC} %`, "le compteur du plan ne dit plus ce que le devis facturera");

console.log("\n2. Élément par élément (les écarts de plus de 50 €)");
const pids = [...new Set([...Object.keys(annonce), ...Object.keys(facture)])].sort();
for (const k of pids) {
  const m = Math.round(annonce[k] ?? 0), e = Math.round(facture[k] ?? 0);
  if (Math.abs(e - m) < 50) continue;
  const reparti = repartis.has(k);
  const muet = m > 0 && e === 0 && !reparti, invisible = e > 0 && m === 0 && !reparti;
  const ligne = `  ${k.padEnd(9)} plan ${String(m).padStart(7)} €   devis ${String(e).padStart(7)} €   ${e - m > 0 ? "+" : ""}${e - m} €`;
  if (reparti) console.log(`${ligne}   · ligne(s) du devis partagée(s) avec d'autres pièces — sans verdict`);
  else if (muet) KO(ligne.trim(), "la maquette chiffre cet élément, le devis ne porte AUCUNE ligne pour lui");
  else if (invisible) KO(ligne.trim(), "le devis facture cet élément, le compteur du plan ne l'annonce pas");
  else console.log(ligne);
}

console.log("\n3. Tâches à 0 € — ouvrages abandonnés (D19)");
const zero = taches.filter((t) => !t.prix && !t.inclus);
if (!zero.length) console.log("  aucune");
for (const t of zero) console.log(`  · ${t.lot} · ${t.label}`);

console.log("\n4. Ce que la correspondance a explicitement écarté");
if (!ignores.length) console.log("  aucun");
for (const i of ignores) console.log(`  · ${i.quoi} → ${i.pourquoi}`);

}

comparer("scène de référence", base);
comparer("scène variantes — bois, triple vitrage, galandage, trémie, doublage existant", variantes);
console.log(`\n${dur ? `✗ ${dur} rupture(s) de couverture` : "✓ couverture cohérente sur les deux scènes"}`);
process.exit(dur ? 1 : 0);
