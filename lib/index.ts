export const ERROR = {
	NOT_A_PROMISE_FUNCTION: 'function should return promise',
};

export default class RequestLimiter {
	private _queue: Array<{
		func: () => Promise<any>,
		resolve: (result: any) => void,
		reject: (error: Error | any) => void,
	}> = [];
	private _activeNumber: number = 0;

	public get length() : number { return this._queue.length; }

	constructor(public maxRequests: number, public autoStart: boolean = true) {}

	public add<T>(func: () => Promise<T>) : Promise<T>{
		return new Promise((resolve, reject) => {
			this._queue.push({ func, resolve, reject });
			if (this.autoStart && this._queue.length === 1) {
				this.start();
			}
		});
	}

	private async _process({ func, resolve, reject}) {
		try {
			const promise = func();
			if (!(promise instanceof Promise)) throw new Error(ERROR.NOT_A_PROMISE_FUNCTION);
			resolve(await promise);
		} catch (error) {
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
