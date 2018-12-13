const randomInt = (to, from = 0) => {
	if (to === from) return to;
	if (to < from) {
		const temp = to;
		to = from;
		from = temp;
	}
	return Math.floor(Math.random() * ((to - from) + 1)) + from;
};

/**
 * creates new array with passed size using the function to fill. Can be used
 * @param {Object|Number} options options object or number (size)
 * @param {Number?} options.size size of the array
 * @param {Boolean?} options.passArray pass array to the func
 * @param {Boolean?} options.await if true the function returns Promise.all(resultArray)
 * @param {Function|String} func function or string used size times. Can be async
 * @return {Array|Promise<Array>}
 */
function fillArray(options, func) {
	if (typeof options === 'number') {
		options = { size: options };
	}
	const array = new Array(options.size);
	if (options.passArray) {
		if (typeof func !== 'function') throw new Error('can not pass array to not a function');
		func = func.bind(null, array);
	}
	for (let i = 0; i < options.size; i += 1) {
		array[i] = typeof func === 'function' ? func(array) : func;
	}
	return options.await ? Promise.all(array) : array;
}

function findMin(array, { returnIndex } = {}) {
	let min = array[0];
	let index = 0;
	for (let i = 1; i < array.length; i += 1) {
		if (min > array[i]) continue;
		min = array[i];
		index = i;
	}
	return returnIndex ? [min, index] : min;
}

function findMax(array, { returnIndex } = {}) {
	let max = array[0];
	let index = 0;
	for (let i = 1; i < array.length; i += 1) {
		if (max > array[i]) continue;
		max = array[i];
		index = i;
	}
	return returnIndex ? [max, index] : max;
}

/**
 * returns an random element of the passed array
 * @param {Array} array
 * @return {*} random element of the array
 */
function getRandomArrayItem(array) {
	return array[randomInt(array.length - 1)];
}

module.exports = {
	randomInt,
	fillArray,
	getRandomArrayItem,
	findMin,
	findMax,
};
