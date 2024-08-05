import { DaemonState } from "./Daemon.js";
import { FixtureAddress, FixtureState } from "./Fixture.js";
import { GetImplementDefinition } from "./ImplementBinding.js";
import Crank from "./Implements/Crank.js";
import Starvation from "./Implements/Starvation.js";
import { Address } from "./Location.js";
import { UniverseState } from "./Universe.js";

export interface ImpulseDriver {

	impulses: {
		fresh: Impulse[],
		alive: Impulse[],
		spent: Impulse[]
	}

}

export interface Impulse {
	conceptID?: string;
	implementID: string;
}

export interface ConceptDefinition {
	name: string;
	description: string;
	conceptFunc: (state: UniverseState, host: DaemonState, pulse: Impulse) => boolean;
}

let Definitions = {
	concepts: new Map<string, ConceptDefinition>(),
	
}

function RegisterConcept(id: string, def: ConceptDefinition) {
	Definitions.concepts.set(id, def);
}

function DriverDefaults(): ImpulseDriver {

	return {
		impulses: {
			fresh: [
				{implementID: "starve"}, 
				{implementID: "crank"}
			],
			alive: [],
			spent: []
		}
	}

}

function Drive(state: UniverseState, host: DaemonState) {

	if (ImplementLiving(state, host))
		return;

	if (host.impulses.fresh.length <= 0) {
		host.impulses.fresh = host.impulses.spent;
		host.impulses.spent = [];
	}

	if (host.impulses.fresh.length <= 0)
		return;

	let impulse = host.impulses.fresh.shift();
	if (!impulse) return;

	if (RunImpulseConcept(state, host, impulse)) {
		host.impulses.alive.push(impulse);
		return;
	}

	const index = Math.floor(Math.random() * host.impulses.spent.length);
	host.impulses.spent.splice(index, 0, impulse);

}

function RunImpulseConcept(state: UniverseState, host: DaemonState, impulse: Impulse) {

	let concept = Definitions.concepts.get(impulse.conceptID ?? "");
	if (concept && !concept.conceptFunc(state, host, impulse))
		return false;

	let implement = GetImplementDefinition(impulse.implementID);
	return implement && implement.implementFunc(state, host, impulse);
}

// returns true if an implement was run.
function ImplementLiving(state: UniverseState, host: DaemonState) {

	let pending = host.impulses.alive.shift();
	if (!pending) return false;

	let implement = GetImplementDefinition(pending.implementID);
	if (!implement) return false;

	if (implement.implementFunc(state, host, pending)) {
		host.impulses.alive.unshift(pending);
		return true;
	}

	host.impulses.spent.push(pending);
	return true;
}

export const Impulse = {
	DriverDefaults,
	Drive
}