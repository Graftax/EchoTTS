import dotenv from 'dotenv';
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const rawLanguages = JSON.parse(process.env.LANGUAGES) as Array<string>;
const languages = [...rawLanguages].sort();

import { request } from 'https';
import { Readable } from 'stream';
import { Client, Events, User, Message, ActivityType, VoiceState, GatewayIntentBits, ChannelType, Partials } from 'discord.js';

import * as DSVoice from '@discordjs/voice';
import Commander from './Commander.js';
import DataStorage from './DataStorage.js';
import MultiQueueProcessor from './MultiQueueProcessor.js';
import { createDiscordJSAdapter } from './adapter.js';

interface QueueItem {
	connection: DSVoice.VoiceConnection,
	text: string,
	language: string,
	gender: string
}

// Construct Core Classes
// =============================================================================
const g_Commander = new Commander();
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

const g_QProcessor = new MultiQueueProcessor<QueueItem>(onProcessNextSpeak);
const g_Players: Map<string, DSVoice.AudioPlayer> = new Map();

const g_Storage = new DataStorage("users-db.json", 1);
g_Storage.setDefaults({
	"gender": "FEMALE",
	"language": "en-US"
});

// Command Registration
// =============================================================================
g_Commander.registerCommand("help", (args, cabinet, reply) => {
	
	let cmdList = g_Commander.getCommandList();
	let output: string = "Commands I support in DMs:\n";

	cmdList.forEach(cmdName => {
		output += `\t${cmdName}\n`; 
	});

	output += "If you dont know what a command does, try running it by itself.\n"

	reply(output);

});

g_Commander.registerCommand("tutorial", (args, cabinet, reply) => {	
	reply("While you are connected to a voice channel, @mention me on the same server and I will join you. Once I'm in a channel with you, send me a DM and I will read it out loud. Feel free to disconnect me when you don't need me anymore.");
});

g_Commander.registerCommand("settings", (args, cabinet, reply) => {
	reply("Your settings:\n" + JSON.stringify(g_Storage.getAll(cabinet.author.id), null, 4));
});

g_Commander.registerCommand("gender", (args, cabinet, reply) => {

	if(args.length < 1) {
		reply("That command lets you set your voice gender.\nOptions:\n\tmale\n\tfemale\nExample: !gender male");
		return;
	}

	if(args[0].toLowerCase() == "male") {
		g_Storage.set(cabinet.author.id, "gender", "MALE");
		reply("I have set your voice gender to 'MALE'.");
		return;
	}

	if(args[0].toLowerCase() == "female") {
		g_Storage.set(cabinet.author.id, "gender", "FEMALE");
		reply("I have set your voice gender to 'FEMALE'.");
		return;
	}

	reply("I'm not sure which gender you wanted; I only support 'male' or 'female' right now.");
});

g_Commander.registerCommand("language", (args, cabinet, reply) => {

	if(args.length < 1) {

		let langOptions = "Options:\n";
		languages.forEach((lang) => {
			langOptions += `\t${lang}\n`;
		});

		reply(`That command lets you change your voice language.\n${langOptions}Example: !language en-US`);
		return;
	}

	const found = languages.find((lang) => {
		return lang.toLowerCase() == args[0].toLowerCase();
	});

	if(found) {
		g_Storage.set(cabinet.author.id, "language", found);
		reply(`I have set your voice language to '${found}'.`);
		return;
	}

	reply("Im not sure which language you wanted.");

});

g_Commander.registerCommand("shutup", async (args, cabinet, reply) => {

	let currConnection = await findConnectionForAuthor(cabinet.author);

	if(!currConnection) {
		reply("I don't see you in any voice channels I'm in.");
		return;
	}

	g_QProcessor.clearQueue(currConnection.joinConfig.guildId);

	queueNewSpeak(currConnection, `${cabinet.author.username} told me to shut up.`,
		g_Storage.get(cabinet.author.id, "language") as string,
		g_Storage.get(cabinet.author.id, "gender") as string, 
		(err) => { reply("An error has occured, make sure Graftax sees this: " + err.message); 
	});

});

// Client event hooks
// =============================================================================
g_Client.on(Events.ClientReady, async () => {
	updatePresence();
});

g_Client.on(Events.MessageCreate, async (message) => {
	if (message.author.bot) 
		return;

	const replyFunc = createReplyFunc(message);

	if(checkMentionsAndJoin(message, replyFunc))
		return;

	if(message.channel.type != ChannelType.DM)
		return;

	let cabinet = {
			author: message.author,
			member: message.member
	};

	let bDidRunCmd : boolean = g_Commander.exec(
		message.content, 
		cabinet,
		replyFunc);
		
	if(bDidRunCmd) {
		return;
	}

	let currConnection = await findConnectionForAuthor(message.author);

	if(!currConnection) {
		replyFunc("I don't see you in any voice channels I'm in. Try sending me '!help'.");
		return;
	}

	queueNewSpeak(currConnection, message.content,
		g_Storage.get(message.author.id, "language") as string,
		g_Storage.get(message.author.id, "gender") as string, 
		(err) => { replyFunc("An error has occured, make sure Graftax sees this: " + err.message); 
	});

});

g_Client.on(Events.VoiceStateUpdate, async (oldState: VoiceState, newState: VoiceState) => {

	// If the user was not in a channel before, do nothing.
	if(!oldState.channel)
		return;

	// If the user stayed in the same channel, do nothing.
	if(newState.channel && oldState.channel.id == newState.channel.id)
		return;

	let connection = DSVoice.getVoiceConnection(oldState.guild.id);
	if(!connection)
		return;

	// We are connected, and there is only 1 user left, so it must be us. Lets
	// leave since there is no point in hanging around an empty channel.
	let guild = await g_Client.guilds.fetch(oldState.guild.id);

	if(oldState.channel.members.size == 1)
		connection.destroy();

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