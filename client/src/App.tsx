import { useState, useRef, useEffect } from "react";
import type { FilterMode } from "./types";
import { useTokenFeed } from "./hooks/useTokenFeed";
import { HeroBanner } from "./components/HeroBanner";
import { StatsRow } from "./components/StatsRow";
import { MiniChart } from "./components/MiniChart";
import { CompactTokenRow } from "./components/CompactTokenRow";
import { AdBanner } from "./components/AdBanner";
import { BoostCard } from "./components/BoostCard";

const AD_EVERY = 10;

const FILTERS: { key: FilterMode; label: string }[] = [
  { key: "all",    label: "ALL" },
  { key: "social", label: "SOCIALS" },
  { key: "safe",   label: "🛡️SAFE" },
  { key: "stars3", label: "⭐3+" },
  { key: "stars4", label: "⭐4+" },
  { key: "gems",   label: "🔥GEM" },
];

export default function App() {
  const [filter, setFilter]     = useState<FilterMode>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showBoost, setShowBoost]   = useState(false);
  const { tokens, allTokens, loading, error, connected, totalSeen, stats } = useTokenFeed(filter);

  const newIdsRef    = useRef<Set<number>>(new Set());
  const prevLenRef   = useRef(0);

  useEffect(() => {
    const prev = prevLenRef.current;
    if (tokens.length > prev) {
      const freshIds = new Set<number>();
      for (let i = 0; i < tokens.length - prev; i++) freshIds.add(tokens[i].id);
      newIdsRef.current = freshIds;
    } else {
      newIdsRef.current = new Set();
    }
    prevLenRef.current = tokens.length;
  }, [tokens]);

  const toggleExpand = (id: number) => setExpandedId(prev => prev === id ? null : id);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#080c08", color: "#c8f0c8" }}>

      {/* ── Top header bar ────────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-20 flex items-center justify-between px-3 py-2"
        style={{
          background: "#060a06",
          borderBottom: "1px solid rgba(57,255,20,0.2)",
          boxShadow: "0 0 16px rgba(57,255,20,0.05)",
        }}
      >
        <div className="flex items-center gap-2">
          <span className="live-dot w-2 h-2 rounded-full bg-live flex-shrink-0" />
          <span className="text-[10px] font-black tracking-[0.25em] text-live">LIVE</span>
          <span className="text-[10px] text-gray-500 tracking-wider ml-1 hidden sm:block">
            LIVE FEED OF PUMP.FUN NEW LAUNCHES
          </span>
          <span className="text-[10px] text-gray-500 tracking-wider ml-1 sm:hidden">
            PUMP.FUN LAUNCHES
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors ${connected ? "bg-accent live-dot" : "bg-gray-600"}`}
          />
          <span className={`text-[10px] font-bold tracking-widest ${connected ? "text-accent" : "text-gray-500"}`}>
            {connected ? "CONNECTED" : "CONNECTING…"}
          </span>
        </div>
      </div>

      {/* ── Hero branding ─────────────────────────────────────────────────── */}
      <HeroBanner />

      {/* ── Stats counters ────────────────────────────────────────────────── */}
      <StatsRow
        totalSeen={stats?.totalAll ?? totalSeen}
        total24h={stats?.total24h ?? null}
        connected={connected}
      />

      {/* ── Bar chart ─────────────────────────────────────────────────────── */}
      <MiniChart tokens={allTokens} connected={connected} />

      {/* ── Filter tabs ───────────────────────────────────────────────────── */}
      <div
        className="sticky z-10 flex gap-1 px-2 py-2 overflow-x-auto"
        style={{
          top: "36px",
          background: "#080c08",
          borderBottom: "1px solid rgba(57,255,20,0.1)",
        }}
      >
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className="flex-shrink-0 px-2.5 py-1 rounded text-[10px] font-black tracking-widest transition-all"
            style={
              filter === key
                ? {
                    background: "#39FF14",
                    color: "#000",
                    boxShadow: "0 0 8px rgba(57,255,20,0.5)",
                  }
                : {
                    background: "transparent",
                    color: "#4a7a4a",
                    border: "1px solid rgba(57,255,20,0.2)",
                  }
            }
          >
            {label}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-gray-600 font-mono tabular-nums self-center flex-shrink-0">
          {tokens.length} shown
        </span>
      </div>

      {/* ── Token feed ────────────────────────────────────────────────────── */}
      <main className="flex-1">
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div
              className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "#39FF14", borderTopColor: "transparent" }}
            />
            <p className="text-[11px] text-gray-500 tracking-widest">LOADING FEED…</p>
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-24">
            <p className="text-live text-xs">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 text-[11px] tracking-widest hover:text-accent transition-colors"
              style={{ color: "#4a7a4a" }}
            >
              RETRY
            </button>
          </div>
        )}

        {!loading && !error && tokens.length === 0 && (
          <div className="text-center py-24">
            <p className="text-4xl mb-4">{filter === "gems" ? "💎" : "📡"}</p>
            <p className="text-gray-500 text-xs tracking-widest">
              {filter === "all" ? "WAITING FOR FIRST LAUNCH…" : "NO TOKENS MATCH THIS FILTER"}
            </p>
            {filter !== "all" && (
              <button
                onClick={() => setFilter("all")}
                className="mt-4 text-[10px] tracking-widest hover:text-accent transition-colors"
                style={{ color: "#4a7a4a" }}
              >
                SHOW ALL
              </button>
            )}
          </div>
        )}

        {!loading && tokens.length > 0 &&
          tokens.flatMap((token, i) => {
            const row = (
              <CompactTokenRow
                key={token.id}
                token={token}
                isNew={newIdsRef.current.has(token.id)}
                expanded={expandedId === token.id}
                onToggle={() => toggleExpand(token.id)}
              />
            );
            if ((i + 1) % AD_EVERY === 0) {
              return [row, <AdBanner key={`ad-${i}`} slot={Math.floor(i / AD_EVERY)} />];
            }
            return [row];
          })
        }
      </main>

      {/* ── Floating boost button ─────────────────────────────────────────── */}
      <button
        onClick={() => setShowBoost(true)}
        className="fixed bottom-5 right-4 z-30 flex items-center gap-1.5 px-4 py-2.5 rounded-full font-black text-xs tracking-widest transition-all active:scale-95"
        style={{
          background: "#39FF14",
          color: "#000",
          boxShadow: "0 0 20px rgba(57,255,20,0.5), 0 4px 16px rgba(0,0,0,0.4)",
        }}
      >
        ⚡ BOOST
      </button>

      {/* ── Boost card overlay ────────────────────────────────────────────── */}
      {showBoost && <BoostCard onClose={() => setShowBoost(false)} />}

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer
        className="text-center py-3 text-[9px] tracking-widest"
        style={{ color: "#2a4a2a", borderTop: "1px solid rgba(57,255,20,0.08)" }}
      >
        <a
          href="https://t.me/Goml_Network"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-accent transition-colors"
        >
          @GOML_NETWORK
        </a>
        {" · "}XTREME PUMP BOT · PUMP.FUN LIVE LAUNCHES
      </footer>
    </div>
  );
}
