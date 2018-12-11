import Timeout = NodeJS.Timeout;

export const ERROR = {
	NOT_A_PROMISE_FUNCTION: 'function should return promise',
};

function retryDelayFormula(index: number): number {
	return 10 * (2 ** index);
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
	private _retryTimeoutTimestamp: number|null = null;
	private _retryTimeout: Timeout|null = null;
	private _retriesCounter: Array<{ func: JobFunction, index: number }>;
	private _blocked: boolean = false;
	public get length() : number { return this._queue.length; }

	constructor(
		public maxRequests: number,
		public autoStart: boolean = true,
		public retry: {
			maxCount: number,
			delayFormula: null|((index: number) => number),
		} = { maxCount: 0, delayFormula: retryDelayFormula },
	) {}

	public add<T>(func: () => Promise<T>) : Promise<T>{
		return new Promise((resolve, reject) => {
			this._queue.push({ func, resolve, reject });
			if (this.autoStart && this._queue.length === 1) {
				this.start();
			}
		});
	}

	private _retryJob(job: Job, error: Error) {
		const index = this._increaseRetryIndex(job.func);
		if (index > this.retry.maxCount) {
			job.reject(error);
			return;
		}
		if (this.retry.delayFormula) {
			this._blocked = true;
			const now = (new Date).getTime();
			if (this._retryTimeout) {
				if (this._retryTimeoutTimestamp < now) return;
				clearTimeout(this._retryTimeout);
			}
			const delay = this.retry.delayFormula(index);
			this._retryTimeout = setTimeout(() => { this._blocked = false }, delay);
		}
		this._queue.push(job);
	}

	private _increaseRetryIndex(func: JobFunction) : number {
		const counter = this._retriesCounter.find(({ func: aFunc }) => aFunc === func);
		if (!counter) this._retriesCounter.push({ func, index: 1 });
		else counter.index += 1;
		return counter ? counter.index : 1;

	}

	private async _process({ func, resolve, reject}: Job) {
		try {
			const promise = func();
			if (!(promise instanceof Promise)) throw new Error(ERROR.NOT_A_PROMISE_FUNCTION);
			resolve(await promise);
		} catch (error) {
			this._retryJob({ func, resolve, reject }, error);
			reject(error);
		} finally {
			this._activeNumber -= 1;
			this.start();
		}
	}

	public start(): Promise<void[]> {
		if (this._queue.length === 0) return;
		const toExecute = this._queue.splice(0, this.maxRequests - this._activeNumber);
		return Promise.all(toExecute.map((job) => {
			this._activeNumber += 1;
			return this._process(job);
		}));
	}

}
