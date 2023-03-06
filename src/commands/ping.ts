import { SlashCommandBuilder } from "discord.js";

export default {
	slashcommand: new SlashCommandBuilder()
		.setName('ping2')
		.setDescription('Replies with Pong2!'),
	async execute(interaction) {
		await interaction.reply('Pong2!');
	}
}