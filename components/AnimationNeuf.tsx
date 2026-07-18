/* Timelapse SVG « construction neuve » — boucle 20 s, 100 % CSS, zéro dépendance. */
export default function AnimationNeuf() {
  return (
    <div className="avn-wrap">
      <style>{`
        .avn-wrap { position: relative; }
        .avn-wrap svg { display: block; width: 100%; height: auto; }
        .avn-scene { animation: avn-scene 20s linear infinite; }
        .avn-cloud1 { animation: avn-cloud1 20s linear infinite; }
        .avn-cloud2 { animation: avn-cloud2 20s linear infinite; }
        .avn-crane { animation: avn-crane 20s linear infinite; }
        .avn-trolley { animation: avn-trolley 20s linear infinite; }
        .avn-fond { transform-box: fill-box; transform-origin: left center; animation: avn-fond 20s linear infinite; }
        .avn-dalle { animation: avn-fade 20s linear infinite; animation-delay: 0s; }
        .avn-rdc { transform-box: fill-box; transform-origin: center bottom; animation: avn-rdc 20s linear infinite; }
        .avn-etage { transform-box: fill-box; transform-origin: center bottom; animation: avn-etage 20s linear infinite; }
        .avn-toit { animation: avn-toit 20s linear infinite; }
        .avn-chem { animation: avn-chem 20s linear infinite; }
        .avn-porte { transform-box: fill-box; transform-origin: center bottom; animation: avn-porte 20s linear infinite; }
        .avn-f1 { animation: avn-fen 20s linear infinite; }
        .avn-f2 { animation: avn-fen2 20s linear infinite; }
        .avn-lum { animation: avn-lum 20s linear infinite; }
        .avn-arbre { transform-box: fill-box; transform-origin: center bottom; animation: avn-arbre 20s linear infinite; }
        .avn-point { transform-box: fill-box; transform-origin: center center; animation: avn-point 20s linear infinite; }
        @keyframes avn-scene { 0%, 96% { opacity: 1; } 99%, 100% { opacity: 0; } }
        @keyframes avn-cloud1 { 0% { transform: translateX(0); } 100% { transform: translateX(120px); } }
        @keyframes avn-cloud2 { 0% { transform: translateX(0); } 100% { transform: translateX(-90px); } }
        @keyframes avn-crane { 0% { opacity: 0; } 2%, 68% { opacity: 1; } 73%, 100% { opacity: 0; } }
        @keyframes avn-trolley { 0%, 14% { transform: translateX(0); } 30% { transform: translateX(90px); } 46% { transform: translateX(20px); } 62% { transform: translateX(70px); } 100% { transform: translateX(70px); } }
        @keyframes avn-fond { 0%, 4% { transform: scaleX(0); } 10%, 100% { transform: scaleX(1); } }
        @keyframes avn-fade { 0%, 10% { opacity: 0; } 14%, 100% { opacity: 1; } }
        @keyframes avn-rdc { 0%, 14% { transform: scaleY(0); } 26%, 100% { transform: scaleY(1); } }
        @keyframes avn-etage { 0%, 27% { transform: scaleY(0); } 40%, 100% { transform: scaleY(1); } }
        @keyframes avn-toit { 0%, 42% { opacity: 0; transform: translateY(-26px); } 52%, 100% { opacity: 1; transform: translateY(0); } }
        @keyframes avn-chem { 0%, 53% { opacity: 0; } 58%, 100% { opacity: 1; } }
        @keyframes avn-porte { 0%, 56% { opacity: 0; transform: scaleY(0.3); } 62%, 100% { opacity: 1; transform: scaleY(1); } }
        @keyframes avn-fen { 0%, 60% { opacity: 0; } 65%, 100% { opacity: 1; } }
        @keyframes avn-fen2 { 0%, 65% { opacity: 0; } 70%, 100% { opacity: 1; } }
        @keyframes avn-lum { 0%, 80% { opacity: 0; } 86%, 100% { opacity: 0.9; } }
        @keyframes avn-arbre { 0%, 72% { transform: scaleY(0); } 80%, 100% { transform: scaleY(1); } }
        @keyframes avn-point { 0%, 86% { opacity: 0; transform: scale(0); } 90% { opacity: 1; transform: scale(1.4); } 93%, 100% { opacity: 1; transform: scale(1); } }
        @media (prefers-reduced-motion: reduce) {
          .avn-wrap * { animation: none !important; }
        }
      `}</style>
      <svg viewBox="0 0 480 360" role="img" aria-label="Timelapse animé d'une maison en construction : fondations, murs, toit, finitions">
        <rect width="480" height="360" rx="24" fill="#1E1B4B" />
        <circle cx="60" cy="50" r="2" fill="#6D67B8" />
        <circle cx="430" cy="80" r="2" fill="#6D67B8" />
        <circle cx="250" cy="36" r="1.5" fill="#6D67B8" />
        <g className="avn-cloud1">
          <rect x="40" y="60" width="70" height="14" rx="7" fill="#2E2A5E" />
        </g>
        <g className="avn-cloud2">
          <rect x="330" y="40" width="90" height="14" rx="7" fill="#2E2A5E" />
        </g>
        <line x1="24" y1="300" x2="456" y2="300" stroke="#6D67B8" strokeWidth="3" strokeLinecap="round" />
        <g className="avn-scene">
          <g className="avn-crane">
            <line x1="90" y1="300" x2="90" y2="78" stroke="#A78BFA" strokeWidth="5" strokeLinecap="round" />
            <line x1="90" y1="88" x2="310" y2="88" stroke="#A78BFA" strokeWidth="5" strokeLinecap="round" />
            <line x1="90" y1="88" x2="46" y2="88" stroke="#A78BFA" strokeWidth="5" strokeLinecap="round" />
            <rect x="40" y="82" width="14" height="12" rx="3" fill="#A78BFA" />
            <line x1="90" y1="78" x2="150" y2="88" stroke="#A78BFA" strokeWidth="3" strokeLinecap="round" />
            <g className="avn-trolley">
              <rect x="150" y="84" width="14" height="9" rx="2" fill="#C4B5FD" />
              <line x1="157" y1="93" x2="157" y2="128" stroke="#C4B5FD" strokeWidth="2.5" />
              <path d="M152 128 h10 v8 h-10 z" fill="none" stroke="#C4B5FD" strokeWidth="2.5" strokeLinejoin="round" />
            </g>
          </g>
          <rect className="avn-fond" x="200" y="292" width="200" height="8" rx="3" fill="#4F46E5" />
          <rect className="avn-dalle" x="194" y="283" width="212" height="8" rx="3" fill="#A78BFA" />
          <g className="avn-rdc">
            <rect x="210" y="212" width="180" height="72" rx="4" fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinejoin="round" />
          </g>
          <g className="avn-etage">
            <rect x="210" y="142" width="180" height="70" rx="4" fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinejoin="round" />
          </g>
          <path className="avn-toit" d="M198 142 L300 74 L402 142" fill="none" stroke="#FFFFFF" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
          <g className="avn-chem">
            <rect x="352" y="94" width="16" height="34" rx="3" fill="none" stroke="#FFFFFF" strokeWidth="4" />
          </g>
          <rect className="avn-porte" x="284" y="244" width="32" height="40" rx="3" fill="none" stroke="#A78BFA" strokeWidth="4" />
          <g className="avn-f1">
            <rect x="228" y="232" width="30" height="26" rx="3" fill="none" stroke="#A78BFA" strokeWidth="4" />
            <rect x="342" y="232" width="30" height="26" rx="3" fill="none" stroke="#A78BFA" strokeWidth="4" />
          </g>
          <g className="avn-f2">
            <rect x="228" y="160" width="30" height="26" rx="3" fill="none" stroke="#A78BFA" strokeWidth="4" />
            <rect x="285" y="160" width="30" height="26" rx="3" fill="none" stroke="#A78BFA" strokeWidth="4" />
            <rect x="342" y="160" width="30" height="26" rx="3" fill="none" stroke="#A78BFA" strokeWidth="4" />
          </g>
          <g className="avn-lum">
            <rect x="232" y="236" width="22" height="18" rx="2" fill="#C4B5FD" />
            <rect x="346" y="236" width="22" height="18" rx="2" fill="#C4B5FD" />
            <rect x="232" y="164" width="22" height="18" rx="2" fill="#C4B5FD" />
            <rect x="289" y="164" width="22" height="18" rx="2" fill="#C4B5FD" />
            <rect x="346" y="164" width="22" height="18" rx="2" fill="#C4B5FD" />
          </g>
          <g className="avn-arbre">
            <line x1="436" y1="300" x2="436" y2="266" stroke="#A78BFA" strokeWidth="4" strokeLinecap="round" />
            <circle cx="436" cy="252" r="18" fill="#4F46E5" />
          </g>
          <circle className="avn-point" cx="300" cy="56" r="7" fill="#C4B5FD" />
        </g>
      </svg>
    </div>
  );
}
