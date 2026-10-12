/**
 * « Mes plans », chantier C8 : le lien estimation → plan, affiché dans les deux sens côté site.
 *
 *  - fiche projet : la bannière « Vient de ton plan » (et, pour une rénovation dont le plan a changé
 *    depuis le cliché, « Ton plan a changé » avec « Mettre à jour ») ;
 *  - « Mes projets » : la pastille « Depuis ton plan » sur la carte, la bande « Tes plans (n) » et, liste
 *    vide sans plan, le lien « ou commence par dessiner ton plan » ;
 *  - jamais de lien dans un lien ; plan supprimé ou invisible → rien ; interrupteur éteint → AUCUNE
 *    requête `project_plans` (ni `floor_plans`), HTML inchangé.
 *
 * Supabase est SIMULÉ (session de test en mémoire) : aucune base réelle n'est touchée, aucun compte créé.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement, type ReactNode } from "react";
import { prerender } from "react-dom/static";
import { dict } from "@/lib/i18n/dictionaries";
import { dictPlans } from "@/lib/i18n/plans";
import { presetRapide } from "@/lib/estimateur/presets";
import { presetNeuf } from "@/lib/estimateur/presets-neuf";

type Locale = "fr" | "en";
const vide = () => null;

/* ─── Données ─────────────────────────────────────────────────────────────── */

const GRATUIT = { id: "u-gratuit", email: "camille@exemple.fr", user_metadata: { nom: "Camille" }, app_metadata: {} };
const PRO = { id: "u-pro", email: "alex@exemple.fr", user_metadata: { nom: "Alex" }, app_metadata: { plan: "pro" } };
const estPro = (u: unknown) => (u as { app_metadata?: { plan?: string } } | null)?.app_metadata?.plan === "pro";

const reno = presetRapide({ type: "Maison", surface: 100, codePostal: "45000", ampleur: "complete", finition: "standard", qui: "pros" });
const neuf = presetNeuf({ surface: 100, niveaux: "pp", codePostal: "45000", finition: "standard", qui: "pros" });

const ligne = (n: number, nom: string, reponses: Record<string, unknown>, archived = false) => ({
  id: `00000000-0000-4000-8000-00000000000${n}`,
  nom, type_bien: "Maison", surface: 100, code_postal: "45000", reponses, archived,
  created_at: `2026-10-0${n}T09:00:00.000Z`,
});
const PROJETS = {
  reno: ligne(1, "Maison Orléans", { v: "estimateur", mode: "detaille", ctx: reno.ctx, sel: reno.sel, codePostal: "45000", qui: "pros" }),
  neuf: ligne(2, "Maison neuve", { v: "estimateur", mode: "rapide", qui: "pros", ctx: neuf.ctx, sel: neuf.sel, codePostal: "45000",
    R: { surface: 100, niveaux: "pp", codePostal: "45000", finition: "standard", qui: "pros" } }),
  seul: ligne(3, "Sans plan", { v: "estimateur", mode: "rapide", ampleur: "complete", qui: "pros", ctx: reno.ctx, sel: reno.sel, codePostal: "45000" }),
  archive: ligne(4, "Ancienne", { v: "estimateur", mode: "rapide", ampleur: "complete", qui: "pros", ctx: reno.ctx, sel: reno.sel, codePostal: "45000" }, true),
};
type Cle = keyof typeof PROJETS;

const PLAN_A = "bbbbbbbb-bbbb-4bbb-8bbb-000000000001";
const PLAN_B = "bbbbbbbb-bbbb-4bbb-8bbb-000000000002";

type LigneLien = { project_id: string; plan_id: string | null; updated_at: string; plan: { nom: string; updated_at: string } | null };
const lien = (cle: Cle, planId: string | null, nom: string, lienMaj: string, planMaj: string, visible = true): LigneLien => ({
  project_id: PROJETS[cle].id, plan_id: planId, updated_at: lienMaj, plan: planId && visible ? { nom, updated_at: planMaj } : null,
});
const AVANT = "2026-10-10T09:00:00.000Z", APRES = "2026-10-11T09:00:00.000Z";

/* ─── Session Supabase simulée ───────────────────────────────────────────── */

type Appel = { table: string; colonnes: string; filtres: string[] };
const S = { liens: [] as LigneLien[], nbPlans: 0, appels: [] as Appel[], panne: false };

