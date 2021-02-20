export default class MultiQueueProcessor {

	private m_processorFunc: (item: any, next: () => void ) => void;
	private m_queues: object;

	constructor(processFunc: (item: any, next: () => void ) => void) {
		this.m_processorFunc = processFunc;
		this.m_queues = {};
	}

	private processNext(queueID, shouldShift: boolean) {

		if(shouldShift)
			this.m_queues[queueID].shift();
		
		if(this.m_queues[queueID].length <= 0)
			return;
			
		this.m_processorFunc(this.m_queues[queueID][0], () => { this.processNext(queueID, true); });

	}

	addToQueue(queueID: number, item: any) : void {

		if(!this.m_queues[queueID])
			this.m_queues[queueID] = [];

		this.m_queues[queueID].push(item);

		if(this.m_queues[queueID].length == 1)
			this.processNext(queueID, false);

	}

	clearQueue(queueID: number) {
		this.m_queues[queueID] = [];
	}
}