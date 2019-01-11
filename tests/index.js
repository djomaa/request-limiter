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
		const requester = new RequestLimiter(2, true, { maxCount: 1, delayFormula: (i) => 1000 });
		let index = 0;
		try {
			const res1 = await requester.add(() => (new Promise((res, rej) => {
				index += 1;

				if (index < 2) {
					console.log('!!!!', index);
					rej(new Error('asd'));
				}
				res();
			}))
				// .catch((err) => console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!error', err))
			);
		} catch (e) {
			console.log(e.stackTrace);
		}


	});

});
