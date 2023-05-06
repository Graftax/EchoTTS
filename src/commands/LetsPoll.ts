import { ActionRowBuilder, ButtonBuilder, ButtonStyle, InteractionResponse, SlashCommandBuilder } from "discord.js";
import { Singleton as MovieDBProvider, PosterSize, TVResult } from "../MovieDBProvider.js";
import { Command } from "../Commander";

let command = new SlashCommandBuilder();
command.setName("lets-poll");
command.setDescription("Create and manage polls.")

command.addStringOption((option) => {
	return option.setName("nominate")
		.setDescription("What title to search for.");
});

// https://developers.themoviedb.org/3/getting-started/authentication
// https://developers.themoviedb.org/3/search/search-tv-shows
// Use v4-api https://github.com/thetvdb/v4-api

function createNominationMessage(title: string, imgUrl: string) {

	const row = new ActionRowBuilder<ButtonBuilder>();

	row.addComponents(new ButtonBuilder()
	.setCustomId("cmd-prev")
	.setLabel("Prev")
	.setStyle(ButtonStyle.Primary));

	row.addComponents(new ButtonBuilder()
		.setCustomId("cmd-cancel")
		.setLabel("Cancel")
		.setStyle(ButtonStyle.Danger));

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
			title: title,
			image: { url: imgUrl }
		}]
	};

}

interface NominationState {
	index: number,
	results: Array<TVResult>
}

function respondToNomination(response: InteractionResponse<boolean>, userID: string, name: string, posterPath: string, state: NominationState) {

	// TODO: Might need to add a try-catch around this component, it might be timing out
	// when the nomination is canceled.
	response.awaitMessageComponent({

		filter: (i) => { return i.user.id == userID; }}).then((response) => {

			if(response.customId == "cmd-prev") {
				state.index = Math.max(0, state.index - 1);
			}

			if(response.customId == "cmd-cancel") {
				response.reply("Canceled.");
				response.message.delete();
			}

			if(response.customId == "cmd-nom") {
				// TODO: This is where we submit the nomination.
			}

			if(response.customId == "cmd-next") {
				state.index = Math.min(state.results.length - 1, state.index + 1);
			}

			name = state.results[state.index].name;
			posterPath = state.results[state.index].poster_path;

			response.reply(createNominationMessage(
				name,
				MovieDBProvider.createImageURL(posterPath, new PosterSize(3))

			)).then((nextResponse) => {
				response.message.delete();
				respondToNomination(nextResponse, userID, name, posterPath, state);
			});

		});
}

export default {
	slashcommand: command,
	execute(interaction) {

		let title = interaction.options.get("nominate");
		MovieDBProvider.searchTV(title.value as string).then((value) => {

			if(value.results.length <= 0)
				return;

			let results = value.results.splice(0, 10);
			let resultIndex = 0;
			let result = results[resultIndex];
			
			interaction.reply(createNominationMessage(
				result.name,
				MovieDBProvider.createImageURL(result.poster_path, new PosterSize(3))
			)).then((response) => {
				respondToNomination(response, interaction.user.id, result.name, result.poster_path, {
					index: 0,
					results: results
				});
			});
			
		});

	}
} as Command;