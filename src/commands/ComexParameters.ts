import { ApplicationCommandOptionBase, ApplicationCommandOptionWithAutocompleteMixin, AutocompleteInteraction, CommandInteraction, SlashCommandBuilder, SlashCommandIntegerOption, SlashCommandMentionableOption, SlashCommandNumberOption, SlashCommandOptionsOnlyBuilder, SlashCommandStringOption, SlashCommandSubcommandBuilder } from "discord.js";
import { SlashCommandCommonBuilder } from "./ComexParameterProperties.js";

export type ComexParameterPropertyFunc<BuilderType> = (builder: BuilderType) => void;

type AutoCompleteFunc<BuilderType> = BuilderType extends ApplicationCommandOptionWithAutocompleteMixin ? ((interaction: AutocompleteInteraction) => void) : never;

function builderCanAutocomplete(builder: ApplicationCommandOptionBase): builder is ApplicationCommandOptionBase & ApplicationCommandOptionWithAutocompleteMixin {
	return Object.hasOwn(builder, "setAutocomplete");
}

export interface IComexParameter<ValueType> {
	inscribe(name: string, builder: SlashCommandCommonBuilder): void;
	unpack(name: string, action: CommandInteraction): ValueType | undefined;
	autocomplete(interaction: AutocompleteInteraction): void;
}

abstract class BaseComexParameter<BuilderType extends ApplicationCommandOptionBase, ValueType> implements IComexParameter<ValueType> {

	private _properties;
	private _autoComplete: AutoCompleteFunc<BuilderType> | undefined = undefined;

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

			if(this._autoComplete && builderCanAutocomplete(builder))
				builder.setAutocomplete(true);

			return builder;

		});

	}

	unpack(name: string, action: CommandInteraction)  {
		return action.options.get(name)?.value as ValueType | undefined;
	}

	// Func is type never if parameter doesn't support autocomplete.
	addAutocomplete(func: AutoCompleteFunc<BuilderType>) {
		this._autoComplete = func;
		return this;
	}

	autocomplete(interaction: AutocompleteInteraction): void {

		if(!this._autoComplete) {
			console.error("There was no autocomplete func.");
			return;
		}

		this._autoComplete(interaction);
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

export class MentionableCommandParameter extends BaseComexParameter<SlashCommandMentionableOption, string> {

	override createOption(builder: SlashCommandCommonBuilder, next: (builder: SlashCommandMentionableOption) => SlashCommandMentionableOption) {
		builder.addMentionableOption(next);
	}

}
