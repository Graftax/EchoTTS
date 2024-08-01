import { DaemonContainer, DaemonID, DaemonState } from "./Daemon.js";
import { FixtureStateProvider } from "./Fixtures/Fixture.js";

export interface LocationProvider {
	locations: Location[];
}

export interface Locatable {
	location: Address | null;
}

export interface Address {
	parts: string[];
}

export interface Location extends LocationProvider, DaemonContainer, FixtureStateProvider {

	id: string;
	name: string;

}

function Create(map: LocationProvider, id: string, name: string, parent: Address | undefined) {

	let container = map;
	let addressParts = [id];

	if(parent) {

		let addrLocation = FromAddress(map, parent);
		if(!addrLocation) return undefined;

		container = addrLocation;
		addressParts.splice(0, 0, ...parent.parts);
	}

	container.locations.push({
		id: id,
		name: name,
		daemonHandles: [],
		fixtures: {},
		locations: []
	});

	return { parts: addressParts } as Address;
}

function FromAddress(map: LocationProvider, location: Address) {

	if(location.parts.length <= 0)
		return undefined;

	let currentLocation = map.locations.find(loc => loc.id == location.parts[0]);
	let parts = location.parts.slice(1);

	if(!currentLocation)
		return undefined;

	while(parts.length > 0) {
		
		let currPart = parts[0];
		let nextLocation: Location | undefined = currentLocation.locations.find(loc => loc.id == currPart);
		if(!nextLocation) return undefined;

		currentLocation = nextLocation;
		parts.splice(0, 1);
	}

	return currentLocation;
	
}

export const Location = {
	Create,
	FromAddress
}