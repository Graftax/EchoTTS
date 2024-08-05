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

		let live = Fixture.Interact(state, host.location, fixture, host, FixtureInteraction.Siphon);
		if(live) {

			Fixture.Reserve(state, { parts: host.location.parts, fixture: fixture.id }, host);
			return true;

		}

		Fixture.ClearReservation(state, host.location, host);
		return false;

	}
} as ImplementDefinition;