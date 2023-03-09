import { SlashCommandBuilder } from "discord.js";
import { Command } from "../Commander.js";

export default {
	slashcommand: new SlashCommandBuilder()
		.setName('shut-up')
		.setDescription('Forces Echo to stop talking.'),
	async execute(interaction) {
		
		// check for TTS instances in the same guild as the interaction
		// if we fine one, Clear its queue and speak the shut-up phrase.
		interaction.reply({content: "This is not implemented yet.", ephemeral: true});
	}
} as Command;