import { PermissionFlagsBits } from "discord.js";
import { Singleton as ScenarioManager } from "../../scenarios/ScenarioManager.js";
import AIChatScenario from "../../scenarios/indexable/AIChatScenario.js";
import { Comex } from "../Comex.js";
import { Command } from "../Command.js";
import { DefaultMemberPermissionsCommandProperty } from "../CommandProperties.js";

const commandInstance = new Command("ai-chat", "Toggles AI assistant mode in this channel.", 
	[DefaultMemberPermissionsCommandProperty(PermissionFlagsBits.ManageChannels)],

	new Comex({}, ({}, interaction) => {

		if(!interaction.channel)
			return;
			
		let chatScenario = ScenarioManager?.getScenario(interaction.channel.id, AIChatScenario);

		if(chatScenario) {

			ScenarioManager?.removeScenario(interaction.channel.id, AIChatScenario);
			interaction.reply({content: "Echo has stopped assisting in this channel."});
			return;

		}

		ScenarioManager?.startScenario(AIChatScenario, interaction.channel);
		interaction.reply({content: "Echo is now assisting in this channel."});

}));

export default commandInstance;