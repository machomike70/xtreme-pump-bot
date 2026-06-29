"""
Deploy patch — run this on the server as:
  python3 /home/goml/goml-radio/deploy-patch.py

Applies the anti-rug + dev-supply filtering update to the mini app.
Safe to run multiple times (idempotent — skips already-patched files).
"""
import pathlib, sys

BASE = pathlib.Path("/home/goml/goml-radio")

def patch(relpath: str, old: str, new: str):
    p = BASE / relpath
    if not p.exists():
        print(f"  MISSING  {relpath}")
        return
    txt = p.read_text(encoding="utf-8")
    if old not in txt:
        print(f"  SKIP     {relpath}  (already patched or string not found)")
        return
    p.write_text(txt.replace(old, new, 1), encoding="utf-8")
    print(f"  PATCHED  {relpath}")

print("=== xtreme-pump-bot anti-rug deploy patch ===\n")

# ── 1. server/db/schema.ts — add dev_holding_pct column ───────────────────────
patch("src/db/schema.ts",
    '    score: integer("score").default(1),            // 1–5 star alpha score',
    '    devHoldingPct: numeric("dev_holding_pct"),      // dev\'s % of 1B supply sniped at launch\n'
    '    score: integer("score").default(1),            // 1–5 star alpha score',
)

# ── 2. poller.ts — store devHoldingPct in newToken object ────────────────────
patch("src/poller.ts",
    '    vSolInBondingCurve: vSolInBondingCurve.toFixed(4),\n'
    '    score: breakdown.stars,',
    '    vSolInBondingCurve: vSolInBondingCurve.toFixed(4),\n'
    '    devHoldingPct: devHoldingPct.toFixed(2),\n'
    '    score: breakdown.stars,',
)

# ── 3. poller.ts — store devHoldingPct in onConflictDoUpdate ─────────────────
patch("src/poller.ts",
    '          vSolInBondingCurve: newToken.vSolInBondingCurve,\n'
    '          score: newToken.score,',
    '          vSolInBondingCurve: newToken.vSolInBondingCurve,\n'
    '          devHoldingPct: newToken.devHoldingPct,\n'
    '          score: newToken.score,',
)

# ── 4. client types.ts — add devHoldingPct field ──────────────────────────────
patch("client/src/types.ts",
    '  vSolInBondingCurve: string | null;\n'
    '  score: number | null;',
    '  vSolInBondingCurve: string | null;\n'
    '  devHoldingPct: string | null;\n'
    '  score: number | null;',
)

# ── 5. client types.ts — add "safe" to FilterMode union ──────────────────────
patch("client/src/types.ts",
    '"all" | "social" | "stars3"',
    '"all" | "social" | "safe" | "stars3"',
)

# ── 6. useTokenFeed.ts — add devPct calculation ───────────────────────────────
patch("client/src/hooks/useTokenFeed.ts",
    '    const score = token.score ?? 1;\n'
    '    switch (filter) {',
    '    const score = token.score ?? 1;\n'
    '    const devPct = token.devHoldingPct ? parseFloat(token.devHoldingPct) : 0;\n'
    '    switch (filter) {',
)

# ── 7. useTokenFeed.ts — add "safe" filter case ───────────────────────────────
patch("client/src/hooks/useTokenFeed.ts",
    '      case "social":  return !!(token.twitter || token.telegram || token.website);\n'
    '      case "stars3":',
    '      case "social":  return !!(token.twitter || token.telegram || token.website);\n'
    '      case "safe":    return devPct < 25 && score >= 2;\n'
    '      case "stars3":',
)

# ── 8. App.tsx — add 🛡️SAFE filter tab ────────────────────────────────────────
patch("client/src/App.tsx",
    '  { key: "social", label: "SOCIALS" },\n'
    '  { key: "stars3",',
    '  { key: "social", label: "SOCIALS" },\n'
    '  { key: "safe",   label: "\U0001f6e1\ufe0fSAFE" },\n'
    '  { key: "stars3",',
)

