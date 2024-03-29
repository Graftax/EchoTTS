import { SlashCommandBuilder } from "discord.js";
import { Command } from "../Commander.js";
import { Singleton as ScenarioManager } from "../ScenarioManager.js";
import Chatbot from "../scenarios/Chatbot.js";

export default {
	slashcommand: new SlashCommandBuilder()
		.setName('lets-chat')
		.setDescription('Echo will start text chatting in this channel.'),
	async execute(interaction) {

		if(!interaction.channel)
			return;
			
		let chatScenario = ScenarioManager.getScenario(interaction.channel, Chatbot.name) as Chatbot;
		if(!chatScenario) {
			chatScenario = new Chatbot();
			ScenarioManager.startScenario(interaction.channel, chatScenario);
		}

		interaction.reply({content: "I'm here to talk. 👍"});
	}
} as Command;