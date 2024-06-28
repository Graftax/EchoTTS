import { Channel, SlashCommandBuilder, TextChannel } from "discord.js";
import { ICommand } from "../Commander.js";
import { Singleton as ScenarioManager } from "../../scenarios/ScenarioManager.js";
import SpeakForMeScenario from "../../scenarios/indexable/SpeakForMeScenario.js";

function isTextChannel(channel: Channel): channel is TextChannel {
	return channel.isTextBased();
}

export default {
	slashCommand: new SlashCommandBuilder()
		.setName('speak-for-me')
		.setDescription('Causes Echo to join the channel you are in.'),
	async execute(interaction) {

		if(!interaction.guild) {
			interaction.reply({content: "This only works on servers.", ephemeral: true});
			return;
		}

		let voiceStates = interaction.guild.voiceStates.valueOf();
		let userVoiceState = voiceStates.get(interaction.user.id);
		
		if(!userVoiceState || !userVoiceState.channel){
			interaction.reply({content: "You need to be in a voice channel.", ephemeral: true});
			return;
		}

		let ttsScenario = ScenarioManager?.startScenario(SpeakForMeScenario, userVoiceState.channel) as SpeakForMeScenario;
		ttsScenario.addSubject(interaction.user.id);

		let userVoiceChannel = userVoiceState.channel as Channel;
		if(isTextChannel(userVoiceChannel)) {
			userVoiceChannel.send(`${interaction.user}, write messages here and I'll read them in ${userVoiceChannel}.`);
			interaction.reply({content: `I'll read messages you post in ${userVoiceChannel}`, ephemeral: true});
		}
		else {
			interaction.reply({content: "Be right there.", ephemeral: true});
		}

	}
} as ICommand;