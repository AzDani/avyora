/**
 * Bêta gratuite (lib/beta.ts) : ce que l'ACCUEIL dit à la place des prix et des « Pro » tant que la bêta court.
 *
 * L'accueil est un gabarit HTML en dur (app/page.tsx, `HOME_HTML` et `HOME_HTML_EN`), qui reste celui d'avant :
 * pendant la bêta, la page lui applique ces remplacements EXACTS. Hors bêta, rien n'est remplacé, et le HTML est
 * celui d'avant au caractère près. Chaque `avant` doit figurer exactement une fois dans le gabarit : le test
 * tests/beta.test.ts le vérifie (un gabarit qui bouge sans ses remplacements ferait réapparaître un prix).
 *
 * Aucune promotion, aucun prix barré : seulement la bêta (gratuite, jusqu'à sa date de fin) et la promesse des
 * membres fondateurs, SANS CHIFFRE (décision de Dani du 16/10/2026) : un tarif préférentiel garanti à vie, annoncé
 * avant la fin de la bêta. Aucun prix d'après la bêta n'est affiché.
 */
import type { Locale } from "@/lib/i18n/config";
import { dateInsecable, libellesBeta, lienInscriptionBeta } from "@/lib/beta";

const COCHE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M20 6 9 17l-5-5"/></svg>';

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
      ['<a href="/tarifs" class="btn btn-w">See pricing</a>', `<a href="${inscription}" class="btn btn-w">Create my free account</a>`],
      [
        "<p>All 200 items, DIY vs. hire-out, and the PDF report — with AVYORA&nbsp;Pro.</p>",
        "<p>All 200 items, DIY vs. hire-out, and the PDF report — free during the beta.</p>",
      ],
      [
        '<p class="eyebrow">Result preview · AVYORA Pro</p><h2>The detailed report, with Pro.</h2><p>A real itemized report, line by line, unlocked with AVYORA&nbsp;Pro — example: 145 m² house in Bordeaux. The quick estimate (your range) stays free.</p>',
        `<p class="eyebrow">Result preview · included during the beta</p><h2>The detailed report, free during the beta.</h2><p>A real itemized report, line by line, free with an account through ${fin} — example: 145 m² house in Bordeaux. The quick estimate (your range) needs no account.</p>`,
      ],
      [
        '<h2>€18.85/mo to steer an <span class="g">€80,000</span> project.</h2>',
        `<h2>€0 through ${fin} to steer an <span class="g">€80,000</span> project.</h2>`,
      ],
      [
        '<div class="cbox small"><div class="k">AVYORA Pro</div><div class="v">€18.85/mo</div></div>',
        '<div class="cbox small"><div class="k">AVYORA during the beta</div><div class="v">€0</div></div>',
      ],
      [
        '<div class="pct">That\'s <b>0.02%</b> of the budget to control all of it.</div>',
        '<div class="pct">Then, for founding members, a <b>preferred rate guaranteed for life</b>, announced before the beta ends.</div>',
      ],
      // Sans prix affiché, « plus cher qu'une année d'AVYORA » ne compare plus rien (2e contre-examen).
      [
        '<div class="punch">A <em>single forgotten item</em> in a quote often costs more than a <em>whole year</em> of AVYORA.</div>',
        '<div class="punch">A <em>single forgotten item</em> in a quote can cost hundreds, even thousands of euros. During the beta, AVYORA costs you <em>nothing</em>.</div>',
      ],
      ['<span class="lance">Launch pricing · locked for early subscribers</span>', `<span class="lance">Free beta · through ${fin}</span>`],
      ["<h2>Free to estimate. Pro to unlock everything.</h2>", "<h2>Everything is free during the beta.</h2>"],
      [
        '<div class="p"><span class="big">€18.85</span> / month — detailed 200 items, PDF report, saving and project tracking.</div>',
        `<div class="p"><span class="big">€0</span> — detailed 200 items, PDF report, saving and project tracking, free for everyone who signs up. Sign up during the beta: you become a founding member, with a preferred rate guaranteed for life, announced before the beta ends.</div>`,
      ],
      [
        '<a href="/tarifs" class="btn btn-o">Go Pro</a>\n      <a href="/tarifs" class="btn btn-w">See all plans</a>',
        `<a href="${inscription}" class="btn btn-o">Create my free account</a>\n      <a href="/tarifs" class="btn btn-w">About the beta</a>`,
      ],
      [`${COCHE}Free to try</span>`, `${COCHE}No card required</span>`],
      [`${COCHE}No commitment</span>`, `${COCHE}Nothing will be charged</span>`],
      [`${COCHE}Cancel anytime</span>`, `${COCHE}Founding member</span>`],
    ];
  }
  return [
    [
      '<a href="/tarifs" class="promo"><span class="dot"></span>Estimer est <b>gratuit</b> — AVYORA Pro dès 18,85 €/mois <span class="arr">· sans engagement →</span></a>',
      `<a href="${inscription}" class="promo"><span style="text-align:center"><span class="dot" style="display:inline-block;vertical-align:middle;margin:0 8px 2px 0"></span><b>Bêta gratuite</b>\u00a0— tout AVYORA est offert jusqu'au ${fin} <span class="arr">·\u00a0crée ton compte\u00a0→</span></span></a>`,
    ],
    ['<a href="/tarifs" class="btn btn-w">Voir les tarifs</a>', `<a href="${inscription}" class="btn btn-w">Créer mon compte gratuit</a>`],
    [
      '<p class="eyebrow">Aperçu du résultat · AVYORA Pro</p><h2>Le rapport détaillé, avec Pro.</h2><p>Un vrai document chiffré poste par poste, à débloquer avec AVYORA&nbsp;Pro — exemple : maison 145 m² à Bordeaux. L\'estimation rapide (ta fourchette), elle, reste gratuite.</p>',
      `<p class="eyebrow">Aperçu du résultat · inclus pendant la bêta</p><h2>Le rapport détaillé, offert pendant la bêta.</h2><p>Un vrai document chiffré poste par poste, gratuit avec un compte jusqu'au ${fin} — exemple : maison 145 m² à Bordeaux. L'estimation rapide (ta fourchette), elle, se fait sans compte.</p>`,
    ],
    [
      '<h2>18,85 €/mois pour piloter un chantier à <span class="g">80&nbsp;000&nbsp;€</span>.</h2>',
      `<h2>0 € jusqu'au ${fin} pour piloter un chantier à <span class="g">80&nbsp;000&nbsp;€</span>.</h2>`,
    ],
    [
      '<div class="cbox small"><div class="k">AVYORA Pro</div><div class="v">18,85 €/mois</div></div>',
      '<div class="cbox small"><div class="k">AVYORA pendant la bêta</div><div class="v">0 €</div></div>',
    ],
    [
      '<div class="pct">Soit <b>0,02&nbsp;%</b> du budget pour le maîtriser entièrement.</div>',
      '<div class="pct">Puis, pour les membres fondateurs, un <b>tarif préférentiel garanti à vie</b>, annoncé avant la fin de la bêta.</div>',
    ],
    // Sans prix affiché, « plus cher qu'une année d'AVYORA » ne compare plus rien (2e contre-examen).
    [
      '<div class="punch">Un <em>seul poste oublié</em> dans un devis coûte souvent plus cher qu\'une <em>année entière</em> d\'AVYORA.</div>',
      '<div class="punch">Un <em>seul poste oublié</em> dans un devis peut coûter des centaines, voire des milliers d\'euros. Pendant la bêta, AVYORA ne te coûte <em>rien</em>.</div>',
    ],
    ['<span class="lance">Tarif de lancement · bloqué pour les premiers abonnés</span>', `<span class="lance">Bêta gratuite · jusqu'au ${fin}</span>`],
    ["<h2>Gratuit pour estimer. Pro pour piloter.</h2>", "<h2>Tout est gratuit pendant la bêta.</h2>"],
    [
      '<div class="p"><span class="big">18,85 €</span> / mois — détaillé 200 postes, rapport PDF, carnet matériaux, suivi de chantier &amp; multi-projets.</div>',
      `<div class="p"><span class="big">0 €</span> — détaillé 200 postes, rapport PDF, carnet matériaux, suivi de chantier &amp; multi-projets, offerts à tous les inscrits. Inscris-toi pendant la bêta : tu deviens membre fondateur, avec un tarif préférentiel garanti à vie, annoncé avant la fin de la bêta.</div>`,
    ],
    [
      '<a href="/tarifs" class="btn btn-o">Passer Pro</a>\n      <a href="/tarifs" class="btn btn-w">Voir tous les plans</a>',
      `<a href="${inscription}" class="btn btn-o">Créer mon compte gratuit</a>\n      <a href="/tarifs" class="btn btn-w">Tout savoir sur la bêta</a>`,
    ],
    [`${COCHE}Gratuit pour tester</span>`, `${COCHE}Aucune carte demandée</span>`],
    [`${COCHE}Sans engagement</span>`, `${COCHE}Rien ne sera prélevé</span>`],
    [`${COCHE}Résiliable à tout moment</span>`, `${COCHE}Membre fondateur</span>`],
  ];
}

/** Le gabarit de l'accueil pendant la bêta. */
export function accueilBeta(html: string, locale: Locale): string {
  let out = html;
  for (const [avant, apres] of remplacementsAccueilBeta(locale)) out = out.split(avant).join(apres);
  return out;
}
