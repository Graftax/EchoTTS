import { DaemonID, DaemonState } from "./Daemon.js";
import { UniverseState } from "./Universe.js";
import Fixtures from "./Fixtures.js";

interface Order {
	noteName: string;
	properties: { [key: string]: any | undefined }
}

export interface NoteProvider {

	notesReserve: string[];
	notesExhausted: string[];
	orders: Order[];
	
}

interface Note {
	name: string;
	description: string;
	concept: (state: UniverseState, host: DaemonState) => Order | undefined;
	implement: (state: UniverseState, host: DaemonState, order: Order) => boolean;
}

const Notes: Note[] = [

	{
		name: "{Starvation}",
		description: "Returns for energy if below 10% charge.",

		concept: (state: UniverseState, host: DaemonState) => {

			if(host.energy > host.maxEnergy * 0.1)
				return;

			return {
				noteName: "{Starvation}",
				properties: {}
			};
		},

		implement(state, host, order) {

			if(!host.location || !host.location.temple)
				return true;

			const fixtureOptions = Fixtures.getFixturesWithOperation(state, 
				host.location.temple, host.location.roomNumber, "[Absorb]");

			if(fixtureOptions.length <= 0)
				return true;

			Fixtures.runOperation(state, host.location.temple, fixtureOptions[0], host.id, "[Absorb]");

			return false;
		},

	},

	{
		name: "[Sum]",
		description: "Tries to perform a sum for gadgets that need one.",
		concept: (state: UniverseState, host: DaemonState) => {

			let currLocation = host.location;
			if(!currLocation || !currLocation.temple)
				return;

			// check each gadget to see if it is available and its current action is Sum
			const fixtureOptions = Fixtures.getFixturesWithOperation(state, 
				currLocation.temple, currLocation.roomNumber, "[Sum]");
			
			// Set current order to be that gadget.
			if(fixtureOptions.length <= 0)
				return;

			return {
				noteName: "[Sum]",
				properties: {
					fixOwner: currLocation.temple,
					fixID: fixtureOptions[0]
				}
			}

		},
		implement(state, host, order) {

			if(!host.location?.temple)
				return false;

			return Fixtures.runOperation(state, host.location.temple, 
				order.properties["fixID"], host.owner, "[Sum]");
				
		},
	}

]

function UpdateHost(state: UniverseState, host: DaemonState) {

	if(implementOrders(state, host))
		return;

	if(host.notesReserve.length <= 0) {
		host.notesReserve = host.notesExhausted;
		host.notesExhausted = [];
	}

	if(host.notesReserve.length <= 0)
		return;

	let note = host.notesReserve.splice(0, 1)[0];

	conceptNote(state, host, note);

	const index = Math.floor(Math.random() * host.notesExhausted.length);
	host.notesExhausted.splice(index, 0, note);

}

function conceptNote(state: UniverseState, host: DaemonState, name: string) {

	let currNote = Notes.find(note => note.name == name);
	if(!currNote) return;

	let order = currNote.concept(state, host);
	if(!order) return;

	host.orders.unshift(order);
}

function implementOrders(state: UniverseState, host: DaemonState) {

	if(host.orders.length <= 0)
		return false;

	let order = host.orders[0];
	let currNote = Notes.find(note => note.name == order.noteName);
	if(!currNote) return true;

	if(!currNote.implement(state, host, order))
		host.orders.splice(0, 1);

	return true;
}

export default {
	Notes,
	UpdateHost
}