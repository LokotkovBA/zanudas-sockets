import axios from "axios";
import { env } from "../env";
import { drizzleClient } from "../drizzle/db";
import { tokens } from "../drizzle/schemas/tokens";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import Centrifuge from "centrifuge";
import WebSocket from "ws";
import { canParse, parseArtist, parseSong, parseSongName } from "./parsing";
import { addQueueEntry } from "../queries/queue";
import { decrypt, encrypt } from "./encryption";
import { type Server } from "socket.io";

async function getTokens() {
    const tokensData = await drizzleClient
        .select({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            userId: tokens.userId,
            socketConnectionToken: tokens.socketConnectionToken,
        })
        .from(tokens)
        .where(eq(tokens.type, "donation alerts"))
        .orderBy(desc(tokens.id))
        .limit(1)
        .get();
    tokensData.accessToken = decrypt(tokensData.accessToken);
    tokensData.refreshToken = decrypt(tokensData.refreshToken);
    tokensData.socketConnectionToken = decrypt(
        tokensData.socketConnectionToken ?? "",
    );
    return tokensData;
}

const userDAResponseSchema = z.object({
    data: z.object({
        data: z.object({
            socket_connection_token: z.string(),
        }),
    }),
});
async function getSocketConnectionToken() {
    const tokensData = await getTokens();
    try {
        console.log("getting socket token");
        const data = userDAResponseSchema.safeParse(
            await axios.get(
                "https://www.donationalerts.com/api/v1/user/oauth",
                {
                    headers: {
                        Authorization: `Bearer ${tokensData.accessToken}`,
                    },
                },
            ),
        );
        if (!data.success) {
            throw data.error;
        }
        console.log("socket token success");

        return {
            accessToken: tokensData.accessToken,
            socketConnectionToken: data.data.data.data.socket_connection_token, // NOTE: classic data.data.data.data
            userId: tokensData.userId,
        };
    } catch (error) {
        console.error(error);
        return refreshDAToken(
            tokensData.refreshToken,
            tokensData.socketConnectionToken ?? "",
            tokensData.userId,
        );
    }
}

const refreshResponseSchema = z.object({
    data: z.object({
        token_type: z.string(),
        expires_in: z.number(),
        access_token: z.string(),
        refresh_token: z.string(),
    }),
});

async function refreshDAToken(
    refreshToken: string,
    socketConnectionToken: string,
    userId: number,
) {
    console.log("refreshing da token");
    const response = refreshResponseSchema.parse(
        await axios({
            method: "post",
            url: "https://www.donationalerts.com/oauth/token",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data: `grant_type=refresh_token&refresh_token=${refreshToken}&client_id=${env.DA_CLIENT_ID}&client_secret=${env.DA_CLIENT_SECRET}`,
        }),
    );
    console.log("da token refreshed");

    addToken(
        response.data.access_token,
        response.data.refresh_token,
        userId,
        "donation alerts",
        socketConnectionToken,
    );

    return {
        accessToken: response.data.access_token,
        socketConnectionToken,
        userId,
    };
}

async function addToken(
    accessToken: string,
    refreshToken: string,
    userId: number,
    type: string,
    socketConnectionToken: string,
) {
    return drizzleClient
        .insert(tokens)
        .values({
            accessToken: encrypt(accessToken),
            refreshToken: encrypt(refreshToken),
            type,
            socketConnectionToken: encrypt(socketConnectionToken),
            userId,
        })
        .run();
}

export async function setupCentrifuge(server: Server): Promise<Centrifuge> {
    const { accessToken, socketConnectionToken, userId } =
        await getSocketConnectionToken();

    console.log("starting centrifuge");
    const centrifuge = new Centrifuge(
        "wss://centrifugo.donationalerts.com/connection/websocket",
        {
            websocket: WebSocket,
            subscribeEndpoint:
                "https://www.donationalerts.com/api/v1/centrifuge/subscribe",
            subscribeHeaders: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
    );
    return configCentrifugo(socketConnectionToken, centrifuge, userId, server);
}

let isCentrifugoRunning = false;
export function getCentrifugoStatus(): boolean {
    return isCentrifugoRunning;
}

function configCentrifugo(
    socketConnectionToken: string,
    centrifuge: Centrifuge,
    userId: number,
    server: Server,
): Centrifuge {
    centrifuge.setToken(socketConnectionToken);

    centrifuge.on("connect", () => {
        console.log("Listening for donates from DA!");

        server.to("admin").emit("centrifuge started");
        isCentrifugoRunning = true;

        centrifuge.subscribe(`$alerts:donation_${userId}`, async (message) => {
            const text_message = message.data.message.replace(/^\n/, "");
            const entryData = {
                donorName: message.data.username,
                donateAmount: message.data.amount,
                currency: message.data.currency,
                donorText: text_message,
                artist: "",
                songName: "",
                queueNumber: 0,
            };
            if (
                message.data.message_type === "text" &&
                canParse(text_message)
            ) {
                const song = parseSong(text_message);
                entryData.artist = parseArtist(song);
                entryData.songName = parseSongName(song);
            }

            await addQueueEntry(entryData);
            server.to("admin").emit("invalidate");
        });
    });

    centrifuge.on("disconnect", () => {
        isCentrifugoRunning = false;
        server.to("admin").emit("centrifuge stopped");
        console.log("DA disconected!");
    });

    console.log("centrifuge started");
    return centrifuge;
}
