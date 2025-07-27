import {IsConnectedToServer, RequestUpdate} from "../../utils/NetUtils";
import ConsoleInput from "../classes/ConsoleInput";
import Saves from "../classes/Saves";
import CommandHandler from "../classes/CommandHandler";

export default function CommandJoin(): void {
    if (!IsConnectedToServer()) {
        ConsoleInput.Error('ERROR_CONNECTION')
        CommandHandler.Spawn()
        return
    }

    ConsoleInput.Log('INPUT_UUID')
    ConsoleInput.GetTextInput()
        .then((input: string): void => {
            if (input.length != 6) {
                ConsoleInput.Error('ERROR_UUID', [input])
                CommandJoin()
                return
            }

            Saves.Create(input)
            RequestUpdate()
            CommandHandler.Spawn()
        })
}
