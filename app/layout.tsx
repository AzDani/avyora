import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AVYORA — copilote rénovation & investissement",
  description:
    "Estime tes travaux, fais analyser tes devis par l'IA, calcule ta rentabilité locative.",
  appleWebApp: {
    capable: true,
    title: "AVYORA",
    statusBarStyle: "black-translucent",
  },
};

export const viewport = {
  themeColor: "#1E1B4B",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <header className="bg-[#1E1B4B] text-white">
          <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 font-semibold text-lg tracking-[0.15em]">
              <svg width="28" height="28" viewBox="0 0 64 64" aria-hidden="true">
                <rect x="2" y="2" width="60" height="60" rx="14" fill="#4F46E5" />
                <path d="M17 45 L32 15 L47 45" fill="none" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="32" cy="39" r="4.5" fill="#C4B5FD" />
              </svg>
              <span>
                AVY<span className="text-[#A78BFA]">ORA</span>
              </span>
            </Link>
            <nav className="flex items-center gap-4 text-sm text-indigo-200/90">
              <Link href="/projets" className="hover:text-white">
                Projets
              </Link>
              <Link href="/artisans" className="hover:text-white">
                Artisans
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-3xl px-4 py-6 flex-1">{children}</main>
        <footer className="mx-auto w-full max-w-3xl px-4 py-6 text-xs text-slate-400">
          Estimations indicatives basées sur le référentiel de prix AVYORA v0
          (France 2026). Toujours confirmer par des devis. Personnalise tes questions
          directement dans le formulaire (bouton « Personnaliser »).
        </footer>
      </body>
    </html>
  );
}
