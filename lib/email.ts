import "server-only";
import { Resend } from "resend";

let _r: Resend | null = null;
function client(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!_r) _r = new Resend(key);
  return _r;
}
const from = () => process.env.RESEND_FROM || "AVYORA <onboarding@resend.dev>";

/** Envoi best-effort. No-op silencieux si Resend n'est pas configuré (dev/test sans clé). */
export async function envoyerEmail(to: string, subject: string, html: string): Promise<void> {
  await envoyerEmailSuivi({ to, subject, html });
}

/** L'issue d'un envoi : parti chez Resend, Resend absent (dev, test, clé manquante), ou refusé / en erreur. */
export type IssueEnvoi = "envoye" | "non_configure" | "echec";

/**
 * Envoi avec son issue (la demande d'accompagnement doit savoir si l'e-mail est parti). `replyTo` : une adresse
 * VALIDÉE par l'appelant, jamais une valeur brute du formulaire. Resend ne lève pas d'exception pour un refus de l'API :
 * il renvoie `{ error }`, lu ici.
 */
export async function envoyerEmailSuivi(opts: { to: string; subject: string; html: string; replyTo?: string }): Promise<IssueEnvoi> {
  const r = client();
  if (!r || !opts.to) {
    console.log("[email non envoyé — Resend non configuré]", opts.subject, "→", opts.to || "(pas de destinataire)");
    return "non_configure";
  }
  try {
    const res = await r.emails.send({
      from: from(),
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
    });
    if (res && "error" in res && res.error) {
      console.error("Resend error:", res.error);
      return "echec";
    }
    return "envoye";
  } catch (e) {
    console.error("Resend error:", e);
    return "echec";
  }
}

