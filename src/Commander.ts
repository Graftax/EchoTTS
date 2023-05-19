import { Collection, CommandInteraction, Interaction, REST, Routes, SlashCommandBuilder } from "discord.js";
import CommandIndex from "./index/commands.js";

export interface Command {
	slashcommand: SlashCommandBuilder,
	execute: (interaction: CommandInteraction) => void,
}

export default class Commander {

	private m_commandMap: Collection<string, Command> = new Collection();

	constructor() {

		for(let currName in CommandIndex)
			this.m_commandMap.set(CommandIndex[currName].slashcommand.name, CommandIndex[currName]);

	}

	async registerCommands() {

		let cmdJSON = [];
		
		for(let currCommand of this.m_commandMap.values())
			cmdJSON.push(currCommand.slashcommand.toJSON());

		const rest = new REST({version: '10'}).setToken(process.env.DISCORD_TOKEN);

		rest.put(Routes.applicationCommands(process.env.DISCORD_APPLICATION_ID), {
			body: cmdJSON
		}).then((value: Array<any>) => {

			value.forEach(element => {
				console.log(`Registered ${element.name}`);
			});

		});
		
	}

	// Returns a list of command names.
	getCommandList() {
		return  Array.from(this.m_commandMap.keys()).sort();
	}

	// Processes the text and runs the apropriate
	exec(iaction: Interaction) : boolean {

		if(!iaction.isCommand())
			return false;

		let cmdIaction = iaction as CommandInteraction;
		if(cmdIaction == null)
			return false;

		console.log(`Received command '${iaction.commandName}' from ${iaction.user.username}`);
		let currCmd = this.m_commandMap.get(iaction.commandName);

		if(!currCmd) {
			cmdIaction.reply("That is not a valid command.");
			return false;
		}

		currCmd.execute(cmdIaction);
		return true;

	}
}

let Singleton = new Commander();
export { Singleton };