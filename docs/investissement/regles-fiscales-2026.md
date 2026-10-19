# Règles fiscales 2026 · simulateur d'investissement AVYORA

**Règles arrêtées au 19 octobre 2026.** C'est l'étape 0 du simulateur : la location après impôts, calculée année par année sur 20 ans, et l'achat-revente.

> **Avertissement.** Ce document fixe les paramètres d'une **simulation indicative**. Il ne remplace pas un conseil fiscal personnalisé. Les règles marquées « À confirmer » doivent être vérifiées, de préférence par l'expert-comptable, avant d'être affichées comme définitives. Le PLF 2027 et le PLFSS 2027 sont encore en discussion : ils ne sont pas en vigueur et n'apparaissent que dans la section « Changements à surveiller ».

**Légende du statut.**
- **Confirmé** : la règle a été trouvée, puis revérifiée sur une source officielle.
- **Corrigé** : le vérificateur a rectifié la valeur. C'est la version corrigée qui est retenue.
- **À confirmer** : la source est secondaire, les sources divergent, ou le texte n'a pas pu être relu.

**Limite commune :** Légifrance a refusé l'accès (erreur 403) pendant toute la recherche. Les articles ont été recoupés avec le BOFiP, impots.gouv et service-public, mais leur texte consolidé n'a pas été relu.

---

## Ce qu'il faut retenir

- **L'impôt sur le revenu 2026 se calcule avec le barème des revenus 2025** : tranches à 11 600 / 29 579 / 84 577 / 181 917 €. Le barème des revenus 2026 n'est pas encore voté. Le moteur calcule l'impôt **par différence**, avec et sans le projet, et jamais en multipliant par la tranche marginale (TMI).
- **Il y a deux taux de prélèvements sociaux.**
  - 17,2 % sur la location nue et sur les plus-values immobilières des particuliers.
  - 18,6 % sur les revenus LMNP (dès les revenus 2025), les dividendes, les intérêts de compte courant et les plus-values de parts de société à l'IS.
  - Dans tous les cas, la CSG déductible reste à 6,8 %.
- **Le prélèvement forfaitaire unique (PFU) passe à 31,4 % en 2026** : 12,8 % d'IR + 18,6 % de prélèvements sociaux.
- **Location nue :**
  - micro-foncier jusqu'à 15 000 € de loyers, avec un abattement de 30 % ;
  - au réel, le déficit s'impute sur le revenu global jusqu'à 10 700 € par foyer, et jusqu'à 21 400 € pour une rénovation énergétique payée au plus tard le 31/12/2027 ;
  - les intérêts d'emprunt ne s'imputent jamais sur le revenu global ;
  - le reste se reporte sur les revenus fonciers des 10 années suivantes ;
  - il faut continuer à louer 3 ans après l'imputation.
- **LMNP :**
  - micro-BIC avec 50 % d'abattement (plafond de 83 600 € pour 2026-2028), ou 30 % pour un meublé de tourisme non classé (plafond de 15 000 €) ;
  - au réel, l'amortissement est plafonné : il ne peut pas créer de déficit ;
  - le déficit ne s'impute que sur des revenus LMNP, pendant 10 ans ;
  - à la revente, les amortissements déduits **augmentent la plus-value** (cessions depuis le 15/02/2025).
