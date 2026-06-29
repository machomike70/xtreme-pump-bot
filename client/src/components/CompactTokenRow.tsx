import { useState } from "react";
import { Copy, Check, ExternalLink, Globe } from "lucide-react";
import type { Token } from "../types";

interface Props {
  token: Token;
  isNew?: boolean;
  expanded: boolean;
  onToggle: () => void;
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 5)  return "now";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h`;
}

function formatMcap(raw: string | null): string {
  if (!raw) return "—";
  const n = parseFloat(raw);
  if (n <= 0) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function scoreColor(score: number): string {
  if (score >= 5) return "#39FF14";
  if (score >= 4) return "#ff6b00";
  if (score >= 3) return "#f5a623";
  return "#3a5a3a";
}

function scoreLabel(score: number): string {
  if (score >= 5) return "GEM";
  if (score >= 4) return "STRONG";
  if (score >= 3) return "MID";
  if (score >= 2) return "WEAK";
  return "LOW";
}

export function CompactTokenRow({ token, isNew, expanded, onToggle }: Props) {
  const [copied, setCopied] = useState(false);
  const score   = token.score ?? 1;
  const color   = scoreColor(score);
  const isGem   = score >= 5;
  const mcap    = formatMcap(token.marketCapUsd);
  const ago     = timeAgo(token.createdAt);
  const name    = token.name || "Unknown";
  const symbol  = token.symbol ? `$${token.symbol}` : "";
  const shortMint = `${token.mint.slice(0, 6)}…${token.mint.slice(-4)}`;
  const devPct  = token.devHoldingPct ? parseFloat(token.devHoldingPct) : 0;
  const isRug   = devPct >= 25;
  const isCaution = devPct >= 15 && devPct < 25;

  const copy = () => {
    navigator.clipboard.writeText(token.mint).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      className={`${isNew ? "token-enter" : ""} ${isGem ? "gem-glow" : ""}`}
      style={{ borderBottom: "1px solid rgba(57,255,20,0.08)" }}
    >
      {/* Compact row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface/40 transition-colors"
      >
        {/* Score indicator */}
        <div
          className="w-1 self-stretch rounded-full flex-shrink-0"
          style={{ background: color, boxShadow: isGem ? `0 0 6px ${color}` : "none" }}
        />

        {/* Token image */}
        <div className="flex-shrink-0">
          {token.imageUri ? (
            <img
              src={token.imageUri}
              alt={name}
              className="w-9 h-9 rounded-lg object-cover"
              style={{ background: "#1a261a" }}
              onError={(e) => { (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Crect width='48' height='48' fill='%231a261a'/%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' font-size='22'%3E🪙%3C/text%3E%3C/svg%3E"; }}
            />
          ) : (
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg" style={{ background: "#1a261a" }}>
              🪙
            </div>
          )}
        </div>

        {/* Name + badge */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="text-[9px] font-black px-1.5 py-0.5 rounded tracking-widest"
              style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
            >
              {isGem ? "🔥GEM" : "NEW"}
            </span>
            {isRug && (
              <span
                className="text-[9px] font-black px-1.5 py-0.5 rounded tracking-widest"
                style={{ background: "#ff000022", color: "#ff4444", border: "1px solid #ff444444" }}
              >
                🚨RUG
              </span>
            )}
            {isCaution && !isRug && (
              <span
                className="text-[9px] font-black px-1.5 py-0.5 rounded tracking-widest"
                style={{ background: "#ff880022", color: "#ff8800", border: "1px solid #ff880044" }}
              >
                ⚠️DEV
              </span>
            )}
            <span className="text-white font-bold text-xs truncate max-w-[80px]">{name}</span>
            {symbol && (
              <span className="text-[10px] font-mono flex-shrink-0" style={{ color }}>
                {symbol}
              </span>
            )}
          </div>
          {/* Socials row */}
          <div className="flex items-center gap-1.5 mt-0.5">
            {token.twitter  && <span className="text-[#1d9bf0] text-[9px]">𝕏</span>}
            {token.telegram && <span className="text-[#229ed9] text-[9px]">TG</span>}
            {token.website  && <span className="text-purple-400 text-[9px]">🌐</span>}
            {!token.twitter && !token.telegram && !token.website && (
              <span className="text-gray-600 text-[9px]">no socials</span>
            )}
          </div>
        </div>

        {/* Mcap + time */}
        <div className="flex flex-col items-end flex-shrink-0 gap-0.5">
          <span
            className="text-[11px] font-bold tabular-nums"
            style={{ color: mcap === "—" ? "#3a5a3a" : "#c8f0c8" }}
          >
            {mcap}
          </span>
          <span className="text-[10px] text-gray-500 tabular-nums">{ago}</span>
        </div>
      </button>

      {/* Expanded detail panel */}
      {expanded && (
        <div
          className="px-4 pb-3 flex flex-col gap-2"
          style={{ background: "#0a140a", borderTop: "1px solid rgba(57,255,20,0.1)" }}
        >
          {/* Score bar */}
          <div className="flex items-center gap-2 pt-2">
            <span className="text-xs" style={{ color }}>
              {"★".repeat(score)}{"☆".repeat(5 - score)}
            </span>
            <span className="text-[10px] font-bold" style={{ color }}>{scoreLabel(score)}</span>
          </div>

          {/* Description */}
          {token.description && (
            <p className="text-[11px] text-gray-400 leading-relaxed">
              {token.description.length > 140 ? token.description.slice(0, 140) + "…" : token.description}
            </p>
          )}

          {/* Metrics */}
          <div className="flex gap-2 flex-wrap text-[10px] font-mono">
            {token.initialBuySol && parseFloat(token.initialBuySol) > 0 && (
              <span className="px-2 py-0.5 rounded" style={{ background: "#1a261a", color: "#7aaa7a" }}>
                Dev {parseFloat(token.initialBuySol).toFixed(2)}◎
              </span>
            )}
            {devPct > 0 && (
              <span
                className="px-2 py-0.5 rounded"
                style={{
                  background: isRug ? "#1a0000" : isCaution ? "#1a0d00" : "#1a261a",
                  color: isRug ? "#ff4444" : isCaution ? "#ff8800" : "#7aaa7a",
                }}
              >
                {isRug ? "🚨" : isCaution ? "⚠️" : "🤝"} Dev supply {devPct.toFixed(1)}%
              </span>
            )}
            {token.vSolInBondingCurve && parseFloat(token.vSolInBondingCurve) > 0 && (
              <span className="px-2 py-0.5 rounded" style={{ background: "#1a261a", color: "#7aaa7a" }}>
                Curve {parseFloat(token.vSolInBondingCurve).toFixed(1)}◎
              </span>
            )}
          </div>

          {/* Action row */}
          <div className="flex items-center gap-2 pt-1">
            {/* Socials */}
            {token.twitter && (
              <a href={token.twitter} target="_blank" rel="noopener noreferrer" className="text-[#1d9bf0] hover:opacity-80">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.26 5.632 5.904-5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
            )}
            {token.telegram && (
              <a href={token.telegram} target="_blank" rel="noopener noreferrer" className="text-[#229ed9] hover:opacity-80">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </a>
            )}
            {token.website && (
              <a href={token.website} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:opacity-80">
                <Globe size={13} />
              </a>
            )}

            {/* Copy mint */}
            <button onClick={copy} className="flex items-center gap-1 text-gray-600 hover:text-gray-300 transition-colors ml-1">
              <span className="font-mono text-[9px]">{shortMint}</span>
              {copied ? <Check size={9} className="text-accent" /> : <Copy size={9} />}
            </button>

            {/* Trade */}
            <a
              href={`https://pump.fun/${token.mint}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex items-center gap-1 text-[10px] font-black px-3 py-1 rounded transition-all active:scale-95"
              style={{
                background: isGem ? color : `${color}20`,
                color: isGem ? "#000" : color,
                border: `1px solid ${color}50`,
                boxShadow: isGem ? `0 0 8px ${color}60` : "none",
              }}
            >
              TRADE <ExternalLink size={9} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
