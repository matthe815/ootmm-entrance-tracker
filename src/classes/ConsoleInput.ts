import readline, {Interface} from "readline";
import LocationNode from "../types/LocationNode";
import Locations from "./Locations";
import {MappedEntrance} from "../types/LocationMapping";

class ConsoleInput {
    static inputLine: Interface

    public static StartInput(): void {
        this.inputLine = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: '> '
        })

        this.inputLine.prompt()
    }

    public static StopInput(): void {
        if (!this.inputLine) return
        this.inputLine.close()
    }

    public static GetAreaInput(): Promise<LocationNode> {
        this.StartInput()
        return new Promise((resolve) => {
            if (!this.inputLine) return

            this.inputLine.on("line", (input: string) => {
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

    public static GetExitInput(area: LocationNode): Promise<MappedEntrance> {
        this.StartInput()
        return new Promise((resolve) => {
            if (!this.inputLine) return

            this.inputLine.on("line", (input: string) => {
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

    public static GetTextInput(): Promise<string> {
        this.StartInput()
        return new Promise((resolve) => {
            if (!this.inputLine) return

            this.inputLine.on("line", (input: string) => {
                this.StopInput()
                resolve(input)
            })
        })
    }
}

export default ConsoleInput
