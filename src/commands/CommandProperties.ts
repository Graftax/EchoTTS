import { SlashCommandBuilder } from "discord.js";

export type CommandPropertyFunc = (builder: SlashCommandBuilder) => void;
export type CommandProperty = (...args: any) => CommandPropertyFunc;

// Accepts PermissionFlagsBits.
export const DefaultMemberPermissionsCommandProperty = 
(flags: bigint) => (builder: SlashCommandBuilder) => {
	 builder.setDefaultMemberPermissions(flags);
};

export const DMPermissionCommandProperty = 
(enabled: boolean) => (builder: SlashCommandBuilder) => {
	 builder.setDMPermission(enabled);
};
