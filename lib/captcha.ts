/**
 * CAPTCHA des formulaires d'accès (Cloudflare Turnstile), PRÉPARÉ mais éteint : il ne s'allume qu'avec
 * `NEXT_PUBLIC_TURNSTILE_SITE_KEY` dans Vercel (clé publique du site Turnstile, lue au build : redéployer).
 *
 * Pourquoi : les limites du site (lib/ratelimit.ts) ne valent que pour ses formulaires. L'URL de Supabase et la clé
 * publique sont dans le code du navigateur : un robot peut demander des liens d'accès à Supabase directement, et seul
 * le CAPTCHA de Supabase (Authentication → Attack Protection) l'en empêche. Or, dès qu'il est activé là-bas, Supabase
 * REFUSE toute inscription, connexion, lien ou mot de passe oublié qui n'apporte pas de jeton : le site doit donc
 * transmettre le jeton (`captchaToken`) AVANT que Dani ne l'active (docs/beta.md §4, point 9, et §6).
 *
 * Sans clé : aucun script tiers, aucun champ, les actions n'envoient rien de plus (le site d'avant).
 */
export const CLE_CAPTCHA = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

/** L'origine de Turnstile (script et fenêtre), à autoriser dans la CSP quand la clé est là (next.config.ts). */
export const ORIGINE_CAPTCHA = "https://challenges.cloudflare.com";

/** Le champ caché que Turnstile ajoute au formulaire, avec le jeton. */
export const CHAMP_CAPTCHA = "cf-turnstile-response";

/** Le jeton reçu d'un formulaire, s'il est là et d'une forme plausible (caractères visibles, 4 096 au plus). */
export function jetonCaptcha(v: unknown): string | undefined {
  const s = typeof v === "string" ? v.trim() : "";
  return s && s.length <= 4096 && /^[\x21-\x7e]+$/.test(s) ? s : undefined;
}
