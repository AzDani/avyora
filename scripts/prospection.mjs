/**
 * L'Agent Prospection (28/11/2026) : la base des prospects, lue et écrite depuis le Mac de Daniel.
 *
 * Les e-mails de prospection partent de contact@getavyora.fr par une tâche Claude Code sur le Mac, JAMAIS par le site.
 * Cette tâche se sert de ce script pour savoir à qui elle a déjà écrit, qui a dit STOP, qui relancer, et pour noter
 * chaque envoi. Table admin_prospects (migration 0019), clé service_role lue dans .env.local et jamais affichée.
 *
 *   node scripts/prospection.mjs importer <fichier.json>   ajoute les NOUVEAUX prospects (un e-mail connu n'est jamais écrasé)
 *   node scripts/prospection.mjs connus                    [{ email, statut }] de tous les prospects (doublons, STOP)
 *   node scripts/prospection.mjs marquer <email> <statut> [note]
 *   node scripts/prospection.mjs a-relancer                envoyés sans réponse depuis au moins 5 jours ouvrés
 *   node scripts/prospection.mjs stats                     comptes par statut, par cible, envois du jour et de la semaine
 *
 * Les sorties sont du JSON sur stdout. « stop » = la personne a répondu STOP : on ne lui écrit PLUS JAMAIS (obligation
 * légale) ; marquer refuse de la repasser en « envoye » ou « relance ».
 *
 * Les petites règles (statuts, transitions, e-mail, jours ouvrés) sont la copie de lib/prospection/statuts.ts : Node ne
 * peut pas importer ce fichier TypeScript. tests/prospection.test.ts vérifie que les deux copies restent identiques.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");
const TABLE = "admin_prospects";

export const STATUTS = ["a_envoyer", "envoye", "relance", "repondu", "interesse", "rdv", "inscrit", "refus", "stop", "erreur"];
export const CIBLES = ["artisan", "agence", "architecte", "societe"];
export const STATUTS_REPONSE = ["repondu", "interesse", "rdv", "inscrit", "refus", "stop"];
export const INTERDITS_APRES_STOP = ["a_envoyer", "envoye", "relance"];
export const RELANCE_JOURS_OUVRES = 5;

/** « Jean.Dupont@Exemple.FR  » → « jean.dupont@exemple.fr » ; null si ce n'est pas une adresse e-mail. */
export function normaliserEmail(brut) {
  if (typeof brut !== "string") return null;
  const e = brut.trim().toLowerCase();
  if (e.length > 254 || !/^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(e)) return null;
  return e;
}

/** Peut-on passer de `de` à `vers` ? Un statut inconnu est refusé ; après un STOP, plus rien qui mène à un envoi. */
export function transition(de, vers) {
  if (!STATUTS.includes(vers)) return { ok: false, raison: `Statut inconnu : ${String(vers)}` };
  if (!STATUTS.includes(de)) return { ok: false, raison: `Statut actuel inconnu : ${String(de)}` };
  if (de === "stop" && INTERDITS_APRES_STOP.includes(vers)) return { ok: false, raison: "Cette personne a répondu STOP : on ne lui écrit plus jamais." };
  return { ok: true };
}

/** Les dates à poser en passant à `statut`, seulement si elles sont encore vides. */
export function datesAPoser(statut, existant, maintenant) {
  const iso = maintenant.toISOString(), d = {};
  if (statut === "envoye" && !existant.envoye_le) d.envoye_le = iso;
  if (statut === "relance" && !existant.relance_le) d.relance_le = iso;
  if (STATUTS_REPONSE.includes(statut) && !existant.reponse_le) d.reponse_le = iso;
  return d;
}

