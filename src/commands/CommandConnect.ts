import ConnectionHistory from "../classes/ConnectionHistory";
import ConsoleInput from "../classes/ConsoleInput";
import {ConnectToServer, ParseConnectionPlaceholders} from "../../utils/NetUtils";
import CommandHandler from "../classes/CommandHandler";

export default function CommandConnect(): void {
    const connectAutoCompleter = (line: string): [string[], string] => {
        const history: string[] = ConnectionHistory.Get()
        const hits: string[] = history.filter((item: string) => item.startsWith(line))
        return [hits.length > 0 ? hits : history, line]
    }

    const connectionHistory: string[] = ConnectionHistory.Get()
    ConsoleInput.Log('INPUT_IP')
    console.log(`Press enter without any input for ${ConsoleInput.network('localhost')}.`)

    if (connectionHistory.length > 0) {
        ConsoleInput.Log('PREVIOUS_ADDRESSES')
        console.log(connectionHistory.map((loc: string): string => `${ConsoleInput.network(loc)}`).join("\n"))
    }

    ConsoleInput.GetTextInput(connectAutoCompleter).then((input: string): void => {
        input = ParseConnectionPlaceholders(input)
        ConsoleInput.Log('ATTEMPT_CONNECTION', [ConsoleInput.network(input)])

        ConnectToServer(input)
            .then(CommandHandler.Spawn)
            .catch((): void => {
                ConsoleInput.Error('CONNECTION_FAILURE')
                CommandHandler.Spawn()
            })
    })
}
