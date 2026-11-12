/**
 * La table de correspondance des erreurs de Supabase (lib/auth-messages.ts) : chaque erreur courante a un message clair,
 * tutoyé, en français et en anglais ; jamais le texte brut de Supabase. Et l'annonce d'un mot de passe désactivé par
 * sécurité (lib/auth-lien.ts, `mdpDesactiveAAnnoncer`).
 */
import { describe, it, expect } from "vitest";
import { MESSAGES_AUTH, cleErreurAuth, intervalleParAdresse, messageAuth, messageCompteCree } from "@/lib/auth-messages";
import { mdpDesactiveAAnnoncer, lienMdpDesactive, issueEnvoi } from "@/lib/auth-lien";
import { dict } from "@/lib/i18n/dictionaries";

describe("lib/auth-messages : les erreurs de Supabase traduites", () => {
  it("chaque code courant a sa clé", () => {
    const cas: [Parameters<typeof cleErreurAuth>[0], string][] = [
      [{ code: "invalid_credentials", status: 400, message: "Invalid login credentials" }, "identifiants"],
      [{ status: 400, message: "Invalid login credentials" }, "identifiants"],
      [{ code: "email_not_confirmed", status: 400, message: "Email not confirmed" }, "nonConfirme"],
      [{ code: "over_email_send_rate_limit", status: 429, message: "Email rate limit exceeded" }, "saturation"],
      [{ code: "over_email_send_rate_limit", status: 429, message: "For security purposes, you can only request this after 52 seconds." }, "tropDeTentatives"],
      [{ code: "over_request_rate_limit", status: 429 }, "saturation"],
      [{ status: 429 }, "saturation"],
      [{ code: "captcha_failed", status: 400 }, "captcha"],
      [{ code: "same_password", status: 422, message: "New password should be different from the old password." }, "memeMotDePasse"],
      [{ code: "weak_password", status: 422 }, "motDePasseFaible"],
      [{ code: "email_address_invalid", status: 400 }, "emailInvalide"],
      [{ code: "session_not_found", status: 403 }, "lienExpire"],
      [{ message: "Auth session missing!" }, "lienExpire"],
      [{ code: "signup_disabled", status: 422 }, "inscriptionsFermees"],
      [{ code: "unexpected_failure", status: 500, message: "Database error saving new user" }, "inconnue"],
      [null, "inconnue"],
    ];
    for (const [erreur, cle] of cas) expect(cleErreurAuth(erreur), JSON.stringify(erreur)).toBe(cle);
  });

  it("jamais le texte de Supabase à l'écran ; les deux langues ont les mêmes clés ; le français tutoie", () => {
    const brut = { code: "unexpected_failure", status: 500, message: "Database error saving new user" };
    expect(messageAuth(brut, "fr")).toBe(MESSAGES_AUTH.fr.inconnue);
    expect(messageAuth(brut, "en")).toBe(MESSAGES_AUTH.en.inconnue);
    expect(Object.keys(MESSAGES_AUTH.en).sort()).toEqual(Object.keys(MESSAGES_AUTH.fr).sort());
    for (const x of Object.values(MESSAGES_AUTH.fr)) expect(x, x).not.toMatch(/\bvous\b|\bvotre\b|\bvos\b/i);
    // Le mot de passe trop faible annonce les règles COMPLÈTES, comme l'aide sous le champ.
    expect(MESSAGES_AUTH.fr.motDePasseFaible).toContain(dict("fr").auth.mdpRegles.replace(/\.$/, "").toLowerCase());
  });

  it("l'intervalle par adresse se reconnaît à son texte (même code que la limite globale)", () => {
    expect(intervalleParAdresse({ message: "For security purposes, you can only request this after 52 seconds." })).toBe(true);
    expect(intervalleParAdresse({ message: "Email rate limit exceeded" })).toBe(false);
    expect(intervalleParAdresse(null)).toBe(false);
    // Le lien d'accès suit la même règle (issueEnvoi).
    expect(issueEnvoi({ code: "over_email_send_rate_limit", message: "Email rate limit exceeded" })).toBe("saturation");
  });

  it("« ramènera à ton abonnement » seulement quand l'appelant le dit (hors bêta)", () => {
    expect(messageCompteCree("fr", false)).toMatch(/te connectera directement\.$/);
    expect(messageCompteCree("fr", true)).toMatch(/à ton abonnement\.$/);
    expect(messageCompteCree("en", false)).toMatch(/^Account created!/);
  });
});

describe("lib/auth-lien : le mot de passe désactivé par sécurité, annoncé (constat 19)", () => {
  it("annoncé à un inscrit au mot de passe à la confirmation, et à tout changement d'adresse ; jamais à un inscrit par le lien", () => {
    const mdp = { user_metadata: { inscription: "mot_de_passe" } };
    const lien = { user_metadata: { inscription: "lien" } };
    expect(mdpDesactiveAAnnoncer("confirmation", mdp)).toBe(true);
    expect(mdpDesactiveAAnnoncer("confirmation", lien)).toBe(false);
    expect(mdpDesactiveAAnnoncer("confirmation", {})).toBe(false);
    expect(mdpDesactiveAAnnoncer("changement", lien)).toBe(true);
    expect(mdpDesactiveAAnnoncer("noter", mdp)).toBe(false);
    expect(mdpDesactiveAAnnoncer(null, mdp)).toBe(false);
    expect(lienMdpDesactive("/projets/nouveau/detaille?affiner=1")).toBe("/auth/mot-de-passe-desactive?next=%2Fprojets%2Fnouveau%2Fdetaille%3Faffiner%3D1");
  });

  it("les textes existent dans les deux langues, sans « vous »", () => {
    const fr = dict("fr").auth;
    const en = dict("en").auth;
    expect(Object.keys(en.mdpDesactive).sort()).toEqual(Object.keys(fr.mdpDesactive).sort());
    for (const x of [...Object.values(fr.mdpDesactive), fr.verifier.mdpDesactive, fr.mdpRegles]) expect(x, x).not.toMatch(/\bvous\b|\bvotre\b|\bvos\b/i);
    // Le panneau des pages d'accès ne cite plus les artisans (FEATURES.artisans est éteint, constat 94).
    expect(JSON.stringify(fr.panneau)).not.toMatch(/artisan/i);
    expect(JSON.stringify(en.panneau)).not.toMatch(/contractor/i);
  });
});
