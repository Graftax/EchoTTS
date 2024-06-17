import { PlayerID } from "./Player.js";

export interface SaveState
{
	Rooms: Array<number>;
}

export default class Temple
{
	private _owner: PlayerID = "everyone";

	public static ToState(temple: Temple) : SaveState
	{
		return { Rooms: [] };
	}

	public static FromState(state: SaveState) :  Temple
	{
		return new Temple();
	}

	public static FromStateToPair(state: SaveState) : [PlayerID, Temple]
	{
		const temple = this.FromState(state);
		return [temple._owner, temple];
	}

}