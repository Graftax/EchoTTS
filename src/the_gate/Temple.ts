import { FixtureState, FixtureStateProvider } from "./Fixtures.js";
import { PlayerID } from "./Player.js";

interface RoomSaveState {
	name: string;
	length: number;
	width: number;
	height: number;
	contents: number[];
}

export interface TempleState extends FixtureStateProvider {
	rooms: { [key: number]: RoomSaveState };
	floors: { [key: number]: number[] };
	resources: { [key: string]: number };
}

export interface TempleProvider {
	temples: { [key: PlayerID]: TempleState };
}

function getNextRoomID(state: TempleProvider, owner: PlayerID) {

	let newID = 0;
	let tempState = state.temples[owner];
	if(!tempState) return newID;

	while(Object.hasOwn(tempState.rooms, newID))
		newID++;

	return newID;
}

function Create(state: TempleProvider, owner: PlayerID) {

	state.temples[owner] = {
		fixtures: {
			0: {
				id: 0,
				name: "Extractor",
				properties: {},
				operator: null
			},
			1: {
				id: 1,
				name: "Fountain",
				properties: {},
				operator: null
			}
		},
		rooms: {
			0: {
				name: "Your Chamber",
				length: 10,
				width: 10,
				height: 3,
				contents: [0, 1]
			}
		},
		floors: {
			0: [0]
		},
		resources: {}
	};

}

export default {
	Create
}