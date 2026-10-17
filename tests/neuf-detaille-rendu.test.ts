/**
 * Détaillé neuf désencombré (chantier N3 de la revue rénovation / neuf) : le rendu d'ouverture.
 *
 * Avant N3 : 9 phases ouvertes + 9 jalons + 37 blocs = 55 lignes, chaque question sans objet
 * grisée, et « Qui réalise » dans le questionnaire, qui réécrivait toutes les lignes cochées.
 * Après : 9 titres de phase fermés, aucun bloc ni jalon ; les questions sans objet masquées ; au-dessus
 * des lots, « Nouveaux postes cochés : Fait faire / Je le fais » et « Tout passer en… ».
 * Rendu serveur (`renderToStaticMarkup`) : l'état initial, avant toute reprise de brouillon.
 */
import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LangProvider } from "@/components/i18n/LangProvider";
import EstimateurNeuf from "@/components/neuf/EstimateurNeuf";
import { QUESTIONS_NEUF } from "@/lib/estimateur/questions-neuf";
import { etatParDefaut } from "@/lib/estimateur/detaille-neuf";
import { dictNeuf } from "@/lib/i18n/neuf";
import { PHASES_NEUF } from "@/lib/estimateur";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {}, back: () => {}, forward: () => {}, prefetch: () => {} }) }));

/** Le HTML rendu, sans la feuille de style en ligne (elle nomme toutes les classes). */
const rendre = (locale: "fr" | "en") =>
  renderToStaticMarkup(createElement(LangProvider, { locale, children: createElement(EstimateurNeuf) })).replace(/<style[^>]*>[\s\S]*?<\/style>/g, "");
const compte = (html: string, motif: RegExp) => (html.match(motif) ?? []).length;
const echapper = (s: string) => s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

describe("N3 · détaillé neuf à l'ouverture", () => {
  for (const locale of ["fr", "en"] as const) {
    const html = rendre(locale);
    const d = dictNeuf(locale).detail;

    it(`${locale} : 9 titres de phase fermés, 0 bloc, 0 jalon`, () => {
      expect(PHASES_NEUF).toHaveLength(9);
      expect(compte(html, /class="phase-t(?: open)?"/g)).toBe(9);
      expect(compte(html, /class="phase-t" aria-expanded="false"/g)).toBe(9);
      expect(html).not.toMatch(/class="acc(?: open)?"/);
      expect(html).not.toContain('class="acc-h"');
      expect(html).not.toContain('class="pjal"');
      expect(html).not.toContain('class="pvide"');
    });

    it(`${locale} : questions sans objet masquées, « Qui réalise » sorti du questionnaire`, () => {
      const maison = etatParDefaut().maison;
      const toutes = QUESTIONS_NEUF.flatMap((g) => g.qs);
      const visibles = toutes.filter((q) => !q.si || q.si(maison));
      expect(maison.niveaux).toBe("pp");
      expect(visibles.length).toBe(toutes.length - 1);         // l'escalier, sans objet en plain-pied
      /* N9 : les choix techniques sont repliés à l'ouverture (une ligne de résumé) ; hors d'eux, chaque
         question visible est posée une fois : un groupe de choix, un champ, un compteur ou l'interrupteur. */
      const posees = visibles.filter((q) => q.section !== "technique");
      const groupes = posees.filter((q) => q.o && q.vue !== "interrupteur");
      for (const q of groupes) expect(compte(html, new RegExp(`role="group" aria-label="${echapper(q.l[locale])}"`, "g")), q.k).toBe(1);
      expect(compte(html, /class="stp"/g)).toBe(posees.filter((q) => q.vue === "compteur").length);
      expect(compte(html, /class="drtoggle( on)?"/g)).toBe(1);
      expect(html).not.toContain(echapper(toutes.find((q) => q.k === "escalier")!.l[locale]));
      expect(html).not.toMatch(/sans objet ici|not applicable here/);
      expect(html).not.toMatch(/Qui réalise|Who builds|J&#x27;en fais une partie|I do some of it/);
      expect(html).not.toMatch(/<button[^>]*disabled=""[^>]*class="pill"|class="pill"[^>]*disabled=""/);
    });

    it(`${locale} : ligne « Nouveaux postes cochés » (Fait faire pressé) et « Tout passer en… » replié`, () => {
      expect(html).toContain(echapper(d.nouveauxL));
      expect(html).toContain(`<button type="button" aria-pressed="true">${echapper(d.faitFaire)}</button>`);
      expect(html).toContain(`<button type="button" aria-pressed="false">${echapper(d.jeLeFais)}</button>`);
      expect(html).toContain(`aria-expanded="false" aria-controls="nv-passer">${echapper(d.toutPasser)}</button>`);
      expect(html).toContain(echapper(d.nouveauxAide.pros));
      expect(html).not.toContain('class="nv-conf"');
    });
  }

  it("FR et EN : mêmes textes d'aide pour les trois modes, et la confirmation compte les lignes", () => {
    for (const l of ["fr", "en"] as const) {
      const d = dictNeuf(l).detail;
      expect(Object.keys(d.nouveauxAide).sort()).toEqual(["max", "partie", "pros"]);
      expect(d.toutPasserConfirme(true, 3)).toContain("3");
      expect(d.toutPasserConfirme(false, 0)).not.toMatch(/\d/);
    }
    expect(dictNeuf("fr").detail.toutPasserConfirme(false, 1)).toContain("1 ligne change :");
    expect(dictNeuf("en").detail.toutPasserConfirme(false, 2)).toContain("2 lines change:");
  });

  it("chaque bloc porte l'icône de son lot, comme en rénovation", () => {
    const src = fs.readFileSync("components/neuf/EstimateurNeuf.tsx", "utf8");
    // N6 : l'en-tête de lot est la brique partagée avec la rénovation (`EnteteLot`), qui reçoit l'icône.
    expect(src).toContain('icone: ICON[l.c] || "•"');
    expect(fs.readFileSync("components/estimateur/ListeLots.tsx", "utf8")).toContain('<span className="ic" aria-hidden="true">{icone}</span>');
    expect(fs.readFileSync("components/Estimateur.tsx", "utf8")).toContain('icone: ICON[l.c] || "•"');
    // Le réglage « nouveaux postes » ne réécrit rien ; seule l'action confirmée appelle `changerQuiNeuf`.
    expect(src).not.toMatch(/changerQuiNeuf|"\$qui"/);
    expect(src).toContain("toutPasserNeuf(e, cible)");
  });
});
