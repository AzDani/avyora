"use client";

/** Ligne de poste de l'estimateur détaillé : déplacée telle quelle depuis `components/Estimateur.tsx` (C1).
 *  Les props `badge` (construction neuve, C4), `proRaison` (N1) et `choix` (N10) sont facultatives : absentes, la
 *  ligne est celle de la rénovation (figée par `tests/estimateur-briques.test.ts`). « Je le fais »
 *  suit une seule règle pour les deux natures (`peutFaireSoiMeme`, N5) ; l'avertissement « hors
 *  garantie décennale » et les mentions d'un poste faisable soi-même (PAC, climatisation, borne)
 *  aussi (D2, D4). Les prix unitaires des deux puces viennent du moteur (`puReel`, N7) pour les deux
 *  natures : prix unitaire × quantité = montant de la ligne, région et barème de finition du poste
 *  compris. Textes : `dictDetail` (N6), au tutoiement, en français et en anglais. */
import { useState, type ReactNode } from "react";
import NumStepper from "@/components/Stepper";
import { useLocale } from "@/components/i18n/LangProvider";
import { catT } from "@/lib/estimateur/catalog-i18n";
import { key, isAuto, autoQty, lineHT, effPrices, puReel, peutFaireSoiMeme, horsDecennaleSoiMeme, MENTIONS_SOI_MEME, type Ctx, type Selection, type Lot, type Tache, type RaisonPro } from "@/lib/estimateur";
import { dictNeufCommun } from "@/lib/i18n/neuf-commun";
import { dictDetail } from "@/lib/i18n/detail";
import { ChoicePrice, fmt, isUrl } from "./partage";

