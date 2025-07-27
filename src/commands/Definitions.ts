import ConsoleInput, {Command} from "../classes/ConsoleInput";
import CommandLink from "./CommandLink";
import CommandLoad from "./CommandLoad";
import CommandJoin from "./CommandJoin";
import CommandPath from "./CommandPath";
import CommandList from "./CommandList";
import CommandConnect from "./CommandConnect";
import CommandDisconnect from "./CommandDisconnect";
import Saves from "../classes/Saves";
import {IsConnectedToServer, RequestUpdate, UpdateAll} from "../../utils/NetUtils";
import chalk from "chalk";
import Locations from "../classes/Locations";
import fs from "fs";
import CommandHandler from "../classes/CommandHandler";

export const commands: Command[] = [
    {
        name: 'help',
        help_text: 'List every command and how to use them',
        executor: (): void => {
            let command: Command
            for (command of commands) {
                console.log(`(${command.name}) - ${command.help_text}`)
            }
            CommandHandler.Spawn()
        }
    },
    {
        name: 'link',
        help_text: 'Connect one entrance to another',
        executor: CommandLink
    },
    {
        name: 'load',
        help_text: 'Load a saved game',
        executor: CommandLoad
    },
    {
        name: 'join',
        help_text: 'Join an ongoing net game',
        executor: CommandJoin
    },
    {
        name: 'path',
        help_text: 'Determine the path from one point to another',
        executor: CommandPath
    },
    {
        name: 'list',
        help_text: 'List the current entrance links',
        executor: CommandList
    },
    {
        name: 'connect',
        help_text: 'Connect to a remote server for entrance synching',
        executor: CommandConnect
    },
    {
        name: 'disconnect',
        help_text: 'Disconnect from the current sync server',
        executor: CommandDisconnect
    },
    {
        name: 'update',
        help_text: 'Sync your local save with the server\'s current save',
        executor: (): void => {
            if (!Saves.IsFileLoaded()) {
                ConsoleInput.Error('ERROR_SELECT_FILE')
                CommandHandler.Spawn()
                return
            }

            if (!IsConnectedToServer() ){
                ConsoleInput.Error('ERROR_CONNECTION')
                CommandHandler.Spawn()
                return
            }

            console.log('Syncing local server and remote save')
            UpdateAll()
                .then((): void => {
                    RequestUpdate()
                    CommandHandler.Spawn()
                })
                .catch((e): void => {
                    console.error(chalk.red(e))
                    CommandHandler.Spawn()
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
            CommandHandler.Spawn()
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
