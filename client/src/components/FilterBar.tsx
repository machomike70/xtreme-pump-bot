import type { FilterMode } from "../types";

interface Props {
  active: FilterMode;
  onChange: (f: FilterMode) => void;
  count: number;
}

const FILTERS: { key: FilterMode; label: string; emoji?: string }[] = [
  { key: "all",    label: "All" },
  { key: "social", label: "Socials" },
  { key: "stars3", label: "3★+" },
  { key: "stars4", label: "4★+" },
  { key: "gems",   label: "Gems", emoji: "🔥" },
];

export function FilterBar({ active, onChange, count }: Props) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1 bg-surface border border-border rounded-lg p-1 overflow-x-auto flex-1 no-scrollbar">
        {FILTERS.map(({ key, label, emoji }) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
              active === key
                ? key === "gems"
                  ? "bg-accent text-black shadow-[0_0_8px_rgba(0,255,136,0.4)]"
                  : "bg-accent text-black"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {emoji && <span className="mr-1">{emoji}</span>}
            {label}
          </button>
        ))}
      </div>
      <span className="text-gray-600 text-xs font-mono tabular-nums flex-shrink-0">
        {count}
      </span>
    </div>
  );
}
