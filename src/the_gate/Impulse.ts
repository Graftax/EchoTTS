import { DaemonID, DaemonState } from "./Daemon.js";
import { UniverseState } from "./Universe.js";

export interface ImpulseDriver {

	chargedImpulses: Impulse[];
	pendingImpulses: Impulse[];
	dischargedImpulses: Impulse[];
	
}

export interface Impulse {
	concept?: string;
	implement: string;
	properties?: { [key: string]: any | undefined }
}

interface ConceptDefinition {
	name: string;
	description: string;
	concept: (state: UniverseState, host: DaemonState, pulse: Impulse) => boolean;
}

interface ImplementDefinition {
	name: string;
	description: string;
	implement: (state: UniverseState, host: DaemonState, pulse: Impulse) => boolean;
}

let Definitions = {
	concepts: new Map<string, ConceptDefinition>(),
	implements: new Map<string, ImplementDefinition>()
}

function RegisterConcept(id: string, def: ConceptDefinition) {
	Definitions.concepts.set(id, def);
}

function RegisterImplement(id: string, def: ImplementDefinition) {
	Definitions.implements.set(id, def);
}

function DriverDefaults(): ImpulseDriver {

	return {
		chargedImpulses: [{implement: "imp-crank"}, {implement: "imp-starve"}],
		pendingImpulses: [],
		dischargedImpulses: []
	};

}

function Drive(state: UniverseState, host: DaemonState) {

	if(ImplementOrders(state, host))
		return;

	if(host.chargedImpulses.length <= 0) {
		host.chargedImpulses = host.dischargedImpulses;
		host.dischargedImpulses = [];
	}

	if(host.chargedImpulses.length <= 0)
		return;

	let impulse = host.chargedImpulses.shift();
	if(!impulse) return;

	RunImpulseConcept(state, host, impulse);

	const index = Math.floor(Math.random() * host.notesExhausted.length);
	host.notesExhausted.splice(index, 0, impulse);

}

function RunImpulseConcept(state: UniverseState, host: DaemonState, impulse: Impulse) {

	let currNote = Definitions.find(note => note.name == name);
	if(!currNote) return;

	if(impulse.concept && Definitions.concepts)
	let order = currNote.concept(state, host);
	if(!order) return;

	host.orders.unshift(order);
}

function ImplementOrders(state: UniverseState, host: DaemonState) {

	if(host.pendingImpulses.length <= 0)
		return false;

	let pending = host.pendingImpulses[0];
	let implement = Definitions.implements.get(pending.implement);
	if(!implement) {
		host.pendingImpulses.shift();
		return false;
	}

	if(!implement.implement(state, host, pending))
		host.pendingImpulses.shift();

	return true;
}


export const Impulse = {
	RegisterConcept,
	RegisterImplement,
	DriverDefaults,
	Drive
}