import { useState } from "react";
import { X, Zap } from "lucide-react";

interface TgUser {
  id: number;
  username?: string;
  first_name?: string;
  photo_url?: string;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe?: { user?: TgUser };
      };
    };
  }
}

interface Props {
  onClose: () => void;
}

export function BoostCard({ onClose }: Props) {
  const tgUser   = window.Telegram?.WebApp?.initDataUnsafe?.user;
  const initData = window.Telegram?.WebApp?.initData ?? "";

  const [tokenName, setTokenName] = useState("");
  const [symbol,    setSymbol]    = useState("");
  const [mint,      setMint]      = useState("");
  const [invested,  setInvested]  = useState("");
  const [sold,      setSold]      = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const inv = parseFloat(invested) || 0;
  const sld = parseFloat(sold)     || 0;
  const gainPct = inv > 0 && sld > inv ? Math.round(((sld - inv) / inv) * 100) : null;
  const gainX   = inv > 0 && sld > 0   ? (sld / inv).toFixed(1) : null;

  const username = tgUser?.username
    ? `@${tgUser.username}`
    : (tgUser?.first_name ?? "Alpha Member");
  const photoUrl = tgUser?.photo_url;

  const canSubmit = !!tgUser && tokenName.trim().length > 0 && inv > 0 && sld > inv;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const BASE = (import.meta as unknown as { env: { BASE_URL: string } }).env.BASE_URL;
      const res = await fetch(`${BASE}feed/boost`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          initData,
          tokenName: tokenName.trim(),
          symbol: symbol.trim(),
          mint: mint.trim(),
          invested: inv,
          sold: sld,
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to post boost");
      } else {
        setSubmitted(true);
      }
    } catch {
      setError("Network error — try again");
    } finally {
      setSubmitting(false);
    }
  }

  if (!tgUser) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-8"
        style={{ background: "#060a06" }}>
        <div className="text-5xl mb-4">📱</div>
        <p className="font-black text-white text-lg mb-2">Open in Telegram</p>
        <p className="text-gray-500 text-sm text-center">
          Boost cards require Telegram. Open this app via the bot or the channel button.
        </p>
        <button onClick={onClose}
          className="mt-8 text-sm font-black tracking-widest"
          style={{ color: "#39FF14" }}>
          ← BACK TO FEED
        </button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-8"
        style={{ background: "#060a06" }}>
        <div className="text-6xl mb-4">⚡</div>
        <p className="font-black text-2xl mb-2" style={{ color: "#39FF14" }}>BOOSTED!</p>
        <p className="text-gray-400 text-sm text-center">
          Your trade card has been posted to the Alpha channel.
        </p>
        <button onClick={onClose}
          className="mt-8 px-8 py-3 rounded-xl font-black tracking-widest text-sm"
          style={{ background: "#39FF14", color: "#000", boxShadow: "0 0 20px rgba(57,255,20,0.4)" }}>
          BACK TO FEED
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto" style={{ background: "#060a06" }}>

      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3"
        style={{ background: "#060a06", borderBottom: "1px solid rgba(57,255,20,0.2)" }}>
        <div className="flex items-center gap-2">
          <Zap size={14} style={{ color: "#39FF14" }} />
          <span className="font-black tracking-widest text-sm" style={{ color: "#39FF14" }}>
            ALPHA BOOST
          </span>
        </div>
        <button onClick={onClose}>
          <X size={18} className="text-gray-500 hover:text-white transition-colors" />
        </button>
      </div>

      <div className="flex-1 px-4 py-4 flex flex-col gap-4">

        <p className="text-[11px] text-gray-500 leading-relaxed">
          Flex your winning trade to the Alpha channel. Fill in the details — your card posts instantly with your Telegram profile.
        </p>

        {/* ── Form ── */}
        <div className="flex flex-col gap-3">

          {/* Token name + symbol */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-[9px] tracking-widest font-black mb-1" style={{ color: "#39FF14" }}>
                TOKEN NAME
              </label>
              <input
                className="w-full px-3 py-2 rounded-lg text-sm font-bold outline-none"
                style={{ background: "#0f1a0f", border: "1px solid rgba(57,255,20,0.3)", color: "#c8f0c8" }}
                placeholder="PEPEXT"
                value={tokenName}
                onChange={e => setTokenName(e.target.value)}
                maxLength={30}
              />
            </div>
            <div className="w-28">
              <label className="block text-[9px] tracking-widest font-black mb-1" style={{ color: "#39FF14" }}>
                SYMBOL
              </label>
              <input
                className="w-full px-3 py-2 rounded-lg text-sm font-bold outline-none"
                style={{ background: "#0f1a0f", border: "1px solid rgba(57,255,20,0.3)", color: "#c8f0c8" }}
                placeholder="$PEPEXT"
                value={symbol}
                onChange={e => setSymbol(e.target.value)}
                maxLength={15}
              />
            </div>
          </div>

          {/* Mint */}
          <div>
            <label className="block text-[9px] tracking-widest font-black mb-1" style={{ color: "#4a7a4a" }}>
              PUMP.FUN MINT <span className="text-gray-600">(optional)</span>
            </label>
            <input
              className="w-full px-3 py-2 rounded-lg text-xs font-mono outline-none"
              style={{ background: "#0a140a", border: "1px solid rgba(57,255,20,0.1)", color: "#7aaa7a" }}
              placeholder="Token contract address"
              value={mint}
              onChange={e => setMint(e.target.value)}
              maxLength={60}
            />
          </div>

          {/* SOL amounts */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-[9px] tracking-widest font-black mb-1" style={{ color: "#39FF14" }}>
                INVESTED (SOL)
              </label>
              <input
                className="w-full px-3 py-2 rounded-lg text-sm font-bold outline-none"
                style={{ background: "#0f1a0f", border: "1px solid rgba(57,255,20,0.3)", color: "#c8f0c8" }}
                placeholder="2.50"
                type="number"
                min="0"
                step="0.01"
                value={invested}
                onChange={e => setInvested(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="block text-[9px] tracking-widest font-black mb-1" style={{ color: "#39FF14" }}>
                SOLD (SOL)
              </label>
              <input
                className="w-full px-3 py-2 rounded-lg text-sm font-bold outline-none"
                style={{ background: "#0f1a0f", border: "1px solid rgba(57,255,20,0.3)", color: "#c8f0c8" }}
                placeholder="26.30"
                type="number"
                min="0"
                step="0.01"
                value={sold}
                onChange={e => setSold(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ── Live card preview ── */}
        <div>
          <div className="text-[9px] tracking-widest font-black mb-2" style={{ color: "#2a5a2a" }}>
            LIVE PREVIEW
          </div>
          <div className="rounded-xl overflow-hidden"
            style={{ background: "#080c08", border: "1px solid rgba(57,255,20,0.3)", boxShadow: "0 0 24px rgba(57,255,20,0.06)" }}>

            {/* Card header */}
            <div className="flex items-center gap-2 px-3 py-2"
              style={{ background: "rgba(57,255,20,0.04)", borderBottom: "1px solid rgba(57,255,20,0.15)" }}>
              <Zap size={10} style={{ color: "#39FF14" }} />
              <span className="text-[9px] font-black tracking-[0.3em]" style={{ color: "#39FF14" }}>
                ALPHA MEMBER BOOST
              </span>
            </div>

            {/* User */}
            <div className="flex items-center gap-3 px-3 pt-3 pb-2">
              {photoUrl ? (
                <img src={photoUrl} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  style={{ border: "2px solid rgba(57,255,20,0.5)" }} />
              ) : (
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: "#1a261a", border: "2px solid rgba(57,255,20,0.3)" }}>
                  👤
                </div>
              )}
              <div>
                <div className="font-black text-sm" style={{ color: "#39FF14" }}>{username}</div>
                <div className="text-[9px] tracking-widest" style={{ color: "#3a6a3a" }}>ALPHA MEMBER</div>
              </div>
            </div>

            {/* Token */}
            <div className="px-3 pb-2">
              <span className="font-bold text-white">{tokenName || <span style={{ color: "#2a4a2a" }}>TOKEN NAME</span>}</span>
              {symbol && <span className="font-black ml-2" style={{ color: "#39FF14" }}>${symbol}</span>}
            </div>

            <div style={{ margin: "0 12px", borderTop: "1px solid rgba(57,255,20,0.1)" }} />

            {/* Stats grid */}
            <div className="grid grid-cols-2 px-3 py-3 gap-y-1">
              <div>
                <div className="text-[9px] tracking-[0.2em] mb-0.5" style={{ color: "#3a6a3a" }}>INVESTED</div>
                <div className="font-bold text-sm" style={{ color: "#c8f0c8" }}>
                  {inv > 0 ? inv.toFixed(2) : "—"} <span className="text-[10px]" style={{ color: "#3a6a3a" }}>SOL</span>
                </div>
              </div>
              <div>
                <div className="text-[9px] tracking-[0.2em] mb-0.5" style={{ color: "#3a6a3a" }}>SOLD</div>
                <div className="font-black text-sm" style={{ color: sld > 0 ? "#39FF14" : "#c8f0c8", textShadow: sld > 0 ? "0 0 8px rgba(57,255,20,0.5)" : "none" }}>
                  {sld > 0 ? sld.toFixed(2) : "—"} <span className="text-[10px]" style={{ color: "#3a6a3a" }}>SOL</span>
                </div>
              </div>
            </div>

            {gainPct !== null && (
              <div className="mx-3 mb-3 px-3 py-2 rounded-lg flex items-center justify-between"
                style={{ background: "rgba(57,255,20,0.06)", border: "1px solid rgba(57,255,20,0.25)" }}>
                <span className="text-[9px] tracking-[0.2em]" style={{ color: "#3a6a3a" }}>TOTAL RETURN</span>
                <div className="text-right">
                  <div className="font-black text-2xl leading-none" style={{ color: "#39FF14", textShadow: "0 0 14px rgba(57,255,20,0.6)" }}>
                    +{gainPct}%
                  </div>
                  <div className="text-[10px]" style={{ color: "#7aaa7a" }}>{gainX}x</div>
                </div>
              </div>
            )}

            <div className="px-3 pb-2 text-[8px] tracking-widest" style={{ color: "#1a3a1a" }}>
              XTREME PUMP ALPHA · POWERED BY XTREME RIPPLE PROTOCOL
            </div>
          </div>
        </div>

        {error && (
          <p className="text-red-400 text-xs text-center font-bold">{error}</p>
        )}

        <button
          onClick={submit}
          disabled={!canSubmit || submitting}
          className="w-full py-3 rounded-xl font-black tracking-widest text-sm transition-all active:scale-95 disabled:opacity-40"
          style={{
            background: canSubmit ? "#39FF14" : "rgba(57,255,20,0.08)",
            color: canSubmit ? "#000" : "#2a5a2a",
            boxShadow: canSubmit ? "0 0 24px rgba(57,255,20,0.35)" : "none",
          }}
        >
          {submitting ? "POSTING TO CHANNEL…" : "⚡ POST TO ALPHA CHANNEL"}
        </button>

        <p className="text-[9px] text-center pb-4" style={{ color: "#1e3a1e" }}>
          1 boost per 24 hours · Alpha members only
        </p>
      </div>
    </div>
  );
}
