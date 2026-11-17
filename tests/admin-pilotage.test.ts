/**
 * Refonte de l'admin (17/11/2026) : les outils purs du tableau de bord, la lecture des demandes d'accompagnement,
 * « Marquer traitée » (réservé admin, seules les demandes peuvent être touchées), et le menu.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
vi.mock("server-only", () => ({}));
import { depuis, parSemaine, lienAppel, lienWhatsApp, lireDemande, dateCourte } from "@/lib/admin/outils";

const lire = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8");

describe("outils du tableau de bord", () => {
  const maintenant = new Date("2026-11-18T10:00:00Z"); // un mercredi

  it("depuis : compte les dates des N derniers jours, ignore les dates illisibles", () => {
    const d = ["2026-11-17T10:00:00Z", "2026-11-12T10:00:00Z", "2026-10-01T10:00:00Z", "pas une date"];
    expect(depuis(d, 7, maintenant)).toBe(2);
    expect(depuis(d, 60, maintenant)).toBe(3);
  });

  it("parSemaine : semaines du lundi à l'heure de Paris, la semaine en cours en dernier, rien hors fenêtre", () => {
    const s = parSemaine([
      "2026-11-16T00:00:00Z", // lundi 01:00 à Paris
      "2026-11-18T09:00:00Z",
      "2026-11-15T23:30:00Z", // lundi 00:30 à Paris : déjà la semaine en cours
      "2026-11-15T22:30:00Z", // dimanche 23:30 à Paris : la semaine d'avant
      "2026-11-09T08:00:00Z",
      "2026-01-01T00:00:00Z",
    ], 3, maintenant);
    expect(s).toEqual([
      { debut: "2026-11-02", n: 0 },
      { debut: "2026-11-09", n: 2 },
      { debut: "2026-11-16", n: 3 },
    ]);
    // Lundi 00:30 à Paris (dimanche 23:30 UTC) : la nouvelle semaine a commencé.
    expect(parSemaine([], 2, new Date("2026-11-15T23:30:00Z")).at(-1)!.debut).toBe("2026-11-16");
  });

  it("lienAppel et lienWhatsApp : WhatsApp seulement pour un portable, message encodé", () => {
    expect(lienAppel("06 12 34 56 78")).toBe("tel:0612345678");
    expect(lienAppel("+33 6 12 34 56 78")).toBe("tel:+33612345678");
    expect(lienAppel("")).toBeNull();
    expect(lienWhatsApp("06 12 34 56 78")).toBe("https://wa.me/33612345678");
    expect(lienWhatsApp("+33 6 12 34 56 78", "Bonjour Léa & co")).toBe("https://wa.me/33612345678?text=Bonjour%20L%C3%A9a%20%26%20co");
    expect(lienWhatsApp("01 45 22 33 44")).toBeNull(); // un fixe
    expect(lienWhatsApp(null)).toBeNull();
  });

  it("dateCourte : à l'heure de Paris", () => {
    expect(dateCourte("2026-11-17T13:32:00Z")).toBe("17/11 à 14:32");
    expect(dateCourte("n'importe quoi")).toBe("—");
  });
});

describe("lireDemande (journal → carte)", () => {
  it("libellés lisibles, e-mail parti ou non, état traité", () => {
    const d = lireDemande({
      id: "x", created_at: "2026-11-17T10:00:00Z",
      payload: { email: "lea@exemple.fr", prenom: "Léa", telephone: "06 12 34 56 78", type_projet: "renovation", besoins: ["devis", "suivi"], src: "accueil", langue: "fr", envoi_interne: "envoye" },
    });
    expect(d).toMatchObject({ prenom: "Léa", email: "lea@exemple.fr", typeProjet: "Rénovation", besoins: ["Relecture de mes devis", "Suivi de chantier chaque semaine"], emailRecu: true, traiteeLe: null, message: null });
    const e = lireDemande({ id: "y", created_at: "2026-11-17T10:00:00Z", payload: { prenom: "Tom", type_projet: "inconnu", envoi_interne: "erreur", message: "Aidez-moi", traitee_le: "2026-11-18T08:00:00Z" } });
    expect(e).toMatchObject({ emailRecu: false, message: "Aidez-moi", typeProjet: "inconnu", traiteeLe: "2026-11-18T08:00:00Z", telephone: null });
  });
  it("payload vide ou abîmé : pas de plantage", () => {
    expect(lireDemande({ id: "z", created_at: "2026-11-17T10:00:00Z", payload: null })).toMatchObject({ prenom: "Sans prénom", besoins: [], typeProjet: "Non précisé" });
  });
});

describe("marquerDemandeTraitee", () => {
  const ID = "6f1c2a7e-1b2c-4d3e-8f90-1a2b3c4d5e6f";
  afterEach(() => { vi.resetModules(); vi.doUnmock("@/lib/auth"); vi.doUnmock("@/lib/supabase/admin"); vi.doUnmock("@/lib/audit"); vi.doUnmock("next/cache"); });

  async function charger(estAdmin: boolean, ligne: { payload: unknown } | null = { payload: { prenom: "Léa", envoi_interne: "envoye" } }) {
    const ecrit: { payload: Record<string, unknown>; filtres: [string, unknown][] }[] = [];
    const lus: [string, unknown][][] = [];
    const journal: unknown[] = [];
    vi.resetModules();
    vi.doMock("@/lib/auth", () => ({
      getAdmin: async () => (estAdmin ? { id: "admin-1", email: "a@x.fr" } : null),
      getUser: async () => ({ id: "u-1", email: "u@x.fr" }),
    }));
    vi.doMock("@/lib/audit", () => ({ journaliser: async (...a: unknown[]) => { journal.push(a); } }));
    vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
    vi.doMock("@/lib/supabase/admin", () => ({
      supabaseAdmin: () => ({
        from: () => ({
          select: () => {
            const f: [string, unknown][] = [];
            const q = { eq: (c: string, v: unknown) => { f.push([c, v]); return q; }, maybeSingle: async () => { lus.push(f); return { data: ligne }; } };
            return q;
          },
          update: (val: { payload: Record<string, unknown> }) => {
            const f: [string, unknown][] = [];
            const q = { eq: (c: string, v: unknown) => { f.push([c, v]); if (f.length === 2) ecrit.push({ payload: val.payload, filtres: f }); return f.length === 2 ? Promise.resolve({ error: null }) : q; } };
            return q;
          },
        }),
      }),
    }));
    const m = await import("@/lib/actions/admin");
    return { m, ecrit, lus, journal };
  }

  it("non admin : refusé, rien n'est lu ni écrit, l'essai est journalisé", async () => {
    const { m, ecrit, lus, journal } = await charger(false);
    expect(await m.marquerDemandeTraitee(ID, true)).toEqual({ ok: false });
    expect(lus).toHaveLength(0);
    expect(ecrit).toHaveLength(0);
    expect((journal[0] as unknown[])[0]).toBe("acces_refuse");
  });

  it("identifiant mal formé : refusé", async () => {
    const { m, ecrit } = await charger(true);
    expect(await m.marquerDemandeTraitee("1 or 1=1", true)).toEqual({ ok: false });
    expect(ecrit).toHaveLength(0);
  });

  it("admin : pose traitee_le sans toucher au reste, et seulement sur une ligne de demande", async () => {
    const { m, ecrit, lus, journal } = await charger(true);
    expect(await m.marquerDemandeTraitee(ID, true)).toEqual({ ok: true });
    expect(lus[0]).toEqual([["id", ID], ["type", "secu:demande_accompagnement"]]);
    expect(ecrit[0].filtres).toEqual([["id", ID], ["type", "secu:demande_accompagnement"]]);
    expect(ecrit[0].payload).toMatchObject({ prenom: "Léa", envoi_interne: "envoye" });
    expect(typeof ecrit[0].payload.traitee_le).toBe("string");
    expect((journal[0] as unknown[])[0]).toBe("action_admin");
  });

  it("remettre à traiter : retire traitee_le", async () => {
    const { m, ecrit } = await charger(true, { payload: { prenom: "Léa", traitee_le: "2026-11-17T10:00:00Z" } });
    expect(await m.marquerDemandeTraitee(ID, false)).toEqual({ ok: true });
    expect(ecrit[0].payload).toEqual({ prenom: "Léa" });
  });

  it("ligne introuvable (ou d'un autre type) : refusé, rien n'est écrit", async () => {
    const { m, ecrit } = await charger(true, null);
    expect(await m.marquerDemandeTraitee(ID, true)).toEqual({ ok: false });
    expect(ecrit).toHaveLength(0);
  });
});

describe("le menu de l'admin", () => {
  afterEach(() => { vi.resetModules(); vi.doUnmock("next/navigation"); });
  it("toutes les rubriques, la page courante marquée, la pastille des demandes, la recherche vers Inscrits", async () => {
    vi.resetModules();
    vi.doMock("next/navigation", () => ({ usePathname: () => "/admin/accompagnement", useRouter: () => ({ push: () => {}, prefetch: () => {} }) }));
    const { default: AdminNav } = await import("@/components/admin/AdminNav");
    const html = renderToStaticMarkup(createElement(AdminNav, { email: "a@x.fr", badges: { accompagnement: 4 } }));
    for (const href of ["/admin", "/admin/inscrits", "/admin/projets", "/admin/plans", "/admin/accompagnement"]) expect(html).toContain(`href="${href}"`);
    expect(html).toMatch(/aria-current="page"[^>]*>[\s\S]*?Accompagnement/);
    expect(html).toContain("4<span class=\"sr-only\"> à traiter</span>");
    expect(html).toMatch(/action="\/admin\/inscrits"/);
    expect(html).toContain('name="q"');
  });

  it("le layout garde l'accès admin en première ligne et n'utilise plus les anciens onglets", () => {
    const src = lire("app/admin/layout.tsx");
    expect(src.indexOf("const admin = await getAdmin()")).toBeGreaterThan(0);
    expect(src.indexOf("const admin = await getAdmin()")).toBeLessThan(src.indexOf("Promise.all([aTraiter()"));
    expect(src).toContain('if (!admin) redirect("/")');
    expect(src).not.toContain("AdminTabs");
    expect(fs.existsSync(path.join(process.cwd(), "components/admin/AdminTabs.tsx"))).toBe(false);
  });
});
