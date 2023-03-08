import { Scenario } from "../Scenario";
import { Channel, Client } from "discord.js";
import { setTimeout } from "timers/promises";

export default class Timer implements Scenario {

	end = null;

	init(channel: Channel, client: Client) {
		console.log("Timer::init");
		setTimeout(5000).then(() => { this.end() }); 
	}

	shutdown() {
		console.log("Timer::shutdown");
	}
}