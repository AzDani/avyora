/* Les bureaux sont faits pour l'ordinateur. Sur un téléphone ou une tablette, on n'ouvre pas la scène 3D (trop lourde, elle ferait
   ramer l'appareil) : aucun modèle n'est téléchargé, rien n'est dessiné, on affiche un mot à la place. (?force=1 pour essayer quand même.) */
const TELEPHONE = !/[?&]force=1/.test(location.search) && (/[?&]tel=1/.test(location.search) || Math.min(screen.width, screen.height) < 600 || (matchMedia("(pointer: coarse)").matches && matchMedia("(hover: none)").matches));
/* ───────────────────────── Maquette ou site ─────────────────────────
   Dans la maquette (l'artefact), tout ce qui suit est donné en EXEMPLE. Sur le site (/admin/bureaux), la page porte l'adresse des
   vraies données (data-source) : elles remplacent les exemples AVANT que l'étage se construise, et se relisent chaque minute.
   Si la lecture échoue à l'ouverture, les bureaux ne s'ouvrent pas : jamais d'exemple présenté comme du vrai. */
const APP = document.querySelector(".app"), SOURCE = APP.dataset.source || "";
const net = (t) => String(t == null ? "" : t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));   // tout ce qui vient du site est du texte, jamais du HTML
/* ───────────────────────── Les pièces et leurs données d'EXEMPLE ───────────────────────── */
const ETATS = { critique: "À traiter maintenant", attention: "À surveiller", bon: "Tout est à jour", vide: "Pas encore en service" };
const PIECES = [
  { id: "accueil", nom: "Accueil", sur: "Visiteurs en direct", x0: -10, x1: 8, z0: 10, z1: 21, sol: 0xe6c79c, etat: "bon", nb: 7,
    kpis: [["En ce moment", "7"], ["Aujourd'hui", "212"], ["Inscrits du jour", "4"]],
    titre: "Où ils sont", liste: [["Estimation rénovation", "3 visiteurs", "bon", "en direct"], ["Plan 3D", "2 visiteurs", "bon", "en direct"], ["Prix par ville · Bordeaux", "1 visiteur", "bon", "en direct"], ["Accompagnement", "1 visiteur", "attention", "à convertir"]],
    conseil: "Les visiteurs restent anonymes : tu vois les pages, jamais les personnes." },
  { id: "accompagnement", nom: "Bureau Accompagnement", sur: "Ce qui rapporte", x0: 8, x1: 16, z0: -2, z1: 8, sol: 0xd9b48a, etat: "critique", nb: 3, euro: "297 €",
    kpis: [["Rappels à faire", "3"], ["Avis à 99 €", "2"], ["Attente max", "3 j"]],
    titre: "À rappeler", liste: [["Julie M.", "Rappel demandé il y a 3 jours", "critique", "en retard"], ["Karim B.", "Avis avant achat · 99 €", "attention", "à appeler"], ["Sophie L.", "Relecture de devis", "attention", "à appeler"]],
    conseil: "Un rappel qui attend, c'est une vente qui refroidit. <b>Commence ici.</b>" },
  { id: "reunion", nom: "Salle de réunion", sur: "Le planning", x0: 8, x1: 14, z0: 16.6, z1: 21, sol: 0xd9c2a0, etat: "attention", nb: 0,
    kpis: [], titre: "Le planning", liste: [],
    conseil: "Un rendez-vous confirmé, c'est un accompagnement qui se tient : <b>réponds vite aux créneaux en attente.</b>" },
  { id: "projets", nom: "Salle des projets", sur: "Inscrits et estimations", x0: -8, x1: 6, z0: -15, z1: -5, sol: 0xdcb98e, etat: "bon", nb: 31,
    kpis: [["Inscrits", "148"], ["Estimations / 7 j", "31"], ["Sans « Tu es… »", "12"]],
    titre: "Cette semaine", liste: [["Rénovation rapide", "18 estimations", "bon", "en hausse"], ["Rénovation détaillée", "6 estimations", "bon", "stable"], ["Construction neuve", "7 estimations", "bon", "stable"]],
    conseil: "12 comptes n'ont pas encore dit s'ils sont particuliers ou pros." },
  { id: "plan", nom: "Studio Plan 3D", sur: "L'éditeur de plan", x0: 6, x1: 14, z0: -15, z1: -5, sol: 0xcfd6ee, etat: "attention", nb: 9,
    kpis: [["Plans dessinés", "54"], ["Cette semaine", "9"], ["Vers l'estimation", "3"]],
    titre: "Le parcours", liste: [["Plans commencés", "9 cette semaine", "bon", "ok"], ["Plans terminés", "5 cette semaine", "bon", "ok"], ["Estimés depuis le plan", "3 seulement", "attention", "faible"]],
    conseil: "Peu de plans vont jusqu'à l'estimation : <b>c'est le passage à améliorer.</b>" },
  { id: "attente", nom: "Salle d'attente artisans", sur: "Candidatures", x0: -22, x1: -14, z0: -2, z1: 8, sol: 0xe9d7b5, etat: "critique", nb: 4,
    kpis: [["À examiner", "4"], ["À compléter", "2"], ["Attente max", "6 j"]],
    titre: "Ils attendent ta réponse", liste: [["Maçonnerie Durand", "Gironde · depuis 6 jours", "critique", "à appeler"], ["Élec Martin", "Landes · depuis 4 jours", "attention", "à examiner"], ["Toitures Roy", "Gironde · depuis 2 jours", "attention", "à examiner"], ["Plomberie Faure", "Dordogne · depuis 1 jour", "bon", "nouveau"]],
    conseil: "Un artisan qui attend une semaine va s'inscrire ailleurs." },
  { id: "atelier", nom: "Atelier du réseau", sur: "Artisans validés", x0: -14, x1: -2, z0: -2, z1: 8, sol: 0xd6ad82, etat: "attention", nb: 9,
    kpis: [["Validés", "9"], ["Masqués", "1"], ["Décennales à refaire", "1"]],
    titre: "À surveiller", liste: [["Carrelage Petit", "Décennale expire dans 18 jours", "attention", "à relancer"], ["DLC TRAVAUX", "Masqué du réseau", "vide", "masqué"], ["7 autres artisans", "Dossier à jour", "bon", "ok"]],
    conseil: "Plus d'artisans par département = plus de demandes de devis satisfaites." },
  { id: "devis", nom: "Salle des devis", sur: "Clients et artisans", x0: -2, x1: 8, z0: -2, z1: 8, sol: 0xdfc19a, etat: "attention", nb: 5,
    kpis: [["Demandes en cours", "5"], ["Sans réponse", "2"], ["Avis à modérer", "1"]],
    titre: "En ce moment", liste: [["Rénovation · Bordeaux", "2 artisans sans réponse depuis 4 jours", "attention", "à relancer"], ["Avis de Marc T.", "En attente de ta validation", "attention", "à publier"], ["Extension · Mérignac", "Devis reçu, signature en cours", "bon", "ok"]],
    conseil: "Un avis publié rassure le prochain client : valide-les vite." },
  { id: "bureau", nom: "Ton bureau", sur: "Daniel", x0: 16, x1: 22, z0: -2, z1: 8, sol: 0xc9b6f0, etat: "attention", nb: 8,
    kpis: [["À faire", "8"], ["Qui rapportent", "3"], ["En retard", "1"]],
    titre: "Ta liste, triée par ce qui rapporte", liste: [["Rappeler 3 demandes", "Accompagnement · jusqu'à 297 €", "critique", "1"], ["Examiner 4 candidatures", "Salle d'attente artisans", "attention", "2"], ["Publier 1 avis", "Salle des devis", "attention", "3"], ["Relancer 1 décennale", "Atelier du réseau", "bon", "4"]],
    conseil: "Tu commences par le haut de la liste, tu descends." },
  { id: "marketing", nom: "Marketing", sur: "Agents IA", x0: -22, x1: -8, z0: -15, z1: -5, sol: 0xd9d2f2, etat: "vide", nb: 0,
    kpis: [["Agents actifs", "0"], ["E-mails envoyés", "0"], ["Réponses", "0"]],
    titre: "Une pièce par agent", liste: [["Agent Prospection", "E-mails aux pros du bâtiment", "vide", "à créer"], ["Agent SEO", "Pages et positions Google", "vide", "à créer"], ["Agent Réseaux", "Reels et publications", "vide", "à créer"]],
    conseil: "Les trois cabines sont prêtes : chaque agent y affichera ce qu'il fait." },
  { id: "caisse", nom: "Comptabilité", sur: "Entrées et charges", x0: 8, x1: 14, z0: 10, z1: 16.6, sol: 0xd2e6d6, etat: "attention", nb: 2,
    kpis: [["Entrées du mois", "198 €"], ["Charges fixes", "226 €"], ["Résultat", "− 28 €"]],
    titre: "Ce mois-ci", liste: [["Entrées · Stripe", "2 avis avant achat · 198 €", "bon", "encaissé"], ["Abonnement Claude", "Charge fixe · 180 € par mois", "vide", "payé"], ["Vercel et Supabase", "Hébergement et base · 45 € par mois", "vide", "payé"], ["Nom de domaine", "12 € par an · se renouvelle en juillet", "vide", "payé"], ["Abonnements Pro", "Bêta gratuite jusqu'au 31 décembre", "vide", "en attente"]],
    conseil: "Les charges dépassent encore les entrées : <b>il faut 3 accompagnements par mois pour couvrir les frais.</b>" },
  { id: "archives", nom: "Archives", sur: "Tout l'historique", x0: 14, x1: 22, z0: -15, z1: -5, sol: 0xc8c2b6, etat: "bon", nb: 489,
    kpis: [["Estimations", "412"], ["Demandes de devis", "23"], ["Plans", "54"]],
    titre: "Les rayons", liste: [["Estimations rénovation", "301 dossiers", "bon", "classé"], ["Estimations neuf", "111 dossiers", "bon", "classé"], ["Demandes de devis", "23 dossiers", "bon", "classé"], ["Plans", "54 dossiers", "bon", "classé"]],
    conseil: "Chaque dossier rouvre la vraie fiche dans l'admin." },
];
const PRIORITES = [["accompagnement", "Rappeler 3 demandes d'accompagnement", "jusqu'à 297 €"], ["attente", "Examiner 4 candidatures d'artisans", "réseau"], ["devis", "Publier 1 avis en attente", "confiance"]];
const ICONES = {
  accueil: "M3 13V7l5-4 5 4v6M6.5 13V9.5h3V13", accompagnement: "M3 9a5 5 0 0 1 10 0M3 9v2.5h2V9M13 9v2.5h-2V9M11 11.5c0 1.2-1.2 2-3 2",
  projets: "M2.5 4.5h4l1.2 1.5h5.8v6.5h-11z", plan: "M2.5 2.5h11v11h-11zM2.5 8h5V2.5M7.5 8v5.5M10 8h3.5",
  attente: "M8 2.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM8 5v3.2l2 1.3", atelier: "M3 11.5h10M4 11.5a4 4 0 0 1 8 0M8 5V3.5M5.2 6.2l-1-1M10.8 6.2l1-1",
  devis: "M4 1.8h5.2L12.5 5v9.2H4V1.8ZM9 1.8V5h3.5M6.2 8.2h4.1M6.2 10.8h4.1", bureau: "M8 8a2.6 2.6 0 1 0 0-5.2A2.6 2.6 0 0 0 8 8ZM3 13.5a5 5 0 0 1 10 0",
  marketing: "M3 10V6l7-3v10l-7-3ZM10 6.2c1.6.3 2.6 1 2.6 1.8s-1 1.5-2.6 1.8M5 10.5V13", caisse: "M2.5 5h11v7h-11zM2.5 7.5h11M5 10h2",
  archives: "M3 3h10v3H3zM3.8 6v7h8.4V6M6.5 8.5h3", reunion: "M3 4h10v9.5H3zM3 7h10M5.5 2.5v3M10.5 2.5v3M5.6 9.6h1.6M8.8 9.6h1.6",
};
const parId = Object.fromEntries(PIECES.map((p) => [p.id, p]));

