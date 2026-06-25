import { useState, useRef, useEffect } from "react";
import type { FilterMode } from "./types";
import { useTokenFeed } from "./hooks/useTokenFeed";
import { TokenCard } from "./components/TokenCard";
import { FilterBar } from "./components/FilterBar";
import { StatusBar } from "./components/StatusBar";

export default function App() {
  const [filter, setFilter] = useState<FilterMode>("all");
  const { tokens, loading, error, connected } = useTokenFeed(filter);
  const seenIds = useRef<Set<number>>(new Set());
  const prevIds = useRef<Set<number>>(new Set());

  useEffect(() => {
    const currentIds = new Set(tokens.map((t) => t.id));
    const newIds = new Set<number>();
    for (const id of currentIds) {
      if (!prevIds.current.has(id)) {
        newIds.add(id);
      }
    }
    seenIds.current = newIds;
    prevIds.current = currentIds;
  }, [tokens]);

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-10 bg-bg/95 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚀</span>
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">
                Xtreme Pump Bot
              </h1>
              <p className="text-gray-500 text-xs">Live pump.fun token feed</p>
            </div>
          </div>
          <StatusBar connected={connected} error={null} />
        </div>
        <div className="max-w-2xl mx-auto px-4 pb-3">
          <FilterBar active={filter} onChange={setFilter} count={tokens.length} />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 pb-12">
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 text-sm">Loading token history…</p>
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-24">
            <p className="text-red-400">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 text-accent text-sm hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && tokens.length === 0 && (
          <div className="text-center py-24">
            <p className="text-4xl mb-4">🔍</p>
            <p className="text-gray-400">
              {filter === "all"
                ? "Waiting for the first token launch…"
                : `No ${filter === "social" ? "tokens with social links" : "tokens with market cap"} yet.`}
            </p>
            {filter !== "all" && (
              <button
                onClick={() => setFilter("all")}
                className="mt-4 text-accent text-sm hover:underline"
              >
                Show all tokens
              </button>
            )}
          </div>
        )}

        {!loading && tokens.length > 0 && (
          <div className="flex flex-col gap-3">
            {tokens.map((token) => (
              <TokenCard
                key={token.id}
                token={token}
                isNew={seenIds.current.has(token.id)}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="text-center py-6 text-gray-600 text-xs border-t border-border">
        Xtreme Pump Bot · Live pump.fun token launches →{" "}
        <a
          href="https://t.me/Xtreme_Pump_Bot"
          className="text-accent hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          @Xtreme_Pump_Bot
        </a>
      </footer>
    </div>
  );
}
