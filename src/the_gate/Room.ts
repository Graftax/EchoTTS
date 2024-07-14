export interface SaveState {
	name: string;
}

export default class Room {
	
	_name: string = "";

	public static ToState(room: Room) : SaveState {

		return { 
			name: room._name
		};

	}

	public static FromState(state: SaveState) :  Room {

		return new Room();

	}

}