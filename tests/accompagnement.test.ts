/**
 * Accompagnement travaux (décisions du fondateur du 16/11/2026) : la page /accompagnement-travaux, son formulaire de
 * demande de rappel et ses e-mails. Resend est SIMULÉ (aucun envoi réel), le journal aussi.
 *
 * - validation (champs requis et facultatifs, bornes, listes fermées) ;
 * - anti-abus sans clé externe : champ piège et délai minimal (jeton signé) refusés SANS envoi, limite de débit ;
 * - e-mails : deux envois (Daniel avec reply-to = la personne, accusé de réception), contenu échappé ;
 * - page rendue en FR et EN : title et description dans les bornes, aucun prix, JSON-LD valide (FAQ = FAQ visible),
 *   pas de maîtrise d'œuvre dit clairement ; sitemap ; liens internes posés.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement } from "react";
import { prerender } from "react-dom/static";
import { readFileSync } from "node:fs";

const h = vi.hoisted(() => ({
  ip: "10.0.0.1",
  locale: "fr" as "fr" | "en",
  envoi: vi.fn(async (_o: Record<string, unknown>) => ({ data: { id: "simule" }, error: null as null | { message: string } })),
  journal: vi.fn(async (_t: string, _o?: unknown) => {}),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": h.ip, "user-agent": "vitest" }),
  cookies: async () => ({ get: () => undefined }),
}));
vi.mock("@/lib/i18n/server", () => ({ getLocale: async () => h.locale }));
vi.mock("@/lib/audit", () => ({ journaliser: h.journal }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: h.envoi };
  },
}));

const lire = (f: string) => readFileSync(f, "utf8");
let compteur = 0;
/** Une IP et une adresse neuves par test : les limites en mémoire ne se mélangent pas. */
const neuf = () => {
  compteur += 1;
  h.ip = `10.0.${compteur}.1`;
  return `camille.${compteur}@exemple.fr`;
};

async function formulaire(champs: Record<string, string | string[]>, opts: { ageMs?: number; jeton?: string } = {}) {
  const { creerJeton } = await import("@/lib/accompagnement/jeton");
  const fd = new FormData();
  fd.set("jeton", opts.jeton ?? creerJeton(Date.now() - (opts.ageMs ?? 10_000)));
  for (const [k, v] of Object.entries(champs)) for (const x of Array.isArray(v) ? v : [v]) fd.append(k, x);
  return fd;
}
const valide = (email: string, extra: Record<string, string | string[]> = {}) => ({
  prenom: "Camille",
  email,
  telephone: "",
  typeProjet: "renovation",
  besoins: ["devis", "suivi"],
  message: "Cuisine à refaire, deux devis reçus.",
  ...extra,
});

