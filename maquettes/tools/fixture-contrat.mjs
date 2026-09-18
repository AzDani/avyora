/**
 * Génère la scène de référence utilisée par les tests de la table de correspondance.
 * Elle est construite pour couvrir les règles, pas pour ressembler à un vrai logement.
 *
 *   node maquettes/tools/fixture-contrat.mjs "$(pwd)/maquettes" tests/fixtures/plan-contrat.json
 */
import puppeteer from "puppeteer-core";
import { writeFileSync } from "node:fs";
const SP=process.argv[2],OUT=process.argv[3];
const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:true,args:["--no-sandbox"]});
const p=await b.newPage();const errs=[];p.on("pageerror",e=>errs.push(e.message));
await p.setViewport({width:1500,height:1000});
await p.evaluateOnNewDocument(()=>{try{localStorage.clear()}catch{}});
await p.goto("file://"+SP+"/plan-editor.html",{waitUntil:"networkidle0"});
const w=ms=>new Promise(r=>setTimeout(r,ms));await w(400);
const q=await p.evaluate(()=>{
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
  sdb.sol={chape:'traditionnelle',ragreage:true}; sdb.fauxPlafond=true;
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
  /* un étage CRÉÉ par le projet, vide, 4 × 4 : il n'apporte que son plancher */
  addLevel('empty'); const et=L(); et.name='Étage'; et.neuf=true; et.height=2.5;
  const We=(a,c,t)=>et.walls.push({id:uid(),a:v(...a),b:v(...c),type:t});
  We([0,0],[4,0],'mur'); We([4,0],[4,4],'mur'); We([4,4],[0,4],'mur'); We([0,4],[0,0],'mur');
  state.cur=0; afterChange(); garantirPids();
  return JSON.parse(JSON.stringify(contratPlan()));
});
writeFileSync(OUT,JSON.stringify(q,null,1));
console.log("contrat",q.contrat,"· niveaux",q.detailNiveaux.length,"· pageerrors:",errs.length?errs:"aucune");
await b.close();
