import { createClient } from "@libsql/client/http";
import { drizzle } from "drizzle-orm/libsql";
import { env } from "~/env.ts";

const client = createClient({
    url: env.DATABASE_URL,
    authToken: env.DATABASE_AUTH_TOKEN,
});

export const drizzleClient = drizzle(client);
