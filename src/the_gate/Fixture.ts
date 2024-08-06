import { DaemonID, DaemonState } from "./Daemon.js";
import { GetDefinition } from "./FixtureBinding.js";
import Extractor from "./Fixtures/Extractor.js";
import Fountain from "./Fixtures/Fountain.js";
import { Address, Location, LocationProvider } from "./Location.js";
import { PlayerID } from "./Player.js";
import { UniverseState } from "./Universe.js";

export type FixtureID = number;

export interface FixtureState {
	id: FixtureID;
	definition: string;
	name?: string;
	properties: { [key: string]: any };
}

export interface FixtureStateProvider {
	fixtures: { [key: number]: FixtureState };
	reservations: { [key: DaemonID]: FixtureID };
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

	if(fixDef.interact(state, where, fixture, operator, intr)) {
		Reserve(state, { parts: where.parts, fixture: fixture.id }, operator);
		return true;
	}

	ClearReservation(state, where, operator);
	return false;

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
		id: nextID,
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

function GetDefaultProvider() {
	return {
		fixtures: {},
		reservations: {}
	} as FixtureStateProvider;
}


function Reserve(provider: LocationProvider, address: FixtureAddress, daemon: DaemonState) {

	let fixLocal = Location.FromAddress(provider, address);
	if(!fixLocal) return false;

	if(Object.hasOwn(fixLocal.reservations, daemon.id))
		return false;

	let fix = Fixture.FromAddress(provider, address);
	if(!fix) return false;

	fixLocal.reservations[daemon.id] = fix.id;
	return true;
}

function GetReservation(provider: LocationProvider, address: Address, daemon: DaemonState) {

	let local = Location.FromAddress(provider, address);
	if(!local) return undefined;

	if(!Object.hasOwn(local.reservations, daemon.id))
		return undefined;

	return local.fixtures[local.reservations[daemon.id]];

}

function ClearReservation(provider: LocationProvider, address: Address, daemon: DaemonState) {

	let local = Location.FromAddress(provider, address);
	if(!local) return;

	if(!Object.hasOwn(local.reservations, daemon.id))
		return;

	delete local.reservations[daemon.id];
}

export const Fixture = {
	GetDefaultProvider,
	Create,
	WithInteraction,
	Interact,
	FromAddress,
	GetReservation,
	ClearReservation
};