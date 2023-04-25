import { Channel, Client, CommandInteraction, Events, Message, VoiceChannel, VoiceState } from "discord.js";
import * as DSVoice from '@discordjs/voice';
import { createDiscordJSAdapter } from "../adapter.js";
import { Scenario } from "../Scenario";
import { Singleton as DataStorage } from "../DataStorage.js";
import { request } from 'https';
import { Readable } from 'stream';

interface VoiceOptions {
	languageCode: string,
	ssmlGender: string
}

interface SpeakItem {
	text: string;
	options: VoiceOptions;
}

export function setGender(interaction: CommandInteraction) {

	let option = interaction.options.get("gender", false)
	if(!option)
		return;

	DataStorage.set(interaction.user.id, "gender", option.value);

}

export function setLanguage(interaction: CommandInteraction) {

	let option = interaction.options.get("language", false)
	if(!option)
		return;                                                                                        

	DataStorage.set(interaction.user.id, "language", option.value);

}

function getDefaultSettingsObject(): object {

	return {
		"gender": "FEMALE",
		"language": "en-US"
	};

}

export function getSettings(userID: string) : object {

	let settings = DataStorage.getAll(userID);
	return Object.assign(getDefaultSettingsObject(), settings);

}

export default class TextToSpeech implements Scenario {

	end = null;
	private _channel: Channel;
	private _client: Client;
	private _connection: DSVoice.VoiceConnection = null;
	private _subjects: Set<string> = new Set();
	private _player = DSVoice.createAudioPlayer();
	private _queue: Array<SpeakItem> = new Array();

	init(channel: Channel, client: Client) {

		this._channel = channel;
		this._client = client;

		if(!channel.isVoiceBased()) {
			console.error("Scenario failed: channel is not voice based.");
			return this.end();
		}

		let voiceChannel = channel as VoiceChannel;

		// TODO: Generic system for sharing voice connection.
		// It would be nice if scenarios could share the same
		// voice connection, but the use case is limited right
		// now, since only one scenario uses voice.
		let prevConnection = DSVoice.getVoiceConnection(voiceChannel.guildId);
		if(prevConnection){
			console.warn(`Scenario failed: voice connection already in use in ${voiceChannel.name}`);
			return this.end();
		}

		client.on(Events.VoiceStateUpdate, this.onVoiceStateUpdate);
		client.on(Events.MessageCreate, this.onMessageCreate);

		this._connection = DSVoice.joinVoiceChannel({
			channelId: voiceChannel.id,
			guildId: voiceChannel.guildId,
			adapterCreator: createDiscordJSAdapter(voiceChannel)
		});
		
		this.fixConnectionTimeoutBug();
		this._connection.subscribe(this._player);
		this._player.on("stateChange", this.onPlayerStateChange);
	}

	fixConnectionTimeoutBug() {

		// This stateChange listener is to fix a bug where voice connections time out.
		// https://github.com/discordjs/discord.js/issues/9185
		const networkStateChangeHandler = (oldNetworkState: any, newNetworkState: any) => {
			const newUdp = Reflect.get(newNetworkState, 'udp');
			clearInterval(newUdp?.keepAliveInterval);
		}

		this._connection.on('stateChange', (oldState, newState) => {
			Reflect.get(oldState, 'networking')?.off('stateChange', networkStateChangeHandler);
			Reflect.get(newState, 'networking')?.on('stateChange', networkStateChangeHandler);
		});

	}

	shutdown() {

		this._client.removeListener(Events.VoiceStateUpdate, this.onVoiceStateUpdate);
		this._client.removeListener(Events.MessageCreate, this.onMessageCreate);

		if(this._connection)
			this._connection.destroy();

	}

	isPermanent() {
		return false;
	}

	addSubject(userID: string) {
		this._subjects.add(userID);
	}

	speak(toSpeak: string, vOpts: VoiceOptions, onError: (err: Error) => void = null) {

		const reqBodyObject = {
			"input": { "text": toSpeak },
			"voice": vOpts,
			"audioConfig": { "audioEncoding": process.env.AUDIO_CODEC }
		};
	
		const reqBodyString = JSON.stringify(reqBodyObject);
	
		const options = {
			hostname: 'texttospeech.googleapis.com',
			path: `/v1beta1/text:synthesize?key=${process.env.GOOGLE_CLOUD_KEY}`,
			method: 'POST',
			headers: {'Content-Type': 'application/json'}
		};
		
		const req = request(options, (res) => {
	
			var jsonResBody = "";
			res.on('data', (d) => { jsonResBody += d; });
			res.on('end', () => {
				
				var objResBody = JSON.parse(jsonResBody);

				if(objResBody.error) {
					onError?.(new Error(objResBody.message));
					return;
				}

				var audioBuffer = Buffer.from(objResBody.audioContent, 'base64');
	
				const readable = new Readable();
				readable._read = () => {};
				readable.push(audioBuffer);
				readable.push(null);
	
				let newAudio = DSVoice.createAudioResource(readable, {
					inputType: DSVoice.StreamType.Arbitrary
				});
	
				this._player.play(newAudio);
	
			});
	
		});
		
		req.on('error', error => {
			onError?.(error);
		});
		
		req.write(reqBodyString);
		req.end();
	}

	// Declaring the methods like this means they are pre-bound. Important for 
	// listener registration.
	onPlayerStateChange = (oldState: DSVoice.AudioPlayerState, newState: DSVoice.AudioPlayerState) => {

		if(newState.status != DSVoice.AudioPlayerStatus.Idle)
			return;

		let item = this._queue.shift();
		if(!item)
			return;

		this.speak(item.text, item.options, (error) => {console.log(error)});
	};

	didEveryoneLeave(state: VoiceState): boolean {

		if(!state.channel)
			return false;

		if(state.channel.id != this._channel.id)
			return false;

		return state.channel.members.size <= 1;
	}

	didWeLeave(state: VoiceState): boolean {

		if(!state.channel)
			return false;

		if(state.channel.id != this._channel.id)
			return false;

		return state.member.id == this._client.user.id;
	}

	onVoiceStateUpdate = (oldState: VoiceState, newState: VoiceState) => {

		if(this.didEveryoneLeave(oldState) || this.didWeLeave(oldState))
			this.end();

	}

	onMessageCreate = (message: Message) => {

		if(message.channel.id != this._channel.id)
			return;
		
		if(!this._subjects.has(message.author.id))
			return;
	
		let toSpeak: SpeakItem = { text: message.content, options: {
			languageCode: getSettings(message.author.id)["language"],
			ssmlGender: getSettings(message.author.id)["gender"]
		}};

		if(this._player.state.status != DSVoice.AudioPlayerStatus.Idle) {
			this._queue.push(toSpeak);
			return;
		}

		this.speak(toSpeak.text, toSpeak.options, (error) => {console.log(error)});
	}
}