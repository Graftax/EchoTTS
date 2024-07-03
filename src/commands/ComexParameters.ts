import { ApplicationCommandOptionBase, CommandInteraction, SlashCommandBuilder, SlashCommandIntegerOption, SlashCommandMentionableOption, SlashCommandNumberOption, SlashCommandStringOption, SlashCommandSubcommandBuilder } from "discord.js";
import { ComexParameterPropertyFunc, SlashCommandCommonBuilder } from "./ComexParameterProperties.js";

export interface IComexParameter<ValueType> {
	inscribe(name: string, builder: SlashCommandCommonBuilder): void;
	unpack(name: string, action: CommandInteraction): ValueType | undefined;
}

abstract class BaseComexParameter<BuilderType extends ApplicationCommandOptionBase, ValueType> implements IComexParameter<ValueType> {

	private _properties;

	constructor(...properties: ComexParameterPropertyFunc<BuilderType>[]) {
		this._properties = properties;
	}

	protected abstract createOption(builder: SlashCommandCommonBuilder, next: (builder: BuilderType) => BuilderType): void;
	protected inscribeOption(builder: BuilderType) {};

	inscribe(name: string, builder: SlashCommandCommonBuilder) {

		this.createOption(builder, (builder: BuilderType) => {

			builder.setName(name);
			this.inscribeOption(builder);
			for(const prop of this._properties)
				prop(builder);

			return builder;

		});

	}

	unpack(name: string, action: CommandInteraction)  {
		return action.options.get(name)?.value as ValueType | undefined;
	}

}

export class StringCommandParameter extends BaseComexParameter<SlashCommandStringOption, string> {

	override createOption(builder: SlashCommandCommonBuilder, next: (builder: SlashCommandStringOption) => SlashCommandStringOption) {
			builder.addStringOption(next);
	}

}

export class NumberCommandParameter extends BaseComexParameter<SlashCommandNumberOption, number> {

	override createOption(builder: SlashCommandCommonBuilder, next: (builder: SlashCommandNumberOption) => SlashCommandNumberOption) {
		builder.addNumberOption(next);
	}

}

export class IntegerCommandParameter extends BaseComexParameter<SlashCommandIntegerOption, number> {

	override createOption(builder: SlashCommandCommonBuilder, next: (builder: SlashCommandIntegerOption) => SlashCommandIntegerOption) {
		builder.addIntegerOption(next);
	}

}

export class MentionableCommandParameter extends BaseComexParameter<SlashCommandMentionableOption, number> {

	override createOption(builder: SlashCommandCommonBuilder, next: (builder: SlashCommandMentionableOption) => SlashCommandMentionableOption) {
		builder.addMentionableOption(next);
	}

}
