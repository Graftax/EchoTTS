import { DaemonID, DaemonState } from "./Daemon.js";
import { Address, Location, LocationProvider } from "./Location.js";
import { PlayerID } from "./Player.js";
import { UniverseState } from "./Universe.js";

export type FixtureID = number;

export interface FixtureState {
	id: FixtureID;
	definition: string;
	name: string;
	properties: { [key: string]: any };
	operator: DaemonID | null;
}

export interface FixtureStateProvider {
	fixtures: { [key: number]: FixtureState };
}

export interface FixtureDefinition {
	name: string;
	getInteractions: (state: FixtureState) => FixtureInteraction[];
	interact: (state: UniverseState, where: Address, fixture: FixtureState, operator: DaemonState, intr: FixtureInteraction) => boolean;
}

export enum FixtureInteraction {
	Siphon,
	Crank
}

function WithInteraction(state: LocationProvider, where: Address, intr: FixtureInteraction) {

	let loca = Location.FromAddress(state, where);
	if(!loca) return [];

	let result: FixtureState[] = [];
	let fixEntries = Object.entries(loca.fixtures);
	fixEntries.forEach(([id, fixState]) => {

		if(GetDefinition(fixState).getInteractions(fixState).includes(intr))
			result.push(fixState);

	});

	return result;
}

function Interact(state: UniverseState, where: Address,
	fixture: FixtureState, operator: DaemonState, intr: FixtureInteraction) {

	let fixDef = GetDefinition(fixture);
	return fixDef.interact(state, where, fixture, operator, intr);
}

let Definitions: { [key: string]: FixtureDefinition } = {};

function Register(id: string, definition: FixtureDefinition) {
	Definitions[id] = definition;
}

function GetDefinition(fixture: FixtureState) {
	return Definitions[fixture.definition];
}

function Create(state: LocationProvider, where: Address) {

}

export const Fixture = {
	Register,
	GetDefinition,
	WithInteraction,
	Interact
};