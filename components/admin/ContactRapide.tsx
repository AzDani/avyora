import { lienAppel, lienWhatsApp } from "@/lib/admin/outils";

/**
 * Les trois gestes pour joindre quelqu'un depuis l'admin : Appeler, WhatsApp (portable seulement, premier message déjà
 * écrit), E-mail. Rien ne part tout seul : chaque bouton ouvre l'application correspondante.
 */
export default function ContactRapide({
  tel,
  email,
  whatsapp,
  sujet = "Ta demande sur AVYORA",
}: {
  tel?: string | null;
  email?: string | null;
  /** Le premier message WhatsApp (lib/admin/outils.ts, messageWhatsApp). */
  whatsapp?: string;
  sujet?: string;
}) {
  const appel = lienAppel(tel);
  const wa = lienWhatsApp(tel, whatsapp);
  const mail = email && email.includes("@") ? `mailto:${email}?subject=${encodeURIComponent(sujet)}` : null;
  if (!appel && !wa && !mail) return null;
  const cls =
    "inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-[12.5px] font-semibold text-ink transition-colors hover:border-brand-600 hover:text-brand-700";
  return (
    <div className="flex flex-wrap gap-1.5" data-contact-rapide="">
      {appel && (
        <a href={appel} className={cls}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M5.2 2.5 3.6 2.6a1.4 1.4 0 0 0-1.3 1.5c.4 5.1 4.5 9.2 9.6 9.6a1.4 1.4 0 0 0 1.5-1.3l.1-1.6a1 1 0 0 0-.7-1l-2-.6a1 1 0 0 0-1 .3l-.7.8a7.4 7.4 0 0 1-3.6-3.6l.8-.7a1 1 0 0 0 .3-1l-.6-2a1 1 0 0 0-1-.7Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
          </svg>
          Appeler
        </a>
      )}
      {wa && (
        <a href={wa} target="_blank" rel="noopener noreferrer" className={cls}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 1.8a6.2 6.2 0 0 0-5.4 9.3L1.8 14.2l3.2-.8A6.2 6.2 0 1 0 8 1.8Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            <path d="M6 5.6c.2-.4.6-.4.8 0l.4.9c.1.2 0 .5-.2.7l-.3.3c.4.8 1 1.4 1.8 1.8l.3-.3c.2-.2.5-.3.7-.2l.9.4c.4.2.4.6 0 .8-.6.5-1.3.6-2 .3A5.6 5.6 0 0 1 5.7 7.6c-.3-.7-.2-1.4.3-2Z" fill="currentColor" />
          </svg>
          WhatsApp
          <span className="sr-only"> (nouvel onglet)</span>
        </a>
      )}
      {mail && (
        <a href={mail} className={cls}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="2" y="3.5" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="m2.5 4.5 5.5 4 5.5-4" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
          </svg>
          E-mail
        </a>
      )}
    </div>
  );
}
