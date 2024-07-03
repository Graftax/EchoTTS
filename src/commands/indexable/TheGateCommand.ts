import { PermissionFlagsBits } from "discord.js";
import { Comex } from "../Comex.js";
import { Command } from "../Command.js";
import { DefaultMemberPermissionsCommandProperty } from "../CommandProperties.js";

const commandInstance = new Command("the-gate", "Beta", 
	[DefaultMemberPermissionsCommandProperty(PermissionFlagsBits.ManageChannels)],

	new Comex({}, ({}, interaction) => {

	})

);

export default commandInstance;