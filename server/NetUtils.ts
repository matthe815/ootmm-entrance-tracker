import {Socket} from "net";
import {serverSave} from "./app";
import path from "node:path";

function readString(buf: Buffer, offset: number) {
    const length: number = buf[offset];
    const strBytes = buf.slice(offset + 1, offset + 1 + length);
    const str: string = new TextDecoder().decode(strBytes);
    return { str, bytesUsed: 1 + length };
}

export function deserializeLocation(buffer: Buffer) {
    let offset = 0;
    const { str: locationName, bytesUsed: locBytes } = readString(buffer, offset);
    offset += locBytes;

    const numEntrances: number = buffer[offset++];
    const entrances: any[] = [];

    for (let i = 0; i < numEntrances; i++) {
        const { str: name, bytesUsed: nameBytes } = readString(buffer, offset);
        offset += nameBytes;
        const { str: location, bytesUsed: locBytes } = readString(buffer, offset);
        offset += locBytes;

        entrances.push({ name, location });
    }

    return {
        location: {
            name: locationName,
            entrances,
        },
        bytesUsed: offset,
    };
}


function stringToBuffer(str: string) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    if (bytes.length > 255) throw new Error("String too long for UInt8 length");
    return Uint8Array.from([bytes.length, ...bytes]);
}

function serializeLocationArray(locations: any[]) {
    const chunks = [];

    for (const loc of locations) {
        const locChunks = [];

        locChunks.push(stringToBuffer(loc.name)); // Location name
        locChunks.push(Uint8Array.from([loc.entrances.length])); // Number of entrances

        for (const ent of loc.entrances) {
            locChunks.push(stringToBuffer(ent.name));     // Entrance name
            locChunks.push(stringToBuffer(ent.location)); // Entrance location
        }

        locChunks.push(Uint8Array.from([0x00]));
        chunks.push(...locChunks);
    }

    // Concatenate all chunks into a single buffer
    const totalLength = chunks.reduce((sum, arr) => sum + arr.length, 0);
    const buffer = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
        buffer.set(chunk, offset);
        offset += chunk.length;
    }

    return buffer;
}

export function UpdateAll(socket: Socket): void {
    const buffer = new Buffer(serializeLocationArray(serverSave))
    socket.write(buffer)
}
