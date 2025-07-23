export enum EntranceType {
    Exterior = "exterior",
    Dungeon = "dungeon",
    Grotto = "grotto",
    Warp = "warp"
}

export type MappedEntrance = {
    name: string,
    type: EntranceType
}

export type MappedLocation = {
    name: string
    entrances: MappedEntrance[]
}

