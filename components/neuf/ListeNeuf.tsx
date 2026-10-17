"use client";

/**
 * La liste des postes du détaillé neuf, rangée par CORPS D'ÉTAT comme la rénovation (revue rénovation /
 * neuf, chantier N10 ; décision D1). Ce que la liste range est décidé dans `lib/estimateur/liste-neuf.ts`
 * (données pures, testées) ; ici, l'affichage, avec les briques de la rénovation (`ListeLots`,
 * `TitrePhase`, `BlocLot`, `LignesLot`) :
 * - 4 grandes phases en intertitres, chaque lot UNE fois, fermé tant qu'on ne l'ouvre pas ;
 * - dans un lot présent à plusieurs étapes du chantier, ses postes sous un sous-titre d'étape, chaque
 *   bloc du catalogue avec sa note ;
 * - les postes qui s'excluent sur une ligne de choix : la ligne du poste retenu et ses alternatives en
 *   boutons ; un clic choisit (l'appelant coche, décoche l'autre et met la réponse à jour) ; deux
 *   alternatives cochées (un ancien projet) : les deux lignes, sous un avertissement ;
 * - la carte « Taxes, assurance et frais » (`CarteFraisNeuf`, sous le questionnaire, près du budget) et la
 *   liste « Démarches » (gratuites, en fin de liste) : hors du compte des postes, qui ne compte que les travaux.
 * Les clés `key(lot, nom)` ne changent pas. Aucun montant écrit ici : tout vient du moteur (`htParCle`).
 */
import { Fragment, type ReactNode } from "react";
import { fmt, CustomLines } from "@/components/estimateur/partage";
import { ListeLots, TitrePhase, BlocLot, LignesLot, SousEtape, LigneChoix, SelecteurChoix, type OutilsListe } from "@/components/estimateur/ListeLots";
import { useLocale } from "@/components/i18n/LangProvider";
import { dictNeuf } from "@/lib/i18n/neuf";
import { dictDetail } from "@/lib/i18n/detail";
import { catT } from "@/lib/estimateur/catalog-i18n";
import {
  customLotHT, isLoc, key, visibleTask, raisonProNeuf, tauxPersoPossibles, PHASES_NEUF, ICON,
  type Ctx, type Selection, type LigneSel, type CustomLine, type Lot, type Tache, type MaisonNeuve,
} from "@/lib/estimateur";
import { INFO_PHASES } from "@/lib/estimateur/etapes-neuf";
import { badgeNeuf, lignesPersoDuLot } from "@/lib/estimateur/detaille-neuf";
import {
  GRANDES_PHASES_NEUF, POSTES_FRAIS_NEUF, CARTE_FRAIS, CARTE_DEMARCHES, elementsLotNeuf, lotsAffichesNeuf, postesDesElements, postesCochesNeuf,
  alternativeMontreeNeuf, alternativeIndisponibleNeuf, type PosteListeNeuf, type LigneChoixNeuf,
} from "@/lib/estimateur/liste-neuf";

/** Ce que la liste fait faire à l'écran : régler une ligne, cocher, choisir une alternative, les lignes perso. */
export interface ActionsListeNeuf {
  maj: (c: string, nom: string, patch: (s: LigneSel) => LigneSel) => void;
  cocher: (l: Lot, t: Tache) => void;
  auto: (l: Lot, t: Tache) => void;
  choisir: (p: PosteListeNeuf) => void;
  ajouterPerso: (lot: string) => void;
  majPerso: (id: string, patch: Partial<CustomLine>) => void;
  supprimerPerso: (id: string) => void;
}

interface PropsCommunes {
  ctx: Ctx; sel: Selection; maison: MaisonNeuve;
  /** HT de chaque ligne chiffrée par le moteur (`buildDevis`), par clé `key(lot, nom)`. */
  htParCle: Map<string, number>;
  open: Record<string, boolean>; onBascule: (k: string) => void;
  seulementCoches: boolean;
  actions: ActionsListeNeuf;
}

