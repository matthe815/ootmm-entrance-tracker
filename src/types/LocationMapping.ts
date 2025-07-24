export enum EntranceType {
    Exterior = "exterior",
    Dungeon = "dungeon",
    Grotto = "grotto",
    Warp = "warp",
    None = "none"
}

export type MappedEntrance = {
    name: string,
    type: EntranceType
}

export type MappedLocation = {
    name: string
    entrances: MappedEntrance[]
}

