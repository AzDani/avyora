/**
 * A7, vérification : la barre live du détaillé neuf, mesurée dans Chrome (et plus seulement ses règles CSS).
 *
 * Le contrôle d'A7 a trouvé le total effacé de la barre en anglais sous 335 px (et avec un texte agrandi à
 * 130 %) : la ligne du total était coupée à 22 px et le montant, renvoyé à la ligne, passait dessous. Ici,
 * la barre rendue par le serveur (le vrai balisage du neuf, ses vraies feuilles de style) est posée seule
 * dans une page, avec un gros total, puis mesurée de 280 à 560 px, texte à 100 % et à 130 %
 * (text-size-adjust, le réglage de taille du texte d'Android) :
 *  - le libellé et le montant sont toujours entiers dans la barre ;
 *  - le prix au m² est entier ou masqué, jamais coupé à moitié, et il se montre quand la place le permet ;
 *  - à 100 % et dès 360 px, la ligne du total tient sur une ligne (la hauteur de la rénovation).
 * Polices du système (pas de Geist hors du site) : les largeurs changent, pas les règles. Sans Chrome (variable
 * CHROME pour un autre chemin), la suite est sautée.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import puppeteer, { type Browser } from "puppeteer-core";
import { LangProvider } from "@/components/i18n/LangProvider";
import EstimateurNeuf from "@/components/neuf/EstimateurNeuf";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {}, back: () => {}, forward: () => {}, prefetch: () => {} }) }));

const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const LARGEURS = [280, 300, 320, 335, 360, 375, 414, 480, 560];
const TOTAUX = [246762, 884127];

/** La page : le rendu serveur entier (ses <style> compris), dont on ne garde que les feuilles et la barre. */
const page = (locale: "fr" | "en") => `<!doctype html><html lang="${locale}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>:root{--font-geist-sans:system-ui,sans-serif;--font-geist-mono:ui-monospace,monospace}body{margin:0;padding:16px;font-family:var(--font-geist-sans)}</style>
</head><body>${renderToStaticMarkup(createElement(LangProvider, { locale, children: createElement(EstimateurNeuf) }))}</body></html>`;

interface Mesure { big: boolean; lbl: boolean; m2: "vu" | "masqué" | "coupé"; ligneUnique: boolean }

describe.skipIf(!fs.existsSync(CHROME))("A7 · barre live du neuf mesurée au navigateur (mobile)", () => {
  let navigateur: Browser;
  beforeAll(async () => { navigateur = await puppeteer.launch({ executablePath: CHROME, headless: true }); }, 60000);
  afterAll(async () => { await navigateur?.close(); });

  for (const locale of ["fr", "en"] as const) {
    it(`${locale} : total entier, prix au m² entier ou masqué, de 280 à 560 px, texte à 100 % et 130 %`, async () => {
      const p = await navigateur.newPage();
      await p.setRequestInterception(true);
      p.on("request", (r) => (r.url().startsWith("data:") || r.url() === "about:blank" ? r.continue() : r.abort()));
      await p.setViewport({ width: 375, height: 700, isMobile: true, hasTouch: true });
      await p.setContent(page(locale));
      await p.evaluate(() => {
        const barre = document.querySelector(".av-estim-live")!;
        document.body.replaceChildren(...document.querySelectorAll("style"), barre);
      });
      const ecarts: string[] = [];
      let m2Vu = false;
      for (const total of TOTAUX) for (const f of [1, 1.3]) for (const w of LARGEURS) {
        await p.setViewport({ width: w, height: 700, isMobile: true, hasTouch: true });
        const m: Mesure = await p.evaluate((total, f) => {
          document.querySelector(".av-estim-live .big span")!.textContent = total.toLocaleString("fr-FR");
          const s = document.documentElement.style;
          s.setProperty("-webkit-text-size-adjust", f * 100 + "%");
          s.setProperty("text-size-adjust", f * 100 + "%");
          const R = (sel: string) => document.querySelector(".av-estim-live " + sel)!.getBoundingClientRect();
          const live = R(".live-in"), cs = getComputedStyle(document.querySelector(".av-estim-live .live-in")!);
          const boite = { top: live.top + parseFloat(cs.paddingTop), bottom: live.bottom - parseFloat(cs.paddingBottom), left: live.left + parseFloat(cs.paddingLeft), right: live.right - parseFloat(cs.paddingRight) };
          const dans = (a: DOMRect, c: { top: number; bottom: number; left: number; right: number }) =>
            a.top >= c.top - 0.5 && a.bottom <= c.bottom + 0.5 && a.left >= c.left - 0.5 && a.right <= c.right + 0.5;
          const totb = R(".totb"), big = R(".big"), zone = R(".m2"), v = R(".m2-v");
          return {
            big: dans(big, boite) && dans(big, totb), lbl: dans(R(".lbl"), boite) && dans(R(".lbl"), totb),
            m2: zone.width >= 1 && dans(v, zone) ? "vu" : v.top >= zone.bottom - 0.5 || zone.width < 1 ? "masqué" : "coupé",
            ligneUnique: totb.height < big.height * 1.5,
          } as const;
        }, total, f);
        const cas = `${total} · ${w} px · texte ${f * 100} %`;
        if (!m.big) ecarts.push(`${cas} : montant coupé`);
        if (!m.lbl) ecarts.push(`${cas} : libellé coupé`);
        if (m.m2 === "coupé") ecarts.push(`${cas} : prix au m² coupé à moitié`);
        if (f === 1 && w >= 360 && !m.ligneUnique) ecarts.push(`${cas} : la ligne du total passe sur deux lignes`);
        if (f === 1 && w === 560) m2Vu ||= m.m2 === "vu";
      }
      expect(ecarts).toEqual([]);
      // le prix au m² se montre quand la place le permet (560 px, texte à 100 %)
      expect(m2Vu).toBe(true);
      await p.close();
    }, 60000);
  }
});
