import { Channel, Client, VoiceChannel } from "discord.js";
import { setTimeout } from "timers/promises";
import * as DSVoice from '@discordjs/voice';
import { createDiscordJSAdapter } from "../adapter.js";
import { Scenario } from "../Scenario";

export default class TextToSpeech implements Scenario {

	end = null;
	private connection: DSVoice.VoiceConnection = null;

	init(channel: Channel, client: Client) {

		if(!channel.isVoiceBased()) {
			console.error("Scenario failed: channel is not voice based.");
			this.end();
		}

		let voiceChannel = channel as VoiceChannel;

		this.connection = DSVoice.joinVoiceChannel({
			channelId: voiceChannel.id,
			guildId: voiceChannel.guildId,
			adapterCreator: createDiscordJSAdapter(voiceChannel)
		});

		setTimeout(5000).then(() => { this.end() }); 
	}

	shutdown() {

		if(this.connection)
			this.connection.destroy();

	}
}