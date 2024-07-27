import { clearInterval, setInterval } from "timers";
import Daemon, {DaemonID, DaemonProvider, DaemonState as DaemonSaveState} from "./Daemon.js";
import Temple, {TempleProvider, TempleState as TempleSaveState} from "./Temple.js";
import { PlayerID } from "./Player.js";
import {Singleton as DataStorage, ItemPayload, PropValue, Create as CreateDataStorageManager} from "../DataStorage.js";
import { sleep } from "openai/core.mjs";

type StateChanger = (state: UniverseState) => void;

export interface UniverseState extends ItemPayload, DaemonProvider, TempleProvider {
	
}

export default class Universe {

	private _updateFunc: (changer: StateChanger) => void;
	private _tickTimeout: NodeJS.Timeout | null = null;

	constructor(updateFunc: (changer: StateChanger) => void) {
		this._updateFunc = updateFunc;
	}

	public Start() {
		this._tickTimeout = setInterval(this.Update.bind(this), 1000);
	}

	private Update() {

		this._updateFunc((state: UniverseState) => {

			Daemon.TickAll(state);

		});

	}

	public Stop() {

		if(this._tickTimeout)
			clearInterval(this._tickTimeout);

		this._tickTimeout = null;
	}
}

function externalUpdate(updateFunc: (state: UniverseState) => void) {

	DataStorage?.updateItem("test-instance-the-gate", (item: ItemPayload) => {

		let state = item as UniverseState;
		
		if(!state.daemons)
			state.daemons = {};

		if(!state.temples)
			state.temples = {};

		updateFunc(state);

	});

}

CreateDataStorageManager("db.json");

while(!DataStorage?.ready()) {
	await sleep(200);
}

externalUpdate((state) => {

	state.daemons = {};
	state.temples = {};

});

const GateUniverse = new Universe(externalUpdate);
GateUniverse.Start();

externalUpdate((state) => {
	
	Temple.Create(state, "Graftax");
	let DID = Daemon.Create(state, "Graftax");

	Daemon.PutInLocation(state, DID, {
		temple: "Graftax",
		roomNumber: 0
	});

});