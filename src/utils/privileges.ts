export function isMaster(privileges?: number): boolean {
    return privileges && privileges !== -1 ? (privileges & 1024) !== 0 : false;
}

export function isAdmin(privileges?: number): boolean {
    return privileges && privileges !== -1 ? (privileges & 1536) !== 0 : false;
}

export function isMod(privileges?: number): boolean {
    return privileges && privileges !== -1 ? (privileges & 1792) !== 0 : false;
}

export function excludeStuff(privileges?: number): number {
    return privileges && privileges !== -1 ? privileges & 1279 : 0;
}
