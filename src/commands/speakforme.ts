import { SlashCommandBuilder } from "discord.js";
import { Command } from "../Commander.js";
import { Singleton as ScenarioManager } from "../Scenario.js";
import TextToSpeech from "../scenarios/texttospeech.js";

export default {
	slashcommand: new SlashCommandBuilder()
		.setName('speakforme')
		.setDescription('Causes Echo to join the channel you are in.'),
	async execute(interaction) {

		if(!interaction.guild)
			return;

		let voiceStates = interaction.guild.voiceStates.valueOf();
		let userVoiceState = voiceStates.get(interaction.user.id);
		
		if(!userVoiceState)
			return;

		ScenarioManager.startScenario(userVoiceState.channel, new TextToSpeech);
		interaction.reply("yes");

	}
} as Command;