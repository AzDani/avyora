"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { passerEnComptePro } from "@/lib/actions/type-compte";
import { CHAMP, Legende, Req } from "@/components/compte/Communs";

/**
 * Passer d'un compte particulier à un compte pro (26/11/2026) : le SIRET d'un établissement ACTIF du bâtiment, vérifié
 * automatiquement dans le répertoire officiel des entreprises. Sinon le compte reste particulier.
 */
export default function PasserEnPro({ nomInitial = "", suite }: { nomInitial?: string; suite?: string }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [siret, setSiret] = useState("");
  const [nom, setNom] = useState(nomInitial);
  const [retour, setRetour] = useState<{ ok: boolean; msg: string } | null>(null);
  const envoyer = (e: React.FormEvent) => {
    e.preventDefault();
    setRetour(null);
    demarrer(async () => {
      const r = await passerEnComptePro({ siret, nom }).catch(() => ({ ok: false as const, erreur: "Réessaie dans un instant." }));
      if (r.ok) {
        setRetour({ ok: true, msg: r.entreprise ? `Vérifié : ${r.entreprise}. Ton compte est maintenant un compte pro.` : "Ton compte est un compte pro." });
        if (suite) router.push(suite);
        router.refresh();
      } else setRetour({ ok: false, msg: r.erreur });
    });
  };
  return (
    <form onSubmit={envoyer} noValidate className="space-y-4">
      <div>
        <label htmlFor="pp-siret" className="flex items-baseline gap-1.5 text-[14px] font-semibold text-ink">Le SIRET de ton entreprise <Req /></label>
        <input id="pp-siret" inputMode="numeric" required aria-required="true" placeholder="123 456 789 00012" maxLength={20} value={siret} onChange={(e) => setSiret(e.target.value)} className={CHAMP + " mt-1.5"} />
        <p className="mt-1 text-[12.5px] text-faint">Vérifié automatiquement auprès du répertoire officiel des entreprises : l&apos;établissement doit être actif et son activité du bâtiment (codes 41, 42, 43, ou architecture et ingénierie).</p>
      </div>
      <div>
        <label htmlFor="pp-nom" className="flex items-baseline gap-1.5 text-[14px] font-semibold text-ink">Ton prénom et ton nom <Req /></label>
        <input id="pp-nom" autoComplete="name" required aria-required="true" maxLength={120} value={nom} onChange={(e) => setNom(e.target.value)} className={CHAMP + " mt-1.5"} />
      </div>
      <button type="submit" disabled={enCours} className="btn btn-primary min-h-11 px-5">{enCours ? "Vérification…" : "Passer en compte pro"}</button>
      <Legende />
      {retour && <p role={retour.ok ? "status" : "alert"} className={"text-[13.5px] " + (retour.ok ? "font-semibold text-[#0b5e40]" : "text-[#b42318]")}>{retour.msg}</p>}
    </form>
  );
}
