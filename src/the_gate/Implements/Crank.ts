import { Fixture, FixtureInteraction } from "../Fixture.js";
import { ImplementDefinition } from "../ImplementBinding.js";
import { Impulse } from "../Impulse.js";
import { Location } from "../Location.js";

export default {
	name: "Crank",
	description: "Cranks a fixture in the room.",
	implementFunc(state, host, pulse) {
		
		if(!host.location) return false;

		let fixtures = Fixture.WithInteraction(state, host.location, FixtureInteraction.Crank);
		if(fixtures.length <= 0) return false;

		return Fixture.Interact(state, host.location, fixtures[0], host, FixtureInteraction.Crank);

	}
} as ImplementDefinition;