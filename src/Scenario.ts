import { Channel, Client } from "discord.js";
import { PropValue } from "./DataStorage.js";


export abstract class Scenario {

	protected _channel: Channel = null;
	protected _client: Client = null;

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

}

