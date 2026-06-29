export function HeroBanner() {
  return (
    <div
      className="relative flex flex-col items-center justify-center py-5 px-4 overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #0a160a 0%, #080c08 100%)",
        borderBottom: "1px solid rgba(57,255,20,0.15)",
      }}
    >
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(rgba(57,255,20,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(57,255,20,0.3) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative flex items-center gap-5">
        {/* Pill logo */}
        <div className="flame-anim relative flex-shrink-0">
          {/* Flame glow */}
          <div
            className="absolute inset-0 rounded-full blur-xl scale-[2]"
            style={{ background: "radial-gradient(ellipse, rgba(255,107,0,0.5) 0%, transparent 70%)" }}
          />
          {/* Capsule */}
          <div
            className="relative w-14 h-7 rounded-full overflow-hidden"
            style={{ boxShadow: "0 0 16px rgba(57,255,20,0.6), 0 0 4px rgba(57,255,20,0.4)" }}
          >
            <div className="absolute inset-0 left-0 w-1/2 bg-gradient-to-b from-white to-gray-200" />
            <div
              className="absolute inset-0 left-1/2"
              style={{ background: "linear-gradient(135deg,#39FF14 0%,#1a8c00 100%)" }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-black text-black text-xs leading-none" style={{ textShadow: "0 0 4px rgba(57,255,20,0.8)" }}>
                X
              </span>
            </div>
          </div>
          {/* Flame streaks */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-base leading-none select-none">
            🔥
          </div>
        </div>

        {/* Text */}
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1">
            <span
              className="text-2xl font-black leading-none tracking-widest"
              style={{ color: "#39FF14", textShadow: "0 0 12px rgba(57,255,20,0.7)" }}
            >
              XTREME
            </span>
          </div>
          <span
            className="text-2xl font-black leading-none tracking-wider"
            style={{ color: "#FFD700", textShadow: "0 0 10px rgba(255,215,0,0.5)" }}
          >
            PUMP BOT
          </span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="live-dot w-1.5 h-1.5 rounded-full bg-live inline-block" />
            <span className="text-[9px] tracking-[0.2em] text-gray-400 uppercase">
              powered by Xtreme Ripple Protocol
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
