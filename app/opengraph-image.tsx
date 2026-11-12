import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { betaActive, libellesBeta } from "@/lib/beta";
import { FEATURES } from "@/lib/features";

export const alt = "AVYORA — sache ce que ça coûte. Avant de signer.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Le pied de l'image : l'argument du moment, tel que le site le dit. L'image est générée au build :
 * pendant la bêta elle porte la gratuité (c'est la vignette que verront les personnes touchées par la
 * promotion), après elle redevient neutre au déploiement suivant. Construction et plan 3D ne sont cités
 * que si leur interrupteur est allumé (lib/features.ts).
 */
function pied(): string {
  const offre = ["rénovation", ...(FEATURES.neuf ? ["construction"] : []), ...(FEATURES.plans ? ["plan 3D"] : [])].join(", ");
  return betaActive() ? `Bêta gratuite jusqu'au ${libellesBeta("fr").fin} · ${offre}` : `Estimation de travaux · ${offre} · France`;
}

/**
 * Image d'aperçu au partage de lien (Open Graph / Twitter), aux couleurs de marque AVYORA.
 *
 * ⚠️ Police FOURNIE : sans l'option `fonts`, ImageResponse retombe sur une police de secours sans
 * graisse grasse — le titre sortait en maigre, avec des espaces irréguliers entre les mots. Les deux
 * fichiers sont des instances statiques (400 et 700) de la Geist variable du dépôt
 * (public/fonts/geist, licence OFL dans assets/fonts) : Satori ne lit ni le woff2 ni les polices variables.
 * Leurs tables GPOS/GSUB sont retirées : Satori y appliquait de travers des ajustements autour de
 * l'espace (« Avant  de signer », « Estimation  travaux ») ; sans elles, l'espacement est régulier.
 * Recette (fontTools) : instancer.instantiateVariableFont(wght=400 | 700), puis supprimer GPOS, GSUB, GDEF.
 */
export default async function OpengraphImage() {
  const [regular, bold] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/Geist-Regular.ttf")),
    readFile(join(process.cwd(), "assets/fonts/Geist-Bold.ttf")),
  ]);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: "linear-gradient(135deg, #1E1B4B 0%, #241f5e 55%, #191640 100%)",
          color: "#ffffff",
          fontFamily: "Geist",
        }}
      >
        {/* Wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "18px",
              background: "#4F46E5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="46" height="46" viewBox="0 0 64 64">
              <path d="M17 45 L32 15 L47 45" fill="none" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="32" cy="39" r="4.5" fill="#C4B5FD" />
            </svg>
          </div>
          <div style={{ display: "flex", fontSize: "40px", fontWeight: 700, letterSpacing: "6px" }}>
            <span>AVY</span>
            <span style={{ color: "#A78BFA" }}>ORA</span>
          </div>
        </div>

        {/* Accroche */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: "84px", fontWeight: 700, lineHeight: 1.05, letterSpacing: "-2px" }}>Sache ce que ça coûte.</div>
          <div style={{ display: "flex", fontSize: "84px", fontWeight: 700, lineHeight: 1.05, letterSpacing: "-2px", color: "#A78BFA" }}>Avant de signer.</div>
          <div style={{ display: "flex", marginTop: "28px", fontSize: "30px", fontWeight: 400, color: "rgba(199,197,253,0.85)" }}>
            Estimation travaux · prix poste par poste · ajustés à ta région
          </div>
        </div>

        {/* Pied */}
        <div style={{ display: "flex", fontSize: "26px", fontWeight: 400, color: "rgba(255,255,255,0.7)" }}>
          {pied()}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Geist", data: regular, weight: 400, style: "normal" },
        { name: "Geist", data: bold, weight: 700, style: "normal" },
      ],
    }
  );
}
