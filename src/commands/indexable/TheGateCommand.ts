import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { ICommand } from "../Commander.js";

let command = new SlashCommandBuilder();
command.setName("the-gate");
command.setDescription("Login to, create, and manage instances of The Gate.");
command.setDMPermission(false);

export default {
	slashCommand: command,
	autocomplete(interaction) {


	},
	execute(interaction) {

	}
} as ICommand;