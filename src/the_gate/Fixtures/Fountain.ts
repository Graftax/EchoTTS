
import { Fixture, FixtureInteraction } from "./Fixture.js";

Fixture.Register("fountain_1", {
	name: "Fountain",
	getInteractions: (state) => {
		return [FixtureInteraction.Siphon];
	},
	interact(state, where, fixture, operator, intr) {
		operator.energy = operator.maxEnergy;
		return true;
	}
});