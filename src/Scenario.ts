import { Channel, Client, Events } from "discord.js";
import { Singleton as DataStorage } from "./DataStorage.js";
import ScenarioIndex from "./index/scenarios.js";

export interface Scenario {

	init(channel: Channel, client: Client) : void;
	shutdown() : void;
	end: () => void;
	isPermanent: () => boolean;
	
}

interface ScenarioData {
	
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

	private addScenario(channelID: string, toAdd: Scenario) {

		if(!this._scenarios.has(channelID))
			this._scenarios.set(channelID, new Array<Scenario>());

		this._scenarios.get(channelID).push(toAdd);

	}

	private removeScenario(channelID: string, toRemove: Scenario) {

		if(!this._scenarios.has(channelID))
			return;

		let filtered = this._scenarios.get(channelID).filter((value) => {
			return value != toRemove;
		});

		if(filtered.length > 0)
			this._scenarios.set(channelID, filtered);
		else
			this._scenarios.delete(channelID);
	}

	private getScenarioID(channelID: string, toSave: Scenario) {
		return `${channelID}!${toSave.constructor.name}`;
	}

	private saveScenario(channelID: string, toSave: Scenario) {
		DataStorage.set("system/scenarios", this.getScenarioID(channelID, toSave), true);
	}

	private deleteScenario(channelID: string, toDelete: Scenario) {
		DataStorage.set("system/scenarios", this.getScenarioID(channelID, toDelete), false);
	}

	startScenario(channel: Channel, toStart: Scenario): boolean {

		if(!this._client)
			return false;

		if(this.getScenario(channel, toStart.constructor.name))
			return false;

		console.log(`Starting ${toStart.constructor.name} in ${channel}`);
		this.addScenario(channel.id, toStart);

		toStart.end = () => {
			console.log(`Stopping ${toStart.constructor.name} in ${channel}`);
			toStart.shutdown();

			if(toStart.isPermanent())
				this.deleteScenario(channel.id, toStart);

			this.removeScenario(channel.id, toStart);
		};

		if(toStart.isPermanent())
			this.saveScenario(channel.id, toStart);

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