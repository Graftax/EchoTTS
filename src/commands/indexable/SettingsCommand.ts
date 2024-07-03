import { getSettings, updateSettings } from "../../scenarios/indexable/SpeakForMeScenario.js";
import { Comex } from "../Comex.js";
import { Command } from "../Command.js";
import { StringCommandParameter } from "../ComexParameters.js";
import { ChoicesParameterProperty, DescriptionParameterProperty } from "../ComexParameterProperties.js";

const commandInstance = new Command("settings", "View and change your voice settings.",
	[],

	new Comex({
		gender: new StringCommandParameter(
			DescriptionParameterProperty("What gender Echo tries to use when speaking for you."),
			ChoicesParameterProperty(
				{ name: "Male", value: "MALE" },
				{ name: "Female", value: "FEMALE" })),

		language: new StringCommandParameter(
			DescriptionParameterProperty("What language Echo tries to use when speaking for you."),
			ChoicesParameterProperty(
				{ name: "English (Australia)", value: "en-AU" },
				{ name: "English (India)", value: "en-IN" },
				{ name: "English (UK)", value: "en-GB" },
				{ name: "English (US)", value: "en-US" },
				{ name: "French (Canada)", value: "fr-CA" },
				{ name: "French (France)", value: "fr-FR" },
				{ name: "German (Germany)", value: "de-DE" },
				{ name: "Hindi (India)", value: "hi-IN" },
				{ name: "Italian (Italy)", value: "it-IT" },
				{ name: "Japanese (Japan)", value: "ja-JP" },
				{ name: "Korean (South Korea)", value: "ko-KR" },
				{ name: "Mandarin Chinese", value: "cmn-CN" },
				{ name: "Norwegian (Norway)", value: "nb-NO" },
				{ name: "Russian (Russia)", value: "ru-RU" },
				{ name: "Spanish (Spain)", value: "es-ES" },
				{ name: "Spanish (US)", value: "es-US" },
				{ name: "Polish (Poland)", value: "pl-PL" }))

	},

		(params, interaction) => {

			updateSettings(interaction.user, params.gender, params.language);

			let settingsString = "Your settings:\n" + JSON.stringify(getSettings(interaction.user.id), null, "\t");
			interaction.reply({ content: settingsString, ephemeral: true });
		})

);

export default commandInstance;