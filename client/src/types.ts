export interface Token {
  id: number;
  mint: string;
  symbol: string | null;
  name: string | null;
  description: string | null;
  imageUri: string | null;
  twitter: string | null;
  telegram: string | null;
  website: string | null;
  marketCapUsd: string | null;
  marketCapSol: string | null;
  initialBuySol: string | null;
  vSolInBondingCurve: string | null;
  devHoldingPct: string | null;
  score: number | null;
  scoreTotal: number | null;
  createdAt: string;
}

export type FilterMode = "all" | "social" | "safe" | "stars3" | "stars4" | "gems";
