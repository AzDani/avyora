import type { Locale } from "./config";
import type { ResultatReprise } from "@/lib/plans/local";

/**
 * « Mes plans » (éditeur de plan en ligne) : textes du SITE autour de l'éditeur, en FR et en EN.
 * Importé seulement par la vitrine `/logiciel-plan-maison`, `TesPlans`, `ClaimPlan` et `PlanRappel` :
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
    creerSous: "Murs, pièces et surfaces, portes et fenêtres, vue 3D : tout se passe dans ton navigateur.",
    dessinNote: "Le dessin se fait sur ordinateur ou tablette.",
    envoyerLien: "M'envoyer le lien",
    copierLien: "Copier le lien",
    lienCopie: "Lien copié : ouvre-le sur ton ordinateur ou ta tablette.",
    lienPartageTitre: "Mon plan de maison sur AVYORA",
    lienPartageTexte: "Dessiner mon plan de maison, sur ordinateur ou tablette :",
    chargement: "Chargement de tes plans…",
    tesPlans: "Tes plans",
    aucunPlan: "Aucun plan dans ton compte pour l'instant. Ton premier plan s'y range dès que tu dessines.",
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
    majDe: (nom: string) => `Estimation mise à jour : « ${nom} ».`,
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
  },
  page: {
    eyebrow: "Free 3D plan",
    titre: "Draw your house plan for free, and see it in 3D",
    sous: "Draw your walls with the mouse: rooms close on their own and show their area. Add doors, windows and fittings, switch to 3D in one click. In your browser, nothing to install.",
    enFrancais: "The editor is in French for now.",
  },
  hub: {
    creer: "Create my plan, free",
    creerSous: "Walls, rooms and areas, doors and windows, 3D view: it all happens in your browser.",
    dessinNote: "Drawing works on a computer or a tablet.",
    envoyerLien: "Send me the link",
    copierLien: "Copy the link",
    lienCopie: "Link copied: open it on your computer or tablet.",
    lienPartageTitre: "My house plan on AVYORA",
    lienPartageTexte: "Draw my house plan, on a computer or a tablet:",
    chargement: "Loading your plans…",
    tesPlans: "Your plans",
    aucunPlan: "No plans in your account yet. Your first plan is saved here as soon as you draw.",
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
    majDe: (nom: string) => `Estimate being updated: “${nom}”.`,
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
