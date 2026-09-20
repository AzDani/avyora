/**
 * La scène de référence, en un seul endroit.
 *
 * Elle était écrite en dur dans fixture-contrat.mjs. Dès qu'un deuxième outil a eu besoin de la
 * MÊME scène (couverture.ts, qui compare les tâches de la maquette aux lignes de l'estimateur),
 * la recopier aurait garanti qu'elles divergent un jour — et deux outils qui mesurent deux scènes
 * différentes ne se contredisent jamais : ils mentent ensemble.
 *
 * Elle est construite pour couvrir les RÈGLES, pas pour ressembler à un vrai logement.
 */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/** Ouvre la maquette dans un Chrome headless. Rend la page, le navigateur et les erreurs vues. */
export async function ouvrirMaquette(dossierMaquettes) {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
  const p = await b.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  await p.setViewport({ width: 1500, height: 1000 });
  await p.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch {} });
  await p.goto("file://" + dossierMaquettes + "/plan-editor.html", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 400));
  return { b, p, errs };
}

/** Construit la scène DANS la page. Ne rend rien : chaque outil extrait ensuite ce qu'il veut. */
export function scene() {
  closeWelcome('blank');
  state=blankState(); const lv=L(); lv.height=2.5; state.name='Scène de référence';
  const W=(a,c,t)=>{const x={id:uid(),a:v(...a),b:v(...c),type:t};lv.walls.push(x);return x;};
  const nord=W([0,0],[8,0],'mur'), est=W([8,0],[8,5],'mur'), sud=W([8,5],[0,5],'mur'), ouest=W([0,5],[0,0],'mur');
  const refend=W([3,0],[3,5],'cloison');
  nord.iso={e:0.10,mat:'gv',mode:'iti',sys:'ossature',side:1,st:'creer'};   /* doublage ITI 20 m² */
  const stub=W([5,1],[5,2.4],'porteur'); stub.st='demolir';                 /* porteur démoli 1,40 ml */
  const vieille=W([6,3],[7.6,3],'cloison'); vieille.st='demolir';           /* cloison démolie 1,60 ml */
  const O=(mur,t,type,st,extra={})=>{const d=OPENINGS[type];lv.openings.push({id:uid(),wallId:mur.id,t,type,w:d.w,h:d.h,side:1,hinge:1,st,...extra});};
  O(sud,0.30,'fenetre','remplacer'); O(sud,0.60,'fenetre','creer',{volet:'roulant'});
  O(est,0.5,'fenetre','garder'); O(ouest,0.5,'fenetre','boucher'); O(refend,0.5,'porte','creer');
  state.toiture={forme:'deuxpans',pente:30,couverture:'tuile',etatCouv:'refaire',etatCharp:'refaire',combles:'perdus',debord:0.3,
    projet:{action:'complete',charpente:'trad',isoCombles:'perdus',velux:2,gouttieres:true,raccords:true,traiterCharpente:false}};
  setMode('projet'); afterChange();
  const faces=facesCache[lv.id]||[];
  const petite=faces.reduce((m,f)=>f.areaInt<m.areaInt?f:m,faces[0]);
  const sdb=petite.room, autre=faces.find(f=>f.room!==sdb).room;
  sdb.type='sdb'; sdb.name='Salle de bain'; sdb.floor='Carrelage'; sdb.floorNew='Carrelage'; sdb.faience='mi';
  sdb.sol={chape:'tradi',ragreage:true}; sdb.fauxPlafond=true;
  autre.type='chambre'; autre.name='Chambre'; autre.floor='Parquet ancien'; autre.floorNew='Parquet';
  const cSdb=petite.label, cCh=faces.find(f=>f.room===autre).label;
  const add=(t,c,o={})=>lv.items.push({id:uid(),type:t,x:c.x,y:c.y,w:.9,h:.9,rot:0,st:'creer',...o});
  add('douche',cSdb,{douche:'italienne',w:1.2,h:0.8}); add('vasque2',cSdb); add('wc',cSdb); add('baignoire',cSdb,{w:1.7,h:0.75});
  add('escalier',cCh,{w:1,h:2.5,stair:{type:'droit'}});   /* matériau NON choisi : test de la déduction */
  add('lumiere',cCh,{lum:'spot'}); add('lumiere',cSdb,{lum:'plafonnier'}); add('prise2',cCh); add('plan',cCh,{w:2.4});
  /* déjà en place : ne doit RIEN produire */
  lv.items.push({id:uid(),type:'radiateur',x:cCh.x+0.6,y:cCh.y,w:.9,h:.2,rot:0});
  lv.items.push({id:uid(),type:'lavabo',x:cSdb.x+0.5,y:cSdb.y,w:.6,h:.5,rot:0});
  lv.items.push({id:uid(),type:'cumulus',x:cCh.x-0.6,y:cCh.y,w:.5,h:.5,rot:0,st:'garder'});
  /* un étage CRÉÉ par le projet, vide, 4 × 4 : il n'apporte que son plancher.
     `neuf` est posé AVANT que les murs existent, donc les pièces qui apparaissent ensuite gardent
     leur sol « à définir » : c'est le cas où le plancher se chiffre au NIVEAU. Cocher la case sur
     un étage déjà dessiné passe au contraire ses pièces en « pas de plancher », et le plancher se
     chiffre alors PIÈCE PAR PIÈCE — les deux chemins existent, et ils comptaient en double avant
     le 19/09/2026 (cf. le test de non-régression sur les deux règles). */
  addLevel('empty'); const et=L(); et.name='Étage'; et.neuf=true; et.height=2.5;
  const We=(a,c,t)=>et.walls.push({id:uid(),a:v(...a),b:v(...c),type:t});
  We([0,0],[4,0],'mur'); We([4,0],[4,4],'mur'); We([4,4],[0,4],'mur'); We([0,4],[0,0],'mur');
  state.cur=0; afterChange(); garantirPids();
}

