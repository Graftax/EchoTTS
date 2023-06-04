import { Channel, Client } from "discord.js";
import { PropValue } from "./DataStorage.js";


export abstract class Scenario {

	private _channel: Channel = null;
	private _client: Client = null;

	end: () => void = null;
	save: (toSave: PropValue) => void = null;
	load: () => PropValue = null;

	init(channel: Channel, client: Client) : void {
		this._channel = channel;
		this._client = client;
	};

	shutdown() : void {

	};

	isPersistant(): boolean {
		return false;
	};

	channel(): Channel {
		return this._channel;
	}

	client(): Client {
		return this._client;
	}

}

