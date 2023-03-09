import dotenv from 'dotenv';
if (process.env.NODE_ENV !== 'production')
	dotenv.config();

import { Client, Events, ActivityType, GatewayIntentBits, Partials, TextChannel } from 'discord.js';
import * as DSVoice from '@discordjs/voice';
import { Singleton as Commander } from './Commander.js';
import { Singleton as DataStorage } from './DataStorage.js';
import { Singleton as ScenarioManager } from './Scenario.js';

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

DataStorage.init("users-db.json", 1, {
	"gender": "FEMALE",
	"language": "en-US"
});

// Client event hooks
// =============================================================================
g_Client.on(Events.ClientReady, async () => {
	updatePresence();
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