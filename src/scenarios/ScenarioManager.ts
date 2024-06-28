import { BaseChannel, Channel, Client, Events } from "discord.js";
import { Singleton as DataStorage } from "../DataStorage.js";
import { Scenario, IScenarioConstructor, IScenario } from "./Scenario.js";
import ScenarioIndex from "../index/scenarios.js";

export type ChannelID = typeof BaseChannel.prototype.id;

function system_persistance_(channelID: ChannelID) {
	return `system/persistance/${channelID}`;
}

function system_storage_(channelID: ChannelID) {
	return `system/storage/${channelID}`;
}

function parseChannelID(itemID: string) : ChannelID {
	return itemID.split('/').pop() ?? "";
}

export class ScenarioManager {

	private _client: Client;
	private _scenarios: Map<ChannelID, Array<IScenario>> = new Map();

	constructor(client: Client) {

		this._client = client;

		this._client.on(Events.ClientReady, (client) => {

			if(!DataStorage)
				return;

			let persistantScenarios = DataStorage.findItemsByID(system_persistance_(""));

			persistantScenarios.forEach((value, key) => {
	
				const currChannelID = parseChannelID(key);
				const allScenarioTypes = Array.from(ScenarioIndex);

				for(let className in value) {

					const foundConstructor = allScenarioTypes.find(currType => currType.name == className);
					if(!foundConstructor) {
						console.warn(`Could not find constructor for ${className}.`);
						continue;
					}

					client.channels.fetch(currChannelID)
						.then(channel => this.startScenario(foundConstructor, channel!))
						.catch(reason => this.removeScenario(currChannelID, foundConstructor));

				};
	
			});

		});

	}

	startScenario(scenarioConstructor: IScenarioConstructor, channel: Channel): IScenario | undefined {

		if(!this._client) return undefined;

		const foundScenario = this.getScenario(channel.id, scenarioConstructor);
		if(foundScenario) return foundScenario;
		
		if(!DataStorage) return undefined;

		console.log(`Starting ${scenarioConstructor.name} in ${channel}`);
		
		let freshScenario: IScenario = new scenarioConstructor(channel, this._client, {
			End: this.removeScenario.bind(this, channel.id, scenarioConstructor),
			Save: DataStorage.setProperty.bind(DataStorage, system_storage_(channel.id), scenarioConstructor.name),
			Load: DataStorage.getProperty.bind(DataStorage, system_storage_(channel.id), scenarioConstructor.name),
			Clean: DataStorage.deleteProperty.bind(DataStorage, system_storage_(channel.id), scenarioConstructor.name)
		});

		this.pushScenario(channel.id, freshScenario);
		
		if(freshScenario.isPersistant)
			DataStorage.setProperty(system_persistance_(channel.id), scenarioConstructor.name, true);

		freshScenario.init();

		return freshScenario;
	}

	// Puts scenario in to map
	private pushScenario(channelID: ChannelID, toAdd: IScenario) {

		let channelScenarios = this._scenarios.get(channelID) ?? [];
		channelScenarios.push(toAdd);
		this._scenarios.set(channelID, channelScenarios);
		
	}

	// Removes and shuts down scenario.
	removeScenario(channelID: ChannelID, sceneStructor: IScenarioConstructor) {

		console.log(`Removing ${sceneStructor.name} in <#${channelID}>`);

		// If the scenario exists, shut it down.
		const currScenario = this.getScenario(channelID, sceneStructor);
		if(currScenario) currScenario.shutdown();

		// Always try to delete persistance information.
		DataStorage?.deleteProperty(system_persistance_(channelID), sceneStructor.name);

		// Filter out any scenarios that were constructed with sceneStructor
		const channelScenarios = this._scenarios.get(channelID) ?? [];
		let filtered = channelScenarios.filter(value => value.builder != sceneStructor);
		this._scenarios.set(channelID, filtered);

		// If there are no scenarios for the channel, delete the collection.
		if(filtered.length <= 0)
			this._scenarios.delete(channelID);
	}

	getScenario(channelID: ChannelID, classParameter: IScenarioConstructor): IScenario | undefined {

		let channelScenarios = this._scenarios.get(channelID) ?? [];
		return channelScenarios.find(sce => sce.builder == classParameter);

	}
	
}

let Singleton: ScenarioManager | null = null;

function Create(client: Client) {
	Singleton = new ScenarioManager(client);
}

export { Singleton, Create }