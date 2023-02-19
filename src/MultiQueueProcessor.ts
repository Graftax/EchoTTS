export default class MultiQueueProcessor<ItemType> {

	private m_processorFunc: (item: any, next: () => void ) => void;
	private m_queues: {[key: string]: Array<ItemType>};

	constructor(processFunc: (item: any, next: () => void ) => void) {
		this.m_processorFunc = processFunc;
		this.m_queues = {};
	}

	private processNext(queueID: string, shouldShift: boolean) {

		if(shouldShift)
			this.m_queues[queueID].shift();
		
		if(this.m_queues[queueID].length <= 0)
			return;
			
		this.m_processorFunc(this.m_queues[queueID][0], () => { this.processNext(queueID, true); });

	}

	addToQueue(queueID: string, item: ItemType) : void {

		if(!this.m_queues[queueID])
			this.m_queues[queueID] = [];

		this.m_queues[queueID].push(item);

		if(this.m_queues[queueID].length == 1)
			this.processNext(queueID, false);

	}

	clearQueue(queueID: string) {
		this.m_queues[queueID] = [];
	}
}