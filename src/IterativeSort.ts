

class ChainNode<ValueType> {

	value: ValueType = null;
	private parent: ChainNode<ValueType> = null;
	children: Array<ChainNode<ValueType>> = new Array();

	constructor(value: ValueType) {
		this.value = value;
	}

	setParent(newParent: ChainNode<ValueType>) {

		if(this.parent) {

			let arrToRemoveFrom = this.parent.children;
			let index = arrToRemoveFrom.indexOf(this);
			arrToRemoveFrom.splice(index, 1);
			
		}

		this.parent = newParent;
		this.parent.children.push(this);
	}
}

type TestFunction<T> = (set: Array<T>, resolve: (number) => void) => void;

export default function IterativeSort<T>(values: Array<T>, testSize: number, testFunc: TestFunction<T>): Promise<Array<T>> {

	let rootNode = new ChainNode(null);

	values.forEach((value) => {

		let newNode = new ChainNode(value);
		newNode.setParent(rootNode);

	});

	return new Promise((resolve, reject) => {
		iterate(rootNode, testSize, testFunc, resolve);
	});

}

function iterate<T>(rootNode: ChainNode<T>, testSize: number, testFunc: TestFunction<T>, resolve: (value: T[] | PromiseLike<T[]>) => void) {

	let nextSet = findNextSet(rootNode);

	if(nextSet.length <= 0) {
		resolve(toArray(rootNode).splice(1));
		return;
	}

	let shuffledSet = nextSet.sort((a, b) => {return 0.5 - Math.random()});
	let limitedSet = shuffledSet.splice(0, testSize);
	let limitedItems = limitedSet.map((value) => { return value.value; });

	testFunc(limitedItems, (choice: number) => {
		
		let newParent = limitedSet.splice(choice, 1)[0];
		limitedSet.forEach((value) => {
			value.setParent(newParent);
		});

		iterate(rootNode, testSize, testFunc, resolve);
	});

}

function findNextSet<T>(rootNode: ChainNode<T>): Array<ChainNode<T>> {

	if(rootNode.children.length <= 0)
		return new Array();

	if(rootNode.children.length <= 1)
		return findNextSet(rootNode.children[0]);

	return [...rootNode.children];
}

function toArray<T>(rootNode: ChainNode<T>) : Array<T> {

	let res = new Array<T>();

	while(rootNode) {

		res.push(rootNode.value);
		rootNode = rootNode.children[0];
	}

	return res;
}