/* ───────────────────────── Les agents IA : un par pièce, chacun sa mission (données d'EXEMPLE) ─────────────────────────
   Le manager de tous les agents, c'est Daniel : « Ton bureau » n'a donc pas d'agent, il affiche le tableau de bord de l'équipe.
   etat : travail (il a du travail en cours) · attend (il a fini sa part, il attend ta décision) · repos (rien à faire) · creer (pas encore construit).
   Une tâche : [quoi, détail, couleur de la pastille, où elle en est]. */
const ETATS_AGENT = { travail: ["Au travail", "bon", "au travail"], attend: ["T'attend", "attention", "t'attendent"], repos: ["Au repos", "vide", "au repos"], creer: ["À créer", "vide", "à créer"] };   // [pastille, couleur, mot du bilan]
const AGENTS = {
  accueil: { nom: "Agent Accueil", role: "Regarde qui entre, d'où il vient et à quelle page il repart.", etat: "travail", fait: "Compte les visiteurs en direct",
    taches: [["Résumé du trafic du jour", "Envoyé chaque soir sur ton bureau", "bon", "prévu 19 h"], ["Page qui fait partir", "Prix par ville · Bordeaux : 1 visiteur sur 2 s'en va", "attention", "à regarder"], ["Alerte de pic", "Te prévient si le trafic double", "vide", "en veille"]],
    limite: "Il observe. Il ne contacte personne et ne voit jamais qui est le visiteur." },
  accompagnement: { nom: "Agent Rappels", role: "Avant l'appel, il prépare la fiche du client. Après, il écrit le compte rendu depuis l'enregistrement et l'envoie par e-mail.", etat: "attend", fait: "3 fiches prêtes, 1 compte rendu à relire",
    taches: [["Fiche de Julie M.", "Son projet, son estimation, sa question", "critique", "prête · à appeler"], ["Fiche de Karim B.", "Avis avant achat · 99 €", "attention", "prête"], ["Fiche de Sophie L.", "Relecture de devis", "attention", "prête"],
      ["Compte rendu · appel de Thomas R.", "Écrit depuis l'enregistrement · à relire", "attention", "t'attend"], ["Compte rendu · appel de Léa D.", "Ce qu'on s'est dit, ce qu'il lui reste à faire", "bon", "envoyé par e-mail"]],
    limite: "C'est toi qui appelles. Le client est prévenu que l'appel est enregistré, et le compte rendu part après ta relecture." },
  reunion: { nom: "Agent Agenda", role: "Ton secrétaire : il cale les rendez-vous, envoie les rappels et prépare chaque appel.", etat: "travail", fait: "", taches: [],
    fixes: [["Rappel au client", "Un e-mail la veille de chaque rendez-vous", "bon", "en cours"], ["Fiche avant l'appel", "Demandée à l'Agent Rappels pour chaque rendez-vous", "bon", "en cours"], ["Après l'appel", "Transmet l'enregistrement pour le compte rendu", "vide", "en veille"]],
    limite: "Il propose des créneaux dans tes disponibilités, à ton heure à toi. Il ne déplace et n'annule aucun rendez-vous sans toi." },
  projets: { nom: "Agent Projets", role: "Suit les inscrits et leurs estimations, repère ceux qui s'arrêtent en route.", etat: "travail", fait: "Classe les 31 estimations de la semaine",
    taches: [["Classer les estimations", "31 cette semaine, par type de projet", "bon", "en cours"], ["Comptes sans « Tu es… »", "12 comptes · message de relance rédigé", "attention", "attend ton accord"], ["Estimations abandonnées", "Te signale celles arrêtées à la dernière étape", "vide", "en veille"]],
    limite: "Aucun e-mail ne part sans ton accord sur le texte." },
  plan: { nom: "Agent Plans", role: "Te prévient à chaque nouveau plan et aide ceux qui bloquent à aller jusqu'à l'estimation.", etat: "travail", fait: "Surveille 9 plans en cours",
    taches: [["Nouveaux plans", "9 cette semaine · un mot sur ton bureau à chaque plan terminé", "bon", "en cours"], ["Plans arrêtés en route", "4 plans sans visite depuis 3 jours", "attention", "à relancer"], ["Du plan à l'estimation", "3 sur 9 seulement : il cherche où ça coince", "attention", "en cours"]],
    limite: "Il ne touche jamais au plan d'un utilisateur." },
  attente: { nom: "Agent Candidatures", role: "Contrôle chaque dossier d'artisan avant qu'il arrive sur ton bureau.", etat: "attend", fait: "2 dossiers contrôlés, prêts pour toi",
    taches: [["Maçonnerie Durand", "SIRET et décennale vérifiés", "critique", "attend ta décision"], ["Toitures Roy", "Dossier complet", "attention", "attend ta décision"], ["Élec Martin", "Attestation illisible · pièce redemandée", "attention", "en cours"], ["Plomberie Faure", "Contrôle du SIRET", "bon", "en cours"]],
    limite: "La validation reste à toi : il ne valide et ne refuse jamais seul." },
  atelier: { nom: "Agent Réseau", role: "Veille sur les artisans validés : décennales, fiches, réponses aux clients.", etat: "travail", fait: "Relance 1 décennale qui expire",
    taches: [["Carrelage Petit", "Décennale à refaire · relance envoyée", "attention", "en cours"], ["Fiches sans photo", "2 artisans à relancer", "bon", "en cours"], ["Départements vides", "Landes : 1 seul artisan", "attention", "à signaler"]],
    limite: "Il ne masque et ne retire aucun artisan sans toi." },
  devis: { nom: "Agent Devis", role: "Suit chaque demande de devis jusqu'à la réponse de l'artisan, et trie les avis.", etat: "attend", fait: "1 avis trié, prêt à publier",
    taches: [["Avis de Marc T.", "Rien à signaler dans le texte", "attention", "attend ta décision"], ["Rénovation · Bordeaux", "2 artisans relancés", "attention", "en cours"], ["Extension · Mérignac", "Suit la signature du devis", "bon", "en cours"]],
    limite: "Il ne publie aucun avis et ne choisit pas l'artisan à la place du client." },
  marketing: { nom: "Agent Prospection", role: "Trouve des pros du bâtiment, leur écrit, et te remonte ceux qui répondent.", etat: "creer", fait: "Pas encore construit",
    taches: [["Chercher les pros à contacter", "Par métier et par département", "vide", "à créer"], ["Écrire et envoyer les e-mails", "Tu valides le modèle avant le premier envoi", "vide", "à créer"], ["Te remonter les réponses", "Chaque réponse arrive sur ton bureau", "vide", "à créer"]],
    limite: "Avant de le créer : une adresse d'envoi séparée du site, pour protéger la réputation de tes e-mails." },
  caisse: { nom: "Agent Comptable", role: "Relie Stripe et tes charges fixes pour te dire chaque mois ce qu'il reste.", etat: "travail", fait: "Tient les comptes du mois",
    taches: [["Entrées Stripe", "2 paiements rapprochés · 198 €", "bon", "fait"], ["Charges fixes du mois", "Claude, Vercel, Supabase, nom de domaine · 226 €", "attention", "en cours"], ["Renouvellements", "Te prévient un mois avant chaque échéance", "vide", "en veille"], ["Paiement échoué", "Te prévient tout de suite", "vide", "en veille"], ["Bilan du mois", "Entrées, charges, résultat · sur ton bureau le 1er", "vide", "prévu le 1er"]],
    limite: "Il lit Stripe et tes factures. Il ne paie, n'encaisse et ne rembourse rien." },
  archives: { nom: "Agent Archives", role: "Range chaque dossier et le retrouve quand tu le demandes.", etat: "repos", fait: "Rien à faire : tout est classé",
    taches: [["Classement", "489 dossiers rangés", "bon", "fait"], ["Résumé de la semaine", "Les chiffres des sept derniers jours", "vide", "prévu lundi"]],
    limite: "Il ne supprime jamais rien." },
};
for (const p of PIECES) p.agent = AGENTS[p.id] || null;

