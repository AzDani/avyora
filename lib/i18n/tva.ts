/**
 * Textes HT / TTC et TVA (25/11/2026, maquette V4 validée par Dani) : réglages du projet, retouches d'une
 * ligne, total, budget réel et taxes payées. Au tutoiement, en français et en anglais.
 */
import type { Locale } from "@/lib/i18n/config";
import type { RaisonTaux, AlerteTaux } from "@/lib/estimateur/tva";

const pctFr = (t: number): string => String(t).replace(".", ",") + " %";
const pctEn = (t: number): string => String(t) + "%";
const sFr = (n: number): string => (n > 1 ? "s" : "");

const fr = {
  pct: pctFr,
  reglages: {
    payeurT: "Qui paie les travaux ?",
    particulier: "Particulier", pro: "Professionnel",
    payeurAide: (pro: boolean): string => (pro ? "Tu récupères la TVA : ton vrai coût est le HT." : "Tu paies la TVA : ton vrai coût est le TTC."),
    affichageT: "Afficher les prix",
    ttc: "TTC", ht: "HT",
    affichageAide: "Change seulement l'affichage : le calcul reste le même.",
    quiT: "Qui fait les travaux ?",
    artisans: "Artisans", moi: "Moi", casParCas: "Au cas par cas",
    quiAide: (q: "art" | "soi" | "mix" | null): string =>
      q === "mix" ? "Une partie par toi, une partie par des artisans. « Artisans » ou « Moi » repasse tout d'un coup."
        : q == null ? "Coche des postes pour choisir qui les fait." : "Tu peux ensuite changer ligne par ligne.",
    retouches: (n: number): string => (n ? `${n} retouche${sFr(n)} de taux ou de prix (trait violet)` : "Taux et prix : tout est en automatique."),
    toutAuto: "Tout remettre en automatique",
    confirmer: (n: number): string => `Effacer ${n} retouche${sFr(n)} (taux forcés et prix tapés) ? Les quantités ne bougent pas.`,
    oui: "Oui, tout remettre", annuler: "Annuler",
  },
  ligne: {
    chip: (t: string): string => `TVA ${t}`,
    auto: "auto", modifiee: "modifiée",
    titre: "Taux de TVA de cette ligne",
    automatique: (t: string): string => `Automatique (${t})`,
    raisons: {
      location: "Location de matériel : 20 %.",
      neuf: "Construction neuve : 20 % partout.",
      local: "Logement de moins de 2 ans ou local pro : 20 %.",
      soi: "Tu achètes les matériaux toi-même : 20 %, comme en magasin.",
      option: "Le taux suit l'option choisie sur la ligne.",
      energie: "Facture d'artisan en rénovation énergétique : 5,5 %.",
      reduit: "Facture d'artisan dans un logement de plus de 2 ans : 10 %.",
      plein: "Taux normal : 20 %.",
    } as Record<RaisonTaux, string>,
    alertes: {
      soi: "Un taux réduit ne vaut que sur une facture d'artisan qui fournit et pose. Sur des matériaux achetés toi-même, c'est 20 %.",
      neuf: "En neuf, dans un logement de moins de 2 ans ou un local pro, les taux réduits ne s'appliquent pas.",
      energie: "5,5 % : seulement pour les travaux d'économie d'énergie. Le taux doit figurer sur le devis de l'artisan.",
    } as Record<Exclude<AlerteTaux, null>, string>,
    prixT: "Tes prix tapés",
    prixFait: "Fait faire", prixSoi: "Je le fais",
    saisiEn: "saisi en",
    prixAide: "Un prix se tape dans l'affichage choisi (HT ou TTC) et ce chiffre reste fixe, même si le taux change.",
    revenir: "Revenir à l'automatique",
    retouchee: "Ligne retouchée : elle ne suit plus les réglages du projet pour ce que tu as changé.",
    suit: "Cette ligne suit les réglages du projet.",
    fermer: "Fermer",
  },
  total: {
    unite: (ht: boolean): string => (ht ? "€ HT" : "€ TTC"),
    rappelHt: (ttc: string): string => `Ce n'est pas ce que tu paieras : tu paieras ${ttc} TTC.`,
    rappelPro: (tva: string, ht: string): string => `TVA récupérable : ${tva}. Ton vrai coût : ${ht} HT.`,
    parTaux: (t: string, base: string): string => `TVA ${t} sur ${base}`,
    tvaRecup: "TVA (récupérable)",
    sansTva: "Sans TVA",
    /** En affichage HT, les légendes du devis qui disaient « TTC ». */
    repSousHt: "Montants HT — où part ton budget",
    detailSousHt: "Ta sélection, ligne par ligne (HT)",
  },
  budget: {
    base: (pro: boolean): string => (pro
      ? "Compté en HT : tu as choisi « Professionnel » dans l'estimation, tu récupères la TVA."
      : "Compté en TTC, ce que tu paies vraiment. Chaque dépense garde aussi sa TVA."),
    tuileTva: (pro: boolean): string => (pro ? "TVA récupérable" : "TVA payée"),
    tuileTvaS: (n: number, sans: number): string => `sur ${n} dépense${sFr(n)}` + (sans ? ` · ${sans} sans TVA renseignée` : ""),
    taxesT: "Taxes payées",
    taxesSous: (pro: boolean): string => (pro
      ? "Chaque dépense garde son taux de TVA. AVYORA additionne tout : tu sais combien de TVA tu peux récupérer, taux par taux."
      : "Chaque dépense garde son taux de TVA. AVYORA additionne tout : à la fin du chantier, tu sais exactement combien de taxes tu as payées sur tes travaux."),
    taxesK: (pro: boolean): string => (pro ? "TVA à récupérer depuis le début du chantier" : "TVA payée depuis le début du chantier"),
    taxesPart: (ttc: string, p: string): string => `Sur ${ttc} TTC de factures, soit ${p} de ce que tu as versé.`,
    taxesPrevu: (prevu: string, p: string): string => `TVA prévue par l'estimation pour tout le projet : ${prevu}. Déjà payée : ${p}.`,
    sansTvaNote: (n: number): string => `${n} dépense${sFr(n)} enregistrée${sFr(n)} avant ce suivi n'${n > 1 ? "ont" : "a"} pas de TVA renseignée : elle${sFr(n)} ne compte${n > 1 ? "nt" : ""} pas dans ce total.`,
    colTaux: "Taux", colNb: "Dépenses", colHt: "Montant HT", colTva: "TVA", total: "Total",
    multi: "Factures à plusieurs taux", sans: "Sans TVA",
    dontTva: (pro: boolean): string => (pro ? "TVA récupérable" : "dont TVA"),
    formTaux: "TVA de la facture",
    formSans: "Sans TVA", formMulti: "Plusieurs taux",
    formMultiPh: "Montant de TVA écrit sur la facture",
    formMultiAide: "Facture avec plusieurs taux (ex. 5,5 % et 10 %) : tape le montant total de TVA écrit en bas de la facture.",
    formPropose: (t: string, pourquoi: string, choisi: string | null): string =>
      `Proposé : ${t} (${pourquoi}).` + (choisi ? ` Tu as choisi ${choisi} : on garde le taux écrit sur ta facture.` : " Change-le si ta facture dit autre chose."),
    pourquoi: { materiel: "location ou achat d'outils", mat: "matériaux achetés en magasin", neuf: "neuf ou local pro", energie: "facture d'artisan, rénovation énergétique", reduit: "facture d'artisan, logement de plus de 2 ans" },
    montantT: (ttc: boolean): string => (ttc ? "Montant TTC (€)" : "Montant HT (€)"),
    recapHt: "Montant HT", recapTva: (t: string): string => `TVA ${t}`, recapTtc: "Montant TTC",
    ligneTva: (t: string, v: string): string => `TVA ${t} · ${v}`,
    tvaInconnue: "TVA non renseignée",
    plusieurs: "plusieurs taux",
    erreurMulti: "La TVA doit être plus petite que le montant TTC.",
  },
};

