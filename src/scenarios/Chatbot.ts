import { Scenario } from "../Scenario";
import { Channel, Client, Events, Message, TextChannel } from "discord.js";
import { Configuration, OpenAIApi, ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum } from "openai";
const configuration = new Configuration({
	apiKey: process.env.OPENAI_API_KEY,
});

export default class Chatbot implements Scenario {

	end = null;
	_channel: TextChannel = null;
	_client: Client = null;
	_messages = new Array<Message>();
	_openai = new OpenAIApi(configuration);
	_timeout: ReturnType<typeof setTimeout> = null;

	init(channel: Channel, client: Client) {

		this._client = client;

		if(!channel.isTextBased()) {
			console.error("Scenario failed: channel is not text based.");
			return this.end();
		}

		this._channel = channel as TextChannel;

		client.on(Events.MessageCreate, this.onMessageCreate);

	}

	shutdown() {
		this._client.removeListener(Events.MessageCreate, this.onMessageCreate);
	}

	createMessageArray(userInput: Message): Array<ChatCompletionRequestMessage> {

		let outArray = new Array<ChatCompletionRequestMessage>();

		outArray.push({role: "system", content: "You are an AI named Echo. You are smart, playful, and very sassy. You love to flirt almost as much as you love puns. You use emoji a lot."});
		
		this._messages.forEach((message) => {
			let role = message.author.id == this._client.user.id ? ChatCompletionRequestMessageRoleEnum.Assistant : ChatCompletionRequestMessageRoleEnum.User;
			outArray.push({ role: role, content: message.content });
		});

		outArray.push({role: "user", content: userInput.content});

		return outArray;
	}

	onMessageCreate = (message: Message) => {

		if(message.channel.id != this._channel.id)
			return;

		this._messages.push(message);

		if(this._messages.length > 10)
			this._messages.shift();

		if(message.author.id == this._client.user.id)
			return;
		
		this._openai.createChatCompletion({
			model: "gpt-3.5-turbo",
			messages: this.createMessageArray(message)
		}).then((completion) => {
				this._channel.send(completion.data.choices[0].message);
		}).catch((reason) => {
			console.error(reason);
		});

		if(!this._timeout)
			this._timeout = setTimeout(this.onTimeout, 1000 * 30);

		this._timeout.refresh();
	}

	onTimeout = () => {

		this._channel.send("I'm leaving, goodbye!");
		this.end();
		
	}
}