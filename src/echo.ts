import dotenv from 'dotenv';
if (process.env.NODE_ENV !== 'production')
	dotenv.config();

import { Client, Events, GatewayIntentBits, Partials } from 'discord.js';
import { Singleton as Commander } from './commands/Commander.js';
import { Create as CreateDataStorageManager } from './DataStorage.js';
import { Create as CreateScenarioManager } from './scenarios/ScenarioManager.js';
import { Singleton as MovieDBProvider } from './MovieDBProvider.js';
import http from 'http';

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

await MovieDBProvider.init();
CreateDataStorageManager("db.json");
CreateScenarioManager(g_Client);

// Client event hooks
// =============================================================================
g_Client.on(Events.ClientReady, async () => {

	g_Client.user?.setPresence({
		status: "online",
		afk: false
	});

	// Health server.
	http.createServer(function (req, res) {
		res.writeHead(200, { 'Content-Type': 'text/plain' });
		res.write('OK');
		res.end();
	}).listen(3000);

});

g_Client.on(Events.InteractionCreate, Commander.exec.bind(Commander));
await Commander.registerCommands();

// Start the client
// =============================================================================
g_Client.login(process.env.DISCORD_TOKEN);



