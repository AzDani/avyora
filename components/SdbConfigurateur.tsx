"use client";

/**
 * Configurateur de salle de bain — autonome (value + onChange), sans dépendance au mode perso.
 * Utilisé comme widget du parcours data-driven (type `configurateur_sdb`, binding `sdbConfigs`).
 * Produit exactement la forme `sdbConfigs` attendue par lib/estimation.ts.
 */
export type SdbCfg = {
  surface: number;
  douche: string;
  wc: string;
  vasque: string;
  plomberie: string;
  faienceTouteHauteur: boolean;
  secheServiettes: boolean;
  /** Réponses aux sous-questions custom (config-driven : Miroir, etc.). Clé = id de la question. */
  custom?: Record<string, string | string[]>;
};

/**
 * Personnalisation config-driven du configurateur (vit dans la config de la question parcours SDB).
 * Permet de retrouver la perso de l'utilisateur sans hardcoder : sous-questions ajoutées + overrides
 * d'affichage sur le champ « Douche / baignoire ». Les champs typés restent intacts (estimation sûre).
 */
export type SdbCustomConfig = {
  questions?: { id: string; label: string; type: "unique" | "multiple"; options: { label: string; valeur: string }[] }[];
  doucheLabels?: Record<string, string>; // valeur intégrée -> libellé renommé
  doucheHidden?: string[];               // valeurs intégrées masquées
  doucheAjouts?: { label: string; valeur: string }[]; // choix ajoutés au champ douche (informatifs)
};

const defautSdb = (): SdbCfg => ({
  surface: 0, douche: "standard", wc: "suspendu", vasque: "simple",
  plomberie: "encastree", faienceTouteHauteur: false, secheServiettes: true,
});

const pastille = (sel: boolean) =>
  `inline-flex items-center rounded-field border px-3 py-2 text-sm transition-all duration-150 ${
    sel
      ? "border-brand-500 bg-brand-50 font-semibold text-brand-700 ring-1 ring-brand-500/25"
      : "border-line-strong bg-surface font-medium text-muted hover:border-brand-300 hover:text-ink"
  }`;

function Choix({ label, choix, valeur, onChange }: { label: string; choix: [string, string][]; valeur: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="text-sm font-medium mb-1.5">{label}</div>
      <div className="flex flex-wrap gap-2">
        {choix.map(([l, v]) => (
          <button key={v} type="button" onClick={() => onChange(v)} className={pastille(valeur === v)}>{l}</button>
        ))}
      </div>
    </div>
  );
}

export default function SdbConfigurateur({ value, onChange, config }: { value: SdbCfg[] | undefined; onChange: (v: SdbCfg[]) => void; config?: SdbCustomConfig }) {
  const configs = value && value.length > 0 ? value : [defautSdb()];

  const setNb = (n: number) => {
    const cur = configs.slice();
    while (cur.length < n) cur.push(defautSdb());
    cur.length = Math.max(1, n);
    onChange(cur);
  };
  const maj = (i: number, key: keyof SdbCfg, v: string | number | boolean) => {
    const cur = configs.slice();
    cur[i] = { ...cur[i], [key]: v };
    onChange(cur);
  };
  const majCustom = (i: number, qid: string, v: string | string[]) => {
    const cur = configs.slice();
    cur[i] = { ...cur[i], custom: { ...(cur[i].custom ?? {}), [qid]: v } };
    onChange(cur);
  };

  // Champ « Douche / baignoire » : choix intégrés + overrides config (renommage, masquage, ajouts).
  const doucheChoix = (): [string, string][] => {
    const base: [string, string][] = [
      ["Douche italienne", "italienne"], ["Douche standard", "standard"],
      ["Baignoire", "baignoire"], ["Douche + baignoire", "douche_et_baignoire"],
    ];
    const hidden = new Set(config?.doucheHidden ?? []);
    const labels = config?.doucheLabels ?? {};
    const res = base.filter(([, v]) => !hidden.has(v)).map(([l, v]) => [labels[v] ?? l, v] as [string, string]);
    for (const a of config?.doucheAjouts ?? []) res.push([a.label, a.valeur]);
    return res;
  };

  return (
    <div className="space-y-3 rounded-field bg-surface-2 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-ink">Salles de bain à équiper</div>
        <label className="flex items-center gap-2 text-xs text-muted">
          Combien ?
          <input
            type="number" min={1} max={6}
            className="input num w-16 px-2 py-1.5"
            value={configs.length}
            onChange={(e) => setNb(Math.max(1, Number(e.target.value) || 1))}
          />
        </label>
      </div>
      {configs.map((c, i) => (
        <div key={i} className="space-y-3 rounded-field border border-line bg-surface p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-ink">Salle de bain #{i + 1}</div>
            <label className="flex items-center gap-1.5 text-xs text-muted">
              Surface m²
              <input type="number" min={0} step="0.5" placeholder="ex. 6"
                className="input num w-20 px-2 py-1.5"
                value={c.surface || ""}
                onChange={(e) => maj(i, "surface", Number(e.target.value) || 0)} />
            </label>
          </div>
          <Choix label="Douche / baignoire" valeur={c.douche} onChange={(v) => maj(i, "douche", v)}
            choix={doucheChoix()} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Choix label="WC" valeur={c.wc} onChange={(v) => maj(i, "wc", v)} choix={[["Suspendu", "suspendu"], ["Classique", "classique"], ["Aucun", "aucun"]]} />
            <Choix label="Vasque" valeur={c.vasque} onChange={(v) => maj(i, "vasque", v)} choix={[["Simple", "simple"], ["Double", "double"]]} />
            <Choix label="Plomberie" valeur={c.plomberie} onChange={(v) => maj(i, "plomberie", v)} choix={[["Encastrée", "encastree"], ["Apparente", "apparente"]]} />
            <Choix label="Faïence" valeur={c.faienceTouteHauteur ? "toute" : "mi"} onChange={(v) => maj(i, "faienceTouteHauteur", v === "toute")} choix={[["Mi-hauteur + douche", "mi"], ["Toute hauteur", "toute"]]} />
          </div>
          <Choix label="Sèche-serviettes" valeur={c.secheServiettes ? "oui" : "non"} onChange={(v) => maj(i, "secheServiettes", v === "oui")} choix={[["Oui", "oui"], ["Non", "non"]]} />
          {/* Sous-questions custom (config-driven : Miroir, etc.) */}
          {(config?.questions ?? []).map((q) => {
            const choix = q.options.map((o) => [o.label, o.valeur] as [string, string]);
            if (q.type === "multiple") {
              const sel = new Set(Array.isArray(c.custom?.[q.id]) ? (c.custom![q.id] as string[]) : []);
              return (
                <div key={q.id}>
                  <div className="text-sm font-medium mb-1.5">{q.label}</div>
                  <div className="flex flex-wrap gap-2">
                    {choix.map(([l, v]) => (
                      <button key={v} type="button" className={pastille(sel.has(v))}
                        onClick={() => { const n = new Set(sel); n.has(v) ? n.delete(v) : n.add(v); majCustom(i, q.id, [...n]); }}>{l}</button>
                    ))}
                  </div>
                </div>
              );
            }
            return (
              <Choix key={q.id} label={q.label} valeur={(c.custom?.[q.id] as string) ?? ""}
                onChange={(v) => majCustom(i, q.id, v)} choix={choix} />
            );
          })}
        </div>
      ))}
      <p className="text-xs text-slate-400">Chaque salle de bain est chiffrée séparément selon son équipement et sa taille.</p>
    </div>
  );
}
