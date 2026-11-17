/** Le titre d'une page de l'admin, avec une phrase qui dit à quoi elle sert, et une action à droite si besoin. */
export default function EnTeteAdmin({ titre, texte, children }: { titre: string; texte?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[24px] font-semibold tracking-tight text-ink">{titre}</h1>
        {texte && <p className="mt-1 max-w-[62ch] text-[13.5px] text-muted">{texte}</p>}
      </div>
      {children}
    </div>
  );
}
