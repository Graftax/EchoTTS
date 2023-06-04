import { ActionRowBuilder, BaseMessageOptions, ButtonBuilder, ButtonStyle, CommandInteraction, InteractionReplyOptions, InteractionResponse, Message, MessageCreateOptions, PermissionFlagsBits, SlashCommandBuilder, SlashCommandSubcommandBuilder } from "discord.js";
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
function createNominationMessage(title: string, imgUrl: string): BaseMessageOptions {

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

type InteractionProcessor = (response: MessageComponentInteraction) => BaseMessageOptions;

async function interactionLoop(response: Message, onMessage: InteractionProcessor) {

	let originResponse = await response.awaitMessageComponent({
		//filter: (i) => { return i.user.id == userID; }
	});

	let newMessage = onMessage(originResponse);

	if(!newMessage)
		return;

	let replyResponse = await originResponse.channel.send(newMessage);

	if(!originResponse.ephemeral)
		await originResponse.message.delete();

	if(newMessage?.components?.length > 0)
		interactionLoop(replyResponse, onMessage);
}

let command = new SlashCommandBuilder();
command.setName("poll");
command.setDescription("Create and manage polls.")

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
	interaction.reply(`${interaction.user.username} has created a poll in this channel.`);
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
	
	let dmChannel = await interaction.user.createDM();

	let response = await dmChannel.send(createNominationMessage(
		result.name,
		MovieDBProvider.createImageURL(result.poster_path, new PosterSize(3))
	));
	
	await interaction.reply({content: "Continue nominating in your direct messages.", ephemeral: true})
	
	let state = {
		index: 0,
		searched: value.results,
		poll: pollScenario
	};

	interactionLoop(response, (currResponse) => {

		if(currResponse.customId == "cmd-cancel")
			return {content: "Canceled nomination.", ephemeral: true};

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

			let pollChannel = pollScenario.channel();
			if(pollChannel.isTextBased())
				pollChannel.send(`${currResponse.user} submitted a nomination for ${name}`);

			return { content: `You have nominated ${name}.` };
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

// start vote ==================================================================
command.addSubcommand((subCommand) => {
	return subCommand.setName("start-vote")
		.setDescription("Ends the nomination time and begins voting immediatly.");
});

function runSubCommandStartVote(interaction: CommandInteraction, pollScenario: Poll) {
	pollScenario.setVoteTime(new Date());
	interaction.deferReply();
}

// vote ========================================================================
command.addSubcommand((subCommand) => {
	return subCommand.setName("vote")
		.setDescription("Begins your voting process in this channel.");
});

async function runSubCommandVote(interaction: CommandInteraction, pollScenario: Poll) {

	if(!pollScenario.isVoting())
		return;

	let nomList = pollScenario.getNomineeList();
	let currItn: CommandInteraction | MessageComponentInteraction = interaction;

	let sorted = await IterativeSort(nomList, 3, async (set, resolve) => {

		const row = new ActionRowBuilder<ButtonBuilder>();

		set.forEach((value, index) => {

			row.addComponents(new ButtonBuilder()
			.setCustomId(index.toString())
			.setLabel(value.name)
			.setStyle(ButtonStyle.Primary));

		});

		let buttonItn = await currItn.reply({
			components: [row],
			ephemeral: true
		});
		
		// TODO: Test this and check if message exists before deleting.
		// I bet it is trying to delete the commandinteraction or something.
		if(currItn.isMessageComponent())
			currItn.message.delete();

		currItn = await buttonItn.awaitMessageComponent();
		resolve(Number(currItn.customId));
		
	});

	let ranking = sorted.map((value) => {
		return value.id;
	});

	let rankedNames = sorted.map((value) => {
		return value.name;
	})

	pollScenario.setVote(currItn.user.id, ranking);
	currItn.reply({
		content: `Voting Completed, your ranking: ${JSON.stringify(rankedNames)}`,
		ephemeral: true
	});

	currItn.channel.send(`${currItn.user.username} has finished voting!`);
}

// end =========================================================================
command.addSubcommand((subCommand) => {
	return subCommand.setName("end")
		.setDescription("Ends the poll immediately.");
});

function runSubCommandEnd(interaction: CommandInteraction, pollScenario: Poll) {

	//if(interaction.memberPermissions.has(PermissionFlagsBits.ManageChannels)
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