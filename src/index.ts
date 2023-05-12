import fs from "fs";
import { createSecureServer } from "http2";
import { Server } from "socket.io";
import { env } from "./env.ts";
import queueHandler from "./handlers/queue.ts";

const httpsServer = createSecureServer({
    cert: fs.readFileSync(env.CERT_PATH),
    key: fs.readFileSync(env.KEY_PATH),
    allowHTTP1: true,
});

export const socketServer = new Server(httpsServer, {
    cors: {
        origin: env.APP_URLS.split(","),
        methods: ["GET", "POST"],
        credentials: true,
    },
});

httpsServer.listen(env.SOCKET_PORT ?? 3000, () =>
    console.log(`Listening on port ${env.SOCKET_PORT ?? 3000}`),
);

socketServer.on("connect", (socket) => {
    queueHandler(socketServer, socket);
});
