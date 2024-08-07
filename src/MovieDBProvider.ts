import axios from "axios";

// https://developers.themoviedb.org/3/getting-started/authentication
// https://developers.themoviedb.org/3/search/search-tv-shows

const API_URL = "https://api.themoviedb.org/3";

export interface TVResult {
	poster_path: string | null,
	popularity: number,
	id: number,
	backdrop_path: string | null,
	vote_average: number,
	overview: string,
	first_air_date: string,
	origin_country: Array<string>,
	genre_ids: Array<number>,
	original_language: string,
	vote_count: number,
	name: string,
	original_name: string
}

export interface TVSearchResponse {
	page: number,
	results: Array<TVResult>,
	total_results: number,
	total_pages: number
}

export abstract class ImageSize {

	private _value: number;

	constructor(value: number) {
		this._value = Math.round(value);
	}

	value(): number {
		return this._value;
	}

	abstract arrayName() : string;
}

export class LogoSize extends ImageSize {
	arrayName(): string { return "_logo_sizes"; }
}

export class PosterSize extends ImageSize {
	arrayName(): string { return "_poster_sizes"; }
}

export class ProfileSize extends ImageSize {
	arrayName(): string { return "_profile_sizes"; }
}

export class StillSize extends ImageSize {
	arrayName(): string { return "_still_sizes"; }
}

function arrayClamp(array: Array<any>, value: number) : number {

	value = Math.round(value);
	value = Math.max(0, value);
	value = Math.min(array.length - 1, value);
	return value;

}

class SizeContainer
{
	[k: string]: Array<string>;
	public _logo_sizes: Array<string> = [];
	public _poster_sizes: Array<string> = [];
	public _profile_sizes: Array<string> = [];
	public _still_sizes: Array<string> = [];
}

export default class MovieDBProvider {

	private _img_base_url: string = "";
	private _sizes: SizeContainer = {
		_logo_sizes: [],
		_poster_sizes: [],
	 	_profile_sizes: [],
	 	_still_sizes: []
	};
	
	async init() {

		let response = await axios.get(`${API_URL}/configuration`, {
			params: { 
				api_key: process.env.TMDB_API_KEY 
			}
		});

		this._img_base_url = response.data.images.base_url;
		this._sizes._logo_sizes = response.data.images.logo_sizes;
		this._sizes._poster_sizes = response.data.images.poster_sizes;
		this._sizes._profile_sizes = response.data.images.profile_sizes;
		this._sizes._still_sizes = response.data.images.still_sizes;

	}

	async searchTV(title: string): Promise<TVSearchResponse> {

		let response = await axios.get(`${API_URL}/search/tv`, {
			params: { 
				api_key: process.env.TMDB_API_KEY,
				query: title
			}
		});

		return response.data;
	}

	createImageURL(path: string, size: ImageSize) : string {

		let sizeArray = this._sizes[size.arrayName()];
		let index = arrayClamp(sizeArray, size.value());
		let sizeString = sizeArray[index];

		return `${this._img_base_url}/${sizeString}/${path}`;
	}

}

let Singleton = new MovieDBProvider();
export { Singleton };