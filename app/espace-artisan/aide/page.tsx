import Link from "next/link";
import type { Metadata } from "next";
import { artisanValideOuRetour } from "@/lib/reseau/espace";
import { EXPIRATION_JOURS, MAX_ARTISANS, RELANCE_JOURS } from "@/lib/reseau/demande";
import { ControleAvis } from "@/components/reseau/avis/Affichage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Comment ça marche · Espace artisan", robots: { index: false, follow: false } };

const ETAPES: [string, string][] = [
  ["Un client de ta zone te choisit", `Il voit les artisans validés de son département qui font son métier, avec leurs avis et leurs réalisations, et en choisit jusqu'à ${MAX_ARTISANS}. Tu reçois un e-mail.`],
  [`Tu as ${EXPIRATION_JOURS} jours pour répondre`, `Un rappel part au bout de ${RELANCE_JOURS} jours. Sans réponse, la demande est proposée à un autre artisan.`],
  ["Tu acceptes : vous échangez vos coordonnées", "Avant ça, le client ne voit pas ton numéro et tu ne vois pas le sien."],
  ["Tu envoies ton devis, il suit tout", "Préviens-nous quand ton devis est parti. Le client indique s'il l'a reçu, puis s'il a signé, et peut laisser un avis."],
];

/** Les règles du Réseau AVYORA, au même endroit, pour l'artisan validé. */
export default async function PageAide() {
  await artisanValideOuRetour();
  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow">Espace artisan</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-ink sm:text-[32px]">Comment ça marche</h1>
        <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-muted">Les règles du Réseau AVYORA, au même endroit.</p>
      </div>
      <ol className="space-y-4 rounded-3xl border border-line bg-surface p-5">
        {ETAPES.map(([t, d], i) => (
          <li key={t} className="grid grid-cols-[30px_1fr] gap-3">
            <span className="num grid h-[30px] w-[30px] place-items-center rounded-full bg-brand-600 text-[13px] font-bold text-white">{i + 1}</span>
            <span>
              <span className="block text-[14.5px] font-semibold text-ink">{t}</span>
              <span className="block text-[13.5px] leading-relaxed text-muted">{d}</span>
            </span>
          </li>
        ))}
      </ol>
      <ControleAvis />
      <p className="rounded-2xl bg-brand-50 px-4 py-3 text-[13.5px] text-brand-900">
        Le réseau est gratuit pendant le lancement : tu ne paies rien pour recevoir des demandes. Les conditions complètes :{" "}
        <Link href="/conditions-reseau" className="font-semibold underline">conditions du Réseau AVYORA</Link>.
      </p>
    </div>
  );
}
