import { AutocompleteInteraction, CommandInteraction } from "discord.js";
import { Command } from "../Command.js";
import { DMPermissionCommandProperty } from "../CommandProperties.js";
import PollCreateSubcommand from "../poll/PollCreateSubcommand.js";
import PollListSubcommand from "../poll/PollListSubcommand.js";
import PollNominateSubCommand from "../poll/PollNominateSubcommand.js";
import { Singleton as ScenarioManager } from "../../scenarios/ScenarioManager.js";
import PollScenario, { ShowOrMovie } from "../../scenarios/indexable/PollScenario.js";
import PollEndSubcommand from "../poll/PollEndSubcommand.js";
import PollRemoveSubcommand from "../poll/PollRemoveSubcommand.js";
import PollStartSubcommand from "../poll/PollStartSubcommand.js";
import PollVoteSubcommand from "../poll/PollVoteSubcommand.js";

export function autoCompletePollChoices(interaction: AutocompleteInteraction): void {
		
	if(!interaction.channel)
		return;

	let pollScenario = ScenarioManager?.getScenario(interaction.channel.id, PollScenario) as PollScenario<ShowOrMovie>;
	if(!pollScenario) {
		interaction.respond([]);
		return;
	}

	const focusedValue = interaction.options.getFocused() as string;
	let list = pollScenario.getNomineeList().filter((value) => {
		return value.name.toLowerCase().includes(focusedValue.toLowerCase());
	});

	interaction.respond(
		list.map(choice => ({ name: choice.name, value: choice.uid })),
	);

}

const commandInstance = new Command(
	
	"poll", "Create and participate in polls.",
	[DMPermissionCommandProperty(false)], [
		PollCreateSubcommand,
		PollEndSubcommand,
		PollListSubcommand,
		PollNominateSubCommand,
		PollRemoveSubcommand,
		PollStartSubcommand,
		PollVoteSubcommand]

);

export default commandInstance;