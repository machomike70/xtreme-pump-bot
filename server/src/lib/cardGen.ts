import { Resvg } from "@resvg/resvg-js";

export interface CardData {
  username: string;
  tokenName: string;
  symbol?: string;
  mint?: string;
  invested: number;
  sold: number;
  gainPct: number;
  gainX: string;
  callCount: number;
  avgGainX: string;
  bestGainX: string;
}

const RANKS = [
  { min: 1,  max: 4,  label: "ROOKIE",  icon: "EGG"     },
  { min: 5,  max: 14, label: "DEGEN",   icon: "FIRE"    },
  { min: 15, max: 29, label: "DIAMOND", icon: "GEM"     },
  { min: 30, max: 49, label: "ALPHA",   icon: "CROWN"   },
  { min: 50, max: Infinity, label: "LEGEND", icon: "ROCKET" },
] as const;

function getRank(calls: number): { label: string; icon: string } {
  return RANKS.find((r) => calls >= r.min && calls <= r.max) ?? RANKS[0];
}

function rankIcon(icon: string): string {
  switch (icon) {
    case "EGG":    return "🥚";
    case "FIRE":   return "🔥";
    case "GEM":    return "💎";
    case "CROWN":  return "👑";
    case "ROCKET": return "🚀";
    default:       return "⚡";
  }
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function generateBoostCard(d: CardData): Buffer {
  const sym = d.symbol ? ` $${d.symbol}` : "";
  const gainColor = d.gainPct >= 0 ? "#39ff14" : "#ff4444";
  const rank = getRank(d.callCount);
  const rankBadge = `${rankIcon(rank.icon)} ${rank.label}`;
  const callLabel = `CALL #${d.callCount}`;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="800" height="500" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#060e06"/>
      <stop offset="100%" stop-color="#0d1f0d"/>
    </linearGradient>
    <linearGradient id="hdr" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#0d240d"/>
      <stop offset="100%" stop-color="#071407"/>
    </linearGradient>
    <linearGradient id="ftr" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#071407"/>
      <stop offset="100%" stop-color="#0d240d"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="sg" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="800" height="500" fill="url(#bg)"/>

  <!-- Grid -->
  <line x1="0" y1="160" x2="800" y2="160" stroke="#0f200f" stroke-width="1"/>
  <line x1="0" y1="240" x2="800" y2="240" stroke="#0f200f" stroke-width="1"/>
  <line x1="0" y1="320" x2="800" y2="320" stroke="#0f200f" stroke-width="1"/>
  <line x1="0" y1="400" x2="800" y2="400" stroke="#0f200f" stroke-width="1"/>
  <line x1="200" y1="0" x2="200" y2="500" stroke="#0f200f" stroke-width="1"/>
  <line x1="400" y1="0" x2="400" y2="500" stroke="#0f200f" stroke-width="1"/>
  <line x1="600" y1="0" x2="600" y2="500" stroke="#0f200f" stroke-width="1"/>

  <!-- Top accent -->
  <rect x="0" y="0" width="800" height="5" fill="${gainColor}" opacity="0.9" filter="url(#glow)"/>

  <!-- Header -->
  <rect x="0" y="5" width="800" height="65" fill="url(#hdr)"/>
  <text x="28" y="50" font-family="Arial Black, Impact, Arial, sans-serif" font-size="26" font-weight="900" fill="${gainColor}" filter="url(#glow)">&#x26A1; ALPHA MEMBER BOOST</text>
  <text x="772" y="34" font-family="Arial, sans-serif" font-size="11" fill="#2a6a2a" text-anchor="end" letter-spacing="2">XTREME PUMP ALPHA</text>
  <text x="772" y="52" font-family="Arial, sans-serif" font-size="10" fill="#1a4a1a" text-anchor="end">pump.xtremerippleprotocol.online</text>
  <line x1="0" y1="70" x2="800" y2="70" stroke="#1a4a1a" stroke-width="1"/>

  <!-- Identity row -->
  <rect x="0" y="70" width="800" height="80" fill="#080f08"/>

  <!-- Rank badge -->
  <rect x="24" y="86" width="160" height="48" rx="6" fill="#0d200d"/>
  <rect x="24" y="86" width="160" height="3" rx="2" fill="${gainColor}" opacity="0.7"/>
  <text x="104" y="117" font-family="Arial Black, Impact, Arial, sans-serif" font-size="15" font-weight="900" fill="${gainColor}" text-anchor="middle" filter="url(#sg)">${esc(rankBadge)}</text>

  <!-- Username -->
  <text x="400" y="120" font-family="Arial Black, Impact, Arial, sans-serif" font-size="30" font-weight="900" fill="white" text-anchor="middle" filter="url(#sg)">${esc(d.username)}</text>

  <!-- Call number -->
  <rect x="616" y="86" width="160" height="48" rx="6" fill="#0d200d"/>
  <rect x="616" y="86" width="160" height="3" rx="2" fill="${gainColor}" opacity="0.5"/>
  <text x="696" y="117" font-family="Arial Black, Impact, Arial, sans-serif" font-size="15" font-weight="900" fill="${gainColor}" text-anchor="middle">${esc(callLabel)}</text>

  <!-- Token name -->
  <line x1="0" y1="150" x2="800" y2="150" stroke="#1a4a1a" stroke-width="1"/>
  <rect x="0" y="150" width="800" height="40" fill="#060e06"/>
  <text x="400" y="178" font-family="Arial, sans-serif" font-size="19" fill="#3a8a3a" text-anchor="middle">${esc(d.tokenName)}${esc(sym)}</text>
  <line x1="0" y1="190" x2="800" y2="190" stroke="#1a4a1a" stroke-width="1"/>

  <!-- Stats panels -->
  <!-- INVESTED -->
  <rect x="20" y="205" width="220" height="115" fill="#080f08" rx="6"/>
  <rect x="20" y="205" width="220" height="3" fill="#2a6a2a" rx="2" opacity="0.6"/>
  <text x="130" y="233" font-family="Arial, sans-serif" font-size="11" fill="#2a6a2a" text-anchor="middle" letter-spacing="3">INVESTED</text>
  <text x="130" y="282" font-family="Arial Black, Impact, Arial, sans-serif" font-size="34" font-weight="900" fill="white" text-anchor="middle">${d.invested.toFixed(2)}</text>
  <text x="130" y="308" font-family="Arial, sans-serif" font-size="13" fill="#3a7a3a" text-anchor="middle">SOL</text>

  <!-- SOLD -->
  <rect x="290" y="205" width="220" height="115" fill="#080f08" rx="6"/>
  <rect x="290" y="205" width="220" height="3" fill="#2a6a2a" rx="2" opacity="0.6"/>
  <text x="400" y="233" font-family="Arial, sans-serif" font-size="11" fill="#2a6a2a" text-anchor="middle" letter-spacing="3">SOLD</text>
  <text x="400" y="282" font-family="Arial Black, Impact, Arial, sans-serif" font-size="34" font-weight="900" fill="white" text-anchor="middle">${d.sold.toFixed(2)}</text>
  <text x="400" y="308" font-family="Arial, sans-serif" font-size="13" fill="#3a7a3a" text-anchor="middle">SOL</text>

  <!-- RETURN (highlighted) -->
  <rect x="560" y="195" width="220" height="125" fill="#071407" rx="6"/>
  <rect x="560" y="195" width="220" height="4" fill="${gainColor}" rx="2" filter="url(#glow)"/>
  <rect x="560" y="195" width="4" height="125" fill="${gainColor}" rx="2" opacity="0.5"/>
  <text x="670" y="228" font-family="Arial, sans-serif" font-size="11" fill="${gainColor}" text-anchor="middle" letter-spacing="3">RETURN</text>
  <text x="670" y="288" font-family="Arial Black, Impact, Arial, sans-serif" font-size="52" font-weight="900" fill="${gainColor}" text-anchor="middle" filter="url(#glow)">${esc(d.gainX)}x</text>
  <text x="670" y="312" font-family="Arial, sans-serif" font-size="16" fill="${gainColor}" text-anchor="middle" opacity="0.8">+${d.gainPct}%</text>

  <!-- Career stats bar -->
  <line x1="0" y1="338" x2="800" y2="338" stroke="#1a4a1a" stroke-width="1"/>
  <rect x="0" y="338" width="800" height="100" fill="#060e06"/>

  <text x="26" y="362" font-family="Arial, sans-serif" font-size="10" fill="#2a6a2a" letter-spacing="3">CAREER STATS</text>
  <line x1="24" y1="370" x2="776" y2="370" stroke="#1a4a1a" stroke-width="1"/>

  <!-- TOTAL CALLS -->
  <text x="150" y="398" font-family="Arial, sans-serif" font-size="10" fill="#2a5a2a" text-anchor="middle" letter-spacing="2">TOTAL CALLS</text>
  <text x="150" y="424" font-family="Arial Black, Impact, Arial, sans-serif" font-size="26" font-weight="900" fill="white" text-anchor="middle">${d.callCount}</text>

  <line x1="290" y1="375" x2="290" y2="432" stroke="#1a4a1a" stroke-width="1"/>

  <!-- AVG RETURN -->
  <text x="400" y="398" font-family="Arial, sans-serif" font-size="10" fill="#2a5a2a" text-anchor="middle" letter-spacing="2">AVG RETURN</text>
  <text x="400" y="424" font-family="Arial Black, Impact, Arial, sans-serif" font-size="26" font-weight="900" fill="${gainColor}" text-anchor="middle">${esc(d.avgGainX)}x</text>

  <line x1="510" y1="375" x2="510" y2="432" stroke="#1a4a1a" stroke-width="1"/>

  <!-- BEST CALL -->
  <text x="643" y="398" font-family="Arial, sans-serif" font-size="10" fill="#2a5a2a" text-anchor="middle" letter-spacing="2">BEST CALL</text>
  <text x="643" y="424" font-family="Arial Black, Impact, Arial, sans-serif" font-size="26" font-weight="900" fill="${gainColor}" text-anchor="middle" filter="url(#sg)">${esc(d.bestGainX)}x</text>

  <!-- Footer -->
  <line x1="0" y1="442" x2="800" y2="442" stroke="#1a4a1a" stroke-width="1"/>
  <rect x="0" y="442" width="800" height="58" fill="url(#ftr)"/>
  <rect x="0" y="495" width="800" height="5" fill="${gainColor}" opacity="0.6" filter="url(#glow)"/>
  <text x="400" y="474" font-family="Arial, sans-serif" font-size="12" fill="#2a6a2a" text-anchor="middle">Join @XtremePumpAlpha &#x2022; Open the Alpha Feed mini app to post your call</text>
</svg>`;

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: 800 },
    font: { loadSystemFonts: true },
  });
  return Buffer.from(resvg.render().asPng());
}
