
Limits promises execution in order to reduce load.

#### Samples
```
import RequestLimiter from 'request-limiter';
import { inspect } from 'util';

const MAX_REQUEST = 2;
const REQUEST_NUMBER = 5;
const MIN_DELAY = 500;
const MAX_DELAY = 800;

async function main() {
    const expectedResults = [];
    for (let i = 0; i < REQUEST_NUMBER; i += 1) {
        expectedResults.push(`test#${i}`);
    }

    const requester = new RequestLimiter(MAX_REQUEST);
    console.log('execution');
    await Promise.all(expectedResults.map((one) => requester.add(() => {
        return new Promise((resolve) => setTimeout(() => {
            console.log(one, 'end');
            resolve(one);
        }, MIN_DELAY + Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY))));
    })));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        if (error instanceof Error || typeof error !== 'object') console.error(error);
    else inspect(error, false, null, true);
        process.exit(1);
    });
```
### API
```
constructor(maxRequests: number, autoStart?: boolean, retry: {
  maxCount?: number;
  blockDelayFormula?: null | ((index: number) => number);
  immediately?: boolean;
});
```
---

`public maxRequests: number` Number of maximum active promises.  
* Can be changed in progress
---

`public autoStart: boolean`
If true, starts execution after the first **add**
* Default `true`  
---

`public retry.maxCount: number` Max retries number
* Default `0`
---
`public retry.immediately: boolean` If true and error has occurred, execute failed job right after its rejection
* Default `false`
* `true` value overrides retry.blockDelayFormula
---

`public retry.blockDelayFormula: null|((index: number) => number)` Function accept retry index and returns delay to call next job
* Default `10 * (2 ** index)`
* This parameter doesn't make any sense if `retry.immediately` is passed
---

`add<T>(func: () => Promise<T>): Promise<T>` Adds a promise function to execute queue.
* If you pass not a function that returns a promise, it will throw an error when executing the function
---

`start(): Promise<void[]>` Function to start execution
* Returns promises of jobs that have been started
