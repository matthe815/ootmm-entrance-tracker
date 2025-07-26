import {existsSync, readFileSync, writeFileSync} from "fs";
import path from "node:path";

const connectionHistoryPath: string = path.resolve("connection_history.json")

class ConnectionHistory {
    public static Get(): string[] {
        if (!existsSync(connectionHistoryPath)) return []
        return JSON.parse(String(readFileSync(connectionHistoryPath)))
    }

    public static Add(host: string): void {
        const history: string[] = this.Get()
        if (history.includes(host)) return

        history.push(host)
        writeFileSync(connectionHistoryPath, JSON.stringify(history))
    }
}

export default ConnectionHistory
