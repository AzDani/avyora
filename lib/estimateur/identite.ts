/**
 * D16 — l'identité stable d'un poste du catalogue.
 *
 * Jusqu'ici, un poste était désigné par sa phrase française : `sel` et les statuts de chantier
 * enregistrés chez les utilisateurs, les préréglages, les quantités automatiques, la traduction
 * anglaise et bientôt la correspondance avec le plan, tous indexés sur « Porte intérieure
 * battante ». Renommer ce poste orphelinait les cinq d'un coup, en silence.
 *
 * Chaque poste porte donc un `id` — écrit une fois, jamais modifié. Le libellé redevient ce
 * qu'il aurait toujours dû être : un affichage, qu'on peut réécrire.
 *
 * DEUX RÈGLES, et le reste suit.
 *
 * 1. **Un `id` ne change jamais.** Même si le libellé qui l'a engendré n'existe plus. Un id qui
 *    dit « abattre-un-mur-non-porteur » alors que le poste s'appelle désormais « Déposer une
 *    cloison lourde » est parfaitement valide : il est bizarre à lire, il n'est pas faux.
 *    `tests/estimateur-identite.test.ts` fige la liste des 208 : la modifier fait échouer le
 *    build, ce qui est exactement le but.
 *
 * 2. **Renommer un poste, c'est ajouter une ligne dans `ALIAS`.** L'ancien nom continue d'y
 *    résoudre vers le même id, donc les projets déjà enregistrés continuent de se relire — sans
 *    migration de base, sans script, sans fenêtre de bascule. C'est la même mécanique que le
 *    repli des statuts de chantier, qui tourne déjà en production.
 */
import { CATALOG } from "./catalog";
import { key, type Tache } from "./core";

export interface PosteIdentifie { id: string; lot: string; nom: string; tache: Tache }

const PAR_ID = new Map<string, PosteIdentifie>();
const PAR_NOM = new Map<string, PosteIdentifie>();
for (const lot of CATALOG) {
  for (const t of lot.t) {
    const p: PosteIdentifie = { id: t.id, lot: lot.c, nom: t.n, tache: t };
    PAR_ID.set(t.id, p);
    PAR_NOM.set(key(lot.c, t.n), p);
  }
}

/**
 * Anciens libellés → identifiant, pour relire ce qui a été enregistré avant un renommage.
 * Clé : `key(lot, ancien nom)`. À remplir AU MOMENT du renommage, jamais après coup.
 * Vide aujourd'hui : aucun poste n'a encore été renommé depuis l'introduction des identifiants.
 */
export const ALIAS: Record<string, string> = {};

/** Le poste désigné par cet identifiant, ou null s'il n'existe pas (ou plus). */
export function posteParId(id: string): PosteIdentifie | null {
  return PAR_ID.get(id) ?? null;
}

/** L'identifiant d'un poste depuis son lot et son libellé — actuel ou ancien. */
export function idDuPoste(lot: string, nom: string): string | null {
  const k = key(lot, nom);
  const direct = PAR_NOM.get(k);
  if (direct) return direct.id;
  const alias = ALIAS[k];
  return alias && PAR_ID.has(alias) ? alias : null;
}

/** Le poste désigné par un lot et un libellé — actuel ou ancien. */
export function posteParNom(lot: string, nom: string): PosteIdentifie | null {
  const id = idDuPoste(lot, nom);
  return id ? posteParId(id) : null;
}

/** Tous les postes du catalogue, dans l'ordre du catalogue. */
export function tousLesPostes(): PosteIdentifie[] {
  return [...PAR_ID.values()];
}

/**
 * Les libellés que le MOTEUR cite en dur (préréglages, quantités automatiques, finitions
 * dérivées) et qui ne correspondent à aucun poste du catalogue. Doit toujours renvoyer une liste
 * vide : une entrée ici est un poste qui ne sera jamais coché, ou jamais quantifié, sans que rien
 * ne le signale. C'est ce que le test de garde vérifie à chaque build.
 */
export function libellesOrphelins(libelles: Array<{ lot: string; nom: string; ou: string }>): string[] {
  return libelles.filter((l) => !posteParNom(l.lot, l.nom)).map((l) => `${l.ou} : « ${l.nom} » (lot ${l.lot})`);
}

/**
 * Relit une donnée enregistrée indexée par `key(lot, nom)` — une sélection de postes, des
 * statuts de chantier — en ramenant sur le libellé ACTUEL les clés écrites sous un ancien.
 *
 * Tant qu'aucun poste n'a été renommé, `ALIAS` est vide et la fonction renvoie l'objet reçu sans
 * rien allouer : c'est ce qui permet de la poser dès maintenant sur tous les chemins de lecture,
 * pour que le jour du premier renommage il n'y ait rien à déployer.
 *
 * Si les deux clés coexistent (l'utilisateur a rouvert son projet après le renommage et modifié
 * la ligne), la clé actuelle gagne : c'est la plus récente.
 */
export function normaliserCles<T>(donnees: Record<string, T> | undefined | null): Record<string, T> {
  if (!donnees) return {};
  if (Object.keys(ALIAS).length === 0) return donnees;
  const out: Record<string, T> = {};
  for (const [k, v] of Object.entries(donnees)) {
    const id = ALIAS[k];
    const cible = id ? PAR_ID.get(id) : null;
    out[cible && !(key(cible.lot, cible.nom) in donnees) ? key(cible.lot, cible.nom) : k] = v;
  }
  return out;
}
