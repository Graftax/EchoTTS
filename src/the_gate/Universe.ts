import { clearInterval, setInterval } from "timers";
import Daemon, {DaemonID, SaveState as DaemonSaveState} from "./Daemon.js";
import Temple, {SaveState as TempleSaveState} from "./Temple.js";
import { PlayerID } from "./Player.js";
import Room from "./Room.js";
import {Singleton as DataStorage, ItemPayload, PropValue, Create as CreateDataStorageManager} from "../DataStorage.js";

interface SaveState extends ItemPayload
{
	daemons: DaemonSaveState[] | undefined;
	temples: TempleSaveState[] | undefined;
}

function externalUpdate(updateFunc: ((state: SaveState) => void) | undefined) {

	DataStorage?.updateItem("test-instance-the-gate", (item: ItemPayload) => {

		let state = item as SaveState;
		
		if(!state.daemons)
			state.daemons = [];

		if(!state.temples)
			state.temples = [];

	});

}

export default class Universe
{

	//private _updateFunc;

	// These are our "pure" serialization collections.
	private _daemons: Map<DaemonID, Daemon> = new Map;
	private _temples: Map<PlayerID, Temple> = new Map;
	private _daemonLocations: Map<Daemon, Room> = new Map;
	
	// These collections are the result of other data and are basically caches
	private PlayerIdToOwnedDaemons: Map<PlayerID, Daemon[]> = new Map; 

	private _tickTimeout: NodeJS.Timeout | null = null;

	private _toggle: boolean = true;

	public ExportState() : SaveState {

		const daemons = Array.from(this._daemons.values());
		const temples = Array.from(this._temples.values());

		return { 
			daemons: daemons.map(Daemon.ToState),
			temples: temples.map(Temple.ToState)
		};
	}

	public ImportState(state: SaveState) {

		if(!state._daemons || !state._temples)
			return;

		//this._daemons = new Map(state.daemons.map(Daemon.FromStateToPair));
		//this._temples = new Map(state.temples.map(Temple.FromStateToPair));
	}

	constructor() {
		//this._updateFunc
	}

	public Start() {

		this._tickTimeout = setInterval(this.Update.bind(this), 6000);
	}

	private Update() {

		console.log(this._toggle ? "TICK" : "TOCK");
		this._toggle = !this._toggle;

		this._daemons.forEach((daemon) => {
			daemon.tick();
		});

	}

	public Stop() {

		if(this._tickTimeout)
			clearInterval(this._tickTimeout);

		this._tickTimeout = null;
	}

	public debugAddTemple(owner: PlayerID) {

		let temple = new Temple();
		this._temples.set(owner, temple);
		return temple;

	}

	public debugAddDaemon(owner: PlayerID, id: DaemonID) {
		const freshDaemon = new Daemon(id);
		this._daemons.set(id, freshDaemon);
		this._temples.get(owner)?.addDaemon(freshDaemon);
	}

	public debugMoveDaemonToRoom(toMove: DaemonID, templeOwner: PlayerID, roomName: string) {

		const daemon = this._daemons.get(toMove);
		if(!daemon) return;

		const temple = this._temples.get(templeOwner);
		if(!temple) return;

		//const room = temple.getRoom(roomName);
		//if(!room) return; 

		//this._daemonLocations.set(daemon, room);
	}
}


CreateDataStorageManager("db.json");

const GateUniverse = new Universe();
GateUniverse.Start();

let everyTemple = GateUniverse.debugAddTemple("everyone");
everyTemple.addRoom("Entry");
GateUniverse.debugAddDaemon("everyone", "Adam");

console.log(JSON.stringify(GateUniverse.ExportState(), null, "  "));
externalUpdate(undefined);