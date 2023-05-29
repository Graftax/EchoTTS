import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, InteractionReplyOptions, InteractionResponse, SlashCommandBuilder, SlashCommandSubcommandBuilder } from "discord.js";
import { Singleton as MovieDBProvider, PosterSize, TVResult } from "../MovieDBProvider.js";
import { Command } from "../Commander";
import { Singleton as ScenarioManager } from "../ScenarioManager.js";
import Poll from "../scenarios/Poll.js";
import IterativeSort from "../IterativeSort.js";
import { MappedInteractionTypes, MessageComponentType } from "discord.js";
import { MessageComponentInteraction } from "discord.js";
import { MessagePayload } from "discord.js";

// https://developers.themoviedb.org/3/getting-started/authentication
// https://developers.themoviedb.org/3/search/search-tv-shows
// Use v4-api https://github.com/thetvdb/v4-api

// TODO:  Create loop message for voting similar to nomination.
function createNominationMessage(title: string, imgUrl: string): InteractionReplyOptions {

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

type InteractionProcessor = (response: MessageComponentInteraction) => InteractionReplyOptions;

async function interactionLoop(response: InteractionResponse<boolean>, onMessage: InteractionProcessor) {

	let originResponse = await response.awaitMessageComponent({
		//filter: (i) => { return i.user.id == userID; }
	});

	let newMessage = onMessage(originResponse);

	if(!newMessage)
		return;

	let replyResponse = await originResponse.reply(newMessage);

	await originResponse.message.delete()

	if(newMessage?.components?.length > 0)
		interactionLoop(replyResponse, onMessage);
}

let command = new SlashCommandBuilder();
command.setName("poll");
command.setDescription("Create and manage polls.")

// Start =======================================================================
command.addSubcommand((subCommand) => {
	return subCommand.setName("create")
		.setDescription("Begins a poll in this channel.")

		.addNumberOption((option) => {
			return option.setName("hours-before-vote")
				.setDescription("How many hours until voting begins.")
				.setRequired(true);
		})

		.addNumberOption((option) => {
			return option.setName("hours-spent-voting")
				.setDescription("How many hours will be allowed for voting.")
				.setRequired(true);
		})

});

function runSubcommandCreate(interaction: CommandInteraction) {

	let pollScenario = ScenarioManager.getScenario(interaction.channel, Poll.name) as Poll;

	// If a poll already exists, then do not create another.
	if(pollScenario)
		return;

	let beforeValue = interaction.options.get("hours-before-vote");
	let spentValue = interaction.options.get("hours-spent-voting");

	pollScenario = new Poll(
		beforeValue ? beforeValue.value as number : null,
		spentValue ? spentValue.value as number : null
	);

	ScenarioManager.startScenario(interaction.channel, pollScenario);
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

async function runSubcommandNominate(interaction: CommandInteraction, pollScenario: Poll) {

	let title = interaction.options.get("title", true);
	let value = await MovieDBProvider.searchTV(title.value as string);

	if(value.results.length <= 0)
		return;

	let result = value.results[0];
	
	let response = await interaction.reply(createNominationMessage(
		result.name,
		MovieDBProvider.createImageURL(result.poster_path, new PosterSize(3))
	))

	let state = {
		index: 0,
		results: value.results,
		poll: pollScenario
	};

	interactionLoop(response, (currResponse) => {

		if(currResponse.customId == "cmd-cancel")
			return {content: "Canceled nomination.", ephemeral: true};

		if(currResponse.customId == "cmd-next")
			state.index = Math.min(state.results.length - 1, state.index + 1);

		if(currResponse.customId == "cmd-prev")
			state.index = Math.max(0, state.index - 1);

		let id = state.results[state.index].id;
		let name = state.results[state.index].name;
		let posterPath = state.results[state.index].poster_path;

		if(currResponse.customId == "cmd-nom") {

			state.poll.addNominee({
				id: id.toString(),
				name: name,
				img_url: MovieDBProvider.createImageURL(posterPath, new PosterSize(3)),
				url: "https://graftax.net",
				nominator: currResponse.user.id
			});

			return { content: `Submitted nomination for ${name}`, ephemeral: true };
		}

		return createNominationMessage(name,
			MovieDBProvider.createImageURL(posterPath, new PosterSize(3))
		);

	});
	
}

// list ========================================================================
command.addSubcommand((subCommand) => {
	return subCommand.setName("list")
		.setDescription("Lists the nominations.");
});

function runSubcommandList(interaction: CommandInteraction, pollScenario: Poll) {

	let items = pollScenario.getNomineeList();
	let content = "Nominees: \n";

	let place = 0;
	for(let currItem of items) {
		place++;
		content += `${place}. ${currItem.name}\n`;
	}

	interaction.reply({
		content: content, 
		ephemeral: true,
	});
	
}
// vote ========================================================================
command.addSubcommand((subCommand) => {
	return subCommand.setName("vote")
		.setDescription("Begins your voting process in this channel.");
});

function runSubCommandVote(interaction: CommandInteraction, pollScenario: Poll) {

	if(!pollScenario.isVoting())
		return;

	let nomList = pollScenario.getNomineeList();

	IterativeSort(nomList, 3, (set, resolve) => {

		// TODO: Create a message and then hook button callbacks in it to resolve with the correct index

		
	
	}).then((sorted) => {

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
		
		if(interaction.options.getSubcommand() == "create" && !pollScenario)
			return runSubcommandCreate(interaction);

		if(!pollScenario)
			return interaction.reply({content: "No poll was found in this channel.", ephemeral: true});

		if(interaction.options.getSubcommand() == "nominate")
			return runSubcommandNominate(interaction, pollScenario);

		if(interaction.options.getSubcommand() == "list")
			return runSubcommandList(interaction, pollScenario);

		if(interaction.options.getSubcommand() == "vote")
			return runSubCommandVote(interaction, pollScenario);
			
	}
} as Command;