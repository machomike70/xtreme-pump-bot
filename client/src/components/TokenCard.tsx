import { useState } from "react";
import { Copy, Check, Twitter, Send, Globe, ExternalLink } from "lucide-react";
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

export function TokenCard({ token, isNew }: Props) {
  const [copied, setCopied] = useState(false);

  const mcap = formatMcap(token.marketCapUsd);

  const copy = () => {
    navigator.clipboard.writeText(token.mint).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const desc =
    token.description && token.description.length > 180
      ? token.description.slice(0, 180) + "…"
      : token.description;

  return (
    <div
      className={`bg-surface border border-border rounded-xl p-4 flex flex-col gap-3 ${
        isNew ? "token-card-enter" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        {token.imageUri ? (
          <img
            src={token.imageUri}
            alt={token.name ?? "token"}
            className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-border"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-border flex items-center justify-center flex-shrink-0 text-xl">
            🪙
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-white truncate">
              {token.name || "Unknown"}
            </span>
            {token.symbol && (
              <span className="text-accent text-sm font-mono font-semibold">
                ${token.symbol}
              </span>
            )}
            {mcap && (
              <span className="ml-auto bg-accent/10 text-accent text-xs font-semibold px-2 py-0.5 rounded-full border border-accent/30">
                {mcap}
              </span>
            )}
          </div>
          {desc && (
            <p className="text-gray-400 text-sm mt-1 leading-relaxed">{desc}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {token.twitter && (
          <a
            href={token.twitter}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-gray-400 hover:text-blue-400 transition-colors text-sm"
          >
            <Twitter size={14} />
            <span>Twitter</span>
          </a>
        )}
        {token.telegram && (
          <a
            href={token.telegram}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-gray-400 hover:text-blue-400 transition-colors text-sm"
          >
            <Send size={14} />
            <span>Telegram</span>
          </a>
        )}
        {token.website && (
          <a
            href={token.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-gray-400 hover:text-purple-400 transition-colors text-sm"
          >
            <Globe size={14} />
            <span>Website</span>
          </a>
        )}
        <a
          href={`https://pump.fun/${token.mint}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-gray-400 hover:text-accent transition-colors text-sm ml-auto"
        >
          <ExternalLink size={14} />
          <span>pump.fun</span>
        </a>
      </div>

      <div className="flex items-center gap-2 bg-bg rounded-lg px-3 py-2">
        <span className="font-mono text-xs text-gray-500 truncate flex-1">
          {token.mint}
        </span>
        <button
          onClick={copy}
          className="text-gray-500 hover:text-accent transition-colors flex-shrink-0"
          title="Copy mint address"
        >
          {copied ? (
            <Check size={14} className="text-accent" />
          ) : (
            <Copy size={14} />
          )}
        </button>
      </div>
    </div>
  );
}
