"use server";

import { clientIp, verifierLimite } from "@/lib/ratelimit";
import { empreinteAdresse } from "@/lib/empreinte";
import { journaliser } from "@/lib/audit";
import { emailAccuseAccompagnement, emailDemandeAccompagnement, envoyerEmailSuivi, type IssueEnvoi } from "@/lib/email";
import { getLocale } from "@/lib/i18n/server";
import { validerDemande } from "@/lib/accompagnement/schema";
import { verifierJeton } from "@/lib/accompagnement/jeton";
import { LIBELLES_INTERNES } from "@/lib/accompagnement/contenu";
import { CHAMP_JETON, CHAMP_PIEGE, CHEMIN_ACCOMPAGNEMENT, DESTINATAIRE_DEFAUT, type EtatDemande } from "@/lib/accompagnement/constantes";

/**
 * Demande de rappel de la page /accompagnement-travaux (useActionState, components/accompagnement/FormulaireAccompagnement.tsx).
 *
 * Dans l'ordre, sans clé externe :
 * 1. champ piège rempli → faux succès, RIEN n'est envoyé (un robot ne doit pas apprendre qu'il est repéré) ;
 * 2. jeton signé du formulaire (lib/accompagnement/jeton.ts) : falsifié → faux succès ; envoyé moins de 3 s après
 *    l'affichage → refus visible (un humain renvoie, un robot non) ; page ouverte depuis plus de 48 h → « recharge » ;
 * 3. validation zod (lib/accompagnement/schema.ts) : erreurs PAR CHAMP, des codes que le client traduit ;
 * 4. limite de débit `contact` (lib/ratelimit.ts) par IP puis par adresse (en empreinte) : seules les demandes valides
 *    la consomment ;
 * 5. e-mail à Daniel (destinataire = constante, ou ACCOMPAGNEMENT_TO), reply-to = l'adresse VALIDÉE ; puis, s'il est
 *    parti, l'accusé de réception à la personne (reply-to = Daniel). Aucun autre en-tête ne vient du formulaire, et tout
 *    ce que la personne a tapé est échappé dans le HTML (lib/email.ts) ;
 * 6. trace dans le journal (lib/audit.ts), dans tous les cas, pour ne rien perdre si l'e-mail échoue.
 */

/** Le faux succès (piège, jeton falsifié) : la même réponse qu'un vrai envoi, rien n'est parti. */
function reponseSilencieuse(fd: FormData): EtatDemande {
  const p = fd.get("prenom");
  return { statut: "ok", prenom: typeof p === "string" ? p.trim().slice(0, 40) : "" };
}

function destinataire(): string {
  const v = process.env.ACCOMPAGNEMENT_TO?.trim();
  return v && /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(v) ? v : DESTINATAIRE_DEFAUT;
}

function urlSite(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

/** Hors production, Resend absent n'est pas une panne (poste local, préversion sans clé) : le formulaire dit « envoyé ». */
function envoiReussi(issue: IssueEnvoi): boolean {
  return issue === "envoye" || (issue === "non_configure" && process.env.VERCEL_ENV !== "production");
}

export async function demanderAccompagnement(_prec: EtatDemande, fd: FormData): Promise<EtatDemande> {
  // 1. Le piège : un humain ne voit pas ce champ, un robot le remplit.
  const piege = fd.get(CHAMP_PIEGE);
  if (typeof piege === "string" && piege.trim() !== "") return reponseSilencieuse(fd);

  // 2. Le délai minimal, par le jeton signé.
  const jeton = verifierJeton(fd.get(CHAMP_JETON));
  if (jeton === "invalide") return reponseSilencieuse(fd);
  if (jeton === "trop_rapide") return { statut: "erreur", global: "trop_rapide" };
  if (jeton === "expire") return { statut: "erreur", global: "expire" };

  // 3. La validation.
  const v = validerDemande(fd);
  if (!v.ok) return { statut: "erreur", champs: v.champs };
  const d = v.demande;

  // 4. La limite de débit (IP, puis adresse).
  const ip = await clientIp();
  if (!(await verifierLimite("contact", `ip:${ip}`)) || !(await verifierLimite("contact", `adresse:${empreinteAdresse(d.email)}`))) {
    return { statut: "erreur", global: "limite" };
  }

  // 5. Les e-mails.
  const locale = await getLocale();
  const recueLe = new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "full", timeStyle: "short" });
  const interne = emailDemandeAccompagnement({
    prenom: d.prenom,
    email: d.email,
    telephone: d.telephone || undefined,
    typeProjet: LIBELLES_INTERNES.types[d.typeProjet],
    besoins: d.besoins.map((b) => LIBELLES_INTERNES.besoins[b]),
    message: d.message || undefined,
    source: d.src,
    langue: locale === "en" ? "anglais" : "français",
    recueLe,
  });
  const issueInterne = await envoyerEmailSuivi({ to: destinataire(), subject: interne.subject, html: interne.html, replyTo: d.email });
  const ok = envoiReussi(issueInterne);

  let issueAccuse: IssueEnvoi | "non_tente" = "non_tente";
  if (ok) {
    const accuse = emailAccuseAccompagnement({ prenom: d.prenom, locale, pageUrl: `${urlSite()}${CHEMIN_ACCOMPAGNEMENT}` });
    issueAccuse = await envoyerEmailSuivi({ to: d.email, subject: accuse.subject, html: accuse.html, replyTo: destinataire() });
  }

  // 6. La trace, toujours (best-effort : journaliser n'échoue jamais).
  await journaliser("demande_accompagnement", {
    email: d.email,
    payload: {
      prenom: d.prenom,
      ...(d.telephone ? { telephone: d.telephone } : {}),
      type_projet: d.typeProjet,
      besoins: d.besoins,
      src: d.src ?? null,
      langue: locale,
      envoi_interne: issueInterne,
      envoi_accuse: issueAccuse,
      ...(issueInterne !== "envoye" && d.message ? { message: d.message } : {}),
    },
  });

  if (!ok) return { statut: "erreur", global: "envoi" };
  return { statut: "ok", prenom: d.prenom };
}
