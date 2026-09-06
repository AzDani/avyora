import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { AuthNav } from "@/components/auth/AuthNav";
import { FEATURES } from "@/lib/features";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const description =
  "Estime le coût de tes travaux de rénovation au prix du marché français, fais analyser tes devis par l'IA et calcule ta rentabilité locative — avant de signer.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "AVYORA — estime tes travaux avant de signer",
    template: "%s · AVYORA",
  },
  description,
  applicationName: "AVYORA",
  keywords: [
    "estimation travaux",
    "prix rénovation",
    "analyse de devis",
    "rentabilité locative",
    "investissement immobilier",
    "coût rénovation maison",
    "budget travaux",
  ],
  authors: [{ name: "AVYORA" }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: siteUrl,
    siteName: "AVYORA",
    title: "AVYORA — sache ce que ça coûte. Avant de signer.",
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: "AVYORA — estime tes travaux avant de signer",
    description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
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
        <header className="sticky top-0 z-40 bg-canvas px-3 pb-2 pt-3 sm:px-4 sm:pt-4">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between rounded-2xl border border-white/10 bg-[#1E1B4B] px-4 shadow-[0_10px_30px_-12px_rgba(30,27,75,0.55)] sm:px-6">
            <Wordmark />
            <nav className="flex items-center gap-1 text-sm">
              <Link
                href="/projets"
                className="rounded-lg px-3 py-1.5 text-indigo-200/90 transition-colors hover:bg-white/10 hover:text-white"
              >
                Projets
              </Link>
              {FEATURES.artisans && (
                <Link
                  href="/artisans"
                  className="rounded-lg px-3 py-1.5 text-indigo-200/90 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Artisans
                </Link>
              )}
              <AuthNav />
              <Link href="/projets/nouveau" className="btn btn-primary ml-1 py-2">
                Nouveau projet
              </Link>
            </nav>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">{children}</main>

        <footer className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
          <div className="border-t border-line pt-6">
            <nav className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-muted">
              <Link href="/mentions-legales" className="transition-colors hover:text-brand-700">Mentions légales</Link>
              <Link href="/cgu" className="transition-colors hover:text-brand-700">CGU</Link>
              <Link href="/cgv" className="transition-colors hover:text-brand-700">CGV</Link>
              <Link href="/confidentialite" className="transition-colors hover:text-brand-700">Confidentialité</Link>
              <Link href="/cookies" className="transition-colors hover:text-brand-700">Cookies</Link>
              <Link href="/tarifs" className="transition-colors hover:text-brand-700">Tarifs</Link>
            </nav>
            <p className="mt-4 text-xs leading-relaxed text-faint">
              © {new Date().getFullYear()} AVYORA · Estimations indicatives basées sur le référentiel de prix
              AVYORA (France&nbsp;2026). À confirmer par des devis d&apos;artisans.
            </p>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
