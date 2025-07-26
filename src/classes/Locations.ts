import LocationNode from "../types/LocationNode";
import {MappedEntrance, MappedLocation} from "../types/LocationMapping";
import fs from "fs";
import Entrance from "../types/Entrance";
import Entrances from "../../entrances.json";

class Locations {
    public static entrances: MappedLocation[] = this.LoadEntrances()

    private static LoadEntrances(): MappedLocation[] {
        if (fs.existsSync("entrances.json")) return JSON.parse(String(fs.readFileSync("entrances.json"))) as MappedLocation[]
        return Entrances as MappedLocation[]
    }

    public static GetDefault(): LocationNode[] {
        return this.entrances.map((location: MappedLocation): LocationNode => ({ name: location.name, connections: [] }))
    }

    public static Find(name: string): LocationNode | null {
        return this.GetDefault().find((location: LocationNode): boolean => location.name.toLowerCase() === name.toLowerCase()) ?? null
    }

    public static FindStrict(name: string): LocationNode | null {
        return this.GetDefault().find((location: LocationNode): boolean => location.name === name) ?? null
    }

    public static GetEntrances(location: LocationNode): MappedEntrance[] | null {
        const mapped: MappedLocation | null = this.entrances.find((e: MappedLocation): boolean => e.name === location.name) ?? null
        return mapped?.entrances ?? null
    }

    public static IsLinked(location: LocationNode, entrance: MappedEntrance): boolean {
        return location.connections.find((c: Entrance): boolean => c.name === entrance.name) !== undefined
    }

    public static GetUnlinkedEntrances(location: LocationNode): MappedEntrance[] | null {
        const mapped: MappedLocation | null = this.entrances.find((e: MappedLocation): boolean => e.name === location.name) ?? null
        if (!mapped?.entrances) return null

        return mapped.entrances.filter((entrance: MappedEntrance) => !Locations.IsLinked(location, entrance))
    }

    public static FindEntranceByIndex(location: LocationNode, index: number): MappedEntrance | null {
        const unlinked = this.GetUnlinkedEntrances(location)
        if (!unlinked) return null

        return unlinked[index] ?? null
    }

    public static FindEntrance(location: LocationNode, name: string): MappedEntrance | null {
        const mapped: MappedLocation | null = this.entrances.find((e: MappedLocation): boolean => e.name === location.name) ?? null
        if (!mapped) return null

        return mapped.entrances.find((e: MappedEntrance): boolean => e.name.toLowerCase() === name.toLowerCase() || e.name.startsWith(name)) ?? null
    }

    public static FindEntranceStrict(location: LocationNode, name: string): MappedEntrance | null {
        const mapped: MappedLocation | null = this.entrances.find((e: MappedLocation): boolean => e.name === location.name) ?? null
        if (!mapped) return null

        return mapped.entrances.find((e: MappedEntrance): boolean => e.name === name) ?? null
    }
}

export default Locations
