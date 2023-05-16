import type { Server, Socket } from "socket.io";
import {
    checkSchema,
    adminEventSchema,
    likeSchema,
} from "../middleware/messageSchemas";
import { checkAuth } from "../middleware/auth";
import { env } from "../env";
import axios from "axios";
import { isMod } from "../utils/privileges";

const showInfo = false;
const textInfo = `Разбор новой композиции недоступен D:
Songlist - zanudas.ru`;
const hidTokenButtons = false;
const currentSong = 0;

const toUpdate = new Set<number>();
let waitingToUpdate = false;

export default function queueHandler(server: Server, socket: Socket) {
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
                    return socket.emit("error", "empty message");
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
