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
  etudes?: { structure?: number; mlPorteurDemoli?: number };
  doublage?: { iti?: number; ite?: number };
  facades?: { parPoste?: Record<string, number> };
  provenance?: {
    murs?: Array<{ id: string; type: string; porteur: boolean; etat: string; ml: number; m2: number }>;
  };
  detailNiveaux?: Array<{
    equipements?: Array<{ id: string; type: string; etat: string; l?: number; douche?: string | null; lumiere?: string | null; materiau?: string | null }>;
    menuiseries?: Array<{ id: string; type: string; etat: string; volet?: string | null; options?: string[] }>;
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

/** Mobilier : de l'aménagement, jamais un travail. */
const MOBILIER = new Set(["lit", "lit1", "armoire", "canape", "table", "bureau"]);

export function contributionsDuPlan(plan: PlanPourCorrespondance): { contributions: Contribution[]; ignores: Ignore[] } {
  const brut: Contribution[] = [];
  const ignores: Ignore[] = [];
  const add = (poste: string, quantite: number, sources: string[], raison: string, variante?: Record<string, string>) => {
    if (quantite <= 0) return;
    if (!posteParId(poste)) { ignores.push({ quoi: poste, pourquoi: "identifiant inconnu au catalogue", sources }); return; }
    brut.push({ poste, quantite, sources, raison, variante });
  };

  // ── Équipements posés ──────────────────────────────────────────────────────
  for (const niveau of plan.detailNiveaux ?? []) {
    for (const e of niveau.equipements ?? []) {
      if (MOBILIER.has(e.type)) continue;
      if (e.etat !== "creer") continue;                       // D1 : seul ce qui est à poser
      const src = [e.id];
      if (e.type === "douche") {
        // D6 : trois branches exclusives. La colonne et la paroi accompagnent le receveur,
        // la cabine est un bloc qui les remplace.
        const t = e.douche || "bac";
        if (t === "cabine") add("plo-cabine-complete-parois-porte", 1, src, "Douche dessinée, type « cabine »");
        else {
          add(t === "italienne" ? "plo-douche-a-l-italienne" : "plo-bac-de-douche", 1, src, `Douche dessinée, type « ${t} »`);
          add("plo-colonne-de-douche", 1, src, "Colonne de la douche dessinée");
          add("plo-paroi-de-douche", 1, src, "Paroi de la douche dessinée");
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
        if (m === "beton") add("mac-escalier-en-beton", 1, src, "Escalier dessiné, en béton");
        else if (m === "bois") add("toi-escalier-en-bois", 1, src, "Escalier dessiné, en bois");
        else ignores.push({ quoi: "escalier métal", pourquoi: "aucun poste « escalier métallique » au catalogue", sources: src });
        continue;
      }
      if (e.type === "lumiere") {
        // D15 : un spot encastré et un plafonnier ne sont pas le même poste.
        const l = e.lumiere || "spot";
        add(l === "spot" ? "ele-spots-encastres-led" : "ele-ajouter-un-point-lumineux", 1, src, `Point lumineux dessiné, type « ${l} »`);
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
      if (poste) add(poste, 1, src, m.etat === "remplacer" ? "Menuiserie remplacée" : "Menuiserie neuve");
      else if (m.type !== "passage") ignores.push({ quoi: m.type, pourquoi: "aucun poste au catalogue pour ce type de menuiserie", sources: src });
      if (m.volet) add(m.volet === "roulant" ? "mex-volets-roulants" : "mex-volets-battants", 1, src, `Volet ${m.volet}`);
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
        add("dem-abattre-un-mur-porteur", +w.m2.toFixed(2), src, "Mur porteur à démolir");
        add("mac-poutre-de-reprise-de-charge-ipn-hea", +w.ml.toFixed(2), src, "Reprise de charge du mur porteur démoli");
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
  const pd = plan.travaux?.percementsDetail ?? {};
  add("mac-ouvrir-un-mur-porteur-petite-porte-fenetre", pd.porteurPetit ?? 0, [], "Percement d'un mur porteur, petite ouverture");
  add("mac-ouvrir-un-mur-porteur-grande-2-5-m-baie", pd.porteurGrand ?? 0, [], "Percement d'un mur porteur, grande ouverture");
  if (pd.leger) ignores.push({ quoi: `${pd.leger} percement(s) en mur léger`, pourquoi: "aucun poste de percement hors mur porteur au catalogue", sources: [] });

  // ── Études (D11 : un forfait se coche, il ne reçoit pas de quantité) ──────
  if (plan.etudes?.structure) add("etu-etude-de-structure", 1, [], "Un mur porteur est démoli : étude de structure obligatoire");

  // ── Doublage (D2 : c'est l'ITI qui porte le doublage) ─────────────────────
  if (plan.doublage?.iti) add("iso-isolation-des-murs-par-l-interieur", +plan.doublage.iti.toFixed(2), [], "Doublage isolé par l'intérieur, mesuré sur le plan");
  if (plan.doublage?.ite) add("fac-isolation-par-l-exterieur-ite", +plan.doublage.ite.toFixed(2), [], "Isolation par l'extérieur, mesurée sur le plan");

  // ── Façade : la maquette nomme déjà le poste du catalogue ────────────────
  for (const [label, m2] of Object.entries(plan.facades?.parPoste ?? {})) {
    const p = posteParNom("Façade", label);
    if (p) add(p.id, +m2.toFixed(2), [], `Façade : ${label.toLowerCase()}`);
    else ignores.push({ quoi: label, pourquoi: "libellé de façade sans poste correspondant", sources: [] });
  }

  // ── Regroupement : un poste, une ligne, toutes ses sources ───────────────
  const parPoste = new Map<string, Contribution>();
  for (const c of brut) {
    const cle = c.poste + (c.variante ? "|" + JSON.stringify(c.variante) : "");
    const v = parPoste.get(cle);
    if (!v) { parPoste.set(cle, { ...c, sources: [...c.sources] }); continue; }
    v.quantite = +(v.quantite + c.quantite).toFixed(2);
    for (const s of c.sources) if (!v.sources.includes(s)) v.sources.push(s);
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
    "mex-volets-roulants", "mex-volets-battants", "dem-abattre-un-mur-porteur", "mac-poutre-de-reprise-de-charge-ipn-hea",
    "dem-abattre-une-cloison", "dem-abattre-un-mur-non-porteur", "clo-monter-une-cloison", "mac-monter-un-mur-en-pierre",
    "mac-monter-un-mur-en-parpaings", "mac-ouvrir-un-mur-porteur-petite-porte-fenetre",
    "mac-ouvrir-un-mur-porteur-grande-2-5-m-baie", "etu-etude-de-structure", "iso-isolation-des-murs-par-l-interieur",
    "fac-isolation-par-l-exterieur-ite", "fac-ravalement-facade-pierre-tout-compris", "fac-nettoyer-la-facade",
    "fac-refaire-les-joints-rejointoiement-pierre-briqu", "fac-enduit-monocouche-machine",
    "fac-enduit-a-la-chaux-maison-ancienne", "fac-peindre-la-facade", "fac-traitement-impermeabilisant", "fac-bardage",
  ]);
  return [...ids];
}