/** Échappe un texte pour le HTML d'un e-mail (contenu ET attributs) : rien de ce qu'un visiteur tape n'est interprété. */
export function echapperHtml(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── Éléments réutilisables (HTML e-mail : tables + styles inline pour compat maximale) ──

/** Bouton CTA « bulletproof » (rendu correct jusque dans Outlook). */
function bouton(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0 6px"><tr>
    <td align="center" bgcolor="#4f46e5" style="border-radius:10px">
      <a href="${url}" style="display:inline-block;padding:12px 22px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:10px">${label}</a>
    </td></tr></table>`;
}

/** Gabarit complet : préheader caché + en-tête nuit + carte blanche + pied. */
function layout(opts: { preheader: string; eyebrow: string; titre: string; corps: string; en?: boolean }): string {
  return `<!doctype html><html lang="${opts.en ? "en" : "fr"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:#f4f5fb;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f4f5fb;font-size:1px;line-height:1px">${opts.preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5fb;padding:28px 12px">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:100%;background:#ffffff;border:1px solid #e7e8f2;border-radius:16px;overflow:hidden">
        <!-- En-tête nuit -->
        <tr><td bgcolor="#1E1B4B" style="background:linear-gradient(135deg,#1E1B4B,#3b2f96);padding:22px 28px">
          <span style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:bold;letter-spacing:.5px;color:#ffffff">AVY<span style="color:#a78bfa">ORA</span></span>
          <span style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#c4b5fd;display:block;margin-top:3px">${opts.en ? "Estimate your renovation before you sign" : "Estime tes travaux avant de signer"}</span>
        </td></tr>
        <!-- Corps -->
        <tr><td style="padding:28px 28px 8px;font-family:Arial,Helvetica,sans-serif">
          <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#7c3aed;font-weight:bold">${opts.eyebrow}</div>
          <h1 style="font-size:22px;color:#15172b;margin:8px 0 14px;line-height:1.25">${opts.titre}</h1>
          ${opts.corps}
        </td></tr>
        <!-- Pied -->
        <tr><td style="padding:18px 28px 24px;border-top:1px solid #eef0f6;font-family:Arial,Helvetica,sans-serif">
          <p style="font-size:11px;color:#8a8fa8;line-height:1.6;margin:0">${opts.en ? "AVYORA · renovation and new-build cost estimates. You're receiving this email because of your activity on AVYORA." : "AVYORA · estimation de travaux, en rénovation comme en construction neuve. Cet e-mail t'est envoyé suite à ton activité sur AVYORA."}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

const P = (txt: string) => `<p style="font-size:15px;color:#565a75;line-height:1.65;margin:0 0 14px">${txt}</p>`;

export function emailConfirmation(opts: { montant?: string; espaceUrl?: string }): { subject: string; html: string } {
  const corps = `
    ${P("Ton paiement a bien été reçu — bienvenue dans <b style=\"color:#15172b\">AVYORA Pro</b> 🎉")}
    ${opts.montant ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 16px"><tr><td style="background:#f6f7fc;border:1px solid #e7e8f2;border-radius:12px;padding:14px 16px;font-family:Arial,Helvetica,sans-serif">
      <span style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#8a8fa8">Montant</span><br>
      <span style="font-size:20px;font-weight:bold;color:#15172b">${opts.montant}</span>
    </td></tr></table>` : ""}
    ${P("Tu as désormais accès à l'<b style=\"color:#15172b\">estimation détaillée</b>, au <b style=\"color:#15172b\">rapport PDF</b> et au <b style=\"color:#15172b\">suivi de chantier</b>.")}
    ${opts.espaceUrl ? bouton("Accéder à mon espace", opts.espaceUrl) : ""}
    <p style="font-size:12px;color:#8a8fa8;line-height:1.6;margin:16px 0 0">Tu peux gérer ou résilier ton abonnement à tout moment depuis « Mon compte ». Service numérique fourni immédiatement : conformément à l'art. L221-28 du Code de la consommation, le droit de rétractation ne s'applique plus une fois le service exécuté.</p>
  `;
  return {
    subject: "Bienvenue dans AVYORA Pro — abonnement confirmé ✅",
    html: layout({ preheader: "Ton abonnement AVYORA Pro est actif.", eyebrow: "Abonnement confirmé", titre: "Bienvenue dans AVYORA Pro 🎉", corps }),
  };
}

export function emailChatel(opts: { dateReconduction: string; gererUrl?: string }): { subject: string; html: string } {
  const corps = `
    ${P(`Ton abonnement annuel <b style="color:#15172b">AVYORA Pro</b> se reconduira automatiquement le <b style="color:#15172b">${opts.dateReconduction}</b>.`)}
    ${P("Si tu ne souhaites pas le reconduire, tu peux le résilier avant cette date. Sans action de ta part, il sera renouvelé pour un an.")}
    ${opts.gererUrl ? bouton("Gérer mon abonnement", opts.gererUrl) : ""}
    <p style="font-size:12px;color:#8a8fa8;line-height:1.6;margin:16px 0 0">Information transmise conformément à l'article L215-1 du Code de la consommation (loi Chatel).</p>
  `;
  return {
    subject: "Rappel — ton abonnement AVYORA se reconduit bientôt",
    html: layout({ preheader: `Reconduction le ${opts.dateReconduction}. Gère ton abonnement si besoin.`, eyebrow: "Reconduction à venir", titre: "Ton abonnement se reconduit bientôt", corps }),
  };
}

// ── Accompagnement travaux (demande de rappel, /accompagnement-travaux) ──

/** Une ligne « libellé : valeur » de l'e-mail interne. La valeur arrive DÉJÀ échappée. */
const ligne = (k: string, v: string) =>
  `<tr><td style="padding:8px 12px 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:.5px;text-transform:uppercase;color:#8a8fa8;vertical-align:top;white-space:nowrap">${k}</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#15172b;line-height:1.5">${v}</td></tr>`;

/**
 * L'e-mail interne (vers Daniel) : toutes les infos de la demande, en français. Tout ce que le visiteur a tapé est
 * échappé ; le message garde ses retours à la ligne. L'appelant met le visiteur en reply-to : « Répondre » lui écrit.
 */
export function emailDemandeAccompagnement(d: {
  prenom: string;
  email: string;
  telephone?: string;
  typeProjet: string;
  besoins: string[];
  message?: string;
  source?: string;
  langue: string;
  recueLe: string;
}): { subject: string; html: string } {
  const e = echapperHtml;
  const tel = d.telephone ? d.telephone.replace(/[^0-9+]/g, "") : "";
  const corps = `
    ${P(`<b style="color:#15172b">${e(d.prenom)}</b> demande à être rappelé. Réponds à cet e-mail pour lui écrire directement.`)}
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 16px;border-top:1px solid #eef0f6">
      ${ligne("Prénom", e(d.prenom))}
      ${ligne("E-mail", `<a href="mailto:${e(d.email)}" style="color:#4f46e5">${e(d.email)}</a>`)}
      ${ligne("Téléphone", d.telephone ? `<a href="tel:${e(tel)}" style="color:#4f46e5">${e(d.telephone)}</a>` : "non renseigné")}
      ${ligne("Projet", e(d.typeProjet))}
      ${ligne("Besoins", d.besoins.map(e).join("<br>"))}
      ${ligne("Message", d.message ? e(d.message).replace(/\n/g, "<br>") : "aucun")}
      ${ligne("Langue", e(d.langue))}
      ${d.source ? ligne("Arrivé par", e(d.source)) : ""}
      ${ligne("Reçue le", e(d.recueLe))}
    </table>
    <p style="font-size:12px;color:#8a8fa8;line-height:1.6;margin:16px 0 0">Promesse faite à la personne : un rappel sous 48 h ouvrées, en visio ou WhatsApp, l'après-midi heure de Paris.</p>
  `;
  return {
    subject: `Demande d'accompagnement : ${d.prenom} · ${d.typeProjet}`,
    html: layout({ preheader: `${e(d.prenom)} · ${e(d.typeProjet)}`, eyebrow: "Accompagnement travaux", titre: "Nouvelle demande de rappel", corps }),
  };
}

/**
 * L'accusé de réception (vers la personne), dans sa langue. Volontairement sans son message ni son téléphone : on
 * n'écrit à une adresse que ce qu'elle a besoin de savoir, et un tiers qui taperait l'adresse d'un autre n'y fait
 * rien porter d'autre que le prénom (des lettres seulement, lib/accompagnement/schema.ts).
 */
export function emailAccuseAccompagnement(d: { prenom: string; locale: "fr" | "en"; pageUrl: string }): { subject: string; html: string } {
  const e = echapperHtml;
  if (d.locale === "en") {
    const corps = `
      ${P(`Hi ${e(d.prenom)}, thank you for your request.`)}
      ${P(`<b style="color:#15172b">Daniel gets back to you within 2 business days</b>, by video call or WhatsApp, in the afternoon, Paris time. The first call is free and comes with no commitment.`)}
      ${P("Want to add something before the call (a quote, photos, your budget)? Just reply to this email.")}
      ${bouton("See how the advice works", e(d.pageUrl))}
      <p style="font-size:12px;color:#8a8fa8;line-height:1.6;margin:16px 0 0">Advice only, with no project management assignment. Didn't make this request? You can ignore this email: nothing more will be sent.</p>
    `;
    return {
      subject: "Your call-back request has been received",
      html: layout({ preheader: "Daniel gets back to you within 2 business days.", eyebrow: "Renovation advice", titre: "Request received", corps, en: true }),
    };
  }
  const corps = `
    ${P(`Bonjour ${e(d.prenom)}, merci pour ta demande.`)}
    ${P(`<b style="color:#15172b">Daniel te recontacte sous 48 h ouvrées</b>, en visio ou WhatsApp, l'après-midi heure de Paris. Le premier appel est gratuit et sans engagement.`)}
    ${P("Tu veux ajouter quelque chose avant l'appel (un devis, des photos, ton budget) ? Réponds simplement à cet e-mail.")}
    ${bouton("Voir comment se passe l'accompagnement", e(d.pageUrl))}
    <p style="font-size:12px;color:#8a8fa8;line-height:1.6;margin:16px 0 0">Conseil seulement, sans mission de maîtrise d'œuvre. Tu n'as pas fait cette demande ? Ignore cet e-mail : rien d'autre ne te sera envoyé.</p>
  `;
  return {
    subject: "Ta demande de rappel est bien reçue",
    html: layout({ preheader: "Daniel te recontacte sous 48 h ouvrées.", eyebrow: "Accompagnement travaux", titre: "Demande bien reçue", corps }),
  };
}

/* ─── Réseau AVYORA (candidatures des artisans, 17/11/2026) ─────────────────── */

/**
 * L'e-mail interne (vers Daniel) : une nouvelle candidature (ou une candidature complétée) à examiner. Tout ce que
 * l'artisan a tapé est échappé ; le bouton mène à sa fiche dans l'admin.
 */
export function emailCandidatureArtisan(d: {
  raisonSociale: string;
  contactNom: string;
  telephone: string;
  email: string;
  metiers: string[];
  zone: string;
  siret: string;
  siretStatut: string;
  completee: boolean;
  ficheUrl: string;
}): { subject: string; html: string } {
  const e = echapperHtml;
  const corps = `
    ${P(d.completee ? `<b style="color:#15172b">${e(d.raisonSociale)}</b> a complété sa candidature : elle est de nouveau à examiner.` : `<b style="color:#15172b">${e(d.raisonSociale)}</b> veut rejoindre le Réseau AVYORA. Vérifie son dossier, puis appelle-le avant de le valider.`)}
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 8px;border-top:1px solid #eef0f6">
      ${ligne("Contact", e(d.contactNom))}
      ${ligne("Portable", `<a href="tel:${e(d.telephone.replace(/[^0-9+]/g, ""))}" style="color:#4f46e5">${e(d.telephone)}</a>`)}
      ${ligne("E-mail", `<a href="mailto:${e(d.email)}" style="color:#4f46e5">${e(d.email)}</a>`)}
      ${ligne("SIRET", `${e(d.siret)} · ${e(d.siretStatut)}`)}
      ${ligne("Métiers", d.metiers.map(e).join("<br>"))}
      ${ligne("Zone", e(d.zone))}
    </table>
    ${bouton("Ouvrir sa candidature", d.ficheUrl)}
  `;
  return {
    subject: `${d.completee ? "Candidature complétée" : "Nouvelle candidature artisan"} : ${d.raisonSociale}`,
    html: layout({ preheader: `${e(d.raisonSociale)} · ${e(d.zone)}`, eyebrow: "Réseau AVYORA", titre: d.completee ? "Candidature complétée" : "Nouvelle candidature", corps }),
  };
}

export type EvenementArtisan = "recue" | "completer" | "validee" | "refusee" | "suspendue" | "reactivee";

/**
 * Les e-mails envoyés à l'artisan au fil de sa candidature. `message` : ce que Daniel a écrit (complément demandé,
 * motif), échappé, retours à la ligne gardés. Le bouton mène à son espace artisan.
 */
export function emailArtisan(evt: EvenementArtisan, d: { nom: string; message?: string | null; espaceUrl: string }): { subject: string; html: string } {
  const e = echapperHtml;
  const mot = d.message ? `<div style="margin:0 0 14px;padding:12px 14px;background:#f6f5ff;border-radius:10px;font-size:15px;color:#15172b;line-height:1.6">${e(d.message).replace(/\n/g, "<br>")}</div>` : "";
  const bonjour = P(`Bonjour ${e(d.nom)},`);
  const textes: Record<EvenementArtisan, { sujet: string; titre: string; corps: string; bouton?: string }> = {
    recue: {
      sujet: "Ta candidature au Réseau AVYORA est bien reçue",
      titre: "Candidature bien reçue",
      corps: `${bonjour}${P("Merci pour ta candidature au Réseau AVYORA. Daniel examine ton dossier (SIRET, assurance décennale, photos de chantiers) puis <b style=\"color:#15172b\">t'appelle pour faire connaissance</b> : c'est la dernière étape avant d'entrer dans le réseau.")}${P("Tu peux suivre où en est ta candidature depuis ton espace artisan.")}`,
      bouton: "Voir ma candidature",
    },
    completer: {
      sujet: "Ta candidature au Réseau AVYORA : un complément est demandé",
      titre: "Un complément est demandé",
      corps: `${bonjour}${P("Daniel a examiné ta candidature et a besoin d'un complément avant de continuer :")}${mot}${P("Complète ta candidature depuis ton espace artisan, puis renvoie-la.")}`,
      bouton: "Compléter ma candidature",
    },
    validee: {
      sujet: "Bienvenue dans le Réseau AVYORA",
      titre: "Tu fais partie du Réseau AVYORA",
      corps: `${bonjour}${P("Ta candidature est validée : <b style=\"color:#15172b\">bienvenue dans le Réseau AVYORA</b>.")}${mot}${P("Les clients d'AVYORA de ta zone peuvent désormais te choisir pour leurs demandes de devis. Tu reçois chaque demande par e-mail, avec l'estimation détaillée du projet quand le client la joint : accepte-la depuis ton espace pour recevoir ses coordonnées.")}`,
      bouton: "Mon espace artisan",
    },
    refusee: {
      sujet: "Ta candidature au Réseau AVYORA",
      titre: "Candidature non retenue",
      corps: `${bonjour}${P("Merci pour ta candidature. Elle n'est pas retenue pour le moment.")}${mot}${P("Si ta situation évolue, réponds simplement à cet e-mail.")}`,
    },
    suspendue: {
      sujet: "Ta place dans le Réseau AVYORA est suspendue",
      titre: "Participation suspendue",
      corps: `${bonjour}${P("Ta participation au Réseau AVYORA est suspendue : tu ne reçois plus de demandes de devis pour le moment.")}${mot}${P("Pour en parler, réponds simplement à cet e-mail.")}`,
    },
    reactivee: {
      sujet: "Ta place dans le Réseau AVYORA est réactivée",
      titre: "Participation réactivée",
      corps: `${bonjour}${P("Ta participation au Réseau AVYORA est réactivée : les clients de ta zone peuvent de nouveau te choisir.")}${mot}`,
      bouton: "Mon espace artisan",
    },
  };
  const t = textes[evt];
  return {
    subject: t.sujet,
    html: layout({ preheader: t.titre, eyebrow: "Réseau AVYORA", titre: t.titre, corps: t.corps + (t.bouton ? bouton(t.bouton, d.espaceUrl) : "") }),
  };
}

/* ─── Réseau AVYORA, phase 2 : les demandes de devis ─────────────────────────── */

/** À l'artisan choisi : une nouvelle demande, SANS les coordonnées du client (elles s'affichent s'il accepte). */
export function emailNouvelleDemandeArtisan(d: { nomArtisan: string; travaux: string[]; lieu: string; delai: string; avecEstimation: boolean; espaceUrl: string }): { subject: string; html: string } {
  const e = echapperHtml;
  const corps = `
    ${P(`Bonjour ${e(d.nomArtisan)},`)}
    ${P("Un client d'AVYORA t'a choisi pour lui faire un devis.")}
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 8px;border-top:1px solid #eef0f6">
      ${ligne("Travaux", d.travaux.map(e).join("<br>"))}
      ${ligne("Lieu", e(d.lieu))}
      ${ligne("Délai", e(d.delai))}
      ${d.avecEstimation ? ligne("Estimation", "jointe (postes et montants)") : ""}
    </table>
    ${P("Ouvre ton espace artisan pour voir la demande et <b style=\"color:#15172b\">l'accepter ou la refuser</b>. Les coordonnées du client s'affichent dès que tu acceptes.")}
    ${bouton("Voir la demande", d.espaceUrl)}
  `;
  return {
    subject: `Nouvelle demande de devis : ${d.travaux.slice(0, 2).join(", ")} · ${d.lieu}`,
    html: layout({ preheader: `${e(d.lieu)} · ${e(d.travaux.join(", "))}`, eyebrow: "Réseau AVYORA", titre: "Nouvelle demande de devis", corps }),
  };
}

/** Au client : sa demande est partie (ou gardée, si aucun artisan n'est encore disponible dans sa zone). */
export function emailDemandeEnvoyee(d: { prenom: string; artisans: string[]; suiviUrl: string }): { subject: string; html: string } {
  const e = echapperHtml;
  const corps = d.artisans.length
    ? `${P(`Bonjour ${e(d.prenom)},`)}${P(`Ta demande de devis est envoyée à ${d.artisans.length > 1 ? "ces artisans" : "cet artisan"} du Réseau AVYORA :`)}
       <ul style="margin:0 0 14px;padding-left:20px;font-size:15px;color:#15172b;line-height:1.7">${d.artisans.map((a) => `<li>${e(a)}</li>`).join("")}</ul>
       ${P("Chacun te répond depuis son espace. Dès qu'un artisan accepte, tu reçois ses coordonnées par e-mail, et il reçoit les tiennes pour te contacter.")}`
    : `${P(`Bonjour ${e(d.prenom)},`)}${P("Ta demande de devis est bien enregistrée. Il n'y a pas encore d'artisan du Réseau AVYORA disponible dans ton département pour ces travaux : Daniel cherche, et on te prévient dès qu'un artisan vérifié peut te répondre.")}`;
  return {
    subject: d.artisans.length ? "Ta demande de devis est envoyée" : "Ta demande de devis est enregistrée",
    html: layout({ preheader: d.artisans.length ? `Envoyée à ${d.artisans.length} artisan${d.artisans.length > 1 ? "s" : ""} vérifié${d.artisans.length > 1 ? "s" : ""}` : "On te prévient dès qu'un artisan est disponible", eyebrow: "Réseau AVYORA", titre: "Demande de devis", corps: corps + bouton("Suivre ma demande", d.suiviUrl) }),
  };
}

/** Au client : la réponse d'un artisan. Acceptée : ses coordonnées. Refusée : une ligne, sans motif. */
export function emailReponseArtisan(d: {
  prenom: string; nomArtisan: string; acceptee: boolean; contact?: { nom: string; telephone: string; email: string }; suiviUrl: string;
}): { subject: string; html: string } {
  const e = echapperHtml;
  const corps = d.acceptee && d.contact
    ? `${P(`Bonjour ${e(d.prenom)},`)}${P(`<b style="color:#15172b">${e(d.nomArtisan)}</b> accepte ta demande de devis et va te contacter. Tu peux aussi le joindre directement :`)}
       <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 8px;border-top:1px solid #eef0f6">
         ${ligne("Contact", e(d.contact.nom))}
         ${ligne("Téléphone", `<a href="tel:${e(d.contact.telephone.replace(/[^0-9+]/g, ""))}" style="color:#4f46e5">${e(d.contact.telephone)}</a>`)}
         ${ligne("E-mail", `<a href="mailto:${e(d.contact.email)}" style="color:#4f46e5">${e(d.contact.email)}</a>`)}
       </table>
       ${P("Avant de signer, compare les devis reçus avec ton estimation AVYORA.")}`
    : `${P(`Bonjour ${e(d.prenom)},`)}${P(`${e(d.nomArtisan)} n'est pas disponible pour ta demande. Les autres artisans choisis peuvent encore te répondre ; tu peux aussi faire une nouvelle demande.`)}`;
  return {
    subject: d.acceptee ? `${d.nomArtisan} accepte ta demande de devis` : `${d.nomArtisan} n'est pas disponible`,
    html: layout({ preheader: d.acceptee ? "Ses coordonnées sont dans cet e-mail" : "Les autres artisans peuvent encore répondre", eyebrow: "Réseau AVYORA", titre: d.acceptee ? "Un artisan accepte ta demande" : "Réponse d'un artisan", corps: corps + bouton("Suivre ma demande", d.suiviUrl) }),
  };
}

/** À Daniel : une demande sans artisan dans la zone (là où recruter). */
export function emailDemandeSansArtisan(d: { travaux: string[]; lieu: string; adminUrl: string }): { subject: string; html: string } {
  const e = echapperHtml;
  const corps = `
    ${P("Un client a fait une demande de devis, mais aucun artisan validé du réseau ne couvre sa zone pour ces travaux : c'est un endroit où recruter.")}
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 8px;border-top:1px solid #eef0f6">
      ${ligne("Travaux", d.travaux.map(e).join("<br>"))}
      ${ligne("Lieu", e(d.lieu))}
    </table>
    ${bouton("Voir les demandes", d.adminUrl)}
  `;
  return {
    subject: `Demande de devis sans artisan : ${d.lieu}`,
    html: layout({ preheader: `${e(d.lieu)} · ${e(d.travaux.join(", "))}`, eyebrow: "Réseau AVYORA", titre: "Demande sans artisan", corps }),
  };
}
