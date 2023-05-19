import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, InteractionResponse, SlashCommandBuilder, SlashCommandSubcommandBuilder } from "discord.js";
import { Singleton as MovieDBProvider, PosterSize, TVResult } from "../MovieDBProvider.js";
import { Command } from "../Commander";
import { Singleton as ScenarioManager } from "../ScenarioManager.js";
import Poll from "../scenarios/Poll.js";

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
	results: Array<TVResult>,
	poll: Poll
}

function respondToNomination(response: InteractionResponse<boolean>, userID: string, name: string, posterPath: string, state: NominationState) {

	// TODO: Might need to add a try-catch around this component, it might be timing out
	// when the nomination is canceled.
	response.awaitMessageComponent({

		filter: (i) => { return i.user.id == userID; }}).then((response) => {

			if(response.customId == "cmd-next") {
				state.index = Math.min(state.results.length - 1, state.index + 1);
			}

			if(response.customId == "cmd-prev") {
				state.index = Math.max(0, state.index - 1);
			}

			let id = state.results[state.index].id;
			name = state.results[state.index].name;
			posterPath = state.results[state.index].poster_path;

			if(response.customId == "cmd-cancel") {
				response.reply({ content: "Canceled nomination.", ephemeral: true});
				response.message.delete();
				return;
			}

			if(response.customId == "cmd-nom") {

				state.poll.addNominee(id.toString(), {
					name: name,
					img_url: MovieDBProvider.createImageURL(posterPath, new PosterSize(3)),
					url: "https://graftax.net",
					nominator: response.user.id
				});

				response.reply({ content: `Submitted nomination for ${name}`, ephemeral: true});
				response.message.delete();
				return;
			}

			response.reply(createNominationMessage(
				name,
				MovieDBProvider.createImageURL(posterPath, new PosterSize(3))

			)).then((replyResponse) => {

				return Promise.all([response.message.delete(), replyResponse]);

			}).then(([deleteResponse, replyResponse]) => {

				respondToNomination(replyResponse, userID, name, posterPath, state);

			});

		});
}

let command = new SlashCommandBuilder();
command.setName("poll");
command.setDescription("Create and manage polls.")

// Start =======================================================================
command.addSubcommand((subCommand) => {
	return subCommand.setName("start")
		.setDescription("Begins a poll in this channel.");
});

function runSubcommandStart(interaction: CommandInteraction) {

	let pollScenario = ScenarioManager.getScenario(interaction.channel, Poll.name) as Poll;

	// If a poll already exists, then do not create another.
	if(pollScenario)
		return;

	ScenarioManager.startScenario(interaction.channel, new Poll());
}

// Nominate ====================================================================
command.addSubcommand((subCommand) => {
	return subCommand.setName("nominate")
	.setDescription("Nominate a show to be in the poll.")

	.addStringOption((option) => {
	 	return option.setName("title")
		.setDescription("The name of the show to search for.")
	 	.setRequired(true);
	 });
	
	});

function runSubcommandNominate(interaction: CommandInteraction, pollScenario: Poll) {

	let title = interaction.options.get("title", true);
	MovieDBProvider.searchTV(title.value as string).then((value) => {

		if(value.results.length <= 0)
			return;

		let result = value.results[0];
		
		interaction.reply(createNominationMessage(
			result.name,
			MovieDBProvider.createImageURL(result.poster_path, new PosterSize(3))
		)).then((response) => {

			respondToNomination(response, interaction.user.id, result.name, result.poster_path, {
				index: 0,
				results: value.results,
				poll: pollScenario
			});

		});
		
	});

}

// Start =======================================================================
command.addSubcommand((subCommand) => {
	return subCommand.setName("list")
		.setDescription("Lists the nominations.");
});

function runSubcommandList(interaction: CommandInteraction, pollScenario: Poll) {

	let items = pollScenario.getNomineeList();
	let content = "Nominees: \n";

	let place = 0;
	for(let uid in items) {
		let currItem = items[uid];
		place++;
		content += `${place}. ${currItem.name}\n`;
	}

	interaction.reply({
		content: content, 
		ephemeral: true,
	});
	
}

//==============================================================================

export default {
	slashcommand: command,
	execute(interaction) {

		// We have to narrow the type
		// https://www.reddit.com/r/Discordjs/comments/w3bhv0/interactionoptionsgetsubcommand_wont_work/
		if(!interaction.isChatInputCommand())
			return;

		let pollScenario = ScenarioManager.getScenario(interaction.channel, Poll.name) as Poll;
		
		if(interaction.options.getSubcommand() == "start" && !pollScenario)
			return runSubcommandStart(interaction);

		if(!pollScenario)
			return interaction.reply({content: "No poll was found in this channel.", ephemeral: true});

		if(interaction.options.getSubcommand() == "nominate")
			return runSubcommandNominate(interaction, pollScenario);

		if(interaction.options.getSubcommand() == "list")
			return runSubcommandList(interaction, pollScenario);
			
	}
} as Command;