/* ───────────────────────── Le planning des rendez-vous d'accompagnement (EXEMPLE) ─────────────────────────
   Deux semaines : celle en cours et la suivante, calées sur la date du jour. j = nombre de jours depuis le lundi de cette semaine.
   Un rendez-vous passé est « fait » (son compte rendu est envoyé, ou à relire) ; un rendez-vous à venir est confirmé ou à confirmer. */
const RDVS = [
  { j: 0, h: "15:00", qui: "Léa D.", quoi: "Avis avant achat", mode: "par téléphone", sujet: "Maison de 1975 à Pessac : elle hésite à cause de la toiture.", confirme: true, cr: "envoye" },
  { j: 2, h: "14:30", qui: "Thomas R.", quoi: "Relecture de devis", mode: "en visio", sujet: "Deux devis de salle de bains à comparer.", confirme: true },
  { j: 4, h: "16:00", qui: "Karim B.", quoi: "Avis avant achat", mode: "par téléphone", sujet: "Appartement à rénover à Bordeaux, il visite samedi.", confirme: true },
  { j: 7, h: "17:30", qui: "Sophie L.", quoi: "Relecture de devis", mode: "par téléphone", sujet: "Devis d'extension : elle veut savoir si le prix est cohérent.", confirme: true },
  { j: 8, h: "18:00", qui: "Nadia P.", quoi: "Avis avant achat", mode: "en visio", sujet: "Premier achat locatif, budget travaux à cadrer.", confirme: false },
  { j: 10, h: "14:00", qui: "Hugo et Clara V.", quoi: "Point projet", mode: "en visio", sujet: "Rénovation complète en cours : point d'étape.", confirme: true },
  { j: 11, h: "19:00", qui: "Marc T.", quoi: "Avis avant achat", mode: "par téléphone", sujet: "Longère à rénover, gros doute sur l'électricité.", confirme: false },
];
const LUNDI = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d; })();
const jourDu = (n) => { const d = new Date(LUNDI); d.setDate(d.getDate() + n); return d; };
/* Les heures des rendez-vous sont des heures de FRANCE (celles du client). instantParis rend le vrai instant d'une heure de Paris,
   quel que soit le fuseau de l'ordinateur ; heureIci en tire l'heure chez toi, pour afficher les deux côte à côte. */
