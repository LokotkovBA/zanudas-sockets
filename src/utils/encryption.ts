import { env } from "../env.ts";
import CryptoJS from "crypto-js";

const iv = CryptoJS.SHA256(env.SOCKET_SECRET);
const key = CryptoJS.SHA256(env.SOCKET_KEY);

export function decrypt(msg: string) {
    return CryptoJS.AES.decrypt(msg, key, { iv }).toString(CryptoJS.enc.Utf8);
}