export function Row({ l, t, ctx, sel, loc, onCheck, onChoice, onAuto, onQty, onMat, onVit, onMot, onTai, onVar, onNote, onPu, onPm, badge, proRaison, choix }: {
  l: Lot; t: Tache; ctx: Ctx; sel: Selection; loc: boolean;
  onCheck: () => void; onChoice: (self: boolean) => void; onAuto: () => void; onQty: (v: number) => void;
  onMat: (m: "pvc" | "alu" | "bois") => void; onVit: (v: "double" | "triple") => void; onMot: (m: "manuel" | "motorise") => void; onTai: (z: "petit" | "grand") => void; onVar: (g: string, o: string) => void; onNote: (v: string) => void; onPu: (v: number | null) => void; onPm: (v: number | null) => void;
  /** `pct` : « {fp} % des travaux » au lieu d'une quantité ; `jalon` : « Démarche », sans montant. */
  badge?: "pct" | "jalon";
  /** Poste réservé aux pros : « Pro obligatoire · <raison> » à la place de « Je le fais ». Défaut :
   *  la raison du poste (`t.pro`). Le neuf passe aussi celle de ses postes repris (`raisonProNeuf`). */
  proRaison?: RaisonPro | null;
  /** Ligne de choix du neuf (N10) : les alternatives du poste, en boutons, sous son libellé, cochée ou
   *  non. Absente (rénovation), la ligne ne change pas. */
  choix?: ReactNode;
}) {
  const locale = useLocale();
  const s = sel[key(l.c, t.n)] || {};
  const on = !!s.on, self = !!s.self;
  const [noteOpen, setNoteOpen] = useState<boolean>(false);
  const [puEdit, setPuEdit] = useState<boolean>(false);
  const variant = !!(t.mat || t.vitrage || t.moto || t.taille || (t.vars && t.vars.length));
  const ep = effPrices(t, s, ctx);
  const matSel = s.mat || t.matDef || (ctx.finition === "premium" ? "alu" : "pvc");
  const vitSel = s.vit || "double";
  const motSel = s.mot || "motorise";
  const taiSel = s.tai || "grand";
  /* Prix unitaires = ce que le moteur compte pour une unité (`puReel`) : région, barème de finition
     du poste, variantes, prix perso (`pu` en « Fait faire », `pm` en « Je le fais »), frais et
     pourcentage. Une formule locale les recalculait avant sans la région ni le barème propre au
     poste : prix unitaire × quantité ne faisait pas le montant de la ligne. */
  const pmEdited = s.pm != null;
  const puEdited = s.pu != null;
  const puMat = ep.sm != null ? puReel(ctx, sel, l, t, true) : null;                     // « Je le fais » (matériaux)
  const puv = ep.fp != null || puEdited ? puReel(ctx, sel, l, t, false) : null;           // « Fait faire »
  const nTxt = dictNeufCommun(locale);
  const dl = dictDetail(locale), L = dl.ligne;
  // Unité du prix unitaire : écrite en français (« /m² », « /m³ ») comme en anglais (« /m² », « /day ») ; la clé reste « m2 ».
  const unitPart = badge !== "pct" && t.u !== "forfait" && t.u !== "u" ? "/" + catT(locale, "unites", t.u) : "";
  // Un frais (taxe, assurance) ne porte pas de TVA : pas de « HT ». N'existe qu'en neuf.
  const uSuffix = t.frais ? unitPart + " · " + nTxt.sansTva : " " + dl.liste.ht + unitPart;
  /* « Je le fais » proposé : la même règle par poste pour les deux natures (`peutFaireSoiMeme`), hors
     poste réservé aux pros. En rénovation, elle décide exactement comme l'ancienne (« dès que le poste
     a un prix de fourniture », vérifié poste par poste et variante par variante par
     `tests/estimateur-briques.test.ts`). Un projet enregistré en « Je le fais » sur un poste devenu
     réservé garde sa puce active. */
  const raison = proRaison ?? t.pro ?? null;
  const avecDiy = (peutFaireSoiMeme(l, t) && !raison) || self;
  /* Pris soi-même : un poste de structure ou de clos-couvert sort de la garantie décennale ; une PAC,
     une climatisation ou une borne reste faisable, avec ce qu'un pro doit encore faire (D2, D4). */
  const horsDecennale = horsDecennaleSoiMeme(l, t);
  const mention = MENTIONS_SOI_MEME[t.id];
  const jalon = badge === "jalon";
  const pctTxt = badge === "pct" && t.fp != null && !puEdited
    ? `${t.fp.toLocaleString(locale === "en" ? "en-US" : "fr-FR")} ${t.assiette === "projet" || (t.frais && t.assiette !== "travaux") ? nTxt.pctProjet : nTxt.pctTravaux}`
    : null;
  const au = isAuto(ctx, l.c, t.n);
  const autoVal = au ? autoQty(ctx, l.c, t.n, sel) ?? 0 : 0;

  return (
    <div className="trow">
      <button className={"cbx" + (on ? " on" : "")} onClick={onCheck} aria-label={on ? L.decocher : L.cocher} />
      <span className="tn">{catT(locale, "postes", t.n)}
        <span className={"pu" + (puEdited ? " edited" : "")}>
          {jalon ? <span className="badge-dem">{nTxt.demarche}</span> : puv == null ? L.surDevis : puEdit ? (
            <input
              className="puin" type="number" inputMode="decimal" autoFocus defaultValue={Math.round(puv)}
              onFocus={(e) => e.currentTarget.select()}
              onClick={(e) => e.stopPropagation()}
              onBlur={(e) => { const v = parseFloat(e.currentTarget.value); setPuEdit(false); if (!Number.isNaN(v) && v > 0 && v !== (puv != null ? Math.round(puv) : null)) onPu(v); }}
              onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") setPuEdit(false); }}
            />
          ) : (
            <>
              <span className="puval" title={L.prixDblClic} onDoubleClick={() => setPuEdit(true)}>{fmt(puv) + uSuffix}</span>
              {puEdited && <span className="pubadge">{L.perso}</span>}
              {puEdited && <button type="button" className="pureset" title={L.prixReset} onClick={() => onPu(null)}>↺</button>}
            </>
          )}
          {t.note && !puEdit && <span className="punote"> · {catT(locale, "notes", t.note)}</span>}
        </span>
      </span>
      {on ? (
        <span className="tctl">
          {badge === "pct" ? (pctTxt && <span className="badge-pct">{pctTxt}</span>) : !jalon && t.u !== "forfait" && (au ? (
            <>
              {s.manual
                ? <NumStepper compact value={s.qty != null ? s.qty : autoVal} min={0} onChange={onQty} />
                : <span className="qauto num" title={L.autoTitre}>{autoVal}</span>}
              <span className="unit">{catT(locale, "unites", t.u)}</span>
              <span className="swiwrap">
                <button className={"swi" + (!s.manual ? " on" : "")} onClick={onAuto} title={L.autoBouton}><span className="knob" /></button>
                <span className={"swilbl" + (!s.manual ? " on" : "")}>{!s.manual ? L.auto : L.manuel}</span>
              </span>
            </>
          ) : (
            <>
              <NumStepper compact value={s.qty != null ? s.qty : (loc ? 1 : 0)} min={0} onChange={onQty} />
              <span className="unit">{loc ? L.jour : catT(locale, "unites", t.u)}</span>
            </>
          ))}
          {/* Une taxe ou une prime d'assurance (frais, % du projet : neuf seulement) ne se « fait » pas
              faire : pas de puce de mode, son prix reste ajustable sur le libellé (double-clic). */}
          {!loc && !jalon && !t.frais && badge !== "pct" && (
            <span className="choice">
              <ChoicePrice label={L.faitFaire} active={!self} activeCls="onA" amount={puv} edited={puEdited}
                onSelect={() => onChoice(false)} onEdit={(v) => onPu(v)} onReset={() => onPu(null)} />
              {avecDiy && puMat != null ? (
                <ChoicePrice label={L.jeLeFais} active={self} activeCls="onS" amount={puMat} edited={pmEdited}
                  onSelect={() => onChoice(true)} onEdit={(v) => onPm(v)} onReset={() => onPm(null)} />
              ) : raison ? (
                <span className="pro-oblig">{`${nTxt.proOblig} · ${nTxt.raisonsPro[raison]}`}</span>
              ) : null}
            </span>
          )}
          {s.note && !noteOpen && isUrl(s.note) && <a className="notechip" href={s.note} target="_blank" rel="noopener noreferrer" title={s.note}>🔗</a>}
          <button type="button" className={"notebtn" + (s.note ? " has" : "")} onClick={() => setNoteOpen((o) => !o)} title={s.note ? L.noteVoir : L.noteAjouter}>📝</button>
          {!jalon && <span className="lineamt num">{fmt(lineHT(ctx, sel, l, t))}</span>}
        </span>
      ) : (
        <span className="tctl"><span className="unit">{t.u === "forfait" ? catT(locale, "unites", "forfait") : loc ? L.parJour : catT(locale, "unites", t.u)}</span></span>
      )}
      {choix && <div className="tchoix">{choix}</div>}
      {on && self && horsDecennale && <div className="decennale" role="note">{ctx.nature === "neuf" ? nTxt.horsDecennale : nTxt.horsDecennaleReno}</div>}
      {on && self && mention && <div className="mention-soi" role="note">{nTxt.mentionsSoiMeme[mention]}</div>}
      {on && variant && (
        <div className="tvariants">
          {t.mat && (
            <span className="vg"><span className="vlab">{L.materiau}</span>
              <span className="vseg">
                <button type="button" className={matSel === "pvc" ? "on" : ""} onClick={() => onMat("pvc")}>{L.materiaux.pvc}</button>
                <button type="button" className={matSel === "bois" ? "on" : ""} onClick={() => onMat("bois")}>{L.materiaux.bois}</button>
                <button type="button" className={matSel === "alu" ? "on" : ""} onClick={() => onMat("alu")}>{L.materiaux.alu}</button>
              </span>
            </span>
          )}
          {t.vitrage && (
            <span className="vg"><span className="vlab">{L.vitrage}</span>
              <span className="vseg">
                <button type="button" className={vitSel === "double" ? "on" : ""} onClick={() => onVit("double")}>{L.vitrages.double}</button>
                <button type="button" className={vitSel === "triple" ? "on" : ""} onClick={() => onVit("triple")}>{L.vitrages.triple}</button>
              </span>
            </span>
          )}
          {t.moto && (
            <span className="vg"><span className="vlab">{L.motorisation}</span>
              <span className="vseg">
                <button type="button" className={motSel === "manuel" ? "on" : ""} onClick={() => onMot("manuel")}>{L.motorisations.manuel}</button>
                <button type="button" className={motSel === "motorise" ? "on" : ""} onClick={() => onMot("motorise")}>{L.motorisations.motorise}</button>
              </span>
            </span>
          )}
          {t.taille && (
            <span className="vg"><span className="vlab">{L.taille}</span>
              <span className="vseg">
                <button type="button" className={taiSel === "petit" ? "on" : ""} onClick={() => onTai("petit")}>{L.tailles.petit}</button>
                <button type="button" className={taiSel === "grand" ? "on" : ""} onClick={() => onTai("grand")}>{L.tailles.grand}</button>
              </span>
            </span>
          )}
          {t.vars && t.vars.map((g) => {
            const cur = (s.vsel && s.vsel[g.k]) || g.opts[0].k;
            return (
              <span className="vg" key={g.k}><span className="vlab">{catT(locale, "vgroups", g.label)}</span>
                <span className="vseg">
                  {/* Aucune option n'affiche son écart de prix — ni le matériau, ni le vitrage,
                      ni la pose. Le montrer sur une seule laisserait croire que les autres sont
                      gratuites. Le total, lui, bouge à chaque clic. */}
                  {g.opts.map((o) => (
                    <button type="button" key={o.k} className={cur === o.k ? "on" : ""} onClick={() => onVar(g.k, o.k)}>{catT(locale, "vopts", o.label)}</button>
                  ))}
                </span>
              </span>
            );
          })}
        </div>
      )}
      {on && noteOpen && (
        <div className="tnote">
          <span className="cl-lk">🔗</span>
          <input className="cl-note" autoFocus placeholder={L.notePlaceholder} value={s.note || ""} onChange={(e) => onNote(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") setNoteOpen(false); }} />
          {isUrl(s.note) && <a className="cl-open" href={s.note} target="_blank" rel="noopener noreferrer">{L.ouvrir}</a>}
          <button type="button" className="notedone" onClick={() => setNoteOpen(false)} title={L.ok}>✓</button>
        </div>
      )}
    </div>
  );
}
