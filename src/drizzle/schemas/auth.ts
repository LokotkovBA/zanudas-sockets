import { sql } from "drizzle-orm";
import {
    index,
    integer,
    sqliteTable,
    text,
    uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const accounts = sqliteTable(
    "accounts",
    {
        id: text("id").primaryKey().notNull(),
        userId: text("userId").notNull(),
        type: text("type").notNull(),
        provider: text("provider").notNull(),
        providerAccountId: text("providerAccountId").notNull(),
        access_token: text("access_token"),
        expires_in: integer("expires_in"),
        id_token: text("id_token"),
        refresh_token: text("refresh_token"),
        refresh_token_expires_in: integer("refresh_token_expires_in"),
        scope: text("scope"),
        token_type: text("token_type"),
        createdAt: integer("createdAt", { mode: "timestamp" })
            .default(sql`(strftime('%s', 'now'))`)
            .notNull(),
        updatedAt: integer("updatedAt", { mode: "timestamp" })
            .default(sql`(strftime('%s', 'now'))`)
            .notNull(),
    },
    (account) => ({
        providerProviderAccountIdIndex: uniqueIndex(
            "accounts__provider__providerAccountId__idx",
        ).on(account.provider, account.providerAccountId),
        userIdIndex: index("accounts__userId__idx").on(account.userId),
    }),
);

export const sessions = sqliteTable(
    "sessions",
    {
        id: text("id").primaryKey().notNull(),
        sessionToken: text("sessionToken").notNull(),
        userId: text("userId").notNull(),
        expires: text("expires").notNull(),
        created_at: integer("created_at", { mode: "timestamp" }).default(
            sql`(strftime('%s', 'now'))`,
        ),
        updated_at: integer("updated_at", { mode: "timestamp" }).default(
            sql`(strftime('%s', 'now'))`,
        ),
    },
    (session) => ({
        sessionTokenIndex: uniqueIndex("sessions__sessionToken__idx").on(
            session.sessionToken,
        ),
        userIdIndex: index("sessions__userId__idx").on(session.userId),
    }),
);

export const users = sqliteTable(
    "users",
    {
        id: text("id").primaryKey().notNull(),
        privileges: integer("privileges").notNull().default(0),
        name: text("name"),
        email: text("email").notNull(),
        emailVerified: integer("emailVerified", { mode: "timestamp" }),
        image: text("image"),
        created_at: integer("created_at", { mode: "timestamp" }).default(
            sql`(strftime('%s', 'now'))`,
        ),
        updated_at: integer("updated_at", { mode: "timestamp" }).default(
            sql`(strftime('%s', 'now'))`,
        ),
    },
    (user) => ({
        emailIndex: uniqueIndex("users__email__idx").on(user.email),
    }),
);

export const verificationTokens = sqliteTable(
    "verification_tokens",
    {
        identifier: text("identifier").primaryKey().notNull(),
        token: text("token").notNull(),
        expires: text("expires").notNull(),
        created_at: integer("created_at", { mode: "timestamp" }).default(
            sql`(strftime('%s', 'now'))`,
        ),
        updated_at: integer("updated_at", { mode: "timestamp" }).default(
            sql`(strftime('%s', 'now'))`,
        ),
    },
    (verificationToken) => ({
        tokenIndex: uniqueIndex("verification_tokens__token__idx").on(
            verificationToken.token,
        ),
    }),
);
