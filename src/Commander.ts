class Command {

	private m_func;

	constructor(func) {
		this.m_func = func;
	}

	getFunc() {
		return this.m_func;
	}
}

export default class Commander {

	private m_commandMap: { [key: string]: Command } = {};

	constructor() {
		this.m_commandMap = {};
	}

	// Makes a command avaiable to be called by text.
	registerCommand(name: string, callback) : void {
		this.m_commandMap[name] = new Command(callback);
	}

	// Checks if a client has permissions to use a command.
	canUseCommand(command: Command) {
		return true;
	}

	// Returns a list of command names.
	getCommandList() {
		
		let commandNames: Array<string> = [];
		for(const cmdName in this.m_commandMap) {
			commandNames.push("!" + cmdName);
		}

		return commandNames.sort();

	}

	// Processes the text and runs the apropriate
	exec(text: string, cabinet: object, replyFunc: (text: string) => void) : boolean {

		if(!text.startsWith("!"))
			return false;

		let argList = text.split(' ');

		let currCmd = this.m_commandMap[argList[0].substring(1)];

		if(!currCmd) {
			replyFunc("That is not a valid command.");
			return true;
		}
			
		// TODO: Permissions check here, going to need more supplied data

		currCmd.getFunc()(argList.slice(1), cabinet, replyFunc);
		return true;
	}
}