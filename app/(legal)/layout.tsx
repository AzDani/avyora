import Link from "next/link";

export const dynamic = "force-static";

const LIENS = [
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/cgu", label: "Conditions d'utilisation" },
  { href: "/cgv", label: "Conditions de vente" },
  { href: "/confidentialite", label: "Confidentialité (RGPD)" },
  { href: "/cookies", label: "Cookies" },
];

const LEGAL_CSS = `
.av-legal{max-width:760px;margin:0 auto}
.av-legal h1{font-size:28px;font-weight:600;letter-spacing:-.01em;color:var(--color-ink)}
.av-legal .maj{font-size:12.5px;color:var(--color-faint);margin-top:6px}
.av-legal h2{font-size:17px;font-weight:600;color:var(--color-ink);margin:30px 0 8px;scroll-margin-top:90px}
.av-legal h3{font-size:14px;font-weight:600;color:var(--color-ink);margin:18px 0 6px}
.av-legal p,.av-legal li{font-size:14px;line-height:1.7;color:var(--color-muted)}
.av-legal p{margin:8px 0}
.av-legal ul{margin:8px 0;padding-left:20px;display:flex;flex-direction:column;gap:4px}
.av-legal li{list-style:disc}
.av-legal a{color:var(--color-brand-600);text-decoration:underline;text-underline-offset:2px}
.av-legal strong{color:var(--color-ink);font-weight:600}
.av-legal .todo{display:block;border:1px dashed var(--color-brand-300);background:var(--color-brand-50);color:var(--color-brand-800);border-radius:10px;padding:10px 12px;font-size:13px;margin:10px 0}
.av-legal .todo b{font-weight:600}
.av-legal .box{border:1px solid var(--color-line);border-radius:12px;padding:14px 16px;margin:12px 0;background:var(--color-surface-2)}
.av-legal table{width:100%;border-collapse:collapse;margin:12px 0;font-size:13px}
.av-legal th,.av-legal td{text-align:left;border:1px solid var(--color-line);padding:8px 10px;color:var(--color-muted);vertical-align:top}
.av-legal th{background:var(--color-surface-2);color:var(--color-ink);font-weight:600;font-size:12px}
`;

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="av-legal">
      <style dangerouslySetInnerHTML={{ __html: LEGAL_CSS }} />
      <nav className="mb-6 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px]">
        {LIENS.map((l) => (
          <Link key={l.href} href={l.href} className="text-muted transition-colors hover:text-brand-700">
            {l.label}
          </Link>
        ))}
      </nav>
      {children}
      <div className="mt-12 rounded-xl border border-line bg-surface-2 p-4 text-xs leading-relaxed text-faint">
        Ce document est fourni à titre informatif et constitue une base à personnaliser. Avant mise en
        production commerciale, fais-le valider par un professionnel du droit (notamment les clauses de
        vente, d&apos;abonnement et de protection des données).
      </div>
    </div>
  );
}
