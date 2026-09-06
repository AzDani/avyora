import "server-only";
import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";
import { dict } from "./dictionaries";

/**
 * Langue courante (serveur). Priorité à l'en-tête `x-av-locale` posé par le middleware (fiable en
 * prod), avec repli sur le cookie av-lang (dev direct / contextes hors middleware). FR par défaut.
 */
export async function getLocale(): Promise<Locale> {
  const h = await headers();
  const fromHeader = h.get("x-av-locale");
  if (isLocale(fromHeader)) return fromHeader;
  const c = await cookies();
  const v = c.get(LOCALE_COOKIE)?.value;
  return isLocale(v) ? v : DEFAULT_LOCALE;
}

/** Raccourci : langue + dictionnaire pour un composant serveur. */
export async function getT() {
  const locale = await getLocale();
  return { locale, t: dict(locale) };
}
