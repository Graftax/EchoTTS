import { SlashCommandBuilder } from "discord.js";
import { Command, Singleton as Commander } from "../Commander.js";

export default {
	slashcommand: new SlashCommandBuilder()
		.setName('help')
		.setDescription('Lists all commands and a brief description.'),
	async execute(interaction) {

		let cmdList = Commander.getCommandList();
		let output: string = "Commands I support:\n";

		cmdList.forEach(cmdName => {
			output += `\t${cmdName}\n`; 
		});

		output += "\n";
		output += "If you dont know what a command does, try running it by itself.\n"

		interaction.reply(output);

	}
} as Command;