import type { Server, Socket } from "socket.io";
import {
    checkSchema,
    adminEventSchema,
    likeSchema,
    changeCurrentSchema,
    changeOverlaySchema,
} from "../middleware/messageSchemas";
import { checkAuth } from "../middleware/auth";
import { env } from "../env";
import axios from "axios";
import { isMod } from "../utils/privileges";
import { getCurrentQueueEntry } from "../queries/queue";

let isOverlayTextVisible = false;
let overlayText = `Разбор новой композиции недоступен D:
Songlist - zanudas.ru`;
let currentSong = -1;
let overtlayFontSize = "2rem";
let overlayEntryCount = 5;

getCurrentQueueEntry()
    .then((current) => (currentSong = current))
    .catch((error) => console.log("error initialising current", error));

const toUpdate = new Set<number>();
let waitingToUpdate = false;

export default function queueHandler(server: Server, socket: Socket) {
    socket.on("change current", (message) =>
        checkSchema(message, changeCurrentSchema, socket, (message) =>
            checkAuth(
                message,
                socket,
                ({ privileges, message: { entryId } }) => {
                    if (!isMod(privileges)) {
                        return socket.emit("error", "forbidden");
                    }

                    currentSong = entryId;
                    server.to("admin").emit("current", currentSong);
                },
            ),
        ),
    );

    socket.on("change overlay text visibility", (message) => {
        checkSchema(message, adminEventSchema, socket, (message) =>
            checkAuth(message, socket, ({ privileges }) => {
                if (!isMod(privileges)) {
                    return socket.emit("error", "forbidden");
                }

                isOverlayTextVisible = !isOverlayTextVisible;
                server
                    .to("admin")
                    .emit(
                        isOverlayTextVisible
                            ? "show overlay text"
                            : "hide overlay text",
                    );
            }),
        );
    });

    socket.on("change overlay text", (message) =>
        checkSchema(message, changeOverlaySchema, socket, (message) =>
            checkAuth(message, socket, ({ privileges, message: { value } }) => {
                if (!isMod(privileges)) {
                    return socket.emit("error", "forbidden");
                }

                overlayText = value;
                server.to("admin").emit("overlay text changed", value);
            }),
        ),
    );

    socket.on("change overlay font size", (message) =>
        checkSchema(message, changeOverlaySchema, socket, (message) =>
            checkAuth(message, socket, ({ privileges, message: { value } }) => {
                if (!isMod(privileges)) {
                    return socket.emit("error", "forbidden");
                }

                overtlayFontSize = value;
                server.to("admin").emit("overlay font size changed", value);
            }),
        ),
    );

    socket.on("change overlay entry count", (message) =>
        checkSchema(message, changeOverlaySchema, socket, (message) =>
            checkAuth(message, socket, ({ privileges, message: { value } }) => {
                if (!isMod(privileges)) {
                    return socket.emit("error", "forbidden");
                }

                overlayEntryCount = parseInt(value);
                server.to("admin").emit("overlay entry count changed", value);
            }),
        ),
    );

    socket.on("get current", () => {
        socket.emit("current", currentSong);
    });
    socket.on("get overlay text", () => {
        socket.emit("overtlay text", overlayText);
    });
    socket.on("get overlay font size", () => {
        socket.emit("overlay font size", overtlayFontSize);
    });
    socket.on("get overlay entry count", () => {
        socket.emit("overtlay entry count", overlayEntryCount);
    });

    socket.on("sub admin", (userName) => {
        socket.join("admin");
        console.log(`${userName} subcribed to admin info updates!`);
    });

    socket.on("unsub admin", (userName) => {
        socket.leave("admin");
        console.log(`${userName} unsubcribed from admin info updates!`);
    });

    socket.on("like", (message) =>
        checkSchema(message, likeSchema, socket, (message) => {
            checkAuth(message, socket, ({ message: { entryId } }) => {
                toUpdate.add(entryId);

                if (!waitingToUpdate) {
                    updateQueue(server, toUpdate);
                }
            });
        }),
    );

    socket.on("invalidate", (message) =>
        checkSchema(message, adminEventSchema, socket, (message) =>
            checkAuth(message, socket, ({ privileges }) => {
                if (!isMod(privileges)) {
                    return socket.emit("error", "forbidden");
                }

                server.emit("invalidate");
            }),
        ),
    );
}

function updateQueue(server: Server, toUpdate: Set<number>) {
    waitingToUpdate = true;
    const likeDelay = parseInt(env.LIKE_DELAY_CONSTANT);

    setTimeout(async () => {
        waitingToUpdate = false;
        const body = [...toUpdate.keys()];
        toUpdate.clear();
        await axios.put(`${env.MAIN_URL}/api/likes/update`, body);
        server.emit("invalidate");
    }, likeDelay);
}
