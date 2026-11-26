/**
 * Particulier ou pro (décision de Dani du 26/11/2026). Le type vit dans `app_metadata` (le serveur seul l'écrit) ; un
 * particulier ne postule pas au Réseau AVYORA, sauf s'il passe en compte pro avec le SIRET ACTIF d'une entreprise du
 * bâtiment ; les questionnaires disent ce qui est obligatoire ; les comptes d'avant répondent une fois à « Tu es… ».
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
vi.mock("server-only", () => ({}));
import { REGIONS_FRANCE, REGIONS_OUTRE_MER, estComptePro, estRegion, tuEsDe, typeCompte, validerParticulier, validerPro } from "@/lib/compte/type";

const lire = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8");

describe("type de compte et questionnaires", () => {
  it("le type vient d'app_metadata seulement (jamais user_metadata, modifiable par l'utilisateur)", () => {
    expect(typeCompte({ app_metadata: { type_compte: "pro" } })).toBe("pro");
    expect(typeCompte({ app_metadata: {}, user_metadata: { type_compte: "pro" } })).toBeNull();
    expect(estComptePro({ user_metadata: { profil: { tuEs: ["pro"] } } })).toBe(false);
    expect(typeCompte(null)).toBeNull();
  });
  it("toutes les régions de France, l'outre-mer à part", () => {
    expect(REGIONS_FRANCE).toHaveLength(13);
    expect([...REGIONS_FRANCE]).toEqual([...REGIONS_FRANCE].sort((a, b) => a.localeCompare(b, "fr")));
    expect(REGIONS_OUTRE_MER).toContain("La Réunion");
    expect(estRegion("Nouvelle-Aquitaine")).toBe(true);
    expect(estRegion("Mayotte")).toBe(true);
    expect(estRegion("Atlantide")).toBe(false);
  });
  it("particulier : seul le prénom est obligatoire ; un portable vide ne bloque pas, un portable illisible si", () => {
    expect(validerParticulier({ prenom: "Julie" })).toMatchObject({ ok: true, p: { prenom: "Julie", telephone: null } });
    expect(validerParticulier({ prenom: "" })).toMatchObject({ ok: false, erreurs: { prenom: expect.any(String) } });
    expect(validerParticulier({ prenom: "Julie", telephone: "12" })).toMatchObject({ ok: false, erreurs: { telephone: expect.any(String) } });
    expect(validerParticulier({ prenom: "Julie", telephone: "06 12 34 56 78", objectif: "locatif", region: "Bretagne" })).toMatchObject({ ok: true, p: { telephone: "+33612345678", objectif: "locatif" } });
  });
  it("pro : société, nom, portable, métier et région obligatoires ; SIRET facultatif (14 chiffres)", () => {
    const r = validerPro({});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.erreurs).sort()).toEqual(["metier", "nom", "region", "societe", "telephone"]);
    expect(validerPro({ societe: "DLC TRAVAUX", nom: "Daniel Leal", telephone: "06 46 00 00 00", metier: "maconnerie", region: "Nouvelle-Aquitaine", siret: "922 133 020 00029" }))
      .toMatchObject({ ok: true, p: { siret: "92213302000029", telephone: "+33646000000" } });
    expect(validerPro({ societe: "X Y", nom: "Ab Cd", telephone: "0646000000", metier: "maconnerie", region: "Corse", siret: "123" })).toMatchObject({ ok: false, erreurs: { siret: expect.any(String) } });
  });
  it("le profil admin garde ses clés : tuEs dérivé du type", () => {
    expect(tuEsDe("pro")).toEqual(["pro"]);
    expect(tuEsDe("particulier", "locatif")).toEqual(["particulier", "investisseur"]);
    expect(tuEsDe("particulier", "residence")).toEqual(["particulier"]);
  });
});

/* ─── Actions, avec une session et un Supabase factices ─────────────────────── */

const MOCKS = ["@/lib/auth", "@/lib/supabase/admin", "@/lib/supabase/server", "@/lib/audit", "@/lib/ratelimit", "next/cache", "@/lib/reseau/siret"];
async function charger(user: Record<string, unknown> | null, siret: Record<string, unknown> = { statut: "actif", batiment: true, nom: "DLC TRAVAUX", naf: "43.99C" }) {
  const app: [string, Record<string, unknown>][] = [];
  const meta: Record<string, unknown>[] = [];
  vi.resetModules();
  vi.doMock("@/lib/auth", () => ({ getUser: async () => user }));
  vi.doMock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => ({ auth: { admin: { updateUserById: async (id: string, o: { app_metadata: Record<string, unknown> }) => { app.push([id, o.app_metadata]); return { error: null }; } } } }) }));
  vi.doMock("@/lib/supabase/server", () => ({ supabaseServer: async () => ({ auth: { updateUser: async (o: { data: Record<string, unknown> }) => { meta.push(o.data); return { error: null }; } } }) }));
  vi.doMock("@/lib/audit", () => ({ journaliser: async () => {} }));
  vi.doMock("@/lib/ratelimit", () => ({ verifierLimite: async () => true }));
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  vi.doMock("@/lib/reseau/siret", async (orig) => ({ ...(await orig<typeof import("@/lib/reseau/siret")>()), verifierSiret: async () => ({ verifieLe: "", ...siret }) }));
  return { m: await import("@/lib/actions/type-compte"), app, meta };
}
const SIRET = "92213302000029";

