import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto"
import SerializedLocation from "../types/SerializedLocation";
import LocationNode from "../types/LocationNode";
import Locations from "./Locations";
import Entrance from "../types/Entrance";
import {MappedLocation} from "../types/LocationMapping";
import ConsoleInput from "./ConsoleInput";
import {ConnectToServer, UpdateAll} from "../../utils/NetUtils";

const SAVE_DIRECTORY: string = path.resolve("saves")

type SerializedSave = {
    uuid: string
    spawn: string
    connection?: string
    locations: SerializedLocation[]
}

export class Save {
    public uuid: string
    public locations: LocationNode[]
    public spawn: LocationNode
    public connection?: string

    constructor(uuid: string, locations: LocationNode[]) {
        this.uuid = uuid
        this.locations = locations
        this.spawn = this.locations[0]
    }

    public Fill(save: SerializedSave): void {
        this.spawn = this.Get(save.spawn ?? 'Kokiri Forest') ?? this.locations[0]
        this.connection = save.connection
    }

    public Get(name: string): LocationNode | null {
        return this.locations.find((location: LocationNode): boolean => location.name.toLowerCase() === name.toLowerCase()) ?? null
    }

    public AddGroup(group: SerializedLocation[]): void {
        let location: SerializedLocation
        for (location of group) {
            const area: LocationNode | null = this.Get(location.name)
            if (!area) continue

            let entrance: { name: string, location: string }
            for (entrance of location.entrances) {
                const target: LocationNode | null = this.Get(entrance.location)
                if (!target) continue

                area.connections.push({ name: entrance.name, location: target })
            }
        }
    }

    public GetHash(): string {
        return crypto.createHash('md5')
            .update(JSON.stringify(this.Serialize()))
            .digest('hex')
    }

    public GetSpawn(): LocationNode {
        return this.spawn
    }

    public Serialize(): SerializedSave {
        return {
            uuid: this.uuid,
            spawn: this.GetSpawn().name,
            connection: this.connection,
            locations: this.locations.map((location: LocationNode): SerializedLocation => ({
                name: location.name,
                entrances: location.connections.map((entrance: Entrance) => ({ name: entrance.name, location: entrance.location.name }))
            }))
        }
    }
}

class Saves {
    public static current: Save | null = null

    public static IsFileLoaded(): boolean {
        return this.current !== null
    }

    public static AddMissingLocations(): void {
        let location: MappedLocation
        for (location of Locations.entrances) {
            if (Locations.GetDefault().find((l: LocationNode): boolean => l.name === location.name)) continue
            console.log(`Added missing location \`${ConsoleInput.location(location.name)}\` to local save.`)
            Locations.GetDefault().push({ name: location.name, connections: [] })
        }
    }

    public static Create(uuid?: string): string {
        if (!uuid) uuid = crypto.pseudoRandomBytes(3).toString('hex')
        this.current = new Save(uuid, Locations.GetDefault())

        Saves.Save()
        console.log(`Created new entrance randomizer game instance with UUID of ${uuid}.`)

        return uuid
    }

    public static Save(): void {
        if (!this.current) return

        if (!fs.existsSync(path.dirname(SAVE_DIRECTORY))) {
            fs.mkdirSync(path.dirname(SAVE_DIRECTORY), { recursive: true });
        }

        const save: SerializedSave = this.current.Serialize()
        fs.writeFileSync(path.resolve(SAVE_DIRECTORY, `${this.current.uuid}.json`), JSON.stringify(save))
        console.log('Tracker progress saved successfully.')
    }

    public static Load(uuid: string): Promise<void> {
        return new Promise((resolve, reject): void => {
            let filePath: string = path.resolve(SAVE_DIRECTORY, `${uuid}.json`)
            if (!fs.existsSync(filePath)) {
                reject()
                return
            }

            const parsedSave = JSON.parse(String(fs.readFileSync(filePath)))
            this.current = new Save(uuid, Locations.GetDefault())
            this.current.Fill(parsedSave)

            if (Array.isArray(parsedSave)) {
                this.current.AddGroup(parsedSave)
                console.log('Successfully converted v1 save to a valid v2 save - overwriting file.')
                Saves.Save()
                resolve()
            }

            this.current.AddGroup(parsedSave.locations)

            if (this.current.connection) {
                ConnectToServer(this.current.connection)
                    .then((): void => {
                        UpdateAll().then(() => resolve())
                    })
                    .catch(() => ConsoleInput.Error('ERROR_CONNECT'))

                return
            }

            resolve()
        })
    }

    public static GetAll(): string[] {
        return fs.readdirSync(path.resolve(SAVE_DIRECTORY))
    }
}

export default Saves
