import type { Server, Socket } from "socket.io";
import { checkSchema, likeSchema } from "../middleware/messageSchemas";
import { checkAuth } from "../middleware/auth";
import { updateLikes } from "../queries/likes";
import { env } from "../env";
import axios from "axios";

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
