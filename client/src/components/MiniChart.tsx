import { useMemo } from "react";
import type { Token } from "../types";

interface Props {
  tokens: Token[];
  connected: boolean;
}

const BUCKETS = 30;
const BUCKET_MINUTES = 1;

export function MiniChart({ tokens, connected }: Props) {
  const bars = useMemo(() => {
    const now = Date.now();
    const counts = new Array<number>(BUCKETS).fill(0);
    for (const t of tokens) {
      const ageMs = now - new Date(t.createdAt).getTime();
      const bucketIdx = Math.floor(ageMs / (BUCKET_MINUTES * 60 * 1000));
      if (bucketIdx >= 0 && bucketIdx < BUCKETS) {
        counts[BUCKETS - 1 - bucketIdx]++;
      }
    }
    return counts;
  }, [tokens]);

  const max = Math.max(...bars, 1);

  return (
    <div
      className="px-3 py-2"
      style={{ borderBottom: "1px solid rgba(57,255,20,0.15)", background: "#09120a" }}
    >
      <div className="flex items-end gap-[2px] h-10">
        {bars.map((count, i) => {
          const pct = count / max;
          const isRecent = i >= BUCKETS - 3;
          return (
            <div
              key={i}
              className="flex-1 rounded-sm transition-all duration-300"
              style={{
                height: `${Math.max(pct * 100, count > 0 ? 8 : 2)}%`,
                background: isRecent
                  ? `rgba(57,255,20,${0.4 + pct * 0.6})`
                  : `rgba(57,255,20,${0.12 + pct * 0.35})`,
                boxShadow: isRecent && count > 0
                  ? "0 0 4px rgba(57,255,20,0.5)"
                  : "none",
              }}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-[9px] text-gray-600">30 min ago</span>
        <div className="flex items-center gap-1">
          <span className={`w-1 h-1 rounded-full ${connected ? "live-dot bg-live" : "bg-gray-600"}`} />
          <span className="text-[9px] text-live font-bold tracking-widest">LIVE</span>
        </div>
        <span className="text-[9px] text-gray-600">now</span>
      </div>
    </div>
  );
}
