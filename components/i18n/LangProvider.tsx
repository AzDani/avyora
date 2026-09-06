"use client";

import { createContext, useContext } from "react";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { dict, type Dict } from "@/lib/i18n/dictionaries";

const Ctx = createContext<{ locale: Locale; t: Dict }>({
  locale: DEFAULT_LOCALE,
  t: dict(DEFAULT_LOCALE),
});

/** Fournit la langue (issue du serveur) aux composants CLIENT via le contexte React. */
export function LangProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <Ctx.Provider value={{ locale, t: dict(locale) }}>{children}</Ctx.Provider>;
}

export function useLocale(): Locale {
  return useContext(Ctx).locale;
}

/** Dictionnaire courant pour un composant client. */
export function useT(): Dict {
  return useContext(Ctx).t;
}
