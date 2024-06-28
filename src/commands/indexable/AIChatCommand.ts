import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { ICommand } from "../Commander.js";
import { Singleton as ScenarioManager } from "../../scenarios/ScenarioManager.js";
import AIChatScenario from "../../scenarios/indexable/AIChatScenario.js";

export default {
	slashCommand: new SlashCommandBuilder()
		.setName('ai-chat')
		.setDescription('Echo will start text chatting in this channel.')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
	async execute(interaction) {

		if(!interaction.channel)
			return;
			
		let chatScenario = ScenarioManager?.getScenario(interaction.channel.id, AIChatScenario) as AIChatScenario;

		if(chatScenario) {

			ScenarioManager?.removeScenario(interaction.channel.id, AIChatScenario);
			interaction.reply({content: "I'm leaving. 👋"});
			return;

		}

		ScenarioManager?.startScenario(AIChatScenario, interaction.channel);
		interaction.reply({content: "I'm here to talk. 👍"});

	}
} as ICommand;