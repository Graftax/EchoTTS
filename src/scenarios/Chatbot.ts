import { Scenario } from "../Scenario";
import {AxiosResponse} from "axios";
import { Channel, Client, Events, Message, TextChannel } from "discord.js";
import fs from "fs";
import { Configuration, OpenAIApi, ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum, CreateCompletionResponse } from "openai";

export default class Chatbot implements Scenario {

	end = null;
	_channel: TextChannel = null;
	_client: Client = null;
	_messages = new Array<Message>();
	_timeout: ReturnType<typeof setTimeout> = null;

	_openai = new OpenAIApi(new Configuration({
		apiKey: process.env.OPENAI_API_KEY,
	}));

	init(channel: Channel, client: Client) {

		this._client = client;

		if (!channel.isTextBased()) {
			console.error("Scenario failed: channel is not text based.");
			return this.end();
		}

		this._channel = channel as TextChannel;

		client.on(Events.MessageCreate, this.onMessageCreate);

	}

	shutdown() {
		this._client.removeListener(Events.MessageCreate, this.onMessageCreate);
	}

	getPromptString(): string {

		//TODO: Break prompt in to different pieces, like personality, etc.
		return fs.readFileSync("res/introduction.txt").toString();
	}

	createMessageArray(userInput: Message): Array<ChatCompletionRequestMessage> {

		let outArray = new Array<ChatCompletionRequestMessage>();

		outArray.push({ role: "system", content: "" });

		this._messages.forEach((message) => {
			let role = message.author.id == this._client.user.id ? ChatCompletionRequestMessageRoleEnum.Assistant : ChatCompletionRequestMessageRoleEnum.User;
			outArray.push({ role: role, content: message.content });
		});

		outArray.push({ role: "user", content: userInput.content });

		return outArray;
	}

	createPrompt(userInput: Message): string {

		let outString = "";

		outString += this.getPromptString() + "\n";

		this._messages.forEach((message) => {

			let username = message.author.username;
			if(message.author.id == this._client.user.id)
				username = "{Echo}";

			outString += `${username}:${message.content}\t`;
		});

		return outString;
	}

	onMessageCreate = (message: Message) => {

		if (message.channel.id != this._channel.id)
			return;

		this._messages.push(message);

		if (this._messages.length > 10)
			this._messages.shift();

		if (message.author.id == this._client.user.id)
			return;

		this._openai.createCompletion({
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

	onCompletion = (completion: AxiosResponse<CreateCompletionResponse, any>) => {

		let output = completion.data.choices[0].text;

		const stripToken = "{Echo}:";
		while(output.startsWith(stripToken))
			output = output.slice(stripToken.length);

		if(output.length <= 0)
			output = "❌";
			
		this._channel.send(output);

	}

	onTimeout = () => {

		this._channel.send("I'm leaving, goodbye!");
		this.end();

	}
}