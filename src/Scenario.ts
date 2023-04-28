import { Channel, Client } from "discord.js";
import { PropValue } from "./DataStorage.js";


export abstract class Scenario {

	end: () => void = null;
	save: (toSave: PropValue) => void = null;
	load: () => PropValue = null;

	init(channel: Channel, client: Client) : void {

	};

	shutdown() : void {

	};

	isPersistant(): boolean {
		return false;
	};

}

