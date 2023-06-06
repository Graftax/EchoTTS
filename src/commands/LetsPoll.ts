import { ActionRowBuilder, BaseMessageOptions, ButtonBuilder, ButtonStyle, Channel, CommandInteraction, InteractionResponse, SlashCommandBuilder, MappedInteractionTypes, ComponentType, ButtonInteraction } from "discord.js";
import { Singleton as MovieDBProvider, PosterSize, TVResult } from "../MovieDBProvider.js";
import { Command } from "../Commander";
import { Singleton as ScenarioManager } from "../ScenarioManager.js";
import Poll from "../scenarios/Poll.js";
import IterativeSort from "../IterativeSort.js";
import { MessageComponentInteraction } from "discord.js";

// https://developers.themoviedb.org/3/getting-started/authentication
// https://developers.themoviedb.org/3/search/search-tv-shows
// Use v4-api https://github.com/thetvdb/v4-api

function createNominationMessage(title: string, imgUrl: string, channel: Channel): BaseMessageOptions {

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
			title: title,
			image: { url: imgUrl }
		}]
	};

}

type InteractionProcessor = (response: MessageComponentInteraction) => BaseMessageOptions;

async function interactionLoop(response: InteractionResponse, onMessage: InteractionProcessor) {

	let interaction = await response.awaitMessageComponent({componentType: ComponentType.Button});
	let newMessage = onMessage(interaction);

	if(!newMessage)
		return;

	interaction.update(newMessage);

	if(newMessage?.components?.length > 0)
		interactionLoop(response, onMessage);
}

let command = new SlashCommandBuilder();
command.setName("poll");
command.setDescription("Create and access polls.")
command.setDMPermission(false);

// create ======================================================================
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

		.addNumberOption((option) => {
			return option.setName("nomination-limit")
				.setDescription("The max number of nominations one person can make. (Default: 1)")
				.setMinValue(1);
		});

});

