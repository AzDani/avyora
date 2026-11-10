/**
 * Admin · plans : l'éditeur en lecture seule (`/admin/plans/editeur`) et la route qui lui donne un plan
 * (`/api/admin/plans/[id]`, réservée admin). Le chargement réel dans un navigateur a été vérifié à la main :
 * plan affiché, bandeau, aucun octet écrit dans le vrai localStorage, refus sans droit admin.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
vi.mock("server-only", () => ({}));
import { transformerEditeur, SOURCE_EDITEUR } from "@/lib/editeur/heberger";

const source = fs.readFileSync(path.join(process.cwd(), SOURCE_EDITEUR), "utf8");

describe("éditeur admin en lecture seule", () => {
  const admin = transformerEditeur(source, true);
  const site = transformerEditeur(source, false);
  it("bac à sable : localStorage remplacé avant l'éditeur, et pas de démarrage s'il ne l'est pas", () => {
    expect(admin).toContain("Object.defineProperty(window,'localStorage'");
    expect(admin).toContain("if(!sur){dire(");
    expect(admin.indexOf("Object.defineProperty(window,'localStorage'")).toBeLessThan(admin.indexOf('id="avyora-editeur"'));
  });
  it("le plan vient de la route admin, jamais de /api/plans du compte", () => {
    expect(admin).toContain("fetch('/api/admin/plans/'+id");
    expect(admin).not.toContain("window.AVYORA_SITE=s");
    expect(admin).not.toContain("window.AVYORA_URLS=");
  });
  it("aucune mesure d'audience ni configuration du site dans la vue admin", () => {
    expect(admin).not.toContain("AVYORA_TRACK=");
    expect(admin).not.toContain("_vercel/insights");
  });
  it("le bandeau de lecture seule", () => {
    expect(admin).toContain("Vue admin · lecture seule");
  });
  it("/plan n'a pas changé de nature", () => {
    expect(site).toContain("window.AVYORA_SITE=s;");
    expect(site).not.toContain("/api/admin/plans/");
  });
});

describe("route /api/admin/plans/[id]", () => {
  const ID = "11111111-1111-4111-8111-111111111111";
  const S = { refus: null as null | Response, plan: null as unknown };
  const MOCKS = ["@/lib/auth", "@/lib/data/admin", "@/lib/audit"];
  beforeEach(() => {
    vi.resetModules();
    S.refus = null;
    S.plan = { id: ID, ownerId: "u2", email: "jean@exemple.fr", nom: "T3", workflow: "renovation", etat: { levels: [] }, vue: null, updatedAt: "2026-11-01" };
    vi.doMock("@/lib/auth", () => ({ gardeAdmin: async () => S.refus }));
    vi.doMock("@/lib/data/admin", () => ({ getPlanAdmin: async (id: string) => (id === ID ? S.plan : null) }));
    vi.doMock("@/lib/audit", () => ({ journaliser: async () => {} }));
  });
  afterEach(() => { for (const m of MOCKS) vi.doUnmock(m); });
  const get = async (id: string) => {
    const { GET } = await import("@/app/api/admin/plans/[id]/route");
    return GET(new Request("http://x"), { params: Promise.resolve({ id }) });
  };
  it("rend le plan à l'admin, sans cache", async () => {
    const r = await get(ID);
    expect(r.status).toBe(200);
    expect(r.headers.get("Cache-Control")).toBe("no-store");
    expect(await r.json()).toEqual({ id: ID, nom: "T3", workflow: "renovation", etat: { levels: [] }, vue: null, proprietaire: "jean@exemple.fr" });
  });
  it("refus : la garde admin passe en premier, puis id invalide ou inconnu = 404", async () => {
    S.refus = new Response(null, { status: 403 });
    expect((await get(ID)).status).toBe(403);
    S.refus = null;
    expect((await get("pas-un-uuid")).status).toBe(404);
    expect((await get("22222222-2222-4222-8222-222222222222")).status).toBe(404);
  });
});
