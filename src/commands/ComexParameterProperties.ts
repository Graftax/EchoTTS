import { Method } from "axios";
import { APIApplicationCommandIntegerOption, ApplicationCommandOptionBase, SlashCommandBuilder, SlashCommandIntegerOption, SlashCommandOptionsOnlyBuilder, SlashCommandStringOption, SlashCommandSubcommandBuilder } from "discord.js";

export type ComexParameterPropertyFunc<BuilderType> = (builder: BuilderType) => void;
export type ComexParameterProperty<BuilderType, MethodType> = MethodType;
export type SlashCommandCommonBuilder = SlashCommandBuilder | SlashCommandSubcommandBuilder;

// https://github.com/microsoft/TypeScript/issues/52791
// type ConstructorParameters<T extends abstract new (...args: any    ) => any> =
//                            T extends abstract new (...args: infer P) => any ? P : never;

type ArrowFunc = (...args: any) => any;

function BuilderMethodProperty<BuilderType,
	Indexer extends keyof BuilderType,
	MethodType extends ArrowFunc = BuilderType[Indexer] extends ArrowFunc ? BuilderType[Indexer] : never,
	Params extends any[] = Parameters<MethodType>>(method: MethodType) {
	
	return (...args: Params) => (builder: BuilderType) => { 
		return method.call(builder, ...args); 
	};

}

export const DescriptionParameterProperty =
	BuilderMethodProperty<ApplicationCommandOptionBase, "setDescription">(
		ApplicationCommandOptionBase.prototype.setDescription);

export const ChoicesParameterProperty =
	BuilderMethodProperty<SlashCommandStringOption, "addChoices">(
		SlashCommandStringOption.prototype.addChoices);

export const RequiredParameterProperty = 
	BuilderMethodProperty<ApplicationCommandOptionBase, "setRequired">(
		ApplicationCommandOptionBase.prototype.setRequired);

export const MinValueParameterProperty = 
	BuilderMethodProperty<SlashCommandIntegerOption, "setMinValue">(
		SlashCommandIntegerOption.prototype.setMinValue);