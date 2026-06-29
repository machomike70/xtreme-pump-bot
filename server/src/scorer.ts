/**
 * Anti-rug scoring engine — rates each new pump.fun token 1–5 stars.
 *
 * Five categories, each worth up to 2 points (max 10).
 * Final star rating: ceil(score / 2), clamped 1–5.
 *
 * Category weights
 * ─────────────────────────────────────────────
 *  Socials        0–3 pts  (Twitter/TG/website)
 *  Metadata       0–2 pts  (description + image)
 *  Dev conviction 0–2 pts  (initial SOL buy-in)
 *  Liquidity      0–2 pts  (SOL in bonding curve)
 *  Name quality   0–1 pt   (not a random string)
 * ─────────────────────────────────────────────
 */

export interface ScoreInput {
  // From pump.fun WebSocket
  initialBuySol: number;      // SOL the dev bought at launch
  vSolInBondingCurve: number; // SOL locked in the bonding curve
  marketCapSol: number;
  devHoldingPct?: number;     // dev's % of total supply sniped at launch (0–100)

  // From IPFS/Arweave metadata
  name: string | null;
  symbol: string | null;
  description: string | null;
  imageUri: string | null;
  twitter: string | null;
  telegram: string | null;
  website: string | null;
}

export interface ScoreBreakdown {
  stars: number;          // 1–5
  total: number;          // raw score 0–10
  socials: number;        // 0–3
  metadata: number;       // 0–2
  devConviction: number;  // 0–2
  liquidity: number;      // 0–2
  nameQuality: number;    // 0–1
  flags: string[];        // human-readable positive signals
  warnings: string[];     // red flags
  rugRisk: boolean;       // hard pump-and-dump signal — should be filtered out of alerts
}

const RANDOM_NAME_RE = /^[A-Z0-9]{6,12}$|^\w{1,3}inu|pepe|doge|elon|moon|rug/i;

export function scoreToken(input: ScoreInput): ScoreBreakdown {
  const flags: string[] = [];
  const warnings: string[] = [];

  // ── Socials (0–3) ────────────────────────────────────────────────────────
  let socials = 0;
  if (input.twitter)  { socials += 1; flags.push("🐦 Twitter"); }
  if (input.telegram) { socials += 1; flags.push("📱 Telegram"); }
  if (input.website)  { socials += 1; flags.push("🌐 Website"); }
  if (socials === 0) warnings.push("No socials");

  // ── Metadata quality (0–2) ───────────────────────────────────────────────
  let metadata = 0;
  if (input.description && input.description.trim().length > 30) {
    metadata += 1;
    flags.push("📝 Description");
  } else {
    warnings.push("No description");
  }
  if (input.imageUri) {
    metadata += 1;
    flags.push("🖼️ Image");
  } else {
    warnings.push("No image");
  }

  // ── Dev conviction (0–2) — SOL the dev personally committed ───────────────
  let devConviction = 0;
  if (input.initialBuySol >= 0.1) {
    devConviction += 1;
    flags.push(`💎 Dev bought ${input.initialBuySol.toFixed(2)} SOL`);
  }
  if (input.initialBuySol >= 1.0) {
    devConviction += 1; // bonus for high conviction
  }
  if (input.initialBuySol < 0.05) {
    warnings.push("Dev barely bought in");
  }

  // ── Dev supply concentration (anti-rug / anti-dump gate) ──────────────────
  // The #1 pump-and-dump setup: the dev snipes a huge slice of the supply at
  // launch, pumps it, then dumps on buyers. A big SOL buy looks like conviction
  // above, but if it bought an oversized % of supply it's actually exit-liquidity
  // bait — so concentration is scored separately and can hard-flag a rug.
  let rugRisk = false;
  const devPct = input.devHoldingPct ?? 0;
  if (devPct >= 25) {
    rugRisk = true;
    warnings.push(`🚨 Dev holds ${devPct.toFixed(1)}% — dump risk`);
  } else if (devPct >= 15) {
    warnings.push(`⚠️ Dev holds ${devPct.toFixed(1)}%`);
    devConviction = Math.max(0, devConviction - 1); // claw back conviction points
  } else if (devPct >= 2) {
    flags.push(`🤝 Fair dev bag (${devPct.toFixed(1)}%)`);
  }

  // ── Liquidity / bonding curve (0–2) ──────────────────────────────────────
  let liquidity = 0;
  if (input.vSolInBondingCurve >= 5) {
    liquidity += 1;
    flags.push(`🏊 ${input.vSolInBondingCurve.toFixed(1)} SOL in curve`);
  }
  if (input.vSolInBondingCurve >= 30) {
    liquidity += 1;
  }
  if (input.vSolInBondingCurve < 1) {
    warnings.push("Very low liquidity");
  }

  // ── Name quality (0–1) ───────────────────────────────────────────────────
  let nameQuality = 0;
  const name = (input.name ?? "").trim();
  if (name.length >= 3 && name.length <= 40 && !RANDOM_NAME_RE.test(name)) {
    nameQuality = 1;
    flags.push("✍️ Clean name");
  } else if (!name) {
    warnings.push("No name");
  }

  // ── Final score ───────────────────────────────────────────────────────────
  const total = socials + metadata + devConviction + liquidity + nameQuality;
  // Map 0–10 → 1–5:  0-1→1, 2-3→2, 4-5→3, 6-7→4, 8-10→5
  let stars = Math.max(1, Math.min(5, Math.ceil(total / 2)));
  // Hard cap: a flagged pump-and-dump setup never ranks above 1⭐, so any channel
  // filtering at min_score ≥ 2 never receives it (and the alert volume drops).
  if (rugRisk) stars = 1;

  return { stars, total, socials, metadata, devConviction, liquidity, nameQuality, flags, warnings, rugRisk };
}

export function starsDisplay(stars: number): string {
  return "⭐".repeat(stars) + "☆".repeat(5 - stars);
}

export function scoreLabel(stars: number): string {
  switch (stars) {
    case 1: return "Low Alpha";
    case 2: return "Weak Alpha";
    case 3: return "Mid Alpha";
    case 4: return "Strong Alpha";
    case 5: return "🔥 GEM ALERT";
    default: return "Unknown";
  }
}