beforeEach(() => {
  h.envoi.mockClear();
  h.envoi.mockImplementation(async () => ({ data: { id: "simule" }, error: null }));
  h.journal.mockClear();
  h.locale = "fr";
  vi.stubEnv("RESEND_API_KEY", "re_test_simule");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://getavyora.fr");
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

/* ─── Validation ─────────────────────────────────────────────────────────────── */

describe("validation de la demande (zod, serveur)", () => {
  const fd = (o: Record<string, string | string[]>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(o)) for (const x of Array.isArray(v) ? v : [v]) f.append(k, x);
    return f;
  };

  it("une demande complète passe ; téléphone, besoins et message sont facultatifs (aucun besoin = « je ne sais pas encore »)", async () => {
    const { validerDemande } = await import("@/lib/accompagnement/schema");
    const r = validerDemande(fd({ prenom: " Camille ", email: " Camille@Exemple.FR ", typeProjet: "achat" }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.demande).toMatchObject({ prenom: "Camille", email: "camille@exemple.fr", telephone: "", typeProjet: "achat", besoins: ["nsp"], message: "" });
      expect(r.demande.src).toBeUndefined();
    }
  });

  it("champs requis : prénom, e-mail, type de projet", async () => {
    const { validerDemande } = await import("@/lib/accompagnement/schema");
    const r = validerDemande(fd({}));
    expect(r).toEqual({ ok: false, champs: { prenom: "requis", email: "requis", typeProjet: "requis" } });
  });

  it("formats et listes fermées : e-mail, prénom (lettres seulement), téléphone souple, type et besoins", async () => {
    const { validerDemande, telephoneValide } = await import("@/lib/accompagnement/schema");
    const r = validerDemande(
      fd({ prenom: "Gagnez 1000€ sur http://x.io", email: "pas-une-adresse", telephone: "appelle-moi", typeProjet: "piscine", besoins: ["devis", "lavage"] }),
    );
    expect(r).toEqual({ ok: false, champs: { prenom: "invalide", email: "invalide", telephone: "invalide", typeProjet: "invalide", besoins: "invalide" } });
    for (const t of ["06 12 34 56 78", "+33 6 12 34 56 78", "+1 (305) 555-0123", "06.12.34.56.78"]) expect(telephoneValide(t), t).toBe(true);
    for (const t of ["12345", "+33 6 12 34 56 78 90 12 34 56 78", "06 12 34 56 7a", "++33612345678"]) expect(telephoneValide(t), t).toBe(false);
    expect(validerDemande(fd({ prenom: "Jean-François d'Arc", email: "a@b.fr", typeProjet: "neuf" })).ok).toBe(true);
    expect(validerDemande(fd({ prenom: "Zoë", email: "a@b.fr", typeProjet: "neuf" })).ok).toBe(true);
    // Initiales acceptées ; un nom de domaine (rendu cliquable par les messageries dans l'accusé) refusé.
    for (const p of ["J.-P.", "J. Paul", "Anne-Marie"]) expect(validerDemande(fd({ prenom: p, email: "a@b.fr", typeProjet: "neuf" })).ok, p).toBe(true);
    for (const p of ["Promo casino.com", "visite monsite.fr", "Bonjour.Achetez"]) {
      expect(validerDemande(fd({ prenom: p, email: "a@b.fr", typeProjet: "neuf" })), p).toMatchObject({ ok: false, champs: { prenom: "invalide" } });
    }
  });

  it("bornes : prénom 40, e-mail 254, téléphone 30, message 1000 (retours à la ligne gardés, caractères de contrôle refusés)", async () => {
    const { validerDemande } = await import("@/lib/accompagnement/schema");
    const base = { prenom: "Camille", email: "a@b.fr", typeProjet: "devis" };
    expect(validerDemande(fd({ ...base, prenom: "A".repeat(41) }))).toMatchObject({ ok: false, champs: { prenom: "trop_long" } });
    expect(validerDemande(fd({ ...base, email: "a".repeat(250) + "@b.fr" }))).toMatchObject({ ok: false, champs: { email: "trop_long" } });
    expect(validerDemande(fd({ ...base, telephone: "0".repeat(31) }))).toMatchObject({ ok: false, champs: { telephone: "trop_long" } });
    expect(validerDemande(fd({ ...base, message: "x".repeat(1001) }))).toMatchObject({ ok: false, champs: { message: "trop_long" } });
    expect(validerDemande(fd({ ...base, message: "x".repeat(1000) })).ok).toBe(true);
    // 500 retours à la ligne Windows (\r\n) comptent pour 500 caractères, pas 1000.
    expect(validerDemande(fd({ ...base, message: "a\r\n".repeat(333) })).ok).toBe(true);
    expect(validerDemande(fd({ ...base, message: "ligne 1\u0000" }))).toMatchObject({ ok: false, champs: { message: "invalide" } });
    expect(validerDemande(fd({ ...base, prenom: "Cam\nille" }))).toMatchObject({ ok: false, champs: { prenom: "invalide" } });
  });

  it("la source (`src`) : liste fermée, une valeur bricolée est ignorée", async () => {
    const { validerDemande } = await import("@/lib/accompagnement/schema");
    const base = { prenom: "Camille", email: "a@b.fr", typeProjet: "devis" };
    const ok = validerDemande(fd({ ...base, src: "invest" }));
    expect(ok.ok && ok.demande.src).toBe("invest");
    const bricole = validerDemande(fd({ ...base, src: "<script>" }));
    expect(bricole.ok && bricole.demande.src).toBeUndefined();
  });
});

/* ─── Jeton : délai minimal, signé ───────────────────────────────────────────── */

describe("jeton du formulaire (délai minimal sans clé externe)", () => {
  it("ok après 3 s, trop rapide avant, expiré après 48 h, falsifié refusé (mal formé ≠ signé d'un autre secret)", async () => {
    const { creerJeton, verifierJeton } = await import("@/lib/accompagnement/jeton");
    const t0 = Date.parse("2026-11-16T10:00:00Z");
    const j = creerJeton(t0);
    expect(verifierJeton(j, t0 + 3_000)).toBe("ok");
    expect(verifierJeton(j, t0 + 1_000)).toBe("trop_rapide");
    expect(verifierJeton(j, t0 + 49 * 3_600_000)).toBe("expire");
    // Une heure ancienne fabriquée sans le secret : refusée (« signature » : l'action demande de recharger).
    const [, sig] = j.split(".");
    expect(verifierJeton(`${t0 - 60_000}.${sig}`, t0 + 5_000)).toBe("signature");
    for (const x of [undefined, "", "abc", "123.456", `${t0}.`, `${t0}.${"z".repeat(32)}`, "x".repeat(200)]) expect(verifierJeton(x, t0)).toBe("invalide");
  });
});

/* ─── L'action serveur ───────────────────────────────────────────────────────── */

describe("demanderAccompagnement (Resend simulé)", () => {
  const action = async () => (await import("@/lib/actions/accompagnement")).demanderAccompagnement;

  it("une demande valide : deux e-mails (Daniel avec reply-to = la personne, puis l'accusé), une trace au journal", async () => {
    const email = neuf();
    const r = await (await action())(undefined, await formulaire(valide(email, { telephone: "06 12 34 56 78" })));
    expect(r).toEqual({ statut: "ok", prenom: "Camille" });
    expect(h.envoi).toHaveBeenCalledTimes(2);
    const [interne, accuse] = h.envoi.mock.calls.map((c) => c[0] as { to: string; subject: string; html: string; replyTo?: string; from: string });
    expect(interne.to).toBe("contact@getavyora.fr");
    expect(interne.replyTo).toBe(email);
    expect(interne.subject).toBe("Demande d'accompagnement : Camille · Rénovation");
    for (const x of ["Camille", email, "06 12 34 56 78", "Relecture de mes devis", "Suivi de chantier chaque semaine", "Cuisine à refaire"]) expect(interne.html).toContain(x);
    expect(accuse.to).toBe(email);
    expect(accuse.replyTo).toBe("contact@getavyora.fr");
    expect(accuse.subject).toBe("Ta demande de rappel est bien reçue");
    expect(accuse.html).toContain("Daniel te recontacte sous 48 h ouvrées");
    expect(accuse.html).toContain("https://getavyora.fr/accompagnement-travaux");
    // L'accusé ne recopie ni le message ni le téléphone.
    expect(accuse.html).not.toContain("Cuisine à refaire");
    expect(accuse.html).not.toContain("06 12 34 56 78");
    // Aucun en-tête ne vient du formulaire, hors reply-to validé.
    expect(Object.keys(interne).sort()).toEqual(["from", "html", "replyTo", "subject", "to"]);
    expect(h.journal).toHaveBeenCalledTimes(1);
    const [type, opts] = h.journal.mock.calls[0] as [string, { email: string; payload: Record<string, unknown> }];
    expect(type).toBe("demande_accompagnement");
    expect(opts.email).toBe(email);
    expect(opts.payload).toMatchObject({ prenom: "Camille", type_projet: "renovation", besoins: ["devis", "suivi"], envoi_interne: "envoye", envoi_accuse: "envoye" });
    // L'e-mail est parti : le message n'est pas recopié au journal.
    expect(opts.payload).not.toHaveProperty("message");
  });

  it("contenu échappé : rien de ce que la personne tape n'est interprété dans l'e-mail", async () => {
    const email = neuf();
    const message = `<script>alert(1)</script><a href="https://pub.example">promo</a> & "guillemets"\nligne 2`;
    await (await action())(undefined, await formulaire(valide(email, { message })));
    const html = (h.envoi.mock.calls[0][0] as { html: string }).html;
    expect(html).not.toContain("<script>");
    expect(html).not.toContain('<a href="https://pub.example">');
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("&amp; &quot;guillemets&quot;<br>ligne 2");
  });

  it("ACCOMPAGNEMENT_TO change le destinataire ; une valeur mal formée retombe sur contact@getavyora.fr", async () => {
    vi.stubEnv("ACCOMPAGNEMENT_TO", "daniel@exemple.fr");
    await (await action())(undefined, await formulaire(valide(neuf())));
    expect((h.envoi.mock.calls[0][0] as { to: string }).to).toBe("daniel@exemple.fr");
    h.envoi.mockClear();
    vi.stubEnv("ACCOMPAGNEMENT_TO", "pas une adresse, autre@x.fr");
    await (await action())(undefined, await formulaire(valide(neuf())));
    expect((h.envoi.mock.calls[0][0] as { to: string }).to).toBe("contact@getavyora.fr");
  });

  it("en anglais : l'accusé de réception est en anglais, l'e-mail à Daniel reste en français", async () => {
    h.locale = "en";
    await (await action())(undefined, await formulaire(valide(neuf())));
    const [interne, accuse] = h.envoi.mock.calls.map((c) => c[0] as { subject: string; html: string });
    expect(interne.html).toContain("anglais");
    expect(interne.subject).toContain("Demande d'accompagnement");
    expect(accuse.subject).toBe("Your call-back request has been received");
    expect(accuse.html).toContain('lang="en"');
  });

  it("champ piège rempli : faux succès, AUCUN envoi, aucune trace", async () => {
    const r = await (await action())(undefined, await formulaire({ ...valide(neuf()), site_web: "https://spam.example" }));
    expect(r?.statut).toBe("ok");
    expect(h.envoi).not.toHaveBeenCalled();
    expect(h.journal).not.toHaveBeenCalled();
  });

  it("envoyé trop vite (moins de 3 s) : refusé, aucun envoi ; jeton mal formé : faux succès ; signé d'un autre secret ou expiré : « recharge »", async () => {
    const run = await action();
    expect(await run(undefined, await formulaire(valide(neuf()), { ageMs: 500 }))).toEqual({ statut: "erreur", global: "trop_rapide" });
    // Mal formé (robot qui poste sans la page) : faux succès silencieux.
    expect(await run(undefined, await formulaire(valide(neuf()), { jeton: `${Date.now() - 60_000}.pas-un-jeton` }))).toMatchObject({ statut: "ok" });
    // Bien formé mais signé d'un autre secret (rotation de clé pendant que la page était ouverte) : « recharge », pas
    // de faux succès qui perdrait la demande d'un humain.
    expect(await run(undefined, await formulaire(valide(neuf()), { jeton: `${Date.now() - 60_000}.${"0".repeat(32)}` }))).toEqual({ statut: "erreur", global: "expire" });
    expect(await run(undefined, await formulaire(valide(neuf()), { ageMs: 72 * 3_600_000 }))).toEqual({ statut: "erreur", global: "expire" });
    expect(h.envoi).not.toHaveBeenCalled();
    expect(h.journal).not.toHaveBeenCalled();
  });

  it("demande invalide : erreurs par champ, aucun envoi", async () => {
    neuf();
    const r = await (await action())(undefined, await formulaire({ prenom: "", email: "x", typeProjet: "renovation" }));
    expect(r).toEqual({ statut: "erreur", champs: { prenom: "requis", email: "invalide" } });
    expect(h.envoi).not.toHaveBeenCalled();
  });

  it("limite de débit : 5 demandes par heure depuis une IP, la 6e est refusée sans envoi", async () => {
    const run = await action();
    neuf();
    for (let i = 0; i < 5; i++) expect(await run(undefined, await formulaire(valide(`personne.${i}.${compteur}@exemple.fr`)))).toMatchObject({ statut: "ok" });
    h.envoi.mockClear();
    expect(await run(undefined, await formulaire(valide(`personne.6.${compteur}@exemple.fr`)))).toEqual({ statut: "erreur", global: "limite" });
    expect(h.envoi).not.toHaveBeenCalled();
  });

  it("limite de débit par adresse : la même adresse depuis 6 IP différentes est arrêtée à la 6e", async () => {
    const run = await action();
    const email = neuf();
    for (let i = 0; i < 5; i++) {
      h.ip = `10.200.${compteur}.${i}`;
      expect(await run(undefined, await formulaire(valide(email)))).toMatchObject({ statut: "ok" });
    }
    h.ip = `10.200.${compteur}.99`;
    expect(await run(undefined, await formulaire(valide(email)))).toEqual({ statut: "erreur", global: "limite" });
  });

  it("plafond global des accusés (30 / h, toutes IP) : au-delà, la demande part chez Daniel, l'accusé est sauté", async () => {
    vi.resetModules(); // un compteur global neuf (les autres tests en ont consommé)
    try {
      const run = await action();
      for (let i = 0; i < 30; i++) {
        const email = neuf();
        expect(await run(undefined, await formulaire(valide(email)))).toMatchObject({ statut: "ok" });
      }
      h.envoi.mockClear();
      h.journal.mockClear();
      const email = neuf();
      expect(await run(undefined, await formulaire(valide(email)))).toMatchObject({ statut: "ok" });
      expect(h.envoi).toHaveBeenCalledTimes(1);
      expect((h.envoi.mock.calls[0][0] as { to: string }).to).toBe("contact@getavyora.fr");
      const [, opts] = h.journal.mock.calls[0] as [string, { payload: Record<string, unknown> }];
      expect(opts.payload).toMatchObject({ envoi_interne: "envoye", envoi_accuse: "plafond" });
    } finally {
      vi.resetModules(); // les tests suivants repartent d'un compteur vide
    }
  });

  it("e-mail à Daniel refusé par Resend : erreur visible, pas d'accusé, demande gardée au journal AVEC son message", async () => {
    h.envoi.mockImplementation(async () => ({ data: null as never, error: { message: "domaine non vérifié" } }));
    const email = neuf();
    const r = await (await action())(undefined, await formulaire(valide(email)));
    expect(r).toEqual({ statut: "erreur", global: "envoi" });
    expect(h.envoi).toHaveBeenCalledTimes(1);
    const opts = h.journal.mock.calls[0][1] as { email: string; payload: Record<string, unknown> };
    expect(opts.email).toBe(email);
    expect(opts.payload).toMatchObject({ envoi_interne: "echec", envoi_accuse: "non_tente", message: "Cuisine à refaire, deux devis reçus." });
  });

  it("Resend non configuré : erreur en production (rien n'est parti), succès hors production ; la trace est gardée", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("VERCEL_ENV", "production");
    expect(await (await action())(undefined, await formulaire(valide(neuf())))).toEqual({ statut: "erreur", global: "envoi" });
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(await (await action())(undefined, await formulaire(valide(neuf())))).toEqual({ statut: "ok", prenom: "Camille" });
    expect(h.envoi).not.toHaveBeenCalled();
    expect(h.journal).toHaveBeenCalledTimes(2);
  });
});

