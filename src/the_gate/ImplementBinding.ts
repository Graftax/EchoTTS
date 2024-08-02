import { DaemonState } from "./Daemon.js";
import Crank from "./Implements/Crank.js";
import Starvation from "./Implements/Starvation.js";
import { Impulse } from "./Impulse.js";
import { UniverseState } from "./Universe.js";

export interface ImplementDefinition {
	name: string;
	description: string;
	implementFunc: (state: UniverseState, host: DaemonState, pulse: Impulse) => boolean;
}

let ImplementDefinitions = new Map<string, ImplementDefinition>();

function RegisterImplement(id: string, def: ImplementDefinition) {
	ImplementDefinitions.set(id, def);
}

export function GetImplementDefinition(id: string) {
	return ImplementDefinitions.get(id);
}

RegisterImplement("starve", Starvation);
RegisterImplement("crank", Crank);