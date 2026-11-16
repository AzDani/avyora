import Link from "next/link";
import { lienAccompagnement, type SourceAccompagnement } from "@/lib/accompagnement/constantes";

/**
 * Une ligne discrète vers l'accompagnement travaux, posée là où le visiteur a déjà un budget en main (résultat d'une
 * estimation, suivi de chantier, module investisseur). Ni bouton plein ni prix : une phrase et un lien souligné, avec
 * sa source (`?src=`, pages privées seulement). Sans hook : utilisable depuis un composant serveur comme client. Le
 * rembourrage vertical du lien agrandit sa zone tactile (44 px) sans bouger le texte.
 */
export default function LienAccompagnement({
  texte,
  lien,
  src,
  className = "",
}: {
  texte: string;
  lien: string;
  src: SourceAccompagnement;
  className?: string;
}) {
  return (
    <p className={`text-[13.5px] leading-relaxed text-muted ${className}`}>
      {texte}{" "}
      <Link
        href={lienAccompagnement(src)}
        className="py-3 font-semibold text-brand-700 underline decoration-brand-300 underline-offset-2 hover:decoration-brand-700"
      >
        {lien}
      </Link>
    </p>
  );
}
