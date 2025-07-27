import {DisconnectFromServer, IsConnectedToServer} from "../../utils/NetUtils";
import ConsoleInput from "../classes/ConsoleInput";
import CommandHandler from "../classes/CommandHandler";

export default function CommandDisconnect(): void {
    if (!IsConnectedToServer()) {
        ConsoleInput.Error('ERROR_CONNECTION')
        return
    }

    DisconnectFromServer()
    ConsoleInput.Log('DISCONNECTED')
    CommandHandler.Spawn()
}
