import { DaemonID, DaemonState } from "./Daemon.js";
import { GetDefinition } from "./FixtureBinding.js";
import Extractor from "./Fixtures/Extractor.js";
import Fountain from "./Fixtures/Fountain.js";
import { Address, Location, LocationProvider } from "./Location.js";
import { PlayerID } from "./Player.js";
import { UniverseState } from "./Universe.js";

export type FixtureID = number;

export interface FixtureState {
	definition: string;
	name?: string;
	properties: { [key: string]: any };
}

export interface FixtureStateProvider {
	fixtures: { [key: number]: FixtureState };
}

export interface FixtureAddress extends Address {
	fixture: FixtureID
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

		if(GetDefinition(fixState)?.getInteractions(fixState).includes(intr))
			result.push(fixState);

	});

	return result;
}

function Interact(state: UniverseState, where: Address,
	fixture: FixtureState, operator: DaemonState, intr: FixtureInteraction) {

	let fixDef = GetDefinition(fixture);
	if(!fixDef) return false;

	return fixDef.interact(state, where, fixture, operator, intr);

}

function GetNextFixtureID(provider: FixtureStateProvider) {

}

function Create(state: LocationProvider, where: Address, fixID: string) {

	let local = Location.FromAddress(state, where);
	if(!local) return;

	let nextID = 0;
	while(local.fixtures[nextID])
		nextID++;

	let fix = {
		definition: fixID,
		properties: {}
	};

	if(!GetDefinition(fix)) {
		console.error(`Could not find definition for ${fixID}`);
		return;
	}

	local.fixtures[nextID] = fix;
}

function FromAddress(map: LocationProvider, target: FixtureAddress) {
	
	let local = Location.FromAddress(map, target);
	if(!local) return undefined;

	if(!Object.hasOwn(local.fixtures, target.fixture))
		return undefined;

	return local.fixtures[target.fixture];
}

export const Fixture = {
	Create,
	WithInteraction,
	Interact,
	FromAddress
};