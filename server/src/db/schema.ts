import {
  pgTable,
  serial,
  text,
  numeric,
  timestamp,
  bigint,
  boolean,
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
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("tokens_created_at_idx").on(table.createdAt).desc()]
);

export const botSubscriptions = pgTable("bot_subscriptions", {
  chatId: bigint("chat_id", { mode: "number" }).primaryKey(),
  filter: text("filter").notNull().default("all"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Token = typeof tokens.$inferSelect;
export type NewToken = typeof tokens.$inferInsert;
export type BotSubscription = typeof botSubscriptions.$inferSelect;
