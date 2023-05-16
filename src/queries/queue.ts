import { z } from "zod";
import { drizzleClient } from "../drizzle/db";
import { queue } from "../drizzle/schemas/queue";
import { desc } from "drizzle-orm";

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
    const { queueNumber } = (await drizzleClient
        .select({ queueNumber: queue.queueNumber })
        .from(queue)
        .orderBy(desc(queue.queueNumber))
        .limit(1)
        .get()) ?? { queueNumber: 0 };
    entry.queueNumber = queueNumber + 1;

    return drizzleClient.insert(queue).values(entry).run();
}
