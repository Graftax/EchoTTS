import { AutocompleteInteraction, Collection, CommandInteraction, Interaction, REST, Routes, SlashCommandBuilder } from "discord.js";
import CommandIndex from "../index/commands.js";
import { Command } from "./Command.js";

export default class Commander {

	private m_commandMap: Collection<string, Command>;

	constructor() {

		const commands: Command[] = Array.from(CommandIndex);
		const mapEntries: [string, Command][] = commands.map(value => [value.name, value]);
		this.m_commandMap = new Collection(mapEntries)

	}

	async registerCommands() {

		let commandJSON = this.m_commandMap.map(value => value.toJSON());

		const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN ?? "");

		rest.put(Routes.applicationCommands(process.env.DISCORD_APPLICATION_ID ?? ""), {
			body: commandJSON
		}).then((value: any) => {

			value.forEach((element: any) => {
				console.log(`Registered ${element.name}`);
			});

		});

	}

	// Processes the text and runs the apropriate
	exec(iaction: Interaction): boolean {

		if(!iaction.isAutocomplete() && !iaction.isCommand())
			return false;

		let currCmd = this.m_commandMap.get(iaction.commandName);
		if (!currCmd) return false;

		console.log(`Received command '${iaction.commandName}' from ${iaction.user.username}`);
		currCmd.receiveInteraction(iaction)
		return true;

	}
}

let Singleton = new Commander();
export { Singleton };