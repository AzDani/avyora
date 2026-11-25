"use client";

/**
 * Vue « Mon devis » du détaillé neuf : la version construction neuve du `DevisView` de la
 * rénovation. Catalogue du neuf, TVA 20 %, frais hors TVA, découpe construction / annexes,
 * répartition par phase du chantier (un lot revient dans plusieurs phases : clé `phase + corps`),
 * démarches affichées comme telles. Aucun montant écrit : tout vient du moteur. L'affichage est celui
 * de la rénovation (`VueDevis`, chantier N6) : ce composant n'en prépare que les données.
 */
import { useMemo } from "react";
import {
  buildDevis, customTotals, totauxAvecPerso, tachesParCle, estJalon, CATALOG_NEUF, PHASES_NEUF, type Ctx, type Selection, type CustomLine,
} from "@/lib/estimateur";
import { decoupe, qteNeuf } from "@/lib/estimateur/etapes-neuf";
import { catT, catLigne } from "@/lib/estimateur/catalog-i18n";
import { useLocale, useT } from "@/components/i18n/LangProvider";
import { dictNeuf } from "@/lib/i18n/neuf";
import { fmt } from "@/components/estimateur/partage";
import { pourcent } from "@/lib/i18n/nombres";
import { VueDevis, type DonneesDevis } from "@/components/estimateur/VueDevis";
import { enHT, estPro, totalAffiche, tvaParTaux } from "@/lib/estimateur/tva";
import { dictTva } from "@/lib/i18n/tva";

export default function DevisNeuf({ ctx, sel, custom = [] }: { ctx: Ctx; sel: Selection; custom?: CustomLine[] }) {
  const locale = useLocale();
  const T = useT();
  const n = dictNeuf(locale);
  const d = n.detail;
  const dv = useMemo(() => buildDevis(CATALOG_NEUF, ctx, sel), [ctx, sel]);
  const taches = useMemo(() => tachesParCle(ctx), [ctx]);
  const { totaux: t0, bilan: b, lots, lignes } = dv;
  // Lignes perso comprises (HT, leur TVA, les aléas) : le seul calcul du total, partout (`totauxAvecPerso`).
  const t = totauxAvecPerso(t0, custom, ctx.aleas);
  const cu = customTotals(custom);
  const cut = decoupe(dv);
  const max = lots.length ? Math.max(...lots.map((x) => x.ttc)) : 1;
  const persoTtc = cu.ht + cu.tva;
  // Le nom de la finition : celui des deux rapides (N13), le même que les cartes du questionnaire.
  const finLbl = T.rapide.finitions[ctx.finition]?.label ?? ctx.finition;
  // HT / TTC (25/11/2026) : le total et les lignes suivent l'affichage du projet ; un pro voit sa TVA récupérable.
  const tv = dictTva(locale);
  const affHt = enHT(ctx), payeurPro = estPro(ctx);
  const parTaux = tvaParTaux(CATALOG_NEUF, ctx, sel, custom).filter((x) => x.taux > 0);
  const detailTaux = parTaux.length > 1 ? " " + parTaux.map((x) => tv.total.parTaux(tv.pct(x.taux), fmt(x.ht, locale)) + " : " + fmt(x.tva, locale)).join(" · ") + "." : "";
  const rappel = payeurPro ? " " + tv.total.rappelPro(fmt(t.tva, locale), fmt(t.ht + t.aleas, locale)) : affHt ? " " + tv.total.rappelHt(fmt(t.ttc, locale)) : "";

  const donnees: DonneesDevis = {
    eb: d.devisEb, ttc: totalAffiche(t, ctx), ttcUnite: affHt ? tv.total.unite(true) : d.ttc,
    pilules: [
      { k: d.travauxHt, v: t.ht - b.frais }, { k: payeurPro ? tv.total.tvaRecup : d.tva, v: t.tva },
      ...(b.frais > 0 ? [{ k: n.fraisHorsTva, v: b.frais }] : []),
      { k: d.aleas(ctx.aleas), v: t.aleas }, { k: d.budgetMax, v: ctx.budget },
    ],
    apresPilules: <p className="split-n">{n.dontConstr} <b>{fmt(cut.constr, locale)}</b> · {n.annexes} <b>{fmt(cut.annexes, locale)}</b></p>,
    hint: d.heroHint + detailTaux + rappel,
    bilan: {
      titre: d.bilanT, sous: d.bilanSous,
      paye: d.paye, payeV: b.paye, payeSous: d.dontMat(fmt(b.matA, locale), fmt(b.moA, locale)),
      achat: d.achat, achatV: b.achat, eco: d.eco, ecoV: b.eco,
    },
    repartition: {
      titre: d.repT, sous: affHt ? tv.total.repSousHt : d.repSous,
      vide: !lots.length ? d.vide : null,
      phases: PHASES_NEUF.flatMap((ph) => {
        // Un lot peut revenir deux fois dans la même phase : on additionne ses blocs.
        const parCorps = new Map<string, number>();
        for (const x of lots) if (x.phase === ph) parCorps.set(x.corps, (parCorps.get(x.corps) ?? 0) + x.ttc);
        const pl = [...parCorps].sort((a, c) => c[1] - a[1]);
        return pl.length ? [{
          cle: ph, nom: catT(locale, "phases", ph),
          lots: pl.map(([corps, v]) => ({ cle: ph + "|" + corps, nom: catT(locale, "corps", corps), v, pct: (v / max) * 100 })),
        }] : [];
      }),
      perso: persoTtc > 0 ? { cle: "perso", nom: d.perso, v: persoTtc, pct: Math.min(100, (persoTtc / max) * 100) } : null,
    },
    detail: {
      titre: d.detailT, sous: affHt ? tv.total.detailSousHt : d.detailSous,
      lignes: lignes.map((li) => {
        const tk = taches.get(li.cle);
        const jalon = estJalon(tk) && li.ttc === 0;
        const pctPerso = sel[li.cle]?.pu != null;
        const q = li.unite === "forfait" ? "—"
          : li.unite === "pct" ? (tk?.fp != null && !pctPerso ? `${pourcent(locale, tk.fp, 3)} ${tk.assiette === "projet" || (tk.frais && tk.assiette !== "travaux") ? n.pctProjet : n.pctTravaux}` : "—")
          : qteNeuf(locale, li.qty, li.unite, li.mode === "location");
        return {
          cle: li.cle, nom: catLigne(locale, li.nom, li.cle), q: jalon ? "—" : q,
          mode: jalon ? "dem" : li.mode === "location" ? "mL" : li.mode === "je-fais" ? "mS" : "mA",
          modeTxt: jalon ? n.demarche : li.mode === "location" ? d.modeLocation : li.mode === "je-fais" ? d.modeJeFais : d.modeFaitFaire,
          m: jalon ? "" : fmt(affHt ? li.ht : li.ttc, locale),
        };
      }),
    },
    pied: d.pied(finLbl),
  };
  return <VueDevis d={donnees} />;
}
