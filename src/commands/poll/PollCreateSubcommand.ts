import { NamedComex } from "../Comex.js";
import { DescriptionParameterProperty, MinValueParameterProperty, RequiredParameterProperty } from "../ComexParameterProperties.js";
import { IntegerCommandParameter, MentionableCommandParameter, NumberCommandParameter } from "../ComexParameters.js";
import { Singleton as ScenarioManager } from "../../scenarios/ScenarioManager.js";
import PollScenario, { ShowOrMovie } from "../../scenarios/indexable/PollScenario.js";

export default new NamedComex("create", "Begins a poll in this channel.", {

	hours_before_vote: new NumberCommandParameter(
		DescriptionParameterProperty("How many hours until voting begins."),
		RequiredParameterProperty(true)),

	hours_spent_voting: new NumberCommandParameter(
		DescriptionParameterProperty("How many hours will be allowed for voting."),
		RequiredParameterProperty(true)),

	nomination_limit: new IntegerCommandParameter(
		DescriptionParameterProperty("The max number of nominations one person can make. (Default: 1)"),
		MinValueParameterProperty(1)),

	mention: new MentionableCommandParameter(
		DescriptionParameterProperty("The mention to use for poll announcements."))

}, (params, interaction) => {
	
	if(!interaction.channel || !params.hours_before_vote || !params.hours_spent_voting)
		return;

	let pollScenario = ScenarioManager?.getScenario(interaction.channel.id, PollScenario<ShowOrMovie>, ) as PollScenario<ShowOrMovie>;

	// If a poll already exists, then do not create another.
	if(pollScenario)
		return interaction.reply({content: `A poll already exists in this channel.`, ephemeral: true});

	// TODO: Add mentionable for poll announcements.
	pollScenario = ScenarioManager?.startScenario(PollScenario<ShowOrMovie>, interaction.channel) as PollScenario<ShowOrMovie>;
	
	pollScenario.configurePoll(
		interaction.user.id,
		params.hours_before_vote,
		params.hours_spent_voting,
		params.nomination_limit ? params.nomination_limit : 1
	)

	interaction.reply(`${interaction.user} has created a poll in this channel. You may nominate with \`/poll nominate\`. ${pollScenario.timeStatusString()}`);

})