import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const tokens = sqliteTable("tokens", {
    id: integer("id").primaryKey(),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token").notNull(),
    type: text("type").notNull(),
    socketConnectionToken: text("socket_connection_token"),
    userId: integer("user_id").notNull(),
});

export const insertTokenSchema = createInsertSchema(tokens);
export const selectTokenSchema = createSelectSchema(tokens);
