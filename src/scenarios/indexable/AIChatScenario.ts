import { Scenario } from "../Scenario.js";
import { Events, Message } from "discord.js";
import fs from "fs";
import OpenAI from 'openai';
import { encodingForModel } from "js-tiktoken";

export default class AIChatScenario extends Scenario {

	_openai = new OpenAI({
		apiKey: process.env.OPENAI_API_KEY,
	});

	init(): void {
		this.client.on(Events.MessageCreate, this.onMessageCreate);
	}

	shutdown() {
		this.client.off(Events.MessageCreate, this.onMessageCreate);
	}

	get isPersistant() {
		return true;
	}

	getSystemString(): string {

		//TODO: Break prompt in to different pieces, like personality, etc.
		return fs.readFileSync("res/introduction.txt").toString();
	}

	isMessageAuthor(message: Message) : boolean {
		return message.author.id == this.client.user?.id;
	}

	// createMessageArray(userInput: Message): Array<OpenAI.Chat.Completions.ChatCompletionMessage> {

	// 	let outArray = new Array<OpenAI.Chat.Completions.ChatCompletionMessage>();

	// 	outArray.push({ role: "system", content: "" });

	// 	this._messages.forEach((message) => {
	// 		let role = this.isMessageAuthor(message) ? ChatCompletionRequestMessageRoleEnum.Assistant : ChatCompletionRequestMessageRoleEnum.User;
	// 		outArray.push({ role: role, content: message.content });
	// 	});

	// 	outArray.push({ role: "user", content: userInput.content });

	// 	return outArray;
	// }

	async createPrompt(): Promise<string> {

		if(!this.channel.isTextBased())
			return "";

		const encoding = encodingForModel("gpt-3.5-turbo-instruct");
		let systemPrompt = this.getSystemString() + "\n";
		let messagesPrompt = "";

		const messages = (await this.channel.messages.fetch({ limit: 50 }));
		for(const entry of messages) {

			const message = entry[1];
			let username = message.author.username;

			if(this.isMessageAuthor(message))
				username = "{Echo}";

			const currMsgText = `${username}: ${message.content}\n`;
			if(encoding.encode(systemPrompt + currMsgText + messagesPrompt).length >= 1900)
				break;

			messagesPrompt = currMsgText + messagesPrompt;
		}

		messagesPrompt += "{Echo}: ";
		
		return `${systemPrompt}${messagesPrompt}`;
	}

	onMessageCreate = async (message: Message) => {

		if (message.channel.id != this.channel.id)
			return;

		if(!this.channel.isTextBased())
			return;

		if (this.isMessageAuthor(message))
			return;

		message.channel.sendTyping();

		let freshPrompt = await this.createPrompt();

		this._openai.completions.create({
			model: "gpt-3.5-turbo-instruct",
			prompt: freshPrompt,
			max_tokens: 1900,
			temperature: 0.85,
			user: "discord_userid_" + message.author.id
		}).then(this.onCompletion).catch(reason => console.log(reason));

	}

	onCompletion = (result: OpenAI.Completions.Completion) => {

		let output = result.choices[0].text;
		if(!output || output.length <= 0)
			output = "❌";
		
		let channel = this.channel;
		if(channel.isTextBased())
			channel.send(output);

	}
};