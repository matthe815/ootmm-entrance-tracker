import {MappedEntrance} from "../types/LocationMapping";
import ConsoleInput from "../classes/ConsoleInput";
import Saves from "../classes/Saves";
import LocationNode from "../types/LocationNode";
import Locations from "../classes/Locations";
import Entrance from "../types/Entrance";
import EntranceLinks from "../classes/EntranceLinks";
import AreaCompleter from "./completers/AreaCompleter";
import CommandHandler from "../classes/CommandHandler";

export default function CommandLink(): void {
    const entranceMapper = (e: MappedEntrance, index: number): string => `(${index + 1}) ${ConsoleInput.location(e.name)}`

    if (!Saves.IsFileLoaded()) {
        ConsoleInput.Error('ERROR_SELECT_FILE')
        CommandHandler.Spawn()
        return
    }

    ConsoleInput.Log('INPUT_LINKAREA1')
    ConsoleInput.GetAreaInput(AreaCompleter).then((area: LocationNode): void => {
        ConsoleInput.Log('INPUT_LINKENTRANCE1')
        console.log(Locations.GetUnlinkedEntrances(area)?.map(entranceMapper).join("\n"))
        ConsoleInput.GetExitInput(area).then((exit: MappedEntrance): void => {
            ConsoleInput.Log('INPUT_LINKAREA2')
            ConsoleInput.GetAreaInput(AreaCompleter).then((connection: LocationNode): void => {
                ConsoleInput.Log('INPUT_LINKENTRANCE2')
                console.log(Locations.GetUnlinkedEntrances(connection)?.map(entranceMapper).join("\n"))
                ConsoleInput.GetExitInput(connection).then((connectionEntrance: MappedEntrance): void => {
                    const entrance: Entrance = { name: connectionEntrance.name, location: area }
                    const connector: Entrance = { name: exit.name, location: connection }
                    EntranceLinks.Add(entrance, connector)
                    CommandHandler.Spawn()
                })
            })
        })
    })
}
