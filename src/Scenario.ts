import { Channel, Client } from "discord.js";

export interface Scenario {

	init(channel: Channel, client: Client) : void;
	shutdown() : void;
	end: () => void;
	
}

export class ScenarioManager {

	private _client: Client = null;
	private _scenarios: Map<string, Array<Scenario>> = new Map();

	constructor() {

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

	setClient(client: Client) {
		this._client = client;
	}

	startScenario(channel: Channel, toStart: Scenario): boolean {

		if(!this._client)
			return false;

		this.addScenario(channel.id, toStart);

		toStart.end = () => {
			toStart.shutdown();
			this.removeScenario(channel.id, toStart);
		};

		toStart.init(channel, this._client);

		return true;
	}
	
}

let Singleton = new ScenarioManager;
export { Singleton }