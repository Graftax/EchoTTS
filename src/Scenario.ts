import { Channel, Client } from "discord.js";
import { PropValue } from "./DataStorage.js";

export type EndFunc = () => void;
export type SaveFunc = (p: PropValue) => void;
export type LoadFunc = () => PropValue | undefined;

export interface IScenarioConstructor {
	new (channel: Channel, client: Client, end: EndFunc, save: SaveFunc, load: LoadFunc) : IScenario;
}

export interface IScenario {

	init() : void;
	shutdown() : void;

	get name(): string;
	get isPersistant(): boolean;
	get channel(): Channel;
	get client(): Client;

}

export abstract class Scenario implements IScenario {

	private _channel: Channel;
	private _client: Client;

	public end: EndFunc;
	protected save: SaveFunc;
	protected load: LoadFunc;

	constructor(channel: Channel, client: Client, 
		end: EndFunc, save: SaveFunc, load: LoadFunc)
	{
		this._channel = channel;
		this._client = client;
		this.end = end;
		this.save = save;
		this.load = load;
	}

	abstract get name(): string;

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

}

