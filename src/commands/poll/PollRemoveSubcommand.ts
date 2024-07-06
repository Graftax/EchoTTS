import { Singleton as ScenarioManager } from "../../scenarios/ScenarioManager.js";
import PollScenario, { ShowOrMovie } from "../../scenarios/indexable/PollScenario.js";
import { NamedComex } from "../Comex.js";
import { DescriptionParameterProperty, RequiredParameterProperty } from "../ComexParameterProperties.js";
import { StringCommandParameter } from "../ComexParameters.js";
import { autoCompletePollChoices } from "../indexable/PollCommand.js";

export default new NamedComex("remove", "Remove an item from the poll.", {

	title: new StringCommandParameter(
		DescriptionParameterProperty("The name of the item to remove."),
		RequiredParameterProperty(true)).addAutocomplete(autoCompletePollChoices)

}, (params, interaction) => {

	if(!params.title || !interaction.channel)
		return;

	let pollScenario = ScenarioManager?.getScenario(interaction.channel.id, PollScenario) as PollScenario<ShowOrMovie>;
	if(!pollScenario) {
		return;
	}

	let item = pollScenario.getItem(params.title);
	if(!item)
		return;

	let res = pollScenario.removeItem(params.title, interaction.user.id, false);

	if(res)
		return interaction.reply({content: res, ephemeral: true});

	interaction.reply({content: `${item.name} has been removed by ${interaction.user}`});

});