import { Command } from "../Command.js";
import { DMPermissionCommandProperty } from "../CommandProperties.js";
import PollCreateSubcommand from "../poll/PollCreateSubcommand.js";
import PollNominateSubCommand from "../poll/PollNominateSubcommand.js";

const commandInstance = new Command(
	
	"poll", "Create and participate in polls.",
	[DMPermissionCommandProperty(false)], [
		PollCreateSubcommand,
		PollNominateSubCommand
	]

);

export default commandInstance;