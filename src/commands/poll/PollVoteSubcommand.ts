import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ComponentType } from "discord.js";
import PollScenario, { ShowOrMovie } from "../../scenarios/indexable/PollScenario.js";
import { Singleton as ScenarioManager } from "../../scenarios/ScenarioManager.js";
import { NamedComex } from "../Comex.js";
import IterativeSort from "../../IterativeSort.js";

export default new NamedComex("vote", "Conducts a survey to find and submit your ranked vote.", {

}, async (params, interaction) => {

	if(!interaction.channel)
		return;

	let pollScenario = ScenarioManager?.getScenario(interaction.channel.id, PollScenario) as PollScenario<ShowOrMovie>;
	if(!pollScenario) {
		return;
	}

	if(!pollScenario.isVoting())
		return await interaction.reply({content: `The poll is not currently voting.`, ephemeral: true});

	let nomList = pollScenario.getNomineeList();
	if(nomList.length <= 1)
		return await interaction.reply({content: `There are not enough nominations to vote on. (${nomList.length})`, ephemeral: true});

	let compInteraction: ButtonInteraction | undefined;

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

		if(!compInteraction)
			return;
		
		let buttonResponse = await compInteraction.update(newMessage);
		compInteraction = await buttonResponse.awaitMessageComponent({componentType: ComponentType.Button});
		resolve(Number(compInteraction.customId));
		
	}); // IterativeSort

	if(!compInteraction)
		return;

	let ranking = sorted.map((value) => {
		return value.uid;
	});

	let rankingText = ">>> ";
	sorted.forEach((value, index) => {
		rankingText += `${index + 1}. ${value.name}\n`;
	});

	pollScenario.setVote(compInteraction.user.id, ranking);

	let pollChannel = pollScenario.channel;
	if(pollChannel.isTextBased())
		pollChannel.send(`${compInteraction.user} has voted!`);

	compInteraction.update({
		content: `Voting completed, your ranking:\n${rankingText}`,
		components: [],
		embeds: []
	});

});