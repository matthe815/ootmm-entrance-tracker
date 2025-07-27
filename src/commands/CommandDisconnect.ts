import {DisconnectFromServer, IsConnectedToServer} from "../../utils/NetUtils";
import ConsoleInput from "../classes/ConsoleInput";

export default function CommandDisconnect(): void {
    if (!IsConnectedToServer()) {
        ConsoleInput.Error('ERROR_CONNECTION')
        return
    }

    DisconnectFromServer()
    ConsoleInput.Log('DISCONNECTED')
    ConsoleInput.StartCommandLine()
}
