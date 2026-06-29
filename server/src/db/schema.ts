import {
  pgTable,
  serial,
  text,
  numeric,
  timestamp,
  bigint,
  boolean,
  integer,
  index,
} from "drizzle-orm/pg-core";

export const tokens = pgTable(
  "tokens",
  {
    id: serial("id").primaryKey(),
    mint: text("mint").notNull().unique(),
    symbol: text("symbol"),
    name: text("name"),
    description: text("description"),
    imageUri: text("image_uri"),
    twitter: text("twitter"),
    telegram: text("telegram"),
    website: text("website"),
    marketCapUsd: numeric("market_cap_usd"),
    marketCapSol: numeric("market_cap_sol"),
    initialBuySol: numeric("initial_buy_sol"),
    vSolInBondingCurve: numeric("v_sol_in_bonding_curve"),
    devHoldingPct: numeric("dev_holding_pct"),      // dev's % of 1B supply sniped at launch
    score: integer("score").default(1),            // 1–5 star alpha score
    scoreTotal: integer("score_total").default(0), // raw 0–10
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("tokens_created_at_idx").on(table.createdAt),
    index("tokens_score_idx").on(table.score),
  ]
);

export const botSubscriptions = pgTable("bot_subscriptions", {
  chatId: bigint("chat_id", { mode: "number" }).primaryKey(),
  filter: text("filter").notNull().default("all"),
  minScore: integer("min_score").default(1), // minimum star rating to receive
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const memberStats = pgTable("member_stats", {
  userId:      bigint("user_id", { mode: "number" }).primaryKey(),
  username:    text("username").notNull(),
  callCount:   integer("call_count").notNull().default(0),
  totalInvested: numeric("total_invested").notNull().default("0"),
  totalSold:   numeric("total_sold").notNull().default("0"),
  bestGainX:   numeric("best_gain_x").notNull().default("0"),
  sumGainX:    numeric("sum_gain_x").notNull().default("0"),
  firstCallAt: timestamp("first_call_at", { withTimezone: true }).defaultNow(),
  lastCallAt:  timestamp("last_call_at", { withTimezone: true }).defaultNow(),
});

export type Token = typeof tokens.$inferSelect;
export type NewToken = typeof tokens.$inferInsert;
export type BotSubscription = typeof botSubscriptions.$inferSelect;
export type MemberStats = typeof memberStats.$inferSelect;
