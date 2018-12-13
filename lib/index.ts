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
	private _blocked: boolean = false;
	private _retry: {
		timeoutEndTimestamp: number|null,
		timeout: Timeout|null,
		counter: Array<{ func: JobFunction, index: number }>,
	} = {
		timeoutEndTimestamp: null,
		timeout: null,
		counter: [],
	};
	public get length() : number { return this._queue.length; }

	constructor(
		public maxRequests: number,
		public autoStart: boolean = true,
		public retry: {
			maxCount?: number,
			blockDelayFormula?: null|((index: number) => number),
			immediately?: boolean,
		} = { maxCount: 0, blockDelayFormula: retryDelayFormula, immediately: false },
	) {}

	public add<T>(func: () => Promise<T>) : Promise<T>{
		return new Promise((resolve, reject) => {
			this._queue.push({ func, resolve, reject });
			if (this.autoStart && this._queue.length === 1) {
				this.start();
			}
		});
	}

	private _handleError(job: Job, error: Error) {
		const index = this._increaseRetryIndex(job.func);
		if (index > this.retry.maxCount) {
			job.reject(error);
		} else if (this.retry.immediately) {
			this._processJob(job);
		} else if (this.retry.blockDelayFormula) {
			this._blocked = true;
			const now = (new Date).getTime();
			if (this._retry.timeout) {
				if (this._retry.timeoutEndTimestamp < now) return;
				clearTimeout(this._retry.timeout);
			}
			const delay = this.retry.blockDelayFormula(index);
			this._retry.timeoutEndTimestamp = now + delay;
			this._retry.timeout = setTimeout(() => {
				this._retry.timeout = null;
				this._blocked = false;
				this.start();
			}, delay);
			this._queue.push(job);
		}
	}

	private _increaseRetryIndex(func: JobFunction) : number {
		const counter = this._retry.counter.find(({ func: aFunc }) => aFunc === func);
		if (!counter) this._retry.counter.push({ func, index: 1 });
		else counter.index += 1;
		return counter ? counter.index : 1;

	}

	private async _processJob({ func, resolve, reject}: Job) {
		try {
			this._activeNumber += 1;
			const promise = func();
			if (!(promise instanceof Promise)) throw new Error(ERROR.NOT_A_PROMISE_FUNCTION);
			resolve(await promise);
		} catch (error) {
			this._handleError({ func, resolve, reject }, error);
		} finally {
			this._activeNumber -= 1;
			this.start();
		}
	}

	public start(): Promise<void[]> {
		if (this._blocked) return;
		if (this._queue.length === 0) return;
		const toExecute = this._queue.splice(0, this.maxRequests - this._activeNumber);
		return Promise.all(toExecute.map((job) => {
			return this._processJob(job);
		}));
	}

}
