import { Singleton as ScenarioManager } from "../../scenarios/ScenarioManager.js";
import PollScenario, { ShowOrMovie } from "../../scenarios/indexable/PollScenario.js";
import { NamedComex } from "../Comex.js";
import { DescriptionParameterProperty, RequiredParameterProperty } from "../ComexParameterProperties.js";
import { StringCommandParameter } from "../ComexParameters.js";

export default new NamedComex("remove", "Remove an item from the poll.", {

	title: new StringCommandParameter(
		DescriptionParameterProperty("The name of the item to remove."),
		RequiredParameterProperty(true))
		// TODO: Autocomplete

}, (params, interaction) => {


});