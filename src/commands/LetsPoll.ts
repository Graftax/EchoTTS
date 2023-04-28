import { SlashCommandBuilder } from "discord.js";
import { Command } from "../Commander";
import axios from "axios";

let command = new SlashCommandBuilder();
command.setName("lets-poll");
command.setDescription("Create and manage polls.")

command.addStringOption((option) => {
	return option.setName("titleToAdd")
		.setDescription("What title to search for.");
});

export default {
	slashcommand: command,
	execute(interaction) {

		let title = interaction.options.get("titleToAdd");
		axios.get(`https://api.themoviedb.org/3/search/tv`, {
			params: { 
				api_key: process.env.TMDB_API_KEY,
				query: title
			}
		}).then((value) => {
			interaction.reply(value.data);
		});

	}
} as Command;