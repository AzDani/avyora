import "server-only";
import { createHmac, randomBytes } from "node:crypto";

/**
 * L'empreinte d'une adresse e-mail : un HMAC-SHA-256 avec un secret du SERVEUR, tronqué à 32 caractères hexadécimaux.
 * Elle sert à compter une adresse (clés de limite, Upstash ou mémoire), à la reconnaître dans le cookie `av-demande`
 * et à la tracer dans le journal de sécurité, sans jamais l'écrire en clair. Contrairement à un SHA-256 sans sel, on ne
 * la retrouve pas par dictionnaire sans le secret.
 *
 * Le secret est dérivé de `SUPABASE_SERVICE_ROLE_KEY` (déjà présente là où le journal écrit : serveur seulement, jamais
 * dans le navigateur). Changer cette clé change les empreintes : les compteurs de limite repartent de zéro et les
 * cookies `av-demande` en cours ne sont plus reconnus (une arrivée « à vérifier » de plus, rien de grave).
 *
 * Repli sûr, sans elle : en production, un secret ALÉATOIRE tiré au démarrage de l'instance (jamais une valeur connue,
 * qui rendrait l'empreinte aussi devinable qu'un SHA-256 sans sel) ; prix à payer, chaque instance a ses empreintes
 * (limites comptées par instance, un lien ouvert sur une autre instance passe par « C'est bien ton compte ? »). Hors
 * production (poste local, tests), une clé de développement fixe, pour des empreintes reproductibles.
 */
const ALEA_INSTANCE = randomBytes(32).toString("hex");

export function secretEmpreinte(): string {
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (cle) return `avyora-empreinte:${cle}`;
  return process.env.NODE_ENV === "production" ? `avyora-empreinte:instance:${ALEA_INSTANCE}` : "avyora-empreinte:developpement";
}

/** L'empreinte d'une adresse (nettoyée : sans espaces autour, en minuscules). */
export function empreinteAdresse(email: string): string {
  return createHmac("sha256", secretEmpreinte()).update(email.trim().toLowerCase()).digest("hex").slice(0, 32);
}
