import { Scenario } from "../Scenario.js";
import { Channel, Client } from "discord.js";



// Create Poll
// Creator can add or remove Nominations
// Open Nominations - Time is set for this to end
// Nominations End and Polling Begins
// Polling Ends and Result is Announced

enum State {
	Nominating,
	Voting,
	Closed,
}

export default class Poll extends Scenario {

	private _channel: Channel = null;
	private _client: Client = null;
	private _state = State.Nominating;

	init(channel: Channel, client: Client) {
		this._channel = channel;
		this._client = client;
	}

	shutdown() {
	
	}

	isPersistant() {
		return true;
	}
	

	addNominee(title: string, imgUrl: string, url: string) {

	}

}