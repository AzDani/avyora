"use client";

/**
 * Le pont : amener un plan dessiné dans un projet.
 *
 * Trois étapes, dans cet ordre et pas un autre :
 *   1. on colle (ou on dépose) le contrat émis par l'éditeur ;
 *   2. le serveur le traduit et rend le RAPPORT — rien n'est encore écrit dans le devis ;
 *   3. l'utilisateur relit, et c'est sa validation qui applique les quantités.
 *
 * L'étape 2 sans écriture est tout l'intérêt du double check posé en D1 : si l'import écrivait
 * directement, l'écran ne servirait qu'à annoncer un fait accompli.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ValidationPlan } from "./ValidationPlan";
import type { LigneInjectee, RapportInjection } from "@/lib/estimateur/plan-injection";

type Reponse = { bilan: RapportInjection["bilan"]; lignes: LigneInjectee[]; error?: string };

export function ImporterPlan({ projetId }: { projetId: string }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [texte, setTexte] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [rapport, setRapport] = useState<RapportInjection | null>(null);

  async function envoyer(contenu: string) {
    setErreur(null); setEnCours(true);
    try {
      let plan: unknown;
      try { plan = JSON.parse(contenu); }
      catch { setErreur("Ce n'est pas un plan AVYORA : le texte collé n'est pas lisible."); return; }
      const r = await fetch(`/api/projects/${projetId}/plan`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(plan),
      });
      const data = (await r.json()) as Reponse;
      if (!r.ok) { setErreur(data.error ?? "L'import a échoué."); return; }
      setRapport({ selection: {}, lignes: data.lignes, bilan: data.bilan });
    } finally { setEnCours(false); }
  }

  async function valider() {
    setEnCours(true);
    try {
      const r = await fetch(`/api/projects/${projetId}/plan/appliquer`, { method: "POST" });
      if (!r.ok) { const d = await r.json().catch(() => ({})); setErreur(d.error ?? "La validation a échoué."); return; }
      setRapport(null); setOuvert(false); setTexte("");
      router.refresh();
    } finally { setEnCours(false); }
  }

  if (rapport) {
    return (
      <div>
        <ValidationPlan rapport={rapport} onValider={valider} />
        {erreur && <p style={{ color: "#b91c1c", fontSize: 13 }}>{erreur}</p>}
        <button type="button" className="btn ghost" onClick={() => setRapport(null)} disabled={enCours} style={{ marginTop: 10 }}>
          Annuler — ne rien appliquer
        </button>
      </div>
    );
  }

  if (!ouvert) {
    return (
      <button type="button" className="btn ghost" onClick={() => setOuvert(true)}>
        📐 Importer un plan
      </button>
    );
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <p style={{ fontSize: 13, color: "#565a75", margin: 0 }}>
        Dans l&apos;éditeur de plan, clique <b>« Envoyer vers mon estimation »</b>, copie le bloc, et colle-le ici.
        Rien ne sera écrit dans ton devis avant que tu aies relu.
      </p>
      <textarea
        value={texte} onChange={(e) => setTexte(e.target.value)} rows={5} spellCheck={false}
        placeholder="Colle ici le plan copié depuis l'éditeur…"
        style={{ width: "100%", fontFamily: "ui-monospace, monospace", fontSize: 11, padding: 10, borderRadius: 10, border: "1px solid #e9eaf3" }}
      />
      <input
        type="file" accept="application/json,.json"
        onChange={async (e) => { const f = e.target.files?.[0]; if (f) await envoyer(await f.text()); }}
        style={{ fontSize: 12 }}
      />
      {erreur && <p style={{ color: "#b91c1c", fontSize: 13, margin: 0 }}>{erreur}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="btn" onClick={() => envoyer(texte)} disabled={enCours || texte.trim().length < 10}>
          {enCours ? "Lecture…" : "Lire ce plan"}
        </button>
        <button type="button" className="btn ghost" onClick={() => { setOuvert(false); setErreur(null); }} disabled={enCours}>
          Annuler
        </button>
      </div>
    </div>
  );
}
