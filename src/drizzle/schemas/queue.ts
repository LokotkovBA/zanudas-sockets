import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { users } from "./auth";

export const queue = sqliteTable("queue", {
    id: integer("id").primaryKey(),
    artist: text("artist").notNull(),
    songName: text("song_name").notNull(),
    donorName: text("donor_name").notNull().default(""),
    donateAmount: integer("donate_amount").notNull().default(0),
    donorText: text("donot_text").notNull().default(""),
    currency: text("currency").notNull().default("RUB"),
    tag: text("tag").notNull().default(""),
    queueNumber: integer("queue_number").notNull(),
    likeCount: integer("like_count").notNull().default(0),
    played: integer("played").notNull().default(0),
    willAdd: integer("will_add").notNull().default(0),
    visible: integer("visible").notNull().default(0),
    current: integer("current").notNull().default(0),
});

export const insertQueueSchema = createInsertSchema(queue);
export const selectQueueSchema = createSelectSchema(queue);

export const likes = sqliteTable(
    "likes",
    {
        id: integer("id").primaryKey(),
        value: integer("value").notNull(),
        songId: integer("song_id").references(() => queue.id, {
            onDelete: "cascade",
        }),
        userId: text("user_id").references(() => users.id, {
            onDelete: "cascade",
        }),
    },
    (likes) => ({
        songIdx: index("songIdx").on(likes.songId),
    }),
);

export const insertLikesSchema = createInsertSchema(likes);
export const selectLikesSchema = createSelectSchema(likes);
