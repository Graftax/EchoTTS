import { Channel, Client } from "discord.js";
import { Singleton as DataStorage } from "./DataStorage.js";

export interface Scenario {

	init(channel: Channel, client: Client) : void;
	shutdown() : void;
	end: () => void;
	
}

interface ScenarioData {
	
}

export class ScenarioManager {

	private _client: Client = null;
	private _scenarios: Map<string, Array<Scenario>> = new Map();

	constructor() {

	}

	init(client: Client) {

		this._client = client;
		//let scenarioData = DataStorage.getAll("system/scenarios");


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
			this.removeScenario(channel.id, toStart);
		};

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