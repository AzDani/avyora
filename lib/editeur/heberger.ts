import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { dict } from "@/lib/i18n/dictionaries";

/**
 * L'éditeur de plan servi par le site sur `/plan` (chantier C4).
 *
 * La source reste `maquettes/plan-editor.html`, la même que l'artefact et que la batterie : rien n'y est
 * réécrit. Au BUILD (la route est `force-static`), ce module la lit et lui applique des remplacements
 * EXACTS et COMPTÉS : si un motif n'apparaît pas exactement le nombre de fois attendu, il lève une erreur
 * et le build échoue (une source qui a bougé ne doit jamais partir à moitié transformée).
 *
 * La page servie ne contient AUCUNE donnée utilisateur : une config constante (Pro à `false`, prix Pro tiré
 * du dictionnaire, adresses relatives, pont de mesure), puis un amorçage qui va chercher la session et le
 * plan par `fetch`, pose `window.AVYORA_SITE` et exécute enfin le script de l'éditeur, différé
 * (`type="text/plain"`) pour que son démarrage synchrone voie déjà le mode site (D76).
 */

export const SOURCE_EDITEUR = path.join("maquettes", "plan-editor.html");

/** Three.js 0.147.0, copié de l'archive npm officielle dans `public/vendor` (licence MIT jointe). */
export const VENDOR_THREE = "/vendor/three@0.147.0/";
/** Geist et Geist Mono (paquet npm `geist`, licence OFL jointe), en polices variables : toutes les graisses. */
export const POLICES = {
  sans: "/fonts/geist/Geist-Variable.woff2",
  mono: "/fonts/geist/GeistMono-Variable.woff2",
} as const;

/** Les adresses que l'éditeur suit, toutes relatives (la préversion reste sur sa propre origine). */
export const URLS_EDITEUR = {
  accueil: "/logiciel-plan-maison",
  editeur: "/plan",
  api: "/api/plans",
  inscription: "/inscription?next=%2Fplan",
  tarifs: "/tarifs?source=editeur-plan",
} as const;

/** La liste FERMÉE des événements que l'éditeur peut émettre (D48, D75) : tout autre nom est ignoré. */
export const EVENEMENTS_EDITEUR = [
  "plan_ouvert",
  "premiere_piece",
  "premiere_decision",
  "estimer_ouvert",
  "vue_3d",
  "clic_passer_pro",
  "clic_chiffrer_construction",
  "visite_terminee",
  "visite_passee",
] as const;

const IMPORT_POLICES =
  "@import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=Geist+Mono:wght@500;600;700&display=swap');";

