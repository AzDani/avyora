/* ───────────────────────── Interface : rail, étiquettes, panneau, priorités ───────────────────────── */
const rail = document.getElementById("rail"), zoneEtq = document.getElementById("etiquettes"), panneau = document.getElementById("panneau");
const svg = (d) => '<svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="' + d + '" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
for (const p of PIECES) {
  const b = document.createElement("button"); b.type = "button"; b.title = p.nom; b.setAttribute("aria-label", p.nom + " : " + ETATS[p.etat]); b.setAttribute("aria-pressed", "false");
  b.onclick = () => choisir(p); rail.appendChild(b); p.bouton = b;
  const e = document.createElement("button"); e.type = "button"; e.className = "etq"; e.tabIndex = -1;
  e.onclick = () => choisir(p); zoneEtq.appendChild(e); p.etq = e; pastilles(p);
}
function pastilles(p) {
  p.bouton.setAttribute("aria-label", p.nom + " : " + ETATS[p.etat]); p.bouton.innerHTML = svg(ICONES[p.id]) + (p.etat === "bon" ? "" : '<span class="pt c-' + p.etat + '"></span>');
  p.etq.innerHTML = '<span class="pt c-' + p.etat + '"></span>' + p.nom + (p.nb ? ' <span class="nb">' + p.nb + "</span>" : "") + (p.euro ? ' <span class="eur">' + p.euro + "</span>" : "");
  if (p.lisere) p.lisere.material.color.setHex(COULEUR_ETAT[p.etat]);
}
/* L'insigne du responsable d'une pièce, redessiné quand l'état de son agent change */
function majInsigne(p) { const r = persos.find((q) => q.piece === p && q.type === "responsable"); if (r && r.insigne) { r.g.remove(r.insigne); insigne(r, "responsable"); } }

/* ── Les jauges de la salle des serveurs : une barre par limite ── */
function jaugesHtml(p) {
  const ton = (part) => (part == null ? "vide" : part >= 0.85 ? "critique" : part >= 0.6 ? "attention" : "bon");
  return "<h3>" + p.titre + '</h3><ul class="jauges">' + p.jauges.map((j) => '<li><div class="j-tete"><b>' + j.hote + " · " + j.nom + '</b><span class="puce ' + ton(j.part) + '">' + (j.part == null ? "à brancher" : j.part > 0 && j.part < 0.01 ? "< 1 %" : Math.round(j.part * 100) + " %") + "</span></div>" +
    '<div class="barre-j"><i class="' + ton(j.part) + '" style="width:' + (j.part == null ? 0 : Math.max(2, Math.min(100, j.part * 100))).toFixed(1) + '%"></i></div><span class="j-texte">' + j.texte + "</span></li>").join("") + "</ul>";
}

/* ── Le planning de la salle de réunion : deux onglets (cette semaine, la suivante), un jour par ligne, un clic ouvre le rendez-vous ── */
let semaineVue = 0, rdvOuvert = null;
const JOURS = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];
function planning() {
  if (SOURCE && !RDVS.length) return '<h3>Le planning</h3><p class="mission">Aucun rendez-vous cette semaine ni la suivante. Cale-les dans le planning de l\'admin.</p>';
  const auj = new Date().toDateString();
  let h = "<h3>Le planning</h3>" + '<div class="onglets" role="tablist">' + ["Cette semaine", "Semaine prochaine"].map((t, s) => '<button type="button" role="tab" data-s="' + s + '" aria-selected="' + (s === semaineVue) + '">' + t + "</button>").join("") + "</div>" +
    '<p class="fuseau">' + (RDVS.some(heureIci) ? "Heure de France, et <i>ton heure</i> en dessous" : "Heures de France") + " · clique pour le détail</p>";
  for (let j = 0; j < 7; j++) {
    const n = semaineVue * 7 + j, d = jourDu(n), liste = RDVS.map((r, i) => [r, i]).filter((x) => x[0].j === n);
    if (j > 4 && !liste.length) continue;                                    // le week-end n'apparaît que s'il y a un rendez-vous
    h += '<div class="jour' + (d.toDateString() === auj ? " auj" : "") + '"><div class="date"><b>' + d.getDate() + "</b>" + JOURS[j] + '</div><div class="rdvs">' + (liste.length ? liste.map(([r, i]) => {
      const e = etatRdv(r), ouvert = rdvOuvert === i, ici = heureIci(r);
      return '<button type="button" class="rdv" data-i="' + i + '" aria-expanded="' + ouvert + '"><span class="h">' + r.h + (ici ? "<i>" + ici.h + "</i>" : "") + '</span><span class="t"><b>' + r.qui + "</b><span>" + r.quoi + " · " + r.mode + '</span></span><span class="puce ' + e[0] + '">' + e[1] + "</span></button>" +
        (ouvert ? '<div class="detail"><p>' + r.sujet + "</p><dl><dt>Heure</dt><dd>" + r.h + " en France" + (ici ? " · " + ici.h + " pour toi" + (ici.jour ? " (" + ici.jour + ")" : "") : "") + "</dd><dt>Fiche du client</dt><dd>" + (SOURCE ? "À préparer (l'Agent Rappels n'est pas encore créé)" : passe(r) ? "Utilisée pendant l'appel" : "Prête la veille (Agent Rappels)") + "</dd><dt>Compte rendu</dt><dd>" + e[2] + "</dd></dl>" +
          (!passe(r) && !r.confirme ? (SOURCE ? '<a class="ouvrir" href="/admin/planning">Confirmer dans le planning</a>' : '<button type="button" data-confirmer="' + i + '">Confirmer le créneau</button>') : "") + "</div>" : "");
    }).join("") : '<span class="libre">Libre</span>') + "</div></div>";
  }
  return h;
}
const majPriorites = () => { document.getElementById("priorites").innerHTML = "<h2>Où mettre ton énergie aujourd'hui</h2><ol>" + PRIORITES.map((r, i) =>
  '<li><button type="button" data-piece="' + r[0] + '"><span class="rg">' + (i + 1) + '</span><span class="tx">' + r[1] + '</span><span class="gain">' + r[2] + "</span></button></li>").join("") + "</ol>"; };
