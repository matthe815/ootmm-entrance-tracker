import Saves from "../classes/Saves";
import ConsoleInput from "../classes/ConsoleInput";
import LocationNode from "../types/LocationNode";
import PathStep from "../types/PathStep";
import AreaCompleter from "./completers/AreaCompleter";
import Entrance from "../types/Entrance";
import {MappedEntrance} from "../types/LocationMapping";
import Locations from "../classes/Locations";
import CommandHandler from "../classes/CommandHandler";

export default function CommandPath(): void {
    if (!Saves.IsFileLoaded()) {
        ConsoleInput.Error('ERROR_SELECT_FILE')
        CommandHandler.Spawn()
        return
    }

    ConsoleInput.Log('INPUT_PATHAREA')
    ConsoleInput.GetAreaInput(AreaCompleter).then((input: LocationNode): void => {
        ConsoleInput.Log('INPUT_PATHAREA2', [ConsoleInput.command('spawn'), ConsoleInput.location('Kokiri Forest')])
        const area: LocationNode = input as LocationNode
        ConsoleInput.GetAreaInput(AreaCompleter).then((input: LocationNode): void => {
            const current: LocationNode = input as LocationNode
            let path = FindPathToTarget(current, area)
            if (path) {
                ConsoleInput.Log('SUCCESS_PATH', [ConsoleInput.location(area.name)])
                console.log(path.map((n: PathStep): string => `${ConsoleInput.location(n.location.name)} ${n.via ? `(${n.via})` : ''}`).join(' => '))
            } else {
                ConsoleInput.Error('ERROR_PATH', [ConsoleInput.location(current.name), ConsoleInput.location(area.name)])
            }
            CommandHandler.Spawn()
        })
    })
}

function FindPathToTarget(start: LocationNode, target: LocationNode): PathStep[] | null {
    const queue: { node: LocationNode; path: PathStep[] }[] = [];
    const visited: Set<LocationNode> = new Set<LocationNode>();

    queue.push({node: start, path: [{location: start}]});

    while (queue.length > 0) {
        const {node, path} = queue.shift()!
        if (visited.has(node)) continue

        visited.add(node)

        if (node === target) {
            return path
        }

        let entrance: Entrance
        for (entrance of node.connections) {
            const mapped: MappedEntrance | null = Locations.FindEntrance(node, entrance.name);
            if (!mapped || mapped.type === "none") continue

            const nextPath: PathStep[] = [...path]

            nextPath[nextPath.length - 1] = {
                ...nextPath[nextPath.length - 1],
                via: entrance.name
            }

            nextPath.push({ location: entrance.location })
            queue.push({ node: entrance.location, path: nextPath })
        }
    }
    return null;
}
