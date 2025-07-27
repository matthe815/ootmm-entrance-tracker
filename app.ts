import CommandHandler from "./src/classes/CommandHandler";
import ConsoleInput from "./src/classes/ConsoleInput";

console.log(`Type \`${ConsoleInput.command('join')}\` or \`${ConsoleInput.command('load')}\` to start with this tool`)
CommandHandler.Spawn()
