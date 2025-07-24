import { connect } from "node:net"
import Locations from "../src/classes/Locations";
import LocationNode from "../src/types/LocationNode";
import {Socket} from "net";
let serverConnection: Socket

export function ConnectToServer() {
    serverConnection = connect(13234, "localhost", () => {
        console.log("Successfully connected to sync server.")
    })
    let dataBuffer = Buffer.alloc(0);
    serverConnection.on("data", (chunk): void => {
        console.log('Got data')
        dataBuffer = Buffer.concat([dataBuffer, chunk]);
        const newLocations = []

        let splitIndex;
        while ((splitIndex = dataBuffer.indexOf(0x00)) !== -1) {
            const chunk = dataBuffer.slice(0, splitIndex);
            dataBuffer = dataBuffer.slice(splitIndex + 1);

            if (chunk.length === 0) continue

            try {
                const { location } = deserializeLocation(chunk);
                newLocations.push(location);
            } catch (err) {
                console.error('Failed to parse location:', err);
            }
        }

        console.log(Locations.all)
    })
}

function SendEntrance() {

}

function stringToBuffer(str: string) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    if (bytes.length > 255) throw new Error("String too long for UInt8 length");
    return Uint8Array.from([bytes.length, ...bytes]);
}

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

function serializeLocationArray(locations: LocationNode[]) {
    const chunks = [];

    for (const loc of locations) {
        const locChunks = [];

        locChunks.push(stringToBuffer(loc.name)); // Location name
        locChunks.push(Uint8Array.from([loc.connections.length])); // Number of entrances

        for (const ent of loc.connections) {
            locChunks.push(stringToBuffer(ent.name));     // Entrance name
            locChunks.push(stringToBuffer(ent.location.name)); // Entrance location
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

export function UpdateAll(): void {
    if (!serverConnection) return
    const buffer = new Buffer(serializeLocationArray(Locations.all))
    serverConnection.write(buffer)
}
