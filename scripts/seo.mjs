#!/usr/bin/env node
/**
 * L'Agent SEO (28/11/2026) : le script du Mac de Daniel, lancé chaque matin par la tâche planifiée « seo-matin ».
 *
 *   node scripts/seo.mjs etat                      ce qui est branché (clé Search Console, dernières dates)
 *   node scripts/seo.mjs collecter                 Search Console → relevé « gsc » du jour (jours, requêtes × pages)
 *   node scripts/seo.mjs sante [base]              fouille les pages du sitemap (défaut https://getavyora.fr) → relevé « sante »
 *   node scripts/seo.mjs opportunites              classement + points d'amélioration du dernier relevé (JSON, pour l'agent)
 *   node scripts/seo.mjs rapport <fichier.json>    range le rapport de l'agent : { "resume": "…", "points": [{ titre, detail, gain, page? }] }
 *
 * Search Console est lue en LECTURE SEULE par un compte de service Google (« le robot ») : sa clé JSON reste sur ce Mac,
 * dans ~/.avyora/gsc-robot.json (ou le chemin de GSC_CLE_FICHIER dans .env.local), jamais dans le dépôt ni sur Vercel.
 * Mode d'emploi pour la brancher : avyora-marketing/seo/BRANCHER-SEARCH-CONSOLE.md.
 * Les règles (opportunités, santé) sont celles du site : lib/seo/regles.mjs, une seule copie.
 */
import { readFileSync, existsSync } from "node:fs";
import { createSign } from "node:crypto";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { bilanSante, opportunites, periodes, urlsDuSitemap } from "../lib/seo/regles.mjs";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");
const RELEVES = "admin_seo_releves", RAPPORTS = "admin_seo_rapports";
const PROPRIETES = ["sc-domain:getavyora.fr", "https://getavyora.fr/"];
/** Search Console publie ses chiffres avec ~2 jours de retard : la période s'arrête avant-hier. */
export const RETARD_JOURS = 2;
const LIGNES_MAX = 2000;

const jour = (d) => d.toISOString().slice(0, 10);
const moins = (d, n) => new Date(d.getTime() - n * 864e5);

/** Les fenêtres de lecture : 90 jours pour la courbe, les 28 derniers jours et les 28 d'avant pour les requêtes. */
export function fenetres(maintenant) {
  const fin = moins(maintenant, RETARD_JOURS);
  return {
    jours: { debut: jour(moins(fin, 89)), fin: jour(fin) },
    actuelle: { debut: jour(moins(fin, 27)), fin: jour(fin) },
    avant: { debut: jour(moins(fin, 55)), fin: jour(moins(fin, 28)) },
  };
}

/** Une ligne de l'API Search Console (dimensions requête, page) → { requete, page (chemin seul), clics, impressions, ctr, position }. */
export function ligneGsc(r) {
  let page = r.keys[1] ?? "";
  try { const u = new URL(page); page = u.pathname + u.search; } catch { /* déjà un chemin */ }
  return { requete: String(r.keys[0] ?? ""), page, clics: r.clicks ?? 0, impressions: r.impressions ?? 0, ctr: r.ctr ?? 0, position: Math.round((r.position ?? 0) * 10) / 10 };
}
/** Une ligne de l'API (dimension date) → { date, clics, impressions, ctr, position }. */
export const jourGsc = (r) => ({ date: r.keys[0], clics: r.clicks ?? 0, impressions: r.impressions ?? 0, ctr: r.ctr ?? 0, position: Math.round((r.position ?? 0) * 10) / 10 });

function lireEnv() {
  const env = {};
  const f = join(RACINE, ".env.local");
  if (!existsSync(f)) return env;
  for (const l of readFileSync(f, "utf8").split("\n")) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}
const ENV = lireEnv();
const fichierCle = () => ENV.GSC_CLE_FICHIER || join(homedir(), ".avyora", "gsc-robot.json");

