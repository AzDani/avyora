"use client";

/**
 * Section « Investissement » de la fiche projet (module M3) : la case « c'est un investissement », la saisie
 * (achat, crédit, loyers, charges, foyer fiscal, hypothèses) et la comparaison des régimes de location après
 * impôts. Calculs : lib/investissement (règles : docs/investissement/regles-fiscales-2026.md). Enregistrement
 * automatique dans `reponses.invest` via /api/projects/[id]/investissement. Styles repris du suivi de chantier
 * (.card, .sub, .prog, .phase-t d'EstimationResultat) ; le reste est scopé .av-inv.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "@/components/i18n/LangProvider";
import { euros, pourcent, nombre, lireMontant } from "@/lib/i18n/nombres";
import { simulerLocation, REGIMES, type Regime, type ResultatRegime, type Alerte } from "@/lib/investissement/location";
import { entreeDepuisSaisie, completer, travauxRetenus, entreeRevente, completerRevente, type ChampNum, type ChampRevente, type ContexteProjet, type SaisieInvest, type SaisieLocation, type SaisieRevente } from "@/lib/investissement/saisie";
import { simulerRevente, CADRES, type CadreRevente, type ResultatCadre, type AlerteRevente } from "@/lib/investissement/revente";
import { conseilsLocation, conseilsRevente, ecartLocation, ecartRevente, type CleConseilLocation, type CleConseilRevente } from "@/lib/investissement/conseils";
import { fraisNotaire } from "@/lib/investissement/impot";
import { MAJORATION_MEUBLE } from "@/lib/investissement/regles";
import type { Marche } from "@/lib/marche/serveur";

const TR = {
  fr: {
    titre: "Investissement",
    subOff: "Tu achètes pour louer ou pour revendre ? AVYORA calcule ce que l'opération te rapporte, après impôts, régime par régime.",
    activer: "Oui, c'est un investissement",
    desactiver: "Ce n'est pas un investissement",
    sub: "Ce que l'opération te rapporte chaque mois après impôts, et le régime fiscal le plus intéressant pour toi.",
    location: "Location", revente: "Achat-revente", bientot: "bientôt",
    groupes: { achat: "Achat", credit: "Crédit", loyers: "Loyers", charges: "Charges du propriétaire", foyer: "Ton foyer fiscal", hypo: "Hypothèses" },
    champs: {
      prix: "Prix d'achat", surface: "Surface habitable", fraisNotaire: "Frais de notaire", fraisAgence: "Frais d'agence", travaux: "Travaux",
      travauxDeductiblesPct: "Travaux déductibles en location nue", mobilier: "Mobilier (meublé)", valeurApres: "Valeur du bien après travaux",
      apport: "Apport", taux: "Taux du crédit", dureeAns: "Durée", assurancePct: "Assurance emprunteur (du capital, par an)", fraisDossier: "Frais de dossier et de garantie",
      loyerNu: "Loyer mensuel nu (hors charges)", loyerMeuble: "Loyer mensuel meublé (hors charges)", loyerBailleurPrive: "Loyer plafonné du statut du bailleur privé", vacanceMois: "Vacance locative par an",
      taxeFonciere: "Taxe foncière (hors ordures ménagères)", coproNonRecup: "Charges de copropriété non récupérables", pno: "Assurance propriétaire non occupant",
      gestionPct: "Gestion locative (des loyers)", entretien: "Entretien et petites réparations", cfe: "CFE (meublé)",
      revenu: "Revenu net imposable du foyer (sans ce projet)", parts: "Nombre de parts",
      horizon: "Durée de la simulation", indexLoyers: "Hausse des loyers par an", indexCharges: "Hausse des charges par an", indexRevenu: "Hausse de tes revenus par an",
      terrainPct: "Part du terrain (non amortissable)", comptableLmnp: "Comptable LMNP réel, par an", comptableSciIr: "Comptable SCI à l'IR, par an",
      comptableIs: "Comptable société à l'IS, par an (TTC)", creationSociete: "Création de la société",
    } as Record<ChampNum, string>,
    neuf: "Logement neuf (frais de notaire réduits)", collectif: "Appartement dans un immeuble collectif", immeuble15: "Immeuble achevé depuis plus de 15 ans",
    couple: "Déclaration commune (marié ou pacsé)", reno: "Rénovation énergétique : de E, F ou G vers A à D (déficit jusqu'à 21 400 €)",
    suiviReel: "Travaux : suivre la prévision des dépenses réelles", niveauBP: "Loyer du statut du bailleur privé",
    niveaux: { intermediaire: "Intermédiaire", social: "Social", tres_social: "Très social" },
    auto: "auto", sourceTravaux: { estimation: "repris de l'estimation", reel: "prévision des dépenses réelles", saisie: "saisi" },
    unites: { mois: "mois", ans: "ans" },
    manque: "Indique le prix d'achat, le loyer et les revenus de ton foyer : le résultat apparaît tout de suite.",
    parMois: "€/mois", moyenne: (n: number) => `par mois après impôts, en moyenne sur ${n} ans`,
    avec: "avec", autofinance: (m: string) => `Autofinancé : l'opération te rapporte ${m} par mois`,
    effort: (m: string) => `Effort d'épargne : ${m} par mois à prévoir`,
    coutTotal: "Coût total", brut: "Rendement brut", brutMeuble: "Brut meublé", net: "Net de charges", mensualite: "Mensualité", valeurCreee: "Valeur créée",
    comparer: "Comparer les régimes", surAns: (n: number) => `sur ${n} ans`,
    hRegime: "Régime", hAn1: "Année 1", hMoy: "Moyenne", hImpots: "Impôts cumulés", hEcart: "Écart",
    parMoisCourt: "/mois", meilleur: "Le meilleur", nonEligible: "Non éligible", aConfirmer: "nouveau, à confirmer",
    detail: "Détail année par année", tAnnee: "Année", tLoyers: "Loyers", tCharges: "Charges", tCredit: "Crédit", tImpot: "Impôt", tPs: "Prél. sociaux", tPfu: "PFU", tCf: "Cash-flow",
    tresoFinale: (m: string) => `Dont ${m} laissés dans la société à la fin, comptés après PFU.`,
    regimes: {
      nu_micro: "Location nue · micro-foncier", nu_reel: "Location nue · régime réel", bailleur_prive: "Location nue · statut du bailleur privé",
      sci_ir: "SCI à l'IR · location nue", is_nu: "Société à l'IS · location nue",
      lmnp_micro: "Meublé LMNP · micro-BIC", lmnp_reel: "Meublé LMNP · régime réel", is_meuble: "Société à l'IS · meublé",
    } as Record<Regime, string>,
    raisons: {
      micro_foncier_plafond: "loyers au-delà de 15 000 € par an", micro_bic_plafond: "loyers au-delà de 83 600 € par an",
      bailleur_prive_maison: "réservé aux immeubles collectifs", bailleur_prive_travaux: "travaux sous 30 % du prix d'achat",
      lmp: "loueur meublé professionnel : cotisations sociales non calculées",
    },
    alertes: {
      lmp: "Tes loyers meublés dépasseraient 23 000 € et tes autres revenus : tu deviendrais loueur meublé professionnel (LMP), avec des cotisations sociales que ce simulateur ne calcule pas.",
      micro_foncier_depasse: "Avec la hausse des loyers, tu dépasseras 15 000 € par an : le micro-foncier ne sera plus possible ces années-là.",
      micro_bic_depasse: "Avec la hausse des loyers, tu dépasseras 83 600 € par an : le micro-BIC ne sera plus possible ces années-là.",
      bailleur_prive_conditions: "Régime créé par le budget 2026, en attente des commentaires officiels : immeuble collectif, loyer plafonné au niveau choisi (indique-le dans « Loyers »), location nue en résidence principale pendant 9 ans, achat jusqu'au 31/12/2028.",
      deficit_3ans: "Le déficit imputé sur ton revenu t'oblige à louer nu jusqu'au 31 décembre de la 3e année qui suit.",
      is_sans_revente: "À l'IS, la revente taxe tous les amortissements, sans abattement : sans revente, cette simulation avantage l'IS.",
      sci_ir_comptable: "En location nue, la SCI ajoute des frais (comptable, création) sans avantage fiscal : son intérêt est surtout la transmission.",
    } as Record<Alerte, string>,
    avertissement: "Simulation indicative selon les règles fiscales en vigueur au 19/10/2026, à valider avec un expert-comptable. Hypothèses : mise en location au 1er janvier de l'année 1, pas d'autres revenus fonciers ni meublés dans le foyer, impôt compté l'année des loyers (l'IS l'année suivante), barème de l'impôt revalorisé comme tes revenus, mobilier non renouvelé, travaux amortis sur 15 ans en meublé et en société (en construction neuve, la maison s'amortit comme un bâti et le terrain jamais), pas de revente.",
    terrain: "Le prix d'achat est celui d'un terrain à bâtir (construction neuve, terrain acheté à un particulier)",
    prixTerrain: "Prix du terrain",
    choix: "Le régime que tu envisages", pasChoisi: "Pas encore choisi", tonChoix: "Ton choix",
    choixBon: (c: string) => `Bon choix : ${c} est le régime le plus intéressant pour ce projet.`,
    choixPerte: (c: string, p: string, h: number, m: string) => `Avec ${c}, tu gagnerais ${p} de moins sur ${h} ans qu'avec ${m}.`,
    choixImpots: (i: string) => ` Dont ${i} d'impôts en plus.`,
    choixHorsImpots: " L'écart vient des frais et des loyers, pas des impôts.",
    choixNonEligible: (c: string, r: string, m: string) => `${c} n'est pas possible ici (${r}). Le meilleur régime possible : ${m}.`,
    astuces: "Pour payer moins d'impôts", astucesMeta: (n: number) => `${n} piste${n > 1 ? "s" : ""}`,
    gainSur: (m: string, n: number) => `+${m} sur ${n} ans`, aSavoir: "À savoir",
    conseils: {
      deficit_reno: () => "Si tes travaux font passer le logement d'une classe énergie E, F ou G à A, B, C ou D, le déficit foncier imputable sur ton revenu monte jusqu'à 21 400 € par an au lieu de 10 700 € (dépenses payées jusqu'au 31/12/2027, option à cocher sur la déclaration 2044). Garde les DPE d'avant et d'après.",
      etaler_travaux: (n: number) => `Paie tes travaux sur ${n} années civiles (par exemple une partie en décembre, le reste en janvier) : chaque année ouvre son propre plafond de 10 700 € imputable sur ton revenu, au lieu d'un seul.`,
      terrain_ventilation: (p: number) => `La part du terrain (${p} % ici) ne s'amortit pas. Si elle est réellement plus faible, fais-la justifier (rapport d'expert, acte, prix des terrains voisins) : 5 points de moins rapportent ce montant. Le fisc peut contester une part non justifiée.`,
      is_compte_courant: () => "En société, apporte ton argent en compte courant d'associé plutôt qu'en capital : il te sera remboursé sans impôt avant tout dividende (c'est ce que suppose la simulation). Les dividendes, eux, paient le PFU de 31,4 %.",
      lmnp_revente: () => "À la revente, les amortissements déduits en LMNP réel sont retirés du prix d'achat pour calculer la plus-value (depuis 2025). L'impôt économisé pendant la location reste en général bien supérieur, surtout si tu gardes le bien longtemps (abattements pour durée de détention).",
      sci_ir_transmission: () => "Une SCI à l'IR n'économise pas d'impôt sur les loyers : elle sert à transmettre ou à acheter à plusieurs. Si ce n'est pas ton but, la détention en direct coûte moins cher.",
    } as Record<CleConseilLocation, (v: number) => string>,
    mk: {
      commune: "Commune",
      chargement: "Recherche des prix du marché…",
      loyer: (c: string, m: string) => `Marché à ${c} : loyers d'annonce non meublés de la carte des loyers ${m} (ANIL), charges estimées retirées.`,
      loyerVal: (hc: string, bas: string, haut: string) => `${hc} €/m² hors charges · fourchette ${bas} à ${haut} €/m²`,
      loyerConseil: (nu: string, meuble: string, p: string) => `Pour ta surface : environ ${nu} par mois en nu, ${meuble} en meublé (+${p}).`,
      peuFiable: "Peu d'annonces dans la commune : indicateur à prendre avec prudence.",
      encadre: (c: string) => `Loyers encadrés à ${c} : le loyer ne peut pas dépasser le loyer de référence majoré de ton quartier, même si le marché est plus haut. Vérifie-le sur le simulateur officiel de ta ville.`,
      utiliser: "Utiliser ces loyers", utiliserPrix: (m: string) => `Utiliser ${m}`,
      loyerTropHaut: (k: string, x: string, h: string) => `Ton loyer ${k} (${x} €/m²) dépasse le haut de la fourchette du marché (${h} €/m²) : il risque de ne pas se louer à ce prix, et toute la simulation en dépend.`,
      nu: "nu", meuble: "meublé",
      ventes: (n: number, t: string, proche: boolean, c: string, d: string, f: string) => `${n} ${t} ${proche ? "de surface proche " : ""}vendus à ${c} entre ${d} et ${f} (DVF, ventes notariées).`,
      types: { appartement: "appartements", maison: "maisons" },
      ventesVal: (med: string, p25: string, p75: string) => `Médiane ${med} €/m² · la moitié des ventes entre ${p25} et ${p75} €/m²`,
      ventesConseil: (bas: string, haut: string) => `Pour ta surface : ${bas} (prix médian) à ${haut} (haut de fourchette). Un bien rénové vise plutôt le haut.`,
      neufNote: "Les ventes publiques sont surtout de l'ancien : une maison neuve se vend en général plus cher.",
      exemples: "Voir les ventes les plus proches",
      horsDvf: "Pas de données publiques de ventes en Alsace-Moselle ni à Mayotte : pas de fourchette de prix ici.",
      peuDeVentes: "Trop peu de ventes comparables dans la commune pour donner une fourchette de prix.",
      indisponible: "Les données de ventes sont indisponibles pour le moment.",
      revTropHaut: (x: string, p90: string) => `Ton prix de revente (${x} €/m²) est au-dessus de 90 % des ventes du secteur (${p90} €/m²) : l'opération repose sur un prix hors marché.`,
      revHaut: (x: string, p75: string) => `Ton prix de revente (${x} €/m²) dépasse 3 ventes sur 4 du secteur (${p75} €/m²) : réaliste seulement pour un bien très bien rénové ou placé.`,
      source: "Sources : DVF (DGFiP, Etalab) ; estimations ANIL à partir des données du Groupe SeLoger et de leboncoin.",
    },
    rv: {
      groupe: "Revente",
      sub: "Ce que l'opération te rapporte après impôts, selon le cadre dans lequel tu achètes et revends.",
      champs: {
        prixRevente: "Prix de revente", dureeMois: "Durée de l'opération (achat → vente)", fraisAgenceVente: "Frais d'agence à la vente",
        diagnostics: "Diagnostics de vente", mainlevee: "Mainlevée d'hypothèque", travauxEntreprisePct: "Part des travaux d'amélioration faits par des entreprises (comptée dans la plus-value)",
        chargesPortage: "Charges pendant l'opération, par an (copropriété, assurance, énergie)",
      } as Record<ChampRevente, string>,
      habite: "J'habite le bien jusqu'à la vente (résidence principale)",
      primo: "Primo-accédant : pas propriétaire de ta résidence principale depuis 2 ans",
      etatNeuf: "Rénovation lourde qui rend le bien neuf (structure, façades, ou 2/3 de chaque lot de second œuvre)",
      sansIra: "Pas d'indemnités de remboursement anticipé (prêt relais ou indemnités négociées)",
      vendeurs: "Nombre de vendeurs", unVendeur: "1 vendeur", deuxVendeurs: "2 vendeurs (couple, indivision)",
      auto03: "0,3 % du prêt",
      manque: "Indique le prix d'achat (bloc « Achat ») et le prix de revente : le résultat apparaît tout de suite.",
      net: (m: number) => `net après impôts, en ${m} mois`,
      parAn: (p: string) => `Soit ${p} par an sur l'argent que tu engages`,
      perte: (m: string) => `Opération à perte : il faudrait revendre au moins ${m}`,
      coutOp: "Coût de l'opération", mise: "Ton argent engagé", prixMin: "Prix de revente minimum", duree: "Durée",
      comparer: "Comparer les cadres", enMois: (m: number) => `en ${m} mois`,
      hCadre: "Cadre", hAvant: "Avant impôts", hImpots: "Impôts", hNet: "Net", hAn: "Par an", hMin: "Prix minimum",
      cadres: { particulier: "Particulier · plus-value immobilière", residence_principale: "Résidence principale · exonérée", marchand_biens: "Marchand de biens · société à l'IS" } as Record<CadreRevente, string>,
      raisons: { rp_pas_habite: "seulement si tu y habites jusqu'à la vente", particulier_habite: "tu y habites : c'est ta résidence principale", mdb_habite: "une société ne vend pas ta résidence principale" },
      lignes: {
        prixRevente: "Prix de revente", fraisVente: "Frais de vente (agence, diagnostics, mainlevée)", achat: "Achat et frais d'achat", travaux: "Travaux",
        credit: "Crédit (intérêts, assurance, frais, indemnités)", portage: "Charges pendant l'opération", sanction: "Droits de mutation rappelés (revente après 5 ans)",
        tva: "TVA sur le prix de revente", gainAvant: "Gain avant impôts", impotPV: "Impôt sur la plus-value", isPfu: "Impôt sur les sociétés, puis PFU", gainNet: "Gain net",
      } as Record<string, string>,
      pv: (pv: string, n: number, ir: string, ps: string, st: string) => `Plus-value imposable : ${pv} · détention ${n} an${n > 1 ? "s" : ""} plein${n > 1 ? "s" : ""} · abattement ${ir} (impôt) et ${ps} (prélèvements sociaux) · surtaxe ${st}`,
      alertes: {
        rp_courte: "Moins de 12 mois d'occupation : il n'y a pas de durée minimale, mais le fisc peut contester si l'occupation ne lui paraît pas réelle. Garde des preuves (factures, courrier, assurance).",
        rp_requalification: "Enchaîner les achats-reventes de ta résidence principale peut te faire requalifier en marchand de biens : plus d'exonération, impôt sur le revenu et cotisations sociales. L'exonération n'est jamais garantie.",
        particulier_requalification: "Des achats-reventes réguliers, avec l'intention de revendre dès l'achat, peuvent te faire requalifier en marchand de biens et imposer comme un professionnel.",
        mdb_conditions: "Marchand de biens : société assujettie à la TVA, engagement de revendre sous 5 ans pour les droits réduits, comptabilité commerciale. Le gain est imposé à l'IS, puis au PFU quand tu te le verses. Les indemnités de remboursement anticipé d'un prêt à une société dépendent du contrat (pas de plafond légal).",
        mdb_sanction: "Revente après 5 ans : les droits de mutation normaux sont rappelés, avec 0,20 % d'intérêt de retard par mois depuis l'achat (compté ici jusqu'à la vente ; une régularisation spontanée à 5 ans coûte moins).",
        mdb_tva_neuf: "Bien neuf ou rendu neuf par les travaux : la revente supporte une TVA de 20 % sur le prix total ; la TVA des travaux est récupérée.",
        moins_value: "Moins-value : aucun impôt, mais elle ne se reporte sur aucune autre opération.",
      } as Record<AlerteRevente, string>,
      choix: "Le cadre que tu envisages",
      choixBon: (c: string) => `Bon choix : ${c} est le cadre le plus intéressant pour cette opération.`,
      choixPerte: (c: string, p: string, m: string) => `Avec ${c}, tu gagnerais ${p} de moins qu'avec ${m}.`,
      choixNonEligible: (c: string, r: string, m: string) => `${c} n'est pas possible ici (${r}). Le meilleur cadre possible : ${m}.`,
      conseils: {
        rv_residence: () => "Si c'est vraiment ta résidence principale jusqu'à la vente (tu y vis ; courrier, impôts et factures à cette adresse), la plus-value est exonérée. Le fisc vérifie que l'occupation est réelle.",
        rv_factures: () => "Fais faire les travaux d'amélioration par des entreprises qui te facturent : leurs factures s'ajoutent au prix d'achat et réduisent la plus-value. Les travaux faits toi-même et les matériaux achetés seuls ne comptent pas.",
        rv_deux_vendeurs: () => "Achetez à deux (couple, indivision) : le seuil de 50 000 € de la surtaxe sur les grosses plus-values s'apprécie par vendeur.",
        rv_detention_5ans: () => "Revends après 5 ans pleins : les abattements pour durée de détention commencent, et tu peux compter 15 % du prix d'achat en travaux sans facture si c'est plus avantageux. Le gain tient compte des mois de crédit et de charges en plus.",
        rv_ira: () => "Fais supprimer les indemnités de remboursement anticipé dans l'offre de prêt (à négocier avant de signer), ou finance l'opération avec un prêt relais. Elles ne sont jamais dues en cas de mutation professionnelle.",
        rv_mdb_5ans: () => "Revends avant 5 ans : au-delà, les droits de mutation normaux sont rappelés, avec des intérêts de retard.",
        rv_mdb_reinvestir: () => "Laisse le gain dans la société pour financer l'opération suivante : le PFU de 31,4 % n'est dû que quand tu te verses le gain en dividendes. Ce montant reste disponible pour réinvestir.",
      } as Record<CleConseilRevente, (v: number) => string>,
      avertissement: "Simulation indicative selon les règles fiscales en vigueur au 19/10/2026, à valider avec un expert-comptable ou un notaire. Hypothèses : crédit amortissable remboursé à la vente, un seul exercice fiscal pour la société, pas d'option pour la TVA sur la marge, travaux comptés à leur coût toutes taxes comprises.",
    },
    enregistre: "Enregistré", enregistrement: "Enregistrement…", erreur: "Enregistrement impossible, tes changements restent affichés.",
  },
  en: {
    titre: "Investment",
    subOff: "Buying to rent out or to resell? AVYORA works out what the deal earns you after tax, regime by regime.",
    activer: "Yes, it's an investment",
    desactiver: "It's not an investment",
    sub: "What the deal earns you each month after tax, and the tax regime that suits you best (French rules).",
    location: "Rental", revente: "Buy and resell", bientot: "coming soon",
    groupes: { achat: "Purchase", credit: "Loan", loyers: "Rent", charges: "Owner costs", foyer: "Your tax household", hypo: "Assumptions" },
    champs: {
      prix: "Purchase price", surface: "Living area", fraisNotaire: "Notary fees", fraisAgence: "Agency fees", travaux: "Renovation work",
      travauxDeductiblesPct: "Work deductible for unfurnished rental", mobilier: "Furniture (furnished)", valeurApres: "Value after renovation",
      apport: "Down payment", taux: "Loan rate", dureeAns: "Term", assurancePct: "Loan insurance (of principal, per year)", fraisDossier: "Loan and guarantee fees",
      loyerNu: "Monthly rent, unfurnished (excl. charges)", loyerMeuble: "Monthly rent, furnished (excl. charges)", loyerBailleurPrive: "Capped rent, private landlord status", vacanceMois: "Vacancy per year",
      taxeFonciere: "Property tax (excl. waste tax)", coproNonRecup: "Non-recoverable condo fees", pno: "Landlord insurance",
      gestionPct: "Property management (of rent)", entretien: "Upkeep and small repairs", cfe: "CFE business tax (furnished)",
      revenu: "Household net taxable income (without this project)", parts: "Tax shares",
      horizon: "Simulation length", indexLoyers: "Rent increase per year", indexCharges: "Cost increase per year", indexRevenu: "Income increase per year",
      terrainPct: "Land share (not depreciable)", comptableLmnp: "LMNP accountant, per year", comptableSciIr: "SCI (income tax) accountant, per year",
      comptableIs: "Company (corporate tax) accountant, per year", creationSociete: "Company setup",
    } as Record<ChampNum, string>,
    neuf: "New build (reduced notary fees)", collectif: "Apartment in a multi-unit building", immeuble15: "Building completed over 15 years ago",
    couple: "Joint return (married or civil partnership)", reno: "Energy renovation from E, F or G to A–D (loss up to €21,400)",
    suiviReel: "Work: follow the actual spending forecast", niveauBP: "Rent level for the private landlord status",
    niveaux: { intermediaire: "Intermediate", social: "Social", tres_social: "Very social" },
    auto: "auto", sourceTravaux: { estimation: "from the estimate", reel: "actual spending forecast", saisie: "entered" },
    unites: { mois: "months", ans: "years" },
    manque: "Enter the purchase price, the rent and your household income: the result shows up right away.",
    parMois: "€/month", moyenne: (n: number) => `per month after tax, averaged over ${n} years`,
    avec: "with", autofinance: (m: string) => `Self-financing: the deal earns you ${m} a month`,
    effort: (m: string) => `Out of pocket: plan ${m} a month`,
    coutTotal: "Total cost", brut: "Gross yield", brutMeuble: "Gross, furnished", net: "Net of costs", mensualite: "Loan payment", valeurCreee: "Value created",
    comparer: "Compare tax regimes", surAns: (n: number) => `over ${n} years`,
    hRegime: "Regime", hAn1: "Year 1", hMoy: "Average", hImpots: "Total taxes", hEcart: "Gap",
    parMoisCourt: "/mo", meilleur: "Best", nonEligible: "Not eligible", aConfirmer: "new, to be confirmed",
    detail: "Year by year", tAnnee: "Year", tLoyers: "Rent", tCharges: "Costs", tCredit: "Loan", tImpot: "Tax", tPs: "Social levies", tPfu: "Flat tax", tCf: "Cash flow",
    tresoFinale: (m: string) => `Includes ${m} left in the company at the end, counted after flat tax.`,
    regimes: {
      nu_micro: "Unfurnished · micro-foncier", nu_reel: "Unfurnished · actual expenses", bailleur_prive: "Unfurnished · private landlord status",
      sci_ir: "SCI (income tax) · unfurnished", is_nu: "Company (corporate tax) · unfurnished",
      lmnp_micro: "Furnished LMNP · micro-BIC", lmnp_reel: "Furnished LMNP · actual expenses", is_meuble: "Company (corporate tax) · furnished",
    } as Record<Regime, string>,
    raisons: {
      micro_foncier_plafond: "rent above €15,000 a year", micro_bic_plafond: "rent above €83,600 a year",
      bailleur_prive_maison: "multi-unit buildings only", bailleur_prive_travaux: "work under 30% of the price",
      lmp: "professional furnished landlord: social contributions not computed",
    },
    alertes: {
      lmp: "Your furnished rent would exceed €23,000 and your other income: you'd become a professional furnished landlord (LMP), with social contributions this simulator doesn't compute.",
      micro_foncier_depasse: "As rent rises, you'll pass €15,000 a year: micro-foncier won't apply in those years.",
      micro_bic_depasse: "As rent rises, you'll pass €83,600 a year: micro-BIC won't apply in those years.",
      bailleur_prive_conditions: "New regime from the 2026 budget, awaiting official guidance: multi-unit building, capped rent at the chosen level (enter it under Rent), unfurnished main-residence lease for 9 years, purchase by 12/31/2028.",
      deficit_3ans: "Offsetting a loss against your income means renting unfurnished until December 31 of the 3rd following year.",
      is_sans_revente: "Under corporate tax, a sale taxes all depreciation with no allowance: without a sale, this simulation favors the company.",
      sci_ir_comptable: "For unfurnished rental, an SCI adds costs (accountant, setup) with no tax benefit: it's mainly useful for estate planning.",
    } as Record<Alerte, string>,
    avertissement: "Indicative simulation under French tax rules as of 10/19/2026, to be checked with a chartered accountant. Assumptions: rental starts January 1 of year 1, no other rental income in the household, tax counted in the year of the rent (corporate tax the year after), tax brackets indexed like your income, furniture not replaced, work depreciated over 15 years for furnished and company regimes (for a new build, the house is depreciated like a building and the land never), no sale.",
    terrain: "The purchase price is for a building plot (new build, land bought from an individual)",
    prixTerrain: "Land price",
    choix: "The regime you have in mind", pasChoisi: "Not decided yet", tonChoix: "Your pick",
    choixBon: (c: string) => `Good pick: ${c} is the best regime for this project.`,
    choixPerte: (c: string, p: string, h: number, m: string) => `With ${c}, you'd earn ${p} less over ${h} years than with ${m}.`,
    choixImpots: (i: string) => ` That includes ${i} more in taxes.`,
    choixHorsImpots: " The gap comes from costs and rent, not taxes.",
    choixNonEligible: (c: string, r: string, m: string) => `${c} isn't possible here (${r}). The best available regime: ${m}.`,
    astuces: "Ways to pay less tax", astucesMeta: (n: number) => `${n} idea${n > 1 ? "s" : ""}`,
    gainSur: (m: string, n: number) => `+${m} over ${n} years`, aSavoir: "Good to know",
    conseils: {
      deficit_reno: () => "If your work moves the home from energy class E, F or G to A, B, C or D, the rental loss you can offset against your income rises to €21,400 a year instead of €10,700 (spending paid by 12/31/2027, option on form 2044). Keep the before and after energy reports.",
      etaler_travaux: (n: number) => `Pay for the work over ${n} calendar years (for example part in December, the rest in January): each year opens its own €10,700 cap against your income, instead of just one.`,
      terrain_ventilation: (p: number) => `The land share (${p}% here) can't be depreciated. If it's really lower, get it documented (expert report, deed, nearby land prices): 5 points less earns you this amount. The tax office can challenge an undocumented split.`,
      is_compte_courant: () => "In a company, put your money in as a shareholder loan rather than share capital: it's paid back tax-free before any dividend (as this simulation assumes). Dividends pay the 31.4% flat tax.",
      lmnp_revente: () => "On resale, depreciation deducted under LMNP actual expenses is taken off the purchase price when computing the capital gain (since 2025). The tax saved while renting is usually far larger, especially if you keep the property for a long time (holding-period allowances).",
      sci_ir_transmission: () => "An SCI under income tax doesn't save tax on rent: it's for estate planning or buying with others. If that's not your goal, owning directly costs less.",
    } as Record<CleConseilLocation, (v: number) => string>,
    mk: {
      commune: "Town",
      chargement: "Looking up market prices…",
      loyer: (c: string, m: string) => `Market in ${c}: unfurnished asking rents from the ${m} rent map (ANIL), estimated charges removed.`,
      loyerVal: (hc: string, bas: string, haut: string) => `€${hc}/m² excl. charges · range €${bas} to €${haut}/m²`,
      loyerConseil: (nu: string, meuble: string, p: string) => `For your size: about ${nu} a month unfurnished, ${meuble} furnished (+${p}).`,
      peuFiable: "Few listings in this town: treat this figure with caution.",
      encadre: (c: string) => `Rent control in ${c}: rent can't exceed your area's capped reference rent, even if the market is higher. Check it on your city's official simulator.`,
      utiliser: "Use these rents", utiliserPrix: (m: string) => `Use ${m}`,
      loyerTropHaut: (k: string, x: string, h: string) => `Your ${k} rent (€${x}/m²) is above the top of the market range (€${h}/m²): it may not rent at that price, and the whole simulation depends on it.`,
      nu: "unfurnished", meuble: "furnished",
      ventes: (n: number, t: string, proche: boolean, c: string, d: string, f: string) => `${n} ${t} ${proche ? "of similar size " : ""}sold in ${c} between ${d} and ${f} (DVF, notarized sales).`,
      types: { appartement: "apartments", maison: "houses" },
      ventesVal: (med: string, p25: string, p75: string) => `Median €${med}/m² · half of sales between €${p25} and €${p75}/m²`,
      ventesConseil: (bas: string, haut: string) => `For your size: ${bas} (median) to ${haut} (top of range). A renovated property aims for the top.`,
      neufNote: "Public sales are mostly older homes: a new house usually sells for more.",
      exemples: "See the closest sales",
      horsDvf: "No public sales data in Alsace-Moselle or Mayotte: no price range here.",
      peuDeVentes: "Too few comparable sales in this town to give a price range.",
      indisponible: "Sales data is unavailable right now.",
      revTropHaut: (x: string, p90: string) => `Your resale price (€${x}/m²) is above 90% of local sales (€${p90}/m²): the deal relies on an off-market price.`,
      revHaut: (x: string, p75: string) => `Your resale price (€${x}/m²) beats 3 sales out of 4 locally (€${p75}/m²): realistic only for a very well renovated or located property.`,
      source: "Sources: DVF (French tax authority, Etalab); ANIL estimates from Groupe SeLoger and leboncoin data.",
    },
    rv: {
      groupe: "Resale",
      sub: "What the deal earns you after tax, depending on how you buy and resell (French rules).",
      champs: {
        prixRevente: "Resale price", dureeMois: "Length of the deal (purchase → sale)", fraisAgenceVente: "Agency fees on sale",
        diagnostics: "Sale inspections", mainlevee: "Mortgage release", travauxEntreprisePct: "Share of improvement work done by contractors (counted in the capital gain)",
        chargesPortage: "Holding costs per year (condo, insurance, utilities)",
      } as Record<ChampRevente, string>,
      habite: "I live in the property until the sale (main residence)",
      primo: "First-time buyer: no main residence owned in the last 2 years",
      etatNeuf: "Heavy renovation that makes the property new (structure, façades, or 2/3 of each finishing trade)",
      sansIra: "No early repayment penalty (bridge loan or negotiated)",
      vendeurs: "Number of sellers", unVendeur: "1 seller", deuxVendeurs: "2 sellers (couple, joint ownership)",
      auto03: "0.3% of the loan",
      manque: "Enter the purchase price (Purchase block) and the resale price: the result shows up right away.",
      net: (m: number) => `net after tax, over ${m} months`,
      parAn: (p: string) => `That's ${p} a year on the money you put in`,
      perte: (m: string) => `Loss-making deal: you'd need to sell for at least ${m}`,
      coutOp: "Deal cost", mise: "Your money in", prixMin: "Break-even resale price", duree: "Length",
      comparer: "Compare setups", enMois: (m: number) => `over ${m} months`,
      hCadre: "Setup", hAvant: "Before tax", hImpots: "Taxes", hNet: "Net", hAn: "Per year", hMin: "Break-even",
      cadres: { particulier: "Individual · capital gains tax", residence_principale: "Main residence · tax-exempt", marchand_biens: "Property dealer · corporate tax" } as Record<CadreRevente, string>,
      raisons: { rp_pas_habite: "only if you live there until the sale", particulier_habite: "you live there: it's your main residence", mdb_habite: "a company can't sell your main residence" },
      lignes: {
        prixRevente: "Resale price", fraisVente: "Sale costs (agency, inspections, release)", achat: "Purchase and closing costs", travaux: "Renovation work",
        credit: "Loan (interest, insurance, fees, penalties)", portage: "Holding costs", sanction: "Transfer duties recalled (sale after 5 years)",
        tva: "VAT on the resale price", gainAvant: "Gain before tax", impotPV: "Capital gains tax", isPfu: "Corporate tax, then flat tax", gainNet: "Net gain",
      } as Record<string, string>,
      pv: (pv: string, n: number, ir: string, ps: string, st: string) => `Taxable gain: ${pv} · held ${n} full year${n > 1 ? "s" : ""} · allowance ${ir} (income tax) and ${ps} (social levies) · surtax ${st}`,
      alertes: {
        rp_courte: "Under 12 months of occupancy: there's no legal minimum, but the tax office can challenge it if the occupancy doesn't look real. Keep proof (bills, mail, insurance).",
        rp_requalification: "Repeatedly buying and reselling your main residence can get you reclassified as a property dealer: no exemption, income tax and social contributions. The exemption is never guaranteed.",
        particulier_requalification: "Regular buy-and-resell deals, intended for resale from the start, can get you reclassified as a property dealer and taxed as a business.",
        mdb_conditions: "Property dealer: VAT-registered company, commitment to resell within 5 years for reduced duties, business accounts. The gain is taxed at the corporate rate, then at the flat tax when you pay it out. Early repayment penalties on a company loan depend on the contract (no legal cap).",
        mdb_sanction: "Sale after 5 years: normal transfer duties are recalled, plus 0.20% late interest per month since the purchase (counted here until the sale; settling voluntarily at 5 years costs less).",
        mdb_tva_neuf: "New or renovated-to-new property: the sale bears 20% VAT on the full price; VAT on the work is recovered.",
        moins_value: "Capital loss: no tax, but it can't be offset against any other deal.",
      } as Record<AlerteRevente, string>,
      choix: "The setup you have in mind",
      choixBon: (c: string) => `Good pick: ${c} is the best setup for this deal.`,
      choixPerte: (c: string, p: string, m: string) => `With ${c}, you'd earn ${p} less than with ${m}.`,
      choixNonEligible: (c: string, r: string, m: string) => `${c} isn't possible here (${r}). The best available setup: ${m}.`,
      conseils: {
        rv_residence: () => "If it's truly your main residence until the sale (you live there; mail, taxes and bills at that address), the capital gain is tax-exempt. The tax office checks that the occupancy is real.",
        rv_factures: () => "Have improvement work done by contractors who invoice you: their invoices are added to the purchase price and lower the capital gain. Work you do yourself and materials bought alone don't count.",
        rv_deux_vendeurs: () => "Buy as two (couple, joint ownership): the €50,000 threshold of the surtax on large capital gains applies per seller.",
        rv_detention_5ans: () => "Sell after 5 full years: holding-period allowances start, and you can count 15% of the purchase price as work without invoices if that's better. The gain accounts for the extra months of loan and costs.",
        rv_ira: () => "Get early repayment penalties removed from the loan offer (negotiate before signing), or finance the deal with a bridge loan. They're never due after a job relocation.",
        rv_mdb_5ans: () => "Sell within 5 years: after that, normal transfer duties are recalled with late interest.",
        rv_mdb_reinvestir: () => "Keep the gain in the company to fund the next deal: the 31.4% flat tax is only due when you pay yourself dividends. This amount stays available to reinvest.",
      } as Record<CleConseilRevente, (v: number) => string>,
      avertissement: "Indicative simulation under French tax rules as of 10/19/2026, to be checked with a chartered accountant or notary. Assumptions: amortizing loan repaid at sale, a single tax year for the company, no VAT-on-margin option, work counted at its VAT-inclusive cost.",
    },
    enregistre: "Saved", enregistrement: "Saving…", erreur: "Couldn't save, your changes are still shown.",
  },
} as const;

const CSS = `
.av-inv .mono{font-family:var(--font-geist-mono),ui-monospace,monospace;font-variant-numeric:tabular-nums;letter-spacing:-.02em}
.av-inv .tete{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}
.av-inv .lien{border:0;background:none;color:var(--brand);font:inherit;font-size:12.5px;font-weight:600;cursor:pointer;padding:8px 0;min-height:44px;text-align:left}
.av-inv .lien.disc{color:var(--faint);font-weight:500}
.av-inv button.add{height:44px;border-radius:12px;padding:0 18px;font:inherit;font-size:13.5px;font-weight:600;background:var(--brand);color:#fff;border:0;cursor:pointer;box-shadow:var(--shadow-sm)}
.av-inv button.add:hover{background:var(--brand-700)}
.av-inv .seg{display:inline-flex;gap:4px;padding:4px;border:1px solid var(--line);border-radius:12px;background:var(--surface-2);margin-bottom:6px}
.av-inv .seg button{min-height:40px;padding:0 16px;border-radius:9px;border:0;background:none;font:inherit;font-size:13px;font-weight:600;color:var(--muted);cursor:pointer;display:inline-flex;align-items:center;gap:6px}
.av-inv .seg button[aria-pressed="true"]{background:var(--surface);color:var(--ink);box-shadow:var(--shadow-sm)}
.av-inv .seg button:disabled{cursor:default;opacity:.7}
.av-inv .seg small{font-size:10.5px;font-weight:600;color:var(--faint);border:1px solid var(--line-strong);border-radius:999px;padding:1px 7px}
.av-inv details.grp{border-bottom:1px solid var(--line)}
.av-inv details.grp>summary{list-style:none;display:flex;align-items:center;gap:8px;cursor:pointer;min-height:44px;padding:8px 2px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--brand);font-weight:600}
.av-inv details.grp>summary::-webkit-details-marker{display:none}
.av-inv details.grp>summary .chv{flex:none;color:var(--faint);transition:transform .2s var(--ease);transform:rotate(-90deg)}
.av-inv details.grp[open]>summary .chv{transform:rotate(0deg);color:var(--brand)}
.av-inv details.grp>summary .res{margin-left:auto;font-family:var(--font-geist-mono),monospace;letter-spacing:0;text-transform:none;color:var(--faint);font-weight:500;font-size:11px;text-align:right}
.av-inv .champs{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px 14px;padding:4px 2px 16px}
.av-inv label.inv-f{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--muted);min-width:0}
.av-inv label.inv-f .in{display:flex;align-items:center;height:44px;border:1px solid var(--line-strong);border-radius:var(--radius-field);background:var(--surface);padding:0 10px;gap:6px}
.av-inv label.inv-f .in:focus-within{border-color:var(--brand);box-shadow:0 0 0 3px var(--brand-100)}
.av-inv label.inv-f input{flex:1;min-width:0;border:0;outline:none;background:transparent;font-family:var(--font-geist-mono),monospace;font-size:14px;color:var(--ink);height:100%}
.av-inv label.inv-f input::placeholder{color:var(--faint)}
.av-inv label.inv-f .u{flex:none;font-size:12px;color:var(--faint)}
.av-inv label.inv-f .aide{font-size:11px;color:var(--faint)}
.av-inv label.inv-k{display:flex;align-items:center;gap:10px;font-size:13px;color:var(--ink);min-height:44px;cursor:pointer;grid-column:1/-1}
.av-inv label.inv-k input{width:18px;height:18px;accent-color:var(--brand);flex:none}
.av-inv select{height:44px;border:1px solid var(--line-strong);border-radius:var(--radius-field);padding:0 10px;font:inherit;font-size:14px;background:var(--surface);color:var(--ink)}
.av-inv .manque{margin:14px 0 4px;padding:14px 16px;border:1px dashed var(--line-strong);border-radius:14px;color:var(--muted);font-size:13px;background:var(--surface-2)}
.av-inv .prog .ppct .nw{white-space:nowrap}
.av-inv .prog .ppct.neg{color:#b42318}
.av-inv .verdict{display:inline-flex;align-items:center;margin-top:8px;font-size:13px;font-weight:600;padding:5px 12px;border-radius:999px}
.av-inv .verdict.r{background:#fdecec;color:#b42318}
.av-inv .verdict.g{background:#e6f7f0;color:#0f9d6b}
.av-inv .prog .chip b{font-family:var(--font-geist-mono),monospace}
.av-inv .rh,.av-inv .rrow{display:grid;grid-template-columns:minmax(0,1fr) 92px 92px 104px 92px;gap:12px;align-items:center}
.av-inv .rh.rv,.av-inv .rrow.rv{grid-template-columns:minmax(0,1fr) 92px 84px 92px 60px 96px}
.av-inv .decomp{display:flex;flex-direction:column;margin:0}
.av-inv .decomp div{display:flex;justify-content:space-between;gap:12px;padding:5px 0;border-bottom:1px dashed var(--line);font-size:12.5px}
.av-inv .decomp dt{color:var(--muted)}
.av-inv .decomp dd{margin:0;white-space:nowrap}
.av-inv .decomp .tot dt,.av-inv .decomp .tot dd{color:var(--ink);font-weight:600}
.av-inv .rh{font-size:11px;color:var(--faint);padding:6px 0 4px}
.av-inv .rh span:not(:first-child),.av-inv .rrow .c{text-align:right}
.av-inv .rrow{width:100%;font:inherit;color:var(--ink);background:none;border:0;border-bottom:1px solid var(--line);padding:11px 2px;cursor:pointer;text-align:left;min-height:44px}
.av-inv .rrow:hover{background:var(--surface-2)}
.av-inv .rrow:focus-visible{outline:2px solid var(--brand);outline-offset:2px;border-radius:8px}
.av-inv .rrow.best{background:#f3f2ff}
.av-inv .rrow.off{color:var(--faint)}
.av-inv .nm{display:flex;align-items:center;gap:8px;min-width:0;font-size:13px;font-weight:600;flex-wrap:wrap}
.av-inv .nm .t{min-width:0}
.av-inv .inv-p{flex:none;display:inline-flex;align-items:center;font-size:10.5px;font-weight:600;padding:2px 9px;border-radius:999px;border:1px solid var(--line-strong);color:var(--muted);background:var(--surface)}
.av-inv .inv-p.best{background:var(--brand);border-color:transparent;color:#fff}
.av-inv .inv-p.off{background:var(--surface-2)}
.av-inv .inv-p.new{background:#fdf1e1;border-color:transparent;color:#b06d10}
.av-inv .raison{display:block;font-size:11px;font-weight:500;color:var(--faint);margin-top:3px}
.av-inv .chv2{flex:none;color:var(--faint);transition:transform .2s var(--ease);transform:rotate(-90deg)}
.av-inv .rrow[aria-expanded="true"] .chv2{transform:rotate(0deg);color:var(--brand)}
.av-inv .c{font-size:13px}
.av-inv .c .lb{display:none}
.av-inv .c .u{font-size:10.5px;color:var(--faint);margin-left:2px}
.av-inv .c.pos{color:#0f9d6b}.av-inv .c.neg{color:#b42318}
.av-inv .det{background:var(--surface-2);border-bottom:1px solid var(--line);padding:10px 14px 12px}
.av-inv .tbl{overflow-x:auto;-webkit-overflow-scrolling:touch}
.av-inv table{border-collapse:collapse;width:100%;min-width:560px;font-size:12px}
.av-inv th,.av-inv td{padding:6px 8px;text-align:right;border-bottom:1px dashed var(--line);white-space:nowrap}
.av-inv th{font-weight:500;color:var(--faint);font-size:11px}
.av-inv th:first-child,.av-inv td:first-child{text-align:left}
.av-inv td{font-family:var(--font-geist-mono),monospace;font-variant-numeric:tabular-nums}
.av-inv .al{border-radius:12px;padding:9px 12px;font-size:12.5px;line-height:1.45;border:1px solid #f0c98a;background:#fdf1e1;color:#8a530b;margin-top:8px}
.av-inv .note{font-size:11.5px;color:var(--faint);margin:8px 0 0}
.av-inv .avert{font-size:11.5px;color:var(--faint);margin:14px 0 0;line-height:1.5}
.av-inv .etat{font-size:11.5px;color:var(--faint)}
.av-inv .etat.err{color:#b42318}
.av-inv .mk{grid-column:1/-1;border:1px solid var(--line);border-radius:12px;background:var(--surface-2);padding:10px 12px;font-size:12.5px;line-height:1.5;color:var(--muted);display:flex;flex-direction:column;gap:4px}
.av-inv .mk b{color:var(--ink);font-weight:600}
.av-inv .mk .v{font-family:var(--font-geist-mono),monospace;font-variant-numeric:tabular-nums;color:var(--ink);font-size:13px}
.av-inv .mk .lien{min-height:36px;padding:4px 0}
.av-inv .mk details summary{cursor:pointer;color:var(--brand);font-weight:600;min-height:32px;display:flex;align-items:center}
.av-inv .mk ul{margin:4px 0 0;padding-left:18px;font-family:var(--font-geist-mono),monospace;font-size:12px}
.av-inv .mk .al{margin-top:4px}
.av-inv .inv-p.mine{border-color:var(--brand);color:var(--brand)}
.av-inv label.inv-f.chs{max-width:420px;margin-top:16px}
.av-inv .chx{border-radius:12px;padding:10px 12px;font-size:13px;line-height:1.5;margin-top:8px;border:1px solid}
.av-inv .chx.g{background:#e6f7f0;color:#0b6e4b;border-color:#b5e6d2}
.av-inv .chx.r{background:#fdecec;color:#8f1d14;border-color:#f3c0bb}
.av-inv .cs{display:flex;gap:14px;align-items:flex-start;justify-content:space-between;padding:11px 2px;border-bottom:1px solid var(--line);font-size:13px;line-height:1.5;color:var(--ink)}
.av-inv .cs .gn{flex:none;font-family:var(--font-geist-mono),monospace;font-variant-numeric:tabular-nums;font-weight:600;font-size:12px;color:#0f9d6b;background:#e6f7f0;border-radius:999px;padding:3px 10px;white-space:nowrap}
.av-inv .cs .gn.i{color:var(--muted);background:var(--surface-2);font-family:inherit}
@media (max-width:640px){
  .av-inv .cs{flex-direction:column;gap:6px}
  .av-inv .rh{display:none}
  .av-inv .rrow,.av-inv .rrow.rv{grid-template-columns:repeat(2,minmax(0,1fr));row-gap:8px;align-items:start}
  .av-inv .rrow .nmb{grid-column:1/-1}
  .av-inv .rrow .c{text-align:left}
  .av-inv .c .lb{display:block;font-family:var(--font-geist-sans);font-size:10.5px;color:var(--faint);letter-spacing:0;margin-bottom:2px}
  .av-inv .prog .prow{flex-wrap:wrap}
  .av-inv .prog .ppct small{display:block;margin:2px 0 0}
}
@media (prefers-reduced-motion:reduce){.av-inv .chv,.av-inv .chv2{transition:none}}
`;

const CHEVRON = (cls: string) => (
  <svg className={cls} width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

/** Champ numérique : texte libre (« 1 500 », « 3,6 »), vide = valeur par défaut affichée en gris. */
function Num({ id, label, valeur, defaut, unite, aide, onChange }: { id: string; label: string; valeur: number | null | undefined; defaut: string; unite: string; aide?: string; onChange: (v: number | null) => void }) {
  const [txt, setTxt] = useState(valeur == null ? "" : String(valeur).replace(".", ","));
  const focus = useRef(false);
  useEffect(() => { if (!focus.current) setTxt(valeur == null ? "" : String(valeur).replace(".", ",")); }, [valeur]);
  return (
    <label className="inv-f" htmlFor={id}>
      <span>{label}</span>
      <span className="in">
        <input id={id} inputMode="decimal" value={txt} placeholder={defaut}
          onFocus={() => { focus.current = true; }}
          onBlur={() => { focus.current = false; setTxt(valeur == null ? "" : String(valeur).replace(".", ",")); }}
          onChange={(e) => {
            setTxt(e.target.value);
            const t = e.target.value.trim();
            if (!t) return onChange(null);
            const n = lireMontant(t);
            if (Number.isFinite(n)) onChange(n);
          }} />
        <span className="u">{unite}</span>
      </span>
      {aide && <span className="aide">{aide}</span>}
    </label>
  );
}