const Drapeau = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M3.5 14.5V2.2M3.5 2.6h8.2l-1.8 3 1.8 3H3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
  </svg>
);

/** Les lignes d'un ensemble de postes : chaque poste dans SON bloc du catalogue (le moteur le chiffre
 *  ainsi), avec ce que le neuf ajoute (badge, raison « Pro obligatoire », boutons d'une ligne de choix). */
function rangees({ ctx, sel, htParCle, actions }: Pick<PropsCommunes, "ctx" | "sel" | "htParCle" | "actions">) {
  const coche = ({ l, t }: PosteListeNeuf) => !!sel[key(l.c, t.n)]?.on;
  const htDe = (postes: PosteListeNeuf[]) => postes.reduce((s, { l, t }) => s + (htParCle.get(key(l.c, t.n)) ?? 0), 0);
  const rangee = (p: PosteListeNeuf, choix?: ReactNode) => (
    <LignesLot key={p.t.id} l={p.l} taches={[p.t]} ctx={ctx} sel={sel} loc={isLoc(p.l.c)} maj={actions.maj} onCocher={actions.cocher} onAuto={actions.auto}
      options={(t) => ({ badge: badgeNeuf(ctx, sel, p.l, t), proRaison: raisonProNeuf(t), choix })} />
  );
  return { coche, htDe, rangee };
}

