import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "../Commander.js";
import { Singleton as DataStorage } from "../DataStorage.js";

let command = new SlashCommandBuilder();
	command.setName('settings')
	command.setDescription('View and change your voice settings.');

	command.addStringOption((option) => {
		return option.setName("gender")
		.setDescription("What gender Echo tries to use when speaking for you.")
		.addChoices(
			{ name: "Male", value: "MALE" },
			{ name: "Female", value: "FEMALE" }
		)});

	command.addStringOption((option) => {
		return option.setName("language")
		.setDescription("What language Echo tries to use when speaking for you.")
		.addChoices(
			{ name: "English (Australia)", 		value: "en-AU" },
			{ name: "English (India)", 				value: "en-IN" },
			{ name: "English (UK)", 					value: "en-GB" },
			{ name: "English (US)", 					value: "en-US" },
			{ name: "French (Canada)", 				value: "fr-CA" },
			{ name: "French (France)", 				value: "fr-FR" },
			{ name: "German (Germany)", 			value: "de-DE" },
			{ name: "Hindi (India)", 					value: "hi-IN" },
			{ name: "Italian (Italy)", 				value: "it-IT" },
			{ name: "Japanese (Japan)", 			value: "ja-JP" },
			{ name: "Korean (South Korea)",		value: "ko-KR" },
			{ name: "Mandarin Chinese",				value: "cmn-CN"},
			{ name: "Norwegian (Norway)", 		value: "nb-NO" },
			{ name: "Russian (Russia)", 			value: "ru-RU" },
			{ name: "Spanish (Spain)", 				value: "es-ES" },
			{ name: "Spanish (US)", 					value: "es-US" },
			{ name: "Polish (Poland)", 				value: "pl-PL" }

		)});


function saveOption(interaction: CommandInteraction, optionName: string) {

	let option = interaction.options.get(optionName, false)
	if(!option)
		return;

	DataStorage.set(interaction.user.id, optionName, option.value);
}

export default {
	slashcommand: command,
	async execute(interaction) {

		saveOption(interaction, "gender");
		saveOption(interaction, "language");
		let settingsString = "Your settings:\n" + JSON.stringify(DataStorage.getAll(interaction.user.id), null, "\t");
		interaction.reply({ content: settingsString, ephemeral: true });

	}} as Command;