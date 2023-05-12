import type { z } from "zod";
import type { insertSongsSchema } from "./schemas/songlist";
import type { selectLikesSchema, selectQueueSchema } from "./schemas/queue";

export type SonglistEntry = z.infer<typeof insertSongsSchema>;
export type QueueEntry = z.infer<typeof selectQueueSchema>;
export type LikeEntry = z.infer<typeof selectLikesSchema>;
