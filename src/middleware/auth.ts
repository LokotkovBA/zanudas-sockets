import { type Socket } from "socket.io";
import { decrypt } from "~/utils/encryption.ts";

export function checkAuth<T>(
    message: { username: string; message: T },
    socket: Socket,
    next: (message: { username: string; message: T }) => void,
) {
    const [username, timestamp] = decrypt(message.username).split("//");
    if (!username || !timestamp) {
        return socket.emit("error", "auth");
    }

    const date = new Date();
    const clientDate = new Date(parseInt(timestamp));

    if (
        date.toUTCString().slice(0, -5) !==
        clientDate.toUTCString().slice(0, -5)
    ) {
        return socket.emit("error", "auth");
    }

    message.username = username;
    next(message);
}
