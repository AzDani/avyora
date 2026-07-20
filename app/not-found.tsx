import Link from "next/link";

export const metadata = { title: "Page introuvable" };

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <p className="data text-5xl font-bold text-brand-200">404</p>
      <h1 className="mt-4 text-2xl font-semibold text-ink">Page introuvable</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">
        La page que tu cherches n&apos;existe pas ou a été déplacée.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn btn-primary py-2.5">Retour à l&apos;accueil</Link>
        <Link href="/projets/nouveau" className="btn btn-outline py-2.5">Estimer un projet</Link>
      </div>
    </div>
  );
}
