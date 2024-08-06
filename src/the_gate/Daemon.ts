import { PlayerID } from "./Player.js";
import { randomUUID } from "crypto";
import { Impulse, ImpulseDriver } from "./Impulse.js";
import { UniverseState } from "./Universe.js";
import { kill } from "process";
import { Address, Locatable, Location, LocationProvider } from "./Location.js";
import { Fixture } from "./Fixture.js";

export type DaemonID = string;

export interface DaemonLocation {
	temple: PlayerID | undefined;
	roomNumber: number;
}

export interface DaemonState extends Locatable, ImpulseDriver {

	id: DaemonID;
	owner: PlayerID;
	age: number;
	energy: number;
	maxEnergy: number;
	
}

export interface DaemonProvider {
	daemons: { [key: DaemonID]: DaemonState };
}

export interface DaemonContainer {
	daemonHandles: DaemonID[];
}

function Create(state: DaemonProvider, owner: PlayerID) {

	const newID = randomUUID();
	state.daemons[newID] = {
		id: newID,
		owner: owner,
		age: 0,
		location: null,
		energy: 20,
		maxEnergy: 100,
		...Impulse.DriverDefaults()
	};

	return newID;
}

function TickAll(state: UniverseState) {

	let killList: DaemonState[] = [];

	Object.entries(state.daemons).forEach(([daemonID, daemon]) => {
		
		if(daemon.location != null) {

			Impulse.Drive(state, daemon);
			daemon.energy--;

		}

		if(daemon.energy <= 0) {
			killList.push(daemon);
		}

		daemon.age++;

	});

	killList.forEach(dState => Destroy(state, dState));
	
}

function Destroy(state: DaemonProvider & LocationProvider, daemon: DaemonState) {

	RemoveFrom(state, daemon);
	delete state.daemons[daemon.id];

}

function Get(state: DaemonProvider, id: DaemonID) {
	return state.daemons[id];
}

function MoveTo(map: LocationProvider, target: DaemonState, destination: Address) {

	let location = Location.FromAddress(map, destination);
	if(!location) return false;

	RemoveFrom(map, target);

	target.location = destination;
	location.daemonHandles.push(target.id);
	return true;

}

function RemoveFrom(map: LocationProvider, target: DaemonState) {

	if(!target.location) return;

	let currLocation = Location.FromAddress(map, target.location);
	if(!currLocation) return;

	Fixture.ClearReservation(map, target.location, target);

	currLocation.daemonHandles = currLocation.daemonHandles.filter(did => did != target.id);
	target.location = null;

}

function GetAt(map: DaemonProvider & LocationProvider, destination: Address) {

	let local = Location.FromAddress(map, destination);
	if(!local) return [];

	let daemons = local.daemonHandles.map(did => map.daemons[did]);
	return daemons;
}

export default {
	Create,
	TickAll,
	Get,

	MoveTo,
	RemoveFrom,
	GetAt
};