function runSubcommandCreate(interaction: CommandInteraction) {

	let pollScenario = ScenarioManager.getScenario(interaction.channel, Poll.name) as Poll;

	// If a poll already exists, then do not create another.
	if(pollScenario)
		return interaction.reply({content: `A poll already exists in this channel.`, ephemeral: true});

	let nomLimit = interaction.options.get("nomination-limit");

	pollScenario = new Poll(
		interaction.user.id,
		interaction.options.get("hours-before-vote").value as number,
		interaction.options.get("hours-spent-voting").value as number,
		nomLimit ? nomLimit.value as number : 1
	);

	ScenarioManager.startScenario(interaction.channel, pollScenario);
	interaction.reply(`${interaction.user.username} has created a poll in this channel. You may nominate with \`/poll nominate\`.`);
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

	if(pollScenario.isVoting())
		return interaction.reply({ content:"Nomination is unavailable while the poll is voting.", ephemeral: true });

	let title = interaction.options.get("title", true);
	let value = await MovieDBProvider.searchTV(title.value as string);

	if(value.results.length <= 0)
		return interaction.reply({ content: "No results found.", ephemeral: true });

	let result = value.results[0];
	let pollChannel = pollScenario.channel();

	let response = await interaction.reply({...createNominationMessage(result.name,
		MovieDBProvider.createImageURL(result.poster_path, new PosterSize(3)),
		pollChannel
	), ephemeral: true});

	let state = {
		index: 0,
		searched: value.results,
		poll: pollScenario
	};

	interactionLoop(response, (currResponse) => {

		if(currResponse.customId == "cmd-next")
			state.index = Math.min(state.searched.length - 1, state.index + 1);

		if(currResponse.customId == "cmd-prev")
			state.index = Math.max(0, state.index - 1);

		let id = state.searched[state.index].id;
		let name = state.searched[state.index].name;
		let posterPath = state.searched[state.index].poster_path;

		if(currResponse.customId == "cmd-nom") {

			state.poll.addNominee({
				id: id.toString(),
				name: name,
				img_url: MovieDBProvider.createImageURL(posterPath, new PosterSize(3)),
				url: "https://graftax.net",
				nominator: currResponse.user.id
			});

			if(pollChannel.isTextBased())
				pollChannel.send(`${currResponse.user} nominated ${name}`);

			return { content: `Nomination submitted. ✔`, components: [] };
		}

		return createNominationMessage(name,
			MovieDBProvider.createImageURL(posterPath, new PosterSize(3)),
			pollChannel
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
	let content = `Nominees:\n>>> `;

	for(let currItem of items) {
		content += `${currItem.name}\n`;
	}

	interaction.reply({
		content: content
	});
	
}

// start vote ==================================================================
command.addSubcommand((subCommand) => {
	return subCommand.setName("start-vote")
		.setDescription("Ends the nomination time and begins voting immediatly. (Poll Creator Only)");
});

function runSubCommandStartVote(interaction: CommandInteraction, pollScenario: Poll) {

	if(!pollScenario.isCreator(interaction.user))
		return interaction.reply({content: "You dont have permission to do that.", ephemeral: true });

	interaction.reply(`${interaction.user} is starting the vote.`);
	pollScenario.setVoteTime(new Date());
	
}

// vote ========================================================================
command.addSubcommand((subCommand) => {
	return subCommand.setName("vote")
		.setDescription("Asks questions to submit your ranked vote.");
});

async function runSubCommandVote(interaction: CommandInteraction, pollScenario: Poll) {

	if(!pollScenario.isVoting())
		return await interaction.reply({content: `The poll is not currently voting.`, ephemeral: true});

	let nomList = pollScenario.getNomineeList();
	if(nomList.length <= 1)
		return await interaction.reply({content: `There are not enough nominations to vote on. (${nomList.length})`, ephemeral: true});

	let compInteraction: ButtonInteraction = null;
	
	let sorted = await IterativeSort(nomList, 3, async (set, resolve) => {

		const row = new ActionRowBuilder<ButtonBuilder>();

		set.forEach((value, index) => {

			row.addComponents(new ButtonBuilder()
			.setCustomId(index.toString())
			.setLabel(value.name)
			.setStyle(ButtonStyle.Primary));

		});

		let newMessage = {
			content: `Which of these options do you like the most?`,
			components: [row]
		};

		if(!interaction.replied) {

			let response = await interaction.reply({...newMessage, ephemeral: true});
			compInteraction = await response.awaitMessageComponent({componentType: ComponentType.Button});
			resolve(Number(compInteraction.customId));
			return;

		}

		let buttonResponse = await compInteraction.update(newMessage);
		compInteraction = await buttonResponse.awaitMessageComponent({componentType: ComponentType.Button});
		resolve(Number(compInteraction.customId));
		
	}); // IterativeSort

	let ranking = sorted.map((value) => {
		return value.id;
	});

	let rankingText = ">>> ";
	sorted.forEach((value, index) => {
		rankingText += `${index + 1}. ${value.name}\n`;
	});

	pollScenario.setVote(compInteraction.user.id, ranking);

	compInteraction.update({
		content: `Voting completed, your ranking:\n${rankingText}`,
		components: [],
		embeds: []
	});

	let pollChannel = pollScenario.channel();
	if(pollChannel.isTextBased())
		pollChannel.send(`${compInteraction.user} has voted!`);
}

// end =========================================================================
command.addSubcommand((subCommand) => {
	return subCommand.setName("end")
		.setDescription("Ends the poll immediately. (Poll Creator Only)");
});

function runSubCommandEnd(interaction: CommandInteraction, pollScenario: Poll) {

	if(!pollScenario.isCreator(interaction.user))
		return interaction.reply({content: "You dont have permission to do that.", ephemeral: true });

	interaction.reply(`${interaction.user} is ending the poll.`);
	pollScenario.setEndTime(new Date());

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

		if(interaction.options.getSubcommand() == "start-vote")
			return runSubCommandStartVote(interaction, pollScenario);

		if(interaction.options.getSubcommand() == "vote")
			return runSubCommandVote(interaction, pollScenario);

		if(interaction.options.getSubcommand() == "end")
			return runSubCommandEnd(interaction, pollScenario);
			
	}
} as Command;