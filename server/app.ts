import {Server, Socket} from "net";
import {deserializeLocation, UpdateAll} from "./NetUtils";
import {existsSync, readFileSync, writeFileSync} from "fs";
import path from "node:path";
const net = require('net');
export let serverSave: any[] = []

const server: Server = net.createServer((socket: Socket) => {
    let dataBuffer = Buffer.alloc(0);
    socket.on('data', (chunk) => {
        dataBuffer = Buffer.concat([dataBuffer, chunk]);

        let splitIndex;
        while ((splitIndex = dataBuffer.indexOf(0x00)) !== -1) {
            const chunk = dataBuffer.slice(0, splitIndex);
            dataBuffer = dataBuffer.slice(splitIndex + 1);

            if (chunk.length === 0) continue

            try {
                const { location } = deserializeLocation(chunk);
                if (serverSave.find(l => l.name === location.name)) {
                    console.log(`🔁 Ignored duplicate location: ${location.name}`);
                    continue;
                }

                serverSave.push(location);
                console.log(`🆕 Stored new location: ${location.name}`);
            } catch (err) {
                console.error('Failed to parse location:', err);
            }
        }

        console.log("Sending update back to client")
        writeFileSync(path.resolve("save.json"), JSON.stringify(serverSave))
        UpdateAll(socket)
    });

    socket.on('end', () => {
        console.log('Client disconnected');
    });

    socket.on('error', (err: unknown) => {
        console.error('Socket error:', err);
    });
});

const PORT = 13234;
if (existsSync(path.resolve("save.json"))) serverSave = JSON.parse(String(readFileSync(path.resolve("save.json"))))
server.listen(PORT, () => {
    console.log(`TCP server listening on port ${PORT}`);
});