const fmtParis = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
function instantParis(y, m, d, h, mn) {
  const vise = Date.UTC(y, m, d, h, mn); let t = vise;
  for (let i = 0; i < 2; i++) { const o = {}; for (const p of fmtParis.formatToParts(new Date(t))) o[p.type] = +p.value; t += vise - Date.UTC(o.year, o.month - 1, o.day, o.hour, o.minute); }
  return new Date(t);
}
const quand = (r) => { const d = jourDu(r.j), hm = r.h.split(":"); return instantParis(d.getFullYear(), d.getMonth(), d.getDate(), +hm[0], +hm[1]); };
function heureIci(r) {                                                       // { h: "10:00", jour: "" | "la veille" | "le lendemain" } ; null si ton heure est celle de la France
  const t = quand(r), d = jourDu(r.j), h = String(t.getHours()).padStart(2, "0") + ":" + String(t.getMinutes()).padStart(2, "0"), meme = t.getDate() === d.getDate();
  return h === r.h && meme ? null : { h, jour: meme ? "" : t < d ? "la veille" : "le lendemain" };
}
const passe = (r) => quand(r) < new Date();
/* [couleur de la pastille, mot de la pastille, état du compte rendu] */
const etatRdv = (r) => passe(r) ? (r.cr === "envoye" ? ["vide", "fait", "Envoyé au client par e-mail"] : ["attention", "à relire", "Écrit depuis l'enregistrement, il attend ta relecture"])
  : r.confirme ? ["bon", "confirmé", "Écrit après l'appel"] : ["attention", "à confirmer", "Écrit après l'appel"];
