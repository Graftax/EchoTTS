import { clearInterval, setInterval } from "timers";
import Daemon, { DaemonID, DaemonProvider, DaemonState as DaemonSaveState } from "./Daemon.js";
import { PlayerID } from "./Player.js";
import { Singleton as DataStorage, ItemPayload, PropValue, Create as CreateDataStorageManager } from "../DataStorage.js";
import { sleep } from "openai/core.mjs";
import { Location, LocationProvider } from "./Location.js";
import { Fixture } from "./Fixture.js";

type StateChanger = (state: UniverseState) => void;

export interface UniverseState extends ItemPayload, DaemonProvider, LocationProvider {

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

		if (this._tickTimeout)
			clearInterval(this._tickTimeout);

		this._tickTimeout = null;
	}
}

function externalUpdate(updateFunc: (state: UniverseState) => void) {

	DataStorage?.updateItem("test-instance-the-gate", (item: ItemPayload) => {

		let state = item as UniverseState;

		if (!state.daemons)
			state.daemons = {};

		if (!state.temples)
			state.temples = {};

		if (!state.locations)
			state.locations = [];

		updateFunc(state);

	});

}

CreateDataStorageManager("db.json");

while (!DataStorage?.ready()) {
	await sleep(200);
}

externalUpdate((state) => {

	state.daemons = {};
	state.temples = {};
	state.locations = [];

});

const GateUniverse = new Universe(externalUpdate);
GateUniverse.Start();

externalUpdate((state) => {

	let DID = Daemon.Create(state, "Graftax");
	let daemon = Daemon.Get(state, DID);

	let adrCity = Location.Create(state, "city_0", "Samel-buachas", undefined);
	let adrTemples = Location.Create(state, "z_temple", "Temple Mountain", adrCity);
	let adrGraftTemple = Location.Create(state, "tpl_graftax", "Graftax Temple", adrTemples);
	let adrMainFloor = Location.Create(state, "flr_0", "Main Floor", adrGraftTemple);
	let adrYourChamber = Location.Create(state, "rm_0", "Your Chamber", adrMainFloor);

	Daemon.MoveTo(state, daemon, adrGraftTemple!);
	Daemon.MoveTo(state, daemon, adrMainFloor!);
	Daemon.MoveTo(state, daemon, adrYourChamber!);

	Fixture.Create(state, adrYourChamber!, "fix_fount_1");
	Fixture.Create(state, adrYourChamber!, "fix_extra_1");

});