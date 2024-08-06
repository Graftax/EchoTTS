import { Fixture, FixtureInteraction } from "../Fixture.js";
import { ImplementDefinition } from "../ImplementBinding.js";
import { Impulse } from "../Impulse.js";
import { Location } from "../Location.js";

export default {
	name: "Crank",
	description: "Cranks a fixture in the room.",
	implementFunc(state, host, pulse) {
		
		if(!host.location) return false;

		let fixture = Fixture.GetReservation(state, host.location, host);
		if(!fixture) {

			let fixtures = Fixture.WithInteraction(state, host.location, FixtureInteraction.Crank);
			if(fixtures.length <= 0) return false;

			fixture = fixtures[0];

		}

		return Fixture.Interact(state, host.location, fixture, host, FixtureInteraction.Crank);

	}
} as ImplementDefinition;