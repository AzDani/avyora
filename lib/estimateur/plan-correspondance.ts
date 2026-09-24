/**
 * Phase 3 — la table de correspondance : ce que le plan mesure → quels postes du catalogue.
 *
 * Une fonction pure, sans effet de bord : elle prend le contrat émis par l'éditeur de plan et
 * rend une liste de contributions. Elle ne chiffre rien, ne coche rien, n'écrit nulle part —
 * c'est la phase 4 qui transformera ces contributions en `sel`. Ici on ne fait que TRADUIRE.
 *
 * CE QUI EST ENCODÉ ICI, ET QUI VIENT DES DÉCISIONS DU 18-19 SEPTEMBRE 2026 :
 *
 * - **D1, le delta.** Seuls les états `creer`, `remplacer` et `demolir` produisent du travail.
 *   Un élément `existant` (rien de prévu) ou `garder` (conservé) ne produit rien : un devis n'a
 *   pas à facturer ce qui est déjà là. C'est la règle la plus importante du fichier.
 * - **D6, la douche.** L'objet porte son type ; trois branches exclusives, jamais cumulées.
 * - **D7, la double vasque.** UNE unité en variante « double », jamais deux unités.
 * - **D9**, les trois postes du mur porteur : démolition au m², poutre au ml, étude au forfait.
 * - **D11, les forfaits.** Le plan les coche, il ne leur envoie jamais de quantité.
 * - **D15**, l'objet porte l'attribut : escalier bois ou béton, spot ou plafonnier.
 * - **D16**, tout est clé sur l'identifiant du poste, jamais sur son libellé.
 *
 * DEUX RÈGLES QUI NE VIENNENT PAS D'UNE DÉCISION MAIS DE LA LECTURE DU MOTEUR :
 *
 * 1. **Ne jamais injecter ce que le moteur dérive correctement.** « Robinetterie lavabo » est
 *    déjà calculée depuis le meuble-vasque, y compris quand sa quantité est saisie à la main :
 *    l'injecter en plus ne la corrigerait pas, ça la figerait.
 * 2. **Un poste qui n'existe pas au catalogue n'est pas inventé** : il part dans `ignores`, avec
 *    la raison. C'est ce qui permet de voir ce que le plan sait mesurer et que le devis ne sait
 *    pas encore recevoir — un percement en mur léger, le rebouchage d'une ouverture.
 */
import { posteParId, posteParNom } from "./identite";

/** Ce que la table lit du contrat du plan. Structurel : le contrat en émet bien davantage. */
export interface PlanPourCorrespondance {
  contrat?: string;
  travaux?: {
    percementsDetail?: { porteurPetit?: number; porteurGrand?: number; leger?: number };
  };
  /** Contrat 1.14 : `ossatureCreee` — une poutre ou un poteau créé déclenche aussi l'étude. */
  etudes?: { structure?: number; mlPorteurDemoli?: number; ossatureCreee?: number };
  doublage?: { iti?: number; ite?: number };
  facades?: { parPoste?: Record<string, number> };
  toiture?: {
    surface?: number; emprise?: number; egouts?: number; raccords?: number;
    couverture?: string; combles?: string; forme?: string;
    /** Contrat 1.9 : le détail par partie. `surface`, `emprise` et `egouts` ci-dessus sont les
     *  TOTAUX — un étage qui ne couvre pas toute l'emprise laisse une toiture plus basse, et
     *  elle compte. Les postes se chiffrent sur le total ; les parties servent à l'expliquer. */
    parties?: Array<{ niveau?: string; principale?: boolean; forme?: string; pente?: number; emprise?: number; surface?: number; egouts?: number }>;
    projet?: { action?: string; charpente?: string; isoCombles?: string; velux?: number; gouttieres?: boolean; raccords?: boolean; traiterCharpente?: boolean };
  } | null;
  sols?: Array<{ id?: string; piece?: string; surface?: number; existant?: string | null; revetement?: string | null;
    depose?: boolean; dalle?: boolean; betonFini?: boolean; isolant?: unknown; chape?: string | null; ragreage?: boolean;
    /** Contrat 1.14 : le parquet actuel est poncé (vrai) ou remplacé par un neuf (faux). Absent
     *  dans un contrat antérieur : on retombe alors sur la déduction D8. */
    poncage?: boolean }>;
  /* Le détail objet par objet, que le contrat émettait déjà sans que personne lise autre chose
     que `murs`. Deux choses en dépendent : la TRAÇABILITÉ exigée par D1 — une ligne injectée doit
     se rattacher à un objet du plan — et l'ÉTAT, sans lequel un doublage déjà en place se
     facturait comme neuf. */
  provenance?: {
    /** Contrat 1.14 : `porteurAVerifier` — compté porteur sans que l'utilisateur l'ait dit. */
    murs?: Array<{ id: string; type: string; porteur: boolean; porteurAVerifier?: boolean; etat: string; ml: number; m2: number }>;
    /** Contrat 1.11 : le percement que chaque ouverture provoque, pour rattacher ces lignes. */
    ouvertures?: Array<{ id?: string; percement?: string | null }>;
    doublages?: Array<{ mur?: string; mode?: string; sys?: string | null; mat?: string; etat?: string | null; m2?: number }>;
    facades?: Array<{ mur?: string; poste?: string; label?: string; etat?: string | null; m2?: number }>;
  };
  detailNiveaux?: Array<{
    id?: string; name?: string; neuf?: boolean; plancher?: string | null;
    rooms?: Array<{ id: string; type: string; faience?: string | null; perimeter?: number; wallArea?: number; plinthes?: number; hauteur?: number; horsHabitable?: boolean; exterieur?: boolean; fauxPlafond?: boolean; area?: number; mursParType?: Record<string, number>;
      /** Contrat 1.8 : le plancher se chiffre pièce par pièce. */
      plancherACreer?: string | null; nonHabitableAvant?: boolean; tremiePerimNeuf?: number;
      /** Contrat 1.14 : la peinture choisie dans la pièce, en m² mesurés (null : rien de choisi). */
      peinture?: { murs?: number; plafond?: number } | null }>;
    /** Contrat 1.7 : l'emprise du niveau, sans laquelle son plancher n'est pas chiffrable. */
    emprise?: number | null;
    equipements?: Array<{ id: string; type: string; etat: string; piece?: string | null; l?: number; p?: number; douche?: string | null; lumiere?: string | null; materiau?: string | null;
      /** Contrat 1.5 : poteaux et poutres dessinés. `reprendMurPorteur` porte l'identifiant du mur repris. */
      ossature?: { role: string; portee?: number | null; reprendMurPorteur?: string | null } | null }>;
    menuiseries?: Array<{ id: string; type: string; etat: string; volet?: string | null; options?: string[];
      /** Le contrat les portait déjà ; rien ne les lisait. Voir `choixMenuiserie` et le galandage. */
      mat?: string | null; vitrage?: string | null; ouvrant?: string | null }>;
  }>;
}

