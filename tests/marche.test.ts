/**
 * Module M3 · prix du marché (lib/marche) : lecture des ventes DVF, fourchettes de prix au m², loyers de la carte
 * ANIL, communes à loyers encadrés, et la route /api/marche (sans réseau : fetch simulé).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { lireVentes, statsVentes, quantile, HORS_DVF, type Vente } from "@/lib/marche/dvf";
import { indicateurLoyer, serieLoyer, CHARGES_M2_MOIS } from "@/lib/marche/loyers";
import { loyersEncadres } from "@/lib/marche/encadrement";
import { MAJORATION_MEUBLE } from "@/lib/investissement/regles";
import { completer, investSchema } from "@/lib/investissement/saisie";
import donnees from "@/lib/marche/loyers-2025.json";

const TETE = "id_mutation,date_mutation,numero_disposition,nature_mutation,valeur_fonciere,adresse_numero,adresse_suffixe,adresse_nom_voie,adresse_code_voie,code_postal,code_commune,nom_commune,code_departement,ancien_code_commune,ancien_nom_commune,id_parcelle,ancien_id_parcelle,numero_volume,lot1_numero,lot1_surface_carrez,lot2_numero,lot2_surface_carrez,lot3_numero,lot3_surface_carrez,lot4_numero,lot4_surface_carrez,lot5_numero,lot5_surface_carrez,nombre_lots,code_type_local,type_local,surface_reelle_bati,nombre_pieces_principales,code_nature_culture,nature_culture,code_nature_culture_speciale,nature_culture_speciale,surface_terrain,longitude,latitude";
/** Une ligne geo-dvf : seules les colonnes lues comptent. */
const L = (id: string, date: string, nature: string, valeur: number, type: string, surface: number | "", pieces: number | "", parcelle = "P1") =>
  `${id},${date},000001,${nature},${valeur},1,,"RUE DE LA PAIX, BIS",0001,33000,33063,Bordeaux,33,,,${parcelle},,,1,,,,,,,,,,1,1,${type},${surface},${pieces},,,,,,-0.5,44.8`;

describe("lecture des ventes DVF", () => {
  const csv = [
    TETE,
    L("A", "2025-03-01", "Vente", 200_000, "Appartement", 50, 2),
    L("A", "2025-03-01", "Vente", 200_000, "Dépendance", "", ""), // cave : tolérée
    L("B", "2025-04-01", "Vente", 300_000, "Maison", 100, 4, "P1"),
    L("B", "2025-04-01", "Vente", 300_000, "Maison", 100, 4, "P2"), // même maison sur deux parcelles : une vente
    L("C", "2025-05-01", "Vente", 400_000, "Appartement", 40, 2),
    L("C", "2025-05-01", "Vente", 400_000, "Appartement", 60, 3), // deux logements : prix non attribuable
    L("D", "2025-06-01", "Vente en l'état futur d'achèvement", 250_000, "Appartement", 50, 2),
    L("E", "2025-07-01", "Vente", 150_000, "Local industriel. commercial ou assimilé", 80, ""),
    L("F", "2025-08-01", "Vente", 1, "Appartement", 50, 2), // 0,02 €/m² : erreur de saisie
    L("G", "2025-09-01", "Vente", 900_000, "Appartement", 12, 1), // 75 000 €/m² : hors bornes
  ].join("\n");

  it("garde les ventes simples d'un seul logement, au bon prix au m²", () => {
    const v = lireVentes(csv);
    expect(v).toEqual([
      { date: "2025-03-01", prix: 200_000, surface: 50, pieces: 2, type: "appartement", m2: 4_000 },
      { date: "2025-04-01", prix: 300_000, surface: 100, pieces: 4, type: "maison", m2: 3_000 },
    ]);
  });
  it("fichier inattendu : aucune vente plutôt qu'une erreur", () => {
    expect(lireVentes("a,b,c\n1,2,3")).toEqual([]);
  });
  it("Alsace-Moselle et Mayotte hors DVF", () => {
    for (const d of ["57", "67", "68", "976"]) expect(HORS_DVF.has(d)).toBe(true);
    expect(HORS_DVF.has("33")).toBe(false);
  });
});