/** La liste : les outils, les 4 grandes phases et leurs lots, puis les démarches. */
export function ListeNeuf(props: PropsCommunes & { custom: CustomLine[]; outils: OutilsListe }) {
  const { ctx, sel, maison: m, open, onBascule, seulementCoches, actions, custom, outils } = props;
  const locale = useLocale();
  const d = dictNeuf(locale).detail, dl = dictDetail(locale);
  const { coche, htDe, rangee } = rangees(props);

  /** Une ligne de choix : le poste retenu et ses alternatives ; aucune cochée : celle que la maison
   *  désigne, décochée ; deux cochées (un ancien projet) : les deux, sous un avertissement. */
  function ligneChoix(ligne: LigneChoixNeuf, membres: PosteListeNeuf[]) {
    const cochees = membres.filter(coche);
    if (seulementCoches && !cochees.length) return null;
    const montrees = cochees.length ? cochees : [alternativeMontreeNeuf(m, membres)];
    const selecteur = (
      <SelecteurChoix titre={ligne.titre[locale]} onChoisir={(id) => { const p = membres.find((x) => x.t.id === id); if (p && !alternativeIndisponibleNeuf(m, id)) actions.choisir(p); }}
        alternatives={membres.map((p) => ({
          v: p.t.id, label: ligne.alternatives.find((a) => a.id === p.t.id)?.court[locale] ?? p.t.n, actif: coche(p),
          indisponible: alternativeIndisponibleNeuf(m, p.t.id) ? d.architecteObligatoire : null,
        }))} />
    );
    return (
      <LigneChoix key={ligne.cle} avertissement={cochees.length > 1 ? d.choixDoublon : undefined}>
        {montrees.map((p, i) => rangee(p, i === 0 ? selecteur : undefined))}
      </LigneChoix>
    );
  }

  /** Un lot, une seule fois : ses postes de toutes les étapes du chantier, ses lignes perso. */
  function lot(c: string) {
    const elements = elementsLotNeuf(ctx, sel, c);
    const cLines = lignesPersoDuLot(custom, c);
    const cnt = postesCochesNeuf(sel, elements) + cLines.filter((x) => x.on !== false && !x.draft).length;
    if (seulementCoches && cnt === 0) return null;
    const ouvert = !!open[c];
    const amt = htDe(postesDesElements(elements)) + customLotHT(cLines, c);
    return (
      <BlocLot key={c} ouvert={ouvert} entete={{
        icone: ICON[c] || "•", nom: catT(locale, "corps", c), cnt, ouvert, onBascule: () => onBascule(c),
        montant: cnt > 0 ? fmt(amt) + " " + dl.liste.ht : "",
      }}>
        {elements.map((e) => {
          if (e.type === "etape") return <SousEtape key={"e-" + e.phase}>{catT(locale, "phases", e.phase)}</SousEtape>;
          if (e.type === "note") return <div key={"n-" + e.l.p + e.l.t[0]?.id} className="lotnote">{catT(locale, "notes", e.l.note ?? "")}</div>;
          if (e.type === "choix") return ligneChoix(e.ligne, e.membres);
          return seulementCoches && !coche(e.p) ? null : rangee(e.p);
        })}
        <CustomLines lines={cLines} onAdd={() => actions.ajouterPerso(c)} onUpd={actions.majPerso} onDel={actions.supprimerPerso} guideTva={d.guideTva}
          tvas={(courant) => tauxPersoPossibles(ctx, courant)} />
      </BlocLot>
    );
  }

  const affiches = lotsAffichesNeuf(ctx, sel, custom);
  const ouvertDem = !!open[CARTE_DEMARCHES];
  return (
    <>
      <ListeLots outils={outils} phases={GRANDES_PHASES_NEUF.flatMap((gp, i) => {
        const lots = gp.lots.filter((c) => affiches.includes(c)).map(lot).filter(Boolean);
        return lots.length ? [{ cle: gp.nom, titre: <TitrePhase num={i + 1} nom={catT(locale, "phases", gp.nom)} />, contenu: lots }] : [];
      })} />
      {/* Les démarches gratuites du chantier, étape par étape (`INFO_PHASES`) : hors des postes. */}
      <div className="dem-c">
        <BlocLot ouvert={ouvertDem} entete={{
          icone: "📋", nom: <>{d.demarchesT} <span className="acc-sous">· {d.demarchesSous}</span></>, cnt: 0, ouvert: ouvertDem,
          onBascule: () => onBascule(CARTE_DEMARCHES), montant: "",
        }}>
          <div className="lotnote">{d.demarchesNote}</div>
          {PHASES_NEUF.filter((ph) => INFO_PHASES[ph]?.dem.length).map((ph) => (
            <Fragment key={ph}>
              <SousEtape>{catT(locale, "phases", ph)}</SousEtape>
              <ul className="dem-l">
                {INFO_PHASES[ph].dem.map((x, i) => <li key={i}><Drapeau /><span><b>{x.quand[locale]}</b> · {x.quoi[locale]}</span></li>)}
              </ul>
            </Fragment>
          ))}
        </BlocLot>
      </div>
    </>
  );
}

/** La carte « Taxes, assurance et frais » : sous le questionnaire, près du budget ; sans TVA ni aléas,
 *  comptés dans le total, hors du compte des postes. */
export function CarteFraisNeuf(props: PropsCommunes) {
  const { ctx, open, onBascule, seulementCoches } = props;
  const locale = useLocale();
  const d = dictNeuf(locale).detail;
  const { coche, htDe, rangee } = rangees(props);
  const postes = POSTES_FRAIS_NEUF.filter(({ t }) => visibleTask(ctx, t));
  const cochees = postes.filter(coche);
  if (seulementCoches && !cochees.length) return null;
  const ouvert = !!open[CARTE_FRAIS];
  const amt = htDe(cochees);
  return (
    <div className="frais-c">
      <BlocLot ouvert={ouvert} entete={{
        icone: "🧾", nom: <>{d.fraisT} <span className="acc-sous">· {d.fraisSous}</span></>, cnt: 0, ouvert, onBascule: () => onBascule(CARTE_FRAIS),
        montant: amt > 0 ? fmt(amt) : "",
      }}>
        <div className="lotnote">{d.fraisNote}</div>
        {(seulementCoches ? cochees : postes).map((p) => rangee(p))}
      </BlocLot>
    </div>
  );
}
