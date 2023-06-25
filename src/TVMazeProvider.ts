import axios from "axios";

// https://www.tvmaze.com/api

const API_URL = "https://api.tvmaze.com";

export interface SearchResult {
	score: number,
	show: {
		id: number,
		image: {
			medium: string,
			original: string
		}
		name: string,
		premiered: string,
		summary: string,
		url: string
	}
}

export default { 

	search: async function(title: string) : Promise<Array<SearchResult>> {

		let response = await axios.get(`${API_URL}/search/shows?q=${title}`);
	
		return response.data;
	}

}