describe("fourchette des ventes comparables", () => {
  const v = (date: string, surface: number, m2: number, type: Vente["type"] = "appartement"): Vente => ({ date, prix: m2 * surface, surface, pieces: 3, type, m2 });
  it("quantiles par interpolation", () => {
    expect(quantile([1, 2, 3, 4, 5], 0.5)).toBe(3);
    expect(quantile([1, 2, 3, 4, 5], 0.25)).toBe(2);
    expect(quantile([10, 20], 0.75)).toBe(17.5);
  });
  it("surface proche (±30 %) quand il y en a assez, sur les 24 derniers mois des données", () => {
    const proches = Array.from({ length: 20 }, (_, i) => v(`2025-${String((i % 12) + 1).padStart(2, "0")}-10`, 70, 3_000 + i * 100));
    const loin = Array.from({ length: 10 }, () => v("2025-06-01", 200, 9_000));
    const vieilles = Array.from({ length: 10 }, () => v("2023-06-01", 70, 100_000));
    const maisons = Array.from({ length: 10 }, () => v("2025-06-01", 70, 1, "maison"));
    const s = statsVentes([...proches, ...loin, ...vieilles, ...maisons], "appartement", 70)!;
    expect(s.n).toBe(20);
    expect(s.surfaceProche).toBe(true);
    expect(s.med).toBeCloseTo(3_950, 6);
    expect(s.p25).toBeCloseTo(3_475, 6);
    expect(s.fin).toBe("2025-12-10");
    expect(s.exemples).toHaveLength(5);
    expect(s.exemples.every((e) => e.surface === 70)).toBe(true);
  });
  it("toutes surfaces faute de ventes proches, rien sous 5 ventes", () => {
    const peu = [v("2025-01-01", 70, 3_000), ...Array.from({ length: 6 }, () => v("2025-02-01", 150, 2_000))];
    const s = statsVentes(peu, "appartement", 70)!;
    expect(s.surfaceProche).toBe(false);
    expect(s.n).toBe(7);
    expect(statsVentes(peu.slice(0, 4), "appartement", 70)).toBeNull();
    expect(statsVentes(peu, "maison", 70)).toBeNull();
  });
});

describe("loyers de la carte ANIL", () => {
  it("série selon le bien", () => {
    expect(serieLoyer("Maison")).toBe("maison");
    expect(serieLoyer("Studio")).toBe("ap12");
    expect(serieLoyer("T2")).toBe("ap12");
    expect(serieLoyer("T3")).toBe("ap3");
    expect(serieLoyer(undefined)).toBe("ap3");
  });
  it("Bordeaux, appartement de 3 pièces : charges comprises 14,6 €/m², hors charges 2 € de moins", () => {
    const i = indicateurLoyer("33063", "ap3")!;
    expect(i.cc).toBe(14.6);
    expect(i.hc).toBeCloseTo(14.6 - CHARGES_M2_MOIS.ap3, 6);
    expect(i.hcBas).toBeLessThan(i.hc);
    expect(i.hcHaut).toBeGreaterThan(i.hc);
    expect(i.fiable).toBe(true);
  });
  it("arrondissements de Paris et de Lyon, commune inconnue", () => {
    expect(indicateurLoyer("75111", "ap12")!.cc).toBeGreaterThan(25);
    expect(indicateurLoyer("69381", "ap3")).not.toBeNull();
    expect(indicateurLoyer("00000", "ap3")).toBeNull();
  });
  it("fichier embarqué : toutes les communes de France hors Mayotte", () => {
    expect(Object.keys((donnees as { c: object }).c).length).toBeGreaterThan(34_000);
  });
  it("meublé : +12 %, aussi pour le loyer par défaut", () => {
    expect(MAJORATION_MEUBLE).toBe(0.12);
    expect(completer({ loyerNu: 1_000 }, { travauxEstimes: 0 }).loyerMeuble).toBe(1_120);
    expect(completer({ loyerMeuble: 1_120 }, { travauxEstimes: 0 }).loyerNu).toBe(1_000);
  });
});

