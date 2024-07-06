import { Scenario } from "../Scenario.js";
import { Channel, Client, EmbedBuilder, User } from "discord.js";
import Lt from "long-timeout";
import { off } from "process";

export interface ShowOrMovie extends PollItem {}

const hoursToMs = 3600000;

function msToDurationString(durationMS: number): string {

	let durationSecs = durationMS / 1000;
	
	let days = Math.floor(durationSecs / (24 * 60 * 60));
	durationSecs = durationSecs % (24 * 60 * 60);

	let hours = Math.floor(durationSecs / (60 * 60));
	durationSecs = durationSecs % (60 * 60);

	let minutes = Math.floor(durationSecs / 60);
	let seconds = Math.floor(durationSecs % 60);

	return `${days > 0 	? days + "d " 		: ""}`
		+ `${hours > 0 		? hours + "h " 		: ""}`
		+ `${minutes > 0 	? minutes + "m " 	: ""}`
		+ `${seconds > 0 	? seconds + "s " 	: ""}`;
}

export interface PollItem {
	uid: string;
	name: string,
	img_url: string,
	url: string
}

interface InternalItem<ItemType> {
	nominator: string,
	item: ItemType
}

interface SaveState<ItemType> {
	creatorID: string,
	nominationLimit: number,
	items: { [key: string]: InternalItem<ItemType> }
	voteTime: string,
	endTime: string,
	isVoting: boolean,
	votes: [string, string[]][]
}

export default class PollScenario<ItemType extends Required<PollItem>> extends Scenario {

	private _isVoting = false;
	private _creatorID: string = "";

	private _nominationLimit = 1;
	private _nominees: Map<string, InternalItem<ItemType>> = new Map;

	private _voteTime = new Date(0);
	private _voteTimeout: Lt.Timeout | null = null;

	private _endTime = new Date(0);
	private _endTimeout: Lt.Timeout | null = null;

	private _votes: Map<string, Array<string>> = new Map;

	// #region Scenario

	init(): void {

		this.loadState();
		this.updateVoteTimeout();
		this.updateEndTimeout();

	}

	shutdown() {
	
		if(this._voteTimeout)
			Lt.clearTimeout(this._voteTimeout);

		if(this._endTimeout)
			Lt.clearTimeout(this._endTimeout);
		
		this.controls.Clean();
	}

	get isPersistant() {
		return true;
	}

	// #endregion

	configurePoll(creatorID: string, hoursBeforeVote: number, hoursVoting: number, nominationLimit: number) {

		this._creatorID = creatorID;
		this._voteTime = new Date(Date.now() + (hoursBeforeVote * hoursToMs));
		this._endTime = new Date(this._voteTime.getTime() + (hoursVoting * hoursToMs));
		
		if(nominationLimit)
			this._nominationLimit = nominationLimit;

		this.saveState();
		this.updateVoteTimeout();
		this.updateEndTimeout();
	}

	isCreator(toCheck: User): boolean {
		return toCheck.id == this._creatorID;
	}

	isVoting(): boolean {
		return this._isVoting;
	}

	getVoteTime() : Date {
		return this._voteTime;
	}

	getEndTime() : Date {
		return this._endTime;
	}
	
	timeStatusString(): string {

		let out = "";
		let voteTime = this.getVoteTime();
		let voteTimeOffsetMS = voteTime.getTime() - Date.now();
		if(voteTimeOffsetMS > 0)
			out += `\nTime Until Vote: ${msToDurationString(voteTimeOffsetMS)}`;
		
		let endTime = this.getEndTime();
		let endTimeOffsetMs = endTime.getTime() - Math.max(voteTime.getTime(), Date.now());
		if(endTimeOffsetMs > 0)
			out += `\nVoting Time Left: ${msToDurationString(endTimeOffsetMs)}`;
	
		return out;
	}

	private async getMentionString() : Promise<string> {

		let mentionSet = new Set<string>();

		this._nominees.forEach((value) => {
			mentionSet.add(value.nominator);
		});

		Array.from(this._votes.keys()).forEach((value) => {
			mentionSet.add(value);
		});

		let out = "";
		let entryItr = mentionSet.entries();

		for(let [currUid] of entryItr) {

			let currUser = await this.client.users.fetch(currUid);
			out += `${currUser} `;

		}

		return out;

	}

	private onVoteTimeout = async () => {

		if(this._isVoting)
			return;

		this._isVoting = true;
		this.saveState();
		
		let mentionString = await this.getMentionString();

		let pollChannel = this.channel;
		if(pollChannel.isTextBased())
			pollChannel.send(`${mentionString}\n\n The nomination period has ended, you may now vote. Use \`/poll vote\`.`);

	}

