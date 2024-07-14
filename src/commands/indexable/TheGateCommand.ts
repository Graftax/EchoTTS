import { PermissionFlagsBits } from "discord.js";
import { Comex } from "../Comex.js";
import { Command } from "../Command.js";
import { DefaultMemberPermissionsCommandProperty } from "../CommandProperties.js";
import Universe from "../../the_gate/Universe.js";

let GateUniverse: Universe | null = null;

const commandInstance = new Command("the-gate", "Beta", 
	[DefaultMemberPermissionsCommandProperty(PermissionFlagsBits.ManageChannels)],

	new Comex({}, ({}, interaction) => {

		GateUniverse = new Universe();
		GateUniverse.Start();

		GateUniverse.debugAddTemple("everyone");
		GateUniverse.debugAddDaemon("everyone", "Adam");

		console.log(JSON.stringify(GateUniverse.ExportState()));

	})

);

export default commandInstance;