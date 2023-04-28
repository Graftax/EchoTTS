import { Scenario } from "../Scenario.js";
import { Channel, Client } from "discord.js";
import { setTimeout } from "timers/promises";

export default class Timer extends Scenario {

	end = null;

	init(channel: Channel, client: Client) {
		setTimeout(5000).then(() => { this.end() }); 
	}

	shutdown() {

	}
	
}