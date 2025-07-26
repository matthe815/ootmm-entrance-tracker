import readline, {Interface} from "readline";
import LocationNode from "../types/LocationNode";
import Locations from "./Locations";
import {MappedEntrance} from "../types/LocationMapping";
import chalk from 'chalk';
import fs from "fs";
import Saves from "./Saves";

class ConsoleInput {
    public static command = chalk.yellow
    public static location = chalk.green
    public static network = chalk.bold
    static inputLine: Interface

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

    public static GetGameInput(completer?: (line: string) => [string[], string]): Promise<LocationNode[]> {
        return new Promise((resolve, reject): void => {
            const files: string[] = fs.readdirSync(Saves.SAVE_LOCATION)
            console.log('Select the saved game to load.')

            let file: string, count: number = 1
            for (file of files) {
                console.log(`(${count}) - ${file.split(".")[0]}`)
                count++
            }
            console.log(`(${count}) - New Game`)
            this.StartInput(completer)
            if (!this.inputLine) return

            this.inputLine.on("line", (input: string): void => {
                let inputtedNumber: number = parseInt(input)
                if (isNaN(inputtedNumber)) {
                    ConsoleInput.StopInput()
                    console.error(chalk.red(`The supplied index ${input} is not a number.`))
                    reject()
                    return
                }

                if (inputtedNumber === (count)) {
                    ConsoleInput.StopInput()
                    Saves.Create()
                    resolve(Locations.all)
                    return
                }
                else if (inputtedNumber > count) {
                    ConsoleInput.StopInput()
                    console.error(chalk.red(`There is no save at index ${input}.`))
                    reject()
                    return
                }

                let uuid: string = files[inputtedNumber - 1].split(".")[0]
                if (!Saves.Load(uuid)) {
                    console.error(chalk.red('The save requested to be loaded is invalid.'))
                    reject()
                    return
                }

                ConsoleInput.StopInput()
                resolve(Locations.all)
            })
        })
    }

    public static GetAreaInput(completer?: (line: string) => [string[], string]): Promise<LocationNode> {
        this.StartInput(completer)
        return new Promise((resolve) => {
            if (!this.inputLine) return

            this.inputLine.on("line", (input: string): void => {
                if (input.toLowerCase() === 'spawn') {
                    ConsoleInput.StopInput()
                    resolve(Locations.spawn)
                    return
                }

                const area: LocationNode | null = Locations.Find(input)
                if (!area) {
                    console.log('Invalid area name provided.')
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
                    console.log('Invalid index provided.')
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
