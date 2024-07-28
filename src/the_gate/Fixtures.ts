import { DaemonID, DaemonState } from "./Daemon.js";
import { PlayerID } from "./Player.js";
import { TempleProvider, TempleState } from "./Temple.js";
import { UniverseState } from "./Universe.js";

export type FixtureID = number;

export interface FixtureState {
	id: FixtureID;
	name: string;
	properties: { [key: string]: any };
	operator: DaemonID | null;
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

			if(count >= 3) {
				fixture.properties["count"] = 0;
				return false;
			}

			return true;
		},
	},
	{
		name: "Fountain",
		getOperations: (state: FixtureState) => {
			return ["[Absorb]"];
		},
		runOperation(state: UniverseState, temple: TempleState, fixture: FixtureState, operator: DaemonState, op: string) {
			operator.energy = operator.maxEnergy;
			return true;
		},
	}

];

function getDefinition(fixture: FixtureState) {
	return FixtureDefinitions.find(value => value.name == fixture.name);
}

function getFixturesWithOperation(state: TempleProvider, roomOwner: PlayerID, roomID: number, op: string): FixtureID[] {

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

function runOperation(state: UniverseState, templeOwner: PlayerID, toOperate: FixtureID, operator: DaemonID, op: string) {

	let temple = state.temples[templeOwner];
	let fixture = temple.fixtures[toOperate];
	let fixDef = getDefinition(fixture);
	let daemon = state.daemons[operator];

	if(!fixDef)
		return false;

	return fixDef.runOperation(state, temple, fixture, daemon, op)
}

export default {
	getFixturesWithOperation,
	runOperation
};