import low from 'lowdb';
import FileSync from 'lowdb/adapters/FileSync.js';

type PropValue = boolean|string|number|null;

export default class DataStorage {

	private m_version: number;
	private m_adapter: typeof FileSync;
	private m_db: low.LowdbSync<object>;
	private m_clientDefaults: object = {};

	constructor() {

	}

	init(filepath: string, version: number, defaults: object) {

		this.m_version = version;
		this.m_adapter = new FileSync(filepath);
		this.m_db = low(this.m_adapter);
		this.m_db.defaults({ entities: [] }).write();
		this.m_clientDefaults = defaults;

	}

	private provideEntity(id: string) :void {
		
		if(!this.m_db.get("entities").find({ "id": id }).value()) {

			this.m_db.get("entities").push({ 
				"id": id, 
				"version": this.m_version
			}).write();

		}
	}

	private applyDefaults(target: object) : object {

		let defaultObj = Object.assign({}, this.m_clientDefaults);
		return Object.assign(defaultObj, target);
	}

	get(id: string, propName: string) : PropValue {

		this.provideEntity(id);

		const ent = this.m_db.get("entities").find({ "id": id }).value();
		if(!ent) return null;
		
		if(ent[propName] != undefined)
			return ent[propName];

		return this.applyDefaults({})[propName];

	}

	getAll(id: string) : object {

		this.provideEntity(id);
		return this.applyDefaults(this.m_db.get("entities").find({ "id": id }).value());

	}

	set(id: string, propName: string, value: PropValue) : void {
		
		this.provideEntity(id);
		this.m_db.get("entities").find({ "id": id }).set<PropValue>(propName, value).write();

	}

	setAll(id: string, toSet: object) {

	}
}

let Singleton = new DataStorage();
export { Singleton };