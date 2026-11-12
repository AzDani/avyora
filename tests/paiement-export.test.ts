/**
 * /bienvenue-pro ne célèbre (et ne compte une conversion) qu'après un vrai paiement vérifié (lib/paiement-verifie.ts),
 * et l'export RGPD de « Mon compte » rassemble les données du compte, et seulement les siennes (lib/export-donnees.ts).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { idSessionValide, paiementVerifie, type SessionCheckout } from "@/lib/paiement-verifie";
import { exporterDonnees, nomFichierExport, TABLES_DES_PROJETS, type ClientLecture } from "@/lib/export-donnees";
import { dict } from "@/lib/i18n/dictionaries";

const OK: SessionCheckout = {
  id: "cs_test_a1B2c3D4e5F6",
  status: "complete",
  payment_status: "paid",
  client_reference_id: "u-1",
  amount_total: 16900,
  currency: "eur",
};

describe("lib/paiement-verifie", () => {
  it("une session terminée, payée, du compte connecté : le montant réel et l'id de session", () => {
    expect(paiementVerifie(OK, "u-1")).toEqual({ transactionId: OK.id, valeur: 169, devise: "EUR" });
    expect(paiementVerifie({ ...OK, payment_status: "no_payment_required", amount_total: 0 }, "u-1")).toEqual({ transactionId: OK.id, valeur: 0, devise: "EUR" });
    expect(paiementVerifie({ ...OK, client_reference_id: null, metadata: { supabase_user_id: "u-1" } }, "u-1")).not.toBeNull();
  });

  it("refusée : session absente, ouverte, expirée, impayée, ou d'un autre compte", () => {
    expect(paiementVerifie(null, "u-1")).toBeNull();
    expect(paiementVerifie({ ...OK, status: "open" }, "u-1")).toBeNull();
    expect(paiementVerifie({ ...OK, status: "expired" }, "u-1")).toBeNull();
    expect(paiementVerifie({ ...OK, payment_status: "unpaid" }, "u-1")).toBeNull();
    expect(paiementVerifie(OK, "u-2")).toBeNull();
    expect(paiementVerifie({ ...OK, client_reference_id: null, metadata: null }, "u-1")).toBeNull();
  });

  it("idSessionValide : seulement la forme d'une session Checkout", () => {
    expect(idSessionValide("cs_test_a1B2c3D4e5F6")).toBe(true);
    expect(idSessionValide("cs_live_a1B2c3D4e5F6g7")).toBe(true);
    for (const v of [undefined, "", "abc", "cs_test_1", "cs_test_a1b2c3d4e5/../x", "pi_test_a1b2c3d4e5f6"]) expect(idSessionValide(v)).toBe(false);
  });
});

/* ─── La page elle-même ──────────────────────────────────────────────────────── */

describe("/bienvenue-pro", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const m of ["@/lib/auth", "@/lib/stripe", "@/lib/i18n/server", "@/lib/actions/compte"]) vi.doUnmock(m);
  });

  async function page(sp: Record<string, string>, session: SessionCheckout | null | "erreur") {
    vi.resetModules(); // un module de page neuf à chaque cas : il relit SES simulations
    const redirections: string[] = [];
    const retrieve = vi.fn(async () => {
      if (session === "erreur") throw new Error("Stripe injoignable");
      return session;
    });
    vi.doMock("@/lib/i18n/server", () => ({ getLocale: async () => "fr", getT: async () => ({ locale: "fr", t: dict("fr") }) }));
    vi.doMock("@/lib/auth", () => ({ getUser: async () => ({ id: "u-1", email: "alex@exemple.fr" }) }));
    vi.doMock("@/lib/stripe", () => ({ getStripe: () => ({ checkout: { sessions: { retrieve } } }) }));
    const Page = (await import("@/app/bienvenue-pro/page")).default;
    try {
      const html = renderToStaticMarkup((await Page({ searchParams: Promise.resolve(sp) })) as ReactElement);
      return { html, redirections, retrieve };
    } catch (e) {
      // La redirection de Next (NEXT_REDIRECT) porte l'adresse dans son `digest` : « NEXT_REDIRECT;replace;/projets;307; ».
      const digest = String((e as { digest?: string }).digest ?? "");
      if (!digest.startsWith("NEXT_REDIRECT")) throw e;
      redirections.push(digest.split(";")[2]);
      return { html: null, redirections, retrieve };
    }
  }

  it("sans session_id, mal formé, impayé, d'un autre compte ou Stripe en panne : retour à /projets, aucune félicitation", async () => {
    const cas: [Record<string, string>, SessionCheckout | null | "erreur"][] = [
      [{}, OK],
      [{ session_id: "n'importe-quoi" }, OK],
      [{ session_id: OK.id }, { ...OK, payment_status: "unpaid" }],
      [{ session_id: OK.id }, { ...OK, client_reference_id: "u-2" }],
      [{ session_id: OK.id }, "erreur"],
    ];
    for (const [sp, session] of cas) {
      const r = await page(sp, session);
      expect(r.html).toBeNull();
      expect(r.redirections).toEqual(["/projets"]);
    }
    // Un identifiant mal formé n'est même pas envoyé à Stripe.
    expect((await page({ session_id: "n'importe-quoi" }, OK)).retrieve).not.toHaveBeenCalled();
  });

  it("paiement vérifié : la page s'affiche, et dit « Estimation détaillée » (plus « Devis »)", async () => {
    const r = await page({ session_id: OK.id }, OK);
    expect(r.redirections).toEqual([]);
    expect(r.html).toContain("Félicitations");
    expect(r.html).toContain("Estimation détaillée, 200 postes");
    expect(r.html).not.toContain("Devis détaillé");
    expect(r.retrieve).toHaveBeenCalledWith(OK.id);
  });
});