describe("actions du type de compte", () => {
  afterEach(() => { MOCKS.forEach((x) => vi.doUnmock(x)); vi.resetModules(); });

  it("« Tu es… » : écrit dans app_metadata, une seule fois", async () => {
    const { m, app, meta } = await charger({ id: "u1", app_metadata: {}, user_metadata: {} });
    expect(await m.choisirTypeCompte("pro")).toEqual({ ok: true });
    expect(app[0]).toEqual(["u1", expect.objectContaining({ type_compte: "pro" })]);
    expect(meta[0]).toMatchObject({ profil: { tuEs: ["pro"] } });
    const deja = await charger({ id: "u1", app_metadata: { type_compte: "particulier" } });
    expect(await deja.m.choisirTypeCompte("pro")).toEqual({ ok: true });
    expect(deja.app).toHaveLength(0);
  });

  it("particulier → pro : SIRET actif du bâtiment, sinon le compte reste particulier", async () => {
    const ok = await charger({ id: "u2", app_metadata: { type_compte: "particulier" }, user_metadata: {} });
    expect(await ok.m.passerEnComptePro({ siret: SIRET, nom: "Daniel Leal" })).toEqual({ ok: true, entreprise: "DLC TRAVAUX" });
    expect(ok.app[0][1]).toMatchObject({ type_compte: "pro", pro_verifie: { siret: SIRET, naf: "43.99C" } });
    for (const [verif, raison] of [
      [{ statut: "ferme", batiment: true }, /fermé/],
      [{ statut: "actif", batiment: false }, /pas du bâtiment/],
      [{ statut: "introuvable" }, /introuvable/],
      [{ statut: "indisponible" }, /ne répond pas/],
    ] as const) {
      const k = await charger({ id: "u3", app_metadata: { type_compte: "particulier" } }, verif);
      const r = await k.m.passerEnComptePro({ siret: SIRET, nom: "Daniel Leal" });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.erreur).toMatch(raison);
      expect(k.app).toHaveLength(0);
    }
  });

  it("questionnaires : seulement pour le bon type ; le pro avec un SIRET fermé est refusé", async () => {
    const part = await charger({ id: "u4", app_metadata: { type_compte: "particulier" }, user_metadata: {} });
    expect(await part.m.enregistrerPro({ societe: "X" })).toMatchObject({ ok: false });
    expect(await part.m.enregistrerParticulier({ prenom: "Julie" })).toEqual({ ok: true });
    expect(part.meta[0]).toMatchObject({ nom: "Julie", onboarding_fait: true, profil: { tuEs: ["particulier"] } });
    const pro = await charger({ id: "u5", app_metadata: { type_compte: "pro" }, user_metadata: {} }, { statut: "ferme" });
    const r = await pro.m.enregistrerPro({ societe: "DLC TRAVAUX", nom: "Daniel Leal", telephone: "0646000000", metier: "maconnerie", region: "Nouvelle-Aquitaine", siret: SIRET });
    expect(r).toMatchObject({ ok: false, erreurs: { siret: expect.stringMatching(/fermé/) } });
    expect(pro.meta).toHaveLength(0);
  });
});

describe("le réseau réservé aux pros, et la question aux comptes d'avant", () => {
  it("une nouvelle candidature exige un compte pro (côté serveur, documents compris)", () => {
    const src = lire("lib/actions/reseau.ts");
    expect(src).toMatch(/if \(!existante && !estComptePro\(user\)\) return \{ ok: false, erreur: "pro" \}/);
    expect(src).toMatch(/if \(m\.ok && !m\.existante && !estComptePro\(user\)\) return \{ ok: false, erreur: "pro" \}/);
    expect(lire("app/espace-artisan/page.tsx")).toMatch(/Le réseau est réservé aux professionnels du bâtiment/);
  });
  it("un compte sans type arrive sur /onboarding ; la page commence par « Tu es… »", async () => {
    vi.resetModules();
    vi.doMock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => ({}) }));
    const { arriveeApresConnexion } = await import("@/lib/data/reseau");
    expect(await arriveeApresConnexion({ id: "x", app_metadata: {} }, "/projets")).toBe("/onboarding");
    expect(await arriveeApresConnexion({ id: "x", app_metadata: {} }, "/plan")).toBe("/plan");
    expect(await arriveeApresConnexion({ id: "x", app_metadata: { type_compte: "particulier" } }, "/projets")).toBe("/projets");
    vi.doUnmock("@/lib/supabase/admin");
    const page = lire("app/onboarding/page.tsx");
    expect(page.indexOf("ChoixTypeCompte />")).toBeLessThan(page.indexOf("<QuestionnairePro"));
  });
  it("chaque champ obligatoire porte l'astérisque et la légende est affichée", () => {
    for (const f of ["components/compte/QuestionnaireParticulier.tsx", "components/compte/QuestionnairePro.tsx", "components/compte/PasserEnPro.tsx", "components/compte/ChoixTypeCompte.tsx"]) {
      const s = lire(f);
      expect(s, f).toMatch(/<Req \/>/);
      expect(s, f).toMatch(/<Legende \/>/);
    }
    expect(lire("components/compte/Communs.tsx")).toMatch(/sont obligatoires/);
  });
});
