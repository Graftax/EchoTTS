import Daemon, { DaemonID } from "./Daemon.js";
import { PlayerID } from "./Player.js";
import Room, {SaveState as RoomSaveState} from "./Room.js";

export interface SaveState
{
	owner: PlayerID;
	daemons: DaemonID[];
	floors: { [key: number]: { [key: string]: RoomSaveState } };
}

export default class Temple
{
	private _owner: PlayerID = "everyone";
	private _daemons: Array<Daemon> = [];
	private _floors: Map<number, Map<string, Room>> = new Map;

	public static ToState(temple: Temple) : SaveState {

		let mappedFloors = temple._floors.keys;
		
		return { 
			owner: temple._owner, 
			daemons: Daemon.ToIDList(temple._daemons),
			floors: {}
		};

	}

	public static FromState(state: SaveState) :  Temple {

		return new Temple();
	}

	public static FromStateToPair(state: SaveState) : [PlayerID, Temple] {

		const temple = this.FromState(state);
		return [temple._owner, temple];
	}

	public addDaemon(toAdd: Daemon) {
		this._daemons.push(toAdd);
	}

	public addRoom(roomName: string, floor: number = 1) {

		let floorRooms = this._floors.get(floor) ?? new Map<string, Room>();

		floorRooms.set(roomName, new Room());

		this._floors.set(floor, floorRooms);

	}

	// public getRoom(roomName: string) {
	// 	return this._floors.values().;
	// }
}