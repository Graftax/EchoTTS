import { ActionRowBuilder, BaseMessageOptions, ButtonBuilder, ButtonStyle, Channel, InteractionResponse, MessageComponentInteraction } from "discord.js";
import TVMazeProvider, { SearchResult } from "../../TVMazeProvider.js";
import { Singleton as ScenarioManager } from "../../scenarios/ScenarioManager.js";
import PollScenario, { ShowOrMovie } from "../../scenarios/indexable/PollScenario.js";
import { NamedComex } from "../Comex.js";
import { DescriptionParameterProperty, RequiredParameterProperty } from "../ComexParameterProperties.js";
import { StringCommandParameter } from "../ComexParameters.js";

function createNominationMessage(item: SearchResult, channel: Channel): BaseMessageOptions {

	const row = new ActionRowBuilder<ButtonBuilder>();

	row.addComponents(new ButtonBuilder()
	.setCustomId("cmd-prev")
	.setLabel("Prev")
	.setStyle(ButtonStyle.Primary));

	row.addComponents(new ButtonBuilder()
		.setCustomId("cmd-nom")
		.setLabel("Nominate")
		.setStyle(ButtonStyle.Success));

	row.addComponents(new ButtonBuilder()
		.setCustomId("cmd-next")
		.setLabel("Next")
		.setStyle(ButtonStyle.Primary));

	return {
		content: `Select which show you would like to nominate.`,
		components: [row],
		embeds: [{
			title: item.show.name,
			image: { url: item.show.image?.medium },
			description: item.show.summary,
			url: item.show.url
		}]
	};

}

type InteractionProcessor = (response: MessageComponentInteraction) => BaseMessageOptions;

async function interactionLoop(response: InteractionResponse, onMessage: InteractionProcessor) {

	let interaction = await response.awaitMessageComponent();
	let newMessage = onMessage(interaction);

	if(!newMessage)
		return;

	interaction.update(newMessage);

	if(!newMessage.components)
		return;

	if(newMessage.components.length <= 0)
		return;

	interactionLoop(response, onMessage);
}

export default new NamedComex("nominate", "Nominate a show to be in the poll.", {

	title: new StringCommandParameter(
		DescriptionParameterProperty("The name of the show to search for."),
		RequiredParameterProperty(true))

}, async (params, interaction) => {

	if(!interaction.channel || !params.title)
		return;

	let pollScenario = ScenarioManager?.getScenario(interaction.channel.id, PollScenario<ShowOrMovie>, ) as PollScenario<ShowOrMovie>;

	if(pollScenario.isVoting())
		return interaction.reply({ content:"Nomination is unavailable while the poll is voting.", ephemeral: true });
	
	let searchResults = await TVMazeProvider.search(params.title);

	if(searchResults.length <= 0)
		return interaction.reply({ content: "No results found.", ephemeral: true });

	let result = searchResults[0];
	let pollChannel = pollScenario.channel;

	let response = await interaction.reply({...createNominationMessage(result,
		pollChannel
	), ephemeral: true});

	let state = {
		index: 0,
		searched: searchResults,
		poll: pollScenario
	};

	interactionLoop(response, (currResponse) => {

		if(currResponse.customId == "cmd-next")
			state.index = Math.min(state.searched.length - 1, state.index + 1);

		if(currResponse.customId == "cmd-prev")
			state.index = Math.max(0, state.index - 1);

		let id = state.searched[state.index].show.id;
		let name = state.searched[state.index].show.name;
		let posterPath = state.searched[state.index].show.image?.medium;

		if(currResponse.customId == "cmd-nom") {

			let res = state.poll.addItem(currResponse.user.id, {
				uid: id.toString(),
				name: name,
				img_url: posterPath,
				url: state.searched[state.index].show.url
			});

			if(res) return {content: res, components: [], embeds: []};

			if(pollChannel.isTextBased())
				pollChannel.send(`${currResponse.user} nominated ${name}`);

			return { content: `Nomination submitted. ✔`, components: [] };
		}

		return createNominationMessage(state.searched[state.index], pollChannel);

	});
});