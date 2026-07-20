import Link from "next/link";
import { getAdmin } from "@/lib/auth";

/** Lien « Personnaliser » (édition du référentiel/questionnaire global) — visible aux admins seulement. */
export async function AdminLink() {
  const admin = await getAdmin();
  if (!admin) return null;
  return (
    <Link
      href="/admin/parcours"
      title="Personnaliser le questionnaire"
      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-indigo-200/90 transition-colors hover:bg-white/10 hover:text-white"
    >
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M2.5 4.5h7M11.5 4.5h2M2.5 11.5h2M6.5 11.5h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="10" cy="4.5" r="1.6" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="5" cy="11.5" r="1.6" stroke="currentColor" strokeWidth="1.4" />
      </svg>
      <span className="hidden sm:inline">Personnaliser</span>
    </Link>
  );
}
