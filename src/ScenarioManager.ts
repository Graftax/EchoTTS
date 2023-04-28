import { Channel, Client, Events } from "discord.js";
import { Singleton as DataStorage } from "./DataStorage.js";
import { Scenario } from "./Scenario.js";
import ScenarioIndex from "./index/scenarios.js";

function getScenarioID(channelID: string, toSave: Scenario) {
	return `${channelID}!${toSave.constructor.name}`;
}

function getScenarioDBPath(channelID: string, toSave: Scenario) {
	return `system/scenarios/${getScenarioID(channelID, toSave)}`;
}

export class ScenarioManager {

	private _client: Client = null;

	// TODO: Refactor this so that the key is a compound string
	// that maps to each individual scenario. It can even be 
	// like an isntance id. {channelid}!{classname}
	// Should I support multiple of the same scenario in the 
	// same channel? Probably Not.
	private _scenarios: Map<string, Array<Scenario>> = new Map();

	constructor() {

	}

	init(client: Client) {

		this._client = client;

		let scenarioData = DataStorage.getAll("system/scenarios");

		for(let propName in scenarioData) {

			let split = propName.split("!");
			if(split.length != 2)
				continue;

			client.on(Events.ClientReady, (client) => {

				client.channels.fetch(split[0]).then((channel) => {
					this.startScenario(channel, new ScenarioIndex[split[1]]);
				});

			});

		}
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

		if(this._scenarios[channelID].length <= 0)
			this._scenarios.delete(channelID);
	}

	startScenario(channel: Channel, toStart: Scenario): boolean {

		if(!this._client)
			return false;

		if(this.getScenario(channel, toStart.constructor.name))
			return false;

		console.log(`Starting ${toStart.constructor.name} in ${channel}`);
		this.pushScenario(channel.id, toStart);

		if(toStart.isPersistant())
			DataStorage.set(getScenarioDBPath(channel.id, toStart), "persist", true);

		toStart.end = () => {
			console.log(`Ending ${toStart.constructor.name} in ${channel}`);
			toStart.shutdown();

			if(toStart.isPersistant())
				DataStorage.set(getScenarioDBPath(channel.id, toStart), "persist", false);

			this.removeScenario(channel.id, toStart);
			DataStorage.set(getScenarioDBPath(channel.id, toStart), "data", {});
		}; // end = ()

		toStart.save = (toSave) => {
			DataStorage.set(getScenarioDBPath(channel.id, toStart), "data", toSave);
		}; // save = (toSave)

		toStart.load = () => {
			return DataStorage.get(getScenarioDBPath(channel.id, toStart), "data");
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