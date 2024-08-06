import { Fixture, FixtureInteraction } from "../Fixture.js";
import { ImplementDefinition } from "../ImplementBinding.js";
import { Impulse } from "../Impulse.js";

export default {
	name: "Starvation",
	description: "If energy is less than 10%, locks daemon in Siphon mode until charged.",
	implementFunc(state, host, pulse) {
			
		if(!host.location) return false;

		let fixture = Fixture.GetReservation(state, host.location, host);
		if(!fixture) {

			if(host.energy / host.maxEnergy >= 0.1)
				return false;

			let fixtures = Fixture.WithInteraction(state, host.location, FixtureInteraction.Siphon);
			if(fixtures.length <= 0) return true;

			fixture = fixtures[0];

		}

		return Fixture.Interact(state, host.location, fixture, host, FixtureInteraction.Siphon);

	}
} as ImplementDefinition;