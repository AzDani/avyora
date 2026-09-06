import Link from "next/link";
import { listProjets, type Projet } from "@/lib/data/projects";
import { estimationProjet, avancementProjet } from "@/lib/estimateur";
import ListeProjets, { type ProjetCarte } from "@/components/ListeProjets";
import ClaimDraft from "@/components/ClaimDraft";
import ProUpsell from "@/components/ProUpsell";
import { getUser, estPro } from "@/lib/auth";

export const dynamic = "force-dynamic";

function versCarte(p: Projet): ProjetCarte {
  const est = estimationProjet(p.reponses);
  const av = avancementProjet(p.reponses);
  return {
    id: p.id,
    nom: p.nom,
    type_bien: p.type_bien,
    surface: p.surface,
    code_postal: p.code_postal,
    ttc: est?.ttc ?? 0,
    archived: p.archived,
    eurM2: est?.eurM2 ?? 0,
    statut: av.statut,
    donePct: av.pct,
    progPct: av.total > 0 ? Math.round((av.prog / av.total) * 100) : 0,
  };
}

function euros(n: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

export default async function ProjetsPage() {
  const [user, actifs, archivesRows] = await Promise.all([getUser(), listProjets(false), listProjets(true)]);
  const isPro = !!user && estPro(user);
  const projets = actifs.map(versCarte);
  const archives = archivesRows.map(versCarte);
  const sumTravaux = projets.reduce((s, p) => s + p.ttc, 0);
  const sumSurface = projets.reduce((s, p) => s + p.surface, 0);
  const nbEnChantier = projets.filter((p) => p.statut === "en_cours").length;

  return (
    <div className="space-y-8">
      <ClaimDraft />

      {projets.length > 0 ? (
        <header className="av-hero animate-rise">
          <span className="glow" aria-hidden="true" />
          <span className="eb">
            <span className="dot" />
            Portefeuille
          </span>
          <div className="big">
            <span className="data">{euros(sumTravaux)}</span>
            <small>de travaux estimés</small>
          </div>
          <p className="cap">
            {projets.length} projet{projets.length > 1 ? "s" : ""} actif{projets.length > 1 ? "s" : ""} ·{" "}
            {sumSurface.toLocaleString("fr-FR")} m² cumulés
            {nbEnChantier > 0 ? ` · ${nbEnChantier} chantier${nbEnChantier > 1 ? "s" : ""} en cours` : ""}
          </p>
          <div className="pills">
            <Pill k="Projets actifs" v={`${projets.length}`} />
            <Pill k="Valeur travaux" v={euros(sumTravaux)} accent />
            <Pill k="Surface cumulée" v={`${sumSurface.toLocaleString("fr-FR")} m²`} />
            <Pill k="En chantier" v={`${nbEnChantier}`} />
          </div>
        </header>
      ) : (
        <header className="animate-rise">
          <p className="eyebrow">Portefeuille</p>
          <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-ink">Projets</h1>
          <p className="mt-1.5 text-[15px] text-muted">
            Tes estimations de rénovation, retrouvées et modifiables à tout moment.
          </p>
        </header>
      )}

      {!isPro && <ProUpsell />}

      <ListeProjets projets={projets} archives={archives} />

      <style>{HERO_CSS}</style>
    </div>
  );
}

function Pill({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="pill">
      <div className="k">{k}</div>
      <div className={"v data" + (accent ? " acc" : "")}>{v}</div>
    </div>
  );
}

const HERO_CSS = `
.av-hero{position:relative;overflow:hidden;border-radius:20px;color:#fff;padding:26px 28px;
  background:linear-gradient(140deg,#1E1B4B,#241f5e 55%,#191640);
  box-shadow:0 24px 60px -26px rgba(30,27,75,.55)}
.av-hero .glow{position:absolute;width:340px;height:340px;border-radius:50%;background:rgba(124,58,237,.35);filter:blur(80px);top:-150px;right:-80px;pointer-events:none}
.av-hero .eb{position:relative;z-index:1;display:inline-flex;align-items:center;gap:8px;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:#c4b5fd;font-weight:600;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);padding:5px 12px;border-radius:999px}
.av-hero .eb .dot{width:6px;height:6px;border-radius:50%;background:#a78bfa}
.av-hero .big{position:relative;z-index:1;font-size:clamp(28px,5vw,38px);font-weight:600;letter-spacing:-.02em;margin-top:14px;line-height:1}
.av-hero .big small{font-size:15px;opacity:.7;margin-left:9px;font-weight:500}
.av-hero .cap{position:relative;z-index:1;font-size:13px;color:#d7d4f2;margin-top:9px}
.av-hero .pills{position:relative;z-index:1;display:flex;flex-wrap:wrap;gap:9px;margin-top:18px}
.av-hero .pill{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:9px 14px;min-width:120px}
.av-hero .pill .k{font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:#b7b3e0}
.av-hero .pill .v{font-weight:600;font-size:16px;margin-top:4px}
.av-hero .pill .v.acc{color:#c4b5fd}
`;
