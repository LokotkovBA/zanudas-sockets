import type { Server, Socket } from "socket.io";
import {
    checkSchema,
    adminEventSchema,
    likeSchema,
    changeOverlaySchema,
} from "../middleware/messageSchemas";
import { checkAuth } from "../middleware/auth";
import { env } from "../env";
import axios from "axios";
import { isMod } from "../utils/privileges";

let isOverlayTextVisible = false;
let overlayText = `Разбор новой композиции недоступен D:
Songlist - zanudas.ru`;
let overtlayFontSize = "2rem";
let overlayEntryCount = 5;

const toUpdate = new Set<number>();
let waitingToUpdate = false;

export default function queueHandler(server: Server, socket: Socket) {
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
                        "overlay text visibility",
                        isOverlayTextVisible ? "show" : "hide",
                    );
            }),
        );
    });

    socket.on("change overlay text", (message) =>
        checkSchema(message, changeOverlaySchema, socket, (message) =>
            checkAuth(message, socket, ({ privileges, message }) => {
                if (!isMod(privileges)) {
                    return socket.emit("error", "forbidden");
                }
                if (!message) {
                    throw new Error(
                        "Unexpected error. Message lost after checkAuth",
                    );
                }

                overlayText = message.value;
                server.to("admin").emit("overlay text", message.value);
            }),
        ),
    );

    socket.on("change overlay font size", (message) =>
        checkSchema(message, changeOverlaySchema, socket, (message) =>
            checkAuth(message, socket, ({ privileges, message }) => {
                if (!isMod(privileges)) {
                    return socket.emit("error", "forbidden");
                }
                if (!message) {
                    throw new Error(
                        "Unexpected error. Message lost after checkAuth",
                    );
                }

                overtlayFontSize = message.value;
                server.to("admin").emit("overlay font size", message.value);
            }),
        ),
    );

    socket.on("change overlay entry count", (message) =>
        checkSchema(message, changeOverlaySchema, socket, (message) =>
            checkAuth(message, socket, ({ privileges, message }) => {
                if (!isMod(privileges)) {
                    return socket.emit("error", "forbidden");
                }
                if (!message) {
                    throw new Error(
                        "Unexpected error. Message lost after checkAuth",
                    );
                }

                overlayEntryCount = parseInt(message.value);
                server
                    .to("admin")
                    .emit("overlay entry count changed", message.value);
            }),
        ),
    );

    socket.on("get overlay text", () => {
        socket.emit("overlay text", overlayText);
    });
    socket.on("get overlay text visibility", () => {
        socket.emit(
            "overlay text visibility",
            isOverlayTextVisible ? "show" : "hide",
        );
    });
    socket.on("get overlay font size", () => {
        socket.emit("overlay font size", overtlayFontSize);
    });
    socket.on("get overlay entry count", () => {
        socket.emit("overlay entry count", overlayEntryCount.toString());
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
            checkAuth(message, socket, ({ message }) => {
                if (!message) {
                    throw new Error(
                        "Unexpected error. Message lost after checkAuth",
                    );
                }

                toUpdate.add(message.entryId);

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