describe("gabarits d'e-mail", () => {
  it("echapperHtml échappe contenu et attributs", async () => {
    const { echapperHtml } = await import("@/lib/email");
    expect(echapperHtml(`<a href="x" onclick='y'>&</a>`)).toBe("&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;");
  });
});

/* ─── La page ────────────────────────────────────────────────────────────────── */

async function rendre(el: ReturnType<typeof createElement>): Promise<string> {
  const { prelude } = await prerender(el);
  const reader = prelude.getReader();
  let html = "";
  const dec = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    html += dec.decode(value);
  }
  return html;
}
const texteVisible = (html: string) =>
  html
    .replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");

describe("page /accompagnement-travaux", () => {
  const charger = async (locale: "fr" | "en") => {
    vi.resetModules();
    h.locale = locale;
    return import("@/app/accompagnement-travaux/page");
  };

  for (const locale of ["fr", "en"] as const) {
    it(`${locale} : title ≤ 60 caractères (suffixe compris), description 120–160, canonical, aucun prix`, async () => {
      const { default: Page, generateMetadata } = await charger(locale);
      const m = await generateMetadata();
      const titre = typeof m.title === "string" ? m.title + " · AVYORA" : (m.title as { absolute: string }).absolute;
      expect(titre.length, titre).toBeLessThanOrEqual(60);
      expect(titre).toMatch(locale === "fr" ? /^Accompagnement travaux/ : /Renovation advice/);
      expect(m.description!.length).toBeGreaterThanOrEqual(120);
      expect(m.description!.length).toBeLessThanOrEqual(160);
      expect(m.alternates?.canonical).toBe("/accompagnement-travaux");
      expect((m.openGraph as { url: string }).url).toBe("https://getavyora.fr/accompagnement-travaux");

      const html = await rendre(await Page({ searchParams: Promise.resolve({ src: "rapide" }) }));
      const txt = texteVisible(html);
      // Aucun prix, aucune réduction : ni symbole, ni montant, ni pourcentage.
      expect(txt).not.toMatch(/€|\bEUR\b|\d+\s?%|\b\d+\s?euros?\b/i);
      expect(txt).not.toMatch(/\bPro\b.*−|-20|réduction|discount/i);
      // Un seul formulaire, ancré, avec le jeton, le piège et la source.
      expect(html).toContain('id="demande"');
      expect(html).toMatch(/name="jeton" value="\d+\.[0-9a-f]{32}"/);
      expect(html).toContain('name="site_web"');
      expect(html).toContain('name="src" value="rapide"');
      expect(html).toContain('href="#demande"');
      // Accessibilité : chaque champ a son libellé.
      for (const id of ["acc-prenom", "acc-email", "acc-telephone", "acc-message"]) expect(html).toContain(`for="${id}"`);
      expect((html.match(/<h1[\s>]/g) ?? []).length).toBe(1);
      if (locale === "fr") {
        expect(txt).toContain("Accompagnement travaux : un ancien chef de chantier à tes côtés");
        expect(txt).toContain("Comment je peux t'aider sur ton projet");
        expect(txt).toContain("Comment puis-je t'aider ?");
        expect(txt).toContain("Demande à être rappelé, c'est gratuit");
        expect(txt).toContain("Ce n'est pas une mission de maîtrise d'œuvre");
        expect(txt).toContain("Daniel Leal");
        expect(txt).toContain("chef de chantier");
        expect(txt).not.toMatch(/vinci/i);
        expect(txt).toContain("France Rénov'");
        expect(txt).not.toMatch(/\b(vous|votre|vos)\b/i);
        // 900 à 1 300 mots visibles environ (rapport SEO) : du contenu, pas du remplissage.
        const mots = txt.split(" ").filter((w) => /\p{L}/u.test(w)).length;
        expect(mots).toBeGreaterThan(900);
      } else {
        expect(txt).toContain("Renovation advice: a former site manager by your side");
        expect(txt).toContain("Request a free call-back");
        expect(txt).not.toContain("Comment puis-je t'aider");
      }
    });
  }

  it("JSON-LD : Service (appel gratuit à 0, aucun autre prix), FAQPage = FAQ visible, fil d'Ariane ; ni avis ni LocalBusiness", async () => {
    const { default: Page } = await charger("fr");
    const html = await rendre(await Page({ searchParams: Promise.resolve({}) }));
    const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
    expect(scripts).toHaveLength(1);
    const graph = scripts[0]["@graph"] as Record<string, unknown>[];
    const types = graph.map((n) => n["@type"]);
    expect(types).toEqual(["Service", "FAQPage", "BreadcrumbList"]);
    const service = graph[0] as Record<string, any>;
    expect(service.provider).toEqual({ "@id": "https://getavyora.fr/#organization" });
    expect(service.offers).toMatchObject({ price: "0", priceCurrency: "EUR" });
    expect(JSON.stringify(service.hasOfferCatalog)).not.toMatch(/price/);
    expect(service.hasOfferCatalog.itemListElement).toHaveLength(6);
    const brut = JSON.stringify(scripts);
    expect(brut).not.toMatch(/aggregateRating|Review|LocalBusiness|ProfessionalService/);
    const { contenuAccompagnement } = await import("@/lib/accompagnement/contenu");
    const faq = (graph[1] as { mainEntity: { name: string; acceptedAnswer: { text: string } }[] }).mainEntity;
    expect(faq.map((q) => q.name)).toEqual(contenuAccompagnement("fr").faq.items.map((f) => f.q));
    const txt = texteVisible(html);
    for (const q of faq) {
      expect(txt).toContain(q.name);
      expect(txt).toContain(q.acceptedAnswer.text);
    }
  });

  it("une source hors liste n'atteint pas le formulaire", async () => {
    const { default: Page } = await charger("fr");
    const html = await rendre(await Page({ searchParams: Promise.resolve({ src: "spam" }) }));
    expect(html).not.toContain('name="src"');
  });

  it("le fondateur est déclaré une fois dans le JSON-LD du layout (Person, rattachée à l'Organization)", () => {
    const src = lire("app/layout.tsx");
    expect(src).toContain('founder: { "@id": `${siteUrl}/#fondateur` }');
    expect(src).toContain('name: "Daniel Leal"');
    const code = src.split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
    expect(code).not.toMatch(/alumniOf|sameAs/);
  });
});