const en: typeof fr = {
  pct: pctEn,
  reglages: {
    payeurT: "Who pays for the work?",
    particulier: "Private individual", pro: "Business",
    payeurAide: (pro) => (pro ? "You reclaim the VAT: your real cost is excl. VAT." : "You pay the VAT: your real cost is incl. VAT."),
    affichageT: "Show prices",
    ttc: "incl. VAT", ht: "excl. VAT",
    affichageAide: "Only changes what you see: the calculation stays the same.",
    quiT: "Who does the work?",
    artisans: "Tradespeople", moi: "Me", casParCas: "Case by case",
    quiAide: (q) => (q === "mix" ? "Some by you, some by tradespeople. “Tradespeople” or “Me” switches everything at once."
      : q == null ? "Tick items to choose who does them." : "You can then change it line by line."),
    retouches: (n) => (n ? `${n} rate or price change${n > 1 ? "s" : ""} (purple line)` : "Rates and prices: everything is automatic."),
    toutAuto: "Reset everything to automatic",
    confirmer: (n) => `Clear ${n} change${n > 1 ? "s" : ""} (forced rates and typed prices)? Quantities stay as they are.`,
    oui: "Yes, reset everything", annuler: "Cancel",
  },
  ligne: {
    chip: (t) => `VAT ${t}`,
    auto: "auto", modifiee: "changed",
    titre: "VAT rate for this line",
    automatique: (t) => `Automatic (${t})`,
    raisons: {
      location: "Equipment hire: 20%.",
      neuf: "New build: 20% on everything.",
      local: "Home under 2 years old or business premises: 20%.",
      soi: "You buy the materials yourself: 20%, as in a shop.",
      option: "The rate follows the option chosen on the line.",
      energie: "Tradesperson's invoice for energy-efficiency work: 5.5%.",
      reduit: "Tradesperson's invoice in a home over 2 years old: 10%.",
      plein: "Standard rate: 20%.",
    },
    alertes: {
      soi: "A reduced rate only applies to a tradesperson's invoice for supply and fitting. On materials you buy yourself, it's 20%.",
      neuf: "In a new build, a home under 2 years old or business premises, reduced rates don't apply.",
      energie: "5.5%: only for energy-saving work. The rate must appear on the tradesperson's quote.",
    },
    prixT: "Your typed prices",
    prixFait: "Hire a pro", prixSoi: "DIY",
    saisiEn: "entered",
    prixAide: "A price is typed in the chosen view (excl. or incl. VAT) and that figure stays fixed, even if the rate changes.",
    revenir: "Back to automatic",
    retouchee: "Changed line: it no longer follows the project settings for what you changed.",
    suit: "This line follows the project settings.",
    fermer: "Close",
  },
  total: {
    unite: (ht) => (ht ? "excl. VAT" : "incl. VAT"),
    rappelHt: (ttc) => `That's not what you'll pay: you'll pay ${ttc} incl. VAT.`,
    rappelPro: (tva, ht) => `Reclaimable VAT: ${tva}. Your real cost: ${ht} excl. VAT.`,
    parTaux: (t, base) => `VAT ${t} on ${base}`,
    tvaRecup: "VAT (reclaimable)",
    sansTva: "No VAT",
    repSousHt: "Amounts excl. VAT — where your budget goes",
    detailSousHt: "Your selection, line by line (excl. VAT)",
  },
  budget: {
    base: (pro) => (pro
      ? "Counted excl. VAT: you chose “Business” in the estimate, you reclaim the VAT."
      : "Counted incl. VAT, what you actually pay. Each expense also keeps its VAT."),
    tuileTva: (pro) => (pro ? "Reclaimable VAT" : "VAT paid"),
    tuileTvaS: (n, sans) => `on ${n} expense${n > 1 ? "s" : ""}` + (sans ? ` · ${sans} without VAT entered` : ""),
    taxesT: "Taxes paid",
    taxesSous: (pro) => (pro
      ? "Each expense keeps its VAT rate. AVYORA adds it all up: you know how much VAT you can reclaim, rate by rate."
      : "Each expense keeps its VAT rate. AVYORA adds it all up: at the end of the work, you know exactly how much tax you paid on it."),
    taxesK: (pro) => (pro ? "VAT to reclaim since the start of the work" : "VAT paid since the start of the work"),
    taxesPart: (ttc, p) => `On ${ttc} of invoices incl. VAT, i.e. ${p} of what you paid.`,
    taxesPrevu: (prevu, p) => `VAT planned in the estimate for the whole project: ${prevu}. Paid so far: ${p}.`,
    sansTvaNote: (n) => `${n} expense${n > 1 ? "s" : ""} logged before this tracking ${n > 1 ? "have" : "has"} no VAT entered: not counted in this total.`,
    colTaux: "Rate", colNb: "Expenses", colHt: "Excl. VAT", colTva: "VAT", total: "Total",
    multi: "Invoices with several rates", sans: "No VAT",
    dontTva: (pro) => (pro ? "Reclaimable VAT" : "incl. VAT"),
    formTaux: "Invoice VAT",
    formSans: "No VAT", formMulti: "Several rates",
    formMultiPh: "VAT amount shown on the invoice",
    formMultiAide: "Invoice with several rates (e.g. 5.5% and 10%): type the total VAT shown at the bottom of the invoice.",
    formPropose: (t, pourquoi, choisi) => `Suggested: ${t} (${pourquoi}).` + (choisi ? ` You chose ${choisi}: we keep the rate on your invoice.` : " Change it if your invoice says otherwise."),
    pourquoi: { materiel: "tool hire or purchase", mat: "materials bought in a shop", neuf: "new build or business premises", energie: "tradesperson's invoice, energy-efficiency work", reduit: "tradesperson's invoice, home over 2 years old" },
    montantT: (ttc) => (ttc ? "Amount incl. VAT (€)" : "Amount excl. VAT (€)"),
    recapHt: "Excl. VAT", recapTva: (t) => `VAT ${t}`, recapTtc: "Incl. VAT",
    ligneTva: (t, v) => `VAT ${t} · ${v}`,
    tvaInconnue: "VAT not entered",
    plusieurs: "several rates",
    erreurMulti: "The VAT must be lower than the amount incl. VAT.",
  },
};

export type DictTva = typeof fr;
export function dictTva(locale: Locale): DictTva {
  return locale === "en" ? en : fr;
}
