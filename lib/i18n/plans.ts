import type { Locale } from "./config";
import type { ResultatReprise } from "@/lib/plans/local";
import { COLONNE_GRATUIT, COLONNE_PRO } from "@/lib/plans/droits";

/**
 * « Mes plans » (éditeur de plan en ligne) : textes du SITE autour de l'éditeur, en FR et en EN.
 * Importé seulement par la vitrine `/logiciel-plan-maison`, `TesPlans`, `ClaimPlan`, `PlanRappel` et, côté
 * serveur, la fiche et la liste des projets (C8, qui passent leurs quelques textes en props) :
 * il reste hors du dictionnaire global que `LangProvider` envoie à chaque page (même règle que
 * `neuf.ts`). L'intérieur de l'éditeur reste en français (décision de Dani) ; les textes que le site
 * ajoute autour sont tous traduits.
 *
 * Aucun prix ici (le prix Pro vient de `dictionaries.ts`), aucun emoji, tutoiement. Les droits
 * reprennent les mots de `DROITS` de l'éditeur (« 1 plan enregistré », « des plans enregistrés sans
 * limite »). Pour un Plan final, ni « estimer », ni « budget », ni « neuf », ni « travaux » (D75).
 */
const fr = {
  commun: {
    typeFinal: "Plan final",
    typeReno: "Projet rénovation",
    sansNom: "Plan sans nom",
    cite: (nom: string) => `« ${nom} »`,
    m2: (s: string) => `${s} m²`,
    pieces: (n: number) => `${n} pièce${n > 1 ? "s" : ""}`,
    modifie: (d: string) => `Modifié le ${d}`,
    avecPro: "Avec Pro : des plans enregistrés sans limite.",
    gratuit: "Version gratuite : 1 plan enregistré.",
    planVide: "Plan vide",
  },
  /* La vitrine (le haut de page ; le reste de son contenu arrive avec la mise en avant). */
  page: {
    eyebrow: "Plan 3D gratuit",
    titre: "Dessine le plan de ta maison, gratuitement, et vois-le en 3D",
    sous: "Trace tes murs à la souris : les pièces se ferment toutes seules et affichent leur surface. Ajoute portes, fenêtres et équipements, passe en 3D d'un clic. Dans ton navigateur, sans installation.",
    enFrancais: null as string | null,
  },
  /* L'îlot « Tes plans », en tête de la vitrine. */
  hub: {
    creer: "Créer mon plan, gratuit",
    dessinNote: "Le dessin se fait sur ordinateur ou tablette.",
    envoyerLien: "M'envoyer le lien",
    copierLien: "Copier le lien",
    lienCopie: "Lien copié : ouvre-le sur ton ordinateur ou ta tablette.",
    lienPartageTitre: "Mon plan de maison sur AVYORA",
    lienPartageTexte: "Dessiner mon plan de maison, sur ordinateur ou tablette :",
    chargement: "Chargement de tes plans…",
    tesPlans: "Tes plans",
    aucunPlan: "Aucun plan dans ton compte pour l'instant. Ton premier plan s'y range dès que tu dessines.",
    aucunPlanCourt: "Aucun plan dans ton compte pour l'instant.",
    ajouterCompte: "Ajouter à mon compte",
    ajouterCompteAria: (nom: string) => `Ajouter « ${nom} » à mon compte`,
    erreurListe: "Tes plans n'ont pas pu être chargés. Recharge la page pour réessayer.",
    ouvrir: "Ouvrir",
    ouvrirAria: (nom: string) => `Ouvrir « ${nom} »`,
    estimations: (n: number) => `${n} estimation${n > 1 ? "s" : ""}`,
    estimationNeuf: "Construction",
    estimationReno: "Rénovation",
    estimationsChargement: "Chargement…",
    estimationsErreur: "Les estimations n'ont pas pu être chargées.",
    nouveauPlan: "Nouveau plan",
    nouveauReno: "Nouveau projet rénovation",
    limitePro: "Avec Pro : des plans enregistrés sans limite",
    voirTous: (n: number) => `Voir tes ${n} plans`,
    voirMoins: "Voir moins",
    surAppareil: "Sur cet appareil",
    surAppareilNote: "Ce plan est dans ce navigateur, pas dans un compte.",
    surAppareilNotePl: "Ces plans sont dans ce navigateur, pas dans un compte.",
    reprendre: (nom: string) => `Reprendre « ${nom} »`,
    autresDansEditeur: "Les autres s'ouvrent depuis « Mes plans », dans l'éditeur.",
    unDansEditeur: "Il s'ouvre depuis « Mes plans », dans l'éditeur.",
    tousDansEditeur: "Ils s'ouvrent depuis « Mes plans », dans l'éditeur.",
    garder: "Garde-le dans ton compte",
    garderSous: "Crée ton compte gratuit : tu le retrouves sur tous tes appareils.",
    ouvert: "ouvert",
  },
  /* La vitrine `/logiciel-plan-maison`, sous l'îlot « Tes plans » (C9). Seulement ce que l'éditeur sait faire.
     coherence.mjs § 9 lit le bloc « Plan final » ci-dessous avec les mots interdits d'un Plan final (D75, `MOTS`). */
  vitrine: {
    /* § 9 · Plan final : début */
    comment: "Comment ça marche",
    legende2d: "Le plan en 2D : pièces, surfaces et cotes, calculées par l'éditeur.",
    legende3d: "La même maison en 3D, d'un clic.",
    alt2d: "Plan 2D d'une maison de plain-pied de 94 m² dans l'éditeur AVYORA : pièces nommées, surfaces, cotes et mobilier",
    alt3d: "La même maison de 94 m² en 3D dans l'éditeur AVYORA",
    gestesTitre: "En trois gestes",
    gestes: [
      { titre: "Trace le contour, puis les cloisons", texte: "Chaque pièce se ferme toute seule et affiche sa surface." },
      { titre: "Pose portes, fenêtres et équipements", texte: "Ils s'aimantent aux murs : salle de bain, cuisine, mobilier." },
      { titre: "Regarde en 3D, et chiffre", texte: "La 3D se construit depuis ton plan, d'un clic. Tu fais construire ? « Chiffrer cette maison » ouvre son coût de construction." },
    ],
    capacitesTitre: "Ce que tu peux faire",
    capacitesSous: "Tout ce qui suit existe dans l'éditeur, aujourd'hui.",
    capacites: [
      "Murs, cloisons et murs porteurs, chacun à son épaisseur",
      "Les pièces détectées toutes seules, avec la surface de chacune",
      "Portes et fenêtres aimantées aux murs",
      "Salle de bain, cuisine et mobilier à placer",
      "Plusieurs niveaux, et les escaliers qui les relient",
      "Les cotes, pour lire chaque longueur",
      "Décalquer un plan que tu as déjà : importe son image et cale son échelle",
      "Le contrôle du plan : dégagements conseillés, 9 m² et 2,20 m sous plafond du décret décence",
      "La vue 3D de ton plan, et la visite à hauteur d'yeux",
      "Le dossier PDF de tes plans",
    ],
    apresTitre: "Et après le plan ?",
    construireTitre: "Tu fais construire",
    construireTexte: "Ton plan devient le coût de construction de ta maison : ses pièces, sa surface et ses niveaux sont repris.",
    construireLien: "Dessiner ma maison",
    gratuit: "Gratuit",
    faqTitre: "Questions fréquentes",
    faq: [
      {
        q: "Faut-il installer un logiciel ?",
        r: "Non. L'éditeur s'ouvre dans ton navigateur, sur ordinateur ou tablette : rien à télécharger, rien à installer.",
      },
      {
        q: "C'est vraiment gratuit ?",
        r: "Oui pour dessiner ton plan, le voir en 3D, lire ses surfaces et garder un plan enregistré. Pro ajoute les plans enregistrés sans limite, le projet rénovation chiffré et le dossier PDF sans filigrane.",
      },
      {
        q: "Ça marche sur téléphone ?",
        r: "Tu y consultes tes plans. Le dessin, lui, se fait sur ordinateur ou tablette : depuis ton téléphone, envoie-toi le lien.",
      },
      {
        q: "Où sont enregistrés mes plans ?",
        r: "Sur ton appareil tant que tu n'as pas de compte. Avec un compte, dans ton compte : tu les retrouves sur tous tes appareils. Les calques image restent sur l'appareil où tu les as importés.",
      },
      {
        q: "Puis-je partir d'un plan que j'ai déjà ?",
        r: "Oui : importe l'image de ton plan en calque, cale son échelle, puis décalque les murs.",
      },
      {
        q: "Ce plan suffit-il pour un permis de construire ?",
        r: "Non. C'est un plan pour concevoir ta maison et la chiffrer. Un permis de construire demande des pièces graphiques normées (plan de situation, plan de masse, coupe, façades), et un particulier qui construit pour lui-même doit faire appel à un architecte dès que la surface de plancher ou l'emprise au sol dépasse 150 m².",
      },
    ],
    basTitre: "Dessine ta maison, gratuitement.",
    basSous: "Murs, pièces, surfaces et 3D, dans ton navigateur.",
    basCta: "Créer mon plan",
    /* § 9 · Plan final : fin */
    renoverTitre: "Tu rénoves",
    renoverTexte: "Pars de ton logement tel qu'il est, décide tes travaux : le budget suit chaque décision, corps d'état par corps d'état, jusqu'au suivi du chantier.",
    renoverLien: "Voir ce que Pro ajoute",
    pro: "Pro",
    offresTitre: "Gratuit ou Pro",
    offresGratuitSous: "Avec ou sans compte.",
    offresProSous: "Tout ce qui est gratuit, et :",
    offresVoir: "Voir les offres Pro",
    /* Les mots de l'éditeur (DROITS), au caractère près : lib/plans/droits.ts. */
    gratuitListe: [...COLONNE_GRATUIT] as string[],
    proListe: [...COLONNE_PRO] as string[],
  },
  /* L'écran de choix (`/projets/nouveau`) : le bandeau « Partir de mon plan », sous les deux cartes (C9). */
  choix: {
    titre: "Partir de mon plan",
    neufTexte: "Tu as déjà une idée de ta maison ? Dessine-la : ses pièces et sa surface remplissent l'estimation.",
    neufLien: "Dessiner ma maison →",
    renoTexte: "Pars de ton logement tel qu'il est : dessine-le, décide tes travaux, le budget suit chaque décision.",
    renoLien: "Dessiner mon logement →",
    renoLienGratuit: "Débloquer avec Pro →",
    pro: "Pro",
    partirDe: (nom: string) => `Partir de « ${nom} » →`,
  },
  /* La page de la construction (`/estimation-construction-maison`) : la ligne vers l'éditeur (C9). */
  neuf: {
    avant: "Pas encore de plan ? ",
    lien: "Dessine ta maison",
    apres: " : l'estimation reprend ses pièces et sa surface.",
  },
  /* La reprise d'un plan local dans le compte (`ClaimPlan`). */
  reprise: {
    enCours: "On range ton plan dans ton compte…",
    ajoute: (nom: string) => `« ${nom} » est dans ton compte.`,
    autresRestent: "Les autres restent sur cet appareil.",
    limite: (autre: string) => `Ton compte garde déjà « ${autre} ». Ce plan reste sur cet appareil.`,
    limiteInconnu: "Ton compte garde déjà un autre plan. Ce plan reste sur cet appareil.",
    plafond: "Ton compte a atteint le nombre maximal de plans : supprime un plan pour en ranger un autre. Ce plan reste sur cet appareil.",
    echec: (nom: string) => `« ${nom} » n'a pas pu être ajouté à ton compte : il reste sur cet appareil. Ouvre l'éditeur pour réessayer.`,
    ouvrirPlan: "Ouvrir le plan",
    ouvrirEditeur: "Ouvrir l'éditeur",
    voirPro: "Voir Pro",
    fermer: "Fermer",
  },
  /* Le rappel sur /inscription (`PlanRappel`). */
  rappel: {
    titre: "Ton plan est prêt",
    texte: "Crée ton compte : on le range dans « Mes plans » pour le retrouver partout.",
  },
  /* L'estimation détaillée née d'un plan de rénovation (C7) : `/projets/depuis-plan/[planId]`. */
  estimation: {
    nomProjet: (nom: string, surface: number) => `Rénovation — « ${nom} » · ${surface} m²`,
    eyebrow: "Estimation détaillée",
    titreCreer: "Crée l'estimation de ton plan",
    titreMaj: "Mets à jour l'estimation de ton plan",
    sous: (nom: string) => `À partir de « ${nom} ». Relis ce que le plan a rempli, puis continue vers le détail : tu pourras encore tout ajuster.`,
    majDe: (nom: string) => `Estimation à mettre à jour : « ${nom} ».`,
    nouvelle: "Créer plutôt une nouvelle estimation",
    leBien: "Le bien, repris de ton plan",
    leBienNote: "Tu peux tout corriger dans le détail, à l'étape suivante.",
    surface: "Surface",
    type: "Type",
    niveaux: "Niveaux",
    pieces: "Pièces",
    sdb: "Salles de bain",
    wc: "WC",
    fenetres: "Fenêtres",
    types: { Maison: "Maison", Studio: "Studio", T2: "T2", T3: "T3", T4: "T4" } as Record<string, string>,
    codePostal: "Code postal du bien",
    codePostalAide: "Il règle le coût de la main-d'œuvre selon ta région.",
    envoi: "On prépare ton estimation…",
    ouvrirPlan: "Ouvrir le plan",
    erreurs: {
      contrat_absent: "Ce plan n'a pas encore été envoyé vers l'estimation. Ouvre-le dans l'éditeur, puis clique sur « Créer l'estimation détaillée ».",
      contrat_workflow: "Ce plan est un Plan final : il se chiffre depuis l'éditeur, avec « Chiffrer cette maison ».",
      contrat_invalide: "Ce plan ne peut pas être lu. Ouvre-le dans l'éditeur et renvoie-le.",
      introuvable: "Cette estimation n'est plus reliée à ce plan.",
      code_postal: "Indique le code postal du bien (5 chiffres).",
      trop_volumineux: "Ce plan donne une estimation trop volumineuse pour être enregistrée.",
      trop_de_requetes: "Trop de tentatives : réessaie dans une minute.",
      pro_requis: "L'estimation détaillée est réservée à Pro.",
      connexion_requise: "Ta session a expiré : reconnecte-toi, puis réessaie.",
      erreur: "L'estimation n'a pas pu être créée. Réessaie dans un instant.",
      reseau: "Pas de connexion : réessaie dans un instant.",
    } as Record<string, string>,
  },
  /* L'écran de validation (D1), `components/ValidationPlan.tsx`. */
  validation: {
    eyebrow: "Ton plan",
    titre: "Vérifie ce que le plan a rempli",
    sous: "Les quantités viennent de ce que tu as dessiné. Rien n'est définitif : tout reste modifiable dans le détail, poste par poste.",
    ajoutes: "ajoutés",
    misAJour: "mis à jour",
    inchanges: "inchangés",
    aConfirmer: "à confirmer",
    desaccord: "en désaccord",
    aRegarder: "À regarder de près",
    aRegarderEpinglee: "Une quantité que tu avais corrigée ne correspond pas à ce que mesure le plan.",
    aRegarderSous: "Sur ces lignes, le plan a choisi à ta place : vérifie que c'est bien ce que tu veux.",
    tuAsFixe: "Tu as fixé",
    planMesure: "le plan en mesure",
    nouveau: "nouveau",
    conflit: "Ta saisie est conservée : le plan ne l'écrase pas. Si c'est sa mesure qui est juste, corrige la quantité dans le détail, à l'étape suivante.",
    reste: "Le reste, mesuré sur le plan",
    resteSous: "Rien à décider ici : ce sont des quantités relevées sur ton dessin.",
    vide: "Ton plan ne prévoit encore aucun poste chiffrable : le détail s'ouvre sans quantité reprise du plan.",
    auForfait: "au forfait",
    continuer: "J'ai vérifié, continuer vers le détail",
  },
  /* Le lien estimation → plan (C8) : la fiche projet (`PlanRelie`) et « Mes projets » (`ListeProjets`). */
  lien: {
    vientDe: "Vient de ton plan",
    ouvrirPlan: "Ouvrir le plan",
    aChange: "Ton plan a changé depuis cette estimation.",
    aChangeSous: "Ouvre ton plan, puis « Mettre à jour l'estimation » : les lignes que tu as corrigées à la main restent telles quelles.",
    mettreAJour: "Mettre à jour",
    pro: "Pro",
    pastille: "Depuis ton plan",
    bande: "Tes plans",
    bandeSous: "Rouvre-les dans l'éditeur, en 2D et en 3D.",
    dessiner: "ou commence par dessiner ton plan",
  },
};

