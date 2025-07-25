import {Socket} from "net";
import {serverSave} from "./app";
import {clearInterval} from "timers";
import LocationNode from "../src/types/LocationNode";

function readString(buf: Buffer, offset: number) {
    const length: number = buf[offset];
    const strBytes = buf.slice(offset + 1, offset + 1 + length);
    const str: string = new TextDecoder().decode(strBytes);
    return { str, bytesUsed: 1 + length };
}

class NetSerializer {
    public static WriteLocation(location: any): unknown[] {
        const chunks: any[] = []
        const entrances: any[] = location.entrances

        chunks.push(stringToBuffer(location.name))
        chunks.push(Uint8Array.from([entrances.length]))

        let entrance: { name: string, location: string }
        for (entrance of entrances) {
            chunks.push(stringToBuffer(entrance.name))
            chunks.push(stringToBuffer(entrance.location))
        }

        return chunks
    }

    public static WriteChunksToBuffer(op: number, chunks: any[]): Uint8Array {
        const totalLength = chunks.reduce((sum, arr) => sum + arr.length, 0) + 1
        const buffer: Uint8Array = new Uint8Array(totalLength)

        let offset: number = 1
        for (const chunk of chunks) {
            buffer.set(chunk, offset)
            offset += chunk.length
        }

        buffer.set(Uint8Array.from([op]), 0)
        return buffer
    }
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

export function SerializeLocationArray(locations: any): Uint8Array {
    const chunks: any[] = [];

    let location: any
    for (location of locations) {
        const serialized: unknown[] = NetSerializer.WriteLocation({
            name: location.name,
            entrances: location.entrances.map((c: any) => ({ location: c.location, name: c.name }))
        })
        serialized.push(Uint8Array.from([0x00]))

        chunks.push(...serialized)
    }

    return NetSerializer.WriteChunksToBuffer(0x01, chunks)
}

export function UpdateGroup(nodes: LocationNode[], socket: Socket): void {
    const buffer: Uint8Array = Buffer.from(SerializeLocationArray(nodes))
    socket.write(buffer)
}

function ProcessSendQueue(queue: any[][], socket: Socket) {
    let interval: NodeJS.Timeout
    queue = queue.reverse()
    interval = setInterval(() => {
        if (queue.length === 0) clearInterval(interval)

        let packet = queue.pop()
        if (!packet) return

        UpdateGroup(packet, socket)
    }, 1000)
}


export function UpdateAll(socket: Socket): void {
    let sendQueue: any[][] = []
    let locationQueue: LocationNode[] = []

    let location: LocationNode
    for (location of serverSave) {
        locationQueue.push(location)
        if (locationQueue.length >= 8) {
            sendQueue.push([...locationQueue])
            locationQueue = []
        }
    }
    sendQueue.push([...locationQueue])
    ProcessSendQueue(sendQueue, socket)
}
