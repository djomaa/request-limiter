const randomString = require('randomstring');
const { fillArray, randomInt } = require('../utils');
const RequestLimiter = require('../dist').default;
const assert = require('assert');

describe('Testing', () => {
	it('simple', async () => {
		const requester = new RequestLimiter(2);
		const results = fillArray(100, () => randomString.generate(randomInt(5, 20)));
		const promises = results.map((one) => requester.add(() => new Promise((resolve) => resolve(one))));
		assert.deepStrictEqual(results, await Promise.all(promises));
	});
});
