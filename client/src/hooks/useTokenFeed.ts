import { useState, useEffect, useRef, useCallback } from "react";
import type { Token, FilterMode } from "../types";

const MAX_TOKENS = 300;
const BASE = (import.meta as unknown as { env: { BASE_URL: string } }).env.BASE_URL;

export interface FeedStats {
  total24h: number;
  totalAll: number;
}

export function useTokenFeed(filter: FilterMode) {
  const [allTokens, setAllTokens]   = useState<Token[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [connected, setConnected]   = useState(false);
  const [totalSeen, setTotalSeen]   = useState(0);
  const [stats, setStats]           = useState<FeedStats | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const passesFilter = useCallback((token: Token): boolean => {
    const score = token.score ?? 1;
    const devPct = token.devHoldingPct ? parseFloat(token.devHoldingPct) : 0;
    switch (filter) {
      case "social":  return !!(token.twitter || token.telegram || token.website);
      case "safe":    return devPct < 25 && score >= 2;
      case "stars3":  return score >= 3;
      case "stars4":  return score >= 4;
      case "gems":    return score >= 5;
      default:        return true;
    }
  }, [filter]);

  /* ── initial load ───────────────────────────────────────────────────────── */
  useEffect(() => {
    setLoading(true);
    setError(null);

    const fetchHistory = fetch(`${BASE}feed/tokens?limit=100`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<{ tokens: Token[] }>; })
      .then(({ tokens: initial }) => {
        setAllTokens(initial);
        setTotalSeen(initial.length);
        setLoading(false);
      })
      .catch(err => { setError("Failed to load token history"); setLoading(false); console.error("[feed] history:", err); });

    const fetchStats = fetch(`${BASE}feed/stats`)
      .then(r => r.ok ? r.json() as Promise<FeedStats> : null)
      .then(s => { if (s) setStats(s); })
      .catch(() => {});

    return () => { void fetchHistory; void fetchStats; };
  }, []);

  /* ── stats refresh every 60s ────────────────────────────────────────────── */
  useEffect(() => {
    const id = setInterval(() => {
      fetch(`${BASE}feed/stats`)
        .then(r => r.ok ? r.json() as Promise<FeedStats> : null)
        .then(s => { if (s) setStats(s); })
        .catch(() => {});
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  /* ── SSE stream ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (eventSourceRef.current) eventSourceRef.current.close();

    const es = new EventSource(`${BASE}feed/stream`);
    eventSourceRef.current = es;

    es.onopen = () => { setConnected(true); setError(null); };
    es.onmessage = (evt) => {
      try {
        const token = JSON.parse(evt.data) as Token;
        setAllTokens(prev => [token, ...prev].slice(0, MAX_TOKENS));
        setTotalSeen(n => n + 1);
        setStats(prev => prev ? { ...prev, total24h: prev.total24h + 1, totalAll: prev.totalAll + 1 } : null);
      } catch {}
    };
    es.onerror = () => setConnected(false);

    return () => { es.close(); eventSourceRef.current = null; setConnected(false); };
  }, []);

  return {
    tokens: allTokens.filter(passesFilter),
    allTokens,
    loading,
    error,
    connected,
    totalSeen,
    stats,
  };
}
