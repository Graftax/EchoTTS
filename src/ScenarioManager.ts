import { Channel, Client, Events } from "discord.js";
import { Singleton as DataStorage } from "./DataStorage.js";
import { Scenario } from "./Scenario.js";
import ScenarioIndex from "./index/scenarios.js";

function createScenarioHandle(channelID: string, toSave: Scenario) {
	return `${channelID}!${toSave.constructor.name}`;
}

function extractFromHandle(input: string) {
	
	let res = /(\w*)!(\w*)$/.exec(input);
	if(res.length < 3)
		return undefined;

	return { channelID: res[1], className: res[2] };
}

const ScenarioPath = "system/scenarios";
function getScenarioDBPath(channelID: string, toSave: Scenario) {
	return `${ScenarioPath}/${createScenarioHandle(channelID, toSave)}`;
}

export class ScenarioManager {

	private _client: Client = null;
	private _scenarios: Map<string, Array<Scenario>> = new Map();

	constructor() {

	}

	init(client: Client) {

		this._client = client;

		let persistantScenarios = DataStorage.findItemsByID("system/scenarios");

		persistantScenarios.forEach((value, key) => {

			let {channelID, className} = extractFromHandle(key);

			client.on(Events.ClientReady, (client) => {

				client.channels.fetch(channelID).then((channel) => {
					this.startScenario(channel, new ScenarioIndex[className]);
				});

			});

		});
	}

	// Puts scenario in to map
	private pushScenario(channelID: string, toAdd: Scenario) {

		if(!this._scenarios.has(channelID))
			this._scenarios.set(channelID, new Array<Scenario>());

		this._scenarios.get(channelID).push(toAdd);

	}

	// Removes scenario from map
	private removeScenario(channelID: string, toRemove: Scenario) {

		if(!this._scenarios.has(channelID))
			return;

		let filtered = this._scenarios.get(channelID).filter((value) => {
			return value != toRemove;
		});

		this._scenarios.set(channelID, filtered);

		if(this._scenarios.get(channelID).length <= 0)
			this._scenarios.delete(channelID);
	}

	startScenario(channel: Channel, toStart: Scenario): boolean {

		if(!this._client)
			return false;

		if(this.getScenario(channel, toStart.constructor.name))
			return false;

		console.log(`Starting ${toStart.constructor.name} in ${channel}`);
		this.pushScenario(channel.id, toStart);

		const newScenarioPath = getScenarioDBPath(channel.id, toStart);

		if(toStart.isPersistant()) {
			let item = DataStorage.getItem(newScenarioPath);
			DataStorage.setItem(newScenarioPath, item != undefined ? item : {});
		}

		toStart.end = () => {
			console.log(`Ending ${toStart.constructor.name} in ${channel}`);
			toStart.shutdown();
			
			this.removeScenario(channel.id, toStart);
			DataStorage.deleteItem(newScenarioPath);
		}; // end = ()

		toStart.save = (toSave) => {
			DataStorage.setProperty(newScenarioPath, "data", toSave);
		}; // save = (toSave)

		toStart.load = () => {
			return DataStorage.getProperty(newScenarioPath, "data");
		}; // load = ()

		toStart.init(channel, this._client);

		return true;
	}

	getScenario(channel: Channel, scenarioName: string): Scenario | null {

		let scenario = this._scenarios.get(channel.id);
		if(!scenario)
			return null;

		let filtered = scenario.filter((value) => {
			return value.constructor.name == scenarioName;
		});

		if(filtered.length <= 0)
			return null;

		return filtered[0];
	}
	
}

let Singleton = new ScenarioManager;
export { Singleton }