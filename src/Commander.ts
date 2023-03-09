import { Collection, CommandInteraction, Interaction, REST, Routes, SlashCommandBuilder } from "discord.js";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface Command {
	slashcommand: SlashCommandBuilder,
	execute: (interaction: CommandInteraction) => void,
}

export default class Commander {

	private m_commandMap: Collection<string, Command> = new Collection();

	constructor() {

	}

	loadCommands(pathToCommands): Promise<void> {

		return new Promise((resolve, reject) => {

			const commandsPath = path.join(__dirname, pathToCommands);
			fs.readdir(commandsPath).then(async (files) => {

				files = files.filter(file => file.endsWith('.js'));
				for(let currFile of files) {

					const currPath = "file://" + path.join(commandsPath, currFile);
					console.log(`Importing ${currFile}`);
					let command = (await import(currPath)).default as Command;
					this.m_commandMap.set(command.slashcommand.name, command);

				}

				resolve();
			});
		});

	}

	async registerCommands() {

		let cmdJSON = [];
		
		for(let currCommand of this.m_commandMap.values()) {
			console.log(`Registering command ${currCommand.slashcommand.name}`);
			cmdJSON.push(currCommand.slashcommand.toJSON());
		}

		const rest = new REST({version: '10'}).setToken(process.env.DISCORD_TOKEN);
		let res = await rest.put(Routes.applicationCommands(process.env.DISCORD_APPLICATION_ID), {
			body: cmdJSON
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