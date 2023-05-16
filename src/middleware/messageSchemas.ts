import type { Socket } from "socket.io";
import { z } from "zod";

type Schema = typeof likeSchema | typeof adminEventSchema;

export const likeSchema = z.object({
    username: z.string(),
    message: z.object({
        entryId: z.number(),
        value: z.number(),
    }),
});

export const adminEventSchema = z.object({
    username: z.string(),
});

export function checkSchema<T extends Schema>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    message: any,
    schema: T,
    socket: Socket,
    next: (message: z.infer<T>) => void,
) {
    const result = schema.safeParse(message);
    if (!result.success) {
        return socket.emit("error", result.error);
    }

    next(result.data);
}
