import {Server, Socket} from "net";
import {deserializeLocation, UpdateAll} from "./NetUtils";
import fs, {writeFileSync} from "fs";
import path from "node:path";
const net = require('net');

const SAVE_LOCATION: string = path.resolve('server', 'saves')

export function getSave(uuid: string): any {
    if (!fs.existsSync(SAVE_LOCATION)) fs.mkdirSync(SAVE_LOCATION)
    if (!fs.existsSync(path.resolve(SAVE_LOCATION, uuid))) return []
    return JSON.parse(String(fs.readFileSync(path.resolve(SAVE_LOCATION, `${uuid}.json`))))
}

const server: Server = net.createServer((socket: Socket) => {
    let dataBuffer: Buffer = Buffer.alloc(0);
    socket.on('data', (chunk) => {
        console.log(chunk)
        const op: number = chunk[0]
        const uuid: string = String(chunk[1]) + String(chunk[2]) + String(chunk[3])
        const save = getSave(uuid)
        console.log(uuid)
        dataBuffer = Buffer.concat([dataBuffer, chunk]).subarray(4);

        switch (op) {
            case 1:
                let splitIndex: number = 5;
                while ((splitIndex = dataBuffer.indexOf(0x00)) !== -1) {
                    const chunk: Buffer = dataBuffer.slice(0, splitIndex);
                    dataBuffer = dataBuffer.slice(splitIndex + 1);

                    if (chunk.length === 0) continue

                    try {
                        const { location } = deserializeLocation(chunk);

                        let savedLoc: { name: string, entrances: { name: string, location: string }[] }
                        if ((savedLoc = save.find((l: any): boolean => l.name === location.name))) {
                            let entrance: { name: string, location: string }
                            for (entrance of location.entrances) {
                                if (savedLoc.entrances.find((e: { location: string, name: string }): boolean => e.name === entrance.name)) {
                                    console.log(`🔁 Ignored duplicate entrance: ${location.name} (${entrance.name})`);
                                    continue
                                }
                                savedLoc.entrances.push(entrance)
                                console.log(`🆕 Stored new entrance: ${location.name} (${entrance.name})`);
                            }
                            console.log(`🔁 Ignored duplicate location: ${location.name}`);
                            continue;
                        }

                        save.push(location);
                        console.log(`🆕 Stored new location: ${location.name}`);
                    } catch (err) {
                        console.error('Failed to parse location:', err);
                    }
                }

                writeFileSync(path.resolve(SAVE_LOCATION, `${uuid}.json`), JSON.stringify(save))
                break
            case 2:
                console.log('Sending save update by request of client')
                UpdateAll(socket, uuid)
                break
        }
    });

    socket.on('end', () => {
        console.log('Client disconnected');
    });

    socket.on('error', (err: unknown) => {
        console.error('Socket error:', err);
    });
});

const PORT: number = 13234;
server.listen(PORT, (): void => {
    console.log(`TCP server listening on port ${PORT}`);
});
