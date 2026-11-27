/* Fichier écrit par maquettes/bureaux/assembler.mjs : ne pas le modifier à la main. */
"use strict";
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
  { id: "serveurs", nom: "Salle des serveurs", sur: "Vercel et Supabase", x0: 14, x1: 20, z0: 16.6, z1: 21, sol: 0xc9ccd4, etat: "bon", nb: 31,
    kpis: [["Photos et fichiers", "31 %"], ["Base de données", "24 %"], ["Comptes actifs ce mois", "0 %"]],
    titre: "Supabase gratuit · Vercel gratuit", liste: [],
    jauges: [{ hote: "Supabase", nom: "Photos et fichiers", part: 0.31, texte: "312 Mo sur 1 Go · 418 fichiers" }, { hote: "Supabase", nom: "Base de données", part: 0.24, texte: "120 Mo sur 500 Mo" },
      { hote: "Supabase", nom: "Comptes actifs ce mois", part: 0.003, texte: "148 sur 50 000 · connectés depuis 30 jours" }, { hote: "Supabase", nom: "Données envoyées", part: null, texte: "Limite 5 Go par mois · clé d'accès à créer" },
      { hote: "Vercel", nom: "Données envoyées", part: null, texte: "Limite 100 Go par mois · clé d'accès à créer" }],
    conseil: "Vercel gratuit interdit l'usage commercial : AVYORA vend, le passage en Pro est à faire même si les jauges sont vertes." },
];
const PRIORITES = [["accompagnement", "Rappeler 3 demandes d'accompagnement", "jusqu'à 297 €"], ["attente", "Examiner 4 candidatures d'artisans", "réseau"], ["devis", "Publier 1 avis en attente", "confiance"]];
const ICONES = {
  accueil: "M3 13V7l5-4 5 4v6M6.5 13V9.5h3V13", accompagnement: "M3 9a5 5 0 0 1 10 0M3 9v2.5h2V9M13 9v2.5h-2V9M11 11.5c0 1.2-1.2 2-3 2",
  projets: "M2.5 4.5h4l1.2 1.5h5.8v6.5h-11z", plan: "M2.5 2.5h11v11h-11zM2.5 8h5V2.5M7.5 8v5.5M10 8h3.5",
  attente: "M8 2.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM8 5v3.2l2 1.3", atelier: "M3 11.5h10M4 11.5a4 4 0 0 1 8 0M8 5V3.5M5.2 6.2l-1-1M10.8 6.2l1-1",
  devis: "M4 1.8h5.2L12.5 5v9.2H4V1.8ZM9 1.8V5h3.5M6.2 8.2h4.1M6.2 10.8h4.1", bureau: "M8 8a2.6 2.6 0 1 0 0-5.2A2.6 2.6 0 0 0 8 8ZM3 13.5a5 5 0 0 1 10 0",
  marketing: "M3 10V6l7-3v10l-7-3ZM10 6.2c1.6.3 2.6 1 2.6 1.8s-1 1.5-2.6 1.8M5 10.5V13", caisse: "M2.5 5h11v7h-11zM2.5 7.5h11M5 10h2",
  archives: "M3 3h10v3H3zM3.8 6v7h8.4V6M6.5 8.5h3", serveurs: "M3 2.5h10v4.5H3zM3 9h10v4.5H3zM5.3 4.75h.01M5.3 11.25h.01M8 4.75h3M8 11.25h3", reunion: "M3 4h10v9.5H3zM3 7h10M5.5 2.5v3M10.5 2.5v3M5.6 9.6h1.6M8.8 9.6h1.6",
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
  serveurs: { nom: "Agent Serveurs", role: "Surveille les limites de Vercel et de Supabase, et te prévient avant qu'une fonction du site s'arrête.", etat: "travail", fait: "Surveille 5 jauges",
    taches: [["Relever les jauges", "Fichiers, base, comptes actifs · toutes les 10 minutes", "bon", "en cours"], ["Alerte à 85 %", "Passe en tête de tes priorités", "vide", "en veille"], ["Données envoyées", "Attend les clés d'accès de Vercel et de Supabase", "vide", "à brancher"]],
    fixes: [["Relever les jauges", "Fichiers, base, comptes actifs · toutes les 10 minutes", "bon", "en cours"], ["Alerte à 85 %", "Passe en tête de tes priorités", "vide", "en veille"]],
    limite: "Il lit les compteurs. Il ne change jamais d'abonnement et ne paie rien." },
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
const etatRdv = (r) => passe(r) ? (r.cr === "envoye" ? ["vide", "fait", "Envoyé au client par e-mail"] : r.cr === "aucun" ? ["vide", "passé", "Pas encore de compte rendu"] : ["attention", "à relire", "Écrit depuis l'enregistrement, il attend ta relecture"])
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
    p.etat = ETATS[v.etat] ? v.etat : "vide"; p.nb = +v.nb || 0; p.euro = null; p.foule = Math.max(0, +v.gens || 0);   // (pas « p.gens » : les déplacements y rangent la LISTE des personnes de la pièce)
    p.kpis = (v.kpis || []).map((k) => [net(k[0]), net(k[1])]); p.titre = net(v.titre); p.conseil = net(v.conseil);
    p.liste = liste.map((l) => [net(l[0]), net(l[1]), ETATS[l[2]] ? l[2] : "vide", net(l[3])]); p.brut = liste.map((l) => [String(l[0]), String(l[1]), ETATS[l[2]] ? l[2] : "vide", String(l[3])]);
    p.jauges = Array.isArray(v.jauges) ? v.jauges.map((j) => ({ hote: net(j.hote), nom: net(j.nom), texte: net(j.texte), brut: [String(j.hote), String(j.nom), String(j.texte)], part: typeof j.part === "number" && isFinite(j.part) ? Math.max(0, j.part) : null })) : p.jauges;
    p.lien = typeof v.lien === "string" && /^\/admin(\/[a-z-]+)*$/.test(v.lien) ? v.lien : null;
  }
  if (d && Array.isArray(d.rdvs)) { RDVS.length = 0; for (const r of d.rdvs) RDVS.push({ j: +r.j || 0, h: /^\d\d:\d\d$/.test(r.h) ? r.h : "00:00", qui: net(r.qui), quoi: net(r.quoi), mode: net(r.mode), sujet: net(r.sujet), confirme: !!r.confirme, cr: r.cr === "envoye" || r.cr === "a_relire" ? r.cr : "aucun" }); }
  if (d && d.agents && typeof d.agents === "object") for (const id of Object.keys(d.agents)) {          // les agents qui travaillent déjà pour de vrai
    const p = parId[id], v = d.agents[id]; if (!p || !p.agent || !v || !ETATS_AGENT[v.etat]) continue;
    p.agent.etat = v.etat; p.agent.fait = net(v.fait); p.agent.taches = (Array.isArray(v.taches) ? v.taches : []).map((l) => [net(l[0]), net(l[1]), ETATS[l[2]] ? l[2] : "vide", net(l[3])]);
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
  RDVS.length = 0;                                                           // sur le site, les rendez-vous viennent du planning de l'admin (jamais ceux d'exemple)
  for (const p of PIECES) { const a = p.agent; if (!a) continue;
    if (p.id === "serveurs") { a.taches = a.fixes; a.fait = "Relève les jauges toutes les 10 minutes"; continue; }   // le relevé des jauges, lui, fonctionne déjà (sans IA)
    a.etat = "creer"; a.fait = "Pas encore construit"; a.taches = (a.fixes || (p.id === "marketing" ? a.taches : [])).map((t) => [t[0], t[1], "vide", "à créer"]); }   // (les tâches d'exemple citent des noms inventés : sur le site, on ne garde que les missions générales)
  document.getElementById("retour").hidden = false; const e = document.getElementById("exemple"); e.textContent = "Lecture des données…"; e.className = "exemple";
} else majReunion();
function listeTelephone() { document.getElementById("tel-priorites").innerHTML = PRIORITES.map((r, i) => "<li><i>" + (i + 1) + "</i><span>" + r[1] + "</span><b>" + r[2] + "</b></li>").join(""); }
if (!SOURCE) listeTelephone();
if (TELEPHONE) { document.querySelector(".corps").hidden = true; document.getElementById("telephone").hidden = false; for (const id of ["miami", "ensemble"]) document.getElementById(id).hidden = true; window.__pret = true;
  if (SOURCE) lireDonnees().then(listeTelephone).catch(() => { document.querySelector("#telephone h3").hidden = true; }); }
else {
/* ───────────────────────── La scène : le 25e étage d'une tour, à Miami ───────────────────────── */
const canvas = document.getElementById("c"), boite = document.getElementById("scene");
const calme = matchMedia("(prefers-reduced-motion: reduce)").matches;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
/* La finesse du rendu : au plus 1,5 pixel par point, et au plus ~3,7 millions de pixels dessinés. En pleine fenêtre sur un grand écran
   Retina, la densité native (×2) faisait dessiner 4 fois plus de pixels que dans l'aperçu : la carte graphique pouvait lâcher (27/11/2026). */
const PIXELS_MAX = 3.7e6;
function finesse(w, h) { return Math.max(0.75, Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(PIXELS_MAX / Math.max(1, w * h)))); }
renderer.setPixelRatio(finesse(canvas.clientWidth || innerWidth, canvas.clientHeight || innerHeight));
/* Si la 3D s'arrête (carte graphique saturée, erreur en cours de route), on le DIT à l'écran au lieu de laisser une image figée. */
function panne(texte) {
  if (document.getElementById("panne")) return;
  const d = document.createElement("div"); d.id = "panne"; d.className = "panne"; d.setAttribute("role", "alert");
  d.innerHTML = "<p></p><button type=\"button\">Recharger</button>"; d.querySelector("p").textContent = texte; d.querySelector("button").onclick = () => location.reload();
  (document.getElementById("scene") || document.body).appendChild(d); window.__erreur = window.__erreur || texte;
}
canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); panne("La 3D s'est arrêtée : la carte graphique de cet ordinateur a été saturée. Ferme d'autres onglets lourds, puis recharge."); });
window.addEventListener("error", (e) => { if (document.getElementById("chargement").hidden) panne("La 3D s'est arrêtée sur une erreur : " + (e.message || "inconnue")); });
window.addEventListener("unhandledrejection", (e) => { if (document.getElementById("chargement").hidden) panne("La 3D s'est arrêtée sur une erreur : " + String(e.reason && e.reason.message || e.reason)); });
/* Le rendu. Les ombres en « PCFSoft » : des bords lissés, sans les hachures que donnait le mode au flou réglable. La courbe « ACES » donne
   des blancs qui ne brûlent pas ; l'exposition est fixée par l'ambiance (voir « Le ciel »). */
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.9;
const ANISO = renderer.capabilities.getMaxAnisotropy();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 1, 6000);
const TAN = Math.tan(Math.PI / 12);                                       // demi-angle de la caméra (15°)
const ETAGE = 88;                                                          // hauteur de l'étage au-dessus de la rue
const SOL = -ETAGE;                                                        // le niveau de la rue (l'étage est à y = 0)
const vue = { cible: new THREE.Vector3(0, 0, 1.5), taille: 40, az: Math.PI / 4, el: 0.6 };

/* ── Les lumières. Leurs couleurs et leurs forces sont réglées par l'ambiance (jour ou nuit) : voir AMBIANCES dans « Le ciel ». ──
   hemi   : un léger rebond du sol (le gros de la lumière d'ambiance vient du vrai ciel photographié) ;
   soleil : la seule lumière qui porte des ombres. Sa zone d'ombre est recadrée sur l'étage à chaque changement d'ambiance (cadrerOmbres) ;
   lampes : une lampe chaude au-dessus de chaque pièce, allumée la nuit seulement (éteinte, elle ne coûte rien). */
const hemi = new THREE.HemisphereLight(0xcfe2ff, 0xd9b48a, 0.2); scene.add(hemi);
const soleil = new THREE.DirectionalLight(0xffd9a8, 1.5);
soleil.castShadow = true; soleil.shadow.mapSize.set(3072, 3072);                // (4096 : bords plus nets, plus cher ; 2048 : bords plus flous, moins cher)
Object.assign(soleil.shadow.camera, { left: -36, right: 36, top: 36, bottom: -36, near: 1, far: 200 });
soleil.shadow.bias = -0.0004; soleil.shadow.normalBias = 0.025; scene.add(soleil); scene.add(soleil.target);
const ETAGE_OMBRES = { x0: -24, x1: 29.5, z0: -17, z1: 22.5, haut: 4.6 };      // tout ce qui doit recevoir ou porter une ombre tient dans cette boîte (les palmiers en pot montent à 4,4 m)
const LAMPE = { hauteur: 3.4, portee: 17, chute: 1.7 };                   // les lampes de la nuit : une flaque de lumière chaude par pièce
const lampes = [];
for (const [x, z] of [[-15, -10], [0, -10], [15, -10], [-13, 3], [10, 3], [-1, 15]]) {                // 6 grandes flaques de lumière au lieu d'une par pièce : deux fois moins de calcul la nuit
  const l = new THREE.PointLight(0xffc98a, 0, LAMPE.portee, LAMPE.chute); l.position.set(x, LAMPE.hauteur, z); l.visible = false; scene.add(l); lampes.push(l);
}

/* Hasard reproductible (la même ville à chaque ouverture) */
function alea(graine) { let s = graine >>> 0; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; }
/* Les matières : des textures dessinées ici, sans rien télécharger */
function toile(w, h, dessin, repete) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; dessin(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = ANISO;
  if (repete !== false) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function grain(c, w, h, n, a, r) { for (let i = 0; i < n; i++) { c.fillStyle = "rgba(" + (r() < 0.5 ? "0,0,0," : "255,255,255,") + (a * r()).toFixed(3) + ")"; c.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); } }
function texParquet(R, G, B, graine) {
  return toile(512, 512, (c, w, h) => {
    const r = alea(graine), lame = 32;
    for (let col = 0; col < w / lame; col++) { let y = -r() * 220;
      while (y < h) { const L = 150 + r() * 230, k = 0.84 + r() * 0.3; c.fillStyle = "rgb(" + (R * k | 0) + "," + (G * k | 0) + "," + (B * k | 0) + ")"; c.fillRect(col * lame, y, lame, L);
        for (let i = 0; i < 5; i++) { c.strokeStyle = "rgba(50,28,10," + (0.05 + r() * 0.09).toFixed(3) + ")"; c.lineWidth = 0.6 + r(); const gx = col * lame + r() * lame; c.beginPath(); c.moveTo(gx, y); c.bezierCurveTo(gx + r() * 8 - 4, y + L * 0.3, gx + r() * 8 - 4, y + L * 0.7, gx + r() * 6 - 3, y + L); c.stroke(); }
        c.strokeStyle = "rgba(30,16,6,.5)"; c.lineWidth = 1; c.strokeRect(col * lame + 0.5, y + 0.5, lame - 1, L - 1); y += L; } }
    grain(c, w, h, 2500, 0.05, r);
  });
}
function texMarbre(graine) {
  return toile(512, 512, (c, w, h) => { const r = alea(graine); c.fillStyle = "#e4dfd6"; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) { c.strokeStyle = "rgba(120,118,125," + (0.05 + r() * 0.16).toFixed(3) + ")"; c.lineWidth = 0.5 + r() * 2.4; c.shadowColor = "rgba(120,118,125,.35)"; c.shadowBlur = 6; let x = r() * w, y = r() * h; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 5; k++) { x += r() * 190 - 95; y += r() * 190 - 60; c.lineTo(x, y); } c.stroke(); }
    c.shadowBlur = 0; c.strokeStyle = "rgba(90,90,100,.28)"; c.lineWidth = 1.5; for (let i = 0; i <= 2; i++) { c.beginPath(); c.moveTo(i * 256, 0); c.lineTo(i * 256, h); c.moveTo(0, i * 256); c.lineTo(w, i * 256); c.stroke(); }
    grain(c, w, h, 1500, 0.03, r); });
}
function texMoquette(R, G, B, graine) {
  return toile(256, 256, (c, w, h) => { const r = alea(graine); c.fillStyle = "rgb(" + R + "," + G + "," + B + ")"; c.fillRect(0, 0, w, h); grain(c, w, h, 9000, 0.14, r);
    c.strokeStyle = "rgba(0,0,0,.16)"; c.lineWidth = 1.5; c.strokeRect(0.5, 0.5, w - 1, h - 1); });
}
function texBeton(ton, graine) {
  return toile(512, 512, (c, w, h) => { const r = alea(graine); c.fillStyle = ton; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) { c.fillStyle = "rgba(" + (r() < 0.5 ? "255,255,255," : "0,0,0,") + (0.02 + r() * 0.04).toFixed(3) + ")"; c.beginPath(); c.ellipse(r() * w, r() * h, 30 + r() * 110, 20 + r() * 70, r() * 3, 0, 7); c.fill(); }
    grain(c, w, h, 5000, 0.06, r); c.strokeStyle = "rgba(0,0,0,.14)"; c.lineWidth = 1; c.strokeRect(0.5, 0.5, w - 1, h - 1); });
}
function texBois(graine) { return texParquet(150, 102, 62, graine); }
function texEcran(graine) {
  return toile(256, 160, (c, w, h) => { const r = alea(graine); c.fillStyle = "#0f1230"; c.fillRect(0, 0, w, h); c.fillStyle = "#4f46e5"; c.fillRect(0, 0, w, 18);
    for (let i = 0; i < 4; i++) { c.fillStyle = ["#a78bfa", "#30a46c", "#f59e0b", "#60a5fa"][i]; c.fillRect(12 + i * 60, 30, 48, 30); }
    c.strokeStyle = "#8b85ff"; c.lineWidth = 3; c.beginPath(); for (let x = 12; x < w - 10; x += 14) c.lineTo(x, 130 - r() * 50); c.stroke();
    c.fillStyle = "rgba(255,255,255,.5)"; for (let i = 0; i < 4; i++) c.fillRect(12, 76 + i * 9, 60 + r() * 120, 3); }, false);
}
const facadesAllumables = [];                                              // les façades dont les fenêtres s'allument la nuit (remplies par la ville)
const mats = new Map();
function pbr(couleur, o) {
  o = o || {}; const k = [couleur, o.rough, o.metal, o.opacite, o.lum].join("|");
  if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: couleur, roughness: o.rough == null ? 0.7 : o.rough, metalness: o.metal || 0, transparent: o.opacite != null && o.opacite < 1, opacity: o.opacite == null ? 1 : o.opacite, depthWrite: !(o.opacite < 1), emissive: o.lum ? couleur : 0x000000, emissiveIntensity: o.lum || 0 }));
  return mats.get(k);
}
/* Finitions nommées : laque blanche, métal sombre, tissu, etc. */
const FIN = { laque: { rough: 0.32 }, metal: { rough: 0.38, metal: 0.85 }, tissu: { rough: 0.96 }, mat: { rough: 0.8 }, ceramique: { rough: 0.25 }, feuille: { rough: 0.75 } };
function boiteM(parent, w, h, d, couleur, x, y, z, o) {
  o = o || {};
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), o.mat || pbr(couleur, Object.assign({}, FIN[o.fin] || {}, o)));
  m.position.set(x, y, z); m.castShadow = !o.sansOmbre && !(o.opacite < 1); m.receiveShadow = !o.sansOmbre || !!o.recoit;
  if (o.ry) m.rotation.y = o.ry; parent.add(m); return m;
}
function cyl(parent, r, h, couleur, x, y, z, o) {
  o = o || {};
  const m = new THREE.Mesh(new THREE.CylinderGeometry(o.rHaut == null ? r : o.rHaut, r, h, o.seg || 20), o.mat || pbr(couleur, Object.assign({}, FIN[o.fin] || {}, o)));
  m.position.set(x, y, z); m.castShadow = !(o.opacite < 1) && !o.sansOmbre; m.receiveShadow = true; parent.add(m); return m;
}
function boule(parent, r, couleur, x, y, z, o) {
  o = o || {};
  const m = new THREE.Mesh(o.facettes ? new THREE.IcosahedronGeometry(r, 1) : new THREE.SphereGeometry(r, 20, 14), pbr(couleur, Object.assign({}, FIN[o.fin] || {}, o)));
  m.position.set(x, y, z); m.castShadow = !(o.opacite < 1); parent.add(m); return m;
}
const matVerre = new THREE.MeshStandardMaterial({ color: 0xcfeaf7, transparent: true, opacity: 0.16, roughness: 0.04, metalness: 0.1, depthWrite: false, envMapIntensity: 2.2 });
const NOIR = 0x1b1d2b;


/* ───────────────────────── Les modèles 3D (tous libres de droits, CC0 : Poly Haven, Quaternius, Kenney, three.js) ─────────────────────────
   Chargés une fois au démarrage, puis clonés. Un modèle qui ne charge pas vaut `null` : la scène retombe alors sur la forme
   simple dessinée à la main. Rien d'autre que ces fichiers n'est téléchargé. */
const MODELES = { meubles: {}, gens: {}, palmiers: [], voitures: [], bateaux: { yacht: null, voilier: null }, ciel: { jour: null, nuit: null } };
/* Les fichiers : la géométrie et les animations sont dans paquets/<famille>.json (le glTF + son binaire en base64), les textures
   sont de vraies images dans paquets/img/, les ciels HDR sont dans paquets/ciel.json. (Un artefact ne sert pas les .glb ni les .hdr.) */
const PAQUETS = APP.dataset.paquets || "paquets/";                          // sur le site : /bureaux/paquets/
const LONGUEURS = { voiture0: 4.6, voiture1: 4.0, voiture2: 4.8, voiture3: 4.4, yacht: 32, voilier: 12 };
async function lirePaquet(nom) { try { const r = await fetch(PAQUETS + nom + ".json"); return r.ok ? await r.json() : {}; } catch (e) { return {}; } }
function octets(b64) { const s = atob(b64), n = s.length, t = new Uint8Array(n); for (let i = 0; i < n; i++) t[i] = s.charCodeAt(i); return t; }
/* Ouvre un modèle d'un paquet : null s'il manque ou s'il est illisible */
function ouvrirGltf(e) {
  return new Promise((ok) => {
    if (!e || !e.gltf || !THREE.GLTFLoader) return ok(null);
    try { e.gltf.buffers = [{ byteLength: e.gltf.buffers[0].byteLength, uri: "data:application/octet-stream;base64," + e.bin }]; new THREE.GLTFLoader().parse(JSON.stringify(e.gltf), PAQUETS, ok, () => ok(null)); }
    catch (err) { ok(null); }
  });
}
/* Ouvre un ciel HDR : la même texture que THREE.RGBELoader().load(), sans passer par une adresse */
function ouvrirHdr(b64) {
  if (!b64 || !THREE.RGBELoader) return null;
  try { const d = new THREE.RGBELoader().parse(octets(b64).buffer); if (!d) return null;
    const t = new THREE.DataTexture(d.data, d.width, d.height, d.format, d.type);
    t.encoding = THREE.RGBEEncoding; t.minFilter = THREE.NearestFilter; t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.flipY = true; t.needsUpdate = true; return t; }
  catch (err) { return null; }
}

/* Un meuble prêt à poser : mis à l'échelle sur une cote (x, y, z ou la plus grande), centré, pied au sol. On le clone ensuite. */
function normaliser(gltf, cote, valeur) {
  if (!gltf) return null;
  const racine = gltf.scene; racine.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(racine), t = b.getSize(new THREE.Vector3());
  const k = valeur / (cote === "max" ? Math.max(t.x, t.y, t.z) : t[cote]);
  racine.scale.multiplyScalar(k); racine.position.set(-(b.min.x + b.max.x) / 2 * k, -b.min.y * k, -(b.min.z + b.max.z) / 2 * k);
  racine.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (o.material && o.material.map) o.material.map.anisotropy = ANISO; } });
  const g = new THREE.Group(); g.add(racine); g.userData.taille = t.multiplyScalar(k); return g;
}
/* Un modèle à répéter en grand nombre (palmier, voiture, bateau) : ses morceaux, un par matière, avec la géométrie déjà en mètres,
   centrée, posée à y = 0 et la longueur le long de Z. S'utilise avec THREE.InstancedMesh(p.geometry, p.material, n). */
function morceaux(gltf, cible) {
  if (!gltf) return null;
  const racine = gltf.scene; racine.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(racine), t = b.getSize(new THREE.Vector3());
  const tourne = !!cible.longueur && t.x > t.z, k = cible.longueur ? cible.longueur / Math.max(t.x, t.z) : cible.hauteur / t.y;
  const M = new THREE.Matrix4().makeRotationY(tourne ? Math.PI / 2 : 0).multiply(new THREE.Matrix4().makeScale(k, k, k)).multiply(new THREE.Matrix4().makeTranslation(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2));
  const parties = [];
  racine.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry.clone(); g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(M, o.matrixWorld)); g.computeBoundingSphere();
    const m = o.material.clone(), nom = m.name || "", carrosserie = !!cible.teinte && !/window|black|grey|gray|head|tail|light|material/i.test(nom);
    if (carrosserie) m.color.setHex(0xffffff);                             // la teinte vient de chaque exemplaire (instanceColor)
    parties.push({ geometry: g, material: m, carrosserie, nom });
  });
  const taille = t.multiplyScalar(k); if (tourne) { const x = taille.x; taille.x = taille.z; taille.z = x; }
  return { parties, taille, longueur: Math.max(taille.x, taille.z), hauteur: taille.y };
}

async function chargerModeles(avance) {
  const taches = []; let faits = 0, total = 30;
  const suivre = (p) => { const q = p.then((r) => { faits++; if (avance) avance(Math.min(faits, total), total); return r; }); taches.push(q); return q; };
  const [pm, pg, pv, pc] = await Promise.all([suivre(lirePaquet("meubles")), suivre(lirePaquet("gens")), suivre(lirePaquet("ville")), suivre(lirePaquet("ciel"))]);
  const brut = {};
  for (const k of ["canape", "tableBasse", "fauteuilSalon", "plante", "etagere", "fauteuilBureau", "imprimante", "machineCafe", "portable"]) suivre(ouvrirGltf(pm[k])).then((g) => { brut[k] = g; });
  for (const k of ["hommeCostume", "homme", "hommeManches", "femmeDecontractee", "femmeRobe", "femmeVeste", "ouvrier", "robot"]) suivre(ouvrirGltf(pg[k])).then((g) => { if (g) MODELES.gens[k] = g; });
  for (let i = 0; i < 3; i++) suivre(ouvrirGltf(pv["palmier" + i])).then((g) => { MODELES.palmiers[i] = morceaux(g, { hauteur: 10 }); });
  for (let i = 0; i < 4; i++) suivre(ouvrirGltf(pv["voiture" + i])).then((g) => { MODELES.voitures[i] = morceaux(g, { longueur: LONGUEURS["voiture" + i], teinte: true }); });
  for (const k of ["yacht", "voilier"]) suivre(ouvrirGltf(pv[k])).then((g) => { MODELES.bateaux[k] = morceaux(g, { longueur: LONGUEURS[k] }); });
  MODELES.ciel.jour = ouvrirHdr(pc.jour); MODELES.ciel.nuit = ouvrirHdr(pc.nuit);
  await Promise.all(taches);
  MODELES.palmiers = MODELES.palmiers.filter(Boolean); MODELES.voitures = MODELES.voitures.filter(Boolean);
  // les meubles, chacun à sa vraie taille
  const M = MODELES.meubles;
  M.canape = normaliser(brut.canape, "x", 2.1); M.tableBasse = normaliser(brut.tableBasse, "x", 1.1); M.fauteuilSalon = normaliser(brut.fauteuilSalon, "y", 0.92);
  M.plante = normaliser(brut.plante, "y", 1.15); M.etagere = normaliser(brut.etagere, "y", 2.1); M.fauteuilBureau = normaliser(brut.fauteuilBureau, "y", 1.02);
  M.imprimante = normaliser(brut.imprimante, "y", 1.05); M.machineCafe = normaliser(brut.machineCafe, "y", 0.42); M.portable = normaliser(brut.portable, "x", 0.36);
  if (M.fauteuilBureau) M.fauteuilBureau.traverse((o) => { if (o.isMesh && /chair/i.test(o.material.name)) { o.material = o.material.clone(); o.material.color.setHex(0x2c2f45); o.material.roughness = 0.9; } });
  return MODELES;
}
/* Pose un exemplaire d'un meuble chargé ; rend null si le modèle manque (l'appelant dessine alors la forme simple). */
function poser3d(nom, parent, x, z, ry, y) {
  const p = MODELES.meubles[nom]; if (!p) return null;
  const c = p.clone(true); c.position.set(x, y || 0, z); c.rotation.y = ry || 0; parent.add(c); return c;
}

/* ───────────────────────── Le démarrage : les modèles et les données, puis la ville et l'étage ───────────────────────── */
async function demarrer() {
  await Promise.all([chargerModeles((faits, total) => { document.getElementById("avance").style.width = Math.round(100 * faits / total) + "%"; }), lireDonnees()]);
  try { await Promise.all([document.fonts.load('600 64px Geist'), document.fonts.load('500 32px Geist')]); } catch (e) {}   // la police de la marque, avant de dessiner les enseignes
/* ══════════════════════════════════════════════════════════════════════════════════════════════════════════════
   LA VILLE : Miami vu du 25e étage. Tout ce qui est hors de l'étage : le sol et ses rues, les îlots et leurs
   immeubles, la baie, les ponts, Miami Beach, la plage, l'océan, les arbres, les voitures, les bateaux, et le
   corps de la tour sous l'étage.

   Le principe (budget : 70 tracés, 700 000 triangles) : presque tout est FONDU dans quelques grands tampons.
     · un tampon par style de façade : 5 textures répétées, des UV en mètres, une teinte par sommet ;
     · un tampon « plat » (toits, terrasses, édicules, quais, sable) et un tampon « dalle » (ce qui est posé au sol) ;
     · l'eau (baie, océan, piscines), les ombres portées dessinées au sol, les lumières de la nuit ;
     · des InstancedMesh pour les palmiers, les arbres, les voitures et les bateaux.
   Rien ne projette ni ne reçoit d'ombre calculée. Le plan est tiré avec alea() : la même ville à chaque ouverture.

   Repères : l'étage est à y = 0, la rue à y = SOL. Les voies sont sur une trame de 90 m (axes à 45 + 90 k), une
   avenue à terre-plein planté une fois sur deux, une rue l'autre fois. La baie est à l'ouest (x < -252), Miami Beach
   entre x = -716 et -596, puis la plage et l'océan.
   ══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const VILLE = (function () {

  /* ───────────────────────── 1. Réglages et petits outils ───────────────────────── */
  const EAU_Y = SOL - 1.2;                                   // le niveau de l'eau, un peu sous les quais
  const BAIE = 3, NIV = 3.3;                                 // une travée de façade, un étage (en mètres)
  const TU = 16 * BAIE, TV = 16 * NIV;                       // un carreau de façade = 16 travées × 16 étages
  const RIVE = -252;                                         // le quai de la baie, côté ville
  const ILE_O = -716, ILE_E = -596;                          // Miami Beach : bord côté plage, bord côté baie
  const COLLINS = -644;                                      // l'avenue de l'île
  const PONTS_Z = [-765, -405, 135, 495, 855];               // les ponts prolongent des avenues
  const SOLEIL = [-0.72, 0.56, 0.4];                        // le soleil de fin de journée (pour les ombres dessinées au sol)
  const DETAIL = { palmiers: 30, palmiersMoyens: 500, arbres: 150, arbresMoyens: 620, autosGarees: 30, autosRoulantes: 36, rayonAutos: 135 };   // les modèles détaillés, réservés aux abords de la tour ; puis une version moyenne, puis une version légère au loin
  const R = alea(2026);

  const _c = new THREE.Color();
  function C(hex, k) { _c.setHex(hex).convertSRGBToLinear(); if (k == null) k = 1; return [_c.r * k, _c.g * k, _c.b * k]; }   // une couleur « écran » → valeurs linéaires
  const mel = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const fois = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const borne = (v, a, b) => Math.max(a, Math.min(b, v));
  const pick = (r, t) => t[r() * t.length | 0];
  const rvb = (r, g, b, a) => "rgba(" + (r | 0) + "," + (g | 0) + "," + (b | 0) + "," + (a == null ? 1 : a) + ")";
  const rect = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
  /* Au loin, les couleurs se délavent un peu (en plus de la brume) */
  function lointain(c, x, z) { const d = Math.hypot(x, z); if (d < 500) return c; const g = (c[0] * 0.3 + c[1] * 0.55 + c[2] * 0.15) * 1.04; return mel(c, [g, g, g * 1.04], Math.min(0.32, (d - 500) / 2800)); }

  /* Un tampon : des sommets qu'on accumule, puis UNE seule géométrie */
  function tampon() { return { p: [], n: [], u: [], c: [], i: [], nb: 0 }; }
  /* Quatre points en anneau ; le sens des triangles est déduit de la normale voulue. cb = couleur des points 0-1, ch = des points 2-3 */
  function quad(T, P, N, UV, cb, ch) {
    const gx = (P[4] - P[1]) * (P[8] - P[2]) - (P[5] - P[2]) * (P[7] - P[1]), gy = (P[5] - P[2]) * (P[6] - P[0]) - (P[3] - P[0]) * (P[8] - P[2]), gz = (P[3] - P[0]) * (P[7] - P[1]) - (P[4] - P[1]) * (P[6] - P[0]);
    const b = T.nb; ch = ch || cb;
    for (let k = 0; k < 4; k++) {
      const x = P[3 * k], y = P[3 * k + 1], z = P[3 * k + 2], c = k < 2 ? cb : ch;
      T.p.push(x, y, z); T.n.push(N[0], N[1], N[2]); T.c.push(c[0], c[1], c[2]);
      if (UV) T.u.push(UV[2 * k], UV[2 * k + 1]); else if (Math.abs(N[1]) > 0.7) T.u.push(x / 24, z / 24); else T.u.push((x + z) / 24, y / 24);
    }
    if (gx * N[0] + gy * N[1] + gz * N[2] >= 0) T.i.push(b, b + 1, b + 2, b, b + 2, b + 3); else T.i.push(b, b + 2, b + 1, b, b + 3, b + 2);
    T.nb += 4;
  }
  function tri(T, P, N, c0, c1, c2) {
    const gx = (P[4] - P[1]) * (P[8] - P[2]) - (P[5] - P[2]) * (P[7] - P[1]), gy = (P[5] - P[2]) * (P[6] - P[0]) - (P[3] - P[0]) * (P[8] - P[2]), gz = (P[3] - P[0]) * (P[7] - P[1]) - (P[4] - P[1]) * (P[6] - P[0]);
    const b = T.nb, cols = [c0, c1 || c0, c2 || c1 || c0];
    for (let k = 0; k < 3; k++) { T.p.push(P[3 * k], P[3 * k + 1], P[3 * k + 2]); T.n.push(N[0], N[1], N[2]); T.u.push(P[3 * k] / 24, P[3 * k + 2] / 24); T.c.push(cols[k][0], cols[k][1], cols[k][2]); }
    if (gx * N[0] + gy * N[1] + gz * N[2] >= 0) T.i.push(b, b + 1, b + 2); else T.i.push(b, b + 2, b + 1);
    T.nb += 3;
  }
  /* Un polygone convexe à plat, tourné vers le haut */
  function polyH(T, pts, y, col) {
    const b = T.nb, n = pts.length;
    for (const p of pts) { T.p.push(p[0], y, p[1]); T.n.push(0, 1, 0); T.u.push(p[0] / 24, p[1] / 24); T.c.push(col[0], col[1], col[2]); }
    const s = (pts[1][1] - pts[0][1]) * (pts[2][0] - pts[0][0]) - (pts[1][0] - pts[0][0]) * (pts[2][1] - pts[0][1]) >= 0;
    for (let k = 1; k < n - 1; k++) if (s) T.i.push(b, b + k, b + k + 1); else T.i.push(b, b + k + 1, b + k);
    T.nb += n;
  }
  /* Un quadrilatère quelconque, tourné vers le haut : la normale est calculée (palmes, voiles) */
  function quadLibre(T, P, cb, ch) {
    let gx = (P[4] - P[1]) * (P[8] - P[2]) - (P[5] - P[2]) * (P[7] - P[1]), gy = (P[5] - P[2]) * (P[6] - P[0]) - (P[3] - P[0]) * (P[8] - P[2]), gz = (P[3] - P[0]) * (P[7] - P[1]) - (P[4] - P[1]) * (P[6] - P[0]);
    const l = (Math.hypot(gx, gy, gz) || 1) * (gy < 0 ? -1 : 1); quad(T, P, [gx / l, gy / l, gz / l], null, cb, ch);
  }
  function plaque(T, x0, z0, x1, z1, y, col) { quad(T, [x0, y, z0, x1, y, z0, x1, y, z1, x0, y, z1], [0, 1, 0], null, col); }
  /* Une boîte sans fond (les côtés un peu plus sombres en bas) */
  function caisse(T, x0, y0, z0, x1, y1, z1, col, dessus) {
    const bas = fois(col, 0.8);
    quad(T, [x0, y0, z0, x1, y0, z0, x1, y1, z0, x0, y1, z0], [0, 0, -1], null, bas, col);
    quad(T, [x1, y0, z1, x0, y0, z1, x0, y1, z1, x1, y1, z1], [0, 0, 1], null, bas, col);
    quad(T, [x0, y0, z1, x0, y0, z0, x0, y1, z0, x0, y1, z1], [-1, 0, 0], null, bas, col);
    quad(T, [x1, y0, z0, x1, y0, z1, x1, y1, z1, x1, y1, z0], [1, 0, 0], null, bas, col);
    plaque(T, x0, z0, x1, z1, y1, dessus || col);
  }
  function geoDe(T) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(T.p), 3)); g.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(T.n), 3));
    g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(T.u), 2)); g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(T.c), 3));
    g.setIndex(new THREE.BufferAttribute(T.nb > 65535 ? new Uint32Array(T.i) : new Uint16Array(T.i), 1)); return g;
  }
  function maille(T, mat, ordre) {
    const m = new THREE.Mesh(geoDe(T), mat); m.castShadow = m.receiveShadow = false; m.matrixAutoUpdate = false; if (ordre != null) m.renderOrder = ordre; scene.add(m); return m;
  }
  function instances(geo, mat, n) { const m = new THREE.InstancedMesh(geo, mat, Math.max(1, n)); m.count = 0; m.frustumCulled = false; m.castShadow = m.receiveShadow = false; scene.add(m); return m; }
  /* Écrit la place d'un exemplaire : tourné autour de la verticale (cap hx, hz), à l'échelle s (sy en hauteur si donné) */
  function ecrire(a, i, x, y, z, hx, hz, s, sy) {
    const o = i * 16; a[o] = hz * s; a[o + 1] = 0; a[o + 2] = -hx * s; a[o + 3] = 0; a[o + 4] = 0; a[o + 5] = sy == null ? s : sy; a[o + 6] = 0; a[o + 7] = 0;
    a[o + 8] = hx * s; a[o + 9] = 0; a[o + 10] = hz * s; a[o + 11] = 0; a[o + 12] = x; a[o + 13] = y; a[o + 14] = z; a[o + 15] = 1;
  }

  /* ───────────────────────── 2. Les textures (toutes dessinées ici) ───────────────────────── */

  /* Le sol : un carreau de 180 m (2 × 2 îlots) qui se répète. Une avenue (4 voies, terre-plein planté) et une rue
     (2 voies, stationnement) dans chaque sens, les trottoirs, les passages piétons, les lignes d'arrêt. Dessiné en mètres. */
  const texSol = toile(2048, 2048, (c, w, h) => {
    const r = alea(7), k = w / 180; c.scale(k, k);
    const arrondi = (x, y, l, t, a) => { c.beginPath(); c.moveTo(x + a, y); c.arcTo(x + l, y, x + l, y + t, a); c.arcTo(x + l, y + t, x, y + t, a); c.arcTo(x, y + t, x, y, a); c.arcTo(x, y, x + l, y, a); c.closePath(); };
    c.fillStyle = "#7d8084"; c.fillRect(0, 0, 180, 180);                                      // l'asphalte, gris moyen
    for (let i = 0; i < 420; i++) {                                                           // reprises et usure
      c.fillStyle = (r() < 0.5 ? "rgba(255,255,255," : "rgba(0,0,0,") + (0.02 + r() * 0.05).toFixed(3) + ")";
      const L = 4 + r() * 24, l = 1.2 + r() * 2.2; if (r() < 0.5) c.fillRect(r() * 180, r() * 180, L, l); else c.fillRect(r() * 180, r() * 180, l, L);
    }
    // les îlots : bordure, trottoir à joints, puis l'intérieur (recouvert ensuite par les socles, les parcs, les parkings)
    const BX = [[53, 129.2, 4, 3.2], [140.8, 217, 3.2, 4]], BY = [[50.8, 127, 3.2, 4], [143, 219.2, 4, 3.2]];
    for (const dx of [-180, 0]) for (const dy of [-180, 0]) for (const bx of BX) for (const by of BY) {
      c.save(); c.translate(dx, dy);
      c.fillStyle = "#cfccc4"; arrondi(bx[0], by[0], bx[1] - bx[0], by[1] - by[0], 5); c.fill();
      c.fillStyle = "#b9b5ac"; arrondi(bx[0] + 0.3, by[0] + 0.3, bx[1] - bx[0] - 0.6, by[1] - by[0] - 0.6, 4.7); c.fill();
      c.save(); c.clip(); c.strokeStyle = "rgba(0,0,0,.09)"; c.lineWidth = 0.1; c.beginPath();
      for (let v = 0; v < 80; v += 1.5) { c.moveTo(bx[0] + v, by[0]); c.lineTo(bx[0] + v, by[1]); c.moveTo(bx[0], by[0] + v); c.lineTo(bx[1], by[0] + v); }
      c.stroke(); c.restore();
      c.fillStyle = "#aeaaa0"; arrondi(bx[0] + bx[2], by[0] + by[2], bx[1] - bx[0] - bx[2] - bx[3], by[1] - by[0] - by[2] - by[3], 1.2); c.fill();
      c.restore();
    }
    // une voie, dessinée de haut en bas (pour une voie est-ouest on échange x et y avant d'appeler)
    const blanc = "rgba(240,240,234,.92)", jaune = "rgba(226,190,72,.95)";
    function voie(axe, demi, avenue, croix, gaucheMonte) {
      for (let n = 0; n < croix.length; n++) {
        const a = croix[n], b = croix[(n + 1) % croix.length], y0 = a[0] + a[1] + 7.5, y1 = b[0] - b[1] - 7.5 + (n === croix.length - 1 ? 180 : 0);
        for (const dy of [0, -180]) {
          c.save(); c.translate(0, dy);
          c.fillStyle = "rgba(0,0,0,.05)";                                                    // les traces de roulement
          for (const o of avenue ? [-6.35, -3, 3, 6.35] : [-1.75, 1.75]) { c.fillRect(axe + o - 1.05, y0 - 7, 0.5, y1 - y0 + 14); c.fillRect(axe + o + 0.55, y0 - 7, 0.5, y1 - y0 + 14); }
          if (avenue) {
            c.fillStyle = "#d2cec4"; arrondi(axe - 1.3, y0, 2.6, y1 - y0, 1.3); c.fill();    // le terre-plein planté
            c.fillStyle = "#74905d"; arrondi(axe - 1.0, y0 + 0.3, 2.0, y1 - y0 - 0.6, 1.0); c.fill();
            for (let i = 0; i < 46; i++) { c.fillStyle = r() < 0.5 ? "rgba(60,95,50,.5)" : "rgba(150,175,105,.45)"; c.beginPath(); c.arc(axe - 0.7 + r() * 1.4, y0 + 1 + r() * (y1 - y0 - 2), 0.3 + r() * 0.5, 0, 7); c.fill(); }
            c.fillStyle = jaune; c.fillRect(axe - 1.65, y0 - 0.5, 0.2, y1 - y0 + 1); c.fillRect(axe + 1.45, y0 - 0.5, 0.2, y1 - y0 + 1);
            c.fillStyle = blanc; for (let y = y0 - 1; y < y1; y += 9) { c.fillRect(axe - 4.75, y, 0.2, 3); c.fillRect(axe + 4.55, y, 0.2, 3); }
          } else {
            c.fillStyle = jaune; c.fillRect(axe - 0.28, y0 - 3, 0.16, y1 - y0 + 6); c.fillRect(axe + 0.12, y0 - 3, 0.16, y1 - y0 + 6);
            c.fillStyle = blanc; c.fillRect(axe - 3.56, y0 + 2, 0.12, y1 - y0 - 4); c.fillRect(axe + 3.44, y0 + 2, 0.12, y1 - y0 - 4);
            for (let y = Math.ceil((y0 + 2) / 6) * 6; y <= y1 - 2; y += 6) { c.fillRect(axe - 5.8, y - 0.06, 2.3, 0.12); c.fillRect(axe + 3.5, y - 0.06, 2.3, 0.12); }   // les places le long du trottoir
          }
          c.fillStyle = "#6c6758"; for (let y = 9; y < 360; y += 18) if (y > y0 + 6 && y < y1 - 6) { c.fillRect(axe - demi - 1.6, y - 0.6, 1.2, 1.2); c.fillRect(axe + demi + 0.4, y - 0.6, 1.2, 1.2); }   // les fosses d'arbres
          c.restore();
        }
      }
      for (const cr of croix) {                                                               // passages piétons et lignes d'arrêt
        const p = cr[0], hw = cr[1]; c.fillStyle = blanc;
        for (let x = axe - demi + 0.5; x < axe + demi - 0.9; x += 1.25) { c.fillRect(x, p - hw - 4.4, 0.65, 3.2); c.fillRect(x, p + hw + 1.2, 0.65, 3.2); }
        const larg = demi - 0.6 - (avenue ? 1.3 : 0), g = axe - demi + 0.3, d = axe + (avenue ? 1.6 : 0.3);
        c.fillRect(gaucheMonte ? g : d, p + hw + 5.4, larg, 0.45); c.fillRect(gaucheMonte ? d : g, p - hw - 5.85, larg, 0.45);
      }
    }
    voie(45, 8, true, [[45, 5.8], [135, 8]], true); voie(135, 5.8, false, [[45, 5.8], [135, 8]], true);                    // nord-sud : l'avenue, la rue
    c.save(); c.transform(0, 1, 1, 0, 0, 0);
    voie(135, 8, true, [[45, 8], [135, 5.8]], false); voie(45, 5.8, false, [[45, 8], [135, 5.8]], false);                  // est-ouest
    c.restore();
    c.setTransform(1, 0, 0, 1, 0, 0); grain(c, w, h, 30000, 0.045, r);
  });

  /* Les façades : 16 travées × 16 étages par carreau. Un dessin de jour par style, et les fenêtres allumées de la nuit. */
  function allumage(graine, mode) {
    const r = alea(graine), G = [];
    const chaud = () => { const k = 0.5 + r() * 0.5, t = r(); return t < 0.1 ? [175 * k, 208 * k, 255 * k] : t < 0.22 ? [255 * k, 238 * k, 208 * k] : [255 * k, (178 + r() * 46) * k, (94 + r() * 72) * k]; };   // quelques écrans bleutés, des blancs, surtout des lampes chaudes
    for (let f = 0; f < 16; f++) {
      const L = []; G.push(L);
      if (mode === "bureaux") {                                                               // des plateaux entiers restés allumés
        for (let b = 0; b < 16; b++) L.push(r() < 0.05 ? chaud() : null);
        if (r() < 0.42) { const d = r() * 16 | 0, n = 2 + (r() * 9 | 0), k = 0.45 + r() * 0.5, ton = r() < 0.6 ? [228 * k, 238 * k, 255 * k] : [255 * k, 224 * k, 172 * k]; for (let b = d; b < d + n; b++) L[b % 16] = ton; }
      } else if (mode === "logements") for (let b = 0; b < 16; b += 2) { const ton = r() < 0.34 ? chaud() : null; L.push(ton, r() < 0.8 ? ton : null); }   // par appartement (2 travées), une pièce parfois éteinte
      else for (let b = 0; b < 16; b++) L.push(r() < 0.27 ? chaud() : null);
    }
    return G;
  }
  /* Une vitre allumée, vue de dehors : plus claire sous le plafond, parfois un store à demi baissé ou un rideau tiré, un plafonnier dans les bureaux */
  function vitreAllumee(c, r, x, y, w, h, t, bureau) {
    const j = 0.88 + r() * 0.2, g = c.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, rvb(Math.min(255, t[0] * j * 1.12), Math.min(255, t[1] * j * 1.12), Math.min(255, t[2] * j * 1.12))); g.addColorStop(1, rvb(t[0] * j * 0.56, t[1] * j * 0.53, t[2] * j * 0.5));
    c.fillStyle = g; c.fillRect(x, y, w, h);
    const u = r();
    if (u < 0.26) { c.fillStyle = "rgba(0,0,0," + (0.3 + r() * 0.45).toFixed(2) + ")"; c.fillRect(x, y, w, h * (0.25 + r() * 0.55)); }                 // le store
    else if (u < 0.46 && !bureau) { const l = w * (0.18 + r() * 0.3); c.fillStyle = "rgba(0,0,0,.52)"; c.fillRect(r() < 0.5 ? x : x + w - l, y, l, h); }   // le rideau
    if (bureau) { c.fillStyle = rvb(Math.min(255, t[0] * 1.5 + 40), Math.min(255, t[1] * 1.5 + 40), Math.min(255, t[2] * 1.5 + 40)); c.fillRect(x + w * 0.12, y + h * 0.1, w * 0.3, Math.max(1.5, h * 0.07)); c.fillRect(x + w * 0.58, y + h * 0.1, w * 0.3, Math.max(1.5, h * 0.07)); }
  }
  /* Mur-rideau : le vitrage en haut de chaque étage, l'allège opaque en bas, un montant tous les 1,5 m */
  function jourVitrage(base, allege, montant, graine) {
    return (c, w, h) => {
      const r = alea(graine), cw = w / 32, ch = h / 16;
      for (let f = 0; f < 16; f++) for (let b = 0; b < 32; b++) {
        const x = b * cw, y = f * ch, k = 0.93 + r() * 0.14, g = c.createLinearGradient(0, y, 0, y + ch * 0.62);
        g.addColorStop(0, rvb(base[0] * k * 1.2, base[1] * k * 1.15, base[2] * k * 1.1)); g.addColorStop(1, rvb(base[0] * k * 0.84, base[1] * k * 0.87, base[2] * k * 0.92));
        c.fillStyle = r() < 0.05 ? rvb(base[0] * 0.45 + 118, base[1] * 0.45 + 120, base[2] * 0.45 + 118) : g; c.fillRect(x, y, cw + 0.5, ch * 0.62);   // parfois un store baissé
        c.fillStyle = rvb(allege[0] * k, allege[1] * k, allege[2] * k); c.fillRect(x, y + ch * 0.62, cw + 0.5, ch * 0.38);
      }
      c.fillStyle = montant; for (let b = 0; b < 32; b++) c.fillRect(b * cw - 1, 0, b % 2 ? 1.5 : 2.5, h);
      for (let f = 0; f < 16; f++) { c.fillRect(0, f * ch + ch * 0.62 - 1, w, 2); c.fillRect(0, (f + 1) * ch - 2.5, w, 3); }
      grain(c, w, h, 5000, 0.035, r);
    };
  }
  /* Bandeaux : un ruban vitré, un bandeau blanc plein */
  function jourBandes(c, w, h) {
    const r = alea(41), cw = w / 32, ch = h / 16;
    for (let f = 0; f < 16; f++) {
      for (let b = 0; b < 32; b++) {
        const x = b * cw, y = f * ch, k = 0.88 + r() * 0.24, g = c.createLinearGradient(0, y, 0, y + ch * 0.6);
        g.addColorStop(0, rvb(66 * k, 88 * k, 106 * k)); g.addColorStop(1, rvb(124 * k, 152 * k, 168 * k));
        c.fillStyle = r() < 0.07 ? "#aab4b8" : g; c.fillRect(x, y, cw + 0.5, ch * 0.6);
        c.fillStyle = "rgba(16,24,32,.6)"; c.fillRect(x - 0.8, y, 1.6, ch * 0.6);
      }
      c.fillStyle = "#f2efe8"; c.fillRect(0, f * ch + ch * 0.6, w, ch * 0.4);
      c.fillStyle = "rgba(0,0,0,.2)"; c.fillRect(0, f * ch + ch * 0.6, w, 2); c.fillStyle = "rgba(0,0,0,.1)"; c.fillRect(0, (f + 1) * ch - 1.5, w, 1.5);
      c.fillStyle = "rgba(0,0,0,.3)"; c.fillRect(0, f * ch, w, 4);                           // l'ombre du bandeau sur le vitrage
    }
    grain(c, w, h, 6000, 0.03, r);
  }
  /* Balcons filants : la dalle blanche, le garde-corps vitré, la baie en retrait dans l'ombre, un refend tous les 6 m */
  function jourBalcons(c, w, h) {
    const r = alea(53), cw = w / 16, ch = h / 16;
    for (let f = 0; f < 16; f++) {
      const y = f * ch, g = c.createLinearGradient(0, y, 0, y + ch * 0.6);
      g.addColorStop(0, "#2a3946"); g.addColorStop(0.3, "#4d6474"); g.addColorStop(1, "#86a1b0"); c.fillStyle = g; c.fillRect(0, y, w, ch * 0.56);
      for (let b = 0; b < 32; b++) {
        const x = b * cw / 2;
        if (r() < 0.22) { c.fillStyle = rvb(200 + r() * 30, 198 + r() * 30, 186 + r() * 30, 0.5); c.fillRect(x + 2, y + ch * 0.08, cw / 2 - 3, ch * 0.48); }    // un voilage
        c.fillStyle = "rgba(215,222,226,.5)"; c.fillRect(x - 0.6, y + 4, 1.3, ch * 0.56 - 4);
      }
      c.fillStyle = "#eef0ec"; c.fillRect(0, y + ch * 0.56, w, ch * 0.36);                    // le garde-corps : plein et blanc, ou vitré selon l'appartement
      for (let b = 0; b < 16; b += 2) if (r() < 0.45) { c.fillStyle = "rgba(150,190,196,.55)"; c.fillRect(b * cw + 6, y + ch * 0.62, 2 * cw - 8, ch * 0.26); }
      c.fillStyle = "#fbfbf8"; c.fillRect(0, y + ch * 0.56, w, 2.5);
      c.fillStyle = "rgba(0,0,0,.07)"; for (let b = 0; b < 32; b++) c.fillRect(b * cw / 2 - 0.5, y + ch * 0.6, 1, ch * 0.32);
      c.fillStyle = "#f7f5ef"; c.fillRect(0, y + ch * 0.92, w, ch * 0.08 + 0.5);              // le nez de dalle
      for (let b = 0; b < 16; b += 2) { c.fillStyle = "#f1eee7"; c.fillRect(b * cw - 4, y, 8, ch * 0.56); c.fillStyle = "rgba(0,0,0,.22)"; c.fillRect(b * cw + 4, y, 4, ch * 0.56); }   // les refends
    }
    grain(c, w, h, 6000, 0.03, r);
  }
  /* Fenêtres percées dans un enduit clair, avec la casquette filante des immeubles Art déco */
  function jourPerce(c, w, h) {
    const r = alea(67), cw = w / 16, ch = h / 16;
    c.fillStyle = "#f3efe6"; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { c.fillStyle = "rgba(120,105,85," + (0.02 + r() * 0.04).toFixed(3) + ")"; c.fillRect(r() * w, r() * h, 3 + r() * 10, 30 + r() * 120); }   // coulures
    for (let f = 0; f < 16; f++) {
      const y = f * ch;
      c.fillStyle = "#ffffff"; c.fillRect(0, y + ch * 0.1, w, ch * 0.06); c.fillStyle = "rgba(60,50,40,.24)"; c.fillRect(0, y + ch * 0.16, w, ch * 0.05);
      c.fillStyle = "rgba(0,0,0,.06)"; c.fillRect(0, y + ch - 1, w, 1.5);
      for (let b = 0; b < 16; b++) {
        const x = b * cw + cw * 0.2, fw = cw * 0.6, fy = y + ch * 0.26, fh = ch * 0.46, k = 0.85 + r() * 0.3, g = c.createLinearGradient(0, fy, 0, fy + fh);
        g.addColorStop(0, rvb(40 * k, 56 * k, 72 * k)); g.addColorStop(1, rvb(92 * k, 120 * k, 138 * k));
        c.fillStyle = r() < 0.16 ? "#c9c6ba" : g; c.fillRect(x, fy, fw, fh);
        c.strokeStyle = "rgba(255,255,255,.9)"; c.lineWidth = 2; c.strokeRect(x, fy, fw, fh); c.fillStyle = "rgba(255,255,255,.8)"; c.fillRect(x + fw / 2 - 0.8, fy, 1.6, fh);
        c.fillStyle = "rgba(0,0,0,.16)"; c.fillRect(x - 1, fy + fh + 1, fw + 2, 3);
      }
    }
    grain(c, w, h, 7000, 0.03, r);
  }
  const nuitRuban = (G) => (c, w, h) => {
    const r = alea(601), cw = w / 16, ch = h / 16; c.fillStyle = "#000"; c.fillRect(0, 0, w, h);
    for (let f = 0; f < 16; f++) for (let b = 0; b < 16; b++) if (G[f][b]) vitreAllumee(c, r, b * cw, f * ch + 2, cw, ch * 0.6 - 4, G[f][b], true);
    c.fillStyle = "#000"; for (let b = 0; b < 32; b++) c.fillRect(b * cw / 2 - 1.2, 0, 2.4, h);
  };
  const nuitBalcons = (G) => (c, w, h) => {
    const r = alea(607), cw = w / 16, ch = h / 16; c.fillStyle = "#000"; c.fillRect(0, 0, w, h);
    for (let f = 0; f < 16; f++) for (let b = 0; b < 16; b++) if (G[f][b]) {
      const t = G[f][b], x = b * cw + (b % 2 ? 0 : 6), l = cw - 6;
      vitreAllumee(c, r, x, f * ch + 4, l, ch * 0.52 - 4, t, false);
      c.fillStyle = rvb(t[0] * 0.13, t[1] * 0.12, t[2] * 0.1); c.fillRect(x, f * ch + ch * 0.56, l, ch * 0.36);                                        // la lumière qui déborde sur le balcon
    }
    c.fillStyle = "#000"; for (let b = 0; b < 32; b++) c.fillRect(b * cw / 2 - 1, 0, 2, h);
  };
  const nuitPerce = (G) => (c, w, h) => {
    const r = alea(613), cw = w / 16, ch = h / 16; c.fillStyle = "#000"; c.fillRect(0, 0, w, h);
    for (let f = 0; f < 16; f++) for (let b = 0; b < 16; b++) if (G[f][b]) { const x = b * cw + cw * 0.22, y = f * ch + ch * 0.28, l = cw * 0.56; vitreAllumee(c, r, x, y, l, ch * 0.42, G[f][b], false); c.fillStyle = "#000"; c.fillRect(x + l / 2 - 1.2, y, 2.4, ch * 0.42); }
  };
  const lumBureaux = toile(1024, 1024, nuitRuban(allumage(301, "bureaux")));                    // la même pour les trois façades à ruban vitré
  const STYLES = {
    verre: { map: toile(1024, 1024, jourVitrage([112, 158, 184], [86, 128, 154], "rgba(222,230,235,.85)", 11)), lum: lumBureaux, rough: 0.18, metal: 0.32, env: 1.5 },
    sombre: { map: toile(1024, 1024, jourVitrage([58, 76, 92], [34, 45, 56], "rgba(140,152,162,.55)", 23)), lum: lumBureaux, rough: 0.14, metal: 0.5, env: 1.6 },
    bandes: { map: toile(1024, 1024, jourBandes), lum: lumBureaux, rough: 0.5, metal: 0.08, env: 1.5 },
    balcons: { map: toile(1024, 1024, jourBalcons), lum: toile(1024, 1024, nuitBalcons(allumage(307, "logements"))), rough: 0.6, metal: 0.04, env: 1.5 },
    perce: { map: toile(1024, 1024, jourPerce), lum: toile(1024, 1024, nuitPerce(allumage(311, "fenetres"))), rough: 0.86, metal: 0, env: 1.5 },
  };
  /* Le grain des surfaces plates (toits, sable, quais) */
  const texCrepi = toile(256, 256, (c, w, h) => {
    const r = alea(19); c.fillStyle = "#eeeeee"; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { c.fillStyle = (r() < 0.5 ? "rgba(255,255,255," : "rgba(0,0,0,") + (0.015 + r() * 0.035).toFixed(3) + ")"; c.beginPath(); c.ellipse(r() * w, r() * h, 10 + r() * 50, 8 + r() * 36, r() * 3, 0, 7); c.fill(); }
    grain(c, w, h, 9000, 0.07, r);
  });
  /* Le clapot : une carte de normales qui se répète, faite d'une somme d'ondes */
  const texOndes = toile(256, 256, (c, w, h) => {
    const r = alea(31), img = c.createImageData(w, h), O = [], gx = new Float32Array(w * h), gy = new Float32Array(w * h); let somme = 0;
    for (let k = 0; k < 18; k++) { const f = 2 + r() * (k < 6 ? 4 : 20), a = r() * 6.2832; O.push([Math.round(f * Math.cos(a)), Math.round(f * Math.sin(a)), r() * 6.2832, 1 / (1 + f * 0.25)]); }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let dx = 0, dy = 0; for (const o of O) { const cs = Math.cos(6.2832 * (o[0] * x + o[1] * y) / w + o[2]) * o[3]; dx += cs * o[0]; dy += cs * o[1]; }
      gx[y * w + x] = dx; gy[y * w + x] = dy; somme += dx * dx + dy * dy;
    }
    const k = 0.42 / Math.sqrt(somme / (w * h));
    for (let i = 0; i < w * h; i++) { const nx = -gx[i] * k, ny = -gy[i] * k, l = Math.hypot(nx, ny, 1); img.data[i * 4] = 127.5 + 127.5 * nx / l; img.data[i * 4 + 1] = 127.5 + 127.5 * ny / l; img.data[i * 4 + 2] = 127.5 + 127.5 / l; img.data[i * 4 + 3] = 255; }
    c.putImageData(img, 0, 0);
  });
  texOndes.encoding = THREE.LinearEncoding;
  /* Les rouleaux : des lignes d'écume qui avancent vers la plage */
  const texEcume = toile(256, 256, (c, w, h) => {
    const r = alea(43); c.fillStyle = "#000"; c.fillRect(0, 0, w, h); c.lineCap = "round";
    for (const v of [0.14, 0.47, 0.8]) for (let passe = 0; passe < 3; passe++) {
      const A = 5 + r() * 6, ph = r() * 6.28, n = 1 + (r() * 2 | 0), ph2 = r() * 6.28, tirets = [[30 + r() * 50, 6 + r() * 22, 12 + r() * 30, 4 + r() * 12], [50 + r() * 40, 20 + r() * 30], [20 + r() * 30, 40 + r() * 40]];
      for (const dx of [-w, 0, w]) { c.beginPath();
        for (let x = 0; x <= w; x += 4) { const y = v * h + passe * 5 + A * Math.sin(6.2832 * n * x / w + ph) + 2.5 * Math.sin(6.2832 * 5 * x / w + ph2); if (x === 0) c.moveTo(x + dx, y); else c.lineTo(x + dx, y); }
        c.setLineDash(tirets[passe]); c.strokeStyle = "rgba(255,255,255," + (passe === 0 ? 0.8 : 0.28) + ")"; c.lineWidth = passe === 0 ? 2.5 : 6 + passe * 2; c.stroke(); }
    }
    for (let i = 0; i < 500; i++) { c.fillStyle = "rgba(255,255,255," + (0.1 + r() * 0.35).toFixed(2) + ")"; const v = pick(r, [0.14, 0.47, 0.8]); c.fillRect(r() * w, v * h + 4 + r() * 26, 1 + r() * 3, 1 + r() * 2); }
  });

  /* ───────────────────────── 3. Les matières et les tampons ───────────────────────── */
  const F = {}, matFacades = {};
  for (const nom in STYLES) {
    const s = STYLES[nom]; F[nom] = tampon();
    matFacades[nom] = new THREE.MeshStandardMaterial({ map: s.map, emissiveMap: s.lum, emissive: 0xffffff, emissiveIntensity: 0, vertexColors: true, roughness: s.rough, metalness: s.metal, envMapIntensity: s.env });
    facadesAllumables.push(matFacades[nom]);                                                  // le ciel règle leur éclat, jour et nuit
  }
  const PLAT = tampon(), DALLE = tampon(), SOLT = tampon(), EAU = tampon(), LUM = tampon(), ECUME = tampon();
  const matSol = new THREE.MeshStandardMaterial({ map: texSol, roughness: 0.94, metalness: 0 });
  const matPlat = new THREE.MeshStandardMaterial({ map: texCrepi, vertexColors: true, roughness: 0.88, metalness: 0 });
  const matDalle = new THREE.MeshStandardMaterial({ map: texCrepi, vertexColors: true, roughness: 0.9, metalness: 0, polygonOffset: true, polygonOffsetFactor: -1.5, polygonOffsetUnits: -3 });
  const uEau = { value: new THREE.Vector4(0, 0, 0, 0) };
  const matEau = new THREE.MeshStandardMaterial({ vertexColors: true, normalMap: texOndes, normalScale: new THREE.Vector2(0.24, 0.24), roughness: 0.2, metalness: 0.02, envMapIntensity: 0.2 });   // peu de reflets du ciel : c'est la couleur de l'eau qui doit dominer
  matEau.onBeforeCompile = (sh) => {                                                          // deux lectures du clapot, à deux échelles, qui glissent l'une sur l'autre ; et un éclat du soleil atténué (sinon la mer blanchit face au couchant)
    sh.uniforms.uEau = uEau;
    sh.fragmentShader = "uniform vec4 uEau;\n" + sh.fragmentShader.replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n\treflectedLight.directSpecular *= 0.3;").replace("#include <normal_fragment_maps>", THREE.ShaderChunk.normal_fragment_maps.replace(/vec3 mapN = texture2D\( normalMap, vUv \)\.xyz \* 2\.0 - 1\.0;/, "vec3 mapN = texture2D( normalMap, vUv + uEau.xy ).xyz + texture2D( normalMap, vUv * 0.27 + uEau.zw ).xyz - 1.0;"));
  };
  const matOmbre = new THREE.MeshBasicMaterial({ color: 0x050914, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6,
    stencilWrite: true, stencilRef: 1, stencilFunc: THREE.NotEqualStencilFunc, stencilZPass: THREE.ReplaceStencilOp });   // le pochoir : deux ombres superposées ne noircissent pas deux fois
  const matLum = new THREE.MeshBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 });
  const matEcume = new THREE.MeshBasicMaterial({ map: texEcume, vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });

  /* Les palettes */
  const BLANC = [1, 1, 1], BLANCS = [C(0xf2f2f0), C(0xebe8e0), C(0xe7e2d7), C(0xe5e7e6), C(0xeeeae2)];   // jamais tout à fait blancs : le soleil est fort
  const PASTELS = [C(0xf0d6bf), C(0xeec8ca), C(0xcfe4d9), C(0xd0dfec), C(0xf0e2b4), C(0xe9c1a8), C(0xc9e4e2), C(0xf2dccb)];
  const VITRES = [C(0xffffff), C(0xe2f6ee), C(0xe4edff), C(0xf4f1e6), C(0xd4e6ee), C(0xcfeee6)];
  const SOMBRES = [C(0xffffff), C(0xffeedd), C(0xe2eaff), C(0xd8d8d8)];
  const TOITS = [C(0xbdbab4), C(0xaeaba5), C(0xc9c6c0), C(0xa29e96), C(0x98958e), C(0xc2b9aa)];
  const PONTONS = [C(0xc6bca8), C(0xb7a586), C(0xcfcbc2), C(0xc1b299)];                       // le sol des terrasses à piscine
  const BASSINS = [C(0x2db8cc), C(0x41c4d2), C(0x25a8c8), C(0x3bbdbd)];
  const PARASOLS = [C(0xf4f4f0), C(0x1f6f8f), C(0xf2c230), C(0xef7d62), C(0x1e3a5c), C(0x3fb7a8)];
  const ASPHALTE = C(0x7a7c80), PELOUSE = C(0x7d9a60), PELOUSE2 = C(0x6b8a55), HAIE = C(0x4a6f47), SABLE = C(0xdccba6), SABLE_MOUILLE = C(0xa99878), BOIS = C(0xb08a62), QUAI = C(0xc3bcae), BETON = C(0xc2bdb3), PAVE = C(0xc5beaf);
  const TUILES = [C(0xb5704f), C(0xc48866), C(0xe6e2da), C(0x9a9a98), C(0xa8644a)];
  function styleTour(r, verre) { const t = r(); return verre ? (t < 0.4 ? "verre" : t < 0.68 ? "balcons" : t < 0.84 ? "sombre" : "bandes") : (t < 0.4 ? "balcons" : t < 0.6 ? "verre" : t < 0.77 ? "bandes" : t < 0.86 ? "sombre" : "perce"); }
  function teinteDe(r, style, pastel) { if (style === "verre") return pick(r, VITRES); if (style === "sombre") return pick(r, SOMBRES); return r() < (pastel == null ? 0.22 : pastel) ? pick(r, PASTELS) : pick(r, BLANCS); }

  /* Ce qui sera posé en exemplaires, une fois le plan tracé */
  const palmiers = [], arbres = [], garees = [], ombres = [];

  /* ───────────────────────── 4. Les briques : murs, toits, terrasses ───────────────────────── */

  /* Un volume droit sur un contour convexe : les murs dans le tampon du style (ou « plat » si style est nul), le toit, l'acrotère, l'ombre */
  function prisme(style, pts, y0, y1, o) {
    o = o || {}; const n = pts.length; let aire = 0, cx = 0, cz = 0;
    for (let k = 0; k < n; k++) { const a = pts[k], b = pts[(k + 1) % n]; aire += a[0] * b[1] - b[0] * a[1]; cx += a[0] / n; cz += a[1] / n; }
    const s = aire > 0 ? 1 : -1, teinte = lointain(o.teinte || BLANC, cx, cz), bas = fois(teinte, o.ao || 0.8), T = style ? F[style] : PLAT;
    const du = (o.du || 0) / 16, dv = (o.dv || 0) / 16, hv = (y1 - y0) / TV; let cumul = 0;
    for (let k = 0; k < n; k++) {
      const a = pts[k], b = pts[(k + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.05) continue;
      const N = [s * (b[1] - a[1]) / L, 0, -s * (b[0] - a[0]) / L], u0 = du + (o.rond ? cumul / TU : k * 5 / 16), u1 = u0 + L / TU;   // chaque face commence sur une travée, décalée de la précédente
      quad(T, [a[0], y0, a[1], b[0], y0, b[1], b[0], y1, b[1], a[0], y1, a[1]], N, style ? [u0, dv, u1, dv, u1, dv + hv, u0, dv + hv] : null, bas, teinte);
      cumul += L;
    }
    if (!o.sansToit) {
      const hp = o.parapet == null ? 1.1 : o.parapet;
      polyH(PLAT, pts, y1, lointain(o.toit || TOITS[0], cx, cz));
      if (hp > 0 && (o.niv == null || o.niv >= 1)) {                                          // l'acrotère : face dehors, dessus, face dedans
        const rive = lointain(o.rive || mel(o.teinte || BLANC, BLANC, 0.6), cx, cz), dedans = pts.map((p) => o.rond ? [cx + (p[0] - cx) * 0.97, cz + (p[1] - cz) * 0.97] : [p[0] + Math.sign(cx - p[0]) * 0.4, p[1] + Math.sign(cz - p[1]) * 0.4]);
        for (let k = 0; k < n; k++) {
          const a = pts[k], b = pts[(k + 1) % n], a2 = dedans[k], b2 = dedans[(k + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.05) continue;
          const N = [s * (b[1] - a[1]) / L, 0, -s * (b[0] - a[0]) / L];
          quad(PLAT, [a[0], y1, a[1], b[0], y1, b[1], b[0], y1 + hp, b[1], a[0], y1 + hp, a[1]], N, null, rive);
          quad(PLAT, [a2[0], y1, a2[1], b2[0], y1, b2[1], b2[0], y1 + hp, b2[1], a2[0], y1 + hp, a2[1]], [-N[0], 0, -N[2]], null, fois(rive, 0.82));
          quad(PLAT, [a[0], y1 + hp, a[1], b[0], y1 + hp, b[1], b2[0], y1 + hp, b2[1], a2[0], y1 + hp, a2[1]], [0, 1, 0], null, rive);
        }
      }
    }
    if (!o.sansOmbre && Math.hypot(cx, cz) < 1500) ombres.push([pts, y0 - SOL, y1 - SOL + (o.sansToit ? 0 : 1)]);
  }
  /* Une lueur au sol (réverbère, piscine éclairée) : un hexagone clair au centre, noir au bord, additionné à l'image */
  function eventail(T, x, y, z, rx, rz, col) {
    const b = T.nb; T.p.push(x, y, z); T.n.push(0, 1, 0); T.u.push(0, 0); T.c.push(col[0], col[1], col[2]);
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; T.p.push(x + rx * Math.cos(a), y, z + rz * Math.sin(a)); T.n.push(0, 1, 0); T.u.push(0, 0); T.c.push(0, 0, 0); }
    for (let i = 0; i < 6; i++) T.i.push(b, b + 1 + i, b + 1 + (i + 1) % 6);
    T.nb += 7;
  }
  function lueur(x, y, z, rayon, col) { const d = Math.hypot(x, z); eventail(LUM, x, y, z, rayon, rayon, fois(col, d < 900 ? 1 : Math.max(0.3, 1 - (d - 900) / 2400))); }
  /* Un point lumineux vu de côté (balise rouge au sommet des tours) : deux losanges debout, en croix */
  function balise(x, y, z, rayon, col) {
    for (const [ax, az] of [[1, 0], [0, 1]]) {
      const b = LUM.nb; LUM.p.push(x, y, z); LUM.n.push(0, 1, 0); LUM.u.push(0, 0); LUM.c.push(col[0], col[1], col[2]);
      for (const [h, v] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) { LUM.p.push(x + ax * h * rayon, y + v * rayon, z + az * h * rayon); LUM.n.push(0, 1, 0); LUM.u.push(0, 0); LUM.c.push(0, 0, 0); }
      for (let i = 0; i < 4; i++) LUM.i.push(b, b + 1 + i, b + 1 + (i + 1) % 4);
      LUM.nb += 5;
    }
  }
  /* Un bassin : la margelle blanche, l'eau turquoise (dans le tampon de l'eau : elle miroite), sa lueur la nuit */
  function bassin(x0, z0, x1, z1, y, r) {
    plaque(PLAT, x0 - 0.7, z0 - 0.7, x1 + 0.7, z1 + 0.7, y + 0.3, lointain(BLANCS[1], x0, z0)); plaque(EAU, x0, z0, x1, z1, y + 0.52, lointain(pick(r, BASSINS), x0, z0));
    lueur((x0 + x1) / 2, y + 0.9, (z0 + z1) / 2, Math.max(x1 - x0, z1 - z0) * 0.62, C(0x2fd2e2, 0.42));
  }
  function parasol(x, y, z, col, t) {
    t = t || 1.3; const s = [x, y + 2.75, z], h = y + 2.25;
    tri(PLAT, [x - t, h, z - t, x + t, h, z - t].concat(s), [0, 1, 0], col); tri(PLAT, [x + t, h, z - t, x + t, h, z + t].concat(s), [0, 1, 0], fois(col, 0.92));
    tri(PLAT, [x + t, h, z + t, x - t, h, z + t].concat(s), [0, 1, 0], col); tri(PLAT, [x - t, h, z + t, x - t, h, z - t].concat(s), [0, 1, 0], fois(col, 0.92));
  }
  /* Des rangées de voitures garées (le sol gris est posé par l'appelant) */
  function stationnement(r, x0, z0, x1, z1, y, taux, niv) {
    taux *= niv >= 2 ? 1 : niv === 1 ? 0.4 : 0; if (taux <= 0) return;                       // au loin, les parkings restent vides : on ne verrait pas les voitures
    const enX = (x1 - x0) >= (z1 - z0), a0 = enX ? x0 : z0, a1 = enX ? x1 : z1, b1 = enX ? z1 : x1; let b = (enX ? z0 : x0) + 2.6, rang = 0;
    while (b + 2.6 <= b1) {
      for (let a = a0 + 1.4; a + 1.3 <= a1; a += 2.75) if (r() < taux) { const sens = r() < 0.5 ? 1 : -1; garees.push(enX ? { x: a, y, z: b, hx: 0, hz: sens } : { x: b, y, z: a, hx: sens, hz: 0 }); }
      b += (rang++ % 2 === 0) ? 11.8 : 5.3;
    }
  }
  /* Le dessus d'un toit : l'édicule technique, les groupes froids, parfois des panneaux solaires */
  function equipToit(r, x0, z0, x1, z1, y, niv, plafond) {
    const W = x1 - x0, D = z1 - z0; if (niv < 1 || W < 9 || D < 9) return;
    const ew = W * (0.28 + r() * 0.24), ed = D * (0.28 + r() * 0.24), ex = x0 + 2.5 + r() * (W - ew - 5), ez = z0 + 2.5 + r() * (D - ed - 5), eh = Math.min(3 + r() * 2.6, (plafond == null ? 1e9 : plafond) - y);
    if (eh > 1.6) { caisse(PLAT, ex, y, ez, ex + ew, y + eh, ez + ed, lointain(C(0xd9d6cf), ex, ez), lointain(pick(r, TOITS), ex, ez)); if (niv >= 2 && r() < 0.5 && eh > 2.6) caisse(PLAT, ex + ew * 0.2, y + eh, ez + ed * 0.25, ex + ew * 0.6, y + eh + 1.2, ez + ed * 0.7, C(0x9fa1a2)); }
    if (niv < 2) return;
    const n = 3 + (r() * 6 | 0), enX = W >= D, cote = (enX ? ez - z0 : ex - x0) > 4.5 ? 1.2 : (enX ? D : W) - 2.8;                 // les groupes froids, en rang du côté libre
    for (let k = 0; k < n; k++) { const t = 2 + k * 3.1; if (t + 2.4 > (enX ? W : D) - 1.5) break;
      if (enX) caisse(PLAT, x0 + t, y, z0 + cote, x0 + t + 2.2, y + 1.25, z0 + cote + 1.4, C(0x9c9ea0), C(0x74777a)); else caisse(PLAT, x0 + cote, y, z0 + t, x0 + cote + 1.4, y + 1.25, z0 + t + 2.2, C(0x9c9ea0), C(0x74777a)); }
    if (r() < 0.3 && eh > 0) {                                                                // des panneaux solaires
      const px = ex + ew + 1.5 < x1 - 8 ? ex + ew + 1.5 : x0 + 2, pz = ez; for (let k = 0; k < 4; k++) { const z = pz + k * 2.4; if (z + 1.8 > z1 - 1.5 || px + 6 > x1 - 1) break; plaque(PLAT, px, z, px + 6, z + 1.7, y + 0.5, C(0x27384f)); }
    }
  }
  /* Une terrasse à piscine : bassin, transats, parasols, cabanons, palmiers */
  function terrasse(r, a, y, niv) {
    const x0 = a[0], z0 = a[1], x1 = a[2], z1 = a[3], W = x1 - x0, D = z1 - z0; if (W < 9 || D < 9) return;
    const enX = W >= D, L = Math.min(25, (enX ? W : D) - 7) * (0.72 + r() * 0.28), l = borne((enX ? D : W) * 0.3, 4.5, 9);
    const pw = enX ? L : l, pd = enX ? l : L, px = x0 + 3.5 + r() * Math.max(0, W - pw - 7), pz = z0 + 3.5 + r() * Math.max(0, D - pd - 7);
    bassin(px, pz, px + pw, pz + pd, y, r);
    if (niv < 1) return;
    for (let k = 0, n = 4 + (r() * 3 | 0); k < n; k++) { const x = x0 + 1.5 + r() * (W - 3), z = z0 + 1.5 + r() * (D - 3); if (x > px - 2 && x < px + pw + 2 && z > pz - 2 && z < pz + pd + 2) continue; palmiers.push({ x, y, z, s: 0.5 + r() * 0.22 }); }
    if (niv < 2) return;
    const ton = pick(r, PARASOLS), lit = C(0xf6f4ee);
    for (let t = 0.6; t < L - 1.4; t += 1.45) for (const cote of [-1, 1]) {                    // les transats, le long du bassin
      const e = cote < 0 ? -3.2 : l + 1.3;
      if (enX) plaque(PLAT, px + t, pz + e, px + t + 0.7, pz + e + 1.9, y + 0.42, lit); else plaque(PLAT, px + e, pz + t, px + e + 1.9, pz + t + 0.7, y + 0.42, lit);
      if (cote > 0 && (t / 1.45 | 0) % 3 === 1) { if (enX) parasol(px + t + 0.35, y, pz + e + 2.6, ton); else parasol(px + e + 2.6, y, pz + t + 0.35, ton); }
    }
    for (let k = 0; k < 3; k++) { const t = 1 + k * 4.2; if (enX ? (px - 4.5 < x0 + 1 || t + 3.2 > D - 1) : (pz - 4.5 < z0 + 1 || t + 3.2 > W - 1)) break;       // les cabanons, au bout
      if (enX) caisse(PLAT, x0 + 1, y, z0 + t, x0 + 4.2, y + 2.7, z0 + t + 3.2, BLANCS[1], BLANCS[2]); else caisse(PLAT, x0 + t, y, z0 + 1, x0 + t + 3.2, y + 2.7, z0 + 4.2, BLANCS[1], BLANCS[2]); }
    if (enX) caisse(PLAT, x0 + 0.6, y, z1 - 1.8, x1 - 0.6, y + 1.1, z1 - 0.6, HAIE, fois(HAIE, 1.15)); else caisse(PLAT, x1 - 1.8, y, z0 + 0.6, x1 - 0.6, y + 1.1, z1 - 0.6, HAIE, fois(HAIE, 1.15));   // une haie
  }

  /* ───────────────────────── 5. Les îlots : quelques recettes ───────────────────────── */

  /* Le fût d'une tour, avec parfois un retrait en partie haute, et sa couronne technique */
  function corpsDeTour(r, style, teinte, x0, z0, x1, z1, y0, y1, niv, plafond) {
    const du = r() * 16 | 0, dv = r() * 16 | 0, toit = pick(r, TOITS), n = Math.round((y1 - y0) / NIV);
    let a = [x0, z0, x1, z1];
    if (n > 24 && r() < 0.65) {
      const nBas = Math.round(n * (0.6 + r() * 0.22)), ym = y0 + nBas * NIV, e = BAIE * (1 + (r() * 2 | 0)), c = r() * 4 | 0;
      prisme(style, rect(x0, z0, x1, z1), y0, ym, { teinte, toit: PONTONS[2], du, dv, niv });
      a = [x0 + ((c & 1) ? e : 0), z0 + ((c & 2) ? e : 0), x1 - ((c & 1) ? 0 : e), z1 - ((c & 2) ? 0 : e)];
      prisme(style, rect(a[0], a[1], a[2], a[3]), ym, y1, { teinte, toit, du, dv: dv + nBas, niv });
    } else prisme(style, rect(x0, z0, x1, z1), y0, y1, { teinte, toit, du, dv, niv });
    equipToit(r, a[0], a[1], a[2], a[3], y1, niv, plafond);
    if (y1 - SOL > 105) { balise((a[0] + a[2]) / 2, y1 + 7, (a[1] + a[3]) / 2, 2.2, [1, 0.12, 0.08]); if (niv >= 1 && r() < 0.5) caisse(PLAT, (a[0] + a[2]) / 2 - 0.3, y1, (a[1] + a[3]) / 2 - 0.3, (a[0] + a[2]) / 2 + 0.3, y1 + 7 + r() * 9, (a[1] + a[3]) / 2 + 0.3, C(0xcfd3d6)); }
  }
  /* La recette type de Miami : un socle (parking, commerces) et une tour en retrait ; sur le socle, la piscine */
  function tourSurSocle(r, X0, Z0, X1, Z1, H, niv, o) {
    o = o || {};
    const m = 2 + r() * 2.5, x0 = X0 + m, z0 = Z0 + m, x1 = X1 - m, z1 = Z1 - m, W = x1 - x0, D = z1 - z0;
    const nS = borne(3 + (r() * 5 | 0), 2, Math.max(2, H * 0.42 / NIV | 0)), yS = SOL + nS * NIV;
    const style = o.style || styleTour(r, o.fond), teinte = teinteDe(r, style, o.pastel), piscine = o.piscine != null ? o.piscine : r() < 0.72;
    prisme(r() < 0.65 ? "bandes" : "perce", rect(x0, z0, x1, z1), SOL, yS, { teinte: mel(pick(r, BLANCS), teinte, 0.25), toit: piscine ? pick(r, PONTONS) : fois(ASPHALTE, 1.1), du: r() * 16 | 0, dv: r() * 16 | 0, niv, ao: 0.72 });
    let tw = o.tw || BAIE * (8 + (r() * 3 | 0)), td = o.td || BAIE * (11 + (r() * 5 | 0));
    if (o.elancee || o.ronde) tw = td = o.ronde ? 30.8 : BAIE * (8 + (r() * 2 | 0)); else if (!o.tw && r() < 0.5) { const t = tw; tw = td; td = t; }
    if (o.jumelles) { tw = Math.min(tw, 27); td = Math.min(td, 27); }
    tw = Math.min(tw, BAIE * Math.floor((W - 2) / BAIE)); td = Math.min(td, BAIE * Math.floor((D - 2) / BAIE));
    const coin = o.coin != null ? o.coin : r() * 4 | 0;
    let tx = (coin & 1) ? x1 - tw - 1 : x0 + 1, tz = (coin & 2) ? z1 - td - 1 : z0 + 1;
    if (o.xMax != null) tx = Math.min(tx, o.xMax - tw); if (o.zMax != null) tz = Math.min(tz, o.zMax - td);
    const nT = Math.max(nS + 4, Math.round(H / NIV)), yT = SOL + nT * NIV;
    if (o.ronde) {                                                                            // une tour ronde (16 pans de 6 m)
      const pts = []; for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8; pts.push([tx + 15.4 + 15.38 * Math.cos(a), tz + 15.4 + 15.38 * Math.sin(a)]); }
      prisme(style, pts, yS, yT, { teinte, toit: pick(r, TOITS), du: r() * 16 | 0, dv: r() * 16 | 0, niv, rond: true }); equipToit(r, tx + 6, tz + 6, tx + 25, tz + 25, yT, niv, o.plafond);
      if (yT - SOL > 105) balise(tx + 15.4, yT + 6, tz + 15.4, 2.2, [1, 0.12, 0.08]);
    } else corpsDeTour(r, style, teinte, tx, tz, tx + tw, tz + td, yS, yT, niv, o.plafond);
    if (o.jumelles) {                                                                         // la sœur, au coin opposé, un peu moins haute
      let ux = (coin & 1) ? x0 + 1 : x1 - tw - 1, uz = (coin & 2) ? z0 + 1 : z1 - td - 1;
      if (o.xMax != null) ux = Math.min(ux, o.xMax - tw); if (o.zMax != null) uz = Math.min(uz, o.zMax - td);
      corpsDeTour(r, style, teinte, ux, uz, ux + tw, uz + td, yS, SOL + Math.round(nT * (0.78 + r() * 0.14)) * NIV, niv, o.plafond);
    }
    // ce qui reste du socle : la bande à côté de la tour, et la bande devant
    const ax0 = (coin & 1) ? x0 + 2 : tx + tw + 2.5, ax1 = (coin & 1) ? tx - 2.5 : x1 - 2, bz0 = (coin & 2) ? z0 + 2 : tz + td + 2.5, bz1 = (coin & 2) ? tz - 2.5 : z1 - 2;
    let A = [ax0, z0 + 2, ax1, z1 - 2], B = [tx, bz0, tx + tw, bz1];
    if (o.jumelles) { A = [ax0, (coin & 2) ? z0 + 2 + td + 2 : z0 + 2, ax1, (coin & 2) ? z1 - 2 : z1 - 4 - td]; }
    const grande = (A[2] - A[0]) * (A[3] - A[1]) >= (B[2] - B[0]) * (B[3] - B[1]) ? A : B, petite = grande === A ? B : A;
    if (piscine) terrasse(r, grande, yS, niv); else stationnement(r, grande[0], grande[1], grande[2], grande[3], yS + 0.03, 0.6, niv);
    if (niv >= 2 && petite[2] - petite[0] > 6 && petite[3] - petite[1] > 6) { for (let k = 0; k < 4; k++) { const t = petite[0] + 1 + k * 3.2; if (t + 2.4 > petite[2]) break; caisse(PLAT, t, yS, petite[1] + 1, t + 2.2, yS + 1.25, petite[1] + 2.4, C(0x9c9ea0), C(0x74777a)); } }
  }
  /* Une barre de logements, son parking au sol et sa piscine */
  function barre(r, X0, Z0, X1, Z1, H, niv, plafond) {
    const enX = r() < 0.5, ep = BAIE * 6, n = Math.max(3, Math.round(H / NIV)), y1 = SOL + n * NIV, style = r() < 0.6 ? "balcons" : r() < 0.6 ? "bandes" : "perce", teinte = teinteDe(r, style), bout = r() < 0.5;
    const L = BAIE * Math.floor(((enX ? X1 - X0 : Z1 - Z0) - 6) / BAIE);
    const a = enX ? [X0 + 3, bout ? Z0 + 3 : Z1 - 3 - ep, X0 + 3 + L, bout ? Z0 + 3 + ep : Z1 - 3] : [bout ? X0 + 3 : X1 - 3 - ep, Z0 + 3, bout ? X0 + 3 + ep : X1 - 3, Z0 + 3 + L];
    prisme(style, rect(a[0], a[1], a[2], a[3]), SOL, y1, { teinte, toit: pick(r, TOITS), du: r() * 16 | 0, dv: r() * 16 | 0, niv }); equipToit(r, a[0], a[1], a[2], a[3], y1, niv, plafond);
    const lib = enX ? [X0 + 3, bout ? a[3] + 4 : Z0 + 3, X1 - 3, bout ? Z1 - 3 : a[1] - 4] : [bout ? a[2] + 4 : X0 + 3, Z0 + 3, bout ? X1 - 3 : a[0] - 4, Z1 - 3];
    const mi = enX ? (lib[0] + lib[2]) / 2 : (lib[1] + lib[3]) / 2, jardin = enX ? [lib[0], lib[1], mi - 2, lib[3]] : [lib[0], lib[1], lib[2], mi - 2], park = enX ? [mi + 2, lib[1], lib[2], lib[3]] : [lib[0], mi + 2, lib[2], lib[3]];
    plaque(DALLE, jardin[0], jardin[1], jardin[2], jardin[3], SOL + 0.05, lointain(pick(r, PONTONS), jardin[0], jardin[1])); terrasse(r, jardin, SOL + 0.05, niv);
    plaque(DALLE, park[0], park[1], park[2], park[3], SOL + 0.05, lointain(ASPHALTE, park[0], park[1])); stationnement(r, park[0] + 1, park[1] + 1, park[2] - 1, park[3] - 1, SOL + 0.07, 0.55, niv);
  }
  /* Deux ailes en équerre autour d'une cour à piscine */
  function enEquerre(r, X0, Z0, X1, Z1, H, niv, plafond) {
    const ep = BAIE * 6, n = Math.max(4, Math.round(H / NIV)), style = r() < 0.5 ? "balcons" : r() < 0.5 ? "perce" : "bandes", teinte = teinteDe(r, style, 0.3), du = r() * 16 | 0, dv = r() * 16 | 0, toit = pick(r, TOITS);
    const x0 = X0 + 3, z0 = Z0 + 3, x1 = x0 + BAIE * Math.floor((X1 - X0 - 6) / BAIE), z1 = z0 + BAIE * Math.floor((Z1 - Z0 - 6) / BAIE), mx = r() < 0.5, mz = r() < 0.5, n2 = Math.max(3, n - (r() * 4 | 0));
    const A = [x0, mz ? z1 - ep : z0, x1, mz ? z1 : z0 + ep], B = [mx ? x1 - ep : x0, mz ? z0 : z0 + ep, mx ? x1 : x0 + ep, mz ? z1 - ep : z1];
    prisme(style, rect(A[0], A[1], A[2], A[3]), SOL, SOL + n * NIV, { teinte, toit, du, dv, niv }); equipToit(r, A[0], A[1], A[2], A[3], SOL + n * NIV, niv, plafond);
    prisme(style, rect(B[0], B[1], B[2], B[3]), SOL, SOL + n2 * NIV, { teinte, toit, du: du + 7, dv, niv }); equipToit(r, B[0], B[1], B[2], B[3], SOL + n2 * NIV, niv, plafond);
    const cour = [mx ? x0 : x0 + ep + 3, mz ? z0 : z0 + ep + 3, mx ? x1 - ep - 3 : x1, mz ? z1 - ep - 3 : z1];
    plaque(DALLE, cour[0], cour[1], cour[2], cour[3], SOL + 0.05, lointain(pick(r, PONTONS), cour[0], cour[1])); terrasse(r, cour, SOL + 0.05, niv);
  }
  /* Un îlot bas : petits immeubles, un parking, parfois un jardin */
  function petits(r, X0, Z0, X1, Z1, hMax, niv, pastel) {
    const mx = X0 + (X1 - X0) * (0.42 + r() * 0.16), mz = Z0 + (Z1 - Z0) * (0.42 + r() * 0.16), Q = [[X0, Z0, mx, mz], [mx, Z0, X1, mz], [X0, mz, mx, Z1], [mx, mz, X1, Z1]], park = r() * 4 | 0;
    Q.forEach((q, k) => {
      if (k === park) { plaque(DALLE, q[0] + 1, q[1] + 1, q[2] - 1, q[3] - 1, SOL + 0.05, lointain(ASPHALTE, q[0], q[1])); stationnement(r, q[0] + 2, q[1] + 2, q[2] - 2, q[3] - 2, SOL + 0.07, 0.55, niv); return; }
      if (r() < 0.14) { plaque(DALLE, q[0] + 1.5, q[1] + 1.5, q[2] - 1.5, q[3] - 1.5, SOL + 0.05, lointain(PELOUSE, q[0], q[1])); for (let i = 0; i < 6; i++) arbres.push({ x: q[0] + 4 + r() * (q[2] - q[0] - 8), y: SOL, z: q[1] + 4 + r() * (q[3] - q[1] - 8), s: 3 + r() * 2.5, t: r() }); return; }
      const m = 1.5 + r() * 2.5, n = 2 + (r() * Math.max(1, Math.min(6, hMax / NIV - 1)) | 0), t = r(), style = t < 0.55 ? "perce" : t < 0.8 ? "bandes" : t < 0.92 ? "balcons" : "verre";
      const w = BAIE * Math.floor((q[2] - q[0] - 2 * m) / BAIE), d = BAIE * Math.floor((q[3] - q[1] - 2 * m) / BAIE), x = q[0] + m, z = q[1] + m;
      prisme(style, rect(x, z, x + w, z + d), SOL, SOL + n * NIV, { teinte: teinteDe(r, style, pastel == null ? 0.35 : pastel), toit: pick(r, TOITS), du: r() * 16 | 0, dv: r() * 16 | 0, niv });
      equipToit(r, x, z, x + w, z + d, SOL + n * NIV, niv);
    });
  }
  /* Un parc : pelouse, allées, un bassin, des arbres */
  function parc(r, X0, Z0, X1, Z1, niv) {
    const y = SOL + 0.05, cx = (X0 + X1) / 2, cz = (Z0 + Z1) / 2;
    plaque(DALLE, X0 + 1, Z0 + 1, X1 - 1, Z1 - 1, y, lointain(PELOUSE, cx, cz));
    if (niv >= 2) {
      const allee = C(0xd9cfb8);
      quad(DALLE, [X0 + 2, y + 0.1, Z0 + 2, X0 + 5.5, y + 0.1, Z0 + 2, X1 - 2, y + 0.1, Z1 - 2, X1 - 5.5, y + 0.1, Z1 - 2], [0, 1, 0], null, allee);
      quad(DALLE, [X1 - 2, y + 0.1, Z0 + 2, X1 - 5.5, y + 0.1, Z0 + 2, X0 + 2, y + 0.1, Z1 - 2, X0 + 5.5, y + 0.1, Z1 - 2], [0, 1, 0], null, allee);
      const O = (R0) => { const p = []; for (let k = 0; k < 10; k++) p.push([cx + R0 * Math.cos(k * 0.6283), cz + R0 * Math.sin(k * 0.6283)]); return p; };
      polyH(DALLE, O(9), y + 0.2, C(0xe2dccd)); polyH(EAU, O(6), y + 0.45, BASSINS[1]); lueur(cx, y + 0.8, cz, 7, C(0x2fd2e2, 0.4));
      for (let k = 0; k < 14; k++) plaque(DALLE, X0 + 4 + r() * (X1 - X0 - 14), Z0 + 4 + r() * (Z1 - Z0 - 14), X0 + 10 + r() * (X1 - X0 - 14), Z0 + 9 + r() * (Z1 - Z0 - 14), y + 0.04, lointain(r() < 0.5 ? PELOUSE2 : fois(PELOUSE, 1.08), cx, cz));
    }
    for (let k = 0, n = niv >= 1 ? 30 : 10; k < n; k++) { const x = X0 + 4 + r() * (X1 - X0 - 8), z = Z0 + 4 + r() * (Z1 - Z0 - 8); if (Math.hypot(x - cx, z - cz) < 11) continue; if (r() < 0.28) palmiers.push({ x, y: SOL, z, s: 0.8 + r() * 0.4 }); else arbres.push({ x, y: SOL, z, s: 3.2 + r() * 3, t: r() }); }
  }
  /* Un pâté de maisons : toits à quatre pans, jardins, quelques piscines */
  function maisons(r, X0, Z0, X1, Z1, niv) {
    plaque(DALLE, X0 + 0.5, Z0 + 0.5, X1 - 0.5, Z1 - 0.5, SOL + 0.05, lointain(mel(PELOUSE, PELOUSE2, r()), X0, Z0));
    const nx = 3, nz = 4, px = (X1 - X0) / nx, pz = (Z1 - Z0) / nz;
    for (let a = 0; a < nx; a++) for (let b = 0; b < nz; b++) {
      if (r() < 0.08) continue;
      const w = 9 + r() * 4, d = 8 + r() * 3, x = X0 + a * px + 2 + r() * (px - w - 4), z = Z0 + b * pz + 1.5 + r() * (pz - d - 3), y1 = SOL + 3.4 + (r() < 0.25 ? 3 : 0), mur = lointain(r() < 0.5 ? pick(r, BLANCS) : pick(r, PASTELS), x, z), toit = lointain(pick(r, TUILES), x, z), f = [x + w / 2, y1 + 2.2, z + d / 2];
      prisme(null, rect(x, z, x + w, z + d), SOL, y1, { teinte: mur, sansToit: true, sansOmbre: niv < 1 });
      tri(PLAT, [x - 0.5, y1, z - 0.5, x + w + 0.5, y1, z - 0.5].concat(f), [0, 0.8, -0.6], toit); tri(PLAT, [x + w + 0.5, y1, z - 0.5, x + w + 0.5, y1, z + d + 0.5].concat(f), [0.6, 0.8, 0], toit);
      tri(PLAT, [x + w + 0.5, y1, z + d + 0.5, x - 0.5, y1, z + d + 0.5].concat(f), [0, 0.8, 0.6], toit); tri(PLAT, [x - 0.5, y1, z + d + 0.5, x - 0.5, y1, z - 0.5].concat(f), [-0.6, 0.8, 0], toit);
      if (niv >= 1 && r() < 0.3 && x + w + 7 < X0 + (a + 1) * px) plaque(EAU, x + w + 1.5, z + 1, x + w + 5.5, z + 7, SOL + 0.3, lointain(BASSINS[0], x, z));
      if (r() < (niv >= 1 ? 0.5 : 0.12)) arbres.push({ x: x - 1 + r() * (w + 2), y: SOL, z: z + d + 1.5 + r() * 2, s: 2.6 + r() * 2.6, t: r() });
      if (niv >= 1 && r() < 0.25) garees.push({ x: x + 1.5, y: SOL + 0.07, z: z - 3, hx: 0, hz: r() < 0.5 ? 1 : -1 });
    }
  }

  /* ───────────────────────── 6. Le plan : la terre, l'eau, les îlots ───────────────────────── */
  const demiVoie = (k) => (k & 1) ? 12 : 9;                                                   // demi-emprise de la voie n° k (axe à 45 + 90 k) : avenue si k est impair
  const demiChaussee = (k) => (k & 1) ? 8 : 5.8;
  const uvSol = (x, z, dx) => [(x + 90 + (dx || 0)) / 180, (z + 90) / 180];

  /* La terre ferme, d'un seul tenant, avec le carreau de rues répété */
  function solQuad(x0, z0, x1, z1, y, dx) { const a = uvSol(x0, z0, dx), b = uvSol(x1, z1, dx); quad(SOLT, [x0, y, z0, x1, y, z0, x1, y, z1, x0, y, z1], [0, 1, 0], [a[0], a[1], b[0], a[1], b[0], b[1], a[0], b[1]], BLANC); }
  solQuad(RIVE, -2900, 2900, 2900, SOL);
  solQuad(ILE_O, -1700, ILE_E, 1700, SOL, 599);                                               // Miami Beach : le même carreau, calé pour que l'avenue tombe sur Collins
  // le quai de la baie : une promenade claire devant le boulevard, le mur de quai
  { let z = -1700; for (const zp of PONTS_Z.concat([1712])) { plaque(DALLE, RIVE, z, -238.6, zp - 12, SOL + 0.05, PAVE); z = zp + 12; } }   // interrompue au droit des ponts
  quad(PLAT, [RIVE, EAU_Y - 1, -1700, RIVE, EAU_Y - 1, 1700, RIVE, SOL + 0.06, 1700, RIVE, SOL + 0.06, -1700], [-1, 0, 0], null, fois(QUAI, 0.7), QUAI);
  quad(PLAT, [ILE_E, EAU_Y - 1, -1700, ILE_E, EAU_Y - 1, 1700, ILE_E, SOL, 1700, ILE_E, SOL, -1700], [1, 0, 0], null, fois(QUAI, 0.7), QUAI);
  for (let z = -700; z <= 700; z += 13) if (Math.abs(((z - 45) % 90 + 90) % 90 - 0) > 14 && Math.abs(((z - 45) % 90 + 90) % 90 - 90) > 14) palmiers.push({ x: -245.5, y: SOL, z: z + R() * 3, s: 0.85 + R() * 0.4 });

  /* La presqu'île du parc, devant le centre, et ses deux marinas */
  const amarres = [];                                                                         // les bateaux à quai : { x, z, hx, hz, s, voilier }
  (function () {
    const r = alea(77), x0 = -304, z0 = -100, z1 = 108, y = SOL + 0.05;
    plaque(DALLE, x0, z0, RIVE, z1, y, PELOUSE);
    plaque(DALLE, x0, z0, x0 + 4.5, z1, y + 0.1, PAVE); plaque(DALLE, x0, z0, RIVE, z0 + 4, y + 0.1, PAVE); plaque(DALLE, x0, z1 - 4, RIVE, z1, y + 0.1, PAVE);     // la promenade du bord de l'eau
    quad(DALLE, [RIVE, y + 0.1, -20, RIVE, y + 0.1, -16, x0 + 4, y + 0.1, 40, x0 + 4, y + 0.1, 36], [0, 1, 0], null, C(0xd9cfb8)); quad(DALLE, [RIVE, y + 0.1, 60, RIVE, y + 0.1, 64, x0 + 4, y + 0.1, -40, x0 + 4, y + 0.1, -44], [0, 1, 0], null, C(0xd9cfb8));
    quad(PLAT, [x0, EAU_Y - 1, z0, x0, EAU_Y - 1, z1, x0, y, z1, x0, y, z0], [-1, 0, 0], null, fois(QUAI, 0.7), QUAI);
    quad(PLAT, [x0, EAU_Y - 1, z0, RIVE, EAU_Y - 1, z0, RIVE, y, z0, x0, y, z0], [0, 0, -1], null, fois(QUAI, 0.7), QUAI);
    quad(PLAT, [x0, EAU_Y - 1, z1, RIVE, EAU_Y - 1, z1, RIVE, y, z1, x0, y, z1], [0, 0, 1], null, fois(QUAI, 0.7), QUAI);
    for (let k = 0; k < 46; k++) { const x = x0 + 6 + r() * 40, z = z0 + 6 + r() * (z1 - z0 - 12); if (r() < 0.45) palmiers.push({ x, y: SOL, z, s: 0.85 + r() * 0.45 }); else arbres.push({ x, y: SOL, z, s: 3 + r() * 3, t: r() }); }
    for (let z = z0 + 6; z < z1 - 4; z += 11) palmiers.push({ x: x0 + 2.2, y: SOL, z, s: 0.9 + r() * 0.3 });
    // la marina du sud : trois pontons, des yachts cul à quai, une digue
    for (const z of [-124, -152, -180]) {
      caisse(PLAT, -332, EAU_Y - 0.6, z - 1.3, RIVE, EAU_Y + 0.75, z + 1.3, QUAI, BOIS);
      for (let x = -262; x > -326; x -= 6.4 + r() * 1.2) for (const c of [-1, 1]) if (r() < 0.72) amarres.push({ x, z: z + c * (7.2 + r()), hx: 0, hz: -c, s: 0.3 + r() * 0.1 });
    }
    caisse(PLAT, -342, EAU_Y - 1, -196, -337, EAU_Y + 1, -112, C(0xa9a59b), C(0xbdb8ad));
    amarres.push({ x: -272, z: -106.5, hx: 1, hz: 0, s: 0.95 }, { x: -296, z: 113.5, hx: -1, hz: 0, s: 0.8 }, { x: -309.5, z: 20, hx: 0, hz: 1, s: 1 });
    // la marina du nord, au-delà du pont
    for (let z = 176; z <= 330; z += 31) {
      caisse(PLAT, -306, EAU_Y - 0.6, z - 1.2, RIVE, EAU_Y + 0.75, z + 1.2, QUAI, BOIS);
      for (let x = -260; x > -302; x -= 6.6 + r() * 1.4) for (const c of [-1, 1]) if (r() < 0.72) amarres.push({ x, z: z + c * (7.4 + r()), hx: 0, hz: -c, s: 0.28 + r() * 0.12, voilier: r() < 0.3 });
    }
  })();

  /* L'eau : turquoise près des rives et de la plage, bleu profond au large ; un chenal plus sombre au milieu de la baie */
  function tonEau(x, z) {
    const ondule = 0.5 + 0.5 * Math.sin(x * 0.013 + z * 0.021) * Math.sin(x * 0.007 - z * 0.011 + 1.3);
    if (x > ILE_E - 4) {
      const rive = (z > -104 && z < 112) ? -304 : RIVE, t = borne(Math.min(rive - x, x - ILE_E) / 115, 0, 1);
      let c = t < 0.5 ? mel(C(0x3fb9ad), C(0x1f93a3), t * 2) : mel(C(0x1f93a3), C(0x167693), t * 2 - 1);
      const chenal = Math.max(0, 1 - Math.abs(x + 425) / 55); c = mel(c, C(0x115a84), chenal * 0.7);
      return mel(c, C(0x58c4b4), ondule * 0.16 * (1 - chenal));
    }
    const d = -776 - x; let c;
    if (d < 40) c = mel(C(0x62d2c4), C(0x34b9c0), borne(d / 40, 0, 1)); else if (d < 130) c = mel(C(0x34b9c0), C(0x1b8fb8), (d - 40) / 90); else if (d < 330) c = mel(C(0x1b8fb8), C(0x126aa3), (d - 130) / 200); else c = mel(C(0x126aa3), C(0x0d4a80), borne((d - 330) / 500, 0, 1));
    const banc = Math.max(0, 1 - Math.abs(d - 165 - 30 * Math.sin(z * 0.004)) / 34); c = mel(c, C(0x3bb7bd), banc * 0.4);     // le banc de sable, plus clair
    return mel(c, C(0x4fc0ba), ondule * 0.1 * borne(1 - d / 500, 0, 1));
  }
  (function () {
    const xs = [-4200, -3000, -2300, -1800, -1500, -1300, -1160, -1060, -990, -940, -905, -875, -850, -826, -806, -790, -776, -760, ILE_E - 4, -584, -566, -540, -510, -480, -452, -425, -398, -370, -345, -326, -310, -296, -280, -266, RIVE - 2, -200], zs = [];
    for (let z = -3400; z <= 3400; z += Math.abs(z) < 1280 || (z < 0 && z >= -1280) ? 64 : 265) zs.push(z);
    const b = EAU.nb, nx = xs.length, nz = zs.length;
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const c = lointain(tonEau(xs[i], zs[j]), xs[i], zs[j]); EAU.p.push(xs[i], EAU_Y, zs[j]); EAU.n.push(0, 1, 0); EAU.u.push(xs[i] / 46, zs[j] / 46); EAU.c.push(c[0], c[1], c[2]); }
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = b + j * nx + i; EAU.i.push(a, a + nx, a + 1, a + 1, a + nx, a + nx + 1); }
    EAU.nb += nx * nz;
  })();

  /* La plage : la promenade en bois, la dune, le sable qui descend dans l'eau, les rouleaux */
  (function () {
    const r = alea(91), z0 = -1700, z1 = 1700;
    caisse(PLAT, -721, SOL - 0.2, z0, ILE_O, SOL + 0.35, z1, BOIS, BOIS);                    // la promenade
    plaque(PLAT, -728, z0, -721, z1, SOL + 0.02, C(0xb6b184));                                // la dune et ses herbes
    quad(PLAT, [-728, SOL, z0, -728, SOL, z1, -762, SOL - 0.15, z1, -762, SOL - 0.15, z0], [0, 1, 0], null, SABLE, SABLE);
    quad(PLAT, [-762, SOL - 0.15, z0, -762, SOL - 0.15, z1, -771, SOL - 0.85, z1, -771, SOL - 0.85, z0], [0, 1, 0], null, SABLE, mel(SABLE, SABLE_MOUILLE, 0.7));
    quad(PLAT, [-771, SOL - 0.85, z0, -771, SOL - 0.85, z1, -800, SOL - 3.2, z1, -800, SOL - 3.2, z0], [0, 1, 0], null, mel(SABLE, SABLE_MOUILLE, 0.7), SABLE_MOUILLE);
    for (let z = z0; z < z1; z += 85) {                                                       // les rouleaux, de moins en moins vifs au loin
      const k0 = borne(1 - (Math.abs(z) - 500) / 1300, 0.15, 1), X = [-774, -790, -812, -850], V = [0.85, 0.7, 0.4, 0];
      for (let i = 0; i < 3; i++) quad(ECUME, [X[i], EAU_Y + 0.12, z, X[i], EAU_Y + 0.12, z + 85, X[i + 1], EAU_Y + 0.12, z + 85, X[i + 1], EAU_Y + 0.12, z], [0, 1, 0],
        [z / 44, (X[i] + 774) / -76, (z + 85) / 44, (X[i] + 774) / -76, (z + 85) / 44, (X[i + 1] + 774) / -76, z / 44, (X[i + 1] + 774) / -76], fois(BLANC, V[i] * k0), fois(BLANC, V[i + 1] * k0));
    }
    for (let z = -1010; z < 1010; z += 90) {                                                  // un « club de plage » par îlot : parasols en rangs, transats
      const ton = pick(r, PARASOLS), rangs = 2 + (r() * 2 | 0), n = 7 + (r() * 7 | 0), zc = z + 18 + r() * 20, fin = Math.abs(z) < 420;
      for (let a = 0; a < rangs; a++) for (let b = 0; b < n; b++) { const x = -737 - a * 5.2, zz = zc + b * 3.7; parasol(x, SOL - 0.1, zz, ton, 1.25); if (fin) { plaque(PLAT, x - 1.9, zz - 1.25, x + 0.1, zz - 0.6, SOL + 0.32, BLANCS[1]); plaque(PLAT, x - 1.9, zz + 0.6, x + 0.1, zz + 1.25, SOL + 0.32, BLANCS[1]); } }
      for (let k = 0, m = fin ? 26 : 8; k < m; k++) { const x = -733 - r() * 30, zz = z + r() * 90, t = pick(r, PARASOLS); plaque(PLAT, x, zz, x + 1.9, zz + 0.95, SOL + 0.12, fois(t, 0.95)); }   // des serviettes
      if (((z + 1010) / 90 | 0) % 3 === 1) { const t = pick(r, [C(0xf2a0b4), C(0xf6d04a), C(0x4fc4c0), C(0xf08a5c), C(0xb9a0e0)]); caisse(PLAT, -757, SOL + 1.3, z + 60, -753.6, SOL + 3.7, z + 63.4, t, BLANCS[0]); caisse(PLAT, -755.6, SOL - 0.2, z + 61.4, -755, SOL + 1.3, z + 62, BLANCS[1]); }   // la cabane du sauveteur
    }
    for (let z = -1000; z < 1000; z += 9 + r() * 8) { if (r() < 0.6) palmiers.push({ x: -724.5 + r() * 2, y: SOL, z, s: 0.8 + r() * 0.4 }); else arbres.push({ x: -725 + r() * 3, y: SOL - 2.2, z, s: 2 + r() * 1.2, t: r() }); }
  })();

  /* Les ponts : un tablier en dos d'âne (les bateaux passent dessous), des piles, des garde-corps */
  const PROFIL = [0.5, 4.6, 11, 14.2, 11, 4.6, 0.5], PAS_PONT = (ILE_E + 14 - (RIVE - 14)) / 6;   // hauteurs du tablier, de la ville vers l'île
  function hautPont(x) {                                                                      // la hauteur du tablier au-dessus de la rue, à l'abscisse x
    if (x >= RIVE || x <= ILE_E) return 0;
    if (x > RIVE - 14) return PROFIL[0] * (RIVE - x) / 14;
    if (x < ILE_E + 14) return PROFIL[6] * (x - ILE_E) / 14;
    const t = (x - (RIVE - 14)) / PAS_PONT, i = Math.min(5, t | 0); return PROFIL[i] + (PROFIL[i + 1] - PROFIL[i]) * (t - i);
  }
  for (const zp of PONTS_Z) {
    const xa = RIVE - 14, v0 = (zp - 12 + 90) / 180, v1 = (zp + 12 + 90) / 180;
    // les deux rampes d'accès (du sol au premier nœud) puis les six travées
    const N = [[RIVE, 0], [xa, PROFIL[0]]]; for (let k = 1; k <= 6; k++) N.push([xa + k * PAS_PONT, PROFIL[k]]); N.push([ILE_E, 0]);
    for (let k = 0; k < N.length - 1; k++) {
      const a = N[k], b = N[k + 1], ya = SOL + a[1], yb = SOL + b[1], L = a[0] - b[0], u0 = 62 / 180, u1 = (62 + Math.min(62, L)) / 180, pente = (yb - ya) / L, nn = Math.hypot(pente, 1);
      quad(SOLT, [a[0], ya, zp - 12, a[0], ya, zp + 12, b[0], yb, zp + 12, b[0], yb, zp - 12], [pente / nn, 1 / nn, 0], [u0, v0, u0, v1, u1, v1, u1, v0], BLANC);
      for (const c of [-1, 1]) quad(PLAT, [a[0], ya - 1.7, zp + c * 12, b[0], yb - 1.7, zp + c * 12, b[0], yb + 0.95, zp + c * 12, a[0], ya + 0.95, zp + c * 12], [0, 0, c], null, fois(BETON, 0.8), BETON);
      for (const c of [-1, 1]) quad(PLAT, [a[0], ya - 1.7, zp + c * 11.7, b[0], yb - 1.7, zp + c * 11.7, b[0], yb + 0.95, zp + c * 11.7, a[0], ya + 0.95, zp + c * 11.7], [0, 0, -c], null, fois(BETON, 0.8), BETON);
      quad(PLAT, [a[0], ya - 1.7, zp - 12, a[0], ya - 1.7, zp + 12, b[0], yb - 1.7, zp + 12, b[0], yb - 1.7, zp - 12], [0, -1, 0], null, fois(BETON, 0.45));
      ombres.push([[[a[0], zp - 12], [b[0], zp - 12], [b[0], zp + 12], [a[0], zp + 12]], Math.max(0, (a[1] + b[1]) / 2 - 1.7), (a[1] + b[1]) / 2]);
      if (k >= 1 && k < N.length - 1) { caisse(PLAT, a[0] - 1.4, EAU_Y - 1, zp - 9, a[0] + 1.4, ya - 1.6, zp + 9, BETON); if (k < N.length - 2) caisse(PLAT, (a[0] + b[0]) / 2 - 1.2, EAU_Y - 1, zp - 9, (a[0] + b[0]) / 2 + 1.2, (ya + yb) / 2 - 1.6, zp + 9, BETON); }
    }
    for (let x = RIVE - 10; x > ILE_E + 10; x -= 26) for (const c of [-1, 1]) lueur(x, SOL + hautPont(x) + 0.4, zp + c * 6, 9, C(0xffd9a0, 0.36));
  }

  /* Le choix de la hauteur : bas près de la tour, une grappe de grandes tours au fond (x < -60 et z < -60), puis la ville qui s'étale */
  function hauteurPermise(cx, cz, fond, pres) {
    const grappe = 208 * Math.exp(-Math.pow(Math.hypot(cx + 140, cz + 262) / 235, 2));
    if (fond) return Math.max(46, grappe);
    if (pres) return 62;
    const d = Math.hypot(cx, cz), base = d < 800 ? 92 - 52 * (d - 300) / 500 : 26;
    return cz < -200 && cx < 420 ? Math.max(base, grappe * 0.8) : base;
  }
  const PLAFOND_PRES = SOL + 69.4;                                                            // à moins de 300 m (hors du fond) rien ne dépasse y = -18
  for (let i = -2; i <= 16; i++) for (let j = -18; j <= 18; j++) {
    if (i === 0 && j === 0) continue;                                                         // la parcelle de la tour, plus bas
    const X0 = 90 * i - 45 + demiVoie(i - 1), X1 = 90 * i + 45 - demiVoie(i), Z0 = 90 * j - 45 + demiVoie(j - 1), Z1 = 90 * j + 45 - demiVoie(j), cx = (X0 + X1) / 2, cz = (Z0 + Z1) / 2;
    const r = alea(7919 * (i + 40) + 104729 * (j + 40)), d = Math.hypot(cx, cz), pres = Math.hypot(Math.max(0, Math.abs(cx) - 36), Math.max(0, Math.abs(cz) - 36)) < 302, fond = i <= -1 && j <= -1;
    const niv = d < 430 ? 2 : d < 1000 ? 1 : 0, H = hauteurPermise(cx, cz, fond, pres), plafond = pres && !fond ? PLAFOND_PRES : null, cle = i + "," + j, t = r();
    const bord = { xMax: fond && i === -1 ? -60.5 : null, zMax: fond && j === -1 ? -60.5 : null };          // les tours du fond restent dans leur quart
    if (cle === "-2,0" || cle === "3,-2" || cle === "-2,4" || cle === "5,3") parc(r, X0, Z0, X1, Z1, niv);
    else if (cle === "1,1") { petits(r, X0, Z0, X1, Z1, 14, niv, 0.5); }
    else if (cle === "2,2") petits(r, X0, Z0, X1, Z1, 30, niv);
    else if (cle === "-1,0") tourSurSocle(r, X0, Z0, X1, Z1, 56, niv, { coin: 0, piscine: true, style: "balcons", tw: 27, td: 45, plafond });
    else if (cle === "0,-1") tourSurSocle(r, X0, Z0, X1, Z1, 50, niv, { coin: 0, piscine: true, style: "verre", tw: 48, td: 24, plafond });
    else if (cle === "-2,-1") tourSurSocle(r, X0, Z0, X1, Z1, 84, niv, { coin: 0, piscine: true, fond: true, tw: 42, td: 24 });
    else if (fond && H > 70) tourSurSocle(r, X0, Z0, X1, Z1, H * (0.74 + r() * 0.26), niv, Object.assign({ fond: true, jumelles: t < 0.2 && H > 110, ronde: t > 0.9, elancee: t > 0.68 && t <= 0.9 }, bord));
    else if (d > 1250) { if (t < 0.72) maisons(r, X0, Z0, X1, Z1, niv); else petits(r, X0, Z0, X1, Z1, 14, niv); }
    else if (d > 800 && !(cz < -200 && cx < 420)) { if (t < 0.4) maisons(r, X0, Z0, X1, Z1, niv); else if (t < 0.84) petits(r, X0, Z0, X1, Z1, 22, niv); else if (t < 0.9) parc(r, X0, Z0, X1, Z1, niv); else barre(r, X0, Z0, X1, Z1, 30 + r() * 14, niv); }
    else {
      const h = H * (0.52 + r() * 0.48);
      if (t < 0.5) tourSurSocle(r, X0, Z0, X1, Z1, h, niv, Object.assign({ plafond, fond: H > 100 }, bord));
      else if (t < 0.64) barre(r, X0, Z0, X1, Z1, Math.min(h, 58), niv, plafond);
      else if (t < 0.8) enEquerre(r, X0, Z0, X1, Z1, Math.min(h, 46), niv, plafond);
      else if (t < 0.95) petits(r, X0, Z0, X1, Z1, 24, niv);
      else parc(r, X0, Z0, X1, Z1, niv);
    }
  }

  /* La parcelle de la tour AVYORA : le fût de verre sous l'étage, ses lames blanches, le hall, le parvis */
  (function () {
    const r = alea(5), verre = C(0xe9f3ff);
    // tout tient dans l'emprise de l'étage (x de -23,2 à 23,2 ; z de -16,2 à 17,2) et s'arrête à y = -0,6 : le vitrage est en retrait de 22 cm, les lames blanches affleurent le bord
    const X0 = -23.2, X1 = 23.2, Z0 = -16.2, Z1 = 17.2, e = 0.22, haut = -0.6;
    prisme("verre", rect(X0 + e, Z0 + e, X1 - e, Z1 - e), SOL, haut, { teinte: verre, sansToit: true, du: 3, dv: 5, ao: 0.7 });
    for (let k = 0; k <= 8; k++) { const x = X0 + k * 5.8, xa = Math.max(X0, x - 0.3), xb = Math.min(X1, x + 0.3); caisse(PLAT, xa, SOL + 8.2, Z0, xb, haut, Z0 + e, BLANCS[0]); caisse(PLAT, xa, SOL + 8.2, Z1 - e, xb, haut, Z1, BLANCS[0]); }
    for (let k = 0; k <= 6; k++) { const z = Z0 + k * (Z1 - Z0) / 6, za = Math.max(Z0, z - 0.3), zb = Math.min(Z1, z + 0.3); caisse(PLAT, X0, SOL + 8.2, za, X0 + e, haut, zb, BLANCS[0]); caisse(PLAT, X1 - e, SOL + 8.2, za, X1, haut, zb, BLANCS[0]); }
    for (const z of [Z0, Z1]) quad(PLAT, [X0, -2.6, z, X1, -2.6, z, X1, haut, z, X0, haut, z], [0, 0, z < 0 ? -1 : 1], null, BLANCS[0]);     // le bandeau blanc sous l'étage
    for (const x of [X0, X1]) quad(PLAT, [x, -2.6, Z0, x, -2.6, Z1, x, haut, Z1, x, haut, Z0], [x < 0 ? -1 : 1, 0, 0], null, BLANCS[0]);
    prisme("sombre", rect(-28, -21, 28, 22), SOL, SOL + 8, { teinte: BLANC, toit: PONTONS[2], rive: BLANCS[0], du: 2, dv: 9 });              // le hall, sur deux niveaux
    plaque(DALLE, -32, -32, 35, 35, SOL + 0.05, C(0xc8c2b6));                                                                              // le parvis
    bassin(-31, -29.5, 31, -25.5, SOL - 0.2, r); bassin(30, -14, 33.5, 16, SOL - 0.2, r);
    for (const [x, z] of [[-30.5, 26], [-22, 30], [-11, 30], [0, 30], [11, 30], [22, 30], [31, 26], [-31, -8], [-31, 4], [-31, 16]]) palmiers.push({ x, y: SOL, z, s: 0.95 + r() * 0.3 });
  })();

  /* Miami Beach : côté océan, les petits hôtels Art déco (au centre) puis les grands hôtels ; côté baie, villas puis tours */
  for (let j = -17; j <= 17; j++) {
    const Z0 = 90 * j - 45 + demiVoie(j - 1), Z1 = 90 * j + 45 - demiVoie(j), cz = 90 * j, r = alea(4000 + j * 37), deco = Math.abs(cz) < 250, niv = Math.abs(cz) < 340 ? 2 : Math.abs(cz) < 950 ? 1 : 0;
    const elan = borne(1.15 - Math.abs(Math.abs(cz) - 560) / 520, 0.35, 1);                   // la silhouette de l'île : haute de part et d'autre du quartier Art déco
    if (deco) {
      let z = Z0 + 1;
      while (z < Z1 - 13) {
        let l = BAIE * (5 + (r() * 4 | 0)); const n = 3 + (r() * 4 | 0), ton = pick(r, PASTELS), y1 = SOL + n * NIV; if (z + l > Z1 - 1) l = BAIE * Math.floor((Z1 - 1 - z) / BAIE); if (l < 12) break;
        prisme("perce", rect(-688, z, -658, z + l), SOL, y1, { teinte: ton, toit: pick(r, TOITS), rive: BLANCS[0], du: r() * 16 | 0, dv: r() * 16 | 0, niv }); equipToit(r, -688, z, -658, z + l, y1, niv);
        caisse(PLAT, -658.6, SOL, z + l / 2 - 1.5, -657.4, y1 + 3.2, z + l / 2 + 1.5, BLANCS[0]);                                           // l'aileron vertical des façades Art déco
        caisse(PLAT, -660.5, SOL + 3.4, z + 1, -655.5, SOL + 3.9, z + l - 1, mel(ton, BLANC, 0.3));                                        // l'auvent sur le trottoir
        if (l > 17) { bassin(-707, z + 3, -698, z + l - 4, SOL - 0.2, r); for (let k = 0; k < 4; k++) { parasol(-695, SOL, z + 3 + k * 3.6, pick(r, PARASOLS), 1.2); plaque(PLAT, -711.5, z + 3 + k * 2, -709.6, z + 3.7 + k * 2, SOL + 0.42, BLANCS[1]); } }
        for (let k = 0; k < 3; k++) palmiers.push({ x: -712 + r() * 20, y: SOL, z: z + r() * l, s: 0.8 + r() * 0.35 });
        z += l + 1.5 + r() * 3;
      }
      plaque(DALLE, -714, Z0 + 1, -690, Z1 - 1, SOL + 0.05, lointain(pick(r, PONTONS), -700, cz));
    } else {
      const n = Math.round((9 + r() * 14) * elan), style = r() < 0.55 ? "balcons" : r() < 0.6 ? "bandes" : "verre", ton = teinteDe(r, style, 0.3), L = BAIE * Math.floor((Z1 - Z0 - 8 - r() * 20) / BAIE), z = Z0 + 4 + r() * (Z1 - Z0 - 8 - L);
      prisme("bandes", rect(-712, Z0 + 2, -658, Z1 - 2), SOL, SOL + 2 * NIV, { teinte: pick(r, BLANCS), toit: pick(r, PONTONS), niv, du: r() * 16 | 0 });
      corpsDeTour(r, style, ton, -688, z, -664, z + L, SOL + 2 * NIV, SOL + n * NIV, niv);
      terrasse(r, [-710, Z0 + 4, -691, Z1 - 4], SOL + 2 * NIV, niv);
    }
    // côté baie
    if (deco || r() < 0.3) {
      let z = Z0 + 1.5;
      while (z < Z1 - 14) {
        const l = 12 + r() * 9, n = 2 + (r() * 2 | 0); if (z + l > Z1 - 1) break;
        prisme("perce", rect(-628, z, -610, z + l), SOL, SOL + n * NIV, { teinte: r() < 0.6 ? pick(r, BLANCS) : pick(r, PASTELS), toit: pick(r, TUILES), niv, du: r() * 16 | 0, dv: r() * 16 | 0 });
        if (r() < 0.7) plaque(EAU, -606.5, z + 2, -600.5, z + l - 3, SOL + 0.3, lointain(BASSINS[0], -600, z));
        if (r() < 0.5 && (z > 440 || z < 140)) { caisse(PLAT, ILE_E, EAU_Y - 0.6, z + l / 2 - 0.9, ILE_E + 17, EAU_Y + 0.7, z + l / 2 + 0.9, QUAI, BOIS); if (r() < 0.7) amarres.push({ x: ILE_E + 9, z: z + l / 2 + 5, hx: 1, hz: 0, s: 0.3 + r() * 0.2 }); }
        arbres.push({ x: -604, y: SOL, z: z + l - 1, s: 2.6 + r() * 2, t: r() }); palmiers.push({ x: -600 + r() * 2, y: SOL, z: z + 1 + r() * 3, s: 0.8 + r() * 0.4 });
        z += l + 3 + r() * 5;
      }
      plaque(DALLE, -609, Z0 + 1, -598, Z1 - 1, SOL + 0.05, lointain(PELOUSE, -600, cz));
    } else {
      const n = Math.round((11 + r() * 17) * elan), style = styleTour(r, r() < 0.5), L = BAIE * (9 + (r() * 6 | 0)), z = Z0 + 3 + r() * Math.max(0, Z1 - Z0 - 6 - L);
      prisme("bandes", rect(-630, Z0 + 2, -599, Z1 - 2), SOL, SOL + 2 * NIV, { teinte: pick(r, BLANCS), toit: pick(r, PONTONS), niv, dv: r() * 16 | 0 });
      corpsDeTour(r, style, teinteDe(r, style, 0.2), -628, z, -604, Math.min(z + L, Z1 - 3), SOL + 2 * NIV, SOL + n * NIV, niv);
      if (z - Z0 > 20) bassin(-624, Z0 + 5, -607, Z0 + 12, SOL + 2 * NIV, r); else if (Z1 - z - L > 20) bassin(-624, Z1 - 12, -607, Z1 - 5, SOL + 2 * NIV, r);
    }
  }

  /* Le paquebot de croisière, à quai le long de l'île au nord du pont : la coque, les ponts à balcons, la passerelle, la cheminée */
  (function () {
    const r = alea(808), cx = -566, cz = 292, y0 = EAU_Y + 12.5, M = (pts) => pts.map((p) => [cx + p[0], cz + p[1]]), P = (x0, z0, x1, z1) => rect(cx + x0, cz + z0, cx + x1, cz + z1);
    const coque = [[-15, -120], [15, -120], [15, 84], [9.5, 106], [0, 121], [-9.5, 106], [-15, 84]];
    prisme(null, M(coque.map((p) => [p[0] * 1.012, p[1] * 1.004])), EAU_Y - 1, EAU_Y + 2.4, { teinte: C(0x1d2c4a), sansToit: true, sansOmbre: true });   // la ligne de flottaison
    prisme(null, M(coque), EAU_Y - 1, y0, { teinte: BLANCS[0], toit: C(0xb9a98a), parapet: 1.1, ao: 0.86 });
    prisme("balcons", P(-13.6, -104, 13.6, 70), y0, y0 + 7 * NIV, { teinte: BLANCS[0], toit: PONTONS[2], du: 3, dv: 2 });
    prisme("sombre", P(-15.6, 70, 15.6, 80), y0, y0 + 8 * NIV, { teinte: BLANC, toit: BLANCS[1], rive: BLANCS[0], du: 1, dv: 4 });                   // la passerelle, plus large que le navire
    prisme("bandes", P(-12, -92, 12, 52), y0 + 7 * NIV, y0 + 9 * NIV, { teinte: BLANCS[0], toit: PONTONS[0], du: 6, dv: 1 });
    bassin(cx - 6, cz - 30, cx + 6, cz - 8, y0 + 9 * NIV, r); bassin(cx - 5, cz + 12, cx + 5, cz + 26, y0 + 9 * NIV, r);
    prisme(null, P(-5.5, -74, 5.5, -54), y0 + 9 * NIV, y0 + 9 * NIV + 12, { teinte: C(0x1d2c4a), toit: C(0x20242c), parapet: 0 });                    // la cheminée
    caisse(PLAT, cx - 6, y0 + 9 * NIV + 8.5, cz - 75, cx + 6, y0 + 9 * NIV + 10.5, cz - 53, C(0xc8452c));
    caisse(PLAT, cx - 0.4, y0 + 8 * NIV, cz + 73, cx + 0.4, y0 + 8 * NIV + 9, cz + 73.8, BLANCS[0]); balise(cx, y0 + 8 * NIV + 9.5, cz + 73.4, 1.6, [1, 0.9, 0.7]);
    for (let k = 0; k < 9; k++) for (const c of [-1, 1]) caisse(PLAT, cx + c * 15.9 - 1.3, y0 - 0.4, cz - 96 + k * 18, cx + c * 15.9 + 1.3, y0 + 2, cz - 87 + k * 18, C(0xe07a2c), C(0xeeeae2));   // les canots
    caisse(PLAT, ILE_E, EAU_Y - 1, cz - 132, cx - 16.5, SOL, cz + 130, QUAI, BETON);                                                                 // le quai de la gare maritime
    for (let z = cz - 110; z <= cz + 110; z += 44) lueur(ILE_E + 6, SOL + 0.4, z, 11, C(0xffe0b4, 0.4));
  })();

  /* Les plantations : palmiers le long des avenues et sur leurs terre-pleins, arbres ronds dans les rues ; les voitures garées le long des trottoirs ; les réverbères */
  (function () {
    const r = alea(313);
    function ligne(nordSud, c, k, a0, a1) {                                                  // une voie d'axe c, parcourue de a0 à a1
      const avenue = (k & 1) === 1, bord = avenue ? 9 : 6.8, pose = (a, lat, quoi) => { const x = nordSud ? c + lat : a, z = nordSud ? a : c + lat; if (quoi) palmiers.push({ x, y: SOL, z, s: 0.82 + r() * 0.4 }); else arbres.push({ x, y: SOL, z, s: 2.6 + r() * 1.6, t: r() }); };
      for (let a = Math.ceil((a0 - 9) / 18) * 18 + 9; a < a1; a += 18) {
        const croix = Math.abs(((a - 45) % 90 + 135) % 90 - 45), x = nordSud ? c : a, z = nordSud ? a : c, d = Math.hypot(x, z), p = d < 380 ? 1 : d < 700 ? 0.42 : d < 1150 ? 0.1 : 0;
        if (croix > 16) for (const s of [-1, 1]) if (r() < p * (avenue ? 1 : 0.8)) pose(a, s * bord, avenue || r() < 0.25);
        if (avenue && croix > 26 && r() < p) pose(a - 9, 0, true);                             // le terre-plein
      }
      for (let a = Math.ceil(a0 / 6) * 6 + 3; a < a1; a += 6) {                                 // le stationnement le long des rues
        const croix = Math.abs(((a - 45) % 90 + 135) % 90 - 45), x = nordSud ? c : a, z = nordSud ? a : c, d = Math.hypot(x, z); if (avenue || croix < 23 || d > 760) continue;
        for (const s of [-1, 1]) if (r() < (d < 350 ? 0.6 : 0.26)) garees.push(nordSud ? { x: c + s * 4.65, y: SOL + 0.02, z: a, hx: 0, hz: -s } : { x: a, y: SOL + 0.02, z: c + s * 4.65, hx: s, hz: 0 });
      }
      for (let a = Math.ceil(a0 / 36) * 36, n = 0; a < a1; a += 36, n++) {                       // les réverbères, en quinconce
        const croix = Math.abs(((a - 45) % 90 + 135) % 90 - 45); if (croix < 9) continue;
        const lat = (n % 2 ? 1 : -1) * (avenue ? 5 : 3.2), x = nordSud ? c + lat : a, z = nordSud ? a : c + lat;
        lueur(x, SOL + 0.3, z, avenue ? 13 : 11, avenue ? C(0xffd2a0, 0.34) : C(0xffb774, 0.3));
      }
    }
    for (let k = -3; k <= 16; k++) ligne(true, 45 + 90 * k, k, -1550, 1550);
    for (let k = -18; k <= 17; k++) ligne(false, 45 + 90 * k, k, -238, 1500);
    // Miami Beach : Collins, ses palmiers, ses lumières
    for (let z = -1200; z < 1200; z += 18) { const croix = Math.abs(((z - 45) % 90 + 135) % 90 - 45); if (croix < 16) continue; for (const s of [-1, 1]) if (r() < 0.8) palmiers.push({ x: COLLINS + s * 9, y: SOL, z: z + 9, s: 0.85 + r() * 0.35 }); if (croix > 26 && r() < 0.8) palmiers.push({ x: COLLINS, y: SOL, z, s: 0.9 + r() * 0.3 }); }
    for (let z = -1500; z < 1500; z += 30) { lueur(COLLINS + ((z / 30) % 2 ? 5 : -5), SOL + 0.3, z, 13, C(0xffd2a0, 0.34)); if ((z / 30) % 3 === 0) lueur(-718, SOL + 0.7, z, 8, C(0xffc98a, 0.3)); }
    for (let k = -17; k <= 16; k++) for (let x = ILE_O + 12; x < ILE_E; x += 34) lueur(x, SOL + 0.3, 45 + 90 * k + 3, 11, C(0xffb774, 0.3));
  })();

  /* ───────────────────────── 7. Les ombres portées, dessinées au sol ─────────────────────────
     Chaque volume laisse au sol la trace balayée par ses arêtes « sous le vent » du soleil. Les arbres laissent une tache. */
  function tracerOmbres(dir) {
    const T = tampon(), ox = -dir[0] / dir[1], oz = -dir[2] / dir[1], y = SOL + 0.2, noir = [0, 0, 0];
    for (const o of ombres) {
      const pts = o[0], h0 = o[1], h1 = o[2], n = pts.length; let aire = 0;
      for (let k = 0; k < n; k++) aire += pts[k][0] * pts[(k + 1) % n][1] - pts[(k + 1) % n][0] * pts[k][1];
      const s = aire > 0 ? 1 : -1;
      if (h0 > 0.05) polyH(T, pts.map((p) => [p[0] + ox * h0, p[1] + oz * h0]), y, noir);
      for (let k = 0; k < n; k++) {
        const a = pts[k], b = pts[(k + 1) % n]; if (s * ((b[1] - a[1]) * ox - (b[0] - a[0]) * oz) <= 0) continue;
        quad(T, [a[0] + ox * h0, y, a[1] + oz * h0, b[0] + ox * h0, y, b[1] + oz * h0, b[0] + ox * h1, y, b[1] + oz * h1, a[0] + ox * h1, y, a[1] + oz * h1], [0, 1, 0], null, noir);
      }
    }
    const tache = (x, z, h, ray) => { const p = []; for (let k = 0; k < 9; k++) { const q = ray * (0.86 + 0.14 * Math.sin(k * 2.4 + x)); p.push([x + ox * h + q * Math.cos(k * 0.698), z + oz * h + q * 0.82 * Math.sin(k * 0.698)]); } polyH(T, p, y, noir); };
    for (const p of palmiers) if (p.y < SOL + 1 && Math.hypot(p.x, p.z) < 520) tache(p.x, p.z, 8.6 * p.s, 2.5 * p.s);
    for (const a of arbres) if (a.y > SOL - 1 && a.y < SOL + 1 && Math.hypot(a.x, a.z) < 520) tache(a.x, a.z, 1.25 * a.s, 1.12 * a.s);
    return T;
  }

  /* ───────────────────────── 8. Les mailles fondues ───────────────────────── */
  maille(SOLT, matSol); maille(DALLE, matDalle); maille(PLAT, matPlat); maille(EAU, matEau);
  for (const nom in F) maille(F[nom], matFacades[nom]);
  let dirOmbres = SOLEIL, mOmbres = maille(tracerOmbres(SOLEIL), matOmbre, 2);
  const mEcume = maille(ECUME, matEcume, 3);
  const mLum = maille(LUM, matLum, 4); mLum.visible = false;

  /* ───────────────────────── 9. Les exemplaires : palmiers, arbres, voitures, bateaux ───────────────────────── */
  function verser(T, g, col, sens) {                                                          // recopie un morceau de modèle dans un tampon, d'une seule couleur
    const pos = g.attributes.position, nor = g.attributes.normal, b = T.nb, s = sens || 1;
    for (let i = 0; i < pos.count; i++) { T.p.push(s * pos.getX(i), pos.getY(i), s * pos.getZ(i)); if (nor) T.n.push(s * nor.getX(i), nor.getY(i), s * nor.getZ(i)); else T.n.push(0, 1, 0); T.u.push(0, 0); T.c.push(col[0], col[1], col[2]); }
    if (g.index) for (let i = 0; i < g.index.count; i++) T.i.push(b + g.index.getX(i)); else for (let i = 0; i < pos.count; i++) T.i.push(b + i);
    T.nb += pos.count;
  }
  function couleurs(m, n) { m.instanceColor = new THREE.BufferAttribute(new Float32Array(Math.max(1, n) * 3).fill(1), 3); }
  const foyer = (p) => Math.min(Math.hypot(p.x + 30, p.z + 30), Math.hypot(p.x - 70, p.z - 70) + 70);   // la distance aux endroits qu'on regarde de près

  /* Le palmier léger (au loin) : un tronc à quatre faces, huit palmes pliées */
  function geoPalmier() {
    const T = tampon(), tronc = C(0x8a765e), sombre = C(0x35602f), clair = C(0x6f9448), mi = mel(sombre, clair, 0.5), h = 7.8;
    for (let k = 0; k < 4; k++) {
      const a0 = k * Math.PI / 2, a1 = a0 + Math.PI / 2, am = a0 + Math.PI / 4;
      quad(T, [0.26 * Math.cos(a0), 0, 0.26 * Math.sin(a0), 0.26 * Math.cos(a1), 0, 0.26 * Math.sin(a1), 0.16 * Math.cos(a1), h, 0.16 * Math.sin(a1), 0.16 * Math.cos(a0), h, 0.16 * Math.sin(a0)], [Math.cos(am), 0, Math.sin(am)], null, fois(tronc, 0.8), tronc);
    }
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4 + (k % 2) * 0.22, ca = Math.cos(a), sa = Math.sin(a), L = 3.1 + (k % 3) * 0.35, w = 0.62, N = [ca * 0.35, 0.94, sa * 0.35];
      const g = [ca * L * 0.5 - sa * w, h + 0.75, sa * L * 0.5 + ca * w], d = [ca * L * 0.5 + sa * w, h + 0.75, sa * L * 0.5 - ca * w];
      tri(T, [0, h + 0.15, 0].concat(g, d), N, sombre, mi, mi); tri(T, g.concat([ca * L, h - 0.75 - (k % 2) * 0.4, sa * L], d), N, mi, clair, mi);
    }
    return geoDe(T);
  }
  /* Le palmier de moyenne distance : un stipe un peu penché, onze palmes arquées qui retombent (trois tronçons pliés en V),
     les jeunes dressées au cœur, une ou deux vieilles palmes jaunies qui pendent */
  function geoPalmierMoyen() {
    const T = tampon(), r = alea(4242), tronc = C(0x8f7d66), h = 8.3, V0 = C(0x2c4f2d), V1 = C(0x4a7739), V2 = C(0x76964c), SEC = C(0x8f8850);
    const axe = (t) => [0.5 * t * t, h * t, 0.18 * t * t];
    for (let s = 0; s < 3; s++) {
      const a = axe(s / 3), b = axe((s + 1) / 3), ra = 0.3 - 0.045 * s, rb = 0.3 - 0.045 * (s + 1);
      for (let k = 0; k < 5; k++) {
        const a0 = k * 1.2566, a1 = a0 + 1.2566, am = a0 + 0.6283;
        quad(T, [a[0] + ra * Math.cos(a0), a[1], a[2] + ra * Math.sin(a0), a[0] + ra * Math.cos(a1), a[1], a[2] + ra * Math.sin(a1), b[0] + rb * Math.cos(a1), b[1], b[2] + rb * Math.sin(a1), b[0] + rb * Math.cos(a0), b[1], b[2] + rb * Math.sin(a0)],
          [Math.cos(am), 0, Math.sin(am)], null, fois(tronc, 0.7 + 0.09 * s), fois(tronc, 0.79 + 0.09 * s));
      }
    }
    const s0 = axe(1), N = 11;
    for (let k = 0; k < N; k++) {
      const az = (k + r() * 0.5) * 6.2832 / N, ca = Math.cos(az), sa = Math.sin(az), dresse = k % 3 === 1, pend = k % 5 === 4;
      const L = (dresse ? 2.7 : 3.6) + r() * 0.8, lever = dresse ? 1.15 : pend ? 0.28 : 0.55 + r() * 0.3, chute = dresse ? 0.75 : pend ? 1.25 : 1.2 + r() * 0.5, w = 0.54 + r() * 0.14, k0 = 0.85 + r() * 0.3;
      let avant = null;
      for (let s = 0; s <= 3; s++) {
        const t = s / 3, rad = L * (t - 0.14 * t * t), y = s0[1] + 0.15 + L * (lever * t - chute * t * t), ww = s === 3 ? 0.06 : w * (0.5 + 0.5 * Math.sin(Math.PI * Math.min(1, t * 1.5) / 2));
        const x = s0[0] + ca * rad, z = s0[2] + sa * rad, pli = 0.34 * ww;
        const col = fois(pend ? mel(V1, SEC, 0.65) : t < 0.5 ? mel(V0, V1, t * 2) : mel(V1, V2, t * 2 - 1), k0);
        const ici = { m: [x, y, z], g: [x - sa * ww, y - pli, z + ca * ww], d: [x + sa * ww, y - pli, z - ca * ww], col };
        if (avant) { quadLibre(T, avant.g.concat(avant.m, ici.m, ici.g), avant.col, col); quadLibre(T, avant.m.concat(avant.d, ici.d, ici.m), fois(avant.col, 0.84), fois(col, 0.84)); }
        avant = ici;
      }
    }
    return geoDe(T);
  }
  /* L'arbre : niveau 2 = un houppier à cinq lobes et son tronc ; niveau 1 = une boule bosselée ; niveau 0 (au loin) = un volume à vingt faces.
     Les normales sont lissées sur tout le houppier (pas de facettes), le dessous est sombre, le feuillage moucheté. */
  function geoArbre(niveau) {
    const T = tampon(), lobes = niveau === 2 ? [[0, 1.52, 0, 0.9], [0.72, 1.2, 0.26, 0.7], [-0.62, 1.24, -0.5, 0.74], [-0.16, 1.22, 0.8, 0.64], [0.34, 1.3, -0.74, 0.6]] : [[0, 1.3, 0, 1]];
    if (niveau === 2) for (let k = 0; k < 5; k++) {                                            // le tronc (sa couleur compense la teinte verte donnée à chaque arbre)
      const a0 = k * 1.2566, a1 = a0 + 1.2566, am = a0 + 0.6283, bois = [0.9, 0.42, 0.7];
      quad(T, [0.1 * Math.cos(a0), 0, 0.1 * Math.sin(a0), 0.1 * Math.cos(a1), 0, 0.1 * Math.sin(a1), 0.07 * Math.cos(a1), 1, 0.07 * Math.sin(a1), 0.07 * Math.cos(a0), 1, 0.07 * Math.sin(a0)], [Math.cos(am), 0, Math.sin(am)], null, bois);
    }
    for (const b of lobes) {
      const g = niveau === 0 ? new THREE.IcosahedronGeometry(1, 0) : new THREE.SphereGeometry(1, niveau === 2 ? 8 : 7, niveau === 2 ? 5 : 4), p = g.attributes.position, base = T.nb;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = b[3] * (1 + 0.1 * Math.sin(x * 7.1 + z * 5.3 + y * 3.7 + b[0] * 9) + 0.07 * Math.sin(z * 11.3 - x * 4.1));
        const X = b[0] + x * k, Y = b[1] + y * 0.76 * k, Z = b[2] + z * k, nx = x + X * 0.9, ny = y + (Y - 1.1) * 1.1, nz = z + Z * 0.9, nl = Math.hypot(nx, ny, nz) || 1;
        const tache = Math.sin(X * 12.9898 + Y * 78.233 + Z * 37.719) * 43758.5453, c = (0.36 + 0.66 * borne((Y - 0.6) / 1.35, 0, 1)) * (0.86 + 0.24 * (tache - Math.floor(tache)));
        T.p.push(X, Y, Z); T.n.push(nx / nl, ny / nl, nz / nl); T.u.push(0, 0); T.c.push(c, c, c * 0.94);
      }
      if (g.index) for (let i = 0; i < g.index.count; i++) T.i.push(base + g.index.getX(i)); else for (let i = 0; i < p.count; i++) T.i.push(base + i);
      T.nb += p.count; g.dispose();
    }
    return geoDe(T);
  }
  /* La voiture légère : une caisse, un habitacle vitré, l'ombre dessous (l'avant est en +z) */
  function geoAuto() {
    const T = tampon(), b = [1, 1, 1], vitre = C(0x1b2229), B = [-0.86, 0.84, -1.5, 0.86, 0.84, 0.85], H = [-0.72, 1.36, -1.1, 0.72, 1.36, 0.35];
    caisse(T, -0.92, 0.3, -2.25, 0.92, 0.84, 2.25, b, b);
    quad(T, [B[0], B[1], B[5], B[3], B[1], B[5], H[3], H[1], H[5], H[0], H[1], H[5]], [0, 0.5, 0.86], null, vitre);
    quad(T, [B[3], B[1], B[2], B[0], B[1], B[2], H[0], H[1], H[2], H[3], H[1], H[2]], [0, 0.5, -0.86], null, vitre);
    quad(T, [B[0], B[1], B[2], B[0], B[1], B[5], H[0], H[1], H[5], H[0], H[1], H[2]], [-0.96, 0.26, 0], null, vitre);
    quad(T, [B[3], B[1], B[5], B[3], B[1], B[2], H[3], H[1], H[2], H[3], H[1], H[5]], [0.96, 0.26, 0], null, vitre);
    plaque(T, H[0], H[2], H[3], H[5], H[1], b); plaque(T, -1.02, -2.35, 1.02, 2.35, 0.04, C(0x101113));
    return geoDe(T);
  }
  /* La voiture détaillée : les morceaux du modèle fondus en un seul, sans les roues (invisibles de si haut), la caisse en blanc pour prendre la teinte de chaque exemplaire */
  function geoAutoVraie(mod) {
    const T = tampon(), L = mod.longueur; let caisseP = null, max = 0, avant = 1;
    const infos = mod.parties.map((p) => {
      p.geometry.computeBoundingBox(); const bb = p.geometry.boundingBox, n = (p.geometry.index ? p.geometry.index.count : p.geometry.attributes.position.count) / 3;
      const roue = (bb.max.z - bb.min.z) < 0.22 * L && bb.min.y < 0.04 * L; if (!roue && n > max) { max = n; caisseP = p; }
      if (/head/i.test(p.nom || "")) avant = (bb.min.z + bb.max.z) > 0 ? 1 : -1; return { p, roue };
    });
    for (const q of infos) if (!q.roue) verser(T, q.p.geometry, q.p === caisseP ? [1, 1, 1] : [q.p.material.color.r, q.p.material.color.g, q.p.material.color.b], avant);
    const l = mod.taille.x / 2 - 0.1; caisse(T, -l, 0.03, -L / 2 + 0.3, l, 0.4, L / 2 - 0.3, C(0x0e0f10));   // le dessous sombre tient lieu de roues et d'ombre
    return geoDe(T);
  }
  /* Un bateau : le modèle fondu, ou à défaut une coque pointue, un roof, un mât et sa voile */
  function geoBateau(mod, voilier) {
    const T = tampon();
    if (mod) {
      for (const p of mod.parties) { const c = p.material.color; let col = [c.r, c.g, c.b]; if (voilier && /sail/i.test(p.nom || "")) col = [0.9, 0.88, 0.82]; else if (voilier && /light/i.test(p.nom || "")) col = [0.8, 0.8, 0.78]; verser(T, p.geometry, col, 1); }
      return geoDe(T);
    }
    const L = voilier ? 12 : 32, l = voilier ? 1.8 : 3.8, h = voilier ? 1.2 : 2.8, blanc = C(0xf3f3ee), pts = [[-l, -L / 2], [l, -L / 2], [l, L * 0.15], [0, L / 2], [-l, L * 0.15]];
    for (let k = 0; k < 5; k++) { const a = pts[k], b = pts[(k + 1) % 5], nn = Math.hypot(b[1] - a[1], a[0] - b[0]); quad(T, [a[0] * 0.8, 0, a[1], b[0] * 0.8, 0, b[1], b[0], h, b[1], a[0], h, a[1]], [(b[1] - a[1]) / nn, 0, (a[0] - b[0]) / nn], null, fois(blanc, 0.8), blanc); }
    polyH(T, pts, h, C(0xd9cdb6));
    if (voilier) { caisse(T, -0.1, h, -0.1, 0.1, h + 13, 0.1, C(0xcfcfcf)); tri(T, [0, h + 1.5, -0.2, 0, h + 12.5, -0.2, 0, h + 1.5, -5.2], [1, 0, 0], [0.92, 0.9, 0.84]); tri(T, [0, h + 1.5, 0.3, 0, h + 10, 0.3, 0, h + 1.5, 4.6], [1, 0, 0], [0.92, 0.9, 0.84]); }
    else { caisse(T, -l * 0.7, h, -L * 0.28, l * 0.7, h + 2.5, L * 0.14, blanc); caisse(T, -l * 0.5, h + 2.5, -L * 0.2, l * 0.5, h + 4.6, L * 0.04, blanc); }
    return geoDe(T);
  }

  // les palmiers : les plus proches en modèle détaillé, puis le palmier moyen (jusqu'au premier plan de la « Vue sur Miami »), puis le palmier léger
  palmiers.sort((a, b) => foyer(a) - foyer(b));
  (function () {
    const r = alea(401), mods = MODELES.palmiers || [], nVrais = mods.length ? Math.min(DETAIL.palmiers, palmiers.length) : 0, parModele = mods.map(() => []);
    for (let i = 0; i < nVrais; i++) parModele[i % mods.length].push(palmiers[i]);
    mods.forEach((mod, k) => { for (const part of mod.parties) {
      const mat = part.material.clone(); mat.color.setRGB(0.78, 0.8, 0.7); mat.roughness = 0.9; mat.metalness = 0;      // un vert moins vif (matière copiée : le modèle sert peut-être ailleurs)
      const m = instances(part.geometry, mat, parModele[k].length), ra = alea(410 + k);
      parModele[k].forEach((p, i) => { const a = ra() * 6.283; ecrire(m.instanceMatrix.array, i, p.x, p.y, p.z, Math.sin(a), Math.cos(a), p.s * 1.02); }); m.count = parModele[k].length;
    } });
    const foyerLarge = (p) => Math.min(foyer(p), Math.hypot(p.x - 250, p.z - 30) + 60), reste = palmiers.slice(nVrais).sort((a, b) => foyerLarge(a) - foyerLarge(b));
    const matPalme = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide }), nMoyens = Math.min(DETAIL.palmiersMoyens, reste.length);
    [[geoPalmierMoyen(), 0, nMoyens, true], [geoPalmier(), nMoyens, reste.length, false]].forEach((lot) => {
      const n = lot[2] - lot[1], m = instances(lot[0], matPalme, n); couleurs(m, n);
      for (let i = 0; i < n; i++) {
        const p = reste[lot[1] + i], a = r() * 6.283, c = lointain(fois(BLANC, 0.85 + r() * 0.3), p.x, p.z), e = lot[3] ? p.s * (1 + r() * 0.2) : p.s * 1.25;
        ecrire(m.instanceMatrix.array, i, p.x, p.y, p.z, Math.sin(a), Math.cos(a), e, lot[3] ? e : p.s * (1.05 + r() * 0.3)); m.instanceColor.setXYZ(i, c[0], c[1], c[2]);
      }
      m.count = n;
    });
    // les arbres, de verts un peu différents : trois niveaux de détail selon la distance
    arbres.sort((a, b) => foyer(a) - foyer(b));
    const matArbre = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 }), V1 = C(0x3f6337), V2 = C(0x5e8446), V3 = C(0x74904a), nFins = Math.min(DETAIL.arbres, arbres.length), nMoyens2 = Math.min(nFins + DETAIL.arbresMoyens, arbres.length);
    [[geoArbre(2), 0, nFins], [geoArbre(1), nFins, nMoyens2], [geoArbre(0), nMoyens2, arbres.length]].forEach((lot) => {
      const nb = lot[2] - lot[1], ma = instances(lot[0], matArbre, nb); couleurs(ma, nb);
      for (let i = 0; i < nb; i++) { const p = arbres[lot[1] + i], a = r() * 6.283, c = lointain(p.t < 0.5 ? mel(V1, V2, p.t * 2) : mel(V2, V3, p.t * 2 - 1), p.x, p.z); ecrire(ma.instanceMatrix.array, i, p.x, p.y, p.z, Math.sin(a), Math.cos(a), p.s, p.s * (0.8 + r() * 0.3)); ma.instanceColor.setXYZ(i, c[0], c[1], c[2]); }
      ma.count = nb;
    });
  })();

  // les voitures : la circulation suit des circuits fermés (une voie dans un sens, demi-tour, la voie d'en face), on roule à droite
  const TEINTES_AUTO = [0xf2f2f0, 0xf2f2f0, 0xf2f2f0, 0xdcdddf, 0xb9bcc0, 0x8d9196, 0x55585d, 0x1c1d20, 0x1c1d20, 0x2a3f6b, 0x8c1f24, 0x6f7f8c, 0xcdbf9f, 0x3d5c4a].map((h) => new THREE.Color(h).convertSRGBToLinear()), TAXI = new THREE.Color(0xf2c318).convertSRGBToLinear();
  const circuits = [];
  function circuit(axeX, c, a, b, o, pas, pont) {
    const L = b - a, arc = Math.PI * o, ci = { axeX, c, a, b, o, L, arc, tour: 2 * (L + arc), autos: [], pont: !!pont, kc: Math.round((c - 45) / 90) }, n = Math.max(1, Math.round(ci.tour / pas));
    for (let k = 0; k < n; k++) { const v0 = 8.5 + R() * 4.5; ci.autos.push({ s: (k + 0.15 + 0.7 * R()) * ci.tour / n, v: v0, v0, t: R() * 4 | 0, c: R() < 0.035 ? -1 : R() * TEINTES_AUTO.length | 0 }); }
    circuits.push(ci);
  }
  for (let k = -3; k <= 9; k++) { const x = 45 + 90 * k; if (k & 1) { circuit(false, x, -790, 790, 3, 85); circuit(false, x, -790, 790, 6.35, 95); } else circuit(false, x, -790, 790, 1.75, 125); }
  for (let k = -9; k <= 8; k++) { const z = 45 + 90 * k, pont = PONTS_Z.indexOf(z) >= 0, a = pont ? -706 : -219; if (k & 1) { circuit(true, z, a, 880, 3, 85, pont); circuit(true, z, a, 880, 6.35, 95, pont); } else circuit(true, z, a, 880, 1.75, 125); }
  circuit(false, COLLINS, -900, 900, 3, 90); circuit(false, COLLINS, -900, 900, 6.35, 120);
  const nRoulantes = circuits.reduce((n, ci) => n + ci.autos.length, 0);
  /* La place d'une voiture sur son circuit : l'aller, le demi-tour, le retour, le demi-tour */
  const P = { x: 0, z: 0, hx: 0, hz: 1, q: 0, sens: 0 };
  function surCircuit(ci, s) {
    const L = ci.L, arc = ci.arc, o = ci.o; let q, lat, ha, hl; P.sens = 0;
    if (s < L) { q = ci.a + s; lat = o; ha = 1; hl = 0; P.sens = 1; }
    else if (s < L + arc) { const t = (s - L) / o; q = ci.b + o * Math.sin(t); lat = o * Math.cos(t); ha = Math.cos(t); hl = -Math.sin(t); }
    else if (s < 2 * L + arc) { q = ci.b - (s - L - arc); lat = -o; ha = -1; hl = 0; P.sens = -1; }
    else { const t = (s - 2 * L - arc) / o; q = ci.a - o * Math.sin(t); lat = -o * Math.cos(t); ha = -Math.cos(t); hl = Math.sin(t); }
    P.q = q;
    if (ci.axeX) { P.x = q; P.z = ci.c + lat; P.hx = ha; P.hz = hl; } else { P.z = q; P.x = ci.c - lat; P.hz = ha; P.hx = -hl; }   // vers l'est, la droite est au sud (+z) ; vers +z, la droite est à l'ouest
  }
  /* Le feu du prochain carrefour : renvoie la distance à la ligne d'arrêt s'il est rouge, sinon -1 */
  function feuRouge(ci, q, sens, ts) {
    const k = sens > 0 ? Math.floor((q - 45) / 90) + 1 : Math.ceil((q - 45) / 90) - 1;
    if (ci.axeX ? (k < -3 || k > 9) : (k < -9 || k > 8)) return -1;
    const d = (45 + 90 * k - q) * sens - ((k & 1) ? 16.3 : 14.1); if (d < 0) return -1;
    const kx = ci.axeX ? k : ci.kc, kz = ci.axeX ? ci.kc : k, ph = (ts + ((kx * 5 + kz * 3) % 7 + 7) % 7 * 4.86) % 34;
    return (ci.axeX ? ph < 14 : (ph >= 17 && ph < 31)) ? -1 : d;
  }

  garees.sort((a, b) => foyer(a) - foyer(b));
  const matAuto = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.36, metalness: 0.3 });
  const modsAuto = MODELES.voitures || [], nVraiesGarees = modsAuto.length ? Math.min(DETAIL.autosGarees, garees.length) : 0, parType = Math.ceil(DETAIL.autosRoulantes / Math.max(1, modsAuto.length));
  const rA = alea(977), teinteAuto = () => rA() < 0.02 ? TAXI : TEINTES_AUTO[rA() * TEINTES_AUTO.length | 0];
  const vraies = modsAuto.map((mod, k) => {                                                   // un tracé par modèle : d'abord les garées (fixes), puis celles qui roulent près de la tour
    const fixes = []; for (let i = k; i < nVraiesGarees; i += modsAuto.length) fixes.push(garees[i]);
    const m = instances(geoAutoVraie(mod), matAuto, fixes.length + parType); couleurs(m, fixes.length + parType); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    fixes.forEach((g, i) => { const c = teinteAuto(); ecrire(m.instanceMatrix.array, i, g.x, g.y, g.z, g.hx, g.hz, 1); m.instanceColor.setXYZ(i, c.r, c.g, c.b); });
    m.count = fixes.length; return { m, fixes: fixes.length, max: fixes.length + parType };
  });
  const nLegGarees = garees.length - nVraiesGarees, legeres = instances(geoAuto(), matAuto, nLegGarees + nRoulantes); couleurs(legeres, nLegGarees + nRoulantes); legeres.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  for (let i = 0; i < nLegGarees; i++) { const g = garees[nVraiesGarees + i], c = teinteAuto(); ecrire(legeres.instanceMatrix.array, i, g.x, g.y, g.z, g.hx, g.hz, 1); legeres.instanceColor.setXYZ(i, c.r, c.g, c.b); }
  /* Les phares et les feux arrière, la nuit : une tache claire devant, un point rouge derrière, additionnés à l'image */
  const feux = (function () {
    const T = tampon(), blanc = [1, 0.92, 0.76], rouge = [0.95, 0.07, 0.03];
    eventail(T, 0, 0.15, 7, 2.4, 5.5, fois(blanc, 0.5)); eventail(T, 0, 0.5, -2.6, 1.5, 1.1, fois(rouge, 0.8));
    quad(T, [-0.85, 0.45, 2.32, 0.85, 0.45, 2.32, 0.85, 0.9, 2.32, -0.85, 0.9, 2.32], [0, 0, 1], null, blanc); quad(T, [-0.85, 0.5, -2.32, 0.85, 0.5, -2.32, 0.85, 0.9, -2.32, -0.85, 0.9, -2.32], [0, 0, -1], null, rouge);
    const m = instances(geoDe(T), matLum, nRoulantes); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.renderOrder = 5; m.visible = false; return m;
  })();
  let nuit = false;
  const R2 = DETAIL.rayonAutos * DETAIL.rayonAutos, compte = vraies.map(() => 0);
  function majAutos(dt, ts) {
    let nL = nLegGarees, nF = 0; for (let k = 0; k < vraies.length; k++) compte[k] = vraies[k].fixes;
    const LA = legeres.instanceMatrix.array, LC = legeres.instanceColor.array, FA = feux.instanceMatrix.array;
    for (const ci of circuits) {
      const A = ci.autos, n = A.length;
      for (let i = 0; i < n; i++) {
        const a = A[i]; surCircuit(ci, a.s);
        if (dt > 0) {
          let cible = a.v0;
          if (n > 1) { let ecart = A[(i + 1) % n].s - a.s; if (ecart <= 0) ecart += ci.tour; ecart -= 5.6; if (ecart < 15) cible = Math.min(cible, Math.max(0, (ecart - 1.5) * 0.9)); }   // on garde ses distances
          if (P.sens !== 0) { const d = feuRouge(ci, P.q, P.sens, ts); if (d >= 0 && d < 45 && d >= a.v * a.v / 11 - 1.5) cible = Math.min(cible, Math.sqrt(Math.max(0, d - 0.4) * 7)); }   // on freine au feu rouge, si on peut encore
          a.v = cible < a.v ? Math.max(cible, a.v - 10 * dt) : Math.min(cible, a.v + 2.4 * dt);
          a.s += a.v * dt; if (a.s >= ci.tour) a.s -= ci.tour;
        }
        const y = SOL + 0.02 + (ci.pont && P.x < RIVE ? hautPont(P.x) : 0), col = a.c < 0 ? TAXI : TEINTES_AUTO[a.c], k = vraies.length ? a.t % vraies.length : -1;
        if (k >= 0 && P.x * P.x + P.z * P.z < R2 && compte[k] < vraies[k].max) { const v = vraies[k], j = compte[k]++; ecrire(v.m.instanceMatrix.array, j, P.x, y, P.z, P.hx, P.hz, 1); v.m.instanceColor.setXYZ(j, col.r, col.g, col.b); }
        else { ecrire(LA, nL, P.x, y, P.z, P.hx, P.hz, 1); LC[3 * nL] = col.r; LC[3 * nL + 1] = col.g; LC[3 * nL + 2] = col.b; nL++; }
        if (nuit) ecrire(FA, nF++, P.x, y, P.z, P.hx, P.hz, 1);
      }
    }
    legeres.count = nL; legeres.instanceMatrix.needsUpdate = true; legeres.instanceColor.needsUpdate = true;
    for (let k = 0; k < vraies.length; k++) { const v = vraies[k]; v.m.count = compte[k]; v.m.instanceMatrix.needsUpdate = true; v.m.instanceColor.needsUpdate = true; }
    feux.count = nF; if (nuit) feux.instanceMatrix.needsUpdate = true;
  }

  // les bateaux : à quai (fixes), et quelques-uns en route sur de grandes boucles, avec leur sillage
  const PROUE = { yacht: 1, voilier: 1 };                                                     // le sens de la proue dans chaque modèle (+z ou -z)
  const flotte = [];
  (function () {
    const r = alea(555);
    for (let k = 0; k < 5; k++) flotte.push({ voilier: false, cx: -425, cz: -100, rx: 30, rz: 800, a: k * 1.26 + r() * 0.5, w: (0.0075 + r() * 0.003), s: 0.55 + r() * 0.45 });             // le chenal de la baie, sous les ponts
    for (let k = 0; k < 3; k++) flotte.push({ voilier: false, cx: -1010 - k * 70, cz: 60, rx: 55, rz: 1050, a: k * 2.1 + r(), w: -(0.006 + r() * 0.003), s: 0.6 + r() * 0.4 });           // au large de la plage
    for (const p of [[-500, -160, 34, 70], [-365, 20, 22, 60], [-490, 300, 28, 80], [-350, -290, 26, 60], [-480, 30, 30, 55], [-545, -300, 25, 70], [-380, 330, 30, 70]]) flotte.push({ voilier: true, cx: p[0], cz: p[1], rx: p[2], rz: p[3], a: r() * 6.283, w: (r() < 0.5 ? -1 : 1) * (0.03 + r() * 0.02), s: 0.9 + r() * 0.5 });
    for (let k = 0; k < 7; k++) flotte.push({ voilier: true, cx: -900 - r() * 380, cz: -700 + r() * 1400, rx: 40 + r() * 50, rz: 60 + r() * 90, a: r() * 6.283, w: (r() < 0.5 ? -1 : 1) * (0.02 + r() * 0.015), s: 0.9 + r() * 0.6 });
  })();
  const matBateau = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.05, side: THREE.DoubleSide });
  const quaiY = amarres.filter((b) => !b.voilier && b.s >= 0.6), quaiV = amarres.filter((b) => b.voilier), petitsBateaux = amarres.filter((b) => !b.voilier && b.s < 0.6), enRouteY = flotte.filter((b) => !b.voilier), enRouteV = flotte.filter((b) => b.voilier);
  const barques = instances(geoBateau(null, false), matBateau, petitsBateaux.length);       // les petits bateaux des marinas : une coque simple suffit
  petitsBateaux.forEach((b, i) => ecrire(barques.instanceMatrix.array, i, b.x, EAU_Y - 0.15, b.z, b.hx, b.hz, b.s)); barques.count = petitsBateaux.length;
  const yachts = instances(geoBateau(MODELES.bateaux && MODELES.bateaux.yacht, false), matBateau, quaiY.length + enRouteY.length), voiliers = instances(geoBateau(MODELES.bateaux && MODELES.bateaux.voilier, true), matBateau, quaiV.length + enRouteV.length);
  yachts.instanceMatrix.setUsage(THREE.DynamicDrawUsage); voiliers.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  quaiY.forEach((b, i) => ecrire(yachts.instanceMatrix.array, i, b.x, EAU_Y - 0.25 * b.s, b.z, b.hx * PROUE.yacht, b.hz * PROUE.yacht, b.s));
  quaiV.forEach((b, i) => ecrire(voiliers.instanceMatrix.array, i, b.x, EAU_Y - 0.2, b.z, b.hx * PROUE.voilier, b.hz * PROUE.voilier, 3.2 * b.s));
  yachts.count = quaiY.length + enRouteY.length; voiliers.count = quaiV.length + enRouteV.length;
  const sillages = (function () {                                                             // un triangle clair qui s'élargit et s'éteint derrière le bateau
    const T = tampon(), b = [0.75, 0.8, 0.8], n = [0, 0, 0];
    tri(T, [0, 0, -9, -10, 0, -100, 0, 0, -100], [0, 1, 0], b, n, [0.1, 0.11, 0.11]); tri(T, [0, 0, -9, 0, 0, -100, 10, 0, -100], [0, 1, 0], b, [0.1, 0.11, 0.11], n);
    tri(T, [0, 0, 17, -5.5, 0, -14, 5.5, 0, -14], [0, 1, 0], [0.3, 0.32, 0.32], n, n);
    const m = instances(geoDe(T), new THREE.MeshBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }), flotte.length);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.renderOrder = 3; m.count = flotte.length; return m;
  })();
  function majBateaux(dt) {
    let iy = quaiY.length, iv = quaiV.length, n = 0;
    for (const b of flotte) {
      b.a += b.w * dt; const ca = Math.cos(b.a), sa = Math.sin(b.a), x = b.cx + b.rx * ca, z = b.cz + b.rz * sa, sg = b.w < 0 ? -1 : 1; let hx = -b.rx * sa * sg, hz = b.rz * ca * sg; const l = Math.hypot(hx, hz); hx /= l; hz /= l;
      if (b.voilier) { ecrire(voiliers.instanceMatrix.array, iv++, x, EAU_Y - 0.2, z, hx * PROUE.voilier, hz * PROUE.voilier, 1.25 * b.s); ecrire(sillages.instanceMatrix.array, n++, x, EAU_Y + 0.15, z, hx, hz, 0.16 * b.s); }
      else { ecrire(yachts.instanceMatrix.array, iy++, x, EAU_Y - 0.25 * b.s, z, hx * PROUE.yacht, hz * PROUE.yacht, b.s); ecrire(sillages.instanceMatrix.array, n++, x, EAU_Y + 0.15, z, hx, hz, b.s); }
    }
    yachts.instanceMatrix.needsUpdate = voiliers.instanceMatrix.needsUpdate = sillages.instanceMatrix.needsUpdate = true;
  }

  /* ───────────────────────── 10. La vie de la ville, image après image, et les deux ambiances ───────────────────────── */
  let aFaire = true;
  function maj(dt, t) {
    if (calme && !aFaire) return;                                                             // mouvement réduit : tout reste en place
    const pas = calme ? 0 : Math.min(0.05, dt || 0), ts = (t || 0) / 1000; aFaire = false;
    uEau.value.set(ts * 0.0085, ts * 0.0052, -ts * 0.0021, ts * 0.0034);                      // le clapot glisse
    texEcume.offset.y = (ts * 0.03) % 1;                                                      // les rouleaux avancent vers la plage
    majAutos(pas, ts); majBateaux(pas);
  }
  function ambiance(nom, a) {
    nuit = nom === "nuit"; aFaire = true;
    mLum.visible = feux.visible = nuit; mOmbres.visible = !nuit;
    matEau.color.setHex(nuit ? 0x33466b : 0xffffff); matEcume.color.setScalar(nuit ? 0.22 : 1); sillages.material.color.setScalar(nuit ? 0.25 : 1);
    if (!nuit && a && a.dir && Math.abs(a.dir[0] / a.dir[1] - dirOmbres[0] / dirOmbres[1]) + Math.abs(a.dir[2] / a.dir[1] - dirOmbres[2] / dirOmbres[1]) > 0.02) {   // le soleil a bougé : on retrace les ombres
      scene.remove(mOmbres); mOmbres.geometry.dispose(); dirOmbres = a.dir.slice(); mOmbres = maille(tracerOmbres(dirOmbres), matOmbre, 2);
    }
  }
  maj(0, 0);
  return { maj, ambiance };
})();

/* Appelée à chaque image : la circulation, les bateaux, l'eau (rien ne bouge si « calme ») */
function majVille(dt, t) { VILLE.maj(dt, t); }
/* Appelée au changement de thème : lumières de la ville, phares, ombres, couleur de l'eau */
function ambianceVille(nom, a) { VILLE.ambiance(nom, a); }

/* ───────────────────────── La marque AVYORA : le vrai logo et le vrai mot, tels qu'ils sont sur le site ─────────────────────────
   Le logo : un carré indigo aux coins ronds, un chevron blanc (le « A » sans barre) et un point violet. Tracé sur une grille de 64,
   comme le fichier du site. Le mot : « AVY » en blanc (ou en encre sur fond clair) et « ORA » en violet, lettres espacées. */
const MARQUE = { indigo: "#4F46E5", nuit: "#1E1B4B", violet: "#A78BFA", lilas: "#C4B5FD" };
function arrondi(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function dessinerLogo(c, x, y, cote) {
  const u = cote / 64;
  c.fillStyle = MARQUE.indigo; arrondi(c, x + 2 * u, y + 2 * u, 60 * u, 60 * u, 14 * u); c.fill();
  c.strokeStyle = "#ffffff"; c.lineWidth = 7 * u; c.lineCap = "round"; c.lineJoin = "round";
  c.beginPath(); c.moveTo(x + 17 * u, y + 45 * u); c.lineTo(x + 32 * u, y + 15 * u); c.lineTo(x + 47 * u, y + 45 * u); c.stroke();
  c.fillStyle = MARQUE.lilas; c.beginPath(); c.arc(x + 32 * u, y + 39 * u, 4.5 * u, 0, Math.PI * 2); c.fill();
}
/* Le mot « AVYORA », lettre par lettre pour l'espacement (0,14 em, comme sur le site). Rend sa largeur ; avec `mesure`, ne dessine pas. */
function ecrireAvyora(c, x, y, h, clair, mesure) {
  c.font = "600 " + h + "px Geist, system-ui, -apple-system, sans-serif"; c.textAlign = "left"; c.textBaseline = "alphabetic";
  let px = x; const esp = h * 0.14;
  for (const [l, i] of [..."AVYORA"].map((l, i) => [l, i])) { const w = c.measureText(l).width; if (!mesure) { c.fillStyle = i < 3 ? (clair ? "#ffffff" : "#15172b") : MARQUE.violet; c.fillText(l, px, y); } px += w + esp; }
  return px - esp - x;
}
/* Le logo et le mot côte à côte, centrés dans le cadre (cx, cy), le logo haut de `h`. */
function dessinerMarque(c, cx, cy, h, clair) {
  const hm = h * 0.62, ecart = h * 0.34, wm = ecrireAvyora(c, 0, 0, hm, clair, true), total = h + ecart + wm, x = cx - total / 2;
  dessinerLogo(c, x, cy - h / 2, h); ecrireAvyora(c, x + h + ecart, cy + hm * 0.36, hm, clair);
}
/* Une image posée dans la scène (mur, bandeau, sol) : elle s'éclaire un peu elle-même, pour rester lisible la nuit. */
function image3d(g, tex, w, h, x, y, z, o) {
  o = o || {};
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: o.lum == null ? 0.5 : o.lum, roughness: o.rough == null ? 0.45 : o.rough, transparent: !!o.transparent, depthWrite: !o.transparent }));
  m.position.set(x, y, z); if (o.auSol) m.rotation.x = -Math.PI / 2; m.rotation[o.auSol ? "z" : "y"] = o.ry || 0; m.receiveShadow = !!o.auSol; g.add(m); return m;
}
const TEX_MARQUE = {
  /* Le grand mur de l'accueil : fond nuit, logo et mot, la promesse en dessous */
  mur: () => toile(2048, 682, (c, W, H) => {
    const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#1E1B4B"); g.addColorStop(1, "#2a2670"); c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = "rgba(167,139,250,.10)"; c.beginPath(); c.arc(W * 0.82, H * 0.1, H * 0.7, 0, 7); c.fill();
    dessinerMarque(c, W / 2, H * 0.43, H * 0.4, true);
    c.font = "500 " + Math.round(H * 0.075) + "px Geist, system-ui, sans-serif"; c.textAlign = "center"; c.fillStyle = MARQUE.lilas; c.fillText("Estimation de travaux  ·  Plans  ·  Artisans vérifiés", W / 2, H * 0.82);
  }, false),
  /* Le bandeau de façade, sur le nez de dalle du porte-à-faux */
  bandeau: () => toile(2048, 128, (c, W, H) => { c.fillStyle = MARQUE.nuit; c.fillRect(0, 0, W, H); c.fillStyle = MARQUE.violet; c.fillRect(0, H - 6, W, 6); dessinerMarque(c, W / 2, H * 0.47, H * 0.66, true); }, false),
  /* Le médaillon incrusté dans le marbre de l'accueil */
  medaillon: () => toile(1024, 1024, (c, W, H) => {
    c.clearRect(0, 0, W, H); c.strokeStyle = "rgba(30,27,75,.55)"; c.lineWidth = 10; c.beginPath(); c.arc(W / 2, H / 2, W * 0.47, 0, 7); c.stroke();
    c.strokeStyle = "rgba(167,139,250,.8)"; c.lineWidth = 4; c.beginPath(); c.arc(W / 2, H / 2, W * 0.44, 0, 7); c.stroke();
    dessinerLogo(c, W * 0.26, H * 0.2, W * 0.48); const h = W * 0.085, w = ecrireAvyora(c, 0, 0, h, false, true); ecrireAvyora(c, (W - w) / 2, H * 0.8, h, false);
  }, false),
  /* La plaque de la banque d'accueil et les kakémonos */
  plaque: () => toile(1024, 256, (c, W, H) => { c.fillStyle = "#ffffff"; c.fillRect(0, 0, W, H); dessinerMarque(c, W / 2, H / 2, H * 0.56, false); }, false),
  kakemono: () => toile(384, 1024, (c, W, H) => {
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#4F46E5"); g.addColorStop(1, "#1E1B4B"); c.fillStyle = g; c.fillRect(0, 0, W, H);
    dessinerLogo(c, W * 0.25, H * 0.12, W * 0.5); const h = W * 0.15, w = ecrireAvyora(c, 0, 0, h, true, true); ecrireAvyora(c, (W - w) / 2, H * 0.5, h, true);
    c.font = "500 " + Math.round(W * 0.075) + "px Geist, system-ui, sans-serif"; c.textAlign = "center"; c.fillStyle = MARQUE.lilas;
    ["Tes travaux,", "sans les erreurs", "qui coûtent cher."].forEach((l, i) => c.fillText(l, W / 2, H * 0.66 + i * W * 0.105));
  }, false),
  /* L'insigne qui flotte au-dessus d'un responsable : le logo dans une pastille blanche (agent IA), une étoile dorée (Dani) */
  insigneIA: (etat) => toile(160, 200, (c, W, H) => {
    c.clearRect(0, 0, W, H); c.fillStyle = "#ffffff"; c.beginPath(); c.arc(W / 2, 76, 70, 0, 7); c.fill(); c.strokeStyle = MARQUE.indigo; c.lineWidth = 7; c.stroke();
    c.beginPath(); c.moveTo(W / 2 - 16, 140); c.lineTo(W / 2, 172); c.lineTo(W / 2 + 16, 140); c.closePath(); c.fillStyle = MARQUE.indigo; c.fill();
    dessinerLogo(c, W / 2 - 44, 32, 88);
    const ton = { travail: "#30a46c", attend: "#f59e0b", repos: "#9aa0b4" }[etat];                                    // l'état de l'agent : vert au travail, orange s'il attend ta décision, gris au repos
    if (ton || etat === "creer") { c.beginPath(); c.arc(W - 30, 122, 24, 0, 7); c.fillStyle = "#ffffff"; c.fill(); c.beginPath(); c.arc(W - 30, 122, 17, 0, 7);
      if (ton) { c.fillStyle = ton; c.fill(); } else { c.setLineDash([7, 6]); c.lineWidth = 5; c.strokeStyle = "#9aa0b4"; c.stroke(); c.setLineDash([]); } }   // (à créer : un cercle en pointillés)
  }, false),
  insigneDani: () => toile(160, 200, (c, W, H) => {
    c.clearRect(0, 0, W, H); c.fillStyle = "#1E1B4B"; c.beginPath(); c.arc(W / 2, 76, 70, 0, 7); c.fill(); c.strokeStyle = "#f5c451"; c.lineWidth = 8; c.stroke();
    c.beginPath(); c.moveTo(W / 2 - 16, 140); c.lineTo(W / 2, 172); c.lineTo(W / 2 + 16, 140); c.closePath(); c.fillStyle = "#f5c451"; c.fill();
    c.fillStyle = "#f5c451"; c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 20 : 46; c.lineTo(W / 2 + Math.cos(a) * r, 76 + Math.sin(a) * r); } c.closePath(); c.fill();
  }, false),
};

/* Les obstacles : l'emprise au sol de chaque meuble, pour que personne ne passe au travers (voir « Les déplacements ») */
const obstacles = [];
function emprise(x, z, w, d, ry) { const c = Math.abs(Math.cos(ry || 0)), s = Math.abs(Math.sin(ry || 0)), hw = (w * c + d * s) / 2, hd = (w * s + d * c) / 2; obstacles.push({ x0: x - hw, x1: x + hw, z0: z - hd, z1: z + hd }); }

/* Les sièges : chaque assise posée est notée ici (position au sol, hauteur du dessus de l'assise, direction du regard de la
   personne assise). Sert à asseoir quelqu'un exactement sur un siège : siegePres(x, z) rend le plus proche. */
const sieges = [];
const H_ASSISE = { bureau: 0.5, salon: 0.4, canape: 0.41, banc: 0.45, tabouret: 0.62, transat: 0.36 };
function siege(x, z, y, ry, sorte, bord) { sieges.push({ x, z, y, ry, sorte, bord }); }   // bord : du point noté jusqu'au nez de l'assise, vers l'avant (sert à garder les mollets devant le coussin)
/* Le vrai profil d'une assise, lu sur le modèle 3D : dans le couloir de la place (à sx du milieu), où s'arrête le coussin vers l'avant (nez)
   et à quelle hauteur est son dessus, là où reposent les cuisses (haut). Sans modèle : null (on garde les cotes de la forme simple). */
function profilAssise(nom, sx) {
  const m = MM[nom]; if (!m) return null;
  m.updateMatrixWorld(true); const v = new THREE.Vector3(), pts = [];
  m.traverse((o) => { if (!o.isMesh) return; const P = o.geometry.attributes.position; for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld); if (Math.abs(v.x - sx) < 0.22 && v.y > 0.2 && v.y < 0.62) pts.push(v.x, v.y, v.z); } });
  if (pts.length < 30) return null;
  let nez = -1e9; for (let i = 0; i < pts.length; i += 3) nez = Math.max(nez, pts[i + 2]);
  let haut = 0; for (let i = 0; i < pts.length; i += 3) { const z = pts[i + 2]; if (z > nez - 0.3 && z < nez - 0.08) haut = Math.max(haut, pts[i + 1]); }
  return haut > 0.25 ? { nez, haut } : null;
}
function siegePres(x, z) { let m = null, dm = 1e9; for (const s of sieges) { const d = Math.hypot(s.x - x, s.z - z); if (d < dm) { dm = d; m = s; } } return m; }
/* Un point et une direction donnés dans un groupe, traduits en coordonnées de l'étage */
function monde(g, x, z, ry) {
  g.updateWorldMatrix(true, false);
  const p = new THREE.Vector3(x, 0, z).applyMatrix4(g.matrixWorld), d = new THREE.Vector3(Math.sin(ry || 0), 0, Math.cos(ry || 0)).transformDirection(g.matrixWorld);
  return { x: p.x, z: p.z, ry: Math.atan2(d.x, d.z) };
}

/* Le décor fixe : tout ce qui ne bouge jamais est rangé dans ce groupe. À la fin de l'aménagement, fusionner() le réduit à un
   seul maillage par matière : des centaines de petites boîtes ne coûtent plus que quelques tracés. */
const decor = new THREE.Group(); decor.name = "decor"; scene.add(decor);
function fusionner(groupe) {
  groupe.updateMatrixWorld(true);
  const lots = new Map(), v = new THREE.Vector3(), mn = new THREE.Matrix3();
  groupe.traverse((o) => {
    if (!o.isMesh || o.isSkinnedMesh || o.isInstancedMesh || Array.isArray(o.material) || !o.geometry.attributes.position) return;
    const k = o.material.uuid + (o.castShadow ? "|o" : "|-") + (o.receiveShadow ? "r" : "-");
    if (!lots.has(k)) lots.set(k, []); lots.get(k).push(o);
  });
  const neufs = [];
  for (const liste of lots.values()) {
    let nS = 0, nI = 0;
    for (const o of liste) { const g = o.geometry; nS += g.attributes.position.count; nI += g.index ? g.index.count : g.attributes.position.count; }
    const avecUv = liste.every((o) => o.geometry.attributes.uv), avecN = liste.every((o) => o.geometry.attributes.normal);
    const P = new Float32Array(nS * 3), N = avecN ? new Float32Array(nS * 3) : null, U = avecUv ? new Float32Array(nS * 2) : null, I = new (nS > 65535 ? Uint32Array : Uint16Array)(nI);
    let s = 0, i = 0;
    for (const o of liste) {
      const g = o.geometry, p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv, m = o.matrixWorld; mn.getNormalMatrix(m);
      for (let a = 0; a < p.count; a++) {
        const k = (s + a) * 3; v.fromBufferAttribute(p, a).applyMatrix4(m); P[k] = v.x; P[k + 1] = v.y; P[k + 2] = v.z;
        if (N) { v.fromBufferAttribute(n, a).applyMatrix3(mn).normalize(); N[k] = v.x; N[k + 1] = v.y; N[k + 2] = v.z; }
        if (U) { U[(s + a) * 2] = u.getX(a); U[(s + a) * 2 + 1] = u.getY(a); }
      }
      if (g.index) for (let a = 0; a < g.index.count; a++) I[i++] = s + g.index.getX(a); else for (let a = 0; a < p.count; a++) I[i++] = s + a;
      s += p.count;
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(P, 3));
    if (U) geo.setAttribute("uv", new THREE.BufferAttribute(U, 2)); geo.setIndex(new THREE.BufferAttribute(I, 1));
    if (N) geo.setAttribute("normal", new THREE.BufferAttribute(N, 3)); else geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, liste[0].material); mesh.castShadow = liste[0].castShadow; mesh.receiveShadow = liste[0].receiveShadow; neufs.push(mesh);
  }
  for (const liste of lots.values()) for (const o of liste) o.parent.remove(o);
  for (const m of neufs) groupe.add(m);
  return neufs.length;
}

/* Les vraies couleurs. Dans cette version de three.js, une couleur donnée « à plat » (0x4f46e5) sort délavée à l'écran : il faut la
   convertir une fois. On le fait ici pour tout le décor fixe, sur des copies : les matières partagées avec la ville ne changent pas.
   Les métaux gardent leur teinte d'origine (un acier ardoise plutôt qu'un noir dur). On calme aussi le reflet du ciel sur ce qui est mat. */
function vraiesCouleurs(groupe) {
  const plates = new Set(mats.values()), copies = new Map(), vus = new Set();
  groupe.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material)) return; const m = o.material;
    if (plates.has(m)) {
      if (!copies.has(m)) { const c = m.clone(); if (m.metalness <= 0.5) { c.color.convertSRGBToLinear(); c.emissive.convertSRGBToLinear(); } if (c.metalness <= 0.5) c.envMapIntensity = c.roughness >= 0.7 ? 0.4 : 0.7; copies.set(m, c); }
      o.material = copies.get(m);
    } else if (!vus.has(m)) { vus.add(m); if (m.isMeshStandardMaterial && m.envMapIntensity === 1 && !m.roughnessMap && m.metalness <= 0.5 && m.roughness >= 0.7) m.envMapIntensity = 0.45; }
  });
  return copies.size;
}

/* ── Les matières du mobilier ── */
function bois(R, G, B, graine, rough) { return new THREE.MeshStandardMaterial({ map: texParquet(R, G, B, graine), roughness: rough == null ? 0.45 : rough, envMapIntensity: 0.7 }); }
const texPlateau = texBois(41), matPlateau = new THREE.MeshStandardMaterial({ map: texPlateau, roughness: 0.45 });
const matChene = bois(206, 172, 130, 43), matNoyer = bois(112, 72, 46, 47, 0.38);
const matMarbre = new THREE.MeshStandardMaterial({ map: texMarbre(8), roughness: 0.15 });
function moquette(R, G, B, graine) { const t = texMoquette(R, G, B, graine); t.repeat.set(3, 3); return new THREE.MeshStandardMaterial({ map: t, roughness: 1 }); }
const TAPIS = { sable: moquette(214, 206, 190, 3), indigo: moquette(62, 56, 150, 5), gris: moquette(120, 124, 140, 7), terre: moquette(188, 108, 72, 9), nuit: moquette(40, 42, 68, 11), vert: moquette(96, 132, 108, 13) };
const BLANC = 0xf4f1ea, KRAFT = 0xc9a877, INDIGO = 0x4f46e5, NUIT = 0x1e1b4b;
/* Une surface qui éclaire (écran, plan lumineux) : son dessin sert aussi de lumière */
function lumineux(w, h, dessin, lum) { const t = toile(w, h, dessin, false); return new THREE.MeshStandardMaterial({ color: 0x0a0c1e, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: lum == null ? 0.9 : lum, roughness: 0.2 }); }
const ecrans = [texEcran(1), texEcran(2), texEcran(3)].map((t) => new THREE.MeshStandardMaterial({ color: 0x0a0c1e, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.9, roughness: 0.2 }));
/* Le plan d'architecte (studio) : traits clairs sur fond bleu nuit */
function dessinPlan(c, W, H) {
  c.fillStyle = "#12224f"; c.fillRect(0, 0, W, H); c.strokeStyle = "rgba(160,190,255,.18)"; c.lineWidth = 1;
  for (let x = 0; x < W; x += W / 16) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); } for (let y = 0; y < H; y += H / 10) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  c.strokeStyle = "#e8f0ff"; c.lineWidth = Math.max(3, W / 90); const a = W * 0.14, b = H * 0.16, w = W * 0.72, h = H * 0.68;
  c.strokeRect(a, b, w, h); c.beginPath(); c.moveTo(a + w * 0.42, b); c.lineTo(a + w * 0.42, b + h * 0.58); c.lineTo(a, b + h * 0.58); c.moveTo(a + w * 0.42, b + h * 0.36); c.lineTo(a + w, b + h * 0.36); c.moveTo(a + w * 0.7, b + h * 0.36); c.lineTo(a + w * 0.7, b + h); c.stroke();
  c.lineWidth = Math.max(1.5, W / 220); c.strokeStyle = "#8fb4ff"; c.beginPath(); c.arc(a + w * 0.42, b + h * 0.58, w * 0.1, 0, Math.PI / 2); c.stroke(); c.beginPath(); c.arc(a + w * 0.7, b + h, w * 0.09, Math.PI, Math.PI * 1.5); c.stroke();
  c.fillStyle = "#8fb4ff"; c.fillRect(a, b + h + H * 0.05, w, 2); c.fillRect(a, b + h + H * 0.035, 2, H * 0.03); c.fillRect(a + w - 2, b + h + H * 0.035, 2, H * 0.03);
}
const matPlan = lumineux(512, 320, dessinPlan, 0.75);
let nEcran = 0;
function ecran(g, w, h, x, y, z, ry, mat) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat || ecrans[nEcran++ % 3]); m.position.set(x, y, z); m.rotation.y = ry || 0; g.add(m); return m; }
function cone(parent, r, h, couleur, x, y, z, o) {
  o = o || {}; const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, o.seg || 12), o.mat || pbr(couleur, Object.assign({}, FIN[o.fin] || {}, o)));
  m.position.set(x, y, z); m.castShadow = !o.sansOmbre; m.receiveShadow = true; parent.add(m); return m;
}

/* ── Les modèles téléchargés : petites retouches faites une fois, puis des fonctions qui les posent ── */
const MM = MODELES.meubles;
const TOURNE = { fauteuilBureau: 0, fauteuilSalon: 0, canape: 0, imprimante: 0, machineCafe: 0, portable: Math.PI };   // pour que chaque modèle regarde du bon côté
const variantes = new Map();
function teindre(objet, motif, couleur) {                                   // la même matière dans une autre couleur (gardée en mémoire : une seule par couleur)
  objet.traverse((o) => { if (!o.isMesh || !motif.test(o.material.name || "")) return; const k = o.material.uuid + "|" + couleur;
    if (!variantes.has(k)) { const m = o.material.clone(); m.color.setHex(couleur).convertSRGBToLinear(); variantes.set(k, m); } o.material = variantes.get(k); });
  return objet;
}
/* Le cuir d'une autre couleur. La photo du modèle est un cuir noir : on l'éclaircit puis on la teinte, les plis et les coutures restent.
   Le bois (les points roux de la photo) n'est pas touché. Si la photo ne peut pas être lue, le meuble garde son cuir noir. */
const cuirs = new Map();
function reteindre(mat, couleur) {
  try {
    const img = mat.map.image, W = Math.min(1024, img.width), H = Math.min(1024, img.height), c = document.createElement("canvas"); c.width = W; c.height = H;
    const x = c.getContext("2d"); x.drawImage(img, 0, 0, W, H); const d = x.getImageData(0, 0, W, H), p = d.data, R = couleur >> 16 & 255, G = couleur >> 8 & 255, B = couleur & 255;
    let somme = 0, n = 0; const cuirIci = (i) => p[i] - p[i + 2] < 26;                                  // un point gris ou noir : du cuir
    for (let i = 0; i < p.length; i += 16) if (cuirIci(i)) { const l = 0.3 * p[i] + 0.59 * p[i + 1] + 0.11 * p[i + 2]; if (l > 10) { somme += l; n++; } }
    const ref = n ? somme / n : 40;                                                                      // la clarté moyenne du cuir d'origine
    for (let i = 0; i < p.length; i += 4) { if (!cuirIci(i)) continue; const l = 0.3 * p[i] + 0.59 * p[i + 1] + 0.11 * p[i + 2], k = Math.max(0.42, Math.min(1.18, 0.25 + 0.75 * l / ref));
      p[i] = Math.min(255, R * k); p[i + 1] = Math.min(255, G * k); p[i + 2] = Math.min(255, B * k); }
    x.putImageData(d, 0, 0);
    const t = new THREE.CanvasTexture(c), o = mat.map; t.encoding = o.encoding; t.flipY = o.flipY; t.wrapS = o.wrapS; t.wrapT = o.wrapT; t.anisotropy = o.anisotropy; t.repeat.copy(o.repeat); t.offset.copy(o.offset);
    const m = mat.clone(); m.map = t; return m;
  } catch (e) { return null; }
}
function cuir(objet, motif, couleur) {
  objet.traverse((o) => { if (!o.isMesh || !motif.test(o.material.name || "") || !o.material.map || !o.material.map.image) return; const k = o.material.uuid + "|" + couleur;
    if (!cuirs.has(k)) cuirs.set(k, reteindre(o.material, couleur)); if (cuirs.get(k)) o.material = cuirs.get(k); });
  return objet;
}
const CUIR = { sable: 0xd9cdb8, cognac: 0xb06a34, ivoire: 0xece6da, indigo: 0x4a44b0, olive: 0x7c7a55 };
/* Les petits modèles arrivent en vert d'eau : on leur donne des couleurs de vrai matériel (une fois, sur le modèle : tous les exemplaires suivent) */
function recolorer(modele, tons) {
  const faites = new Map(); if (!modele) return;
  modele.traverse((o) => { if (!o.isMesh) return; const t = tons[o.material.name]; if (!t) return;
    if (!faites.has(o.material)) { const m = o.material.clone(); m.color.setHex(t[0]).convertSRGBToLinear(); m.roughness = t[1]; m.metalness = t[2] || 0; if (t[3]) { m.emissive.setHex(t[3]).convertSRGBToLinear(); m.emissiveIntensity = t[4] || 1; } faites.set(o.material, m); }
    o.material = faites.get(o.material); });
}
recolorer(MM.portable, { metalDark: [0xb9bcc6, 0.35, 0.7], metalMedium: [0x2a2c38, 0.6], metal: [0x10142e, 0.2, 0, 0x7f9cff, 0.85] });   // la coque alu, le clavier sombre, l'écran allumé
recolorer(MM.machineCafe, { metalMedium: [0x23252f, 0.35, 0.4], metal: [0xc9ccd6, 0.3, 0.85], carpetWhite: [0xf4f1ea, 0.3] });
function sansOmbrePortee(objet) { objet.traverse((o) => { if (o.isMesh) o.castShadow = false; }); return objet; }
/* Une ombre simple pour un modèle très détaillé : une forme invisible qui porte l'ombre à sa place (moins de triangles à dessiner deux fois) */
const matOmbre = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
function ombre(g, w, h, d, x, y, z, ry) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matOmbre); m.position.set(x, y, z); m.rotation.y = ry || 0; m.castShadow = true; m.receiveShadow = false; g.add(m); return m; }
/* La plante : on garde le vrai feuillage ; le pot et la terre sont refaits à la main (le modèle y met près de 60 000 triangles) */
let feuillage = null, potPlante = { x: 0, z: 0 };
if (MM.plante) {
  feuillage = MM.plante.clone(true); feuillage.updateMatrixWorld(true); const retire = [];
  feuillage.traverse((o) => { if (!o.isMesh) return; if (/leaves/i.test(o.material.name || "")) return; if (!/dirt/i.test(o.name)) { const b = new THREE.Box3().setFromObject(o); potPlante = { x: (b.min.x + b.max.x) / 2, z: (b.min.z + b.max.z) / 2 }; } retire.push(o); });
  for (const o of retire) o.parent.remove(o);
  sansOmbrePortee(feuillage);
}

function bureauM(g, x, z, ry, o) {
  o = o || {}; ry = ry || 0; const L = o.large || 1.7, P = o.prof || 0.85, n = nBureau++;
  const b = new THREE.Group(); b.position.set(x, 0, z); b.rotation.y = ry; g.add(b);
  const zf = P / 2 + 0.335, bout = o.sansFauteuil ? P / 2 : zf + 0.37, c = (bout - P / 2) / 2;
  emprise(x + Math.sin(ry) * c, z + Math.cos(ry) * c, L + 0.04, P / 2 + bout, ry);                             // le bureau et son fauteuil
  boiteM(b, L, 0.04, P, 0, 0, 0.745, 0, { mat: o.mat || matPlateau });
  for (const sx of [-L / 2 + 0.06, L / 2 - 0.06]) { boiteM(b, 0.05, 0.7, 0.05, NOIR, sx, 0.365, -P / 2 + 0.06, { fin: "metal" }); boiteM(b, 0.05, 0.7, 0.05, NOIR, sx, 0.365, P / 2 - 0.06, { fin: "metal" }); boiteM(b, 0.05, 0.04, P - 0.12, NOIR, sx, 0.705, 0, { fin: "metal", sansOmbre: true }); }
  boiteM(b, L - 0.18, 0.32, 0.02, NOIR, 0, 0.54, -P / 2 + 0.07, { fin: "metal" });                              // le voile de fond
  if (!o.sansCaisson) { const cx = (n % 2 ? 1 : -1) * (L / 2 - 0.3); boiteM(b, 0.4, 0.56, 0.52, BLANC, cx, 0.3, -0.08, { fin: "laque" }); boiteM(b, 0.3, 0.02, 0.012, NOIR, cx, 0.46, 0.185, { fin: "metal", sansOmbre: true }); boiteM(b, 0.3, 0.02, 0.012, NOIR, cx, 0.28, 0.185, { fin: "metal", sansOmbre: true }); }
  if (o.portable) portable(b, 0, 0.765, -0.05, 0);
  else {
    boiteM(b, 0.66, 0.4, 0.03, NOIR, 0, 1.1, -0.24, { fin: "metal" }); ecran(b, 0.62, 0.36, 0, 1.1, -0.224, 0); boiteM(b, 0.05, 0.16, 0.05, NOIR, 0, 0.86, -0.26, { fin: "metal", sansOmbre: true }); boiteM(b, 0.26, 0.015, 0.18, NOIR, 0, 0.772, -0.26, { fin: "metal", sansOmbre: true });
    boiteM(b, 0.42, 0.015, 0.15, 0xe9e7e2, 0, 0.773, 0.12, { fin: "laque", sansOmbre: true }); boiteM(b, 0.06, 0.02, 0.1, 0xe9e7e2, 0.32, 0.775, 0.13, { fin: "laque", sansOmbre: true });
  }
  if (o.double) { boiteM(b, 0.6, 0.36, 0.03, NOIR, -0.66, 1.08, -0.2, { fin: "metal", ry: 0.35 }); const e = ecran(b, 0.56, 0.32, -0.658, 1.08, -0.183, 0.35); boiteM(b, 0.05, 0.16, 0.05, NOIR, -0.66, 0.86, -0.22, { fin: "metal", sansOmbre: true }); }
  if (n % 3 === 0) cyl(b, 0.04, 0.09, [BLANC, 0xa78bfa, 0xf59e0b][n % 9 / 3 | 0], -L / 2 + 0.28, 0.81, 0.18, { fin: "ceramique", seg: 10, sansOmbre: true });   // une tasse
  if (n % 3 === 1) { boiteM(b, 0.22, 0.012, 0.3, 0xffffff, L / 2 - 0.3, 0.772, 0.12, { sansOmbre: true, ry: 0.2 }); boiteM(b, 0.22, 0.012, 0.3, 0xffffff, L / 2 - 0.34, 0.784, 0.1, { sansOmbre: true, ry: -0.15 }); }   // des feuilles
  if (n % 3 === 2) { boiteM(b, 0.16, 0.03, 0.22, [INDIGO, 0x30a46c, 0xd9486e][n % 9 / 3 | 0], -L / 2 + 0.26, 0.78, 0.1, { fin: "mat", sansOmbre: true, ry: 0.3 }); }                                                // un carnet
  if (!o.sansFauteuil) fauteuil(b, 0, zf, 0, o.couleur);
  return b;
}
let nBureau = 0;
/* Le fauteuil de bureau à roulettes. ry = 0 : il regarde vers −z (comme avant). */
function fauteuil(g, x, z, ry, couleur) {
  couleur = couleur == null ? 0x2c2f45 : couleur;
  const c = poser3d("fauteuilBureau", g, x, z, (ry || 0) + TOURNE.fauteuilBureau);
  if (c) teindre(c, /chair/i, couleur);
  else {
    const f = new THREE.Group(); f.position.set(x, 0, z); f.rotation.y = ry || 0; g.add(f);
    boiteM(f, 0.5, 0.09, 0.5, couleur, 0, 0.46, 0, { fin: "tissu" }); boiteM(f, 0.48, 0.52, 0.07, couleur, 0, 0.8, 0.24, { fin: "tissu" });
    cyl(f, 0.035, 0.34, NOIR, 0, 0.26, 0, { fin: "metal" }); for (let i = 0; i < 5; i++) { const a = i * 1.2566; boiteM(f, 0.04, 0.04, 0.3, NOIR, Math.sin(a) * 0.15, 0.07, Math.cos(a) * 0.15, { fin: "metal", ry: a, sansOmbre: true }); }
  }
  const w = monde(g, x, z, (ry || 0) + Math.PI); siege(w.x, w.z, H_ASSISE.bureau, w.ry, "bureau");
}
function chaise(g, x, z, ry, couleur) { fauteuil(g, x, z, ry, couleur == null ? 0x3b3f66 : couleur); emprise(x, z, 0.66, 0.74, ry); }
/* Le tabouret haut (tables à dessin, mange-debout) */
function tabouret(g, x, z, couleur, h, ry) {
  h = h || 0.62; emprise(x, z, 0.4, 0.4); cyl(g, 0.17, 0.05, couleur == null ? NOIR : couleur, x, h - 0.025, z, { fin: "tissu", seg: 16 }); cyl(g, 0.025, h - 0.06, NOIR, x, (h - 0.05) / 2, z, { fin: "metal", seg: 8 });
  cyl(g, 0.17, 0.02, NOIR, x, 0.01, z, { fin: "metal", seg: 16, sansOmbre: true }); { const w = monde(g, x, z, ry || 0); siege(w.x, w.z, h, w.ry, "tabouret"); }
}
/* Le fauteuil de salon. ry = 0 : il regarde vers +z. */
function fauteuilSalon(g, x, z, ry, couleur) {
  ry = ry || 0; const t = MM.fauteuilSalon ? MM.fauteuilSalon.userData.taille : { x: 0.78, z: 0.8 };
  emprise(x, z, t.x + 0.04, t.z + 0.04, ry);
  const c = poser3d("fauteuilSalon", g, x, z, ry + TOURNE.fauteuilSalon);
  if (c) { sansOmbrePortee(c); if (couleur != null) cuir(c, /pillow/i, couleur); const s = new THREE.Group(); s.position.set(x, 0, z); s.rotation.y = ry; g.add(s); ombre(s, t.x * 0.86, 0.3, t.z * 0.8, 0, 0.27, 0.02); ombre(s, t.x * 0.8, 0.5, 0.14, 0, 0.6, -t.z * 0.36); }
  else {
    couleur = couleur == null ? 0xe9e4da : couleur; const f = new THREE.Group(); f.position.set(x, 0, z); f.rotation.y = ry; g.add(f);
    boiteM(f, 0.74, 0.2, 0.7, couleur, 0, 0.32, 0.03, { fin: "tissu" }); boiteM(f, 0.74, 0.5, 0.16, couleur, 0, 0.6, -0.3, { fin: "tissu" }); for (const sx of [-0.33, 0.33]) { boiteM(f, 0.1, 0.3, 0.7, couleur, sx, 0.5, 0.03, { fin: "tissu" }); for (const sz of [-0.3, 0.3]) cyl(f, 0.02, 0.22, NOIR, sx, 0.11, sz, { fin: "metal", seg: 8 }); }
  }
  const pr = c ? profilAssise("fauteuilSalon", 0) : null, nez = pr ? pr.nez : 0.38, av = nez - 0.26;                 // le point noté : 26 cm derrière le nez du coussin
  const w = monde(g, x + Math.sin(ry) * av, z + Math.cos(ry) * av, ry); siege(w.x, w.z, pr ? pr.haut : H_ASSISE.salon, w.ry, "salon", 0.26);
}
/* La plante. e = taille. Le vrai feuillage partout ; haute = true : la même plante dans un pot haut et sombre (une autre silhouette).
   Sans le modèle : un ficus dessiné à la main. */
let nPlante = 0;
function plante(g, x, z, e, haute) {
  e = e || 1;
  if (feuillage) {
    const k = (haute ? 1.12 : 1.25) * e, dy = haute ? 0.34 * e : 0, a = (nPlante++ * 2.4) % 6.283, ca = Math.cos(a), sa = Math.sin(a);
    emprise(x, z, 0.92 * e, 0.92 * e);
    const f = feuillage.clone(true); f.scale.setScalar(k); f.rotation.y = a; f.position.set(x - (potPlante.x * ca + potPlante.z * sa) * k, dy, z - (-potPlante.x * sa + potPlante.z * ca) * k); g.add(f);
    cyl(g, haute ? 0.21 * k : 0.3 * k, 0.5 * k + dy, haute ? 0x2c2f45 : BLANC, x, (0.5 * k + dy) / 2, z, { rHaut: haute ? 0.3 * k : 0.34 * k, fin: haute ? "mat" : "ceramique", seg: 24 }); cyl(g, (haute ? 0.27 : 0.31) * k, 0.02, 0x3a2a1c, x, 0.49 * k + dy, z, { sansOmbre: true, seg: 24 });
    ombre(g, 0.62 * k, 0.5 * k, 0.62 * k, x, 0.82 * k + dy, z, 0.6); return;
  }
  emprise(x, z, 0.8 * e, 0.8 * e); cyl(g, 0.22 * e, 0.55 * e, BLANC, x, 0.275 * e, z, { rHaut: 0.3 * e, fin: "ceramique" }); cyl(g, 0.28 * e, 0.03, 0x3a2a1c, x, 0.55 * e, z, { sansOmbre: true });
  cyl(g, 0.035 * e, 0.75 * e, 0x6b4a2e, x, 0.9 * e, z, { rough: 1, seg: 6 });
  const tons = [0x2f8a4b, 0x3fa55e, 0x57b872]; let k = 0;
  for (const [dx, dy, dz, r] of [[0, 1.45, 0, 0.4], [0.22, 1.62, -0.1, 0.3], [-0.2, 1.6, 0.14, 0.3], [0.04, 1.9, 0.04, 0.27], [-0.1, 1.3, -0.22, 0.25], [0.14, 1.3, 0.2, 0.24]]) boule(g, r * e, tons[k++ % 3], x + dx * e, dy * e, z + dz * e, { fin: "feuille", facettes: true });
}
/* La jardinière de sansevières : un bac long et des lames droites, pour border un passage */
function jardiniere(g, x, z, L, ry, graine) {
  ry = ry || 0; emprise(x, z, L + 0.04, 0.44, ry); const j = new THREE.Group(); j.position.set(x, 0, z); j.rotation.y = ry; g.add(j);
  boiteM(j, L, 0.55, 0.4, BLANC, 0, 0.275, 0, { fin: "laque" }); boiteM(j, L - 0.06, 0.02, 0.34, 0x3a2a1c, 0, 0.555, 0, { sansOmbre: true });
  const r = alea(graine || 5), n = Math.round(L / 0.11);
  for (let i = 0; i < n; i++) { const h = 0.45 + r() * 0.5, c = cone(j, 0.055, h, [0x2f8a4b, 0x3fa55e, 0x4a9a52, 0x6fb46a][i % 4], -L / 2 + 0.08 + (L - 0.16) * i / (n - 1) + (r() - 0.5) * 0.05, 0.55 + h / 2, (r() - 0.5) * 0.2, { fin: "feuille", seg: 4, sansOmbre: i % 2 === 1 }); c.scale.z = 0.35; c.rotation.y = r() * 3; c.rotation.z = (r() - 0.5) * 0.25; }
}
/* Le palmier en pot : un vrai palmier de la ville, en petit, s'il est chargé */
let nPalmier = 0;
function palmierPot(g, x, z, h) {
  h = h || 3.4; emprise(x, z, 1.0, 1.0); cyl(g, 0.4, 0.62, BLANC, x, 0.31, z, { rHaut: 0.5, fin: "ceramique", seg: 24 }); cyl(g, 0.46, 0.03, 0x3a2a1c, x, 0.61, z, { sansOmbre: true, seg: 24 });
  const p = MODELES.palmiers.length ? MODELES.palmiers[nPalmier++ % MODELES.palmiers.length] : null;
  if (p) { const k = h / p.hauteur, a = new THREE.Group(); a.position.set(x, 0.55, z); a.scale.setScalar(k); a.rotation.y = nPalmier * 2.1; g.add(a); for (const q of p.parties) { const m = new THREE.Mesh(q.geometry, q.material); m.castShadow = true; m.receiveShadow = true; a.add(m); } return; }
  cyl(g, 0.09, 2.6, 0x8a6a48, x, 1.9, z, { rough: 1, seg: 8 });
  for (let i = 0; i < 7; i++) { const a = i * 0.9, f = boiteM(g, 0.34, 0.03, 1.5, 0x3f9a55, x + Math.sin(a) * 0.62, 3.05, z + Math.cos(a) * 0.62, { fin: "feuille", ry: a }); f.rotation.x = 0.5; }
}
/* Le canapé. ry = 0 : il regarde vers +z. Deux places assises notées. */
function canape(g, x, z, ry, couleur) {
  ry = ry || 0; const t = MM.canape ? MM.canape.userData.taille : { x: 2.2, z: 0.9 };
  emprise(x, z, t.x + 0.06, t.z + 0.06, ry);
  const c = poser3d("canape", g, x, z, ry + TOURNE.canape);
  if (c) { if (couleur != null) cuir(c, /sofa/i, couleur); }
  else {
    couleur = couleur == null ? 0xe9e4da : couleur; const k = new THREE.Group(); k.position.set(x, 0, z); k.rotation.y = ry; g.add(k);
    boiteM(k, 2.2, 0.26, 0.9, couleur, 0, 0.3, 0, { fin: "tissu" }); boiteM(k, 2.2, 0.55, 0.22, couleur, 0, 0.6, -0.34, { fin: "tissu" });
    boiteM(k, 0.2, 0.42, 0.9, couleur, -1.0, 0.44, 0, { fin: "tissu" }); boiteM(k, 0.2, 0.42, 0.9, couleur, 1.0, 0.44, 0, { fin: "tissu" });
    for (const sx of [-0.5, 0.5]) boiteM(k, 0.9, 0.14, 0.62, couleur, sx, 0.47, 0.08, { fin: "tissu" }); for (const sx of [-1, 1]) for (const sz of [-0.36, 0.36]) cyl(k, 0.03, 0.22, NOIR, sx, 0.11, sz, { fin: "metal" });
  }
  // les deux places : chacune notée 26 cm derrière le nez de SON coussin (le devant du canapé est galbé), à la vraie hauteur du coussin
  for (const sx of [-0.45, 0.45]) { const pr = c ? profilAssise("canape", sx) : null, av = (pr ? pr.nez : 0.39) - 0.26;
    const w = monde(g, x + Math.cos(ry) * sx + Math.sin(ry) * av, z - Math.sin(ry) * sx + Math.cos(ry) * av, ry); siege(w.x, w.z, pr ? pr.haut : H_ASSISE.canape, w.ry, "canape", 0.26); }
}
/* La table basse ronde (le vrai modèle), e = taille */
function tableBasse(g, x, z, e) {
  e = e || 1; const t = MM.tableBasse ? MM.tableBasse.userData.taille : { x: 1.1, y: 0.42, z: 1.1 };
  emprise(x, z, t.x * e + 0.04, t.z * e + 0.04);
  const c = poser3d("tableBasse", g, x, z, 0);
  if (c) c.scale.setScalar(e); else { cyl(g, 0.55 * e, 0.04, 0, x, 0.4 * e, z, { mat: matNoyer, seg: 32 }); for (let i = 0; i < 3; i++) cyl(g, 0.025, 0.38 * e, NOIR, x + Math.sin(i * 2.1) * 0.38 * e, 0.19 * e, z + Math.cos(i * 2.1) * 0.38 * e, { fin: "metal", seg: 8 }); }
  return t.y * e;                                                           // la hauteur du plateau, pour y poser quelque chose
}
/* La table ronde haute de 74 cm (réunion, repas). h = autre hauteur (mange-debout : 1,05) */
function tableRonde(g, x, z, r, h) { h = h || 0.74; emprise(x, z, 2 * r + 0.1, 2 * r + 0.1); cyl(g, r, 0.05, BLANC, x, h, z, { fin: "laque", seg: 32 }); cyl(g, 0.05, h - 0.04, NOIR, x, (h - 0.04) / 2, z, { fin: "metal" }); cyl(g, r * 0.55, 0.03, NOIR, x, 0.02, z, { fin: "metal", seg: 24 }); }
/* Le rayonnage : deux vraies étagères en acier côte à côte, remplies. genre = "archives" (boîtes, classeurs), "livres" ou "atelier". */
function etagere(g, x, z, ry, n, genre) {
  const e = new THREE.Group(); e.position.set(x, 0, z); e.rotation.y = ry || 0; g.add(e);
  const t = MM.etagere ? MM.etagere.userData.taille : null, lu = t ? t.x : 1.2, prof = t ? t.z : 0.5, niveaux = t ? [0.11, 0.61, 1.11, 1.6] : [0.14, 0.76, 1.38];
  emprise(x, z, 2 * lu + 0.04, prof + 0.06, ry);
  if (t) { poser3d("etagere", e, -lu / 2, 0, 0); poser3d("etagere", e, lu / 2, 0, 0); }
  else { for (const sx of [-1.2, 0, 1.2]) boiteM(e, 0.05, 2.1, 0.5, NOIR, sx, 1.05, 0, { fin: "metal" }); for (let r = 0; r < 4; r++) boiteM(e, 2.4, 0.04, 0.5, 0, 0, 0.12 + r * 0.62, 0, { mat: matPlateau }); }
  const r = alea(977 + (n || 0) * 131);
  for (const sx of [-lu / 2, lu / 2]) for (let k = 0; k < niveaux.length; k++) garnir(e, r, genre || "archives", sx, niveaux[k] + 0.012, lu - 0.16, prof - 0.12, k);
}
const TONS_DOSSIER = [INDIGO, 0x2c2f45, 0xe0a52a, 0x1e1b4b, 0x7f8aa6, 0x2f7d5b, 0xb84a3c, 0x4f46e5, 0x2c2f45];   // les classeurs : surtout bleu nuit, indigo et gris
function garnir(e, r, genre, cx, y, W, D, etage) {                           // remplit une tablette, de gauche à droite
  let x = cx - W / 2;
  const fin = cx + W / 2;
  while (x < fin - 0.06) {
    const tir = r();
    if (genre === "livres") {
      if (tir < 0.2) { x += 0.08 + r() * 0.14; continue; }
      if (tir < 0.3 && fin - x > 0.2) { const o = r(); if (o < 0.5) { cyl(e, 0.07, 0.12, BLANC, x + 0.1, y + 0.06, 0, { fin: "ceramique", seg: 12 }); boule(e, 0.1, 0x3fa55e, x + 0.1, y + 0.2, 0, { fin: "feuille", facettes: true }); } else boiteM(e, 0.16, 0.2, 0.03, [0xd9b48a, NOIR, 0xa78bfa][etage % 3], x + 0.1, y + 0.1, 0.02, { fin: "laque" }); x += 0.24; continue; }
      const nb = 3 + (r() * 5 | 0); for (let i = 0; i < nb && x < fin - 0.05; i++) { const w = 0.03 + r() * 0.03, h = 0.2 + r() * 0.12; boiteM(e, w, h, 0.2 + r() * 0.06, [0xe9e3d5, 0x1e1b4b, 0x8a3b2e, 0x2f5d50, 0xc9a877, 0x4f46e5, 0x2c2f45][(r() * 7) | 0], x + w / 2, y + h / 2, 0.02, { fin: "mat", sansOmbre: true }); x += w + 0.004; }
      continue;
    }
    if (genre === "atelier") {
      if (tir < 0.15) { x += 0.1 + r() * 0.12; continue; }
      if (tir < 0.55 && fin - x > 0.24) { const c = [0xf4f1ea, 0xf4f1ea, 0xc9ccd6][(r() * 3) | 0]; cyl(e, 0.105, 0.22, c, x + 0.12, y + 0.11, 0.02, { rough: 0.35, metal: 0.3, seg: 14 }); cyl(e, 0.108, 0.07, TONS_DOSSIER[(r() * 5) | 0], x + 0.12, y + 0.1, 0.02, { rough: 0.5, seg: 14, sansOmbre: true }); x += 0.25; continue; }
      if (fin - x > 0.46) { const c = [0xd93a3f, 0x35507a, 0xf59e0b][(r() * 3) | 0]; boiteM(e, 0.42, 0.2, 0.24, c, x + 0.22, y + 0.1, 0.02, { rough: 0.4, metal: 0.2 }); boiteM(e, 0.2, 0.03, 0.04, NOIR, x + 0.22, y + 0.215, 0.02, { fin: "metal", sansOmbre: true }); x += 0.47; continue; }
      x += 0.12; continue;
    }
    if (tir < 0.1) { x += 0.08 + r() * 0.1; continue; }
    if (tir < 0.62 && fin - x > 0.34) {                                         // une boîte d'archives, avec son étiquette de chaque côté
      const w = 0.3 + r() * 0.04, h = 0.27 + r() * 0.05, ton = r() < 0.6 ? KRAFT : BLANC; boiteM(e, w, h, D, ton, x + w / 2, y + h / 2, 0, { fin: "mat" });
      const et = TONS_DOSSIER[(r() * TONS_DOSSIER.length) | 0]; for (const s of [-1, 1]) boiteM(e, w * 0.62, 0.09, 0.006, et, x + w / 2, y + h * 0.56, s * (D / 2 + 0.002), { fin: "mat", sansOmbre: true });
      x += w + 0.015; continue;
    }
    const nb = 2 + (r() * 4 | 0), ton = TONS_DOSSIER[(r() * TONS_DOSSIER.length) | 0];                                    // une série de classeurs
    for (let i = 0; i < nb && x < fin - 0.075; i++) { boiteM(e, 0.068, 0.32, D - 0.06, i === nb - 1 && r() < 0.4 ? 0xe9e3d5 : ton, x + 0.035, y + 0.16, 0, { fin: "mat", sansOmbre: i % 2 === 1 }); x += 0.074; }
  }
}
function panneauTexte(g, texte, w, h, x, y, z, ry, fond, encre, lum) {
  const t = toile(512, Math.round(512 * h / w), (c, W, H) => { c.fillStyle = fond; c.fillRect(0, 0, W, H); c.fillStyle = encre; c.font = "600 " + Math.round(H * 0.46) + "px Geist, system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(texte, W / 2, H / 2 + 4); }, false);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: lum == null ? 0.35 : lum, roughness: 0.4 }));
  m.position.set(x, y, z); m.rotation.y = ry || 0; g.add(m); return m;
}

/* ── Les meubles ajoutés ── */
/* Le tapis : une moquette posée sur le sol, sans épaisseur visible */
function tapis(g, x, z, w, d, mat) { return boiteM(g, w, 0.02, d, 0, x, 0.012, z, { mat: mat || TAPIS.sable, sansOmbre: true, recoit: true }); }
/* La cimaise : un pan de mur plein, posé au sol devant la cloison vitrée, pour y accrocher un écran ou une enseigne */
function cimaise(g, x, z, L, h, ry, couleur, o) { emprise(x, z, L + 0.04, 0.24, ry); return boiteM(g, L, h, 0.12, couleur == null ? BLANC : couleur, x, h / 2, z, Object.assign({ fin: "laque", ry: ry || 0 }, o || {})); }
/* L'écran accroché : un cadre noir et sa dalle lumineuse. ry = 0 : il regarde vers +z. */
function ecranMural(g, w, h, x, y, z, ry, mat) {
  ry = ry || 0; boiteM(g, w + 0.08, h + 0.08, 0.05, NOIR, x, y, z, { fin: "metal", ry, sansOmbre: true });
  return ecran(g, w, h, x + Math.sin(ry) * 0.027, y, z + Math.cos(ry) * 0.027, ry, mat);
}
/* Le meuble bas (buffet, comptoir) : façades laquées, plateau en bois. Rend le groupe, pour y poser des objets (dessus à y = 0,86). */
function meubleBas(g, x, z, L, ry, o) {
  o = o || {}; const P = o.prof || 0.5, H = o.h || 0.84; emprise(x, z, L + 0.04, P + 0.04, ry);
  const m = new THREE.Group(); m.position.set(x, 0, z); m.rotation.y = ry || 0; g.add(m);
  boiteM(m, L, H - 0.1, P, o.couleur == null ? BLANC : o.couleur, 0, 0.06 + (H - 0.1) / 2, 0, { fin: "laque" }); boiteM(m, L - 0.1, 0.06, P - 0.08, NOIR, 0, 0.03, 0, { fin: "metal", sansOmbre: true });
  boiteM(m, L + 0.04, 0.04, P + 0.04, 0, 0, H, 0, { mat: o.mat || matPlateau });
  const n = Math.max(1, Math.round(L / 0.6)); for (let i = 1; i < n; i++) boiteM(m, 0.012, H - 0.16, 0.01, 0xc9ccd6, -L / 2 + L * i / n, 0.06 + (H - 0.1) / 2, P / 2 + 0.003, { fin: "metal", sansOmbre: true });
  return m;
}
/* Le coin café : un buffet, la machine, les tasses */
function coinCafe(g, x, z, L, ry) {
  const m = meubleBas(g, x, z, L, ry); machineCafe(m, -L / 2 + 0.4, 0.86, 0, 0);
  for (let i = 0; i < 4; i++) cyl(m, 0.04, 0.09, i % 2 ? 0xa78bfa : BLANC, -L / 2 + 0.85 + (i % 2) * 0.11, 0.905, -0.08 + (i >> 1) * 0.12, { fin: "ceramique", seg: 10, sansOmbre: true });
  if (L > 1.6) { boiteM(m, 0.34, 0.03, 0.24, NOIR, L / 2 - 0.35, 0.875, 0, { fin: "metal", sansOmbre: true }); for (let i = 0; i < 3; i++) cyl(m, 0.035, 0.16, [0x30a46c, 0xf59e0b, 0xd9486e][i], L / 2 - 0.45 + i * 0.1, 0.97, 0, { rough: 0.3, seg: 8, sansOmbre: true }); }
  return m;
}
function machineCafe(g, x, y, z, ry) {
  const c = poser3d("machineCafe", g, x, z, (ry || 0) + TOURNE.machineCafe, y); if (c) return c;
  boiteM(g, 0.26, 0.36, 0.34, NOIR, x, y + 0.18, z, { fin: "metal", ry: ry || 0 }); return boiteM(g, 0.2, 0.05, 0.1, 0xc9ccd6, x, y + 0.2, z + 0.16, { fin: "metal", ry: ry || 0, sansOmbre: true });
}
/* L'ordinateur portable ouvert. ry = 0 : l'écran regarde vers +z (vers la personne assise de ce côté). */
function portable(g, x, y, z, ry) {
  const c = poser3d("portable", g, x, z, (ry || 0) + TOURNE.portable, y); if (c) { sansOmbrePortee(c); return c; }
  const p = new THREE.Group(); p.position.set(x, y, z); p.rotation.y = ry || 0; g.add(p);
  boiteM(p, 0.34, 0.016, 0.24, 0xc9ccd6, 0, 0.008, 0, { fin: "metal", sansOmbre: true }); const e = boiteM(p, 0.34, 0.22, 0.012, 0xc9ccd6, 0, 0.12, -0.13, { fin: "metal", sansOmbre: true }); e.rotation.x = -0.2; return p;
}
/* L'imprimante (le vrai modèle, à sa taille de bureau) posée sur un petit meuble. ry = 0 : elle regarde vers +z. */
function imprimante(g, x, z, ry) {
  const t = MM.imprimante ? MM.imprimante.userData.taille : null, k = t ? 0.46 / t.x : 1, P = t ? Math.max(0.6, t.z * k + 0.04) : 0.6;
  const m = meubleBas(g, x, z, 0.78, ry, { prof: P, h: 0.66 });
  const c = poser3d("imprimante", m, 0, 0, TOURNE.imprimante, 0.68);
  if (c) { c.scale.setScalar(k); sansOmbrePortee(c); ombre(m, 0.44, 0.2, 0.4, 0, 0.78, 0); }
  else { boiteM(m, 0.46, 0.2, 0.4, NOIR, 0, 0.78, 0, { fin: "laque" }); boiteM(m, 0.3, 0.012, 0.2, 0xffffff, 0, 0.885, 0.05, { sansOmbre: true }); }
  boiteM(m, 0.22, 0.05, 0.3, 0xffffff, 0.24, 0.705, 0.02, { sansOmbre: true, ry: 0.08 });                     // une rame de papier
  return m;
}
/* Le copieur sur pied : le gros appareil blanc de tout open space. ry = 0 : sa façade regarde vers +z. */
function copieur(g, x, z, ry) {
  emprise(x, z, 0.7, 0.72, ry); const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = ry || 0; g.add(c);
  boiteM(c, 0.62, 0.74, 0.62, BLANC, 0, 0.41, 0, { fin: "laque" }); boiteM(c, 0.56, 0.04, 0.56, NOIR, 0, 0.02, 0, { fin: "metal", sansOmbre: true });
  for (let i = 0; i < 3; i++) { boiteM(c, 0.56, 0.012, 0.01, 0x9aa0b4, 0, 0.2 + i * 0.2, 0.312, { fin: "metal", sansOmbre: true }); boiteM(c, 0.14, 0.03, 0.02, 0x2c2f45, 0, 0.27 + i * 0.2, 0.315, { fin: "mat", sansOmbre: true }); }   // les trois bacs à papier
  boiteM(c, 0.62, 0.1, 0.5, 0x2c2f45, 0, 0.83, -0.06, { fin: "mat" }); boiteM(c, 0.66, 0.06, 0.56, BLANC, 0, 0.91, -0.03, { fin: "laque" });                                                  // la vitre et son capot
  boiteM(c, 0.5, 0.03, 0.3, 0xdfe1e8, 0, 0.955, -0.05, { fin: "laque", sansOmbre: true }); boiteM(c, 0.4, 0.012, 0.22, 0xffffff, 0.02, 0.975, -0.05, { sansOmbre: true, ry: 0.06 });               // le chargeur, une feuille
  const e = boiteM(c, 0.26, 0.02, 0.14, 0x15172b, 0.14, 0.87, 0.3, { fin: "laque", sansOmbre: true }); e.rotation.x = 0.5; const v = boiteM(c, 0.16, 0.006, 0.09, 0x7f9cff, 0.14, 0.882, 0.305, { lum: 0.9, sansOmbre: true }); v.rotation.x = 0.5;   // l'écran de commande
  boiteM(c, 0.2, 0.02, 0.34, BLANC, -0.41, 0.6, 0, { fin: "laque" }); boiteM(c, 0.16, 0.012, 0.28, 0xffffff, -0.42, 0.616, 0, { sansOmbre: true });                                             // le bac de sortie, sur le côté
  return c;
}
/* Le lampadaire : une tige, un abat-jour qui éclaire */
function lampadaire(g, x, z) { emprise(x, z, 0.4, 0.4); cyl(g, 0.16, 0.03, NOIR, x, 0.015, z, { fin: "metal", seg: 16 }); cyl(g, 0.015, 1.5, NOIR, x, 0.76, z, { fin: "metal", seg: 6 }); cyl(g, 0.2, 0.3, 0xffe2b0, x, 1.62, z, { rHaut: 0.14, lum: 0.9, rough: 0.9, seg: 16 }); }
/* Le banc rembourré (ry = 0 : on s'y assoit en regardant +z). places = nombre d'assises notées */
function banc(g, x, z, L, ry, couleur, places) {
  ry = ry || 0; emprise(x, z, L + 0.04, 0.5, ry); const b = new THREE.Group(); b.position.set(x, 0, z); b.rotation.y = ry; g.add(b);
  boiteM(b, L, 0.12, 0.46, couleur == null ? 0x2c2f45 : couleur, 0, 0.39, 0, { fin: "tissu" }); boiteM(b, L - 0.1, 0.04, 0.4, NOIR, 0, 0.31, 0, { fin: "metal", sansOmbre: true });
  for (const sx of [-L / 2 + 0.12, L / 2 - 0.12]) boiteM(b, 0.04, 0.3, 0.4, NOIR, sx, 0.15, 0, { fin: "metal" });
  places = places || Math.max(1, Math.floor(L / 0.6)); for (let i = 0; i < places; i++) { const w = monde(b, -L / 2 + L * (i + 0.5) / places, 0, 0); siege(w.x, w.z, H_ASSISE.banc, w.ry, "banc", 0.23); }
}
/* Le carton (déménagement, archives) */
function carton(g, x, y, z, w, h, d, ry, ton) { boiteM(g, w, h, d, ton == null ? KRAFT : ton, x, y + h / 2, z, { fin: "mat", ry: ry || 0 }); boiteM(g, w + 0.004, 0.012, d * 0.16, 0xe6d2a8, x, y + h + 0.001, z, { fin: "mat", ry: ry || 0, sansOmbre: true }); }

/* L'affiche ou le tableau : un dessin fait ici, sur un panneau plat. ry = 0 : il regarde vers +z. lum : il éclaire un peu (écran) ou pas (papier). */
function affiche(g, w, h, x, y, z, ry, dessin, lum) {
  const t = toile(512, Math.max(64, Math.round(512 * h / w)), dessin, false);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: lum == null ? 0.18 : lum, roughness: 0.5 }));
  m.position.set(x, y, z); m.rotation.y = ry || 0; g.add(m); return m;
}
function titre(c, texte, x, y, px, couleur, gras) { c.fillStyle = couleur; c.font = (gras || "600") + " " + px + "px Geist, system-ui, sans-serif"; c.textBaseline = "middle"; c.fillText(texte, x, y); }


/* ───────────────────────── Les personnages ─────────────────────────
   De vrais modèles animés (marche, attente, assise), clonés puis rhabillés selon le type de personne.
   Chaque modèle est d'abord « fondu » en une seule pièce : un personnage = un seul tracé à l'écran, quel que soit son nombre de matières.
   Les couleurs sont alors portées par les sommets : on change une tenue sans créer de matière.
   Si un modèle manque, on retombe sur le bonhomme simple dessiné à la main. */
const TYPES = {                                                             // les couleurs du bonhomme simple (le secours)
  responsable: { haut: 0x14161f, bas: 0x0e1016, peau: 0xe8b894, cheveux: 0x15120e, col: 0x8b5cf6 },
  visiteur: { haut: 0x8d93b8, bas: 0x2a2c44, peau: 0xf0c8a8, cheveux: 0x3a2a1c }, particulier: { haut: 0x4f46e5, bas: 0x23263c, peau: 0xe8b894, cheveux: 0x1b1d2b }, pro: { haut: 0x0e8f8f, bas: 0x23263c, peau: 0xd9a47c, cheveux: 0x5a3a22 },
  artisan: { haut: 0xf08a24, bas: 0x35507a, peau: 0xe8b894, casque: 0xffd23f }, candidat: { haut: 0xb9a37a, bas: 0x35507a, peau: 0xf0c8a8, casque: 0xf4f1ea },
  serveur: { haut: 0xf4f1ea, bas: 0x15161c, peau: 0xe8b894, cheveux: 0x2a1d14, col: 0x1e1b4b },
  dani: { haut: 0x1e1b4b, bas: 0x15172b, peau: 0xd9a47c, cheveux: 0x15120e, col: 0xa78bfa }, client: { haut: 0xd9486e, bas: 0x2a2c44, peau: 0xf0c8a8, cheveux: 0x7a4a22 },
};
const persos = [], robots = [];

/* Les réglages qu'on peut vouloir retoucher */
const GENS = {
  tailleHomme: 1.78, tailleFemme: 1.67, tailleOuvrier: 1.8, tailleRobot: 1.5,   // en mètres (l'ouvrier : casque compris)
  ecartTaille: 0.03,                                                         // chacun est un peu plus grand ou plus petit (± 3 %)
  fondu: 0.25,                                                               // secondes pour passer de l'attente à la marche
  allure: [0.7, 0.92],                                                       // la vitesse de marche de chacun, en part du pas naturel du modèle (environ 1,5 m/s ; 1,3 pour l'ouvrier)
  siege: 0.46,                                                               // hauteur d'assise retenue quand on ne trouve pas le siège sous la personne
  siegeMin: 0.25, siegeMax: 0.72,                                            // un siège inconnu du mobilier se cherche entre ces deux hauteurs
  recul: { bureau: 0.05, tabouret: 0, transat: 0.1 },                         // sièges sans bord noté : de combien on recule les hanches par rapport au milieu de l'assise
  jeuMollet: 0.02,                                                           // sièges à bord noté (canapé, fauteuil, banc) : l'arrière des mollets reste à 2 cm DEVANT le nez du coussin, jamais dedans
  auBord: 0.12,                                                              // … et les hanches restent au moins 12 cm derrière ce nez (on ne s'assoit pas dans le vide)
  enfonce: { salon: 0.025, canape: 0.03 },                                   // un coussin s'écrase un peu sous la personne
  casque: 0.115,                                                             // hauteur du casque au-dessus de l'os de la tête, pour les ouvriers assis
  voile: 0.5,                                                                // opacité des robots (des hologrammes : ils ne sont « pas encore créés »)
  lissage: 62,                                                               // en degrés : deux facettes qui font un angle plus petit sont fondues en une surface lisse (0 = facettes brutes)
};

/* Qui porte quoi : les modèles possibles pour chaque type, et ses couleurs */
const PEAUX = [0xf0c8a8, 0xe8b894, 0xd9a47c, 0xc68e63, 0x9a6a44, 0x74492c], CHEVEUX = [0x15120e, 0x2a1d14, 0x4a3020, 0x7a5a36, 0xb08a4e, 0x6e6a66, 0x3a2a1c];
const TENUES = {
  visiteur: { modeles: ["hommeManches", "femmeDecontractee", "homme", "femmeRobe", "femmeVeste", "hommeManches", "femmeDecontractee"], hauts: [0xe9e4da, 0x9aa3b5, 0xcfd3dc, 0x6b7280, 0xb8c4d9, 0x8d93b8, 0xa8b0a0], bas: [0x2a2c44, 0x3b4252, 0x55607a, 0x8a8172, 0x1f2430] },
  particulier: { modeles: ["hommeManches", "femmeRobe", "femmeDecontractee", "homme", "femmeVeste"], hauts: [0x4f46e5, 0x6366f1, 0x4338ca, 0x818cf8, 0x3730a3], bas: [0x23263c, 0x1e1b4b, 0x2f3349, 0x3b4252] },
  pro: { modeles: ["hommeCostume", "femmeVeste", "hommeCostume"], hauts: [0x2b2f3a, 0x3d4454, 0x14343a, 0x4a4f5c, 0x1f2937], cravates: [0x0e8f8f, 0x9a2f3a, 0x3d5a9a] },
  client: { modeles: ["femmeRobe", "hommeManches", "femmeDecontractee", "homme", "femmeVeste"], hauts: [0xd9486e, 0xc2410c, 0xe0a030, 0xb5533c, 0xe8825a], bas: [0x2a2c44, 0x6b4a32, 0x3b3340, 0x4a3b34] },
  dani: { modeles: ["hommeCostume"] },
  serveur: { modeles: ["hommeManches", "femmeDecontractee"], hauts: [0xf4f1ea], bas: [0x15161c] },                 // le serveur du bar à café : chemise claire, pantalon noir, tablier indigo
  responsable: { modeles: ["hommeCostume", "femmeVeste"], hauts: [0x14161f], cravates: [0x8b5cf6] },   // l'agent IA responsable d'une pièce : costume sombre, cravate violette, insigne au-dessus de la tête
  artisan: { modeles: ["ouvrier"], gilets: [0xf08a24, 0xf5761a, 0xe89a1c], casque: 0xffd23f, bande: 0xf4e04d },
  candidat: { modeles: ["ouvrier"], gilets: [0xb9a37a, 0xc4b08a], casque: 0xf4f1ea, bande: 0xe9e3d5 },
};

/* ── Fondre un modèle en une seule pièce ──
   Le fichier range chaque matière dans un morceau à part (jusqu'à 19 pour le robot). On recopie tous les sommets, dans la pose de repos,
   dans une seule géométrie reliée à un seul squelette. Un morceau rigide accroché à un os (le robot) suit simplement cet os. */
const matGens = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0, skinning: true, envMapIntensity: 0.6 });
function fondre(brut) {
  const racine = THREE.SkeletonUtils.clone(brut.scene);
  racine.position.set(0, 0, 0); racine.rotation.set(0, 0, 0); racine.scale.set(1, 1, 1); racine.updateMatrixWorld(true);
  const tout = [], sources = [];
  racine.traverse((o) => { if (!o.isMesh) return; tout.push(o); let a = o.parent; while (a && !a.isBone) a = a.parent;
    const peau = !!(o.isSkinnedMesh && o.geometry.attributes.skinIndex && o.geometry.attributes.skinWeight); if (peau || a) sources.push({ o, peau, os: a }); });
  const os = [], rang = new Map(), numero = (b) => { if (!rang.has(b)) { rang.set(b, os.length); os.push(b); } return rang.get(b); };
  let n = 0; for (const s of sources) n += s.o.geometry.attributes.position.count;
  if (!n) return null;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), coul = new Float32Array(n * 3), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4), index = [], zones = [];
  const v = new THREE.Vector3(), w = new THREE.Vector3(), M = new THREE.Matrix4(), S = new THREE.Matrix4(), B = new THREE.Matrix4();
  let base = 0;
  for (const s of sources) {
    const o = s.o, g = o.geometry, P = g.attributes.position, N = g.attributes.normal, I = g.attributes.skinIndex, W = g.attributes.skinWeight, nb = P.count;
    const div = W && W.normalized ? (W.array instanceof Uint8Array ? 255 : 65535) : 1, c = o.material.color, fixe = s.peau ? 0 : numero(s.os);
    for (let i = 0; i < nb; i++) {
      const k = base + i; let tot = 0;
      if (s.peau) {                                                          // la place du sommet au repos : le mélange des os qui le tirent
        const e = S.elements, ids = [I.getX(i), I.getY(i), I.getZ(i), I.getW(i)], pds = [W.getX(i), W.getY(i), W.getZ(i), W.getW(i)]; e.fill(0);
        for (let j = 0; j < 4; j++) { const p = pds[j] / div; if (!(p > 0)) continue; const b = o.skeleton.bones[ids[j]]; if (!b) continue;
          B.multiplyMatrices(b.matrixWorld, o.skeleton.boneInverses[ids[j]]); for (let m = 0; m < 16; m++) e[m] += B.elements[m] * p; tot += p; si[k * 4 + j] = numero(b); sw[k * 4 + j] = p; }
        if (tot > 0) { for (let m = 0; m < 16; m++) e[m] /= tot; for (let j = 0; j < 4; j++) sw[k * 4 + j] /= tot; M.copy(S).multiply(o.bindMatrix); }
      }
      if (!(tot > 0)) { M.copy(o.matrixWorld); si[k * 4] = fixe; sw[k * 4] = 1; }
      v.fromBufferAttribute(P, i).applyMatrix4(M); pos[k * 3] = v.x; pos[k * 3 + 1] = v.y; pos[k * 3 + 2] = v.z;
      if (N) w.fromBufferAttribute(N, i).transformDirection(M); else w.set(0, 1, 0); nor[k * 3] = w.x; nor[k * 3 + 1] = w.y; nor[k * 3 + 2] = w.z;
      coul[k * 3] = c.r; coul[k * 3 + 1] = c.g; coul[k * 3 + 2] = c.b;
    }
    if (g.index) for (let j = 0; j < g.index.count; j++) index.push(base + g.index.getX(j)); else for (let j = 0; j < nb; j++) index.push(base + j);
    zones.push({ nom: o.material.name || "", partie: (o.parent && o.parent.name) || "", debut: base, nb });
    base += nb;
  }
  for (const o of tout) o.parent.remove(o);
  adoucir(pos, nor, index, GENS.lissage);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); geo.setAttribute("color", new THREE.BufferAttribute(coul, 3));
  geo.setAttribute("skinIndex", new THREE.BufferAttribute(si, 4)); geo.setAttribute("skinWeight", new THREE.BufferAttribute(sw, 4)); geo.setIndex(index);
  const peau = new THREE.SkinnedMesh(geo, matGens); peau.name = "peau"; peau.frustumCulled = false; peau.castShadow = true; peau.receiveShadow = true;
  racine.add(peau); peau.bind(new THREE.Skeleton(os), new THREE.Matrix4());

  // les mouvements : on les retrouve par leur nom, et on ne garde que les pistes qui visent un os présent
  const piste = (t) => { try { return !!racine.getObjectByName(THREE.PropertyBinding.parseTrackName(t.name).nodeName); } catch (e) { return false; } };
  const clip = (re) => { const a = (brut.animations || []).find((x) => re.test(x.name)); return a ? new THREE.AnimationClip(a.name, a.duration, a.tracks.filter(piste)) : null; };
  const clips = { repos: clip(/idle$/i), marche: clip(/walk(ing)?$/i), assis: clip(/sitting$/i), salut: clip(/wave$/i), applaudit: clip(/clapping$/i), bricole: clip(/interact$/i), danse: clip(/dance$/i), oui: clip(/(yes|thumbsup)$/i) };

  // les mesures, prises sur la pose réelle (la boîte du maillage brut est fausse : l'armature est à l'échelle 100)
  const garde = []; racine.traverse((o) => garde.push([o, o.position.clone(), o.quaternion.clone(), o.scale.clone()]));
  const mix = new THREE.AnimationMixer(racine);
  const pose = (c, t) => { mix.stopAllAction(); if (c) { mix.clipAction(c).reset().play(); mix.setTime(t); } racine.updateMatrixWorld(true); };
  const boite = (garder) => { const b = new THREE.Box3(); for (let i = 0; i < n; i++) { peau.boneTransform(i, v); if (!garder || garder(v)) b.expandByPoint(v); } return b; };
  pose(clips.repos, 0); const b0 = boite(), G = { racine, geo, zones, clips, hauteur: b0.max.y - b0.min.y, sol: b0.min.y, femme: (brut.animations || []).some((a) => /female/i.test(a.name)) };
  G.vClip = G.hauteur * 0.8;                                                 // vitesse du mouvement de marche, en unités du modèle par seconde
  if (clips.marche) {                                                        // la vraie : la course de chaque pied vers l'arrière pendant un cycle
    const pieds = os.filter((b) => /^foot[lr]$/i.test(b.name)), N = 48, T = clips.marche.duration, traj = pieds.map(() => []);
    for (let i = 0; i < N; i++) { pose(clips.marche, T * i / N); pieds.forEach((b, k) => { b.getWorldPosition(v); traj[k].push({ y: v.y, z: v.z }); }); }
    let somme = 0, nb = 0, course = 0;
    for (const t of traj) {                                                  // tant qu'un pied est posé (au plus bas), il recule exactement à la vitesse où le corps avance
      const bas = Math.min.apply(null, t.map((e) => e.y)), haut = Math.max.apply(null, t.map((e) => e.y)), zs = t.map((e) => e.z); course += Math.max.apply(null, zs) - Math.min.apply(null, zs);
      for (let i = 0; i < N; i++) { const a = t[i], b = t[(i + 1) % N], recul = (a.z - b.z) / (T / N); if (a.y < bas + (haut - bas) * 0.2 && b.y < bas + (haut - bas) * 0.2 && recul > 0) { somme += recul; nb++; } }
    }
    if (pieds.length === 2) G.vClip = nb > 6 ? somme / nb : course / T;       // (à défaut : la course des deux pieds pendant un cycle)
  }
  if (clips.assis) {                                                         // assis : où sont les hanches, et à quelle hauteur est le dessous des cuisses
    pose(clips.assis, clips.assis.duration * 0.999);
    const h = os.find((b) => /^hips$/i.test(b.name)); if (h) { h.getWorldPosition(w); const hz = w.z, H = G.hauteur;
      const b = boite((p) => p.z > hz - 0.02 * H && p.z < hz + 0.08 * H);
      const j = boite((p) => p.y < b.min.y - 0.025 * H && p.y > G.sol + 0.1 * H);          // les mollets : sous l'assise, au-dessus des chevilles
      G.assise = { recul: hz, y: b.min.y, mollets: j.isEmpty() ? hz + 0.2 * H : j.min.z }; }
  }
  mix.stopAllAction(); mix.uncacheRoot(racine);
  for (const [o, p, q, e] of garde) { o.position.copy(p); o.quaternion.copy(q); o.scale.copy(e); }
  racine.updateMatrixWorld(true);
  return G;
}
/* Adoucir les facettes : les modèles sont taillés à gros traits (chaque facette a sa propre lumière). Pour un rendu moins « jouet »,
   on donne à chaque sommet la moyenne des facettes voisines, sauf de part et d'autre d'une arête vive (visière du casque, semelles…). */
function adoucir(pos, nor, index, degres) {
  if (!(degres > 0)) return;
  const nf = index.length / 3, fn = new Float32Array(nf * 3), cle = new Map(), seuil = Math.cos(degres * Math.PI / 180);
  let ech = 0; for (let i = 0; i < pos.length; i++) ech = Math.max(ech, Math.abs(pos[i])); const K = 20000 / (ech || 1);
  const groupe = new Int32Array(pos.length / 3), faces = [];
  for (let v = 0; v < groupe.length; v++) { const k = Math.round(pos[v * 3] * K) + "," + Math.round(pos[v * 3 + 1] * K) + "," + Math.round(pos[v * 3 + 2] * K); let g = cle.get(k); if (g === undefined) { g = faces.length; cle.set(k, g); faces.push([]); } groupe[v] = g; }
  for (let f = 0; f < nf; f++) {                                             // la direction de chaque facette, pondérée par sa surface
    const a = index[f * 3] * 3, b = index[f * 3 + 1] * 3, c = index[f * 3 + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2], vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    fn[f * 3] = uy * vz - uz * vy; fn[f * 3 + 1] = uz * vx - ux * vz; fn[f * 3 + 2] = ux * vy - uy * vx;
    for (let j = 0; j < 3; j++) faces[groupe[index[f * 3 + j]]].push(f);
  }
  const neuf = new Float32Array(nor.length);
  for (let v = 0; v < groupe.length; v++) {
    const rx = nor[v * 3], ry = nor[v * 3 + 1], rz = nor[v * 3 + 2]; let x = 0, y = 0, z = 0;
    for (const f of faces[groupe[v]]) { const fx = fn[f * 3], fy = fn[f * 3 + 1], fz = fn[f * 3 + 2], L = Math.hypot(fx, fy, fz); if (L > 0 && (fx * rx + fy * ry + fz * rz) / L > seuil) { x += fx; y += fy; z += fz; } }
    const L = Math.hypot(x, y, z); if (L > 0) { neuf[v * 3] = x / L; neuf[v * 3 + 1] = y / L; neuf[v * 3 + 2] = z / L; } else { neuf[v * 3] = rx; neuf[v * 3 + 1] = ry; neuf[v * 3 + 2] = rz; }
  }
  nor.set(neuf);
}
const gabarits = {};
const SANS_MODELES = /[?&]secours=1/.test(location.search);                  // pour les essais : ?secours=1 fait comme si aucun modèle n'avait chargé
function gabarit(nom) {                                                      // le modèle fondu, fabriqué une seule fois ; null s'il manque
  if (!(nom in gabarits)) { let G = null; const brut = SANS_MODELES ? null : MODELES.gens[nom]; if (brut && brut.scene && THREE.SkeletonUtils) { try { G = fondre(brut); } catch (e) { G = null; } } gabarits[nom] = G; }
  return gabarits[nom];
}
/* Un exemplaire rhabillé : il partage tous les sommets du gabarit, seules ses couleurs lui sont propres */
const cTeinte = new THREE.Color();
function habiller(G, teinte) {
  const g = new THREE.BufferGeometry(), src = G.geo.attributes, c = new Float32Array(src.color.array);
  for (const k of ["position", "normal", "skinIndex", "skinWeight"]) g.setAttribute(k, src[k]); g.setIndex(G.geo.index);
  for (const z of G.zones) { const hex = teinte(z); if (hex == null) continue; cTeinte.setHex(hex).convertSRGBToLinear(); for (let i = z.debut; i < z.debut + z.nb; i++) { c[i * 3] = cTeinte.r; c[i * 3 + 1] = cTeinte.g; c[i * 3 + 2] = cTeinte.b; } }
  g.setAttribute("color", new THREE.BufferAttribute(c, 3)); return g;
}
/* Le tablier du serveur : peint sur le devant du corps, de la poitrine aux cuisses (aucune pièce ajoutée, donc rien qui traverse) */
function tablier(geo, G, hex) {
  const P = G.geo.attributes.position, c = geo.attributes.color, H = G.hauteur, y0 = G.sol + 0.4 * H, y1 = G.sol + 0.74 * H, taille = G.sol + 0.6 * H;
  const zones = G.zones.filter((z) => /^shirt|^pants|^dress|^jacket/i.test(z.nom)); let zm = 0, nb = 0;
  for (const z of zones) for (let i = z.debut; i < z.debut + z.nb; i++) { const y = P.getY(i); if (y > y0 && y < y1 && Math.abs(P.getX(i)) < 0.1 * H) { zm += P.getZ(i); nb++; } }
  if (!nb) return; zm /= nb; cTeinte.setHex(hex).convertSRGBToLinear();
  for (const z of zones) for (let i = z.debut; i < z.debut + z.nb; i++) { const y = P.getY(i); if (y > y0 && y < y1 && P.getZ(i) > zm && Math.abs(P.getX(i)) < (y > taille ? 0.07 : 0.115) * H) c.setXYZ(i, cTeinte.r, cTeinte.g, cTeinte.b); }
}
const nuance = (hex, k) => cTeinte.setHex(hex).lerp(k > 0 ? new THREE.Color(0xffffff) : new THREE.Color(0x000000), Math.abs(k)).getHex();

/* La tenue d'une personne : une couleur par matière du modèle (Shirt, Pants, Skin, Hair…), tirée au sort de façon reproductible */
function tenue(type, modele, r) {
  const T = TENUES[type] || TENUES.visiteur, pris = (l) => l[(r() * l.length) | 0];
  const peau = pris(PEAUX), poil = pris(CHEVEUX);
  if (modele === "ouvrier") {
    const gilet = pris(T.gilets), pantalon = pris([0x35507a, 0x3d4a5c, 0x4a4238, 0x2f3d55]), chemise = pris([0x8a8f9c, 0x6f7f96, 0xa39a86, 0x59657a]);
    return (z) => /yellow/i.test(z.nom) ? (/head/i.test(z.partie) ? T.casque : T.bande) : /vest/i.test(z.nom) ? gilet : /^skin/i.test(z.nom) ? peau : /brow$|eyebrow|moustache/i.test(z.nom) ? poil
      : /lightbrown/i.test(z.nom) ? chemise : /^brown2/i.test(z.nom) ? nuance(pantalon, -0.25) : /^brown/i.test(z.nom) ? pantalon : /black/i.test(z.nom) ? 0x1b1d2b : /grey/i.test(z.nom) ? 0x3a3d48 : null;
  }
  if (T.gilets) { const gilet = pris(T.gilets), pantalon = pris([0x35507a, 0x3d4a5c, 0x2f3d55]);   // un ouvrier sur un modèle ordinaire (assis) : haut de la couleur du gilet, pantalon de travail
    return (z) => /^skin/i.test(z.nom) ? peau : /^hair|brow/i.test(z.nom) ? poil : /^shirt/i.test(z.nom) ? gilet : /^pants/i.test(z.nom) ? pantalon : /^shoes/i.test(z.nom) ? 0x3b2a1c : /^socks/i.test(z.nom) ? 0x2a2c44 : null; }
  const dani = type === "dani", costume = modele === "hommeCostume", veste = modele === "femmeVeste";
  const haut = dani ? 0x1b2150 : pris(T.hauts || TENUES.visiteur.hauts), bas = dani ? 0x161b44 : costume || (veste && type === "pro") ? nuance(haut, -0.08) : pris(T.bas || TENUES.visiteur.bas);
  const cravate = dani ? 0xa78bfa : pris(T.cravates || [0x4f46e5, 0x9a2f3a, 0x3d5a9a]), souliers = pris([0x1b1d2b, 0x2a1d14, 0x3b2a1c, 0xe9e4da]);
  return (z) => {
    const n = z.nom;
    if (/^skin/i.test(n)) return dani ? 0xd9a47c : peau;
    if (/^hair|brow/i.test(n)) return dani ? 0x15120e : poil;
    if (/^shirt/i.test(n)) return veste ? 0xf4f1ea : haut;                  // sous une veste, le chemisier est clair
    if (/^lightjacket/i.test(n)) return nuance(haut, 0.18);
    if (/^jacket|^dress/i.test(n)) return haut;
    if (/^pants/i.test(n)) return bas;
    if (/^details/i.test(n)) return cravate;                                 // la cravate
    if (/^tie/i.test(n)) return 0xf4f1ea;                                    // le plastron de la chemise : blanc (c'est lui qui sortait violet sur Dani)
    if (/^shoes/i.test(n)) return costume || dani ? 0x15120e : souliers;
    if (/^socks/i.test(n)) return 0xe9e4da;
    return null;                                                             // les yeux gardent la couleur du fichier
  };
}

/* Le bonhomme simple, dessiné à la main : le secours quand un modèle n'a pas chargé */
function bonhomme(g, t, o) {
  const membres = [];
  for (const sx of [-0.1, 0.1]) { const j = new THREE.Group(); j.position.set(sx, 0.72, 0); g.add(j); cyl(j, 0.085, 0.68, t.bas, 0, -0.34, 0, { rHaut: 0.1, fin: "tissu", seg: 10 }); boiteM(j, 0.13, 0.07, 0.24, 0x15172b, 0, -0.7, 0.04, { fin: "mat" }); membres.push(j); }
  cyl(g, 0.2, 0.56, t.haut, 0, 1.0, 0, { rHaut: 0.23, fin: "tissu", seg: 14 }); boule(g, 0.23, t.haut, 0, 1.27, 0, { fin: "tissu" }).scale.set(1, 0.45, 0.8);
  for (const sx of [-0.27, 0.27]) { const b = new THREE.Group(); b.position.set(sx, 1.26, 0); g.add(b); cyl(b, 0.06, 0.55, t.haut, 0, -0.27, 0, { rHaut: 0.075, fin: "tissu", seg: 8 }); boule(b, 0.065, t.peau, 0, -0.58, 0, { rough: 0.6 }); membres.push(b); }
  cyl(g, 0.07, 0.1, t.peau, 0, 1.4, 0, { rough: 0.6, seg: 10 }); boule(g, 0.18, t.peau, 0, 1.58, 0, { rough: 0.6 });
  if (t.casque) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), pbr(t.casque, { rough: 0.3 })); c.position.set(0, 1.62, 0); c.castShadow = true; g.add(c); cyl(g, 0.23, 0.02, t.casque, 0, 1.63, 0.03, { rough: 0.3 }); }
  else { const c = new THREE.Mesh(new THREE.SphereGeometry(0.19, 18, 10, 0, Math.PI * 2, 0, Math.PI / 1.9), pbr(t.cheveux, { rough: 0.9 })); c.position.set(0, 1.6, -0.02); g.add(c); }
  if (t.col) boiteM(g, 0.3, 0.06, 0.26, t.col, 0, 1.27, 0, { fin: "tissu", sansOmbre: true });
  if (o.assis) { membres[0].rotation.x = membres[1].rotation.x = -1.45; g.position.y = -0.2; }
  return membres;
}

/* L'emprise d'une personne qui ne bouge pas : les autres la contournent. On la marque, pour la distinguer d'un meuble. */
function empriseDe(p, x, z, w, d, ry) { const n = obstacles.length; emprise(x, z, w, d, ry); for (let i = n; i < obstacles.length; i++) obstacles[i].perso = p; }

/* Une personne. o : { fixe, assis, x, z, ry }. Sans modèle assis (l'ouvrier), « assis » veut dire : debout, à côté de son siège. */
const comptes = {};
function personne(type, piece, o) {
  o = o || {}; const t = TYPES[type] || TYPES.visiteur, T = TENUES[type] || TENUES.visiteur, g = new THREE.Group();
  const rg = comptes[type] = (comptes[type] || 0) + 1, r = alea(persos.length * 7919 + rg * 104729 + type.length * 131 + 17);
  const p = { g, piece, type, membres: [], fixe: !!o.fixe || !!o.assis, assis: false, debout: false, x: o.x != null ? o.x : piece.cx, z: o.z != null ? o.z : piece.cz,
    route: null, etape: 0, pause: Math.random() * 3, v: 0.9 + r() * 0.4, ph: Math.random() * 6, vit: 0, pm: 0, pg: 0, gt: 0, gesteA: null, regarde: null };
  // le modèle : chacun son tour dans la liste du type, pour une troupe variée et toujours la même
  let nom = null, G = null;
  const ouvrierAssis = !!o.assis && T.modeles[0] === "ouvrier", liste = ouvrierAssis ? ["hommeManches", "homme"] : T.modeles;   // le modèle « ouvrier » n'a pas de pose assise
  for (let i = 0; i < liste.length && !G; i++) { nom = liste[(rg - 1 + i) % liste.length]; G = gabarit(nom); }
  if (ouvrierAssis && G && G.clips.assis) p.casque = T.casque;
  if (G) {
    const corps = THREE.SkeletonUtils.clone(G.racine), peau = corps.getObjectByName("peau"); peau.geometry = habiller(G, tenue(type, nom, r)); if (type === "serveur") tablier(peau.geometry, G, 0x1e1b4b);
    const cible = nom === "ouvrier" ? GENS.tailleOuvrier : (G.femme ? GENS.tailleFemme : GENS.tailleHomme) * (type === "dani" ? 1.03 : 1), k = cible * (1 + (r() * 2 - 1) * GENS.ecartTaille) / G.hauteur;
    corps.scale.setScalar(k); corps.position.y = -G.sol * k; g.add(corps);
    p.G = G; p.k = k; p.corps = corps; p.vClip = G.vClip * k; p.mixer = new THREE.AnimationMixer(corps); p.A = {};
    p.v = p.vClip * (GENS.allure[0] + r() * (GENS.allure[1] - GENS.allure[0]));   // chacun son allure, toujours proche du pas naturel du modèle (sinon la marche a l'air ralentie)
    if (o.assis && G.clips.assis && G.assise) {                             // assis pour de bon : la fin du mouvement « s'asseoir », figée
      p.assis = true; const a = p.mixer.clipAction(G.clips.assis); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.play(); a.time = G.clips.assis.duration - 0.01; a.paused = true;
      const s = typeof siegePres === "function" ? siegePres(p.x, p.z) : null; p.siegeNote = s && Math.hypot(s.x - p.x, s.z - p.z) < 0.15 ? s : null;   // le siège tel que le mobilier l'a noté
      const sn = p.siegeNote;
      if (sn && sn.bord != null) corps.position.z = Math.min(sn.bord + GENS.jeuMollet - G.assise.mollets * k, sn.bord - GENS.auBord - G.assise.recul * k);   // les mollets devant le coussin, les hanches encore dessus
      else corps.position.z = -G.assise.recul * k - (sn ? GENS.recul[sn.sorte] || 0 : 0);
      p.yAssise = G.assise.y * k; corps.position.y = GENS.siege - p.yAssise;       // les hanches au-dessus de l'assise
      p.tete = corps.getObjectByName("Head"); if (p.tete) p.tete0 = null;
    } else {
      if (o.assis) p.debout = true;
      if (G.clips.repos) { p.A.repos = p.mixer.clipAction(G.clips.repos); p.A.repos.play(); p.A.repos.time = Math.random() * G.clips.repos.duration; }
      if (G.clips.marche) { p.A.marche = p.mixer.clipAction(G.clips.marche); p.A.marche.play(); p.A.marche.setEffectiveWeight(0); }
    }
  } else { p.membres = bonhomme(g, t, o); p.assis = !!o.assis; }
  g.position.x = p.x; g.position.z = p.z; g.rotation.y = o.ry || 0; p.ry = o.ry || 0;
  if (p.assis) empriseDe(p, p.x + Math.sin(p.ry) * 0.28, p.z + Math.cos(p.ry) * 0.28, 0.55, 1.0, p.ry);        // le corps et les jambes, devant
  else if (p.fixe && !p.debout) empriseDe(p, p.x, p.z, 0.55, 0.55);                                           // (celui qui reste debout près de son siège est placé plus tard)
  if (type === "responsable" || type === "dani") insigne(p, type);
  scene.add(g); persos.push(p); return p;
}
/* L'insigne qui flotte au-dessus d'un responsable : le logo AVYORA pour un agent IA, une étoile dorée pour Dani */
const matInsignes = {};
function insigne(p, type) {
  const etat = type === "dani" ? "" : (p.piece && p.piece.agent && p.piece.agent.etat) || "", k = (type === "dani" ? "insigneDani" : "insigneIA") + etat;   // la pastille de l'agent porte son état : au travail, attend ta décision, au repos, à créer
  if (!matInsignes[k]) matInsignes[k] = new THREE.SpriteMaterial({ map: type === "dani" ? TEX_MARQUE.insigneDani() : TEX_MARQUE.insigneIA(etat), depthWrite: false, fog: false, toneMapped: false });
  const s = new THREE.Sprite(matInsignes[k]); s.scale.set(0.72, 0.9, 1); s.position.y = 2.42; p.g.add(s); p.insigne = s;
}
/* Le casque des ouvriers assis (leur modèle assis n'en a pas) : posé sur la tête, une fois la pose prise */
function coifferAssis() {
  const v = new THREE.Vector3();
  for (const p of persos) {
    if (!p.casque || !p.corps) continue; const t = p.corps.getObjectByName("Head"); if (!t) continue;
    p.g.updateMatrixWorld(true); t.getWorldPosition(v); p.g.worldToLocal(v);
    const c = new THREE.Group(); c.position.set(v.x, v.y + GENS.casque, v.z);
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.135, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), pbr(p.casque, { rough: 0.35 })); d.castShadow = true; c.add(d);
    cyl(c, 0.165, 0.016, p.casque, 0, 0.004, 0.02, { rough: 0.35, seg: 18 }); p.g.add(c);
  }
}

/* Un geste joué une ou plusieurs fois par-dessus l'attente (saluer, applaudir, bricoler). Rend sa durée, 0 s'il n'existe pas. */
function geste(p, nom, tours) {
  const c = p.G && p.G.clips[nom]; if (!c || p.assis || !p.mixer || calme) return 0;
  if (p.gesteA) p.gesteA.stop();
  const a = p.mixer.clipAction(c); a.reset(); a.setEffectiveWeight(0); a.play(); p.gesteA = a; p.gt = c.duration * (tours || 1); return p.gt;
}

/* Un robot : un agent IA « pas encore créé », montré comme un hologramme à la couleur de sa cabine */
const voileRobot = new THREE.MeshBasicMaterial({ colorWrite: false, transparent: true, skinning: true });
function robot(g, x, z, couleur) {
  const r = new THREE.Group(); r.position.set(x, 0, z); g.add(r);
  const G = gabarit("robot");
  if (!G) {                                                                  // le secours : le robot en boîtes
    const o = { opacite: 0.45, rough: 0.3, metal: 0.4 };
    boiteM(r, 0.5, 0.62, 0.36, couleur, 0, 0.78, 0, o); boiteM(r, 0.42, 0.34, 0.34, 0xf4f1ea, 0, 1.33, 0, o);
    boiteM(r, 0.3, 0.07, 0.02, couleur, 0, 1.35, 0.18, { lum: 1.2, sansOmbre: true });
    cyl(r, 0.02, 0.22, NOIR, 0, 1.61, 0, o); boule(r, 0.06, couleur, 0, 1.75, 0, { lum: 1.2 });
    cyl(r, 0.09, 0.46, NOIR, -0.13, 0.23, 0, o); cyl(r, 0.09, 0.46, NOIR, 0.13, 0.23, 0, o);
    return r;
  }
  const corps = THREE.SkeletonUtils.clone(G.racine), peau = corps.getObjectByName("peau"), k = GENS.tailleRobot / G.hauteur;
  peau.geometry = habiller(G, (zo) => /main/i.test(zo.nom) ? couleur : /grey/i.test(zo.nom) ? 0xe6e9f5 : 0x23263c);
  // deux passes : d'abord la silhouette (profondeur seule), puis la couleur. On voit à travers le robot, mais pas à travers ses propres pièces.
  peau.material = new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: GENS.voile, depthWrite: false, roughness: 0.3, metalness: 0.35, emissive: couleur, emissiveIntensity: 0.4, skinning: true });
  peau.castShadow = false; peau.receiveShadow = false; peau.renderOrder = 6;
  const fond = new THREE.SkinnedMesh(peau.geometry, voileRobot); fond.frustumCulled = false; fond.renderOrder = 5; corps.add(fond); fond.bind(peau.skeleton, peau.bindMatrix);
  corps.scale.setScalar(k); corps.position.y = -G.sol * k; r.add(corps);
  const socle = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.46, 40), new THREE.MeshBasicMaterial({ color: couleur, transparent: true, opacity: 0.8, depthWrite: false })); socle.rotation.x = -Math.PI / 2; socle.position.y = 0.035; r.add(socle);
  const R = { g: r, G, mixer: new THREE.AnimationMixer(corps), A: {}, gesteA: null, gt: 0, pg: 0, prochain: 6 + Math.random() * 25 };
  if (G.clips.repos) { R.A.repos = R.mixer.clipAction(G.clips.repos); R.A.repos.play(); R.A.repos.time = Math.random() * G.clips.repos.duration; R.A.repos.setEffectiveTimeScale(0.5); }
  R.mixer.update(0); robots.push(R); return r;
}

/* Poser chaque personne assise à la bonne hauteur : celle que le mobilier a notée pour ce siège ; à défaut (siège inconnu),
   un rayon tiré vers le bas trouve le dessus du meuble. */
function installerAssis() {
  const rayonBas = new THREE.Raycaster(), bas = new THREE.Vector3(0, -1, 0), d = new THREE.Vector3(), a = new THREE.Vector3(), exclus = new Set(persos.map((p) => p.g).concat(robots.map((r) => r.g)));
  rayonBas.camera = camera; rayonBas.far = GENS.siegeMax - GENS.siegeMin;
  const decor = scene.children.filter((c) => !exclus.has(c));
  for (const p of persos) {
    if (!p.assis || !p.corps) continue;
    let h = p.siegeNote ? p.siegeNote.y - (GENS.enfonce[p.siegeNote.sorte] || 0) : null;
    if (h == null) for (const av of [0.06, 0.2, -0.08]) {                                   // sous les hanches, puis sous les cuisses, puis un peu en arrière
      d.set(p.x + Math.sin(p.ry) * av, GENS.siegeMax, p.z + Math.cos(p.ry) * av); rayonBas.set(d, bas);
      let t = null; try { t = rayonBas.intersectObjects(decor, true)[0]; } catch (e) { t = null; }
      if (t && t.point.y >= GENS.siegeMin) { h = t.point.y; break; }
    }
    p.siege = h; p.corps.position.y = (h == null ? GENS.siege : h) - p.yAssise + 0.005;
  }
}

/* La première pose de chacun (aussi la seule quand l'animation est coupée : « calme ») */
function poserGens() { for (const p of persos) if (p.mixer) p.mixer.update(0); for (const r of robots) r.mixer.update(0); }

/* Chaque image : les mouvements du corps. La vitesse de marche (p.vit) est décidée par « Les déplacements ». */
const qTete = new THREE.Quaternion(), axeY = new THREE.Vector3(0, 1, 0);
function animerGens(dt) {
  const pas = dt / GENS.fondu, vers = (v, cible) => v + Math.max(-pas, Math.min(pas, cible - v));
  for (const p of persos) {
    if (!p.mixer) {                                                          // le bonhomme simple : il balance bras et jambes
      if (p.assis || !p.membres.length) continue;
      if (p.vit > 0.04) { p.ph += dt * p.vit * 6.5; const s = Math.sin(p.ph); p.g.position.y = Math.abs(s) * 0.025; p.membres[0].rotation.x = s * 0.55; p.membres[1].rotation.x = -s * 0.55; p.membres[2].rotation.x = -s * 0.4; p.membres[3].rotation.x = s * 0.4; }
      else { for (const j of p.membres) j.rotation.x *= 0.82; p.g.position.y = 0; }
      continue;
    }
    if (p.assis) {                                                           // assis : la pose est figée, seule la tête tourne un peu
      if (p.tete) { if (!p.tete0) p.tete0 = p.tete.quaternion.clone(); p.ph += dt; p.tete.quaternion.copy(p.tete0).multiply(qTete.setFromAxisAngle(axeY, Math.sin(p.ph * 0.37) * 0.3 + Math.sin(p.ph * 0.11) * 0.2)); }
      continue;
    }
    const marche = p.vit > 0.04 ? 1 : 0;
    p.pm = vers(p.pm, marche);                                               // le fondu entre l'attente et la marche
    if (p.gt > 0) { p.gt -= dt; if (marche) p.gt = 0; }
    if (p.type === "serveur" && !p.gesteA && !calme && (p.proch = (p.proch == null ? 3 : p.proch) - dt) <= 0) { geste(p, "bricole", 2); p.proch = 5 + Math.random() * 6; }   // le serveur prépare un café de temps en temps
    p.pg = vers(p.pg, p.gt > 0 ? 1 : 0); if (p.gesteA && p.pg <= 0 && p.gt <= 0) { p.gesteA.stop(); p.gesteA = null; }
    if (p.A.marche) { p.A.marche.setEffectiveWeight(p.pm); p.A.marche.setEffectiveTimeScale(Math.max(0.35, p.vit / p.vClip)); }   // le pas suit la vitesse : les pieds ne glissent pas
    if (p.A.repos) p.A.repos.setEffectiveWeight((1 - p.pm) * (1 - p.pg));
    if (p.gesteA) p.gesteA.setEffectiveWeight((1 - p.pm) * p.pg);
    p.mixer.update(dt);
  }
  for (const r of robots) {                                                  // les robots : une attente lente, et de temps en temps un signe ou un pas de danse
    r.prochain -= dt;
    if (r.prochain <= 0 && !r.gesteA) { const nom = ["salut", "oui", "danse", "salut"][(Math.random() * 4) | 0], c = r.G.clips[nom]; r.prochain = 18 + Math.random() * 30;
      if (c) { r.gesteA = r.mixer.clipAction(c); r.gesteA.reset(); r.gesteA.setEffectiveWeight(0); r.gesteA.play(); r.gt = c.duration * (nom === "danse" ? 1 : 1); } }
    if (r.gt > 0) r.gt -= dt;
    r.pg = vers(r.pg, r.gt > 0 ? 1 : 0); if (r.gesteA && r.pg <= 0 && r.gt <= 0) { r.gesteA.stop(); r.gesteA = null; }
    if (r.A.repos) r.A.repos.setEffectiveWeight(1 - r.pg); if (r.gesteA) r.gesteA.setEffectiveWeight(r.pg);
    r.mixer.update(dt);
  }
}

/* ── La tour et l'étage ── */
const texBetonCire = texBeton("#cfcac1", 3); texBetonCire.repeat.set(9, 7);
const matDalle = new THREE.MeshStandardMaterial({ map: texBetonCire, roughness: 0.45, envMapIntensity: 0.6 });
boiteM(decor, 47.2, 0.6, 34.2, 0xdedad2, 0, -0.52, 0.5, { mat: matDalle, sansOmbre: true, recoit: true });
boiteM(decor, 47.6, 0.35, 34.6, 0xf3f1ec, 0, -0.95, 0.5, { sansOmbre: true });

/* L'accueil avance de 4 m au-dessus du vide (porte-à-faux), tenu par deux bracons d'acier ; son nez de dalle porte le bandeau AVYORA.
   Le balcon du bureau de Dani fait pareil sur le côté : 5 m dans le vide, plancher bois, garde-corps en verre. */
const PAF = { x0: -10.7, x1: 20.7, z0: 17.5, z1: 21.7 }, BALCON = { x0: 23.5, x1: 28.6, z0: -1.7, z1: 7.7 };
(function porteAFaux() {
  const cx = (PAF.x0 + PAF.x1) / 2, cz = (PAF.z0 + PAF.z1) / 2, L = PAF.x1 - PAF.x0, P = PAF.z1 - PAF.z0;
  boiteM(decor, L, 0.6, P, 0xdedad2, cx, -0.52, cz, { mat: matDalle, sansOmbre: true, recoit: true });
  boiteM(decor, L + 0.3, 0.38, P + 0.15, 0xf3f1ec, cx, -0.98, cz + 0.07, { sansOmbre: true });
  for (const x of [-7.2, 5.2, 12.6, 18.6]) { const b = boiteM(decor, 0.42, 0.42, 7.2, NOIR, x, -4.1, 19.3, { fin: "metal", sansOmbre: true }); b.rotation.x = -Math.atan2(5.6, 4.4); boiteM(decor, 0.7, 0.5, 0.5, NOIR, x, -6.9, 17.35, { fin: "metal", sansOmbre: true }); }
  const bandeauX = -1;                                                        // le bandeau reste centré sur l'accueil, quelle que soit la longueur du porte-à-faux
  const band = image3d(decor, TEX_MARQUE.bandeau(), 17.6, 1.1, bandeauX, -0.72, PAF.z1 + 0.16, { lum: 0.75 }); band.renderOrder = 2;
  boiteM(decor, 17.9, 1.25, 0.12, 0x1e1b4b, bandeauX, -0.72, PAF.z1 + 0.09, { fin: "laque", sansOmbre: true });
  // le balcon
  const bx = (BALCON.x0 + BALCON.x1) / 2, bz = (BALCON.z0 + BALCON.z1) / 2, bl = BALCON.x1 - BALCON.x0, bp = BALCON.z1 - BALCON.z0;
  const deck = texParquet(170, 124, 84, 71); deck.repeat.set(2, 4);
  boiteM(decor, bl, 0.22, bp, 0, bx, -0.11, bz, { mat: new THREE.MeshStandardMaterial({ map: deck, roughness: 0.7 }), sansOmbre: true, recoit: true });
  boiteM(decor, bl + 0.1, 0.3, bp + 0.2, 0xf3f1ec, bx, -0.37, bz, { sansOmbre: true });
  for (const z of [0.3, 5.7]) { const b = boiteM(decor, 7.0, 0.38, 0.38, NOIR, 25.9, -3.2, z, { fin: "metal", sansOmbre: true }); b.rotation.z = Math.atan2(5.0, 4.9); boiteM(decor, 0.5, 0.5, 0.6, NOIR, 23.4, -5.7, z, { fin: "metal", sansOmbre: true }); }
})();
/* Un garde-corps ou un pan de façade en verre, avec ses montants */
function garde(x0, z0, x1, z1, h) {
  const hz = x0 === x1, L = hz ? z1 - z0 : x1 - x0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  boiteM(decor, hz ? 0.06 : L, h, hz ? L : 0.06, 0, cx, h / 2 - 0.2, cz, { mat: matVerre, sansOmbre: true });
  boiteM(decor, hz ? 0.14 : L, 0.1, hz ? L : 0.14, NOIR, cx, h - 0.2, cz, { fin: "metal", sansOmbre: true });
  const n = Math.max(1, Math.round(L / (h > 2 ? 2.3 : 4.6))); for (let i = 0; i <= n; i++) boiteM(decor, 0.1, h, 0.1, NOIR, hz ? x0 : x0 + L * i / n, h / 2 - 0.2, hz ? z0 + L * i / n : z0, { fin: "metal", sansOmbre: true });
}
(function murRideau() {                                                     // la façade vitrée : haute au fond et à gauche, garde-corps devant et à droite (interrompus par l'accueil et le balcon)
  const X0 = -23, X1 = 23, Z0 = -16, Z1 = 17;
  garde(X0, Z0, X1, Z0, 3.3); garde(X0, Z0, X0, Z1, 3.3);
  garde(X0, Z1, -10, Z1, 1.25); garde(20, Z1, X1, Z1, 1.25);
  garde(X1, Z0, X1, BALCON.z0, 1.25); garde(X1, BALCON.z1, X1, Z1, 1.25);
  garde(BALCON.x0, BALCON.z0, BALCON.x1, BALCON.z0, 1.2); garde(BALCON.x0, BALCON.z1, BALCON.x1, BALCON.z1, 1.2); garde(BALCON.x1, BALCON.z0, BALCON.x1, BALCON.z1, 1.2);
  for (const [x, z] of [[X0, Z0], [X1, Z0], [X0, Z1], [0, Z0], [X0, 0.5]]) cyl(decor, 0.42, 3.4, 0xf3f1ec, x + (x < 0 ? 0.6 : -0.6) * (x !== 0), 1.5, z + (z < 0 ? 0.6 : z > 10 ? -0.6 : 0), { rough: 0.6 });
})();

/* Les pièces : le sol, le ruban lumineux d'état, les cloisons vitrées */
const SOLS = {
  accueil: () => texMarbre(5), accompagnement: () => texParquet(128, 84, 52, 12), projets: () => texParquet(188, 132, 80, 8), plan: () => texBeton("#dfe3ea", 14),
  attente: () => texParquet(200, 154, 104, 21), atelier: () => texBeton("#b9b3a8", 9), devis: () => texParquet(160, 110, 70, 30), bureau: () => texMoquette(92, 82, 170, 4),
  marketing: () => texMoquette(84, 96, 128, 6), caisse: () => texMarbre(17), reunion: () => texParquet(150, 104, 66, 41), serveurs: () => texBeton("#c9ccd4", 33), archives: () => texBeton("#a9a59c", 19),
};
const sols = [], COULEUR_ETAT = { critique: 0xff4d52, attention: 0xffab1a, bon: 0x2fd08a, vide: 0x9a9fc0 };
const faits = new Set();
/* Une cloison vitrée entre deux points. `portes` : les passages, [[position le long du mur, largeur]] ; le verre s'arrête de part et
   d'autre, le linteau continue, un seuil clair marque le passage. */
function cloison(x0, z0, x1, z1, portes) {
  const k = [x0, z0, x1, z1].join(","); if (faits.has(k)) return; faits.add(k);
  const hz = x0 === x1, L = hz ? z1 - z0 : x1 - x0, a0 = hz ? z0 : x0, fixe = hz ? x0 : z0;
  const pose = (a, la, h, y, ep, couleur, o) => boiteM(decor, hz ? ep : la, h, hz ? la : ep, couleur, hz ? fixe : a, y, hz ? a : fixe, o);   // un élément centré en `a` le long du mur
  const trous = (portes || []).map((p) => [p[0] - (p[1] || 1.6) / 2, p[0] + (p[1] || 1.6) / 2]).sort((u, v) => u[0] - v[0]);
  const pans = []; let d = a0; for (const [t0, t1] of trous) { if (t0 > d + 0.05) pans.push([d, t0]); d = Math.max(d, t1); } if (d < a0 + L - 0.05) pans.push([d, a0 + L]);
  pose(a0 + L / 2, L, 0.07, 2.15, 0.08, NOIR, { fin: "metal", sansOmbre: true });                                     // le linteau, d'un bout à l'autre
  for (const [p0, p1] of pans) { const l = p1 - p0, c = (p0 + p1) / 2;
    pose(c, l, 2.1, 1.07, 0.04, 0, { mat: matVerre, sansOmbre: true }); pose(c, l, 0.05, 0.03, 0.08, NOIR, { fin: "metal", sansOmbre: true });
    const n = Math.max(1, Math.round(l / 3.5)); for (let i = 0; i <= n; i++) pose(p0 + l * i / n, 0.07, 2.15, 1.08, 0.07, NOIR, { fin: "metal" }); }
  for (const [t0, t1] of trous) pose((t0 + t1) / 2, t1 - t0, 0.012, 0.008, 0.34, 0xf3f1ec, { fin: "laque", sansOmbre: true, recoit: true });   // le seuil
}
/* Les portes de chaque pièce : sur le couloir du fond pour la rangée du haut, sur le couloir de l'accueil pour celle du milieu.
   « sans » : pas de cloison de ce côté (l'accueil est ouvert sur son couloir ; la caisse partage le mur de l'accueil). */
const PORTES = {
  marketing: { z1: [[-15]] }, projets: { z1: [[-1]] }, plan: { z1: [[10]] }, archives: { z1: [[18]] },
  attente: { z1: [[-18]] }, atelier: { z1: [[-8]] }, devis: { z1: [[3]] }, accompagnement: { z1: [[12]] }, bureau: { z1: [[19]], x1: [[3, 1.8]] },
  accueil: { z0: "sans", x0: [[13.6, 4.6]], x1: [[13.2, 1.8], [17.7, 1.5]] }, caisse: { x0: "sans" }, reunion: { x0: "sans", z0: "sans" }, serveurs: { x0: "sans", z0: [[15.0, 1.4]] },   // (la salle de réunion s'ouvre par le mur de l'accueil et s'adosse à celui de la comptabilité)
};
for (const p of PIECES) {
  const w = p.x1 - p.x0, d = p.z1 - p.z0, cx = (p.x0 + p.x1) / 2, cz = (p.z0 + p.z1) / 2;
  p.cx = cx; p.cz = cz;
  const t = SOLS[p.id](); t.repeat.set(w / 2.4, d / 2.4);
  const dur = p.id === "accueil" || p.id === "caisse" || p.id === "plan";
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: dur ? 0.3 : /bureau|marketing/.test(p.id) ? 0.95 : 0.5, envMapIntensity: dur ? 0.7 : 0.35 });   // (sols durs : assez polis pour refléter le ciel, pas au point que les lampes y fassent une tache blanche)
  const sol = boiteM(scene, w - 0.06, 0.2, d - 0.06, 0, cx, -0.1, cz, { mat: m, sansOmbre: true, recoit: true }); sol.userData.piece = p; p.matSol = m; sols.push(sol);
  p.lisere = new THREE.Mesh(new THREE.BoxGeometry(w - 0.5, 0.03, 0.14), new THREE.MeshBasicMaterial({ color: COULEUR_ETAT[p.etat] }));
  p.lisere.position.set(cx, 0.02, p.z1 - 0.26); scene.add(p.lisere);
  const cotes = PORTES[p.id] || {}, mur = (c, a, b, e, f) => { if (cotes[c] !== "sans") cloison(a, b, e, f, cotes[c]); };
  mur("z0", p.x0, p.z0, p.x1, p.z0); mur("x0", p.x0, p.z0, p.x0, p.z1); mur("z1", p.x0, p.z1, p.x1, p.z1); mur("x1", p.x1, p.z0, p.x1, p.z1);
}

/* Les couloirs : des zones où l'on marche, comme les pièces, mais sans fiche ni étiquette (un peu plus larges que le sol
   visible, puisque leurs bords sont des cloisons fines). */
const COULOIRS = [{ id: "couloir-fond", x0: -22, x1: 22, z0: -5.25, z1: -1.75 }, { id: "couloir-accueil", x0: -22, x1: 14.2, z0: 7.7, z1: 10.3 }];

/* Sur le site, chaque pièce montre autant de personnes qu'il y en a vraiment (p.foule, plafonné) : les places assises et les marcheurs
   prévus par le décor se remplissent dans l'ordre, puis des marcheurs s'ajoutent. Le personnel (accueil, bar, Dani, agents) n'est pas compté.
   Dans la maquette (p.foule absent), le décor garde sa troupe d'exemple. */
const creerPersonne = personne, GENS_MAX = 14, restePiece = new Map();
const TYPE_PIECE = { accueil: "visiteur", accompagnement: "client", projets: "particulier", plan: "particulier", attente: "candidat", atelier: "artisan", devis: "client" };
function aSaPlace(piece, o) {
  if (piece.foule == null || (o && o.equipe)) return true;
  const r = restePiece.has(piece) ? restePiece.get(piece) : Math.min(GENS_MAX, piece.foule); if (r <= 0) return false; restePiece.set(piece, r - 1); return true;
}
/* Les lignes d'une pièce, pour un tableau dessiné dans la 3D : [titre, pastille, couleur] (textes d'origine, coupés à la largeur) */
const TON_ETAT = { critique: "#e5484d", attention: "#f59e0b", bon: "#30a46c", vide: "#9aa0b4" };
const coupe = (t, n) => (t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t);
const MOT_COURT = { "à rappeler": "rappel", "en retard": "retard", "à examiner": "examen", "à appeler": "appel", "à compléter": "à finir", "à relancer": "relance" };
const lignesMur = (p, n, large) => (p.brut || p.liste).slice(0, n).map((l) => [coupe(l[0], large), MOT_COURT[l[3]] || coupe(l[3], 8), TON_ETAT[l[2]] || TON_ETAT.vide]);

/* L'écran de la salle des serveurs : une jauge par limite, verte, orange au-delà de 60 %, rouge au-delà de 85 % */
function dessinServeurs(c, W, H) {
  c.fillStyle = "#0f1022"; c.fillRect(0, 0, W, H);
  c.fillStyle = "#ffffff"; c.font = "600 36px Geist, system-ui, sans-serif"; c.textBaseline = "middle"; c.textAlign = "left"; c.fillText("SERVEURS", 40, 50);
  const J = (parId.serveurs && parId.serveurs.jauges) || [];
  J.slice(0, 5).forEach((j, i) => {
    const y = 120 + i * 92, b = j.brut || [j.hote, j.nom, j.texte], part = j.part;
    c.fillStyle = "#a9aed0"; c.font = "500 22px Geist, system-ui, sans-serif"; c.fillText(b[0] + " · " + b[1], 40, y);
    c.fillStyle = "#262947"; arrondi(c, 40, y + 22, W - 220, 26, 13); c.fill();
    if (part != null) { c.fillStyle = part >= 0.85 ? "#e5484d" : part >= 0.6 ? "#f59e0b" : "#30a46c"; arrondi(c, 40, y + 22, Math.max(26, (W - 220) * Math.min(1, part)), 26, 13); c.fill(); }
    c.textAlign = "right"; c.fillStyle = part == null ? "#7b7f98" : "#ffffff"; c.font = "600 30px Geist, system-ui, sans-serif"; c.fillText(part == null ? "—" : part > 0 && part < 0.01 ? "< 1 %" : Math.round(part * 100) + " %", W - 40, y + 35); c.textAlign = "left";
  });
}

/* L'écran de la salle de réunion : le planning des deux semaines, tiré des mêmes rendez-vous que la fiche */
function dessinPlanning(c, W, H) {
  c.fillStyle = "#0f1022"; c.fillRect(0, 0, W, H);
  c.fillStyle = "#ffffff"; c.font = "600 38px Geist, system-ui, sans-serif"; c.textBaseline = "middle"; c.textAlign = "left"; c.fillText("PLANNING", 34, 44);
  const noms = ["lun.", "mar.", "mer.", "jeu.", "ven."], x0 = 34, lw = (W - 68) / 5;
  for (let s = 0; s < 2; s++) {
    const y0 = 86 + s * 244;
    c.fillStyle = "#a9aed0"; c.font = "500 22px Geist, system-ui, sans-serif"; c.textAlign = "right"; c.fillText(s ? "Semaine prochaine" : "Cette semaine", W - 34, s ? y0 - 4 : 44);
    for (let j = 0; j < 5; j++) {
      const x = x0 + j * lw, d = jourDu(s * 7 + j), auj = d.toDateString() === new Date().toDateString();
      c.fillStyle = auj ? "#262a5c" : "#181a33"; arrondi(c, x + 5, y0 + 10, lw - 10, 222, 12); c.fill();
      c.fillStyle = auj ? "#c4b5fd" : "#a9aed0"; c.font = "600 22px Geist, system-ui, sans-serif"; c.textAlign = "left"; c.fillText(noms[j] + " " + d.getDate(), x + 18, y0 + 34);
      RDVS.filter((r) => r.j === s * 7 + j).forEach((r, k) => { const y = y0 + 58 + k * 74;
        c.fillStyle = r.confirme ? "#4f46e5" : "#b86a00"; arrondi(c, x + 14, y, lw - 28, 64, 10); c.fill();
        c.fillStyle = "#ffffff"; c.font = "600 21px Geist, system-ui, sans-serif"; c.fillText(r.h, x + 24, y + 21); const ici = heureIci(r); if (ici) { const w = c.measureText(r.h).width; c.fillStyle = "#d9d2ff"; c.font = "500 19px Geist, system-ui, sans-serif"; c.fillText("· " + ici.h, x + 32 + w, y + 21); c.fillStyle = "#ffffff"; } c.font = "500 19px Geist, system-ui, sans-serif"; c.fillText(r.qui.length > 13 ? r.qui.slice(0, 12) + "…" : r.qui, x + 24, y + 45); });
    }
  }
}

/* L'aménagement, pièce par pièce. Tout le mobilier va dans `decor` (fusionné à la fin) ; chaque meuble déclare son emprise au sol.
   Rappel des directions : la caméra regarde depuis +x et +z. Ce qui est accroché se met donc sur les murs du fond (z0) et de gauche (x0). */
(function amenager() {
  const D = decor, PI = Math.PI;
  /* Asseoir quelqu'un sur le siège le plus proche du point donné : la personne prend la place et la direction exactes du siège */
  const personne = (type, piece, o) => (type === "serveur" || type === "dani" || type === "responsable" || aSaPlace(piece, o) ? creerPersonne(type, piece, o) : null);
  const asseoir = (type, piece, x, z) => { const s = siegePres(x, z); return personne(type, piece, { fixe: true, assis: true, x: s.x, z: s.z, ry: s.ry }); };

  let p = parId.accueil;                                                   // ── Accueil : le grand mur de marque, la banque, le médaillon au sol, deux salons, la vue (4 m en porte-à-faux)
  { const ax = p.cx, z0 = p.z0;
    // le mur de marque, dos au couloir : le vrai logo et le vrai mot, éclairés
    emprise(ax, z0 + 0.62, 10.9, 0.34);
    boiteM(D, 9.2, 3.1, 0.22, NUIT, ax, 1.55, z0 + 0.62, { fin: "laque" }); image3d(D, TEX_MARQUE.mur(), 9.0, 3.0, ax, 1.56, z0 + 0.74, { lum: 0.85 });
    for (const s of [-1, 1]) boiteM(D, 0.8, 3.1, 0.18, 0, ax + s * 5.0, 1.55, z0 + 0.62, { mat: matNoyer }); boiteM(D, 9.2, 0.05, 0.03, 0x8b85ff, ax, 0.06, z0 + 0.75, { lum: 1.5, sansOmbre: true });
    // la banque d'accueil : laque blanche, dessus en marbre, façade en noyer, la plaque AVYORA au milieu
    const bz = z0 + 2.9; emprise(ax, bz, 5.7, 1.1);
    boiteM(D, 5.4, 1.05, 0.9, 0xffffff, ax, 0.52, bz, { fin: "laque" }); boiteM(D, 5.6, 0.06, 1.05, 0, ax, 1.08, bz, { mat: matMarbre });
    boiteM(D, 5.2, 0.7, 0.03, 0, ax, 0.5, bz + 0.465, { mat: matNoyer, sansOmbre: true }); boiteM(D, 5.4, 0.05, 0.02, 0x8b85ff, ax, 0.08, bz + 0.48, { lum: 1.6, sansOmbre: true });
    image3d(D, TEX_MARQUE.plaque(), 1.9, 0.48, ax, 0.56, bz + 0.49, { lum: 0.55 });
    portable(D, ax + 1.3, 1.11, bz - 0.15, PI); portable(D, ax - 1.4, 1.11, bz - 0.15, PI); cyl(D, 0.07, 0.2, BLANC, ax - 2.3, 1.21, bz, { fin: "ceramique", seg: 12 }); boule(D, 0.16, 0x3fa55e, ax - 2.3, 1.42, bz, { fin: "feuille", facettes: true });
    personne("pro", p, { fixe: true, equipe: true, x: ax - 0.9, z: bz - 0.95, ry: 0 }); personne("pro", p, { fixe: true, equipe: true, x: ax + 1.1, z: bz - 0.95, ry: 0 });
    // le bar à café, à droite de la banque : comptoir en noyer et marbre, la machine, les tasses, le serveur derrière et un visiteur servi
    { const bx = 5.0, bc = z0 + 2.6; emprise(bx, bc, 3.2, 0.84);
      boiteM(D, 3.0, 1.0, 0.64, 0, bx, 0.5, bc, { mat: matNoyer }); boiteM(D, 3.2, 0.05, 0.8, 0, bx, 1.025, bc, { mat: matMarbre });
      boiteM(D, 3.0, 0.05, 0.02, 0x8b85ff, bx, 0.08, bc + 0.33, { lum: 1.5, sansOmbre: true }); panneauTexte(D, "CAFÉ", 1.3, 0.36, bx, 0.58, bc + 0.325, 0, "#1E1B4B", "#ffffff", 0.7);
      machineCafe(D, bx - 1.05, 1.05, bc - 0.08, PI);
      for (let i = 0; i < 6; i++) cyl(D, 0.04, 0.09, i % 2 ? 0xa78bfa : BLANC, bx - 0.5 + (i % 3) * 0.11, 1.095, bc - 0.2 + ((i / 3) | 0) * 0.12, { fin: "ceramique", seg: 10, sansOmbre: true });   // les tasses propres
      boiteM(D, 0.5, 0.02, 0.3, NOIR, bx + 0.95, 1.06, bc + 0.1, { fin: "metal", sansOmbre: true }); for (let i = 0; i < 2; i++) { cyl(D, 0.045, 0.1, BLANC, bx + 0.85 + i * 0.2, 1.12, bc + 0.1, { fin: "ceramique", seg: 10, sansOmbre: true }); cyl(D, 0.036, 0.006, 0x3b2416, bx + 0.85 + i * 0.2, 1.171, bc + 0.1, { rough: 0.25, seg: 10, sansOmbre: true }); }   // le plateau, deux cafés servis
      cyl(D, 0.085, 0.2, 0x4a3324, bx + 1.42, 1.15, bc - 0.15, { rough: 0.35, seg: 14 }); cyl(D, 0.088, 0.02, 0xc9ccd6, bx + 1.42, 1.26, bc - 0.15, { fin: "metal", seg: 14, sansOmbre: true });                 // le pot de grains
      personne("serveur", p, { fixe: true, x: bx - 0.3, z: bc - 0.8, ry: 0 }); personne("visiteur", p, { fixe: true, x: bx + 1.05, z: bc + 0.85, ry: PI });
    }
    // le médaillon AVYORA incrusté dans le marbre, devant la banque
    image3d(D, TEX_MARQUE.medaillon(), 4.2, 4.2, ax, 0.014, z0 + 6.6, { auSol: true, transparent: true, lum: 0.12, rough: 0.3 });
    // les kakémonos, de chaque côté du mur
    for (const s of [-1, 1]) { const kx = ax + s * 6.6; emprise(kx, z0 + 0.9, 0.95, 0.3); boiteM(D, 0.9, 2.4, 0.04, NUIT, kx, 1.25, z0 + 0.9, { fin: "laque" }); image3d(D, TEX_MARQUE.kakemono(), 0.86, 2.3, kx, 1.25, z0 + 0.93, { lum: 0.7 }); boiteM(D, 1.0, 0.05, 0.3, NOIR, kx, 0.025, z0 + 0.9, { fin: "metal", sansOmbre: true }); }
    // le salon, à gauche : deux canapés en angle, une table basse, un fauteuil
    tapis(D, -7.3, z0 + 7.0, 4.6, 5.4, TAPIS.indigo);
    canape(D, p.x0 + 0.6, z0 + 7.0, PI / 2, CUIR.cognac); canape(D, -7.2, z0 + 4.3, 0, CUIR.ivoire); tableBasse(D, -7.2, z0 + 7.0);
    fauteuilSalon(D, -7.2, z0 + 9.5, PI, CUIR.cognac); lampadaire(D, p.x0 + 0.6, z0 + 4.4); plante(D, -5.0, z0 + 9.4, 0.8);
    asseoir("visiteur", p, p.x0 + 0.7, z0 + 6.55); asseoir("visiteur", p, -7.2, z0 + 4.4);
    // le coin d'attente, à droite : quatre fauteuils autour d'une table basse
    tapis(D, 5.2, z0 + 7.0, 4.2, 4.4, TAPIS.sable);
    fauteuilSalon(D, 4.2, z0 + 5.6, 0, CUIR.cognac); fauteuilSalon(D, 6.2, z0 + 5.6, 0, CUIR.cognac); fauteuilSalon(D, 4.2, z0 + 8.5, PI, CUIR.ivoire); fauteuilSalon(D, 6.2, z0 + 8.5, PI, CUIR.ivoire); tableBasse(D, 5.2, z0 + 7.05, 0.6);
    // la borne d'accueil (un écran sur pied) et la vue : des palmiers devant la baie vitrée du porte-à-faux
    emprise(2.6, z0 + 4.6, 0.7, 0.4); boiteM(D, 0.6, 1.5, 0.08, NOIR, 2.6, 0.75, z0 + 4.6, { fin: "metal" }); ecran(D, 0.52, 0.8, 2.6, 1.05, z0 + 4.65, 0);
    palmierPot(D, p.x0 + 0.95, p.z1 - 0.95, 3.4); palmierPot(D, p.x1 - 0.95, p.z1 - 0.95, 3.4); plante(D, p.x0 + 0.8, z0 + 10.2, 1.0, true);
    for (let i = 0; i < 9; i++) personne("visiteur", p);
  }

  p = parId.caisse;                                                        // ── Comptabilité (ancienne « Caisse », l'identifiant est resté) : le mur vert, le comptoir, le coffre, la file
  { const z0 = p.z0, cx = p.cx;
    cimaise(D, cx - 0.4, z0 + 0.3, 3.4, 2.5, 0, 0x0b7a53); panneauTexte(D, "COMPTABILITÉ", 3.0, 0.5, cx - 0.4, 2.0, z0 + 0.37, 0, "#0b7a53", "#ffffff", 0.8); panneauTexte(D, SOURCE ? (p.kpis[0] && p.kpis[0][1] !== "—" ? "Entrées " + p.kpis[0][1] + "  ·  Charges " + p.kpis[1][1] : "Entrées et charges : voir Compta").replace(/&amp;/g, "&") : "Entrées 198 €  ·  Charges 226 €", 3.0, 0.3, cx - 0.4, 1.5, z0 + 0.37, 0, "#ffffff", "#0b7a53", 0.5);
    emprise(cx - 0.4, z0 + 2.1, 3.3, 1.1); boiteM(D, 3, 1.0, 0.9, 0xffffff, cx - 0.4, 0.5, z0 + 2.1, { fin: "laque" }); boiteM(D, 3.2, 0.06, 1.05, 0x0b7a53, cx - 0.4, 1.03, z0 + 2.1, { rough: 0.2 });
    boiteM(D, 2.8, 0.05, 0.02, 0x2fd08a, cx - 0.4, 0.08, z0 + 2.58, { lum: 1.3, sansOmbre: true });
    boiteM(D, 0.5, 0.2, 0.42, NOIR, cx - 1.1, 1.16, z0 + 2.1, { fin: "metal" }); boiteM(D, 0.44, 0.3, 0.03, NOIR, cx - 1.1, 1.45, z0 + 1.95, { fin: "metal", sansOmbre: true }); ecran(D, 0.4, 0.26, cx - 1.1, 1.45, z0 + 1.93, PI);   // la caisse et son écran
    boiteM(D, 0.1, 0.03, 0.18, NOIR, cx + 0.3, 1.09, z0 + 2.4, { fin: "mat", sansOmbre: true, ry: 0.3 }); boiteM(D, 0.3, 0.012, 0.4, 0xffffff, cx + 0.8, 1.07, z0 + 2.2, { sansOmbre: true, ry: -0.2 });
    chaise(D, cx - 0.9, z0 + 1.15, PI, 0x2c2f45);
    emprise(p.x1 - 0.75, z0 + 0.75, 1.0, 0.9); boiteM(D, 0.9, 1.3, 0.8, 0x3b3f52, p.x1 - 0.75, 0.65, z0 + 0.75, { rough: 0.3, metal: 0.9 });                                            // le coffre
    cyl(D, 0.16, 0.05, 0xc9ccd6, p.x1 - 0.75, 0.75, z0 + 1.17, { fin: "metal" }).rotation.x = PI / 2; boiteM(D, 0.05, 0.24, 0.03, 0xc9ccd6, p.x1 - 1.05, 0.75, z0 + 1.16, { fin: "metal", sansOmbre: true });
    emprise(cx, z0 + 4.6, 3.0, 0.2);                                                                                   // la file : trois poteaux et leur cordon
    for (const dx of [-1.4, 0, 1.4]) { cyl(D, 0.16, 0.03, 0xc9a04a, cx + dx, 0.015, z0 + 4.6, { fin: "metal", seg: 16 }); cyl(D, 0.025, 0.95, 0xc9a04a, cx + dx, 0.5, z0 + 4.6, { fin: "metal", seg: 8 }); boule(D, 0.045, 0xc9a04a, cx + dx, 0.99, z0 + 4.6, { fin: "metal" }); }
    for (const dx of [-0.7, 0.7]) boiteM(D, 1.36, 0.04, 0.04, 0x4f46e5, cx + dx, 0.84, z0 + 4.6, { fin: "tissu", sansOmbre: true });
    plante(D, p.x0 + 0.85, p.z1 - 0.95, 1.1, true); personne("particulier", p); personne("pro", p);
  }

  p = parId.reunion;                                                       // ── Salle de réunion : la table, l'écran du planning, la vue (en porte-à-faux, à droite de l'accueil)
  { const z0 = p.z0, tx = p.cx + 0.2, tz = z0 + 2.6;
    tapis(D, tx, tz, 3.8, 3.0, TAPIS.gris);
    cimaise(D, tx, z0 + 0.3, 3.4, 2.4, 0, NUIT); ecranMural(D, 2.9, 1.63, tx, 1.38, z0 + 0.39, 0, lumineux(1024, 576, dessinPlanning, 0.9));
    emprise(tx, tz, 1.2, 2.3); boiteM(D, 1.1, 0.06, 2.2, 0, tx, 0.75, tz, { mat: matNoyer }); for (const sz of [-0.75, 0.75]) { boiteM(D, 0.7, 0.7, 0.1, NOIR, tx, 0.36, tz + sz, { fin: "metal" }); boiteM(D, 0.8, 0.03, 0.4, NOIR, tx, 0.015, tz + sz, { fin: "metal", sansOmbre: true }); }
    for (const dz of [-0.55, 0.55]) { chaise(D, tx - 1.0, tz + dz, -PI / 2); chaise(D, tx + 1.0, tz + dz, PI / 2); }
    asseoir("client", p, tx - 1.0, tz - 0.55); asseoir("client", p, tx - 1.0, tz + 0.55);
    portable(D, tx + 0.22, 0.78, tz + 0.55, -PI / 2); boiteM(D, 0.3, 0.012, 0.42, 0xffffff, tx - 0.2, 0.787, tz - 0.5, { sansOmbre: true, ry: 1.4 }); cyl(D, 0.04, 0.09, BLANC, tx - 0.25, 0.825, tz + 0.2, { fin: "ceramique", seg: 10, sansOmbre: true });
    cyl(D, 0.11, 0.035, NOIR, tx, 0.8, tz - 0.05, { fin: "metal", seg: 16, sansOmbre: true }); cyl(D, 0.03, 0.012, 0x30a46c, tx, 0.822, tz - 0.05, { lum: 1.4, seg: 10, sansOmbre: true });                 // le micro de table : l'appel est enregistré
    plante(D, p.x1 - 0.8, p.z1 - 0.8, 1.0, true);
  }

  p = parId.serveurs;                                                      // ── Salle des serveurs : les baies Supabase et Vercel, l'écran des jauges (en porte-à-faux, au bout)
  { const z0 = p.z0, x0 = p.x0, rz = z0 + 0.62;
    const baie = (x, nom, ton, encre) => {                                   // une baie : l'armoire noire, ses voyants, son nom au-dessus de la porte vitrée
      emprise(x, rz, 0.66, 0.96); boiteM(D, 0.62, 2.05, 0.92, 0x15161c, x, 1.025, rz, { fin: "metal" }); boiteM(D, 0.54, 1.7, 0.02, 0x23252f, x, 1.0, rz + 0.465, { rough: 0.25, metal: 0.6, sansOmbre: true });
      for (let i = 0; i < 9; i++) { const y = 0.3 + i * 0.18; boiteM(D, 0.44, 0.1, 0.015, 0x2c2f3b, x, y, rz + 0.48, { fin: "metal", sansOmbre: true }); boiteM(D, 0.03, 0.018, 0.012, i % 3 === 1 ? 0x5aa9ff : 0x3ad18a, x + 0.17, y, rz + 0.49, { lum: 1.6, sansOmbre: true }); }
      panneauTexte(D, nom, 0.6, 0.16, x, 1.93, rz + 0.48, 0, ton, encre, 0.9);
    };
    baie(x0 + 1.95, "SUPABASE", "#1c1c1c", "#3ecf8e"); baie(x0 + 2.65, "SUPABASE", "#1c1c1c", "#3ecf8e"); baie(x0 + 3.75, "VERCEL", "#000000", "#ffffff"); baie(x0 + 4.45, "VERCEL", "#000000", "#ffffff");
    boiteM(D, 3.4, 0.08, 0.3, 0x3a3d4a, x0 + 3.2, 2.1, rz - 0.1, { fin: "metal", sansOmbre: true });                                              // le chemin de câbles au-dessus
    cimaise(D, x0 + 0.3, p.cz + 0.6, 2.6, 2.3, PI / 2, NUIT); ecranMural(D, 2.2, 1.24, x0 + 0.39, 1.38, p.cz + 0.6, PI / 2, lumineux(1024, 576, dessinServeurs, 0.95));
    tapis(D, x0 + 3.2, p.z1 - 1.3, 2.6, 1.2, TAPIS.gris); plante(D, p.x1 - 0.7, p.z1 - 0.7, 0.9, true);
  }

  p = parId.accompagnement;                                                // ── Accompagnement : le salon où les clients attendent leur rappel, le bureau du conseiller
  { const z0 = p.z0, x0 = p.x0;
    tapis(D, x0 + 2.3, 4.6, 4.2, 3.4, TAPIS.sable);
    canape(D, x0 + 0.6, 4.6, PI / 2, CUIR.cognac); tableBasse(D, x0 + 2.4, 4.6, 0.9); fauteuilSalon(D, x0 + 4.1, 4.6, -PI / 2, CUIR.ivoire); lampadaire(D, x0 + 0.5, 6.25);
    asseoir("client", p, x0 + 0.7, 4.15); asseoir("client", p, x0 + 0.7, 5.05); personne("client", p);
    const b = bureauM(D, 13.2, z0 + 2.4, PI, { double: true }); chaise(D, 12.5, z0 + 3.75, 0, 0x8a3b2e); chaise(D, 13.9, z0 + 3.75, 0, 0x8a3b2e);
    boiteM(b, 0.2, 0.06, 0.2, NOIR, 0.6, 0.795, 0.15, { fin: "mat", sansOmbre: true }); boiteM(b, 0.06, 0.05, 0.2, NOIR, 0.6, 0.84, 0.15, { fin: "mat", sansOmbre: true });   // le téléphone
    cimaise(D, x0 + 2.2, z0 + 0.3, 2.8, 2.2, 0, BLANC);                                                                  // le tableau des rappels
    affiche(D, 2.5, 1.5, x0 + 2.2, 1.3, z0 + 0.37, 0, (c, W, H) => { c.fillStyle = "#ffffff"; c.fillRect(0, 0, W, H); titre(c, "RAPPELS À FAIRE", 28, 44, 34, "#1e1b4b", "700");
      const L = SOURCE ? lignesMur(p, 3, 15) : [["Julie M.", "3 j", "#e5484d"], ["Karim B.", "99 €", "#f59e0b"], ["Sophie L.", "devis", "#f59e0b"]];
      L.forEach((l, i) => { const y = 112 + i * 62; c.fillStyle = l[2]; c.beginPath(); c.arc(44, y, 13, 0, 7); c.fill(); titre(c, l[0], 74, y, 32, "#23263c", "500"); c.fillStyle = l[2]; c.fillRect(W - 150, y - 20, 120, 40); c.textAlign = "center"; titre(c, l[1], W - 90, y + 2, 26, "#ffffff", "700"); c.textAlign = "left"; }); });
    plante(D, p.x1 - 0.85, z0 + 0.85, 0.85); plante(D, p.x1 - 0.8, p.z1 - 1.0, 1.1, true);
  }

  p = parId.projets;                                                       // ── Projets : l'open space (deux îlots de bureaux face à face), le coin café, le copieur
  { const z0 = p.z0;
    const ilot = (xs, zc) => { xs.forEach((x, i) => { bureauM(D, x, zc + 0.45, 0, { portable: i === 1 }); bureauM(D, x, zc - 0.45, PI, { portable: i === 2, couleur: 0x3b3f66 }); });
      boiteM(D, xs.length * 1.7, 0.42, 0.03, 0x6d6ab8, (xs[0] + xs[xs.length - 1]) / 2, 0.97, zc, { fin: "tissu" }); };                                                                   // l'écran de séparation en feutre
    ilot([-5.6, -3.9, -2.2], z0 + 2.9); ilot([-5.6, -3.9], z0 + 7.45);                                               // placés pour laisser des allées où deux personnes se croisent (au fond, à gauche, entre les deux îlots)
    cimaise(D, 3.2, z0 + 0.3, 4.4, 2.3, 0, BLANC);                                                                     // le tableau des estimations (colonnes de fiches)
    affiche(D, 4.0, 1.7, 3.2, 1.3, z0 + 0.37, 0, (c, W, H) => { c.fillStyle = "#fbfaf7"; c.fillRect(0, 0, W, H); const r = alea(31), cols = ["RAPIDE", "DÉTAILLÉE", "NEUF", "TERMINÉES"], tons = ["#4f46e5", "#a78bfa", "#f59e0b", "#30a46c"];
      cols.forEach((n, k) => { const x = 14 + k * (W - 28) / 4, w = (W - 28) / 4 - 10; c.fillStyle = "#eeecf6"; c.fillRect(x, 10, w, H - 20); titre(c, n, x + 8, 28, 15, "#23263c", "700");
        for (let i = 0; i < 2 + (r() * 4 | 0); i++) { c.fillStyle = tons[k]; c.globalAlpha = 0.55 + r() * 0.45; c.fillRect(x + 8, 46 + i * 31, w - 16, 24); c.globalAlpha = 1; } }); });
    copieur(D, p.x1 - 0.62, z0 + 2.1, -PI / 2); emprise(p.x1 - 0.7, z0 + 3.0, 0.5, 0.4); carton(D, p.x1 - 0.7, 0, z0 + 3.0, 0.45, 0.3, 0.35, 0.1, BLANC);
    coinCafe(D, p.x1 - 0.5, z0 + 6.4, 2.3, -PI / 2);
    tapis(D, 2.5, z0 + 7.3, 3.4, 3.2, TAPIS.indigo); tableRonde(D, 2.5, z0 + 7.3, 0.5, 1.05); tabouret(D, 1.65, z0 + 7.3, 0x6d6ab8, 0.74); tabouret(D, 2.95, z0 + 8.05, 0x6d6ab8, 0.74); tabouret(D, 2.95, z0 + 6.55, 0x6d6ab8, 0.74);
    portable(D, 2.5, 1.08, z0 + 7.3, -PI / 2);
    plante(D, p.x1 - 0.85, p.z1 - 0.85, 0.85); plante(D, 0.55, z0 + 0.85, 1.15, true);
    asseoir("particulier", p, -5.6, z0 + 4.1); asseoir("pro", p, -2.2, z0 + 1.7); asseoir("particulier", p, -3.9, z0 + 8.65); asseoir("particulier", p, -5.6, z0 + 6.25);   // ceux qui font leur estimation
    for (let i = 0; i < 3; i++) personne("particulier", p); for (let i = 0; i < 2; i++) personne("pro", p);
  }

  p = parId.plan;                                                          // ── Studio Plan 3D : le grand écran, les tables à dessin inclinées, la maquette, le traceur
  { const z0 = p.z0, cx = p.cx;
    cimaise(D, cx, z0 + 0.3, 4.2, 2.5, 0, NUIT); ecranMural(D, 3.2, 2.0, cx, 1.32, z0 + 0.39, 0, matPlan);
    for (const x of [cx - 1.6, cx + 1.6]) { const z = z0 + 3.5, t = new THREE.Group(); t.position.set(x, 0, z); D.add(t); emprise(x, z, 2.1, 1.3);
      const pl = new THREE.Group(); pl.position.set(0, 0.98, 0); pl.rotation.x = 0.3; t.add(pl);                                                          // le plateau, penché vers la personne
      boiteM(pl, 2.0, 0.05, 1.2, 0xffffff, 0, 0, 0, { fin: "laque" }); const f = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.94), matPlan); f.rotation.x = -PI / 2; f.position.y = 0.03; pl.add(f);
      boiteM(pl, 1.9, 0.03, 0.04, 0xc9ccd6, 0, 0.04, 0.2, { fin: "metal", sansOmbre: true }); boiteM(pl, 2.0, 0.05, 0.05, NOIR, 0, 0.03, 0.6, { fin: "metal", sansOmbre: true });
      for (const sx of [-0.85, 0.85]) { boiteM(t, 0.06, 1.12, 0.06, NOIR, sx, 0.56, -0.5, { fin: "metal" }); boiteM(t, 0.06, 0.8, 0.06, NOIR, sx, 0.4, 0.5, { fin: "metal" }); boiteM(t, 0.06, 0.05, 1.1, NOIR, sx, 0.2, 0, { fin: "metal", sansOmbre: true }); }
      boiteM(t, 1.7, 0.05, 0.05, NOIR, 0, 0.2, -0.5, { fin: "metal", sansOmbre: true });
      tabouret(D, x, z + 1.1, 0x2c2f45, 0.66, PI); }
    asseoir("particulier", p, cx - 1.6, z0 + 4.6);
    { const x = cx, z = z0 + 7.4; emprise(x, z, 2.3, 1.5);                                                              // la maquette : une villa blanche sur son terrain
      boiteM(D, 2.2, 0.06, 1.4, 0xffffff, x, 0.82, z, { fin: "laque" }); for (const sx of [-0.95, 0.95]) for (const sz of [-0.55, 0.55]) boiteM(D, 0.06, 0.8, 0.06, NOIR, x + sx, 0.4, z + sz, { fin: "metal" });
      boiteM(D, 1.9, 0.03, 1.15, 0xb9c7a8, x, 0.865, z, { fin: "mat", sansOmbre: true });
      boiteM(D, 0.8, 0.26, 0.5, 0xffffff, x - 0.3, 1.01, z - 0.15, { fin: "mat" }); boiteM(D, 0.45, 0.22, 0.7, 0xffffff, x + 0.25, 0.99, z + 0.05, { fin: "mat" }); boiteM(D, 0.5, 0.2, 0.36, 0xffffff, x - 0.35, 1.24, z - 0.2, { fin: "mat" });
      boiteM(D, 0.86, 0.02, 0.56, 0xd9d6cf, x - 0.3, 1.15, z - 0.15, { fin: "mat", sansOmbre: true }); boiteM(D, 0.5, 0.012, 0.3, 0x25c9dc, x - 0.4, 0.886, z + 0.36, { rough: 0.1, lum: 0.3, sansOmbre: true });
      for (const [dx, dz] of [[0.75, -0.4], [0.8, 0.42], [-0.82, -0.42], [0.55, 0.45]]) { cyl(D, 0.012, 0.1, 0x6b4a2e, x + dx, 0.93, z + dz, { seg: 5, sansOmbre: true }); boule(D, 0.07, 0x3fa55e, x + dx, 1.02, z + dz, { fin: "feuille", facettes: true }); } }
    { const x = p.x1 - 0.65, z = z0 + 6.6; emprise(x, z, 0.7, 1.6);                                                     // le traceur grand format
      boiteM(D, 0.5, 0.3, 1.5, BLANC, x, 0.95, z, { fin: "laque" }); boiteM(D, 0.52, 0.06, 1.52, 0x2c2f45, x, 1.13, z, { fin: "mat" }); for (const sz of [-0.65, 0.65]) boiteM(D, 0.4, 0.8, 0.05, NOIR, x, 0.4, z + sz, { fin: "metal" });
      const f = boiteM(D, 0.02, 0.5, 1.1, 0xffffff, x - 0.3, 0.62, z, { sansOmbre: true }); f.rotation.z = -0.25; cyl(D, 0.06, 1.2, 0xffffff, x, 0.62, z, { seg: 10, sansOmbre: true }).rotation.x = PI / 2; }
    { const x = p.x0 + 0.6, z = z0 + 1.0; emprise(x, z, 0.5, 0.5); cyl(D, 0.2, 0.55, NOIR, x, 0.275, z, { fin: "metal", seg: 14 });                                              // le panier à rouleaux
      for (let i = 0; i < 5; i++) { const c = cyl(D, 0.035, 0.9, i % 2 ? 0xffffff : 0xdbe6ff, x + Math.sin(i * 1.3) * 0.09, 0.62, z + Math.cos(i * 1.3) * 0.09, { seg: 8, sansOmbre: true }); c.rotation.z = Math.sin(i * 2.1) * 0.14; c.rotation.x = Math.cos(i * 1.7) * 0.14; } }
    cimaise(D, p.x0 + 0.3, z0 + 6.6, 2.6, 1.9, PI / 2, BLANC);                                                         // le nuancier des matériaux
    { const tons = [0xd9b48a, 0x8a6a48, 0xe9e4da, 0x9aa3ad, 0x35507a, 0xb9c7a8, 0xc2410c, 0x2c2f45, 0xf4f1ea, 0x6b4a2e, 0xa9a59c, 0x4f46e5]; for (let i = 0; i < 12; i++) boiteM(D, 0.02, 0.34, 0.34, tons[i], p.x0 + 0.37, 1.55 - ((i / 4) | 0) * 0.42, z0 + 5.95 + (i % 4) * 0.43, { fin: i % 3 ? "mat" : "laque", sansOmbre: true }); }
    plante(D, p.x1 - 0.85, z0 + 0.85, 1.15, true); for (let i = 0; i < 2; i++) personne("particulier", p);
  }

  p = parId.attente;                                                       // ── Salle d'attente : les fauteuils le long du mur, le banc, la fontaine à eau, le tableau des candidatures
  { const z0 = p.z0, x0 = p.x0;
    tapis(D, x0 + 2.4, z0 + 3.4, 3.8, 5.6, TAPIS.sable);
    for (let i = 0; i < 4; i++) fauteuilSalon(D, x0 + 0.62, z0 + 1.7 + i * 1.15, PI / 2, CUIR.cognac);
    tableBasse(D, x0 + 2.6, z0 + 3.4, 0.9);
    cimaise(D, x0 + 3.6, z0 + 0.3, 3.0, 2.2, 0, BLANC);                                                                 // le tableau : qui attend, depuis quand
    affiche(D, 2.7, 1.5, x0 + 3.6, 1.3, z0 + 0.37, 0, (c, W, H) => { c.fillStyle = "#ffffff"; c.fillRect(0, 0, W, H); titre(c, "CANDIDATURES", 28, 42, 34, "#1e1b4b", "700");
      (SOURCE ? lignesMur(p, 4, 20) : [["Maçonnerie Durand", "6 j", "#e5484d"], ["Élec Martin", "4 j", "#f59e0b"], ["Toitures Roy", "2 j", "#f59e0b"], ["Plomberie Faure", "1 j", "#30a46c"]]).forEach((l, i) => { const y = 100 + i * 50; c.fillStyle = l[2]; c.beginPath(); c.arc(42, y, 11, 0, 7); c.fill(); titre(c, l[0], 68, y, 27, "#23263c", "500"); c.textAlign = "right"; titre(c, l[1], W - 30, y, 27, l[2], "700"); c.textAlign = "left"; }); });
    cyl(D, 0.3, 0.04, 0xffffff, x0 + 5.7, 1.75, z0 + 0.38, { fin: "laque", seg: 28, sansOmbre: true }).rotation.x = PI / 2; cyl(D, 0.32, 0.03, NOIR, x0 + 5.7, 1.75, z0 + 0.37, { fin: "metal", seg: 28, sansOmbre: true }).rotation.x = PI / 2;      // l'horloge
    boiteM(D, 0.03, 0.2, 0.012, NOIR, x0 + 5.7, 1.83, z0 + 0.41, { sansOmbre: true }); boiteM(D, 0.16, 0.025, 0.012, NOIR, x0 + 5.77, 1.75, z0 + 0.41, { sansOmbre: true });
    emprise(x0 + 5.7, z0 + 0.3, 0.8, 0.24); boiteM(D, 0.7, 2.2, 0.12, BLANC, x0 + 5.7, 1.1, z0 + 0.3, { fin: "laque" });
    banc(D, x0 + 5.6, z0 + 3.4, 2.2, -PI / 2, 0xb9a37a, 3);
    { const x = p.x1 - 0.6, z = z0 + 0.6; emprise(x, z, 0.45, 0.45); boiteM(D, 0.36, 1.0, 0.36, BLANC, x, 0.5, z, { fin: "laque" }); cyl(D, 0.15, 0.4, 0x8fd3f4, x, 1.22, z, { opacite: 0.6, rough: 0.1, seg: 14 }); boiteM(D, 0.2, 0.12, 0.03, 0x2c2f45, x, 0.78, z + 0.18, { fin: "mat", sansOmbre: true }); }   // la fontaine à eau
    plante(D, p.x1 - 0.9, p.z1 - 0.95, 0.85); plante(D, x0 + 0.8, p.z1 - 0.95, 1.1, true);
    asseoir("candidat", p, x0 + 0.62, z0 + 1.7); asseoir("candidat", p, x0 + 0.62, z0 + 4.0); personne("candidat", p); personne("candidat", p);
  }

  p = parId.atelier;                                                       // ── Atelier : le mur d'outils, les établis, le rayonnage, les matériaux, la grande table sur tréteaux
  { const z0 = p.z0, x0 = p.x0, x1 = p.x1;
    cimaise(D, x0 + 4.1, z0 + 0.28, 5.8, 2.2, 0, 0xd8ccb6, { fin: "mat" });
    { const r = alea(71), zf = z0 + 0.36; for (let i = 0; i < 16; i++) { const x = x0 + 1.6 + (i % 8) * 0.7, y = 1.85 - ((i / 8) | 0) * 0.5, s = r();                                // les outils accrochés
        if (s < 0.35) { boiteM(D, 0.05, 0.34, 0.03, 0x8a6a48, x, y, zf, { fin: "mat", sansOmbre: true }); boiteM(D, 0.2, 0.08, 0.05, 0x5a5f6e, x, y + 0.17, zf, { fin: "metal", sansOmbre: true }); }
        else if (s < 0.6) { boiteM(D, 0.36, 0.1, 0.02, 0xc9ccd6, x, y, zf, { fin: "metal", sansOmbre: true }); boiteM(D, 0.12, 0.14, 0.03, [0xd93a3f, 0xf59e0b, 0x35507a][i % 3], x - 0.2, y, zf, { fin: "mat", sansOmbre: true }); }
        else if (s < 0.8) { boiteM(D, 0.04, 0.36, 0.02, 0xc9ccd6, x, y, zf, { fin: "metal", sansOmbre: true }); boiteM(D, 0.06, 0.12, 0.04, [0xd93a3f, 0xf59e0b, 0x30a46c][i % 3], x, y - 0.2, zf, { fin: "mat", sansOmbre: true }); }
        else { cyl(D, 0.13, 0.03, 0xf59e0b, x, y, zf, { rough: 0.5, seg: 14, sansOmbre: true }).rotation.x = PI / 2; } } }
    for (let i = 0; i < 2; i++) { const x = x0 + 2.7 + i * 2.9, z = z0 + 1.1; emprise(x, z, 2.6, 0.9);                                                                                  // les deux établis
      boiteM(D, 2.5, 0.09, 0.8, 0, x, 0.9, z, { mat: matChene }); for (const sx of [-1.15, 1.15]) boiteM(D, 0.08, 0.86, 0.7, NOIR, x + sx, 0.43, z, { fin: "metal" }); boiteM(D, 2.2, 0.04, 0.6, 0, x, 0.25, z, { mat: matChene });
      boiteM(D, 0.5, 0.26, 0.26, [0xd93a3f, 0x35507a][i], x - 0.6, 1.08, z - 0.1, { rough: 0.35, metal: 0.3 }); boiteM(D, 0.24, 0.03, 0.05, NOIR, x - 0.6, 1.225, z - 0.1, { fin: "metal", sansOmbre: true });
      boiteM(D, 0.18, 0.16, 0.14, 0x5a5f6e, x + 0.9, 1.03, z + 0.22, { fin: "metal" }); boiteM(D, 0.5, 0.04, 0.1, 0xc9ccd6, x + 0.3, 0.965, z + 0.1, { fin: "metal", ry: 0.5, sansOmbre: true });
      carton(D, x + 0.4, 0.27, z, 0.5, 0.28, 0.4, 0.1); cyl(D, 0.13, 0.26, BLANC, x - 0.5, 0.4, z, { rough: 0.4, metal: 0.2, seg: 14 }); }
    etagere(D, x1 - 2.2, z0 + 0.5, 0, 5, "atelier");
    { const x = x0 + 6.3, z = z0 + 5.6; emprise(x, z, 2.8, 1.3);                                                          // la table sur tréteaux, le plan déroulé, le casque
      boiteM(D, 2.7, 0.05, 1.2, 0, x, 0.84, z, { mat: matChene }); for (const sx of [-0.95, 0.95]) { for (const s of [-1, 1]) { const j = boiteM(D, 0.06, 0.86, 0.06, 0xc9a877, x + sx, 0.41, z + s * 0.3, { fin: "mat" }); j.rotation.x = s * 0.33; } boiteM(D, 0.08, 0.06, 1.0, 0xc9a877, x + sx, 0.79, z, { fin: "mat", sansOmbre: true }); }
      const f = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.8), matPlan); f.rotation.x = -PI / 2; f.rotation.z = 0.12; f.position.set(x - 0.3, 0.872, z); D.add(f);
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 8, 0, PI * 2, 0, PI / 2), pbr(0xffd23f, { rough: 0.3 })); c.position.set(x + 0.85, 0.87, z + 0.2); c.castShadow = true; D.add(c); cyl(D, 0.175, 0.015, 0xffd23f, x + 0.85, 0.875, z + 0.22, { rough: 0.3, seg: 16, sansOmbre: true });
      boiteM(D, 0.6, 0.03, 0.08, 0xf59e0b, x + 0.6, 0.885, z - 0.4, { fin: "mat", ry: 0.2, sansOmbre: true }); }
    { const x = x0 + 1.15, z = z0 + 4.2; emprise(x, z, 1.3, 2.6); for (let i = 0; i < 7; i++) boiteM(D, 1.2, 0.045, 2.5, i % 3 === 2 ? 0xdfe6e2 : 0xe9e6df, x + (i % 2) * 0.02, 0.1 + i * 0.047, z + (i % 3) * 0.015, { fin: "mat", sansOmbre: i < 6 });                       // les plaques de plâtre
      for (const sz of [-0.9, 0, 0.9]) boiteM(D, 1.2, 0.07, 0.1, 0xc9a877, x, 0.035, z + sz, { fin: "mat", sansOmbre: true }); }
    { const x = x0 + 1.3, z = z0 + 7.6; emprise(x, z, 1.3, 1.1); boiteM(D, 1.2, 0.03, 1.0, 0xc9a877, x, 0.135, z, { fin: "mat" }); for (const sz of [-0.42, 0, 0.42]) boiteM(D, 1.2, 0.1, 0.1, 0xb8935f, x, 0.05, z + sz, { fin: "mat", sansOmbre: true });   // la palette de sacs
      for (let i = 0; i < 6; i++) boiteM(D, 0.52, 0.15, 0.4, i % 2 ? 0xd9d2c2 : 0xcfc7b4, x - 0.28 + (i % 2) * 0.56, 0.23 + ((i / 2) | 0) * 0.155, z - 0.22 + ((i + (i >> 1)) % 2) * 0.44, { fin: "mat", ry: (i % 3 - 1) * 0.05 }); }
    { const x = x1 - 1.0, z = z0 + 4.4; emprise(x, z, 1.0, 1.0); const tons = [0x4f46e5, 0xd9486e, 0x30a46c, BLANC]; [[0, 0], [0.34, 0.1], [0.12, 0.36], [-0.25, 0.28]].forEach(([dx, dz], i) => { cyl(D, 0.14, 0.28, BLANC, x + dx - 0.1, 0.14, z + dz - 0.2, { rough: 0.4, seg: 14 }); cyl(D, 0.143, 0.09, tons[i], x + dx - 0.1, 0.14, z + dz - 0.2, { rough: 0.5, seg: 14, sansOmbre: true }); });   // les pots de peinture
      cyl(D, 0.14, 0.28, BLANC, x + 0.02, 0.42, z - 0.1, { rough: 0.4, seg: 14 }); }
    { const x = x1 - 1.0, z = z0 + 7.4; emprise(x, z, 0.8, 1.4);                                                          // l'escabeau
      for (const sx of [-0.25, 0.25]) for (const s of [-1, 1]) { const m = boiteM(D, 0.04, 1.7, 0.05, 0xc9ccd6, x + sx, 0.8, z + s * 0.32, { fin: "metal" }); m.rotation.x = -s * 0.36; }
      for (let i = 0; i < 4; i++) boiteM(D, 0.5, 0.03, 0.12, 0xc9ccd6, x, 0.3 + i * 0.36, z + 0.5 - i * 0.135, { fin: "metal", sansOmbre: true }); boiteM(D, 0.56, 0.04, 0.3, 0xf59e0b, x, 1.6, z, { fin: "mat" }); }
    for (const [x, z] of [[x0 + 5.2, z0 + 8.6], [x0 + 9.4, z0 + 3.1]]) { emprise(x, z, 0.4, 0.4); boiteM(D, 0.36, 0.03, 0.36, 0xf08a24, x, 0.015, z, { fin: "mat", sansOmbre: true }); cone(D, 0.13, 0.52, 0xf08a24, x, 0.29, z, { rough: 0.6 }); cyl(D, 0.085, 0.07, 0xffffff, x, 0.33, z, { rHaut: 0.062, rough: 0.5, seg: 12, sansOmbre: true }); }   // les cônes de chantier
    { const x = x1 - 2.4, z = z0 + 8.9; emprise(x, z, 1.5, 1.4); boiteM(D, 1.3, 0.5, 1.2, 0, x, 0.25, z, { mat: matPlateau }); boiteM(D, 1.0, 0.42, 0.9, 0, x - 0.05, 0.71, z, { mat: matPlateau, ry: 0.25 }); }                                     // les caisses en bois
    for (let i = 0; i < 9; i++) personne("artisan", p);
  }

  p = parId.devis;                                                         // ── Salle des devis : la table de réunion, l'écran, le buffet
  { const z0 = p.z0, cx = p.cx, cz = p.cz;
    tapis(D, cx, cz, 6.6, 4.4, TAPIS.gris);
    emprise(cx, cz, 4.5, 1.6); boiteM(D, 4.4, 0.06, 1.5, 0, cx, 0.75, cz, { mat: matNoyer }); for (const sx of [-1.5, 1.5]) { boiteM(D, 0.1, 0.7, 1.0, NOIR, cx + sx, 0.36, cz, { fin: "metal" }); boiteM(D, 0.5, 0.03, 1.1, NOIR, cx + sx, 0.015, cz, { fin: "metal", sansOmbre: true }); }
    for (const dx of [-1.5, 0, 1.5]) { chaise(D, cx + dx, cz - 1.2, PI); chaise(D, cx + dx, cz + 1.2, 0); } chaise(D, cx - 2.7, cz, -PI / 2); chaise(D, cx + 2.7, cz, PI / 2);
    asseoir("client", p, cx - 1.5, cz + 1.2); asseoir("artisan", p, cx, cz - 1.2);
    portable(D, cx - 1.5, 0.78, cz + 0.42, 0); portable(D, cx, 0.78, cz - 0.42, PI);
    boiteM(D, 0.3, 0.012, 0.42, 0xffffff, cx - 0.75, 0.787, cz + 0.3, { sansOmbre: true, ry: 0.15 }); boiteM(D, 0.3, 0.012, 0.42, 0xffffff, cx + 0.8, 0.787, cz - 0.2, { sansOmbre: true, ry: -0.4 }); boiteM(D, 0.3, 0.012, 0.42, 0xffffff, cx + 0.9, 0.799, cz - 0.15, { sansOmbre: true, ry: 0.1 });
    cyl(D, 0.04, 0.9, 0xffffff, cx + 1.6, 0.82, cz + 0.25, { seg: 8, sansOmbre: true }).rotation.z = PI / 2; cyl(D, 0.04, 0.09, BLANC, cx - 0.5, 0.825, cz - 0.3, { fin: "ceramique", seg: 10, sansOmbre: true });
    cimaise(D, cx, z0 + 0.3, 3.8, 2.4, 0, NUIT); ecranMural(D, 3.0, 1.7, cx, 1.35, z0 + 0.39, 0);
    coinCafe(D, p.x0 + 0.5, cz + 2.6, 1.9, PI / 2);
    plante(D, p.x1 - 0.85, z0 + 0.85, 0.85); plante(D, p.x1 - 0.8, p.z1 - 0.95, 1.1, true);
    personne("client", p); personne("artisan", p); personne("particulier", p);
  }

  p = parId.bureau;                                                        // ── Ton bureau : le grand bureau en noyer face à la pièce, la bibliothèque, le salon
  { const z0 = p.z0, cx = p.cx;
    etagere(D, cx, z0 + 0.45, 0, 2, "livres");
    tapis(D, cx, z0 + 4.9, 4.4, 3.6, TAPIS.sable);
    const b = bureauM(D, cx, z0 + 4.6, PI, { large: 2.1, prof: 0.95, mat: matNoyer, double: true, couleur: 0x1e1b4b }); portable(b, 0.62, 0.765, 0.08, 0.35);
    asseoir("dani", p, cx, z0 + 3.8);
    cimaise(D, p.x0 + 0.3, z0 + 2.9, 2.6, 2.2, PI / 2, BLANC);                                                           // sa liste du jour, triée par ce qui rapporte
    affiche(D, 2.3, 1.6, p.x0 + 0.37, 1.3, z0 + 2.9, PI / 2, (c, W, H) => { c.fillStyle = "#ffffff"; c.fillRect(0, 0, W, H); titre(c, "TA LISTE", 28, 44, 36, "#1e1b4b", "700");
      (SOURCE ? lignesMur(p, 4, 24).map((l) => [l[0], l[2]]) : [["Rappeler 3 demandes", "#e5484d"], ["Examiner 4 candidatures", "#f59e0b"], ["Publier 1 avis", "#f59e0b"], ["Relancer 1 décennale", "#30a46c"]]).forEach((l, i) => { const y = 112 + i * 62; c.fillStyle = l[1]; c.beginPath(); c.arc(46, y, 19, 0, 7); c.fill(); c.textAlign = "center"; titre(c, String(i + 1), 46, y + 2, 24, "#ffffff", "700"); c.textAlign = "left"; titre(c, l[0], 82, y + 1, 30, "#23263c", "500"); }); });
    chaise(D, cx - 0.7, z0 + 6.0, 0, 0x6d6ab8); chaise(D, cx + 0.7, z0 + 6.0, 0, 0x6d6ab8);
    canape(D, p.x0 + 0.6, p.z1 - 1.5, PI / 2); tableBasse(D, p.x0 + 2.1, p.z1 - 1.5, 0.75); lampadaire(D, p.x0 + 0.5, z0 + 6.6);
    plante(D, p.x1 - 0.85, p.z1 - 0.9, 0.85); plante(D, p.x1 - 0.8, z0 + 0.85, 1.15, true);
  }

  p = parId.marketing;                                                     // ── Marketing : une cabine par agent IA (les trois sont « à créer »), le coin tournage
  { const z0 = p.z0, tons = [0x4f46e5, 0x30a46c, 0xd9486e], feutre = [0x34307a, 0x245c44, 0x7a2c44], noms = ["PROSPECTION", "SEO", "RÉSEAUX"];
    for (let i = 0; i < 3; i++) { const x = p.x0 + 2.6 + i * 4.4, hex = "#" + tons[i].toString(16).padStart(6, "0");
      cimaise(D, x, z0 + 0.4, 3.6, 2.75, 0, 0x15172b); boiteM(D, 3.6, 0.07, 0.14, tons[i], x, 2.78, z0 + 0.4, { lum: 1.2, sansOmbre: true });
      for (const s of [-1, 1]) { emprise(x + s * 1.76, z0 + 1.5, 0.12, 2.1); boiteM(D, 0.08, 1.15, 2.1, feutre[i], x + s * 1.76, 0.575, z0 + 1.5, { fin: "tissu" }); boiteM(D, 0.09, 0.04, 2.1, tons[i], x + s * 1.76, 1.17, z0 + 1.5, { lum: 0.8, sansOmbre: true }); }
      panneauTexte(D, noms[i], 2.6, 0.42, x, 2.42, z0 + 0.47, 0, "#15172b", hex, 1.1); ecranMural(D, 1.7, 0.95, x, 1.6, z0 + 0.48, 0);
      emprise(x, z0 + 1.15, 1.9, 0.8); boiteM(D, 1.8, 0.05, 0.75, 0, x, 0.76, z0 + 1.15, { mat: matPlateau }); for (const sx of [-0.82, 0.82]) boiteM(D, 0.05, 0.74, 0.65, NOIR, x + sx, 0.37, z0 + 1.15, { fin: "metal" });
      boiteM(D, 0.42, 0.015, 0.15, 0xe9e7e2, x, 0.79, z0 + 1.25, { fin: "laque", sansOmbre: true }); portable(D, x + 0.55, 0.785, z0 + 1.15, -0.3);
      boiteM(D, 3.4, 0.02, 3.4, tons[i], x, 0.012, z0 + 2.5, { opacite: 0.22, sansOmbre: true }); boiteM(D, 3.4, 0.03, 0.06, tons[i], x, 0.02, z0 + 4.25, { lum: 1.4, sansOmbre: true });
      const e = panneauTexte(D, "À CRÉER", 1.5, 0.3, x, 0.03, z0 + 3.85, 0, "#232640", "#c9cbe0", 0.5); e.rotation.x = -PI / 2;
      emprise(x, z0 + 2.6, 0.8, 0.7); robot(scene, x, z0 + 2.6, tons[i]); }
    { const x = p.x1 - 2.2, z = p.z1 - 2.3;                                                                              // le coin tournage : le fond, l'anneau de lumière, le trépied
      emprise(x - 1.1, z - 1.3, 2.3, 0.2); boiteM(D, 2.2, 2.0, 0.04, 0xf2b8c6, x - 1.1, 1.05, z - 1.3, { fin: "mat" }); for (const sx of [-1.12, 1.12]) cyl(D, 0.025, 2.2, NOIR, x - 1.1 + sx, 1.1, z - 1.3, { fin: "metal", seg: 6 });
      emprise(x - 1.1, z + 0.9, 0.6, 0.6); for (let i = 0; i < 3; i++) { const j = cyl(D, 0.015, 1.3, NOIR, x - 1.1 + Math.sin(i * 2.1) * 0.2, 0.6, z + 0.9 + Math.cos(i * 2.1) * 0.2, { fin: "metal", seg: 5, sansOmbre: true }); j.rotation.z = -Math.sin(i * 2.1) * 0.32; j.rotation.x = Math.cos(i * 2.1) * 0.32; }
      const a = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.03, 8, 28), pbr(0xfff1d6, { lum: 1.3 })); a.position.set(x - 1.1, 1.5, z + 0.9); D.add(a); boiteM(D, 0.09, 0.17, 0.015, NOIR, x - 1.1, 1.5, z + 0.9, { fin: "metal", sansOmbre: true });
      emprise(x - 1.1, z - 0.4, 0.45, 0.45); cyl(D, 0.2, 0.45, 0xd9486e, x - 1.1, 0.225, z - 0.4, { fin: "tissu", seg: 18 }); }
    tapis(D, p.x0 + 5.2, p.z1 - 2.2, 4.6, 2.8, TAPIS.nuit); tableRonde(D, p.x0 + 5.2, p.z1 - 2.2, 0.6);
    for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.5, x = p.x0 + 5.2 + Math.sin(a) * 1.15, z = p.z1 - 2.2 + Math.cos(a) * 1.15; emprise(x, z, 0.5, 0.5); cyl(D, 0.23, 0.42, tons[i], x, 0.21, z, { fin: "tissu", seg: 18 }); }
    plante(D, p.x0 + 0.9, p.z1 - 0.95, 0.85); plante(D, p.x1 - 0.8, p.z1 - 0.9, 1.1, true); plante(D, p.x0 + 9.6, p.z1 - 0.9, 1.0, true);
  }

  p = parId.archives;                                                      // ── Archives : les rayonnages pleins de boîtes, le chariot
  { const z0 = p.z0, noms = ["RÉNOVATION", "NEUF", "DEVIS"];
    for (let i = 0; i < 3; i++) { const x = p.x0 + 1.5 + i * 2.4; etagere(D, x, z0 + 2.3, PI / 2, i); etagere(D, x, z0 + 6.3, PI / 2, i + 3);
      panneauTexte(D, noms[i], 0.46, 0.13, x, 1.95, z0 + 7.42, 0, "#1e1b4b", "#ffffff", 0.4); }
    { const x = p.x0 + 4.4, z = p.z1 - 1.1; emprise(x, z, 1.0, 0.6);                                                      // le chariot
      boiteM(D, 0.9, 0.04, 0.5, 0xc9ccd6, x, 0.2, z, { fin: "metal" }); boiteM(D, 0.9, 0.04, 0.5, 0xc9ccd6, x, 0.75, z, { fin: "metal" }); for (const sx of [-0.43, 0.43]) for (const sz of [-0.23, 0.23]) cyl(D, 0.018, 0.95, 0xc9ccd6, x + sx, 0.5, z + sz, { fin: "metal", seg: 6, sansOmbre: true });
      carton(D, x - 0.2, 0.77, z, 0.36, 0.28, 0.4, 0.1); carton(D, x + 0.22, 0.77, z, 0.36, 0.28, 0.4, -0.08, BLANC); carton(D, x, 0.22, z, 0.5, 0.3, 0.4, 0); }
    { const x = p.x1 - 0.9, z = p.z1 - 1.0; emprise(x, z, 1.0, 0.9); carton(D, x, 0, z, 0.55, 0.36, 0.42, 0.2); carton(D, x + 0.1, 0.37, z - 0.02, 0.5, 0.32, 0.4, -0.15); carton(D, x - 0.5, 0, z + 0.25, 0.45, 0.3, 0.4, 0.5, BLANC); }
  }

  // ── La terrasse : le deck, la piscine, les transats, le parasol (à droite de l'accueil)
  { const deck = texParquet(170, 124, 84, 77); deck.repeat.set(2, 2);
    boiteM(D, 7.6, 0.12, 7.6, 0, 18.2, 0.0, 12.2, { mat: new THREE.MeshStandardMaterial({ map: deck, roughness: 0.7 }), sansOmbre: true, recoit: true });
    const px = 18.6, pz = 10.4;                                                                                        // la piscine : une margelle blanche, l'eau un peu plus bas
    for (const s of [-1, 1]) { boiteM(D, 5.2, 0.3, 0.3, 0xf3f1ec, px, 0.21, pz + s * 1.45, { fin: "laque" }); boiteM(D, 0.3, 0.3, 2.6, 0xf3f1ec, px + s * 2.45, 0.21, pz, { fin: "laque" }); }
    boiteM(D, 4.6, 0.2, 2.6, 0x25c9dc, px, 0.2, pz, { rough: 0.05, metal: 0.25, lum: 0.3, sansOmbre: true, recoit: true });
    for (const x of [16.4, 18.0]) { const t = new THREE.Group(); t.position.set(x, 0, 14.1); D.add(t);                                                                              // les transats
      boiteM(t, 0.7, 0.07, 1.35, 0xffffff, 0, 0.33, -0.25, { fin: "tissu" }); const d = boiteM(t, 0.7, 0.07, 0.75, 0xffffff, 0, 0.52, 0.72, { fin: "tissu" }); d.rotation.x = -0.6;
      for (const sz of [-0.8, 0.3]) boiteM(t, 0.62, 0.28, 0.05, 0x8a6a48, 0, 0.15, sz, { fin: "mat" }); boiteM(t, 0.6, 0.02, 0.5, x < 17 ? 0x4f46e5 : 0xf59e0b, 0, 0.375, -0.5, { fin: "tissu", sansOmbre: true }); siege(x, 14.0, H_ASSISE.transat, PI, "transat"); }
    cyl(D, 0.22, 0.03, 0xffffff, 17.2, 0.4, 13.7, { fin: "laque", seg: 18 }); cyl(D, 0.02, 0.36, NOIR, 17.2, 0.2, 13.7, { fin: "metal", seg: 6 }); cyl(D, 0.035, 0.12, 0xf59e0b, 17.25, 0.47, 13.72, { rough: 0.2, opacite: 0.8, seg: 8 });
    cyl(D, 0.03, 2.4, 0xc9ccd6, 20.2, 1.2, 14.2, { fin: "metal", seg: 8 }); cone(D, 1.5, 0.5, 0xfdfbf5, 20.2, 2.45, 14.2, { fin: "tissu", seg: 8 }); cyl(D, 0.3, 0.08, 0xe9e6df, 20.2, 0.1, 14.2, { rough: 0.8, seg: 14 });                        // le parasol
    tableRonde(D, 20.2, 14.2, 0.42); for (const a of [0.6, 2.7, 4.6]) { cyl(D, 0.2, 0.42, 0xe9e4da, 20.2 + Math.sin(a) * 0.85, 0.21, 14.2 + Math.cos(a) * 0.85, { fin: "tissu", seg: 16 }); }
    palmierPot(D, 15.2, 9.1, 3.8); palmierPot(D, 21.3, 15.4, 3.4);
  }
  // ── Le palier des ascenseurs (à gauche de l'accueil) : les portes donnent vers l'accueil
  { boiteM(D, 7, 3.2, 4.6, 0xe9e6df, -16.5, 1.6, 13.6, { mat: new THREE.MeshStandardMaterial({ map: (() => { const t = texBeton("#e6e2d9", 23); t.repeat.set(2, 1); return t; })(), roughness: 0.75 }) });
    boiteM(D, 0.1, 2.75, 4.2, 0, -12.96, 1.38, 13.6, { mat: matNoyer });
    for (const z of [12.55, 14.65]) { boiteM(D, 0.06, 2.3, 1.5, 0xc9ccd6, -12.9, 1.15, z, { rough: 0.25, metal: 0.9, sansOmbre: true }); boiteM(D, 0.07, 2.3, 0.03, NOIR, -12.9, 1.15, z, { fin: "metal", sansOmbre: true }); boiteM(D, 0.08, 0.08, 1.66, NOIR, -12.9, 2.34, z, { fin: "metal", sansOmbre: true }); }
    boiteM(D, 0.04, 0.3, 0.14, NOIR, -12.9, 1.15, 13.6, { fin: "metal", sansOmbre: true }); boiteM(D, 0.045, 0.05, 0.05, 0xffd08a, -12.9, 1.2, 13.6, { lum: 1.5, sansOmbre: true });
    panneauTexte(D, "25", 0.7, 0.44, -12.9, 2.58, 13.6, PI / 2, "#15172b", "#ffd08a", 1.2);
    tapis(D, -11.5, 13.6, 2.7, 3.6, TAPIS.nuit); plante(D, -12.3, 11.0, 1.2, true); plante(D, -12.3, 16.3, 1.2, true);
  }
  // ── Le couloir entre les deux rangées de pièces : un long tapis, des jardinières, deux bancs
  { tapis(D, 0, -3.5, 43.4, 1.5, TAPIS.nuit);
    for (const [x, g] of [[-18, 1], [-5, 2], [9.5, 3], [19, 4]]) jardiniere(D, x, -4.62, 2.2, 0, g * 17);
    banc(D, -11, -2.4, 1.8, PI, 0x6d6ab8); banc(D, 12.5, -2.4, 1.8, PI, 0x6d6ab8);
    palmierPot(D, -21.6, 9.0, 3.0);
  }
  // ── Le couloir de l'accueil (entre la rangée du milieu et l'accueil) : un tapis, des jardinières
  { tapis(D, -3.9, 9.0, 36.0, 1.3, TAPIS.nuit);
    for (const [x, g] of [[-17, 5], [10.5, 6]]) jardiniere(D, x, 9.72, 2.0, 0, g * 17);
  }
  // ── Le balcon du bureau de Dani, en porte-à-faux : deux transats, une table, des palmiers
  { for (const z of [1.6, 3.4]) { const t = new THREE.Group(); t.position.set(26.6, 0, z); t.rotation.y = PI / 2; D.add(t); emprise(26.6, z, 2.1, 0.8);
      boiteM(t, 0.7, 0.07, 1.35, 0xffffff, 0, 0.33, -0.25, { fin: "tissu" }); const d = boiteM(t, 0.7, 0.07, 0.75, 0xffffff, 0, 0.52, 0.72, { fin: "tissu" }); d.rotation.x = -0.6;
      for (const sz of [-0.8, 0.3]) boiteM(t, 0.62, 0.28, 0.05, 0x8a6a48, 0, 0.15, sz, { fin: "mat" }); boiteM(t, 0.6, 0.02, 0.5, z < 2 ? 0x4f46e5 : 0xa78bfa, 0, 0.375, -0.5, { fin: "tissu", sansOmbre: true }); }
    tableRonde(D, 25.0, 6.0, 0.4); palmierPot(D, 27.7, -0.9, 3.2); palmierPot(D, 27.7, 6.9, 3.4); tapis(D, 26.0, 3.0, 3.6, 5.4, TAPIS.sable);
  }
  // ── Un agent IA responsable par pièce : en costume sombre, cravate violette, l'insigne AVYORA au-dessus de la tête
  for (const q of PIECES) { const t = TYPE_PIECE[q.id], r = q.foule == null || !t ? 0 : restePiece.has(q) ? restePiece.get(q) : Math.min(GENS_MAX, q.foule); for (let i = 0; i < r; i++) creerPersonne(t, q); }   // sur le site : ceux que le décor n'avait pas prévus
  for (const q of PIECES) if (q.agent) personne("responsable", q);                       // un agent IA par pièce, sauf ton bureau : là, le responsable c'est toi
  // ── Les couloirs : des gens qui vont d'une pièce à l'autre
  for (const q of COULOIRS) { q.cx = (q.x0 + q.x1) / 2; q.cz = (q.z0 + q.z1) / 2; }
  for (const t of ["pro", "particulier", "visiteur", "client", "pro"]) personne(t, COULOIRS[0]);
  for (const t of ["visiteur", "pro", "particulier", "visiteur"]) personne(t, COULOIRS[1]);
})();
const nCouleurs = vraiesCouleurs(decor);                                     // les couleurs à plat, converties une fois (voir « Le mobilier »)
const nMaillagesDecor = fusionner(decor);                                    // le décor fixe : un seul maillage par matière

/* Outils d'essai (aucun effet pour l'utilisateur) : window.__essaiMobilier.viser(x, z, taille, az, el) approche la caméra d'un point ;
   .rapport() contrôle les allées : part de sol praticable par pièce, cases enfermées, personnes assises et leur siège. */
window.__essaiMobilier = {
  viser(x, z, taille, az, el) { vue.cible.set(x, 0, z); vue.taille = taille || 8; if (az != null) vue.az = az; if (el != null) vue.el = el; return true; },
  /* La carte d'une pièce, case par case : « . » on peut y marcher, « # » un meuble, « + » trop près d'un meuble ou d'un mur, « o » un recoin enfermé */
  carte(id) {
    const q = parId[id], g = q.grille, L = [];
    for (let j = 0; j < g.nz; j++) { let s = ""; for (let i = 0; i < g.nx; i++) { const x = q.x0 + (i + 0.5) * PAS, z = q.z0 + (j + 0.5) * PAS; let dedans = false; for (const o of q.meubles) if (x > o.x0 && x < o.x1 && z > o.z0 && z < o.z1) { dedans = !o.perso || "p"; break; }
      s += g.libre[j * g.nx + i] ? "." : dedans === "p" ? "p" : dedans ? "#" : horsMeuble(q, x, z, CORPS + AISE) ? "o" : "+"; } L.push(s); }
    return L;
  },
  rapport() {
    const r = { maillagesDecor: nMaillagesDecor, obstacles: obstacles.length, sieges: sieges.length, modeles: {}, pieces: {}, assis: [] };
    for (const k in MM) r.modeles[k] = MM[k] ? [MM[k].userData.taille.x, MM[k].userData.taille.y, MM[k].userData.taille.z].map((v) => +v.toFixed(2)).join(" × ") : "absent";
    for (const q of PIECES) {
      const nx = Math.floor((q.x1 - q.x0) / 0.35), nz = Math.floor((q.z1 - q.z0) / 0.35); let libres = 0;
      for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const x = q.x0 + (i + 0.5) * 0.35, z = q.z0 + (j + 0.5) * 0.35; let ok = x > q.x0 + 0.5 && x < q.x1 - 0.5 && z > q.z0 + 0.5 && z < q.z1 - 0.5; if (ok) for (const o of obstacles) if (x > o.x0 - 0.33 && x < o.x1 + 0.33 && z > o.z0 - 0.33 && z < o.z1 + 0.33) { ok = false; break; } if (ok) libres++; }
      const g = q.grille; let enfermees = 0; if (g) for (const l of this.carte(q.id)) for (const c of l) if (c === "o") enfermees++;
      r.pieces[q.id] = { praticable: Math.round(100 * (g ? g.cases.length : libres) * 0.35 * 0.35 / ((q.x1 - q.x0 - 1) * (q.z1 - q.z0 - 1))) + " %", cases: g ? g.cases.length : libres, enfermees };
    }
    for (const p of persos) if (p.fixe) { const s = siegePres(p.x, p.z), d = s ? Math.hypot(s.x - p.x, s.z - p.z) : 99; r.assis.push(p.piece.id + " " + p.type + (p.assis ? " assis" : p.debout ? " debout près du siège" : " debout") + " (" + p.x.toFixed(2) + ", " + p.z.toFixed(2) + ") siège à " + d.toFixed(2) + " m" + (s && d < 0.3 ? ", " + s.sorte + ", assise prévue " + s.y + " m, trouvée " + (p.siege == null ? "aucune" : p.siege.toFixed(2) + " m") + ", regard " + s.ry.toFixed(2) : "")); }
    r.siegesParSorte = {}; for (const s of sieges) r.siegesParSorte[s.sorte] = (r.siegesParSorte[s.sorte] || 0) + 1;
    return r;
  },
};

/* ── Les déplacements ──
   Une grille par pièce : les meubles y sont des cases interdites. Chaque personnage suit un chemin calculé (A*) puis lissé.
   Trois garanties, vérifiées à chaque pas (et pas seulement au calcul du chemin) :
     1. personne n'entre dans l'emprise d'un meuble, ni ne sort de sa pièce ;
     2. deux personnes ne se chevauchent jamais (un pas qui rapproche de quelqu'un en dessous de la distance minimale est refusé) ;
     3. personne ne reste coincé : qui est bloqué ou piétine cherche un détour, puis change de but, puis s'écarte du groupe.
   On ne marche que là où deux personnes peuvent se croiser, et on contourne d'avance ceux qui sont à l'arrêt.
   La preuve automatique est à la fin du fichier (ajouter ?test=1 à l'adresse). */
const PAS = 0.35;                                                            // la taille d'une case
const CORPS = 0.3;                                                           // le rayon d'un corps : aucun centre ne s'approche plus près d'un meuble
const AISE = 0.12;                                                           // la marge de confort en plus, pour les chemins calculés
const MUR = 0.5;                                                             // la distance gardée avec les cloisons
const ECART = 0.68;                                                          // deux personnes ne s'approchent jamais plus près (de centre à centre)
const TEMOIN = 2;                                                            // toutes les 2 s, on vérifie que chaque marcheur a vraiment avancé (sinon : détour, autre but, puis dégagement)
const CONFORT = 1.15;                                                        // à cette distance, on commence à s'écarter et à ralentir
const stats = { recalculs: 0, causeries: 0, haltes: 0, arrivees: 0, recalages: 0, degagements: 0, pietinements: 0 };
const TEST = { presse: false };                                              // pour la preuve automatique : en « foule pressée », personne ne s'arrête
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

/* Le point (x, z) est-il dans la pièce, à plus de m de tout meuble ? */
function horsMeuble(q, x, z, m) {
  const b = MUR - (CORPS + AISE - m);
  if (x < q.x0 + b || x > q.x1 - b || z < q.z0 + b || z > q.z1 - b) return false;
  for (const o of q.meubles) if (x > o.x0 - m && x < o.x1 + m && z > o.z0 - m && z < o.z1 + m) return false;
  return true;
}
/* La ligne droite de a à b reste-t-elle à plus de m de tout meuble ? (calcul exact, pas un échantillonnage) */
function segmentLibre(q, a, b, m) {
  if (!horsMeuble(q, a.x, a.z, m) || !horsMeuble(q, b.x, b.z, m)) return false;
  const dx = b.x - a.x, dz = b.z - a.z;
  for (const o of q.meubles) {
    let t0 = 0, t1 = 1, dehors = false;
    if (Math.abs(dx) < 1e-9) dehors = a.x <= o.x0 - m || a.x >= o.x1 + m;
    else { let u = (o.x0 - m - a.x) / dx, w = (o.x1 + m - a.x) / dx; if (u > w) { const s = u; u = w; w = s; } t0 = Math.max(t0, u); t1 = Math.min(t1, w); dehors = t0 >= t1; }
    if (dehors) continue;
    if (Math.abs(dz) < 1e-9) dehors = a.z <= o.z0 - m || a.z >= o.z1 + m;
    else { let u = (o.z0 - m - a.z) / dz, w = (o.z1 + m - a.z) / dz; if (u > w) { const s = u; u = w; w = s; } t0 = Math.max(t0, u); t1 = Math.min(t1, w); dehors = t0 >= t1; }
    if (!dehors) return false;
  }
  return true;
}
/* La ligne de a à b passe-t-elle à moins de r d'une des personnes de la liste ? */
function croiseGens(a, b, liste, r) {
  const dx = b.x - a.x, dz = b.z - a.z, L2 = dx * dx + dz * dz;
  for (const o of liste) { const t = L2 > 1e-9 ? Math.max(0, Math.min(1, ((o.x - a.x) * dx + (o.z - a.z) * dz) / L2)) : 0; if (Math.hypot(a.x + dx * t - o.x, a.z + dz * t - o.z) < r) return true; }
  return false;
}

function grille(q) {
  const nx = Math.floor((q.x1 - q.x0) / PAS), nz = Math.floor((q.z1 - q.z0) / PAS), libre = new Uint8Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) libre[j * nx + i] = horsMeuble(q, q.x0 + (i + 0.5) * PAS, q.z0 + (j + 0.5) * PAS, CORPS + AISE) ? 1 : 0;
  // pas de passage à une seule file : une case ne compte que si elle fait partie d'un carré de 2 × 2 cases libres.
  // Partout où l'on marche, deux personnes peuvent donc se croiser (c'est ce qui évite les bouchons entre un meuble et un mur).
  const brut = libre.slice(), carre = (i, j) => i >= 0 && j >= 0 && i + 1 < nx && j + 1 < nz && brut[j * nx + i] && brut[j * nx + i + 1] && brut[(j + 1) * nx + i] && brut[(j + 1) * nx + i + 1];
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) if (brut[j * nx + i] && !(carre(i, j) || carre(i - 1, j) || carre(i, j - 1) || carre(i - 1, j - 1))) libre[j * nx + i] = 0;
  // on ne garde que la plus grande zone d'un seul tenant : pas de personnage enfermé dans un recoin
  const zone = new Int32Array(nx * nz).fill(-1); let meilleure = -1, taille = 0, n = 0;
  for (let d = 0; d < nx * nz; d++) { if (!libre[d] || zone[d] >= 0) continue; const pile = [d]; zone[d] = n; let t = 0;
    while (pile.length) { const c = pile.pop(); t++; const ci = c % nx, cj = (c / nx) | 0; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= nx || j >= nz) continue; const v = j * nx + i; if (libre[v] && zone[v] < 0) { zone[v] = n; pile.push(v); } } }
    if (t > taille) { taille = t; meilleure = n; } n++; }
  const cases = []; for (let d = 0; d < nx * nz; d++) { if (zone[d] !== meilleure) libre[d] = 0; else cases.push(d); }
  const g = { nx, nz, libre, cases, q, haltes: [] };
  // les haltes : les cases au bord d'un meuble (on s'y arrête, tourné vers lui) ou devant la façade vitrée (on regarde Miami)
  for (const c of cases) { const m = centre(g, c); let pres = null, dm = CORPS + AISE + PAS * 0.8;
    for (const o of q.meubles) { if (o.perso) continue; const px = Math.max(o.x0, Math.min(o.x1, m.x)), pz = Math.max(o.z0, Math.min(o.z1, m.z)), d = Math.hypot(px - m.x, pz - m.z); if (d < dm) { dm = d; pres = { c, x: px, z: pz }; } }
    if (pres) g.haltes.push(pres);
    else if (q.z0 <= -14.9 && m.z < q.z0 + MUR + PAS) g.haltes.push({ c, x: m.x, z: m.z - 10, vue: true });
    else if (q.x0 <= -21.9 && m.x < q.x0 + MUR + PAS) g.haltes.push({ c, x: m.x - 10, z: m.z, vue: true });
    else if (q.x1 >= 21.9 && m.x > q.x1 - MUR - PAS) g.haltes.push({ c, x: m.x + 10, z: m.z, vue: true });
    else if (q.z1 >= 15.9 && m.z > q.z1 - MUR - PAS) g.haltes.push({ c, x: m.x, z: m.z + 10, vue: true }); }
  return g;
}
function centre(g, c) { return { x: g.q.x0 + ((c % g.nx) + 0.5) * PAS, z: g.q.z0 + (((c / g.nx) | 0) + 0.5) * PAS }; }
/* La case libre la plus proche d'un point, qu'on peut rejoindre en ligne droite sans toucher un meuble (-1 s'il n'y en a pas) */
function caseProche(g, x, z, accepte) {
  let mieux = -1, dm = Infinity; const ici = { x, z };
  for (const c of g.cases) { const m = centre(g, c), d = Math.hypot(m.x - x, m.z - z); if (d >= dm) continue; if (accepte && !accepte(m, d)) continue; if (d > 0.01 && !segmentLibre(g.q, ici, m, CORPS - 0.03)) continue; dm = d; mieux = c; }
  return mieux;
}
/* Le plus court chemin de la case a à la case b (A*). barre : les cases prises par d'autres personnes, s'il faut les contourner. */
function chemin(g, a, b, barre) {
  const N = g.nx * g.nz, vient = new Int32Array(N).fill(-1), cout = new Float32Array(N).fill(Infinity), f = new Float32Array(N).fill(Infinity), ferme = new Uint8Array(N);
  const bi = b % g.nx, bj = (b / g.nx) | 0, h = (c) => Math.hypot((c % g.nx) - bi, ((c / g.nx) | 0) - bj);
  const ok = (v) => g.libre[v] && !(barre && barre[v]);
  const ouvert = [a]; cout[a] = 0; f[a] = h(a); let trouve = a === b;
  while (ouvert.length && !trouve) {
    let k = 0; for (let i = 1; i < ouvert.length; i++) if (f[ouvert[i]] < f[ouvert[k]]) k = i;
    const c = ouvert.splice(k, 1)[0]; if (c === b) { trouve = true; break; } if (ferme[c]) continue; ferme[c] = 1; const ci = c % g.nx, cj = (c / g.nx) | 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue; const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= g.nx || j >= g.nz) continue;
      const v = j * g.nx + i; if (!ok(v) || ferme[v]) continue; if (di && dj && (!ok(cj * g.nx + i) || !ok(j * g.nx + ci))) continue;   // pas de coin coupé
      const nc = cout[c] + (di && dj ? 1.4142 : 1); if (nc < cout[v]) { if (cout[v] === Infinity) ouvert.push(v); cout[v] = nc; vient[v] = c; f[v] = nc + h(v); }
    }
  }
  if (!trouve) return null;
  const pts = []; for (let c = b; c !== -1; c = vient[c]) { pts.push(centre(g, c)); if (c === a) break; } pts.reverse();
  return pts;
}

/* Les pièces : leurs meubles, leurs occupants, leur grille */
function preparer(q) {
  q.meubles = obstacles.filter((o) => o.x1 > q.x0 && o.x0 < q.x1 && o.z1 > q.z0 && o.z0 < q.z1);
  q.gens = persos.filter((p) => p.piece === q); q.grille = grille(q);
}
const ZONES = PIECES.concat(typeof COULOIRS !== "undefined" ? COULOIRS : []);   // les pièces et les couloirs : partout où l'on marche
for (const q of ZONES) preparer(q);
const dansUnMeuble = (q, p) => { for (const o of q.meubles) if (o.perso !== p && !(o.perso && p.fixe) && p.x > o.x0 && p.x < o.x1 && p.z > o.z0 && p.z < o.z1) return true; return p.x < q.x0 || p.x > q.x1 || p.z < q.z0 || p.z > q.z1; };

/* La mise en place (toujours la même : hasard reproductible) */
(function placer() {
  const hasard = alea(2611), refaire = new Set();
  const poser = (p, c) => { p.x = c.x; p.z = c.z; p.g.position.x = c.x; p.g.position.z = c.z; };
  const loin = (p, m) => { let d = Infinity; for (const o of p.piece.gens) if (o !== p && o.place) d = Math.min(d, dist(o, m)); return d; };
  // la case libre la plus proche d'un point qui peut être DANS un meuble (un siège) : ici on ne demande pas de ligne droite dégagée
  const voisine = (g, pt, accepte) => { let c = -1, dm = Infinity; for (const k of g.cases) { const m = centre(g, k), d = dist(m, pt); if (d < dm && accepte(m, d)) { dm = d; c = k; } } return c; };
  for (const p of persos) if (p.fixe && !p.debout) p.place = true;
  for (const p of persos) {                                                  // qui ne peut pas s'asseoir (l'ouvrier) se tient debout à côté de son siège, hors de tout meuble
    if (!p.debout) continue; const g = p.piece.grille, siege = { x: p.x, z: p.z }, fx = Math.sin(p.ry), fz = Math.cos(p.ry);
    let c = voisine(g, siege, (m, d) => d > 0.6 && loin(p, m) > 0.9);         // la case libre la plus proche du siège
    if (c < 0) c = voisine(g, siege, (m) => loin(p, m) > ECART);             // pièce très pleine : on accepte plus près
    if (c >= 0) { poser(p, centre(g, c)); const vx = siege.x + fx * 1.6 - p.x, vz = siege.z + fz * 1.6 - p.z; p.g.rotation.y = p.ry = Math.atan2(vx, vz); }   // il regarde ce que regardait le siège (la table, la pièce)
    p.place = true; empriseDe(p, p.x, p.z, 0.55, 0.55); refaire.add(p.piece);
  }
  for (const p of persos) {                                                  // une personne fixe, debout, posée par erreur dans un meuble : on la sort
    if (!p.fixe || p.assis || p.debout || !dansUnMeuble(p.piece, p)) continue;
    const g = p.piece.grille, c = voisine(g, p, (m) => loin(p, m) > 0.9); if (c < 0) continue;
    for (const o of obstacles) if (o.perso === p) { const m = centre(g, c); o.x0 += m.x - p.x; o.x1 += m.x - p.x; o.z0 += m.z - p.z; o.z1 += m.z - p.z; }
    poser(p, centre(g, c)); refaire.add(p.piece);
  }
  for (const q of refaire) preparer(q);
  for (const p of persos) {                                                  // les marcheurs : une case libre, loin des autres
    if (p.fixe) continue; const g = p.piece.grille;
    if (!g.cases.length) { p.fixe = true; p.place = true; continue; }         // aucune place pour marcher dans cette pièce : il reste où il est
    let mieux = null, dm = -1;
    for (let e = 0; e < 40 && dm < 1.5; e++) { const m = centre(g, g.cases[(hasard() * g.cases.length) | 0]), d = loin(p, m); if (d > dm) { dm = d; mieux = m; } }
    poser(p, mieux); p.g.rotation.y = hasard() * 6.283; p.place = true; p.patience = 0.5; p.bloque = 0; p.revoir = 0; p.fuite = 0;
  }
  installerAssis(); poserGens(); if (typeof coifferAssis === "function") coifferAssis();
})();

/* Les autres personnes à contourner, et les cases qu'elles prennent. On contourne toujours ceux qui sont à l'arrêt ;
   avecMarcheurs : aussi ceux qui marchent à moins de 3 m (quand on est bloqué). Une case qui ne nous rapproche pas de quelqu'un
   n'est jamais barrée par lui : on peut toujours s'éloigner. */
function barrer(p, avecMarcheurs) {
  const q = p.piece, g = q.grille, barre = new Uint8Array(g.nx * g.nz), gens = [];
  for (const o of q.gens) { if (o === p || o.fixe || (o.route && !(avecMarcheurs && dist(o, p) <= 3))) continue; gens.push(o);   // (les personnes fixes ont déjà leur emprise, comme un meuble)
    const R = Math.min(ECART + 0.16, dist(o, p));
    const i0 = Math.max(0, Math.floor((o.x - R - q.x0) / PAS)), i1 = Math.min(g.nx - 1, Math.floor((o.x + R - q.x0) / PAS)), j0 = Math.max(0, Math.floor((o.z - R - q.z0) / PAS)), j1 = Math.min(g.nz - 1, Math.floor((o.z + R - q.z0) / PAS));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (Math.hypot(q.x0 + (i + 0.5) * PAS - o.x, q.z0 + (j + 0.5) * PAS - o.z) < R) barre[j * g.nx + i] = 1; }
  return { barre, gens };
}
/* Tracer la route de p jusqu'à la case c, en contournant les personnes à l'arrêt. avecGens = true : aussi celles qui marchent tout près ;
   avecGens = null : sans s'occuper de personne (pour les essais). Rend faux s'il n'y a pas de passage. */
function tracer(p, c, avecGens) {
  const q = p.piece, g = q.grille, ici = { x: p.x, z: p.z };
  // le départ : la case libre la plus proche qui ne nous rapproche pas d'un voisin collé à nous (sinon le premier pas serait refusé)
  const colles = avecGens === null ? [] : q.gens.filter((o) => o !== p && dist(o, p) < ECART + 0.15);
  let a = colles.length ? caseProche(g, p.x, p.z, (m) => colles.every((o) => dist(o, m) >= dist(o, p) - 0.02)) : -1; if (a < 0) a = caseProche(g, p.x, p.z); if (a < 0) return false;
  const B = avecGens === null ? { barre: new Uint8Array(g.nx * g.nz), gens: [] } : barrer(p, avecGens); B.barre[a] = 0; if (B.barre[c]) return false;
  const pts = chemin(g, a, c, B.barre); if (!pts) return false;
  const tous = [ici].concat(pts), lisse = [ici]; let i = 0;                  // on retire les zigzags : on vise le point le plus loin qu'on peut rejoindre tout droit
  const pres = B.gens.filter((o) => dist(o, p) >= ECART + 0.12), droit = (u, v) => segmentLibre(q, u, v, CORPS + AISE * 0.5) && !croiseGens(u, v, pres, ECART + 0.1);
  while (i < tous.length - 1) { let j = tous.length - 1; while (j > i + 1 && !droit(tous[i], tous[j])) j--; lisse.push(tous[j]); i = j; }
  if (lisse.length < 2) return false;
  p.route = lisse; p.etape = 1; p.but = c; p.retenu = false; p.fuite = 0; return true;
}
/* Un nouveau but : un meuble ou la baie vitrée où s'arrêter, quelqu'un à qui parler, ou simplement ailleurs dans la pièce */
function placePrise(p, m, d) { for (const o of p.piece.gens) { if (o === p) continue; if (dist(o, m) < d) return true; if (o.route && dist(o.route[o.route.length - 1], m) < d) return true; } return false; }
function choisirBut(p, avecGens) {
  const q = p.piece, g = q.grille; if (!g.cases.length) return false;
  if (p.ami && p.ami.attendu === p) p.ami.attendu = null; p.ami = null; p.vise = null; p.regarde = null; if (p.attendu) p.attendu = null;
  for (let essai = 0; essai < 7; essai++) {
    const h = essai < 4 ? Math.random() : 1; let c = -1, vise = null, ami = null;
    if (h < 0.3 && g.haltes.length) { vise = g.haltes[(Math.random() * g.haltes.length) | 0]; c = vise.c; }
    else if (h < 0.55) {                                                     // aller parler à quelqu'un qui ne bouge pas : on s'arrête à un bon mètre, face à lui s'il est assis
      const dispo = q.gens.filter((o) => o !== p && !o.attendu && !o.ami && (o.fixe || (!o.route && o.pause > 1.5 && !o.retenu)));   // (retenu : on l'a déjà fait attendre, il doit d'abord repartir)
      if (dispo.length) { ami = dispo[(Math.random() * dispo.length) | 0]; const ry = ami.g.rotation.y, fx = Math.sin(ry), fz = Math.cos(ry), autour = [];
        for (const k of g.cases) { const m = centre(g, k), d = dist(m, ami); if (d > 0.9 && d < 1.3 && (!ami.fixe || (m.x - ami.x) * fx + (m.z - ami.z) * fz > 0.45)) autour.push(k); }
        if (autour.length) c = autour[(Math.random() * autour.length) | 0]; else ami = null; }
    }
    if (c < 0) c = g.cases[(Math.random() * g.cases.length) | 0];
    const m = centre(g, c);
    if (dist(m, p) < 1.2 || placePrise(p, m, 0.85)) continue;                // trop près pour être un vrai déplacement, ou la place est prise
    if (!tracer(p, c, avecGens)) continue;
    p.vise = vise; p.ami = ami;
    if (ami && !ami.fixe) { let L = 0; for (let i = 1; i < p.route.length; i++) L += dist(p.route[i - 1], p.route[i]); ami.attendu = p; ami.retenu = true; ami.pause = Math.max(ami.pause, Math.min(14, L / p.v + 3)); }   // il nous attend (jamais plus de 14 s)
    return true;
  }
  return false;
}
/* Arrivé : on s'arrête un moment, tourné vers ce qu'on est venu voir */
function arriver(p) {
  p.route = null; p.bloque = 0; p.palier = 0; p.jalon = null; stats.arrivees++; p.arrivees = (p.arrivees || 0) + 1;
  let duree = 2 + Math.random() * 5; const ouvrier = p.type === "artisan" || p.type === "candidat", o = p.ami;
  if (o) {
    if (o.attendu === p) o.attendu = null; p.ami = null;
    if (dist(o, p) < 1.8 && (o.fixe || !o.route)) { duree = 4 + Math.random() * 6; p.regarde = o; stats.causeries++;
      if (!o.fixe) { o.regarde = p; o.pause = Math.max(o.pause, duree + Math.random()); }
      if (Math.random() < (ouvrier ? 0.5 : 0.2)) geste(p, ouvrier ? "salut" : "applaudit", 1); }
  } else if (p.vise) { p.regarde = p.vise; duree = 3 + Math.random() * 5; stats.haltes++;
    if (ouvrier && !p.vise.vue && Math.random() < 0.7) duree = Math.max(duree, geste(p, "bricole", 2 + ((Math.random() * 3) | 0)) + 0.4);         // l'artisan s'affaire sur l'établi
  } else if (p.type === "visiteur" && Math.random() < 0.08) geste(p, "applaudit", 1);
  p.vise = null; p.pause = TEST.presse ? 0.05 : duree;
}
/* Sécurité : quelqu'un se retrouve trop près d'un meuble (ne devrait jamais arriver) → il repart de la case libre la plus proche */
function recaler(p) {
  const g = p.piece.grille; let mieux = -1, dm = Infinity;
  for (const c of g.cases) { const m = centre(g, c), d = dist(m, p); if (d < dm && !p.piece.gens.some((o) => o !== p && dist(o, m) < ECART)) { dm = d; mieux = c; } }
  if (mieux >= 0) { const m = centre(g, mieux); p.x = m.x; p.z = m.z; } p.route = null; p.pause = 0.4; p.vit = 0; stats.recalages++;
}

/* Le dégagement : la règle de dernier recours, celle qui défait toujours un bouchon. Qui est bloqué sans détour possible s'écarte
   du groupe pendant une seconde ou deux : ceux du bord ont toujours une issue, ceux du milieu attendent qu'ils soient partis. */
const fuites = [0, 0.5, -0.5, 1.0, -1.0, 1.5, -1.5];
function degager(p) { p.route = null; p.jalon = null; p.palier = 0; if (p.ami && p.ami.attendu === p) p.ami.attendu = null; p.ami = null; p.vise = null; p.regarde = null; p.fuite = 0.9 + Math.random() * 0.9; p.pause = 0.2 + Math.random() * 0.8; stats.degagements++; }
function reculer(p, dt, tourner) {
  const q = p.piece; let rx = 0, rz = 0;
  for (const o of q.gens) { if (o === p) continue; const ox = p.x - o.x, oz = p.z - o.z, d = Math.hypot(ox, oz); if (d < 1.7 && d > 1e-6) { rx += ox / (d * d); rz += oz / (d * d); } }
  const n = Math.hypot(rx, rz); p.fuite -= dt;
  if (n < 0.3) { p.fuite = 0; return; }                                      // plus personne autour : c'est dégagé
  rx /= n; rz /= n; p.vit += Math.max(-4 * dt, Math.min(2.5 * dt, p.v * 0.75 - p.vit)); const pas = p.vit * dt;
  for (const an of fuites) {
    const c = Math.cos(an), s = Math.sin(an), dx = rx * c + rz * s, dz = rz * c - rx * s, nx = p.x + dx * pas, nz = p.z + dz * pas;
    if (!horsMeuble(q, nx, nz, CORPS)) continue;
    let ok = true; for (const o of q.gens) { if (o === p) continue; const nd = Math.hypot(o.x - nx, o.z - nz); if (nd < ECART && nd < Math.hypot(o.x - p.x, o.z - p.z) + 1e-5) { ok = false; break; } }
    if (!ok) continue;
    p.x = nx; p.z = nz; p.g.position.x = nx; p.g.position.z = nz; tourner(Math.atan2(dx, dz), 7); return;
  }
  p.vit = 0;                                                                 // enfermé pour l'instant : il attend que ses voisins s'écartent
}

/* Débloquer : d'abord un détour autour des gens, puis un autre but, enfin le dégagement. Chaque nouvel échec monte d'un palier. */
function debloquer(p) {
  stats.recalculs++; p.recalculs = (p.recalculs || 0) + 1; p.bloque = 0; p.patience = 0.35 + Math.random() * 0.6;
  const fin = p.route && p.route[p.route.length - 1], palier = p.palier || 0; p.palier = palier + 1;
  if (fin && dist(fin, p) < 1.3) { arriver(p); return; }                     // presque arrivé et la place est prise : on s'arrête là
  if (palier === 0 && p.but != null && tracer(p, p.but, true)) return;
  if (palier <= 1 && choisirBut(p, true)) return;
  degager(p);
}
/* Un pas de temps pour un marcheur */
const essais = [0, 0.6, -0.6, 1.2, -1.2, 1.75, -1.75];                         // les écarts tentés (en radians) quand la voie directe est prise
function avancer(p, dt) {
  const q = p.piece, g = p.g;
  if (!horsMeuble(q, p.x, p.z, CORPS - 0.04)) recaler(p);
  const tourner = (cap, k) => { let da = cap - g.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da)); g.rotation.y += da * Math.min(1, dt * k); return da; };
  if (!p.route && p.fuite > 0) { reculer(p, dt, tourner); return; }
  if (!p.route) {                                                            // à l'arrêt : on se tourne vers son interlocuteur, on attend, puis on repart
    p.vit = Math.max(0, p.vit - 4 * dt);
    if (p.regarde) tourner(Math.atan2(p.regarde.x - p.x, p.regarde.z - p.z), 5);
    p.pause -= dt; p.jalon = null;
    if (p.pause <= 0) {                                                      // entouré de gens à l'arrêt, il ne trouve aucun chemin : au troisième essai il se lance quand même (les contrôles de chaque pas restent)
      if (choisirBut(p, p.echecs >= 2 ? null : false)) p.echecs = 0; else { p.echecs = (p.echecs || 0) + 1; p.pause = 0.5 + Math.random(); }
    }
    return;
  }
  let but = p.route[p.etape], d = dist(but, p);
  const dernier = p.etape === p.route.length - 1;
  if (dernier ? d < 0.06 : d < 0.24 && segmentLibre(q, p, p.route[p.etape + 1], CORPS + 0.02) || d < 0.05) {   // on arrondit les angles quand la suite est dégagée
    if (dernier) { arriver(p); return; }
    p.etape++; but = p.route[p.etape]; d = dist(but, p);
  }
  const ux = (but.x - p.x) / (d || 1), uz = (but.z - p.z) / (d || 1); let ax = 0, az = 0, gene = 0, cote = 1;
  for (const o of q.gens) {                                                  // les voisins qui marchent : on s'écarte tôt, toujours du même côté (comme sur un trottoir), et on ralentit
    if (o === p || !(o.route || o.fuite > 0)) continue; const ox = o.x - p.x, oz = o.z - p.z, od = Math.hypot(ox, oz); if (od >= CONFORT || od < 1e-6) continue;
    const devant = (ox * ux + oz * uz) / od; if (devant < -0.2) continue;
    const f = Math.min(1, (CONFORT - od) / (CONFORT - ECART)), tr = (ux * oz - uz * ox) / od, s = Math.abs(tr) < 0.2 ? 1 : (tr > 0 ? 1 : -1);
    ax += (uz * s * 1.1 - ox / od * 0.35) * f; az += (-ux * s * 1.1 - oz / od * 0.35) * f; gene = Math.max(gene, f * (devant > 0.5 ? 0.6 : 0.3)); cote = s;
  }
  if (dernier && d < 0.5) ax = az = 0;                                       // tout près du but, on y va droit (le contrôle ci-dessous suffit)
  let vx = ux + ax, vz = uz + az; const n = Math.hypot(vx, vz) || 1; vx /= n; vz /= n;
  const da = tourner(Math.atan2(vx, vz), p.vit > 0.15 ? 8 : 3.5);             // il tourne en douceur (plus lentement à l'arrêt : pas de girouette), et ralentit tant qu'il n'est pas dans l'axe
  let veut = p.v * (1 - gene) * Math.max(0.15, Math.cos(Math.min(1.5, Math.abs(da))));
  if (dernier && d < 0.6) veut *= Math.max(0.35, d / 0.6);                   // il freine en arrivant
  p.vit += Math.max(-4 * dt, Math.min(2.5 * dt, veut - p.vit));
  const pas = Math.min(d, p.vit * dt);
  let fait = false;
  for (let e = 0; e < essais.length && !fait; e++) {
    const an = essais[e] * cote, c = Math.cos(an), s = Math.sin(an), bx = e ? ux : vx, bz = e ? uz : vz, nx = p.x + (bx * c + bz * s) * pas, nz = p.z + (bz * c - bx * s) * pas;
    if (!horsMeuble(q, nx, nz, CORPS)) continue;
    let ok = true; for (const o of q.gens) { if (o === p) continue; const nd = Math.hypot(o.x - nx, o.z - nz); if (nd < ECART && nd < Math.hypot(o.x - p.x, o.z - p.z) + 1e-5) { ok = false; break; } }
    if (!ok) continue;
    p.x = nx; p.z = nz; fait = true; if (e || gene) p.devie = true;
  }
  if (fait) p.bloque = Math.max(0, p.bloque - dt * 0.5); else { p.vit = 0; p.bloque += dt; }
  g.position.x = p.x; g.position.z = p.z;
  p.revoir -= dt;
  if (p.revoir <= 0) {                                                       // trois fois par seconde : la suite du chemin est-elle toujours praticable ? Sinon on le recalcule tout de suite.
    p.revoir = 0.3; let refaire = p.devie && fait && !segmentLibre(q, p, but, CORPS);                             // après un écart, un meuble cache le prochain point
    if (!refaire) for (const o of q.gens) {                                  // quelqu'un s'est arrêté sur le chemin
      if (o === p || o.fixe || o.route || o.fuite > 0) continue; const od = dist(o, p); if (od > 2.5) continue;
      if (od < ECART + 0.12 ? ((o.x - p.x) * ux + (o.z - p.z) * uz) / od > 0.35 : croiseGens(p, d > 2.5 ? { x: p.x + ux * 2.5, z: p.z + uz * 2.5 } : but, [o], ECART + 0.06)) { refaire = true; break; }
    }
    if (refaire) { stats.recalculs++; if (!tracer(p, p.but, false) && !choisirBut(p, false)) { p.route = null; p.pause = 0.3 + Math.random() * 0.5; return; } p.revoir = 0.6; }
    else if (!gene) p.devie = false;
  }
  if (p.route) {                                                             // le témoin d'avancée : en 2 secondes de marche, on doit s'être déplacé d'au moins 45 cm. Sinon on piétine : même règle.
    if (!p.jalon) p.jalon = { t: 0, x: p.x, z: p.z };                        // (après un premier échec, on revérifie plus vite : 1,2 s)
    const delai = p.palier ? 1.2 : TEMOIN; p.jalon.t += dt; if (p.jalon.t >= delai) { const fait2 = dist(p.jalon, p); p.jalon = null; if (fait2 < 0.225 * delai) { stats.pietinements++; debloquer(p); return; } p.palier = 0; }
  } else p.jalon = null;
  if (p.route && p.bloque > p.patience) debloquer(p);                        // bloqué net : la même règle, sans attendre
}

/* Chaque image (appelé par la boucle) : les déplacements, puis les mouvements du corps */
function avancerGens(dt) { for (const p of persos) if (!p.fixe) avancer(p, dt); }
function majGens(dt) { if (calme) return; avancerGens(dt); animerGens(dt); if (typeof majOmbres === "function") majOmbres(); }   // (majOmbres : la tache d'ombre qui suit chacun, voir « Le ciel »)

/* ── La preuve automatique (?test=1) : rien n'est affiché, on fait seulement avancer la simulation à pas fixe (1/30 s).
      1. 120 secondes de vie normale ;  2. 120 secondes de « foule pressée » (personne ne s'arrête jamais) ;
      3. des face-à-face forcés (deux marcheurs échangent leurs places) ;  4. des mêlées (tous les marcheurs d'une pièce serrés au même endroit).
      Partout, dansUnMeuble et chevauchements doivent valoir 0, et personne ne doit rester coincé. ── */
if (/[?&]test=1/.test(location.search)) window.__rapport = async function () {
  const dt = 1 / 30, marcheurs = persos.filter((p) => !p.fixe);
  const libre = (p) => { p.route = null; p.fuite = 0; p.regarde = null; p.attendu = null; p.ami = null; p.vise = null; p.retenu = false; p.bloque = 0; p.vit = 0; };
  const manche = (secondes) => {
    const R = { pas: Math.round(secondes / dt), personnes: persos.length, dansUnMeuble: 0, chevauchements: 0, bloques: 0 }, depart = marcheurs.map((p) => ({ x: p.x, z: p.z })), loin = marcheurs.map(() => 0), parcouru = marcheurs.map(() => 0);
    let ecartMin = Infinity, margeMin = Infinity, surPlace = 0; const avant = Object.assign({}, stats), ancre = marcheurs.map((p) => ({ x: p.x, z: p.z, t: 0 })); marcheurs.forEach((p) => { p.arrivees = 0; });
    for (let n = 0; n < R.pas; n++) {
      const ou = marcheurs.map((p) => ({ x: p.x, z: p.z })); avancerGens(dt);
      marcheurs.forEach((p, i) => { parcouru[i] += dist(p, ou[i]); loin[i] = Math.max(loin[i], dist(p, depart[i]));
        const a = ancre[i]; if (!p.route || dist(a, p) > 0.4) { a.x = p.x; a.z = p.z; a.t = 0; } else { a.t += dt; surPlace = Math.max(surPlace, a.t); } });   // en route, mais sans s'éloigner de 40 cm : il piétine
      for (const p of persos) {
        if (!p.assis && dansUnMeuble(p.piece, p)) R.dansUnMeuble++;
        if (!p.fixe) for (const o of p.piece.meubles) { const px = Math.max(o.x0, Math.min(o.x1, p.x)), pz = Math.max(o.z0, Math.min(o.z1, p.z)); margeMin = Math.min(margeMin, Math.hypot(px - p.x, pz - p.z)); }
        let pres = Infinity; for (const o of persos) if (o !== p) pres = Math.min(pres, dist(o, p)); if (pres < 0.35) R.chevauchements++; ecartMin = Math.min(ecartMin, pres);
      }
    }
    R.bloques = loin.filter((d) => d < 0.05).length;
    R.marcheurs = marcheurs.length; R.assis = persos.filter((p) => p.assis).length; R.deboutFixes = persos.filter((p) => p.fixe && !p.assis).length;
    R.ecartMinEntreDeux = +ecartMin.toFixed(3); R.margeMinAuxMeubles = +margeMin.toFixed(3); R.pireSurPlaceEnRoute = +surPlace.toFixed(1);
    R.metresParMarcheur = +(parcouru.reduce((a, b) => a + b, 0) / Math.max(1, marcheurs.length)).toFixed(1); R.metresMin = +Math.min.apply(null, parcouru.concat([1e9])).toFixed(1);
    R.arriveesMin = Math.min.apply(null, marcheurs.map((p) => p.arrivees).concat([1e9]));
    for (const k in stats) R[k] = stats[k] - avant[k];
    return R;
  };
  const normal = manche(120);
  TEST.presse = true; for (const p of marcheurs) p.pause = 0; const presse = manche(120); TEST.presse = false;
  // les face-à-face : deux marcheurs d'une même pièce échangent leurs places. Réussi = chacun finit à sa place (ou juste à côté si elle est prise) ;
  // sinon l'un des deux a préféré changer de but (détour impossible) : ce n'est pas une faute, tant que personne ne se touche.
  const duel = { paires: 0, reussies: 0, finies: 0, chevauchements: 0, dansUnMeuble: 0 };
  for (const q of PIECES) { const m = q.gens.filter((p) => !p.fixe); if (m.length < 2) continue;
    for (let k = 0; k + 1 < m.length; k += 2) { const a = m[k], b = m[k + 1], ga = q.grille, ca = caseProche(ga, a.x, a.z), cb = caseProche(ga, b.x, b.z); if (ca < 0 || cb < 0 || ca === cb) continue;
      for (const o of m) { libre(o); o.pause = 1e6; }
      a.pause = b.pause = 0; if (!tracer(a, cb, null) || !tracer(b, ca, null)) continue;
      duel.paires++; const A = centre(ga, cb), Bm = centre(ga, ca); let ok = true, fini = false;
      for (let n = 0; n < 60 / dt && !fini; n++) { avancer(a, dt); avancer(b, dt); if (dist(a, b) < 0.35) { duel.chevauchements++; ok = false; } if (dansUnMeuble(q, a) || dansUnMeuble(q, b)) { duel.dansUnMeuble++; ok = false; }
        if (!a.route && !(a.fuite > 0)) a.pause = 1e6; if (!b.route && !(b.fuite > 0)) b.pause = 1e6; fini = !a.route && !b.route && !(a.fuite > 0) && !(b.fuite > 0); }
      if (fini) duel.finies++; if (ok && fini && dist(a, A) < 1.6 && dist(b, Bm) < 1.6) duel.reussies++;
      for (const o of m) o.pause = Math.random() * 2; } }
  // les mêlées : tous les marcheurs d'une pièce sont serrés au plus près (à peine plus que la distance minimale) autour d'un même point, puis chacun repart, pressé.
  // En 40 secondes, chacun doit s'être éloigné d'au moins 1,5 m de sa place dans le tas, sans toucher personne.
  const melee = { pieces: 0, personnes: 0, coinces: 0, chevauchements: 0, dansUnMeuble: 0, degagements: 0, ou: [] }; TEST.presse = true;
  for (const q of PIECES) { const m = q.gens.filter((p) => !p.fixe), g = q.grille; if (m.length < 3) continue;
    for (const coin of [0, 1]) {                                             // une fois au milieu de la pièce, une fois dans le recoin le plus étroit (la case la plus loin du milieu)
      const milieu = { x: q.cx, z: q.cz }, tri = g.cases.slice().sort((a, b) => dist(centre(g, a), milieu) - dist(centre(g, b), milieu)), C = centre(g, tri[coin ? tri.length - 1 : 0]);
      tri.sort((a, b) => dist(centre(g, a), C) - dist(centre(g, b), C)); const places = [];
      for (const c of tri) { const mm = centre(g, c); if (places.every((o) => dist(o, mm) >= ECART + 0.04) && q.gens.every((o) => !o.fixe || dist(o, mm) > 0.7)) places.push(mm); if (places.length === m.length) break; }
      if (places.length < m.length) continue;
      m.forEach((p, i) => { libre(p); p.x = places[i].x; p.z = places[i].z; p.g.position.x = p.x; p.g.position.z = p.z; p.pause = 0; });
      melee.pieces++; melee.personnes += m.length; const loin = m.map(() => 0), avant = stats.degagements;
      for (let n = 0; n < 40 / dt; n++) { for (const p of m) avancer(p, dt);
        m.forEach((p, i) => { loin[i] = Math.max(loin[i], dist(p, places[i])); if (dansUnMeuble(q, p)) melee.dansUnMeuble++; for (const o of q.gens) if (o !== p && dist(o, p) < 0.35) melee.chevauchements++; }); }
      melee.coinces += loin.filter((d) => d < 1.5).length; melee.degagements += stats.degagements - avant;
      if (loin.some((d) => d < 1.5)) melee.ou.push({ piece: q.id, coin, places: places.map((o) => [+o.x.toFixed(2), +o.z.toFixed(2)]), loin: loin.map((d) => +d.toFixed(2)), fin: m.map((p) => [+p.x.toFixed(2), +p.z.toFixed(2), p.route ? "marche" : p.fuite > 0 ? "fuit" : "arret"]) });
    } }
  TEST.presse = false; for (const p of marcheurs) { libre(p); p.pause = Math.random() * 2; }
  return Object.assign({}, normal, { foulePressee: presse, faceAFace: duel, melees: melee });
};
/* Pour les contrôles (?diag=1) : la troupe est rendue visible depuis la console, rien d'autre ne change */
if (/[?&]diag=1/.test(location.search)) window.__gens = { persos, robots, obstacles, stats, GENS, gabarits, TEST, avancerGens, avancer, choisirBut, tracer, caseProche, horsMeuble, segmentLibre, centre, animerGens };

/* ── Le ciel, la lumière : fin d'après-midi dorée en thème clair, heure bleue en thème sombre ──
   Tout ce qui règle l'image est ici, dans AMBIANCES. Les forces se lisent sur une même échelle : 1 = un sol blanc éclairé « normalement ».
     iSoleil × (hauteur du soleil)  = ce que le soleil apporte à un sol à plat ;
     ciel                           = ce que le ciel apporte au même sol (la lumière d'ambiance, celle qui reste dans les ombres) ;
     lampes                         = la force des lampes de chaque pièce (la nuit).
   Le rapport soleil / ciel fait le contraste des ombres. « expo » règle la clarté de toute l'image, sans toucher à ce rapport. */
const ciel = new THREE.Mesh(new THREE.SphereGeometry(2800, 32, 20), new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false }));
ciel.geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(ciel.geometry.attributes.position.count * 3), 3)); scene.add(ciel);
const astre = new THREE.Mesh(new THREE.SphereGeometry(70, 20, 14), new THREE.MeshBasicMaterial({ color: 0xfff1c9, fog: false, toneMapped: false })); scene.add(astre);
const pmrem = new THREE.PMREMGenerator(renderer), envs = {};
const AMBIANCES = {
  jour: {
    haut: 0x3f7fc9, milieu: 0xa3c6e2, bas: 0xf4d3b1, brume: 0xf4d3b1, astre: 0xfff1c9,          // le dégradé du ciel (du zénith à l'horizon), la brume au loin (la même couleur que l'horizon : sinon on voit une ligne), le disque du soleil
    soleil: 0xffb873, iSoleil: 2.45, dir: [-0.72, 0.56, 0.4], ombres: true,                                  // un soleil bas et doré, qui vient de l'arrière gauche : de longues ombres vers l'avant droit
    ciel: 0.48, teinteCiel: [0.97, 1, 1.06], plafond: 5,                                          // la lumière du ciel (un peu bleue : elle refroidit les ombres) ; plafond : le soleil de la photo est écrêté (le vrai est « soleil »)
    iHemi: 0.12, hemiCiel: 0xbcd0ff, hemiSol: 0xe0a878,                                          // le rebond chaud du sol
    lampes: 0, teinteLampes: 0xffc98a, fenetres: 0, lueur: 1.1,                                  // lampes éteintes, fenêtres de la ville éteintes ; lueur : la force des écrans
    contact: 0.3, contactGens: 0.34, choisie: 0.3, expo: 0.85,                                   // les ombres de contact (sous les meubles, sous les gens) ; choisie : la force du voile indigo sur le sol de la pièce choisie (trop fort, il rend le bois rose)
  },
  nuit: {
    haut: 0x0a1232, milieu: 0x242c66, bas: 0x4a4279, brume: 0x4a4279, astre: 0xe9ecff,
    soleil: 0x93a8ff, iSoleil: 0.22, dir: [-0.45, 0.72, 0.32], ombres: false,                    // la lune : une lumière bleue et faible, qui dessine encore les volumes. Sans ombres portées : à peine visibles la nuit, elles coûtaient cher
    ciel: 0.09, teinteCiel: [0.6, 0.75, 1.3], plafond: 4,
    iHemi: 0.05, hemiCiel: 0x5a6cc0, hemiSol: 0x40305a,
    lampes: 1.8, teinteLampes: 0xffbb78, fenetres: 1.35, lueur: 1.7,
    contact: 0.62, contactGens: 0.6, choisie: 0.2, expo: 1.0,
  },
};

/* Le vrai ciel photographié, préparé pour éclairer la scène. La photo est beaucoup trop forte telle quelle (tout sortait délavé, et la nuit
   ressemblait au jour) : on écrête son soleil, on la ramène à la force voulue (a.ciel), on la teinte, et on la tourne pour que son côté
   le plus clair soit du côté de notre soleil. Rend null si la photo n'a pas le format attendu : on prend alors le dégradé. */
function cielRegle(hdr, a, d) {
  const img = hdr && hdr.image, W = img && img.width, H = img && img.height, src = img && img.data;
  if (!(src instanceof Uint8Array) || src.length !== W * H * 4) return null;
  const f = new Float32Array(W * H * 3), P2 = new Float32Array(256); for (let e = 0; e < 256; e++) P2[e] = Math.pow(2, e - 136);
  let somme = 0, max = 0, colMax = 0;
  for (let y = 0; y < H; y++) {
    const el = (0.5 - (y + 0.5) / H) * Math.PI, w = el > 0 ? Math.sin(el) * Math.cos(el) : 0;      // le poids d'un point du ciel dans la lumière reçue par un sol à plat
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4, k = P2[src[i + 3]], j = (y * W + x) * 3; let r = src[i] * k, g = src[i + 1] * k, b = src[i + 2] * k, L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      if (L > max) { max = L; colMax = x; }
      if (L > a.plafond) { const c = a.plafond / L; r *= c; g *= c; b *= c; L = a.plafond; }
      f[j] = r; f[j + 1] = g; f[j + 2] = b; somme += L * w;
    }
  }
  const moyenne = somme * 2 * Math.PI / (W * H), gain = moyenne > 0 ? a.ciel / moyenne : 1, t = a.teinteCiel || [1, 1, 1];
  const dec = Math.round((Math.atan2(d.z, d.x) / (2 * Math.PI) + 0.5) * W - colMax), out = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const j = (y * W + ((x - dec) % W + W) % W) * 3, o = (y * W + x) * 4, r = f[j] * gain * t[0], g = f[j + 1] * gain * t[1], b = f[j + 2] * gain * t[2], m = Math.max(r, g, b);
    if (m < 1e-30) continue;
    const e = Math.floor(Math.log2(m)) + 1, q = 256 / Math.pow(2, e);                              // on range la couleur au même format que la photo (trois nombres et une puissance de deux)
    out[o] = Math.min(255, r * q); out[o + 1] = Math.min(255, g * q); out[o + 2] = Math.min(255, b * q); out[o + 3] = e + 128;
  }
  const tex = new THREE.DataTexture(out, W, H, THREE.RGBEFormat, THREE.UnsignedByteType);
  tex.encoding = THREE.RGBEEncoding; tex.minFilter = tex.magFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.flipY = true; tex.needsUpdate = true;
  return tex;
}

/* La zone d'ombre du soleil, recadrée au plus juste sur l'étage (ETAGE_OMBRES) : toute la finesse de la carte d'ombres sert là où on regarde */
function cadrerOmbres(d) {
  const E = ETAGE_OMBRES, c = new THREE.Vector3((E.x0 + E.x1) / 2, 0, (E.z0 + E.z1) / 2), cam = soleil.shadow.camera, v = new THREE.Vector3();
  soleil.position.copy(c).addScaledVector(d, 90); soleil.target.position.copy(c); soleil.updateMatrixWorld(); soleil.target.updateMatrixWorld();
  cam.position.copy(soleil.position); cam.lookAt(c); cam.updateMatrixWorld(); const inv = cam.matrixWorld.clone().invert();
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, pres = 1e9, loin = -1e9;
  for (const x of [E.x0, E.x1]) for (const y of [-0.3, E.haut]) for (const z of [E.z0, E.z1]) { v.set(x, y, z).applyMatrix4(inv);
    x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); pres = Math.min(pres, -v.z); loin = Math.max(loin, -v.z); }
  cam.left = x0 - 0.5; cam.right = x1 + 0.5; cam.bottom = y0 - 0.5; cam.top = y1 + 0.5; cam.near = Math.max(1, pres - 6); cam.far = loin + 6; cam.updateProjectionMatrix();
}

/* ── Les ombres de contact : ce qui « pose » les meubles et les gens sur le sol, de jour comme de nuit (les lampes ne portent pas d'ombre) ──
   Pas de calcul en plus à chaque image : une tache sombre et floue dessinée une fois, étirée sous chaque meuble (son emprise, déjà notée pour
   les déplacements), au pied des cloisons, et une tache ronde qui suit chaque personne. Deux tracés en tout. */
const OMBRES = { halo: 0.3, retrait: 0.05, bord: 1.0, gens: 1.0, ySol: 0.026, yGens: 0.03 };   // halo : de combien l'ombre déborde du meuble ; bord : largeur assombrie au pied des cloisons ; gens : diamètre de la tache d'une personne
const texOmbre = toile(64, 64, (c, w, h) => { const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  for (const [r, al] of [[0, 1], [0.2, 0.8], [0.4, 0.5], [0.6, 0.24], [0.8, 0.07], [1, 0]]) g.addColorStop(r, "rgba(0,0,0," + al + ")"); c.fillStyle = g; c.fillRect(0, 0, w, h); }, false);
const matOmbreSol = new THREE.MeshBasicMaterial({ map: texOmbre, color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false, fog: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 });
const matOmbreGens = matOmbreSol.clone();
let ombresGens = null;
(function ombresDeContact() {
  const P = [], U = [], I = [];
  /* Une tache étirée sur un rectangle : pleine au milieu, fondue sur les bords et arrondie aux coins (les 9 cases d'un cadre) */
  const cadre = (xs, zs, us, vs) => { const b = P.length / 3; for (let j = 0; j < zs.length; j++) for (let i = 0; i < xs.length; i++) { P.push(xs[i], OMBRES.ySol, zs[j]); U.push(us[i], vs[j]); }
    const n = xs.length; for (let j = 0; j + 1 < zs.length; j++) for (let i = 0; i + 1 < n; i++) { const a = b + j * n + i; I.push(a, a + n, a + 1, a + 1, a + n, a + n + 1); } };
  const h = OMBRES.halo, s = OMBRES.retrait, m = [0, 0.5, 0.5, 1];
  for (const o of obstacles) {                                               // sous chaque meuble (pas sous les personnes assises : elles ont leur propre tache)
    if (o.perso) continue; const sx = Math.min(s, (o.x1 - o.x0) / 2 - 0.01), sz = Math.min(s, (o.z1 - o.z0) / 2 - 0.01);
    cadre([o.x0 - h, o.x0 + sx, o.x1 - sx, o.x1 + h], [o.z0 - h, o.z0 + sz, o.z1 - sz, o.z1 + h], m, m);
  }
  for (const p of PIECES) {                                                  // au pied des cloisons : le sol s'assombrit un peu vers les bords de chaque pièce
    const e = 0.03, b = OMBRES.bord, d = [0.74, 1];
    cadre([p.x0 + e, p.x1 - e], [p.z0 + e, p.z0 + e + b], [0.5, 0.5], d); cadre([p.x0 + e, p.x1 - e], [p.z1 - e - b, p.z1 - e], [0.5, 0.5], [1, 0.74]);
    cadre([p.x0 + e, p.x0 + e + b], [p.z0 + e, p.z1 - e], d, [0.5, 0.5]); cadre([p.x1 - e - b, p.x1 - e], [p.z0 + e, p.z1 - e], [1, 0.74], [0.5, 0.5]);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I);
  const sol = new THREE.Mesh(g, matOmbreSol); sol.renderOrder = -2; sol.name = "ombres de contact"; scene.add(sol);
  if (!persos.length) return;
  const q = new THREE.PlaneGeometry(OMBRES.gens, OMBRES.gens); q.rotateX(-Math.PI / 2);
  ombresGens = new THREE.InstancedMesh(q, matOmbreGens, persos.length); ombresGens.frustumCulled = false; ombresGens.renderOrder = -1; ombresGens.name = "ombres des gens"; scene.add(ombresGens);
})();
/* Chaque image (appelé par « Les déplacements ») : la tache de chacun le suit */
const mOmbre = new THREE.Matrix4();
function majOmbres() {
  if (!ombresGens) return;
  for (let i = 0; i < persos.length; i++) { const p = persos[i].g.position; mOmbre.makeTranslation(p.x, OMBRES.yGens, p.z); ombresGens.setMatrixAt(i, mOmbre); }
  ombresGens.instanceMatrix.needsUpdate = true;
}
majOmbres();

/* Ce qui éclaire de l'intérieur (écrans, enseignes, liserés des cabines, eau de la piscine) : relevé une fois, puis réglé par l'ambiance */
let lueurs = null;
function releverLueurs() {
  lueurs = []; const vus = new Set();
  decor.traverse((o) => { const m = o.material; if (!m || vus.has(m) || !m.isMeshStandardMaterial) return; vus.add(m);
    if (m.emissiveIntensity > 0 && (m.emissiveMap || m.emissive.r + m.emissive.g + m.emissive.b > 0)) lueurs.push([m, m.emissiveIntensity]); });
}

function ambiance(nom) {
  const a = AMBIANCES[nom], pos = ciel.geometry.attributes.position, col = ciel.geometry.attributes.color, c = new THREE.Color(), h = new THREE.Color(a.haut), m = new THREE.Color(a.milieu), b = new THREE.Color(a.bas);
  for (let i = 0; i < pos.count; i++) { const t = Math.max(0, pos.getY(i) / 2800); if (t < 0.18) c.copy(b).lerp(m, t / 0.18); else c.copy(m).lerp(h, Math.min(1, (t - 0.18) / 0.6)); c.convertSRGBToLinear(); col.setXYZ(i, c.r, c.g, c.b); }
  col.needsUpdate = true;
  scene.fog = new THREE.Fog(a.brume, 500, 2400); renderer.setClearColor(a.brume, 1); renderer.toneMappingExposure = a.expo;
  const d = new THREE.Vector3(a.dir[0], a.dir[1], a.dir[2]).normalize();
  soleil.color.setHex(a.soleil); soleil.intensity = a.iSoleil; soleil.castShadow = a.ombres !== false; cadrerOmbres(d);
  astre.position.copy(d).multiplyScalar(2500); astre.material.color.setHex(a.astre).convertSRGBToLinear(); astre.scale.setScalar(nom === "nuit" ? 0.55 : 1);
  hemi.color.setHex(a.hemiCiel); hemi.groundColor.setHex(a.hemiSol); hemi.intensity = a.iHemi;
  for (const f of facadesAllumables) f.emissiveIntensity = a.fenetres;
  for (const l of lampes) { l.intensity = a.lampes; l.color.setHex(a.teinteLampes); l.visible = a.lampes > 0; }   // éteinte, une lampe est retirée du calcul
  if (!lueurs) releverLueurs(); for (const [mat, base] of lueurs) mat.emissiveIntensity = base * a.lueur;
  matOmbreSol.opacity = a.contact; matOmbreGens.opacity = a.contactGens;
  for (const p of PIECES) if (p.matSol) p.matSol.emissiveIntensity = a.choisie;
  // les reflets et la lumière d'ambiance : le vrai ciel photographié (HDRI) s'il est chargé, sinon le dégradé
  if (!envs[nom]) { const hdr = SANS_CIEL ? null : MODELES.ciel[nom], regle = hdr ? cielRegle(hdr, a, d) : null;
    if (regle) { envs[nom] = pmrem.fromEquirectangular(regle).texture; regle.dispose(); }
    else if (hdr) envs[nom] = pmrem.fromEquirectangular(hdr).texture;
    else { const s = new THREE.Scene(); s.add(ciel.clone()); s.add(astre.clone()); envs[nom] = pmrem.fromScene(s, 0.03, 10, 4000).texture; } }
  scene.environment = envs[nom];
  if (typeof ambianceVille === "function") ambianceVille(nom, a);
}
const SANS_CIEL = /[?&]sansciel=1/.test(location.search);                    // pour les essais : fait comme si la photo du ciel n'avait pas chargé

/* Outils d'essai (aucun effet pour l'utilisateur) : window.__essaiLumiere.regler("jour", { iSoleil: 2 }) change un réglage et le montre aussitôt ;
   .banc(n) rend n images d'affilée et donne le temps moyen d'une image, en millisecondes. */
window.__essaiLumiere = {
  regler(nom, o) { Object.assign(AMBIANCES[nom], o || {}); if (envs[nom]) { envs[nom].dispose(); delete envs[nom]; } ambiance(nom); return true; },
  banc(n) { n = n || 40; const gl = renderer.getContext(), px = new Uint8Array(4); renderer.render(scene, camera); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const t0 = performance.now(); for (let i = 0; i < n; i++) { renderer.render(scene, camera); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); } return +((performance.now() - t0) / n).toFixed(2); },
  objets: { soleil, lampes, hemi, renderer, scene, AMBIANCES },
  ombre() { const k = soleil.shadow.camera; return { large: +(k.right - k.left).toFixed(1), haut: +(k.top - k.bottom).toFixed(1), pres: +k.near.toFixed(1), loin: +k.far.toFixed(1), carte: soleil.shadow.mapSize.x }; },
};

/* ───────────────────────── Caméra : déplacer, tourner, zoomer, voler vers une pièce ───────────────────────── */
let vol = null, choisie = null, survol = null;
const ENSEMBLE = { cible: new THREE.Vector3(2.2, 0, 4.2), az: Math.PI / 4, el: 0.6 };   // (l'étage s'est agrandi vers l'avant et la droite : accueil en porte-à-faux, balcon)
function tailleEnsemble() { const a = boite.clientWidth / Math.max(1, boite.clientHeight); return Math.max(34.5, 66 / a); }
function direction(az, el) { return new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)); }
function poser() {
  const w = boite.clientWidth, h = boite.clientHeight; camera.aspect = w / Math.max(1, h);
  camera.position.copy(vue.cible).addScaledVector(direction(vue.az, vue.el), vue.taille / (2 * TAN)); camera.lookAt(vue.cible); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
}
function axes() { const e = camera.matrixWorld.elements; return { d: new THREE.Vector3(e[0], 0, e[2]).normalize(), h: new THREE.Vector3(e[4], 0, e[6]) }; }
function voler(cible, taille, az, el, duree) {
  az = az == null ? vue.az : az; el = el == null ? vue.el : el;
  if (calme) { vue.cible.copy(cible); vue.taille = taille; vue.az = az; vue.el = el; vol = null; return; }
  vol = { t0: performance.now(), duree: duree || 1100, c0: vue.cible.clone(), c1: cible.clone(), s0: vue.taille, s1: taille, az0: vue.az, az1: az, el0: vue.el, el1: el };
}
function versPiece(p) {
  const taille = Math.max(13, Math.max(p.x1 - p.x0, p.z1 - p.z0) * 1.45), c = new THREE.Vector3(p.cx, 0, p.cz), a = axes();
  if (boite.clientWidth > 760) c.addScaledVector(a.d, -170 * taille / boite.clientHeight);                      // laisse la place du panneau, à gauche
  else if (a.h.length() > 0.05) c.addScaledVector(a.h.clone().normalize(), -boite.clientHeight * 0.2 * taille / boite.clientHeight / a.h.length());
  voler(c, taille, null, 0.68);
}
function versEnsemble() { voler(ENSEMBLE.cible, tailleEnsemble(), ENSEMBLE.az, ENSEMBLE.el); }
function versMiami() { choisir(null); voler(new THREE.Vector3(0, -22, 0), 300, vue.az + 0.7, 0.17, 2600); }

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

/* Souris, doigt, molette. Glisser déplace ; clic droit ou Maj + glisser tourne la vue. */
const rayon = new THREE.Raycaster(), souris = new THREE.Vector2(), doigts = new Map();
let appui = null, ecart = 0;
function viser(e) { const r = canvas.getBoundingClientRect(); souris.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); rayon.setFromCamera(souris, camera); const t = rayon.intersectObjects(sols, false)[0]; return t ? t.object.userData.piece : null; }
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
canvas.addEventListener("pointerdown", (e) => { canvas.setPointerCapture(e.pointerId); doigts.set(e.pointerId, { x: e.clientX, y: e.clientY }); appui = { bouge: 0, tourne: e.button === 2 || e.shiftKey }; if (doigts.size === 2) { const [a, b] = [...doigts.values()]; ecart = Math.hypot(a.x - b.x, a.y - b.y); } canvas.classList.add("tire"); });
canvas.addEventListener("pointermove", (e) => {
  if (!doigts.has(e.pointerId)) { const p = viser(e); if (p !== survol) { survol = p; canvas.style.cursor = p ? "pointer" : ""; } return; }
  const avant = doigts.get(e.pointerId), dx = e.clientX - avant.x, dy = e.clientY - avant.y; doigts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (doigts.size === 2) { const [a, b] = [...doigts.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (ecart) vue.taille = Math.min(520, Math.max(8, vue.taille * ecart / d)); ecart = d; vol = null; return; }
  if (appui) appui.bouge += Math.abs(dx) + Math.abs(dy); vol = null;
  if (appui && appui.tourne) { vue.az -= dx * 0.006; vue.el = Math.min(1.4, Math.max(0.1, vue.el + dy * 0.005)); return; }
  const k = vue.taille / boite.clientHeight, a = axes(), L = Math.max(0.25, a.h.length());
  vue.cible.addScaledVector(a.d, -dx * k).addScaledVector(a.h.clone().normalize(), dy * k / L);
  vue.cible.x = Math.max(-60, Math.min(60, vue.cible.x)); vue.cible.z = Math.max(-50, Math.min(50, vue.cible.z));
});
function lacher(e) { const etait = appui; doigts.delete(e.pointerId); if (doigts.size < 2) ecart = 0; if (!doigts.size) { canvas.classList.remove("tire"); appui = null; if (etait && etait.bouge < 6 && !etait.tourne && e.type === "pointerup") { const p = viser(e); if (p) choisir(p); } } }
canvas.addEventListener("pointerup", lacher); canvas.addEventListener("pointercancel", lacher);
canvas.addEventListener("wheel", (e) => { e.preventDefault(); vol = null; vue.taille = Math.min(520, Math.max(8, vue.taille * (e.deltaY > 0 ? 1.1 : 1 / 1.1))); }, { passive: false });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && choisie) choisir(null); });
document.getElementById("miami").onclick = versMiami;

/* Paramètres d'essai, pour les captures de contrôle (sans effet dans l'artefact publié, qui n'a pas de paramètres) :
   ?theme=jour|nuit   ?vue=ensemble|miami|<id d'une pièce>   ?nu=1 (sans panneaux ni étiquettes) */
const ESSAI = new URLSearchParams(location.search);
if (ESSAI.get("theme")) document.documentElement.setAttribute("data-theme", ESSAI.get("theme") === "nuit" ? "dark" : "light");
if (ESSAI.get("nu")) { for (const id of ["etiquettes", "priorites", "aide"]) document.getElementById(id).style.display = "none"; }

/* Le thème : fin de journée en clair, nuit en sombre */
function theme() {
  const fond = getComputedStyle(document.documentElement).getPropertyValue("--fond").trim() || "#f5f6fb";
  ambiance(new THREE.Color(fond).getHSL({ h: 0, s: 0, l: 0 }).l < 0.4 ? "nuit" : "jour");
}
new MutationObserver(theme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", theme);

/* ───────────────────────── La boucle ───────────────────────── */
function taille() { const w = boite.clientWidth, h = boite.clientHeight; renderer.setPixelRatio(finesse(w, h)); renderer.setSize(w, h, false); }
new ResizeObserver(taille).observe(boite);
const v3 = new THREE.Vector3();
let dernier = performance.now(), images = 0;
function image(t) {
  requestAnimationFrame(image);
  const dt = Math.min(0.05, (t - dernier) / 1000); dernier = t;
  if (vol) { const u = Math.min(1, (t - vol.t0) / vol.duree), e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
    vue.cible.lerpVectors(vol.c0, vol.c1, e); vue.taille = vol.s0 + (vol.s1 - vol.s0) * e; vue.az = vol.az0 + (vol.az1 - vol.az0) * e; vue.el = vol.el0 + (vol.el1 - vol.el0) * e; if (u >= 1) vol = null; }
  poser();
  majGens(dt);                                                               // les personnages (partie_gens / partie_deplacements)
  if (typeof majVille === "function") majVille(dt, t);                       // la circulation, les bateaux, l'eau (partie_ville)
  const loin = vue.taille > 110;
  for (const p of PIECES) {                                                   // le ruban d'une pièce à traiter respire ; la pièce choisie ou survolée s'éclaire
    if (p.etat === "critique" && !calme) p.lisere.material.color.setHex(COULEUR_ETAT.critique).multiplyScalar(0.7 + 0.3 * Math.sin(t / 260));
    p.matSol.emissive.setHex(p === choisie ? 0x1b1a44 : p === survol ? 0x0f0e2a : 0x000000);
    v3.set(p.cx, 2.7, p.cz).project(camera);
    const cache = loin || v3.z > 1; if (p.etq.hidden !== cache) p.etq.hidden = cache;
    if (!cache) { p.etq.style.left = ((v3.x * 0.5 + 0.5) * boite.clientWidth).toFixed(1) + "px"; p.etq.style.top = ((-v3.y * 0.5 + 0.5) * boite.clientHeight).toFixed(1) + "px"; }
  }
  renderer.render(scene, camera);
  if (++images === 40) { window.__pret = true; const i = renderer.info; window.__mesure = "tracés " + i.render.calls + " · triangles " + i.render.triangles; }
}
taille(); theme();
document.getElementById("chargement").hidden = true;
const fige = () => { if (vol) { vue.cible.copy(vol.c1); vue.taille = vol.s1; vue.az = vol.az1; vue.el = vol.el1; vol = null; } };
if (ESSAI.get("vue")) {                                                      // une vue d'essai : pas d'arrivée animée
  vue.taille = tailleEnsemble(); const v = ESSAI.get("vue");
  if (v === "miami") { versMiami(); fige(); } else if (parId[v]) { poser(); choisir(parId[v]); fige(); if (ESSAI.get("nu")) panneau.hidden = true; }
}
if (ESSAI.get("cam")) { const c = ESSAI.get("cam").split(",").map(Number); vue.cible.set(c[0], c[1] || 0, c[2]); vue.taille = c[3] || 6; if (c.length > 4) vue.az = c[4]; if (c.length > 5) vue.el = c[5]; vol = null; panneau.hidden = true; }   // ?cam=x,y,z,taille,az,el : un gros plan d'essai
else if (ESSAI.get("vue")) { }
else if (calme) { vue.taille = tailleEnsemble(); }
else { Object.assign(vue, { taille: 380, az: Math.PI / 4 + 1.0, el: 0.15 }); vue.cible.set(0, -26, 0); voler(ENSEMBLE.cible, tailleEnsemble(), ENSEMBLE.az, ENSEMBLE.el, 3600); }   // l'arrivée : on survole Miami, puis on descend sur l'étage
requestAnimationFrame(image);

}
demarrer().catch((e) => { document.getElementById("erreur").textContent = "Les bureaux n'ont pas pu s'ouvrir : " + (e && e.message ? e.message : e); window.__erreur = String(e && e.stack || e); });
}   // fin du « else » ouvert dans donnees.js