export type DictPlans = typeof fr;

const en: DictPlans = {
  commun: {
    typeFinal: "Final plan",
    typeReno: "Renovation project",
    sansNom: "Untitled plan",
    cite: (nom: string) => `“${nom}”`,
    m2: (s: string) => `${s} m²`,
    pieces: (n: number) => `${n} room${n > 1 ? "s" : ""}`,
    modifie: (d: string) => `Updated ${d}`,
    avecPro: "With Pro: unlimited saved plans.",
    gratuit: "Free version: 1 saved plan.",
    planVide: "Empty plan",
  },
  page: {
    eyebrow: "Free 3D plan",
    titre: "Draw your house plan for free, and see it in 3D",
    sous: "Draw your walls with the mouse: rooms close on their own and show their area. Add doors, windows and fittings, switch to 3D in one click. In your browser, nothing to install.",
    enFrancais: "The editor is in French for now.",
  },
  hub: {
    creer: "Create my plan, free",
    dessinNote: "Drawing works on a computer or a tablet.",
    envoyerLien: "Send me the link",
    copierLien: "Copy the link",
    lienCopie: "Link copied: open it on your computer or tablet.",
    lienPartageTitre: "My house plan on AVYORA",
    lienPartageTexte: "Draw my house plan, on a computer or a tablet:",
    chargement: "Loading your plans…",
    tesPlans: "Your plans",
    aucunPlan: "No plans in your account yet. Your first plan is saved here as soon as you draw.",
    aucunPlanCourt: "No plans in your account yet.",
    ajouterCompte: "Add to my account",
    ajouterCompteAria: (nom: string) => `Add “${nom}” to my account`,
    erreurListe: "Your plans could not be loaded. Reload the page to try again.",
    ouvrir: "Open",
    ouvrirAria: (nom: string) => `Open “${nom}”`,
    estimations: (n: number) => `${n} estimate${n > 1 ? "s" : ""}`,
    estimationNeuf: "Construction",
    estimationReno: "Renovation",
    estimationsChargement: "Loading…",
    estimationsErreur: "The estimates could not be loaded.",
    nouveauPlan: "New plan",
    nouveauReno: "New renovation project",
    limitePro: "With Pro: unlimited saved plans",
    voirTous: (n: number) => `See your ${n} plans`,
    voirMoins: "See less",
    surAppareil: "On this device",
    surAppareilNote: "This plan is in this browser, not in an account.",
    surAppareilNotePl: "These plans are in this browser, not in an account.",
    reprendre: (nom: string) => `Resume “${nom}”`,
    autresDansEditeur: "Open the others from “Mes plans” in the editor.",
    unDansEditeur: "Open it from “Mes plans” in the editor.",
    tousDansEditeur: "Open them from “Mes plans” in the editor.",
    garder: "Keep it in your account",
    garderSous: "Create your free account: you'll find it on all your devices.",
    ouvert: "open",
  },
  vitrine: {
    comment: "How it works",
    legende2d: "The plan in 2D: rooms, floor areas and dimensions, worked out by the editor.",
    legende3d: "The same house in 3D, in one click.",
    alt2d: "2D plan of a 94 m² single-storey house in the AVYORA editor: named rooms, floor areas, dimensions and furniture",
    alt3d: "The same 94 m² house in 3D in the AVYORA editor",
    gestesTitre: "In three steps",
    gestes: [
      { titre: "Trace the outline, then the partitions", texte: "Each room closes on its own and shows its floor area." },
      { titre: "Place doors, windows and fittings", texte: "They snap to the walls: bathroom, kitchen, furniture." },
      { titre: "View it in 3D, and price it", texte: "The 3D model is built from your plan, in one click. Building a house? “Chiffrer cette maison” opens its construction cost." },
    ],
    capacitesTitre: "What you can do",
    capacitesSous: "Everything below is in the editor today.",
    capacites: [
      "Walls, partitions and load-bearing walls, each at its own thickness",
      "Rooms detected on their own, with the floor area of each",
      "Doors and windows that snap to the walls",
      "Bathroom, kitchen and furniture to place",
      "Several levels, and the stairs between them",
      "Dimensions, to read every length",
      "Trace over a plan you already have: import its image and set its scale",
      "The plan check: recommended clearances, 9 m² and 2.20 m ceiling height from the French decent-housing decree",
      "The 3D view of your plan, and the walkthrough at eye level",
      "The PDF file of your plans",
    ],
    apresTitre: "After the plan?",
    construireTitre: "Building a house",
    construireTexte: "Your plan becomes the construction cost of your house: its rooms, floor area and levels are carried over.",
    construireLien: "Draw my house",
    gratuit: "Free",
    faqTitre: "Frequently asked questions",
    faq: [
      {
        q: "Do I need to install any software?",
        r: "No. The editor opens in your browser, on a computer or a tablet: nothing to download, nothing to install.",
      },
      {
        q: "Is it really free?",
        r: "Yes to draw your plan, view it in 3D, read its floor areas and keep one saved plan. Pro adds unlimited saved plans, the priced renovation project and the PDF file without watermark.",
      },
      {
        q: "Does it work on a phone?",
        r: "You can view your plans there. Drawing works on a computer or a tablet: from your phone, send yourself the link.",
      },
      {
        q: "Where are the plans I draw saved?",
        r: "On your device as long as you have no account. With an account, in your account: you'll find them on all your devices. Image layers stay on the device where you imported them.",
      },
      {
        q: "Can I start from a plan I already have?",
        r: "Yes: import the image of your plan as a layer, set its scale, then trace the walls over it.",
      },
      {
        q: "Is this plan enough for a building permit?",
        r: "No. It is a plan to design your house and price it. A French building permit requires standardised drawings (location plan, site plan, section, elevations), and an individual building for themselves must hire an architect as soon as the floor area (surface de plancher) or the building footprint (emprise au sol) exceeds 150 m².",
      },
    ],
    basTitre: "Draw your house, for free.",
    basSous: "Walls, rooms, floor areas and 3D, in your browser.",
    basCta: "Create my plan",
    renoverTitre: "Renovating",
    renoverTexte: "Start from your home as it is, decide your work: the budget follows every decision, trade by trade, all the way to site tracking.",
    renoverLien: "See what Pro adds",
    pro: "Pro",
    offresTitre: "Free or Pro",
    offresGratuitSous: "With or without an account.",
    offresProSous: "Everything that is free, plus:",
    offresVoir: "See Pro plans",
    gratuitListe: [
      "draw your final plan",
      "the floor areas and the plan check",
      "the 3D view of your plan",
      "the PDF file of your plans, watermarked",
      "1 saved plan",
    ],
    proListe: [
      "unlimited saved plans",
      "the PDF file of your plans without watermark, with the plan check and the floor areas",
      "the renovation project, to start from your home as it is and price what changes",
      "the task-by-task detail, with the price of each task",
      "site tracking with the price of each task, and what is already done",
    ],
  },
  choix: {
    titre: "Start from my plan",
    neufTexte: "Already picturing your house? Draw it: its rooms and floor area fill in the estimate.",
    neufLien: "Draw my house →",
    renoTexte: "Start from your home as it is: draw it, decide your work, the budget follows every decision.",
    renoLien: "Draw my home →",
    renoLienGratuit: "Unlock with Pro →",
    pro: "Pro",
    partirDe: (nom: string) => `Start from “${nom}” →`,
  },
  neuf: {
    avant: "No plan yet? ",
    lien: "Draw your house",
    apres: ": the estimate picks up its rooms and floor area.",
  },
  reprise: {
    enCours: "Saving your plan to your account…",
    ajoute: (nom: string) => `“${nom}” is in your account.`,
    autresRestent: "The others stay on this device.",
    limite: (autre: string) => `Your account already keeps “${autre}”. This plan stays on this device.`,
    limiteInconnu: "Your account already keeps another plan. This plan stays on this device.",
    plafond: "Your account has reached the maximum number of plans: delete one to save another. This plan stays on this device.",
    echec: (nom: string) => `“${nom}” could not be added to your account: it stays on this device. Open the editor to try again.`,
    ouvrirPlan: "Open the plan",
    ouvrirEditeur: "Open the editor",
    voirPro: "See Pro",
    fermer: "Close",
  },
  rappel: {
    titre: "Your plan is ready",
    texte: "Create your account: we'll keep it in “Mes plans” so you can open it anywhere.",
  },
  estimation: {
    nomProjet: (nom: string, surface: number) => `Renovation — “${nom}” · ${surface} m²`,
    eyebrow: "Detailed estimate",
    titreCreer: "Create your plan's estimate",
    titreMaj: "Update your plan's estimate",
    sous: (nom: string) => `From “${nom}”. Review what the plan filled in, then continue to the detail: you can still adjust everything.`,
    majDe: (nom: string) => `Estimate to update: “${nom}”.`,
    nouvelle: "Create a new estimate instead",
    leBien: "The property, taken from your plan",
    leBienNote: "You can correct everything in the detail, at the next step.",
    surface: "Area",
    type: "Type",
    niveaux: "Levels",
    pieces: "Rooms",
    sdb: "Bathrooms",
    wc: "Toilets",
    fenetres: "Windows",
    types: { Maison: "House", Studio: "Studio", T2: "2-room apartment", T3: "3-room apartment", T4: "4-room apartment" } as Record<string, string>,
    codePostal: "Property postcode (France)",
    codePostalAide: "It sets labour costs for your region.",
    envoi: "Preparing your estimate…",
    ouvrirPlan: "Open the plan",
    erreurs: {
      contrat_absent: "This plan has not been sent to the estimate yet. Open it in the editor, then click “Créer l'estimation détaillée”.",
      contrat_workflow: "This plan is a final plan: price it from the editor, with “Chiffrer cette maison”.",
      contrat_invalide: "This plan cannot be read. Open it in the editor and send it again.",
      introuvable: "This estimate is no longer linked to this plan.",
      code_postal: "Enter the property postcode (5 digits).",
      trop_volumineux: "This plan produces an estimate too large to be saved.",
      trop_de_requetes: "Too many attempts: try again in a minute.",
      pro_requis: "The detailed estimate is a Pro feature.",
      connexion_requise: "Your session has expired: sign in again, then retry.",
      erreur: "The estimate could not be created. Try again in a moment.",
      reseau: "No connection: try again in a moment.",
    } as Record<string, string>,
  },
  validation: {
    eyebrow: "Your plan",
    titre: "Check what the plan filled in",
    sous: "The quantities come from what you drew. Nothing is final: everything stays editable in the detail, item by item.",
    ajoutes: "added",
    misAJour: "updated",
    inchanges: "unchanged",
    aConfirmer: "to confirm",
    desaccord: "conflicting",
    aRegarder: "Look closely",
    aRegarderEpinglee: "A quantity you had corrected does not match what the plan measures.",
    aRegarderSous: "On these lines, the plan chose for you: check that it is what you want.",
    tuAsFixe: "You set",
    planMesure: "the plan measures",
    nouveau: "new",
    conflit: "Your entry is kept: the plan does not overwrite it. If its measurement is the right one, correct the quantity in the detail, at the next step.",
    reste: "The rest, measured on the plan",
    resteSous: "Nothing to decide here: these quantities were taken from your drawing.",
    vide: "Your plan does not include any priced item yet: the detail opens without quantities from the plan.",
    auForfait: "flat rate",
    continuer: "I've checked, continue to the detail",
  },
  lien: {
    vientDe: "From your plan",
    ouvrirPlan: "Open the plan",
    aChange: "Your plan has changed since this estimate.",
    aChangeSous: "Open your plan, then click “Mettre à jour l'estimation”: the lines you corrected by hand stay as they are.",
    mettreAJour: "Update",
    pro: "Pro",
    pastille: "From your plan",
    bande: "Your plans",
    bandeSous: "Reopen them in the editor, in 2D and 3D.",
    dessiner: "or start by drawing your plan",
  },
};

