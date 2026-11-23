import { z } from "zod";
import { BESOINS, BORNES, TYPES_PROJET, sourceAccompagnementValide, type Champ, type CodeChamp } from "./constantes";

/**
 * Validation serveur de la demande d'accompagnement (lib/actions/accompagnement.ts). Toutes les chaînes sont bornées ;
 * aucun caractère de contrôle (le message garde ses retours à la ligne). Le prénom part dans l'objet de l'e-mail
 * interne et dans l'accusé de réception envoyé à l'adresse saisie : il n'accepte que des lettres, espaces, tirets,
 * apostrophes et points (ni chiffres, ni liens), pour qu'on ne puisse pas faire porter un message publicitaire à
 * l'accusé de réception.
 */

/** Caractères de contrôle (hors tabulation et retours à la ligne, traités à part). */
const CONTROLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u2028\u2029]/;

/** Un prénom : 1 à 40 caractères, une lettre en tête. */
export const PRENOM_RE = /^\p{L}[\p{L}\p{M} '’.-]*$/u;

/**
 * Un point suivi d'au moins deux lettres ressemble à un nom de domaine (« casino.com », « promo.fr ») : les messageries
 * le rendent cliquable, et le prénom part dans l'accusé de réception envoyé à l'adresse saisie. Refusé ; les initiales
 * restent possibles (« J.-P. », « J. Paul »).
 */
const DOMAINE_RE = /\.\p{L}{2,}/u;

export function prenomValide(s: string): boolean {
  return PRENOM_RE.test(s) && !DOMAINE_RE.test(s);
}

/**
 * Un téléphone au format souple : chiffres, espaces, points, tirets, parenthèses, un « + » en tête ; 6 à 20 chiffres
 * (un numéro français à 10 chiffres, ou international avec indicatif, pour WhatsApp).
 */
export function telephoneValide(v: string): boolean {
  if (!/^\+?[0-9 .()-]+$/.test(v)) return false;
  const chiffres = v.replace(/\D/g, "").length;
  return chiffres >= 6 && chiffres <= 20;
}

const texte = (max: number) => z.string().trim().max(max, "trop_long").refine((s) => !CONTROLE.test(s) && !/[\r\n\t]/.test(s), "invalide");

export const demandeSchema = z.object({
  prenom: texte(BORNES.prenom).min(1, "requis").refine((s) => s === "" || prenomValide(s), "invalide"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "requis")
    .max(BORNES.email, "trop_long")
    .pipe(z.email("invalide")),
  telephone: texte(BORNES.telephone).min(1, "requis").refine((s) => s === "" || telephoneValide(s), "invalide"), // obligatoire : c'est là que Daniel rappelle (23/11/2026)
  typeProjet: z.enum(TYPES_PROJET, { error: (iss) => (iss.input === undefined ? "requis" : "invalide") }),
  besoins: z.array(z.enum(BESOINS, "invalide")).max(BESOINS.length, "invalide"),
  message: z
    .string()
    .trim()
    .max(BORNES.message, "trop_long")
    .refine((s) => !CONTROLE.test(s), "invalide"),
});

export type Demande = z.infer<typeof demandeSchema> & { src?: ReturnType<typeof sourceAccompagnementValide> };

/** Ce que le formulaire envoie, lu dans le FormData (les cases à cocher : plusieurs valeurs sous le même nom). */
export function lireFormulaire(fd: FormData) {
  const s = (k: string) => {
    const v = fd.get(k);
    return typeof v === "string" ? v : "";
  };
  return {
    prenom: s("prenom"),
    email: s("email"),
    telephone: s("telephone"),
    typeProjet: s("typeProjet") || undefined,
    besoins: [...new Set(fd.getAll("besoins").filter((v): v is string => typeof v === "string"))],
    // Les retours à la ligne du navigateur (\r\n) comptent pour un caractère, comme dans le compteur du formulaire.
    message: s("message").replace(/\r\n?/g, "\n"),
  };
}

export type ResultatValidation =
  | { ok: true; demande: Demande }
  | { ok: false; champs: Partial<Record<Champ, CodeChamp>> };

/** Valide le formulaire. Aucun besoin coché = « je ne sais pas encore ». */
export function validerDemande(fd: FormData): ResultatValidation {
  const r = demandeSchema.safeParse(lireFormulaire(fd));
  const src = sourceAccompagnementValide(fd.get("src"));
  if (r.success) {
    const besoins = r.data.besoins.length ? r.data.besoins : (["nsp"] as const);
    return { ok: true, demande: { ...r.data, besoins: [...besoins], ...(src ? { src } : {}) } };
  }
  const champs: Partial<Record<Champ, CodeChamp>> = {};
  for (const issue of r.error.issues) {
    const champ = issue.path[0] as Champ;
    if (champs[champ]) continue;
    const m = issue.message;
    champs[champ] = m === "requis" || m === "trop_long" ? m : "invalide";
  }
  return { ok: false, champs };
}
