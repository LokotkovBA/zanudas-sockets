import fs from "fs";
import { createSecureServer } from "http2";
import { Server } from "socket.io";
import { env } from "./env";
import queueHandler from "./handlers/queue";
import { getCentrifugoStatus, setupCentrifuge } from "./utils/DA";
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

    socket.on("centrifuge status", () => {
        socket.emit(
            getCentrifugoStatus() ? "centrifuge started" : "centrifuge stopped",
        );
    });

    socket.on("centrifuge start", (message) =>
        checkSchema(message, adminEventSchema, socket, (message) =>
            checkAuth(message, socket, ({ privileges }) => {
                if (!isMod(privileges)) {
                    return socket.emit("error", "forbidden");
                }

                if (!centrifugo) {
                    return socket.emit("error", "centrifugo not set up");
                }

                centrifugo.connect();
            }),
        ),
    );

    socket.on("centrifuge stop", (message) =>
        checkSchema(message, adminEventSchema, socket, (message) =>
            checkAuth(message, socket, ({ privileges }) => {
                if (!isMod(privileges)) {
                    return socket.emit("error", "forbidden");
                }

                if (!centrifugo) {
                    return socket.emit("error", "centrifugo not set up");
                }

                centrifugo.disconnect();
            }),
        ),
    );
});

let centrifugo: Centrifuge | null = null;

setupCentrifuge(socketServer)
    .then((newCentrifugo) => {
        centrifugo = newCentrifugo;
        socketServer.to("admin").emit("success", "centrifuge ready");
    })
    .catch((error) => {
        socketServer.to("admin").emit("error", "centrifuge error");
        console.error(error);
    });
