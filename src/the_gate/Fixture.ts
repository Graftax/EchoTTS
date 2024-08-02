import { DaemonID, DaemonState } from "./Daemon.js";
import Extractor from "./Fixtures/Extractor.js";
import Fountain from "./Fixtures/Fountain.js";
import { Address, Location, LocationProvider } from "./Location.js";
import { PlayerID } from "./Player.js";
import { UniverseState } from "./Universe.js";

export type FixtureID = number;

export interface FixtureState {
	id: FixtureID;
	fixDefID: string;
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

Register("extractor_1", Extractor);
Register("fountain_1", Fountain);

function GetDefinition(fixture: FixtureState) {
	return Definitions[fixture.fixDefID];
}

function GetNextFixtureID(provider: FixtureStateProvider) {

	

}

function Create(state: LocationProvider, where: Address, fixID: string) {

	let local = Location.FromAddress(state, where);
	if(!local) return;

	let nextID = 0;
	while(local.fixtures[nextID])
		nextID++;

	local.fixtures[nextID] = {
		id: nextID,
		fixDefID: fixID,
		name: "",
		properties: {},
		operator: null
	}
}

export const Fixture = {
	Create,
	WithInteraction,
	Interact
};