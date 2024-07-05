import PollScenario, { ShowOrMovie } from "../../scenarios/indexable/PollScenario.js";
import { Singleton as ScenarioManager } from "../../scenarios/ScenarioManager.js";
import { NamedComex } from "../Comex.js";

export default new NamedComex("start", "Ends the nomination time and begins voting immediatly. (Poll Creator Only)", {

}, (params, interaction) => {

	if(!interaction.channel)
		return;

	let pollScenario = ScenarioManager?.getScenario(interaction.channel.id, PollScenario) as PollScenario<ShowOrMovie>;
	if(!pollScenario) {
		return;
	}

	if(!pollScenario.isCreator(interaction.user))
		return interaction.reply({content: "You dont have permission to do that.", ephemeral: true });

	interaction.reply(`${interaction.user} is starting the vote.`);
	pollScenario.setVoteTime(new Date());

});