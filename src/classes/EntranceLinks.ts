import Entrance from "../types/Entrance";
import Saves from "./Saves";
import {UpdateGroup} from "../../utils/NetUtils";

class EntranceLinks {
    public static Add(entrance: Entrance, exit: Entrance) {
        entrance.location.connections.push(exit)
        exit.location.connections.push(entrance)

        UpdateGroup([ entrance.location, exit.location ])

        console.log(`🆕 Linked ${exit.location.name} to ${entrance.location.name}`)
        Saves.Save()
    }

    public static Remove(entrance: Entrance, exit: Entrance) {
        const entrances: Entrance[] = entrance.location.connections
        const exits: Entrance[] = exit.location.connections
        entrances.splice(entrances.indexOf(exit))
        exits.splice(exits.indexOf(entrance))

        console.log(`Unlinked ${entrance.location.name} from ${exit.location.name}`)
        Saves.Save()
    }
}

export default EntranceLinks
