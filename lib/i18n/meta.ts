import type { Metadata } from "next";
import type { Locale } from "./config";
import { og } from "@/lib/seo-og";

/**
 * Titre d'onglet et aperçu de partage des pages produit dans la langue du visiteur (revue anglais, constats
 * 55 et 122 : en anglais, la page l'était mais l'onglet, la description et `og:locale` restaient français).
 *
 * La langue suit le cookie av-lang (proxy.ts → `x-av-locale`) : les robots, qui n'envoient pas de cookie,
 * reçoivent TOUJOURS la version française, au caractère près. Le SEO ne bouge donc pas : en français, la
 * fonction rend l'objet reçu tel quel. En anglais : titre, description, Open Graph (`og:locale` en_US) et
 * carte X traduits ; le canonical (français), `robots` et les images sont repris de la version française.
 * Sans description anglaise propre, celle du site en anglais : jamais celle du layout, en français.
 */
export type MetaAnglaise = {
  /** Le titre, sans « · AVYORA » : le gabarit du layout l'ajoute (sauf `absolu`). */
  title: string;
  /** Titre complet, hors gabarit (l'accueil, dont le titre est déjà « AVYORA — … »). */
  absolu?: boolean;
  description?: string;
  /** Le chemin de la page : avec lui, un Open Graph et une carte X en anglais (sinon, ceux du français). */
  path?: string;
};

export function metaSelonLangue(locale: Locale, fr: Metadata, en: MetaAnglaise): Metadata {
  if (locale !== "en") return fr;
  const meta: Metadata = { ...fr, title: en.absolu ? { absolute: en.title } : en.title };
  meta.description = en.description ?? META_EN.accueil.description;
  if (en.path && en.description) {
    // Un `openGraph` de page REMPLACE celui du layout (lib/seo-og.ts) : complet, ou repris du français.
    const base = fr.openGraph ?? og({ title: en.title, description: en.description, path: en.path, type: "website" });
    meta.openGraph = { ...base, title: en.title, description: en.description, locale: "en_US" };
    meta.twitter = { card: "summary_large_image", ...(fr.twitter ?? {}), title: en.title, description: en.description };
  }
  return meta;
}

/**
 * Les textes anglais des pages produit (longueurs : titre ≤ 51 caractères, description ≤ 155, comme en
 * français). Aucun prix ni promesse qui ne soit déjà dans la version française.
 */
export const META_EN = {
  accueil: {
    title: "AVYORA — estimate your renovation before you sign",
    absolu: true,
    description:
      "Estimate your renovation costs at French market prices: 200 priced items, 18 trades, prices adjusted to your region — before you sign.",
    path: "/",
  },
  tarifs: {
    title: "Go Pro — detailed item-by-item estimate",
    description:
      "Unlock AVYORA's detailed estimator: 200 priced items, adjustable quantities, PDF report and saved projects. From €18.85/month, no commitment.",
    path: "/tarifs",
  },
  estimationTravaux: {
    title: "Free renovation estimate — your budget in 2 minutes",
    description:
      "Work out your renovation budget for free: 4 questions, a price range adjusted to your ZIP code. No sign-up.",
    path: "/estimation-travaux",
  },
  nouveauReno: {
    title: "Estimate your renovation — free, no sign-up",
    description:
      "Choose how to estimate: quick and free in 4 questions, or detailed item by item. French market prices adjusted to your region.",
    path: "/projets/nouveau",
  },
  nouveauNeuf: {
    title: "Estimate the cost of building your new house",
    description:
      "Choose how to estimate: quick and free in 4 questions, or detailed trade by trade, from permit to handover. Prices adjusted to your region.",
    path: "/projets/nouveau",
  },
  nouveauNature: {
    title: "Estimate your renovation or new house — free",
    description:
      "Renovating a home or building a new house: estimate your project for free, quick or item by item. Prices adjusted to your region.",
    path: "/projets/nouveau",
  },
  construction: {
    title: "Free new house construction estimate",
    description:
      "Estimate the cost of building your new house in 4 questions: a full budget, from building permit to handover, adjusted to your ZIP code. Free.",
    path: "/estimation-construction-maison",
  },
  logicielPlan: {
    title: "Free house floor plan software, in 2D and 3D",
    description:
      "Draw your house floor plan online for free: walls, rooms and calculated areas, doors and windows, 3D view in one click. Nothing to install.",
    path: "/logiciel-plan-maison",
  },
  /**
   * Les pages produit sans titre propre (mes projets, une fiche, le détaillé…) : en français, le titre et la
   * description du layout ; en anglais, les mêmes, traduits (le layout, lui, ne suit pas la langue).
   */
  defaut: {
    title: "AVYORA — estimate your renovation before you sign",
    absolu: true,
  },
  /** Pages d'accès (noindex) : elles héritaient de la description française du layout. */
  connexion: {
    description: "Sign in to AVYORA: find your projects, your estimates and your floor plans.",
    path: "/connexion",
  },
  inscription: {
    description: "Create your AVYORA account: save your estimates and track your renovation projects over time.",
    path: "/inscription",
  },
} satisfies Record<string, Partial<MetaAnglaise>>;
