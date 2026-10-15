import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { BoutonConfirmer } from "@/components/auth/ConfirmerLien";
import { confirmerLien } from "@/lib/actions/auth";
import { COOKIE_LIEN, lireLienEnAttente } from "@/lib/auth-lien";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Lien d'accès", robots: { index: false, follow: false } };

/**
 * Le lien d'accès au format token_hash, juste avant d'entrer (B2). /auth/confirm a rangé le lien dans un cookie et
 * renvoyé ici, à une adresse SANS le jeton. Le jeton n'est consommé qu'au clic sur le bouton (`confirmerLien`) : les
 * robots des messageries qui ouvrent les liens pour les vérifier ne le brûlent pas. Sans lien en attente (cookie
 * expiré, page rouverte), /connexion propose un nouveau lien.
 */
export default async function ConfirmerLienPage() {
  const [{ t: tr }, cookieStore] = await Promise.all([getT(), cookies()]);
  const lien = lireLienEnAttente(cookieStore.get(COOKIE_LIEN)?.value);
  if (!lien) redirect("/connexion?erreur=lien_invalide");
  const t = tr.auth.confirmer;
  const [sousTitre, bouton] =
    lien.type === "recovery"
      ? [t.sousMotDePasse, t.boutonMotDePasse]
      : lien.type === "email_change"
        ? [t.sousAdresse, t.boutonAdresse]
        : [t.sousEntree, t.boutonEntree];

  return (
    <AuthShell eyebrow={t.eyebrow} titre={t.titre} sousTitre={sousTitre} bas={t.pasToi}>
      <form action={confirmerLien} className="space-y-4" data-confirmer-lien="">
        <BoutonConfirmer libelle={bouton} enCours={t.enCours} />
        <p className="text-[12.5px] leading-snug text-muted">{t.pourquoi}</p>
      </form>
    </AuthShell>
  );
}