async function client() {
  const { createClient } = await import("@supabase/supabase-js");
  if (!ENV.NEXT_PUBLIC_SUPABASE_URL || !ENV.SUPABASE_SERVICE_ROLE_KEY) throw new Error("NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY absent de .env.local.");
  return createClient(ENV.NEXT_PUBLIC_SUPABASE_URL, ENV.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

/* ── Search Console : un jeton d'accès en lecture seule, signé avec la clé du compte de service (JWT RS256) ── */
const b64url = (x) => Buffer.from(x).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
async function jeton() {
  const f = fichierCle();
  if (!existsSync(f)) throw new Error(`Clé Search Console absente (${f}) : voir avyora-marketing/seo/BRANCHER-SEARCH-CONSOLE.md.`);
  const cle = JSON.parse(readFileSync(f, "utf8"));
  const maintenant = Math.floor(Date.now() / 1000);
  const corps = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" })) + "." + b64url(JSON.stringify({
    iss: cle.client_email, scope: "https://www.googleapis.com/auth/webmasters.readonly", aud: cle.token_uri || "https://oauth2.googleapis.com/token", iat: maintenant, exp: maintenant + 3600,
  }));
  const signature = createSign("RSA-SHA256").update(corps).sign(cle.private_key).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  const r = await fetch(cle.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: corps + "." + signature }),
  });
  const d = await r.json();
  if (!r.ok || !d.access_token) throw new Error(`Google refuse le robot : ${d.error_description || d.error || r.status}`);
  return { acces: d.access_token, robot: cle.client_email };
}
async function requete(acces, propriete, corps) {
  const r = await fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(propriete)}/searchAnalytics/query`, {
    method: "POST", headers: { Authorization: `Bearer ${acces}`, "Content-Type": "application/json" }, body: JSON.stringify(corps),
  });
  const d = await r.json();
  if (!r.ok) { const e = new Error(d.error?.message || String(r.status)); e.statut = r.status; throw e; }
  return d.rows ?? [];
}

async function collecter(maintenant) {
  const { acces, robot } = await jeton();
  const f = fenetres(maintenant);
  let propriete = null, jours = null, derniereErreur = null;
  for (const p of PROPRIETES) {
    try { jours = await requete(acces, p, { startDate: f.jours.debut, endDate: f.jours.fin, dimensions: ["date"], rowLimit: 500 }); propriete = p; break; }
    catch (e) { derniereErreur = e; }
  }
  if (!propriete) throw new Error(`Aucune propriété Search Console lisible (${PROPRIETES.join(", ")}) : ajoute ${robot} comme utilisateur dans Search Console. (${derniereErreur?.message})`);
  const lignes = async (w) => (await requete(acces, propriete, { startDate: w.debut, endDate: w.fin, dimensions: ["query", "page"], rowLimit: 5000 }))
    .map(ligneGsc).sort((a, b) => b.impressions - a.impressions).slice(0, LIGNES_MAX);
  const donnees = { propriete, fenetres: f, jours: jours.map(jourGsc), lignes: await lignes(f.actuelle), avant: await lignes(f.avant) };
  const sb = await client();
  const { error } = await sb.from(RELEVES).upsert({ jour: jour(maintenant), sorte: "gsc", donnees }, { onConflict: "jour,sorte" });
  if (error) throw new Error(error.message);
  return { propriete, jours: donnees.jours.length, lignes: donnees.lignes.length, avant: donnees.avant.length, periodes: periodes(donnees.jours) };
}

async function sante(maintenant, base = "https://getavyora.fr") {
  const s = await fetch(new URL("/sitemap.xml", base), { headers: { "user-agent": "AVYORA-Agent-SEO" } });
  if (!s.ok) throw new Error(`sitemap illisible (${s.status})`);
  const urls = urlsDuSitemap(await s.text());
  const resultats = [];
  let i = 0;
  const ouvrier = async () => {
    while (i < urls.length) {
      const url = urls[i++];
      try {
        const r = await fetch(url, { redirect: "manual", headers: { "user-agent": "AVYORA-Agent-SEO" } });
        resultats.push({ url, statut: r.status, enTetes: { "x-robots-tag": r.headers.get("x-robots-tag") ?? undefined, location: r.headers.get("location") ?? undefined }, html: r.status < 300 ? await r.text() : "" });
      } catch { resultats.push({ url, statut: 0, enTetes: {}, html: "" }); }
    }
  };
  await Promise.all(Array.from({ length: 6 }, ouvrier));
  const bilan = bilanSante(resultats);
  bilan.pages = bilan.pages.slice(0, 200);
  const sb = await client();
  const { error } = await sb.from(RELEVES).upsert({ jour: jour(maintenant), sorte: "sante", donnees: { base, ...bilan } }, { onConflict: "jour,sorte" });
  if (error) throw new Error(error.message);
  return { verifiees: bilan.verifiees, graves: bilan.graves, finitions: bilan.finitions, parCode: bilan.parCode, exemples: bilan.pages.slice(0, 10) };
}

async function dernier(sb, sorte) {
  const { data, error } = await sb.from(RELEVES).select("jour, donnees").eq("sorte", sorte).order("jour", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

const sortir = (o) => console.log(JSON.stringify(o, null, 2));

async function principal(args) {
  const [cmd, ...reste] = args;
  const maintenant = new Date();
  if (cmd === "etat") {
    const sb = await client();
    const g = await dernier(sb, "gsc"), h = await dernier(sb, "sante");
    const { data: r } = await sb.from(RAPPORTS).select("jour").order("jour", { ascending: false }).limit(1).maybeSingle();
    return sortir({ cle: existsSync(fichierCle()) ? "présente" : `absente (${fichierCle()})`, dernier_gsc: g?.jour ?? null, derniere_sante: h?.jour ?? null, dernier_rapport: r?.jour ?? null });
  }
  if (cmd === "collecter") return sortir(await collecter(maintenant));
  if (cmd === "sante") return sortir(await sante(maintenant, reste[0]));
  if (cmd === "opportunites") {
    const sb = await client();
    const g = await dernier(sb, "gsc"), h = await dernier(sb, "sante");
    if (!g) throw new Error("Aucun relevé Search Console : lancer `collecter` d'abord.");
    const o = opportunites(g.donnees.lignes, g.donnees.avant);
    const haut = (xs) => xs.slice(0, 15);
    return sortir({
      releve: g.jour, propriete: g.donnees.propriete, periodes: periodes(g.donnees.jours),
      meilleures_requetes: haut([...g.donnees.lignes].sort((a, b) => b.clics - a.clics || b.impressions - a.impressions)),
      page2: haut(o.page2), ctr_faible: haut(o.ctrFaible), cannibales: haut(o.cannibales), reculs: haut(o.reculs),
      sante: h ? { jour: h.jour, verifiees: h.donnees.verifiees, graves: h.donnees.graves, finitions: h.donnees.finitions, parCode: h.donnees.parCode, pages: h.donnees.pages.slice(0, 20) } : null,
    });
  }
  if (cmd === "rapport") {
    if (!reste[0]) throw new Error("Usage : node scripts/seo.mjs rapport <fichier.json>");
    const r = JSON.parse(readFileSync(reste[0], "utf8"));
    const resume = String(r.resume ?? "").trim().slice(0, 4000);
    if (!resume) throw new Error("Le rapport n'a pas de résumé.");
    const points = (Array.isArray(r.points) ? r.points : []).slice(0, 40).map((p) => ({
      titre: String(p.titre ?? "").slice(0, 200), detail: String(p.detail ?? "").slice(0, 1500), gain: String(p.gain ?? "").slice(0, 120), ...(p.page ? { page: String(p.page).slice(0, 300) } : {}),
    })).filter((p) => p.titre);
    const sb = await client();
    const { error } = await sb.from(RAPPORTS).insert({ jour: jour(maintenant), resume, points });
    if (error) throw new Error(error.message);
    return sortir({ range: true, points: points.length });
  }
  throw new Error("Sous-commandes : etat · collecter · sante [base] · opportunites · rapport <fichier.json>");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  principal(process.argv.slice(2)).catch((e) => { console.error(e.message); process.exit(1); });
}