majPriorites();
document.getElementById("priorites").addEventListener("click", (e) => { const b = e.target.closest("button[data-piece]"); if (b) choisir(parId[b.dataset.piece]); });
document.getElementById("ensemble").onclick = () => choisir(null);

/* ── Les agents IA : la ligne de l'agent en haut de la fiche, puis sa fiche de poste (mission, tâches, donner une tâche) ── */
const LOGO_AGENT = '<svg width="22" height="22" viewBox="0 0 64 64" aria-hidden="true"><rect x="2" y="2" width="60" height="60" rx="14" fill="#4F46E5"/><path d="M17 45 32 15l15 30" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="32" cy="39" r="4.5" fill="#C4B5FD"/></svg>';
const ETOILE = '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#1E1B4B" stroke="#f5c451" stroke-width="1.6"/><path d="m12 5.6 1.9 3.9 4.3.6-3.1 3 .7 4.3-3.8-2-3.8 2 .7-4.3-3.1-3 4.3-.6z" fill="#f5c451"/></svg>';
const ORDRE_AGENTS = ["attend", "travail", "repos", "creer"];
const puceAgent = (a) => '<span class="puce ' + ETATS_AGENT[a.etat][1] + '">' + ETATS_AGENT[a.etat][0] + "</span>";
const ligne = (l) => '<li><div class="t"><b>' + l[0] + "</b><span>" + l[1] + '</span></div><span class="puce ' + l[2] + '">' + l[3] + "</span></li>";
const propre = (t) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function ligneAgent(p) {
  const a = p.agent, equipe = PIECES.filter((q) => q.agent).length;
  return a ? '<button type="button" class="agent" title="Voir ses tâches">' + LOGO_AGENT + '<span class="qui"><b>' + a.nom + "</b><span>" + a.fait + "</span></span>" + puceAgent(a) + "</button>"
    : '<button type="button" class="agent" title="Voir tes agents">' + ETOILE + '<span class="qui"><b>Toi, le manager</b><span>' + equipe + " agents IA sous ta responsabilité</span></span></button>";
}
function ficheAgent(p) {
  const a = p.agent;
  if (!a) {                                                                  // ton bureau : le tableau de bord de l'équipe, ceux qui t'attendent en premier
    const equipe = PIECES.filter((q) => q.agent).sort((x, y) => ORDRE_AGENTS.indexOf(x.agent.etat) - ORDRE_AGENTS.indexOf(y.agent.etat)), compte = (e) => equipe.filter((q) => q.agent.etat === e).length;
    return '<h3 id="fiche-agent">Tes agents IA</h3>' + '<p class="bilan">' + ORDRE_AGENTS.filter(compte).map((e) => '<span class="puce ' + ETATS_AGENT[e][1] + '">' + compte(e) + " " + ETATS_AGENT[e][2] + "</span>").join("") + "</p>" +
      '<ul class="liste">' + equipe.map((q) => '<li class="lien"><button type="button" data-piece="' + q.id + '"><div class="t"><b>' + q.agent.nom + "</b><span>" + q.agent.fait + "</span></div>" + puceAgent(q.agent) + "</button></li>").join("") + "</ul>" +
      '<p class="limite">Clique un agent pour voir ses tâches et lui en donner une.</p>';
  }
  const absent = a.etat === "creer";
  if (SOURCE) return '<h3 id="fiche-agent">' + a.nom + ' · sa fiche de poste</h3><p class="mission">' + a.role + "</p>" + (a.taches.length ? '<ul class="liste">' + a.taches.map(ligne).join("") + "</ul>" : "") +
    '<p class="limite">' + a.limite + "</p>" + (a.etat === "creer" ? '<p class="limite">Cet agent n\'est pas encore construit : cette fiche décrit ce qu\'il fera.</p>' : "");
  return '<h3 id="fiche-agent">' + a.nom + ' · sa fiche de poste</h3><p class="mission">' + a.role + '</p><ul class="liste">' + a.taches.map(ligne).join("") + "</ul>" +
    '<form class="donner"><input type="text" maxlength="80" aria-label="Donner une tâche à ' + a.nom + '" placeholder="' + (absent ? "Agent pas encore créé" : "Donner une tâche à cet agent…") + '"' + (absent ? " disabled" : "") + '><button type="submit"' + (absent ? " disabled" : "") + ">Donner</button></form>" +
    '<p class="limite">' + a.limite + "</p>";
}
function rendre(p) {
  panneau.innerHTML = '<header><div><p class="sur">' + p.sur + "</p><h2>" + p.nom + '</h2></div><button type="button" class="fermer" aria-label="Fermer et revenir à la vue d\'ensemble">✕</button></header>' +
    '<span class="etat ' + p.etat + '"><span class="pt c-' + p.etat + '" style="width:8px;height:8px;border-radius:50%"></span>' + ETATS[p.etat] + (p.euro ? " · " + p.euro + " à aller chercher" : "") + "</span>" +
    ligneAgent(p) +
    '<div class="kpis">' + p.kpis.map((k) => '<div class="kpi"><span>' + k[0] + "</span><b>" + k[1] + "</b></div>").join("") + "</div>" +
    (p.id === "reunion" ? planning() : p.jauges ? jaugesHtml(p) : "<h3>" + p.titre + '</h3><ul class="liste">' + p.liste.map(ligne).join("") + "</ul>") +
    '<p class="conseil">' + p.conseil + "</p>" + (p.lien ? '<a class="ouvrir" href="' + p.lien + '">Ouvrir dans l\'admin</a>' : "") + ficheAgent(p);
  const redessiner = () => { const haut = panneau.scrollTop; rendre(p); panneau.scrollTop = haut; };
  panneau.querySelectorAll(".onglets button").forEach((b) => { b.onclick = () => { semaineVue = +b.dataset.s; rdvOuvert = null; redessiner(); }; });
  panneau.querySelectorAll(".rdv").forEach((b) => { b.onclick = () => { const i = +b.dataset.i; rdvOuvert = rdvOuvert === i ? null : i; redessiner(); }; });
  panneau.querySelectorAll("[data-confirmer]").forEach((b) => { b.onclick = () => { RDVS[+b.dataset.confirmer].confirme = true; majReunion(); pastilles(p); majInsigne(p); redessiner(); }; });   // confirmer : le créneau est tenu, l'agent n'attend plus
  panneau.querySelector(".fermer").onclick = () => choisir(null);
  panneau.querySelector("button.agent").onclick = () => panneau.querySelector("#fiche-agent").scrollIntoView({ behavior: calme ? "auto" : "smooth", block: "start" });   // la ligne de l'agent mène à sa fiche de poste, plus bas
  const f = panneau.querySelector(".donner");
  if (f) f.onsubmit = (e) => {                                               // donner une tâche : elle entre en tête de la file de l'agent (dans la maquette, elle reste le temps de la visite)
    e.preventDefault(); const t = f.querySelector("input").value.trim(), a = p.agent; if (!t || a.etat === "creer") return;
    a.taches.unshift([propre(t), "Donnée par toi à l'instant", "attention", "en file"]);
    if (a.etat === "repos") { a.etat = "travail"; a.fait = "Vient de recevoir une tâche"; majInsigne(p); }
    const haut = panneau.scrollTop; rendre(p); panneau.scrollTop = haut; const champ = panneau.querySelector(".donner input"); if (champ) champ.focus();
  };
}
panneau.addEventListener("click", (e) => { const b = e.target.closest("button[data-piece]"); if (b) choisir(parId[b.dataset.piece]); });

