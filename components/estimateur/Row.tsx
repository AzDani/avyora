"use client";

/** Ligne de poste de l'estimateur détaillé : déplacée telle quelle depuis `components/Estimateur.tsx` (C1).
 *  Les props `puReel`, `diy` et `badge` (construction neuve, C4) sont facultatives : absentes, le
 *  rendu est exactement celui d'avant (figé par `tests/estimateur-briques.test.ts`). */
import { useState } from "react";
import NumStepper from "@/components/Stepper";
import { useLocale } from "@/components/i18n/LangProvider";
import { catT } from "@/lib/estimateur/catalog-i18n";
import { key, isAuto, autoQty, lineHT, effPrices, type Ctx, type Selection, type Lot, type Tache } from "@/lib/estimateur";
import { dictNeufCommun } from "@/lib/i18n/neuf-commun";
import { ChoicePrice, fmt, isUrl } from "./partage";

export function Row({ l, t, ctx, sel, coef, loc, onCheck, onChoice, onAuto, onQty, onMat, onVit, onMot, onTai, onVar, onNote, onPu, onPm, puReel, diy, badge }: {
  l: Lot; t: Tache; ctx: Ctx; sel: Selection; coef: number; loc: boolean;
  onCheck: () => void; onChoice: (self: boolean) => void; onAuto: () => void; onQty: (v: number) => void;
  onMat: (m: "pvc" | "alu" | "bois") => void; onVit: (v: "double" | "triple") => void; onMot: (m: "manuel" | "motorise") => void; onTai: (z: "petit" | "grand") => void; onVar: (g: string, o: string) => void; onNote: (v: string) => void; onPu: (v: number | null) => void; onPm: (v: number | null) => void;
  /** Prix unitaire « Fait faire » réel, calculé par le moteur pour une quantité de 1 (frais, `pct` :
   *  seul ce calcul est juste). Fourni, il remplace le calcul local. */
  puReel?: number | null;
  /** « Je le fais » proposé ? Défaut : dès que le poste a un prix de fourniture (rénovation). */
  diy?: boolean;
  /** `pct` : « {fp} % des travaux » au lieu d'une quantité ; `jalon` : « Démarche », sans montant. */
  badge?: "pct" | "jalon";
}) {
  const locale = useLocale();
  const s = sel[key(l.c, t.n)] || {};
  const on = !!s.on, self = !!s.self;
  const [noteOpen, setNoteOpen] = useState<boolean>(false);
  const [puEdit, setPuEdit] = useState<boolean>(false);
  const variant = !!(t.mat || t.vitrage || t.moto || t.taille || (t.vars && t.vars.length));
  const fcoef = (t.fixe || variant) ? 1 : coef;
  const ep = effPrices(t, s, ctx);
  const matSel = s.mat || t.matDef || (ctx.finition === "premium" ? "alu" : "pvc");
  const vitSel = s.vit || "double";
  const motSel = s.mot || "motorise";
  const taiSel = s.tai || "grand";
  // Finition sur MATÉRIAUX uniquement ; MO fixe. Prix unitaires indicatifs (hors coef régional).
  const puMatBase = ep.sm != null ? ep.sm * fcoef : null;                                 // matériaux × finition
  const puvBase = ep.fp != null ? (ep.sm != null ? ep.sm * fcoef + (ep.fp - ep.sm) : ep.fp) : null; // fait-faire = matériaux + MO
  const moUnit = ep.fp != null && ep.sm != null ? ep.fp - ep.sm : 0;                       // MO unitaire (pour l'affichage lié)
  const pmEdited = s.pm != null;
  const puMat = pmEdited ? s.pm! : puMatBase;                                              // « Je le fais » (matériaux)
  const puEdited = s.pu != null;
  const puv = puReel !== undefined ? puReel                                                // neuf : le moteur, quantité 1
    : puEdited ? s.pu!                                                                     // total figé (devis)
    : pmEdited && puMatBase != null ? s.pm! + moUnit                                       // matériaux perso + MO
    : puvBase;                                                                             // calcul normal
  const nTxt = dictNeufCommun(locale);
  const unitPart = badge !== "pct" && t.u !== "forfait" && t.u !== "u" ? "/" + t.u : "";
  // Un frais (taxe, assurance) ne porte pas de TVA : pas de « HT ». N'existe qu'en neuf.
  const uSuffix = t.frais ? unitPart + " · " + nTxt.sansTva : " HT" + unitPart;
  const avecDiy = diy ?? puMatBase != null;
  const jalon = badge === "jalon";
  const pctTxt = badge === "pct" && t.fp != null && !puEdited
    ? `${t.fp.toLocaleString(locale === "en" ? "en-US" : "fr-FR")} ${t.assiette === "projet" || (t.frais && t.assiette !== "travaux") ? nTxt.pctProjet : nTxt.pctTravaux}`
    : null;
  const au = isAuto(ctx, l.c, t.n);
  const autoVal = au ? autoQty(ctx, l.c, t.n, sel) ?? 0 : 0;

  return (
    <div className="trow">
      <button className={"cbx" + (on ? " on" : "")} onClick={onCheck} aria-label={on ? "Décocher" : "Cocher"} />
      <span className="tn">{catT(locale, "postes", t.n)}
        <span className={"pu" + (puEdited ? " edited" : "")}>
          {jalon ? <span className="badge-dem">{nTxt.demarche}</span> : puv == null ? (locale === "en" ? "price on quote" : "prix sur devis") : puEdit ? (
            <input
              className="puin" type="number" inputMode="decimal" autoFocus defaultValue={Math.round(puv)}
              onFocus={(e) => e.currentTarget.select()}
              onClick={(e) => e.stopPropagation()}
              onBlur={(e) => { const v = parseFloat(e.currentTarget.value); setPuEdit(false); if (!Number.isNaN(v) && v > 0 && v !== (puv != null ? Math.round(puv) : null)) onPu(v); }}
              onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") setPuEdit(false); }}
            />
          ) : (
            <>
              <span className="puval" title="Double-clique pour ajuster à ton prix" onDoubleClick={() => setPuEdit(true)}>{fmt(puv) + uSuffix}</span>
              {puEdited && <span className="pubadge">perso</span>}
              {puEdited && <button type="button" className="pureset" title="Rétablir le prix AVYORA par défaut" onClick={() => onPu(null)}>↺</button>}
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
                : <span className="qauto num" title="calculé automatiquement depuis vos infos de départ">{autoVal}</span>}
              <span className="unit">{catT(locale, "unites", t.u)}</span>
              <span className="swiwrap">
                <button className={"swi" + (!s.manual ? " on" : "")} onClick={onAuto} title="Auto = quantité calculée. Désactivez pour saisir à la main."><span className="knob" /></button>
                <span className={"swilbl" + (!s.manual ? " on" : "")}>{!s.manual ? "auto" : (locale === "en" ? "manual" : "manuel")}</span>
              </span>
            </>
          ) : (
            <>
              <NumStepper compact value={s.qty != null ? s.qty : (loc ? 1 : 0)} min={0} onChange={onQty} />
              <span className="unit">{loc ? (locale === "en" ? "day" : "j") : catT(locale, "unites", t.u)}</span>
            </>
          ))}
          {!loc && !jalon && (
            <span className="choice">
              <ChoicePrice label={locale === "en" ? "Hire out" : "Fait faire"} active={!self} activeCls="onA" amount={puv} edited={puEdited}
                onSelect={() => onChoice(false)} onEdit={(v) => onPu(v)} onReset={() => onPu(null)} />
              {avecDiy && puMatBase != null && (
                <ChoicePrice label={locale === "en" ? "DIY" : "Je le fais"} active={self} activeCls="onS" amount={puMat} edited={pmEdited}
                  onSelect={() => onChoice(true)} onEdit={(v) => onPm(v)} onReset={() => onPm(null)} />
              )}
            </span>
          )}
          {s.note && !noteOpen && isUrl(s.note) && <a className="notechip" href={s.note} target="_blank" rel="noopener noreferrer" title={s.note}>🔗</a>}
          <button type="button" className={"notebtn" + (s.note ? " has" : "")} onClick={() => setNoteOpen((o) => !o)} title={s.note ? "Voir / modifier la note" : "Ajouter une note / un lien"}>📝</button>
          {!jalon && <span className="lineamt num">{fmt(lineHT(ctx, sel, l, t))}</span>}
        </span>
      ) : (
        <span className="tctl"><span className="unit">{t.u === "forfait" ? catT(locale, "unites", "forfait") : loc ? (locale === "en" ? "/day" : "/jour") : catT(locale, "unites", t.u)}</span></span>
      )}
      {on && variant && (
        <div className="tvariants">
          {t.mat && (
            <span className="vg"><span className="vlab">{locale === "en" ? "Material" : "Matériau"}</span>
              <span className="vseg">
                <button type="button" className={matSel === "pvc" ? "on" : ""} onClick={() => onMat("pvc")}>PVC</button>
                <button type="button" className={matSel === "bois" ? "on" : ""} onClick={() => onMat("bois")}>Bois</button>
                <button type="button" className={matSel === "alu" ? "on" : ""} onClick={() => onMat("alu")}>{locale === "en" ? "Aluminium" : "Alu"}</button>
              </span>
            </span>
          )}
          {t.vitrage && (
            <span className="vg"><span className="vlab">{locale === "en" ? "Glazing" : "Vitrage"}</span>
              <span className="vseg">
                <button type="button" className={vitSel === "double" ? "on" : ""} onClick={() => onVit("double")}>{locale === "en" ? "Double" : "Double"}</button>
                <button type="button" className={vitSel === "triple" ? "on" : ""} onClick={() => onVit("triple")}>{locale === "en" ? "Triple" : "Triple"}</button>
              </span>
            </span>
          )}
          {t.moto && (
            <span className="vg"><span className="vlab">{locale === "en" ? "Motorization" : "Motorisation"}</span>
              <span className="vseg">
                <button type="button" className={motSel === "manuel" ? "on" : ""} onClick={() => onMot("manuel")}>{locale === "en" ? "Manual" : "Manuel"}</button>
                <button type="button" className={motSel === "motorise" ? "on" : ""} onClick={() => onMot("motorise")}>{locale === "en" ? "Motorized" : "Motorisé"}</button>
              </span>
            </span>
          )}
          {t.taille && (
            <span className="vg"><span className="vlab">{locale === "en" ? "Size" : "Taille"}</span>
              <span className="vseg">
                <button type="button" className={taiSel === "petit" ? "on" : ""} onClick={() => onTai("petit")}>{locale === "en" ? "Small" : "Petit"}</button>
                <button type="button" className={taiSel === "grand" ? "on" : ""} onClick={() => onTai("grand")}>{locale === "en" ? "Large" : "Grand"}</button>
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
          <input className="cl-note" autoFocus placeholder="Note ou lien matériau (https://…)" value={s.note || ""} onChange={(e) => onNote(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") setNoteOpen(false); }} />
          {isUrl(s.note) && <a className="cl-open" href={s.note} target="_blank" rel="noopener noreferrer">Ouvrir ↗</a>}
          <button type="button" className="notedone" onClick={() => setNoteOpen(false)} title="OK">✓</button>
        </div>
      )}
    </div>
  );
}
