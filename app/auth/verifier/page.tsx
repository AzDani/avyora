import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { RangementEnAttente } from "@/components/auth/RangementEnAttente";
import { continuerArrivee, refuserArrivee } from "@/lib/actions/auth";
import { COOKIE_VERIFIER, suiteVerification } from "@/lib/auth-lien";
import { getUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  return { title: (await getT()).t.auth.verifier.metaTitre, robots: { index: false, follow: false } };
}

/**
 * « C'est bien ton compte ? » (B2, contre-examen) : un lien d'accès vient d'ouvrir une session dans un navigateur qui ne
 * l'avait pas demandé, ou par-dessus une autre session (lib/actions/auth.ts, `confirmerLien`). Un lien relayé par
 * quelqu'un d'autre y ouvrirait SA session : l'estimation ou le plan de ce navigateur partiraient dans son compte, et
 * tout ce qui serait saisi ensuite aussi. La page montre l'adresse du compte ouvert, EN ENTIER (c'est la sienne s'il
 * l'a demandé ailleurs ; un tiers ne peut pas la maquiller), puis « Oui, c'est mon compte » ou « Ce n'est pas moi ».
 * Tant que ce choix n'est pas fait, le proxy ramène ici toute page : rien n'est rangé avant.
 *
 * Cas normal (lien demandé sur l'ordinateur, ouvert sur le téléphone) : un clic de plus, « Oui, c'est mon compte ».
 */
export default async function VerifierPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [{ next: nextDemande }, { t: tr }, user, cookieStore] = await Promise.all([searchParams, getT(), getUser(), cookies()]);
  const next = suiteVerification(nextDemande);
  if (!user) redirect("/connexion");
  if (!cookieStore.get(COOKIE_VERIFIER)?.value) redirect(next);
  const t = tr.auth.verifier;

  return (
    <AuthShell eyebrow={t.eyebrow} titre={t.titre}>
      <div className="space-y-4" data-verifier-arrivee="">
        <div className="rounded-field border border-line bg-surface-2 px-4 py-3">
          <p className="text-[13px] text-muted">{t.connecteAvec}</p>
          <p className="mt-0.5 break-words text-[16px] font-semibold text-ink" data-verifier-adresse="">{user.email}</p>
        </div>
        <p className="text-[13.5px] leading-relaxed text-muted">{t.pourquoi}</p>
        <RangementEnAttente texte={t.rangement} />
        <form action={continuerArrivee}>
          <input type="hidden" name="next" value={next} />
          <button type="submit" className="btn btn-primary w-full py-3" data-verifier-continuer="">{t.continuer}</button>
        </form>
        <form action={refuserArrivee}>
          <button type="submit" className="btn btn-outline w-full py-3" data-verifier-pas-moi="">{t.pasMoi}</button>
        </form>
        <p className="text-[12.5px] leading-snug text-muted">{t.pasMoiAide}</p>
      </div>
    </AuthShell>
  );
}