# ── 9. CompactTokenRow.tsx — add devPct/isRug/isCaution vars ─────────────────
patch("client/src/components/CompactTokenRow.tsx",
    '  const shortMint = `${token.mint.slice(0, 6)}\u2026${token.mint.slice(-4)}`;',
    '  const shortMint = `${token.mint.slice(0, 6)}\u2026${token.mint.slice(-4)}`;\n'
    '  const devPct  = token.devHoldingPct ? parseFloat(token.devHoldingPct) : 0;\n'
    '  const isRug   = devPct >= 25;\n'
    '  const isCaution = devPct >= 15 && devPct < 25;',
)

# ── 10. CompactTokenRow.tsx — rug/caution badge in compact row ────────────────
patch("client/src/components/CompactTokenRow.tsx",
    '              {isGem ? "\U0001f525GEM" : "NEW"}\n'
    '            </span>\n'
    '            <span className="text-white font-bold text-xs truncate max-w-[90px]">{name}</span>',
    '              {isGem ? "\U0001f525GEM" : "NEW"}\n'
    '            </span>\n'
    '            {isRug && (\n'
    '              <span\n'
    '                className="text-[9px] font-black px-1.5 py-0.5 rounded tracking-widest"\n'
    '                style={{ background: "#ff000022", color: "#ff4444", border: "1px solid #ff444444" }}\n'
    '              >\n'
    '                \U0001f6a8RUG\n'
    '              </span>\n'
    '            )}\n'
    '            {isCaution && !isRug && (\n'
    '              <span\n'
    '                className="text-[9px] font-black px-1.5 py-0.5 rounded tracking-widest"\n'
    '                style={{ background: "#ff880022", color: "#ff8800", border: "1px solid #ff880044" }}\n'
    '              >\n'
    '                \u26a0\ufe0fDEV\n'
    '              </span>\n'
    '            )}\n'
    '            <span className="text-white font-bold text-xs truncate max-w-[80px]">{name}</span>',
)

# ── 11. CompactTokenRow.tsx — dev supply chip in expanded metrics ─────────────
patch("client/src/components/CompactTokenRow.tsx",
    '            {token.vSolInBondingCurve && parseFloat(token.vSolInBondingCurve) > 0 && (\n'
    '              <span className="px-2 py-0.5 rounded" style={{ background: "#1a261a", color: "#7aaa7a" }}>\n'
    '                Curve {parseFloat(token.vSolInBondingCurve).toFixed(1)}\u25ce\n'
    '              </span>\n'
    '            )}',
    '            {devPct > 0 && (\n'
    '              <span\n'
    '                className="px-2 py-0.5 rounded"\n'
    '                style={{\n'
    '                  background: isRug ? "#1a0000" : isCaution ? "#1a0d00" : "#1a261a",\n'
    '                  color: isRug ? "#ff4444" : isCaution ? "#ff8800" : "#7aaa7a",\n'
    '                }}\n'
    '              >\n'
    '                {isRug ? "\U0001f6a8" : isCaution ? "\u26a0\ufe0f" : "\U0001f91d"} Dev supply {devPct.toFixed(1)}%\n'
    '              </span>\n'
    '            )}\n'
    '            {token.vSolInBondingCurve && parseFloat(token.vSolInBondingCurve) > 0 && (\n'
    '              <span className="px-2 py-0.5 rounded" style={{ background: "#1a261a", color: "#7aaa7a" }}>\n'
    '                Curve {parseFloat(token.vSolInBondingCurve).toFixed(1)}\u25ce\n'
    '              </span>\n'
    '            )}',
)

print("\nAll patches applied. Next steps:")
print("  1. psql <DB_URL> -c \"ALTER TABLE tokens ADD COLUMN IF NOT EXISTS dev_holding_pct numeric;\"")
print("  2. cd /home/goml/goml-radio/client && npm run build")
print("  3. cd /home/goml/goml-radio && npm run build")
print("  4. systemctl restart <your-service-name>")
