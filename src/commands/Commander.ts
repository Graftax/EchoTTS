import { AutocompleteInteraction, Collection, CommandInteraction, Interaction, REST, Routes, SlashCommandBuilder } from "discord.js";
import CommandIndex from "../index/commands.js";

export interface ICommand {
	get slashCommand(): SlashCommandBuilder,
	execute: (interaction: CommandInteraction) => void,
	autocomplete?: (interaction: AutocompleteInteraction) => void
}

// export class BaseCommand implements ICommand {

// }

export default class Commander {

	private m_commandMap: Collection<string, ICommand> = new Collection();

	constructor() {

		for(const command of CommandIndex)
			this.m_commandMap.set(command.slashCommand.name, command);

	}

	async registerCommands() {

		let cmdJSON = [];
		
		for(let currCommand of this.m_commandMap.values())
			cmdJSON.push(currCommand.slashCommand.toJSON());

		const rest = new REST({version: '10'}).setToken(process.env.DISCORD_TOKEN ?? "");

		rest.put(Routes.applicationCommands(process.env.DISCORD_APPLICATION_ID ?? ""), {
			body: cmdJSON
		}).then((value: any) => {

			value.forEach((element: any) => {
				console.log(`Registered ${element.name}`);
			});

		});
		
	}

	// Returns a list of command names.
	getCommandList() {
		return Array.from(this.m_commandMap.keys()).sort();
	}

	// Processes the text and runs the apropriate
	exec(iaction: Interaction) : boolean {

		if(!iaction.isAutocomplete() && !iaction.isCommand())
			return false;

		console.log(`Received command '${iaction.commandName}' from ${iaction.user.username}`);
		let currCmd = this.m_commandMap.get(iaction.commandName);

		if(!currCmd) {

			if(iaction.isCommand())
				iaction.reply("That is not a valid command.");

			return false;
		}

		if(iaction.isAutocomplete() && currCmd.autocomplete)
			currCmd.autocomplete(iaction);

		if(iaction.isCommand())
			currCmd.execute(iaction);

		return true;

	}
}

let Singleton = new Commander();
export { Singleton };