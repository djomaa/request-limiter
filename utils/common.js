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
 * @param {Boolean?} options.await if true the function returns Promise.all(resultArray)
 * @param {Function|String} func function or string used size times. Can be async
 * @return {Array|Promise<Array>}
 */
function fillArray(options, func) {
	if (typeof options === 'number') {
		options = { size: options };
	}
	const array = new Array(options.size);
	for (let i = 0; i < options.size; i += 1) {
		array[i] = typeof func === 'function' ? func() : func;
	}
	return options.await ? Promise.all(array) : array;
}


module.exports = {
	randomInt,
	fillArray,
};