function session() {
  return {
    from(table: string) {
      const a: Appel = { table, colonnes: "", filtres: [] };
      S.appels.push(a);
      const tests: Array<(l: LigneLien) => boolean> = [];
      let tete = false;
      const res = () => {
        if (S.panne) return { data: null, count: null, error: { message: "panne" } };
        if (table === "floor_plans") return { data: tete ? null : [], count: S.nbPlans, error: null };
        if (table === "project_plans") return { data: S.liens.filter((l) => tests.every((t) => t(l))), count: null, error: null };
        return { data: [], count: 0, error: null };
      };
      const q = {
        select(c: string, o?: { head?: boolean }) { a.colonnes = c; tete = !!o?.head; return q; },
        eq(c: string, v: unknown) { a.filtres.push(`${c}=`); tests.push((l) => (l as Record<string, unknown>)[c] === v); return q; },
        in(c: string, vs: unknown[]) { a.filtres.push(`${c} in ${vs.length}`); tests.push((l) => vs.includes((l as Record<string, unknown>)[c])); return q; },
        order() { return q; },
        limit() { return q; },
        maybeSingle() {
          const r = res();
          return Promise.resolve({ data: Array.isArray(r.data) ? (r.data[0] ?? null) : r.data, error: r.error });
        },
        then(ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) { return Promise.resolve(res()).then(ok, ko); },
      };
      return q;
    },
  };
}

/* ─── Chargement ─────────────────────────────────────────────────────────── */

const MOCKS = ["@/lib/features", "@/lib/i18n/server", "@/lib/auth", "@/lib/data/projects", "next/navigation", "server-only", "@/lib/supabase/server"];

async function charger(o: { plans: boolean; locale?: Locale; user?: unknown; projets?: Cle[] }) {
  const locale = o.locale ?? "fr";
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://getavyora.fr");
  vi.doMock("@/lib/features", async (orig) => {
    const m = await orig<typeof import("@/lib/features")>();
    return { ...m, FEATURES: { ...m.FEATURES, neuf: true, plans: o.plans } };
  });
  vi.doMock("@/lib/i18n/server", () => ({ getLocale: async () => locale, getT: async () => ({ locale, t: dict(locale) }) }));
  vi.doMock("@/lib/auth", () => ({ getUser: async () => o.user ?? GRATUIT, estPro, estAdmin: () => false }));
  const lignes = (o.projets ?? []).map((k) => PROJETS[k]);
  vi.doMock("@/lib/data/projects", () => ({
    listProjets: async (archived: boolean) => lignes.filter((p) => p.archived === archived),
    getProjet: async (id: string) => lignes.find((p) => p.id === id) ?? null,
  }));
  vi.doMock("next/navigation", async (orig) => {
    const m = await orig<typeof import("next/navigation")>();
    const routeur = { push: vide, replace: vide, refresh: vide, back: vide, forward: vide, prefetch: vide };
    return { ...m, useRouter: () => routeur, usePathname: () => "/", useSearchParams: () => new URLSearchParams() };
  });
  vi.doMock("server-only", () => ({}));
  vi.doMock("@/lib/supabase/server", () => ({ supabaseServer: async () => session() }));
  const { LangProvider } = await import("@/components/i18n/LangProvider");
  const rendre = async (el: ReactNode) => {
    const { prelude } = await prerender(createElement(LangProvider, { locale, children: el }));
    return await new Response(prelude).text();
  };
  return {
    liste: async () => rendre(await (await import("@/app/projets/page")).default()),
    fiche: async (cle: Cle) =>
      rendre(await (await import("@/app/projets/[id]/page")).default({ params: Promise.resolve({ id: PROJETS[cle].id }) })),
  };
}

/** Profondeur maximale des `<a>` imbriqués dans un HTML (1 : aucun lien dans un lien). */
function profondeurLiens(h: string): number {
  let d = 0, max = 0;
  for (const m of h.matchAll(/<a[\s>]|<\/a>/g)) {
    d += m[0] === "</a>" ? -1 : 1;
    max = Math.max(max, d);
  }
  expect(d).toBe(0);
  return max;
}
const compter = (h: string, s: string) => h.split(s).length - 1;

beforeEach(() => {
  S.liens = [];
  S.nbPlans = 0;
  S.appels = [];
  S.panne = false;
});
afterEach(() => {
  for (const m of MOCKS) vi.doUnmock(m);
  vi.unstubAllEnvs();
});

