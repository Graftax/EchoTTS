import { Channel, Client } from "discord.js";
import { PropValue } from "./DataStorage.js";

export type ScenarioControls = {

	End: () => void; 
	Save: (p: PropValue) => void;
	Load: () => PropValue | undefined;
	Clean: () => void;

}

export type IScenarioConstructor = {
	new (channel: Channel, client: Client, controls: ScenarioControls) : IScenario;
}

export interface IScenario {

	init() : void;
	shutdown() : void;

	get builder(): IScenarioConstructor;
	get isPersistant(): boolean;
	get channel(): Channel;
	get client(): Client;

}

export abstract class Scenario implements IScenario {

	private _channel: Channel;
	private _client: Client;
	private _controls: ScenarioControls;

	constructor(channel: Channel, client: Client, controls: ScenarioControls)
	{
		this._channel = channel;
		this._client = client;
		this._controls = controls;
	}

	get builder(): IScenarioConstructor {
		return Object.getPrototypeOf(this).constructor as IScenarioConstructor;
	}

	init() : void {
		
	};

	shutdown() : void {

	};

	get isPersistant(): boolean {
		return false;
	};

	get channel(): Channel {
		return this._channel;
	}

	get client(): Client {
		return this._client;
	}

	get controls(): ScenarioControls {
		return this._controls;
	}
}

