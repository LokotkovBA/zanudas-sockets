import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
import * as dotenv from "dotenv";

dotenv.config();

export const env = createEnv({
    /*
     * Specify what prefix the client-side variables must have.
     * This is enforced both on type-level and at runtime.
     */
    clientPrefix: "PUBLIC_",
    server: {
        CERT_PATH: z.string().min(1),
        KEY_PATH: z.string().min(1),
        APP_URLS: z.string().min(1),
        SOCKET_PORT: z.string(),
        SOCKET_SECRET: z.string().min(1),
        SOCKET_KEY: z.string().min(1),
        DATABASE_URL: z.string().url(),
        DATABASE_AUTH_TOKEN: z.string().min(1),
        LIKE_DELAY_CONSTANT: z.string().min(1),
        DA_CLIENT_ID: z.string().min(1),
        DA_CLIENT_SECRET: z.string().min(1),
        MAIN_URL: z.string().url(),
    },
    client: {},
    /**
     * What object holds the environment variables at runtime.
     * Often `process.env` or `import.meta.env`
     */
    runtimeEnv: process.env,
});