const tablesPlans = () => S.appels.filter((a) => a.table === "project_plans" || a.table === "floor_plans");

/* ─── Couche de données ──────────────────────────────────────────────────── */

describe("C8 · lib/plans/data : planDuProjet, plansDesProjets, planAChange", () => {
  it("un lien lisible donne le nom et les deux dates ; plan supprimé ou invisible → rien", async () => {
    await charger({ plans: true });
    const { planDuProjet, plansDesProjets } = await import("@/lib/plans/data");
    S.liens = [
      lien("reno", PLAN_A, "Maison A", AVANT, APRES),
      lien("neuf", null, "", AVANT, AVANT),               /* plan supprimé : plan_id à null */
      lien("seul", PLAN_B, "Invisible", AVANT, AVANT, false), /* plan d'un autre compte (RLS) */
    ];
    expect(await planDuProjet(PROJETS.reno.id)).toEqual({
      projectId: PROJETS.reno.id, planId: PLAN_A, nom: "Maison A", planMaj: APRES, lienMaj: AVANT,
    });
    expect(await planDuProjet(PROJETS.neuf.id)).toBeNull();
    expect(await planDuProjet(PROJETS.seul.id)).toBeNull();
    expect(await planDuProjet(PROJETS.archive.id)).toBeNull();
    const m = await plansDesProjets(Object.values(PROJETS).map((p) => p.id));
    expect([...m.keys()]).toEqual([PROJETS.reno.id]);
    /* Une seule requête, sur project_plans, avec la jointure du plan. */
    const liste = S.appels.slice(-1);
    expect(liste).toHaveLength(1);
    expect(liste[0].table).toBe("project_plans");
    expect(liste[0].colonnes).toContain("floor_plans(nom, updated_at)");
  });

  it("aucun projet → aucune requête ; 250 projets → 3 tranches de 100 au plus", async () => {
    await charger({ plans: true });
    const { plansDesProjets } = await import("@/lib/plans/data");
    expect((await plansDesProjets([])).size).toBe(0);
    expect(S.appels).toHaveLength(0);
    const ids = Array.from({ length: 250 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`);
    await plansDesProjets([...ids, ...ids]);
    expect(S.appels.map((a) => a.filtres[0])).toEqual(["project_id in 100", "project_id in 100", "project_id in 50"]);
  });

  it("une panne de la base lève ErreurPlans (la page, elle, l'absorbe)", async () => {
    await charger({ plans: true });
    const { planDuProjet, plansDesProjets, ErreurPlans } = await import("@/lib/plans/data");
    S.panne = true;
    await expect(planDuProjet(PROJETS.reno.id)).rejects.toBeInstanceOf(ErreurPlans);
    await expect(plansDesProjets([PROJETS.reno.id])).rejects.toBeInstanceOf(ErreurPlans);
  });

  it("planAChange : seulement si le plan est plus récent que le lien", async () => {
    const { planAChange } = await import("@/lib/plans/data");
    expect(planAChange({ planMaj: APRES, lienMaj: AVANT })).toBe(true);
    expect(planAChange({ planMaj: AVANT, lienMaj: AVANT })).toBe(false);
    expect(planAChange({ planMaj: AVANT, lienMaj: APRES })).toBe(false);
    expect(planAChange({ planMaj: "pas une date", lienMaj: AVANT })).toBe(false);
  });
});

/* ─── Interrupteur éteint ────────────────────────────────────────────────── */

describe("C8 · interrupteur éteint : aucune requête plans, HTML inchangé", () => {
  it("fiche et liste ne lisent ni project_plans ni floor_plans, même avec des liens en base", async () => {
    S.liens = [lien("reno", PLAN_A, "Maison A", AVANT, APRES)];
    S.nbPlans = 3;
    const r = await charger({ plans: false, projets: ["reno", "neuf", "seul", "archive"] });
    const liste = await r.liste();
    const fiche = await r.fiche("reno");
    expect(tablesPlans()).toEqual([]);
    for (const h of [liste, fiche]) {
      expect(h).not.toContain("data-plan-relie");
      expect(h).not.toContain("data-depuis-plan");
      expect(h).not.toContain("data-bande-plans");
      expect(h).not.toContain("data-dessiner-plan");
      expect(h).not.toContain("/plan?id=");
    }
  });

  it("allumé sans lien ni plan : fiche identique, liste pleine identique", async () => {
    for (const locale of ["fr", "en"] as const) {
      for (const user of [GRATUIT, PRO]) {
        const rendus: string[][] = [];
        for (const plans of [false, true]) {
          const r = await charger({ plans, locale, user, projets: ["reno", "neuf", "seul", "archive"] });
          rendus.push([await r.liste(), await r.fiche("reno"), await r.fiche("neuf")]);
        }
        expect(rendus[1]).toEqual(rendus[0]);
      }
    }
  });

  it("allumé, plan supprimé ou invisible : identique à éteint", async () => {
    const rendus: string[][] = [];
    for (const plans of [false, true]) {
      S.liens = [lien("reno", null, "", AVANT, APRES), lien("neuf", PLAN_B, "Autre compte", AVANT, APRES, false)];
      const r = await charger({ plans, projets: ["reno", "neuf"] });
      rendus.push([await r.liste(), await r.fiche("reno"), await r.fiche("neuf")]);
    }
    expect(rendus[1]).toEqual(rendus[0]);
  });
});

/* ─── Fiche projet ───────────────────────────────────────────────────────── */

describe("C8 · fiche projet : « Vient de ton plan »", () => {
  it("bannière et lien vers l'éditeur ; une seule requête, sur project_plans", async () => {
    S.liens = [lien("neuf", PLAN_A, "Maison 94 m²", AVANT, AVANT)];
    const r = await charger({ plans: true, projets: ["neuf"] });
    const h = await r.fiche("neuf");
    expect(compter(h, "data-plan-relie")).toBe(1);
    expect(h).toContain(dictPlans("fr").lien.vientDe);
    expect(h).toContain("« Maison 94 m² »");
    expect(h).toContain(`href="/plan?id=${PLAN_A}"`);
    expect(h).not.toContain("data-plan-change");
    expect(profondeurLiens(h)).toBe(1);
    expect(tablesPlans().map((a) => a.table)).toEqual(["project_plans"]);
  });

  it("le nom du plan est échappé", async () => {
    S.liens = [lien("neuf", PLAN_A, `<img src=x onerror="alert(1)">`, AVANT, AVANT)];
    const r = await charger({ plans: true, projets: ["neuf"] });
    const h = await r.fiche("neuf");
    expect(h).not.toContain("<img src=x");
    expect(h).toContain("&lt;img src=x");
  });

  it("rénovation dont le plan a changé : « Mettre à jour » rouvre l'éditeur (Pro), qui seul renvoie le contrat du dessin", async () => {
    S.liens = [lien("reno", PLAN_A, "Maison A", AVANT, APRES)];
    const r = await charger({ plans: true, user: PRO, projets: ["reno"] });
    const h = await r.fiche("reno");
    expect(compter(h, "data-plan-change")).toBe(1);
    expect(h).toContain(dictPlans("fr").lien.aChange);
    const bloc = h.slice(h.indexOf("data-plan-change"));
    /* Le lien porte l'estimation de CETTE fiche : l'éditeur la recopie vers depuis-plan (?projet=). */
    expect(bloc).toContain(`href="/plan?id=${PLAN_A}&amp;projet=${PROJETS.reno.id}"`);
    /* Jamais tout droit vers la validation : elle relirait le contrat d'AVANT le changement du dessin. */
    expect(h).not.toContain("/projets/depuis-plan/");
    expect(h).not.toContain("/tarifs");
    expect(profondeurLiens(h)).toBe(1);
  });

  it("deux rénovations reliées au même plan : chaque fiche vise SA propre estimation (?projet=)", async () => {
    /* A (la plus ancienne) et B, nées du même plan : sans ?projet=, la validation prendrait la plus récente. */
    S.liens = [lien("reno", PLAN_A, "Maison A", AVANT, APRES), lien("seul", PLAN_A, "Maison A", AVANT, APRES)];
    const r = await charger({ plans: true, user: PRO, projets: ["reno", "seul"] });
    for (const [cle, autre] of [["reno", "seul"], ["seul", "reno"]] as const) {
      const h = await r.fiche(cle);
      const bloc = h.slice(h.indexOf("data-plan-change"));
      expect(bloc).toContain(`href="/plan?id=${PLAN_A}&amp;projet=${PROJETS[cle].id}"`);
      expect(h).not.toContain(PROJETS[autre].id);
    }
  });

  it("rénovation, gratuit : « Mettre à jour » mène à Tarifs, avec la pastille Pro", async () => {
    S.liens = [lien("reno", PLAN_A, "Maison A", AVANT, APRES)];
    const r = await charger({ plans: true, user: GRATUIT, projets: ["reno"] });
    const h = await r.fiche("reno");
    const bloc = h.slice(h.indexOf("data-plan-change"));
    expect(bloc).toContain('href="/tarifs?source=editeur-plan"');
    expect(bloc).toContain(`>${dictPlans("fr").lien.pro}</span>`);
    expect(h).not.toContain("/projets/depuis-plan/");
  });

  it("rénovation à jour, ou construction dont le plan a changé : pas de « Ton plan a changé »", async () => {
    S.liens = [lien("reno", PLAN_A, "Maison A", APRES, AVANT), lien("neuf", PLAN_B, "Maison B", AVANT, APRES)];
    const r = await charger({ plans: true, user: PRO, projets: ["reno", "neuf"] });
    for (const cle of ["reno", "neuf"] as const) {
      const h = await r.fiche(cle);
      expect(h).toContain("data-plan-relie");
      expect(h).not.toContain("data-plan-change");
    }
  });

  it("panne de project_plans : la fiche s'affiche, sans bannière", async () => {
    S.panne = true;
    const r = await charger({ plans: true, projets: ["reno"] });
    const h = await r.fiche("reno");
    expect(h).toContain(PROJETS.reno.nom);
    expect(h).not.toContain("data-plan-relie");
  });

  it("en anglais", async () => {
    S.liens = [lien("reno", PLAN_A, "Maison A", AVANT, APRES)];
    const r = await charger({ plans: true, locale: "en", user: PRO, projets: ["reno"] });
    const h = await r.fiche("reno");
    const t = dictPlans("en").lien;
    for (const s of [t.vientDe, t.ouvrirPlan, t.aChange, t.mettreAJour]) expect(h).toContain(s);
    expect(h).toContain("“Maison A”");
    expect(h).not.toContain(dictPlans("fr").lien.vientDe);
  });
});

/* ─── « Mes projets » ────────────────────────────────────────────────────── */

describe("C8 · « Mes projets » : pastille, bande « Tes plans (n) », lien de la liste vide", () => {
  it("pastille seulement sur les projets reliés (actifs et archivés), sans lien imbriqué", async () => {
    S.liens = [
      lien("reno", PLAN_A, "Maison A", AVANT, APRES),
      lien("archive", PLAN_B, "Maison B", AVANT, AVANT),
      lien("seul", null, "", AVANT, AVANT),
    ];
    S.nbPlans = 2;
    const r = await charger({ plans: true, projets: ["reno", "neuf", "seul", "archive"] });
    const h = await r.liste();
    expect(compter(h, "data-depuis-plan")).toBe(2);
    expect(h).toContain(`title="Maison A" data-depuis-plan="">${dictPlans("fr").lien.pastille}</span>`);
    expect(h).toContain(`title="Maison B" data-depuis-plan=""`);
    /* La pastille vit DANS la carte du projet relié (le lien /projets/{id}), pas dans une autre. */
    const carte = (id: string) => {
      const i = h.indexOf(`href="/projets/${id}"`);
      return h.slice(h.lastIndexOf("<a", i), h.indexOf("</a>", i));
    };
    expect(carte(PROJETS.reno.id)).toContain("data-depuis-plan");
    expect(carte(PROJETS.neuf.id)).not.toContain("data-depuis-plan");
    expect(carte(PROJETS.seul.id)).not.toContain("data-depuis-plan");
    expect(profondeurLiens(h)).toBe(1);
  });

  it("la bande « Tes plans (n) » vers la vitrine, une fois, seulement avec au moins un plan", async () => {
    S.nbPlans = 3;
    const r = await charger({ plans: true, projets: ["seul"] });
    const h = await r.liste();
    expect(compter(h, "data-bande-plans")).toBe(1);
    expect(h).toMatch(/data-bande-plans="" data-clic-plan="projets" href="\/logiciel-plan-maison"/);
    expect(h).toContain(`${dictPlans("fr").lien.bande}<!-- --> <span class="num font-normal text-faint">(<!-- -->3<!-- -->)</span>`);
    expect(h).not.toContain("data-dessiner-plan");
    expect(profondeurLiens(h)).toBe(1);
    /* Une requête de chaque : les liens (project_plans) et le nombre de plans (floor_plans). */
    expect(tablesPlans().map((a) => a.table).sort()).toEqual(["floor_plans", "project_plans"]);

    S.nbPlans = 0;
    const r0 = await charger({ plans: true, projets: ["seul"] });
    expect(await r0.liste()).not.toContain("data-bande-plans");
  });

  it("liste vide : sans plan, le lien « ou commence par dessiner ton plan » ; avec un plan, la bande à la place", async () => {
    const r = await charger({ plans: true, projets: [] });
    const h = await r.liste();
    expect(compter(h, "data-dessiner-plan")).toBe(1);
    expect(h).toContain(dictPlans("fr").lien.dessiner);
    /* Aucun projet : aucune requête project_plans, seulement le nombre de plans. */
    expect(tablesPlans().map((a) => a.table)).toEqual(["floor_plans"]);

    S.nbPlans = 1;
    const r1 = await charger({ plans: true, projets: [] });
    const h1 = await r1.liste();
    expect(h1).not.toContain("data-dessiner-plan");
    expect(compter(h1, "data-bande-plans")).toBe(1);
  });

  it("panne de la base : la liste (non vide) s'affiche exactement comme interrupteur éteint", async () => {
    const rendus: string[] = [];
    for (const plans of [false, true]) {
      S.panne = plans;
      const r = await charger({ plans, projets: ["reno", "seul"] });
      rendus.push(await r.liste());
    }
    expect(rendus[1]).toBe(rendus[0]);
  });

  it("en anglais", async () => {
    S.liens = [lien("reno", PLAN_A, "Maison A", AVANT, APRES)];
    S.nbPlans = 1;
    const r = await charger({ plans: true, locale: "en", projets: ["reno"] });
    const h = await r.liste();
    const t = dictPlans("en").lien;
    expect(h).toContain(t.pastille);
    expect(h).toContain(t.bande);
    expect(h).toContain(t.bandeSous);
    expect(h).not.toContain(dictPlans("fr").lien.pastille);
  });
});

/* ─── Éditeur : ?projet= recopié vers l'écran de validation ─────────────── */

describe("C8 · éditeur : siteProjetVise recopie ?projet= vers /projets/depuis-plan/", () => {
  /* La fonction de la source, telle quelle, avec SITE_UUID et un location simulé. */
  const src = readFileSync(path.join(__dirname, "..", "maquettes", "plan-editor.html"), "utf8");
  const uuid = src.match(/const SITE_UUID=\/[^\n]*?\/i;/);
  const fn = src.match(/function siteProjetVise\(id\)\{[\s\S]*?\n {2}return '\?projet='\+encodeURIComponent\(p\.toLowerCase\(\)\);\}/);
  const vise = (search: string, id: string) =>
    (new Function("location", `${uuid![0]} ${fn![0]} return siteProjetVise;`)({ search }) as (i: string) => string)(id);
  const A = "00000000-0000-4000-8000-00000000000a";

  it("le plan de l'URL et un identifiant valide : ?projet= suit", () => {
    expect(uuid).not.toBeNull();
    expect(fn).not.toBeNull();
    expect(vise(`?id=${PLAN_A}&projet=${A}`, PLAN_A)).toBe(`?projet=${A}`);
    expect(vise(`?id=${PLAN_A.toUpperCase()}&projet=${A.toUpperCase()}`, PLAN_A)).toBe(`?projet=${A}`);
  });

  it("autre plan ouvert, identifiant invalide ou absent : rien", () => {
    expect(vise(`?id=${PLAN_B}&projet=${A}`, PLAN_A)).toBe("");
    expect(vise(`?id=${PLAN_A}&projet=x%27%3E`, PLAN_A)).toBe("");
    expect(vise(`?id=${PLAN_A}`, PLAN_A)).toBe("");
    expect(vise("", PLAN_A)).toBe("");
  });

  it("siteEstimerDetail l'ajoute à l'adresse de validation", () => {
    expect(src).toContain("location.assign('/projets/depuis-plan/'+encodeURIComponent(id)+siteProjetVise(id));");
  });
});