/** Une valeur JS sûre dans un `<script>` : JSON, et aucun `<` (donc ni `</script`, ni `<!--`). */
export function jsSur(v: unknown): string {
  return JSON.stringify(v).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

/** La phrase du prix, comme l'éditeur l'écrit lui-même (« dès … par mois, sans engagement »), prix du dictionnaire. */
export function prixProEditeur(): string {
  return `dès ${dict("fr").tarifs.plans.mensuel.prix} par mois, sans engagement`;
}

const FONT_FACES = [
  `@font-face{font-family:'Geist';src:url('${POLICES.sans}') format('woff2');font-weight:100 900;font-style:normal;font-display:swap}`,
  `@font-face{font-family:'Geist Mono';src:url('${POLICES.mono}') format('woff2');font-weight:100 900;font-style:normal;font-display:swap}`,
].join("\n");

/** Le voile, dans le HTML : il couvre l'éditeur (dont les boutons n'ont pas encore leurs fonctions) dès l'affichage. */
const VOILE =
  `<div id="avyora-voile" role="status" aria-live="polite" style="position:fixed;inset:0;z-index:2147483647;` +
  `display:flex;align-items:center;justify-content:center;background:var(--canvas,#f6f7fb);color:var(--nuit,#1E1B4B);` +
  `font:500 15px Geist,system-ui,sans-serif">Ouverture de ton plan…</div>`;

/** Les phrases de l'amorçage (l'intérieur de l'éditeur reste en français). */
const TXT_AMORCE = {
  panne: "La connexion à ton compte n'a pas abouti : ton plan reste sur cet appareil. Recharge la page pour réessayer.",
  connexion: "Connecte-toi pour ouvrir ce plan : il est rangé dans ton compte.",
};

function configConstante(): string {
  return [
    "window.AVYORA_PRO=false;",
    `window.AVYORA_PRIX_PRO=${jsSur(prixProEditeur())};`,
    `window.AVYORA_URLS=${jsSur(URLS_EDITEUR)};`,
    /* la file d'attente de Vercel Analytics, comme @vercel/analytics la pose (initQueue) */
    "window.va=window.va||function(){(window.vaq=window.vaq||[]).push([].slice.call(arguments));};",
    `window.AVYORA_TRACK=(function(){var E=${jsSur(EVENEMENTS_EDITEUR)};`,
    "return function(n,d){if(E.indexOf(n)<0)return;var o={};",
    "if(d&&typeof d==='object')for(var k in d){if(!Object.prototype.hasOwnProperty.call(d,k))continue;",
    "var v=d[k];if(v===null||typeof v==='string'||typeof v==='number'||typeof v==='boolean')o[k]=v;}",
    "try{window.va('event',{name:n,data:o});}catch(e){}};})();",
  ].join("\n");
}

/** L'amorçage : lignes courtes, commentaires en bloc seulement (jamais de double barre oblique). */
function amorcage(): string {
  return `(function(){
var fait=false;
var T=${jsSur(TXT_AMORCE)};
var U=window.AVYORA_URLS;
var q=null;
try{q=new URLSearchParams(location.search);}catch(e){}
var id=q?q.get('id'):null;
if(!id||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))id=null;
var type=q?q.get('type'):null;
if(type!=='final'&&type!=='renovation')type=null;
var ctl=typeof AbortController==='function'?new AbortController():null;
function lire(chemin){
  var o={credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}};
  if(ctl)o.signal=ctl.signal;
  return fetch(chemin,o).then(function(r){
    return r.text().then(function(t){var j=null;try{j=t?JSON.parse(t):null;}catch(e){}return {s:r.status,j:j};});
  });
}
function site(connecte,limite,plans,plan){
  return {v:1,connecte:connecte,limite:limite,plans:plans,plan:plan,type:type,urls:U,lang:'fr',dev:false};
}
/* une seule fois : le premier qui arrive (réponses ou délai) démarre l'éditeur */
function demarrer(s,pro,message){
  if(fait)return;
  fait=true;
  clearTimeout(minuterie);
  if(ctl){try{ctl.abort();}catch(e){}}
  window.AVYORA_PRO=!!pro;
  window.AVYORA_SITE=s;
  var src=document.getElementById('avyora-editeur');
  var el=document.createElement('script');
  el.textContent=src?src.textContent:'';
  document.body.appendChild(el);
  var v=document.getElementById('avyora-voile');
  if(v&&v.parentNode)v.parentNode.removeChild(v);
  if(message&&typeof window.toast==='function'){try{window.toast(message);}catch(e){}}
}
function local(message){demarrer(site(false,1,[],null),false,message);}
var minuterie=setTimeout(function(){local(T.panne);},6000);
lire(U.api+'/session').then(function(r){
  var S=r.j;
  if(r.s!==200||!S||typeof S!=='object')throw new Error('session');
  if(S.connecte!==true){local(id?T.connexion:null);return;}
  var P=id?lire(U.api+'/'+encodeURIComponent(id)):Promise.resolve(null);
  return Promise.all([lire(U.api),P]).then(function(x){
    var L=x[0],R=x[1],plan=null;
    if(L.s!==200||!L.j||!Array.isArray(L.j.plans))throw new Error('liste');
    if(R&&R.s===200&&R.j&&R.j.id===id)plan=R.j;
    else if(R&&R.s!==404)throw new Error('plan');
    var lim=L.j.limite===null?null:1;
    demarrer(site(true,lim,L.j.plans,plan),S.pro===true,null);
  });
}).catch(function(){local(T.panne);});
})();`;
}

/** Vercel Analytics : seulement sur un déploiement Vercel (production et préversion), jamais en local. */
function scriptAnalytics(): string {
  return process.env.VERCEL === "1" ? '<script defer src="/_vercel/insights/script.js"></script>\n' : "";
}

type Motif = { quoi: string; motif: string; nombre: number; par: string };

export function motifs(): Motif[] {
  return [
    { quoi: "@import Google Fonts", motif: IMPORT_POLICES, nombre: 1, par: FONT_FACES },
    { quoi: "Three.js (jsDelivr)", motif: "https://cdn.jsdelivr.net/npm/three@0.147.0/", nombre: 1, par: VENDOR_THREE },
    { quoi: "adresses absolues du site", motif: "https://getavyora.fr/", nombre: 3, par: "/" },
    { quoi: "meta viewport", motif: '<meta name="viewport"', nombre: 1, par: '<meta name="robots" content="noindex">\n<meta name="viewport"' },
    {
      quoi: "script principal",
      motif: "\n<script>\n",
      nombre: 1,
      par:
        `\n${VOILE}\n<script>\n${configConstante()}\n</script>\n<script>\n${amorcage()}\n</script>\n` +
        `${scriptAnalytics()}<script type="text/plain" id="avyora-editeur">\n`,
    },
  ];
}

/** Compte les occurrences exactes (sans chevauchement). */
export function compter(s: string, m: string): number {
  let n = 0;
  for (let i = s.indexOf(m); i >= 0; i = s.indexOf(m, i + m.length)) n++;
  return n;
}

/** La transformation pure : compte TOUS les motifs sur la source d'origine, puis remplace. */
export function transformerEditeur(source: string): string {
  const M = motifs();
  for (const m of M) {
    const n = compter(source, m.motif);
    if (n !== m.nombre) {
      throw new Error(`Éditeur hébergé : motif « ${m.quoi} » trouvé ${n} fois au lieu de ${m.nombre} (${SOURCE_EDITEUR}).`);
    }
  }
  let out = source;
  for (const m of M) out = out.split(m.motif).join(m.par);
  return out;
}

/** Le HTML servi sur /plan, lu et transformé au build. */
export async function editeurHeberge(): Promise<string> {
  const source = await readFile(path.join(process.cwd(), SOURCE_EDITEUR), "utf8");
  return transformerEditeur(source);
}
