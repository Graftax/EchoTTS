import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { Command } from "../Commander.js";
import { Singleton as ScenarioManager } from "../ScenarioManager.js";
import Chatbot from "../scenarios/Chatbot.js";

export default {
	slashcommand: new SlashCommandBuilder()
		.setName('lets-chat')
		.setDescription('Echo will start text chatting in this channel.')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
	async execute(interaction) {

		if(!interaction.channel)
			return;
			
		let chatScenario = ScenarioManager?.getScenario(interaction.channel.id, Chatbot) as Chatbot;

		if(chatScenario) {

			ScenarioManager?.removeScenario(interaction.channel.id, Chatbot);
			interaction.reply({content: "I'm leaving. 👋"});
			return;

		}

		ScenarioManager?.startScenario(Chatbot, interaction.channel);
		interaction.reply({content: "I'm here to talk. 👍"});

	}
} as Command;