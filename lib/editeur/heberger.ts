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
 *
 * Bêta gratuite (lib/beta.ts) : la session dit si elle court (`betaEditeurPlan`) ; l'amorçage remplace alors la phrase
 * du prix de Pro (`AVYORA_PRIX_PRO`, que l'éditeur lit à son démarrage) et, dans le texte qu'il exécute, le libellé
 * « Passer Pro » (boutons, fenêtres, barre) par « Compte gratuit », « est réservé à Pro » par « demande un compte,
 * gratuit pendant la bêta » et « des plans enregistrés sans limite » par « jusqu’à 30 plans enregistrés » (le plafond
 * d'un inscrit pendant la bêta, `PLANS_MAX_BETA`). Aucun prix n'est donc cité pendant la bêta (la phrase du prix dit
 * « gratuit pendant la bêta… ») ; si la session ne répond pas (panne, délai), l'éditeur d'avant. Et « Compte gratuit » (barre, liens, boutons, `passerPro`) mène droit à l'inscription,
 * dans le même onglet, comme l'invitation « Garde ce plan dans ton compte » (`siteCreerCompte` : le plan est enregistré
 * sur l'appareil et marqué pour la reprise) au lieu de /tarifs dans un nouvel onglet. La source n'est pas touchée, ni
 * la page statique : hors bêta, l'éditeur d'avant au caractère près.
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

/**
 * La liste FERMÉE des événements que l'éditeur peut émettre (D48, D75, et C10 pour le compte) : tout autre nom
 * est ignoré.
 */
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
  /* C10 : un plan entre dans le compte (`source` : editeur | reclamation) ; la limite gratuite refuse un plan
     (`moment` : nouveau | reclamation). Seulement en mode site connecté. */
  "plan_enregistre_compte",
  "plan_limite_gratuit",
] as const;

/**
 * La liste FERMÉE des propriétés que le relais laisse passer (C10). Aucune ne porte de nom de plan, de code postal
 * ou de surface exacte (D48 § 10) : ce sont des codes, des booléens et des comptes. Toute autre clé est retirée, et
 * une chaîne qui n'est pas un code court (`PROPRIETE_CODE`) aussi. L'ordre est celui de l'envoi : les propriétés de
 * l'événement d'abord, `pro` et `telephone` (ajoutées à chaque appel par l'éditeur) en dernier.
 */
export const PROPRIETES_EDITEUR = [
  "origine",
  "source",
  "moment",
  "type",
  "modele",
  "suite",
  "premiereVisite",
  "exemple",
  "vide",
  "travaux",
  "detail",
  "repris",
  "accueil",
  "taches",
  "corpsEtat",
  "etape",
  "etapes",
  "pro",
  "telephone",
] as const;

/** Une valeur texte admise par le relais : un code (lettres, chiffres, `_`, `-`), 40 caractères au plus. */
export const PROPRIETE_CODE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/;

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

/**
 * Les phrases de l'amorçage (l'intérieur de l'éditeur reste en français). « Connecte-toi pour ouvrir ce plan »
 * est dit par l'éditeur lui-même (`compteAttendu`), avec son bouton « Me connecter ».
 */
const TXT_AMORCE = {
  panne: "La connexion à ton compte n'a pas abouti : ton plan reste sur cet appareil. Recharge la page pour réessayer.",
};

function configConstante(): string {
  return [
    "window.AVYORA_PRO=false;",
    `window.AVYORA_PRIX_PRO=${jsSur(prixProEditeur())};`,
    `window.AVYORA_URLS=${jsSur(URLS_EDITEUR)};`,
    /* la file d'attente de Vercel Analytics, comme @vercel/analytics la pose (initQueue) */
    "window.va=window.va||function(){(window.vaq=window.vaq||[]).push([].slice.call(arguments));};",
    /* le relais (C10) : un nom de la liste fermée, des clés de la liste fermée, des valeurs simples et courtes */
    `window.AVYORA_TRACK=(function(){var E=${jsSur(EVENEMENTS_EDITEUR)};`,
    `var K=${jsSur(PROPRIETES_EDITEUR)};`,
    `var C=${PROPRIETE_CODE.toString()};`,
    "return function(n,d){if(typeof n!=='string'||E.indexOf(n)<0)return;var o={};",
    "if(d&&typeof d==='object')for(var i=0;i<K.length;i++){var k=K[i];",
    "if(!Object.prototype.hasOwnProperty.call(d,k))continue;var v=d[k];",
    "if(v===null||typeof v==='boolean'||(typeof v==='number'&&isFinite(v))||(typeof v==='string'&&C.test(v)))o[k]=v;}",
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
/* Postgres rend l'uuid en minuscules : un lien retapé en majuscules ouvre le même plan */
else id=id.toLowerCase();
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
function site(connecte,limite,plans,plan,quoi){
  var s={v:1,connecte:connecte,limite:limite,plans:plans,plan:plan,type:type,urls:U,lang:'fr',dev:false};
  /* panne : la session n'a pas répondu (le tampon de cet appareil s'ouvre tel quel) ;
     compteAttendu : anonyme avec ?id= (un plan du compte resté ici est mis de côté, pas effacé) */
  if(quoi==='panne')s.panne=true;
  if(quoi==='compte'&&id)s.compteAttendu=id;
  return s;
}
/* le script de l'éditeur n'est copié qu'une fois la page entière lue : avant, son texte serait tronqué */
var pret=document.readyState!=='loading';
var attente=null;
var minuterie=0;
var passer=null;
var reserve=null;
var plans=null;
var inscription=null;
function lancer(s,pro,message){
  window.AVYORA_PRO=!!pro;
  window.AVYORA_SITE=s;
  var src=document.getElementById('avyora-editeur');
  var el=document.createElement('script');
  var code=src?src.textContent:'';
  /* bêta gratuite : « Passer Pro » dit le compte gratuit, dans le script et dans la barre */
  if(passer){
    code=code.split('Passer Pro').join(passer);
    var b=document.getElementById('proTop');
    if(b){b.setAttribute('aria-label',passer);var l=b.querySelector('.lbl');if(l)l.textContent=passer;}
  }
  if(reserve)code=code.split('est réservé à Pro').join(reserve);
  if(plans)code=code.split('des plans enregistrés sans limite').join(plans);
  if(inscription)U.inscription=inscription;
  el.textContent=code;
  document.body.appendChild(el);
  /* bêta gratuite : « Compte gratuit » mène à l'inscription comme l'invitation (plan gardé, drapeau de reprise) */
  if(inscription&&typeof window.siteCreerCompte==='function'){
    var creer=window.siteCreerCompte;
    window.passerPro=function(o){
      try{if(typeof window.suivre==='function')window.suivre('clic_passer_pro',{origine:typeof o==='string'?o:'fenetre'});}catch(e){}
      creer();
    };
    if(document.addEventListener)document.addEventListener('click',function(e){
      var a=e.target&&e.target.closest?e.target.closest('a'):null;
      if(a&&a.getAttribute('href')===U.tarifs){e.preventDefault();creer();}
    },true);
  }
  var v=document.getElementById('avyora-voile');
  if(v&&v.parentNode)v.parentNode.removeChild(v);
  if(message&&typeof window.toast==='function'){try{window.toast(message);}catch(e){}}
}
/* une seule fois : le premier qui arrive (réponses ou délai) démarre l'éditeur */
function demarrer(s,pro,message){
  if(fait)return;
  fait=true;
  clearTimeout(minuterie);
  if(ctl){try{ctl.abort();}catch(e){}}
  if(pret)lancer(s,pro,message);
  else attente=[s,pro,message];
}
function local(message,quoi){demarrer(site(false,1,[],null,quoi),false,message);}
/* le délai de 6 s ne court qu'une fois la page lue : il borne les réponses, pas le téléchargement */
function armer(){if(!fait)minuterie=setTimeout(function(){local(T.panne,'panne');},6000);}
if(pret)armer();
else document.addEventListener('DOMContentLoaded',function(){
  pret=true;
  if(attente){var a=attente;attente=null;lancer(a[0],a[1],a[2]);}
  else armer();
});
lire(U.api+'/session').then(function(r){
  var S=r.j;
  if(r.s!==200||!S||typeof S!=='object')throw new Error('session');
  /* bêta gratuite : la phrase du prix et le libellé de Pro disent la bêta (la session le sait, la page statique non) */
  if(S.beta&&typeof S.beta.prix==='string')window.AVYORA_PRIX_PRO=S.beta.prix;
  if(S.beta&&typeof S.beta.passer==='string'&&/^[A-Za-zÀ-ÿ ]{1,40}$/.test(S.beta.passer))passer=S.beta.passer;
  if(S.beta&&typeof S.beta.reserve==='string'&&/^[A-Za-zÀ-ÿ ,]{1,80}$/.test(S.beta.reserve))reserve=S.beta.reserve;
  if(S.beta&&typeof S.beta.plans==='string'&&/^[A-Za-zÀ-ÿ0-9 ’]{1,60}$/.test(S.beta.plans))plans=S.beta.plans;
  if(S.beta&&typeof S.beta.inscription==='string'&&S.beta.inscription.indexOf('/inscription?')===0&&/^[A-Za-z0-9%=&_.-]{1,200}$/.test(S.beta.inscription.slice(13)))inscription=S.beta.inscription;
  if(S.connecte!==true){local(null,'compte');return;}
  var P=id?lire(U.api+'/'+encodeURIComponent(id)):Promise.resolve(null);
  return Promise.all([lire(U.api),P]).then(function(x){
    var L=x[0],R=x[1],plan=null;
    if(L.s!==200||!L.j||!Array.isArray(L.j.plans))throw new Error('liste');
    if(R&&R.s===200&&R.j&&R.j.id===id)plan=R.j;
    else if(R&&R.s!==404)throw new Error('plan');
    var lim=L.j.limite===null?null:1;
    demarrer(site(true,lim,L.j.plans,plan),S.pro===true,null);
  });
}).catch(function(){local(T.panne,'panne');});
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
