import { useState } from "react";
import { Copy, Check, Globe, ExternalLink } from "lucide-react";
import type { Token } from "../types";

interface Props {
  token: Token;
  isNew?: boolean;
}

function formatMcap(raw: string | null): string | null {
  if (!raw) return null;
  const n = parseFloat(raw);
  if (n <= 0) return null;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function formatSol(raw: string | null, decimals = 2): string | null {
  if (!raw) return null;
  const n = parseFloat(raw);
  if (n <= 0) return null;
  return `${n.toFixed(decimals)}◎`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 5)  return "just now";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h`;
}

function scoreColor(score: number): string {
  if (score >= 5) return "#00ff88";
  if (score >= 4) return "#ff6b00";
  if (score >= 3) return "#f5a623";
  return "#444";
}

function scoreLabel(score: number): string {
  if (score >= 5) return "GEM";
  if (score >= 4) return "Strong";
  if (score >= 3) return "Mid";
  if (score >= 2) return "Weak";
  return "Low";
}

function StarRow({ score }: { score: number }) {
  return (
    <span className="text-sm leading-none" aria-label={`${score} stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ color: i < score ? scoreColor(score) : "#333" }}>★</span>
      ))}
    </span>
  );
}

export function TokenCard({ token, isNew }: Props) {
  const [copied, setCopied] = useState(false);

  const score   = token.score ?? 1;
  const isGem   = score >= 5;
  const color   = scoreColor(score);
  const mcap    = formatMcap(token.marketCapUsd);
  const devSol  = formatSol(token.initialBuySol);
  const curve   = formatSol(token.vSolInBondingCurve, 1);
  const ago     = timeAgo(token.createdAt);

  const desc =
    token.description && token.description.length > 120
      ? token.description.slice(0, 120) + "…"
      : token.description;

  const copy = () => {
    navigator.clipboard.writeText(token.mint).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const shortMint = `${token.mint.slice(0, 6)}…${token.mint.slice(-4)}`;

  return (
    <div
      className={`relative rounded-xl overflow-hidden flex flex-col ${isNew ? "token-card-enter" : ""} ${isGem ? "gem-card" : ""}`}
      style={{ border: `1px solid ${color}30`, background: "#141414" }}
    >
      {/* Score accent bar */}
      <div className={`h-[2px] score-bar-${score}`} />

      <div className="p-3 flex flex-col gap-2.5">
        {/* Header: image + name + score */}
        <div className="flex items-start gap-3">
          <div className="relative flex-shrink-0">
            {token.imageUri ? (
              <img
                src={token.imageUri}
                alt={token.name ?? "token"}
                className="w-14 h-14 rounded-lg object-cover bg-[#222]"
                onError={(e) => { (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Crect width='48' height='48' fill='%23222'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='24'%3E🪙%3C/text%3E%3C/svg%3E"; }}
              />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-[#222] flex items-center justify-center text-2xl">🪙</div>
            )}
            {isGem && (
              <span className="absolute -top-1 -right-1 text-[10px]">🔥</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-white text-sm leading-tight truncate max-w-[140px]">
                    {token.name || "Unknown"}
                  </span>
                  {token.symbol && (
                    <span className="text-[11px] font-mono font-bold flex-shrink-0" style={{ color }}>
                      ${token.symbol}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <StarRow score={score} />
                  <span className="text-[10px] font-semibold" style={{ color }}>
                    {scoreLabel(score)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                {mcap && (
                  <span
                    className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}
                  >
                    {mcap}
                  </span>
                )}
                <span className="text-[10px] text-gray-600">{ago}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        {desc && (
          <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
        )}

        {/* Metrics */}
        {(devSol || curve) && (
          <div className="flex gap-1.5 flex-wrap">
            {devSol && (
              <span className="text-[10px] font-mono bg-[#1e1e1e] border border-[#2a2a2a] px-2 py-0.5 rounded text-gray-400">
                Dev {devSol}
              </span>
            )}
            {curve && (
              <span className="text-[10px] font-mono bg-[#1e1e1e] border border-[#2a2a2a] px-2 py-0.5 rounded text-gray-400">
                Curve {curve}
              </span>
            )}
          </div>
        )}

        {/* Action row */}
        <div className="flex items-center gap-2 pt-0.5 border-t border-[#1e1e1e]">
          {/* Socials */}
          <div className="flex gap-2">
            {token.twitter && (
              <a
                href={token.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-[#1d9bf0] transition-colors"
                title="X / Twitter"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.26 5.632 5.904-5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
            )}
            {token.telegram && (
              <a
                href={token.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-[#229ed9] transition-colors"
                title="Telegram"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </a>
            )}
            {token.website && (
              <a
                href={token.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-purple-400 transition-colors"
                title="Website"
              >
                <Globe size={14} />
              </a>
            )}
          </div>

          {/* Mint copy */}
          <button
            onClick={copy}
            className="flex items-center gap-1 text-gray-600 hover:text-gray-300 transition-colors ml-1"
            title="Copy contract address"
          >
            <span className="font-mono text-[10px]">{shortMint}</span>
            {copied ? <Check size={10} className="text-accent" /> : <Copy size={10} />}
          </button>

          {/* Trade button */}
          <a
            href={`https://pump.fun/${token.mint}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-lg transition-all active:scale-95"
            style={{
              background: isGem ? color : `${color}20`,
              color: isGem ? "#000" : color,
              border: `1px solid ${color}50`,
            }}
          >
            TRADE <ExternalLink size={10} />
          </a>
        </div>
      </div>
    </div>
  );
}
