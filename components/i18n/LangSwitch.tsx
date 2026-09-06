"use client";

import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";
import { useLocale } from "./LangProvider";

/**
 * Sélecteur de langue FR/EN, discret. Pose le cookie av-lang puis rafraîchit (re-render serveur
 * avec la nouvelle langue). `tone` adapte les couleurs au fond (clair = footer, sombre = menu nuit).
 */
export default function LangSwitch({ tone = "light" }: { tone?: "light" | "dark" }) {
  const router = useRouter();
  const locale = useLocale();

  function set(l: Locale) {
    if (l === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    router.refresh();
  }

  const base = tone === "dark" ? "text-indigo-200/70" : "text-faint";
  const active = tone === "dark" ? "text-white" : "text-ink";

  return (
    <div className="inline-flex items-center gap-1.5 text-xs font-medium" role="group" aria-label="Language">
      <button
        type="button"
        onClick={() => set("fr")}
        aria-pressed={locale === "fr"}
        className={`transition-colors ${locale === "fr" ? `${active} font-semibold` : `${base} hover:${active}`}`}
      >
        FR
      </button>
      <span className={base} aria-hidden="true">·</span>
      <button
        type="button"
        onClick={() => set("en")}
        aria-pressed={locale === "en"}
        className={`transition-colors ${locale === "en" ? `${active} font-semibold` : `${base} hover:${active}`}`}
      >
        EN
      </button>
    </div>
  );
}
