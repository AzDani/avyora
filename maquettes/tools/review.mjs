import puppeteer from "puppeteer-core";
const SP=process.argv[2], OUT=SP+"/review";
const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:true,args:["--no-sandbox","--force-device-scale-factor=1"]});
const p=await b.newPage();const errs=[],warns=[];p.on("pageerror",e=>errs.push(e.message));p.on("console",m=>{if(m.type()==='warning'||m.type()==='error')warns.push(m.text().slice(0,160));});
await p.setViewport({width:1400,height:900,deviceScaleFactor:1});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const shot=async(name,clip)=>p.screenshot({path:`${OUT}/${name}.png`,...(clip?{clip}:{})});
const R={};
// 1. premier lancement : modale de bienvenue
await p.evaluateOnNewDocument(()=>{try{localStorage.clear()}catch{}});
await p.goto("file://"+SP+"/plan-editor.html",{waitUntil:"networkidle0"});await wait(300);
R.welcome=await p.evaluate(()=>document.getElementById('m-welcome').classList.contains('show'));
await shot('01-welcome');
// 2. feuille blanche → tracer une pièce à la souris (4 clics + retour au 1er point)
await p.evaluate(()=>closeWelcome('blank'));await wait(200);
await shot('02-blank');
const P=async(x,y)=>p.evaluate(([x,y])=>{const s=S(v(x,y));const rc=cv.getBoundingClientRect();return {x:rc.left+s.x,y:rc.top+s.y};},[x,y]);
R.toolAfterBlank=await p.evaluate(()=>tool);
for(const [x,y] of [[0,0],[5,0],[5,4],[0,4],[0,0]]){const q=await P(x,y);await p.mouse.move(q.x,q.y);await wait(40);await p.mouse.click(q.x,q.y);await wait(120);}
R.afterDraw=await p.evaluate(()=>({walls:L().walls.length,rooms:(facesCache[L().id]||[]).length,chain:chain.length,tool,area:(facesCache[L().id]||[])[0]?.areaInt}));
await shot('03-room-drawn');
// 3. longueur tapée : nouveau mur depuis (5,0) → taper 3 + Entrée
await p.evaluate(()=>setTool('mur'));const q0=await P(5,0);await p.mouse.move(q0.x,q0.y);await p.mouse.click(q0.x,q0.y);await wait(80);const q1=await P(7,0.2);await p.mouse.move(q1.x,q1.y);await wait(60);
await p.keyboard.type('3');await p.keyboard.press('Enter');await wait(150);
R.typedLen=await p.evaluate(()=>{const w=L().walls[L().walls.length-1];return {n:L().walls.length,len:+wallLen(w).toFixed(2),chain:chain.length};});
await p.keyboard.press('Escape');await wait(80);
await shot('04-typed-length');
// 4. ouverture : clic près du mur du bas
await p.evaluate(()=>{setTool('ouverture');openingType='porte';});const qo=await P(2.5,4.05);await p.mouse.move(qo.x,qo.y);await wait(60);await shot('05-opening-hover');await p.mouse.click(qo.x,qo.y);await wait(120);
R.opening=await p.evaluate(()=>({n:L().openings.length,sel:sel?.kind}));
// 5. équipement : lit dans la pièce
await p.evaluate(()=>{setTool('equipement');itemType='lit';});const qi=await P(1.2,1.2);await p.mouse.move(qi.x,qi.y);await wait(60);await p.mouse.click(qi.x,qi.y);await wait(120);
R.item=await p.evaluate(()=>({n:L().items.length,sel:sel?.kind,tool}));
// 6. cote 3 clics
await p.evaluate(()=>setTool('cote'));for(const [x,y] of [[0,4],[5,4]]){const q=await P(x,y);await p.mouse.move(q.x,q.y);await p.mouse.click(q.x,q.y);await wait(80);}const qc=await P(2.5,4.8);await p.mouse.move(qc.x,qc.y);await wait(60);await p.mouse.click(qc.x,qc.y);await wait(120);
R.cote=await p.evaluate(()=>({n:L().dims.length,off:L().dims[0]?.off,tool}));
// 7. note texte
await p.evaluate(()=>setTool('texte'));const qt=await P(3.5,2.5);await p.mouse.move(qt.x,qt.y);await p.mouse.click(qt.x,qt.y);await wait(120);await p.keyboard.type('Refaire le sol');await wait(80);
R.text=await p.evaluate(()=>({n:L().texts.length,txt:L().texts[0]?.text,tool,focused:document.activeElement?.id}));
// 8. mesure fermée
await p.evaluate(()=>setTool('mesure'));for(const [x,y] of [[0.1,0.1],[4.9,0.1],[4.9,3.9],[0.1,3.9],[0.1,0.1]]){const q=await P(x,y);await p.mouse.move(q.x,q.y);await wait(30);await p.mouse.click(q.x,q.y);await wait(80);}
R.measure=await p.evaluate(()=>({done:measureDone,pts:measure.length,area:+measureArea(measure).toFixed(2),box:document.getElementById('measBox')?.style.display}));
await shot('06-tools-used');
// 9. clic droit → retour sélection ; undo x2
await p.mouse.click(qt.x,qt.y,{button:'right'});await wait(80);R.rightClick=await p.evaluate(()=>tool);
await p.keyboard.down('Control');await p.keyboard.press('z');await p.keyboard.up('Control');await wait(80);
R.undo=await p.evaluate(()=>({texts:L().texts.length,hist:history.length,redo:(typeof future!=='undefined'?future.length:(typeof redo!=='undefined'?redo.length:null))}));
// 10. projet : mur à démolir (clic sur mur gauche), puis final
await p.evaluate(()=>{setMode('projet');setTool('select');});await wait(80);const qw=await P(0,2);await p.mouse.move(qw.x,qw.y);await p.mouse.click(qw.x,qw.y);await wait(120);
R.projetSel=await p.evaluate(()=>({sel:sel?.kind,hasStBtn:!!document.querySelector('button.st-demolir')}));
await p.evaluate(()=>{if(!sel){const w=L().walls.find(w=>Math.abs(w.a.x)<.01&&Math.abs(w.b.x)<.01);if(w)sel={kind:'wall',id:w.id};}if(sel)setWallProp('st','demolir');});await wait(100);await shot('07-projet');
await p.evaluate(()=>setMode('final'));await wait(100);await shot('08-final');
R.final=await p.evaluate(()=>({walls:L().walls.filter(w=>wallDrawn(w)).length,rooms:(facesCache[L().id]||[]).length}));
// 11. export + estimate
await p.evaluate(()=>{setMode('existant');exportPlan();});await wait(600);await shot('09-export');
R.export=await p.evaluate(()=>({imgs:document.querySelectorAll('#exportGallery img').length,open:document.getElementById('m-export').classList.contains('show')}));
await p.evaluate(()=>{closeModal();showEstimate();});await wait(300);await shot('10-estimate');
await p.evaluate(()=>closeModal());
// 12. niveaux : ajouter un étage
await p.evaluate(()=>addLevel('empty'));await wait(150);await shot('11-level');
R.level=await p.evaluate(()=>({n:state.levels.length,cur:state.cur,btnCopy:!!document.querySelector('button[onclick="copyBearingBelow()"]')}));
await p.evaluate(()=>{setLevel(0);});
// 13. exemple + mobile
await p.evaluate(()=>loadSample());await wait(200);
await p.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true,hasTouch:true});await wait(300);await p.evaluate(()=>{resize();fitView();});await wait(150);
await shot('12-mobile');
R.mobile=await p.evaluate(()=>{const cvr=cv.getBoundingClientRect();const pn=document.getElementById('panel')?.getBoundingClientRect();const tl=document.getElementById('tools')?.getBoundingClientRect();return {canvasW:Math.round(cvr.width),panelW:Math.round(pn?.width||0),toolsW:Math.round(tl?.width||0),bodyScrollX:document.documentElement.scrollWidth>window.innerWidth};});
await p.setViewport({width:1400,height:900,deviceScaleFactor:1});await wait(200);
// 14. raccourcis
await p.evaluate(()=>{setTool('select');});await p.keyboard.press('m');R.keyM=await p.evaluate(()=>tool);await p.keyboard.press('v');await p.keyboard.press('l');R.keyL=await p.evaluate(()=>tool);await p.keyboard.press('Escape');
// 15. hint bar text lengths (troncature)
R.hints=await p.evaluate(()=>{const el=document.getElementById('hint');return {w:Math.round(el.getBoundingClientRect().width),overflow:el.scrollWidth>el.clientWidth};});
console.log(JSON.stringify(R,null,1));console.log("ERRORS",errs.length?errs.join(" | "):"none");console.log("WARNS",warns.slice(0,5).join(" | ")||"none");await b.close();
