import { Channel, CommandInteraction, SlashCommandBuilder, TextChannel } from "discord.js";
import { Command } from "../Command.js";
import { Singleton as ScenarioManager } from "../../scenarios/ScenarioManager.js";
import SpeakForMeScenario from "../../scenarios/indexable/SpeakForMeScenario.js";
import { Comex } from "../Comex.js";

const commandInstance = new Command("speak-for-me", "Echo will enter the channel and perform text-to-speech for you.", 
	[],

	new Comex({}, 
		({}, interaction) => {

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
			if(userVoiceChannel.isTextBased()) {
				userVoiceChannel.send(`${interaction.user}, write messages here and I'll read them in ${userVoiceChannel}.`);
			}
	
			interaction.reply({content: `I'll read messages you post in ${userVoiceChannel}`, ephemeral: true});

		})
);

export default commandInstance;