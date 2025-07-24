import {Interface} from "readline";
import Locations from "./src/classes/Locations";
import LocationNode from "./src/types/LocationNode";
import Entrance from "./src/types/Entrance";
import PathStep from "./src/types/PathStep";
import {MappedEntrance} from "./src/types/LocationMapping";
import EntranceLinks from "./src/classes/EntranceLinks";
import Saves from "./src/classes/Saves";
import ConsoleInput from "./src/classes/ConsoleInput";
import {ConnectToServer, getHost, setHost, UpdateAll} from "./utils/NetUtils";

const readline = require('readline');
let commandLine: Interface

function CreateCommandLine(): void {
    commandLine = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: '> '
    });

    console.log('Type "help" to see available commands.');
    commandLine.prompt();
    commandLine.once('line', (line: string) => {
        commandLine.close()
        handleCommand(line);
    })
}

function FindPathToTarget(current: LocationNode, target: LocationNode, visited: Set<LocationNode> = new Set<LocationNode>(), path: PathStep[] = []): PathStep[] | null {
    if (visited.has(current)) return null;

    visited.add(current);
    path.push({ location: current });

    if (current === target) {
        return [...path];
    }

    let entrance: Entrance
    for (entrance of current.connections) {
        path[path.length - 1].via = entrance.name;
        const result = FindPathToTarget(entrance.location, target, visited, path);
        if (result) return result;
    }

    path.pop();
    return null;
}

function handleLink(): void {
    console.log('Enter the initial area name.')
    ConsoleInput.GetAreaInput().then((area: LocationNode): void => {
        console.log('Which exit must be taken?')
        console.log(Locations.GetUnlinkedEntrances(area)?.map((e: MappedEntrance, index: number): string => `(${index + 1}) ${e.name}`)?.join("\n"))
        ConsoleInput.GetExitInput(area).then((exit: MappedEntrance): void => {
            console.log(`Enter the connected location.`);
            ConsoleInput.GetAreaInput().then((connection: LocationNode): void => {
                console.log('Enter the entrance connected to:')
                console.log(Locations.GetUnlinkedEntrances(connection)?.map((e: MappedEntrance, index: number): string => `(${index + 1}) ${e.name}`)?.join("\n"))
                ConsoleInput.GetExitInput(connection).then((connectionEntrance: MappedEntrance) => {
                    const entrance: Entrance = { name: connectionEntrance.name, location: area }
                    const connector: Entrance = { name: exit.name, location: connection }
                    EntranceLinks.Add(entrance, connector)
                    CreateCommandLine()
                })
            })
        })
    })
}

function handlePath(): void {
    console.log('Enter the name of the area for which you want a route to.')
    ConsoleInput.GetAreaInput().then((input: LocationNode): void => {
        console.log('Choose the location to path from. Type \'spawn\' for Kokiri Forest')
        const area: LocationNode = input as LocationNode
        ConsoleInput.GetAreaInput().then((input: LocationNode): void => {
            const current: LocationNode = input as LocationNode
            let path = FindPathToTarget(current, area)
            if (path) {
                console.log(`Found path to ${area.name}`)
                console.log(path.map((n: PathStep): string => `${n.location.name} ${n.via ? `(${n.via})` : ''}`).join(' => '))
            } else {
                console.log(`Could not find path to ${current.name} from ${area.name}`)
            }
            CreateCommandLine()
        })
    })
}

function handleList(): void {
    let location: LocationNode
    for (location of Locations.all) {
        if (location.connections.length === 0) continue

        console.log(`${location.name}`)
        console.log(` - ${location.connections.map((c: Entrance): string => `${c.location.name} (${c.name})`).join("\n - ")}`)
    }
    CreateCommandLine()
}

function handleConnect(): void {
    console.log('Input the IP address to connect to. Type nothing for localhost')
    ConsoleInput.GetTextInput().then((input: string): void => {
        if (input == '') setHost('localhost')
        else setHost(input)

        console.log(`Server host set to ${getHost()}:13234.`)
        ConnectToServer()
    })
}

function handleCommand(line: string) {
    const command: string = line
    commandLine.close()

    switch (command.toLowerCase()) {
        case 'help':
            console.log('(link) - Add a new connection between two entrances')
            console.log('(path) - View the route from one entrance to another')
            console.log('(list) - List the current connections')
            CreateCommandLine()
            break
        case 'link':
            handleLink()
            break
        case 'path':
            handlePath()
            break
        case 'list':
            handleList()
            break
        case 'connect':
            handleConnect()
            CreateCommandLine()
            break
        case 'update':
            UpdateAll()
            CreateCommandLine()
            break
        case 'exit':
        case 'quit':
            commandLine.close();
            return
        default:
            console.log(`Unknown command: ${command}`)
            CreateCommandLine()
    }
}

Saves.Load()
CreateCommandLine()
