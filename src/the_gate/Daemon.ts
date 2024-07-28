import { PlayerID } from "./Player.js";
import { randomUUID } from "crypto";
import { TempleProvider } from "./Temple.js";
import Notes, { NoteProvider } from "./Notes.js";
import { UniverseState } from "./Universe.js";

export type DaemonID = string;

export interface DaemonLocation {
	temple: PlayerID | undefined;
	roomNumber: number;
}

export interface DaemonState extends NoteProvider {

	id: DaemonID;
	owner: PlayerID;
	age: number;
	location: DaemonLocation | null;
	energy: number;
	maxEnergy: number;
	
}

export interface DaemonProvider {
	daemons: { [key: DaemonID]: DaemonState };
}

function Create(state: DaemonProvider, owner: PlayerID) {

	const newID = randomUUID();
	state.daemons[newID] = {
		id: newID,
		owner: owner,
		age: 0,
		location: null,
		energy: 100,
		maxEnergy: 100,
		notesReserve: ["{Starvation}", "[Sum]"],
		notesExhausted: [],
		orders: []
	};

	return newID;
}

function TickAll(state: UniverseState) {

	Object.entries(state.daemons).forEach(entry => {

		const daemon = entry[1];
		
		if(daemon.location != null) {

			Notes.UpdateHost(state, daemon);
			daemon.energy--;

		}

		daemon.age++;

	});

}

function PutInLocation(state: DaemonProvider & TempleProvider, id: DaemonID, location: DaemonLocation) {

	// Only support temples for now
	if(!location.temple)
		return;

	// If the temple doesnt exist, bail
	let templeState = state.temples[location.temple];
	if(!templeState)
		return;

	// If the room doesnt exist, bail
	if(!Object.hasOwn(templeState.rooms, location.roomNumber))
		return;

	state.daemons[id].location = location;

}

export default {
	Create,
	TickAll,
	PutInLocation
};