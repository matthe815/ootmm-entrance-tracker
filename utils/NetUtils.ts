import { connect } from "node:net"
import Locations from "../src/classes/Locations";
import LocationNode from "../src/types/LocationNode";
import {Socket} from "net";
import SerializedLocation from "../src/types/SerializedLocation";
import Entrance from "../src/types/Entrance";
let serverConnection: Socket

let SERVER_HOST: string = 'localhost'

export function setHost(host: string): void {
    SERVER_HOST = host
}

export function getHost(): string {
    return SERVER_HOST
}

export function ConnectToServer() {
    serverConnection = connect(13234, getHost(), () => {
        console.log("Successfully connected to sync server.")
    })
    let dataBuffer = Buffer.alloc(0);
    serverConnection.on("data", (chunk): void => {
        const op: number = chunk[0]
        dataBuffer = Buffer.concat([dataBuffer, chunk]).subarray(1);

        switch (op) {
            case 1:
                let splitIndex: number = 1;
                while ((splitIndex = dataBuffer.indexOf(0x00)) !== -1) {
                    const chunk = dataBuffer.slice(0, splitIndex);
                    dataBuffer = dataBuffer.slice(splitIndex + 1);

                    if (chunk.length === 0) continue

                    try {
                        const { location } = deserializeLocation(chunk);

                        let savedLoc: LocationNode | undefined
                        if ((savedLoc = Locations.all.find((l: LocationNode): boolean => l.name === location.name))) {
                            let entrance: Entrance
                            for (entrance of location.entrances) {
                                if (savedLoc.connections.find((e: Entrance): boolean => e.name === entrance.name)) {
                                    continue
                                }
                                savedLoc.connections.push(entrance)
                                console.log(`🆕 Stored new entrance: ${location.name} (${entrance.name})`);
                            }
                        }
                    } catch (err) {
                        console.error('Failed to parse location:', err);
                    }
                }
                break
        }
    })
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

class NetSerializer {
    public static WriteLocation(location: SerializedLocation): unknown[] {
        const chunks: any[] = []
        const entrances: Entrance[] | { name: string, location: string }[] = location.entrances

        chunks.push(stringToBuffer(location.name))
        chunks.push(Uint8Array.from([entrances.length]))

        let entrance: { name: string, location: string }
        for (entrance of entrances) {
            chunks.push(stringToBuffer(entrance.name))
            chunks.push(stringToBuffer(entrance.location ?? entrance.location))
        }

        return chunks
    }

    public static WriteChunksToBuffer(op: number, chunks: any[]): Uint8Array<ArrayBuffer> {
        const totalLength = chunks.reduce((sum, arr) => sum + arr.length, 0) + 1
        const buffer: Uint8Array<ArrayBuffer> = new Uint8Array(totalLength)

        let offset: number = 1
        for (const chunk of chunks) {
            buffer.set(chunk, offset)
            offset += chunk.length
        }

        buffer.set(Uint8Array.from([op]), 0)
        return buffer
    }
}

export function SerializeLocationArray(locations: LocationNode[]): Uint8Array<ArrayBuffer> {
    const chunks: any[] = [];

    let location: LocationNode
    for (location of locations) {
        const serialized: unknown[] = NetSerializer.WriteLocation({
            name: location.name,
            entrances: location.connections.map((c) => ({ location: c.location.name, name: c.name }))
        })
        serialized.push(Uint8Array.from([0x00]))

        chunks.push(...serialized)
    }

    return NetSerializer.WriteChunksToBuffer(0x01, chunks)
}

export function UpdateGroup(nodes: LocationNode[]): void {
    if (!serverConnection) return
    const buffer: Uint8Array<ArrayBuffer> = Buffer.from(SerializeLocationArray(nodes))
    serverConnection.write(buffer)
}


export function UpdateAll(): void {
    if (!serverConnection) return
    const buffer: Uint8Array<ArrayBuffer> = Buffer.from(SerializeLocationArray(Locations.all))
    serverConnection.write(buffer)
}
