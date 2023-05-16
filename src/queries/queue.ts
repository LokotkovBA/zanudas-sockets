import { z } from "zod";
import { drizzleClient } from "../drizzle/db";
import { queue } from "../drizzle/schemas/queue";
import { desc, eq } from "drizzle-orm";

export const fromDASchema = z.object({
    artist: z.string(),
    songName: z.string(),
    donorName: z.string(),
    donorText: z.string(),
    donateAmount: z.number(),
    currency: z.string(),
});

export type EntryFromDA = z.infer<typeof fromDASchema> & {
    queueNumber: number;
};

export async function addQueueEntry(entry: EntryFromDA) {
    const queueNumber = await getLastQueueNumber();
    entry.queueNumber = queueNumber + 1;

    return drizzleClient.insert(queue).values(entry).run();
}

export async function getLastQueueNumber(): Promise<number> {
    const entries = await drizzleClient
        .select({ queueNumber: queue.queueNumber })
        .from(queue)
        .orderBy(desc(queue.queueNumber))
        .limit(1)
        .all();

    return entries[0]?.queueNumber ?? 0;
}

export async function getCurrentQueueEntry(): Promise<number> {
    const entries = await drizzleClient
        .select({
            id: queue.id,
        })
        .from(queue)
        .where(eq(queue.current, 1))
        .orderBy(desc(queue.queueNumber))
        .all();
    if (entries.length > 1) {
        console.log("warning! multiple current entries");
    }

    return entries[0]?.id ?? -1;
}
