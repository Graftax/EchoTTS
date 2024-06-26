import { Channel, Client, Events } from "discord.js";
import { Singleton as DataStorage } from "./DataStorage.js";
import { Scenario, IScenarioConstructor, IScenario } from "./Scenario.js";
import ScenarioIndex from "./index/scenarios.js";
import { channel } from "diagnostics_channel";

function createScenarioHandle(channelID: string, sceneStructor: IScenarioConstructor) {
	return `${channelID}!${sceneStructor.name}`;
}

function extractFromHandle(input: string) {
	
	let res = /(\w*)!(\w*)$/.exec(input);

	if(!res)
		return { channelID: undefined, className: undefined };

	if(res.length < 3)
		return { channelID: undefined, className: undefined };

	return { channelID: res[1], className: res[2] };
}

const ScenarioPath = "system/scenarios";
function getScenarioDBPath(channelID: string, sceneStructor: IScenarioConstructor) {
	return `${ScenarioPath}/${createScenarioHandle(channelID, sceneStructor)}`;
}

//
export class ScenarioManager {

	private _client: Client;
	private _scenarios: Map<string, Array<IScenario>> = new Map();

	constructor(client: Client) {

		this._client = client;

		this._client.on(Events.ClientReady, (client) => {

			if(!DataStorage)
				return;

			let persistantScenarios = DataStorage.findItemsByID("system/scenarios");

			persistantScenarios.forEach(async (value, key) => {
	
				let {channelID, className} = extractFromHandle(key);
				if(!channelID || !className)
					return;

				const allScenarioTypes = Array.from(ScenarioIndex);
				const foundConstructor = allScenarioTypes.find(currType => currType.name == className);
				if(!foundConstructor)
					return;

				client.channels.fetch(channelID)
					.then(channel => this.startScenario(foundConstructor, channel!))
					.catch(reason => this.removeScenario(channelID, foundConstructor))
	
			});

		});

	}

	// Puts scenario in to map
	private pushScenario(channelID: string, toAdd: IScenario) {

		if(!this._scenarios.has(channelID))
			this._scenarios.set(channelID, new Array<Scenario>());

		this._scenarios.get(channelID)?.push(toAdd);

	}

	// Removes scenario from map
	private removeScenario(channelID: string, sceneStructor: IScenarioConstructor) {

		// Removed saved data if its going away.
		const dbPath = getScenarioDBPath(channelID, sceneStructor);
		DataStorage?.deleteItem(dbPath);

		const channelScenarios = this._scenarios.get(channelID);
		if(!channelScenarios)
			return;

		let filtered = channelScenarios.filter((value) => {
			return value.builder != sceneStructor;
		});

		this._scenarios.set(channelID, filtered);

		if(filtered.length <= 0)
			this._scenarios.delete(channelID);
	}

	startScenario(scenarioConstructor: IScenarioConstructor, channel: Channel): IScenario | undefined {

		if(!this._client)
			return undefined;

		const foundScenario = this.getScenario(scenarioConstructor, channel);
		if(foundScenario)
			return foundScenario;

		console.log(`Starting ${scenarioConstructor.name} in ${channel}`);
		
		let freshScenario: IScenario = new scenarioConstructor(channel, this._client,

			() => { // Shutdown

				freshScenario.shutdown();
				this.removeScenario(channel.id, freshScenario.builder);
				DataStorage?.deleteItem(getScenarioDBPath(channel.id, freshScenario.builder));

			},

			(toSave) => { // Save

				DataStorage?.setProperty(getScenarioDBPath(channel.id, freshScenario.builder), "data", toSave);

			},

			() => { // Load

				if(!DataStorage) return undefined;

				let prop = DataStorage.getProperty(getScenarioDBPath(channel.id, freshScenario.builder), "data");
				if(!prop) return undefined;

				return prop;
			}

		);

		this.pushScenario(channel.id, freshScenario);
		
		if(freshScenario.isPersistant && DataStorage) {
			const dbPath = getScenarioDBPath(channel.id, freshScenario.builder);
			let item = DataStorage.getItem(dbPath);
			DataStorage.setItem(dbPath, item != undefined ? item : {});
		}

		freshScenario.init();

		return freshScenario;
	}

	getScenario(classParameter: IScenarioConstructor, channel: Channel): IScenario | undefined {

		let channelScenarios = this._scenarios.get(channel.id);
		if(!channelScenarios?.length)
			return undefined;

		const foundScenario = channelScenarios.find(sce => sce.builder == classParameter);
		return foundScenario;
	}
	
}

let Singleton: ScenarioManager | null = null;

function Create(client: Client) {
	Singleton = new ScenarioManager(client);
}

export { Singleton, Create }