export interface Contribution {
  /** Identifiant du poste au catalogue (D16). */
  poste: string;
  quantite: number;
  /** Identifiants publics des objets du plan qui l'ont produite — la traçabilité du devis. */
  sources: string[];
  /** Pourquoi cette ligne existe, en français, pour l'écran de validation. */
  raison: string;
  /** Variante du catalogue à sélectionner (ex. meuble-vasque « double »). */
  variante?: Record<string, string>;
  /* Matériau et vitrage d'une menuiserie. Ce ne sont PAS des `variante` : le moteur les lit sur
     `s.mat` / `s.vit`, pas dans `s.vsel`, et ils portent leurs propres coefficients (alu 1,
     PVC 0,60, bois 1,05 · double 1, triple 1,20). Les faire passer par `variante` revenait à ne
     rien envoyer du tout — une fenêtre PVC se chiffrait en alu, un triple vitrage en double. */
  mat?: "pvc" | "alu" | "bois";
  vit?: "double" | "triple";
  /**
   * Renseigné quand la ligne vient d'une DÉDUCTION et non d'une mesure : le plan a choisi à la
   * place de l'utilisateur, qui n'a peut-être jamais eu conscience du choix. L'écran de validation
   * doit signaler ces lignes-là — c'est le seul moyen qu'il puisse décider autrement.
   */
  deduction?: string;
}

export interface Ignore {
  quoi: string;
  pourquoi: string;
  sources: string[];
}

/** Les états qui décrivent un travail. Tout le reste est déjà là et ne se facture pas (D1). */
const TRAVAUX = new Set(["creer", "remplacer", "demolir", "boucher"]);

/** Équipement posé → poste, quand la correspondance est directe (une unité, un poste). */
const EQUIPEMENT_DIRECT: Record<string, string> = {
  wc: "plo-wc",
  lavabo: "plo-meuble-vasque",
  evier: "cui-evier-robinetterie",
  cumulus: "plo-chauffe-eau-electrique-cumulus",
  chaudiere: "cha-chaudiere-gaz-a-condensation",
  poele: "cha-poele-a-bois-granules",
  vmc: "cha-ventilation-vmc",
  radiateur: "cha-radiateurs-electriques",
  seche_serviette: "cha-seche-serviette",
  clim: "cha-climatisation-reversible-split",
  velux: "toi-fenetre-de-toit-velux",
  ilot: "cui-ilot-central",
  interrupteur: "ele-ajouter-deplacer-un-interrupteur",
  applique: "ele-ajouter-un-point-lumineux",
  tableau: "ele-changer-mettre-aux-normes-le-tableau",
  lave_linge: "plo-creer-deplacer-un-point-d-eau",
  lave_vaisselle: "plo-creer-deplacer-un-point-d-eau",
};

/** Menuiserie posée → poste. `passage` n'y est pas : une ouverture sans porte n'a rien à poser. */
const MENUISERIE: Record<string, string> = {
  porte: "min-porte-interieure-battante",
  porte_pleine: "min-porte-interieure-ame-pleine",
  coulissante: "min-porte-interieure-coulissante",
  porte_entree: "mex-porte-d-entree",
  garage: "mex-porte-de-garage",
  fenetre: "mex-fenetres",
  fenetre_p: "mex-fenetres",
  porte_fenetre: "mex-portes-fenetres",
  baie: "mex-baie-vitree",
};

const OPTION_MENUISERIE: Record<string, string> = {
  moustiquaire: "mex-moustiquaires",
  store: "mex-stores-exterieurs-brise-soleil",
  grille: "mex-grilles-de-securite",
};

/** Revêtement de sol projeté → poste. « Béton fini » n'y est pas : aucun poste au catalogue. */
const SOL: Record<string, string> = {
  "Carrelage": "rev-carrelage-au-sol",
  "Stratifié": "rev-sol-stratifie-imitation-bois",
  "Vinyle / PVC": "rev-sol-souple-pvc-lino",
  "Moquette": "rev-moquette",
  "Béton ciré": "rev-beton-cire-resine",
};

/** Toiture : l'action du projet → les postes, exactement comme la maquette les facture déjà. */
const COUVERTURE_REFECTION: Record<string, string> = {
  tuile: "toi-refection-couverture-tuiles-depose-ecran-litea",
  ardoise: "toi-refection-couverture-ardoise-depose-ecran-lite",
  zinc: "toi-couverture-zinc-bac-acier",
};
const COUVERTURE_NEUVE: Record<string, string> = {
  tuile: "toi-couverture-tuiles-sur-support-existant",
  ardoise: "toi-couverture-ardoise-sur-support-existant",
  zinc: "toi-couverture-zinc-bac-acier",
};

/** Une pièce est humide si son type le dit, ou si on y a posé une douche ou une baignoire. */
const TYPES_HUMIDES = new Set(["sdb", "sde"]);
const APPAREILS_HUMIDES = new Set(["douche", "baignoire"]);

/** Mobilier : de l'aménagement, jamais un travail. */
const MOBILIER = new Set(["lit", "lit1", "armoire", "canape", "table", "bureau"]);

/** Rôle d'ossature × matériau → poste du catalogue. Un poste par matériau, comme le catalogue
 *  distingue déjà « ouvrir un mur porteur » petite et grande : ce ne sont pas les mêmes prix. */
