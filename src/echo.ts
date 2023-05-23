import dotenv from 'dotenv';
if (process.env.NODE_ENV !== 'production')
	dotenv.config();

import { Client, Events, GatewayIntentBits, Partials } from 'discord.js';
import { Singleton as Commander } from './Commander.js';
import { Singleton as DataStorage } from './DataStorage.js';
import { Singleton as ScenarioManager } from './ScenarioManager.js';
import { Singleton as MovieDBProvider } from './MovieDBProvider.js';
import IterativeSort from './IterativeSort.js';

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
DataStorage.init("db.json", 1);
ScenarioManager.init(g_Client);

// Client event hooks
// =============================================================================
g_Client.on(Events.ClientReady, async () => {

	g_Client.user.setPresence({
		status: "online",
		afk: false
	});

});

g_Client.on(Events.InteractionCreate, async (interaction) => {
	Commander.exec(interaction);
});

interface TestFace {
	rank: number
}

let someStuff = Array<TestFace>();

for(let i = 0; i < 5; ++i) {

	someStuff.push({
		rank: i + (Math.random() * 10)
	});

}

let stepCount = 0;
IterativeSort(someStuff, 3, (set, resolve) => {
	
	let bestIndex = 0;
	let bestValue = Number.MAX_VALUE;

	set.forEach((currItem, index) => {

		if(currItem.rank < bestValue) {
			bestIndex = index;
			bestValue = currItem.rank;
		}

	});

	stepCount++;
	resolve(bestIndex);

}).then((sorted) => {
	console.log(`${sorted.length}, ${stepCount}`);
});

//Commander.registerCommands();

// Start the client
// =============================================================================
//g_Client.login(process.env.DISCORD_TOKEN);