/* Tout ce qui se déduit du planning : les chiffres de la pièce, son état, et le travail de l'agent */
function majReunion() {
  const p = parId.reunion, a = p.agent, attente = RDVS.filter((r) => !passe(r) && !r.confirme), s0 = RDVS.filter((r) => r.j < 7).length;
  p.nb = s0; p.kpis = [["Cette semaine", String(s0)], ["Semaine prochaine", String(RDVS.length - s0)], ["À confirmer", String(attente.length)]];
  p.etat = attente.length ? "attention" : "bon";
  a.etat = attente.length ? "attend" : "travail"; a.fait = attente.length ? attente.length + (attente.length > 1 ? " créneaux" : " créneau") + " à confirmer" : "Planning à jour, rappels programmés";
  a.taches = a.taches.filter((t) => t[3] === "en file").concat(attente.length ? [["Créneaux à confirmer", attente.map((r) => r.qui).join(", "), "attention", "t'attend"]] : [], a.fixes);
}
/* Les vraies données du site : le contenu de chaque pièce, les priorités. Les agents n'existent pas encore : tous « à créer ».
   Chaque texte est échappé ici, une fois pour toutes ; `brut` garde les textes d'origine pour les tableaux dessinés dans la 3D. */
function appliquerDonnees(d) {
  for (const p of PIECES) {
    const v = d && d.pieces && d.pieces[p.id]; if (!v) continue;
    const liste = Array.isArray(v.liste) ? v.liste : [];
    p.etat = ETATS[v.etat] ? v.etat : "vide"; p.nb = +v.nb || 0; p.euro = null; p.gens = Math.max(0, +v.gens || 0);
    p.kpis = (v.kpis || []).map((k) => [net(k[0]), net(k[1])]); p.titre = net(v.titre); p.conseil = net(v.conseil);
    p.liste = liste.map((l) => [net(l[0]), net(l[1]), ETATS[l[2]] ? l[2] : "vide", net(l[3])]); p.brut = liste.map((l) => [String(l[0]), String(l[1]), ETATS[l[2]] ? l[2] : "vide", String(l[3])]);
    p.lien = typeof v.lien === "string" && /^\/admin(\/[a-z-]+)*$/.test(v.lien) ? v.lien : null;
  }
  if (d && Array.isArray(d.priorites)) { PRIORITES.length = 0; for (const r of d.priorites) if (parId[r[0]]) PRIORITES.push([r[0], net(r[1]), net(r[2])]); }
}
async function lireDonnees() {
  if (!SOURCE) return false;
  const r = await fetch(SOURCE, { credentials: "same-origin", cache: "no-store" });
  if (!r.ok) throw new Error(r.status === 401 || r.status === 403 ? "cette page est réservée à l'admin" : "les données du site n'ont pas pu être lues (" + r.status + ")");
  appliquerDonnees(await r.json()); return true;
}
if (SOURCE) {
  RDVS.length = 0;                                                           // le planning se branche à l'étape suivante : aucun rendez-vous d'exemple sur le site
  for (const p of PIECES) { const a = p.agent; if (!a) continue; a.etat = "creer"; a.fait = "Pas encore construit"; a.taches = (a.fixes || (p.id === "marketing" ? a.taches : [])).map((t) => [t[0], t[1], "vide", "à créer"]); }   // (les tâches d'exemple citent des noms inventés : sur le site, on ne garde que les missions générales)
  document.getElementById("retour").hidden = false; const e = document.getElementById("exemple"); e.textContent = "Lecture des données…"; e.className = "exemple";
} else majReunion();
function listeTelephone() { document.getElementById("tel-priorites").innerHTML = PRIORITES.map((r, i) => "<li><i>" + (i + 1) + "</i><span>" + r[1] + "</span><b>" + r[2] + "</b></li>").join(""); }
if (!SOURCE) listeTelephone();
if (TELEPHONE) { document.querySelector(".corps").hidden = true; document.getElementById("telephone").hidden = false; for (const id of ["miami", "ensemble"]) document.getElementById(id).hidden = true; window.__pret = true;
  if (SOURCE) lireDonnees().then(listeTelephone).catch(() => { document.querySelector("#telephone h3").hidden = true; }); }
else {
