
// // remove-nominee ==============================================================
// command.addSubcommand((subCommand) => {
// 	return subCommand.setName("remove")
// 	.setDescription("Remove an item from the poll.")

// 	.addStringOption((option) => {
// 	 	return option.setName("title")
// 		.setDescription("The name of the item to remove.")
// 	 	.setRequired(true)
// 		.setAutocomplete(true);
// 	 });
	
// });

// async function runSubcommandRemove(interaction: CommandInteraction, pollScenario: PollScenario<ShowOrMovie>) {

// 	let titleOption = interaction.options.get("title");
// 	if(!titleOption)
// 		return;

// 	if(titleOption.type != ApplicationCommandOptionType.String)
// 		return;

// 	let uid = titleOption.value as string;

// 	let item = pollScenario.getItem(uid);
// 	if(!item)
// 		return;
	
// 	let res = pollScenario.removeItem(uid, interaction.user.id, false);

// 	if(res)
// 		return interaction.reply({content: res, ephemeral: true});

// 	interaction.reply({content: `${item.name} has been removed by ${interaction.user}`})
	
// }

// // start vote ==================================================================
// command.addSubcommand((subCommand) => {
// 	return subCommand.setName("start")
// 		.setDescription("Ends the nomination time and begins voting immediatly. (Poll Creator Only)");
// });

// function runSubCommandStartVote(interaction: CommandInteraction, pollScenario: PollScenario<ShowOrMovie>) {

// 	if(!pollScenario.isCreator(interaction.user))
// 		return interaction.reply({content: "You dont have permission to do that.", ephemeral: true });

// 	interaction.reply(`${interaction.user} is starting the vote.`);
// 	pollScenario.setVoteTime(new Date());
	
// }

// // vote ========================================================================
// command.addSubcommand((subCommand) => {
// 	return subCommand.setName("vote")
// 		.setDescription("Asks questions to submit your ranked vote.");
// });

// async function runSubCommandVote(interaction: CommandInteraction, pollScenario: PollScenario<ShowOrMovie>) {

// 	if(!pollScenario.isVoting())
// 		return await interaction.reply({content: `The poll is not currently voting.`, ephemeral: true});

// 	let nomList = pollScenario.getNomineeList();
// 	if(nomList.length <= 1)
// 		return await interaction.reply({content: `There are not enough nominations to vote on. (${nomList.length})`, ephemeral: true});

// 	let compInteraction: ButtonInteraction | undefined;
	
// 	let sorted = await IterativeSort(nomList, 3, async (set, resolve) => {

// 		const row = new ActionRowBuilder<ButtonBuilder>();

// 		set.forEach((value, index) => {

// 			row.addComponents(new ButtonBuilder()
// 			.setCustomId(index.toString())
// 			.setLabel(value.name)
// 			.setStyle(ButtonStyle.Primary));

// 		});

// 		let newMessage = {
// 			content: `Which of these options do you like the most?`,
// 			components: [row]
// 		};

// 		if(!interaction.replied) {

// 			let response = await interaction.reply({...newMessage, ephemeral: true});
// 			compInteraction = await response.awaitMessageComponent({componentType: ComponentType.Button});
// 			resolve(Number(compInteraction.customId));
// 			return;

// 		}

// 		if(!compInteraction)
// 			return;
		
// 		let buttonResponse = await compInteraction.update(newMessage);
// 		compInteraction = await buttonResponse.awaitMessageComponent({componentType: ComponentType.Button});
// 		resolve(Number(compInteraction.customId));
		
// 	}); // IterativeSort

// 	if(!compInteraction)
// 		return;

// 	let ranking = sorted.map((value) => {
// 		return value.uid;
// 	});

// 	let rankingText = ">>> ";
// 	sorted.forEach((value, index) => {
// 		rankingText += `${index + 1}. ${value.name}\n`;
// 	});

// 	pollScenario.setVote(compInteraction.user.id, ranking);

// 	let pollChannel = pollScenario.channel;
// 	if(pollChannel.isTextBased())
// 		pollChannel.send(`${compInteraction.user} has voted!`);

// 	compInteraction.update({
// 		content: `Voting completed, your ranking:\n${rankingText}`,
// 		components: [],
// 		embeds: []
// 	});
// }

// // end =========================================================================
// command.addSubcommand((subCommand) => {
// 	return subCommand.setName("end")
// 		.setDescription("Ends the poll immediately. (Poll Creator Only)");
// });

// function runSubCommandEnd(interaction: CommandInteraction, pollScenario: PollScenario<ShowOrMovie>) {

// 	if(!pollScenario.isCreator(interaction.user))
// 		return interaction.reply({content: "You dont have permission to do that.", ephemeral: true });

// 	interaction.reply(`${interaction.user} is ending the poll.`);
// 	pollScenario.setEndTime(new Date());

// }
// //==============================================================================



// 	protected override onAutoComplete(interaction: AutocompleteInteraction): void {
		
// 		if(!interaction.channel)
// 			return;

// 		let pollScenario = ScenarioManager?.getScenario(interaction.channel.id, PollScenario) as PollScenario<ShowOrMovie>;
// 		if(!pollScenario) {
// 			interaction.respond([]);
// 			return;
// 		}

// 		const focusedValue = interaction.options.getFocused() as string;
// 		let list = pollScenario.getNomineeList().filter((value) => {
// 			return value.name.toLowerCase().includes(focusedValue.toLowerCase());
// 		});

// 		interaction.respond(
// 			list.map(choice => ({ name: choice.name, value: choice.uid })),
// 		);

// 	}

// 	override onInteraction(interaction: CommandInteraction): void {

// 		if(!interaction.channel)
// 			return;

// 		// We have to narrow the type
// 		// https://www.reddit.com/r/Discordjs/comments/w3bhv0/interactionoptionsgetsubcommand_wont_work/
// 		if(!interaction.isChatInputCommand())
// 			return;

// 		let pollScenario = ScenarioManager?.getScenario(interaction.channel.id, PollScenario) as PollScenario<ShowOrMovie>;
		
// 		if(interaction.options.getSubcommand() == "create" && !pollScenario)
// 			return runSubcommandCreate(interaction);

// 		if(!pollScenario)
// 			return interaction.reply({content: "No poll was found in this channel.", ephemeral: true});

// 		switch (interaction.options.getSubcommand()) {

// 			case "nominate":
// 				return runSubcommandNominate(interaction, pollScenario);

// 			case "remove":
// 				return runSubcommandRemove(interaction, pollScenario);

// 			case "list":
// 				return runSubcommandList(interaction, pollScenario);

// 			case "start":
// 				return runSubCommandStartVote(interaction, pollScenario);

// 			case "vote":
// 				return runSubCommandVote(interaction, pollScenario);

// 			case "end":
// 				return runSubCommandEnd(interaction, pollScenario);

// 		}
// 	}
// }

// let instance = new PollCommand();
// export default instance;

// {



// } extends Command