function choisir(p) {
  choisie = p;
  for (const q of PIECES) { q.bouton.setAttribute("aria-pressed", q === p ? "true" : "false"); q.etq.classList.toggle("choisie", q === p); }
  document.getElementById("priorites").hidden = !!p; document.getElementById("aide").hidden = !!p;
  if (!p) { panneau.hidden = true; versEnsemble(); return; }
  panneau.hidden = false; rendre(p); panneau.scrollTop = 0; versPiece(p);
}

/* ── Sur le site : les données se relisent chaque minute, tant que l'onglet est visible. Les chiffres, les pastilles, les priorités
   et la fiche ouverte suivent ; le nombre de personnes dans les pièces, lui, date de l'ouverture de la page. ── */
const heure = () => new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
function dire(texte, classe) { const e = document.getElementById("exemple"); e.textContent = texte; e.className = "exemple " + classe; }
async function rafraichir() {
  if (document.visibilityState !== "visible") return;
  try { await lireDonnees(); } catch (e) { dire("Lecture impossible à " + heure(), "panne"); return; }
  for (const p of PIECES) pastilles(p); majPriorites(); for (const id of ["accompagnement", "reunion"]) if (parId[id]) majInsigne(parId[id]);
  if (choisie) { const haut = panneau.scrollTop; rendre(choisie); panneau.scrollTop = haut; }
  dire("En direct · " + heure(), "direct");
}
if (SOURCE) { dire("En direct · " + heure(), "direct"); setInterval(rafraichir, 60000); document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") rafraichir(); }); }
