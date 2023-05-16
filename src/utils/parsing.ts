const regex = /(^.+)(?=;)|(^.+\s-\s.+$)|(^.+)(?=\n)|(^.+)(?=\r)/;

export function canParse(message: string): boolean {
    return regex.test(message);
}

export function parseSong(message: string): string {
    const result = message.match(regex)?.[0];
    return result ?? "";
}

export function parseArtist(song: string): string {
    return trimSpaces(song.match(/^.+?(?= -)/)?.[0]);
}

export function parseSongName(song: string): string {
    return trimSpaces(song.match(/(?<=- ).+$/)?.[0]);
}

export function trimSpaces(string?: string): string {
    return string
        ? string.replace(/^\s+/, "").replace(/\s+$/, "").replace(/\s+/g, " ")
        : "";
}
