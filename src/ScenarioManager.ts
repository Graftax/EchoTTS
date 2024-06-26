import { Channel, Client, Events } from "discord.js";
import { Singleton as DataStorage } from "./DataStorage.js";
import { Scenario, IScenarioConstructor, IScenario } from "./Scenario.js";
import ScenarioIndex from "./index/scenarios.js";

function createScenarioHandle(channelID: string, toSave: IScenario) {
	return `${channelID}!${toSave.constructor.name}`;
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
function getScenarioDBPath(channelID: string, toSave: IScenario) {
	return `${ScenarioPath}/${createScenarioHandle(channelID, toSave)}`;
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

				const currChannel = await client.channels.fetch(channelID);
				if(!currChannel)
						return;

				this.startScenario(foundConstructor, currChannel);
	
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
	private removeScenario(channelID: string, toRemove: IScenario) {

		const channelScenarios = this._scenarios.get(channelID);
		if(!channelScenarios)
			return;

		let filtered = channelScenarios.filter((value) => {
			return value != toRemove;
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

			() => {
				console.log(`Ending ${scenarioConstructor.name} in ${channel}`);
				freshScenario.shutdown();
				
				this.removeScenario(channel.id, freshScenario);
				DataStorage?.deleteItem(getScenarioDBPath(channel.id, freshScenario));
			},

			(toSave) => {
				DataStorage?.setProperty(getScenarioDBPath(channel.id, freshScenario), "data", toSave);
			},

			() => {

				if(!DataStorage)
					return undefined;

				let prop = DataStorage.getProperty(getScenarioDBPath(channel.id, freshScenario), "data");
				if(!prop)
					return undefined;

				return prop;
			}

		);

		this.pushScenario(channel.id, freshScenario);
		
		if(freshScenario.isPersistant && DataStorage) {
			const dbPath = getScenarioDBPath(channel.id, freshScenario);
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

		const foundScenario = channelScenarios.find(sce => sce.name == classParameter.name);
		return foundScenario;
	}
	
}

let Singleton: ScenarioManager | null = null;

function Create(client: Client) {
	Singleton = new ScenarioManager(client);
}

export { Singleton, Create }