const fmtJour = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" });
function jourParis(t) {
  const [y, m, d] = fmtJour.format(t).split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Combien de jours ouvrés (lundi à vendredi, heure de Paris) après le jour de `debut`, jusqu'au jour de `fin` compris. */
export function joursOuvres(debut, fin) {
  const a = jourParis(debut), b = jourParis(fin);
  let n = 0;
  for (let t = a + 864e5; t <= b; t += 864e5) {
    const j = new Date(t).getUTCDay();
    if (j !== 0 && j !== 6) n++;
  }
  return n;
}

/** Les prospects (lignes de la base) à relancer : envoyés, jamais relancés, depuis au moins 5 jours ouvrés. */
export function aRelancer(lignes, maintenant) {
  return lignes.filter((l) => l.statut === "envoye" && !l.relance_le && l.envoye_le && joursOuvres(new Date(l.envoye_le), maintenant) >= RELANCE_JOURS_OUVRES);
}

const LONGUEURS = { contact: 120, metier: 80, commune: 80, ville: 80, source: 120, objet: 250, lot: 20 };
const propre = (v) => (v == null ? "" : String(v).trim().replace(/\s+/g, " "));

/** Un objet du fichier d'import → { ligne } prête pour la base, ou { raison } s'il est refusé. */
export function validerProspect(o, maintenant = new Date()) {
  if (!o || typeof o !== "object") return { raison: "pas un objet" };
  const email = normaliserEmail(o.email);
  if (!email) return { raison: "adresse e-mail illisible" };
  const entreprise = propre(o.entreprise);
  if (!entreprise || entreprise.length > 200) return { raison: "nom d'entreprise manquant ou trop long (200 caractères)" };
  if (!CIBLES.includes(o.cible)) return { raison: `cible inconnue (${CIBLES.join(", ")})` };
  const ligne = { email, entreprise, cible: o.cible };
  for (const [k, max] of Object.entries(LONGUEURS)) {
    const v = propre(o[k]);
    if (v.length > max) return { raison: `${k} trop long (${max} caractères)` };
    if (v) ligne[k] = v;
  }
  if (o.siren != null && propre(o.siren) !== "") {
    const siren = String(o.siren).replace(/\s/g, "");
    if (!/^\d{9}$/.test(siren)) return { raison: "SIREN illisible (9 chiffres)" };
    ligne.siren = siren;
  }
  const statut = o.statut == null || o.statut === "" ? "a_envoyer" : o.statut;
  if (!STATUTS.includes(statut)) return { raison: `statut inconnu : ${String(statut)}` };
  ligne.statut = statut;
  if (o.envoye_le != null && o.envoye_le !== "") {
    if (Number.isNaN(Date.parse(o.envoye_le))) return { raison: "envoye_le illisible" };
    ligne.envoye_le = new Date(o.envoye_le).toISOString();
  }
  Object.assign(ligne, datesAPoser(statut, ligne, maintenant));
  return { ligne };
}

/** Le fichier d'import → les lignes valides (sans doublon dans le fichier) et les refusées. */
export function preparerImport(tableau, maintenant = new Date()) {
  if (!Array.isArray(tableau)) throw new Error("Le fichier doit contenir un tableau JSON de prospects.");
  const lignes = [], rejetes = [], vus = new Set();
  for (const o of tableau) {
    const r = validerProspect(o, maintenant);
    const email = normaliserEmail(o && o.email) ?? String((o && o.email) ?? "");
    if (r.raison) { rejetes.push({ email, raison: r.raison }); continue; }
    if (vus.has(r.ligne.email)) { rejetes.push({ email, raison: "en double dans le fichier" }); continue; }
    vus.add(r.ligne.email); lignes.push(r.ligne);
  }
  return { lignes, rejetes };
}

/** La semaine en cours commence le lundi (heure de Paris). */
function lundiParis(t) {
  const j = jourParis(t), jour = new Date(j).getUTCDay();
  return j - ((jour + 6) % 7) * 864e5;
}

/** Les comptes : par statut, par cible, premiers envois d'aujourd'hui et de cette semaine (heure de Paris). */
export function stats(lignes, maintenant) {
  const parStatut = Object.fromEntries(STATUTS.map((k) => [k, 0])), parCible = Object.fromEntries(CIBLES.map((k) => [k, 0]));
  const auj = jourParis(maintenant), lundi = lundiParis(maintenant);
  let aujourdhui = 0, semaine = 0;
  for (const l of lignes) {
    if (l.statut in parStatut) parStatut[l.statut]++;
    if (l.cible in parCible) parCible[l.cible]++;
    if (l.envoye_le) { const j = jourParis(new Date(l.envoye_le)); if (j === auj) aujourdhui++; if (j >= lundi && j <= auj) semaine++; }
  }
  return { total: lignes.length, par_statut: parStatut, par_cible: parCible, envoyes_aujourdhui: aujourdhui, envoyes_semaine: semaine, a_relancer: aRelancer(lignes, maintenant).length };
}

function lireEnv() {
  const env = {};
  for (const l of readFileSync(join(RACINE, ".env.local"), "utf8").split("\n")) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

async function client() {
  const { createClient } = await import("@supabase/supabase-js");
  const env = lireEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY absent de .env.local.");
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

/** Toutes les lignes (par pages de 1 000). */
async function tout(sb, colonnes, filtre = (q) => q) {
  const res = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await filtre(sb.from(TABLE).select(colonnes)).order("cree_le", { ascending: true }).range(de, de + 999);
    if (error) throw new Error(error.message);
    res.push(...data);
    if (data.length < 1000) return res;
  }
}

const sortir = (o) => console.log(JSON.stringify(o, null, 2));

async function principal(args) {
  const [cmd, ...reste] = args;
  const maintenant = new Date();
  if (cmd === "importer") {
    if (!reste[0]) throw new Error("Usage : node scripts/prospection.mjs importer <fichier.json>");
    const { lignes, rejetes } = preparerImport(JSON.parse(readFileSync(reste[0], "utf8")), maintenant);
    const sb = await client();
    let ajoutes = 0;
    for (let i = 0; i < lignes.length; i += 200) {
      // ignoreDuplicates : un e-mail déjà en base n'est JAMAIS modifié (ni son statut, ni ses dates).
      const { data, error } = await sb.from(TABLE).upsert(lignes.slice(i, i + 200), { onConflict: "email", ignoreDuplicates: true }).select("email");
      if (error) throw new Error(error.message);
      ajoutes += data.length;
    }
    return sortir({ ajoutes, deja_connus: lignes.length - ajoutes, rejetes });
  }
  if (cmd === "connus") return sortir(await tout(await client(), "email, statut"));
  if (cmd === "marquer") {
    const [brut, statut, ...note] = reste, email = normaliserEmail(brut);
    if (!email || !statut) throw new Error("Usage : node scripts/prospection.mjs marquer <email> <statut> [note]");
    if (!STATUTS.includes(statut)) throw new Error(`Statut inconnu : ${statut} (${STATUTS.join(", ")})`);
    const sb = await client();
    const { data, error } = await sb.from(TABLE).select("statut, envoye_le, relance_le, reponse_le").eq("email", email).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error(`Prospect inconnu : ${email}`);
    const t = transition(data.statut, statut);
    if (!t.ok) throw new Error(t.raison);
    const maj = { statut, maj_le: maintenant.toISOString(), ...datesAPoser(statut, data, maintenant) };
    const texte = note.join(" ").trim();
    if (texte) maj.note = texte.slice(0, 1000);
    const { error: e2 } = await sb.from(TABLE).update(maj).eq("email", email);
    if (e2) throw new Error(e2.message);
    return sortir({ email, avant: data.statut, statut, ...maj });
  }
  if (cmd === "a-relancer") {
    const lignes = await tout(await client(), "email, entreprise, contact, cible, metier, commune, ville, objet, lot, statut, envoye_le, relance_le", (q) => q.eq("statut", "envoye").is("relance_le", null));
    return sortir(aRelancer(lignes, maintenant));
  }
  if (cmd === "stats") return sortir(stats(await tout(await client(), "statut, cible, envoye_le, relance_le"), maintenant));
  throw new Error("Sous-commandes : importer <fichier.json> · connus · marquer <email> <statut> [note] · a-relancer · stats");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  principal(process.argv.slice(2)).catch((e) => {
    console.error(JSON.stringify({ erreur: e instanceof Error ? e.message : String(e) }));
    process.exit(1);
  });
}
