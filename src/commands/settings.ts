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
			{ name: "Upside Down", 					value: "en-AU" },
			{ name: "Call Center", 					value: "en-IN" },
			{ name: "Posh", 								value: "en-GB" },
			{ name: "Freedumb", 						value: "en-US" },
			{ name: "French (Not Fancy)", 	value: "fr-CA" },
			{ name: "French (Fancy)", 			value: "fr-FR" },
			{ name: "King DeDeDe", 					value: "de-DE" },
			{ name: "Bahubali", 						value: "hi-IN" },
			{ name: "Spaghetti", 						value: "it-IT" },
			{ name: "NI HON GO", 						value: "ja-JP" },
			{ name: "Cell Phone", 					value: "ko-KR" },
			{ name: "GREAT WALL",						value: "cmn-CN"},
			{ name: "*shrugs*", 						value: "nb-NO" },
			{ name: "Cyka Blyat", 					value: "ru-RU" },
			{ name: "Chankla", 							value: "es-ES" }
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