import { DaemonID, DaemonState } from "./Daemon.js";
import { PlayerID } from "./Player.js";
import { TempleState } from "./Temple.js";
import { UniverseState } from "./Universe.js";

export type FixtureID = number;

export interface FixtureState {
	id: FixtureID;
	name: string;
	properties: { [key: string]: any };
}

export interface FixtureStateProvider {
	fixtures: { [key: number]: FixtureState };
}

export interface FixtureDefinition {
	name: string;
	getOperations: (state: FixtureState) => string[];
	runOperation: (state: UniverseState, temple: TempleState, 
		fixture: FixtureState, operator: DaemonState, op: string) => boolean;
}

const FixtureDefinitions = [

	{
		name: "Extractor",
		getOperations: (state: FixtureState) => {
			return ["[Sum]"];
		},
		runOperation(state: UniverseState, temple: TempleState, fixture: FixtureState, operator: DaemonState, op: string) {
			console.log("Extractor op run: " + op);

			let count: number = Object.hasOwn(fixture.properties, "count") 
				? fixture.properties["count"] 
				: 0;

			count++;
			
			fixture.properties["count"] = count;
			return count > 3;
		},
	}

];

function getDefinition(fixture: FixtureState) {
	return FixtureDefinitions.find(value => value.name == fixture.name);
}

function getFixturesWithOperation(state: UniverseState, roomOwner: PlayerID, roomID: number, op: string): FixtureID[] {

	let result: FixtureID[] = [];

	let currTemple = state.temples[roomOwner];
	let currRoom = currTemple.rooms[roomID];

	currRoom.contents.forEach(fixID => {

		let fixture = currTemple.fixtures[fixID];
		const fixdef = getDefinition(currTemple.fixtures[fixID]);
		if(!fixdef) return;
		
		const ops = fixdef.getOperations(fixture);
		if(ops.includes(op))
			result.push(fixID);

	});

	return result;
}

export default {
	getFixturesWithOperation
};