type Props = { projectId: string; saisie: SaisieInvest; contexte: ContexteProjet };

export default function Investissement({ projectId, saisie: initiale, contexte }: Props) {
  const locale = useLocale();
  const t = TR[locale];
  const fmt = (v: number): string => euros(locale, v);
  const signe = (v: number): string => (Math.round(v) > 0 ? "+" : Math.round(v) < 0 ? "−" : "") + euros(locale, Math.abs(v));
  const pc = (v: number, d = 1): string => pourcent(locale, v * 100, d);

  const [s, setS] = useState<SaisieInvest>(initiale);
  const [etat, setEtat] = useState<"" | "en_cours" | "ok" | "erreur">("");
  const [ouvert, setOuvert] = useState<Regime | null>(null);
  const premier = useRef(true);

  // Enregistrement automatique, 1,2 s après la dernière frappe.
  useEffect(() => {
    if (premier.current) { premier.current = false; return; }
    setEtat("en_cours");
    const h = setTimeout(async () => {
      const r = await fetch(`/api/projects/${projectId}/investissement`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s),
      }).catch(() => null);
      setEtat(r && r.ok ? "ok" : "erreur");
    }, 1200);
    return () => clearTimeout(h);
  }, [s, projectId]);

  const loc = s.location;
  const maj = (patch: Partial<SaisieLocation>) => setS((x) => ({ ...x, location: { ...x.location, ...patch } }));
  const entree = useMemo(() => entreeDepuisSaisie(loc, contexte), [loc, contexte]);
  const res = useMemo(() => (entree ? simulerLocation(entree) : null), [entree]);
  // Valeurs par défaut affichées dans les champs vides, même avant les 3 champs indispensables.
  const defauts = useMemo(() => completer(loc, contexte), [loc, contexte]);
  // Blocs ouverts au départ : ceux où il manque un champ indispensable (fixé une fois : pas de repli en pleine saisie).
  const [ouvertsInit] = useState(() => ({ achat: !loc.prix, loyers: !(loc.loyerNu || loc.loyerMeuble), foyer: loc.revenu == null, revente: !s.revente?.prixRevente }));
  const rvs: SaisieRevente = s.revente ?? {};
  const majR = (patch: Partial<SaisieRevente>) => setS((x) => ({ ...x, revente: { ...(x.revente ?? {}), ...patch } }));
  const entreeR = useMemo(() => entreeRevente(s, contexte), [s, contexte]);
  const resR = useMemo(() => (entreeR ? simulerRevente(entreeR) : null), [entreeR]);
  const defR = useMemo(() => completerRevente(s, contexte), [s, contexte]);
  const [ouvertR, setOuvertR] = useState<CadreRevente | null>(null);
  const travaux = travauxRetenus(loc, contexte);

  // Prix du marché (ventes DVF, loyers ANIL) de la commune, pour conseiller le loyer et le prix de revente.
  const surfaceBien = typeof loc.surface === "number" ? loc.surface : contexte.surface ?? 0;
  const [marche, setMarche] = useState<Marche | null>(null);
  const [marcheEtat, setMarcheEtat] = useState<"" | "charge" | "erreur">("");
  useEffect(() => {
    const cp = contexte.codePostal;
    if (!s.actif || !cp || !/^\d{5}$/.test(cp) || !(surfaceBien >= 5)) return;
    const q = new URLSearchParams({ cp, surface: String(Math.round(surfaceBien)) });
    if (contexte.typeBien) q.set("type", contexte.typeBien);
    if (loc.codeCommune) q.set("insee", loc.codeCommune);
    const ctrl = new AbortController();
    const h = setTimeout(async () => {
      setMarcheEtat("charge");
      const r = await fetch(`/api/marche?${q}`, { signal: ctrl.signal }).catch(() => null);
      if (ctrl.signal.aborted) return;
      if (r && r.ok) { setMarche((await r.json()) as Marche); setMarcheEtat(""); } else setMarcheEtat("erreur");
    }, 600);
    return () => { clearTimeout(h); ctrl.abort(); };
  }, [s.actif, contexte.codePostal, contexte.typeBien, surfaceBien, loc.codeCommune]);

  if (!s.actif) {
    return (
      <div className="card av-inv">
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <h2>{t.titre}</h2>
        <div className="sub">{t.subOff}</div>
        <button type="button" className="add" onClick={() => setS((x) => ({ ...x, actif: true }))}>{t.activer}</button>
      </div>
    );
  }

  const n0 = (v: number): string => nombre(locale, v, 0);
  const d = defauts;
  const champ = (k: ChampNum, unite: string, defaut: string, aide?: string) => (
    <Num key={k} id={`inv-${k}`} label={k === "prix" && tab ? t.prixTerrain : t.champs[k]} valeur={loc[k]} defaut={defaut} unite={unite} aide={aide} onChange={(v) => maj({ [k]: v } as Partial<SaisieLocation>)} />
  );
  const auto = (v: string): string => `${v} (${t.auto})`;
  const ck = (cle: "neuf" | "terrain" | "collectif" | "immeuble15ans" | "couple" | "renoEnergetique" | "suiviReel", label: string, valeur: boolean) => (
    <label className="inv-k" key={cle}>
      <input type="checkbox" checked={valeur} onChange={(e) => maj({ [cle]: e.target.checked } as Partial<SaisieLocation>)} />
      <span>{label}</span>
    </label>
  );
  const tab = !!d.terrainABatir;
  const notaireAuto = loc.prix ? fraisNotaire(loc.prix, d.dept, d.neuf && !tab) : 0;

  const revente = s.strategie === "revente";
  const tr = t.rv;

  // ── Prix du marché ──
  const mk = t.mk;
  const arrondi = (v: number, pas: number): number => Math.round(v / pas) * pas;
  const dateMk = (x: string): string => new Date(x + "T00:00:00Z").toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const L = marche?.loyer ?? null, V = marche?.ventes ?? null, nomC = marche?.commune?.nom ?? "";
  const m2 = (v: number): string => nombre(locale, v, 1);
  const loyerNuMk = L && surfaceBien ? arrondi(L.hc * surfaceBien, 10) : 0;
  const loyerMeubleMk = arrondi(loyerNuMk * (1 + MAJORATION_MEUBLE), 10);
  const alertesLoyer: string[] = [];
  if (L && surfaceBien > 0) {
    if (loc.loyerNu && loc.loyerNu / surfaceBien > L.hcHaut) alertesLoyer.push(mk.loyerTropHaut(mk.nu, m2(loc.loyerNu / surfaceBien), m2(L.hcHaut)));
    if (loc.loyerMeuble && loc.loyerMeuble / surfaceBien > L.hcHaut * (1 + MAJORATION_MEUBLE)) alertesLoyer.push(mk.loyerTropHaut(mk.meuble, m2(loc.loyerMeuble / surfaceBien), m2(L.hcHaut * (1 + MAJORATION_MEUBLE))));
  }
  const alertesRevente: string[] = [];
  if (V && surfaceBien > 0 && rvs.prixRevente) {
    const x = rvs.prixRevente / surfaceBien;
    if (x > V.p90) alertesRevente.push(mk.revTropHaut(n0(x), n0(V.p90)));
    else if (x > V.p75) alertesRevente.push(mk.revHaut(n0(x), n0(V.p75)));
  }
  const chargeMk = marcheEtat === "charge" && !marche ? <div className="mk" key="mk">{mk.chargement}</div> : null;
  const blocLoyer = marche ? (
    <div className="mk" key="mk">
      {L ? <>
        <span>{mk.loyer(nomC, L.millesime)}</span>
        <span className="v">{mk.loyerVal(m2(L.hc), m2(L.hcBas), m2(L.hcHaut))}</span>
        {loyerNuMk > 0 && <span>{mk.loyerConseil(fmt(loyerNuMk), fmt(loyerMeubleMk), pourcent(locale, MAJORATION_MEUBLE * 100, 0))}</span>}
        {!L.fiable && <span>{mk.peuFiable}</span>}
        {loyerNuMk > 0 && <button type="button" className="lien" onClick={() => maj({ loyerNu: loyerNuMk, loyerMeuble: loyerMeubleMk })}>{mk.utiliser}</button>}
      </> : null}
      {marche.encadrement && <div className="al">{mk.encadre(nomC)}</div>}
      {alertesLoyer.map((a) => <div key={a} className="al">{a}</div>)}
      <span className="note">{mk.source}</span>
    </div>
  ) : chargeMk;
  const prixMed = V && surfaceBien ? arrondi(V.med * surfaceBien, 1_000) : 0, prixHaut = V && surfaceBien ? arrondi(V.p75 * surfaceBien, 1_000) : 0;
  const blocVentes = marche ? (
    <div className="mk" key="mk">
      {V ? <>
        <span>{mk.ventes(V.n, mk.types[contexte.typeBien === "Maison" ? "maison" : "appartement"], V.surfaceProche, nomC, dateMk(V.debut), dateMk(V.fin))}</span>
        <span className="v">{mk.ventesVal(n0(V.med), n0(V.p25), n0(V.p75))}</span>
        {prixHaut > 0 && <span>{mk.ventesConseil(fmt(prixMed), fmt(prixHaut))}</span>}
        {contexte.nature === "neuf" && <span>{mk.neufNote}</span>}
        {prixHaut > 0 && <button type="button" className="lien" onClick={() => majR({ prixRevente: prixHaut })}>{mk.utiliserPrix(fmt(prixHaut))}</button>}
        <details>
          <summary>{mk.exemples}</summary>
          <ul>{V.exemples.map((e, i) => <li key={i}>{dateMk(e.date)} · {n0(e.surface)} m² · {fmt(e.prix)} · {n0(e.m2)} €/m²</li>)}</ul>
        </details>
      </> : <span>{marche.ventesAbsentes === "hors_dvf" ? mk.horsDvf : marche.ventesAbsentes === "indisponible" ? mk.indisponible : mk.peuDeVentes}</span>}
      {alertesRevente.map((a) => <div key={a} className="al">{a}</div>)}
      <span className="note">{mk.source}</span>
    </div>
  ) : chargeMk;
  const choixCommune = marche && marche.communes.length > 1 ? (
    <label className="inv-f" htmlFor="inv-commune" key="commune"><span>{mk.commune}</span>
      <select id="inv-commune" value={marche.commune?.code ?? ""} onChange={(e) => maj({ codeCommune: e.target.value })}>
        {marche.communes.map((c) => <option key={c.code} value={c.code}>{c.nom}</option>)}
      </select>
    </label>
  ) : null;
  const champR = (k: ChampRevente, unite: string, defaut: string) => (
    <Num key={k} id={`inv-r-${k}`} label={tr.champs[k]} valeur={rvs[k]} defaut={defaut} unite={unite} onChange={(v) => majR({ [k]: v } as Partial<SaisieRevente>)} />
  );
  const ckR = (cle: "habite" | "primo" | "etatNeuf" | "sansIra", label: string) => (
    <label className="inv-k" key={cle}>
      <input type="checkbox" checked={!!rvs[cle]} onChange={(e) => majR({ [cle]: e.target.checked })} />
      <span>{label}</span>
    </label>
  );
  const groupesLoc: { cle: string; titre: string; resume: string; contenu: React.ReactNode; ouvert?: boolean }[] = [
    {
      cle: "achat", titre: t.groupes.achat, ouvert: ouvertsInit.achat,
      resume: loc.prix ? fmt(loc.prix) : "",
      contenu: <>
        {champ("prix", "€", "")}
        {champ("surface", "m²", contexte.surface ? n0(contexte.surface) : "")}
        {choixCommune}
        {champ("fraisNotaire", "€", notaireAuto ? auto(n0(notaireAuto)) : t.auto)}
        {champ("fraisAgence", "€", "0")}
        {champ("travaux", "€", n0(travaux.montant), travaux.source === "saisie" ? undefined : t.sourceTravaux[travaux.source])}
        {champ("travauxDeductiblesPct", "%", n0(d.travauxDeductiblesPct))}
        {champ("mobilier", "€", n0(d.mobilier))}
        {champ("valeurApres", "€", "")}
        {(contexte.nature === "neuf" || loc.terrain != null) && ck("terrain", t.terrain, tab)}
        {!tab && ck("neuf", t.neuf, d.neuf)}
        {ck("collectif", t.collectif, d.collectif)}
        {ck("immeuble15ans", t.immeuble15, d.immeuble15ans)}
        {contexte.travauxPrevision != null && loc.travaux == null && ck("suiviReel", t.suiviReel, loc.suiviReel !== false)}
      </>,
    },
    {
      cle: "credit", titre: t.groupes.credit,
      resume: `${pourcent(locale, d.taux, 2)} · ${n0(d.dureeAns)} ${t.unites.ans}`,
      contenu: <>
        {champ("apport", "€", "0")}
        {champ("taux", "%", nombre(locale, d.taux, 2))}
        {champ("dureeAns", t.unites.ans, n0(d.dureeAns))}
        {champ("assurancePct", "%", nombre(locale, d.assurancePct, 2))}
        {champ("fraisDossier", "€", n0(d.fraisDossier))}
      </>,
    },
    {
      cle: "loyers", titre: t.groupes.loyers, ouvert: ouvertsInit.loyers,
      resume: loc.loyerNu || loc.loyerMeuble ? `${fmt(d.loyerNu)} · ${fmt(d.loyerMeuble)}` : "",
      contenu: <>
        {champ("loyerNu", "€", loc.loyerMeuble ? auto(n0(d.loyerNu)) : "")}
        {champ("loyerMeuble", "€", loc.loyerNu ? auto(n0(d.loyerMeuble)) : "")}
        {champ("loyerBailleurPrive", "€", n0(d.loyerBailleurPrive))}
        {champ("vacanceMois", t.unites.mois, nombre(locale, d.vacanceMois, 1))}
        {blocLoyer}
      </>,
    },
    {
      cle: "charges", titre: t.groupes.charges,
      resume: fmt(d.taxeFonciere + d.coproNonRecup + d.pno + d.entretien),
      contenu: <>
        {champ("taxeFonciere", "€", n0(d.taxeFonciere))}
        {champ("coproNonRecup", "€", n0(d.coproNonRecup))}
        {champ("pno", "€", n0(d.pno))}
        {champ("gestionPct", "%", n0(d.gestionPct))}
        {champ("entretien", "€", n0(d.entretien))}
        {champ("cfe", "€", n0(d.cfe))}
      </>,
    },
    {
      cle: "foyer", titre: t.groupes.foyer, ouvert: ouvertsInit.foyer,
      resume: loc.revenu != null ? fmt(loc.revenu) : "",
      contenu: <>
        {champ("revenu", "€", "")}
        {champ("parts", "", nombre(locale, d.parts, 1))}
        {ck("couple", t.couple, !!loc.couple)}
      </>,
    },
    {
      cle: "hypo", titre: t.groupes.hypo,
      resume: `${n0(d.horizon)} ${t.unites.ans}`,
      contenu: <>
        {champ("horizon", t.unites.ans, n0(d.horizon))}
        {champ("indexLoyers", "%", nombre(locale, d.indexLoyers, 1))}
        {champ("indexCharges", "%", nombre(locale, d.indexCharges, 1))}
        {champ("indexRevenu", "%", nombre(locale, d.indexRevenu, 1))}
        {!tab && champ("terrainPct", "%", n0(d.terrainPct))}
        {champ("comptableLmnp", "€", n0(d.comptableLmnp))}
        {champ("comptableSciIr", "€", n0(d.comptableSciIr))}
        {champ("comptableIs", "€", n0(d.comptableIs))}
        {champ("creationSociete", "€", n0(d.creationSociete))}
        <label className="inv-f" htmlFor="inv-niveau"><span>{t.niveauBP}</span>
          <select id="inv-niveau" value={d.niveauBailleurPrive} onChange={(e) => maj({ niveauBailleurPrive: e.target.value as SaisieLocation["niveauBailleurPrive"] })}>
            {(["intermediaire", "social", "tres_social"] as const).map((k) => <option key={k} value={k}>{t.niveaux[k]}</option>)}
          </select>
        </label>
        {ck("renoEnergetique", t.reno, !!loc.renoEnergetique)}
      </>,
    },
  ];

  const groupesRev: typeof groupesLoc = [
    groupesLoc[0],
    groupesLoc[1],
    {
      cle: "revente", titre: tr.groupe, ouvert: ouvertsInit.revente,
      resume: rvs.prixRevente ? `${fmt(rvs.prixRevente)} · ${n0(defR.dureeMois)} ${t.unites.mois}` : "",
      contenu: <>
        {champR("prixRevente", "€", "")}
        {champR("dureeMois", t.unites.mois, n0(defR.dureeMois))}
        {champR("fraisAgenceVente", "€", "0")}
        {champR("diagnostics", "€", n0(defR.diagnostics))}
        {champR("mainlevee", "€", tr.auto03)}
        {champR("chargesPortage", "€", n0(defR.chargesAnnuelles))}
        {champ("taxeFonciere", "€", n0(defR.taxeFonciere))}
        {champR("travauxEntreprisePct", "%", n0(defR.travauxEntreprisePct))}
        <label className="inv-f" htmlFor="inv-vendeurs"><span>{tr.vendeurs}</span>
          <select id="inv-vendeurs" value={defR.nbVendeurs} onChange={(e) => majR({ nbVendeurs: e.target.value === "2" ? 2 : 1 })}>
            <option value="1">{tr.unVendeur}</option><option value="2">{tr.deuxVendeurs}</option>
          </select>
        </label>
        {ckR("habite", tr.habite)}
        {rvs.habite && ckR("primo", tr.primo)}
        {ckR("etatNeuf", tr.etatNeuf)}
        {ckR("sansIra", tr.sansIra)}
        {blocVentes}
      </>,
    },
    {
      cle: "hypoR", titre: t.groupes.hypo, resume: "",
      contenu: <>
        {champ("comptableIs", "€", n0(d.comptableIs))}
        {champ("creationSociete", "€", n0(d.creationSociete))}
      </>,
    },
  ];
  const groupes = revente ? groupesRev : groupesLoc;
  const bestR = resR?.cadres.find((c) => c.cadre === resR.meilleur) ?? null;
  const ordreR = resR ? [...resR.cadres].sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.gainNet - a.gainNet) : [];
  const ligneR = (r: ResultatCadre) => {
    const ouv = ouvertR === r.cadre;
    const estBest = r.cadre === resR?.meilleur;
    const cls = (v: number) => "c mono" + (v > 0.005 ? " pos" : v < -0.005 ? " neg" : "");
    return (
      <div key={r.cadre}>
        <button type="button" className={"rrow rv" + (estBest ? " best" : "") + (r.eligible ? "" : " off")} aria-expanded={ouv} onClick={() => setOuvertR(ouv ? null : r.cadre)}>
          <span className="nmb">
            <span className="nm">
              {CHEVRON("chv2")}
              <span className="t">{tr.cadres[r.cadre]}</span>
              {estBest && <span className="inv-p best">{t.meilleur}</span>}
              {r.cadre === rvs.choix && <span className="inv-p mine">{t.tonChoix}</span>}
              {!r.eligible && <span className="inv-p off">{t.nonEligible}</span>}
            </span>
            {!r.eligible && r.raison && <span className="raison">{tr.raisons[r.raison]}</span>}
          </span>
          <span className={cls(r.gainAvant)}><span className="lb">{tr.hAvant}</span>{signe(r.gainAvant)}</span>
          <span className="c mono"><span className="lb">{tr.hImpots}</span>{fmt(r.impots)}</span>
          <span className={cls(r.gainNet)}><span className="lb">{tr.hNet}</span>{signe(r.gainNet)}</span>
          <span className={cls(r.rendementAnnuel)}><span className="lb">{tr.hAn}</span>{r.rendementAnnuel <= -1 ? "—" : r.rendementAnnuel > 9.99 ? "> 999 %" : pc(r.rendementAnnuel, 0)}</span>
          <span className="c mono"><span className="lb">{tr.hMin}</span>{fmt(r.prixMinimum)}</span>
        </button>
        {ouv && (
          <div className="det">
            <dl className="decomp">
              {r.detail.map((l) => (
                <div key={l.cle} className={l.cle === "gainAvant" || l.cle === "gainNet" ? "tot" : ""}>
                  <dt>{tr.lignes[l.cle] ?? l.cle}</dt><dd className="mono">{l.cle === "prixRevente" ? fmt(l.montant) : signe(l.montant)}</dd>
                </div>
              ))}
            </dl>
            {r.pv && <p className="note">{tr.pv(fmt(r.pv.brute), r.pv.annees, pc(r.pv.abattIR, 2), pc(r.pv.abattPS, 2), fmt(r.pv.surtaxe))}</p>}
            {r.alertes.map((a) => <div key={a} className="al">{tr.alertes[a]}</div>)}
          </div>
        )}
      </div>
    );
  };

  const ecR = resR ? ecartRevente(resR, rvs.choix) : null;
  const csR = resR && entreeR ? conseilsRevente(entreeR, resR, rvs.choix) : [];
  const best = res?.regimes.find((r) => r.regime === res.meilleur) ?? null;
  const ecL = res ? ecartLocation(res, loc.choix) : null;
  const csL = res && entree ? conseilsLocation(entree, res, loc.choix) : [];
  const ordre = res ? [...res.regimes].sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.cumulApresImpot - a.cumulApresImpot) : [];
  const H = entree?.horizon ?? 20;

  const ligne = (r: ResultatRegime) => {
    const ouv = ouvert === r.regime;
    const estBest = r.regime === res?.meilleur;
    const ecart = best ? r.cumulApresImpot - best.cumulApresImpot : 0;
    const cls = (v: number) => "c mono" + (v > 0.5 ? " pos" : v < -0.5 ? " neg" : "");
    return (
      <div key={r.regime}>
        <button type="button" className={"rrow" + (estBest ? " best" : "") + (r.eligible ? "" : " off")} aria-expanded={ouv} onClick={() => setOuvert(ouv ? null : r.regime)}>
          <span className="nmb">
            <span className="nm">
              {CHEVRON("chv2")}
              <span className="t">{t.regimes[r.regime]}</span>
              {estBest && <span className="inv-p best">{t.meilleur}</span>}
              {r.regime === loc.choix && <span className="inv-p mine">{t.tonChoix}</span>}
              {!r.eligible && <span className="inv-p off">{t.nonEligible}</span>}
              {r.regime === "bailleur_prive" && <span className="inv-p new">{t.aConfirmer}</span>}
            </span>
            {!r.eligible && r.raison && <span className="raison">{t.raisons[r.raison]}</span>}
          </span>
          <span className={cls(r.cfMensuelAn1)}><span className="lb">{t.hAn1}</span>{signe(r.cfMensuelAn1)}<span className="u">{t.parMoisCourt}</span></span>
          <span className={cls(r.cfMensuelMoyen)}><span className="lb">{t.hMoy}</span>{signe(r.cfMensuelMoyen)}<span className="u">{t.parMoisCourt}</span></span>
          <span className="c mono"><span className="lb">{t.hImpots}</span>{r.impotsCumules < -0.5 ? signe(r.impotsCumules) : fmt(r.impotsCumules)}</span>
          <span className="c mono"><span className="lb">{t.hEcart}</span>{estBest || !r.eligible ? "—" : signe(ecart)}</span>
        </button>
        {ouv && (
          <div className="det">
            <div className="tbl">
              <table>
                <caption className="sr-only">{t.detail}</caption>
                <thead><tr>
                  <th scope="col">{t.tAnnee}</th><th scope="col">{t.tLoyers}</th><th scope="col">{t.tCharges}</th><th scope="col">{t.tCredit}</th>
                  <th scope="col">{t.tImpot}</th><th scope="col">{r.regime.startsWith("is_") ? t.tPfu : t.tPs}</th><th scope="col">{t.tCf}</th>
                </tr></thead>
                <tbody>
                  {r.annees.map((a) => (
                    <tr key={a.annee}>
                      <td>{a.annee}</td><td>{fmt(a.loyers)}</td><td>{fmt(a.charges)}</td><td>{fmt(a.interets + a.assurance + a.capital)}</td>
                      <td>{signe(a.impot)}</td><td>{fmt(a.ps)}</td><td>{signe(a.cfApresImpot)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {r.tresorerieFinale != null && <p className="note">{t.tresoFinale(fmt(r.tresorerieFinale))}</p>}
            {r.alertes.map((a) => <div key={a} className="al">{t.alertes[a]}</div>)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="card av-inv">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="tete">
        <h2>{t.titre}</h2>
        <span className={"etat" + (etat === "erreur" ? " err" : "")} role="status" aria-live="polite">
          {etat === "en_cours" ? t.enregistrement : etat === "ok" ? t.enregistre : etat === "erreur" ? t.erreur : ""}
        </span>
      </div>
      <div className="sub">{revente ? tr.sub : t.sub}</div>

      <div className="seg" role="group">
        <button type="button" aria-pressed={!revente} onClick={() => setS((x) => ({ ...x, strategie: "location" }))}>{t.location}</button>
        <button type="button" aria-pressed={revente} onClick={() => setS((x) => ({ ...x, strategie: "revente" }))}>{t.revente}</button>
      </div>

      {groupes.map((g) => (
        <details key={g.cle} className="grp" open={g.ouvert}>
          <summary>{CHEVRON("chv")}<span>{g.titre}</span><span className="res">{g.resume}</span></summary>
          <div className="champs">{g.contenu}</div>
        </details>
      ))}

      {revente && alertesRevente.map((a) => <div key={a} className="al">{a}</div>)}
      {!revente && alertesLoyer.map((a) => <div key={a} className="al">{a}</div>)}
      {revente && (!resR || !bestR ? <p className="manque">{tr.manque}</p> : (
        <>
          <div className="prog">
            <div className="prow">
              <div className={"ppct" + (bestR.gainNet < -0.5 ? " neg" : "")}>
                <span className="nw">{signe(bestR.gainNet)}</span><small>{tr.net(defR.dureeMois)}</small>
              </div>
              <div className="plbl">{t.avec + " " + tr.cadres[bestR.cadre]}</div>
            </div>
            <div className={"verdict " + (bestR.gainNet >= 0 ? "g" : "r")}>
              {bestR.gainNet >= 0 ? tr.parAn(bestR.rendementAnnuel > 9.99 ? "> 999 %" : pc(bestR.rendementAnnuel, 0)) : tr.perte(fmt(bestR.prixMinimum))}
            </div>
            <div className="chips">
              <span className="chip"><span>{tr.coutOp}</span><b>{fmt(resR.coutOperation)}</b></span>
              <span className="chip"><span>{tr.mise}</span><b>{fmt(bestR.mise)}</b></span>
              <span className="chip"><span>{tr.prixMin}</span><b>{fmt(bestR.prixMinimum)}</b></span>
              <span className="chip"><span>{tr.duree}</span><b>{n0(defR.dureeMois) + " " + t.unites.mois}</b></span>
            </div>
          </div>

          <label className="inv-f chs" htmlFor="inv-r-choix"><span>{tr.choix}</span>
            <select id="inv-r-choix" value={rvs.choix ?? ""} onChange={(e) => majR({ choix: e.target.value ? (e.target.value as CadreRevente) : null })}>
              <option value="">{t.pasChoisi}</option>
              {CADRES.map((k) => <option key={k} value={k}>{tr.cadres[k]}</option>)}
            </select>
          </label>
          {ecR && (
            <div className={"chx " + (ecR.bon ? "g" : "r")} role="status">
              {ecR.bon ? tr.choixBon(tr.cadres[ecR.choix])
                : !ecR.eligible && ecR.raison ? tr.choixNonEligible(tr.cadres[ecR.choix], tr.raisons[ecR.raison as keyof typeof tr.raisons], tr.cadres[ecR.meilleur])
                : tr.choixPerte(tr.cadres[ecR.choix], fmt(ecR.perte), tr.cadres[ecR.meilleur]) + (ecR.impotsEnPlus > 0 ? t.choixImpots(fmt(ecR.impotsEnPlus)) : "")}
            </div>
          )}

          <div className="phase-t">
            <span className="pt-lbl">{tr.comparer}</span>
            <span className="pt-meta">{tr.enMois(defR.dureeMois)}</span>
          </div>
          <div className="rh rv" aria-hidden="true"><span>{tr.hCadre}</span><span>{tr.hAvant}</span><span>{tr.hImpots}</span><span>{tr.hNet}</span><span>{tr.hAn}</span><span>{tr.hMin}</span></div>
          {ordreR.map(ligneR)}

          {csR.length > 0 && (
            <>
              <div className="phase-t">
                <span className="pt-lbl">{t.astuces}</span>
                <span className="pt-meta">{t.astucesMeta(csR.length)}</span>
              </div>
              {csR.map((c) => (
                <div key={c.cle} className="cs">
                  <span>{tr.conseils[c.cle](c.valeur ?? 0)}</span>
                  {c.gain != null ? <span className="gn">{signe(c.gain)}</span> : <span className="gn i">{t.aSavoir}</span>}
                </div>
              ))}
            </>
          )}
        </>
      ))}

      {!revente && (!res || !best ? <p className="manque">{t.manque}</p> : (
        <>
          <div className="prog">
            <div className="prow">
              <div className={"ppct" + (best.cfMensuelMoyen < -0.5 ? " neg" : "")}>
                <span className="nw">{signe(best.cfMensuelMoyen)}</span><small>{t.moyenne(H)}</small>
              </div>
              <div className="plbl">{t.avec + " " + t.regimes[best.regime]}</div>
            </div>
            <div className={"verdict " + (best.cfMensuelMoyen >= 0 ? "g" : "r")}>
              {best.cfMensuelMoyen >= 0 ? t.autofinance(fmt(best.cfMensuelMoyen)) : t.effort(fmt(Math.abs(best.cfMensuelMoyen)))}
            </div>
            <div className="chips">
              <span className="chip"><span>{t.coutTotal}</span><b>{fmt(res.coutTotal)}</b></span>
              <span className="chip"><span>{t.brut}</span><b>{pc(res.rendementBrut)}</b></span>
              <span className="chip"><span>{t.brutMeuble}</span><b>{pc(res.rendementBrutMeuble)}</b></span>
              <span className="chip"><span>{t.net}</span><b>{pc(res.rendementNet)}</b></span>
              <span className="chip"><span>{t.mensualite}</span><b>{fmt(best.mensualite)}</b></span>
              {loc.valeurApres ? <span className="chip"><span>{t.valeurCreee}</span><b>{signe(loc.valeurApres - res.coutTotal)}</b></span> : null}
            </div>
          </div>

          <label className="inv-f chs" htmlFor="inv-choix"><span>{t.choix}</span>
            <select id="inv-choix" value={loc.choix ?? ""} onChange={(e) => maj({ choix: e.target.value ? (e.target.value as Regime) : null })}>
              <option value="">{t.pasChoisi}</option>
              {REGIMES.map((k) => <option key={k} value={k}>{t.regimes[k]}</option>)}
            </select>
          </label>
          {ecL && (
            <div className={"chx " + (ecL.bon ? "g" : "r")} role="status">
              {ecL.bon ? t.choixBon(t.regimes[ecL.choix])
                : !ecL.eligible && ecL.raison ? t.choixNonEligible(t.regimes[ecL.choix], t.raisons[ecL.raison as keyof typeof t.raisons], t.regimes[ecL.meilleur])
                : t.choixPerte(t.regimes[ecL.choix], fmt(ecL.perte), H, t.regimes[ecL.meilleur]) + (ecL.impotsEnPlus > 0 ? t.choixImpots(fmt(ecL.impotsEnPlus)) : t.choixHorsImpots)}
            </div>
          )}

          <div className="phase-t">
            <span className="pt-lbl">{t.comparer}</span>
            <span className="pt-meta">{t.surAns(H)}</span>
          </div>
          <div className="rh" aria-hidden="true"><span>{t.hRegime}</span><span>{t.hAn1}</span><span>{t.hMoy}</span><span>{t.hImpots}</span><span>{t.hEcart}</span></div>
          {ordre.map(ligne)}

          {csL.length > 0 && (
            <>
              <div className="phase-t">
                <span className="pt-lbl">{t.astuces}</span>
                <span className="pt-meta">{t.astucesMeta(csL.length)}</span>
              </div>
              {csL.map((c) => (
                <div key={c.cle} className="cs">
                  <span>{t.conseils[c.cle](c.valeur ?? 0)}</span>
                  {c.gain != null ? <span className="gn">{t.gainSur(fmt(c.gain), H)}</span> : <span className="gn i">{t.aSavoir}</span>}
                </div>
              ))}
            </>
          )}
        </>
      ))}

      <p className="avert">{revente ? tr.avertissement : t.avertissement}</p>
      <button type="button" className="lien disc" onClick={() => setS((x) => ({ ...x, actif: false }))}>{t.desactiver}</button>
    </div>
  );
}
