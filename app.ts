import {Interface} from "readline";
import Locations from "./src/classes/Locations";
import LocationNode from "./src/types/LocationNode";
import Entrance from "./src/types/Entrance";
import PathStep from "./src/types/PathStep";
import {MappedEntrance} from "./src/types/LocationMapping";
import EntranceLinks from "./src/classes/EntranceLinks";
import Saves, {Save} from "./src/classes/Saves";
import ConsoleInput from "./src/classes/ConsoleInput";
import {
    ConnectToServer, DisconnectFromServer,
    IsConnectedToServer,
    ParseConnectionPlaceholders, RequestUpdate,
    UpdateAll
} from "./utils/NetUtils";
import fs from "fs";
import chalk from "chalk";
import ConnectionHistory from "./src/classes/ConnectionHistory";

const readline = require('readline');
let commandLine: Interface

type Command = {
    name: string
    help_text: string
    executor: () => void
}

function CreateCommandLine(): void {
    commandLine = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: '> ',
        completer: (line: string): [string[], string] => {
            const completions: string[] = commands.map((c: Command) => c.name)
            const hits: string[] = completions.filter((completion: string) => completion.startsWith(line))

            return [hits.length > 0 ? hits : completions, line]
        }
    });

    ConsoleInput.Log('STARTUP_MESSAGE', [ConsoleInput.command('help')])
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
    const entranceMapper = (e: MappedEntrance, index: number): string => `(${index + 1}) ${ConsoleInput.location(e.name)}`

    if (!Saves.IsFileLoaded()) {
        ConsoleInput.Error('ERROR_SELECT_FILE')
        CreateCommandLine()
        return
    }

    ConsoleInput.Log('INPUT_LINKAREA1')
    ConsoleInput.GetAreaInput(areaAutoCompleter).then((area: LocationNode): void => {
        ConsoleInput.Log('INPUT_LINKENTRANCE1')
        console.log(Locations.GetUnlinkedEntrances(area)?.map(entranceMapper).join("\n"))
        ConsoleInput.GetExitInput(area).then((exit: MappedEntrance): void => {
            ConsoleInput.Log('INPUT_LINKAREA2')
            ConsoleInput.GetAreaInput(areaAutoCompleter).then((connection: LocationNode): void => {
                ConsoleInput.Log('INPUT_LINKENTRANCE2')
                console.log(Locations.GetUnlinkedEntrances(connection)?.map(entranceMapper).join("\n"))
                ConsoleInput.GetExitInput(connection).then((connectionEntrance: MappedEntrance): void => {
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
    if (!Saves.IsFileLoaded()) {
        ConsoleInput.Error('ERROR_SELECT_FILE')
        CreateCommandLine()
        return
    }

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
    if (!Saves.current || !Saves.IsFileLoaded()) {
        ConsoleInput.Error('ERROR_SELECT_FILE')
        CreateCommandLine()
        return
    }

    let location: LocationNode
    for (location of Saves.current.locations) {
        if (location.connections.length === 0) continue

        console.log(`${location.name}`)
        console.log(` - ${location.connections.map((c: Entrance): string => `${c.location.name} (${c.name})`).join("\n - ")}`)
    }
    CreateCommandLine()
}

function handleLoad(): void {
    ConsoleInput.GetGameInput()
        .then((): void => {
            const save: Save | null = Saves.current
            if (!save) return

            let totalLocations: number = save.locations.length
            let totalEntrances: number = save.locations.map((l: LocationNode) => l.connections.length).reduce((previous: number, current: number) => previous + current)
            ConsoleInput.Log('SUCCESS_LOAD', [String(totalLocations), String(totalEntrances)])
            CreateCommandLine()
        })
        .catch(() => handleLoad())
}

function handleJoin(): void {
    if (!IsConnectedToServer()) {
        ConsoleInput.Error('ERROR_CONNECTION')
        CreateCommandLine()
        return
    }

    console.log('Enter the UUID of the game for which to join.')
    ConsoleInput.GetTextInput()
        .then((input: string): void => {
            if (input.length != 6) {
                console.error(chalk.red('The supplied UUID is not valid.'))
                handleJoin()
                return
            }

            Saves.Create(input)
            RequestUpdate()
            CreateCommandLine()
        })
}

function areaAutoCompleter(line: string): [string[], string] {
    const hits: string[] = Locations.GetDefault().filter((location: LocationNode) => location.name.startsWith(line)).map((location: LocationNode) => location.name)
    return [hits.length > 0 ? hits : [], line]
}

function connectAutoCompleter(line: string): [string[], string] {
    const history: string[] = ConnectionHistory.Get()
    const hits: string[] = history.filter((item: string) => item.startsWith(line))
    return [hits.length > 0 ? hits : history, line]
}

function handleDisconnect(): void {
    if (!IsConnectedToServer()) {
        ConsoleInput.Error('ERROR_CONNECTION')
        return
    }

    DisconnectFromServer()
    console.log('Successfully disconnected from sync server.')
    CreateCommandLine()
}

function handleConnect(): void {
    const connectionHistory: string[] = ConnectionHistory.Get()
    console.log('Input the IP address of the server to connect to.')
    console.log(`Press enter without any input for ${ConsoleInput.network('localhost')}.`)

    if (connectionHistory.length > 0) {
        console.log('These are the servers you\'ve previously connected to. This input supports tab-completion.')
        console.log(connectionHistory.map((loc: string): string => `${ConsoleInput.network(loc)}`).join("\n"))
    }

    ConsoleInput.GetTextInput(connectAutoCompleter).then((input: string): void => {
        input = ParseConnectionPlaceholders(input)
        console.log(`Attempting to connect to ${ConsoleInput.network(input)}:13234...`)

        ConnectToServer(input)
            .then(CreateCommandLine)
            .catch((): void => {
                console.error(chalk.red('Failed to connect to provided sync server.'))
                CreateCommandLine()
            })
    })
}

function handleHelp() {
    let command: Command
    for (command of commands) {
        console.log(`(${command.name}) - ${command.help_text}`)
    }
    CreateCommandLine()
}

const commands: Command[] = [
    {
        name: 'help',
        help_text: 'List every command and how to use them',
        executor: handleHelp
    },
    {
        name: 'link',
        help_text: 'Connect one entrance to another',
        executor: handleLink
    },
    {
        name: 'load',
        help_text: 'Load a saved game',
        executor: handleLoad
    },
    {
        name: 'join',
        help_text: 'Join an ongoing net game',
        executor: handleJoin
    },
    {
        name: 'path',
        help_text: 'Determine the path from one point to another',
        executor: handlePath
    },
    {
        name: 'list',
        help_text: 'List the current entrance links',
        executor: handleList
    },
    {
        name: 'connect',
        help_text: 'Connect to a remote server for entrance synching',
        executor: handleConnect
    },
    {
        name: 'disconnect',
        help_text: 'Disconnect from the current sync server',
        executor: handleDisconnect
    },
    {
        name: 'update',
        help_text: 'Sync your local save with the server\'s current save',
        executor: () => {
            if (!Saves.IsFileLoaded()) {
                ConsoleInput.Error('ERROR_SELECT_FILE')
                CreateCommandLine()
                return
            }

            if (!IsConnectedToServer() ){
                ConsoleInput.Error('ERROR_CONNECTION')
                CreateCommandLine()
                return
            }

            console.log('Syncing local server and remote save')
            UpdateAll()
                .then(() => {
                    RequestUpdate()
                    CreateCommandLine()
                })
                .catch((e) => {
                    console.error(chalk.red(e))
                    CreateCommandLine()
                })
        }
    },
    {
        name: 'refresh',
        help_text: 'Refresh the entrance file and add new entrances',
        executor: (): void  => {
            console.log('Entrance file has been refreshed.')
            Locations.entrances = JSON.parse(String(fs.readFileSync("entrances.json")))
            Saves.AddMissingLocations()
            CreateCommandLine()
        }
    },
    {
        name: 'exit',
        help_text: 'End the current application session',
        executor: (): void => {
            process.exit(0)
        }
    }
]

function handleCommand(line: string) {
    const input: string = line.trim()
    const command: Command | null = commands.find((c: Command): boolean => c.name === input) ?? null

    commandLine.close()
    if (!command) {
        console.error(chalk.red(`Unknown command: ${line}`))
        CreateCommandLine()
        return
    }

    command.executor()
}

console.log(`Type \`${ConsoleInput.command('join')}\` or \`${ConsoleInput.command('load')}\` to start with this tool`)
CreateCommandLine()