/**
 * Deuxième scène : celle qui exerce ce que la première ignore.
 *
 * Le bug de la chape a montré la limite d'une scène unique — elle validait 0 % d'écart sur des
 * chemins qu'elle ne parcourait jamais. Celle-ci existe pour les faire parcourir : une menuiserie
 * en BOIS et en TRIPLE vitrage, une porte à GALANDAGE, une baie (alu obligatoire), un volet, un
 * ESCALIER créé avec sa trémie à l'étage, et un mur DÉJÀ doublé qui ne doit rien coûter.
 */
export function sceneVariantes() {
  closeWelcome('blank');
  state=blankState(); const lv=L(); lv.height=2.5; state.name='Scène variantes';
  const W=(a,c,t)=>{const x={id:uid(),a:v(...a),b:v(...c),type:t};lv.walls.push(x);return x;};
  const nord=W([0,0],[8,0],'mur'), est=W([8,0],[8,6],'mur'), sud=W([8,6],[0,6],'mur'), ouest=W([0,6],[0,0],'mur');
  const refend=W([4,0],[4,6],'cloison');
  est.iso={e:0.10,mat:'gv',mode:'iti',sys:'ossature',side:-1,st:'existant'};  /* déjà doublé : 0 € */
  const O=(mur,t,type,extra={})=>{const d=OPENINGS[type];lv.openings.push({id:uid(),wallId:mur.id,t,type,w:d.w,h:d.h,side:1,hinge:1,st:'creer',...extra});};
  O(nord,0.3,'fenetre',{mat:'bois',vitrage:'triple'});      /* bois 1,05 × triple 1,20 */
  O(nord,0.7,'fenetre',{mat:'pvc',vitrage:'double',volet:'roulant'}); /* PVC + volet PVC 0,80 */
  O(sud,0.5,'baie');                                        /* alu obligatoire */
  O(refend,0.5,'porte',{ouvrant:'galandage'});              /* porte + caisson à galandage */
  setMode('projet'); afterChange();
  const faces=facesCache[lv.id]||[];
  faces.forEach((f,i)=>{if(f.room){f.room.type=i?'chambre':'sejour';f.room.name=i?'Chambre':'Séjour';}});
  const c0=faces[0].label;
  lv.items.push({id:uid(),type:'escalier',x:c0.x,y:c0.y,w:1,h:2.5,rot:0,st:'creer',materiau:'bois',stair:{type:'droit'}});
  afterChange();
  /* l'étage reprend l'emprise : la trémie de l'escalier s'y ouvre, donc un garde-corps */
  addLevel('copy'); const et=L(); et.name='Étage'; et.height=2.5;
  state.cur=0; afterChange(); garantirPids();
}