- **LMP** (recettes > 23 000 € et supérieures aux autres revenus d'activité) : ce statut sort du moteur, qui affiche une alerte.
- **Société à l'IS :**
  - impôt de 15 % jusqu'à 42 500 € de bénéfice, puis 25 % ;
  - l'amortissement n'est pas plafonné ;
  - le déficit est reportable sans limite, mais il reste dans la société ;
  - à la revente, l'impôt porte sur la différence entre le prix et la valeur comptable, sans abattement ;
  - pour sortir l'argent, on rembourse d'abord le compte courant (sans impôt), puis on verse des dividendes (31,4 %) ;
  - s'ajoute une CRL de 2,5 % si l'immeuble a plus de 15 ans.
- **Une SCI qui loue en meublé passe à l'IS** (sauf si le meublé représente au plus 10 % de ses recettes). Le moteur ne doit jamais proposer « SCI à l'IR + LMNP ».
- **Plus-value d'un particulier :**
  - 19 % d'IR + 17,2 % de prélèvements sociaux, plus une surtaxe au-delà de 50 000 € de plus-value ;
  - exonération d'IR après 22 ans de détention et de prélèvements sociaux après 30 ans ;
  - forfaits de 7,5 % pour les frais d'achat et de 15 % pour les travaux (au-delà de 5 ans de détention) ;
  - la résidence principale est exonérée, mais l'exonération ne doit jamais être présentée comme garantie.
- **Marchand de biens :**
  - droits réduits à 0,715 % à l'achat, à condition de revendre sous 5 ans ;
  - sinon, droits pleins + environ 11,8 % d'intérêts de retard ;
  - une rénovation lourde rend le bien « neuf » : la revente subit alors une TVA de 20 % sur le prix total.
- **Frais d'achat dans l'ancien** : les droits sont de 6,3185 % dans 88 départements jusqu'au 31/03/2028, soit environ 8 % de frais au total avec le notaire. Il faut une table par département.
- **Points fragiles :**
  - le « statut du bailleur privé » (Jeanbrun) ;
  - les durées d'amortissement par défaut ;
  - le plafonnement de l'amortissement LMNP prévu par le PLF 2027 (non voté).

---

## 1. Thème A · Socle commun, location nue, frais d'achat et crédit

### 1.1 Impôt sur le revenu du foyer

| Règle | Valeur retenue | Source | Statut |
|---|---|---|---|
| Barème de l'IR (art. 197 CGI) | Par part : 0 % jusqu'à 11 600 € ; 11 % jusqu'à 29 579 € ; 30 % jusqu'à 84 577 € ; 41 % jusqu'à 181 917 € ; 45 % au-delà. Revenus 2025 imposés en 2026. Le barème des revenus 2026 n'est pas voté : réutiliser celui-ci avec un paramètre d'indexation | [Brochure IR 2026, tableau 5 (art. 197 CGI)](https://www.impots.gouv.fr/www2/fichiers/documentation/brochure/ir_2026/pdf_integral/Brochure-IR-2026.pdf) | Confirmé |
| Décote (art. 197 I-4 CGI) | Personne seule : si l'impôt brut est < 1 982 €, décote = 897 € − 45,25 % × impôt. Couple : si < 3 277 €, décote = 1 483 € − 45,25 % × impôt. L'impôt ne devient jamais négatif | [Brochure IR 2026 (art. 197 CGI)](https://www.impots.gouv.fr/www2/fichiers/documentation/brochure/ir_2026/pdf_integral/Brochure-IR-2026.pdf) | Confirmé |
| Plafonnement du quotient familial (art. 197 I-2 CGI) | 1 807 € par demi-part (903,50 € par quart de part) ; 4 262 € pour les 2 premières demi-parts d'un parent isolé ; 1 079 € pour la demi-part « case L » ; réduction complémentaire de 1 801 € pour une demi-part invalidité. L'IR n'est pas perçu sous 61 €. Arrondi à l'euro (art. 193 et 1657-1) | [Brochure IR 2026 p. 371-372](https://www.impots.gouv.fr/www2/fichiers/documentation/brochure/ir_2026/pdf_integral/Brochure-IR-2026.pdf) | Confirmé |
| CEHR (art. 223 sexies CGI) | 3 % du revenu fiscal de référence (RFR) entre 250 000 et 500 000 € (personne seule) ou entre 500 000 et 1 000 000 € (couple) ; 4 % au-delà. Lissage possible si le RFR dépasse 1,5 fois la moyenne des 2 années précédentes. Une plus-value immobilière imposable entre dans le RFR l'année de la vente (confiance moyenne) | [Brochure IR 2026, rubrique CEHR](https://www.impots.gouv.fr/www2/fichiers/documentation/brochure/ir_2026/pdf_integral/Brochure-IR-2026.pdf) | Confirmé |
| CDHR (art. 224 CGI ; LF 2025 art. 10, prorogée par LF 2026 art. 2) | Imposition minimale de 20 % : CDHR = max(0 ; 20 % × RFR retraité − (IR + CEHR retraités + 1 500 € par personne à charge + 12 500 € pour un couple)). Concerne les RFR > 250 000 € (seul) ou > 500 000 € (couple), avec une décote jusqu'à 330 000 / 660 000 € (coefficient 82,5 %). S'applique jusqu'au retour du déficit public sous 3 % du PIB. Option avancée | [Brochure IR 2026, nouveautés (art. 224 CGI)](https://www.impots.gouv.fr/www2/fichiers/documentation/brochure/ir_2026/pdf_som/nouveautes.pdf) | Confirmé |
| Acomptes du prélèvement à la source (art. 204 A et s. CGI) | Revenus fonciers et LMNP : acomptes mensuels d'IR et de prélèvements sociaux, calculés sur la dernière déclaration. Pour une nouvelle location, l'impôt de N est payé en partie par acomptes à partir de septembre N+1. On peut les arrêter quand la location cesse | [Brochure IR 2026, prélèvement à la source](https://www.impots.gouv.fr/www2/fichiers/documentation/brochure/ir_2026/pdf_integral/Brochure-IR-2026.pdf) | Confirmé |
| IFI (art. 964 à 983 CGI) | Dû si le patrimoine immobilier net au 1er janvier dépasse 1 300 000 €. Barème : 0 % jusqu'à 800 000 € ; 0,50 % jusqu'à 1 300 000 € ; 0,70 % jusqu'à 2 570 000 € ; 1 % jusqu'à 5 000 000 € ; 1,25 % jusqu'à 10 000 000 € ; 1,50 % au-delà. Décote entre 1,3 et 1,4 M€ : 17 500 € − 1,25 % × patrimoine. Dettes d'achat et de travaux déductibles, avec une limite au-delà de 5 M€ d'actifs. Situation au 1/1/2026. Option pour les gros patrimoines | [Brochure IR 2026, rubrique IFI](https://www.impots.gouv.fr/www2/fichiers/documentation/brochure/ir_2026/pdf_integral/Brochure-IR-2026.pdf) | Confirmé |
| Plafonnement global des niches (art. 200-0 A CGI) | 10 000 € par an et par foyer pour les réductions et crédits d'impôt (Loc'Avantages, Denormandie, Pinel résiduel…). Le déficit foncier et les amortissements n'entrent pas dans ce plafond | [Brochure IR 2026 (art. 200-0 A)](https://www.impots.gouv.fr/www2/fichiers/documentation/brochure/ir_2026/pdf_integral/Brochure-IR-2026.pdf) | À confirmer |

### 1.2 Prélèvements sociaux et PFU (communs à tous les thèmes)

Les quatre recherches donnaient parfois des taux différents selon le type de revenu. Ils ont été tranchés avec la page impots.gouv et la brochure IR 2026 (LFSS 2026, loi n° 2025-1403 du 30/12/2025, art. 12).

| Règle | Valeur retenue | Source | Statut |
|---|---|---|---|
| PS sur les revenus fonciers : location nue et SCI à l'IR (art. L136-6 et L136-8 CSS) | 17,2 % (CSG 9,2 % + CRDS 0,5 % + prélèvement de solidarité 7,5 %) sur le revenu foncier net. Revenus 2025 et 2026 | [impots.gouv, PS location (CSS L136-8)](https://www.impots.gouv.fr/particulier/questions/je-donne-un-bien-en-location-dois-je-payer-des-prelevements-sociaux) | Confirmé |
| PS sur les revenus LMNP | 18,6 % (CSG 10,6 %) sur le bénéfice net, dès les revenus 2025. Non-résident affilié à la sécurité sociale d'un pays UE/EEE ou de la Suisse : 7,5 %. Arbitrage : la fiche service-public F2329 ne cite pas la LMNP, mais la page impots.gouv cite expressément 18,6 % ; c'est ce taux qui est retenu | [impots.gouv, PS location (CSS L136-8)](https://www.impots.gouv.fr/particulier/questions/je-donne-un-bien-en-location-dois-je-payer-des-prelevements-sociaux) | Confirmé |
| PS sur les plus-values immobilières des particuliers | 17,2 %, y compris pour la revente d'un bien loué en LMNP. Non-résident affilié UE/EEE ou Suisse : 7,5 % | [service-public F2329 (LFSS 2026 art. 12)](https://www.service-public.gouv.fr/particuliers/vosdroits/F2329) | Confirmé |
| PS sur les produits de placement : dividendes, intérêts de compte courant (art. L136-7 CSS) | 18,6 % sur les produits encaissés depuis le 01/01/2026 (17,2 % en 2025). L'assurance-vie et l'épargne logement restent à 17,2 % | [impots.gouv, revenus mobiliers](https://www.impots.gouv.fr/particulier/les-revenus-mobiliers) | Confirmé |
| PS sur les plus-values mobilières, dont la vente de parts d'une société à l'IS | 18,6 % dès les revenus 2025. Les parts de SCI à l'IR relèvent des plus-values immobilières (17,2 %) | [impots.gouv, cessions mobilières](https://www.impots.gouv.fr/particulier/les-cessions-mobilieres) | Confirmé |
| CSG déductible (art. 154 quinquies CGI) | 6,8 % de l'assiette, déduite du revenu global l'année du paiement (N+1), même quand la CSG est à 10,6 %. Seulement pour les revenus imposés au barème | [Brochure IR 2026, nouveautés](https://www.impots.gouv.fr/www2/fichiers/documentation/brochure/ir_2026/pdf_som/nouveautes.pdf) | Confirmé |
| PFU (art. 200 A CGI) | 2026 : 31,4 % (12,8 % + 18,6 %) ; 2025 : 30 %. L'option globale pour le barème (avec abattement de 40 % sur les dividendes, art. 158-3-2°) n'est plus irrévocable depuis la LF 2026 (art. 126). Dispense de l'acompte de 12,8 % si le RFR de N-2 est < 50 000 € (seul) ou < 75 000 € (couple) pour les dividendes, et < 25 000 € ou < 50 000 € pour les intérêts | [impots.gouv, revenus mobiliers (art. 200 A)](https://www.impots.gouv.fr/particulier/les-revenus-mobiliers) | Confirmé |

### 1.3 Location nue (en nom propre ou en SCI à l'IR)

| Règle | Valeur retenue | Source | Statut |
|---|---|---|---|
| Recettes imposables (art. 29 CGI) | Loyers encaissés dans l'année civile, arriérés et avances compris, plus les recettes accessoires (subventions Anah, indemnités d'assurance), hors charges récupérées sur le locataire. Le dépôt de garantie est exclu, sauf s'il sert à couvrir des sommes dues | [service-public F1991 (art. 29)](https://www.service-public.gouv.fr/particuliers/vosdroits/F1991) | Confirmé |
| Micro-foncier (art. 32 CGI) | Si les recettes brutes du foyer sont ≤ 15 000 € (quote-part de SCI comprise, sans prorata) : abattement de 30 %, aucune autre charge déductible. Les déficits antérieurs s'imputent après l'abattement. Inchangé par la LF 2026 | [BOFiP BOI-RFPI-DECLA-10 (art. 32)](https://bofip.impots.gouv.fr/bofip/3973-PGP.html/identifiant=BOI-RFPI-DECLA-10-20160706) | Confirmé |
| Exclusions du micro-foncier (art. 32-2 CGI) | Monuments historiques, Malraux ancien, Périssol, Besson, Robien, Borloo, Robien ZRR, Cosse ; associé de SCI qui ne loue aucun bien nu en direct ; parts de SCPI Robien/Borloo et d'OPCI. Pinel, Duflot, Scellier et Malraux (réduction d'impôt) n'excluent pas le micro. Le statut du bailleur privé impose le régime réel | [BOFiP BOI-RFPI-DECLA-10 §60-80](https://bofip.impots.gouv.fr/bofip/3973-PGP.html/identifiant=BOI-RFPI-DECLA-10-20160706) | Confirmé |
| Option pour le réel (art. 32-4 CGI) | Irrévocable pendant 3 ans et globale pour le foyer. Elle s'exerce par le dépôt de la 2044, puis se reconduit chaque année | [BOFiP BOI-RFPI-DECLA-10 §210-260](https://bofip.impots.gouv.fr/bofip/3973-PGP.html/identifiant=BOI-RFPI-DECLA-10-20160706) | Confirmé |
| Intérêts et frais d'emprunt (art. 31 I-1° d CGI) | Déductibles sans limite l'année du paiement : intérêts, frais de dossier, frais de garantie et de mainlevée, assurance emprunteur, part non restituable d'une caution. Pour le déficit, tous sont traités comme des intérêts | [BOFiP BOI-RFPI-BASE-20-80](https://bofip.impots.gouv.fr/bofip/5808-PGP.html/identifiant=BOI-RFPI-BASE-20-80-20170901) | Confirmé |
| Autres charges déductibles (art. 31 I CGI) | Frais de gestion réels ; forfait de 20 € par local ; assurances PNO et loyers impayés ; taxe foncière hors TEOM ; provisions de copropriété non récupérables (régularisées en N+1) ; charges récupérables non récupérées au départ du locataire | [Brochure IR 2026, 2044 lignes 221-230](https://www.impots.gouv.fr/www2/fichiers/documentation/brochure/ir_2026/pdf_integral/Brochure-IR-2026.pdf) | Confirmé |
| Travaux (art. 31 I-1° a, b CGI) | Déductibles : entretien, réparation et amélioration qui ne touchent pas au gros œuvre. Non déductibles : construction, reconstruction, agrandissement, et les améliorations qui en sont indissociables | [BOFiP BOI-RFPI-BASE-20-30-10](https://bofip.impots.gouv.fr/bofip/3943-PGP.html/identifiant%3DBOI-RFPI-BASE-20-30-10-20140203) | Confirmé |
| Frais d'achat du bien | Prix, droits de mutation, émoluments de l'acte de vente, frais d'agence : non déductibles des revenus fonciers (c'est une dépense en capital). Seuls les frais de l'acte de prêt et de la garantie le sont. Ces frais comptent en revanche pour la plus-value | [Brochure IR 2026 (BOI-RFPI-BASE-20-10)](https://www.impots.gouv.fr/www2/fichiers/documentation/brochure/ir_2026/pdf_integral/Brochure-IR-2026.pdf) | Confirmé |
| Déficit foncier imputable sur le revenu global (art. 156 I-3° CGI) | 10 700 € par an et par foyer (15 300 € en Périssol ou Cosse), seulement pour la part du déficit qui ne vient pas des intérêts. Les loyers s'imputent d'abord sur les intérêts. Si le revenu global devient négatif, le déficit global est reportable 6 ans | [BOFiP BOI-RFPI-BASE-30-20 (16/09/2025)](https://bofip.impots.gouv.fr/bofip/4142-PGP.html/identifiant=BOI-RFPI-BASE-30-20-20250916) | Confirmé |
| Plafond majoré pour rénovation énergétique (art. 156 I-3° al. 4 ; LF 2026 art. 47) | Plafond = min(21 400 € ; 10 700 € (ou 15 300 €) + dépenses éligibles). Conditions : passer d'une classe E, F ou G à A, B, C ou D ; devis accepté à partir du 05/11/2022 ; dépenses payées du 01/01/2023 au 31/12/2027 ; option ligne 224 bis de la 2044. Le BOFiP affiche encore le 31/12/2025 car il n'a pas été mis à jour | [Brochure IR 2026, nouveautés revenus fonciers](https://www.impots.gouv.fr/www2/fichiers/documentation/brochure/ir_2026/pdf_som/nouveautes.pdf) | Confirmé |
| Report des déficits fonciers | Uniquement sur les revenus fonciers des 10 années suivantes, du plus ancien au plus récent. Jamais sur le revenu global. Ce qui n'est pas utilisé au bout de 10 ans est perdu | [BOFiP BOI-RFPI-BASE-30-20 §20, §450](https://bofip.impots.gouv.fr/bofip/4142-PGP.html/identifiant=BOI-RFPI-BASE-30-20-20250916) | Confirmé |
| Obligation de continuer à louer (art. 156 I-3° CGI) | Location nue jusqu'au 31/12 de la 3e année qui suit l'imputation ; en SCI, l'associé doit aussi garder ses parts. Sinon, le montant imputé est réintégré au revenu global de l'année d'imputation et devient reportable sur les revenus fonciers pendant 10 ans. Exceptions : invalidité, licenciement, décès, expropriation | [BOFiP BOI-RFPI-BASE-30-20 §340-440](https://bofip.impots.gouv.fr/bofip/4142-PGP.html/identifiant=BOI-RFPI-BASE-30-20-20250916) | Confirmé |
| Vacance et occupation personnelle (art. 15 II CGI) | Bien que le propriétaire se réserve : ni loyers imposables ni charges déductibles. Bien vacant mais réellement proposé à la location : charges déductibles. Intérêts payés après la vente ou la fin de la location : non déductibles | [Brochure IR 2026 (art. 15 II)](https://www.impots.gouv.fr/www2/fichiers/documentation/brochure/ir_2026/pdf_integral/Brochure-IR-2026.pdf) | À confirmer |
| Statut du bailleur privé, dit « Jeanbrun » (LF 2026 art. 47 ; art. 31 I-1° i et j CGI) | **Taux annuels** (loyer intermédiaire / social / très social) : neuf ou VEFA 3,5 / 4,5 / 5,5 % ; ancien avec travaux ≥ 30 % du prix 3 / 3,5 / 4 %. **Base** : 80 % du prix hors frais, plus les travaux dans l'ancien ; le total amorti ne peut pas dépasser cette base. **Plafond PAR FOYER**, tous logements confondus : 8 000 € ; 10 000 € si au moins 50 % des revenus bruts concernés viennent du social ; 12 000 € si au moins 50 % viennent du très social. **Conditions** : immeuble collectif, location nue en résidence principale pendant 9 ans, mise en location dans les 12 mois, pas de location à la famille proche, option irrévocable par logement, régime réel. Le déficit s'impute sur le revenu global dans la limite de 10 700 €. Les amortissements sont repris si l'engagement est rompu. Achats du 21/02/2026 au 31/12/2028. Confiance moyenne : les taux et la base viennent de l'ANIL, l'art. 31 n'a pas été lu | [service-public A18817](https://www.service-public.gouv.fr/particuliers/actualites/A18817) · [ANIL LF 2026](https://www.anil.org/aj-loi-finances-2026/) | Corrigé |
| Loc'Avantages (art. 199 tricies CGI) | Réduction d'impôt en location nue conventionnée avec l'Anah, prorogée jusqu'au 31/12/2027 (LF 2025 art. 88). Compatible avec le micro et le réel ; entre dans le plafond des niches. Les taux n'ont pas été vérifiés : ne pas les coder | [Brochure IR 2026, nouveautés](https://www.impots.gouv.fr/www2/fichiers/documentation/brochure/ir_2026/pdf_som/nouveautes.pdf) | À confirmer |
| SCI à l'IR, translucidité (art. 8 CGI) | La SCI ne paie pas d'impôt. Chaque associé déclare sa quote-part en revenus fonciers (art. 28 à 33), même si rien n'est distribué. Il y ajoute ses propres intérêts d'emprunt pour l'achat des parts. Pour imputer un déficit, la SCI doit louer 3 ans et l'associé garder ses parts 3 ans | [BOFiP BOI-RFPI-BASE-30-20 §340](https://bofip.impots.gouv.fr/bofip/4142-PGP.html/identifiant=BOI-RFPI-BASE-30-20-20250916) | Confirmé |
| SCI à l'IR et micro-foncier | Micro possible sur la quote-part seulement si l'associé loue aussi un bien nu en direct et si le total ne dépasse pas 15 000 €. Sinon, réel obligatoire | [BOFiP BOI-RFPI-DECLA-10 §50-120](https://bofip.impots.gouv.fr/bofip/3973-PGP.html/identifiant=BOI-RFPI-DECLA-10-20160706) | Confirmé |

### 1.4 Frais d'achat et règles de crédit

| Règle | Valeur retenue | Source | Statut |
|---|---|---|---|
| Taux départemental des droits de mutation (DMTO) (art. 1594 D CGI ; LF 2025 art. 116) | **Au 01/06/2026** : 88 collectivités à 5 % (hors primo-accédant). À 4,50 % : 05, 06, 07, 16, 26, 48, 60, 65, 71, 971, 976. À 3,80 % : Indre (36). **Primo-accédant** qui achète sa résidence principale (pas propriétaire de sa résidence principale depuis 2 ans) : taux de l'art. 1594 D, soit 4,50 % (3,80 % dans l'Indre, 4 % en Savoie). **Cas locaux** : abattement de 46 000 € dans le Calvados ; Hautes-Pyrénées à 3,80 % pour les ventes par lots. Après le 31/03/2028, retour au taux du 31/01/2025. Une société n'est jamais primo-accédante. Le chiffre de « 84 départements » du thème D est périmé | [DGFiP, taux DMTO au 1er juin 2026](https://www.impots.gouv.fr/sites/default/files/media/1_metier/3_partenaire/notaires/dmto/dmto_2026-06.pdf) | Confirmé |
| Taux global des droits dans l'ancien (art. 1594 D, 1584, 1647 V CGI) | Taux global = taux départemental × 1,0237 + 1,20 %. Soit 6,3185 % à 5 % ; 5,80665 % à 4,50 % ; 5,09006 % à 3,80 %. Taxe communale réduite au Lamentin (0,70 %) et à Tsingoni (0,50 %) | [impots.gouv, frais de notaire (17/07/2026)](https://www.impots.gouv.fr/particulier/questions/jachete-un-bien-immobilier-quaurai-je-payer-comme-frais-au-notaire) | Confirmé |
| Calendrier des délibérations (LF 2026 art. 121) | Une délibération notifiée entre le 01/12/2026 et le 15/04/2027 s'applique au 1er jour du 2e mois qui suit la notification. D'autres fenêtres (16/04 au 30/11/2027) reportent l'application au 1er janvier suivant. Il faut dater chaque taux de la table au mois | [ANIL, LF 2026](https://www.anil.org/aj-loi-finances-2026/) | À confirmer |
| Logement neuf ou VEFA soumis à TVA (art. 1594 F quinquies A) | Taxe de publicité foncière de 0,70 % + 2,14 % de frais d'assiette, soit environ 0,715 % du prix HT ; pas de taxe communale. Bien achevé depuis moins de 5 ans | [impots.gouv, frais de notaire](https://www.impots.gouv.fr/particulier/questions/jachete-un-bien-immobilier-quaurai-je-payer-comme-frais-au-notaire) | Confirmé |
| Terrain à bâtir | Acheté à un particulier ou avec une TVA sur la marge : taux de droit commun. Vente soumise à la TVA sur le prix total : environ 0,715 %. BOFiP de 2016, texte consolidé non relu | [BOFiP BOI-ENR-DMTOI-10-40](https://bofip.impots.gouv.fr/bofip/3137-PGP.html/identifiant%3DBOI-ENR-DMTOI-10-40-20160601) | Confirmé |
| Contribution de sécurité immobilière (art. 879 CGI) | 0,10 % du prix, minimum 15 € | [impots.gouv, frais de notaire](https://www.impots.gouv.fr/particulier/questions/jachete-un-bien-immobilier-quaurai-je-payer-comme-frais-au-notaire) | Confirmé |
| Émoluments du notaire (art. A444-91 C. com.) | Hors taxes, par tranche du prix : 3,870 % jusqu'à 6 500 € ; 1,596 % jusqu'à 17 000 € ; 1,064 % jusqu'à 60 000 € ; 0,799 % au-delà. Plus la TVA : 20 % en métropole, 8,5 % en Guadeloupe, Martinique et à La Réunion, 0 en Guyane et à Mayotte. Tarif reconduit jusqu'au 29/02/2028. Exemple pour 200 000 € : 1 995,25 € HT, soit 2 394 € TTC. Débours à paramétrer (environ 800 à 1 500 €) | [impots.gouv, frais de notaire](https://www.impots.gouv.fr/particulier/questions/jachete-un-bien-immobilier-quaurai-je-payer-comme-frais-au-notaire) | Confirmé |
| Normes du HCSF (décision D-HCSF-2021-7 modifiée) | Taux d'effort ≤ 35 %, assurance comprise. Durée ≤ 25 ans, portée à 27 ans dans deux cas : différé lié à l'entrée en jouissance (VEFA, construction), ou achat dans l'ancien dont au moins 10 % du crédit finance des travaux (décision du 18/12/2023). Les crédits relais qui ne dépassent pas 80 % de la valeur de vente sont exclus du taux d'effort. Les banques ont une flexibilité de 20 % de leur production. Le maintien en 2026 n'est attesté que par la presse | [service-public A17028](https://www.service-public.gouv.fr/particuliers/actualites/A17028) | Corrigé |
| Loyers futurs dans le taux d'effort | Pratique bancaire, pas une norme : 70 % des loyers attendus ajoutés aux revenus, ou méthode « différentielle ». À traiter comme un paramètre | [ATEIS (source secondaire)](https://ateispatrimoine.com/credits/hcsf/) | À confirmer |

---

## 2. Thème B · Location meublée (LMNP, LMP, SARL de famille)

Les prélèvements sociaux (18,6 % sur les loyers LMNP, 17,2 % sur la plus-value) figurent en section 1.2.

| Règle | Valeur retenue | Source | Statut |
|---|---|---|---|
| Statut LMP (art. 155 IV CGI) | **LMP** si les recettes meublées TTC du foyer dépassent 23 000 € ET dépassent les autres revenus d'activité nets du foyer ; sinon LMNP. **Recettes** : loyers charges comprises + indemnités d'assurance loyers impayés. **Revenus d'activité** : salaires, pensions, BIC hors meublé, BA, BNC, art. 62, pris nets ; les déficits de l'année comptent, pas les antérieurs ; les revenus fonciers et mobiliers sont exclus. **Annualisation** : immeuble par immeuble, seulement en début ou en fin totale d'activité, en comptant les jours depuis l'acte d'achat (ou l'achèvement). Le moteur ne calcule pas le LMP : il affiche une alerte | [BOFiP BOI-BIC-CHAMP-40-10 (15/04/2026)](https://bofip.impots.gouv.fr/bofip/3615-PGP.html/identifiant=BOI-BIC-CHAMP-40-10-20260415) | Confirmé |
| LMP des non-résidents (LF 2026 art. 53) | À partir des revenus 2026, la comparaison se fait avec les revenus d'activité mondiaux imposés dans l'État de résidence | [BOFiP BOI-BIC-CHAMP-40-10 §165](https://bofip.impots.gouv.fr/bofip/3615-PGP.html/identifiant=BOI-BIC-CHAMP-40-10-20260415) | Confirmé |
| Déficit du LMP (art. 156 I 1° ter) | Imputable sur le revenu global sans limite ; le reste se reporte sur 6 ans. Alerte seulement | [BOFiP BOI-BIC-CHAMP-40-20 §350-390](https://bofip.impots.gouv.fr/bofip/3610-PGP.html/identifiant=BOI-BIC-CHAMP-40-20-20260819) | Confirmé |
| Cotisations sociales du LMP (art. L611-1 6° CSS) | Affiliation à la Sécurité sociale des indépendants : cotisations TNS sur le bénéfice, à la place des prélèvements sociaux de 18,6 %. Pas de taux unique. Alerte | [impots.gouv, PS location](https://www.impots.gouv.fr/particulier/questions/je-donne-un-bien-en-location-dois-je-payer-des-prelevements-sociaux) | Confirmé |
| Meublé saisonnier et chambres d'hôtes : cotisations sociales | **Courte durée** avec recettes > 23 000 € : cotisations sociales au lieu des prélèvements sociaux, même en LMNP (L611-1 6°, depuis 2021), sauf mandat de gestion confié à un professionnel (exception non relue dans le CSS). **Chambres d'hôtes** : cotisations si le REVENU IMPOSABLE dépasse 13 % du plafond annuel de la Sécurité sociale (PASS) (L611-1 5°), soit 6 247,80 € en 2026 (PASS de 48 060 €) | [Dépliant DGFiP LMNP](https://www.impots.gouv.fr/sites/default/files/media/3_Documentation/depliants/nid_4011_gp_178.pdf) | Corrigé |
| Plus-value du LMP (art. 39 duodecies, 151 septies, 151 septies B) | Régime des plus-values professionnelles : court terme à hauteur des amortissements, long terme au-delà. Après 5 ans d'activité : exonération totale si les recettes sont < 90 000 € HT, partielle jusqu'à 126 000 € (PV × (126 000 − R) / 36 000). Para-hôtellerie : seuils de 250 000 / 350 000 €. Abattement possible de l'art. 151 septies B sur le long terme. Alerte seulement | [BOFiP BOI-BIC-CHAMP-40-20 §410-435](https://bofip.impots.gouv.fr/bofip/3610-PGP.html/identifiant=BOI-BIC-CHAMP-40-20-20260819) | Corrigé |
| Plafonds du micro-BIC (art. 50-0 CGI) | Revenus 2026 à 2028 : 83 600 € HT (meublé de longue durée, tourisme classé, chambres d'hôtes) ; 15 000 € HT (tourisme non classé). Revenus 2025 : 77 700 € et 15 000 €. Plafond pour tout le foyer, pas par logement. 203 100 € = plafond total en cas d'activité mixte | [BOFiP BOI-BAREME-000044 (19/08/2026)](https://bofip.impots.gouv.fr/bofip/14069-PGP.html/identifiant=BOI-BAREME-000044-20260819) | Confirmé |
| Abattement du micro-BIC (art. 50-0 ; loi Le Meur art. 7) | 50 % (longue durée, classé, chambres d'hôtes) ; 30 % (tourisme non classé) ; minimum de 305 €. Jamais de déficit. Revenus perçus depuis le 01/01/2025 | [impots.gouv, location meublée](https://www.impots.gouv.fr/particulier/location-meublee) | Confirmé |
| Sortie du micro, création, option pour le réel | Réel obligatoire après un dépassement du plafond en N-2 ET en N-1. Création d'entreprise : micro de plein droit en N et N+1 ; le CA de N, ramené à 12 mois, sert à juger N+2 (pas pour le saisonnier). L'achat d'un meublé supplémentaire par un loueur déjà actif est une simple création d'établissement : ni prorata ni période de plein droit. L'option pour le réel vaut 1 an et se reconduit tacitement. Indivision : réel en principe | [BOFiP BOI-BIC-DECLA-10-10-20 (08/2026)](https://bofip.impots.gouv.fr/bofip/1799-PGP.html/identifiant=BOI-BIC-DECLA-10-10-20-20260819) | Confirmé |
| Charges au réel (art. 39 CGI) | Intérêts, assurance emprunteur, PNO, frais de dossier et de garantie, taxe foncière, copropriété non récupérable, gestion, CFE, comptabilité, entretien et réparations. Le bien doit être inscrit à l'actif. En cas d'usage privé, la valeur locative de la partie privée s'ajoute aux recettes | [BOFiP BOI-BIC-CHAMP-40-20 §56-59](https://bofip.impots.gouv.fr/bofip/3610-PGP.html/identifiant=BOI-BIC-CHAMP-40-20-20260819) | Confirmé |
| Frais d'achat au réel (art. 38 quinquies ann. III) | Choix entre une charge immédiate ou un ajout au coût du bien, amorti avec lui (sauf la part du terrain). Ce choix est unique et irrévocable pour toutes les immobilisations | [BOFiP BOI-BIC-CHG-20-20-10](https://bofip.impots.gouv.fr/bofip/1846-PGP.html/identifiant=BOI-BIC-CHG-20-20-10-20190109) | Confirmé |
| Terrain non amortissable | Aucune part légale : le loueur doit justifier la ventilation (CE 15/02/2016 n° 367467). Le pourcentage par défaut est une hypothèse modifiable : 15 % pour un appartement en ville, 20 à 25 % pour une maison | [BOFiP BOI-BIC-CHAMP-40-20 §58](https://bofip.impots.gouv.fr/bofip/3610-PGP.html/identifiant=BOI-BIC-CHAMP-40-20-20260819) | Confirmé |
| Durées d'amortissement par composant | Aucun barème officiel. Grille par défaut modifiable : terrain 15 % ; gros œuvre 50 % du bâti sur 50 ans ; façade et toiture 15 % sur 25 ans ; installations techniques 20 % sur 20 ans ; agencements 15 % sur 12 ans ; mobilier 5 à 10 ans. Cela donne environ 3,1 % du bâti par an. Amortissement linéaire, au prorata dès la mise en location. Écart avec la grille IS (gros œuvre sur 80 ans) : voir les questions | [jedeclaremonmeuble (usage)](https://www.jedeclaremonmeuble.com/faq/quest-ce-que-la-ventilation-dun-bien-par-composants/) | À confirmer |
| Petit mobilier (BOI-BIC-CHG-20-30-10) | La tolérance de 500 € HT ne couvre ni le premier ameublement ni son renouvellement complet : l'ameublement initial s'amortit sur 5 à 10 ans, même si chaque pièce coûte moins de 500 €. Seul le remplacement ponctuel d'un élément peut passer en charges | [BOFiP BOI-BIC-CHG-20-30-10](https://bofip.impots.gouv.fr/bofip/2109-PGP.html/identifiant=BOI-BIC-CHG-20-30-10-20170301) | Corrigé |
| Limite de l'amortissement (art. 39 C II CGI) | Amortissement déductible ≤ loyers − charges liées au BIEN (gestion, entretien, assurance, intérêts, taxe foncière). Les charges propres à l'activité (comptabilité, frais juridiques, domiciliation) n'entrent pas dans ce calcul, mais sont déduites du résultat. Calcul global sur tous les meublés. L'excédent se reporte sans limite de durée. Règle sans objet à l'IS | [BOFiP BOI-BIC-AMT-20-40-10-20 §40-100](https://bofip.impots.gouv.fr/bofip/4527-PGP.html/identifiant=BOI-BIC-AMT-20-40-10-20-20170301) | Confirmé |
| Déficit LMNP (art. 156 I 1° ter CGI) | S'impute seulement sur les revenus LMNP de l'année et des 10 années suivantes. Jamais sur le revenu global, les autres BIC ou un bénéfice LMP | [impots.gouv, location meublée](https://www.impots.gouv.fr/particulier/location-meublee) | Confirmé |
| Plus-value LMNP : réintégration des amortissements (art. 150 VB III ; LF 2025 art. 84) | **Principe** (cessions depuis le 15/02/2025) : le prix d'achat est diminué des amortissements du prix effectivement déduits (ligne 25 de la 2048-IMM), y compris ceux d'avant 2025. Les travaux retenus au réel sont diminués de leurs amortissements déduits (ligne 23). **Non réintégrés** : les amortissements reportés jamais utilisés et le mobilier. **Biens exclus** : résidences étudiantes et seniors (L631-12/13 CCH), établissements pour personnes âgées ou handicapées (L312-1 I 6° et 7° CASF), unités de soins de longue durée. Les forfaits de 7,5 % et 15 % restent applicables, et la notice ne prévoit pas de réduire le forfait de 15 %. **Arbitrage** : le thème D jugeait ces détails incertains ; la notice officielle 2048-IMM de mai 2026 les confirme | [Notice 2048-IMM (05-2026)](https://www.impots.gouv.fr/sites/default/files/formulaires/2048-imm/2026/2048-imm_5458.pdf) | Confirmé |
| CFE du loueur en meublé (art. 1447, 1478, 1647 D CGI) | **Principe** : due même en LMNP. Aucune CFE l'année de création ; base réduite de moitié la 1re année d'imposition. **Exonérations** : recettes de N-2 ≤ 5 000 € (si la base minimum s'applique) ; location occasionnelle d'une partie de son logement ; partie de sa résidence principale louée comme résidence principale du locataire à un loyer raisonnable (2026 : 215 €/m²/an en Île-de-France, 159 € ailleurs). La CVAE s'ajoute au-delà de 152 500 € HT. Le montant dépend de la commune : saisie par l'utilisateur (repère indicatif : 200 à 600 €) | [impots.gouv, CFE location meublée (08/07/2026)](https://www.impots.gouv.fr/particulier/questions/je-fais-de-la-location-meublee-dois-je-payer-de-la-cfe-cotisation-fonciere-des) | Confirmé |
| TVA (art. 261 D 4° CGI) | Location meublée d'habitation exonérée, sans option possible. TVA à 10 % si le loueur fournit au moins 3 des 4 services para-hôteliers. Le moteur raisonne hors TVA | [FAQ DGFiP LMNP 03/2026](https://www.impots.gouv.fr/sites/default/files/media/1_metier/5_international/actualite/faq-lmnp-03_2026.pdf) | Confirmé |
| Résidence de services avec bail commercial (art. 261 D 4° c) | Loyers soumis à la TVA (10 %). La TVA de 20 % sur le prix d'achat est récupérable, avec un engagement sur 20 ans. Utile seulement si le moteur propose « résidence gérée » | [FAQ DGFiP LMNP 03/2026](https://www.impots.gouv.fr/sites/default/files/media/1_metier/5_international/actualite/faq-lmnp-03_2026.pdf) | À confirmer |
| Exonérations d'IR (art. 35 bis CGI) | Chambre de sa résidence principale louée comme résidence principale du locataire, à loyer raisonnable (215 / 159 €/m²/an en 2026) ; chambres d'hôtes jusqu'à 760 € TTC par an. Locations jusqu'au 31/12/2026 | [BOFiP BOI-BIC-CHAMP-40-20 §60-170](https://bofip.impots.gouv.fr/bofip/3610-PGP.html/identifiant=BOI-BIC-CHAMP-40-20-20260819) | Confirmé |
| Définition du logement meublé (décret n° 2015-981) | 11 éléments obligatoires : literie, occultation des chambres, plaques, four ou micro-ondes, réfrigérateur avec compartiment à −6 °C ou moins, vaisselle, ustensiles, table et sièges, étagères, luminaires, matériel d'entretien. Sinon, risque de requalification en location nue | [service-public F34769](https://www.service-public.gouv.fr/particuliers/vosdroits/F34769) | Confirmé |
| SARL de famille à l'IR (art. 239 bis AA CGI) | Associés de la même famille (ligne directe, frères et sœurs, conjoints, partenaires de PACS), avec option signée par tous. Chaque associé est imposé en BIC sur sa quote-part, et le statut LMNP ou LMP s'apprécie par associé. Dans le moteur : LMNP au réel, associé par associé | [BOFiP BOI-IS-CHAMP-20-20-10](https://bofip.impots.gouv.fr/bofip/4222-PGP.html/identifiant=BOI-IS-CHAMP-20-20-10-20180704) | Confirmé |
| SARL de famille : revente du bien (art. 39 duodecies) | Le bien est à l'actif de la société, donc la revente relève des plus-values professionnelles. Court terme = amortissements pratiqués, imposés au barème avec les prélèvements sociaux des BIC ; long terme = 12,8 % + prélèvements sociaux. Pas d'abattement pour durée de détention. Exonération de l'art. 151 septies seulement si l'associé est LMP | [BOFiP BOI-IS-CHAMP-20-20-10 §300](https://bofip.impots.gouv.fr/bofip/4222-PGP.html/identifiant=BOI-IS-CHAMP-20-20-10-20180704) | À confirmer |
| SCI qui loue en meublé (art. 206-2 CGI) | Toute la société passe à l'IS, sauf si ses recettes commerciales HT ne dépassent pas 10 % de ses recettes totales HT. Un dépassement isolé est toléré si la moyenne sur 4 ans reste ≤ 10 %. « SCI à l'IR en LMNP » n'existe pas | [BOFiP BOI-IS-CHAMP-10-30](https://bofip.impots.gouv.fr/bofip/6585-PGP.html/identifiant=BOI-IS-CHAMP-10-30-20180704) | Confirmé |
| Réduction d'impôt pour frais de comptabilité / OGA (art. 199 quater B) | Abrogée depuis le 01/01/2025 (LF 2025 art. 11). Les frais restent seulement déductibles au réel | [BOFiP ACTU-2025-00063](https://bofip.impots.gouv.fr/bofip/14647-PGP.html/ACTU-2025-00063) | Confirmé |

---

## 3. Thème C · Détention en société à l'IS (SCI, SAS, SARL) et sortie des fonds

Les dividendes (PFU de 31,4 % ou barème) figurent en section 1.2.

| Règle | Valeur retenue | Source | Statut |
|---|---|---|---|
| Taux normal de l'IS (art. 219 I CGI) | 25 % (exercices ouverts depuis le 01/01/2022), inchangé par la LF 2026 | [BOFiP BOI-IS-LIQ-20-10 (art. 219)](https://bofip.impots.gouv.fr/bofip/2062-PGP.html/identifiant=BOI-IS-LIQ-20-10-20230621) | Confirmé |
| Taux réduit des PME (art. 219 I b CGI) | 15 % sur les 42 500 premiers € de bénéfice par période de 12 mois (montant proratisé si l'exercice est plus court ou plus long), puis 25 %. Conditions : CA HT < 10 M€ (CA de tout le groupe, CE 13/03/2025), capital entièrement libéré à la clôture, détenu à 75 % au moins par des personnes physiques. Le relèvement à 100 000 € n'a pas été retenu dans la LF 2026 | [impots.gouv, actualité du 14/04/2026](https://www.impots.gouv.fr/actualite/taux-reduit-dimpot-sur-les-societes-le-critere-du-chiffre-daffaires-revu-pour-les) | Confirmé |
| Contribution sociale de 3,3 % (art. 235 ter ZC) | 3,3 % de l'IS au-delà de 763 000 €. Exonération si le CA est < 7 630 000 € et le capital détenu à 75 % par des personnes physiques. Dans le moteur : 0 | [BOFiP BOI-IS-AUT-10-10](https://bofip.impots.gouv.fr/bofip/3491-PGP.html/identifiant=BOI-IS-AUT-10-10-20180801) | Confirmé |
| Contribution exceptionnelle des grandes entreprises (LF 2025 art. 48, prorogée par LF 2026 art. 12) | 20,6 % ou 41,2 %, pour un CA de 1 Md€ ou plus (1,5 Md€ pour le 2e exercice). Dans le moteur : 0 | [BOFiP ACTU-2026-00097](https://bofip.impots.gouv.fr/bofip/15092-PGP.html/ACTU-2026-00097) | Confirmé |
| Taxe sur les holdings patrimoniales (art. 235 ter C ; LF 2026 art. 7) | 20 % de la valeur vénale de certains actifs, pour les exercices clos à partir du 31/12/2026. Selon les avocats : actifs totaux ≥ 5 M€, contrôle ≥ 50 % par une personne physique, revenus passifs > 50 % (loyers compris). Un logement est visé s'il est occupé gratuitement ou loué sous le prix du marché. Taxe non déductible de l'IS ; les parts taxées sont exonérées d'IFI. La brochure officielle parle de « patrimoine financier » : la liste exacte reste à confirmer. Alerte seulement | [Brochure IR 2026, nouveautés](https://www.impots.gouv.fr/www2/fichiers/documentation/brochure/ir_2026/pdf_som/nouveautes.pdf) · [Alister avocats](https://alister-avocats.eu/actualite/nouvelle-taxe-holdings-sur-les-actifs-somptuaires-detenus-par-les-societes-patrimoniales/) | À confirmer |
| Option d'une SCI pour l'IS (art. 206-3 et 239 CGI) | Révocable jusqu'au 5e exercice qui suit l'option (avant la fin du mois qui précède le 1er acompte de cet exercice), puis irrévocable. Après une renonciation, impossible d'opter de nouveau. Le moteur ne simule aucun aller-retour | [BOFiP BOI-IS-CHAMP-20-20-30](https://bofip.impots.gouv.fr/bofip/4436-PGP.html/identifiant=BOI-IS-CHAMP-20-20-30-20221123) | Confirmé |
| Loyers (art. 38-2 bis CGI) | Comptabilité d'engagement : on retient les loyers dus pour l'exercice. Location nue de logements exonérée de TVA, sans option. Rien n'est taxé chez l'associé tant que rien n'est distribué | [impots.gouv, livret fiscal SCI](https://www.impots.gouv.fr/sites/default/files/media/1_metier/2_professionnel/EV/1_creation_entreprise/livret_fiscal/nid_12250_sci_livret_fiscal_createur_dentreprise.pdf) | Confirmé |
| Charges déductibles (art. 39-1 CGI) | Intérêts, frais d'emprunt, assurances, taxe foncière, copropriété, entretien, gestion, expert-comptable (TTC si la TVA n'est pas récupérable), frais bancaires, CFE, CRL (déductibilité probable, non confirmée), frais d'achat si option « charges », amortissements. La taxe holdings n'est pas déductible | [BOFiP BOI-BIC-CHG](https://bofip.impots.gouv.fr/bofip/1846-PGP.html/identifiant=BOI-BIC-CHG-20-20-10-20190109) | Confirmé |
| Frais d'achat de l'immeuble (art. 38 quinquies ann. III) | Charge immédiate ou ajout au coût du bien. Choix irrévocable, valable pour toutes les immobilisations de la société, qui suit le choix comptable | [BOFiP BOI-BIC-CHG-20-20-10 §140-170](https://bofip.impots.gouv.fr/bofip/1846-PGP.html/identifiant=BOI-BIC-CHG-20-20-10-20190109) | Confirmé |
| Terrain (art. 39-1-2° CGI) | Jamais amorti, même pour un appartement en copropriété | [BOFiP BOI-BIC-AMT-10-20](https://bofip.impots.gouv.fr/bofip/4590-PGP.html/identifiant=BOI-BIC-AMT-10-20-20221221) | Confirmé |
| Amortissement par composants (art. 39-1-2° ; art. 15 bis ann. II) | Linéaire, sur la durée réelle de chaque composant. Pour un immeuble de placement (occupé à plus de 50 % par des tiers), la structure s'amortit sur sa durée RÉELLE (exemple du BOFiP : 80 ans, soit 1,25 % par an). Pas de plafond de type art. 39 C II : l'amortissement peut créer un déficit | [BOFiP BOI-BIC-AMT-10-40-10](https://bofip.impots.gouv.fr/bofip/2060-PGP.html/identifiant=BOI-BIC-AMT-10-40-10-20131216) | Confirmé |
| Grille de durées par défaut (usage) | Terrain 15 % ; gros œuvre 50 % du bâti sur 80 ans par défaut (curseur de 50 à 80 ans) ; toiture et façade 15 % sur 25 ans ; installations techniques 20 % sur 20 à 25 ans ; agencements 15 % sur 10 à 15 ans ; mobilier 5 à 10 ans ; travaux 10 à 15 ans. Le chercheur proposait 50 ans « par prudence », mais c'est l'inverse : 50 ans amortit plus vite que 80 ans | [Indy (usage)](https://www.indy.fr/guide/sci/fiscalite/amortissement/) | À confirmer |
| Amortissement minimal (art. 39 B CGI) | Au moins l'amortissement linéaire chaque année. Ce qui n'est pas pratiqué est perdu : impossible de décaler un amortissement pour lisser le résultat | [BOFiP BOI-BIC-AMT-10-40-10 §190](https://bofip.impots.gouv.fr/bofip/2060-PGP.html/identifiant=BOI-BIC-AMT-10-40-10-20131216) | Confirmé |
| Report en avant des déficits (art. 209 I CGI) | Sans limite de durée. Imputation annuelle limitée à 1 M€ + 50 % du bénéfice au-delà. Le déficit ne passe jamais chez l'associé. Il est perdu en cas de changement d'objet ou d'activité réelle, de dissolution ou de transformation (art. 221-5) | [BOFiP BOI-IS-DEF-10-30](https://bofip.impots.gouv.fr/bofip/2103-PGP.html/identifiant=BOI-IS-DEF-10-30-20130410) | Confirmé |
| Report en arrière, ou carry-back (art. 220 quinquies CGI) | Sur option, imputation sur le bénéfice de N-1 seulement, dans la limite de 1 M€. La créance est égale à l'IS payé sur ce bénéfice (on impute d'abord sur la part taxée à 25 %). Elle est utilisable 5 ans, puis remboursée. Interdit l'année de cessation. Désactivé par défaut | [BOFiP BOI-IS-DEF-20-20](https://bofip.impots.gouv.fr/bofip/5647-PGP.html/identifiant=BOI-IS-DEF-20-20-20220202) | Confirmé |
| Paiement de l'IS (art. 1668 CGI) | 4 acomptes de 25 % (15/03, 15/06, 15/09, 15/12) si l'IS du dernier exercice atteint 3 000 €. Solde au 15 du 4e mois après la clôture (le 15/05 pour une clôture au 31/12). L'IS de l'exercice n est donc décaissé en n+1 | [impots.gouv, imposition des résultats](https://www.impots.gouv.fr/professionnel/imposition-des-resultats) | Confirmé |
| Contribution sur les revenus locatifs, CRL (art. 234 nonies et s. CGI) | 2,5 % des recettes ENCAISSÉES (loyers + provisions de charges et taxes récupérables encaissées + dépenses mises à la charge du locataire), pour chaque local d'un immeuble achevé depuis au moins 15 ans au 1er janvier. Exonération si les recettes du local ne dépassent pas 1 830 €/an (proratisé), si le local est soumis à TVA, ou s'il s'agit d'une construction, reconstruction ou d'un agrandissement de moins de 15 ans. Acompte = 2,5 % des recettes de N-1, sauf la 1re année ou s'il ne dépasse pas 100 € | [BOFiP BOI-RFPI-CTRL-20-30](https://bofip.impots.gouv.fr/bofip/9661-PGP.html/identifiant=BOI-RFPI-CTRL-20-30-20140808) | Corrigé |
| CFE d'une société (art. 1447, 1478 II, 1647 D) | Location nue de logements : pas de CFE. Locaux professionnels nus : CFE si les recettes atteignent 100 000 €. Meublé : CFE, mais rien l'année de création, base réduite de moitié l'année suivante, et exonération si les recettes de N-2 ne dépassent pas 5 000 €. Repère de 300 €/an non officiel | [impots.gouv, CFE location meublée](https://www.impots.gouv.fr/particulier/questions/je-fais-de-la-location-meublee-dois-je-payer-de-la-cfe-cotisation-fonciere-des) | Corrigé |
| Intérêts du compte courant d'associé (art. 39-1-3° et 212 CGI) | Déductibles jusqu'à un taux plafond trimestriel : 4,33 % pour les exercices clos du 30/06 au 29/09/2026, 4,55 % pour une clôture au 31/12/2025. Le capital doit être libéré. Chez l'associé : 31,4 %. Par défaut, le moteur prend un compte courant sans intérêts | [Legifiscal, taux du 3e trimestre 2026](https://www.legifiscal.fr/actualites-fiscales/4595-comptes-courants-associes-taux-interet-maximum-3e-trimestre-2026.html) | À confirmer |
| Dividendes du gérant majoritaire de SARL (art. L131-6 CSS) | La part des dividendes au-delà de 10 % de (capital + primes + comptes courants) supporte les cotisations des indépendants (environ 40 à 45 %, paramètre non officiel) au lieu des 18,6 % ; le reste suit le PFU. Ne concerne ni la SAS ni l'associé de SCI (Cass. civ. 2e, 19/10/2023) | [Le Coin des Entrepreneurs (L131-6 CSS)](https://www.lecoindesentrepreneurs.fr/dividendes-du-gerant-majoritaire/) | Confirmé |
| Remboursement du compte courant et des apports | Compte courant : non imposable, dans la limite de son solde. Apports remboursés pendant la vie de la société : non imposables seulement si tous les bénéfices et réserves (sauf la réserve légale) ont déjà été distribués (art. 112-1°) ; sinon, imposés comme des dividendes à hauteur de ces réserves. En liquidation, c'est l'art. 161 qui s'applique | [BOFiP BOI-RPPM-RCM-10-20-30-10](https://bofip.impots.gouv.fr/bofip/2838-PGP.html/identifiant=BOI-RPPM-RCM-10-20-30-10-20191220) | Corrigé |
| Plus-value de cession de l'immeuble (art. 38, 39 duodecies, 219 CGI) | PV = prix net de frais − valeur nette comptable (VNC = coût + frais incorporés + travaux immobilisés − amortissements). Taxée à l'IS (15 % puis 25 %). Ni abattement pour durée de détention, ni surtaxe de l'art. 1609 nonies G. Immeuble de moins de 5 ans ou rendu à l'état neuf : vente soumise à TVA, raisonner hors taxes | [BOFiP BOI-BIC-PVMV](https://bofip.impots.gouv.fr/bofip/5767-PGP.html/identifiant=BOI-BIC-PVMV-10-20-20-20120912) | Confirmé |
| Vente des parts plutôt que de l'immeuble (art. 726 I-2° et 150-0 A) | Droits de 5 % payés par l'acheteur, sur (valeur des immeubles − dettes liées à leur achat + autres actifs). Plus-value de l'associé = prix des parts − prix d'achat des parts, taxée au PFU de 31,4 %. Option avancée | [BOFiP BOI-ENR-DMTOM-40-10-20](https://bofip.impots.gouv.fr/bofip/3262-PGP.html/identifiant=BOI-ENR-DMTOM-40-10-20-20240424) | Confirmé |
| Liquidation : boni et droit de partage (art. 161 et 746 CGI) | Boni = actif net − apports, imposé comme un dividende. Droit de partage de 2,5 % sur tout l'actif net partagé, apports compris, non déductible | [BOFiP BOI-ENR-PTG](https://bofip.impots.gouv.fr/bofip/3258-PGP.html/identifiant=BOI-ENR-PTG-20200630) | Confirmé |
| Réserve légale (art. L232-10 C. com.) | En SAS et SARL (pas en SCI) : 5 % du bénéfice mis en réserve jusqu'à ce que la réserve atteigne 10 % du capital. Impact négligeable | [Légifrance L232-10](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006229399) | À confirmer |
| Honoraires d'expert-comptable (usage) | SCI à l'IS : 1 200 € HT/an (fourchette 600 à 2 500 €). SAS ou SARL : 1 500 € HT/an. SCI à l'IR, pour comparaison : 300 à 800 €. Compter le TTC si la TVA n'est pas récupérable. Ajouter 50 à 100 € de frais bancaires et 0 à 150 € de greffe | [les-experts-comptables.fr](https://les-experts-comptables.fr/ressources/cout-comptabilite-sci) | À confirmer |
| Frais de création | Annonce légale au forfait 2026 en métropole : SCI 191 € HT, SAS 199 € HT, SARL 148 € HT. Le total est une hypothèse : 1 000 € pour une SCI, 1 200 € pour une SAS ou SARL | [justice.fr, annonces légales](https://www.justice.fr/fiche/publier-annonce-legale) | Confirmé |
| SAS/SARL ou SCI à l'IS | Mêmes règles d'IS. Différences : cotisations sur les dividendes du gérant majoritaire de SARL, réserve légale, IS d'office pour une SCI qui loue en meublé ou fait de l'achat-revente habituel, honoraires plus élevés | [BOFiP BOI-IS-CHAMP-10-30](https://bofip.impots.gouv.fr/bofip/6585-PGP.html/identifiant=BOI-IS-CHAMP-10-30-20180704) | Confirmé |

---

## 4. Thème D · Achat-revente (particulier, résidence principale, marchand de biens)

Règles communes traitées ailleurs :
- prélèvements sociaux de 17,2 % sur la plus-value (section 1.2) ;
- droits de mutation (section 1.4) ;
- réintégration des amortissements LMNP (section 2) ;
- IS et dividendes d'une société de marchand de biens (sections 3 et 1.2).

| Règle | Valeur retenue | Source | Statut |
|---|---|---|---|
| Taux d'IR sur la plus-value (art. 150 U et 200 B CGI) | 19 % de la plus-value nette après abattement IR, payé par le notaire. Personne physique ou SCI à l'IR, hors activité professionnelle | [service-public F10864](https://www.service-public.gouv.fr/particuliers/vosdroits/F10864) | Confirmé |
| Abattement pour durée de détention, volet IR (art. 150 VC CGI) | 0 jusqu'à 5 ans ; 6 % par an de la 6e à la 21e année ; 4 % la 22e ; exonération au-delà de 22 ans | [BOFiP BOI-RFPI-PVI-20-20](https://bofip.impots.gouv.fr/doctrine/BOI-RFPI-PVI-20-20) | Confirmé |
| Abattement pour durée de détention, volet PS (art. 150 VC CGI) | 1,65 % par an de la 6e à la 21e année ; 1,60 % la 22e ; 9 % par an de la 23e à la 30e ; exonération au-delà de 30 ans | [BOFiP BOI-RFPI-PVI-20-20](https://bofip.impots.gouv.fr/doctrine/BOI-RFPI-PVI-20-20) | Confirmé |
| Durée de détention (art. 150 VC CGI) | Nombre d'années complètes de 12 mois. Point de départ : date de l'acte authentique ; condition suspensive : date de sa réalisation ; VEFA : date du contrat ; donation : date de l'acte ; succession : date du décès ; achat en plusieurs fois : date de chaque fraction. Construction faite par le vendeur : le terrain compte depuis son achat, la construction depuis l'ouverture du chantier | [BOFiP BOI-RFPI-PVI-20-20](https://bofip.impots.gouv.fr/doctrine/BOI-RFPI-PVI-20-20) | Confirmé |
| Frais d'achat ajoutés au prix (art. 150 VB II 3°) | Pour un achat : max(frais réels ; 7,5 % du prix). Pour une donation ou une succession : frais réels seulement | [BOFiP BOI-RFPI-PVI-20-10-20-20](https://bofip.impots.gouv.fr/doctrine/BOI-RFPI-PVI-20-10-20-20) | Confirmé |
| Travaux ajoutés au prix (art. 150 VB II 4°) | Soit les travaux réels de construction, reconstruction, agrandissement ou amélioration, faits par une entreprise, facturés et non déduits ailleurs ; soit un forfait de 15 % du prix si le bien bâti est détenu depuis plus de 5 ans. Pas de cumul. Exclus : entretien et réparations, intérêts d'emprunt, dépenses payées sous le micro-foncier, dépenses déjà imputées en déficit foncier (seule la part non imputée faute de plafond est reprise) | [BOFiP BOI-RFPI-PVI-20-10-20-20](https://bofip.impots.gouv.fr/doctrine/BOI-RFPI-PVI-20-10-20-20) | Confirmé |
| Autres sommes ajoutées au prix (art. 150 VB II 1° et 5°) | Charges et indemnités prévues au profit du vendeur ; frais de voirie, réseaux et distribution pour un terrain à bâtir | [BOFiP BOI-RFPI-PVI-20-10-20-20](https://bofip.impots.gouv.fr/doctrine/BOI-RFPI-PVI-20-10-20-20) | Confirmé |
| Frais de vente déductibles (art. 150 VA ; ann. III art. 41 duovicies H) | Liste fermée : agence à la charge du vendeur, diagnostics, mainlevée d'hypothèque, TVA acquittée, indemnité d'éviction du locataire, honoraires d'architecte pour un permis. Les IRA et les frais d'acte ne sont pas déductibles | [BOFiP BOI-RFPI-PVI-20-10-10 §80](https://bofip.impots.gouv.fr/doctrine/BOI-RFPI-PVI-20-10-10) | Confirmé |
| Moins-value (art. 150 VD CGI) | Ni imputable ni reportable, sauf vente en bloc d'un bien acheté en plusieurs fois | [BOFiP BOI-RFPI-PVI-20-20](https://bofip.impots.gouv.fr/doctrine/BOI-RFPI-PVI-20-20) | Confirmé |
| Exonération si prix ≤ 15 000 € (art. 150 U II 6°) | Pas d'IR ni de prélèvements sociaux. Seuil par bien et par quote-part (indivision, époux même en communauté). Plusieurs lots vendus au même acheteur s'additionnent, sauf parcelles distinctes et non voisines | [BOFiP BOI-RFPI-PVI-10-40-70](https://bofip.impots.gouv.fr/bofip/4290-PGP.html/identifiant=BOI-RFPI-PVI-10-40-70-20140414) | Confirmé |
| Surtaxe sur les plus-values élevées (art. 1609 nonies G CGI) | De 2 % à 6 %, avec lissage (formule 55), si la plus-value nette imposable à l'IR dépasse 50 000 €. Seuil apprécié par vendeur. Pas de surtaxe sur les terrains à bâtir ni sur les plus-values exonérées. En SCI à l'IR, le seuil s'apprécie en principe au niveau de la société, mais il est admis de le calculer par associé à l'IR | [BOFiP BOI-RFPI-TPVIE-20](https://bofip.impots.gouv.fr/doctrine/BOI-RFPI-TPVIE-20) | Confirmé |
| Résidence principale (art. 150 U II 1°) | Exonération totale (IR, prélèvements sociaux, surtaxe), sans plafond ni limite du nombre de ventes, si le bien est la résidence habituelle et effective du vendeur au jour de la vente. Aucune durée minimale. Les dépendances suivent (garage à moins de 1 km). Après une séparation, l'exonération reste possible si l'ex-conjoint a occupé le logement jusqu'à sa mise en vente | [BOFiP BOI-RFPI-PVI-10-40-10](https://bofip.impots.gouv.fr/doctrine/BOI-RFPI-PVI-10-40-10) | Confirmé |
| Résidence principale quittée avant la vente | Exonération maintenue si la vente intervient dans un « délai normal », en principe 1 an au maximum, sans location ni prêt du logement entre-temps, et avec une mise en vente au prix du marché | [BOFiP BOI-RFPI-PVI-10-40-10 §190](https://bofip.impots.gouv.fr/doctrine/BOI-RFPI-PVI-10-40-10) | Confirmé |
| Occupation très courte de la résidence principale | Aucune durée minimale : le juge regarde l'occupation effective, pas l'intention (CE 14/03/2025 n° 474943, lu via des commentaires). Les décisions de CAA et du TA Paris (2026) n'ont pas été vérifiées. Afficher un avertissement si l'occupation dure moins de 12 mois, et ne jamais garantir l'exonération | [Fiscalonline (commentaire)](https://fiscalonline.com/patrimoine/Exoneration-residence-principale-primaute-du-critere-objectif-d-occupation-effective-sur-tout-element-subjectif-d-intention) | À confirmer |
| Remploi lors de la 1re vente d'un logement autre que la résidence principale (art. 150 U II 1° bis) | PV exonérée = PV × (prix remployé / prix de vente). Conditions : ne pas avoir été propriétaire de sa résidence principale dans les 4 ans, remployer le prix sous 24 mois dans sa résidence principale, une seule fois dans sa vie | [BOFiP BOI-RFPI-PVI-10-40-30](https://bofip.impots.gouv.fr/doctrine/BOI-RFPI-PVI-10-40-30) | Confirmé |
| Non-résident vendant son ancien logement en France (art. 150 U II 2°) | Exonération d'IR plafonnée à 150 000 € de plus-value nette, pour une seule résidence. Conditions : avoir eu son domicile fiscal en France au moins 2 ans de suite, et vendre dans les 5 ans du départ (ou sans délai si le bien est libre depuis le 1er janvier de l'année précédente) | [BOFiP BOI-RFPI-PVI-10-40-50](https://bofip.impots.gouv.fr/doctrine/BOI-RFPI-PVI-10-40-50) | Confirmé |
| Autres exonérations (art. 150 U II) | Vente d'un droit de surélévation jusqu'au 31/12/2026. Vente à un organisme de logement social jusqu'au 31/12/2027 (LF 2026 art. 52). Retraités et invalides, vente en 2026 : RFR ≤ 12 793 € + 3 428 € par demi-part. Entrée en EHPAD : 30 024 € + 7 015 € + 5 522 €, vente dans les 2 ans | [service-public F10864](https://www.service-public.gouv.fr/particuliers/vosdroits/F10864) | Confirmé |
| Abattements exceptionnels (art. 150 VE CGI) | 70 % (opérations GOU et ORT) ou 60 % (zones A bis, A, B1), portés à 85 % si au moins 50 % de logements sociaux ou intermédiaires. Il faut démolir puis reconstruire des immeubles collectifs sous 4 ans. Les dates divergent : service-public parle de promesses signées de 2024 à 2027 ; l'ANIL lit une prorogation du seul abattement de 70 %, pour des ventes jusqu'au 31/12/2027. Hors du cœur du simulateur | [service-public F10864](https://www.service-public.gouv.fr/particuliers/vosdroits/F10864) · [ANIL LF 2026](https://www.anil.org/aj-loi-finances-2026/) | À confirmer |
| Réintégration des amortissements du « bailleur privé » dans la plus-value | Deux lectures. L'ANIL estime que la LF 2026 (art. 47) étend la réduction du prix d'achat de l'art. 150 VB III aux amortissements du statut du bailleur privé. Le vérificateur du thème A n'a trouvé aucun texte qui le prévoit et y voit une simple analogie. À afficher comme une hypothèse prudente, activable | [ANIL LF 2026](https://www.anil.org/aj-loi-finances-2026/) · [service-public A18817](https://www.service-public.gouv.fr/particuliers/actualites/A18817) | À confirmer |
| Requalification en marchand de biens (art. 35 I 1° CGI) | Le profit devient un BIC en cas d'achats-reventes habituels avec intention de revendre dès l'achat. Indices : délai court, profit élevé, division du bien, rénovation pour revendre. Vaut même à titre accessoire. Conséquences : plus d'abattement ni d'exonération de résidence principale, barème de l'IR + cotisations, TVA possible, intérêts de retard, majoration jusqu'à 40 %. Une résidence principale réellement occupée relève de la gestion privée | [BOFiP BOI-BIC-CHAMP-20-10-10](https://bofip.impots.gouv.fr/bofip/4718-PGP.html) | Confirmé |
| Droits réduits du marchand de biens (art. 1115 CGI) | 0,715 % (taxe de 0,70 % + frais d'assiette) au lieu des droits de mutation, plus la CSI et les émoluments. L'acheteur doit être assujetti à la TVA et s'engager à revendre sous 5 ans (2 ans pour une vente à la découpe de plus de 5 logements avec droit de préemption). Un engagement de construire peut remplacer l'engagement de revendre (art. 1594-0 G) | [BOFiP BOI-ENR-DMTOI-10-50](https://bofip.impots.gouv.fr/doctrine/BOI-ENR-DMTOI-10-50) | Confirmé |
| Frais d'achat totaux d'un marchand de biens | Environ 2 à 3 % du prix (0,715 % + CSI + émoluments TTC + environ 1 000 € de débours), contre environ 7 à 8 % pour un particulier dans l'ancien. Ordre de grandeur | [notaires.fr](https://www.notaires.fr/fr/immobilier-fiscalite/financement/les-frais-dacquisition) | À confirmer |
| Sanction si le bien n'est pas revendu à temps (art. 1840 G ter CGI) | Le marchand paie les droits de droit commun dont il avait été dispensé, au tarif du jour de l'achat, frais d'assiette compris (jusqu'à 6,3185 %). S'y ajoute un intérêt de retard de 0,20 % par mois, compté depuis le mois qui suit le délai de présentation de l'ACTE D'ACHAT : environ 59 mois, soit environ 11,8 % des droits, pour une régularisation à 5 ans. Pas de droit supplémentaire de 1 %. Prorata en cas de revente partielle. La déduction des 0,715 % déjà payés n'est pas confirmée | [BOFiP BOI-ENR-DMTOI-10-50 §110](https://bofip.impots.gouv.fr/doctrine/BOI-ENR-DMTOI-10-50) | Corrigé |
| TVA : immeuble de plus de 5 ans (art. 261-5-2° CGI) | Vente par un assujetti exonérée, sauf option. En cas d'option : TVA sur la marge ou sur le prix total. Ces articles du CGI s'appliquent jusqu'au 31/12/2026 | [BOFiP BOI-TVA-IMM-10-20-10](https://bofip.impots.gouv.fr/doctrine/BOI-TVA-IMM-10-20-10) | Confirmé |
| TVA sur la marge (art. 268 CGI) | Ventes jusqu'au 31/12/2026 : TVA = (prix de vente TTC − prix d'achat droits inclus) × 20/120. Conditions : même nature du bien à l'achat et à la revente, et achat sans droit à déduction. Les travaux ne réduisent pas la marge. Si le lot a été reconfiguré, la TVA porte sur le prix total | [BOFiP BOI-TVA-IMM-10-20-10 §250-270](https://bofip.impots.gouv.fr/doctrine/BOI-TVA-IMM-10-20-10) | Confirmé |
| Transfert des règles de TVA dans le CIBS au 01/01/2027 | L'ordonnance 2026-671 déplace les règles dans le CIBS au 01/01/2027 (TVA sur la marge : art. L. 221-18 à L. 221-20). Selon des avocats, la marge exigerait alors une TVA « rémanente », ce qui exclurait l'achat à un particulier. La doctrine actuelle reste opposable, et les anciennes références sont admises jusqu'au 30/06/2028 | [Weblex, 15/10/2026](https://www.weblex.fr/weblex-actualite/recodification-de-la-tva-calendrier-et-precisions-utiles) | À confirmer |
| Travaux qui rendent l'immeuble neuf (art. 257 I 2 2° CGI) | Le bien redevient neuf si les travaux touchent l'une de ces composantes : la majorité des fondations, la majorité des éléments porteurs, la majorité des façades (hors ravalement), ou 2/3 de CHACUN des 6 lots de second œuvre. Revente dans les 5 ans : TVA de 20 % sur le prix total, jamais sur la marge ; l'acheteur paie alors 0,715 % de droits | [BOFiP BOI-TVA-IMM-10-10-10-20](https://bofip.impots.gouv.fr/doctrine/BOI-TVA-IMM-10-10-10-20) | Confirmé |
| Marchand de biens en nom propre | BIC au réel (micro exclu, art. 50-0 2 e et g), barème de l'IR + cotisations SSI. Le taux habituel cité (environ 40 à 45 %) n'a pas été vérifié | [BOFiP BOI-BIC-DECLA-10-20](https://bofip.impots.gouv.fr/bofip/1788-PGP.html/identifiant=BOI-BIC-DECLA-10-20-20180601) | À confirmer |
| Taxe foncière en cas de vente (art. 1415 CGI) | Due en totalité par le propriétaire au 1er janvier. L'acheteur rembourse le prorata (TF × jours restants / 365), par simple accord entre les parties | [service-public F59](https://www.service-public.gouv.fr/particuliers/vosdroits/F59) | Confirmé |
| Indemnités de remboursement anticipé, IRA (C. conso. L313-47 et R313-25) | IRA ≤ min(6 mois d'intérêts au taux moyen sur le capital remboursé ; 3 % du capital restant dû). Aucune IRA en cas de mutation professionnelle, décès ou cessation forcée d'activité. Prêts aux sociétés : selon le contrat | [service-public F1669](https://www.service-public.gouv.fr/particuliers/vosdroits/F1669) | Confirmé |
| Frais de mainlevée | Paramètre de 0,3 à 0,5 % du capital initial (exemple à Paris : environ 644 € pour 200 000 €). 0 € si le prêt est garanti par une caution. Déductibles du prix de vente | [Empruntis](https://www.empruntis.com/financement/guide-immobilier/garantie-pret-immobilier/hypotheque/garantie-hypotheque-levee/) | À confirmer |
| Diagnostics obligatoires à la vente (CCH L271-4) | DPE ; audit énergétique (maison ou immeuble en monopropriété classé E, F ou G) ; plomb (avant 1949) ; amiante (permis avant le 01/07/1997) ; électricité et gaz de plus de 15 ans ; assainissement non collectif ; termites ; état des risques ; bruit ; mérule ; surface Carrez ; carnet d'information du logement. Coûts à paramétrer, non sourcés : pack de 300 à 800 €, audit de 500 à 1 000 € | [service-public F10798](https://www.service-public.gouv.fr/particuliers/vosdroits/F10798) | Confirmé |
| Intérêt de retard (art. 1727 CGI) | 0,20 % par mois, réduit de moitié en cas de régularisation spontanée de bonne foi | [impots.gouv (art. 1727)](https://www.impots.gouv.fr/professionnel/questions/quelles-sont-les-consequences-si-je-ne-respecte-pas-mes-obligations) | Confirmé |

---

## Formules pour le moteur

### A. Impôt sur le revenu (barème des revenus 2025)
1. **IR_BAREME(R, N)** : q = R / N. impôt_par_part = 0 si q ≤ 11 600 ; 0,11 × q − 1 276 si q ≤ 29 579 ; 0,30 × q − 6 896,01 si q ≤ 84 577 ; 0,41 × q − 16 199,48 si q ≤ 181 917 ; 0,45 × q − 23 476,16 au-delà. impôt_brut = impôt_par_part × N.
2. **PLAFONNEMENT_QF** :
   - N_base = 1 pour une personne seule, 2 pour un couple ;
   - avantage_max = somme des plafonds des parts au-delà de N_base : 1 807 € par demi-part, 903,50 € par quart, 4 262 € pour la paire de demi-parts d'un parent isolé, 1 079 € pour la demi-part case L ;
   - impôt = max(IR_BAREME(R, N), IR_BAREME(R, N_base) − avantage_max) ;
   - la réduction complémentaire de 1 801 € (invalidité) est prévue pour la V2.
3. **DECOTE** :
   - personne seule : si impôt < 1 982, impôt −= max(0, 897 − 0,4525 × impôt) ;
   - couple : si impôt < 3 277, impôt −= max(0, 1 483 − 0,4525 × impôt) ;
   - impôt = max(0, impôt), puis 0 si impôt < 61 ; arrondi à l'euro.
4. **IR_PROJET(N)** = IR_total(revenus avec le projet) − IR_total(revenus sans le projet), recalculé chaque année. Effet de la CSG déductible : revenu_global(N+1) −= 0,068 × assiette des PS du projet en N, pour les revenus imposés au barème. Ne jamais utiliser « TMI × revenu ».
5. **Options hauts revenus** :
   - CEHR : 3 % de la part du RFR entre 250 000 et 500 000 € et 4 % au-delà (personne seule) ; 500 000 / 1 000 000 € pour un couple ;
   - CDHR = max(0 ; 0,20 × RFR_retraité − (IR + CEHR + 1 500 × personnes à charge + 12 500 si couple)), avec une décote jusqu'à 330 000 / 660 000 € (coefficient 82,5 %, détail à reprendre dans la brochure).

### B. Location nue
6. **MICRO_FONCIER** : si recettes_brutes_foyer ≤ 15 000, sans exclusion ni option pour le réel :
   - RF_net = max(0, 0,70 × recettes − stock de déficits imputables) ;
   - IR via la formule 4 ; PS = 0,172 × RF_net.
7. **REEL_FONCIER** (par foyer et par an) :
   - R = loyers encaissés hors charges récupérées + recettes accessoires ;
   - I = intérêts + frais d'emprunt + assurance emprunteur + part non restituable de la caution ;
   - C = gestion réelle + 20 € × nb_locaux + PNO/GLI + taxe foncière hors TEOM + provisions de copropriété non récupérables ± régularisation de N−1 + travaux déductibles payés + amortissement du bailleur privé (s'il est activé).
8. **Résultat positif** : si R − I − C ≥ 0, RF = R − I − C, puis RF_net = max(0, RF − stock), en consommant le stock du plus ancien au plus récent.
9. **Déficit** :
   - plafond : P = 10 700 (15 300 en Périssol ou Cosse) ; avec l'option rénovation énergétique, P = min(21 400, P + dépenses éligibles payées au plus tard le 31/12/2027) ;
   - si R ≥ I : D_hors_int = I + C − R ; imputable_global = min(D_hors_int, P) ; stock(N) += D_hors_int − imputable_global ;
   - si R < I : stock(N) += I − R ; imputable_global = min(C, P) ; stock(N) += C − imputable_global ;
   - dans les deux cas : RF_net = 0 et revenu_global −= imputable_global (s'il devient négatif, déficit global reportable 6 ans).
10. **Expiration** : chaque tranche du stock expire après l'année N+10. Le stock ne s'impute jamais sur le revenu global.
11. **REPRISE** : si la location nue cesse avant le 31/12 de N+3 (vente, occupation personnelle, passage en meublé), revenu_global(N) += imputable_global(N), on recalcule l'IR de N, et ce montant rejoint le stock foncier. Sa valeur est nulle s'il n'y a plus de revenus fonciers dans les 10 ans.
12. **PS_FONCIER(N)** = 0,172 × RF_net(N). CSG déductible en N+1 = 0,068 × RF_net(N). Un déficit imputé ne réduit pas les PS des autres revenus.
13. **BAILLEUR_PRIVE** (à confirmer, derrière un interrupteur) :
   - base_i = 0,80 × prix_i hors frais (+ travaux dans l'ancien) ;
   - plafond_foyer = 12 000 si au moins 50 % des revenus bruts des logements concernés viennent du très social ; sinon 10 000 si au moins 50 % viennent du social ou du très social ; sinon 8 000 ;
   - amort_foyer(N) = min(Σ taux_i × base_i, plafond_foyer), avec le cumul amorti sur un logement ≤ base_i ;
   - le montant s'ajoute à C (formule 7) ;
   - si l'engagement de 9 ans est rompu, les amortissements sont repris en revenu foncier.
14. **SCI_IR** : le résultat foncier de la SCI se calcule avec la formule 7. Quote-part de l'associé = résultat × ses droits ; il y ajoute ses intérêts personnels pour l'achat des parts, puis on applique les formules 8 à 11 au niveau de son foyer (le plafond de 10 700 € est commun à tous ses biens).

### C. Frais d'achat et crédit
15. **EMOLUMENTS_HT(prix)** = 3,870 % × min(prix, 6 500) + 1,596 % × min(max(prix − 6 500, 0), 10 500) + 1,064 % × min(max(prix − 17 000, 0), 43 000) + 0,799 % × max(prix − 60 000, 0). TTC = HT × (1 + TVA_dept), avec 20 % en métropole, 8,5 % pour 971, 972 et 974, 0 % pour 973 et 976.
16. **FRAIS_ANCIEN(prix, dept, primo)** :
   - taux_dept = table[dept].majoré, ou table[dept].art1594D si l'acheteur est primo-accédant pour sa résidence principale ou si l'acte est postérieur au 31/03/2028 ;
   - droits = prix × (taux_dept × 1,0237 + 0,012) ;
   - CSI = max(15, 0,001 × prix) ;
   - total = droits + CSI + EMOLUMENTS_TTC + débours (paramètre, environ 1 000 €).
17. **FRAIS_NEUF(prix_HT)** = prix_HT × 0,0070 × 1,0214 + CSI + EMOLUMENTS_TTC + débours. Le prix payé inclut 20 % de TVA.
18. **HCSF** :
   - taux_effort = Σ mensualités (assurance comprise, hors crédit relais ≤ 80 % de la valeur de vente) / revenus nets mensuels avant impôt (+ 70 % des loyers attendus, hypothèse bancaire) ≤ 35 % ;
   - durée ≤ 300 mois, ou ≤ 324 mois en VEFA/construction avec différé lié à l'entrée en jouissance, ou dans l'ancien si les travaux représentent au moins 10 % du crédit.

### D. Location meublée (LMNP)
19. **EST_LMP** = recettes_TTC_annualisées_foyer > 23 000 ET > revenus_activité_nets_foyer (déficits de l'année inclus).
   - Annualisation : recettes × 365 / jours depuis l'acte d'achat (ou l'achèvement), par immeuble, seulement en début ou en fin totale d'activité.
   - Si EST_LMP est vrai : alerte, pas de calcul LMNP.
20. **REGIME** :
   - micro possible si recettesHT(N−1) ≤ plafond OU recettesHT(N−2) ≤ plafond ;
   - plafond pour 2026-2028 : 83 600 (longue durée, classé, chambres d'hôtes) ou 15 000 (tourisme non classé) ; pour 2025 : 77 700 ;
   - création d'entreprise : micro de plein droit en N et N+1 ;
   - achat d'un meublé supplémentaire : aucune période de plein droit, les recettes s'additionnent.
21. **MICRO_BIC** : abattement = min(recettes, max(taux × recettes, 305)), avec taux = 0,50 ou 0,30 ; base = recettes − abattement (jamais négative).
22. **REEL, postes de l'année t** :
   - R_t = loyers acquis HT ;
   - Cb_t = charges liées au bien (intérêts, assurances, PNO, taxe foncière, copropriété non récupérable, gestion, entretien et réparations ; frais d'achat en année 1 si option « charges » ; CFE à classer, voir les questions) ;
   - Ca_t = charges propres à l'activité (comptabilité, frais juridiques, domiciliation) ;
   - A_t = amortissements de l'année (formule 24).
23. **ART_39C** (calcul global sur tous les meublés du foyer) :
   - plafond = max(0, R_t − Cb_t) ;
   - amort_déduit = min(A_t + stock_ARD, plafond), en prenant d'abord l'amortissement de l'année, puis le stock ;
   - stock_ARD += A_t − amort_déduit ;
   - résultat_t = R_t − Cb_t − Ca_t − amort_déduit. Il peut être négatif : le déficit vient alors des charges, jamais de l'amortissement.
24. **AMORTISSEMENT** :
   - base_bâti = (prix + frais s'ils sont incorporés) × (1 − part_terrain) ;
   - A_t = Σ_k base_bâti × quote_k / durée_k + mobilier / sa durée + travaux immobilisés / leur durée ;
   - prorata temporis la 1re année ; un composant s'arrête quand sa base est entièrement amortie.
25. **DEFICITS_LMNP** :
   - file d'attente par année d'origine (du plus ancien au plus récent), imputée sur le bénéfice LMNP du foyer ;
   - chaque déficit expire après l'année d'origine + 10 ;
   - base_t = max(0, résultat_t − déficits imputés) ;
   - ordre : le stock d'amortissements est consommé dans le résultat (formule 23), puis viennent les déficits antérieurs.
26. **IMPOT_LMNP** :
   - IR via la formule 4 ;
   - PS = 0,186 × base (micro ou réel, années 2025 et suivantes) ;
   - CSG déductible en N+1 = 0,068 × base ;
   - si LMP, ou meublé saisonnier au-delà de 23 000 € : PS = 0 et alerte « cotisations ».
27. **CUMUL_PV** : amort_prix_déduits += part de amort_déduit liée au bâti (prix et frais incorporés) ; amort_travaux_déduits += part liée aux travaux ; le mobilier est exclu.
28. **CFE** : 0 l'année de création ; 50 % de la base la 1re année d'imposition ; 0 si les recettes de N−2 ne dépassent pas 5 000 € ; sinon montant saisi par l'utilisateur ; déductible.
29. **GARDE-FOUS** :
   - SCI à l'IR dont les recettes meublées dépassent 10 % des recettes totales HT : bascule en « société à l'IS », avec alerte ;
   - SARL de famille : formules 22 à 27 appliquées à chaque associé selon sa quote-part, test LMP par associé ; à la revente, alerte « plus-values professionnelles ».

### E. Société à l'IS
30. **IS(B, m)** :
   - seuil = 42 500 × m / 12 ;
   - si la société est éligible (CA < 10 M€, capital entièrement libéré à la clôture, au moins 75 % détenus par des personnes physiques) : IS = 0,15 × min(max(B, 0), seuil) + 0,25 × max(0, B − seuil) ;
   - sinon : IS = 0,25 × max(B, 0) ;
   - contributions de 3,3 % et exceptionnelle : 0.
31. **RESULTAT_n** = loyers dus pour l'exercice + charges refacturées − (intérêts + assurance emprunteur + PNO + taxe foncière + copropriété + entretien + gestion + expert-comptable TTC + frais bancaires + CFE + CRL_n + intérêts de compte courant dans la limite du taux plafond + frais d'achat si option « charges » en année 1 + frais de création en année 1 + Amort_n). L'amortissement n'est pas plafonné, et le minimum annuel est obligatoire.
32. **AMORT_n** : comme la formule 24, avec un gros œuvre sur 80 ans par défaut (curseur de 50 à 80 ans). Le terrain n'est jamais amorti.
33. **DEFICITS_IS** :
   - si R_n < 0 : stock += |R_n| et B_n = 0 ;
   - sinon : imputation = min(stock, plafond), avec plafond = R_n si R_n ≤ 1 M€, sinon 1 M€ + 0,5 × (R_n − 1 M€) ; B_n = R_n − imputation ;
   - pas d'expiration, mais perte du stock en cas de changement d'activité.
34. **CARRY_BACK** (option désactivée par défaut) :
   - report = min(|R_n|, 1 000 000, bénéfice non distribué de N−1) ;
   - créance = part imputée sur la fraction taxée à 25 % × 0,25 + part imputée sur la fraction taxée à 15 % × 0,15 ;
   - utilisable 5 ans, remboursée en n+5.
35. **CRL_n** (par local) :
   - si l'immeuble est achevé depuis au moins 15 ans au 01/01/n, que le local n'est pas soumis à TVA et que ses recettes encaissées dépassent 1 830 × mois / 12 : CRL = 0,025 × recettes encaissées (loyers + provisions de charges et taxes récupérables + dépenses mises à la charge du locataire) ; sinon 0 ;
   - acompte de n+1 = 0,025 × recettes de n (aucun acompte la 1re année, ni s'il ne dépasse pas 100 €).
36. **IS_DECAISSE** : l'IS de l'exercice n se paie en n+1 (solde au 15/05 pour une clôture au 31/12). Des acomptes de 25 % sont versés les 15/03, 15/06, 15/09 et 15/12 dès que l'IS du dernier exercice atteint 3 000 €.
37. **TRESO_n** = TRESO_(n−1) + apports et comptes courants reçus + loyers encaissés − charges décaissées hors amortissements (intérêts compris) − CAPITAL d'emprunt remboursé − IS décaissé en n − CRL et CFE décaissées − remboursement du compte courant − dividendes. Montant distribuable = bénéfice après IS + report à nouveau − dotation à la réserve légale (SAS/SARL : 5 % tant que la réserve est inférieure à 10 % du capital).
38. **SORTIE annuelle**, dans cet ordre :
   1. Remboursement du compte courant = min(solde du compte courant, trésorerie) : aucun impôt.
   2. Dividende = min(trésorerie restante, montant distribuable) : impôt = 0,314 × dividende (PFU 2026).
   - Remboursement d'apports hors liquidation : part exonérée = max(0, somme répartie − bénéfices et réserves non distribués) ; le reste est imposé comme un dividende.
39. **OPTION_BAREME** (si elle est activée) :
   - IR_sup = IR(revenu + 0,60 × dividende − 0,068 × dividende) − IR(revenu) ;
   - PS = 0,186 × dividende ; les 12,8 % prélevés à la source sont un simple acompte ;
   - repère : le barème est intéressant si TMI × 0,532 < 0,128, soit une TMI de 0 % ou 11 %. L'option vaut pour tous les revenus mobiliers du foyer.
40. **GERANT_MAJORITAIRE_SARL** :
   - assiette_TNS = max(0, dividende − 0,10 × (capital + primes + solde moyen du compte courant)) ;
   - cotisations ≈ 0,45 × assiette_TNS (paramètre) ;
   - IR de 12,8 % (ou barème) sur tout le dividende ;
   - PS de 18,6 % sur la seule part non soumise aux cotisations.
41. **PV_IS** :
   - VNC = coût du terrain + coût des composants + frais incorporés + travaux immobilisés − Σ amortissements ;
   - PV = prix de vente − frais de vente − VNC ;
   - la PV s'ajoute au résultat de l'année, puis on applique les formules 33 et 30 ;
   - aucun abattement, pas de surtaxe ; si l'immeuble est neuf ou rendu neuf depuis moins de 5 ans, on raisonne sur le prix HT.
42. **NET_APRES_REVENTE** (avec liquidation) :
   - trésorerie_finale = trésorerie + prix net − capital restant dû − IRA (selon le contrat) − IS sur la vente ;
   - boni = actif net − apports ; impôt = 0,314 × boni ;
   - droit de partage = 0,025 × actif net partagé (apports compris) ;
   - net associé = remboursement du compte courant + apports + 0,686 × boni − droit de partage.
43. **CESSION_PARTS** (option) :
   - droits payés par l'acheteur = 0,05 × (valeur des immeubles − dettes liées à leur achat + autres actifs) ;
   - impôt de l'associé = 0,314 × (prix des parts − prix d'achat des parts).
44. **COMPARAISON sur 20 ans** : net associé cumulé = Σ (remboursements du compte courant + dividendes nets) + net après revente − apport initial, à comparer au même flux en nom propre. Inclure le comptable, la CRL, la CFE et les frais de création.

### F. Plus-value des particuliers
45. **ANNEES** = nombre d'années pleines entre date_achat et date_vente : différence des années, moins 1 si (mois, jour) de la vente < (mois, jour) de l'achat. Pour une construction faite par le vendeur : deux calculs distincts (terrain et construction).
46. **ABATT_IR(n)** = 0 si n ≤ 5 ; 0,06 × (n − 5) si 6 ≤ n ≤ 21 ; 1 si n ≥ 22.
47. **ABATT_PS(n)** = 0 si n ≤ 5 ; 0,0165 × (n − 5) si 6 ≤ n ≤ 21 ; 0,28 si n = 22 ; 0,28 + 0,09 × (n − 22) si 23 ≤ n ≤ 29 ; 1 si n ≥ 30.
48. **PRIX_VENTE_NET** = prix − (agence à la charge du vendeur + diagnostics + mainlevée + TVA acquittée + indemnité d'éviction + honoraires d'architecte pour un permis). Les IRA et les frais d'acte ne sont pas déduits.
49. **FRAIS_ACHAT** : pour un achat, max(frais réels, 0,075 × prix_achat) ; pour une donation ou une succession, frais réels.
50. **TRAVAUX** :
   - si le bien est bâti ET détenu depuis plus de 5 ans : max(travaux_réels_nets, 0,15 × prix_achat) ; sinon travaux_réels_nets ;
   - travaux_réels_nets = travaux éligibles bruts − amortissements de ces travaux déduits en LMNP, retranchés une seule fois ;
   - le forfait de 15 % n'est pas réduit ;
   - exclure les travaux déduits en foncier, ceux payés sous le micro-foncier, ceux imputés en déficit, et les intérêts.
51. **MINORATION** :
   - si la vente a lieu à partir du 15/02/2025, que le bien a été loué en LMNP au réel et qu'il n'est pas dans une résidence exclue : Σ des amortissements du prix (bâti et frais incorporés) effectivement déduits ;
   - + les amortissements du bailleur privé si l'hypothèse est activée ;
   - sinon 0.
52. **PRIX_ACHAT_MAJORE** = prix_achat + FRAIS_ACHAT + TRAVAUX + autres majorations − MINORATION. PV_BRUTE = PRIX_VENTE_NET − PRIX_ACHAT_MAJORE. Si PV_BRUTE ≤ 0, tout est à 0.
53. **EXONERATIONS** (à tester en premier) :
   - résidence principale au jour de la vente, ou quittée puis vendue dans un délai normal (1 an au plus) sans location : 0 ;
   - prix ≤ 15 000 € (par quote-part) : 0 ;
   - remploi (1° bis) : PV_BRUTE × (1 − min(1, prix_remployé / prix_vente)).
54. **Par vendeur** :
   - PV_IR = quote-part × PV_BRUTE × (1 − ABATT_IR) ; PV_PS = quote-part × PV_BRUTE × (1 − ABATT_PS) ;
   - IR_PV = 0,19 × PV_IR ;
   - PS_PV = 0,172 × PV_PS (0,075 pour un non-résident affilié UE/EEE ou Suisse).
55. **SURTAXE(PV_IR)**, par vendeur : 0 si PV ≤ 50 000 ; 0,02·PV − (60 000 − PV)/20 si PV ≤ 60 000 ; 0,02·PV si PV ≤ 100 000 ; 0,03·PV − (110 000 − PV)/10 si PV ≤ 110 000 ; 0,03·PV si PV ≤ 150 000 ; 0,04·PV − 0,15·(160 000 − PV) si PV ≤ 160 000 ; 0,04·PV si PV ≤ 200 000 ; 0,05·PV − 0,20·(210 000 − PV) si PV ≤ 210 000 ; 0,05·PV si PV ≤ 250 000 ; 0,06·PV − 0,25·(260 000 − PV) si PV ≤ 260 000 ; 0,06·PV au-delà. Surtaxe nulle pour un terrain à bâtir ou une PV exonérée.
56. **NET_VENDEUR** = prix − frais de vente − capital restant dû − IRA − (IR_PV + PS_PV + surtaxe). La PV imposable entre aussi dans le RFR (CEHR et CDHR en option, formule 5).
57. **IRA** = min(capital_remboursé × taux / 2, 0,03 × capital restant dû). 0 en cas de mutation professionnelle, décès ou cessation forcée d'activité. Prêt d'une société : selon le contrat.
58. **TAXE FONCIERE** : coût de portage pour le vendeur = TF × jours de détention dans l'année / 365 ; remboursement par l'acheteur = TF × jours restants / 365.

### G. Marchand de biens
59. **FRAIS_ACHAT_MDB** = 0,00715 × prix + max(15, 0,001 × prix) + EMOLUMENTS_TTC(prix) + débours.
60. **SANCTION_1115** (fraction non revendue au bout de 5 ans) :
   - droits = prix de la fraction × taux global de droit commun à la date d'achat ;
   - intérêt = 0,002 × mois × droits, en comptant les mois depuis le 1er jour du mois qui suit le délai de présentation de l'acte d'achat ;
   - déduction des 0,715 % déjà payés : à confirmer.
61. **TVA_REVENTE** :
   - bien neuf (achevé depuis 5 ans au plus, ou ETAT_NEUF) : 0,20 × prix_HT ;
   - sinon, sans option : 0 (la TVA payée sur les travaux devient une charge) ;
   - avec option, pour une vente jusqu'au 31/12/2026, un bien de même nature et un achat sans droit à déduction : max(0, prix_TTC − prix_achat_droits_inclus) × 20/120 ;
   - dans les autres cas : TVA sur le prix total ;
   - ventes à partir du 01/01/2027 : branche CIBS, à confirmer.
62. **ETAT_NEUF** = fondations ≥ 50 % OU éléments porteurs ≥ 50 % OU façades ≥ 50 % (hors ravalement) OU les 6 lots de second œuvre refaits chacun à au moins 2/3. Si un lot n'existe pas, ce dernier critère ne s'applique pas.
63. **RESULTAT_MDB_IS** = prix_HT − (prix d'achat + frais + travaux HT, ou TTC si la TVA n'est pas récupérable + frais financiers + taxe foncière + assurance + frais de vente + IRA + sanction éventuelle). IS via la formule 30 ; déficit via la formule 33.
64. **NET_ASSOCIE_MDB** = (R − IS) distribué × 0,686. Exception : pour un gérant majoritaire de SARL ou d'EURL, utiliser la formule 40.

---

## Pièges de calcul

**Impôt et prélèvements sociaux**
- Calculer l'impôt par différence, avec et sans le projet. La CSG déductible de l'année N modifie l'IR de N+1, même sans loyer en N+1.
- Le barème des revenus 2026 n'est pas voté : ne pas l'afficher comme définitif.
- Deux taux de prélèvements sociaux coexistent. Un taux unique fausse la comparaison entre nu, meublé et IS.
- La CSG déductible reste à 6,8 % : les 1,4 point de hausse ne sont pas déductibles.
- Une grosse plus-value entre dans le RFR et peut déclencher la CEHR ou la CDHR l'année de la vente.

**Location nue**
- Les loyers s'imputent d'abord sur les intérêts. Les intérêts, frais d'emprunt et l'assurance emprunteur ne vont jamais sur le revenu global.
- Le plafond de 10 700 € est par foyer et par an, pas par bien.
- Le stock de déficits se gère par année d'origine (du plus ancien au plus récent) et expire au bout de 10 ans.
- Vendre ou cesser de louer nu avant le 31/12 de N+3 annule l'imputation sur le revenu global.
- Le plafond de 21 400 € est un maximum global (10 700 € + dépenses éligibles), soumis à une option et aux classes DPE avant et après travaux.
- Le seuil du micro-foncier se calcule sur tout le foyer. Un associé de SCI sans bien loué nu en direct n'a jamais droit au micro.
- L'option pour le réel engage pour 3 ans.
- La TEOM n'est pas déductible. Les travaux d'agrandissement ou touchant la structure non plus.
- Loyers et charges se comptent à l'encaissement et au paiement, sur l'année civile.
- Les frais de notaire ne sont pas déductibles des loyers, mais ils comptent dans le calcul de la plus-value.

**Frais d'achat**
- Le taux global des droits n'est pas 5 % mais 6,3185 %.
- Le primo-accédant ne paie pas toujours 4,50 % : il faut une table à 2 colonnes par département. Une société n'est jamais primo-accédante.
- Le taux de 5 % est temporaire (actes jusqu'au 31/03/2028), et les délibérations peuvent prendre effet en cours d'année.
- La TVA sur les émoluments du notaire n'est pas de 20 % dans les DOM.
- Un terrain à bâtir acheté à un particulier paie le taux plein, pas le taux réduit du neuf.

**Location meublée**
- Le seuil LMP (23 000 € TTC, foyer, annualisé depuis l'acte d'achat) n'a pas la même assiette que les plafonds du micro (HT, N-1 ou N-2).
- Plusieurs pages officielles affichent encore 77 700 € : c'est le plafond de 2025. Coder 83 600 € pour 2026 à 2028.
- Il faut deux compteurs : le stock d'amortissements reportés (sans limite de durée) et les déficits LMNP (10 ans). Le stock d'amortissements s'utilise en premier.
- La limite de l'art. 39 C se calcule sur tous les meublés et sans les charges d'activité : un petit déficit (frais de comptabilité) reste possible.
- Le premier ameublement s'amortit, même par pièces de moins de 500 €.
- L'achat d'un 2e meublé n'est pas une création d'entreprise : pas de nouvelle période de micro de plein droit.
- Chambres d'hôtes : le seuil porte sur le revenu imposable. Meublé saisonnier : il porte sur les recettes.
- SARL de famille : revente en plus-values professionnelles, sans abattement pour durée de détention.
- SCI + meublé = IS pour toute la société. Une indivision est au réel.
- Si la liste du mobilier n'est pas respectée, la location peut être requalifiée en location nue.

**Société à l'IS**
- Toujours afficher le net APRÈS distribution : il y a l'IS, puis le PFU.
- Le déficit reste dans la société et ne passe jamais chez l'associé.
- À la revente, tous les amortissements augmentent la plus-value, sans abattement. Sur 20 ans, cela peut effacer l'avantage acquis pendant la détention.
- Le PFU est de 31,4 % en 2026, pas de 30 %.
- La CRL se calcule sur les recettes encaissées, charges récupérables comprises.
- La CFE n'est pas due l'année 1.
- L'IS est décaissé en n+1, ce qui compte pour le cash-flow et le TRI.
- Rembourser des apports est imposable tant qu'il reste des réserves ; seul le compte courant sort librement.
- Le taux réduit de 15 % suppose un capital entièrement libéré à la clôture.
- Le choix « frais d'achat en charges ou au coût » vaut pour toute la société et ne se change pas.
- Intérêts de compte courant : déductibles seulement jusqu'au taux plafond. Les seuils de dispense de l'acompte de 12,8 % diffèrent entre intérêts et dividendes.
- SARL avec gérant majoritaire : cotisations sociales sur les dividendes au-delà de 10 %.
- Pas d'aller-retour entre l'IS et l'IR.
- Taxe holdings : alerte si le logement est occupé gratuitement et que l'actif dépasse 5 M€. Les parts restent dans l'IFI.

**Plus-value et achat-revente**
- La durée de détention se compte en années complètes : vendre quelques jours avant la date anniversaire coûte 6 points d'abattement IR.
- Le forfait de 15 % pour travaux n'existe qu'au-delà de 5 ans. En dessous, seuls les travaux faits par une entreprise et facturés comptent.
- Le forfait de 7,5 % n'existe que pour un achat (pas pour une donation ou une succession).
- La surtaxe se calcule par vendeur, sur la base IR, avec un saut d'environ 500 € juste au-dessus de 50 000 €.
- Une moins-value est perdue.
- Les frais de vente déductibles forment une liste fermée.
- Une plus-value exonérée ne déclenche pas de surtaxe.
- Résidence principale : ne jamais garantir l'exonération. Enchaîner les reventes expose à une requalification en marchand de biens.
- Un LMNP resté au micro-BIC n'a aucun amortissement à réintégrer.
- Les travaux déduits en foncier, ou payés sous le micro-foncier, ne se réutilisent pas dans la plus-value.

**Marchand de biens**
- En cas de non-revente, l'intérêt de retard court depuis l'achat, pas depuis l'échéance des 5 ans.
- Une rénovation lourde (état neuf) entraîne une TVA de 20 % sur le PRIX TOTAL.
- La TVA sur la marge exige que le bien garde la même nature, et ses règles changent au 01/01/2027.
- Le plafond légal des IRA ne protège que les prêts aux particuliers.
- La taxe foncière reste due en totalité par le propriétaire au 1er janvier.

---

## Changements à surveiller (PLF 2027 et autres)

**Non en vigueur au 19/10/2026 (projets en discussion)**
- **PLF 2027 (déposé le 01/10/2026), art. 2** : barème des revenus 2026 relevé de 2,1 % : 11 844 / 30 200 / 86 353 / 185 737 €. Plafond du quotient familial porté à 1 845 €, décote d'une personne seule à 915 €.
- **PLF 2027, art. 7 : plafonnement de l'amortissement LMNP.**
  - 2,5 % par an et 7 000 € par foyer ; 1,5 % et 5 000 € pour les meublés de tourisme.
  - L'excédent serait perdu à partir des exercices clos en 2027.
  - Le stock d'amortissements reportés au 31/12/2026 serait utilisable jusqu'en 2036, dans la limite de la moitié du bénéfice.
  - Les résidences étudiantes, seniors, EHPAD et USLD seraient exclues.
  - En commission (08/10/2026), des amendements excluraient les meublés loués en résidence principale, en bail étudiant ou en bail mobilité, et supprimeraient l'amortissement des meublés de tourisme achetés à partir de 2027. Examen en séance du 13 au 19/10/2026.
  - Effet indirect : le montant réintégré dans la plus-value à la revente changerait.
- **PLF 2027, amendements** :
  - exonération d'IR de la plus-value d'un meublé (hors résidence principale) dès 17 ans de détention, si l'acheteur en fait sa résidence principale ;
  - prorogation des abattements exceptionnels (art. 150 VE) jusqu'au 31/12/2030.
- **PLF 2027, art. 19** : retour de la TVA à l'encaissement pour les VEFA. Autres mesures annoncées : dons d'argent taxés à 6 % jusqu'à 100 000 € (1er semestre 2027), PTZ élargi.
- **PLF 2027, mesures sans effet sur une petite société immobilière** :
  - art. 15 : 3e année de la contribution des grandes entreprises (15,7 % et 31,4 %) ;
  - art. 5 : fin de la purge de la plus-value en report lors de l'apport-cession ;
  - une taxe de 2 % sur les placements des holdings, citée par une seule source.
- **PLFSS 2027** : aucune modification des prélèvements sociaux sur les revenus du patrimoine n'a été identifiée. Des blogs évoquent une CSG à 10,6 % sur les revenus fonciers et les plus-values immobilières, ou à 11,2 % sur le capital : rien n'est confirmé. Garder les taux en paramètres.
- **Pourraient revenir par amendement** : taux réduit d'IS jusqu'à 100 000 € ; exonération à 17 ans avec 8 % par an ; indexation du prix d'achat sur l'inflation à la place des abattements (vote du Sénat lors du PLF 2026).
- **Proposition de loi d'assouplissement du statut du bailleur privé**, adoptée par les députés en mai 2026 (source secondaire).

**Échéances déjà votées, à dater dans le moteur**
- 31/12/2026 : exonérations de l'art. 35 bis ; exonération de la vente d'un droit de surélévation ; fin des articles de TVA du CGI.
- 01/01/2027 : transfert des règles de TVA dans le CIBS.
- 31/12/2027 : plafond de déficit majoré de 21 400 € ; exonération des ventes au logement social ; abattements exceptionnels ; Loc'Avantages.
- 29/02/2028 : fin du tarif actuel des notaires.
- 31/03/2028 : fin des droits de mutation à 5 %.
- 31/12/2028 : fin des achats éligibles au statut du bailleur privé.
- CDHR : jusqu'au retour du déficit public sous 3 % du PIB.
- Révision des plafonds du micro-BIC pour 2029-2031.
- À rafraîchir régulièrement : table des droits de mutation (mensuelle) ; taux plafond des intérêts de compte courant (trimestriel).
- BOFiP attendus : statut du bailleur privé (art. 31 I-1° i et j) ; art. 150 VB III (LMNP) ; taxe holdings (art. 235 ter C) ; mise à jour de BOI-RFPI-BASE-30-20 pour la date de 2027.

---

## Questions à trancher (Dani ou l'expert-comptable)

1. **Statut du bailleur privé** : faut-il l'activer dès la V1 ? Il faut d'abord confirmer dans l'art. 31 I-1° i et j les taux, la base de 80 %, le seuil de travaux de 30 % et le plafond par foyer, puis trancher la réintégration des amortissements dans la plus-value (l'ANIL et le vérificateur s'opposent).
2. **Grille d'amortissement** :
   - part du terrain par défaut : 15 % partout, ou plus en zone tendue (25 à 40 % à Paris) ?
   - gros œuvre sur 50 ans (usage LMNP) ou 80 ans (exemple BOFiP pour un immeuble de placement) ?
   - une grille unique pour la LMNP et l'IS, ou deux grilles ?
3. **Loyers dans le taux d'effort** : quel affichage par défaut, 70 % des loyers ou la méthode différentielle ?
4. **LMNP, frais d'achat déduits en charges** : à la revente, faut-il retenir les frais réels ou le forfait de 7,5 % ? Et faut-il classer la CFE en charge « du bien » ou « de l'activité » pour la limite de l'art. 39 C ?
5. **Modules avancés** : faut-il modéliser le report en arrière des déficits (proposé : non par défaut) et l'option pour le barème sur les dividendes (elle demande la TMI et les autres revenus mobiliers du foyer) ?
6. **Cotisations sociales** : quel taux paramétrer pour le marchand de biens en nom propre et pour le gérant majoritaire de SARL (environ 40 à 45 %, non vérifié) ?
7. **CEHR et CDHR** : faut-il les proposer en option ? L'inclusion de la plus-value immobilière dans la CDHR est de confiance basse.
8. **Valeurs par défaut non officielles** à valider : débours, mainlevée (0,3 à 0,5 %), diagnostics, CFE, honoraires comptables, frais de création.
9. **Résidence principale occupée peu de temps** : à partir de quelle durée afficher l'avertissement (12 mois proposés) ?
10. **Marchand de biens** : en cas de sanction, déduit-on les 0,715 % déjà payés ? Et comment traiter une revente avec TVA sur la marge en 2027, après le passage au CIBS ?
11. **Cas particuliers du quotient familial** (demi-part case L, invalidité) : en V1, ou plus tard avec un simple avertissement ?
12. **LMP** : faut-il seulement afficher l'alerte, ou modéliser un jour les cotisations SSI ? Restent aussi à confirmer l'exception « mandat de gestion » pour les meublés saisonniers et le sort des prélèvements sociaux sur une plus-value exonérée (art. 151 septies).
13. **Taxe holdings** : quelle est la liste exacte des actifs visés (« patrimoine financier » selon la brochure, actifs somptuaires selon les avocats) ?
14. **Relecture avant la mise en production** : les articles suivants doivent être relus sur Légifrance, inaccessible pendant la recherche : CGI 31, 32, 150 U à 150 VH, 1115, 1840 G ter, 1727, 234 nonies ; CSS L136-8 et L611-1 ; C. conso. L313-47 et R313-25 ; C. com. L232-10.
