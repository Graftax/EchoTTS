
import { FixtureInteraction, FixtureState } from "./Fixture.js";
import { UniverseState } from "./Universe.js";
import { DaemonState } from "./Daemon.js";
import Extractor from "./Fixtures/Extractor.js";
import Fountain from "./Fixtures/Fountain.js";
import { Address } from "./Location.js";

export interface FixtureDefinition {
	name: string;
	getInteractions: (state: FixtureState) => FixtureInteraction[];
	interact: (state: UniverseState, where: Address, fixture: FixtureState, operator: DaemonState, intr: FixtureInteraction) => boolean;
}

let Definitions = new Map<string, FixtureDefinition>();

function Register(id: string, definition: FixtureDefinition) {
	Definitions.set(id, definition);
}

export function GetDefinition(fixture: FixtureState) {
	return Definitions.get(fixture.definition);
}

Register("fix_fount_1", Fountain);
Register("fix_extra_1", Extractor);