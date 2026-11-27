/**
 * Banc d'essai (lib/estimateur/banc-essai.ts) : les écrans chiffrés se rendent d'un seul coup, comme avant le
 * 27/11/2026, et l'estimation rapide se calcule sur place avec les fonctions de la route serveur.
 */
import { BANC } from "@/lib/estimateur/banc-essai";
import { calculRapideNeuf, calculRapideReno, entreeRapideSchema } from "@/lib/estimateur/rapide-serveur";

BANC.renduServeurComplet = true;
BANC.calculRapide = (entree, droits) => {
  const e = entreeRapideSchema.parse(JSON.parse(JSON.stringify(entree)));
  return e.nature === "reno" ? calculRapideReno(e, droits) : calculRapideNeuf(e, droits);
};
