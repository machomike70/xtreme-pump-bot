interface Props {
  connected: boolean;
  error: string | null;
}

export function StatusBar({ connected, error }: Props) {
  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-400 text-sm">
        <span className="w-2 h-2 rounded-full bg-red-400" />
        {error}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={`w-2 h-2 rounded-full ${
          connected ? "bg-accent animate-pulse" : "bg-gray-600"
        }`}
      />
      <span className={connected ? "text-accent" : "text-gray-500"}>
        {connected ? "Live" : "Connecting…"}
      </span>
    </div>
  );
}
