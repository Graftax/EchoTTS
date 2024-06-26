import { Low } from 'lowdb';
import { JSONFilePreset } from 'lowdb/node'

export type PropValue = boolean|string|number|object;

type ItemPayload = { [key: string] : PropValue };

interface DataContainer {
	version: number;
	items: { [index: string]: ItemPayload };
}

export default class DataStorage {

	private m_version: number;
	private m_db: Low<DataContainer> | null = null;

	constructor(filepath: string) {

		this.m_version = 2;
		let defaultData: DataContainer = { version: this.m_version, items: {} };
		JSONFilePreset(filepath, defaultData).then(db => this.m_db = db);

	}

	getItem(id: string) : ItemPayload | undefined {

		if(!this.m_db)
			return undefined;

		return this.m_db.data.items[id];

	}

	getProperty(id: string, propName: string, defaultValue = undefined) : PropValue | undefined {

		const props = this.getItem(id);

		if(!props) 
			return defaultValue;
		
		if(props.hasOwnProperty(propName))
			return props[propName];

		return defaultValue;
		
	}

	setItem(id: string, props: ItemPayload) {

		this.m_db?.update(({ items }) => {

			let currItem = items[id];
			currItem = { ...currItem, ...props };
			items[id] = currItem;

		});

	}

	setProperty(id: string, propName: string, value: PropValue) {

		let prop: ItemPayload = {};
		prop[propName] = value;
		this.setItem(id, prop);

	}

	deleteItem(id: string) {

		this.m_db?.update(({ items }) => {

			delete items[id];

		});

	}

	deleteProperty(id: string, propName: string) {

		this.m_db?.update(({ items }) => {

			let currItem = items[id];
			if(!currItem) return;
			delete currItem[propName];

		});

	}

	// Returns a map of items with IDs that start with idFragment
	findItemsByID(idFragment: string) : Map<string, ItemPayload> {

		if(!this.m_db)
			return new Map;

		let filtered = new Array<[string, ItemPayload]>;

		let itemIDs = Object.keys(this.m_db.data.items);

		for(let currID of itemIDs) {

			if(currID.startsWith(idFragment))
				filtered.push([currID, this.m_db.data.items[currID]]);

		}

		return new Map(filtered);
	
	}

}

let Singleton: DataStorage | null = null;

function Create(filepath: string) {
	Singleton = new DataStorage(filepath);
}

export { Singleton, Create }