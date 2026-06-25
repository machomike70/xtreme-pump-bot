import type { FilterMode } from "../types";

interface Props {
  active: FilterMode;
  onChange: (f: FilterMode) => void;
  count: number;
}

const FILTERS: { key: FilterMode; label: string }[] = [
  { key: "all", label: "All" },
  { key: "social", label: "Has Social" },
  { key: "mcap", label: "Has MCap" },
];

export function FilterBar({ active, onChange, count }: Props) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex gap-1 bg-surface border border-border rounded-lg p-1">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              active === key
                ? "bg-accent text-black"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <span className="text-gray-500 text-sm ml-auto">
        {count} token{count !== 1 ? "s" : ""}
      </span>
    </div>
  );
}
