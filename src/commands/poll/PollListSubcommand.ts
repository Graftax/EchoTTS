import { Singleton as ScenarioManager } from "../../scenarios/ScenarioManager.js";
import PollScenario, { ShowOrMovie } from "../../scenarios/indexable/PollScenario.js";
import { NamedComex } from "../Comex.js";

export default new NamedComex("list", "Lists the nominations.", {

}, (params, interaction) => {

	if(!interaction.channel)
		return;

	let pollScenario = ScenarioManager?.getScenario(interaction.channel.id, PollScenario<ShowOrMovie>, ) as PollScenario<ShowOrMovie>;

	let content = pollScenario.timeStatusString();

	content += `\nNominees:\n>>> `;

	let items = pollScenario.getNomineeList();

	for(let currItem of items) {

		// TODO: Make these in to links, which means adding URLs to the poll itself.
		content += `${currItem.name}\n`;
	}

	interaction.reply({
		content: content
	});
	
});