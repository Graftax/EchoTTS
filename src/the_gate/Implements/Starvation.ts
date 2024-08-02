import { Fixture, FixtureInteraction } from "../Fixture.js";
import { ImplementDefinition } from "../ImplementBinding.js";
import { Impulse } from "../Impulse.js";

export default {
	name: "Starvation",
	description: "If energy is less than 10%, locks daemon in Siphon mode until charged.",
	implementFunc(state, host, pulse) {
			
		if(!host.location) return false;

		if(host.energy / host.maxEnergy >= 0.1)
			return false;

		let fixtures = Fixture.WithInteraction(state, host.location, FixtureInteraction.Siphon);
		if(fixtures.length <= 0) return true;

		return Fixture.Interact(state, host.location, fixtures[0], host, FixtureInteraction.Siphon);

	}
} as ImplementDefinition;