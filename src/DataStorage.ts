import { Low } from 'lowdb';
import { JSONFilePreset } from 'lowdb/node'

export type PropValue = boolean|string|number|object;
export type ItemPayload = { [key: string] : PropValue | undefined };

interface DataContainer {
	version: number;
	items: { [index: string]: ItemPayload | undefined };
}

export default class DataStorage {

	private m_version: number;
	private m_db: Low<DataContainer> | null = null;

	constructor(filepath: string) {

		this.m_version = 2;
		let defaultData: DataContainer = { version: this.m_version, items: {} };
		JSONFilePreset(filepath, defaultData).then(db => this.m_db = db);

	}

	setItem(id: string, props: ItemPayload) {

		this.m_db?.update(data => data.items[id] = props);

	}

	setProperty(id: string, propName: string, value: PropValue) {

		let props = this.getItem(id) ?? {};
		props[propName] = value;
		this.setItem(id, props);

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

	updateItem(id: string, updater: (item: ItemPayload) => void) {

		this.m_db?.update((data) => {
			
			let item = data.items[id];
			if(item) updater(item);

		});

	}

	deleteItem(id: string) {

		this.m_db?.update(data => delete data.items[id]);

	}

	deleteProperty(id: string, propName: string) {

		this.m_db?.update(({ items }) => {

			let currItem = items[id];
			if(!currItem) return;

			if(Object.hasOwn(currItem, propName))
				delete currItem[propName];

			if(Object.keys(currItem).length <= 0)
				delete items[id];

		});

	}

	// Returns a map of items with IDs that start with idFragment
	findItemsByID(idFragment: string) : Map<string, ItemPayload> {

		if(!this.m_db)
			return new Map;

		let filtered = new Array<[string, ItemPayload]>;

		let itemIDs = Object.keys(this.m_db.data.items);

		for(let currID of itemIDs) {

			let currItem = this.m_db.data.items[currID];
			if(currID.startsWith(idFragment) && currItem)
				filtered.push([currID, currItem]);

		}

		return new Map(filtered);
	
	}

}

let Singleton: DataStorage | null = null;

function Create(filepath: string) {
	Singleton = new DataStorage(filepath);
}

export { Singleton, Create }