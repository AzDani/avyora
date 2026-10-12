/**
 * Exporte des ÉTATS réels de l'éditeur (`state`, tel que la sauvegarde l'envoie) pour les tests de
 * l'API « Mes plans » (`tests/plans-schema.test.ts`, `tests/plans-apercu.test.ts`). Lecture seule :
 * l'éditeur est piloté dans Chrome headless, rien n'est écrit dans maquettes/.
 *
 *   node maquettes/tools/exporter-etats.mjs "$(pwd)/maquettes" tests/fixtures/plans-etats
 *
 * Sept états : les quatre plans types (en rénovation), l'exemple, le Plan final sur deux niveaux
 * (la scène de référence partagée) et le pire cas plausible mesuré pour dimensionner la base
 * (6 niveaux, chacun trois maisons accolées : environ 168 Ko).
 *
 * Sans dossier de sortie (la batterie lance chaque outil avec le seul dossier des maquettes), il
 * ne fait rien et sort en 0.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ouvrirMaquette, scenePlanFinalEtage } from "./scene-reference.mjs";

const SP = process.argv[2];
const OUT = process.argv[3];
if (!OUT) {
  console.log("exporter-etats : aucun dossier de sortie, rien à exporter (usage : exporter-etats.mjs <maquettes> <dossier>)");
  process.exit(0);
}
mkdirSync(OUT, { recursive: true });

/* Chaque scène s'exécute DANS la page et rend le state sérialisé. */
const modele = (id) => new Function(`
  closeWelcome('blank');
  chargerModele(TEMPLATES.find(t=>t.id==='${id}'),null,null,WORKFLOW_RENO); closeModal();
  afterChange(); garantirPids();
  return JSON.stringify(state);`);

const exemple = () => { closeWelcome("blank"); loadSample(); afterChange(); garantirPids(); return JSON.stringify(state); };

const planFinalEtage = new Function(`(${scenePlanFinalEtage.toString()})(); return JSON.stringify(state);`);

/* Le pire cas de la mesure de dimensionnement : la maison, R+1 meublé, cotes et notes, puis six
   niveaux faits chacun de trois RDC accolés. */
const pireCas = () => {
  closeWelcome("blank");
  chargerModele(TEMPLATES.find((t) => t.id === "maison"), null, null, WORKFLOW_RENO); closeModal();
  addLevel("copy"); closeModal();
  const rdc = state.levels[0], r1 = state.levels[1];
  r1.items = rdc.items.map((it) => ({ ...JSON.parse(JSON.stringify(it)), id: uid() }));
  [rdc, r1].forEach((lv) => { for (let i = 0; i < 10; i++) { lv.dims.push({ id: uid(), a: v(0, i), b: v(5, i), off: 0.5 }); lv.texts.push({ id: uid(), x: i, y: 1, text: "Note de chantier numéro " + i }); } });
  afterChange();
  const base = JSON.parse(JSON.stringify(rdc));
  const big = [];
  for (let n = 0; n < 6; n++) {
    const lv = JSON.parse(JSON.stringify(base)); lv.id = uid(); lv.name = "N" + n;
    for (let k = 1; k < 3; k++) {
      const dx = k * 13; const m = {};
      base.walls.forEach((w) => { const id = uid(); m[w.id] = id; lv.walls.push({ ...JSON.parse(JSON.stringify(w)), id, pid: undefined, a: v(w.a.x + dx, w.a.y), b: v(w.b.x + dx, w.b.y) }); });
      base.openings.forEach((o) => lv.openings.push({ ...JSON.parse(JSON.stringify(o)), id: uid(), pid: undefined, wallId: m[o.wallId] }));
      base.items.forEach((it) => lv.items.push({ ...JSON.parse(JSON.stringify(it)), id: uid(), pid: undefined, x: it.x + dx }));
    }
    big.push(lv);
  }
  state.levels = big; state.cur = 0; afterChange();
  return JSON.stringify(state);
};

const scenes = [
  ["t2", modele("t2")], ["studio", modele("studio")], ["t3", modele("t3")], ["maison", modele("maison")],
  ["exemple", exemple], ["plan-final-etage", planFinalEtage], ["pire-cas", pireCas],
];

let ko = 0;
for (const [nom, sc] of scenes) {
  const { b, p, errs } = await ouvrirMaquette(SP);
  const brut = await p.evaluate(sc);
  const st = JSON.parse(brut);
  const fichier = path.join(OUT, nom + ".json");
  writeFileSync(fichier, JSON.stringify(st));
  const murs = st.levels.reduce((s, l) => s + l.walls.length, 0);
  console.log(fichier, "·", st.workflow, "· schéma", st.schema, "· niveaux", st.levels.length, "· murs", murs, "·", Buffer.byteLength(brut), "o · pageerrors:", errs.length ? errs : "aucune");
  if (errs.length) ko++;
  await b.close();
}
process.exit(ko ? 1 : 0);
