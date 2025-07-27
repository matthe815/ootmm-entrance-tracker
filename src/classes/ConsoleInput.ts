import readline, {Interface} from "readline";
import LocationNode from "../types/LocationNode";
import Locations from "./Locations";
import {MappedEntrance} from "../types/LocationMapping";
import chalk from 'chalk';
import Saves from "./Saves";
import {readFileSync} from "fs";
import path from "node:path";

export type Command = {
    name: string
    help_text: string
    executor: () => void
}

class ConsoleInput {
    public static command = chalk.yellow
    public static location = chalk.green
    public static network = chalk.bold
    static inputLine: Interface

    public static LANG_EN = JSON.parse(String(readFileSync(path.resolve("lang", "en_us.json"))))

    public static GetMessage(key: string, placeholders?: string[]) {
        if (!this.LANG_EN[key]) return key

        let message: string = this.LANG_EN[key]

        if (placeholders && placeholders.length > 0) {
            let placeholder: string
            for (placeholder of placeholders) {
                if (!message.includes('%s')) continue
                message = message.replace('%s', placeholder)
            }
        }

        return message
    }

    public static Log(key: string, placeholders?: string[]): void {
        console.error(this.GetMessage(key, placeholders))
    }

    public static Error(key: string, placeholders?: string[]): void {
        console.error(chalk.red(this.GetMessage(key, placeholders)))
    }

    public static StartInput(completer?: (line: string) => [string[], string]): void {
        this.inputLine = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: '> ',
            completer
        })

        this.inputLine.prompt()
    }

    public static StopInput(): void {
        if (!this.inputLine) return
        this.inputLine.close()
    }

    public static GetGameInput(completer?: (line: string) => [string[], string]): Promise<number> {
        return new Promise((resolve, reject): void => {
            this.StartInput(completer)

            if (!this.inputLine) return
            this.inputLine.on("line", (input: string): void => {
                const saves: string[] = Saves.GetAll()
                let inputtedNumber: number = parseInt(input)
                if (isNaN(inputtedNumber)) {
                    ConsoleInput.StopInput()
                    reject(ConsoleInput.GetMessage('ERROR_FORMAT'))
                    return
                }

                if (inputtedNumber > saves.length) {
                    ConsoleInput.StopInput()
                    reject(ConsoleInput.GetMessage('ERROR_LENGTH'))
                    return
                }

                if (inputtedNumber === saves.length) {
                    ConsoleInput.StopInput()
                    Saves.Create()
                    resolve(inputtedNumber)
                    return
                }


                ConsoleInput.StopInput()
                resolve(inputtedNumber)
            })
        })
    }

    public static GetAreaInput(completer?: (line: string) => [string[], string]): Promise<LocationNode> {
        this.StartInput(completer)
        return new Promise((resolve): void => {
            if (!this.inputLine) return

            this.inputLine.on("line", (input: string): void => {
                if (!Saves.current) return;

                if (input.toLowerCase() === 'spawn' && Saves.current) {
                    ConsoleInput.StopInput()
                    resolve(Saves.current.GetSpawn())
                    return
                }

                const area: LocationNode | null = Saves.current.Get(input)
                if (!area) {
                    ConsoleInput.Error('UNKNOWN_AREA')
                    return
                }

                ConsoleInput.StopInput()
                resolve(area)
            })
        })
    }

    public static GetExitInput(area: LocationNode, completer?: (line: string) => [string[], string]): Promise<MappedEntrance> {
        this.StartInput(completer)
        return new Promise((resolve): void => {
            if (!this.inputLine) return

            this.inputLine.on("line", (input: string): void => {
                const exitId: number = (parseInt(input) - 1)
                const entrance: MappedEntrance | null = Locations.FindEntranceByIndex(area, exitId)
                if (!entrance) {
                    ConsoleInput.Error('UNKNOWN_ENTRANCE')
                    return
                }

                ConsoleInput.StopInput()
                resolve(entrance)
            })
        })
    }

    public static GetTextInput(completer?: (line: string) => [string[], string]): Promise<string> {
        this.StartInput(completer)
        return new Promise((resolve): void => {
            if (!this.inputLine) return

            this.inputLine.on("line", (input: string): void => {
                this.StopInput()
                resolve(input)
            })
        })
    }
}

export default ConsoleInput