const DICTS: Record<Locale, DictPlans> = { fr, en };

export function dictPlans(locale: Locale): DictPlans {
  return DICTS[locale] ?? fr;
}

/** Nombres et dates à la mode de la langue (le site affiche « 94,2 m² » en FR, « 94.2 m² » en EN). */
export function formatsPlans(locale: Locale) {
  const tag = locale === "en" ? "en-US" : "fr-FR";
  const nombre = new Intl.NumberFormat(tag, { maximumFractionDigits: 1 });
  const date = new Intl.DateTimeFormat(tag, { day: "numeric", month: "short", year: "numeric" });
  return {
    m2: (n: number) => nombre.format(n),
    date: (iso: string | number) => {
      const d = new Date(iso);
      return Number.isNaN(d.getTime()) ? "" : date.format(d);
    },
  };
}

export type MessageReprise = { ok: boolean; texte: string; lien?: { href: string; label: string } };

/**
 * Ce que `ClaimPlan` dit après une reprise. `pro` n'ajoute ou ne retire que la phrase « Avec Pro… » :
 * la limite elle-même est tenue par le serveur (402).
 */
export function messageReprise(r: ResultatReprise, t: DictPlans, pro: boolean): MessageReprise | null {
  const avecPro = pro ? "" : " " + t.commun.avecPro;
  switch (r.etat) {
    case "ajoute":
      return {
        ok: true,
        texte: t.reprise.ajoute(r.nom) + (r.autres > 0 ? " " + t.reprise.autresRestent + avecPro : ""),
        lien: { href: `/plan?id=${encodeURIComponent(r.id)}`, label: t.reprise.ouvrirPlan },
      };
    case "limite":
      return {
        ok: false,
        /* nom du plan du compte inconnu : une phrase sans guillemets (ils citent un nom, pas « un autre plan ») */
        texte: (r.autre ? t.reprise.limite(r.autre) : t.reprise.limiteInconnu) + " " + t.commun.avecPro,
        lien: { href: "/tarifs?source=editeur-plan", label: t.reprise.voirPro },
      };
    case "plafond":
      return { ok: false, texte: t.reprise.plafond };
    case "echec":
      return { ok: false, texte: t.reprise.echec(r.nom), lien: { href: "/plan", label: t.reprise.ouvrirEditeur } };
    default:
      return null;
  }
}
