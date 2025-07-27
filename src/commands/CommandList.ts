import Saves from "../classes/Saves";
import ConsoleInput from "../classes/ConsoleInput";
import LocationNode from "../types/LocationNode";
import Entrance from "../types/Entrance";

export default function CommandList(): void {
    if (!Saves.current || !Saves.IsFileLoaded()) {
        ConsoleInput.Error('ERROR_SELECT_FILE')
        ConsoleInput.StartCommandLine()
        return
    }

    let location: LocationNode
    for (location of Saves.current.locations) {
        if (location.connections.length === 0) continue

        console.log(`${location.name}`)
        console.log(` - ${location.connections.map((c: Entrance): string => `${c.location.name} (${c.name})`).join("\n - ")}`)
    }
    ConsoleInput.StartCommandLine()
}
