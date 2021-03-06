import Debug from 'debug';
import Timeout = NodeJS.Timeout;
const debug = {
	add: Debug('request-limiter:add'),
	error: Debug('request-limiter:error'),
	process: Debug('request-limiter:process'),
	start: Debug('request-limiter:start'),
};
debug.error.color = 1;
debug.process.color = 50;
debug.start.color = 70;
debug.add.color = 20;
// setTimeout(() => { console.log(debug.)})
// TODO: refactor debug

export const ERROR = {
	NOT_A_PROMISE_FUNCTION: 'function should return promise',
	TIMEOUT: 'timeout',
};

function retryDelayFormula(index: number): number {
	return 1000 * 10 * (2 ** index);
}

type JobFunction = () => Promise<any>;
type Job = {
	func: JobFunction,
	resolve: (result: any) => void,
	reject: (error: Error | any) => void,
}

export default class RequestLimiter {
	private _queue: Array<Job> = [];
	private _activeNumber: number = 0;
	private _blocked: boolean = false;
	private _retry: {
		timeoutEndTimestamp: number|null,
		timeout: Timeout|null,
		counter: Map<JobFunction, number>,
	} = {
		timeoutEndTimestamp: null,
		timeout: null,
		counter: new Map(),
	};
	public get length() : number { return this._queue.length; }

	constructor(
		public maxRequests: number,
		public autoStart: boolean = true,
		public retry: {
			maxCount?: number,
			delayFormula?: null|((index: number) => number),
		} = { maxCount: 0, delayFormula: retryDelayFormula },
	) {}

	public add<T>(func: () => Promise<T>) : Promise<T>{
		debug.add('new job');
		return new Promise((resolve, reject) => {
			this._queue.push({ func, resolve, reject });
			if (this.autoStart && this._queue.length === 1) {
				this.start();
			}
		});
	}

	private _handleError(job: Job, error: Error) {
		const index = this._increaseRetryIndex(job.func);
		debug.error('job rejected %d time(s)', index);

		if (index > this.retry.maxCount) {
			console.log('reject handleError');
			debug.error('more than max retry count. throwing an error');
			job.reject(error);
			return;
		}

		this._blocked = true;
		const now = (new Date).getTime();
		if (this._retry.timeout && this._retry.timeoutEndTimestamp >= now) { debug.error('clearing old timeout'); clearTimeout(this._retry.timeout); }
		const delay = this.retry.delayFormula(index);
		this._retry.timeoutEndTimestamp = now + delay;
		this._queue.push(job);
		debug.error('new timeout with %dms delay', delay);
		this._retry.timeout = setTimeout(() => {
			debug.error('unblocking.. starting..');
			this._retry.timeout = null;
			this._retry.timeoutEndTimestamp = null;
			this._blocked = false;
			this.start();
		}, delay);
		return;
	}

	private _increaseRetryIndex(func: JobFunction) : number {
		if (!this._retry.counter.has(func)) {
			this._retry.counter.set(func, 1);
			return 1;
		} else {
			const newIndex = this._retry.counter.get(func) + 1;
			this._retry.counter.set(func, newIndex);
			return newIndex;
		}
	}

	private async _processJob(job: Job) {
		try {
			debug.process('starting a job');
			const { func, resolve } = job;
			this._activeNumber += 1;
			resolve(await func().then((result) => {
				debug.process('job done');
				return result;
			}));
			this.start();
		} catch (error) {
			debug.process('got an error');
			this._handleError(job, error);
		} finally {
			debug.process('decreasing number');
			this._activeNumber -= 1;
		}
	}

	public start(): void {
		debug.start('starting');
		if (this._blocked) { debug.start('blocked on start. stopping'); return; }
		if (this._queue.length === 0) { debug.start('empty queue. stopping'); return; }
		const toExecute = this._queue.splice(0, this.maxRequests - this._activeNumber);
		for (const job of toExecute)
			this._processJob(job);
	}

}
