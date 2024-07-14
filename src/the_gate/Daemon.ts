import { PlayerID } from "./Player.js";

export type DaemonID = string;

export interface SaveState
{
	id: DaemonID;
}

export default class Daemon
{
	private _id: DaemonID;
	private _owner: PlayerID = "everyone";

	public static ToState(daemon: Daemon) : SaveState {

		return { id: daemon._id };
	}

	public static FromState(state: SaveState) :  Daemon {

		return new Daemon(state.id);
	}

	public static FromStateToPair(state: SaveState) : [DaemonID, Daemon] {

		const daemon = this.FromState(state);
		return [daemon._id, daemon];
	}

	public static ToIDList(daemons: Daemon[]): DaemonID[] {
		return daemons.map(daemon => daemon._id);
	}

	constructor(id: DaemonID) {
		this._id = id;
	}

	public tick() {

	}

}