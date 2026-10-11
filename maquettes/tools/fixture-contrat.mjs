/**
 * Génère les contrats de référence utilisés par les tests.
 * Les scènes elles-mêmes vivent dans scene-reference.mjs — partagées avec couverture.ts.
 *
 *   node maquettes/tools/fixture-contrat.mjs "$(pwd)/maquettes" tests/fixtures/plan-contrat.json
 *
 * Plan final (C7, lien « Plan final → construction » du site) : la maison 94 m² de plain-pied,
 * puis la variante sur deux niveaux avec garage et suite.
 *
 *   node maquettes/tools/fixture-contrat.mjs "$(pwd)/maquettes" --final tests/fixtures/plan-final-contrat.json tests/fixtures/plan-final-etage-contrat.json
 */
import { writeFileSync } from "node:fs";
import { ouvrirMaquette, scene, scenePlanFinal, scenePlanFinalEtage } from "./scene-reference.mjs";
const SP=process.argv[2];
const final=process.argv[3]==="--final";
const sorties=final?[[scenePlanFinal,process.argv[4]],[scenePlanFinalEtage,process.argv[5]]]:[[scene,process.argv[3]]];
for(const [sc,OUT] of sorties){
  if(!OUT)continue;
  const {b,p,errs}=await ouvrirMaquette(SP);
  await p.evaluate(sc);
  const q=await p.evaluate(()=>JSON.parse(JSON.stringify(contratPlan())));
  writeFileSync(OUT,JSON.stringify(q,null,1));
  console.log(OUT,"· contrat",q.contrat,"·",q.workflow,"· niveaux",q.detailNiveaux.length,"· aire",q.area,"· pageerrors:",errs.length?errs:"aucune");
  await b.close();
}
