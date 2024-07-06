import { AutocompleteInteraction, CommandInteraction, RESTPostAPIApplicationCommandsJSONBody, SlashCommandBuilder } from "discord.js";
import { IComex, INamedComex } from "./Comex.js";
import { CommandPropertyFunc } from "./CommandProperties.js";

// function constructorNameToCommandName(structorName: string) {

// 	const results = Array.from(structorName.matchAll(/([A-Z][a-z]*)/g));
// 	const strings = results.map(expRes => expRes[0].toLowerCase());
// 	const filtered = strings.filter(value => value == "command");
// 	return filtered.join("-");

// }

// Creates a type that is the literal keys of [Type].
// type Keys<Type> = {
// 	[Key in keyof Type]: Key
// };

// Creates a type that is the literal types of [Type], ordered by [Keys]
// type OrderedTypes<Type, Keys> = {
//   [Indexer in keyof Keys]: Keys[Indexer] extends keyof Type 
// 		? Type[Keys[Indexer]] 
// 		: never;
// };

// Creates a type that is the literal types of [TArray] in order of declaration. 
//type ArrayTypes<TArray extends readonly any[]> = OrderedTypes<TArray, Keys<TArray>>;

type OneOrManyIComex = IComex | INamedComex[];

export class Command {

	private _name;
	private _description;
	private _properties;
	private _executions;

	constructor(name: string, description: string, properties: CommandPropertyFunc[] = [], exeutions: OneOrManyIComex) {
		this._name = name;
		this._description = description;
		this._properties = properties;
		this._executions = exeutions;
	}

	get name() {
		return this._name;
	}

	toJSON(): RESTPostAPIApplicationCommandsJSONBody {
		return this.createCommandBuilder().toJSON();
	}

	receiveInteraction(interaction: CommandInteraction | AutocompleteInteraction) {

		let execution = this.selectExecution(interaction);
		if(!execution)
			return;

		execution.execute(interaction);
	}

	selectExecution(interaction: CommandInteraction | AutocompleteInteraction): IComex | undefined {

		if(!Array.isArray(this._executions))
			return this._executions;
		
		// We have to narrow the type
 		// https://www.reddit.com/r/Discordjs/comments/w3bhv0/interactionoptionsgetsubcommand_wont_work/
		if(interaction.isChatInputCommand()) {
		
			let subCommand = interaction.options.getSubcommand();
			if(subCommand.length > 0) {

				let found = this._executions.find(exe => exe.name == subCommand);
				if(found) return found;
				
			}
		}

		return undefined;
	}

	createCommandBuilder(): SlashCommandBuilder {

		let builder = new SlashCommandBuilder();

		builder.setName(this._name);
		builder.setDescription(this._description);
		for(const prop of this._properties)
			prop(builder);

		if(!Array.isArray(this._executions)) {
			this._executions.inscribe(builder);
			return builder;
		}

		this._executions.forEach(currExe => {
			
			builder.addSubcommand((subBuilder) => {
				currExe.inscribe(subBuilder);
				return subBuilder;
			});

		});

		return builder;

	}
}