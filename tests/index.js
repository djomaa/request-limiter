const randomString = require('randomstring');
const { fillArray, randomInt, findMin, findMax } = require('../utils');
const RequestLimiter = require('../dist').default;
const assert = require('assert');
const fs = require('fs'); // remove

describe('Testing', () => {

	it('simple', async () => {
		const requester = new RequestLimiter(2);
		const results = fillArray(100, () => randomString.generate(randomInt(5, 20)));
		const promises = results.map((one) => requester.add(() => new Promise((resolve) => resolve(one))));
		assert.deepStrictEqual(results, await Promise.all(promises));
	});

	describe('retry', () => {
		it('immediately', async () => {
			const maxRejectsCount = randomInt(1, 3);
			const requester = new RequestLimiter(1, true, { maxCount: maxRejectsCount, immediately: true });
			const size = randomInt(50, 100);
			const expected = fillArray(size, () => randomString.generate(randomInt(5, 20)));
			const executedTimes = fillArray(size, 0);
			const rejectedCount = randomInt(20, 50);
			const rejectedIndexesSet = fillArray({ size: rejectedCount, passArray: true }, (array) => {
				let item;
				do {
					item = randomInt(size - 1);
				} while (array.find((one) => one === item));
				return item;
			}).reduce((set, i) => set.add(i), new Set());
			const failedIndexesSet = new Set();
			const actual = await Promise.all(expected.map((one, i) => requester.add(() => {
				executedTimes[i] += 1;
				if (rejectedIndexesSet.has(i) && executedTimes[i] < maxRejectsCount) {
					if (executedTimes[i] === maxRejectsCount && randomInt(10) > 5) failedIndexesSet.add(i);
					return Promise.reject(new Error(one));
				}
				return Promise.resolve(one);
			}).catch(() => null)));

			rejectedIndexesSet.forEach((i) => {
				assert(executedTimes[i] === maxRejectsCount || executedTimes[i] === (maxRejectsCount + 1));
			});

			actual.forEach((one, i) => {
				assert.strictEqual(one, failedIndexesSet.has(i) ? undefined : expected[i]);
			})
		});

		for (let i = 1; i < 4; i += 1) {
			it(`one rejected with static delay #${i}`, async () => { // works strange
				const size = randomInt(50, 100);
				const rejectedIndex = randomInt(10, size - 10);
				const delay = 50;
				const retry = {
					maxCount: 1,
					blockDelayFormula: () => delay,
				};
				const expected = fillArray(size, () => randomString.generate(randomInt(20, 30)));

				const requester = new RequestLimiter(4, true, retry);
				const moments = new Array(size);
				let rejected = false;
				const actual = await Promise.all(expected.map((one, i) => requester.add(() => {
					moments[i] = (new Date).getTime();
					if (i === rejectedIndex && !rejected) {
						rejected = true;
						return Promise.reject(new Error(one));
					} else return Promise.resolve(one);
				}).catch(() => null)));

				const before = moments.slice(0, rejectedIndex);
				const after = moments.slice(rejectedIndex + 1, size - 1);

				const afterMin = findMin(after);
				const beforeMax = findMax(before);

				// const [afterMin, afterMinIndex] = findMin(after, { returnIndex: true });
				// const [beforeMax, beforeMaxIndex] = findMax(before, { returnIndex: true });
				// console.log('size', size);
				// console.log('before', beforeMaxIndex, actual[beforeMaxIndex])
				// console.log('rejected', rejectedIndex, actual[rejectedIndex]);
				// console.log('after', before.length + 1 + afterMinIndex, actual[afterMinIndex])
				// console.log(afterMin, beforeMax, afterMin - beforeMax);
				assert(beforeMax < afterMin);
				assert.deepStrictEqual(expected, actual);
			});
		}

	});

});
