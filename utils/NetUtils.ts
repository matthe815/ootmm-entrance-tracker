import {connect} from "node:net"
import Locations from "../src/classes/Locations";
import LocationNode from "../src/types/LocationNode";
import {Socket} from "net";
import SerializedLocation from "../src/types/SerializedLocation";
import Entrance from "../src/types/Entrance";
import {TextEncoder} from "util";
import chalk from "chalk";
import Saves from "../src/classes/Saves";
import {clearTimeout} from "timers";
import ConnectionHistory from "../src/classes/ConnectionHistory";

let serverConnection: Socket

export function ParseConnectionPlaceholders(host: string): string {
    if (host === '') return 'localhost'
    return host
}

function HandleServerPacket(chunk: Buffer): void {
    if (!Saves.current) return

    const op: number = chunk[0]
    let dataBuffer: Buffer = Buffer.alloc(0);
    dataBuffer = Buffer.concat([dataBuffer, chunk]).subarray(1);

    switch (op) {
        case 1:
            let updated: boolean = false
            let splitIndex: number = 1;
            while ((splitIndex = dataBuffer.indexOf(0x00)) !== -1) {
                const chunk: Buffer = dataBuffer.slice(0, splitIndex);
                dataBuffer = dataBuffer.slice(splitIndex + 1);

                if (chunk.length === 0) continue

                try {
                    const { location } = deserializeLocation(chunk);

                    let savedLoc: LocationNode | undefined
                    if ((savedLoc = Saves.current.locations.find((l: LocationNode): boolean => l.name === location.name))) {
                        let entrance: { name: string, location: string }
                        for (entrance of location.entrances) {
                            if (entrance.name === '') continue
                            if (savedLoc.connections.find((e: Entrance): boolean => e.name === entrance.name)) {
                                continue
                            }

                            const linkedLocation: LocationNode | null = Locations.Find(entrance.location)
                            if (!linkedLocation) continue

                            updated = true
                            savedLoc.connections.push({
                                name: entrance.name,
                                location: linkedLocation
                            })
                            console.log(`🆕 Stored new entrance: ${location.name} (${entrance.name})`);
                        }
                    }
                } catch (err) {
                    console.error('Failed to parse location:', err);
                }
            }
            if (updated) Saves.Save()
            serverConnection.write(Uint8Array.from([0x3]))
            break
    }
}

export function IsConnectedToServer(): boolean {
    return serverConnection?.readyState === 'open'
}

export function DisconnectFromServer(): void {
    if (!IsConnectedToServer()) return
    serverConnection.end()
    serverConnection.destroy()
}

export function ConnectToServer(host: string): Promise<void> {
    return new Promise((resolve, reject): void => {
        serverConnection = connect(13234, host, (): void  => {
            console.log("Successfully connected to sync server.")
            ConnectionHistory.Add(host)
            serverConnection.on("data", HandleServerPacket)
            resolve()
        }).on('error', reject)
    })

}

function stringToBuffer(str: string) {
    const encoder: TextEncoder = new TextEncoder();
    const bytes: Uint8Array = encoder.encode(str);
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

    public static WriteChunksToBuffer(op: number, chunks: any[]): Uint8Array {
        if (!Saves.current) return new Uint8Array(0)
        const totalLength = chunks.reduce((sum, arr) => sum + arr.length, 0) + 4
        const buffer: Uint8Array = new Uint8Array(totalLength)

        let offset: number = 4
        for (const chunk of chunks) {
            buffer.set(chunk, offset)
            offset += chunk.length
        }

        buffer.set(Uint8Array.from([op, ...SerializeStringToHex(Saves.current.uuid)]), 0)
        return buffer
    }
}

export function SerializeLocationArray(locations: LocationNode[]): Uint8Array {
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

export function SerializeStringToHex(hexString: string): Uint8Array {
    const array: Uint8Array = new Uint8Array(hexString.length / 2);

    let i: number
    for (i = 0; i < hexString.length; i += 2) {
        array[i / 2] = parseInt(hexString.substr(i, 2), 16);
    }

    return array;
}

export function RequestUpdate(): void {
    if (!Saves.current) return
    const buffer: Buffer = Buffer.from(Uint8Array.from([0x02, ...SerializeStringToHex(Saves.current.uuid)]))
    serverConnection.write(buffer)
}

export function UpdateGroup(nodes: LocationNode[]): Promise<void> {
    return new Promise((resolve, reject): void => {
        if (!IsConnectedToServer()) {
            reject('You are not currently connected to a sync server.')
            return
        }

        SendPacket(Buffer.from(SerializeLocationArray(nodes)))
            .then(() => resolve())
            .catch((e) => console.error(chalk.red(e)))
    })
}

function SendPacket(packet: Buffer): Promise<void> {
    return new Promise((resolve, reject): void => {
        serverConnection.write(packet)

        let timeout: NodeJS.Timeout

        const handleAck = (chunk: Buffer): void => {
            clearTimeout(timeout)
            const op: number = chunk[0]
            if (op !== 3) {
                reject()
                return
            }
            resolve()
        }

        const autoTimeout = (): void => {
            serverConnection.off("data", handleAck)
            reject()
        }

        timeout = setTimeout(autoTimeout, 3000)
        serverConnection.once("data", handleAck)
    })
}

async function SendQueue(queue: any[][]): Promise<void> {
    let packet: any[]
    for (packet of queue) {
        await UpdateGroup(packet)
    }
}


export function UpdateAll(): Promise<void> {
    return new Promise((resolve, reject): void => {
        if (!Saves.current || !IsConnectedToServer()) {
            reject('You are not currently connected to a sync server.')
            return
        }

        let sendQueue: any[][] = []
        let locationQueue: LocationNode[] = []

        let location: LocationNode
        for (location of Saves.current.locations) {
            locationQueue.push(location)
            if (locationQueue.length >= 8) {
                sendQueue.push([...locationQueue])
                locationQueue = []
            }
        }
        sendQueue.push([...locationQueue])

        SendQueue(sendQueue)
            .then((): void => resolve())
            .catch((e) => reject(e))
    })
}
