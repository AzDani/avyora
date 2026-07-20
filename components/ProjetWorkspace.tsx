"use client";

import { useState, type ReactNode } from "react";
import ProjetDashboard, { type DashboardMetrics } from "@/components/ProjetDashboard";

export type TabId = "overview" | "estimation" | "chantier" | "documents" | "rentabilite" | "devis";

const ONGLETS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Vue d'ensemble" },
  { id: "estimation", label: "Estimation" },
  { id: "chantier", label: "Chantier" },
  { id: "documents", label: "Documents" },
  { id: "rentabilite", label: "Rentabilité" },
  { id: "devis", label: "Devis" },
];

export default function ProjetWorkspace({
  metrics,
  modifierHref,
  sections,
  badges,
}: {
  metrics: DashboardMetrics;
  modifierHref: string;
  sections: Record<Exclude<TabId, "overview">, ReactNode>;
  badges?: Partial<Record<TabId, number>>;
}) {
  const [tab, setTab] = useState<TabId>("overview");

  return (
    <div className="space-y-6">
      {/* Navigation par onglets */}
      <div className="-mx-4 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0">
        <nav className="flex min-w-max gap-1">
          {ONGLETS.map((o) => {
            const actif = tab === o.id;
            const n = badges?.[o.id];
            return (
              <button
                key={o.id}
                onClick={() => setTab(o.id)}
                className={`relative flex items-center gap-1.5 whitespace-nowrap px-3.5 py-3 text-sm font-medium transition-colors ${
                  actif ? "text-brand-700" : "text-muted hover:text-ink"
                }`}
              >
                {o.label}
                {n != null && n > 0 && (
                  <span className={`num rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${actif ? "bg-brand-100 text-brand-700" : "bg-surface-2 text-faint"}`}>
                    {n}
                  </span>
                )}
                {actif && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600" />}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Contenu de l'onglet */}
      <div className="animate-fade">
        {tab === "overview" ? (
          <ProjetDashboard metrics={metrics} onNavigate={setTab} modifierHref={modifierHref} />
        ) : (
          sections[tab]
        )}
      </div>
    </div>
  );
}
