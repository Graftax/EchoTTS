
import { Fixture, FixtureDefinition, FixtureInteraction } from "../Fixture.js";

export default {
	name: "Fountain",
	getInteractions: (state) => {
		return [FixtureInteraction.Siphon];
	},
	interact(state, where, fixture, operator, intr) {
		operator.energy = operator.maxEnergy;
		return true;
	}
} as FixtureDefinition;