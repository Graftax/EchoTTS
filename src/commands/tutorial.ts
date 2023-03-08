import { SlashCommandBuilder } from "discord.js";
import { Command } from "../Commander.js";

export default {
	slashcommand: new SlashCommandBuilder()
		.setName('tutorial')
		.setDescription('Explains how to use Echo.'),
	async execute(interaction) {
		interaction.reply("While you are connected to a voice channel, @mention me on the same server and I will join you. Once I'm in a channel with you, send me a DM and I will read it out loud. Feel free to disconnect me when you don't need me anymore.");
	}
} as Command;