/* ─── Export RGPD ───────────────────────────────────────────────────────────── */

/** Un faux client Supabase : des tables en mémoire, le journal des requêtes. */
function client(tables: Record<string, Record<string, unknown>[] | "erreur">) {
  const journal: string[] = [];
  const sb: ClientLecture = {
    from(table: string) {
      return {
        select() {
          const lignes = tables[table];
          const repondre = (filtre: (l: Record<string, unknown>) => boolean) =>
            Promise.resolve(lignes === "erreur" || lignes === undefined
              ? { data: null, error: { message: "relation does not exist" } }
              : { data: lignes.filter(filtre), error: null });
          const q = repondre(() => true) as unknown as ReturnType<ReturnType<ClientLecture["from"]>["select"]>;
          return Object.assign(q, {
            eq: (c: string, v: string) => { journal.push(`${table}.${c}=${v}`); return repondre((l) => l[c] === v); },
            in: (c: string, v: string[]) => { journal.push(`${table}.${c} in ${v.join(",")}`); return repondre((l) => v.includes(l[c] as string)); },
          });
        },
      };
    },
  };
  return { sb, journal };
}

describe("lib/export-donnees", () => {
  const maintenant = new Date("2026-11-12T10:00:00.000Z");
  const compte = { id: "u-1", email: "alex@exemple.fr", created_at: "2026-10-01T00:00:00Z", user_metadata: { nom: "Alex" }, app_metadata: { plan: "pro" } };

  it("rassemble le compte, ses projets et leurs dépenses, ses plans ; jamais les projets d'un autre", async () => {
    const tables: Record<string, Record<string, unknown>[] | "erreur"> = {
      projects: [{ id: "p-1", owner_id: "u-1", nom: "Maison" }, { id: "p-2", owner_id: "u-2", nom: "Pas à moi" }],
      expenses: [{ id: "e-1", project_id: "p-1", montant: 120 }, { id: "e-2", project_id: "p-2", montant: 999 }],
      floor_plans: [{ id: "f-1", owner_id: "u-1" }, { id: "f-2", owner_id: "u-2" }],
      profiles: [{ id: "u-1", nom: "Alex" }],
      project_plans: [],
      artisans: "erreur",
    };
    const { sb, journal } = client(tables);
    const e = await exporterDonnees(sb, compte, maintenant);
    expect(e.genere_le).toBe("2026-11-12T10:00:00.000Z");
    expect(e.compte).toMatchObject({ id: "u-1", email: "alex@exemple.fr", metadonnees: { nom: "Alex" } });
    expect(e.donnees.projects).toEqual([{ id: "p-1", owner_id: "u-1", nom: "Maison" }]);
    expect(e.donnees.expenses).toEqual([{ id: "e-1", project_id: "p-1", montant: 120 }]);
    expect(e.donnees.floor_plans).toEqual([{ id: "f-1", owner_id: "u-1" }]);
    expect(e.donnees.profiles).toEqual([{ id: "u-1", nom: "Alex" }]);
    // Une table absente ou refusée ne fait pas échouer l'export : elle est citée.
    expect(e.indisponibles).toContain("artisans");
    expect(e.indisponibles).toContain("rooms");
    expect(journal).toContain("projects.owner_id=u-1");
    expect(journal).toContain("expenses.project_id in p-1");
    // Ni les membres invités, ni le journal d'activité (données d'autres comptes).
    expect(TABLES_DES_PROJETS).not.toContain("project_members" as never);
    expect(TABLES_DES_PROJETS).not.toContain("activity_log" as never);
  });

  it("sans projet : aucune requête par project_id ; nom de fichier daté", async () => {
    const { sb, journal } = client({ projects: [] });
    const e = await exporterDonnees(sb, compte, maintenant);
    expect(journal.some((j) => j.includes("project_id"))).toBe(false);
    for (const t of TABLES_DES_PROJETS) expect(e.donnees[t]).toEqual([]);
    expect(nomFichierExport(maintenant)).toBe("avyora-mes-donnees-2026-11-12.json");
  });

  it("« Mon compte » propose le téléchargement, et ne cite plus de fonction éteinte", async () => {
    vi.resetModules();
    // L'action de suppression (serveur) n'est pas l'objet ici.
    vi.doMock("@/lib/actions/compte", () => ({ supprimerCompte: async () => undefined }));
    const { LangProvider } = await import("@/components/i18n/LangProvider");
    const CompteActions = (await import("@/components/CompteActions")).default;
    for (const locale of ["fr", "en"] as const) {
      const h = renderToStaticMarkup(createElement(LangProvider, { locale, children: createElement(CompteActions, { email: "alex@exemple.fr" }) }));
      expect(h).toContain('href="/api/mon-compte/export"');
      expect(h).not.toMatch(/devis|quotes|fichiers|files\)/);
    }
  });
});
