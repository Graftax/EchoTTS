import { Scenario } from "../Scenario.js";
import { AxiosResponse } from "axios";
import { Events, Message } from "discord.js";
import fs from "fs";
import OpenAI from 'openai';

export default class Chatbot extends Scenario {

	_timeout: NodeJS.Timer | null = null;

	_openai = new OpenAI({
		apiKey: process.env.OPENAI_API_KEY,
	});

	init(): void {
		this.client.on(Events.MessageCreate, this.onMessageCreate);
	}

	shutdown() {
		this.client.off(Events.MessageCreate, this.onMessageCreate);
	}

	get name() {
		return "Chatbot";
	}

	get isPersistant() {
		return true;
	}

	getPromptString(): string {

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

		let outString = "";

		outString += this.getPromptString() + "\n";

		if(!this.channel.isTextBased())
			return "";

		const messages = await this.channel.messages.fetch({ limit: 20, cache: true });

		messages.reverse().forEach((message) => {

			let username = message.author.username;
			if(this.isMessageAuthor(message))
				username = "{Echo}";

			outString += `${username}: ${message.content}\n`;
		});

		outString += "{Echo}:"
		return outString;
	}

	onMessageCreate = async (message: Message) => {

		if (message.channel.id != this.channel.id)
			return;

		if(!this.channel.isTextBased())
			return;

		if (this.isMessageAuthor(message))
			return;

		let freshPrompt = await this.createPrompt();

		this._openai.completions.create({
			model: "gpt-3.5-turbo-instruct",
			prompt: freshPrompt,
			max_tokens: 1000,
			temperature: 0.8,
			user: "discord_userid_" + message.author.id
		}).then(this.onCompletion).catch(reason => console.log(reason));

		// this._openai.createChatCompletion({
		// 	model: "gpt-3.5-turbo",
		// 	messages: this.createMessageArray(message)
		// }).then((completion) => {
		// 		this._channel.send(completion.data.choices[0].message);
		// }).catch((reason) => {
		// 	console.error(reason);
		// });

		if (!this._timeout)
			this._timeout = setTimeout(this.onTimeout, 1000 * 60 * 30);

		this._timeout.refresh();
	}

	onCompletion = (completion: OpenAI.Completions.Completion) => {

		let output = completion.choices[0].text;
		if(!output || output.length <= 0)
			output = "❌";
		
		let channel = this.channel;
		if(channel.isTextBased())
			channel.send(output);

	}

	onTimeout = () => {

		let channel = this.channel;
		if(channel.isTextBased())
			channel.send("I'm leaving, goodbye!");

		this.end();

	}
};