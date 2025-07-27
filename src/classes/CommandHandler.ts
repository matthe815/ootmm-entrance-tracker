import readline, {Interface} from "readline";
import {commands} from "../commands/Definitions";
import chalk from "chalk";
import ConsoleInput, {Command} from "./ConsoleInput";

class CommandHandler {
    static commandLine: Interface

    public static Spawn(): void {
        CommandHandler.commandLine = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: '> ',
            completer: (line: string): [string[], string] => {
                const completions: string[] = commands.map((c: Command) => c.name)
                const hits: string[] = completions.filter((completion: string) => completion.startsWith(line))

                return [hits.length > 0 ? hits : completions, line]
            }
        });

        ConsoleInput.Log('STARTUP_MESSAGE', [ConsoleInput.command('help')])
        CommandHandler.commandLine.prompt();
        CommandHandler.commandLine.once('line', (line: string): void => {
            CommandHandler.commandLine.close()
            this.HandleCommand(line);
        })
    }

    static HandleCommand(line: string): void {
        const input: string = line.trim()
        const command: Command | null = commands.find((c: Command): boolean => c.name === input) ?? null

        this.commandLine.close()
        if (!command) {
            console.error(chalk.red(`Unknown command: ${line}`))
            CommandHandler.Spawn()
            return
        }

        command.executor()
    }
}

export default CommandHandler
