/* Timelapse SVG « rénovation » — boucle 20 s : maison fatiguée → échafaudage → toit → fenêtres → façade → fini. */
export default function AnimationReno() {
  return (
    <div className="avr-wrap">
      <style>{`
        .avr-wrap { position: relative; }
        .avr-wrap svg { display: block; width: 100%; height: auto; }
        .avr-scene { animation: avr-scene 20s linear infinite; }
        .avr-old { animation: avr-old 20s linear infinite; }
        .avr-cracks { animation: avr-cracks 20s linear infinite; }
        .avr-echaf { transform-box: fill-box; transform-origin: center bottom; animation: avr-echaf 20s linear infinite; }
        .avr-toit-new { stroke-dasharray: 300; animation: avr-toitnew 20s linear infinite; }
        .avr-fen-old { animation: avr-fenold 20s linear infinite; }
        .avr-fen-new { transform-box: fill-box; transform-origin: center center; animation: avr-fennew 20s linear infinite; }
        .avr-facade { transform-box: fill-box; transform-origin: left center; animation: avr-facade 20s linear infinite; }
        .avr-mur-new { animation: avr-murnew 20s linear infinite; }
        .avr-porte { transform-box: fill-box; transform-origin: center bottom; animation: avr-porte 20s linear infinite; }
        .avr-plante { transform-box: fill-box; transform-origin: center bottom; animation: avr-plante 20s linear infinite; }
        .avr-soleil { transform-box: fill-box; transform-origin: center center; animation: avr-soleil 20s linear infinite; }
        .avr-point { transform-box: fill-box; transform-origin: center center; animation: avr-point 20s linear infinite; }
        @keyframes avr-scene { 0%, 96% { opacity: 1; } 99%, 100% { opacity: 0; } }
        @keyframes avr-old { 0%, 55% { opacity: 1; } 68%, 100% { opacity: 0; } }
        @keyframes avr-cracks { 0%, 45% { opacity: 1; } 58%, 100% { opacity: 0; } }
        @keyframes avr-echaf { 0%, 6% { transform: scaleY(0); opacity: 0; } 8% { opacity: 1; } 14% { transform: scaleY(1); opacity: 1; } 62% { transform: scaleY(1); opacity: 1; } 70%, 100% { transform: scaleY(1); opacity: 0; } }
        @keyframes avr-toitnew { 0%, 15% { stroke-dashoffset: 300; opacity: 0; } 17% { opacity: 1; } 32%, 100% { stroke-dashoffset: 0; opacity: 1; } }
        @keyframes avr-fenold { 0%, 32% { opacity: 1; } 40%, 100% { opacity: 0; } }
        @keyframes avr-fennew { 0%, 36% { opacity: 0; transform: scale(0.5); } 44%, 100% { opacity: 1; transform: scale(1); } }
        @keyframes avr-facade { 0%, 46% { transform: scaleX(0); } 60%, 100% { transform: scaleX(1); } }
        @keyframes avr-murnew { 0%, 50% { opacity: 0; } 62%, 100% { opacity: 1; } }
        @keyframes avr-porte { 0%, 70% { opacity: 0; transform: scaleY(0.3); } 76%, 100% { opacity: 1; transform: scaleY(1); } }
        @keyframes avr-plante { 0%, 76% { transform: scaleY(0); } 83%, 100% { transform: scaleY(1); } }
        @keyframes avr-soleil { 0%, 78% { opacity: 0; transform: scale(0.4); } 85%, 100% { opacity: 1; transform: scale(1); } }
        @keyframes avr-point { 0%, 86% { opacity: 0; transform: scale(0); } 90% { opacity: 1; transform: scale(1.4); } 93%, 100% { opacity: 1; transform: scale(1); } }
        @media (prefers-reduced-motion: reduce) {
          .avr-wrap * { animation: none !important; }
        }
      `}</style>
      <svg viewBox="0 0 480 360" role="img" aria-label="Timelapse animé d'une rénovation : maison fatiguée, échafaudage, toiture refaite, fenêtres neuves, façade repeinte">
        <rect width="480" height="360" rx="24" fill="#EEF2FF" />
        <line x1="24" y1="300" x2="456" y2="300" stroke="#4F46E5" strokeWidth="3" strokeLinecap="round" />
        <g className="avr-scene">
          <circle className="avr-soleil" cx="410" cy="66" r="22" fill="#C4B5FD" />
          <g className="avr-old">
            <rect x="150" y="160" width="200" height="140" rx="4" fill="none" stroke="#94A3B8" strokeWidth="5" strokeLinejoin="round" />
            <path d="M140 160 L250 92 L308 128" fill="none" stroke="#94A3B8" strokeWidth="6" strokeLinecap="round" />
            <path d="M330 142 L360 160" fill="none" stroke="#94A3B8" strokeWidth="6" strokeLinecap="round" />
          </g>
          <g className="avr-cracks">
            <path d="M175 300 l8 -22 l-6 -14 l9 -18" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M320 220 l-7 16 l8 12" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <g className="avr-fen-old">
            <rect x="176" y="196" width="34" height="30" rx="3" fill="none" stroke="#94A3B8" strokeWidth="4" />
            <rect x="290" y="196" width="34" height="30" rx="3" fill="none" stroke="#94A3B8" strokeWidth="4" />
          </g>
          <g className="avr-echaf">
            <line x1="120" y1="300" x2="120" y2="110" stroke="#4F46E5" strokeWidth="4" strokeLinecap="round" />
            <line x1="380" y1="300" x2="380" y2="110" stroke="#4F46E5" strokeWidth="4" strokeLinecap="round" />
            <line x1="120" y1="150" x2="380" y2="150" stroke="#4F46E5" strokeWidth="3" strokeLinecap="round" />
            <line x1="120" y1="210" x2="380" y2="210" stroke="#4F46E5" strokeWidth="3" strokeLinecap="round" />
            <line x1="120" y1="270" x2="380" y2="270" stroke="#4F46E5" strokeWidth="3" strokeLinecap="round" />
            <line x1="120" y1="150" x2="150" y2="110" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="380" y1="150" x2="350" y2="110" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round" />
          </g>
          <path className="avr-toit-new" d="M138 160 L250 88 L362 160" fill="none" stroke="#4F46E5" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
          <rect className="avr-facade" x="155" y="165" width="190" height="130" rx="3" fill="#FFFFFF" />
          <g className="avr-mur-new">
            <rect x="150" y="160" width="200" height="140" rx="4" fill="none" stroke="#4F46E5" strokeWidth="5" strokeLinejoin="round" />
          </g>
          <g className="avr-fen-new">
            <rect x="176" y="196" width="34" height="30" rx="3" fill="#EEF2FF" stroke="#4F46E5" strokeWidth="4" />
            <rect x="290" y="196" width="34" height="30" rx="3" fill="#EEF2FF" stroke="#4F46E5" strokeWidth="4" />
            <line x1="193" y1="198" x2="193" y2="224" stroke="#4F46E5" strokeWidth="2.5" />
            <line x1="307" y1="198" x2="307" y2="224" stroke="#4F46E5" strokeWidth="2.5" />
          </g>
          <rect className="avr-porte" x="232" y="252" width="36" height="48" rx="3" fill="#EEF2FF" stroke="#4F46E5" strokeWidth="4" />
          <g className="avr-plante">
            <line x1="130" y1="300" x2="130" y2="282" stroke="#A78BFA" strokeWidth="3.5" strokeLinecap="round" />
            <circle cx="130" cy="273" r="10" fill="#A78BFA" />
          </g>
          <circle className="avr-point" cx="250" cy="72" r="7" fill="#A78BFA" />
        </g>
      </svg>
    </div>
  );
}
