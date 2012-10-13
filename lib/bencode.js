var Buffer = require('buffer').Buffer;

/**
 * Encodes a javascript object into a buffer
 * 
 * @param {Object|Array|number|string|Buffer} data the data to encode
 * @param {Buffer=} buf the buffer to extend
 * @return {Buffer} the encoded buffer
 */
function encode(data, buf) {
	if (!buf) {
		buf = new Buffer(0);
	}
	
	switch (typeof data) {
		case 'number':
			var str = 'i' + data + 'e';
			var newBuf = new Buffer(buf.length + Buffer.byteLength(str));
			buf.copy(newBuf);
			newBuf.write(str, buf.length);
			break;
		case 'string':
			var str = Buffer.byteLength(data) + ':' + data;
			var newBuf = new Buffer(buf.length + Buffer.byteLength(str));
			buf.copy(newBuf);
			newBuf.write(str, buf.length, 'binary');
			break;
		case 'object':
			if (data instanceof Array) {
				var newBuf = new Buffer(buf.length + 1);
				buf.copy(newBuf);
				newBuf.write('l', buf.length, 'binary');
				buf = newBuf;
				
				for (var i=0; i < data.length; ++i) {
					buf = encode(data[i], buf);
				}
				
				var newBuf = new Buffer(buf.length + 1);
				buf.copy(newBuf);
				newBuf.write('e', buf.length, 'binary');
			} else if (data instanceof Buffer) {
				var str = data.length + ':';
				var newBuf = new Buffer(buf.length + Buffer.byteLength(str) + data.length);
				buf.copy(newBuf);
				newBuf.write(str, buf.length);
				data.copy(newBuf, buf.length + Buffer.byteLength(str));
			} else {
				var newBuf = new Buffer(buf.length + 1);
				buf.copy(newBuf);
				newBuf.write('d', buf.length, 'binary');
				buf = newBuf;
				
				for (var i in data) {
					buf = encode(i, buf);
					buf = encode(data[i], buf);
				}
				
				var newBuf = new Buffer(buf.length + 1);
				buf.copy(newBuf);
				newBuf.write('e', buf.length, 'binary');
			}
			break;
		default:
			throw new Error('Unknown data type: ' + typeof data);
	}
	
	return newBuf;
}


/**
 * Decodes a buffer or string to a javascript object.
 * 
 * @param {Buffer|string} data the data to decode
 * @param {{offset: number}} offset the offset to the buffer to begin the decoding
 * @return {Object|Array|number|string} the decoded object
 */
function decode(data, config) {
	if (!(data instanceof Buffer)) {
		data = new Buffer(data);
	}
	if (!config) {
		config = {offset: 0};
	}
	
	switch (data[config.offset]) {
		case 0x69: // i
			++config.offset;
			
			var i = config.offset;
			while (data[i] !== 0x65) ++i;
			
			var num = parseInt(data.slice(config.offset, i).toString('ascii'));
			config.offset = i + 1;
			
			return num;
		case 0x6C: // l
			++config.offset;
			var ret = [];
			
			while (data[config.offset] !== 0x65) {
				ret.push(decode(data, config));
			}
			++config.offset;
			
			return ret;
		case 0x64: // d
			++config.offset;
			var ret = {};
			
			while (data[config.offset] !== 0x65) {
				ret[decode(data, config)] = decode(data, config);
			}
			++config.offset;
			
			return ret;
		default:
			var i = 0;
			for (; data[config.offset + i] !== 0x3A; ++i) { // :
				if (data[config.offset + i] < 0x30 || data[config.offset + i] > 0x39) { // 1 - 9
					throw new Error('Invalid byte-length format!');
				}
			}
			
			var num = parseInt(data.slice(config.offset, config.offset + i).toString('ascii'));
			var buf = data.slice(config.offset + i + 1, config.offset + i + num + 1);
			
			config.offset += i + num + 1;
			return buf;
	}
}


module.exports.encode = encode;

module.exports.decode = decode;