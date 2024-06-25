import { Scenario } from "../Scenario.js";
import { AxiosResponse } from "axios";
import { Events, Message } from "discord.js";
import fs from "fs";
import OpenAI from 'openai';

export default class Chatbot extends Scenario {

	_messages = new Array<Message>();
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

	getPromptString(): string {

		//TODO: Break prompt in to different pieces, like personality, etc.
		return fs.readFileSync("res/introduction.txt").toString();
	}

	isMessageAuthor(message: Message) : boolean {
		return message.author.id == this.client.user?.id;
	}

	// createMessageArray(userInput: Message): Array<ChatCompletionRequestMessage> {

	// 	let outArray = new Array<ChatCompletionRequestMessage>();

	// 	outArray.push({ role: "system", content: "" });

	// 	this._messages.forEach((message) => {
	// 		let role = this.isMessageAuthor(message) ? ChatCompletionRequestMessageRoleEnum.Assistant : ChatCompletionRequestMessageRoleEnum.User;
	// 		outArray.push({ role: role, content: message.content });
	// 	});

	// 	outArray.push({ role: "user", content: userInput.content });

	// 	return outArray;
	// }

	createPrompt(userInput: Message): string {

		let outString = "";

		outString += this.getPromptString() + "\n";

		this._messages.forEach((message) => {

			let username = message.author.username;
			if(this.isMessageAuthor(message))
				username = "{Echo}";

			outString += `${username}:${message.content}\t`;
		});

		outString += "{Echo}:"
		return outString;
	}

	onMessageCreate = (message: Message) => {

		if (message.channel.id != this.channel.id)
			return;

		this._messages.push(message);

		if (this._messages.length > 10)
			this._messages.shift();

		if (this.isMessageAuthor(message))
			return;

		this._openai.completions.create({
			model: "text-davinci-003",
			prompt: this.createPrompt(message),
			max_tokens: 500,
			temperature: 0.8,
			user: "discord_userid_" + message.author.id
		}).then(this.onCompletion);

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