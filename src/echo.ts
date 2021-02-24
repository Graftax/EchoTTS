const { discordToken, googleCloudKey, audioCodec, languages } = require('../config.json');
const sortedLanguages = [...languages].sort();

const { Readable } = require('stream');
const https = require('https');
const Discord = require('discord.js');
import Commander from './Commander';
import DataStorage from './DataStorage';
import MultiQueueProcessor from './MultiQueueProcessor';

// Construct Core Classes
// =============================================================================
const g_Commander = new Commander();
const g_Client = new Discord.Client();
const g_QProcessor = new MultiQueueProcessor(onProcessNextSpeak);
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
		sortedLanguages.forEach((lang) => {
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

g_Commander.registerCommand("shutup", (args, cabinet, reply) => {

	let currConnection = findConnectionForAuthor(cabinet.author);

	if(!currConnection) {
		reply("I don't see you in any voice channels I'm in.");
		return;
	}

	g_QProcessor.clearQueue(currConnection.channel.id);

	queueNewSpeak(currConnection, `${cabinet.author.username} told me to shut up.`,
		g_Storage.get(cabinet.author.id, "language"),
		g_Storage.get(cabinet.author.id, "gender"), 
		(err) => { reply("An error has occured, make sure Graftax sees this: " + err.message); 
	});

});

// Client event hooks
// =============================================================================
g_Client.on('ready', () => {
	updatePresence();
});

g_Client.on('message', message => {

	if (message.author.bot) 
		return;

	const replyFunc = createReplyFunc(message);

	if(checkMentionsAndJoin(message, replyFunc))
		return;

	if(message.channel.type != "dm")
		return;

	let cabinet = {
			author: message.author,
			member: message.member
	};

	let bDidRunCmd : boolean = g_Commander.exec(
		message.content, 
		cabinet,
		replyFunc);
		
	if(bDidRunCmd) 
		return;

	let currConnection = findConnectionForAuthor(message.author);

	if(!currConnection) {
		replyFunc("I don't see you in any voice channels I'm in. Try sending me '!help'.");
		return;
	}

	queueNewSpeak(currConnection, message.content,
		g_Storage.get(message.author.id, "language"),
		g_Storage.get(message.author.id, "gender"), 
		(err) => { replyFunc("An error has occured, make sure Graftax sees this: " + err.message); 
	});

});

g_Client.on('voiceStateUpdate', (oldState, newState) => {

	// If the user was not in a channel before, do nothing.
	if(!oldState.channel)
		return;

	// If the user stayed in the same channel, do nothing.
	if(newState.channel && oldState.channel.id == newState.channel.id)
		return;

	let connection = g_Client.voice.connections.find((connection) => {
		return connection.channel.id == oldState.channel.id;
	});

	if(!connection)
		return;
	
	// We are connected, and there is only 1 user left, so it must be us. Lets
	// leave since there is no point in hanging around an empty channel.
	if(connection.channel.members.size == 1)
		connection.disconnect();

});

// Start the client
// =============================================================================
g_Client.login(discordToken);

// Utility Functions
// =============================================================================
function updatePresence() {

	let count : number = g_Client.voice.connections.size;
	g_Client.user.setPresence({ 
		activity: { 
			name: `sounds in ${count} channel${count == 1 ? "" : "s"}.`
		}, status: 'online' 
	});

}

function checkMentionsAndJoin(message, reply) {

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

	message.member.voice.channel.join().then((connection) => {

		updatePresence();

		connection.on("disconnect", () => {
			g_QProcessor.clearQueue(connection.channel.id);
			updatePresence();
		});

		message.author.send(`I have joined you in ${connection.channel.name}. Message me here and I'll read it aloud for you.`)
	
	});

	return true;
}

function createReplyFunc(message) {

	if(message.channel.type == "dm")
		return (output: string) => {message.author.send(output)};

	return (output: string) => {message.reply(output)};
}

function findConnectionForAuthor(author) {

	return g_Client.voice.connections.find((connection) => {
		return connection.channel.members.has(author.id);
	});

}

function queueNewSpeak(connection, text, language, gender, onError) {

	g_QProcessor.addToQueue(connection.channel.id, {
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

function speakOnConnectionWave(params, onFinish, onError) {

	const reqBodyObject = {
		"input": {
			"text": params.text,
		},
		"voice": {
			"languageCode": params.language,
			"ssmlGender": params.gender
		},
		"audioConfig": {
			"audioEncoding": audioCodec
		}
	};

	const reqBodyString = JSON.stringify(reqBodyObject);

	const options = {
		hostname: 'texttospeech.googleapis.com',
		path: `/v1beta1/text:synthesize?key=${googleCloudKey}`,
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		}
	};
	
	const req = https.request(options, res => {

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

			params.connection.play(readable).on("speaking", (value: boolean) => {
				if(!value && onFinish) onFinish();
			});

		});

	});
	
	req.on('error', error => {

		if(onError)
			onError(error);

	});
	
	req.write(reqBodyString);
	req.end();
}