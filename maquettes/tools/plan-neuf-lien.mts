/**
 * D75 · Le lien « Chiffrer cette maison » relu par le SITE (appelé par planfinal.mjs, pas lancé seul).
 *
 * Reçoit ce que l'éditeur a produit pour un plan (fichier JSON : le fragment `#plan=` de son lien et le contrat
 * entier de la même page), et le passe dans le vrai code du site, `lib/estimateur/plan-neuf.ts` :
 *   - le fragment se décode (`decoderFragmentPlan`) et passe `planNeufSchema` ;
 *   - l'extrait de l'éditeur est exactement celui de la référence (`extraitPlanNeuf` du contrat entier) ;
 *   - `lirePlanNeuf` (le chemin de la page) en tire la même maison que la fixture du plan type
 *     (`tests/fixtures/plan-final-contrat.json`, produite par fixture-contrat.mjs --final) ;
 *   - ni nom, ni note, ni annotation, ni produit dans ce qui voyage.
 *
 *   npx tsx maquettes/tools/plan-neuf-lien.mts <fichier.json>     → une ligne JSON sur la sortie
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decoderFragmentPlan, extraitPlanNeuf, lirePlanNeuf, maisonDepuisPlan, planNeufSchema } from "../../lib/estimateur/plan-neuf";

const ICI = path.dirname(fileURLToPath(import.meta.url));
const entree = JSON.parse(readFileSync(process.argv[2], "utf8")) as { fragment: string; contrat: Record<string, unknown>; secrets: string[] };
const fixture = JSON.parse(readFileSync(path.join(ICI, "../../tests/fixtures/plan-final-contrat.json"), "utf8"));

const brut = decoderFragmentPlan(entree.fragment);
const ok = planNeufSchema.safeParse(brut);
const texte = JSON.stringify(brut);
const lu = lirePlanNeuf(entree.fragment);
const attendu = maisonDepuisPlan(planNeufSchema.parse(extraitPlanNeuf(fixture)));
const maison = (r: typeof lu) => ("maison" in r && r.maison ? r.maison : r);

console.log(JSON.stringify({
  decode: brut !== null,
  schema: ok.success,
  erreurs: ok.success ? [] : ok.error.issues.slice(0, 3).map((i) => i.path.join(".") + " " + i.message),
  identiqueAuReferent: JSON.stringify(brut) === JSON.stringify(extraitPlanNeuf(entree.contrat)),
  memeMaisonQueLaFixture: JSON.stringify(maison(lu)) === JSON.stringify(maison(attendu)) && !("refus" in lu && lu.refus),
  maison: maison(lu),
  fixture: maison(attendu),
  clesPrivees: /"(nom|note|notes|annotations|produits|produit|name)"/.test(texte),
  secrets: entree.secrets.filter((s) => texte.includes(s)),
}));
