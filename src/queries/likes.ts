import { eq } from "drizzle-orm";
import { drizzleClient } from "../drizzle/db";
import { likes, queue } from "../drizzle/schemas/queue";

export async function updateLikes(songId: number) {
    const likesData = await drizzleClient
        .select({ value: likes.value })
        .from(likes)
        .where(eq(likes.songId, songId))
        .all();

    let likeCount = 0;
    for (const { value } of likesData) {
        likeCount += value;
    }

    await drizzleClient
        .update(queue)
        .set({ likeCount })
        .where(eq(queue.id, songId))
        .run();
}
