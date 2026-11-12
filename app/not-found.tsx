import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { metaSelonLangue } from "@/lib/i18n/meta";

/** Le titre d'onglet suit la langue, comme la page (revue anglais, constats 41 et 121). */
export async function generateMetadata() {
  const { locale, t } = await getT();
  return metaSelonLangue(locale, { title: t.introuvable.titre }, { title: t.introuvable.titre });
}

export default async function NotFound() {
  const t = (await getT()).t.introuvable;
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <p className="data text-5xl font-bold text-brand-200">404</p>
      <h1 className="mt-4 text-2xl font-semibold text-ink">{t.titre}</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">{t.texte}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn btn-primary py-2.5">{t.accueil}</Link>
        <Link href="/projets/nouveau" className="btn btn-outline py-2.5">{t.estimer}</Link>
      </div>
    </div>
  );
}
