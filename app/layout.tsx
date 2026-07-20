import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { AuthNav } from "@/components/auth/AuthNav";
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

function Wordmark() {
  return (
    <Link
      href="/"
      className="group flex items-center gap-2.5 text-lg font-semibold tracking-[0.14em]"
    >
      <svg
        width="30"
        height="30"
        viewBox="0 0 64 64"
        aria-hidden="true"
        className="transition-transform duration-300 group-hover:scale-105"
      >
        <rect x="2" y="2" width="60" height="60" rx="14" fill="#4F46E5" />
        <path d="M17 45 L32 15 L47 45" fill="none" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="32" cy="39" r="4.5" fill="#C4B5FD" />
      </svg>
      <span className="text-white">
        AVY<span className="text-[#A78BFA]">ORA</span>
      </span>
    </Link>
  );
}

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
      <body className="flex min-h-full flex-col">
        <header className="sticky top-0 z-40 bg-[#1E1B4B]/95 backdrop-blur-md supports-[backdrop-filter]:bg-[#1E1B4B]/85">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
            <Wordmark />
            <nav className="flex items-center gap-1 text-sm">
              <Link
                href="/projets"
                className="rounded-lg px-3 py-1.5 text-indigo-200/90 transition-colors hover:bg-white/10 hover:text-white"
              >
                Projets
              </Link>
              <Link
                href="/artisans"
                className="rounded-lg px-3 py-1.5 text-indigo-200/90 transition-colors hover:bg-white/10 hover:text-white"
              >
                Artisans
              </Link>
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
              <AuthNav />
              <Link href="/projets/nouveau" className="btn btn-primary ml-1 py-2">
                Nouveau projet
              </Link>
            </nav>
          </div>
          <div className="h-px w-full bg-gradient-to-r from-transparent via-[#8B5CF6]/40 to-transparent" />
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">{children}</main>

        <footer className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
          <div className="border-t border-line pt-6 text-xs leading-relaxed text-faint">
            Estimations indicatives basées sur le référentiel de prix AVYORA v0
            (France&nbsp;2026). À confirmer par des devis d&apos;artisans.
          </div>
        </footer>
      </body>
    </html>
  );
}
