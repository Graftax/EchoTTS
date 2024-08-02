
import { Fixture, FixtureInteraction } from "../Fixture.js";
import { FixtureDefinition } from "../FixtureBinding.js";

export default {
	name: "Fountain",
	getInteractions: (state) => {
		return [FixtureInteraction.Siphon];
	},
	interact(state, where, fixture, operator, intr) {
		
		operator.energy += 6;

		if(operator.energy >= operator.maxEnergy) {
			operator.energy = operator.maxEnergy;
			return false;
		}

		return true;
	}
} as FixtureDefinition;