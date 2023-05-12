import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const songs = sqliteTable("songs", {
    id: integer("id").primaryKey(),
    artist: text("artist").notNull(),
    songName: text("song_name").notNull(),
    tag: text("tag").notNull().default(""),
    likeCount: integer("like_count").notNull().default(0),
    playCount: integer("play_count").notNull().default(0),
    lastPlayed: text("last_played"),
});

export const insertSongsSchema = createInsertSchema(songs);
export const selectSongsSchema = createSelectSchema(songs);
