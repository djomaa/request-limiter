const randomString = require('randomstring');
const { fillArray, randomInt, findMin, findMax } = require('../utils');
const RequestLimiter = require('../dist').default;
const assert = require('assert');
describe('Testing', () => {

	it('simple', async () => {
		const requester = new RequestLimiter(2);
		const results = fillArray(100, () => randomString.generate(randomInt(5, 20)));
		const promises = results.map((one) => requester.add(() => new Promise((resolve) => resolve(one))));
		assert.deepStrictEqual(results, await Promise.all(promises));
	});

	it('retry with no fatal rejections', async () => {
		const expected = randomString.generate(10);
		const requester = new RequestLimiter(2, true, { maxCount: 1, delayFormula: () => 5 });
		let executesCount = 0;
		const actual = await requester.add(() => new Promise((resolve, reject) => {
			executesCount += 1;
			if (executesCount < 2) reject(new Error());
			else resolve(expected);
		}));
		assert.strictEqual(expected, actual);
	});

	// TODO: delay test
	// TODO: fatal rejection
	// TODO: throw test fatal & not fatal

});