const POSTE_OSSATURE: Record<string, Record<string, string>> = {
  poutre: {
    acier: "mac-poutre-de-reprise-de-charge-ipn-hea",
    bois: "mac-poutre-de-reprise-de-charge-lamelle-colle",
    beton: "mac-poutre-de-reprise-de-charge-beton-arme",
  },
  poteau: {
    acier: "mac-poteau-de-reprise-acier-hea-heb",
    bois: "mac-poteau-de-reprise-lamelle-colle",
    beton: "mac-poteau-de-reprise-beton-arme",
  },
};
const MAT_OSSATURE: Record<string, string> = { acier: "acier", bois: "bois lamellé-collé", beton: "béton armé" };

export function contributionsDuPlan(plan: PlanPourCorrespondance): { contributions: Contribution[]; ignores: Ignore[] } {
  const brut: Contribution[] = [];
  const ignores: Ignore[] = [];
  /* Murs porteurs dont la poutre de reprise est DESSINÉE : leur ligne induite ne doit pas
     s'ajouter à celle-ci, c'est le même ouvrage. Rempli par la boucle des équipements, qui
     s'exécute avant celle des murs. */
  const poutresDessinees = new Set<string>();
  const add = (poste: string, quantite: number, sources: string[], raison: string,
               variante?: Record<string, string>, deduction?: string,
               choix?: Pick<Contribution, "mat" | "vit">) => {
    if (quantite <= 0) return;
    if (!posteParId(poste)) { ignores.push({ quoi: poste, pourquoi: "identifiant inconnu au catalogue", sources }); return; }
    brut.push({ poste, quantite, sources, raison, variante, deduction, ...choix });
  };
  /* Le matériau et le vitrage tels que le catalogue les connaît. Le plan propose parfois plus que
     le moteur ne sait chiffrer — on ne laisse alors PAS passer une valeur inconnue, qui vaudrait
     coefficient 1 en silence : on n'envoie rien, et le moteur applique son défaut. */
  const MATS = new Set(["pvc", "alu", "bois"]);
  const VITS = new Set(["double", "triple"]);
  const choixMenuiserie = (m: { mat?: string | null; vitrage?: string | null }): Pick<Contribution, "mat" | "vit"> => ({
    mat: m.mat && MATS.has(m.mat) ? (m.mat as Contribution["mat"]) : undefined,
    vit: m.vitrage && VITS.has(m.vitrage) ? (m.vitrage as Contribution["vit"]) : undefined,
  });

  // ── Planchers à créer, pièce par pièce ────────────────────────────────────
  /* Un volume ouvert — grange, séjour cathédrale, combles bruts — n'a pas de plancher, et c'est
     souvent l'ouvrage le plus cher de l'opération. Pièce par pièce et non par niveau : une
     mezzanine ne couvre pas tout un volume. Les murs ne suivent pas : un plancher posé dans un
     volume existant trouve des murs déjà debout, ce sont leurs propres états qui le disent. */
  for (const niveau of plan.detailNiveaux ?? []) {
    for (const r of niveau.rooms ?? []) {
      if (!r.plancherACreer) continue;
      const m2 = +(r.area ?? 0).toFixed(2);
      const src = [r.id];
      if (m2 <= 0) { ignores.push({ quoi: `plancher à créer`, pourquoi: "surface de la pièce inconnue", sources: src }); continue; }
      add(r.plancherACreer === "beton" ? "mac-plancher-beton-etage-cree" : "toi-creer-un-plancher-bois",
        m2, src, "Volume ouvert : son plancher est à créer");
    }
  }

  // ── Équipements posés ──────────────────────────────────────────────────────
  for (const niveau of plan.detailNiveaux ?? []) {
    for (const e of niveau.equipements ?? []) {
      if (MOBILIER.has(e.type)) continue;
      if (e.etat !== "creer") continue;                       // D1 : seul ce qui est à poser
      const src = [e.id];
      if (e.ossature) {
        /* Poutre au ml de portée, poteau à l'unité, chacun sur le poste de SON matériau.
           Si la poutre longe un mur porteur démoli, c'est SA reprise : la ligne induite plus bas
           est retirée, sinon le devis paierait deux fois la même poutre.
           Le matériau non renseigné vaut acier — le défaut de l'éditeur — et on le dit. */
        const mat = e.materiau && POSTE_OSSATURE[e.ossature.role]?.[e.materiau] ? e.materiau : "acier";
        const ded = e.materiau ? undefined : "Matériau non choisi : chiffré en acier, le défaut du dessin. Un lamellé-collé ou un béton armé se chiffrent autrement.";
        const poste = POSTE_OSSATURE[e.ossature.role]?.[mat];
        if (!poste) { ignores.push({ quoi: `ossature « ${e.ossature.role} »`, pourquoi: "rôle d'ossature inconnu", sources: src }); continue; }
        const quoi = MAT_OSSATURE[mat];
        if (e.ossature.role === "poutre") {
          const ml = +(e.ossature.portee ?? e.l ?? 0).toFixed(2);
          if (ml > 0) {
            if (e.ossature.reprendMurPorteur) poutresDessinees.add(e.ossature.reprendMurPorteur);
            add(poste, ml, src, `Poutre ${quoi} dessinée${e.ossature.reprendMurPorteur ? ", en reprise du mur porteur démoli" : ""}`, undefined, ded);
          }
        } else add(poste, 1, src, `Poteau ${quoi} dessiné`, undefined, ded);
        continue;
      }
      if (e.type === "douche") {
        // D6 : trois branches exclusives. La colonne et la paroi accompagnent le receveur,
        // la cabine est un bloc qui les remplace.
        const t = e.douche || "bac";
        const dedProduit = e.douche ? undefined : "Type de douche non choisi : receveur + colonne + paroi par défaut. Une douche à l'italienne ou une cabine se chiffrent autrement.";
        if (t === "cabine") add("plo-cabine-complete-parois-porte", 1, src, "Douche dessinée, type « cabine »");
        else {
          add(t === "italienne" ? "plo-douche-a-l-italienne" : "plo-bac-de-douche", 1, src, `Douche dessinée, type « ${t} »`, undefined, dedProduit);
          add("plo-colonne-de-douche", 1, src, "Colonne de la douche dessinée", undefined, dedProduit);
          add("plo-paroi-de-douche", 1, src, "Paroi de la douche dessinée", undefined, dedProduit);
        }
        continue;
      }
      if (e.type === "vasque2") {
        // D7 : une seule unité, en variante « double ». Deux unités donneraient quatre robinetteries.
        add("plo-meuble-vasque", 1, src, "Double vasque dessinée", { config: "double" });
        continue;
      }
      if (e.type === "baignoire") {
        add("plo-installer-une-baignoire", 1, src, "Baignoire dessinée");
        add("plo-robinetterie-baignoire", 1, src, "Robinetterie de la baignoire dessinée");
        continue;
      }
      if (e.type === "escalier") {
        // D15 : l'objet porte son matériau.
        const m = e.materiau || "bois";
        const ded = e.materiau ? undefined : "Matériau d'escalier non choisi : bois par défaut. Un escalier béton coûte près du double.";
        if (m === "beton") add("mac-escalier-en-beton", 1, src, "Escalier dessiné, en béton");
        else if (m === "bois") add("toi-escalier-en-bois", 1, src, "Escalier dessiné, en bois", undefined, ded);
        else ignores.push({ quoi: "escalier métal", pourquoi: "aucun poste « escalier métallique » au catalogue", sources: src });
        continue;
      }
      if (e.type === "lumiere") {
        // D15 : un spot encastré et un plafonnier ne sont pas le même poste.
        const l = e.lumiere || "spot";
        const ded = e.lumiere ? undefined : "Type de point lumineux non choisi : spot encastré par défaut, ce qui suppose un faux plafond ou un plénum.";
        add(l === "spot" ? "ele-spots-encastres-led" : "ele-ajouter-un-point-lumineux", 1, src, `Point lumineux dessiné, type « ${l} »`, undefined, ded);
        continue;
      }
      if (e.type === "prise" || e.type === "prise2") {
        add("ele-ajouter-deplacer-une-prise", e.type === "prise2" ? 2 : 1, src, "Prise dessinée");
        continue;
      }
      if (e.type === "plan") {
        add("cui-plan-de-travail-seul", +(e.l ?? 0).toFixed(2), src, "Plan de travail dessiné, mesuré sur le plan");
        continue;
      }
      if (e.type === "pac_ext") continue;                     // comprise dans le split intérieur
      const direct = EQUIPEMENT_DIRECT[e.type];
      if (direct) add(direct, 1, src, "Équipement dessiné");
      else ignores.push({ quoi: e.type, pourquoi: "aucun poste au catalogue pour ce type d'équipement", sources: src });
    }

    // ── Menuiseries ──────────────────────────────────────────────────────────
    for (const m of niveau.menuiseries ?? []) {
      const src = [m.id];
      if (!TRAVAUX.has(m.etat)) continue;                     // D1
      if (m.etat === "boucher") {
        ignores.push({ quoi: "ouverture à boucher", pourquoi: "aucun poste de rebouchage d'ouverture au catalogue", sources: src });
        continue;
      }
      if (m.etat === "remplacer") add("dem-enlever-les-anciennes-portes-fenetres", 1, src, "Menuiserie remplacée : dépose de l'ancienne");
      const poste = MENUISERIE[m.type];
      /* Le choix de pose voyage AUSSI sur la menuiserie : c'est là que l'estimateur détaillé le
         montre désormais, et une ligne importée doit afficher le même état que si l'utilisateur
         l'avait cochée lui-même. La poche reste une ligne à part, épinglée par le plan — sa
         quantité ne se redéduit donc pas et ne peut pas doubler. */
      const pose = m.ouvrant === "galandage" ? { pose: "galandage" }
        : m.type === "baie" ? { pose: "coulissante" }
        : m.type === "coulissante" ? { pose: "applique" } : undefined;
      if (poste) add(poste, 1, src, m.etat === "remplacer" ? "Menuiserie remplacée" : "Menuiserie neuve",
        pose,
        m.mat || m.vitrage ? undefined : "Matériau et vitrage non choisis : le devis applique ses défauts (PVC hors finition premium, double vitrage). L'alu coûte 67 % de plus que le PVC, le bois 75 %.",
        choixMenuiserie(m));
      else if (m.type !== "passage") ignores.push({ quoi: m.type, pourquoi: "aucun poste au catalogue pour ce type de menuiserie", sources: src });
      /* La poche du galandage n'a PLUS de ligne : son prix est une plus-value portée par la
         menuiserie elle-même, via la variante `pose` posée juste au-dessus (le moteur l'ajoute
         dans `supplementVariantes`). Lui envoyer en plus une ligne « Caisson à galandage »
         reviendrait à la facturer deux fois. */
      /* Le volet suit le matériau de sa menuiserie — le catalogue lui donne son propre
         coefficient PVC (0,80 et non 0,60), le moteur s'en charge. */
      if (m.volet) add(m.volet === "roulant" ? "mex-volets-roulants" : "mex-volets-battants", 1, src, `Volet ${m.volet}`,
        undefined, undefined, { mat: choixMenuiserie(m).mat });
      if (m.etat === "creer") {
        // Maçonnerie induite par une ouverture NEUVE : une fenêtre reçoit un appui, une baie ou
        // une porte extérieure un seuil. Une menuiserie remplacée garde les siens.
        if (m.type === "fenetre" || m.type === "fenetre_p") add("mac-creer-un-appui-de-fenetre", 1, src, "Appui de la fenêtre créée");
        if (m.type === "baie" || m.type === "porte_fenetre" || m.type === "porte_entree") add("mac-creer-un-seuil-de-porte", 1, src, "Seuil de l'ouverture créée");
      }
      for (const o of m.options ?? []) {
        const po = OPTION_MENUISERIE[o];
        if (po) add(po, 1, src, "Option de la menuiserie");
      }
    }
  }

  // ── Murs : démolir, créer ─────────────────────────────────────────────────
  for (const w of plan.provenance?.murs ?? []) {
    const src = [w.id];
    if (!TRAVAUX.has(w.etat)) continue;                       // D1
    if (w.etat === "demolir") {
      if (w.porteur) {
        // D9 : la démolition, puis la poutre qui reprend ce que le mur portait.
        /* Contrat 1.14 : « je ne sais pas », ou pas de réponse — le plan chiffre prudemment et le dit. */
        add("dem-abattre-un-mur-porteur", +w.m2.toFixed(2), src, "Mur porteur à démolir", undefined,
          w.porteurAVerifier ? "Personne n'a dit si ce mur porte : il est chiffré porteur, par prudence (démolition, poutre, étude). À faire vérifier par un pro — s'il ne porte rien, ces lignes tombent." : undefined);
        if (!poutresDessinees.has(w.id)) add("mac-poutre-de-reprise-de-charge-ipn-hea", +w.ml.toFixed(2), src, "Reprise de charge du mur porteur démoli");
      } else if (w.type === "cloison") add("dem-abattre-une-cloison", +w.m2.toFixed(2), src, "Cloison à démolir");
      else add("dem-abattre-un-mur-non-porteur", +w.m2.toFixed(2), src, "Mur non porteur à démolir");
    }
    if (w.etat === "creer") {
      if (w.type === "cloison") add("clo-monter-une-cloison", +w.m2.toFixed(2), src, "Cloison à créer");
      else if (w.type === "porteur") add("mac-monter-un-mur-en-pierre", +w.m2.toFixed(2), src, "Mur en pierre à créer");
      else add("mac-monter-un-mur-en-parpaings", +w.m2.toFixed(2), src, "Mur en parpaings à créer");
    }
  }

  // ── Percements induits ────────────────────────────────────────────────────
  /* Contrat 1.11 : on compte les percements OUVERTURE PAR OUVERTURE, et non sur l'agrégat
     `travaux.percementsDetail`. Même raison que pour le doublage (D23) : une ligne sans source
     ne se rattache à aucun objet du plan, et le percement pèse lourd — jusqu'à 19 000 € sur une
     scène de six ouvertures. L'agrégat reste le repli pour un plan d'une version antérieure. */
  const POSTE_PERC: Record<string, string> = {
    porteurPetit: "mac-ouvrir-un-mur-porteur-petite-porte-fenetre",
    porteurGrand: "mac-ouvrir-un-mur-porteur-grande-2-5-m-baie",
  };
  const percs = plan.provenance?.ouvertures?.filter((o) => o.percement);
  if (percs?.length) {
    const parType = new Map<string, string[]>();
    for (const o of percs) parType.set(o.percement!, [...(parType.get(o.percement!) ?? []), ...(o.id ? [o.id] : [])]);
    for (const [type, ids] of parType) {
      if (type === "leger") { ignores.push({ quoi: `${ids.length} percement(s) en mur léger`, pourquoi: "aucun poste de percement hors mur porteur au catalogue", sources: ids }); continue; }
      const poste = POSTE_PERC[type];
      if (poste) add(poste, ids.length, ids, type === "porteurGrand" ? "Percement d'un mur porteur, grande ouverture" : "Percement d'un mur porteur, petite ouverture");
    }
  } else {
    const pd = plan.travaux?.percementsDetail ?? {};
    add("mac-ouvrir-un-mur-porteur-petite-porte-fenetre", pd.porteurPetit ?? 0, [], "Percement d'un mur porteur, petite ouverture");
    add("mac-ouvrir-un-mur-porteur-grande-2-5-m-baie", pd.porteurGrand ?? 0, [], "Percement d'un mur porteur, grande ouverture");
    if (pd.leger) ignores.push({ quoi: `${pd.leger} percement(s) en mur léger`, pourquoi: "aucun poste de percement hors mur porteur au catalogue", sources: [] });
  }

  // ── Études (D11 : un forfait se coche, il ne reçoit pas de quantité) ──────
  if (plan.etudes?.structure) add("etu-etude-de-structure", 1, [],
    (plan.etudes.mlPorteurDemoli ?? 0) > 0 || !plan.etudes.ossatureCreee
      ? "Un mur porteur est démoli : étude de structure obligatoire"
      : "Une poutre ou un poteau est créé : étude de structure pour le dimensionner");

  // ── Doublage (D2 : c'est l'ITI qui porte le doublage) ─────────────────────
  /* On lit le détail MUR PAR MUR, plus l'agrégat `doublage.iti`. Deux raisons, et la première
     est un bug, pas un raffinement :

     1. L'agrégat compte TOUT ce que la vue Projet montre — y compris un doublage déjà en place.
        Un mur existant déjà isolé se facturait donc comme neuf, ce que D1 interdit : seul le
        delta se facture. Sur un mur de 12,5 m², c'était 688 € offerts au devis.
     2. Une ligne sans source ne se rattache à aucun objet du plan. D1 exige que chaque ligne
        injectée dise d'où elle vient, sinon l'écran de validation ne peut pas la montrer sur le
        dessin, et l'utilisateur ne peut pas la contester.

     Sans `provenance` (un plan d'une version antérieure), on retombe sur l'agrégat : moins juste,
     mais jamais vide. */
  const couches = plan.provenance?.doublages;
  if (couches?.length) {
    /* Le poste dépend du mode ET de la finition : une ITE sous BARDAGE est un parement rapporté
       sur ossature ventilée, pas un enduit sur isolant — 185 contre 140 €/m² au catalogue. Le
       contrat porte la finition depuis 1.12 ; avant, les deux se facturaient au même prix. */
    const POSTE_DOUBLAGE: Record<string, string> = {
      iti: "iso-isolation-des-murs-par-l-interieur",
      ite: "fac-isolation-par-l-exterieur-ite",
      "ite-bardage": "fac-isolation-par-l-exterieur-ite-sous-bardage",
    };
    const parMode = new Map<string, { m2: number; murs: string[] }>();
    for (const c of couches) {
      if (c.etat !== "creer") continue;                      // D1
      const mode = c.mode === "ite" ? (c.sys === "bardage" ? "ite-bardage" : "ite") : "iti";
      const e = parMode.get(mode) ?? { m2: 0, murs: [] };
      e.m2 += c.m2 ?? 0;
      if (c.mur && !e.murs.includes(c.mur)) e.murs.push(c.mur);
      parMode.set(mode, e);
    }
    for (const [mode, e] of parMode) {
      if (e.m2 <= 0) continue;
      add(POSTE_DOUBLAGE[mode], +e.m2.toFixed(2), e.murs,
        mode === "iti" ? "Doublage isolé par l'intérieur, mesuré mur par mur"
          : mode === "ite-bardage" ? "Isolation par l'extérieur sous bardage, mesurée mur par mur"
          : "Isolation par l'extérieur, mesurée mur par mur");
    }
  } else {
    if (plan.doublage?.iti) add("iso-isolation-des-murs-par-l-interieur", +plan.doublage.iti.toFixed(2), [], "Doublage isolé par l'intérieur, mesuré sur le plan");
    if (plan.doublage?.ite) add("fac-isolation-par-l-exterieur-ite", +plan.doublage.ite.toFixed(2), [], "Isolation par l'extérieur, mesurée sur le plan");
  }

  // ── Façade : la maquette nomme déjà le poste du catalogue ────────────────
  /* Même lecture par mur, pour la même raison de traçabilité. L'agrégat `facades.parPoste`, lui,
     ne comptait déjà que le neuf — il n'y avait pas de bug d'état ici, seulement des lignes
     orphelines. */
  const pans = plan.provenance?.facades?.filter((f) => f.etat === "creer");
  if (pans?.length) {
    const parPoste = new Map<string, { m2: number; murs: string[]; label: string }>();
    for (const f of pans) {
      const label = f.label ?? "";
      const e = parPoste.get(label) ?? { m2: 0, murs: [], label };
      e.m2 += f.m2 ?? 0;
      if (f.mur && !e.murs.includes(f.mur)) e.murs.push(f.mur);
      parPoste.set(label, e);
    }
    for (const [label, e] of parPoste) {
      const p = posteParNom("Façade", e.label || label);
      if (p) add(p.id, +e.m2.toFixed(2), e.murs, `Façade : ${(e.label || label).toLowerCase()}`);
      else ignores.push({ quoi: label, pourquoi: "libellé de façade sans poste correspondant", sources: e.murs });
    }
  } else {
    for (const [label, m2] of Object.entries(plan.facades?.parPoste ?? {})) {
      const p = posteParNom("Façade", label);
      if (p) add(p.id, +m2.toFixed(2), [], `Façade : ${label.toLowerCase()}`);
      else ignores.push({ quoi: label, pourquoi: "libellé de façade sans poste correspondant", sources: [] });
    }
  }

  // ── Sols, pièce par pièce ─────────────────────────────────────────────────
  for (const sol of plan.sols ?? []) {
    const src = sol.id ? [sol.id] : [];
    const m2 = +(sol.surface ?? 0);
    const ou = sol.piece ? ` · ${sol.piece}` : "";
    if (sol.depose) add("dem-enlever-un-revetement-de-sol", m2, src, `Ancien sol déposé${ou}`);
    if (sol.dalle) add("mac-couler-une-dalle-beton", m2, src, `Dalle à couler${ou}`);
    if (sol.isolant) add("iso-isolation-du-sol-plancher-bas", m2, src, `Isolation sous chape${ou}`);
    /* « tradi », pas « traditionnelle » : c'est le mot que l'éditeur écrit dans le contrat
       (setRoomSol('chape','tradi')). On attendait ici un mot que le plan n'a jamais émis, donc
       une chape traditionnelle dessinée n'était JAMAIS facturée — 442 € muets sur une salle de
       bain. Le contrôle de couverture ne l'avait pas vu parce que la scène de référence posait
       l'orthographe longue à la main, au lieu du vocabulaire de l'éditeur. */
    if (sol.chape === "tradi") add("mac-chape-traditionnelle", m2, src, `Chape${ou}`);
    if (sol.chape === "liquide") add("mac-chape-liquide", m2, src, `Chape liquide${ou}`);
    if (sol.ragreage) add("rev-preparation-du-sol-ragreage", m2, src, `Ragréage${ou}`);
    const nouveau = sol.revetement || "";
    if (!nouveau || sol.betonFini) continue;
    if (nouveau === "Parquet") {
      /* Contrat 1.14 : le plan DIT s'il ponce l'ancien parquet ou en pose un neuf — c'est un
         choix de la ligne Revêtement, plus une déduction. Un contrat antérieur, qui ne le dit pas,
         garde la règle D8 : parquet posé sur un parquet existant = on le ponce. */
      const ancien = (sol.existant || "").toLowerCase();
      const dit = typeof sol.poncage === "boolean";
      const poncage = dit ? sol.poncage === true : ancien.includes("parquet");
      add(poncage ? "rev-poncage-vitrification-parquet" : "rev-parquet-bois", m2, src,
        poncage ? `Parquet existant poncé et vitrifié${ou}` : `Parquet neuf${ou}`, undefined,
        dit ? undefined
        : poncage
          ? `Déduit du sol existant (${sol.existant}) : on le ponce plutôt que de le remplacer. Si tu veux un parquet neuf, change cette ligne.`
          : `Déduit du sol existant (${sol.existant || "non renseigné"}) : parquet neuf. Si tu voulais poncer l'ancien, change cette ligne.`);
      continue;
    }
    const poste = SOL[nouveau];
    if (poste) add(poste, m2, src, `Sol : ${nouveau.toLowerCase()}${ou}`);
    else ignores.push({ quoi: nouveau, pourquoi: "aucun poste de sol au catalogue pour ce revêtement", sources: src });
  }

  // ── Surfaces mesurées pièce par pièce : faïence, cloison humide, plinthes ─
  {
    const humides = new Set<string>();
    const perimEau = new Map<string, number>();
    for (const n of plan.detailNiveaux ?? []) for (const e of n.equipements ?? []) {
      if (!APPAREILS_HUMIDES.has(e.type) || !e.piece) continue;
      humides.add(e.piece);
      // Un receveur est adossé à deux murs : c'est ce linéaire-là qui monte à 2 m de faïence.
      perimEau.set(e.piece, (perimEau.get(e.piece) ?? 0) + (e.l ?? 0) + (e.p ?? 0));
    }
    for (const n of plan.detailNiveaux ?? []) for (const r of n.rooms ?? []) {
      if (r.exterieur) continue;
      const src = [r.id];
      if (r.plinthes) add("rev-plinthes", +r.plinthes.toFixed(2), src, "Plinthes, au périmètre réel de la pièce");
      if (r.fauxPlafond && r.area) add("clo-faux-plafond", +r.area.toFixed(2), src, "Faux plafond demandé dans cette pièce");
      /* Contrat 1.10 : le pourtour d'une trémie dont l'escalier est à CRÉER. Un vide dans un
         plancher impose un garde-corps, le plan en mesure le linéaire exact, et rien ne le
         chiffrait — ni le compteur du plan, ni le devis. On lit `tremiePerimNeuf` et non
         `tremiePerim` : une trémie qui existe déjà a déjà son garde-corps (D1). */
      if (r.tremiePerimNeuf) add("toi-garde-corps", +r.tremiePerimNeuf.toFixed(2), src, "Garde-corps au pourtour de la trémie créée");
      /* Contrat 1.14 : la peinture n'est jamais un défaut — seulement ce que la pièce a choisi,
         en m² mesurés (murs hors ouvertures et faïence, plafond hors trémie). */
      if (r.peinture?.murs) add("pei-peinture-des-murs", +r.peinture.murs.toFixed(2), src, "Murs à repeindre, mesurés sur le plan");
      if (r.peinture?.plafond) add("pei-peinture-des-plafonds", +r.peinture.plafond.toFixed(2), src, "Plafond à repeindre, mesuré sur le plan");
      const humide = TYPES_HUMIDES.has(r.type) || humides.has(r.id);
      if (!humide) continue;
      // D10 : la hauteur de pose choisie dans la fiche de pièce devient une surface.
      const pEau = Math.min(perimEau.get(r.id) ?? 0, r.perimeter ?? 0);
      const hauteur = r.faience || "mi";
      const dedFaience = r.faience ? undefined : "Hauteur de faïence non choisie : mi-hauteur par défaut. Pleine hauteur double presque la surface carrelée.";
      const m2 = hauteur === "pleine" ? (r.wallArea ?? 0)
        : hauteur === "douche" ? pEau * 2
        : Math.max(0, (r.perimeter ?? 0) - pEau) * 1.2 + pEau * 2;
      add("rev-faience-carrelage-mural", +m2.toFixed(2), src,
        hauteur === "pleine" ? "Faïence pleine hauteur" : hauteur === "douche" ? "Faïence sur la zone de douche" : "Faïence à mi-hauteur, 2 m dans la douche",
        undefined, dedFaience);
      // La cloison hydrofuge ne concerne que les CLOISONS de la pièce humide : un mur extérieur
      // est doublé, pas hydrofugé.
      const cloisons = r.mursParType?.cloison ?? 0;
      if (cloisons > 0) add("clo-cloison-piece-humide-hydrofuge", +cloisons.toFixed(2), src, "Cloisons de la pièce humide");
    }
  }

  // ── Étage créé dont le plancher n'est pas décidé (D21) ───────────────────
  /* Il n'y a qu'UNE règle qui pose un plancher, et c'est celle d'au-dessus : une pièce qui
     déclare `plancherACreer`. Le repli qui vivait ici — cocher « étage créé » suffisait à
     facturer le plancher de tout le niveau, au matériau du niveau ou à bois par défaut — a été
     retiré le 19/09/2026 (D21) : on ne facture rien tant que ce n'est pas décidé SUR LE PLAN.
     Deux raisons. Le contrat 1.3 le dit déjà — un choix non tranché sort à null, personne ne
     fabrique le défaut à la place de l'utilisateur. Et les deux règles se déclenchaient ensemble
     sur le chemin normal de l'éditeur (cocher « étage créé » passe ses pièces en « pas de
     plancher »), ce qui sortait le plancher en DOUBLE : 14,44 m² facturés 28,88.

     Ne rien facturer n'est pas se taire : un étage créé dont les pièces ne se prononcent pas est
     l'ouvrage le plus cher de l'opération qui manque au devis. On le REMONTE donc à l'écran de
     validation, avec le geste exact qui le règle — c'est le même message que l'éditeur affiche
     déjà sur le plan. */
  for (const n of plan.detailNiveaux ?? []) {
    if (!n.neuf) continue;
    const muettes = (n.rooms ?? []).filter((r) => !r.plancherACreer && (r.area ?? 0) > 0);
    if (!muettes.length) continue;
    const m2 = muettes.reduce((t, r) => t + (r.area ?? 0), 0);
    ignores.push({
      quoi: `plancher de « ${n.name ?? "l'étage créé"} » — ${muettes.length} pièce(s), ${m2.toFixed(2)} m²`,
      pourquoi: "étage créé par le projet, mais son plancher n'est pas décidé sur le plan : mets le sol de ces pièces sur « Pas de plancher » et choisis bois ou béton",
      sources: muettes.map((r) => r.id).filter(Boolean),
    });
  }

  // ── Toiture : une grandeur, et l'action décide des postes ─────────────────
  {
    const t = plan.toiture, pr = t?.projet;
    if (t && pr && t.surface) {
      const S = +t.surface, src: string[] = [];
      const couv = t.couverture || "tuile";
      if (pr.action === "demousser") add("toi-nettoyer-demousser-la-toiture", S, src, "Toiture à démousser");
      if (t.forme === "plat" && (pr.action === "refection" || pr.action === "complete")) {
        // Un toit plat n'a ni tuile ni ardoise : c'est une étanchéité, et un seul poste.
        add("toi-toit-plat-etancheite", S, src, "Toit plat : étanchéité");
      } else if (pr.action === "refection") {
        const poste = COUVERTURE_REFECTION[couv];
        if (poste) add(poste, S, src, `Réfection de la couverture (${couv})`);
        else ignores.push({ quoi: `réfection ${couv}`, pourquoi: "aucun poste de réfection pour cette couverture", sources: src });
      }
      if (pr.action === "complete" && t.forme !== "plat") {
        add("toi-depose-complete-de-toiture-couverture-charpent", S, src, "Toiture refaite entièrement : dépose");
        const charp = pr.charpente || "trad";
        if (charp === "trad" && (couv === "tuile" || couv === "ardoise")) {
          add(couv === "tuile" ? "toi-toiture-complete-tuile-charpente-couverture" : "toi-toiture-complete-ardoise-charpente-couverture", S, src,
            "Toiture complète (charpente traditionnelle + couverture)");
        } else {
          add(charp === "fermettes" ? "toi-charpente-en-fermettes-hors-couverture" : "toi-charpente-traditionnelle-hors-couverture", S, src, "Charpente neuve");
          const poste = COUVERTURE_NEUVE[couv];
          if (poste) add(poste, S, src, `Couverture neuve (${couv})`);
          add("toi-sous-toiture-ecran-liteaux", S, src, "Sous-toiture (écran + liteaux)");
        }
      }
      if (pr.action !== "complete" && pr.traiterCharpente) add("toi-traiter-la-charpente", S, src, "Charpente à traiter (préventif)");
      if (pr.isoCombles === "perdus") add("iso-isolation-des-combles-perdus-soufflage", +(t.emprise ?? 0), src, "Isolation des combles perdus, à l'emprise du niveau");
      if (pr.isoCombles === "rampants") add("iso-isolation-des-combles-amenages-rampants", S, src, "Isolation des rampants");
      if (pr.gouttieres && t.egouts) add("toi-gouttieres-descentes", +t.egouts, src, "Gouttières, au linéaire d'égout mesuré");
      if (pr.raccords && t.raccords) add("toi-raccords-faitage-noues-solins", +t.raccords, src, "Raccords : faîtage, arêtiers, solins");
      // Double source (D15) : les fenêtres de toit POSÉES sur le plan font foi ; le compteur du
      // panneau Toiture n'est qu'un raccourci pour qui ne les a pas dessinées.
      const posees = (plan.detailNiveaux ?? []).flatMap((n) => n.equipements ?? []).filter((e) => e.type === "velux" && e.etat === "creer").length;
      if (!posees && pr.velux) add("toi-fenetre-de-toit-velux", pr.velux, src, "Fenêtres de toit, comptées au panneau Toiture",
        undefined, "Aucune fenêtre de toit n'est dessinée : le nombre vient du panneau Toiture. Pose-les sur le plan pour qu'elles soient situées.");
    }
  }

  // ── Regroupement : un poste, une ligne, toutes ses sources ───────────────
  const parPoste = new Map<string, Contribution>();
  for (const c of brut) {
    /* Deux fenêtres de matériaux ou de vitrages différents ne sont PAS la même ligne : les
       fusionner chiffrerait les deux au coefficient de la première. */
    const cle = c.poste + (c.variante ? "|" + JSON.stringify(c.variante) : "") + (c.mat ? "|m:" + c.mat : "") + (c.vit ? "|v:" + c.vit : "");
    const v = parPoste.get(cle);
    if (!v) { parPoste.set(cle, { ...c, sources: [...c.sources] }); continue; }
    v.quantite = +(v.quantite + c.quantite).toFixed(2);
    for (const s of c.sources) if (!v.sources.includes(s)) v.sources.push(s);
    /* Une ligne regroupée reste « déduite » si l'une de ses sources l'est : sinon un seul mur
       répondu masquait les murs dont personne n'a dit s'ils portaient. */
    if (!v.deduction && c.deduction) v.deduction = c.deduction;
  }
  return { contributions: [...parPoste.values()], ignores };
}

