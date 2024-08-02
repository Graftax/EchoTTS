import { Fixture, FixtureDefinition, FixtureInteraction } from "../Fixture.js";

export default {
	name: "Jewel-mill",
	getInteractions: (state) => {
		return [FixtureInteraction.Crank];
	},
	interact(state, where, fixture, operator, intr) {

		let count: number = fixture.properties["count"] ?? 0;

		count++;
		
		fixture.properties["count"] = count;

		if(count >= 3) {
			fixture.properties["count"] = 0;
			return false;
		}

		return true;
	}
} as FixtureDefinition;