import { type Socket } from "socket.io";
import { decrypt } from "../utils/encryption";

export function checkAuth<T>(
    message: { username: string; privileges?: number; message?: T },
    socket: Socket,
    next: (message: {
        username: string;
        privileges?: number;
        message?: T;
    }) => void,
) {
    try {
        const [username, timestamp, privileges] = decrypt(
            message.username,
        ).split("//");
        if (!username || !timestamp) {
            return socket.emit("error", "username");
        }

        const date = new Date();
        const clientDate = new Date(parseInt(timestamp));
        if (
            date.toUTCString().slice(0, -12) !==
            clientDate.toUTCString().slice(0, -12)
        ) {
            return socket.emit("error", "date");
        }

        message.username = username;
        if (privileges) {
            message.privileges = parseInt(privileges);
        }

        next(message);
    } catch (error) {
        console.error(error);
        socket.emit("error", "cipher error");
    }
}