/** Les postes du catalogue que cette table sait alimenter — pour mesurer la couverture. */
export function postesCouverts(): string[] {
  const ids = new Set<string>([
    ...Object.values(EQUIPEMENT_DIRECT), ...Object.values(MENUISERIE), ...Object.values(OPTION_MENUISERIE),
    "plo-cabine-complete-parois-porte", "plo-douche-a-l-italienne", "plo-bac-de-douche", "plo-colonne-de-douche",
    "plo-paroi-de-douche", "plo-meuble-vasque", "plo-installer-une-baignoire", "plo-robinetterie-baignoire",
    "mac-escalier-en-beton", "toi-escalier-en-bois", "ele-spots-encastres-led", "ele-ajouter-un-point-lumineux",
    "ele-ajouter-deplacer-une-prise", "cui-plan-de-travail-seul", "dem-enlever-les-anciennes-portes-fenetres",
    "mex-volets-roulants", "mex-volets-battants", "dem-abattre-un-mur-porteur", ...Object.values(POSTE_OSSATURE).flatMap((m) => Object.values(m)),
    "mac-plancher-beton-etage-cree", "toi-creer-un-plancher-bois",
    "dem-abattre-une-cloison", "dem-abattre-un-mur-non-porteur", "clo-monter-une-cloison", "mac-monter-un-mur-en-pierre",
    "mac-monter-un-mur-en-parpaings", "mac-ouvrir-un-mur-porteur-petite-porte-fenetre",
    "mac-ouvrir-un-mur-porteur-grande-2-5-m-baie", "etu-etude-de-structure", "iso-isolation-des-murs-par-l-interieur",
    "fac-isolation-par-l-exterieur-ite", "fac-isolation-par-l-exterieur-ite-sous-bardage",
    "fac-ravalement-facade-pierre-tout-compris", "fac-nettoyer-la-facade",
    "fac-refaire-les-joints-rejointoiement-pierre-briqu", "fac-enduit-monocouche-machine",
    "fac-enduit-a-la-chaux-maison-ancienne", "fac-peindre-la-facade", "fac-traitement-impermeabilisant", "fac-bardage",
    ...Object.values(SOL), "rev-poncage-vitrification-parquet", "rev-parquet-bois",
    "dem-enlever-un-revetement-de-sol", "mac-couler-une-dalle-beton", "iso-isolation-du-sol-plancher-bas",
    "mac-chape-traditionnelle", "mac-chape-liquide", "rev-preparation-du-sol-ragreage",
    "rev-plinthes", "rev-faience-carrelage-mural", "clo-cloison-piece-humide-hydrofuge",
    ...Object.values(COUVERTURE_REFECTION), ...Object.values(COUVERTURE_NEUVE),
    "toi-nettoyer-demousser-la-toiture", "toi-depose-complete-de-toiture-couverture-charpent",
    "toi-toiture-complete-tuile-charpente-couverture", "toi-toiture-complete-ardoise-charpente-couverture",
    "toi-charpente-en-fermettes-hors-couverture", "toi-charpente-traditionnelle-hors-couverture",
    "toi-sous-toiture-ecran-liteaux", "toi-traiter-la-charpente",
    "iso-isolation-des-combles-perdus-soufflage", "iso-isolation-des-combles-amenages-rampants",
    "toi-gouttieres-descentes", "toi-raccords-faitage-noues-solins",
    "mac-creer-un-appui-de-fenetre", "mac-creer-un-seuil-de-porte",
    "clo-faux-plafond", "toi-creer-un-plancher-bois", "mac-plancher-beton-etage-cree", "toi-toit-plat-etancheite",
    "pei-peinture-des-murs", "pei-peinture-des-plafonds",
  ]);
  return [...ids];
}
