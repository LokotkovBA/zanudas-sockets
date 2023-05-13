import type { Server, Socket } from "socket.io";
import { checkSchema, likeSchema } from "../middleware/messageSchemas";
import { checkAuth } from "../middleware/auth";
import { updateLikes } from "../queries/likes";
import { env } from "../env";

const showInfo = false;
const textInfo = `Разбор новой композиции недоступен D:
Songlist - zanudas.ru`;
const hidTokenButtons = false;
const currentSong = 0;

const toUpdate = new Set<number>();
let waitingToUpdate = false;

export default function queueHandler(server: Server, socket: Socket) {
    socket.on("sub likes", (userName) => {
        socket.join(userName);
    });

    socket.on("unsub likes", (userName) => {
        socket.leave(userName);
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
            checkAuth(message, socket, ({ username, message }) => {
                server.to(username).emit("like", message);

                toUpdate.add(message.entryId);
                if (!waitingToUpdate) {
                    updateQueue(server, toUpdate);
                }
            });
        }),
    );
    socket.on("hook like", (message) =>
        checkSchema(message, likeSchema, socket, (message) => {
            checkAuth(message, socket, ({ username, message }) => {
                server.to(username).emit("like", message);

                toUpdate.add(message.entryId);
                if (!waitingToUpdate) {
                    hookUpdate(server, toUpdate);
                }
            });
        }),
    );
}

function hookUpdate(server: Server, toUpdate: Set<number>) {
    waitingToUpdate = true;
    const likeDelay = getLikeDelay(server);

    setTimeout(async () => {
        waitingToUpdate = false;
        console.time("from edge");
        await fetch(`${env.MAIN_URL}/api/likes/update`, {
            method: "PUT",
            body: JSON.stringify([...toUpdate.keys()]),
        });
        console.timeEnd("from edge");
        server.emit("invalidate");
    }, likeDelay);
}

function updateQueue(server: Server, toUpdate: Set<number>) {
    waitingToUpdate = true;
    const likeDelay = getLikeDelay(server);

    setTimeout(async () => {
        waitingToUpdate = false;
        console.time("from reg ru");
        const dbPromises: Promise<void>[] = new Array(toUpdate.size);
        for (const entryId of toUpdate) {
            dbPromises.push(updateLikes(entryId));
            toUpdate.delete(entryId);
        }
        await Promise.all(dbPromises);
        console.timeEnd("from reg ru");
        server.emit("invalidate");
    }, likeDelay);
}

const LIKE_DELAY_CONSTANT = parseInt(env.LIKE_DELAY_CONSTANT);
function getLikeDelay(server: Server): number {
    return LIKE_DELAY_CONSTANT * server.of("/").sockets.size;
}
