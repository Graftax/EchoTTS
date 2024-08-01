import { Fixture, FixtureInteraction } from "../Fixture.js";
import { Impulse } from "../Impulse.js";
import { Location } from "../Location.js";

Impulse.RegisterImplement("imp-crank", {
	name: "Crank",
	description: "Cranks a fixture in the room.",
	implement(state, host, pulse) {
		
		if(!host.location) return false;

		let fixtures = Fixture.WithInteraction(state, host.location, FixtureInteraction.Crank);
		if(fixtures.length <= 0) return false;

		return Fixture.Interact(state, host.location, fixtures[0], host, FixtureInteraction.Crank);

	},
});