/* ─── Sitemap, liens internes, légal ─────────────────────────────────────────── */

describe("sitemap, maillage interne et confidentialité", () => {
  it("la page est au sitemap, avec SITE_MAJ (jamais la date du build)", async () => {
    vi.resetModules();
    const { default: sitemap } = await import("@/app/sitemap");
    const { SITE_MAJ } = await import("@/lib/prix-maj");
    const e = sitemap().find((x) => x.url === "https://getavyora.fr/accompagnement-travaux");
    expect(e).toMatchObject({ lastModified: SITE_MAJ, priority: 0.8, changeFrequency: "monthly" });
  });

  it("liens posés : pied de page, menu mobile, accueil, guides, fiche projet prix, et pages privées avec leur source", () => {
    const canon = 'href="/accompagnement-travaux"';
    expect(lire("app/layout.tsx")).toContain(canon);
    // L'onglet de l'en-tête (desktop) et la ligne contrastée du menu mobile, juste après le plan (16/11/2026).
    expect(lire("components/accompagnement/OngletAccompagnement.tsx")).toContain('PAGE_ACCOMPAGNEMENT = "/accompagnement-travaux"');
    expect(lire("app/layout.tsx")).toMatch(/<OngletPlan [^\n]*\n(?:[^\n]*\n){2}\s*\{FEATURES\.plans && <OngletAccompagnement label=\{t\.nav\.accompagnementCourt\} \/>\}/);
    const menu = lire("components/MobileMenu.tsx");
    expect(menu.indexOf("href={PAGE_ACCOMPAGNEMENT}")).toBeGreaterThan(menu.indexOf("href={VITRINE_PLAN}"));
    expect(menu.indexOf("href={PAGE_ACCOMPAGNEMENT}")).toBeLessThan(menu.indexOf('href="/projets"'));
    // L'accueil : la section juste sous le hero (et la section du plan), bouton vers le formulaire de rappel, FR et EN.
    const accueil = lire("app/page.tsx");
    expect(accueil.match(/href="\/accompagnement-travaux#demande" class="btn btn-p"/g)).toHaveLength(2);
    expect(accueil.match(/<\/div><\/header><\/div>\$\{FEATURES\.plans \? PLAN_BAND(_EN)? : ""\}\$\{ACCOMP_BAND(_EN)?\}/g)).toHaveLength(2);
    expect(accueil).not.toContain("strip-accomp");
    const guides = lire("app/guides/[slug]/page.tsx");
    expect(guides.match(/<Link href="\/accompagnement-travaux">/g)).toHaveLength(2);
    expect(lire("app/guides/page.tsx")).toContain(canon);
    expect(lire("app/prix-travaux/[projet]/page.tsx")).toContain(canon);
    // Pas sur la matrice [projet]/[ville] ni sur les pages villes (pages programmatiques).
    expect(lire("app/prix-travaux/[projet]/[ville]/page.tsx")).not.toContain("accompagnement-travaux");
    expect(lire("app/prix-renovation/[ville]/page.tsx")).not.toContain("accompagnement-travaux");
    expect(lire("components/ResultatRapide.tsx")).toContain('src="rapide"');
    expect(lire("components/neuf/ResultatRapideNeuf.tsx")).toContain('src="rapide-neuf"');
    expect(lire("components/EstimationResultat.tsx")).toContain('src="suivi"');
    expect(lire("components/Investissement.tsx")).toContain('src="invest"');
  });

  it("le lien des pages privées porte sa source et l'ancre du formulaire", async () => {
    const { lienAccompagnement } = await import("@/lib/accompagnement/constantes");
    expect(lienAccompagnement("rapide")).toBe("/accompagnement-travaux?src=rapide#demande");
    expect(lienAccompagnement()).toBe("/accompagnement-travaux");
  });

  it("/confidentialite décrit le traitement (finalité, base légale, conservation 1 an) et LEGAL_MAJ suit", async () => {
    const src = lire("app/(legal)/confidentialite/page.tsx");
    expect(src).toContain("Répondre à ta demande d&apos;accompagnement et te recontacter");
    expect(src).toContain("Mesures précontractuelles prises à ta demande (art. 6.1.b)");
    expect(src).toContain("<strong>1 an au plus</strong>");
    const { LEGAL_MAJ } = await import("@/lib/prix-maj");
    expect(LEGAL_MAJ.confidentialite).toBe("2026-11-16");
  });
});
