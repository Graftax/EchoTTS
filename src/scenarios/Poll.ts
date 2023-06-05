import { Scenario } from "../Scenario.js";
import { Channel, Client, User } from "discord.js";
import Lt from "long-timeout";
import { off } from "process";

const hoursToMs = 3600000;

// Creator can add or remove Nominations
// Polling Ends and Result is Announced

// Add command to start voting. 
// Add command to end voting.
// Add command to vote - This is gonna be a thing.

export interface Nominee {
	id: string,
	name: string,
	img_url: string
	url: string,
	nominator: string
}

interface SaveState {
	creatorID: string,
	items: { [key: string]: Nominee }
	voteTime: string,
	endTime: string,
	isVoting: boolean,
	votes: [string, string[]][]
}

export default class Poll extends Scenario {

	private _isVoting = false;
	private _creatorID: string = null;

	private _nominees: Map<string, Nominee> = new Map;

	private _voteTime = new Date(0);
	private _voteTimeout: Lt.Timeout = null;

	private _endTime = new Date(0);
	private _endTimeout: Lt.Timeout = null;

	private _votes: Map<string, Array<string>> = new Map;

	constructor(creatorID: string, hoursBeforeVote: number, hoursVoting: number) {
		super();

		this._creatorID = creatorID;
		this._voteTime = new Date(Date.now() + (hoursBeforeVote * hoursToMs));
		this._endTime = new Date(this._voteTime.getTime() + (hoursVoting * hoursToMs));

	}

	init(channel: Channel, client: Client) {

		super.init(channel, client);

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

	isCreator(toCheck: User): boolean {
		return toCheck.id == this._creatorID;
	}

	isVoting(): boolean {
		return this._isVoting;
	}

	private onVoteTimeout = () => {

		if(this._isVoting)
			return;

		this._isVoting = true;
		this.saveState();
		
		let pollChannel = this.channel();
		if(pollChannel.isTextBased())
			pollChannel.send(`The nomination period has ended, you may now vote. Use \`/poll vote\`.`);

	}

	private onEndTimeout = () => {

		let bordaCount = this.doBordaCount();

		let channel = this.channel();
		if(bordaCount.size <= 0 && channel.isTextBased()) {
			this.end();
			return channel.send("Could not tally a winner; there were no votes.");
		}

		let sorted = sortMapToArray(bordaCount);
		let sortedItems = sorted.map((UID) => {
			return this._nominees.get(UID);
		});

		let maxPoints = (this._nominees.size - 1) * this._votes.size;
		let winner = sortedItems.splice(0, 1).at(0);
		sortedItems = sortedItems.splice(0, 25);
		let fields = sortedItems.map((currItem, index) => {

			let currCount = bordaCount.get(currItem.id);
			return {
				name: `${index + 2}. ${currItem.name}`,
				value: `${currCount} Points (${currCount / maxPoints * 100}%)`
			}

		});

		if(channel.isTextBased()) {

			let winnerCount = bordaCount.get(winner.id);
			channel.send({
				content: `The poll has finished.`,
				embeds: [{
					title: `**The winner is ${winner.name}!**`,
					description: `${winnerCount} (${winnerCount / maxPoints * 100}%)`,
					image: { url: winner.img_url },
					color: 0xd4af37
				}, {
					fields: fields,
					color: 0xaaa9ad
				}]
			});

		}

		this.end();

	}

	private saveState() {

		this.save({
			items: Object.fromEntries(this._nominees),
			voteTime: this._voteTime.toISOString(),
			endTime: this._endTime.toISOString(),
			isVoting: this._isVoting,
			creatorID: this._creatorID,
			votes: Array.from(this._votes.entries())
		} as SaveState);

	}

	private loadState() {

		let state = this.load() as SaveState;
		if(!state)
			return;

		this._nominees = new Map(Object.entries(state.items));
		this._voteTime = new Date(state.voteTime);
		this._endTime = new Date(state.endTime);
		this._isVoting = state.isVoting;
		this._creatorID = state.creatorID;
		this._votes = new Map(state.votes);
		
	}

	private canAddNom(uid: string, toAdd: Nominee) : boolean {

		if(this._nominees.has(uid))
			return false;

		// for(let [key, value] of this._nominees) {

		// 	if(value.nominator == toAdd.nominator)
		// 		return false;
		// }

		return true;
	}

	addNominee(toAdd: Nominee) {

		if(this._isVoting)
			return;

		if(!this.canAddNom(toAdd.id, toAdd))
			return;

		this._nominees.set(toAdd.id, toAdd);
		this.saveState();

	}

	removeNominee(uid: string) {

		if(this._isVoting)
			return;

		this._nominees.delete(uid);
		this.saveState();

	}

	getNomineeList() : Array<Nominee> {
		return Array.from(this._nominees.values());
	}

	setVoteTime(time: Date) {

		let offset = this._endTime.getTime() - this._voteTime.getTime();
		
		this._voteTime = time;
		this.saveState();
		this.updateVoteTimeout();

		this.setEndTime(new Date(this._voteTime.getTime() + offset));
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
		this.saveState();

	}

	doBordaCount() : Map<string, number> {

		let outMap = new Map<string, number>();

		this._votes.forEach((rankList) => {

			rankList.forEach((itemUID, index) => {

				if(!outMap.has(itemUID))
					outMap.set(itemUID, 0);
				
				let pointValue = this._nominees.size - (index + 1);
				outMap.set(itemUID, outMap.get(itemUID) + pointValue);

			});

		});

		return outMap;
	}

}

// Generated by ChatGPT ========================================================
function sortMapToArray(map: Map<string, number>) {
  // Create an array of key-value pairs from the map
  const entries = Array.from(map);

  // Sort the array based on the ranking values
  entries.sort((a, b) => b[1] - a[1]);

  // Extract the keys (IDs) into a new array
  const ids = entries.map(([id]) => id);

  return ids;
} // ===========================================================================