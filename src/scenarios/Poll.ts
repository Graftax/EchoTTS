import { Scenario } from "../Scenario";
import { Channel, Client } from "discord.js";
import { Singleton as DataStorage } from "../DataStorage.js";

export default class Poll implements Scenario {

	end = null;

	init(channel: Channel, client: Client) {

	}

	shutdown() {
	
	}
}