import { Fixture, FixtureInteraction } from "../Fixture.js";
import { Impulse } from "../Impulse.js";

Impulse.RegisterImplement("imp-starve", {
	name: "Starvation",
	description: "If energy is less than 10%, locks daemon in Siphon mode until charged.",
	implement(state, host, pulse) {
			
		if(!host.location) return false;

		if(host.energy / host.maxEnergy >= 0.1)
			return false;

		let fixtures = Fixture.WithInteraction(state, host.location, FixtureInteraction.Siphon);
		if(fixtures.length <= 0) return true;

		return Fixture.Interact(state, host.location, fixtures[0], host, FixtureInteraction.Siphon);

	}
})