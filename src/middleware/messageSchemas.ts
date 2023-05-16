import type { Socket } from "socket.io";
import { z } from "zod";

export type Schema =
    | typeof likeSchema
    | typeof adminEventSchema
    | typeof changeCurrentSchema
    | typeof changeOverlaySchema;

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

export const changeCurrentSchema = z.object({
    username: z.string(),
    message: z.object({
        queueNumber: z.number(),
    }),
});

export const changeOverlaySchema = z.object({
    username: z.string(),
    message: z.object({
        value: z.string(),
    }),
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
