import { Low } from 'lowdb';
import { JSONFilePreset } from 'lowdb/node'

export type PropValue = boolean|string|number|object;

type ItemPayload = { [key: string] : PropValue };

interface DataContainer {
	version: number;
	items: Map<string, ItemPayload>;
}

export default class DataStorage {

	private m_version: number;
	private m_db: Low<DataContainer> | null = null;

	constructor(filepath: string) {

		this.m_version = 2;
		let defaultData: DataContainer = { version: this.m_version, items: new Map<string, ItemPayload>() };
		JSONFilePreset(filepath, defaultData).then(db => this.m_db = db);

	}

	getItem(id: string) : ItemPayload | undefined {

		if(!this.m_db)
			return undefined;

		return this.m_db.data.items.get(id);

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

			let currItem = items.get(id);
			currItem = { ...currItem, ...props };
			items.set(id, currItem);

		});

	}

	setProperty(id: string, propName: string, value: PropValue) {

		let prop: ItemPayload = {};
		prop[propName] = value;
		this.setItem(id, prop);

	}

	deleteItem(id: string) {

		this.m_db?.update(({ items }) => {

			items.delete(id);

		});

	}

	deleteProperty(id: string, propName: string) {

		this.m_db?.update(({ items }) => {

			let currItem = items.get(id);
			if(!currItem) return;
			delete currItem[propName];

		});

	}

	// Returns a map of items with IDs that start with idFragment
	findItemsByID(idFragment: string) : Map<string, ItemPayload> {

		if(!this.m_db)
			return new Map;

		let entryList = [...this.m_db.data.items];
		let filtered = entryList.filter(entry => entry[0].startsWith(idFragment));
		return new Map(filtered);
	
	}

}

let Singleton: DataStorage | null = null;

function Create(filepath: string) {
	Singleton = new DataStorage(filepath);
}

export { Singleton, Create }