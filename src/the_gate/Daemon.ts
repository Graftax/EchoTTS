export interface SaveState
{

}

export default class Daemon
{
	public static ToState(daemon: Daemon) : SaveState
	{
		return {};
	}

	public static FromState(state: SaveState) :  Daemon
	{
		return new Daemon();
	}
}