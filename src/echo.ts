import dotenv from 'dotenv';
if (process.env.NODE_ENV !== 'production')
	dotenv.config();

import { request } from 'https';
import { Readable } from 'stream';
import { Client, Events, User, Message, ActivityType, VoiceState, GatewayIntentBits, ChannelType, Partials, TextChannel, CommandInteraction } from 'discord.js';
import * as DSVoice from '@discordjs/voice';
import { Singleton as Commander } from './Commander.js';
import { Singleton as DataStorage } from './DataStorage.js';
import { Singleton as ScenarioManager } from './Scenario.js';
import MultiQueueProcessor from './MultiQueueProcessor.js';
import { createDiscordJSAdapter } from './adapter.js';

import { Configuration, OpenAIApi } from "openai";
const configuration = new Configuration({
	apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

interface QueueItem {
	connection: DSVoice.VoiceConnection,
	text: string,
	language: string,
	gender: string
}

// Construct Core Classes
// =============================================================================
const g_Client = new Client({
	intents: [
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.Guilds, 
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.MessageContent
	],
	partials: [Partials.Channel]
});

ScenarioManager.setClient(g_Client);

const g_QProcessor = new MultiQueueProcessor<QueueItem>(onProcessNextSpeak);
const g_Players: Map<string, DSVoice.AudioPlayer> = new Map();

DataStorage.init("users-db.json", 1, {
	"gender": "FEMALE",
	"language": "en-US"
});

// Command Registration
// =============================================================================

// g_Commander.registerCommand("shutup", async (args, cabinet, reply) => {

// 	let currConnection = await findConnectionForAuthor(cabinet.author);

// 	if(!currConnection) {
// 		reply("I don't see you in any voice channels I'm in.");
// 		return;
// 	}

// 	g_QProcessor.clearQueue(currConnection.joinConfig.guildId);

// 	queueNewSpeak(currConnection, `${cabinet.author.username} told me to shut up.`,
// 		g_Storage.get(cabinet.author.id, "language") as string,
// 		g_Storage.get(cabinet.author.id, "gender") as string, 
// 		(err) => { reply("An error has occured, make sure Graftax sees this: " + err.message); 
// 	});

// });

// Client event hooks
// =============================================================================
g_Client.on(Events.ClientReady, async () => {
	updatePresence();
});

function createPrompt(userInput) {
	return `You are an AI chatbot named Echo. Answer the following prompt sarcastically: ${userInput}`;
}

g_Client.on(Events.MessageCreate, async (message) => {
	
	if (message.author.bot) 
		return;

	const replyFunc = createReplyFunc(message);

	let messageChannel = await g_Client.channels.fetch(message.channelId) as TextChannel;
	if(message.content.length > 0 && messageChannel.isTextBased() && messageChannel.name == "echotalk") {

		const completion = await openai.createCompletion({
			model: "text-davinci-003",
			prompt: createPrompt(message.content),
			temperature: 0.9,
			max_tokens: 2048
			
		});

		if(completion.data.choices.length > 0)
		{
			if(completion.data.choices[0].text.length > 0)
				message.reply(completion.data.choices[0].text);
		}
			
	}

	if(checkMentionsAndJoin(message, replyFunc))
		return;

	if(message.channel.type != ChannelType.DM)
		return;

	let currConnection = await findConnectionForAuthor(message.author);
	if(!currConnection) {
		replyFunc("I don't see you in any voice channels I'm in. Try sending me '!help'.");
		return;
	}

	queueNewSpeak(currConnection, message.content,
		DataStorage.get(message.author.id, "language") as string,
		DataStorage.get(message.author.id, "gender") as string, 
		(err) => { replyFunc("An error has occured, make sure Graftax sees this: " + err.message); 
	});

});

g_Client.on(Events.VoiceStateUpdate, async (oldState: VoiceState, newState: VoiceState) => {

	//console.log(JSON.stringify(newState, null, "\t"));

	// If oldState has a channel and new state has no channel, we left.
	// let userList: Array<string> = [];

	// if(newState.channel) {
	// 	newState.channel.members.forEach((each) => {
	// 		userList.push(each.displayName);
	// 	});
	// 	console.log(JSON.stringify(userList, null, "\t"));
	// }

	if(oldState.channel && oldState.channel.members.size == 1) {

		let connection = DSVoice.getVoiceConnection(oldState.guild.id);
		if(connection)
			connection.destroy();

	}

});

g_Client.on(Events.InteractionCreate, async (interaction) => {
	Commander.exec(interaction);
});

Commander.loadCommands("commands").then(() => {
	return Commander.registerCommands();
});

// Start the client
// =============================================================================
g_Client.login(process.env.DISCORD_TOKEN);

// Utility Functions
// =============================================================================
function updatePresence() {

	let count = DSVoice.getVoiceConnections().keys.length;

	g_Client.user.setPresence({
		status: "online",
		afk: false,
		activities: [{
			name: `sounds in ${count} channel${count == 1 ? "" : "s"}.`,
			url: "https://graftax.net",
			type: ActivityType.Streaming
		}]
	});

}

function checkMentionsAndJoin(message: Message, reply) {

	if(message.mentions.everyone)
		return false;
	
	if(!message.mentions.has(g_Client.user))
		return false;

	if(!message.member) {
		reply("Mention me in the server that you want me to join you in.");
		return true;
	}

	if(!message.member.voice.channel) {
		reply("I can only join you if you are in a voice channel.");
		return true;
	}

	let connection = DSVoice.joinVoiceChannel({
		channelId: message.member.voice.channel.id,
		guildId: message.member.voice.channel.guildId,
		adapterCreator: createDiscordJSAdapter(message.member.voice.channel)
	});

	updatePresence();

	connection.on("stateChange", (oldState, newState) => {

		if(oldState.status != DSVoice.VoiceConnectionStatus.Disconnected 
			&& newState.status == DSVoice.VoiceConnectionStatus.Disconnected) {

			g_QProcessor.clearQueue(connection.joinConfig.guildId);
			updatePresence();
		}
		
	});

	connection.on("error", (error) => {
		console.error(error.message);
	});

	g_Players[message.guildId] = DSVoice.createAudioPlayer();
	connection.subscribe(g_Players[message.guildId]);

	message.author.send(`I have joined you in ${message.member.voice.channel.name}. Message me here and I'll read it aloud for you.`);
	
	return true;
}

function createReplyFunc(message) {

	if(message.channel.type == "dm")
		return (output: string) => {message.author.send(output)};

	return (output: string) => {message.reply(output)};
}

async function findConnectionForAuthor(author: User) {

	let voiceConnections = DSVoice.getVoiceConnections();
	for(let currConn of voiceConnections.values()) {

		let guild = await g_Client.guilds.fetch(currConn.joinConfig.guildId);
		let member = await guild.members.fetch(author);
		if(!member)
			continue;

		if(currConn.joinConfig.channelId == member.voice.channelId)
			return currConn;

	}

	return null;
}

function queueNewSpeak(connection: DSVoice.VoiceConnection, text: string, language: string, gender: string, onError) {

	g_QProcessor.addToQueue(connection.joinConfig.guildId, {
		connection: connection,
		text: text,
		language: language,
		gender: gender
	});
}

function onProcessNextSpeak(item, next) {

	speakOnConnectionWave(item, next, (err) => {
		console.log(err.message);
	});
}

function speakOnConnectionWave(params: QueueItem, onFinish, onError) {

	const reqBodyObject = {
		"input": {
			"text": params.text,
		},
		"voice": {
			"languageCode": params.language,
			"ssmlGender": params.gender
		},
		"audioConfig": {
			"audioEncoding": process.env.AUDIO_CODEC
		}
	};

	const reqBodyString = JSON.stringify(reqBodyObject);

	const options = {
		hostname: 'texttospeech.googleapis.com',
		path: `/v1beta1/text:synthesize?key=${process.env.GOOGLE_CLOUD_KEY}`,
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		}
	};
	
	const req = request(options, res => {

		var jsonResBody = "";
		
		res.on('data', (d) => {
			jsonResBody += d;
		});

		res.on('end', () => {
			
			var objResBody = JSON.parse(jsonResBody);
			var audioBuffer = Buffer.from(objResBody.audioContent, 'base64');

			const readable = new Readable();
			readable._read = () => {};
			readable.push(audioBuffer);
			readable.push(null);

			let newAudio = DSVoice.createAudioResource(readable, {
				inputType: DSVoice.StreamType.Arbitrary
			});

			g_Players[params.connection.joinConfig.guildId].play(newAudio);

			if(onFinish) onFinish();

		});

	});
	
	req.on('error', error => {

		if(onError)
			onError(error);

	});
	
	req.write(reqBodyString);
	req.end();
}