import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";
import { dict } from "./dictionaries";

/** Langue courante (serveur), depuis le cookie av-lang. FR par défaut. */
export async function getLocale(): Promise<Locale> {
  const c = await cookies();
  const v = c.get(LOCALE_COOKIE)?.value;
  return isLocale(v) ? v : DEFAULT_LOCALE;
}

/** Raccourci : langue + dictionnaire pour un composant serveur. */
export async function getT() {
  const locale = await getLocale();
  return { locale, t: dict(locale) };
}
