import fs from "fs";
import { createSecureServer } from "http2";
import { Server } from "socket.io";
import { env } from "./env";
import queueHandler from "./handlers/queue";
import { setupCentrifuge } from "./utils/DA";
import type Centrifuge from "centrifuge";

// eslint-disable-next-line @typescript-eslint/no-var-requires
global.XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest; // HACK: otherwise, the centrifuge will not work

import { checkAuth } from "./middleware/auth";
import { adminEventSchema, checkSchema } from "./middleware/messageSchemas";
import { isMod } from "./utils/privileges";

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

    socket.on("da-start", (message) =>
        checkSchema(message, adminEventSchema, socket, (message) =>
            checkAuth(message, socket, ({ privileges }) => {
                if (!isMod(privileges)) {
                    return socket.emit("error", "forbidden");
                }

                if (!centrifugo) {
                    return socket.emit("error", "centrifugo not set up");
                }

                centrifugo.connect();
                socket.emit("success", "centrifugo started");
            }),
        ),
    );

    socket.on("da-stop", (message) =>
        checkSchema(message, adminEventSchema, socket, (message) =>
            checkAuth(message, socket, ({ privileges }) => {
                if (!isMod(privileges)) {
                    return socket.emit("error", "forbidden");
                }

                if (!centrifugo) {
                    return socket.emit("error", "centrifugo not set up");
                }

                centrifugo.disconnect();
                socket.emit("success", "centrifugo stopped");
            }),
        ),
    );
});

let centrifugo: Centrifuge | null = null;

setupCentrifuge()
    .then((newCentrifugo) => {
        centrifugo = newCentrifugo;
        socketServer.emit("da-ready");
    })
    .catch((error) => {
        socketServer.emit("error", "centrifuge error");
        console.error(error);
    });
