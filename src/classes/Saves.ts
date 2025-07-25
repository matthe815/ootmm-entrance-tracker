import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto"
import SerializedLocation from "../types/SerializedLocation";
import LocationNode from "../types/LocationNode";
import Locations from "./Locations";
import Entrance from "../types/Entrance";
import {MappedLocation} from "../types/LocationMapping";
import ConsoleInput from "./ConsoleInput";

const SAVE_LOCATION = path.resolve("saves", "save.json")

class Saves {
    public static GetSaveMD5(): string {
        return crypto.createHash('md5')
            .update(JSON.stringify(this.Serialize()))
            .digest('hex')
    }

    public static Serialize(): SerializedLocation[] {
        return Locations.all.map((location: LocationNode): SerializedLocation => ({
            name: location.name,
            entrances: location.connections.map((entrance: Entrance) => ({ name: entrance.name, location: entrance.location.name }))
        }))
    }

    public static Deserialize(save: SerializedLocation[]): void {
        Locations.all = save.map((location: SerializedLocation) => ({name: location.name, connections: []}))

        let location: SerializedLocation
        for (location of save) {
            const area: LocationNode | null = Locations.Find(location.name)
            if (!area) continue

            let entrance: { name: string, location: string }
            for (entrance of location.entrances) {
                const target: LocationNode | null = Locations.Find(entrance.location)
                if (!target) continue

                area.connections.push({ name: entrance.name, location: target })
            }
        }

        console.log('Successfully loaded previous save.')
    }

    public static Save(): void {
        if (!fs.existsSync(path.dirname(SAVE_LOCATION))) fs.mkdirSync(path.dirname(SAVE_LOCATION), { recursive: true });
        const save: SerializedLocation[] = Saves.Serialize()
        fs.writeFileSync(SAVE_LOCATION, JSON.stringify(save))
        console.log('Tracker progress saved successfully.')
    }

    public static AddMissingLocations(): void {
        let location: MappedLocation
        for (location of Locations.entrances) {
            if (Locations.all.find((l: LocationNode): boolean => l.name === location.name)) continue
            console.log(`Added missing location \`${ConsoleInput.location(location.name)}\` to local save.`)
            Locations.all.push({ name: location.name, connections: [] })
        }
    }

    public static Load(): void {
        if (!fs.existsSync(SAVE_LOCATION)) Locations.LoadDefault()
        else Saves.Deserialize(JSON.parse(String(fs.readFileSync(SAVE_LOCATION))))
        Saves.AddMissingLocations()

        Locations.spawn = Locations.all[0]
    }
}

export default Saves
