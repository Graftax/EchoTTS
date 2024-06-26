import { setInterval } from "timers";
import Daemon, {SaveState as DaemonSaveState} from "./Daemon.js";
import Temple, {SaveState as TempleSaveState} from "./Temple.js";
import { PlayerID } from "./Player.js";

interface SaveState
{
	Daemons: Array<DaemonSaveState>;
	Temples: Array<TempleSaveState>;
}

export default class Universe
{
	private _daemons: Array<Daemon> = new Array;
	private _temples: Map<PlayerID, Temple> = new Map;
	private _tickDriver: NodeJS.Timer | null = null;

	private _toggle: boolean = false;

	public ExportState() : SaveState
	{
		const temples = Array.from(this._temples.values());

		return { 
			Daemons: this._daemons.map(Daemon.ToState),
			Temples:  temples.map(Temple.ToState)
		};
	}

	public ImportState(state: SaveState)
	{
		this._daemons = state.Daemons.map(Daemon.FromState);
		this._temples = new Map(state.Temples.map(Temple.FromStateToPair));
	}

	public Start()
	{
		this._tickDriver = setInterval(this.Update, 6000);
	}

	private Update()
	{
		console.log(this._toggle ? "TICK" : "TOCK");
		this._toggle = !this._toggle;
	}

}

let testUni = new Universe();
testUni.Start();