import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { suiteVerification } from "@/lib/auth-lien";
import { getUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { premierParam } from "@/lib/next-url";

export async function generateMetadata() {
  return { title: (await getT()).t.auth.mdpDesactive.metaTitre, robots: { index: false, follow: false } };
}

/**
 * « Ton mot de passe a été désactivé » : au retour d'un lien, `controlerArrivee` (lib/auth-arrivee.ts) a remplacé le
 * mot de passe par un aléa (adresse confirmée dans un navigateur qui ne l'avait pas choisi : la protection contre le
 * compte préparé à l'avance). Avant, rien ne le disait : la personne tapait ensuite le mot de passe choisi deux minutes
 * plus tôt et lisait « incorrect ». Ici, on le dit, on propose d'en choisir un nouveau tout de suite (la session est
 * ouverte : /reset/definir l'accepte), ou de continuer vers l'intention (assainie, hors /auth).
 *
 * Quand l'arrivée est « à vérifier », c'est /auth/verifier qui le dit (`?mdp=desactive`) : pas de page en plus.
 */
export default async function MotDePasseDesactivePage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const [sp, { t: tr }, user] = await Promise.all([searchParams, getT(), getUser()]);
  const next = suiteVerification(premierParam(sp.next));
  if (!user) redirect("/connexion");
  const t = tr.auth.mdpDesactive;

  return (
    <AuthShell eyebrow={t.eyebrow} titre={t.titre}>
      <div className="space-y-4" data-mdp-desactive="">
        <p className="text-[14px] leading-relaxed text-muted">{t.texte}</p>
        <p className="text-[13.5px] leading-relaxed text-muted">{t.aide}</p>
        <Link href="/reset/definir" className="btn btn-primary w-full justify-center py-3">{t.choisir}</Link>
        <Link href={next} className="btn btn-outline w-full justify-center py-3">{t.continuer}</Link>
      </div>
    </AuthShell>
  );
}