	private onEndTimeout = async () => {

		let bordaCount = this.doBordaCount();

		let channel = this.channel;
		if(bordaCount.size <= 0 && channel.isTextBased()) {
			this.controls.End();
			return channel.send("Could not tally a winner; there were no votes.");
		}

		let sorted = sortMapToArray(bordaCount);
		let sortedItems = sorted.map((UID) => {
			return this._nominees.get(UID)!;
		});

		let maxPoints = (this._nominees.size - 1) * this._votes.size;
		let winner = sortedItems.splice(0, 1).at(0)!;
		sortedItems = sortedItems.splice(0, 25);
		let fields = sortedItems.map((currItem, index) => {

			let currCount = bordaCount.get(currItem.item.uid)!;
			return {
				name: `${index + 2}. ${currItem.item.name}`,
				value: `${currCount} Points (${currCount / maxPoints * 100}%)`
			}

		});

		if(channel.isTextBased()) {

			let mentions = await this.getMentionString();
			let winnerCount = bordaCount.get(winner.item.uid)!;
			channel.send({
				content: `${mentions}\n\n The poll has finished.`,
				embeds: [{
					title: `**The winner is ${winner.item.name}!**`,
					description: `${winnerCount} Points (${winnerCount / maxPoints * 100}%)`,
					image: { url: winner.item.img_url },
					color: 0xd4af37
				}, 
				
				new EmbedBuilder()
					.setFields(fields)
					.setColor(0xaaa9ad)
					
				]
			});

		}

		this.controls.End();
	}

	private saveState() {

		this.controls.Save({
			nominationLimit: this._nominationLimit,
			items: Object.fromEntries(this._nominees),
			voteTime: this._voteTime.toISOString(),
			endTime: this._endTime.toISOString(),
			isVoting: this._isVoting,
			creatorID: this._creatorID,
			votes: Array.from(this._votes.entries())
		} as SaveState<ItemType>);

	}

	private loadState() {

		let state = this.controls.Load() as SaveState<ItemType>;
		if(!state) return;
		if(Object.keys(state).length <= 0) return;

		this._nominationLimit = state.nominationLimit;
		this._nominees = new Map(Object.entries(state.items));
		this._voteTime = new Date(state.voteTime);
		this._endTime = new Date(state.endTime);
		this._isVoting = state.isVoting;
		this._creatorID = state.creatorID;
		this._votes = new Map(state.votes);
		
	}

	private canAddItem(nominatorID: string, toAdd: ItemType) : string | undefined {

		if(this._nominees.has(toAdd.uid))
			return "Item already exists.";

		let found = Array.from(this._nominees.entries()).filter(([UID, nominee]) => {
			return nominee.nominator == nominatorID;
		});

		if(found.length >= this._nominationLimit)
			return `Item limit reached. (${this._nominationLimit})`;

		return undefined;
	}

	addItem(nominatorID: string, toAdd: ItemType) : string | undefined{

		if(this._isVoting)
			return "Items cannot be added while the poll is voting.";

		let res = this.canAddItem(nominatorID, toAdd);
		if(res) return res;

		this._nominees.set(toAdd.uid, {nominator: nominatorID, item: toAdd});
		this.saveState();

		return undefined;

	}

	private canRemoveItem(nominatorID: string, uid: string, admin: boolean): string | undefined {

		if(!this._nominees.has(uid))
			return "Item doesn't exist.";

		let currItem = this._nominees.get(uid);
		if(!currItem)
			return "Failed to get item.";

		if(currItem.nominator != nominatorID && !admin)
			return "You do not have permission to remove that item.";

		return undefined;
	}

	removeItem(uid: string, nominatorID: string, admin: boolean) {

		if(this._isVoting)
			return "Items cannot be removed while the poll is voting.";

		let res = this.canRemoveItem(nominatorID, uid, admin);
		if(res) return res;

		this._nominees.delete(uid);
		this.saveState();

		return undefined;
	}

	getItem(uid: string) : ItemType | undefined {

		if(!this._nominees.has(uid))
			return undefined;

		return this._nominees.get(uid)?.item;

	}

	getNomineeList() : Array<ItemType> {

		return Array.from(this._nominees.values()).map((internalItem) => {
			return internalItem.item;
		});
		
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
				outMap.set(itemUID, (outMap.get(itemUID) ?? 0) + pointValue);

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