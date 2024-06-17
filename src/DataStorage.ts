import low from 'lowdb';
import FileSync from 'lowdb/adapters/FileSync.js';

export type PropValue = boolean|string|number|object;

const DataContainerName = "items";

interface Item {
	id: string,
	props: Object
}

interface DefaultData {
	items: [];
}

export default class DataStorage {

	private m_version: number;
	private m_adapter: typeof FileSync;
	private m_db: low.LowdbSync<object>;

	constructor() {

	}

	init(filepath: string, version: number) {

		this.m_version = version;
		this.m_adapter = new FileSync(filepath);
		this.m_db = low(this.m_adapter);

		let defaultStructure: DefaultData = { items: [] };
		this.m_db.defaults(defaultStructure).write();
	}

	getItem(id: string) : Object {

		const item = this.m_db.get(DataContainerName)
			.find({ id: id })
			.value() as Item;

		if(!item) return undefined;

		return item.props;
	}

	getProperty(id: string, propName: string, defaultValue = undefined) : PropValue {

		const props = this.getItem(id) as Item;
		if(!props) return defaultValue;
		
		if(props.hasOwnProperty(propName))
			return props[propName];

		return defaultValue;
	}

	setItem(id: string, props: Object) {

		let item = this.m_db.get(DataContainerName)
			.find({ id: id })
			.value();

		if(!item)
			this.m_db.get(DataContainerName)
				.push({ id: id, props: {}})
				.write();

		this.m_db.get(DataContainerName)
			.find({id: id})
			.set<Object>("props", props)
			.write();
	}

	setProperty(id: string, propName: string, value: PropValue) {

		let item = this.m_db.get(DataContainerName)
			.find({ id: id })
			.value();

		if(!item)
			this.m_db.get(DataContainerName)
				.push({ id: id, props: {}})
				.write();

		this.m_db.get(DataContainerName)
			.find({id: id})
			.set<PropValue>(`props.${propName}`, value)
			.write();
	}

	deleteItem(id: string) {

		this.m_db.get(DataContainerName)
			.remove({id: id})
			.write();
	}

	deleteProperty(id: string, propName: string) {

		this.m_db.get(DataContainerName)
			.find({id: id})
			.unset(`props.${propName}`)
			.write();
	}

	// Returns a map of items with IDs that start with idFragment
	findItemsByID(idFragment: string) : Map<string, Object> {

		let outMap = new Map<string, Object>();

		let foundItems = this.m_db.get(DataContainerName)
			.filter((value: Item, index, collection) => {
				return value.id.startsWith(idFragment);
			})
			.value() as Array<Item>;

		for(let currItem of foundItems)
			outMap.set(currItem.id, currItem.props);

		return outMap;
	}

}

let Singleton = new DataStorage();
export { Singleton };