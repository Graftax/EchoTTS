import { AutocompleteInteraction, CommandInteraction, SlashCommandBuilder } from "discord.js";
import { IComexParameter } from "./ComexParameters.js";
import { SlashCommandCommonBuilder } from "./ComexParameterProperties.js";

type ComexParameters = {
	[key: string]: IComexParameter<unknown>
};

type ComexParameterTypes<Type extends ComexParameters> = {
	[Property in keyof Type]: Type[Property] extends IComexParameter<infer Param> ? Param | undefined : never;
};

type ComexExecutorFunc<Params extends ComexParameters> = (params: ComexParameterTypes<Params>, interaction: CommandInteraction) => void;

export interface IComex {

	inscribe: (builder: SlashCommandCommonBuilder) => SlashCommandCommonBuilder;
	execute: (interaction: CommandInteraction | AutocompleteInteraction) => void;
}

export interface INamedComex extends IComex {
	get name(): string;
}

export class Comex<Params extends ComexParameters> implements IComex {

	_params;
	_execute;

	constructor(params: Params, executor: ComexExecutorFunc<Params>) {
		this._params = params;
		this._execute = executor;
	}

	inscribe(builder: SlashCommandCommonBuilder) {

		for(let propName in this._params)
			this._params[propName].inscribe(propName, builder);

		return builder;
	}

	execute(interaction: CommandInteraction | AutocompleteInteraction): void {
		
		if(interaction.isAutocomplete()) {

			const focusedOption = interaction.options.getFocused(true);
			this._params[focusedOption.name].autocomplete(interaction);
			return;

		}

		let keys = Object.keys(this._params);
		let res = Object.values(this._params);
		let mapped = res.map(((param, index) => param.unpack(keys[index], interaction))) as ComexParameterTypes<Params>;
		this._execute(mapped, interaction);

	}
}

export class NamedComex<Params extends ComexParameters> extends Comex<Params> implements INamedComex {

	_name;
	_description;

	constructor(name: string, description: string, params: Params, executor: ComexExecutorFunc<Params>) {
		super(params, executor);
		this._name = name;
		this._description = description;
	}

	get name() {
		return this._name;
	}

	override inscribe(builder: SlashCommandCommonBuilder): SlashCommandCommonBuilder {

			super.inscribe(builder);
			builder.setName(this._name);
			return builder.setDescription(this._description);

	}
}