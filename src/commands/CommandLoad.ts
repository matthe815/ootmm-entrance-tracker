import ConsoleInput from "../classes/ConsoleInput";
import Saves, {Save} from "../classes/Saves";
import chalk from "chalk";
import LocationNode from "../types/LocationNode";

export default function CommandLoad(): void {
    ConsoleInput.Log("SELECT_SAVE")

    const saves: string[] = Saves.GetAll()
    saves.forEach((save: string, index: number): void => {
        console.log(`(${index}) ${chalk.bold(save.split(".")[0])}`)
    })
    console.log(`(${saves.length}) New Game`)

    ConsoleInput.GetGameInput()
        .then((file: number): void => {
            Saves.Load(saves[file].split(".")[0])
                .then((save: Save): void => {
                    let totalLocations: number = save.locations.length
                    let totalEntrances: number = save.locations.map((l: LocationNode) => l.connections.length).reduce((previous: number, current: number) => previous + current)
                    ConsoleInput.Log('SUCCESS_LOAD', [String(totalLocations), String(totalEntrances)])
                    ConsoleInput.StartCommandLine()
                })
                .catch((e): void => {
                    console.error(chalk.red(e))
                })
        })
        .catch(() => CommandLoad())
}
