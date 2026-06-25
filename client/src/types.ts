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
  createdAt: string;
}

export type FilterMode = "all" | "social" | "mcap";
