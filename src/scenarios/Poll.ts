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

export interface Nominee {
	name: string,
	img_url: string
	url: string,
	nominator: string
}

export default class Poll extends Scenario {

	private _channel: Channel = null;
	private _client: Client = null;
	private _state = State.Nominating;
	private _nominees: Map<string, Nominee> = new Map;

	init(channel: Channel, client: Client) {
		this._channel = channel;
		this._client = client;
	}

	shutdown() {
	
	}

	isPersistant() {
		return true;
	}
	
	private canAddNom(uid: string, toAdd: Nominee) : boolean {

		if(this._nominees.has(uid))
			return false;

		for(let [key, value] of this._nominees) {

			if(value.nominator == toAdd.nominator)
				return false;
		}

		return true;
	}

	addNominee(uid: string, toAdd: Nominee) {

		if(!this.canAddNom(uid, toAdd))
			return;

		this._nominees.set(uid, toAdd);
	}

	removeNominee(uid: string) {

	}

}