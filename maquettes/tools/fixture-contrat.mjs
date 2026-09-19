/**
 * Génère la scène de référence utilisée par les tests de la table de correspondance.
 * La scène elle-même vit dans scene-reference.mjs — partagée avec couverture.ts.
 *
 *   node maquettes/tools/fixture-contrat.mjs "$(pwd)/maquettes" tests/fixtures/plan-contrat.json
 */
import { writeFileSync } from "node:fs";
import { ouvrirMaquette, scene } from "./scene-reference.mjs";
const SP=process.argv[2],OUT=process.argv[3];
const {b,p,errs}=await ouvrirMaquette(SP);
await p.evaluate(scene);
const q=await p.evaluate(()=>JSON.parse(JSON.stringify(contratPlan())));
writeFileSync(OUT,JSON.stringify(q,null,1));
console.log("contrat",q.contrat,"· niveaux",q.detailNiveaux.length,"· pageerrors:",errs.length?errs:"aucune");
await b.close();
