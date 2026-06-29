interface Props {
  connected: boolean;
  totalSeen: number;
}

export function StatusBar({ connected, totalSeen }: Props) {
  return (
    <div className="flex items-center gap-3">
      {totalSeen > 0 && (
        <span className="text-gray-500 text-xs font-mono tabular-nums">
          {totalSeen.toLocaleString()} seen
        </span>
      )}
      <div className="flex items-center gap-1.5">
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            connected ? "bg-accent animate-pulse" : "bg-gray-600"
          }`}
        />
        <span className={`text-xs font-medium ${connected ? "text-accent" : "text-gray-500"}`}>
          {connected ? "LIVE" : "connecting…"}
        </span>
      </div>
    </div>
  );
}
