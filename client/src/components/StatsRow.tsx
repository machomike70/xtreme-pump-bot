import { useEffect, useRef, useState } from "react";

interface Props {
  totalSeen: number;
  total24h: number | null;
  connected: boolean;
}

function AnimatedNumber({ value, className, style }: { value: number; className?: string; style?: React.CSSProperties }) {
  const [display, setDisplay] = useState(value);
  const [flip, setFlip] = useState(false);
  const prev = useRef(value);

  useEffect(() => {
    if (value !== prev.current) {
      setFlip(true);
      setDisplay(value);
      prev.current = value;
      const t = setTimeout(() => setFlip(false), 300);
      return () => clearTimeout(t);
    }
  }, [value]);

  return (
    <span className={`${className ?? ""} ${flip ? "count-flip" : ""}`} style={style}>
      {display.toLocaleString()}
    </span>
  );
}

export function StatsRow({ totalSeen, total24h, connected }: Props) {
  return (
    <div
      className="grid grid-cols-2 divide-x divide-border"
      style={{ borderBottom: "1px solid rgba(57,255,20,0.15)" }}
    >
      {/* Live launches */}
      <div className="flex flex-col items-center py-3 px-4" style={{ background: "#0a140a" }}>
        <div className="flex items-center gap-1.5 mb-1">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${connected ? "live-dot bg-live" : "bg-gray-600"}`} />
          <span className="text-[9px] tracking-[0.15em] uppercase text-gray-500">Live Launches</span>
        </div>
        <AnimatedNumber
          value={totalSeen}
          className="text-2xl font-black tabular-nums"
          style={{ color: "#39FF14", textShadow: "0 0 8px rgba(57,255,20,0.5)" } as React.CSSProperties}
        />
      </div>

      {/* Last 24h */}
      <div className="flex flex-col items-center py-3 px-4" style={{ background: "#0a140a" }}>
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[9px] tracking-[0.15em] uppercase text-gray-500">Last 24H</span>
        </div>
        <span
          className="text-2xl font-black tabular-nums"
          style={{ color: "#c8f0c8", textShadow: "0 0 4px rgba(200,240,200,0.3)" }}
        >
          {total24h !== null ? total24h.toLocaleString() : "—"}
        </span>
      </div>
    </div>
  );
}
