import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { secretEmpreinte } from "@/lib/empreinte";
import { DELAI_MIN_MS, JETON_MAX_MS } from "./constantes";

/**
 * Jeton du formulaire d'accompagnement : l'heure d'affichage du formulaire, SIGNÉE par le serveur (HMAC avec le secret
 * de lib/empreinte.ts). Il sert au délai minimal de remplissage sans clé externe ni CAPTCHA : un robot ne peut pas
 * fabriquer une heure ancienne, il doit charger la page puis attendre. L'heure vient du serveur (la page est rendue à
 * la requête), pas de l'horloge du navigateur, qui peut être décalée. Sans JavaScript, le jeton est déjà dans le HTML :
 * le formulaire marche quand même.
 */
const signer = (ts: string) => createHmac("sha256", `accompagnement:${secretEmpreinte()}`).update(ts).digest("hex").slice(0, 32);

export function creerJeton(maintenant = Date.now()): string {
  const ts = String(maintenant);
  return `${ts}.${signer(ts)}`;
}

export type VerifJeton = "ok" | "invalide" | "trop_rapide" | "expire";

export function verifierJeton(jeton: unknown, maintenant = Date.now()): VerifJeton {
  if (typeof jeton !== "string" || jeton.length > 80) return "invalide";
  const [ts, sig] = jeton.split(".");
  if (!ts || !sig || !/^\d{10,16}$/.test(ts)) return "invalide";
  const attendu = Buffer.from(signer(ts));
  const recu = Buffer.from(sig);
  if (attendu.length !== recu.length || !timingSafeEqual(attendu, recu)) return "invalide";
  const age = maintenant - Number(ts);
  if (age < DELAI_MIN_MS) return "trop_rapide";
  if (age > JETON_MAX_MS) return "expire";
  return "ok";
}