describe("encadrement des loyers", () => {
  it("villes certaines", () => {
    for (const c of ["75111", "75056", "59350", "69383", "69266", "34172", "33063", "93066", "93048"]) expect(loyersEncadres(c)).toBe(true);
    for (const c of ["45234", "33318", "13055"]) expect(loyersEncadres(c)).toBe(false);
  });
});

describe("saisie : surface et commune", () => {
  it("acceptées dans leurs bornes", () => {
    const b = { actif: true, strategie: "location", location: { surface: 70, codeCommune: "2A004" } };
    expect(investSchema.safeParse(b).success).toBe(true);
    expect(investSchema.safeParse({ ...b, location: { surface: 3 } }).success).toBe(false);
    expect(investSchema.safeParse({ ...b, location: { codeCommune: "../x" } }).success).toBe(false);
  });
});

describe("route /api/marche", () => {
  const S = { user: { id: "u1" } as null | { id: string }, pro: true, limite: true };
  const MOCKS = ["@/lib/auth", "@/lib/ratelimit"];
  const dvf = [TETE, ...Array.from({ length: 8 }, (_, i) => L(`M${i}`, "2025-06-01", "Vente", 280_000 + i * 10_000, "Appartement", 70, 3))].join("\n");
  beforeEach(() => {
    vi.resetModules();
    Object.assign(S, { user: { id: "u1" }, pro: true, limite: true });
    vi.doMock("@/lib/auth", () => ({ getUser: async () => S.user, estPro: () => S.pro }));
    vi.doMock("@/lib/ratelimit", () => ({ verifierLimite: async () => S.limite }));
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.startsWith("https://geo.api.gouv.fr/")) return new Response(JSON.stringify([{ code: "33063", nom: "Bordeaux", population: 260_000 }]));
      if (url.includes("/2025/communes/33/33063.csv")) return new Response(dvf);
      return new Response("", { status: 404 });
    }));
  });
  afterEach(() => { for (const m of MOCKS) vi.doUnmock(m); vi.unstubAllGlobals(); });
  const get = async (qs: string) => {
    const { GET } = await import("@/app/api/marche/route");
    return GET(new Request(`http://x/api/marche?${qs}`));
  };

  it("fourchette des ventes, loyer et encadrement de la commune", async () => {
    const r = await get("cp=33000&type=T3&surface=70");
    expect(r.status).toBe(200);
    const m = await r.json();
    expect(m.commune).toEqual({ code: "33063", nom: "Bordeaux" });
    expect(m.ventes.n).toBe(8);
    expect(m.ventes.med).toBeCloseTo(315_000 / 70, 6);
    expect(m.loyer.cc).toBe(14.6);
    expect(m.encadrement).toBe(true);
  });
  it("refus : anonyme 401, non Pro 403, limite 429, paramètres invalides 400", async () => {
    S.user = null; expect((await get("cp=33000&surface=70")).status).toBe(401);
    S.user = { id: "u1" }; S.pro = false; expect((await get("cp=33000&surface=70")).status).toBe(403);
    S.pro = true; S.limite = false; expect((await get("cp=33000&surface=70")).status).toBe(429);
    S.limite = true;
    expect((await get("cp=330&surface=70")).status).toBe(400);
    expect((await get("cp=33000&surface=1")).status).toBe(400);
    expect((await get("cp=33000&surface=70&type=Villa")).status).toBe(400);
    expect((await get("cp=33000&surface=70&insee=../../x")).status).toBe(400);
  });
});
