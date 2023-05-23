import { Scenario } from "../Scenario.js";
import { Channel, Client } from "discord.js";
import Lt from "long-timeout";

const hoursToMs = 3600000;

// Creator can add or remove Nominations
// Polling Ends and Result is Announced

// Add command to start voting. 
// Add command to end voting.
// Add command to vote - This is gonna be a thing.

export interface Nominee {
	name: string,
	img_url: string
	url: string,
	nominator: string
}

interface SaveState {
	items: { [key: string]: Nominee }
	voteTime: string,
	endTime: string,
	isVoting: boolean
}

export default class Poll extends Scenario {

	private _channel: Channel = null;
	private _client: Client = null;
	private _isVoting = false;

	private _nominees: Map<string, Nominee> = new Map;

	private _voteTime = new Date(0);
	private _voteTimeout: Lt.Timeout = null;

	private _endTime = new Date(0);
	private _endTimeout: Lt.Timeout = null;

	private _votes: Map<string, Array<string>> = new Map;

	constructor(hoursBeforeVote: number = undefined, hoursVoting: number = undefined) {
		super();

		if(hoursBeforeVote == undefined)
			return;

		this._voteTime = new Date(Date.now() + (hoursBeforeVote * hoursToMs));

		if(hoursVoting == undefined)
			return;

		this._endTime = new Date(this._voteTime.getTime() + (hoursVoting * hoursToMs));

	}

	init(channel: Channel, client: Client) {
		this._channel = channel;
		this._client = client;

		this.loadState();
		this.saveState();

		this.updateVoteTimeout();
		this.updateEndTimeout();
	}

	shutdown() {
	
		if(this._voteTimeout)
			Lt.clearTimeout(this._voteTimeout);

		if(this._endTimeout)
			Lt.clearTimeout(this._endTimeout);
	}

	isPersistant() {
		return true;
	}

	private onVoteTimeout = () => {

		if(this._isVoting)
			return;

		this._isVoting = true;
		this.saveState();
		console.log("onVoteTimeout");

	}

	private onEndTimeout = () => {

		console.log("onEndTimeout");
		this.end();

	}

	private saveState() {

		this.save({
			items: Object.fromEntries(this._nominees),
			voteTime: this._voteTime.toISOString(),
			endTime: this._endTime.toISOString(),
			isVoting: this._isVoting
		} as SaveState);

	}

	private loadState() {

		let state = this.load() as SaveState;

		if(state.items !== undefined)
			this._nominees = new Map(Object.entries(state.items));

		if(state.voteTime !== undefined)
			this._voteTime = new Date(state.voteTime);
		
		if(state.endTime !== undefined)
			this._endTime = new Date(state.endTime);

		if(state.isVoting !== undefined)
			this._isVoting = state.isVoting;
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

		if(this._isVoting)
			return;

		if(!this.canAddNom(uid, toAdd))
			return;

		this._nominees.set(uid, toAdd);
		this.saveState();

	}

	removeNominee(uid: string) {

		if(this._isVoting)
			return;

		this._nominees.delete(uid);
		this.saveState();

	}

	getNomineeList() : { [key: string]: Nominee } {
		return Object.fromEntries(this._nominees);
	}

	setVoteTime(time: Date) {

		this._voteTime = time;
		this.saveState();
		this.updateVoteTimeout();

	}

	setEndTime(time: Date) {

		this._endTime = time;
		this.saveState();
		this.updateEndTimeout();

	}

	private updateVoteTimeout() {

		let timeToVote = this._voteTime.getTime() - Date.now();
			
		if(this._voteTimeout)
			Lt.clearTimeout(this._voteTimeout);

		this._voteTimeout = Lt.setTimeout(this.onVoteTimeout, timeToVote);

	}
	
	private updateEndTimeout() {

		let timeToEnd = this._endTime.getTime() - Date.now();

		if(this._endTimeout)
			Lt.clearTimeout(this._endTimeout);

		this._endTimeout = Lt.setTimeout(this.onEndTimeout, timeToEnd);

	}

	setVote(userID: string, ranks: Array<string>) {

		this._votes.set(userID, ranks);

	}

}