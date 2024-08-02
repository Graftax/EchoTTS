import { DaemonState } from "./Daemon.js";
import Crank from "./Implements/Crank.js";
import Starvation from "./Implements/Starvation.js";
import { UniverseState } from "./Universe.js";

enum ConceptID {
	NULL
}

enum ImplementID {
	Crank = "crank",
	Starvation = "starve"
}

export interface ImpulseDriver {
	impsFresh: Impulse[];
	impsLiving: Impulse[];
	impsSpent: Impulse[];
}

export interface Impulse {
	conceptID?: ConceptID;
	implementID: ImplementID;
	properties?: { [key: string]: any | undefined }
}

export interface ConceptDefinition {
	name: string;
	description: string;
	conceptFunc: (state: UniverseState, host: DaemonState, pulse: Impulse) => boolean;
}

export interface ImplementDefinition {
	name: string;
	description: string;
	implementFunc: (state: UniverseState, host: DaemonState, pulse: Impulse) => boolean;
}

let Definitions = {
	concepts: new Map<ConceptID, ConceptDefinition>(),
	implements: new Map<ImplementID, ImplementDefinition>()
}

function RegisterConcept(id: ConceptID, def: ConceptDefinition) {
	Definitions.concepts.set(id, def);
}

function RegisterImplement(id: ImplementID, def: ImplementDefinition) {
	Definitions.implements.set(id, def);
}

RegisterImplement(ImplementID.Starvation, Starvation);
RegisterImplement(ImplementID.Crank, Crank);

function DriverDefaults(): ImpulseDriver {

	return {
		impsFresh: [
			{implementID: ImplementID.Crank}, 
			{implementID: ImplementID.Starvation}],
		impsLiving: [],
		impsSpent: []
	};

}

function Drive(state: UniverseState, host: DaemonState) {

	if(ImplementLiving(state, host))
		return;

	if(host.impsFresh.length <= 0) {
		host.impsFresh = host.impsSpent;
		host.impsSpent = [];
	}

	if(host.impsFresh.length <= 0)
		return;

	let impulse = host.impsFresh.shift();
	if(!impulse) return;

	if(RunImpulseConcept(state, host, impulse)) {
		host.impsLiving.push(impulse);
		return;
	}

	const index = Math.floor(Math.random() * host.impsSpent.length);
	host.impsSpent.splice(index, 0, impulse);

}

function RunImpulseConcept(state: UniverseState, host: DaemonState, impulse: Impulse) {

	let concept = Definitions.concepts.get(impulse.conceptID ?? ConceptID.NULL);
	if(concept && !concept.conceptFunc(state, host, impulse))
		return false;

	let implement = Definitions.implements.get(impulse.implementID);
	return implement && implement.implementFunc(state, host, impulse);
}

// returns true if an implement was run.
function ImplementLiving(state: UniverseState, host: DaemonState) {

	let pending = host.impsLiving.shift();
	if(!pending) return false;

	let implement = Definitions.implements.get(pending.implementID);
	if(!implement) return false;

	if(implement.implementFunc(state, host, pending)) {
		host.impsLiving.unshift(pending);
		return true;
	}
	
	host.impsSpent.push(pending);
	return true;
}


export const Impulse = {
	DriverDefaults,
	Drive
}