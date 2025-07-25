import {Interface} from "readline";
import Locations from "./src/classes/Locations";
import LocationNode from "./src/types/LocationNode";
import Entrance from "./src/types/Entrance";
import PathStep from "./src/types/PathStep";
import {MappedEntrance} from "./src/types/LocationMapping";
import EntranceLinks from "./src/classes/EntranceLinks";
import Saves from "./src/classes/Saves";
import ConsoleInput from "./src/classes/ConsoleInput";
import {ConnectToServer, GetConnectionHistory, ParseConnectionPlaceholders, UpdateAll} from "./utils/NetUtils";
import fs from "fs";

const readline = require('readline');
let commandLine: Interface

function CreateCommandLine(): void {
    commandLine = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: '> ',
        completer: (line: string): [string[], string] => {
            const completions: string[] = ['help','path','list','resume','update','connect','link']
            const hits: string[] = completions.filter((completion: string) => completion.startsWith(line))

            return [hits.length > 0 ? hits : completions, line]
        }
    });

    console.log(`Type \`${ConsoleInput.command('help')}\` to see available commands.`);
    commandLine.prompt();
    commandLine.once('line', (line: string) => {
        commandLine.close()
        handleCommand(line);
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

function handleLink(): void {
    console.log('Enter the initial area name.')
    ConsoleInput.GetAreaInput(areaAutoCompleter).then((area: LocationNode): void => {
        console.log('Which exit must be taken?')
        console.log(Locations.GetUnlinkedEntrances(area)?.map((e: MappedEntrance, index: number): string => `(${index + 1}) ${e.name}`)?.join("\n"))
        ConsoleInput.GetExitInput(area).then((exit: MappedEntrance): void => {
            console.log(`Enter the connected location.`);
            ConsoleInput.GetAreaInput(areaAutoCompleter).then((connection: LocationNode): void => {
                console.log('Where does this exit lead to?')
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
    ConsoleInput.GetAreaInput(areaAutoCompleter).then((input: LocationNode): void => {
        console.log(`Choose the location to path from. Enter \`${ConsoleInput.command('spawn')}\` for ${ConsoleInput.location('Kokiri Forest')}`)
        const area: LocationNode = input as LocationNode
        ConsoleInput.GetAreaInput(areaAutoCompleter).then((input: LocationNode): void => {
            const current: LocationNode = input as LocationNode
            let path = FindPathToTarget(current, area)
            if (path) {
                console.log(`Found path to ${ConsoleInput.location(area.name)}`)
                console.log(path.map((n: PathStep): string => `${ConsoleInput.location(n.location.name)} ${n.via ? `(${n.via})` : ''}`).join(' => '))
            } else {
                console.log(`Could not find path to ${ConsoleInput.location(current.name)} from ${ConsoleInput.location(area.name)}`)
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

function areaAutoCompleter(line: string): [string[], string] {
    const hits: string[] = Locations.all.filter((location: LocationNode) => location.name.startsWith(line)).map((location: LocationNode) => location.name)
    return [hits.length > 0 ? hits : [], line]
}

function connectAutoCompleter(line: string): [string[], string] {
    const history: string[] = GetConnectionHistory()
    const hits: string[] = history.filter((item: string) => item.startsWith(line))
    return [hits.length > 0 ? hits : history, line]
}

function handleConnect(): void {
    const connectionHistory: string[] = GetConnectionHistory()
    console.log('Input the IP address of the server to connect to.')
    console.log('Press enter without any input for localhost.')

    if (connectionHistory.length > 0) {
        console.log('These are the servers you\'ve previously connected to. This input supports tab-completion.')
        console.log(GetConnectionHistory().join("\n"))
    }

    ConsoleInput.GetTextInput(connectAutoCompleter).then((input: string): void => {
        input = ParseConnectionPlaceholders(input)
        console.log(`Server host set to ${input}:13234.`)

        ConnectToServer(input)
        CreateCommandLine()
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
            break
        case 'update':
            UpdateAll()
            CreateCommandLine()
            break
        case 'refresh':
            console.log('Entrance file has been refreshed.')
            Locations.entrances = JSON.parse(String(fs.readFileSync("entrances.json")))
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
