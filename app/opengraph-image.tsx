import { ImageResponse } from "next/og";

export const alt = "AVYORA — sache ce que ça coûte. Avant de signer.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Image d'aperçu au partage de lien (Open Graph / Twitter), aux couleurs de marque AVYORA. */
export default function OpengraphImage() {
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
          fontFamily: "sans-serif",
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
          <div style={{ display: "flex", fontSize: "84px", fontWeight: 800, lineHeight: 1.05 }}>Sache ce que ça coûte.</div>
          <div style={{ display: "flex", fontSize: "84px", fontWeight: 800, lineHeight: 1.05, color: "#A78BFA" }}>Avant de signer.</div>
          <div style={{ display: "flex", marginTop: "28px", fontSize: "30px", color: "rgba(199,197,253,0.85)" }}>
            Estimation travaux · analyse de devis IA · rentabilité locative
          </div>
        </div>

        {/* Pied */}
        <div style={{ display: "flex", fontSize: "24px", color: "rgba(255,255,255,0.55)" }}>
          Le copilote des investisseurs locatifs · France 2026
        </div>
      </div>
    ),
    { ...size }
  );
}
