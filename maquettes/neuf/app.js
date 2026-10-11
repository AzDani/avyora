(function () {
  "use strict";
  /* Toute la logique de chiffrage vient du moteur (window.AVYORA). Ce script ne fait que
     décrire la maison, appeler le moteur et afficher ce qu'il renvoie. */
  var A = window.AVYORA;
  var SRC = JSON.parse(document.getElementById("sources-json").textContent);
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- Formats ---------- */
  var NF0 = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
  var NF2 = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });
  function eur(v) { return NF0.format(Math.round(v || 0)) + " €"; }
  function eur2(v) { var x = Math.abs(v) < 100 ? NF2.format(Math.round(v * 100) / 100) : NF0.format(Math.round(v)); return x + " €"; }
  function n2(v) { return NF2.format(Math.round((v || 0) * 100) / 100); }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  var UNITE = { m2: "m²", ml: "ml", u: "u", forfait: "forfait", jour: "jour", point: "pt", pct: "%" };
  function unite(u) { return UNITE[u] || u; }

  /* ---------- Icônes ---------- */
  var IC = {
    flag: '<svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 14.5V2.2M3.5 2.6h8.2l-1.8 3 1.8 3H3.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></svg>',
    chev: '<svg class="chev" width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7.5 5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    x: '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.3" opacity=".7"/><path d="m5.8 5.8 4.4 4.4m0-4.4-4.4 4.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    clock: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.3" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M8 4.6V8l2.3 1.6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    arrow: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10m-4-4 4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  /* ---------- Catalogue : blocs, postes, phases ---------- */
  var PHASES = A.PHASES_NEUF.slice();
  var BLOCS = A.CATALOG_NEUF.map(function (l, i) { return { i: i, l: l }; });
  var PAR_CLE = {};
  BLOCS.forEach(function (b) { b.l.t.forEach(function (t) { PAR_CLE[A.key(b.l.c, t.n)] = { l: b.l, t: t }; }); });
  var IDS_NEUF = {};
  A.IDS_NEUF.forEach(function (id) { IDS_NEUF[id] = 1; });
  function estJalon(t) { return t.fp === 0 && (t.sm == null || t.sm === 0); }
  var LOTS_ANNEXES = { "Etudes / Conception": 1, "Assurance & ouverture du chantier": 1, "Taxes & participations": 1, "Raccordements aux réseaux": 1 };

  /* ---------- Repères du chantier (conception v1, § a) ---------- */
  var INFO = {
    "Études & permis": {
      quoi: "Plan topo, étude de sol G2, plans et dossier de permis (architecte obligatoire au-delà de 150 m² de surface de plancher), étude thermique RE2020. Dépôt, instruction, affichage et purge du permis. Étude béton armé si besoin, devis des lots, assurance dommages-ouvrage.",
      jalon: "Permis purgé + DO souscrite + DOC déposée : chantier ouvert",
      duree: "5 à 6 mois (permis + purge)",
      dem: [["Avant", "Dépôt du permis de construire en mairie : instruction ≈ 2 mois"], ["Permis obtenu", "Affichage du permis sur le terrain, constaté par un commissaire de justice : recours des tiers 2 mois, retrait 3 mois"], ["Permis obtenu", "Demandes de raccordement Enedis, eau et égout tout de suite (délai Enedis 2 à 6 mois)"], ["Avant travaux", "Assurance dommages-ouvrage souscrite, puis déclaration d'ouverture de chantier (DOC) en mairie"]]
    },
    "Terrain & terrassement": {
      quoi: "Déclaration de travaux (DT) aux exploitants de réseaux, implantation par un géomètre, installation du chantier, électricité provisoire et compteur d'eau, décapage, fouilles, évacuation des terres.",
      jalon: "Fond de fouille réceptionné",
      duree: "Gros œuvre : 4 à 6 mois pour les phases 2 à 5",
      dem: [["Avant de creuser", "DT sur le guichet unique des réseaux (gratuit)"]]
    },
    "Fondations & plancher bas": {
      quoi: "Semelles, boucle de terre, réseaux sous dallage posés et testés par le plombier et l'électricien, soubassement et dalle (ou vide sanitaire, ou sous-sol).",
      jalon: "Plancher bas coulé (≈ 25 % des appels de fonds en contrat de construction)",
      duree: "Compris dans les 4 à 6 mois du gros œuvre",
      dem: [["Avant le coulage", "Réseaux sous dallage posés et testés"]]
    },
    "Murs & planchers": {
      quoi: "Élévation des murs (maçonnerie ou ossature bois), linteaux, chaînages, appuis, plancher d'étage et ses rupteurs, escalier béton.",
      jalon: "Murs et pignons arasés (≈ 40 %)",
      duree: "Compris dans les 4 à 6 mois du gros œuvre",
      dem: []
    },
    "Clos & couvert": {
      quoi: "Charpente, couverture et zinguerie, puis pose des menuiseries extérieures.",
      jalon: "Hors d'eau (≈ 60 %) puis hors d'air",
      duree: "Fin des 4 à 6 mois du gros œuvre",
      dem: []
    },
    "Réseaux & façade": {
      quoi: "Tranchées, fourreaux, tube d'eau, regards, eaux pluviales et remblai au pied des murs, branchements définitifs (électricité, égout ou assainissement individuel), puis enduit ou bardage.",
      jalon: "Branchements faits + façade finie",
      duree: "Pendant le second œuvre (pas de durée propre dans la conception)",
      dem: [["Branchements", "Les concessionnaires posent les branchements définitifs demandés dès le permis"]]
    },
    "Second œuvre": {
      quoi: "1re passe électricité, plomberie, chauffage et VMC, doublages et pare-vapeur, test d'étanchéité intermédiaire, plafonds et cloisons, soufflage des combles, chapes et séchage.",
      jalon: "Cloisons finies + chape sèche (≈ 75 %)",
      duree: "3 à 4 mois, dont le séchage de la chape (≈ 1 semaine par cm, au moins 7 semaines) : c'est le chemin critique",
      dem: [["Avant les plafonds", "Test d'étanchéité à l'air intermédiaire"]]
    },
    "Finitions & équipements": {
      quoi: "Carrelage et faïence, peinture, sols et plinthes, portes, escalier bois et garde-corps, sanitaires, cuisine.",
      jalon: "Équipements posés (≈ 95 %)",
      duree: "1 à 2 mois",
      dem: []
    },
    "Réception & achèvement": {
      quoi: "Consuel puis mise en service du compteur, contrôles RE2020 (test final, VMC, attestation n° 2), attestations argile ou parasismique selon le terrain, nettoyage, réception avec chaque artisan, levée des réserves.",
      jalon: "PV de réception (départ des garanties) puis DAACT déposée",
      duree: "Conformité acquise 3 mois après la DAACT",
      dem: [["Fin des travaux", "Consuel, puis mise en service du compteur définitif"], ["Réception", "Procès-verbal de réception avec chaque artisan : les garanties démarrent"], ["Après la réception", "Déclaration d'achèvement et de conformité (DAACT) en mairie"], ["Sous 90 jours", "Déclaration des éléments d'imposition sur impots.gouv"], ["Après l'achèvement", "Taxe d'aménagement, puis PFAC (égout) ou redevances SPANC"]]
    }
  };

  /* ---------- Moteur : appels ---------- */
  function devisDe(ctx, sel) { return A.buildDevis(A.catalogueDe(ctx), ctx, sel); }
  function parPhase(devis) {
    var m = {}; PHASES.forEach(function (p) { m[p] = 0; });
    devis.lignes.forEach(function (li) { m[li.phase] = (m[li.phase] || 0) + li.ttc; });
    return m;
  }
  function decoupe(devis) {
    var annexes = 0, constr = 0;
    devis.lignes.forEach(function (li) { if (LOTS_ANNEXES[li.corps]) annexes += li.ttc; else constr += li.ttc; });
    return { constr: constr, annexes: annexes, aleas: devis.totaux.aleas };
  }

  /* ---------- État ---------- */
  var EXEMPLE = { surface: 100, niveaux: "pp", codePostal: "45000", finition: "standard", qui: "pros", garage: false, assainissement: "collectif" };
  var R = clone(EXEMPLE);
  var D = { maison: null, finition: "standard", qui: "pros", sel: {}, ctx: null, facadeAuto: true, ouvertes: {}, seulementCoches: false };
  var dernier = "rapide";

  function chargerDetail(input) {
    var p = A.presetNeuf(input);
    D.maison = clone(p.ctx.neuf);
    D.finition = input.finition; D.qui = input.qui;
    D.sel = clone(p.sel);
    D.facadeAuto = true;
    majCtx();
  }
  function majCtx() { D.ctx = A.ctxNeuf(D.maison, { finition: D.finition, codePostal: D.maison.codePostal }); }

  /* ---------- Onglets ---------- */
  var ONGLETS = ["rapide", "detail", "etapes", "prix"];
  function ouvrir(nom) {
    if (ONGLETS.indexOf(nom) < 0) nom = "rapide";
    ONGLETS.forEach(function (o) {
      $("#tab-" + o).setAttribute("aria-selected", o === nom ? "true" : "false");
      $("#tab-" + o).tabIndex = o === nom ? 0 : -1;
      $("#p-" + o).hidden = o !== nom;
    });
    try { localStorage.setItem("avyora-neuf-onglet", nom); } catch (e) { /* stockage indisponible */ }
    if (nom === "etapes") rendreEtapes();
    if (nom === "detail") rendreDetail();
  }
  $$(".tab").forEach(function (b) {
    b.addEventListener("click", function () { ouvrir(b.getAttribute("data-tab")); });
    b.addEventListener("keydown", function (e) {
      var i = ONGLETS.indexOf(b.getAttribute("data-tab"));
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        var j = (i + (e.key === "ArrowRight" ? 1 : ONGLETS.length - 1)) % ONGLETS.length;
        ouvrir(ONGLETS[j]); $("#tab-" + ONGLETS[j]).focus();
      }
    });
  });

  /* ---------- Bandeau « exemple » ---------- */
  function estExemple() {
    return JSON.stringify(R) === JSON.stringify(EXEMPLE);
  }
  function majBandeau() {
    var ex = estExemple();
    $("#exemple .pill-ex").lastChild.nodeValue = ex ? "Exemple" : "Modifiée";
    $("#exemple-txt").innerHTML = ex
      ? "Maison de départ : <b>plain-pied 100 m²</b>, <b>3 chambres</b>, code postal <b class=\"num\">45000</b>, finition standard, tout fait faire."
      : "Tu as modifié la maison d'exemple (plain-pied 100 m², 3 chambres, 45000).";
    $("#reset-ex").hidden = ex;
  }
  $("#reset-ex").addEventListener("click", function () {
    R = clone(EXEMPLE); chargerDetail(R); syncRapideForm(); rendreRapide(); rendreDetail(); rendreEtapes(); majBandeau();
  });

  /* ---------- 1. Rapide ---------- */
  function syncRapideForm() {
    $("#r-surface").value = R.surface;
    $("#r-surface-range").value = Math.min(300, R.surface);
    $("#r-cp").value = R.codePostal;
    $$("[data-r]").forEach(function (g) {
      var k = g.getAttribute("data-r");
      $$(".pill", g).forEach(function (b) { b.setAttribute("aria-pressed", String(R[k]) === b.getAttribute("data-v") ? "true" : "false"); });
    });
    majZone();
  }
  function majZone() {
    var cp = $("#r-cp").value.trim();
    var z = /^\d{5}$/.test(cp) ? A.regionCoef(cp) : null;
    $("#r-zone").textContent = z ? "Zone : " + z.zone + (z.mo !== 1 ? " (main-d'œuvre × " + n2(z.mo) + ")" : "") : "5 chiffres";
  }
  function setSurface(v) {
    v = Math.round(Number(v));
    if (!isFinite(v) || v <= 0) return;
    R.surface = Math.max(30, Math.min(400, v));
    $("#r-surface-range").value = Math.min(300, R.surface);
    rendreRapide();
  }
  $("#r-surface").addEventListener("input", function (e) { var v = Number(e.target.value); if (v >= 30) setSurface(v); });
  $("#r-surface").addEventListener("change", function (e) { setSurface(e.target.value || 30); e.target.value = R.surface; });
  $("#r-surface-range").addEventListener("input", function (e) { $("#r-surface").value = e.target.value; setSurface(e.target.value); });
  $$("#p-rapide .stepper button").forEach(function (b) {
    b.addEventListener("click", function () { setSurface(R.surface + Number(b.getAttribute("data-step"))); $("#r-surface").value = R.surface; });
  });
  $("#r-cp").addEventListener("input", function (e) {
    var v = e.target.value.replace(/\D/g, "").slice(0, 5);
    if (v !== e.target.value) e.target.value = v;
    majZone();
    if (/^\d{5}$/.test(v)) { R.codePostal = v; rendreRapide(); }
  });
  $$("[data-r]").forEach(function (g) {
    var k = g.getAttribute("data-r");
    $$(".pill", g).forEach(function (b) {
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", function () {
        var v = b.getAttribute("data-v");
        R[k] = v === "true" ? true : v === "false" ? false : v;
        $$(".pill", g).forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        rendreRapide();
      });
    });
  });

  function barres(m, total) {
    var max = 0; PHASES.forEach(function (p) { if (m[p] > max) max = m[p]; });
    return '<div class="bars">' + PHASES.map(function (p) {
      var w = max ? (m[p] / max) * 100 : 0;
      return '<div class="bar"><span class="t" title="' + esc(p) + '">' + esc(p) + '</span><span class="track"><span class="fill" style="width:' + w.toFixed(1) + '%"></span></span><span class="v">' + eur(m[p]) + "</span></div>";
    }).join("") + "</div>";
  }

  var dernierRapide = null;
  function rendreRapide() {
    var p = A.presetNeuf(R);
    var d = devisDe(p.ctx, p.sel);
    dernierRapide = { p: p, d: d };
    dernier = "rapide";
    var t = d.totaux.ttc, s = p.ctx.surface;
    var lo = Math.round((t * 0.85) / 100) * 100, hi = Math.round((t * 1.15) / 100) * 100;
    var cut = decoupe(d);
    var ph = parPhase(d);
    /* Avertissement « hors étude de sol » : même maison, sol argileux moyen, chiffrée par le moteur. */
    var mArg = clone(p.ctx.neuf); mArg.argile = "moyen";
    var pa = A.presetMaison(mArg, { finition: R.finition, qui: R.qui, codePostal: R.codePostal });
    var dArg = devisDe(pa.ctx, pa.sel).totaux.ttc - t;
    var g = A.geometrieNeuf(p.ctx.neuf);
    $("#r-result").innerHTML =
      '<div class="k">Total TTC tout compris</div>' +
      '<div class="big" id="r-total" data-ttc="' + t.toFixed(2) + '">' + eur(t) + "</div>" +
      '<div class="range">Fourchette ± 15 % : ' + eur(lo) + " – " + eur(hi) + "</div>" +
      '<div class="kpis">' +
        '<div class="kpi"><div class="v">' + eur(t / s) + '</div><div class="l">par m² habitable (' + s + " m²)</div></div>" +
        '<div class="kpi"><div class="v">' + eur(cut.constr) + '</div><div class="l">la construction</div></div>' +
        '<div class="kpi"><div class="v">' + eur(cut.annexes) + '</div><div class="l">études, taxes, assurance, branchements</div></div>' +
      "</div>" +
      '<div class="small" style="color:#c9c5f3;margin-top:-6px">+ provision pour aléas ' + eur(cut.aleas) + " (" + p.ctx.aleas + " % des travaux) · " + p.ctx.neuf.chambres + " chambres · chantier ≈ " + g.moisChantier + " mois</div>" +
      '<div class="hr"></div>' +
      '<div class="k" style="margin-bottom:6px">Répartition par phase du chantier (TTC, hors aléas)</div>' + barres(ph, t) +
      '<div class="hr"></div>' +
      '<div class="k">Pas compris</div>' +
      '<ul class="excl"><li>' + IC.x + "<span>Le terrain et les frais de notaire</span></li><li>" + IC.x + "<span>Les aménagements extérieurs : allée, terrasse, clôture, portail, gazon (≈ 8 000 à 20 000 € sur 600 à 800 m² de terrain)</span></li><li>" + IC.x + "<span>Les aides (PTZ, primes) et les frais de prêt</span></li></ul>" +
      '<div class="alert-n">Sans étude de sol : si ton terrain est argileux (aléa moyen), compte environ <b class="num">+' + eur(dArg) + "</b>.</div>" +
      '<p class="note-n">La finition ne joue que sur les matériaux : elle bouge peu le total. Les vrais leviers sont le sol, le sous-sol, la forme, le toit et le chauffage (onglet 2).</p>' +
      '<button class="cta" type="button" id="r-affiner">Affiner ma maison ' + IC.arrow + "</button>";
    $("#r-affiner").addEventListener("click", function () {
      chargerDetail(R); dernier = "detail"; ouvrir("detail"); window.scrollTo({ top: 0, behavior: "smooth" });
    });
    majBandeau();
  }

  /* ---------- 2. Détaillé : questions ---------- */
  var Q = [
    { g: "La maison", qs: [
      { k: "surface", l: "Surface habitable", t: "num", u: "m²", min: 30, max: 400, step: 5 },
      { k: "codePostal", l: "Code postal", t: "cp" },
      { k: "niveaux", l: "Niveaux", o: [["pp", "Plain-pied"], ["etage", "À étage"], ["combles", "Combles aménagés"]] },
      { k: "forme", l: "Forme", o: [["rect", "Simple"], ["L", "En L"], ["complexe", "Complexe"]] },
      { k: "garage", l: "Garage accolé", t: "garage" },
      { k: "chambres", l: "Chambres", t: "num", min: 1, max: 8, step: 1 },
      { k: "sdb", l: "Salles d'eau", t: "num", min: 1, max: 4, step: 1 },
      { k: "wc", l: "WC", t: "num", min: 1, max: 4, step: 1 },
      { k: "cuisine", l: "Cuisine équipée", o: [[true, "Oui"], [false, "Non"]] }
    ] },
    { g: "Structure", qs: [
      { k: "plancherBas", l: "Plancher bas", o: [["terre-plein", "Dalle sur terre-plein"], ["vide-sanitaire", "Vide sanitaire"], ["sous-sol", "Sous-sol"]] },
      { k: "murs", l: "Murs", o: [["parpaing", "Parpaing"], ["brique", "Brique"], ["monomur", "Brique monomur"], ["cellulaire", "Béton cellulaire"], ["ossature", "Ossature bois"]] },
      { k: "escalier", l: "Escalier", o: [["bois", "Bois quart tournant"], ["beton", "Béton"]], si: function (m) { return m.niveaux !== "pp"; }, hint: "si étage" }
    ] },
    { g: "Toit et façade", qs: [
      { k: "toiture", l: "Toiture", o: [["2pans", "2 pans"], ["4pans", "4 pans"], ["plat", "Toit plat"]] },
      { k: "couverture", l: "Couverture", o: [["terre-cuite", "Tuiles terre cuite"], ["beton", "Tuiles béton"], ["ardoise", "Ardoise"], ["ardoise-fibro", "Ardoise fibres-ciment"], ["bac-acier", "Bac acier"], ["zinc", "Zinc"]], si: function (m) { return m.toiture !== "plat"; } },
      { k: "penteFaible", l: "Toit à pente faible", o: [[false, "Non (≈ 35°)"], [true, "Oui, tuile canal (≈ 17°)"]], si: function (m) { return m.toiture !== "plat"; } },
      { k: "gouttiere", l: "Gouttières", o: [["zinc", "Zinc"], ["pvc", "PVC"], ["alu", "Alu continu"]], si: function (m) { return m.toiture !== "plat"; } },
      { k: "facade", l: "Façade", o: [["enduit", "Enduit"], ["bardage-bois", "Bardage bois"], ["bardage-composite", "Bardage composite"]] }
    ] },
    { g: "Chauffage et confort", qs: [
      { k: "chauffage", l: "Chauffage", o: [["pac-eau", "PAC air/eau + plancher chauffant"], ["pac-air", "PAC air/air gainable"], ["poele", "Poêle à granulés + radiateurs"]] },
      { k: "vmc", l: "Ventilation", o: [["simple", "Simple flux"], ["double", "Double flux"]] }
    ] },
    { g: "Terrain et réseaux", qs: [
      { k: "terrain", l: "Terrain", o: [["plat", "Plat"], ["pente", "En pente"]] },
      { k: "argile", l: "Sol argileux (Géorisques)", o: [["non", "Non ou je ne sais pas"], ["moyen", "Moyen"], ["fort", "Fort"]] },
      { k: "sismique", l: "Zone sismique", o: [[1, "1-2 ou je ne sais pas"], [3, "3"], [4, "4"], [5, "5"]] },
      { k: "viabilise", l: "Terrain viabilisé", o: [[true, "Oui"], [false, "Non"]], hint: "réseaux devant le terrain" },
      { k: "distanceReseaux", l: "Distance maison – rue", t: "num", u: "m", min: 0, max: 200, step: 5 },
      { k: "lotissement", l: "Lotissement", o: [[false, "Non"], [true, "Oui"]] },
      { k: "borne", l: "Terrain déjà borné", o: [[true, "Oui"], [false, "Non"]], si: function (m) { return !m.lotissement; } },
      { k: "evacTerreVegetale", l: "Terre végétale à évacuer", o: [[false, "Non, gardée sur place"], [true, "Oui"]] },
      { k: "assainissement", l: "Eaux usées", o: [["collectif", "Tout-à-l'égout"], ["fosse", "Fosse toutes eaux"], ["micro", "Micro-station"]] },
      { k: "eauxPluviales", l: "Eaux de pluie", o: [["infiltration", "Infiltration sur la parcelle"], ["reseau", "Réseau public"]] }
    ] },
    { g: "Qui pilote, qui réalise, finition", qs: [
      { k: "pilotage", l: "Qui pilote", o: [["moi", "Moi (lots séparés)"], ["moe", "Un maître d'œuvre"]] },
      { k: "$qui", l: "Qui réalise", o: [["pros", "Tout fait faire"], ["partie", "Une partie"], ["max", "Le maximum"]] },
      { k: "$finition", l: "Finition", o: [["eco", "Éco"], ["standard", "Standard"], ["premium", "Premium"]] }
    ] }
  ];
  function valeur(k) { return k === "$qui" ? D.qui : k === "$finition" ? D.finition : D.maison[k]; }
  function rendreQuestions() {
    var m = D.maison;
    var html = Q.map(function (grp, gi) {
      return '<details class="grp" open><summary>' + esc(grp.g) + IC.chev + "</summary>" + grp.qs.map(function (q) {
        var actif = !q.si || q.si(m);
        var lab = '<span class="ql">' + esc(q.l) + (q.hint ? '<span class="hint">' + esc(q.hint) + "</span>" : "") + (actif ? "" : '<span class="hint">sans objet ici</span>') + "</span>";
        var ctrl;
        if (q.t === "num") {
          ctrl = '<div class="stepper"><button type="button" data-qk="' + q.k + '" data-d="-' + q.step + '" aria-label="Moins">−</button><input type="number" inputmode="numeric" data-qn="' + q.k + '" min="' + q.min + '" max="' + q.max + '" value="' + m[q.k] + '" aria-label="' + esc(q.l) + '">' + (q.u ? '<span class="u">' + q.u + "</span>" : "") + '<button type="button" data-qk="' + q.k + '" data-d="' + q.step + '" aria-label="Plus">+</button></div>';
        } else if (q.t === "cp") {
          ctrl = '<div class="rowflex"><input class="field num" type="text" inputmode="numeric" maxlength="5" data-qcp="1" value="' + esc(m.codePostal || "") + '" aria-label="Code postal"><span class="small">' + esc(A.regionCoef(m.codePostal).zone) + "</span></div>";
        } else if (q.t === "garage") {
          ctrl = '<div class="rowflex"><div class="pills"><button class="pill" type="button" data-qg="0" aria-pressed="' + (m.garage ? "false" : "true") + '">Non</button><button class="pill" type="button" data-qg="20" aria-pressed="' + (m.garage ? "true" : "false") + '">Oui</button></div>' +
            (m.garage ? '<div class="stepper"><button type="button" data-qk="garage" data-d="-5" aria-label="Moins">−</button><input type="number" inputmode="numeric" data-qn="garage" min="10" max="80" value="' + m.garage + '" aria-label="Surface du garage"><span class="u">m²</span><button type="button" data-qk="garage" data-d="5" aria-label="Plus">+</button></div>' : "") + "</div>";
        } else {
          var v = valeur(q.k);
          ctrl = '<div class="pills">' + q.o.map(function (o) {
            return '<button class="pill" type="button" data-qp="' + q.k + '" data-v="' + esc(JSON.stringify(o[0])) + '" aria-pressed="' + (v === o[0] ? "true" : "false") + '"' + (actif ? "" : " disabled") + ">" + esc(o[1]) + "</button>";
          }).join("") + "</div>";
        }
        return '<div class="q">' + lab + ctrl + "</div>";
      }).join("") + (gi === 5 ? '<p class="tiny" style="margin:4px 0 0">Taux communal de la taxe d\'aménagement : question prévue (facultative), pas encore dans le moteur.</p>' : "") + "</details>";
    }).join("");
    $("#d-groups").innerHTML = html;
    var g = A.geometrieNeuf(D.ctx.neuf);
    $("#d-deduit").innerHTML = "<span>Le moteur en déduit :</span>" +
      "<span>emprise <b>" + n2(Math.round(g.Etot)) + " m²</b></span>" +
      "<span>surface de plancher <b>" + n2(Math.round(g.SP)) + " m²</b></span>" +
      "<span>périmètre <b>" + n2(Math.round(g.P * 10) / 10) + " m</b></span>" +
      "<span>toiture <b>" + n2(Math.round(g.toiture)) + " m²</b></span>" +
      "<span><b>" + g.nFen + "</b> fenêtres, <b>" + g.nPF + "</b> porte-fenêtre" + (g.nPF > 1 ? "s" : "") + ", <b>" + g.nBaie + "</b> baie" + (g.nBaie > 1 ? "s" : "") + "</span>" +
      "<span>chantier ≈ <b>" + g.moisChantier + " mois</b></span>";
  }
  function changerMaison(k, v) {
    if (k === "$qui") { changerQui(v); return; }
    if (k === "$finition") { D.finition = v; majCtx(); dernier = "detail"; rendreDetail(); return; }
    var ancienne = D.ctx.neuf;
    D.maison[k] = v;
    if (k === "murs" && D.facadeAuto) D.maison.facade = v === "ossature" ? "bardage-bois" : "enduit";
    if (k === "facade") D.facadeAuto = false;
    majCtx();
    /* seuls les postes dont la décision change bougent : les choix faits à la main ailleurs restent */
    D.sel = A.appliquerMaison(D.ctx.neuf, D.sel, D.qui, ancienne);
    dernier = "detail";
    rendreDetail();
  }
  function changerQui(q) {
    D.qui = q;
    Object.keys(D.sel).forEach(function (k) {
      var s = D.sel[k], p = PAR_CLE[k];
      if (!s || !s.on || !p) return;
      D.sel[k] = Object.assign({}, s, { self: A.soiMemeNeuf(p.l.c, q, p.t.id, p.t) });
    });
    dernier = "detail";
    rendreDetail();
  }
  $("#d-groups").addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    if (b.hasAttribute("data-qp")) { changerMaison(b.getAttribute("data-qp"), JSON.parse(b.getAttribute("data-v"))); }
    else if (b.hasAttribute("data-qg")) { changerMaison("garage", Number(b.getAttribute("data-qg"))); }
    else if (b.hasAttribute("data-qk")) {
      var k = b.getAttribute("data-qk"), inp = $('[data-qn="' + k + '"]', b.parentNode);
      var nv = Number(D.maison[k]) + Number(b.getAttribute("data-d"));
      nv = Math.max(Number(inp.min), Math.min(Number(inp.max), nv));
      changerMaison(k, nv);
    }
  });
  $("#d-groups").addEventListener("change", function (e) {
    var t = e.target;
    if (t.hasAttribute("data-qn")) {
      var k = t.getAttribute("data-qn"), v = Math.round(Number(t.value));
      if (!isFinite(v)) { t.value = D.maison[k]; return; }
      v = Math.max(Number(t.min), Math.min(Number(t.max), v));
      changerMaison(k, v);
    } else if (t.hasAttribute("data-qcp")) {
      var cp = t.value.replace(/\D/g, "").slice(0, 5);
      if (/^\d{5}$/.test(cp)) changerMaison("codePostal", cp); else t.value = D.maison.codePostal || "";
    }
  });

  /* ---------- 2. Détaillé : phases et postes ---------- */
  function puLigne(l, t, s) {
    /* Prix unitaire HT en vigueur = ce que le moteur compte pour une quantité de 1. */
    var k = A.key(l.c, t.n);
    var tmp = Object.assign({}, D.sel);
    tmp[k] = Object.assign({}, s || {}, { on: true, manual: true, qty: 1 });
    return A.lineHT(D.ctx, tmp, l, t);
  }
  function chipsVariantes(k, t, s) {
    var h = "";
    var on = s && s.on;
    if (!on) return "";
    function grp(name, opts, cur) {
      return opts.map(function (o) { return '<button type="button" class="chip" data-k="' + esc(k) + '" data-' + name + '="' + esc(o[0]) + '" aria-pressed="' + (cur === o[0] ? "true" : "false") + '">' + esc(o[1]) + "</button>"; }).join("");
    }
    if (t.mat) {
      /* matériau en vigueur, tel que le moteur l'étiquette */
      var lm = A.variantLabel({ mat: true, matDef: t.matDef }, s, D.ctx);
      var m = /alu/.test(lm) ? "alu" : /bois/.test(lm) ? "bois" : "pvc";
      h += grp("mat", [["pvc", "PVC"], ["alu", "Alu"], ["bois", "Bois"]], m);
    }
    if (t.vitrage) h += grp("vit", [["double", "Double vitrage"], ["triple", "Triple vitrage"]], (s && s.vit) || A.DEFAULT_VIT);
    if (t.taille) h += grp("tai", [["petit", "Petit"], ["grand", "Grand"]], (s && s.tai) || A.DEFAULT_TAILLE);
    if (t.vars) t.vars.forEach(function (g) {
      var cur = (s && s.vsel && s.vsel[g.k]) || g.opts[0].k;
      h += g.opts.map(function (o) { return '<button type="button" class="chip" data-k="' + esc(k) + '" data-vg="' + esc(g.k) + '" data-vo="' + esc(o.k) + '" aria-pressed="' + (cur === o.k ? "true" : "false") + '">' + esc(o.label) + "</button>"; }).join("");
    });
    return h ? '<div class="chips">' + h + "</div>" : "";
  }
  function ligneHTML(l, t, devisMap) {
    var k = A.key(l.c, t.n), s = D.sel[k], on = !!(s && s.on);
    if (D.seulementCoches && !on) return "";
    var jal = estJalon(t);
    var li = devisMap[k];
    var auto = A.isAuto(D.ctx, l.c, t.n);
    var manual = !!(s && s.manual);
    var q = A.qtyOf(D.ctx, D.sel, l.c, t);
    var qty;
    if (t.u === "forfait") qty = '<span class="badge b-fix">forfait</span>';
    else if (t.u === "pct") qty = '<span class="badge b-fix">' + n2(t.fp) + " % " + (t.assiette === "projet" || t.frais ? "du projet" : "des travaux") + "</span>";
    else {
      qty = '<input class="qin num' + (manual ? " man" : "") + '" type="number" step="any" min="0" data-q="' + esc(k) + '" value="' + (Math.round(q * 100) / 100) + '" aria-label="Quantité"><span class="unit">' + unite(t.u) + "</span>" +
        (auto ? (manual ? '<button type="button" class="badge b-man" data-auto="' + esc(k) + '" title="Revenir à la quantité calculée">auto</button>' : '<span class="badge b-auto">auto</span>') : "");
    }
    var puTxt;
    if (jal) puTxt = '<span class="badge b-jal">' + IC.flag + "Jalon</span>";
    else if (t.u === "pct") puTxt = eur(puLigne(l, t, s)) + "<small>" + n2(t.fp) + " %</small>";
    else puTxt = eur2(puLigne(l, t, s)) + "<small>HT / " + unite(t.u) + "</small>";
    var possible = A.soiMemeNeuf(l.c, "max", t.id, t);
    var mode = possible
      ? '<div class="seg" role="group" aria-label="Qui réalise"><button type="button" data-self="' + esc(k) + '" data-sv="0" aria-pressed="' + (s && s.self ? "false" : "true") + '">Fait faire</button><button type="button" data-self="' + esc(k) + '" data-sv="1" aria-pressed="' + (s && s.self ? "true" : "false") + '">Je le fais</button></div>'
      : '<span class="na">' + (jal ? "démarche" : "pro") + "</span>";
    var total = jal ? '<span class="tiny">0 €</span>' : on && li ? eur(li.ttc) : '<span class="tiny">—</span>';
    var vl = s && s.on ? A.variantLabel(t, s, D.ctx) : "";
    return '<div class="ligne' + (on ? "" : " off") + (jal ? " jalon-row" : "") + '">' +
      '<span class="c1"><input type="checkbox" class="chk" data-on="' + esc(k) + '"' + (on ? " checked" : "") + ' aria-label="Inclure ' + esc(t.n) + '"></span>' +
      '<div class="nom">' + (jal ? '<span style="color:var(--violet)">' + IC.flag + "</span> " : "") + esc(t.n) + (vl ? '<span class="vl">' + esc(vl) + "</span>" : "") + '<span class="id">' + esc(t.id) + (IDS_NEUF[t.id] ? "" : " · repris de la rénovation") + "</span>" + chipsVariantes(k, t, s) + "</div>" +
      '<div class="qwrap">' + qty + "</div>" +
      '<div class="pu">' + puTxt + "</div>" +
      '<div class="mode">' + mode + "</div>" +
      '<div class="lt2">' + total + "</div></div>";
  }
  var dernierDetail = null;
  function rendreDetail() {
    if (!D.ctx) return;
    rendreQuestions();
    var d = devisDe(D.ctx, D.sel);
    dernierDetail = d;
    var map = {};
    d.lignes.forEach(function (li) { map[li.cle] = li; });
    var ph = parPhase(d);
    var html = PHASES.map(function (p, pi) {
      var blocs = BLOCS.filter(function (b) { return b.l.p === p; });
      var nOn = 0, jalons = [];
      blocs.forEach(function (b) { b.l.t.forEach(function (t) { var s = D.sel[A.key(b.l.c, t.n)]; if (s && s.on) { nOn++; if (estJalon(t)) jalons.push(t); } }); });
      var info = INFO[p] || {};
      var body = blocs.map(function (b) {
        var lt = 0;
        b.l.t.forEach(function (t) { var li = map[A.key(b.l.c, t.n)]; if (li) lt += li.ttc; });
        var rows = b.l.t.map(function (t) { return ligneHTML(b.l, t, map); }).join("");
        if (!rows) return "";
        return '<div class="lot"><div class="lothead"><span class="ln">' + esc(b.l.c) + '</span><span class="lt">' + eur(lt) + "</span></div>" +
          (b.l.note ? '<p class="lotnote">' + esc(b.l.note) + "</p>" : "") +
          '<div class="colhead"><span></span><span>Poste</span><span>Quantité</span><span>Prix unitaire</span><span>Qui</span><span>Total TTC</span></div>' + rows + "</div>";
      }).join("");
      var open = D.ouvertes[p] ? " open" : "";
      return '<details class="card phase" data-phase="' + esc(p) + '"' + open + "><summary>" +
        '<span class="pnum">' + (pi + 1) + "</span>" +
        '<div><div class="ptitle">' + esc(p) + '</div><div class="pjal">' + IC.flag + "<span>" + esc(info.jalon || "") + (jalons.length ? " · " + jalons.length + " démarche" + (jalons.length > 1 ? "s" : "") + " marquée" + (jalons.length > 1 ? "s" : "") : "") + "</span></div></div>" +
        '<div class="ptot">' + eur(ph[p]) + "<small>" + nOn + " poste" + (nOn > 1 ? "s" : "") + " cochés</small></div>" + IC.chev +
        '</summary><div class="pbody">' + (body || '<p class="small" style="margin-top:14px">Aucun poste coché dans cette phase.</p>') + "</div></details>";
    }).join("");
    $("#d-phases").innerHTML = html;
    var t = d.totaux;
    $("#d-bar").innerHTML =
      '<div><div class="tl">Total TTC tout compris</div><div class="tt" id="d-total" data-ttc="' + t.ttc.toFixed(2) + '">' + eur(t.ttc) + '</div><div class="tl">' + eur(t.ttc / D.ctx.surface) + " / m² habitable</div></div>" +
      '<div class="parts"><div>HT<b>' + eur(t.ht) + "</b></div><div>TVA<b>" + eur(t.tva) + "</b></div><div>Aléas " + D.ctx.aleas + " %<b>" + eur(t.aleas) + "</b></div><div>Frais hors TVA<b>" + eur(d.bilan.frais) + "</b></div>" +
      (d.bilan.eco > 0 ? "<div>Main-d'œuvre évitée<b>" + eur(d.bilan.eco) + "</b></div>" : "") + "</div>";
    $("#d-openall").textContent = PHASES.every(function (p) { return D.ouvertes[p]; }) ? "Tout replier" : "Tout déplier";
  }
  $("#d-phases").addEventListener("toggle", function (e) {
    var el = e.target;
    if (el.classList && el.classList.contains("phase")) {
      D.ouvertes[el.getAttribute("data-phase")] = el.open;
      $("#d-openall").textContent = PHASES.every(function (p) { return D.ouvertes[p]; }) ? "Tout replier" : "Tout déplier";
    }
  }, true);
  $("#d-openall").addEventListener("click", function () {
    var tout = PHASES.every(function (p) { return D.ouvertes[p]; });
    PHASES.forEach(function (p) { D.ouvertes[p] = !tout; });
    rendreDetail();
  });
  $("#d-only").addEventListener("change", function (e) { D.seulementCoches = e.target.checked; rendreDetail(); });
  function majSel(k, patch) {
    D.sel[k] = Object.assign({}, D.sel[k] || {}, patch);
    dernier = "detail";
    rendreDetail();
  }
  $("#d-phases").addEventListener("change", function (e) {
    var t = e.target;
    if (t.hasAttribute("data-on")) {
      var k = t.getAttribute("data-on"), p = PAR_CLE[k];
      /* cocher un poste décoche les autres postes de son groupe (deux couvertures ne coexistent pas) */
      D.sel = A.cocherPosteNeuf(D.sel, p.t.id, t.checked, D.qui);
      dernier = "detail";
      rendreDetail();
    } else if (t.hasAttribute("data-q")) {
      var kq = t.getAttribute("data-q"), v = Number(String(t.value).replace(",", "."));
      if (!isFinite(v) || v < 0) { rendreDetail(); return; }
      majSel(kq, { manual: true, qty: v });
    }
  });
  $("#d-phases").addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    var k = b.getAttribute("data-k") || b.getAttribute("data-self") || b.getAttribute("data-auto");
    if (!k) return;
    var s = D.sel[k] || {};
    if (b.hasAttribute("data-self")) majSel(k, { self: b.getAttribute("data-sv") === "1" });
    else if (b.hasAttribute("data-auto")) majSel(k, { manual: false, qty: null });
    else if (b.hasAttribute("data-mat")) majSel(k, { mat: b.getAttribute("data-mat") });
    else if (b.hasAttribute("data-vit")) majSel(k, { vit: b.getAttribute("data-vit") });
    else if (b.hasAttribute("data-tai")) majSel(k, { tai: b.getAttribute("data-tai") });
    else if (b.hasAttribute("data-vg")) {
      var vs = Object.assign({}, s.vsel || {}); vs[b.getAttribute("data-vg")] = b.getAttribute("data-vo");
      majSel(k, { vsel: vs });
    }
  });

  /* ---------- 3. Étapes ---------- */
  var NOMS = { pp: "plain-pied", etage: "à étage", combles: "combles aménagés" };
  function rendreEtapes() {
    var useR = dernier === "rapide" && dernierRapide;
    var d, ctx;
    if (useR) { d = dernierRapide.d; ctx = dernierRapide.p.ctx; } else { d = dernierDetail || devisDe(D.ctx, D.sel); ctx = D.ctx; }
    var m = ctx.neuf, g = A.geometrieNeuf(m), ph = parPhase(d);
    $("#e-maison").innerHTML = "Pour " + (useR ? "ta maison de l'estimation rapide" : "ta maison de l'estimation détaillée") + " : " + NOMS[m.niveaux] + " <span class=\"num\">" + m.surface + "</span> m², " + m.chambres + " chambres, " + (m.murs === "ossature" ? "ossature bois" : "murs " + m.murs) + ", code postal <span class=\"num\">" + esc(m.codePostal || "—") + "</span>. Montants TTC hors aléas, durées de repère de la conception.";
    $("#e-strip").innerHTML =
      '<div class="card"><div class="v">' + eur(d.totaux.ttc) + '</div><div class="l">total TTC, aléas compris</div></div>' +
      '<div class="card"><div class="v">5 à 6 mois</div><div class="l">permis + purge, avant le premier coup de pelle</div></div>' +
      '<div class="card"><div class="v">≈ ' + g.moisChantier + ' mois</div><div class="l">de chantier pour cette maison (10 à 12 en traditionnel, 6 à 8 en ossature bois)</div></div>' +
      '<div class="card"><div class="v">' + eur(d.totaux.aleas) + '</div><div class="l">provision pour aléas (' + ctx.aleas + " %), non répartie</div></div>";
    $("#e-timeline").innerHTML = PHASES.map(function (p, i) {
      var info = INFO[p] || { dem: [] };
      return '<div class="step"><div class="dot">' + (i + 1) + '</div><div class="card stepc">' +
        '<div class="stephead"><h3 style="margin:0;font-size:16px">' + esc(p) + '</h3><span class="ptot">' + eur(ph[p]) + "</span></div>" +
        '<p class="small" style="margin:6px 0 0">' + esc(info.quoi || "") + "</p>" +
        '<div class="meta"><span class="m j">' + IC.flag + esc(info.jalon || "") + '</span><span class="m">' + IC.clock + esc(info.duree || "") + "</span></div>" +
        (info.dem && info.dem.length ? '<ul class="dem">' + info.dem.map(function (x) { return '<li><span class="w">' + esc(x[0]) + "</span><span>" + esc(x[1]) + "</span></li>"; }).join("") + "</ul>" : "") +
        "</div></div>";
    }).join("");
  }

  /* ---------- 4. Prix & sources ---------- */
  var CTX_STD = A.ctxNeuf(A.maisonParDefaut(100), { finition: "standard", codePostal: "" });
  function prixStandard(l, t) {
    var k = A.key(l.c, t.n), sel = {};
    sel[k] = { on: true, manual: true, qty: 1 };
    return A.lineHT(CTX_STD, sel, l, t);
  }
  var F = { kind: "neuf", phase: "" };
  function hote(u) { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return "source"; } }
  function confBadge(c) {
    if (!c) return "";
    var base = c.indexOf("haute") === 0 ? "haute" : c.indexOf("basse") === 0 ? "basse" : "moyenne";
    return '<span class="conf c-' + base + '">' + esc(c) + "</span>";
  }
  function prixCell(v, frais) { return v == null ? '<span class="tiny">—</span>' : (frais && v < 100 ? n2(v) + " €" : eur2(v)); }
  function rendrePrix() {
    $("#f-phase").innerHTML = ['<button class="pill" type="button" data-ph="" aria-pressed="' + (F.phase === "" ? "true" : "false") + '">Toutes les phases</button>'].concat(PHASES.map(function (p, i) {
      return '<button class="pill" type="button" data-ph="' + esc(p) + '" aria-pressed="' + (F.phase === p ? "true" : "false") + '"><span class="num">' + (i + 1) + "</span> " + esc(p) + "</button>";
    })).join("");
    var rows = [], n = 0;
    BLOCS.forEach(function (b) {
      if (F.phase && b.l.p !== F.phase) return;
      b.l.t.forEach(function (t) {
        var neuf = !!IDS_NEUF[t.id];
        if (F.kind === "neuf" && !neuf) return;
        n++;
        var jal = estJalon(t);
        var info = neuf ? (SRC.nouveaux[t.id] || {}) : (SRC.repris[t.id] || {});
        var std = t.u === "pct" ? n2(t.fp) + " %" : jal ? "" : eur2(prixStandard(b.l, t)) + '<span class="tiny" style="display:block">' + esc(A.variantLabel(t, {}, CTX_STD).replace(/^ \(|\)$/g, "")) + "</span>";
        var fourch = info.f ? '<span class="num">' + NF0.format(info.f[0]) + "–" + NF0.format(info.f[1]) + "</span>" : neuf ? '<span class="tiny">—</span>' : info.m != null ? '<span class="tiny">marché neuf</span> <span class="num">' + NF0.format(info.m) + "</span>" : '<span class="tiny">—</span>';
        var conf = jal ? '<span class="badge b-jal">' + IC.flag + "Jalon</span>" : neuf ? confBadge(info.c) : '<span class="conf c-rep">repris de la rénovation</span>';
        var srcs = info.s || [];
        var srcHTML = srcs.length ? '<div class="srcs">' + srcs.map(function (s, i) { return '<a href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer" title="' + esc(s.r) + '">' + (i + 1) + ". " + esc(hote(s.url)) + "</a>"; }).join("") + "</div>" +
          '<details class="rel"><summary>Relevés' + (info.j ? " et correction v1" : "") + "</summary><ol>" + srcs.map(function (s) { return "<li>" + esc(s.r) + "</li>"; }).join("") + "</ol>" + (info.j ? '<p class="tiny" style="margin:6px 0 0">v1 : ' + esc(info.j) + "</p>" : "") + (!info.j && info.k ? '<p class="tiny" style="margin:6px 0 0">Calcul : ' + esc(info.k) + "</p>" : "") + (info.v && !neuf ? '<p class="tiny" style="margin:6px 0 0">' + esc(info.v) + "</p>" : "") + "</details>"
          : (info.j ? '<span class="tiny">' + esc(info.j) + "</span>" : jal ? '<span class="tiny">Démarche gratuite</span>' : '<span class="tiny">—</span>');
        var corr = SRC.corrections[t.id] ? '<span class="corr">Correction proposée : ' + esc(SRC.corrections[t.id]) + " (non appliquée)</span>" : "";
        rows.push('<div class="prow">' +
          '<div><span class="pn">' + esc(t.n) + '</span><span class="pid">' + esc(t.id) + '</span><span class="plot">' + esc(b.l.p) + " · " + esc(b.l.c) + (t.frais ? " · frais hors TVA" : "") + "</span>" + corr + "</div>" +
          '<div><span class="lab">Unité</span>' + unite(t.u) + "</div>" +
          '<div class="r num"><span class="lab">Fourni-posé HT</span>' + (jal ? "0 €" : t.u === "pct" ? n2(t.fp) + " %" : prixCell(t.fp, t.frais)) + "</div>" +
          '<div class="r num"><span class="lab">Fourniture HT</span>' + prixCell(t.sm, t.frais) + "</div>" +
          '<div class="r num"><span class="lab">Prix standard</span>' + (std || '<span class="tiny">—</span>') + "</div>" +
          '<div class="r"><span class="lab">Fourchette sources</span>' + fourch + "</div>" +
          '<div><span class="lab">Confiance</span>' + conf + "</div>" +
          '<div class="srccell"><span class="lab">Sources</span>' + srcHTML + "</div></div>");
      });
    });
    $("#ptable").innerHTML = '<div class="prow head"><div>Poste</div><div>Unité</div><div class="r">Fourni-posé HT</div><div class="r">Fourniture HT</div><div class="r">Prix standard</div><div class="r">Fourchette</div><div>Confiance</div><div>Sources</div></div>' + rows.join("");
    $("#f-count").textContent = n + " poste" + (n > 1 ? "s" : "");
  }
  $("#f-phase").addEventListener("click", function (e) { var b = e.target.closest("[data-ph]"); if (!b) return; F.phase = b.getAttribute("data-ph"); rendrePrix(); });
  $("#f-kind").addEventListener("click", function (e) {
    var b = e.target.closest("[data-v]"); if (!b) return;
    F.kind = b.getAttribute("data-v");
    $$(".pill", $("#f-kind")).forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
    rendrePrix();
  });

  function rendreDecisions() {
    var corr = [
      ["Enduit monocouche", "28 / 10 → 43 / 19", "A +2 080 · B +3 300", "haute"],
      ["Carrelage au sol", "70 / 30 → 85 / 36", "A +850 · B +1 020 · C +770", "moyenne"],
      ["Porte d'entrée", "1 600 / 1 150 → 2 150 / 1 550", "+340 par maison", "moyenne"],
      ["Porte de garage", "1 200 / 800 → 1 966 / 1 566", "B +660", "moyenne"],
      ["Raccords faîtage / noues", "40 / 15 → 59 / 22", "B +80", "haute"],
      ["Chape liquide", "40 / 20 → 30 / —", "A −790 · B −940 · C −710", "moyenne"],
      ["Cloison", "50 / 20 → 45 / 20", "A −350 · B −370 · C −310", "moyenne"],
      ["Consuel", "180 → 123", "−59", "haute"],
      ["Compteur de chantier Enedis", "250 → 447", "+204", "haute"],
      ["Raccordement Enedis", "2 000 → 1 586", "−428", "haute"],
      ["Micro-station", "12 000 / 6 600 → 9 500 / 5 500", "−2 500 si choisie", "moyenne"],
      ["Raccordement égout", "2 500 → 2 226", "−284", "moyenne"],
      ["Escalier béton", "4 500 → 3 800", "−700 si choisi", "non contre-vérifié"],
      ["Plancher bois", "90 / 45 → 106 / 51", "ossature à étage", "non contre-vérifié"]
    ];
    var html = '<div class="card wide"><h3><span class="i">1</span>Corriger 14 prix repris de la rénovation ?</h3>' +
      '<p class="small" style="margin:0">Postes partagés avec la rénovation, non modifiés. Chaque ligne se décide à part (fourni-posé / fourniture, € HT ; effet en neuf en € HT).</p>' +
      '<div class="scrollx"><table class="mini"><thead><tr><th>Poste</th><th>Aujourd\'hui → proposé</th><th>Effet en neuf</th><th>Fiabilité</th></tr></thead><tbody>' +
      corr.map(function (r) { return "<tr><td>" + esc(r[0]) + '</td><td class="n">' + esc(r[1]) + '</td><td class="n">' + esc(r[2]) + "</td><td>" + esc(r[3]) + "</td></tr>"; }).join("") +
      '</tbody></table></div><p class="small" style="margin:8px 0 0">Si tout est validé : A <b class="num">+2 020 €</b> TTC (+1 %), B <b class="num">+4 530 €</b> (+2 %), C <b class="num">−620 €</b>.</p></div>';
    var cartes = [
      ["2", "Raccordement Enedis en lotissement", ["<span class=\"opt\">A :</span> variante « coffret déjà posé » (≈ 358 € HT au lieu de 2 000 €, soit −1 640 € HT par maison), après vérification du barème Enedis.", "<span class=\"opt\">B :</span> garder un seul prix."]],
      ["3", "Aléas : 7 % ou 10 % en neuf ?", ["A : <span class=\"num\">246 760 € → 252 150 €</span>", "B : <span class=\"num\">314 750 € → 321 600 €</span>", "C : <span class=\"num\">245 320 € → 250 680 €</span>", "<span class=\"opt\">Proposition : 10 %</span> (recherche 10-15 %, deux jurys). Cette maquette utilise le réglage actuel du moteur : <span class=\"num\">" + CTX_STD.aleas + " %</span>."]],
      ["4", "« Je fais le maximum » en neuf", ["<span class=\"opt\">A (proposée) :</span> structure, clos-couvert, raccordements et PAC toujours faits par des pros : A passe à <span class=\"num\">1 555 €/m²</span> (−25 %), dans le repère de l'auto-construction (1 200-1 600 €/m²).", "<span class=\"opt\">B :</span> tout compter au prix des matériaux (958 €/m², trop bas).", "Le moteur embarqué applique déjà l'option A."]],
      ["5", "Aménagements extérieurs", ["<span class=\"opt\">A :</span> hors périmètre, avec un message clair (8 000 à 20 000 €). C'est ce que fait cette maquette.", "<span class=\"opt\">B :</span> un lot optionnel « Extérieurs », à sourcer (sauf les portails, déjà au catalogue)."]],
      ["6", "Réglages par défaut de la toiture", ["Tuile béton au lieu de terre cuite : <span class=\"num\">−5 540 €</span> sur A (prix non revérifié).", "Gouttière PVC au lieu de zinc : <span class=\"num\">−980 €</span>.", "Pente faible (17°) dans le Sud : <span class=\"num\">−7 800 €</span> ; liste des départements « tuile canal » à fixer."]],
      ["7", "Dalle isolée + plancher chauffant", ["<span class=\"opt\">A (actuelle) :</span> garder les deux isolants (le panneau est exigé par le DTU).", "<span class=\"opt\">B :</span> demander 2-3 devis pour une variante « dalle non isolée + panneau épais » : gain possible 1 500 à 2 500 € sur A, non sourcé."]],
      ["8", "Postes non chiffrés : sourcer ou afficher « non compris » ?", ["Enduit plâtre intérieur sur monomur / béton cellulaire 30 : 1 500 à 5 000 € (plan B : « Doubler un mur », 3 110 €).", "Anti-termites ≈ 600 € · RC maître d'ouvrage + TRC ≈ 500-800 € · peinture des portes 300-600 €.", "Sans prix : câble coffret → tableau, niche de coffret, planche de rive, marche ou perron, garde-corps de fenêtres d'étage, porte isolante garage → maison."]],
      ["9", "Prix nouveaux restés incertains", ["Plancher chauffant 55 € HT/m² (bas de fourchette, jusqu'à +2 800 € sur A).", "Surcoût sol argileux 12 500 € (une seule source) · dommages-ouvrage 3,5 % (sources de 0,5 à 7 %) · fosse 8 400 €.", "Aussi : tuile béton, ardoise fibres-ciment, gouttière alu, sous-face bois, semelle isolée, clôture de chantier, fouilles en pleine masse."]],
      ["10", "Texte de précision à afficher", ["<blockquote>« Estimation à ± 10 % des coûts moyens constatés en France pour une maison simple (enquête officielle SDES 2024). Votre terrain, votre région et vos devis feront la différence. Hors terrain, notaire et aménagements extérieurs. »</blockquote>", "Calage : A +2 %, B sans garage 0 % du repère. C (ossature bois) +13 % : pas de précision affichée pour l'ossature bois."]]
    ];
    html += cartes.map(function (c) {
      return '<div class="card"><h3><span class="i">' + c[0] + "</span>" + esc(c[1]) + "</h3><ul>" + c[2].map(function (x) { return x.indexOf("<blockquote>") === 0 ? "<li style=\"list-style:none;margin-left:-18px\">" + x + "</li>" : "<li>" + x + "</li>"; }).join("") + "</ul></div>";
    }).join("");
    $("#dec").innerHTML = html;
  }

  /* ---------- Démarrage ---------- */
  $("#f-aleas").textContent = CTX_STD.aleas;
  chargerDetail(R);
  D.ouvertes[PHASES[0]] = true;
  syncRapideForm();
  rendreRapide();
  rendreDetail();
  rendrePrix();
  rendreDecisions();
  var onglet = "rapide";
  try { onglet = localStorage.getItem("avyora-neuf-onglet") || "rapide"; } catch (e) { onglet = "rapide"; }
  ouvrir(onglet);
  window.__maquette = { R: R, D: D, devisRapide: function () { return dernierRapide; }, devisDetail: function () { return dernierDetail; } };
})();
