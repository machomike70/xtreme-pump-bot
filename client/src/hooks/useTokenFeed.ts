import { useState, useEffect, useRef, useCallback } from "react";
import type { Token, FilterMode } from "../types";

const MAX_TOKENS = 500;

export function useTokenFeed(filter: FilterMode) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const passesFilter = useCallback(
    (token: Token): boolean => {
      if (filter === "all") return true;
      if (filter === "social") {
        return !!(token.twitter || token.telegram || token.website);
      }
      if (filter === "mcap") {
        return !!(token.marketCapUsd && parseFloat(token.marketCapUsd) > 0);
      }
      return true;
    },
    [filter]
  );

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch("/feed/tokens?limit=100")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ tokens: Token[] }>;
      })
      .then(({ tokens: initial }) => {
        setTokens(initial);
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to load token history");
        setLoading(false);
        console.error("[feed] history fetch error:", err);
      });
  }, []);

  useEffect(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource("/feed/stream");
    eventSourceRef.current = es;

    es.onopen = () => {
      setConnected(true);
      setError(null);
    };

    es.onmessage = (evt) => {
      try {
        const token = JSON.parse(evt.data) as Token;
        setTokens((prev) => {
          const next = [token, ...prev];
          return next.slice(0, MAX_TOKENS);
        });
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      setConnected(false);
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
      setConnected(false);
    };
  }, []);

  const filtered = tokens.filter(passesFilter);

  return { tokens: filtered, loading, error, connected };
}
