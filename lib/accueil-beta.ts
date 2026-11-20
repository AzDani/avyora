/**
 * Bêta gratuite (lib/beta.ts) : ce que l'ACCUEIL dit à la place des prix et des « Pro » tant que la bêta court.
 *
 * Depuis la refonte de l'accueil (20/11/2026), le gabarit (app/page.tsx, `accueilFr` et `accueilEn`) connaît la bêta et
 * écrit lui-même ses prix ou leur absence : il ne reste ici que le bandeau du haut, remplacé EXACTEMENT pendant la bêta. Hors bêta, rien n'est remplacé, et le HTML est
 * celui d'avant au caractère près. Chaque `avant` doit figurer exactement une fois dans le gabarit : le test
 * tests/beta.test.ts le vérifie (un gabarit qui bouge sans ses remplacements ferait réapparaître un prix).
 *
 * Aucune promotion, aucun prix barré : seulement la bêta (gratuite, jusqu'à sa date de fin) et le statut de membre
 * fondateur, une simple reconnaissance SANS AUCUN AVANTAGE TARIFAIRE (décision de Dani du 12/11/2026, qui retire le
 * « tarif préférentiel garanti à vie » du 16/10/2026). Aucun prix d'après la bêta n'est affiché.
 */
import type { Locale } from "@/lib/i18n/config";
import { dateInsecable, libellesBeta, lienInscriptionBeta } from "@/lib/beta";

/** Les paires [avant, après] de l'accueil dans cette langue. */
export function remplacementsAccueilBeta(locale: Locale): [string, string][] {
  const l = libellesBeta(locale);
  // La date ne se coupe pas en fin de ligne (téléphone) : « 31 décembre 2026 » reste d'un seul tenant.
  // Le point animé du bandeau est DANS le texte (en ligne, avant « Bêta gratuite ») : sur téléphone, il ne prend plus une
  // ligne à lui seul au-dessus du texte.
  const fin = dateInsecable(l.fin);
  const inscription = lienInscriptionBeta(undefined, "accueil");
  if (locale === "en") {
    return [
      [
        '<a href="/tarifs" class="promo"><span class="dot"></span>Estimating is <b>free</b> — AVYORA Pro from €18.85/month <span class="arr">· no commitment →</span></a>',
        `<a href="${inscription}" class="promo"><span style="text-align:center"><span class="dot" style="display:inline-block;vertical-align:middle;margin:0 8px 2px 0"></span><b>Free beta</b>\u00a0— all of AVYORA is free through ${fin} <span class="arr">·\u00a0create your account\u00a0→</span></span></a>`,
      ],
    ];
  }
  return [
    [
      '<a href="/tarifs" class="promo"><span class="dot"></span>Estimer est <b>gratuit</b> — AVYORA Pro dès 18,85 €/mois <span class="arr">· sans engagement →</span></a>',
      `<a href="${inscription}" class="promo"><span style="text-align:center"><span class="dot" style="display:inline-block;vertical-align:middle;margin:0 8px 2px 0"></span><b>Bêta gratuite</b>\u00a0— tout AVYORA est offert jusqu'au ${fin} <span class="arr">·\u00a0crée ton compte\u00a0→</span></span></a>`,
    ],
  ];
}

/** Le gabarit de l'accueil pendant la bêta. */
export function accueilBeta(html: string, locale: Locale): string {
  let out = html;
  for (const [avant, apres] of remplacementsAccueilBeta(locale)) out = out.split(avant).join(apres);
  return out;
}
