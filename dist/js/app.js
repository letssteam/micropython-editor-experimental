(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],2:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this)}).call(this,require("buffer").Buffer)

},{"base64-js":1,"buffer":2,"ieee754":5}],3:[function(require,module,exports){
(function (Buffer){(function (){
!function(t,e){"object"==typeof exports&&"undefined"!=typeof module?e(exports):"function"==typeof define&&define.amd?define(["exports"],e):e((t=t||self).DAPjs={})}(this,(function(t){"use strict";
/*! *****************************************************************************
    Copyright (c) Microsoft Corporation. All rights reserved.
    Licensed under the Apache License, Version 2.0 (the "License"); you may not use
    this file except in compliance with the License. You may obtain a copy of the
    License at http://www.apache.org/licenses/LICENSE-2.0

    THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
    WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
    MERCHANTABLITY OR NON-INFRINGEMENT.

    See the Apache Version 2.0 License for specific language governing permissions
    and limitations under the License.
    ***************************************************************************** */var e=function(t,r){return(e=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var r in e)e.hasOwnProperty(r)&&(t[r]=e[r])})(t,r)};function r(t,r){function n(){this.constructor=t}e(t,r),t.prototype=null===r?Object.create(r):(n.prototype=r.prototype,new n)}function n(t,e,r,n){return new(r||(r=Promise))((function(i,s){function o(t){try{c(n.next(t))}catch(t){s(t)}}function u(t){try{c(n.throw(t))}catch(t){s(t)}}function c(t){var e;t.done?i(t.value):(e=t.value,e instanceof r?e:new r((function(t){t(e)}))).then(o,u)}c((n=n.apply(t,e||[])).next())}))}function i(t,e){var r,n,i,s,o={label:0,sent:function(){if(1&i[0])throw i[1];return i[1]},trys:[],ops:[]};return s={next:u(0),throw:u(1),return:u(2)},"function"==typeof Symbol&&(s[Symbol.iterator]=function(){return this}),s;function u(s){return function(u){return function(s){if(r)throw new TypeError("Generator is already executing.");for(;o;)try{if(r=1,n&&(i=2&s[0]?n.return:s[0]?n.throw||((i=n.return)&&i.call(n),0):n.next)&&!(i=i.call(n,s[1])).done)return i;switch(n=0,i&&(s=[2&s[0],i.value]),s[0]){case 0:case 1:i=s;break;case 4:return o.label++,{value:s[1],done:!1};case 5:o.label++,n=s[1],s=[0];continue;case 7:s=o.ops.pop(),o.trys.pop();continue;default:if(!(i=o.trys,(i=i.length>0&&i[i.length-1])||6!==s[0]&&2!==s[0])){o=0;continue}if(3===s[0]&&(!i||s[1]>i[0]&&s[1]<i[3])){o.label=s[1];break}if(6===s[0]&&o.label<i[1]){o.label=i[1],i=s;break}if(i&&o.label<i[2]){o.label=i[2],o.ops.push(s);break}i[2]&&o.ops.pop(),o.trys.pop();continue}s=e.call(t,o)}catch(t){s=[6,t],n=0}finally{r=i=0}if(5&s[0])throw s[1];return{value:s[0]?s[1]:void 0,done:!0}}([s,u])}}}function s(){}function o(){o.init.call(this)}function u(t){return void 0===t._maxListeners?o.defaultMaxListeners:t._maxListeners}function c(t,e,r){if(e)t.call(r);else for(var n=t.length,i=w(t,n),s=0;s<n;++s)i[s].call(r)}function a(t,e,r,n){if(e)t.call(r,n);else for(var i=t.length,s=w(t,i),o=0;o<i;++o)s[o].call(r,n)}function h(t,e,r,n,i){if(e)t.call(r,n,i);else for(var s=t.length,o=w(t,s),u=0;u<s;++u)o[u].call(r,n,i)}function f(t,e,r,n,i,s){if(e)t.call(r,n,i,s);else for(var o=t.length,u=w(t,o),c=0;c<o;++c)u[c].call(r,n,i,s)}function l(t,e,r,n){if(e)t.apply(r,n);else for(var i=t.length,s=w(t,i),o=0;o<i;++o)s[o].apply(r,n)}function d(t,e,r,n){var i,o,c,a;if("function"!=typeof r)throw new TypeError('"listener" argument must be a function');if((o=t._events)?(o.newListener&&(t.emit("newListener",e,r.listener?r.listener:r),o=t._events),c=o[e]):(o=t._events=new s,t._eventsCount=0),c){if("function"==typeof c?c=o[e]=n?[r,c]:[c,r]:n?c.unshift(r):c.push(r),!c.warned&&(i=u(t))&&i>0&&c.length>i){c.warned=!0;var h=new Error("Possible EventEmitter memory leak detected. "+c.length+" "+e+" listeners added. Use emitter.setMaxListeners() to increase limit");h.name="MaxListenersExceededWarning",h.emitter=t,h.type=e,h.count=c.length,a=h,"function"==typeof console.warn?console.warn(a):console.log(a)}}else c=o[e]=r,++t._eventsCount;return t}function p(t,e,r){var n=!1;function i(){t.removeListener(e,i),n||(n=!0,r.apply(t,arguments))}return i.listener=r,i}function v(t){var e=this._events;if(e){var r=e[t];if("function"==typeof r)return 1;if(r)return r.length}return 0}function w(t,e){for(var r=new Array(e);e--;)r[e]=t[e];return r}s.prototype=Object.create(null),o.EventEmitter=o,o.usingDomains=!1,o.prototype.domain=void 0,o.prototype._events=void 0,o.prototype._maxListeners=void 0,o.defaultMaxListeners=10,o.init=function(){this.domain=null,o.usingDomains&&undefined.active,this._events&&this._events!==Object.getPrototypeOf(this)._events||(this._events=new s,this._eventsCount=0),this._maxListeners=this._maxListeners||void 0},o.prototype.setMaxListeners=function(t){if("number"!=typeof t||t<0||isNaN(t))throw new TypeError('"n" argument must be a positive number');return this._maxListeners=t,this},o.prototype.getMaxListeners=function(){return u(this)},o.prototype.emit=function(t){var e,r,n,i,s,o,u,d="error"===t;if(o=this._events)d=d&&null==o.error;else if(!d)return!1;if(u=this.domain,d){if(e=arguments[1],!u){if(e instanceof Error)throw e;var p=new Error('Uncaught, unspecified "error" event. ('+e+")");throw p.context=e,p}return e||(e=new Error('Uncaught, unspecified "error" event')),e.domainEmitter=this,e.domain=u,e.domainThrown=!1,u.emit("error",e),!1}if(!(r=o[t]))return!1;var v="function"==typeof r;switch(n=arguments.length){case 1:c(r,v,this);break;case 2:a(r,v,this,arguments[1]);break;case 3:h(r,v,this,arguments[1],arguments[2]);break;case 4:f(r,v,this,arguments[1],arguments[2],arguments[3]);break;default:for(i=new Array(n-1),s=1;s<n;s++)i[s-1]=arguments[s];l(r,v,this,i)}return!0},o.prototype.addListener=function(t,e){return d(this,t,e,!1)},o.prototype.on=o.prototype.addListener,o.prototype.prependListener=function(t,e){return d(this,t,e,!0)},o.prototype.once=function(t,e){if("function"!=typeof e)throw new TypeError('"listener" argument must be a function');return this.on(t,p(this,t,e)),this},o.prototype.prependOnceListener=function(t,e){if("function"!=typeof e)throw new TypeError('"listener" argument must be a function');return this.prependListener(t,p(this,t,e)),this},o.prototype.removeListener=function(t,e){var r,n,i,o,u;if("function"!=typeof e)throw new TypeError('"listener" argument must be a function');if(!(n=this._events))return this;if(!(r=n[t]))return this;if(r===e||r.listener&&r.listener===e)0==--this._eventsCount?this._events=new s:(delete n[t],n.removeListener&&this.emit("removeListener",t,r.listener||e));else if("function"!=typeof r){for(i=-1,o=r.length;o-- >0;)if(r[o]===e||r[o].listener&&r[o].listener===e){u=r[o].listener,i=o;break}if(i<0)return this;if(1===r.length){if(r[0]=void 0,0==--this._eventsCount)return this._events=new s,this;delete n[t]}else!function(t,e){for(var r=e,n=r+1,i=t.length;n<i;r+=1,n+=1)t[r]=t[n];t.pop()}(r,i);n.removeListener&&this.emit("removeListener",t,u||e)}return this},o.prototype.removeAllListeners=function(t){var e,r;if(!(r=this._events))return this;if(!r.removeListener)return 0===arguments.length?(this._events=new s,this._eventsCount=0):r[t]&&(0==--this._eventsCount?this._events=new s:delete r[t]),this;if(0===arguments.length){for(var n,i=Object.keys(r),o=0;o<i.length;++o)"removeListener"!==(n=i[o])&&this.removeAllListeners(n);return this.removeAllListeners("removeListener"),this._events=new s,this._eventsCount=0,this}if("function"==typeof(e=r[t]))this.removeListener(t,e);else if(e)do{this.removeListener(t,e[e.length-1])}while(e[0]);return this},o.prototype.listeners=function(t){var e,r=this._events;return r&&(e=r[t])?"function"==typeof e?[e.listener||e]:function(t){for(var e=new Array(t.length),r=0;r<e.length;++r)e[r]=t[r].listener||t[r];return e}(e):[]},o.listenerCount=function(t,e){return"function"==typeof t.listenerCount?t.listenerCount(e):v.call(t,e)},o.prototype.listenerCount=v,o.prototype.eventNames=function(){return this._eventsCount>0?Reflect.ownKeys(this._events):[]};var y,m=1e7,b=function(){function t(){this.locked=!1}return t.prototype.lock=function(){return n(this,void 0,void 0,(function(){return i(this,(function(t){switch(t.label){case 0:return this.locked?[4,new Promise((function(t){return setTimeout(t,1)}))]:[3,2];case 1:return t.sent(),[3,0];case 2:return this.locked=!0,[2]}}))}))},t.prototype.unlock=function(){this.locked=!1},t}(),g=function(t){function e(e,r,n){void 0===r&&(r=0),void 0===n&&(n=m);var i=t.call(this)||this;i.transport=e,i.mode=r,i.clockFrequency=n,i.connected=!1,i.sendMutex=new b,i.blockSize=i.transport.packetSize-4-1;var s=i.transport.packetSize-2-1;return i.operationCount=Math.floor(s/5),i}return r(e,t),e.prototype.bufferSourceToUint8Array=function(t,e){if(!e)return new Uint8Array([t]);var r=void 0!==e.buffer?e.buffer:e,n=new Uint8Array(r.byteLength+1);return n.set([t]),n.set(new Uint8Array(r),1),n},e.prototype.selectProtocol=function(t){return n(this,void 0,void 0,(function(){var e;return i(this,(function(r){switch(r.label){case 0:return e=2===t?59196:59294,[4,this.swjSequence(new Uint8Array([255,255,255,255,255,255,255]))];case 1:return r.sent(),[4,this.swjSequence(new Uint16Array([e]))];case 2:return r.sent(),[4,this.swjSequence(new Uint8Array([255,255,255,255,255,255,255]))];case 3:return r.sent(),[4,this.swjSequence(new Uint8Array([0]))];case 4:return r.sent(),[2]}}))}))},e.prototype.send=function(t,e){return n(this,void 0,void 0,(function(){var r,n;return i(this,(function(i){switch(i.label){case 0:return r=this.bufferSourceToUint8Array(t,e),[4,this.sendMutex.lock()];case 1:i.sent(),i.label=2;case 2:return i.trys.push([2,,5,6]),[4,this.transport.write(r)];case 3:return i.sent(),[4,this.transport.read()];case 4:if((n=i.sent()).getUint8(0)!==t)throw new Error("Bad response for "+t+" -> "+n.getUint8(0));switch(t){case 3:case 8:case 9:case 10:case 17:case 18:case 19:case 29:case 23:case 24:case 26:case 21:case 22:case 4:if(0!==n.getUint8(1))throw new Error("Bad status for "+t+" -> "+n.getUint8(1))}return[2,n];case 5:return this.sendMutex.unlock(),[7];case 6:return[2]}}))}))},e.prototype.clearAbort=function(t){return void 0===t&&(t=30),n(this,void 0,void 0,(function(){return i(this,(function(e){switch(e.label){case 0:return[4,this.send(8,new Uint8Array([0,t]))];case 1:return e.sent(),[2]}}))}))},e.prototype.dapInfo=function(t){return n(this,void 0,void 0,(function(){var e,r,n,s;return i(this,(function(i){switch(i.label){case 0:return i.trys.push([0,2,,4]),[4,this.send(0,new Uint8Array([t]))];case 1:if(e=i.sent(),0===(r=e.getUint8(1)))return[2,""];switch(t){case 240:case 254:case 255:case 253:if(1===r)return[2,e.getUint8(2)];if(2===r)return[2,e.getUint16(2)];if(4===r)return[2,e.getUint32(2)]}return n=Array.prototype.slice.call(new Uint8Array(e.buffer,2,r)),[2,String.fromCharCode.apply(null,n)];case 2:return s=i.sent(),[4,this.clearAbort()];case 3:throw i.sent(),s;case 4:return[2]}}))}))},e.prototype.swjSequence=function(t,e){return void 0===e&&(e=8*t.byteLength),n(this,void 0,void 0,(function(){var r,n;return i(this,(function(i){switch(i.label){case 0:r=this.bufferSourceToUint8Array(e,t),i.label=1;case 1:return i.trys.push([1,3,,5]),[4,this.send(18,r)];case 2:return i.sent(),[3,5];case 3:return n=i.sent(),[4,this.clearAbort()];case 4:throw i.sent(),n;case 5:return[2]}}))}))},e.prototype.swjClock=function(t){return n(this,void 0,void 0,(function(){var e;return i(this,(function(r){switch(r.label){case 0:return r.trys.push([0,2,,4]),[4,this.send(17,new Uint8Array([255&t,(65280&t)>>8,(16711680&t)>>16,(4278190080&t)>>24]))];case 1:return r.sent(),[3,4];case 2:return e=r.sent(),[4,this.clearAbort()];case 3:throw r.sent(),e;case 4:return[2]}}))}))},e.prototype.swjPins=function(t,e,r){return n(this,void 0,void 0,(function(){var n;return i(this,(function(i){switch(i.label){case 0:return i.trys.push([0,2,,4]),[4,this.send(16,new Uint8Array([t,e,255&r,(65280&r)>>8,(16711680&r)>>16,(4278190080&r)>>24]))];case 1:return[2,i.sent().getUint8(1)];case 2:return n=i.sent(),[4,this.clearAbort()];case 3:throw i.sent(),n;case 4:return[2]}}))}))},e.prototype.dapDelay=function(t){return n(this,void 0,void 0,(function(){var e;return i(this,(function(r){switch(r.label){case 0:return r.trys.push([0,2,,4]),[4,this.send(9,new Uint8Array([255&t,(65280&t)>>8]))];case 1:return r.sent(),[3,4];case 2:return e=r.sent(),[4,this.clearAbort()];case 3:throw r.sent(),e;case 4:return[2]}}))}))},e.prototype.configureTransfer=function(t,e,r){return n(this,void 0,void 0,(function(){var n,s,o;return i(this,(function(i){switch(i.label){case 0:n=new Uint8Array(5),(s=new DataView(n.buffer)).setUint8(0,t),s.setUint16(1,e,!0),s.setUint16(3,r,!0),i.label=1;case 1:return i.trys.push([1,3,,5]),[4,this.send(4,n)];case 2:return i.sent(),[3,5];case 3:return o=i.sent(),[4,this.clearAbort()];case 4:throw i.sent(),o;case 5:return[2]}}))}))},e.prototype.connect=function(){return n(this,void 0,void 0,(function(){var t,e,r;return i(this,(function(n){switch(n.label){case 0:return!0===this.connected?[2]:[4,this.transport.open()];case 1:n.sent(),n.label=2;case 2:return n.trys.push([2,5,,8]),[4,this.send(17,new Uint32Array([this.clockFrequency]))];case 3:return n.sent(),[4,this.send(2,new Uint8Array([this.mode]))];case 4:if(0===(t=n.sent()).getUint8(1)||0!==this.mode&&t.getUint8(1)!==this.mode)throw new Error("Mode not enabled.");return[3,8];case 5:return e=n.sent(),[4,this.clearAbort()];case 6:return n.sent(),[4,this.transport.close()];case 7:throw n.sent(),e;case 8:return n.trys.push([8,11,,13]),[4,this.configureTransfer(0,100,0)];case 9:return n.sent(),[4,this.selectProtocol(1)];case 10:return n.sent(),[3,13];case 11:return r=n.sent(),[4,this.transport.close()];case 12:throw n.sent(),r;case 13:return this.connected=!0,[2]}}))}))},e.prototype.disconnect=function(){return n(this,void 0,void 0,(function(){var t;return i(this,(function(e){switch(e.label){case 0:if(!1===this.connected)return[2];e.label=1;case 1:return e.trys.push([1,3,,5]),[4,this.send(3)];case 2:return e.sent(),[3,5];case 3:return t=e.sent(),[4,this.clearAbort()];case 4:throw e.sent(),t;case 5:return[4,this.transport.close()];case 6:return e.sent(),this.connected=!1,[2]}}))}))},e.prototype.reconnect=function(){return n(this,void 0,void 0,(function(){return i(this,(function(t){switch(t.label){case 0:return[4,this.disconnect()];case 1:return t.sent(),[4,new Promise((function(t){return setTimeout(t,100)}))];case 2:return t.sent(),[4,this.connect()];case 3:return t.sent(),[2]}}))}))},e.prototype.reset=function(){return n(this,void 0,void 0,(function(){var t;return i(this,(function(e){switch(e.label){case 0:return e.trys.push([0,2,,4]),[4,this.send(10)];case 1:return[2,1===e.sent().getUint8(2)];case 2:return t=e.sent(),[4,this.clearAbort()];case 3:throw e.sent(),t;case 4:return[2]}}))}))},e.prototype.transfer=function(t,e,r,s){return void 0===e&&(e=2),void 0===r&&(r=0),void 0===s&&(s=0),n(this,void 0,void 0,(function(){var n,o,u,c,a,h,f;return i(this,(function(i){switch(i.label){case 0:n="number"==typeof t?[{port:t,mode:e,register:r,value:s}]:t,o=new Uint8Array(2+5*n.length),(u=new DataView(o.buffer)).setUint8(0,0),u.setUint8(1,n.length),n.forEach((function(t,e){var r=2+5*e;u.setUint8(r,t.port|t.mode|t.register),u.setUint32(r+1,t.value||0,!0)})),i.label=1;case 1:return i.trys.push([1,3,,5]),[4,this.send(5,o)];case 2:if((c=i.sent()).getUint8(1)!==n.length)throw new Error("Transfer count mismatch");if(2===(a=c.getUint8(2)))throw new Error("Transfer response WAIT");if(4===a)throw new Error("Transfer response FAULT");if(8===a)throw new Error("Transfer response PROTOCOL_ERROR");if(16===a)throw new Error("Transfer response VALUE_MISMATCH");if(7===a)throw new Error("Transfer response NO_ACK");return"number"==typeof t?[2,c.getUint32(3,!0)]:(h=4*n.length,[2,new Uint32Array(c.buffer.slice(3,3+h))]);case 3:return f=i.sent(),[4,this.clearAbort()];case 4:throw i.sent(),f;case 5:return[2]}}))}))},e.prototype.transferBlock=function(t,e,r){return n(this,void 0,void 0,(function(){var n,s,o,u,c,a,h,f;return i(this,(function(i){switch(i.label){case 0:o=4,"number"==typeof r?(n=r,s=2):(n=r.length,s=0,o+=r.byteLength),u=new Uint8Array(o),(c=new DataView(u.buffer)).setUint8(0,0),c.setUint16(1,n,!0),c.setUint8(3,t|s|e),"number"!=typeof r&&r.forEach((function(t,e){var r=4+4*e;c.setUint32(r,t,!0)})),i.label=1;case 1:return i.trys.push([1,3,,5]),[4,this.send(6,c)];case 2:if((a=i.sent()).getUint16(1,!0)!==n)throw new Error("Transfer count mismatch");if(2===(h=a.getUint8(3)))throw new Error("Transfer response WAIT");if(4===h)throw new Error("Transfer response FAULT");if(8===h)throw new Error("Transfer response PROTOCOL_ERROR");if(7===h)throw new Error("Transfer response NO_ACK");return"number"==typeof r?[2,new Uint32Array(a.buffer.slice(4,4+4*n))]:[3,5];case 3:return f=i.sent(),[4,this.clearAbort()];case 4:throw i.sent(),f;case 5:return[2,void 0]}}))}))},e}(o),A=/[\xc0-\xff][\x80-\xbf]*$/g,C=/[\xc0-\xff][\x80-\xbf]*/g,U=function(){function t(){}return t.prototype.decode=function(t){var e=Array.prototype.slice.call(new Uint8Array(t)),r=String.fromCodePoint.apply(void 0,e);this.partialChar&&(r=""+this.partialChar+r,this.partialChar=void 0);var n=r.match(A);if(n){var i=n[0].length;this.partialChar=r.slice(-i),r=r.slice(0,-i)}return r.replace(C,this.decoderReplacer)},t.prototype.decoderReplacer=function(t){var e=t.codePointAt(0)<<24,r=Math.clz32(~e),n=0,i=t.length,s="";if(r<5&&i>=r){for(e=e<<r>>>24+r,n=1;n<r;n+=1)e=e<<6|63&t.codePointAt(n);e<=65535?s+=String.fromCodePoint(e):e<=1114111?(e-=65536,s+=String.fromCodePoint(55296+(e>>10),56320+(1023&e))):n=0}for(;n<i;n+=1)s+="�";return s},t}(),E=new U,P=function(t){function e(r,s,o){void 0===s&&(s=0),void 0===o&&(o=m);var u=t.call(this,r,s,o)||this;return u.serialPolling=!1,u.serialListeners=!1,u.on("newListener",(function(t){return n(u,void 0,void 0,(function(){return i(this,(function(r){return t===e.EVENT_SERIAL_DATA&&0===this.listenerCount(t)&&(this.serialListeners=!0),[2]}))}))})),u.on("removeListener",(function(t){t===e.EVENT_SERIAL_DATA&&(0===u.listenerCount(t)&&(u.serialListeners=!1))})),u}return r(e,t),e.prototype.isBufferBinary=function(t){for(var e=Array.prototype.slice.call(new Uint16Array(t,0,50)),r=String.fromCharCode.apply(null,e),n=0;n<r.length;n++){var i=r.charCodeAt(n);if(65533===i||i<=8)return!0}return!1},e.prototype.writeBuffer=function(t,r,s){return void 0===s&&(s=0),n(this,void 0,void 0,(function(){var n,o,u,c;return i(this,(function(i){switch(i.label){case 0:n=Math.min(t.byteLength,s+r),o=t.slice(s,n),(u=new Uint8Array(o.byteLength+1)).set([o.byteLength]),u.set(new Uint8Array(o),1),i.label=1;case 1:return i.trys.push([1,3,,5]),[4,this.send(140,u)];case 2:return i.sent(),[3,5];case 3:return c=i.sent(),[4,this.clearAbort()];case 4:throw i.sent(),c;case 5:return this.emit(e.EVENT_PROGRESS,s/t.byteLength),n<t.byteLength?[2,this.writeBuffer(t,r,n)]:[2]}}))}))},e.prototype.flash=function(t,r){return void 0===r&&(r=62),n(this,void 0,void 0,(function(){var n,s,o;return i(this,(function(i){switch(i.label){case 0:n=function(t){return void 0!==t.buffer}(t)?t.buffer:t,s=this.isBufferBinary(n)?0:1,i.label=1;case 1:return i.trys.push([1,6,,8]),[4,this.send(138,new Uint32Array([s]))];case 2:if(0!==i.sent().getUint8(1))throw new Error("Flash error");return[4,this.writeBuffer(n,r)];case 3:return i.sent(),this.emit(e.EVENT_PROGRESS,1),[4,this.send(139)];case 4:if(0!==i.sent().getUint8(1))throw new Error("Flash error");return[4,this.send(137)];case 5:return i.sent(),[3,8];case 6:return o=i.sent(),[4,this.clearAbort()];case 7:throw i.sent(),o;case 8:return[2]}}))}))},e.prototype.getSerialBaudrate=function(){return n(this,void 0,void 0,(function(){var t;return i(this,(function(e){switch(e.label){case 0:return e.trys.push([0,2,,4]),[4,this.send(129)];case 1:return[2,e.sent().getUint32(1,!0)];case 2:return t=e.sent(),[4,this.clearAbort()];case 3:throw e.sent(),t;case 4:return[2]}}))}))},e.prototype.setSerialBaudrate=function(t){return void 0===t&&(t=9600),n(this,void 0,void 0,(function(){var e;return i(this,(function(r){switch(r.label){case 0:return r.trys.push([0,2,,4]),[4,this.send(130,new Uint32Array([t]))];case 1:return r.sent(),[3,4];case 2:return e=r.sent(),[4,this.clearAbort()];case 3:throw r.sent(),e;case 4:return[2]}}))}))},e.prototype.serialWrite=function(t){return n(this,void 0,void 0,(function(){var e,r;return i(this,(function(n){switch(n.label){case 0:(e=t.split("").map((function(t){return t.charCodeAt(0)}))).unshift(e.length),n.label=1;case 1:return n.trys.push([1,3,,5]),[4,this.send(132,new Uint8Array(e).buffer)];case 2:return n.sent(),[3,5];case 3:return r=n.sent(),[4,this.clearAbort()];case 4:throw n.sent(),r;case 5:return[2]}}))}))},e.prototype.serialRead=function(){return n(this,void 0,void 0,(function(){var t,e,r;return i(this,(function(n){switch(n.label){case 0:return n.trys.push([0,2,,4]),[4,this.send(131)];case 1:return 0===(t=n.sent()).byteLength||(131!==t.getUint8(0)||0===(e=t.getUint8(1)))?[2,void 0]:(2,[2,t.buffer.slice(2,2+e)]);case 2:return r=n.sent(),[4,this.clearAbort()];case 3:throw n.sent(),r;case 4:return[2]}}))}))},e.prototype.startSerialRead=function(t,r){return void 0===t&&(t=100),void 0===r&&(r=!0),n(this,void 0,void 0,(function(){var n,s,o;return i(this,(function(i){switch(i.label){case 0:this.serialPolling=!0,i.label=1;case 1:return this.serialPolling?this.serialListeners?(n=this.connected,!1!==this.connected||!0!==r?[3,3]:[4,this.connect()]):[3,7]:[3,9];case 2:i.sent(),i.label=3;case 3:return[4,this.serialRead()];case 4:return s=i.sent(),!1!==n||!0!==r?[3,6]:[4,this.disconnect()];case 5:i.sent(),i.label=6;case 6:void 0!==s&&(o=E.decode(s),this.emit(e.EVENT_SERIAL_DATA,o)),i.label=7;case 7:return[4,new Promise((function(e){return setTimeout(e,t)}))];case 8:return i.sent(),[3,1];case 9:return[2]}}))}))},e.prototype.stopSerialRead=function(){this.serialPolling=!1},e.EVENT_PROGRESS="progress",e.EVENT_SERIAL_DATA="serial",e}(g),T=function(){function t(t,e,r){void 0===e&&(e=0),void 0===r&&(r=m);this.proxy=void 0!==t.open?new g(t,e,r):t}return t.prototype.waitDelay=function(t,e,r){return void 0===e&&(e=0),void 0===r&&(r=100),n(this,void 0,void 0,(function(){var n;return i(this,(function(i){switch(i.label){case 0:n=!0,e>0&&setTimeout((function(){if(n)throw n=!1,new Error("Wait timed out")}),e),i.label=1;case 1:return n?[4,t()]:[3,5];case 2:return!0===i.sent()?(n=!1,[2]):r>0?[4,new Promise((function(t){return setTimeout(t,e)}))]:[3,4];case 3:i.sent(),i.label=4;case 4:return[3,1];case 5:return[2]}}))}))},t.prototype.concatTypedArray=function(t){if(1===t.length)return t[0];for(var e=0,r=0,n=t;r<n.length;r++){e+=n[r].length}for(var i=new Uint32Array(e),s=0,o=0;s<t.length;s++)i.set(t[s],o),o+=t[s].length;return i},t.prototype.readDPCommand=function(t){return[{mode:2,port:0,register:t}]},t.prototype.writeDPCommand=function(t,e){if(8===t){if(e===this.selectedAddress)return[];this.selectedAddress=e}return[{mode:0,port:0,register:t,value:e}]},t.prototype.readAPCommand=function(t){var e=4278190080&t|240&t;return this.writeDPCommand(8,e).concat({mode:2,port:1,register:t})},t.prototype.writeAPCommand=function(t,e){if(0===t){if(e===this.cswValue)return[];this.cswValue=e}var r=4278190080&t|240&t;return this.writeDPCommand(8,r).concat({mode:0,port:1,register:t,value:e})},t.prototype.readMem16Command=function(t){return this.writeAPCommand(0,587202641).concat(this.writeAPCommand(4,t)).concat(this.readAPCommand(12))},t.prototype.writeMem16Command=function(t,e){return this.writeAPCommand(0,587202641).concat(this.writeAPCommand(4,t)).concat(this.writeAPCommand(12,e))},t.prototype.readMem32Command=function(t){return this.writeAPCommand(0,587202642).concat(this.writeAPCommand(4,t)).concat(this.readAPCommand(12))},t.prototype.writeMem32Command=function(t,e){return this.writeAPCommand(0,587202642).concat(this.writeAPCommand(4,t)).concat(this.writeAPCommand(12,e))},t.prototype.transferSequence=function(t){return n(this,void 0,void 0,(function(){var e,r,n,s;return i(this,(function(i){switch(i.label){case 0:e=(e=[]).concat.apply(e,t),r=[],i.label=1;case 1:return e.length?(n=e.splice(0,this.proxy.operationCount),[4,this.proxy.transfer(n)]):[3,3];case 2:return s=i.sent(),r.push(s),[3,1];case 3:return[2,this.concatTypedArray(r)]}}))}))},t.prototype.connect=function(){return n(this,void 0,void 0,(function(){var t,e=this;return i(this,(function(r){switch(r.label){case 0:return t=-1610612736,[4,this.proxy.connect()];case 1:return r.sent(),[4,this.readDP(0)];case 2:return r.sent(),[4,this.transferSequence([this.writeDPCommand(0,4),this.writeDPCommand(8,0),this.writeDPCommand(4,1342177280)])];case 3:return r.sent(),[4,this.waitDelay((function(){return n(e,void 0,void 0,(function(){return i(this,(function(e){switch(e.label){case 0:return[4,this.readDP(4)];case 1:return[2,(e.sent()&t)===t]}}))}))}))];case 4:return r.sent(),[2]}}))}))},t.prototype.disconnect=function(){return this.proxy.disconnect()},t.prototype.reconnect=function(){return n(this,void 0,void 0,(function(){return i(this,(function(t){switch(t.label){case 0:return[4,this.disconnect()];case 1:return t.sent(),[4,new Promise((function(t){return setTimeout(t,100)}))];case 2:return t.sent(),[4,this.connect()];case 3:return t.sent(),[2]}}))}))},t.prototype.reset=function(){return this.proxy.reset()},t.prototype.readDP=function(t){return n(this,void 0,void 0,(function(){return i(this,(function(e){switch(e.label){case 0:return[4,this.proxy.transfer(this.readDPCommand(t))];case 1:return[2,e.sent()[0]]}}))}))},t.prototype.writeDP=function(t,e){return n(this,void 0,void 0,(function(){return i(this,(function(r){switch(r.label){case 0:return[4,this.proxy.transfer(this.writeDPCommand(t,e))];case 1:return r.sent(),[2]}}))}))},t.prototype.readAP=function(t){return n(this,void 0,void 0,(function(){return i(this,(function(e){switch(e.label){case 0:return[4,this.proxy.transfer(this.readAPCommand(t))];case 1:return[2,e.sent()[0]]}}))}))},t.prototype.writeAP=function(t,e){return n(this,void 0,void 0,(function(){return i(this,(function(r){switch(r.label){case 0:return[4,this.proxy.transfer(this.writeAPCommand(t,e))];case 1:return r.sent(),[2]}}))}))},t.prototype.readMem16=function(t){return n(this,void 0,void 0,(function(){return i(this,(function(e){switch(e.label){case 0:return[4,this.proxy.transfer(this.readMem16Command(t))];case 1:return[2,e.sent()[0]]}}))}))},t.prototype.writeMem16=function(t,e){return n(this,void 0,void 0,(function(){return i(this,(function(r){switch(r.label){case 0:return e<<=(2&t)<<3,[4,this.proxy.transfer(this.writeMem16Command(t,e))];case 1:return r.sent(),[2]}}))}))},t.prototype.readMem32=function(t){return n(this,void 0,void 0,(function(){return i(this,(function(e){switch(e.label){case 0:return[4,this.proxy.transfer(this.readMem32Command(t))];case 1:return[2,e.sent()[0]]}}))}))},t.prototype.writeMem32=function(t,e){return n(this,void 0,void 0,(function(){return i(this,(function(r){switch(r.label){case 0:return[4,this.proxy.transfer(this.writeMem32Command(t,e))];case 1:return r.sent(),[2]}}))}))},t.prototype.readBlock=function(t,e){return n(this,void 0,void 0,(function(){var r,n,s,o;return i(this,(function(i){switch(i.label){case 0:return[4,this.transferSequence([this.writeAPCommand(0,587202642),this.writeAPCommand(4,t)])];case 1:i.sent(),r=[],n=e,i.label=2;case 2:return n>0?(s=Math.min(n,Math.floor(this.proxy.blockSize/4)),[4,this.proxy.transferBlock(1,12,s)]):[3,4];case 3:return o=i.sent(),r.push(o),n-=s,[3,2];case 4:return[2,this.concatTypedArray(r)]}}))}))},t.prototype.writeBlock=function(t,e){return n(this,void 0,void 0,(function(){var r,n;return i(this,(function(i){switch(i.label){case 0:return[4,this.transferSequence([this.writeAPCommand(0,587202642),this.writeAPCommand(4,t)])];case 1:i.sent(),r=0,i.label=2;case 2:return r<e.length?(n=e.slice(r,r+Math.floor(this.proxy.blockSize/4)),[4,this.proxy.transferBlock(1,12,n)]):[3,4];case 3:return i.sent(),r+=Math.floor(this.proxy.blockSize/4),[3,2];case 4:return[2]}}))}))},t}(),L=48682,_=function(t){function e(){return null!==t&&t.apply(this,arguments)||this}return r(e,t),e.prototype.enableDebug=function(){return this.writeMem32(3758157296,-1604386815)},e.prototype.readCoreRegisterCommand=function(t){return this.writeMem32Command(3758157300,t).concat(this.readMem32Command(3758157296)).concat(this.readMem32Command(3758157304))},e.prototype.writeCoreRegisterCommand=function(t,e){return this.writeMem32Command(3758157304,e).concat(this.writeMem32Command(3758157300,65536|t))},e.prototype.getState=function(){return n(this,void 0,void 0,(function(){var t,e,r;return i(this,(function(n){switch(n.label){case 0:return[4,this.readMem32(3758157296)];case 1:return t=n.sent(),e=524288&t?1:262144&t?2:131072&t?3:4,33554432&t?[4,this.readMem32(3758157296)]:[3,3];case 2:return 33554432&(r=n.sent())&&!(16777216&r)?[2,0]:[2,e];case 3:return[2,e];case 4:return[2]}}))}))},e.prototype.isHalted=function(){return n(this,void 0,void 0,(function(){return i(this,(function(t){switch(t.label){case 0:return[4,this.readMem32(3758157296)];case 1:return[2,!!(131072&t.sent())]}}))}))},e.prototype.halt=function(t,e){return void 0===t&&(t=!0),void 0===e&&(e=0),n(this,void 0,void 0,(function(){var r=this;return i(this,(function(n){switch(n.label){case 0:return[4,this.isHalted()];case 1:return n.sent()?[2]:[4,this.writeMem32(3758157296,-1604386813)];case 2:return n.sent(),t?[2,this.waitDelay((function(){return r.isHalted()}),e)]:[2]}}))}))},e.prototype.resume=function(t,e){return void 0===t&&(t=!0),void 0===e&&(e=0),n(this,void 0,void 0,(function(){var r=this;return i(this,(function(s){switch(s.label){case 0:return[4,this.isHalted()];case 1:return s.sent()?[4,this.writeMem32(3758157104,7)]:[2];case 2:return s.sent(),[4,this.enableDebug()];case 3:return s.sent(),t?[2,this.waitDelay((function(){return n(r,void 0,void 0,(function(){return i(this,(function(t){switch(t.label){case 0:return[4,this.isHalted()];case 1:return[2,!t.sent()]}}))}))}),e)]:[2]}}))}))},e.prototype.readCoreRegister=function(t){return n(this,void 0,void 0,(function(){var e;return i(this,(function(r){switch(r.label){case 0:return[4,this.transferSequence([this.writeMem32Command(3758157300,t),this.readMem32Command(3758157296)])];case 1:if(e=r.sent(),!(65536&e[0]))throw new Error("Register not ready");return[2,this.readMem32(3758157304)]}}))}))},e.prototype.readCoreRegisters=function(t){return n(this,void 0,void 0,(function(){var e,r,n,s,o;return i(this,(function(i){switch(i.label){case 0:e=[],r=0,n=t,i.label=1;case 1:return r<n.length?(s=n[r],[4,this.readCoreRegister(s)]):[3,4];case 2:o=i.sent(),e.push(o),i.label=3;case 3:return r++,[3,1];case 4:return[2,e]}}))}))},e.prototype.writeCoreRegister=function(t,e){return n(this,void 0,void 0,(function(){var r;return i(this,(function(n){switch(n.label){case 0:return[4,this.transferSequence([this.writeMem32Command(3758157304,e),this.writeMem32Command(3758157300,65536|t),this.readMem32Command(3758157296)])];case 1:if(r=n.sent(),!(65536&r[0]))throw new Error("Register not ready");return[2]}}))}))},e.prototype.execute=function(t,e,r,s,o){void 0===o&&(o=t+1);for(var u=[],c=5;c<arguments.length;c++)u[c-5]=arguments[c];return n(this,void 0,void 0,(function(){var n,c,a,h=this;return i(this,(function(i){switch(i.label){case 0:for(e[e.length-1]!==L&&((n=new Uint32Array(e.length+1)).set(e),n.set([L],e.length-1),e=n),c=[this.writeCoreRegisterCommand(13,r),this.writeCoreRegisterCommand(15,s),this.writeCoreRegisterCommand(14,o)],a=0;a<Math.min(u.length,12);a++)c.push(this.writeCoreRegisterCommand(a,u[a]));return c.push(this.writeCoreRegisterCommand(16,16777216)),[4,this.halt()];case 1:return i.sent(),[4,this.transferSequence(c)];case 2:return i.sent(),[4,this.writeBlock(t,e)];case 3:return i.sent(),[4,this.resume(!1)];case 4:return i.sent(),[4,this.waitDelay((function(){return h.isHalted()}),1e4)];case 5:return i.sent(),[2]}}))}))},e.prototype.softReset=function(){return n(this,void 0,void 0,(function(){return i(this,(function(t){switch(t.label){case 0:return[4,this.writeMem32(3758157308,0)];case 1:return t.sent(),[2,this.writeMem32(3758157068,100270084)]}}))}))},e.prototype.setTargetResetState=function(t){return void 0===t&&(t=!0),n(this,void 0,void 0,(function(){var e;return i(this,(function(r){switch(r.label){case 0:return[4,this.writeMem32(3758157308,1)];case 1:return r.sent(),!0!==t?[3,3]:[4,this.reset()];case 2:return r.sent(),[3,6];case 3:return[4,this.readMem32(3758157068)];case 4:return e=r.sent(),[4,this.writeMem32(3758157068,100270084|e)];case 5:r.sent(),r.label=6;case 6:return[4,this.writeMem32(3758157308,0)];case 7:return r.sent(),[2]}}))}))},e}(T);(y=t.FPBCtrlMask||(t.FPBCtrlMask={}))[y.ENABLE=1]="ENABLE",y[y.KEY=2]="KEY";var M=function(){function t(t){this.device=t,this.os="browser",this.packetSize=64}return t.prototype.open=function(){return n(this,void 0,void 0,(function(){return i(this,(function(t){return[2]}))}))},t.prototype.close=function(){return n(this,void 0,void 0,(function(){return i(this,(function(t){return this.device.close(),[2]}))}))},t.prototype.read=function(){return n(this,void 0,void 0,(function(){var t,e,r=this;return i(this,(function(n){switch(n.label){case 0:return[4,new Promise((function(t,e){r.device.read((function(r,n){if(r)return e(new Error(r));t(n)}))}))];case 1:return t=n.sent(),e=new Uint8Array(t).buffer,[2,new DataView(e)]}}))}))},t.prototype.write=function(t){return n(this,void 0,void 0,(function(){var e,r;return i(this,(function(n){for(e=function(t){return void 0!==t.buffer}(t)?t.buffer:t,r=Array.prototype.slice.call(new Uint8Array(e));r.length<this.packetSize;)r.push(0);if("win32"===this.os&&r.unshift(0),this.device.write(r)!==r.length)throw new Error("Incorrect bytecount written");return[2]}))}))},t}(),x=function(){function t(t,e,r,n){void 0===e&&(e=255),void 0===r&&(r=1),void 0===n&&(n=!1),this.device=t,this.interfaceClass=e,this.configuration=r,this.alwaysControlTransfer=n,this.packetSize=64}return t.prototype.bufferToDataView=function(t){var e=new Uint8Array(t).buffer;return new DataView(e)},t.prototype.isView=function(t){return void 0!==t.buffer},t.prototype.bufferSourceToBuffer=function(t){var e=this.isView(t)?t.buffer:t;return Buffer.from(e)},t.prototype.extendBuffer=function(t,e){var r=this.isView(t)?t.buffer:t,n=Math.min(r.byteLength,e),i=new Uint8Array(n);return i.set(new Uint8Array(r)),i},t.prototype.open=function(){return n(this,void 0,void 0,(function(){var t,e,r,n,s,o,u=this;return i(this,(function(i){switch(i.label){case 0:return this.device.open(),[4,new Promise((function(t,e){u.device.setConfiguration(u.configuration,(function(r){r?e(new Error(r)):t()}))}))];case 1:if(i.sent(),!(t=this.device.interfaces.filter((function(t){return t.descriptor.bInterfaceClass===u.interfaceClass}))).length)throw new Error("No valid interfaces found.");if((e=t.find((function(t){return t.endpoints.length>0})))||(e=t[0]),this.interfaceNumber=e.interfaceNumber,!this.alwaysControlTransfer){for(r=e.endpoints,this.endpointIn=void 0,this.endpointOut=void 0,n=0,s=r;n<s.length;n++)"in"!==(o=s[n]).direction||this.endpointIn?"out"!==o.direction||this.endpointOut||(this.endpointOut=o):this.endpointIn=o;if(this.endpointIn||this.endpointOut)try{e.claim()}catch(t){this.endpointIn=void 0,this.endpointOut=void 0}}return[2]}}))}))},t.prototype.close=function(){return n(this,void 0,void 0,(function(){return i(this,(function(t){return this.device.close(),[2]}))}))},t.prototype.read=function(){return n(this,void 0,void 0,(function(){var t,e=this;return i(this,(function(r){switch(r.label){case 0:if(void 0===this.interfaceNumber)throw new Error("No device opened");return[4,new Promise((function(t,r){e.endpointIn?e.endpointIn.transfer(e.packetSize,(function(e,n){e?r(e):t(n)})):e.device.controlTransfer(161,1,256,e.interfaceNumber,e.packetSize,(function(e,n){e?r(e):n?t(n):r(new Error("No buffer read"))}))}))];case 1:return t=r.sent(),[2,this.bufferToDataView(t)]}}))}))},t.prototype.write=function(t){return n(this,void 0,void 0,(function(){var e,r,n=this;return i(this,(function(i){switch(i.label){case 0:if(void 0===this.interfaceNumber)throw new Error("No device opened");return e=this.extendBuffer(t,this.packetSize),r=this.bufferSourceToBuffer(e),[4,new Promise((function(t,e){n.endpointOut?n.endpointOut.transfer(r,(function(r){if(r)return e(r);t()})):n.device.controlTransfer(33,9,512,n.interfaceNumber,r,(function(r){if(r)return e(r);t()}))}))];case 1:return i.sent(),[2]}}))}))},t}(),S=function(){function t(t,e,r,n){void 0===e&&(e=255),void 0===r&&(r=1),void 0===n&&(n=!1),this.device=t,this.interfaceClass=e,this.configuration=r,this.alwaysControlTransfer=n,this.packetSize=64}return t.prototype.extendBuffer=function(t,e){var r=void 0!==t.buffer?t.buffer:t,n=Math.min(r.byteLength,e),i=new Uint8Array(n);return i.set(new Uint8Array(r)),i},t.prototype.open=function(){return n(this,void 0,void 0,(function(){var t,e,r,n,s,o,u=this;return i(this,(function(i){switch(i.label){case 0:return[4,this.device.open()];case 1:return i.sent(),[4,this.device.selectConfiguration(this.configuration)];case 2:if(i.sent(),!(t=this.device.configuration.interfaces.filter((function(t){return t.alternates[0].interfaceClass===u.interfaceClass}))).length)throw new Error("No valid interfaces found.");if((e=t.find((function(t){return t.alternates[0].endpoints.length>0})))||(e=t[0]),this.interfaceNumber=e.interfaceNumber,!this.alwaysControlTransfer)for(r=e.alternates[0].endpoints,this.endpointIn=void 0,this.endpointOut=void 0,n=0,s=r;n<s.length;n++)"in"!==(o=s[n]).direction||this.endpointIn?"out"!==o.direction||this.endpointOut||(this.endpointOut=o):this.endpointIn=o;return[2,this.device.claimInterface(this.interfaceNumber)]}}))}))},t.prototype.close=function(){return this.device.close()},t.prototype.read=function(){return n(this,void 0,void 0,(function(){var t;return i(this,(function(e){switch(e.label){case 0:if(void 0===this.interfaceNumber)throw new Error("No device opened");return this.endpointIn?[4,this.device.transferIn(this.endpointIn.endpointNumber,this.packetSize)]:[3,2];case 1:return t=e.sent(),[3,4];case 2:return[4,this.device.controlTransferIn({requestType:"class",recipient:"interface",request:1,value:256,index:this.interfaceNumber},this.packetSize)];case 3:t=e.sent(),e.label=4;case 4:return[2,t.data]}}))}))},t.prototype.write=function(t){return n(this,void 0,void 0,(function(){var e;return i(this,(function(r){switch(r.label){case 0:if(void 0===this.interfaceNumber)throw new Error("No device opened");return e=this.extendBuffer(t,this.packetSize),this.endpointOut?[4,this.device.transferOut(this.endpointOut.endpointNumber,e)]:[3,2];case 1:return r.sent(),[3,4];case 2:return[4,this.device.controlTransferOut({requestType:"class",recipient:"interface",request:9,value:512,index:this.interfaceNumber},e)];case 3:r.sent(),r.label=4;case 4:return[2]}}))}))},t}();t.ADI=T,t.CmsisDAP=g,t.CortexM=_,t.DAPLink=P,t.DEFAULT_CLOCK_FREQUENCY=m,t.HID=M,t.USB=x,t.WebUSB=S,Object.defineProperty(t,"__esModule",{value:!0})}));


}).call(this)}).call(this,require("buffer").Buffer)

},{"buffer":2}],4:[function(require,module,exports){
(function (global){(function (){
(function(a,b){if("function"==typeof define&&define.amd)define([],b);else if("undefined"!=typeof exports)b();else{b(),a.FileSaver={exports:{}}.exports}})(this,function(){"use strict";function b(a,b){return"undefined"==typeof b?b={autoBom:!1}:"object"!=typeof b&&(console.warn("Deprecated: Expected third argument to be a object"),b={autoBom:!b}),b.autoBom&&/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(a.type)?new Blob(["\uFEFF",a],{type:a.type}):a}function c(a,b,c){var d=new XMLHttpRequest;d.open("GET",a),d.responseType="blob",d.onload=function(){g(d.response,b,c)},d.onerror=function(){console.error("could not download file")},d.send()}function d(a){var b=new XMLHttpRequest;b.open("HEAD",a,!1);try{b.send()}catch(a){}return 200<=b.status&&299>=b.status}function e(a){try{a.dispatchEvent(new MouseEvent("click"))}catch(c){var b=document.createEvent("MouseEvents");b.initMouseEvent("click",!0,!0,window,0,0,0,80,20,!1,!1,!1,!1,0,null),a.dispatchEvent(b)}}var f="object"==typeof window&&window.window===window?window:"object"==typeof self&&self.self===self?self:"object"==typeof global&&global.global===global?global:void 0,a=f.navigator&&/Macintosh/.test(navigator.userAgent)&&/AppleWebKit/.test(navigator.userAgent)&&!/Safari/.test(navigator.userAgent),g=f.saveAs||("object"!=typeof window||window!==f?function(){}:"download"in HTMLAnchorElement.prototype&&!a?function(b,g,h){var i=f.URL||f.webkitURL,j=document.createElement("a");g=g||b.name||"download",j.download=g,j.rel="noopener","string"==typeof b?(j.href=b,j.origin===location.origin?e(j):d(j.href)?c(b,g,h):e(j,j.target="_blank")):(j.href=i.createObjectURL(b),setTimeout(function(){i.revokeObjectURL(j.href)},4E4),setTimeout(function(){e(j)},0))}:"msSaveOrOpenBlob"in navigator?function(f,g,h){if(g=g||f.name||"download","string"!=typeof f)navigator.msSaveOrOpenBlob(b(f,h),g);else if(d(f))c(f,g,h);else{var i=document.createElement("a");i.href=f,i.target="_blank",setTimeout(function(){e(i)})}}:function(b,d,e,g){if(g=g||open("","_blank"),g&&(g.document.title=g.document.body.innerText="downloading..."),"string"==typeof b)return c(b,d,e);var h="application/octet-stream"===b.type,i=/constructor/i.test(f.HTMLElement)||f.safari,j=/CriOS\/[\d]+/.test(navigator.userAgent);if((j||h&&i||a)&&"undefined"!=typeof FileReader){var k=new FileReader;k.onloadend=function(){var a=k.result;a=j?a:a.replace(/^data:[^;]*;/,"data:attachment/file;"),g?g.location.href=a:location=a,g=null},k.readAsDataURL(b)}else{var l=f.URL||f.webkitURL,m=l.createObjectURL(b);g?g.location=m:location.href=m,g=null,setTimeout(function(){l.revokeObjectURL(m)},4E4)}});f.saveAs=g.saveAs=g,"undefined"!=typeof module&&(module.exports=g)});


}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],5:[function(require,module,exports){
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],6:[function(require,module,exports){
"use strict";
exports.__esModule = true;
exports.TwoPanelContainer = void 0;
var TwoPanelContainer = /** @class */ (function () {
    function TwoPanelContainer(left_container, separator, right_container) {
        var _this = this;
        this.is_moving = false;
        this.left_container = left_container;
        this.separator = separator;
        this.right_container = right_container;
        this.separator.addEventListener("mousedown", function () { _this.is_moving = true; });
        document.addEventListener("mouseup", function () { _this.is_moving = false; });
        document.addEventListener("mousemove", function (evt) { _this.mouse_move(evt); });
    }
    TwoPanelContainer.prototype.mouse_move = function (evt) {
        if (!this.is_moving) {
            return;
        }
        var newPosX = Math.max(TwoPanelContainer.MIN_SPACE, Math.min(evt.clientX, document.body.clientWidth - TwoPanelContainer.MIN_SPACE));
        this.set_panel_size(newPosX);
    };
    TwoPanelContainer.prototype.set_panel_size = function (left_size) {
        this.separator.style.left = left_size + "px";
        this.left_container.style.width = left_size + "px";
        this.right_container.style.width = (document.body.clientWidth - left_size - this.separator.clientWidth) + "px";
    };
    TwoPanelContainer.MIN_SPACE = 50;
    return TwoPanelContainer;
}());
exports.TwoPanelContainer = TwoPanelContainer;

},{}],7:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.ActionConnection = void 0;
var ActionConnection = /** @class */ (function () {
    function ActionConnection(daplink, button, img_connect, img_disconnect, on_connection_change) {
        var _this = this;
        this.daplink = daplink;
        this.button = button;
        this.img_connect = img_connect;
        this.img_disconnect = img_disconnect;
        this.cb_onConnectionChagne = on_connection_change;
        this.is_connected = false;
        this.button.button.addEventListener("click", function () { return _this.is_connected ? _this.disconnect() : _this.connect(); });
    }
    ActionConnection.prototype.connect = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.daplink.connect()];
                    case 1:
                        if (!(_a.sent())) {
                            return [2 /*return*/];
                        }
                        this.button.icon.src = this.img_connect;
                        this.button.button.title = "Click to disconnect";
                        this.is_connected = true;
                        if (this.cb_onConnectionChagne)
                            this.cb_onConnectionChagne(true);
                        return [2 /*return*/];
                }
            });
        });
    };
    ActionConnection.prototype.disconnect = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.daplink.disconnect()];
                    case 1:
                        _a.sent();
                        this.button.icon.src = this.img_disconnect;
                        this.button.button.title = "Click to connect";
                        this.is_connected = false;
                        if (this.cb_onConnectionChagne)
                            this.cb_onConnectionChagne(false);
                        return [2 /*return*/];
                }
            });
        });
    };
    return ActionConnection;
}());
exports.ActionConnection = ActionConnection;

},{}],8:[function(require,module,exports){
"use strict";
exports.__esModule = true;
exports.ActionLoad = void 0;
var ActionLoad = /** @class */ (function () {
    function ActionLoad(button, onFileReaded) {
        var _this = this;
        this.fileReader = new FileReader();
        var d = document.createElement("div");
        d.style.display = "none";
        d.style.width = "0px";
        d.style.height = "0px";
        d.style.overflow = "hidden";
        this.file_input = document.createElement("input");
        this.file_input.type = "file";
        this.file_input.accept = ".py";
        d.append(this.file_input);
        button.button.addEventListener("click", function () { return _this.file_input.click(); });
        this.file_input.addEventListener("input", function () { return _this.openFile(); });
        this.fileReader.onload = function () { return onFileReaded(_this.fileReader.result); };
        this.fileReader.onerror = function (evt) { return console.error("Failed to read file.", evt); };
    }
    ActionLoad.prototype.openFile = function () {
        this.fileReader.readAsText(this.file_input.files[0], "UTF-8");
    };
    return ActionLoad;
}());
exports.ActionLoad = ActionLoad;

},{}],9:[function(require,module,exports){
"use strict";
exports.__esModule = true;
exports.ActionRun = void 0;
var ActionRun = /** @class */ (function () {
    function ActionRun(daplink, button, getScript) {
        button.button.addEventListener("click", function () { return button.isEnable() ? daplink.runScript(getScript()) : null; });
    }
    return ActionRun;
}());
exports.ActionRun = ActionRun;

},{}],10:[function(require,module,exports){
"use strict";
exports.__esModule = true;
exports.ActionSave = void 0;
var file_saver_1 = require("file-saver");
var ActionSave = /** @class */ (function () {
    function ActionSave(button, getScript) {
        var _this = this;
        this.cb_getScript = getScript;
        button.button.addEventListener("click", function () { return _this.saveFile("main.py"); });
    }
    ActionSave.prototype.saveFile = function (filename) {
        var blob = new Blob([this.cb_getScript()], { type: "text/plain;charset=utf-8" });
        (0, file_saver_1.saveAs)(blob, filename);
    };
    return ActionSave;
}());
exports.ActionSave = ActionSave;

},{"file-saver":4}],11:[function(require,module,exports){
"use strict";
exports.__esModule = true;
exports.Application = void 0;
var button_1 = require("./button");
var action_connection_1 = require("./action_connection");
var daplink_1 = require("./daplink");
var action_run_1 = require("./actions/action_run");
var serialOutput_1 = require("./serialOutput");
var TwoPanelContainer_1 = require("./TwoPanelContainer");
var action_save_1 = require("./actions/action_save");
var action_load_1 = require("./actions/action_load");
var fat_1 = require("./microFAT/fat");
var Application = /** @class */ (function () {
    function Application(monaco_editor) {
        this.top_container = document.getElementById("top_container");
        this.left_container = document.getElementById("left_container");
        this.right_container = document.getElementById("right_container");
        this.spacer_container = document.getElementById("spacer_container");
        this.dapLinkWrapper = new daplink_1.DapLinkWrapper();
        this.topMenu(monaco_editor);
        this.rightPanel();
        new TwoPanelContainer_1.TwoPanelContainer(this.left_container, this.spacer_container, this.right_container).set_panel_size(document.body.clientWidth * 0.66);
        var fat = new fat_1.FatFS("PYBFLASH");
        fat.addFile("TEST", "TXT", "JE SUIS TROP FORT, PUTAIN  !!!");
        fat.generate_hex();
    }
    Application.prototype.topMenu = function (monaco_editor) {
        // Connection
        new action_connection_1.ActionConnection(this.dapLinkWrapper, new button_1.Button(this.top_container, "img/disconnect.png"), "img/connect.png", "img/disconnect.png", function (is_connected) { is_connected ? menu_run.enable() : menu_run.disable(); });
        // Run
        var menu_run = new button_1.Button(this.top_container, "img/play.png");
        menu_run.disable();
        new action_run_1.ActionRun(this.dapLinkWrapper, menu_run, function () { return monaco_editor.getValue(); });
        //Flash
        var menu_flash = new button_1.Button(this.top_container, "img/flash.png");
        new button_1.ButtonSpacer(this.top_container);
        // Load
        new action_load_1.ActionLoad(new button_1.Button(this.top_container, "img/upload.png"), function (data) { return monaco_editor.setValue(data); });
        // Save
        new action_save_1.ActionSave(new button_1.Button(this.top_container, "img/download.png"), function () { return monaco_editor.getValue(); });
        new button_1.ButtonSpacer(this.top_container);
        // Settings
        var menu_settings = new button_1.Button(this.top_container, "img/settings.png");
    };
    Application.prototype.rightPanel = function () {
        var serialOutput = new serialOutput_1.SerialOutput(this.right_container);
        this.dapLinkWrapper.onReceivedData(function (data) { return serialOutput.write(data); });
    };
    return Application;
}());
exports.Application = Application;
// @ts-ignore
window["Application"] = Application;

},{"./TwoPanelContainer":6,"./action_connection":7,"./actions/action_load":8,"./actions/action_run":9,"./actions/action_save":10,"./button":12,"./daplink":13,"./microFAT/fat":14,"./serialOutput":19}],12:[function(require,module,exports){
"use strict";
exports.__esModule = true;
exports.ButtonSpacer = exports.Button = void 0;
var Button = /** @class */ (function () {
    function Button(parent, icon) {
        this.button = document.createElement("div");
        this.icon = document.createElement("img");
        this.button.classList.add("menu_button");
        this.is_enable = true;
        this.icon.src = icon;
        this.button.append(this.icon);
        parent.append(this.button);
    }
    Button.prototype.enable = function () {
        this.button.classList.remove("disable");
    };
    Button.prototype.disable = function () {
        this.button.classList.add("disable");
    };
    Button.prototype.isEnable = function () {
        return this.is_enable;
    };
    return Button;
}());
exports.Button = Button;
var ButtonSpacer = /** @class */ (function () {
    function ButtonSpacer(parent) {
        var button = document.createElement("div");
        button.classList.add("menu_button_space");
        parent.append(button);
    }
    return ButtonSpacer;
}());
exports.ButtonSpacer = ButtonSpacer;

},{}],13:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.DapLinkWrapper = void 0;
var DAPjs = require("dapjs");
var DapLinkWrapper = /** @class */ (function () {
    function DapLinkWrapper() {
        this.transport = undefined;
        this.target = undefined;
        this.cb_onReceiveDate = undefined;
    }
    DapLinkWrapper.prototype.onReceivedData = function (cb) {
        this.cb_onReceiveDate = cb;
    };
    DapLinkWrapper.prototype.connect = function () {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!(this.transport == undefined)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.createTarget()];
                    case 1:
                        if (!(_b.sent())) {
                            return [2 /*return*/, false];
                        }
                        _b.label = 2;
                    case 2:
                        (_a = this.target) === null || _a === void 0 ? void 0 : _a.startSerialRead();
                        return [2 /*return*/, true];
                }
            });
        });
    };
    DapLinkWrapper.prototype.disconnect = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (this.target == undefined) {
                    return [2 /*return*/];
                }
                this.target.stopSerialRead();
                this.target.disconnect();
                this.target = undefined;
                this.transport = undefined;
                return [2 /*return*/];
            });
        });
    };
    DapLinkWrapper.prototype.runScript = function (script) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function () {
            var lines, _i, lines_1, line;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0: return [4 /*yield*/, this.connect()];
                    case 1:
                        if (!(_d.sent())) {
                            return [2 /*return*/];
                        }
                        lines = script.split("\n");
                        lines.push("");
                        lines.push("");
                        return [4 /*yield*/, ((_a = this.target) === null || _a === void 0 ? void 0 : _a.serialWrite(String.fromCharCode(5)))];
                    case 2:
                        _d.sent(); // [Ctrl+E] Enable paste mode (REPL Python)
                        _i = 0, lines_1 = lines;
                        _d.label = 3;
                    case 3:
                        if (!(_i < lines_1.length)) return [3 /*break*/, 6];
                        line = lines_1[_i];
                        return [4 /*yield*/, ((_b = this.target) === null || _b === void 0 ? void 0 : _b.serialWrite(line + "\n"))];
                    case 4:
                        _d.sent();
                        _d.label = 5;
                    case 5:
                        _i++;
                        return [3 /*break*/, 3];
                    case 6: return [4 /*yield*/, ((_c = this.target) === null || _c === void 0 ? void 0 : _c.serialWrite(String.fromCharCode(4)))];
                    case 7:
                        _d.sent(); // [Ctrl+D] Disable paste mode (REPL Python)
                        return [2 /*return*/];
                }
            });
        });
    };
    DapLinkWrapper.prototype.createTarget = function () {
        return __awaiter(this, void 0, void 0, function () {
            var device, e_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, navigator.usb.requestDevice({
                                filters: [{ vendorId: 0x0D28 }]
                            })];
                    case 1:
                        device = _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        e_1 = _a.sent();
                        console.warn(e_1);
                        return [2 /*return*/, false];
                    case 3:
                        this.transport = new DAPjs.WebUSB(device);
                        this.target = new DAPjs.DAPLink(this.transport);
                        this.target.on(DAPjs.DAPLink.EVENT_SERIAL_DATA, function (data) {
                            if (_this.cb_onReceiveDate != undefined) {
                                _this.cb_onReceiveDate(data);
                            }
                        });
                        return [4 /*yield*/, this.target.connect()];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, this.target.setSerialBaudrate(115200)];
                    case 5:
                        _a.sent();
                        return [2 /*return*/, true];
                }
            });
        });
    };
    return DapLinkWrapper;
}());
exports.DapLinkWrapper = DapLinkWrapper;

},{"dapjs":3}],14:[function(require,module,exports){
"use strict";
exports.__esModule = true;
exports.FatFS = void 0;
var fat_BPB_1 = require("./fat_BPB");
var fat_rootDir_1 = require("./fat_rootDir");
var fat_table_1 = require("./fat_table");
var FatFS = /** @class */ (function () {
    function FatFS(volume_name) {
        this.BPB = new fat_BPB_1.FatBPB();
        this.construct_pbp();
        this.table = new fat_table_1.FatTable(this.BPB);
        this.root = new fat_rootDir_1.FatRootDirectory(this.BPB, this.table, volume_name);
    }
    FatFS.prototype.construct_pbp = function () {
        this.BPB.jump_inst = 0x90FEEB;
        this.BPB.oem_name = "MSDOS5.0";
        this.BPB.sector_size = 512;
        this.BPB.cluster_size = 1;
        this.BPB.reserved_sectors = 1;
        this.BPB.fats_number = 1;
        this.BPB.root_dir_size = 512;
        this.BPB.total_sectors = 1024;
        this.BPB.disk_type = 0xF8;
        this.BPB.fat_size = 4;
        this.BPB.sectors_per_track = 63;
        this.BPB.heads_number = 255;
        this.BPB.hidden_sectors = 256;
        this.BPB.total_32bits_sectors = 0;
        this.BPB.disk_identifier = 0x80;
        this.BPB.signature = 0x29;
        this.BPB.disk_serial = 0x46210000;
        this.BPB.disk_name = "NO NAME";
        this.BPB.file_system_type = "FAT";
        this.BPB.physical_drive_number = 0;
        this.BPB.boot_sector_signature = 0xAA55;
    };
    FatFS.prototype.addFile = function (filename, extension, content) {
        var enc = new TextEncoder();
        this.root.addFile(filename, extension, fat_rootDir_1.FileAttribute.ARCHIVE, enc.encode(content));
    };
    FatFS.prototype.generate_hex = function () {
        return this.BPB.generateBPB()
            .concat(this.table.generateTable())
            .concat(this.root.generateRootDirectory());
    };
    return FatFS;
}());
exports.FatFS = FatFS;

},{"./fat_BPB":15,"./fat_rootDir":17,"./fat_table":18}],15:[function(require,module,exports){
"use strict";
exports.__esModule = true;
exports.FatBPB = void 0;
var fat_common_1 = require("./fat_common");
var FatBPB = /** @class */ (function () {
    function FatBPB() {
        this.jump_inst = 0;
        this.oem_name = "";
        this.sector_size = 0;
        this.cluster_size = 0;
        this.reserved_sectors = 0;
        this.fats_number = 0;
        this.root_dir_size = 0;
        this.total_sectors = 0;
        this.disk_type = 0;
        this.fat_size = 0;
        this.sectors_per_track = 0;
        this.heads_number = 0;
        this.hidden_sectors = 0;
        this.total_32bits_sectors = 0;
        this.disk_identifier = 0;
        this.signature = 0;
        this.disk_serial = 0;
        this.disk_name = "";
        this.file_system_type = "";
        this.physical_drive_number = 0;
        this.boot_sector_signature = 0;
    }
    FatBPB.prototype.generateBPB = function () {
        return fat_common_1.FatUtils.convertToHex(this.jump_inst, 3)
            .concat(fat_common_1.FatUtils.convertString(this.oem_name, 8))
            .concat(fat_common_1.FatUtils.convertToHex(this.sector_size, 2))
            .concat(fat_common_1.FatUtils.convertToHex(this.cluster_size, 1))
            .concat(fat_common_1.FatUtils.convertToHex(this.reserved_sectors, 2))
            .concat(fat_common_1.FatUtils.convertToHex(this.fats_number, 1))
            .concat(fat_common_1.FatUtils.convertToHex(this.root_dir_size, 2))
            .concat(fat_common_1.FatUtils.convertToHex(this.total_sectors, 2))
            .concat(fat_common_1.FatUtils.convertToHex(this.disk_type, 1))
            .concat(fat_common_1.FatUtils.convertToHex(this.fat_size, 2))
            .concat(fat_common_1.FatUtils.convertToHex(this.sectors_per_track, 2))
            .concat(fat_common_1.FatUtils.convertToHex(this.heads_number, 2))
            .concat(fat_common_1.FatUtils.convertToHex(this.hidden_sectors, 4))
            .concat(fat_common_1.FatUtils.convertToHex(this.total_32bits_sectors, 4))
            .concat(fat_common_1.FatUtils.convertToHex(this.disk_identifier, 1))
            .concat([0x01])
            .concat(fat_common_1.FatUtils.convertToHex(this.signature, 1))
            .concat(fat_common_1.FatUtils.convertToHex(this.disk_serial, 4))
            .concat(fat_common_1.FatUtils.convertString(this.disk_name, 11))
            .concat(fat_common_1.FatUtils.convertString(this.file_system_type, 8))
            .concat(fat_common_1.FatUtils.convertToHex(0, 447))
            .concat(fat_common_1.FatUtils.convertToHex(this.physical_drive_number, 1))
            .concat(fat_common_1.FatUtils.convertToHex(this.boot_sector_signature, 2));
    };
    return FatBPB;
}());
exports.FatBPB = FatBPB;

},{"./fat_common":16}],16:[function(require,module,exports){
"use strict";
exports.__esModule = true;
exports.FatUtils = void 0;
var FatUtils = /** @class */ (function () {
    function FatUtils() {
    }
    FatUtils.convertString = function (str, field_size) {
        var res = [];
        for (var i = 0; i < field_size; ++i) {
            res[i] = (i >= str.length) ? 0x20 : str.charCodeAt(i);
        }
        return res;
    };
    FatUtils.convertToHex = function (num, field_size) {
        var res = [];
        for (var i = 0; i < field_size; ++i) {
            var shift = 8 * i;
            res[i] = (num >> shift) & 0x00FF;
        }
        return res;
    };
    return FatUtils;
}());
exports.FatUtils = FatUtils;

},{}],17:[function(require,module,exports){
"use strict";
exports.__esModule = true;
exports.FatRootDirectory = exports.FileAttribute = void 0;
var fat_common_1 = require("./fat_common");
var fat_table_1 = require("./fat_table");
var Sector = /** @class */ (function () {
    function Sector(sector_size) {
        this.data = new Uint8Array(sector_size);
        this.erase();
    }
    Sector.prototype.erase = function () {
        this.data.fill(0xFF);
    };
    Sector.prototype.set = function (source) {
        for (var i = 0; i < this.data.length; i++) {
            this.data[i] = (i >= source.length) ? 0x00 : source[i];
        }
    };
    return Sector;
}());
;
var FatRootDirectory_File = /** @class */ (function () {
    function FatRootDirectory_File() {
        this.filename = "";
        this.extension = "";
        this.attribute = 0x00;
        this.create_ms = 0;
        this.create_time = 0;
        this.create_date = 0;
        this.last_access_date = 0;
        this.modification_time = 0;
        this.modification_date = 0;
        this.cluster_number = 0;
        this.file_size = 0;
    }
    FatRootDirectory_File.prototype.generate_file = function () {
        return fat_common_1.FatUtils.convertString(this.filename, 8)
            .concat(fat_common_1.FatUtils.convertString(this.extension, 3))
            .concat(fat_common_1.FatUtils.convertToHex(this.attribute, 1))
            .concat([0x00])
            .concat(fat_common_1.FatUtils.convertToHex(Math.floor(this.create_ms / 10), 1))
            .concat(fat_common_1.FatUtils.convertToHex(this.create_time, 2))
            .concat(fat_common_1.FatUtils.convertToHex(this.create_date, 2))
            .concat(fat_common_1.FatUtils.convertToHex(this.last_access_date, 2))
            .concat([0x00, 0x00])
            .concat(fat_common_1.FatUtils.convertToHex(this.modification_time, 2))
            .concat(fat_common_1.FatUtils.convertToHex(this.modification_date, 2))
            .concat(fat_common_1.FatUtils.convertToHex(this.cluster_number, 2))
            .concat(fat_common_1.FatUtils.convertToHex(this.file_size, 4));
    };
    return FatRootDirectory_File;
}());
;
var FileAttribute;
(function (FileAttribute) {
    FileAttribute[FileAttribute["READONLY"] = 1] = "READONLY";
    FileAttribute[FileAttribute["HIDDEN"] = 2] = "HIDDEN";
    FileAttribute[FileAttribute["SYSTEM"] = 3] = "SYSTEM";
    FileAttribute[FileAttribute["VOLUME_NAME"] = 8] = "VOLUME_NAME";
    FileAttribute[FileAttribute["SUBDIRECTORY"] = 16] = "SUBDIRECTORY";
    FileAttribute[FileAttribute["ARCHIVE"] = 32] = "ARCHIVE";
    FileAttribute[FileAttribute["DEVICE"] = 64] = "DEVICE";
    FileAttribute[FileAttribute["RESERVED"] = 128] = "RESERVED";
})(FileAttribute = exports.FileAttribute || (exports.FileAttribute = {}));
;
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// !!!   THIS CLASS ONLY WORKS FOR 1 SECTOR PER CLUSTER  !!!
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
var FatRootDirectory = /** @class */ (function () {
    function FatRootDirectory(bpb, fat_table, volume_name) {
        this.sector_size = bpb.sector_size;
        this.fat_table = fat_table;
        this.files = new Array(bpb.root_dir_size);
        this.sectors = new Array(Math.floor(((bpb.total_sectors * bpb.sector_size) - 512 - fat_table.getSize() - (bpb.root_dir_size * 32)) / bpb.sector_size)); // total data sector size (octets) = Total_size - boot_sector - FAT_Table - RootDirectory
        for (var i = 0; i < this.files.length; ++i) {
            this.files[i] = null;
        }
        for (var i = 0; i < this.sectors.length; ++i) {
            this.sectors[i] = new Sector(this.sector_size);
        }
        var file = new FatRootDirectory_File();
        file.filename = volume_name;
        file.attribute = FileAttribute.VOLUME_NAME;
        this.files[0] = file;
    }
    FatRootDirectory.prototype.addFile = function (filename, extension, attribute, content) {
        var file = new FatRootDirectory_File();
        var date = new Date();
        var nb_cluster = Math.ceil(content.length / this.sector_size);
        file.filename = filename;
        file.extension = extension;
        file.attribute = attribute;
        file.create_ms = date.getMilliseconds();
        file.create_time = this.timeField(date);
        file.create_date = this.dateField(date);
        file.last_access_date = this.dateField(date);
        file.modification_time = this.timeField(date);
        file.modification_date = this.dateField(date);
        file.cluster_number = this.fat_table.find_free_cluster();
        file.file_size = content.length;
        var next_cluster = file.cluster_number;
        var cluster = 0;
        for (var i = 0; i < nb_cluster; i++) {
            cluster = next_cluster;
            this.sectors[cluster - 2].set(content.slice(i * this.sector_size, i * this.sector_size + this.sector_size));
            next_cluster = this.fat_table.find_free_cluster();
            this.fat_table.set_next_cluster(cluster, next_cluster);
        }
        this.fat_table.set_next_cluster(cluster, fat_table_1.FatTable.END_OF_FILE);
        this.files[this.getAvailableFileIndex()] = file;
    };
    FatRootDirectory.prototype.generateRootDirectory = function () {
        var result = [];
        this.files.forEach(function (file) {
            if (file == null) {
                result = result.concat(FatRootDirectory.FILE_NOT_SET);
            }
            else {
                result = result.concat(file.generate_file());
            }
        });
        this.sectors.forEach(function (sector) {
            result = result.concat(Array.from(sector.data));
        });
        return result;
    };
    FatRootDirectory.prototype.getAvailableFileIndex = function () {
        for (var i = 0; i < this.files.length; ++i) {
            if (this.files[i] == null) {
                return i;
            }
        }
        return -1;
    };
    FatRootDirectory.prototype.dateField = function (date) {
        var res = 0x0000;
        res = (date.getFullYear() & 0x7F) << 9;
        res += (date.getMonth() & 0x0F) << 5;
        res += date.getDay() & 0x1F;
        return res;
    };
    FatRootDirectory.prototype.timeField = function (date) {
        var res = 0x0000;
        res = (date.getHours() & 0x1F) << 11;
        res += (date.getMinutes() & 0x3F) << 5;
        res += Math.floor(date.getSeconds() / 2) & 0x1F;
        return res;
    };
    FatRootDirectory.FILE_NOT_SET = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    return FatRootDirectory;
}());
exports.FatRootDirectory = FatRootDirectory;

},{"./fat_common":16,"./fat_table":18}],18:[function(require,module,exports){
"use strict";
exports.__esModule = true;
exports.FatTable = void 0;
var FatTable = /** @class */ (function () {
    function FatTable(bpb) {
        this.size = Math.floor((bpb.fat_size * bpb.sector_size) / 1.5); // / 1.5 because we are using FAT12
        this.table = new Uint16Array(this.size);
        // Magick number
        this.table[0] = bpb.disk_type | 0xF00;
        // Reserved cluster
        this.table[1] = 0xFFF;
        for (var i = 2; i < this.table.length; ++i) {
            this.table[i] = 0x000; //Set cluster as available
        }
    }
    FatTable.prototype.set_next_cluster = function (cluster, next) {
        if (cluster >= this.table.length) {
            return;
        }
        this.table[cluster] = (next >= this.table.length && next != FatTable.END_OF_FILE) ? FatTable.BAD_CLUSTER : (next & 0xFFF);
    };
    FatTable.prototype.find_free_cluster = function () {
        for (var i = 2; i < this.table.length; ++i) {
            if (this.table[i] == 0x000) {
                return i;
            }
        }
        return -1;
    };
    FatTable.prototype.generateTable = function () {
        /*
            two 12 bits numbers : 0xABC and 0xXYZ
            concatenat in 24 bits number: 0xABCXYZ
            should be stored like this : BC ZA XY
        */
        var result = [];
        for (var i = 0; i < this.table.length; i += 2) {
            var tmp = 0;
            tmp = (this.table[i] & 0x0FFF) << 12;
            tmp |= this.table[i + 1] & 0x0FFF;
            result.push((tmp & 0x0FF000) >> 12); // BC
            result.push(((tmp & 0xF00000) >> 20) | ((tmp & 0x00000F) << 4)); // ZA = (A >> 40) + (Z << 8)
            result.push((tmp & 0x000FF0) >> 4); // XY
        }
        result.pop(); // The last element is incomplet, so we removing it
        return result;
    };
    FatTable.prototype.getSize = function () {
        return this.size;
    };
    FatTable.END_OF_FILE = 0xFFF;
    FatTable.BAD_CLUSTER = 0xFF7;
    return FatTable;
}());
exports.FatTable = FatTable;

},{}],19:[function(require,module,exports){
"use strict";
exports.__esModule = true;
exports.SerialOutput = void 0;
var SerialOutput = /** @class */ (function () {
    function SerialOutput(parent) {
        this.output = document.createElement("div");
        this.output.classList.add("serial_output");
        parent.append(this.output);
    }
    SerialOutput.prototype.write = function (str) {
        //this.output.innerText += `[${this.generate_time_prefix()}] ${str}`;
        this.output.innerText += str;
        this.output.scrollTop = this.output.scrollHeight;
    };
    SerialOutput.prototype.clear = function () {
        this.output.innerText = "";
    };
    return SerialOutput;
}());
exports.SerialOutput = SerialOutput;

},{}]},{},[11])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYmFzZTY0LWpzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2J1ZmZlci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9kYXBqcy9kaXN0L2RhcC51bWQuanMiLCJub2RlX21vZHVsZXMvZmlsZS1zYXZlci9kaXN0L0ZpbGVTYXZlci5taW4uanMiLCJub2RlX21vZHVsZXMvaWVlZTc1NC9pbmRleC5qcyIsInNyYy9Ud29QYW5lbENvbnRhaW5lci50cyIsInNyYy9hY3Rpb25fY29ubmVjdGlvbi50cyIsInNyYy9hY3Rpb25zL2FjdGlvbl9sb2FkLnRzIiwic3JjL2FjdGlvbnMvYWN0aW9uX3J1bi50cyIsInNyYy9hY3Rpb25zL2FjdGlvbl9zYXZlLnRzIiwic3JjL2FwcC50cyIsInNyYy9idXR0b24udHMiLCJzcmMvZGFwbGluay50cyIsInNyYy9taWNyb0ZBVC9mYXQudHMiLCJzcmMvbWljcm9GQVQvZmF0X0JQQi50cyIsInNyYy9taWNyb0ZBVC9mYXRfY29tbW9uLnRzIiwic3JjL21pY3JvRkFUL2ZhdF9yb290RGlyLnRzIiwic3JjL21pY3JvRkFUL2ZhdF90YWJsZS50cyIsInNyYy9zZXJpYWxPdXRwdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDdEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDanZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2hCQTtBQUNBO0FBQ0E7Ozs7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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QUksQ0FBQyxNQUFNLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM1QyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUM7UUFFM0MsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDL0IsQ0FBQztJQUVELDRCQUFLLEdBQUwsVUFBTSxHQUFXO1FBQ2IscUVBQXFFO1FBQ3JFLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxJQUFJLEdBQUcsQ0FBQztRQUM3QixJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQztJQUNyRCxDQUFDO0lBRUQsNEJBQUssR0FBTDtRQUNJLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQztJQUMvQixDQUFDO0lBWUwsbUJBQUM7QUFBRCxDQS9CQSxBQStCQyxJQUFBO0FBL0JZLG9DQUFZIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiJ3VzZSBzdHJpY3QnXG5cbmV4cG9ydHMuYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGhcbmV4cG9ydHMudG9CeXRlQXJyYXkgPSB0b0J5dGVBcnJheVxuZXhwb3J0cy5mcm9tQnl0ZUFycmF5ID0gZnJvbUJ5dGVBcnJheVxuXG52YXIgbG9va3VwID0gW11cbnZhciByZXZMb29rdXAgPSBbXVxudmFyIEFyciA9IHR5cGVvZiBVaW50OEFycmF5ICE9PSAndW5kZWZpbmVkJyA/IFVpbnQ4QXJyYXkgOiBBcnJheVxuXG52YXIgY29kZSA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvJ1xuZm9yICh2YXIgaSA9IDAsIGxlbiA9IGNvZGUubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgbG9va3VwW2ldID0gY29kZVtpXVxuICByZXZMb29rdXBbY29kZS5jaGFyQ29kZUF0KGkpXSA9IGlcbn1cblxuLy8gU3VwcG9ydCBkZWNvZGluZyBVUkwtc2FmZSBiYXNlNjQgc3RyaW5ncywgYXMgTm9kZS5qcyBkb2VzLlxuLy8gU2VlOiBodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9CYXNlNjQjVVJMX2FwcGxpY2F0aW9uc1xucmV2TG9va3VwWyctJy5jaGFyQ29kZUF0KDApXSA9IDYyXG5yZXZMb29rdXBbJ18nLmNoYXJDb2RlQXQoMCldID0gNjNcblxuZnVuY3Rpb24gZ2V0TGVucyAoYjY0KSB7XG4gIHZhciBsZW4gPSBiNjQubGVuZ3RoXG5cbiAgaWYgKGxlbiAlIDQgPiAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHN0cmluZy4gTGVuZ3RoIG11c3QgYmUgYSBtdWx0aXBsZSBvZiA0JylcbiAgfVxuXG4gIC8vIFRyaW0gb2ZmIGV4dHJhIGJ5dGVzIGFmdGVyIHBsYWNlaG9sZGVyIGJ5dGVzIGFyZSBmb3VuZFxuICAvLyBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9iZWF0Z2FtbWl0L2Jhc2U2NC1qcy9pc3N1ZXMvNDJcbiAgdmFyIHZhbGlkTGVuID0gYjY0LmluZGV4T2YoJz0nKVxuICBpZiAodmFsaWRMZW4gPT09IC0xKSB2YWxpZExlbiA9IGxlblxuXG4gIHZhciBwbGFjZUhvbGRlcnNMZW4gPSB2YWxpZExlbiA9PT0gbGVuXG4gICAgPyAwXG4gICAgOiA0IC0gKHZhbGlkTGVuICUgNClcblxuICByZXR1cm4gW3ZhbGlkTGVuLCBwbGFjZUhvbGRlcnNMZW5dXG59XG5cbi8vIGJhc2U2NCBpcyA0LzMgKyB1cCB0byB0d28gY2hhcmFjdGVycyBvZiB0aGUgb3JpZ2luYWwgZGF0YVxuZnVuY3Rpb24gYnl0ZUxlbmd0aCAoYjY0KSB7XG4gIHZhciBsZW5zID0gZ2V0TGVucyhiNjQpXG4gIHZhciB2YWxpZExlbiA9IGxlbnNbMF1cbiAgdmFyIHBsYWNlSG9sZGVyc0xlbiA9IGxlbnNbMV1cbiAgcmV0dXJuICgodmFsaWRMZW4gKyBwbGFjZUhvbGRlcnNMZW4pICogMyAvIDQpIC0gcGxhY2VIb2xkZXJzTGVuXG59XG5cbmZ1bmN0aW9uIF9ieXRlTGVuZ3RoIChiNjQsIHZhbGlkTGVuLCBwbGFjZUhvbGRlcnNMZW4pIHtcbiAgcmV0dXJuICgodmFsaWRMZW4gKyBwbGFjZUhvbGRlcnNMZW4pICogMyAvIDQpIC0gcGxhY2VIb2xkZXJzTGVuXG59XG5cbmZ1bmN0aW9uIHRvQnl0ZUFycmF5IChiNjQpIHtcbiAgdmFyIHRtcFxuICB2YXIgbGVucyA9IGdldExlbnMoYjY0KVxuICB2YXIgdmFsaWRMZW4gPSBsZW5zWzBdXG4gIHZhciBwbGFjZUhvbGRlcnNMZW4gPSBsZW5zWzFdXG5cbiAgdmFyIGFyciA9IG5ldyBBcnIoX2J5dGVMZW5ndGgoYjY0LCB2YWxpZExlbiwgcGxhY2VIb2xkZXJzTGVuKSlcblxuICB2YXIgY3VyQnl0ZSA9IDBcblxuICAvLyBpZiB0aGVyZSBhcmUgcGxhY2Vob2xkZXJzLCBvbmx5IGdldCB1cCB0byB0aGUgbGFzdCBjb21wbGV0ZSA0IGNoYXJzXG4gIHZhciBsZW4gPSBwbGFjZUhvbGRlcnNMZW4gPiAwXG4gICAgPyB2YWxpZExlbiAtIDRcbiAgICA6IHZhbGlkTGVuXG5cbiAgdmFyIGlcbiAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSArPSA0KSB7XG4gICAgdG1wID1cbiAgICAgIChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSldIDw8IDE4KSB8XG4gICAgICAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAxKV0gPDwgMTIpIHxcbiAgICAgIChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDIpXSA8PCA2KSB8XG4gICAgICByZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDMpXVxuICAgIGFycltjdXJCeXRlKytdID0gKHRtcCA+PiAxNikgJiAweEZGXG4gICAgYXJyW2N1ckJ5dGUrK10gPSAodG1wID4+IDgpICYgMHhGRlxuICAgIGFycltjdXJCeXRlKytdID0gdG1wICYgMHhGRlxuICB9XG5cbiAgaWYgKHBsYWNlSG9sZGVyc0xlbiA9PT0gMikge1xuICAgIHRtcCA9XG4gICAgICAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkpXSA8PCAyKSB8XG4gICAgICAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAxKV0gPj4gNClcbiAgICBhcnJbY3VyQnl0ZSsrXSA9IHRtcCAmIDB4RkZcbiAgfVxuXG4gIGlmIChwbGFjZUhvbGRlcnNMZW4gPT09IDEpIHtcbiAgICB0bXAgPVxuICAgICAgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpKV0gPDwgMTApIHxcbiAgICAgIChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDEpXSA8PCA0KSB8XG4gICAgICAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAyKV0gPj4gMilcbiAgICBhcnJbY3VyQnl0ZSsrXSA9ICh0bXAgPj4gOCkgJiAweEZGXG4gICAgYXJyW2N1ckJ5dGUrK10gPSB0bXAgJiAweEZGXG4gIH1cblxuICByZXR1cm4gYXJyXG59XG5cbmZ1bmN0aW9uIHRyaXBsZXRUb0Jhc2U2NCAobnVtKSB7XG4gIHJldHVybiBsb29rdXBbbnVtID4+IDE4ICYgMHgzRl0gK1xuICAgIGxvb2t1cFtudW0gPj4gMTIgJiAweDNGXSArXG4gICAgbG9va3VwW251bSA+PiA2ICYgMHgzRl0gK1xuICAgIGxvb2t1cFtudW0gJiAweDNGXVxufVxuXG5mdW5jdGlvbiBlbmNvZGVDaHVuayAodWludDgsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHRtcFxuICB2YXIgb3V0cHV0ID0gW11cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpICs9IDMpIHtcbiAgICB0bXAgPVxuICAgICAgKCh1aW50OFtpXSA8PCAxNikgJiAweEZGMDAwMCkgK1xuICAgICAgKCh1aW50OFtpICsgMV0gPDwgOCkgJiAweEZGMDApICtcbiAgICAgICh1aW50OFtpICsgMl0gJiAweEZGKVxuICAgIG91dHB1dC5wdXNoKHRyaXBsZXRUb0Jhc2U2NCh0bXApKVxuICB9XG4gIHJldHVybiBvdXRwdXQuam9pbignJylcbn1cblxuZnVuY3Rpb24gZnJvbUJ5dGVBcnJheSAodWludDgpIHtcbiAgdmFyIHRtcFxuICB2YXIgbGVuID0gdWludDgubGVuZ3RoXG4gIHZhciBleHRyYUJ5dGVzID0gbGVuICUgMyAvLyBpZiB3ZSBoYXZlIDEgYnl0ZSBsZWZ0LCBwYWQgMiBieXRlc1xuICB2YXIgcGFydHMgPSBbXVxuICB2YXIgbWF4Q2h1bmtMZW5ndGggPSAxNjM4MyAvLyBtdXN0IGJlIG11bHRpcGxlIG9mIDNcblxuICAvLyBnbyB0aHJvdWdoIHRoZSBhcnJheSBldmVyeSB0aHJlZSBieXRlcywgd2UnbGwgZGVhbCB3aXRoIHRyYWlsaW5nIHN0dWZmIGxhdGVyXG4gIGZvciAodmFyIGkgPSAwLCBsZW4yID0gbGVuIC0gZXh0cmFCeXRlczsgaSA8IGxlbjI7IGkgKz0gbWF4Q2h1bmtMZW5ndGgpIHtcbiAgICBwYXJ0cy5wdXNoKGVuY29kZUNodW5rKHVpbnQ4LCBpLCAoaSArIG1heENodW5rTGVuZ3RoKSA+IGxlbjIgPyBsZW4yIDogKGkgKyBtYXhDaHVua0xlbmd0aCkpKVxuICB9XG5cbiAgLy8gcGFkIHRoZSBlbmQgd2l0aCB6ZXJvcywgYnV0IG1ha2Ugc3VyZSB0byBub3QgZm9yZ2V0IHRoZSBleHRyYSBieXRlc1xuICBpZiAoZXh0cmFCeXRlcyA9PT0gMSkge1xuICAgIHRtcCA9IHVpbnQ4W2xlbiAtIDFdXG4gICAgcGFydHMucHVzaChcbiAgICAgIGxvb2t1cFt0bXAgPj4gMl0gK1xuICAgICAgbG9va3VwWyh0bXAgPDwgNCkgJiAweDNGXSArXG4gICAgICAnPT0nXG4gICAgKVxuICB9IGVsc2UgaWYgKGV4dHJhQnl0ZXMgPT09IDIpIHtcbiAgICB0bXAgPSAodWludDhbbGVuIC0gMl0gPDwgOCkgKyB1aW50OFtsZW4gLSAxXVxuICAgIHBhcnRzLnB1c2goXG4gICAgICBsb29rdXBbdG1wID4+IDEwXSArXG4gICAgICBsb29rdXBbKHRtcCA+PiA0KSAmIDB4M0ZdICtcbiAgICAgIGxvb2t1cFsodG1wIDw8IDIpICYgMHgzRl0gK1xuICAgICAgJz0nXG4gICAgKVxuICB9XG5cbiAgcmV0dXJuIHBhcnRzLmpvaW4oJycpXG59XG4iLCIvKiFcbiAqIFRoZSBidWZmZXIgbW9kdWxlIGZyb20gbm9kZS5qcywgZm9yIHRoZSBicm93c2VyLlxuICpcbiAqIEBhdXRob3IgICBGZXJvc3MgQWJvdWtoYWRpamVoIDxodHRwczovL2Zlcm9zcy5vcmc+XG4gKiBAbGljZW5zZSAgTUlUXG4gKi9cbi8qIGVzbGludC1kaXNhYmxlIG5vLXByb3RvICovXG5cbid1c2Ugc3RyaWN0J1xuXG52YXIgYmFzZTY0ID0gcmVxdWlyZSgnYmFzZTY0LWpzJylcbnZhciBpZWVlNzU0ID0gcmVxdWlyZSgnaWVlZTc1NCcpXG5cbmV4cG9ydHMuQnVmZmVyID0gQnVmZmVyXG5leHBvcnRzLlNsb3dCdWZmZXIgPSBTbG93QnVmZmVyXG5leHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTID0gNTBcblxudmFyIEtfTUFYX0xFTkdUSCA9IDB4N2ZmZmZmZmZcbmV4cG9ydHMua01heExlbmd0aCA9IEtfTUFYX0xFTkdUSFxuXG4vKipcbiAqIElmIGBCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVGA6XG4gKiAgID09PSB0cnVlICAgIFVzZSBVaW50OEFycmF5IGltcGxlbWVudGF0aW9uIChmYXN0ZXN0KVxuICogICA9PT0gZmFsc2UgICBQcmludCB3YXJuaW5nIGFuZCByZWNvbW1lbmQgdXNpbmcgYGJ1ZmZlcmAgdjQueCB3aGljaCBoYXMgYW4gT2JqZWN0XG4gKiAgICAgICAgICAgICAgIGltcGxlbWVudGF0aW9uIChtb3N0IGNvbXBhdGlibGUsIGV2ZW4gSUU2KVxuICpcbiAqIEJyb3dzZXJzIHRoYXQgc3VwcG9ydCB0eXBlZCBhcnJheXMgYXJlIElFIDEwKywgRmlyZWZveCA0KywgQ2hyb21lIDcrLCBTYWZhcmkgNS4xKyxcbiAqIE9wZXJhIDExLjYrLCBpT1MgNC4yKy5cbiAqXG4gKiBXZSByZXBvcnQgdGhhdCB0aGUgYnJvd3NlciBkb2VzIG5vdCBzdXBwb3J0IHR5cGVkIGFycmF5cyBpZiB0aGUgYXJlIG5vdCBzdWJjbGFzc2FibGVcbiAqIHVzaW5nIF9fcHJvdG9fXy4gRmlyZWZveCA0LTI5IGxhY2tzIHN1cHBvcnQgZm9yIGFkZGluZyBuZXcgcHJvcGVydGllcyB0byBgVWludDhBcnJheWBcbiAqIChTZWU6IGh0dHBzOi8vYnVnemlsbGEubW96aWxsYS5vcmcvc2hvd19idWcuY2dpP2lkPTY5NTQzOCkuIElFIDEwIGxhY2tzIHN1cHBvcnRcbiAqIGZvciBfX3Byb3RvX18gYW5kIGhhcyBhIGJ1Z2d5IHR5cGVkIGFycmF5IGltcGxlbWVudGF0aW9uLlxuICovXG5CdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCA9IHR5cGVkQXJyYXlTdXBwb3J0KClcblxuaWYgKCFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCAmJiB0eXBlb2YgY29uc29sZSAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICB0eXBlb2YgY29uc29sZS5lcnJvciA9PT0gJ2Z1bmN0aW9uJykge1xuICBjb25zb2xlLmVycm9yKFxuICAgICdUaGlzIGJyb3dzZXIgbGFja3MgdHlwZWQgYXJyYXkgKFVpbnQ4QXJyYXkpIHN1cHBvcnQgd2hpY2ggaXMgcmVxdWlyZWQgYnkgJyArXG4gICAgJ2BidWZmZXJgIHY1LnguIFVzZSBgYnVmZmVyYCB2NC54IGlmIHlvdSByZXF1aXJlIG9sZCBicm93c2VyIHN1cHBvcnQuJ1xuICApXG59XG5cbmZ1bmN0aW9uIHR5cGVkQXJyYXlTdXBwb3J0ICgpIHtcbiAgLy8gQ2FuIHR5cGVkIGFycmF5IGluc3RhbmNlcyBjYW4gYmUgYXVnbWVudGVkP1xuICB0cnkge1xuICAgIHZhciBhcnIgPSBuZXcgVWludDhBcnJheSgxKVxuICAgIGFyci5fX3Byb3RvX18gPSB7IF9fcHJvdG9fXzogVWludDhBcnJheS5wcm90b3R5cGUsIGZvbzogZnVuY3Rpb24gKCkgeyByZXR1cm4gNDIgfSB9XG4gICAgcmV0dXJuIGFyci5mb28oKSA9PT0gNDJcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShCdWZmZXIucHJvdG90eXBlLCAncGFyZW50Jywge1xuICBlbnVtZXJhYmxlOiB0cnVlLFxuICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcih0aGlzKSkgcmV0dXJuIHVuZGVmaW5lZFxuICAgIHJldHVybiB0aGlzLmJ1ZmZlclxuICB9XG59KVxuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyLnByb3RvdHlwZSwgJ29mZnNldCcsIHtcbiAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCFCdWZmZXIuaXNCdWZmZXIodGhpcykpIHJldHVybiB1bmRlZmluZWRcbiAgICByZXR1cm4gdGhpcy5ieXRlT2Zmc2V0XG4gIH1cbn0pXG5cbmZ1bmN0aW9uIGNyZWF0ZUJ1ZmZlciAobGVuZ3RoKSB7XG4gIGlmIChsZW5ndGggPiBLX01BWF9MRU5HVEgpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignVGhlIHZhbHVlIFwiJyArIGxlbmd0aCArICdcIiBpcyBpbnZhbGlkIGZvciBvcHRpb24gXCJzaXplXCInKVxuICB9XG4gIC8vIFJldHVybiBhbiBhdWdtZW50ZWQgYFVpbnQ4QXJyYXlgIGluc3RhbmNlXG4gIHZhciBidWYgPSBuZXcgVWludDhBcnJheShsZW5ndGgpXG4gIGJ1Zi5fX3Byb3RvX18gPSBCdWZmZXIucHJvdG90eXBlXG4gIHJldHVybiBidWZcbn1cblxuLyoqXG4gKiBUaGUgQnVmZmVyIGNvbnN0cnVjdG9yIHJldHVybnMgaW5zdGFuY2VzIG9mIGBVaW50OEFycmF5YCB0aGF0IGhhdmUgdGhlaXJcbiAqIHByb3RvdHlwZSBjaGFuZ2VkIHRvIGBCdWZmZXIucHJvdG90eXBlYC4gRnVydGhlcm1vcmUsIGBCdWZmZXJgIGlzIGEgc3ViY2xhc3Mgb2ZcbiAqIGBVaW50OEFycmF5YCwgc28gdGhlIHJldHVybmVkIGluc3RhbmNlcyB3aWxsIGhhdmUgYWxsIHRoZSBub2RlIGBCdWZmZXJgIG1ldGhvZHNcbiAqIGFuZCB0aGUgYFVpbnQ4QXJyYXlgIG1ldGhvZHMuIFNxdWFyZSBicmFja2V0IG5vdGF0aW9uIHdvcmtzIGFzIGV4cGVjdGVkIC0tIGl0XG4gKiByZXR1cm5zIGEgc2luZ2xlIG9jdGV0LlxuICpcbiAqIFRoZSBgVWludDhBcnJheWAgcHJvdG90eXBlIHJlbWFpbnMgdW5tb2RpZmllZC5cbiAqL1xuXG5mdW5jdGlvbiBCdWZmZXIgKGFyZywgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKSB7XG4gIC8vIENvbW1vbiBjYXNlLlxuICBpZiAodHlwZW9mIGFyZyA9PT0gJ251bWJlcicpIHtcbiAgICBpZiAodHlwZW9mIGVuY29kaW5nT3JPZmZzZXQgPT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICAnVGhlIFwic3RyaW5nXCIgYXJndW1lbnQgbXVzdCBiZSBvZiB0eXBlIHN0cmluZy4gUmVjZWl2ZWQgdHlwZSBudW1iZXInXG4gICAgICApXG4gICAgfVxuICAgIHJldHVybiBhbGxvY1Vuc2FmZShhcmcpXG4gIH1cbiAgcmV0dXJuIGZyb20oYXJnLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpXG59XG5cbi8vIEZpeCBzdWJhcnJheSgpIGluIEVTMjAxNi4gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vZmVyb3NzL2J1ZmZlci9wdWxsLzk3XG5pZiAodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLnNwZWNpZXMgIT0gbnVsbCAmJlxuICAgIEJ1ZmZlcltTeW1ib2wuc3BlY2llc10gPT09IEJ1ZmZlcikge1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyLCBTeW1ib2wuc3BlY2llcywge1xuICAgIHZhbHVlOiBudWxsLFxuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICB3cml0YWJsZTogZmFsc2VcbiAgfSlcbn1cblxuQnVmZmVyLnBvb2xTaXplID0gODE5MiAvLyBub3QgdXNlZCBieSB0aGlzIGltcGxlbWVudGF0aW9uXG5cbmZ1bmN0aW9uIGZyb20gKHZhbHVlLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpIHtcbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gZnJvbVN0cmluZyh2YWx1ZSwgZW5jb2RpbmdPck9mZnNldClcbiAgfVxuXG4gIGlmIChBcnJheUJ1ZmZlci5pc1ZpZXcodmFsdWUpKSB7XG4gICAgcmV0dXJuIGZyb21BcnJheUxpa2UodmFsdWUpXG4gIH1cblxuICBpZiAodmFsdWUgPT0gbnVsbCkge1xuICAgIHRocm93IFR5cGVFcnJvcihcbiAgICAgICdUaGUgZmlyc3QgYXJndW1lbnQgbXVzdCBiZSBvbmUgb2YgdHlwZSBzdHJpbmcsIEJ1ZmZlciwgQXJyYXlCdWZmZXIsIEFycmF5LCAnICtcbiAgICAgICdvciBBcnJheS1saWtlIE9iamVjdC4gUmVjZWl2ZWQgdHlwZSAnICsgKHR5cGVvZiB2YWx1ZSlcbiAgICApXG4gIH1cblxuICBpZiAoaXNJbnN0YW5jZSh2YWx1ZSwgQXJyYXlCdWZmZXIpIHx8XG4gICAgICAodmFsdWUgJiYgaXNJbnN0YW5jZSh2YWx1ZS5idWZmZXIsIEFycmF5QnVmZmVyKSkpIHtcbiAgICByZXR1cm4gZnJvbUFycmF5QnVmZmVyKHZhbHVlLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpXG4gIH1cblxuICBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAnVGhlIFwidmFsdWVcIiBhcmd1bWVudCBtdXN0IG5vdCBiZSBvZiB0eXBlIG51bWJlci4gUmVjZWl2ZWQgdHlwZSBudW1iZXInXG4gICAgKVxuICB9XG5cbiAgdmFyIHZhbHVlT2YgPSB2YWx1ZS52YWx1ZU9mICYmIHZhbHVlLnZhbHVlT2YoKVxuICBpZiAodmFsdWVPZiAhPSBudWxsICYmIHZhbHVlT2YgIT09IHZhbHVlKSB7XG4gICAgcmV0dXJuIEJ1ZmZlci5mcm9tKHZhbHVlT2YsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aClcbiAgfVxuXG4gIHZhciBiID0gZnJvbU9iamVjdCh2YWx1ZSlcbiAgaWYgKGIpIHJldHVybiBiXG5cbiAgaWYgKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC50b1ByaW1pdGl2ZSAhPSBudWxsICYmXG4gICAgICB0eXBlb2YgdmFsdWVbU3ltYm9sLnRvUHJpbWl0aXZlXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiBCdWZmZXIuZnJvbShcbiAgICAgIHZhbHVlW1N5bWJvbC50b1ByaW1pdGl2ZV0oJ3N0cmluZycpLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGhcbiAgICApXG4gIH1cblxuICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICdUaGUgZmlyc3QgYXJndW1lbnQgbXVzdCBiZSBvbmUgb2YgdHlwZSBzdHJpbmcsIEJ1ZmZlciwgQXJyYXlCdWZmZXIsIEFycmF5LCAnICtcbiAgICAnb3IgQXJyYXktbGlrZSBPYmplY3QuIFJlY2VpdmVkIHR5cGUgJyArICh0eXBlb2YgdmFsdWUpXG4gIClcbn1cblxuLyoqXG4gKiBGdW5jdGlvbmFsbHkgZXF1aXZhbGVudCB0byBCdWZmZXIoYXJnLCBlbmNvZGluZykgYnV0IHRocm93cyBhIFR5cGVFcnJvclxuICogaWYgdmFsdWUgaXMgYSBudW1iZXIuXG4gKiBCdWZmZXIuZnJvbShzdHJbLCBlbmNvZGluZ10pXG4gKiBCdWZmZXIuZnJvbShhcnJheSlcbiAqIEJ1ZmZlci5mcm9tKGJ1ZmZlcilcbiAqIEJ1ZmZlci5mcm9tKGFycmF5QnVmZmVyWywgYnl0ZU9mZnNldFssIGxlbmd0aF1dKVxuICoqL1xuQnVmZmVyLmZyb20gPSBmdW5jdGlvbiAodmFsdWUsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gZnJvbSh2YWx1ZSwgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKVxufVxuXG4vLyBOb3RlOiBDaGFuZ2UgcHJvdG90eXBlICphZnRlciogQnVmZmVyLmZyb20gaXMgZGVmaW5lZCB0byB3b3JrYXJvdW5kIENocm9tZSBidWc6XG4vLyBodHRwczovL2dpdGh1Yi5jb20vZmVyb3NzL2J1ZmZlci9wdWxsLzE0OFxuQnVmZmVyLnByb3RvdHlwZS5fX3Byb3RvX18gPSBVaW50OEFycmF5LnByb3RvdHlwZVxuQnVmZmVyLl9fcHJvdG9fXyA9IFVpbnQ4QXJyYXlcblxuZnVuY3Rpb24gYXNzZXJ0U2l6ZSAoc2l6ZSkge1xuICBpZiAodHlwZW9mIHNpemUgIT09ICdudW1iZXInKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJzaXplXCIgYXJndW1lbnQgbXVzdCBiZSBvZiB0eXBlIG51bWJlcicpXG4gIH0gZWxzZSBpZiAoc2l6ZSA8IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignVGhlIHZhbHVlIFwiJyArIHNpemUgKyAnXCIgaXMgaW52YWxpZCBmb3Igb3B0aW9uIFwic2l6ZVwiJylcbiAgfVxufVxuXG5mdW5jdGlvbiBhbGxvYyAoc2l6ZSwgZmlsbCwgZW5jb2RpbmcpIHtcbiAgYXNzZXJ0U2l6ZShzaXplKVxuICBpZiAoc2l6ZSA8PSAwKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUJ1ZmZlcihzaXplKVxuICB9XG4gIGlmIChmaWxsICE9PSB1bmRlZmluZWQpIHtcbiAgICAvLyBPbmx5IHBheSBhdHRlbnRpb24gdG8gZW5jb2RpbmcgaWYgaXQncyBhIHN0cmluZy4gVGhpc1xuICAgIC8vIHByZXZlbnRzIGFjY2lkZW50YWxseSBzZW5kaW5nIGluIGEgbnVtYmVyIHRoYXQgd291bGRcbiAgICAvLyBiZSBpbnRlcnByZXR0ZWQgYXMgYSBzdGFydCBvZmZzZXQuXG4gICAgcmV0dXJuIHR5cGVvZiBlbmNvZGluZyA9PT0gJ3N0cmluZydcbiAgICAgID8gY3JlYXRlQnVmZmVyKHNpemUpLmZpbGwoZmlsbCwgZW5jb2RpbmcpXG4gICAgICA6IGNyZWF0ZUJ1ZmZlcihzaXplKS5maWxsKGZpbGwpXG4gIH1cbiAgcmV0dXJuIGNyZWF0ZUJ1ZmZlcihzaXplKVxufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgZmlsbGVkIEJ1ZmZlciBpbnN0YW5jZS5cbiAqIGFsbG9jKHNpemVbLCBmaWxsWywgZW5jb2RpbmddXSlcbiAqKi9cbkJ1ZmZlci5hbGxvYyA9IGZ1bmN0aW9uIChzaXplLCBmaWxsLCBlbmNvZGluZykge1xuICByZXR1cm4gYWxsb2Moc2l6ZSwgZmlsbCwgZW5jb2RpbmcpXG59XG5cbmZ1bmN0aW9uIGFsbG9jVW5zYWZlIChzaXplKSB7XG4gIGFzc2VydFNpemUoc2l6ZSlcbiAgcmV0dXJuIGNyZWF0ZUJ1ZmZlcihzaXplIDwgMCA/IDAgOiBjaGVja2VkKHNpemUpIHwgMClcbn1cblxuLyoqXG4gKiBFcXVpdmFsZW50IHRvIEJ1ZmZlcihudW0pLCBieSBkZWZhdWx0IGNyZWF0ZXMgYSBub24temVyby1maWxsZWQgQnVmZmVyIGluc3RhbmNlLlxuICogKi9cbkJ1ZmZlci5hbGxvY1Vuc2FmZSA9IGZ1bmN0aW9uIChzaXplKSB7XG4gIHJldHVybiBhbGxvY1Vuc2FmZShzaXplKVxufVxuLyoqXG4gKiBFcXVpdmFsZW50IHRvIFNsb3dCdWZmZXIobnVtKSwgYnkgZGVmYXVsdCBjcmVhdGVzIGEgbm9uLXplcm8tZmlsbGVkIEJ1ZmZlciBpbnN0YW5jZS5cbiAqL1xuQnVmZmVyLmFsbG9jVW5zYWZlU2xvdyA9IGZ1bmN0aW9uIChzaXplKSB7XG4gIHJldHVybiBhbGxvY1Vuc2FmZShzaXplKVxufVxuXG5mdW5jdGlvbiBmcm9tU3RyaW5nIChzdHJpbmcsIGVuY29kaW5nKSB7XG4gIGlmICh0eXBlb2YgZW5jb2RpbmcgIT09ICdzdHJpbmcnIHx8IGVuY29kaW5nID09PSAnJykge1xuICAgIGVuY29kaW5nID0gJ3V0ZjgnXG4gIH1cblxuICBpZiAoIUJ1ZmZlci5pc0VuY29kaW5nKGVuY29kaW5nKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgfVxuXG4gIHZhciBsZW5ndGggPSBieXRlTGVuZ3RoKHN0cmluZywgZW5jb2RpbmcpIHwgMFxuICB2YXIgYnVmID0gY3JlYXRlQnVmZmVyKGxlbmd0aClcblxuICB2YXIgYWN0dWFsID0gYnVmLndyaXRlKHN0cmluZywgZW5jb2RpbmcpXG5cbiAgaWYgKGFjdHVhbCAhPT0gbGVuZ3RoKSB7XG4gICAgLy8gV3JpdGluZyBhIGhleCBzdHJpbmcsIGZvciBleGFtcGxlLCB0aGF0IGNvbnRhaW5zIGludmFsaWQgY2hhcmFjdGVycyB3aWxsXG4gICAgLy8gY2F1c2UgZXZlcnl0aGluZyBhZnRlciB0aGUgZmlyc3QgaW52YWxpZCBjaGFyYWN0ZXIgdG8gYmUgaWdub3JlZC4gKGUuZy5cbiAgICAvLyAnYWJ4eGNkJyB3aWxsIGJlIHRyZWF0ZWQgYXMgJ2FiJylcbiAgICBidWYgPSBidWYuc2xpY2UoMCwgYWN0dWFsKVxuICB9XG5cbiAgcmV0dXJuIGJ1ZlxufVxuXG5mdW5jdGlvbiBmcm9tQXJyYXlMaWtlIChhcnJheSkge1xuICB2YXIgbGVuZ3RoID0gYXJyYXkubGVuZ3RoIDwgMCA/IDAgOiBjaGVja2VkKGFycmF5Lmxlbmd0aCkgfCAwXG4gIHZhciBidWYgPSBjcmVhdGVCdWZmZXIobGVuZ3RoKVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSArPSAxKSB7XG4gICAgYnVmW2ldID0gYXJyYXlbaV0gJiAyNTVcbiAgfVxuICByZXR1cm4gYnVmXG59XG5cbmZ1bmN0aW9uIGZyb21BcnJheUJ1ZmZlciAoYXJyYXksIGJ5dGVPZmZzZXQsIGxlbmd0aCkge1xuICBpZiAoYnl0ZU9mZnNldCA8IDAgfHwgYXJyYXkuYnl0ZUxlbmd0aCA8IGJ5dGVPZmZzZXQpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignXCJvZmZzZXRcIiBpcyBvdXRzaWRlIG9mIGJ1ZmZlciBib3VuZHMnKVxuICB9XG5cbiAgaWYgKGFycmF5LmJ5dGVMZW5ndGggPCBieXRlT2Zmc2V0ICsgKGxlbmd0aCB8fCAwKSkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdcImxlbmd0aFwiIGlzIG91dHNpZGUgb2YgYnVmZmVyIGJvdW5kcycpXG4gIH1cblxuICB2YXIgYnVmXG4gIGlmIChieXRlT2Zmc2V0ID09PSB1bmRlZmluZWQgJiYgbGVuZ3RoID09PSB1bmRlZmluZWQpIHtcbiAgICBidWYgPSBuZXcgVWludDhBcnJheShhcnJheSlcbiAgfSBlbHNlIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCkge1xuICAgIGJ1ZiA9IG5ldyBVaW50OEFycmF5KGFycmF5LCBieXRlT2Zmc2V0KVxuICB9IGVsc2Uge1xuICAgIGJ1ZiA9IG5ldyBVaW50OEFycmF5KGFycmF5LCBieXRlT2Zmc2V0LCBsZW5ndGgpXG4gIH1cblxuICAvLyBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZVxuICBidWYuX19wcm90b19fID0gQnVmZmVyLnByb3RvdHlwZVxuICByZXR1cm4gYnVmXG59XG5cbmZ1bmN0aW9uIGZyb21PYmplY3QgKG9iaikge1xuICBpZiAoQnVmZmVyLmlzQnVmZmVyKG9iaikpIHtcbiAgICB2YXIgbGVuID0gY2hlY2tlZChvYmoubGVuZ3RoKSB8IDBcbiAgICB2YXIgYnVmID0gY3JlYXRlQnVmZmVyKGxlbilcblxuICAgIGlmIChidWYubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gYnVmXG4gICAgfVxuXG4gICAgb2JqLmNvcHkoYnVmLCAwLCAwLCBsZW4pXG4gICAgcmV0dXJuIGJ1ZlxuICB9XG5cbiAgaWYgKG9iai5sZW5ndGggIT09IHVuZGVmaW5lZCkge1xuICAgIGlmICh0eXBlb2Ygb2JqLmxlbmd0aCAhPT0gJ251bWJlcicgfHwgbnVtYmVySXNOYU4ob2JqLmxlbmd0aCkpIHtcbiAgICAgIHJldHVybiBjcmVhdGVCdWZmZXIoMClcbiAgICB9XG4gICAgcmV0dXJuIGZyb21BcnJheUxpa2Uob2JqKVxuICB9XG5cbiAgaWYgKG9iai50eXBlID09PSAnQnVmZmVyJyAmJiBBcnJheS5pc0FycmF5KG9iai5kYXRhKSkge1xuICAgIHJldHVybiBmcm9tQXJyYXlMaWtlKG9iai5kYXRhKVxuICB9XG59XG5cbmZ1bmN0aW9uIGNoZWNrZWQgKGxlbmd0aCkge1xuICAvLyBOb3RlOiBjYW5ub3QgdXNlIGBsZW5ndGggPCBLX01BWF9MRU5HVEhgIGhlcmUgYmVjYXVzZSB0aGF0IGZhaWxzIHdoZW5cbiAgLy8gbGVuZ3RoIGlzIE5hTiAod2hpY2ggaXMgb3RoZXJ3aXNlIGNvZXJjZWQgdG8gemVyby4pXG4gIGlmIChsZW5ndGggPj0gS19NQVhfTEVOR1RIKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0F0dGVtcHQgdG8gYWxsb2NhdGUgQnVmZmVyIGxhcmdlciB0aGFuIG1heGltdW0gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgJ3NpemU6IDB4JyArIEtfTUFYX0xFTkdUSC50b1N0cmluZygxNikgKyAnIGJ5dGVzJylcbiAgfVxuICByZXR1cm4gbGVuZ3RoIHwgMFxufVxuXG5mdW5jdGlvbiBTbG93QnVmZmVyIChsZW5ndGgpIHtcbiAgaWYgKCtsZW5ndGggIT0gbGVuZ3RoKSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgZXFlcWVxXG4gICAgbGVuZ3RoID0gMFxuICB9XG4gIHJldHVybiBCdWZmZXIuYWxsb2MoK2xlbmd0aClcbn1cblxuQnVmZmVyLmlzQnVmZmVyID0gZnVuY3Rpb24gaXNCdWZmZXIgKGIpIHtcbiAgcmV0dXJuIGIgIT0gbnVsbCAmJiBiLl9pc0J1ZmZlciA9PT0gdHJ1ZSAmJlxuICAgIGIgIT09IEJ1ZmZlci5wcm90b3R5cGUgLy8gc28gQnVmZmVyLmlzQnVmZmVyKEJ1ZmZlci5wcm90b3R5cGUpIHdpbGwgYmUgZmFsc2Vcbn1cblxuQnVmZmVyLmNvbXBhcmUgPSBmdW5jdGlvbiBjb21wYXJlIChhLCBiKSB7XG4gIGlmIChpc0luc3RhbmNlKGEsIFVpbnQ4QXJyYXkpKSBhID0gQnVmZmVyLmZyb20oYSwgYS5vZmZzZXQsIGEuYnl0ZUxlbmd0aClcbiAgaWYgKGlzSW5zdGFuY2UoYiwgVWludDhBcnJheSkpIGIgPSBCdWZmZXIuZnJvbShiLCBiLm9mZnNldCwgYi5ieXRlTGVuZ3RoKVxuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihhKSB8fCAhQnVmZmVyLmlzQnVmZmVyKGIpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICdUaGUgXCJidWYxXCIsIFwiYnVmMlwiIGFyZ3VtZW50cyBtdXN0IGJlIG9uZSBvZiB0eXBlIEJ1ZmZlciBvciBVaW50OEFycmF5J1xuICAgIClcbiAgfVxuXG4gIGlmIChhID09PSBiKSByZXR1cm4gMFxuXG4gIHZhciB4ID0gYS5sZW5ndGhcbiAgdmFyIHkgPSBiLmxlbmd0aFxuXG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBNYXRoLm1pbih4LCB5KTsgaSA8IGxlbjsgKytpKSB7XG4gICAgaWYgKGFbaV0gIT09IGJbaV0pIHtcbiAgICAgIHggPSBhW2ldXG4gICAgICB5ID0gYltpXVxuICAgICAgYnJlYWtcbiAgICB9XG4gIH1cblxuICBpZiAoeCA8IHkpIHJldHVybiAtMVxuICBpZiAoeSA8IHgpIHJldHVybiAxXG4gIHJldHVybiAwXG59XG5cbkJ1ZmZlci5pc0VuY29kaW5nID0gZnVuY3Rpb24gaXNFbmNvZGluZyAoZW5jb2RpbmcpIHtcbiAgc3dpdGNoIChTdHJpbmcoZW5jb2RpbmcpLnRvTG93ZXJDYXNlKCkpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnbGF0aW4xJzpcbiAgICBjYXNlICdiaW5hcnknOlxuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldHVybiB0cnVlXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbkJ1ZmZlci5jb25jYXQgPSBmdW5jdGlvbiBjb25jYXQgKGxpc3QsIGxlbmd0aCkge1xuICBpZiAoIUFycmF5LmlzQXJyYXkobGlzdCkpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcImxpc3RcIiBhcmd1bWVudCBtdXN0IGJlIGFuIEFycmF5IG9mIEJ1ZmZlcnMnKVxuICB9XG5cbiAgaWYgKGxpc3QubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIEJ1ZmZlci5hbGxvYygwKVxuICB9XG5cbiAgdmFyIGlcbiAgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgbGVuZ3RoID0gMFxuICAgIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgKytpKSB7XG4gICAgICBsZW5ndGggKz0gbGlzdFtpXS5sZW5ndGhcbiAgICB9XG4gIH1cblxuICB2YXIgYnVmZmVyID0gQnVmZmVyLmFsbG9jVW5zYWZlKGxlbmd0aClcbiAgdmFyIHBvcyA9IDBcbiAgZm9yIChpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyArK2kpIHtcbiAgICB2YXIgYnVmID0gbGlzdFtpXVxuICAgIGlmIChpc0luc3RhbmNlKGJ1ZiwgVWludDhBcnJheSkpIHtcbiAgICAgIGJ1ZiA9IEJ1ZmZlci5mcm9tKGJ1ZilcbiAgICB9XG4gICAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYnVmKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJsaXN0XCIgYXJndW1lbnQgbXVzdCBiZSBhbiBBcnJheSBvZiBCdWZmZXJzJylcbiAgICB9XG4gICAgYnVmLmNvcHkoYnVmZmVyLCBwb3MpXG4gICAgcG9zICs9IGJ1Zi5sZW5ndGhcbiAgfVxuICByZXR1cm4gYnVmZmVyXG59XG5cbmZ1bmN0aW9uIGJ5dGVMZW5ndGggKHN0cmluZywgZW5jb2RpbmcpIHtcbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihzdHJpbmcpKSB7XG4gICAgcmV0dXJuIHN0cmluZy5sZW5ndGhcbiAgfVxuICBpZiAoQXJyYXlCdWZmZXIuaXNWaWV3KHN0cmluZykgfHwgaXNJbnN0YW5jZShzdHJpbmcsIEFycmF5QnVmZmVyKSkge1xuICAgIHJldHVybiBzdHJpbmcuYnl0ZUxlbmd0aFxuICB9XG4gIGlmICh0eXBlb2Ygc3RyaW5nICE9PSAnc3RyaW5nJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAnVGhlIFwic3RyaW5nXCIgYXJndW1lbnQgbXVzdCBiZSBvbmUgb2YgdHlwZSBzdHJpbmcsIEJ1ZmZlciwgb3IgQXJyYXlCdWZmZXIuICcgK1xuICAgICAgJ1JlY2VpdmVkIHR5cGUgJyArIHR5cGVvZiBzdHJpbmdcbiAgICApXG4gIH1cblxuICB2YXIgbGVuID0gc3RyaW5nLmxlbmd0aFxuICB2YXIgbXVzdE1hdGNoID0gKGFyZ3VtZW50cy5sZW5ndGggPiAyICYmIGFyZ3VtZW50c1syXSA9PT0gdHJ1ZSlcbiAgaWYgKCFtdXN0TWF0Y2ggJiYgbGVuID09PSAwKSByZXR1cm4gMFxuXG4gIC8vIFVzZSBhIGZvciBsb29wIHRvIGF2b2lkIHJlY3Vyc2lvblxuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuICBmb3IgKDs7KSB7XG4gICAgc3dpdGNoIChlbmNvZGluZykge1xuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgY2FzZSAnbGF0aW4xJzpcbiAgICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICAgIHJldHVybiBsZW5cbiAgICAgIGNhc2UgJ3V0ZjgnOlxuICAgICAgY2FzZSAndXRmLTgnOlxuICAgICAgICByZXR1cm4gdXRmOFRvQnl0ZXMoc3RyaW5nKS5sZW5ndGhcbiAgICAgIGNhc2UgJ3VjczInOlxuICAgICAgY2FzZSAndWNzLTInOlxuICAgICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICAgIHJldHVybiBsZW4gKiAyXG4gICAgICBjYXNlICdoZXgnOlxuICAgICAgICByZXR1cm4gbGVuID4+PiAxXG4gICAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgICByZXR1cm4gYmFzZTY0VG9CeXRlcyhzdHJpbmcpLmxlbmd0aFxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGxvd2VyZWRDYXNlKSB7XG4gICAgICAgICAgcmV0dXJuIG11c3RNYXRjaCA/IC0xIDogdXRmOFRvQnl0ZXMoc3RyaW5nKS5sZW5ndGggLy8gYXNzdW1lIHV0ZjhcbiAgICAgICAgfVxuICAgICAgICBlbmNvZGluZyA9ICgnJyArIGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpXG4gICAgICAgIGxvd2VyZWRDYXNlID0gdHJ1ZVxuICAgIH1cbiAgfVxufVxuQnVmZmVyLmJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoXG5cbmZ1bmN0aW9uIHNsb3dUb1N0cmluZyAoZW5jb2RpbmcsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxvd2VyZWRDYXNlID0gZmFsc2VcblxuICAvLyBObyBuZWVkIHRvIHZlcmlmeSB0aGF0IFwidGhpcy5sZW5ndGggPD0gTUFYX1VJTlQzMlwiIHNpbmNlIGl0J3MgYSByZWFkLW9ubHlcbiAgLy8gcHJvcGVydHkgb2YgYSB0eXBlZCBhcnJheS5cblxuICAvLyBUaGlzIGJlaGF2ZXMgbmVpdGhlciBsaWtlIFN0cmluZyBub3IgVWludDhBcnJheSBpbiB0aGF0IHdlIHNldCBzdGFydC9lbmRcbiAgLy8gdG8gdGhlaXIgdXBwZXIvbG93ZXIgYm91bmRzIGlmIHRoZSB2YWx1ZSBwYXNzZWQgaXMgb3V0IG9mIHJhbmdlLlxuICAvLyB1bmRlZmluZWQgaXMgaGFuZGxlZCBzcGVjaWFsbHkgYXMgcGVyIEVDTUEtMjYyIDZ0aCBFZGl0aW9uLFxuICAvLyBTZWN0aW9uIDEzLjMuMy43IFJ1bnRpbWUgU2VtYW50aWNzOiBLZXllZEJpbmRpbmdJbml0aWFsaXphdGlvbi5cbiAgaWYgKHN0YXJ0ID09PSB1bmRlZmluZWQgfHwgc3RhcnQgPCAwKSB7XG4gICAgc3RhcnQgPSAwXG4gIH1cbiAgLy8gUmV0dXJuIGVhcmx5IGlmIHN0YXJ0ID4gdGhpcy5sZW5ndGguIERvbmUgaGVyZSB0byBwcmV2ZW50IHBvdGVudGlhbCB1aW50MzJcbiAgLy8gY29lcmNpb24gZmFpbCBiZWxvdy5cbiAgaWYgKHN0YXJ0ID4gdGhpcy5sZW5ndGgpIHtcbiAgICByZXR1cm4gJydcbiAgfVxuXG4gIGlmIChlbmQgPT09IHVuZGVmaW5lZCB8fCBlbmQgPiB0aGlzLmxlbmd0aCkge1xuICAgIGVuZCA9IHRoaXMubGVuZ3RoXG4gIH1cblxuICBpZiAoZW5kIDw9IDApIHtcbiAgICByZXR1cm4gJydcbiAgfVxuXG4gIC8vIEZvcmNlIGNvZXJzaW9uIHRvIHVpbnQzMi4gVGhpcyB3aWxsIGFsc28gY29lcmNlIGZhbHNleS9OYU4gdmFsdWVzIHRvIDAuXG4gIGVuZCA+Pj49IDBcbiAgc3RhcnQgPj4+PSAwXG5cbiAgaWYgKGVuZCA8PSBzdGFydCkge1xuICAgIHJldHVybiAnJ1xuICB9XG5cbiAgaWYgKCFlbmNvZGluZykgZW5jb2RpbmcgPSAndXRmOCdcblxuICB3aGlsZSAodHJ1ZSkge1xuICAgIHN3aXRjaCAoZW5jb2RpbmcpIHtcbiAgICAgIGNhc2UgJ2hleCc6XG4gICAgICAgIHJldHVybiBoZXhTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICd1dGY4JzpcbiAgICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgICAgcmV0dXJuIHV0ZjhTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICdhc2NpaSc6XG4gICAgICAgIHJldHVybiBhc2NpaVNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ2xhdGluMSc6XG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICByZXR1cm4gbGF0aW4xU2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgcmV0dXJuIGJhc2U2NFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ3VjczInOlxuICAgICAgY2FzZSAndWNzLTInOlxuICAgICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICAgIHJldHVybiB1dGYxNmxlU2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGxvd2VyZWRDYXNlKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gICAgICAgIGVuY29kaW5nID0gKGVuY29kaW5nICsgJycpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5cbi8vIFRoaXMgcHJvcGVydHkgaXMgdXNlZCBieSBgQnVmZmVyLmlzQnVmZmVyYCAoYW5kIHRoZSBgaXMtYnVmZmVyYCBucG0gcGFja2FnZSlcbi8vIHRvIGRldGVjdCBhIEJ1ZmZlciBpbnN0YW5jZS4gSXQncyBub3QgcG9zc2libGUgdG8gdXNlIGBpbnN0YW5jZW9mIEJ1ZmZlcmBcbi8vIHJlbGlhYmx5IGluIGEgYnJvd3NlcmlmeSBjb250ZXh0IGJlY2F1c2UgdGhlcmUgY291bGQgYmUgbXVsdGlwbGUgZGlmZmVyZW50XG4vLyBjb3BpZXMgb2YgdGhlICdidWZmZXInIHBhY2thZ2UgaW4gdXNlLiBUaGlzIG1ldGhvZCB3b3JrcyBldmVuIGZvciBCdWZmZXJcbi8vIGluc3RhbmNlcyB0aGF0IHdlcmUgY3JlYXRlZCBmcm9tIGFub3RoZXIgY29weSBvZiB0aGUgYGJ1ZmZlcmAgcGFja2FnZS5cbi8vIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL2Zlcm9zcy9idWZmZXIvaXNzdWVzLzE1NFxuQnVmZmVyLnByb3RvdHlwZS5faXNCdWZmZXIgPSB0cnVlXG5cbmZ1bmN0aW9uIHN3YXAgKGIsIG4sIG0pIHtcbiAgdmFyIGkgPSBiW25dXG4gIGJbbl0gPSBiW21dXG4gIGJbbV0gPSBpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuc3dhcDE2ID0gZnVuY3Rpb24gc3dhcDE2ICgpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIGlmIChsZW4gJSAyICE9PSAwKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0J1ZmZlciBzaXplIG11c3QgYmUgYSBtdWx0aXBsZSBvZiAxNi1iaXRzJylcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSArPSAyKSB7XG4gICAgc3dhcCh0aGlzLCBpLCBpICsgMSlcbiAgfVxuICByZXR1cm4gdGhpc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnN3YXAzMiA9IGZ1bmN0aW9uIHN3YXAzMiAoKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBpZiAobGVuICUgNCAhPT0gMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdCdWZmZXIgc2l6ZSBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgMzItYml0cycpXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkgKz0gNCkge1xuICAgIHN3YXAodGhpcywgaSwgaSArIDMpXG4gICAgc3dhcCh0aGlzLCBpICsgMSwgaSArIDIpXG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zd2FwNjQgPSBmdW5jdGlvbiBzd2FwNjQgKCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgaWYgKGxlbiAlIDggIT09IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQnVmZmVyIHNpemUgbXVzdCBiZSBhIG11bHRpcGxlIG9mIDY0LWJpdHMnKVxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpICs9IDgpIHtcbiAgICBzd2FwKHRoaXMsIGksIGkgKyA3KVxuICAgIHN3YXAodGhpcywgaSArIDEsIGkgKyA2KVxuICAgIHN3YXAodGhpcywgaSArIDIsIGkgKyA1KVxuICAgIHN3YXAodGhpcywgaSArIDMsIGkgKyA0KVxuICB9XG4gIHJldHVybiB0aGlzXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZyAoKSB7XG4gIHZhciBsZW5ndGggPSB0aGlzLmxlbmd0aFxuICBpZiAobGVuZ3RoID09PSAwKSByZXR1cm4gJydcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHJldHVybiB1dGY4U2xpY2UodGhpcywgMCwgbGVuZ3RoKVxuICByZXR1cm4gc2xvd1RvU3RyaW5nLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcbn1cblxuQnVmZmVyLnByb3RvdHlwZS50b0xvY2FsZVN0cmluZyA9IEJ1ZmZlci5wcm90b3R5cGUudG9TdHJpbmdcblxuQnVmZmVyLnByb3RvdHlwZS5lcXVhbHMgPSBmdW5jdGlvbiBlcXVhbHMgKGIpIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYikpIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50IG11c3QgYmUgYSBCdWZmZXInKVxuICBpZiAodGhpcyA9PT0gYikgcmV0dXJuIHRydWVcbiAgcmV0dXJuIEJ1ZmZlci5jb21wYXJlKHRoaXMsIGIpID09PSAwXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuaW5zcGVjdCA9IGZ1bmN0aW9uIGluc3BlY3QgKCkge1xuICB2YXIgc3RyID0gJydcbiAgdmFyIG1heCA9IGV4cG9ydHMuSU5TUEVDVF9NQVhfQllURVNcbiAgc3RyID0gdGhpcy50b1N0cmluZygnaGV4JywgMCwgbWF4KS5yZXBsYWNlKC8oLnsyfSkvZywgJyQxICcpLnRyaW0oKVxuICBpZiAodGhpcy5sZW5ndGggPiBtYXgpIHN0ciArPSAnIC4uLiAnXG4gIHJldHVybiAnPEJ1ZmZlciAnICsgc3RyICsgJz4nXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuY29tcGFyZSA9IGZ1bmN0aW9uIGNvbXBhcmUgKHRhcmdldCwgc3RhcnQsIGVuZCwgdGhpc1N0YXJ0LCB0aGlzRW5kKSB7XG4gIGlmIChpc0luc3RhbmNlKHRhcmdldCwgVWludDhBcnJheSkpIHtcbiAgICB0YXJnZXQgPSBCdWZmZXIuZnJvbSh0YXJnZXQsIHRhcmdldC5vZmZzZXQsIHRhcmdldC5ieXRlTGVuZ3RoKVxuICB9XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKHRhcmdldCkpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgJ1RoZSBcInRhcmdldFwiIGFyZ3VtZW50IG11c3QgYmUgb25lIG9mIHR5cGUgQnVmZmVyIG9yIFVpbnQ4QXJyYXkuICcgK1xuICAgICAgJ1JlY2VpdmVkIHR5cGUgJyArICh0eXBlb2YgdGFyZ2V0KVxuICAgIClcbiAgfVxuXG4gIGlmIChzdGFydCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgc3RhcnQgPSAwXG4gIH1cbiAgaWYgKGVuZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgZW5kID0gdGFyZ2V0ID8gdGFyZ2V0Lmxlbmd0aCA6IDBcbiAgfVxuICBpZiAodGhpc1N0YXJ0ID09PSB1bmRlZmluZWQpIHtcbiAgICB0aGlzU3RhcnQgPSAwXG4gIH1cbiAgaWYgKHRoaXNFbmQgPT09IHVuZGVmaW5lZCkge1xuICAgIHRoaXNFbmQgPSB0aGlzLmxlbmd0aFxuICB9XG5cbiAgaWYgKHN0YXJ0IDwgMCB8fCBlbmQgPiB0YXJnZXQubGVuZ3RoIHx8IHRoaXNTdGFydCA8IDAgfHwgdGhpc0VuZCA+IHRoaXMubGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ291dCBvZiByYW5nZSBpbmRleCcpXG4gIH1cblxuICBpZiAodGhpc1N0YXJ0ID49IHRoaXNFbmQgJiYgc3RhcnQgPj0gZW5kKSB7XG4gICAgcmV0dXJuIDBcbiAgfVxuICBpZiAodGhpc1N0YXJ0ID49IHRoaXNFbmQpIHtcbiAgICByZXR1cm4gLTFcbiAgfVxuICBpZiAoc3RhcnQgPj0gZW5kKSB7XG4gICAgcmV0dXJuIDFcbiAgfVxuXG4gIHN0YXJ0ID4+Pj0gMFxuICBlbmQgPj4+PSAwXG4gIHRoaXNTdGFydCA+Pj49IDBcbiAgdGhpc0VuZCA+Pj49IDBcblxuICBpZiAodGhpcyA9PT0gdGFyZ2V0KSByZXR1cm4gMFxuXG4gIHZhciB4ID0gdGhpc0VuZCAtIHRoaXNTdGFydFxuICB2YXIgeSA9IGVuZCAtIHN0YXJ0XG4gIHZhciBsZW4gPSBNYXRoLm1pbih4LCB5KVxuXG4gIHZhciB0aGlzQ29weSA9IHRoaXMuc2xpY2UodGhpc1N0YXJ0LCB0aGlzRW5kKVxuICB2YXIgdGFyZ2V0Q29weSA9IHRhcmdldC5zbGljZShzdGFydCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyArK2kpIHtcbiAgICBpZiAodGhpc0NvcHlbaV0gIT09IHRhcmdldENvcHlbaV0pIHtcbiAgICAgIHggPSB0aGlzQ29weVtpXVxuICAgICAgeSA9IHRhcmdldENvcHlbaV1cbiAgICAgIGJyZWFrXG4gICAgfVxuICB9XG5cbiAgaWYgKHggPCB5KSByZXR1cm4gLTFcbiAgaWYgKHkgPCB4KSByZXR1cm4gMVxuICByZXR1cm4gMFxufVxuXG4vLyBGaW5kcyBlaXRoZXIgdGhlIGZpcnN0IGluZGV4IG9mIGB2YWxgIGluIGBidWZmZXJgIGF0IG9mZnNldCA+PSBgYnl0ZU9mZnNldGAsXG4vLyBPUiB0aGUgbGFzdCBpbmRleCBvZiBgdmFsYCBpbiBgYnVmZmVyYCBhdCBvZmZzZXQgPD0gYGJ5dGVPZmZzZXRgLlxuLy9cbi8vIEFyZ3VtZW50czpcbi8vIC0gYnVmZmVyIC0gYSBCdWZmZXIgdG8gc2VhcmNoXG4vLyAtIHZhbCAtIGEgc3RyaW5nLCBCdWZmZXIsIG9yIG51bWJlclxuLy8gLSBieXRlT2Zmc2V0IC0gYW4gaW5kZXggaW50byBgYnVmZmVyYDsgd2lsbCBiZSBjbGFtcGVkIHRvIGFuIGludDMyXG4vLyAtIGVuY29kaW5nIC0gYW4gb3B0aW9uYWwgZW5jb2RpbmcsIHJlbGV2YW50IGlzIHZhbCBpcyBhIHN0cmluZ1xuLy8gLSBkaXIgLSB0cnVlIGZvciBpbmRleE9mLCBmYWxzZSBmb3IgbGFzdEluZGV4T2ZcbmZ1bmN0aW9uIGJpZGlyZWN0aW9uYWxJbmRleE9mIChidWZmZXIsIHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIGRpcikge1xuICAvLyBFbXB0eSBidWZmZXIgbWVhbnMgbm8gbWF0Y2hcbiAgaWYgKGJ1ZmZlci5sZW5ndGggPT09IDApIHJldHVybiAtMVxuXG4gIC8vIE5vcm1hbGl6ZSBieXRlT2Zmc2V0XG4gIGlmICh0eXBlb2YgYnl0ZU9mZnNldCA9PT0gJ3N0cmluZycpIHtcbiAgICBlbmNvZGluZyA9IGJ5dGVPZmZzZXRcbiAgICBieXRlT2Zmc2V0ID0gMFxuICB9IGVsc2UgaWYgKGJ5dGVPZmZzZXQgPiAweDdmZmZmZmZmKSB7XG4gICAgYnl0ZU9mZnNldCA9IDB4N2ZmZmZmZmZcbiAgfSBlbHNlIGlmIChieXRlT2Zmc2V0IDwgLTB4ODAwMDAwMDApIHtcbiAgICBieXRlT2Zmc2V0ID0gLTB4ODAwMDAwMDBcbiAgfVxuICBieXRlT2Zmc2V0ID0gK2J5dGVPZmZzZXQgLy8gQ29lcmNlIHRvIE51bWJlci5cbiAgaWYgKG51bWJlcklzTmFOKGJ5dGVPZmZzZXQpKSB7XG4gICAgLy8gYnl0ZU9mZnNldDogaXQgaXQncyB1bmRlZmluZWQsIG51bGwsIE5hTiwgXCJmb29cIiwgZXRjLCBzZWFyY2ggd2hvbGUgYnVmZmVyXG4gICAgYnl0ZU9mZnNldCA9IGRpciA/IDAgOiAoYnVmZmVyLmxlbmd0aCAtIDEpXG4gIH1cblxuICAvLyBOb3JtYWxpemUgYnl0ZU9mZnNldDogbmVnYXRpdmUgb2Zmc2V0cyBzdGFydCBmcm9tIHRoZSBlbmQgb2YgdGhlIGJ1ZmZlclxuICBpZiAoYnl0ZU9mZnNldCA8IDApIGJ5dGVPZmZzZXQgPSBidWZmZXIubGVuZ3RoICsgYnl0ZU9mZnNldFxuICBpZiAoYnl0ZU9mZnNldCA+PSBidWZmZXIubGVuZ3RoKSB7XG4gICAgaWYgKGRpcikgcmV0dXJuIC0xXG4gICAgZWxzZSBieXRlT2Zmc2V0ID0gYnVmZmVyLmxlbmd0aCAtIDFcbiAgfSBlbHNlIGlmIChieXRlT2Zmc2V0IDwgMCkge1xuICAgIGlmIChkaXIpIGJ5dGVPZmZzZXQgPSAwXG4gICAgZWxzZSByZXR1cm4gLTFcbiAgfVxuXG4gIC8vIE5vcm1hbGl6ZSB2YWxcbiAgaWYgKHR5cGVvZiB2YWwgPT09ICdzdHJpbmcnKSB7XG4gICAgdmFsID0gQnVmZmVyLmZyb20odmFsLCBlbmNvZGluZylcbiAgfVxuXG4gIC8vIEZpbmFsbHksIHNlYXJjaCBlaXRoZXIgaW5kZXhPZiAoaWYgZGlyIGlzIHRydWUpIG9yIGxhc3RJbmRleE9mXG4gIGlmIChCdWZmZXIuaXNCdWZmZXIodmFsKSkge1xuICAgIC8vIFNwZWNpYWwgY2FzZTogbG9va2luZyBmb3IgZW1wdHkgc3RyaW5nL2J1ZmZlciBhbHdheXMgZmFpbHNcbiAgICBpZiAodmFsLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIC0xXG4gICAgfVxuICAgIHJldHVybiBhcnJheUluZGV4T2YoYnVmZmVyLCB2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCBkaXIpXG4gIH0gZWxzZSBpZiAodHlwZW9mIHZhbCA9PT0gJ251bWJlcicpIHtcbiAgICB2YWwgPSB2YWwgJiAweEZGIC8vIFNlYXJjaCBmb3IgYSBieXRlIHZhbHVlIFswLTI1NV1cbiAgICBpZiAodHlwZW9mIFVpbnQ4QXJyYXkucHJvdG90eXBlLmluZGV4T2YgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGlmIChkaXIpIHtcbiAgICAgICAgcmV0dXJuIFVpbnQ4QXJyYXkucHJvdG90eXBlLmluZGV4T2YuY2FsbChidWZmZXIsIHZhbCwgYnl0ZU9mZnNldClcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBVaW50OEFycmF5LnByb3RvdHlwZS5sYXN0SW5kZXhPZi5jYWxsKGJ1ZmZlciwgdmFsLCBieXRlT2Zmc2V0KVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gYXJyYXlJbmRleE9mKGJ1ZmZlciwgWyB2YWwgXSwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIGRpcilcbiAgfVxuXG4gIHRocm93IG5ldyBUeXBlRXJyb3IoJ3ZhbCBtdXN0IGJlIHN0cmluZywgbnVtYmVyIG9yIEJ1ZmZlcicpXG59XG5cbmZ1bmN0aW9uIGFycmF5SW5kZXhPZiAoYXJyLCB2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCBkaXIpIHtcbiAgdmFyIGluZGV4U2l6ZSA9IDFcbiAgdmFyIGFyckxlbmd0aCA9IGFyci5sZW5ndGhcbiAgdmFyIHZhbExlbmd0aCA9IHZhbC5sZW5ndGhcblxuICBpZiAoZW5jb2RpbmcgIT09IHVuZGVmaW5lZCkge1xuICAgIGVuY29kaW5nID0gU3RyaW5nKGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpXG4gICAgaWYgKGVuY29kaW5nID09PSAndWNzMicgfHwgZW5jb2RpbmcgPT09ICd1Y3MtMicgfHxcbiAgICAgICAgZW5jb2RpbmcgPT09ICd1dGYxNmxlJyB8fCBlbmNvZGluZyA9PT0gJ3V0Zi0xNmxlJykge1xuICAgICAgaWYgKGFyci5sZW5ndGggPCAyIHx8IHZhbC5sZW5ndGggPCAyKSB7XG4gICAgICAgIHJldHVybiAtMVxuICAgICAgfVxuICAgICAgaW5kZXhTaXplID0gMlxuICAgICAgYXJyTGVuZ3RoIC89IDJcbiAgICAgIHZhbExlbmd0aCAvPSAyXG4gICAgICBieXRlT2Zmc2V0IC89IDJcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiByZWFkIChidWYsIGkpIHtcbiAgICBpZiAoaW5kZXhTaXplID09PSAxKSB7XG4gICAgICByZXR1cm4gYnVmW2ldXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBidWYucmVhZFVJbnQxNkJFKGkgKiBpbmRleFNpemUpXG4gICAgfVxuICB9XG5cbiAgdmFyIGlcbiAgaWYgKGRpcikge1xuICAgIHZhciBmb3VuZEluZGV4ID0gLTFcbiAgICBmb3IgKGkgPSBieXRlT2Zmc2V0OyBpIDwgYXJyTGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChyZWFkKGFyciwgaSkgPT09IHJlYWQodmFsLCBmb3VuZEluZGV4ID09PSAtMSA/IDAgOiBpIC0gZm91bmRJbmRleCkpIHtcbiAgICAgICAgaWYgKGZvdW5kSW5kZXggPT09IC0xKSBmb3VuZEluZGV4ID0gaVxuICAgICAgICBpZiAoaSAtIGZvdW5kSW5kZXggKyAxID09PSB2YWxMZW5ndGgpIHJldHVybiBmb3VuZEluZGV4ICogaW5kZXhTaXplXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoZm91bmRJbmRleCAhPT0gLTEpIGkgLT0gaSAtIGZvdW5kSW5kZXhcbiAgICAgICAgZm91bmRJbmRleCA9IC0xXG4gICAgICB9XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChieXRlT2Zmc2V0ICsgdmFsTGVuZ3RoID4gYXJyTGVuZ3RoKSBieXRlT2Zmc2V0ID0gYXJyTGVuZ3RoIC0gdmFsTGVuZ3RoXG4gICAgZm9yIChpID0gYnl0ZU9mZnNldDsgaSA+PSAwOyBpLS0pIHtcbiAgICAgIHZhciBmb3VuZCA9IHRydWVcbiAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgdmFsTGVuZ3RoOyBqKyspIHtcbiAgICAgICAgaWYgKHJlYWQoYXJyLCBpICsgaikgIT09IHJlYWQodmFsLCBqKSkge1xuICAgICAgICAgIGZvdW5kID0gZmFsc2VcbiAgICAgICAgICBicmVha1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoZm91bmQpIHJldHVybiBpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIC0xXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuaW5jbHVkZXMgPSBmdW5jdGlvbiBpbmNsdWRlcyAodmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZykge1xuICByZXR1cm4gdGhpcy5pbmRleE9mKHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcpICE9PSAtMVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluZGV4T2YgPSBmdW5jdGlvbiBpbmRleE9mICh2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nKSB7XG4gIHJldHVybiBiaWRpcmVjdGlvbmFsSW5kZXhPZih0aGlzLCB2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCB0cnVlKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmxhc3RJbmRleE9mID0gZnVuY3Rpb24gbGFzdEluZGV4T2YgKHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcpIHtcbiAgcmV0dXJuIGJpZGlyZWN0aW9uYWxJbmRleE9mKHRoaXMsIHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIGZhbHNlKVxufVxuXG5mdW5jdGlvbiBoZXhXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIG9mZnNldCA9IE51bWJlcihvZmZzZXQpIHx8IDBcbiAgdmFyIHJlbWFpbmluZyA9IGJ1Zi5sZW5ndGggLSBvZmZzZXRcbiAgaWYgKCFsZW5ndGgpIHtcbiAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgfSBlbHNlIHtcbiAgICBsZW5ndGggPSBOdW1iZXIobGVuZ3RoKVxuICAgIGlmIChsZW5ndGggPiByZW1haW5pbmcpIHtcbiAgICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICAgIH1cbiAgfVxuXG4gIHZhciBzdHJMZW4gPSBzdHJpbmcubGVuZ3RoXG5cbiAgaWYgKGxlbmd0aCA+IHN0ckxlbiAvIDIpIHtcbiAgICBsZW5ndGggPSBzdHJMZW4gLyAyXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgIHZhciBwYXJzZWQgPSBwYXJzZUludChzdHJpbmcuc3Vic3RyKGkgKiAyLCAyKSwgMTYpXG4gICAgaWYgKG51bWJlcklzTmFOKHBhcnNlZCkpIHJldHVybiBpXG4gICAgYnVmW29mZnNldCArIGldID0gcGFyc2VkXG4gIH1cbiAgcmV0dXJuIGlcbn1cblxuZnVuY3Rpb24gdXRmOFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIodXRmOFRvQnl0ZXMoc3RyaW5nLCBidWYubGVuZ3RoIC0gb2Zmc2V0KSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gYXNjaWlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKGFzY2lpVG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBsYXRpbjFXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBhc2NpaVdyaXRlKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gYmFzZTY0V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcihiYXNlNjRUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIHVjczJXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKHV0ZjE2bGVUb0J5dGVzKHN0cmluZywgYnVmLmxlbmd0aCAtIG9mZnNldCksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbiB3cml0ZSAoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCwgZW5jb2RpbmcpIHtcbiAgLy8gQnVmZmVyI3dyaXRlKHN0cmluZylcbiAgaWYgKG9mZnNldCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgZW5jb2RpbmcgPSAndXRmOCdcbiAgICBsZW5ndGggPSB0aGlzLmxlbmd0aFxuICAgIG9mZnNldCA9IDBcbiAgLy8gQnVmZmVyI3dyaXRlKHN0cmluZywgZW5jb2RpbmcpXG4gIH0gZWxzZSBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQgJiYgdHlwZW9mIG9mZnNldCA9PT0gJ3N0cmluZycpIHtcbiAgICBlbmNvZGluZyA9IG9mZnNldFxuICAgIGxlbmd0aCA9IHRoaXMubGVuZ3RoXG4gICAgb2Zmc2V0ID0gMFxuICAvLyBCdWZmZXIjd3JpdGUoc3RyaW5nLCBvZmZzZXRbLCBsZW5ndGhdWywgZW5jb2RpbmddKVxuICB9IGVsc2UgaWYgKGlzRmluaXRlKG9mZnNldCkpIHtcbiAgICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgICBpZiAoaXNGaW5pdGUobGVuZ3RoKSkge1xuICAgICAgbGVuZ3RoID0gbGVuZ3RoID4+PiAwXG4gICAgICBpZiAoZW5jb2RpbmcgPT09IHVuZGVmaW5lZCkgZW5jb2RpbmcgPSAndXRmOCdcbiAgICB9IGVsc2Uge1xuICAgICAgZW5jb2RpbmcgPSBsZW5ndGhcbiAgICAgIGxlbmd0aCA9IHVuZGVmaW5lZFxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAnQnVmZmVyLndyaXRlKHN0cmluZywgZW5jb2RpbmcsIG9mZnNldFssIGxlbmd0aF0pIGlzIG5vIGxvbmdlciBzdXBwb3J0ZWQnXG4gICAgKVxuICB9XG5cbiAgdmFyIHJlbWFpbmluZyA9IHRoaXMubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCB8fCBsZW5ndGggPiByZW1haW5pbmcpIGxlbmd0aCA9IHJlbWFpbmluZ1xuXG4gIGlmICgoc3RyaW5nLmxlbmd0aCA+IDAgJiYgKGxlbmd0aCA8IDAgfHwgb2Zmc2V0IDwgMCkpIHx8IG9mZnNldCA+IHRoaXMubGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0F0dGVtcHQgdG8gd3JpdGUgb3V0c2lkZSBidWZmZXIgYm91bmRzJylcbiAgfVxuXG4gIGlmICghZW5jb2RpbmcpIGVuY29kaW5nID0gJ3V0ZjgnXG5cbiAgdmFyIGxvd2VyZWRDYXNlID0gZmFsc2VcbiAgZm9yICg7Oykge1xuICAgIHN3aXRjaCAoZW5jb2RpbmcpIHtcbiAgICAgIGNhc2UgJ2hleCc6XG4gICAgICAgIHJldHVybiBoZXhXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICd1dGY4JzpcbiAgICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgICAgcmV0dXJuIHV0ZjhXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICdhc2NpaSc6XG4gICAgICAgIHJldHVybiBhc2NpaVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ2xhdGluMSc6XG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICByZXR1cm4gbGF0aW4xV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgLy8gV2FybmluZzogbWF4TGVuZ3RoIG5vdCB0YWtlbiBpbnRvIGFjY291bnQgaW4gYmFzZTY0V3JpdGVcbiAgICAgICAgcmV0dXJuIGJhc2U2NFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ3VjczInOlxuICAgICAgY2FzZSAndWNzLTInOlxuICAgICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICAgIHJldHVybiB1Y3MyV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGxvd2VyZWRDYXNlKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gICAgICAgIGVuY29kaW5nID0gKCcnICsgZW5jb2RpbmcpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gdG9KU09OICgpIHtcbiAgcmV0dXJuIHtcbiAgICB0eXBlOiAnQnVmZmVyJyxcbiAgICBkYXRhOiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCh0aGlzLl9hcnIgfHwgdGhpcywgMClcbiAgfVxufVxuXG5mdW5jdGlvbiBiYXNlNjRTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIGlmIChzdGFydCA9PT0gMCAmJiBlbmQgPT09IGJ1Zi5sZW5ndGgpIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmKVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBiYXNlNjQuZnJvbUJ5dGVBcnJheShidWYuc2xpY2Uoc3RhcnQsIGVuZCkpXG4gIH1cbn1cblxuZnVuY3Rpb24gdXRmOFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuICB2YXIgcmVzID0gW11cblxuICB2YXIgaSA9IHN0YXJ0XG4gIHdoaWxlIChpIDwgZW5kKSB7XG4gICAgdmFyIGZpcnN0Qnl0ZSA9IGJ1ZltpXVxuICAgIHZhciBjb2RlUG9pbnQgPSBudWxsXG4gICAgdmFyIGJ5dGVzUGVyU2VxdWVuY2UgPSAoZmlyc3RCeXRlID4gMHhFRikgPyA0XG4gICAgICA6IChmaXJzdEJ5dGUgPiAweERGKSA/IDNcbiAgICAgICAgOiAoZmlyc3RCeXRlID4gMHhCRikgPyAyXG4gICAgICAgICAgOiAxXG5cbiAgICBpZiAoaSArIGJ5dGVzUGVyU2VxdWVuY2UgPD0gZW5kKSB7XG4gICAgICB2YXIgc2Vjb25kQnl0ZSwgdGhpcmRCeXRlLCBmb3VydGhCeXRlLCB0ZW1wQ29kZVBvaW50XG5cbiAgICAgIHN3aXRjaCAoYnl0ZXNQZXJTZXF1ZW5jZSkge1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgaWYgKGZpcnN0Qnl0ZSA8IDB4ODApIHtcbiAgICAgICAgICAgIGNvZGVQb2ludCA9IGZpcnN0Qnl0ZVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgc2Vjb25kQnl0ZSA9IGJ1ZltpICsgMV1cbiAgICAgICAgICBpZiAoKHNlY29uZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCkge1xuICAgICAgICAgICAgdGVtcENvZGVQb2ludCA9IChmaXJzdEJ5dGUgJiAweDFGKSA8PCAweDYgfCAoc2Vjb25kQnl0ZSAmIDB4M0YpXG4gICAgICAgICAgICBpZiAodGVtcENvZGVQb2ludCA+IDB4N0YpIHtcbiAgICAgICAgICAgICAgY29kZVBvaW50ID0gdGVtcENvZGVQb2ludFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgc2Vjb25kQnl0ZSA9IGJ1ZltpICsgMV1cbiAgICAgICAgICB0aGlyZEJ5dGUgPSBidWZbaSArIDJdXG4gICAgICAgICAgaWYgKChzZWNvbmRCeXRlICYgMHhDMCkgPT09IDB4ODAgJiYgKHRoaXJkQnl0ZSAmIDB4QzApID09PSAweDgwKSB7XG4gICAgICAgICAgICB0ZW1wQ29kZVBvaW50ID0gKGZpcnN0Qnl0ZSAmIDB4RikgPDwgMHhDIHwgKHNlY29uZEJ5dGUgJiAweDNGKSA8PCAweDYgfCAodGhpcmRCeXRlICYgMHgzRilcbiAgICAgICAgICAgIGlmICh0ZW1wQ29kZVBvaW50ID4gMHg3RkYgJiYgKHRlbXBDb2RlUG9pbnQgPCAweEQ4MDAgfHwgdGVtcENvZGVQb2ludCA+IDB4REZGRikpIHtcbiAgICAgICAgICAgICAgY29kZVBvaW50ID0gdGVtcENvZGVQb2ludFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlIDQ6XG4gICAgICAgICAgc2Vjb25kQnl0ZSA9IGJ1ZltpICsgMV1cbiAgICAgICAgICB0aGlyZEJ5dGUgPSBidWZbaSArIDJdXG4gICAgICAgICAgZm91cnRoQnl0ZSA9IGJ1ZltpICsgM11cbiAgICAgICAgICBpZiAoKHNlY29uZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCAmJiAodGhpcmRCeXRlICYgMHhDMCkgPT09IDB4ODAgJiYgKGZvdXJ0aEJ5dGUgJiAweEMwKSA9PT0gMHg4MCkge1xuICAgICAgICAgICAgdGVtcENvZGVQb2ludCA9IChmaXJzdEJ5dGUgJiAweEYpIDw8IDB4MTIgfCAoc2Vjb25kQnl0ZSAmIDB4M0YpIDw8IDB4QyB8ICh0aGlyZEJ5dGUgJiAweDNGKSA8PCAweDYgfCAoZm91cnRoQnl0ZSAmIDB4M0YpXG4gICAgICAgICAgICBpZiAodGVtcENvZGVQb2ludCA+IDB4RkZGRiAmJiB0ZW1wQ29kZVBvaW50IDwgMHgxMTAwMDApIHtcbiAgICAgICAgICAgICAgY29kZVBvaW50ID0gdGVtcENvZGVQb2ludFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoY29kZVBvaW50ID09PSBudWxsKSB7XG4gICAgICAvLyB3ZSBkaWQgbm90IGdlbmVyYXRlIGEgdmFsaWQgY29kZVBvaW50IHNvIGluc2VydCBhXG4gICAgICAvLyByZXBsYWNlbWVudCBjaGFyIChVK0ZGRkQpIGFuZCBhZHZhbmNlIG9ubHkgMSBieXRlXG4gICAgICBjb2RlUG9pbnQgPSAweEZGRkRcbiAgICAgIGJ5dGVzUGVyU2VxdWVuY2UgPSAxXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPiAweEZGRkYpIHtcbiAgICAgIC8vIGVuY29kZSB0byB1dGYxNiAoc3Vycm9nYXRlIHBhaXIgZGFuY2UpXG4gICAgICBjb2RlUG9pbnQgLT0gMHgxMDAwMFxuICAgICAgcmVzLnB1c2goY29kZVBvaW50ID4+PiAxMCAmIDB4M0ZGIHwgMHhEODAwKVxuICAgICAgY29kZVBvaW50ID0gMHhEQzAwIHwgY29kZVBvaW50ICYgMHgzRkZcbiAgICB9XG5cbiAgICByZXMucHVzaChjb2RlUG9pbnQpXG4gICAgaSArPSBieXRlc1BlclNlcXVlbmNlXG4gIH1cblxuICByZXR1cm4gZGVjb2RlQ29kZVBvaW50c0FycmF5KHJlcylcbn1cblxuLy8gQmFzZWQgb24gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMjI3NDcyNzIvNjgwNzQyLCB0aGUgYnJvd3NlciB3aXRoXG4vLyB0aGUgbG93ZXN0IGxpbWl0IGlzIENocm9tZSwgd2l0aCAweDEwMDAwIGFyZ3MuXG4vLyBXZSBnbyAxIG1hZ25pdHVkZSBsZXNzLCBmb3Igc2FmZXR5XG52YXIgTUFYX0FSR1VNRU5UU19MRU5HVEggPSAweDEwMDBcblxuZnVuY3Rpb24gZGVjb2RlQ29kZVBvaW50c0FycmF5IChjb2RlUG9pbnRzKSB7XG4gIHZhciBsZW4gPSBjb2RlUG9pbnRzLmxlbmd0aFxuICBpZiAobGVuIDw9IE1BWF9BUkdVTUVOVFNfTEVOR1RIKSB7XG4gICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkoU3RyaW5nLCBjb2RlUG9pbnRzKSAvLyBhdm9pZCBleHRyYSBzbGljZSgpXG4gIH1cblxuICAvLyBEZWNvZGUgaW4gY2h1bmtzIHRvIGF2b2lkIFwiY2FsbCBzdGFjayBzaXplIGV4Y2VlZGVkXCIuXG4gIHZhciByZXMgPSAnJ1xuICB2YXIgaSA9IDBcbiAgd2hpbGUgKGkgPCBsZW4pIHtcbiAgICByZXMgKz0gU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShcbiAgICAgIFN0cmluZyxcbiAgICAgIGNvZGVQb2ludHMuc2xpY2UoaSwgaSArPSBNQVhfQVJHVU1FTlRTX0xFTkdUSClcbiAgICApXG4gIH1cbiAgcmV0dXJuIHJlc1xufVxuXG5mdW5jdGlvbiBhc2NpaVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJldCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7ICsraSkge1xuICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSAmIDB4N0YpXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5mdW5jdGlvbiBsYXRpbjFTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciByZXQgPSAnJ1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyArK2kpIHtcbiAgICByZXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShidWZbaV0pXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5mdW5jdGlvbiBoZXhTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG5cbiAgaWYgKCFzdGFydCB8fCBzdGFydCA8IDApIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCB8fCBlbmQgPCAwIHx8IGVuZCA+IGxlbikgZW5kID0gbGVuXG5cbiAgdmFyIG91dCA9ICcnXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgKytpKSB7XG4gICAgb3V0ICs9IHRvSGV4KGJ1ZltpXSlcbiAgfVxuICByZXR1cm4gb3V0XG59XG5cbmZ1bmN0aW9uIHV0ZjE2bGVTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciBieXRlcyA9IGJ1Zi5zbGljZShzdGFydCwgZW5kKVxuICB2YXIgcmVzID0gJydcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBieXRlcy5sZW5ndGg7IGkgKz0gMikge1xuICAgIHJlcyArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ5dGVzW2ldICsgKGJ5dGVzW2kgKyAxXSAqIDI1NikpXG4gIH1cbiAgcmV0dXJuIHJlc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnNsaWNlID0gZnVuY3Rpb24gc2xpY2UgKHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIHN0YXJ0ID0gfn5zdGFydFxuICBlbmQgPSBlbmQgPT09IHVuZGVmaW5lZCA/IGxlbiA6IH5+ZW5kXG5cbiAgaWYgKHN0YXJ0IDwgMCkge1xuICAgIHN0YXJ0ICs9IGxlblxuICAgIGlmIChzdGFydCA8IDApIHN0YXJ0ID0gMFxuICB9IGVsc2UgaWYgKHN0YXJ0ID4gbGVuKSB7XG4gICAgc3RhcnQgPSBsZW5cbiAgfVxuXG4gIGlmIChlbmQgPCAwKSB7XG4gICAgZW5kICs9IGxlblxuICAgIGlmIChlbmQgPCAwKSBlbmQgPSAwXG4gIH0gZWxzZSBpZiAoZW5kID4gbGVuKSB7XG4gICAgZW5kID0gbGVuXG4gIH1cblxuICBpZiAoZW5kIDwgc3RhcnQpIGVuZCA9IHN0YXJ0XG5cbiAgdmFyIG5ld0J1ZiA9IHRoaXMuc3ViYXJyYXkoc3RhcnQsIGVuZClcbiAgLy8gUmV0dXJuIGFuIGF1Z21lbnRlZCBgVWludDhBcnJheWAgaW5zdGFuY2VcbiAgbmV3QnVmLl9fcHJvdG9fXyA9IEJ1ZmZlci5wcm90b3R5cGVcbiAgcmV0dXJuIG5ld0J1ZlxufVxuXG4vKlxuICogTmVlZCB0byBtYWtlIHN1cmUgdGhhdCBidWZmZXIgaXNuJ3QgdHJ5aW5nIHRvIHdyaXRlIG91dCBvZiBib3VuZHMuXG4gKi9cbmZ1bmN0aW9uIGNoZWNrT2Zmc2V0IChvZmZzZXQsIGV4dCwgbGVuZ3RoKSB7XG4gIGlmICgob2Zmc2V0ICUgMSkgIT09IDAgfHwgb2Zmc2V0IDwgMCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ29mZnNldCBpcyBub3QgdWludCcpXG4gIGlmIChvZmZzZXQgKyBleHQgPiBsZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdUcnlpbmcgdG8gYWNjZXNzIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludExFID0gZnVuY3Rpb24gcmVhZFVJbnRMRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIGldICogbXVsXG4gIH1cblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnRCRSA9IGZ1bmN0aW9uIHJlYWRVSW50QkUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuICB9XG5cbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0ICsgLS1ieXRlTGVuZ3RoXVxuICB2YXIgbXVsID0gMVxuICB3aGlsZSAoYnl0ZUxlbmd0aCA+IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyAtLWJ5dGVMZW5ndGhdICogbXVsXG4gIH1cblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQ4ID0gZnVuY3Rpb24gcmVhZFVJbnQ4IChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDEsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gdGhpc1tvZmZzZXRdXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQxNkxFID0gZnVuY3Rpb24gcmVhZFVJbnQxNkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gdGhpc1tvZmZzZXRdIHwgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2QkUgPSBmdW5jdGlvbiByZWFkVUludDE2QkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiAodGhpc1tvZmZzZXRdIDw8IDgpIHwgdGhpc1tvZmZzZXQgKyAxXVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJMRSA9IGZ1bmN0aW9uIHJlYWRVSW50MzJMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKCh0aGlzW29mZnNldF0pIHxcbiAgICAgICh0aGlzW29mZnNldCArIDFdIDw8IDgpIHxcbiAgICAgICh0aGlzW29mZnNldCArIDJdIDw8IDE2KSkgK1xuICAgICAgKHRoaXNbb2Zmc2V0ICsgM10gKiAweDEwMDAwMDApXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQzMkJFID0gZnVuY3Rpb24gcmVhZFVJbnQzMkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdICogMHgxMDAwMDAwKSArXG4gICAgKCh0aGlzW29mZnNldCArIDFdIDw8IDE2KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgOCkgfFxuICAgIHRoaXNbb2Zmc2V0ICsgM10pXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludExFID0gZnVuY3Rpb24gcmVhZEludExFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldF1cbiAgdmFyIG11bCA9IDFcbiAgdmFyIGkgPSAwXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgaV0gKiBtdWxcbiAgfVxuICBtdWwgKj0gMHg4MFxuXG4gIGlmICh2YWwgPj0gbXVsKSB2YWwgLT0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpXG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnRCRSA9IGZ1bmN0aW9uIHJlYWRJbnRCRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgaSA9IGJ5dGVMZW5ndGhcbiAgdmFyIG11bCA9IDFcbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0ICsgLS1pXVxuICB3aGlsZSAoaSA+IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyAtLWldICogbXVsXG4gIH1cbiAgbXVsICo9IDB4ODBcblxuICBpZiAodmFsID49IG11bCkgdmFsIC09IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50OCA9IGZ1bmN0aW9uIHJlYWRJbnQ4IChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDEsIHRoaXMubGVuZ3RoKVxuICBpZiAoISh0aGlzW29mZnNldF0gJiAweDgwKSkgcmV0dXJuICh0aGlzW29mZnNldF0pXG4gIHJldHVybiAoKDB4ZmYgLSB0aGlzW29mZnNldF0gKyAxKSAqIC0xKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkxFID0gZnVuY3Rpb24gcmVhZEludDE2TEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldF0gfCAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KVxuICByZXR1cm4gKHZhbCAmIDB4ODAwMCkgPyB2YWwgfCAweEZGRkYwMDAwIDogdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDE2QkUgPSBmdW5jdGlvbiByZWFkSW50MTZCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0ICsgMV0gfCAodGhpc1tvZmZzZXRdIDw8IDgpXG4gIHJldHVybiAodmFsICYgMHg4MDAwKSA/IHZhbCB8IDB4RkZGRjAwMDAgOiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MzJMRSA9IGZ1bmN0aW9uIHJlYWRJbnQzMkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdKSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOCkgfFxuICAgICh0aGlzW29mZnNldCArIDJdIDw8IDE2KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgM10gPDwgMjQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyQkUgPSBmdW5jdGlvbiByZWFkSW50MzJCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSA8PCAyNCkgfFxuICAgICh0aGlzW29mZnNldCArIDFdIDw8IDE2KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgOCkgfFxuICAgICh0aGlzW29mZnNldCArIDNdKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdExFID0gZnVuY3Rpb24gcmVhZEZsb2F0TEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCB0cnVlLCAyMywgNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRmxvYXRCRSA9IGZ1bmN0aW9uIHJlYWRGbG9hdEJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgZmFsc2UsIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVMRSA9IGZ1bmN0aW9uIHJlYWREb3VibGVMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA4LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIHRydWUsIDUyLCA4KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVCRSA9IGZ1bmN0aW9uIHJlYWREb3VibGVCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA4LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIGZhbHNlLCA1MiwgOClcbn1cblxuZnVuY3Rpb24gY2hlY2tJbnQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgZXh0LCBtYXgsIG1pbikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihidWYpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdcImJ1ZmZlclwiIGFyZ3VtZW50IG11c3QgYmUgYSBCdWZmZXIgaW5zdGFuY2UnKVxuICBpZiAodmFsdWUgPiBtYXggfHwgdmFsdWUgPCBtaW4pIHRocm93IG5ldyBSYW5nZUVycm9yKCdcInZhbHVlXCIgYXJndW1lbnQgaXMgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChvZmZzZXQgKyBleHQgPiBidWYubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW5kZXggb3V0IG9mIHJhbmdlJylcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnRMRSA9IGZ1bmN0aW9uIHdyaXRlVUludExFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBtYXhCeXRlcyA9IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKSAtIDFcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBtYXhCeXRlcywgMClcbiAgfVxuXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB0aGlzW29mZnNldF0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB0aGlzW29mZnNldCArIGldID0gKHZhbHVlIC8gbXVsKSAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50QkUgPSBmdW5jdGlvbiB3cml0ZVVJbnRCRSAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICB2YXIgbWF4Qnl0ZXMgPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCkgLSAxXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbWF4Qnl0ZXMsIDApXG4gIH1cblxuICB2YXIgaSA9IGJ5dGVMZW5ndGggLSAxXG4gIHZhciBtdWwgPSAxXG4gIHRoaXNbb2Zmc2V0ICsgaV0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKC0taSA+PSAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICh2YWx1ZSAvIG11bCkgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDggPSBmdW5jdGlvbiB3cml0ZVVJbnQ4ICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMSwgMHhmZiwgMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDFcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQxNkxFID0gZnVuY3Rpb24gd3JpdGVVSW50MTZMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4ZmZmZiwgMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQxNkJFID0gZnVuY3Rpb24gd3JpdGVVSW50MTZCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4ZmZmZiwgMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiA4KVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQzMkxFID0gZnVuY3Rpb24gd3JpdGVVSW50MzJMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4ZmZmZmZmZmYsIDApXG4gIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgPj4+IDI0KVxuICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiAxNilcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQzMkJFID0gZnVuY3Rpb24gd3JpdGVVSW50MzJCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4ZmZmZmZmZmYsIDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gMjQpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDE2KVxuICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiA4KVxuICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludExFID0gZnVuY3Rpb24gd3JpdGVJbnRMRSAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICB2YXIgbGltaXQgPSBNYXRoLnBvdygyLCAoOCAqIGJ5dGVMZW5ndGgpIC0gMSlcblxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIGxpbWl0IC0gMSwgLWxpbWl0KVxuICB9XG5cbiAgdmFyIGkgPSAwXG4gIHZhciBtdWwgPSAxXG4gIHZhciBzdWIgPSAwXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIGlmICh2YWx1ZSA8IDAgJiYgc3ViID09PSAwICYmIHRoaXNbb2Zmc2V0ICsgaSAtIDFdICE9PSAwKSB7XG4gICAgICBzdWIgPSAxXG4gICAgfVxuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAoKHZhbHVlIC8gbXVsKSA+PiAwKSAtIHN1YiAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnRCRSA9IGZ1bmN0aW9uIHdyaXRlSW50QkUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgdmFyIGxpbWl0ID0gTWF0aC5wb3coMiwgKDggKiBieXRlTGVuZ3RoKSAtIDEpXG5cbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBsaW1pdCAtIDEsIC1saW1pdClcbiAgfVxuXG4gIHZhciBpID0gYnl0ZUxlbmd0aCAtIDFcbiAgdmFyIG11bCA9IDFcbiAgdmFyIHN1YiA9IDBcbiAgdGhpc1tvZmZzZXQgKyBpXSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoLS1pID49IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICBpZiAodmFsdWUgPCAwICYmIHN1YiA9PT0gMCAmJiB0aGlzW29mZnNldCArIGkgKyAxXSAhPT0gMCkge1xuICAgICAgc3ViID0gMVxuICAgIH1cbiAgICB0aGlzW29mZnNldCArIGldID0gKCh2YWx1ZSAvIG11bCkgPj4gMCkgLSBzdWIgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50OCA9IGZ1bmN0aW9uIHdyaXRlSW50OCAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDEsIDB4N2YsIC0weDgwKVxuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmYgKyB2YWx1ZSArIDFcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDFcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDE2TEUgPSBmdW5jdGlvbiB3cml0ZUludDE2TEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweDdmZmYsIC0weDgwMDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkJFID0gZnVuY3Rpb24gd3JpdGVJbnQxNkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHg3ZmZmLCAtMHg4MDAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDgpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MzJMRSA9IGZ1bmN0aW9uIHdyaXRlSW50MzJMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4N2ZmZmZmZmYsIC0weDgwMDAwMDAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiAxNilcbiAgdGhpc1tvZmZzZXQgKyAzXSA9ICh2YWx1ZSA+Pj4gMjQpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQzMkJFID0gZnVuY3Rpb24gd3JpdGVJbnQzMkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHg3ZmZmZmZmZiwgLTB4ODAwMDAwMDApXG4gIGlmICh2YWx1ZSA8IDApIHZhbHVlID0gMHhmZmZmZmZmZiArIHZhbHVlICsgMVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDI0KVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiAxNilcbiAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gOClcbiAgdGhpc1tvZmZzZXQgKyAzXSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbmZ1bmN0aW9uIGNoZWNrSUVFRTc1NCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBleHQsIG1heCwgbWluKSB7XG4gIGlmIChvZmZzZXQgKyBleHQgPiBidWYubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW5kZXggb3V0IG9mIHJhbmdlJylcbiAgaWYgKG9mZnNldCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbmRleCBvdXQgb2YgcmFuZ2UnKVxufVxuXG5mdW5jdGlvbiB3cml0ZUZsb2F0IChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBjaGVja0lFRUU3NTQoYnVmLCB2YWx1ZSwgb2Zmc2V0LCA0LCAzLjQwMjgyMzQ2NjM4NTI4ODZlKzM4LCAtMy40MDI4MjM0NjYzODUyODg2ZSszOClcbiAgfVxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCAyMywgNClcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUZsb2F0TEUgPSBmdW5jdGlvbiB3cml0ZUZsb2F0TEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRCRSA9IGZ1bmN0aW9uIHdyaXRlRmxvYXRCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRmxvYXQodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiB3cml0ZURvdWJsZSAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgY2hlY2tJRUVFNzU0KGJ1ZiwgdmFsdWUsIG9mZnNldCwgOCwgMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgsIC0xLjc5NzY5MzEzNDg2MjMxNTdFKzMwOClcbiAgfVxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCA1MiwgOClcbiAgcmV0dXJuIG9mZnNldCArIDhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUxFID0gZnVuY3Rpb24gd3JpdGVEb3VibGVMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRG91YmxlKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRG91YmxlQkUgPSBmdW5jdGlvbiB3cml0ZURvdWJsZUJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVEb3VibGUodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG4vLyBjb3B5KHRhcmdldEJ1ZmZlciwgdGFyZ2V0U3RhcnQ9MCwgc291cmNlU3RhcnQ9MCwgc291cmNlRW5kPWJ1ZmZlci5sZW5ndGgpXG5CdWZmZXIucHJvdG90eXBlLmNvcHkgPSBmdW5jdGlvbiBjb3B5ICh0YXJnZXQsIHRhcmdldFN0YXJ0LCBzdGFydCwgZW5kKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKHRhcmdldCkpIHRocm93IG5ldyBUeXBlRXJyb3IoJ2FyZ3VtZW50IHNob3VsZCBiZSBhIEJ1ZmZlcicpXG4gIGlmICghc3RhcnQpIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCAmJiBlbmQgIT09IDApIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmICh0YXJnZXRTdGFydCA+PSB0YXJnZXQubGVuZ3RoKSB0YXJnZXRTdGFydCA9IHRhcmdldC5sZW5ndGhcbiAgaWYgKCF0YXJnZXRTdGFydCkgdGFyZ2V0U3RhcnQgPSAwXG4gIGlmIChlbmQgPiAwICYmIGVuZCA8IHN0YXJ0KSBlbmQgPSBzdGFydFxuXG4gIC8vIENvcHkgMCBieXRlczsgd2UncmUgZG9uZVxuICBpZiAoZW5kID09PSBzdGFydCkgcmV0dXJuIDBcbiAgaWYgKHRhcmdldC5sZW5ndGggPT09IDAgfHwgdGhpcy5sZW5ndGggPT09IDApIHJldHVybiAwXG5cbiAgLy8gRmF0YWwgZXJyb3IgY29uZGl0aW9uc1xuICBpZiAodGFyZ2V0U3RhcnQgPCAwKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3RhcmdldFN0YXJ0IG91dCBvZiBib3VuZHMnKVxuICB9XG4gIGlmIChzdGFydCA8IDAgfHwgc3RhcnQgPj0gdGhpcy5sZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbmRleCBvdXQgb2YgcmFuZ2UnKVxuICBpZiAoZW5kIDwgMCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3NvdXJjZUVuZCBvdXQgb2YgYm91bmRzJylcblxuICAvLyBBcmUgd2Ugb29iP1xuICBpZiAoZW5kID4gdGhpcy5sZW5ndGgpIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmICh0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0U3RhcnQgPCBlbmQgLSBzdGFydCkge1xuICAgIGVuZCA9IHRhcmdldC5sZW5ndGggLSB0YXJnZXRTdGFydCArIHN0YXJ0XG4gIH1cblxuICB2YXIgbGVuID0gZW5kIC0gc3RhcnRcblxuICBpZiAodGhpcyA9PT0gdGFyZ2V0ICYmIHR5cGVvZiBVaW50OEFycmF5LnByb3RvdHlwZS5jb3B5V2l0aGluID09PSAnZnVuY3Rpb24nKSB7XG4gICAgLy8gVXNlIGJ1aWx0LWluIHdoZW4gYXZhaWxhYmxlLCBtaXNzaW5nIGZyb20gSUUxMVxuICAgIHRoaXMuY29weVdpdGhpbih0YXJnZXRTdGFydCwgc3RhcnQsIGVuZClcbiAgfSBlbHNlIGlmICh0aGlzID09PSB0YXJnZXQgJiYgc3RhcnQgPCB0YXJnZXRTdGFydCAmJiB0YXJnZXRTdGFydCA8IGVuZCkge1xuICAgIC8vIGRlc2NlbmRpbmcgY29weSBmcm9tIGVuZFxuICAgIGZvciAodmFyIGkgPSBsZW4gLSAxOyBpID49IDA7IC0taSkge1xuICAgICAgdGFyZ2V0W2kgKyB0YXJnZXRTdGFydF0gPSB0aGlzW2kgKyBzdGFydF1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgVWludDhBcnJheS5wcm90b3R5cGUuc2V0LmNhbGwoXG4gICAgICB0YXJnZXQsXG4gICAgICB0aGlzLnN1YmFycmF5KHN0YXJ0LCBlbmQpLFxuICAgICAgdGFyZ2V0U3RhcnRcbiAgICApXG4gIH1cblxuICByZXR1cm4gbGVuXG59XG5cbi8vIFVzYWdlOlxuLy8gICAgYnVmZmVyLmZpbGwobnVtYmVyWywgb2Zmc2V0WywgZW5kXV0pXG4vLyAgICBidWZmZXIuZmlsbChidWZmZXJbLCBvZmZzZXRbLCBlbmRdXSlcbi8vICAgIGJ1ZmZlci5maWxsKHN0cmluZ1ssIG9mZnNldFssIGVuZF1dWywgZW5jb2RpbmddKVxuQnVmZmVyLnByb3RvdHlwZS5maWxsID0gZnVuY3Rpb24gZmlsbCAodmFsLCBzdGFydCwgZW5kLCBlbmNvZGluZykge1xuICAvLyBIYW5kbGUgc3RyaW5nIGNhc2VzOlxuICBpZiAodHlwZW9mIHZhbCA9PT0gJ3N0cmluZycpIHtcbiAgICBpZiAodHlwZW9mIHN0YXJ0ID09PSAnc3RyaW5nJykge1xuICAgICAgZW5jb2RpbmcgPSBzdGFydFxuICAgICAgc3RhcnQgPSAwXG4gICAgICBlbmQgPSB0aGlzLmxlbmd0aFxuICAgIH0gZWxzZSBpZiAodHlwZW9mIGVuZCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGVuY29kaW5nID0gZW5kXG4gICAgICBlbmQgPSB0aGlzLmxlbmd0aFxuICAgIH1cbiAgICBpZiAoZW5jb2RpbmcgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2YgZW5jb2RpbmcgIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdlbmNvZGluZyBtdXN0IGJlIGEgc3RyaW5nJylcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBlbmNvZGluZyA9PT0gJ3N0cmluZycgJiYgIUJ1ZmZlci5pc0VuY29kaW5nKGVuY29kaW5nKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5rbm93biBlbmNvZGluZzogJyArIGVuY29kaW5nKVxuICAgIH1cbiAgICBpZiAodmFsLmxlbmd0aCA9PT0gMSkge1xuICAgICAgdmFyIGNvZGUgPSB2YWwuY2hhckNvZGVBdCgwKVxuICAgICAgaWYgKChlbmNvZGluZyA9PT0gJ3V0ZjgnICYmIGNvZGUgPCAxMjgpIHx8XG4gICAgICAgICAgZW5jb2RpbmcgPT09ICdsYXRpbjEnKSB7XG4gICAgICAgIC8vIEZhc3QgcGF0aDogSWYgYHZhbGAgZml0cyBpbnRvIGEgc2luZ2xlIGJ5dGUsIHVzZSB0aGF0IG51bWVyaWMgdmFsdWUuXG4gICAgICAgIHZhbCA9IGNvZGVcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSBpZiAodHlwZW9mIHZhbCA9PT0gJ251bWJlcicpIHtcbiAgICB2YWwgPSB2YWwgJiAyNTVcbiAgfVxuXG4gIC8vIEludmFsaWQgcmFuZ2VzIGFyZSBub3Qgc2V0IHRvIGEgZGVmYXVsdCwgc28gY2FuIHJhbmdlIGNoZWNrIGVhcmx5LlxuICBpZiAoc3RhcnQgPCAwIHx8IHRoaXMubGVuZ3RoIDwgc3RhcnQgfHwgdGhpcy5sZW5ndGggPCBlbmQpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignT3V0IG9mIHJhbmdlIGluZGV4JylcbiAgfVxuXG4gIGlmIChlbmQgPD0gc3RhcnQpIHtcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgc3RhcnQgPSBzdGFydCA+Pj4gMFxuICBlbmQgPSBlbmQgPT09IHVuZGVmaW5lZCA/IHRoaXMubGVuZ3RoIDogZW5kID4+PiAwXG5cbiAgaWYgKCF2YWwpIHZhbCA9IDBcblxuICB2YXIgaVxuICBpZiAodHlwZW9mIHZhbCA9PT0gJ251bWJlcicpIHtcbiAgICBmb3IgKGkgPSBzdGFydDsgaSA8IGVuZDsgKytpKSB7XG4gICAgICB0aGlzW2ldID0gdmFsXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhciBieXRlcyA9IEJ1ZmZlci5pc0J1ZmZlcih2YWwpXG4gICAgICA/IHZhbFxuICAgICAgOiBCdWZmZXIuZnJvbSh2YWwsIGVuY29kaW5nKVxuICAgIHZhciBsZW4gPSBieXRlcy5sZW5ndGhcbiAgICBpZiAobGVuID09PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgdmFsdWUgXCInICsgdmFsICtcbiAgICAgICAgJ1wiIGlzIGludmFsaWQgZm9yIGFyZ3VtZW50IFwidmFsdWVcIicpXG4gICAgfVxuICAgIGZvciAoaSA9IDA7IGkgPCBlbmQgLSBzdGFydDsgKytpKSB7XG4gICAgICB0aGlzW2kgKyBzdGFydF0gPSBieXRlc1tpICUgbGVuXVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzXG59XG5cbi8vIEhFTFBFUiBGVU5DVElPTlNcbi8vID09PT09PT09PT09PT09PT1cblxudmFyIElOVkFMSURfQkFTRTY0X1JFID0gL1teKy8wLTlBLVphLXotX10vZ1xuXG5mdW5jdGlvbiBiYXNlNjRjbGVhbiAoc3RyKSB7XG4gIC8vIE5vZGUgdGFrZXMgZXF1YWwgc2lnbnMgYXMgZW5kIG9mIHRoZSBCYXNlNjQgZW5jb2RpbmdcbiAgc3RyID0gc3RyLnNwbGl0KCc9JylbMF1cbiAgLy8gTm9kZSBzdHJpcHMgb3V0IGludmFsaWQgY2hhcmFjdGVycyBsaWtlIFxcbiBhbmQgXFx0IGZyb20gdGhlIHN0cmluZywgYmFzZTY0LWpzIGRvZXMgbm90XG4gIHN0ciA9IHN0ci50cmltKCkucmVwbGFjZShJTlZBTElEX0JBU0U2NF9SRSwgJycpXG4gIC8vIE5vZGUgY29udmVydHMgc3RyaW5ncyB3aXRoIGxlbmd0aCA8IDIgdG8gJydcbiAgaWYgKHN0ci5sZW5ndGggPCAyKSByZXR1cm4gJydcbiAgLy8gTm9kZSBhbGxvd3MgZm9yIG5vbi1wYWRkZWQgYmFzZTY0IHN0cmluZ3MgKG1pc3NpbmcgdHJhaWxpbmcgPT09KSwgYmFzZTY0LWpzIGRvZXMgbm90XG4gIHdoaWxlIChzdHIubGVuZ3RoICUgNCAhPT0gMCkge1xuICAgIHN0ciA9IHN0ciArICc9J1xuICB9XG4gIHJldHVybiBzdHJcbn1cblxuZnVuY3Rpb24gdG9IZXggKG4pIHtcbiAgaWYgKG4gPCAxNikgcmV0dXJuICcwJyArIG4udG9TdHJpbmcoMTYpXG4gIHJldHVybiBuLnRvU3RyaW5nKDE2KVxufVxuXG5mdW5jdGlvbiB1dGY4VG9CeXRlcyAoc3RyaW5nLCB1bml0cykge1xuICB1bml0cyA9IHVuaXRzIHx8IEluZmluaXR5XG4gIHZhciBjb2RlUG9pbnRcbiAgdmFyIGxlbmd0aCA9IHN0cmluZy5sZW5ndGhcbiAgdmFyIGxlYWRTdXJyb2dhdGUgPSBudWxsXG4gIHZhciBieXRlcyA9IFtdXG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgIGNvZGVQb2ludCA9IHN0cmluZy5jaGFyQ29kZUF0KGkpXG5cbiAgICAvLyBpcyBzdXJyb2dhdGUgY29tcG9uZW50XG4gICAgaWYgKGNvZGVQb2ludCA+IDB4RDdGRiAmJiBjb2RlUG9pbnQgPCAweEUwMDApIHtcbiAgICAgIC8vIGxhc3QgY2hhciB3YXMgYSBsZWFkXG4gICAgICBpZiAoIWxlYWRTdXJyb2dhdGUpIHtcbiAgICAgICAgLy8gbm8gbGVhZCB5ZXRcbiAgICAgICAgaWYgKGNvZGVQb2ludCA+IDB4REJGRikge1xuICAgICAgICAgIC8vIHVuZXhwZWN0ZWQgdHJhaWxcbiAgICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9IGVsc2UgaWYgKGkgKyAxID09PSBsZW5ndGgpIHtcbiAgICAgICAgICAvLyB1bnBhaXJlZCBsZWFkXG4gICAgICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHZhbGlkIGxlYWRcbiAgICAgICAgbGVhZFN1cnJvZ2F0ZSA9IGNvZGVQb2ludFxuXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIC8vIDIgbGVhZHMgaW4gYSByb3dcbiAgICAgIGlmIChjb2RlUG9pbnQgPCAweERDMDApIHtcbiAgICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgICAgIGxlYWRTdXJyb2dhdGUgPSBjb2RlUG9pbnRcbiAgICAgICAgY29udGludWVcbiAgICAgIH1cblxuICAgICAgLy8gdmFsaWQgc3Vycm9nYXRlIHBhaXJcbiAgICAgIGNvZGVQb2ludCA9IChsZWFkU3Vycm9nYXRlIC0gMHhEODAwIDw8IDEwIHwgY29kZVBvaW50IC0gMHhEQzAwKSArIDB4MTAwMDBcbiAgICB9IGVsc2UgaWYgKGxlYWRTdXJyb2dhdGUpIHtcbiAgICAgIC8vIHZhbGlkIGJtcCBjaGFyLCBidXQgbGFzdCBjaGFyIHdhcyBhIGxlYWRcbiAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgIH1cblxuICAgIGxlYWRTdXJyb2dhdGUgPSBudWxsXG5cbiAgICAvLyBlbmNvZGUgdXRmOFxuICAgIGlmIChjb2RlUG9pbnQgPCAweDgwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDEpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goY29kZVBvaW50KVxuICAgIH0gZWxzZSBpZiAoY29kZVBvaW50IDwgMHg4MDApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMikgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChcbiAgICAgICAgY29kZVBvaW50ID4+IDB4NiB8IDB4QzAsXG4gICAgICAgIGNvZGVQb2ludCAmIDB4M0YgfCAweDgwXG4gICAgICApXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDEwMDAwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDMpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goXG4gICAgICAgIGNvZGVQb2ludCA+PiAweEMgfCAweEUwLFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2ICYgMHgzRiB8IDB4ODAsXG4gICAgICAgIGNvZGVQb2ludCAmIDB4M0YgfCAweDgwXG4gICAgICApXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDExMDAwMCkge1xuICAgICAgaWYgKCh1bml0cyAtPSA0KSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHgxMiB8IDB4RjAsXG4gICAgICAgIGNvZGVQb2ludCA+PiAweEMgJiAweDNGIHwgMHg4MCxcbiAgICAgICAgY29kZVBvaW50ID4+IDB4NiAmIDB4M0YgfCAweDgwLFxuICAgICAgICBjb2RlUG9pbnQgJiAweDNGIHwgMHg4MFxuICAgICAgKVxuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgY29kZSBwb2ludCcpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGJ5dGVzXG59XG5cbmZ1bmN0aW9uIGFzY2lpVG9CeXRlcyAoc3RyKSB7XG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7ICsraSkge1xuICAgIC8vIE5vZGUncyBjb2RlIHNlZW1zIHRvIGJlIGRvaW5nIHRoaXMgYW5kIG5vdCAmIDB4N0YuLlxuICAgIGJ5dGVBcnJheS5wdXNoKHN0ci5jaGFyQ29kZUF0KGkpICYgMHhGRilcbiAgfVxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIHV0ZjE2bGVUb0J5dGVzIChzdHIsIHVuaXRzKSB7XG4gIHZhciBjLCBoaSwgbG9cbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgKytpKSB7XG4gICAgaWYgKCh1bml0cyAtPSAyKSA8IDApIGJyZWFrXG5cbiAgICBjID0gc3RyLmNoYXJDb2RlQXQoaSlcbiAgICBoaSA9IGMgPj4gOFxuICAgIGxvID0gYyAlIDI1NlxuICAgIGJ5dGVBcnJheS5wdXNoKGxvKVxuICAgIGJ5dGVBcnJheS5wdXNoKGhpKVxuICB9XG5cbiAgcmV0dXJuIGJ5dGVBcnJheVxufVxuXG5mdW5jdGlvbiBiYXNlNjRUb0J5dGVzIChzdHIpIHtcbiAgcmV0dXJuIGJhc2U2NC50b0J5dGVBcnJheShiYXNlNjRjbGVhbihzdHIpKVxufVxuXG5mdW5jdGlvbiBibGl0QnVmZmVyIChzcmMsIGRzdCwgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgIGlmICgoaSArIG9mZnNldCA+PSBkc3QubGVuZ3RoKSB8fCAoaSA+PSBzcmMubGVuZ3RoKSkgYnJlYWtcbiAgICBkc3RbaSArIG9mZnNldF0gPSBzcmNbaV1cbiAgfVxuICByZXR1cm4gaVxufVxuXG4vLyBBcnJheUJ1ZmZlciBvciBVaW50OEFycmF5IG9iamVjdHMgZnJvbSBvdGhlciBjb250ZXh0cyAoaS5lLiBpZnJhbWVzKSBkbyBub3QgcGFzc1xuLy8gdGhlIGBpbnN0YW5jZW9mYCBjaGVjayBidXQgdGhleSBzaG91bGQgYmUgdHJlYXRlZCBhcyBvZiB0aGF0IHR5cGUuXG4vLyBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9mZXJvc3MvYnVmZmVyL2lzc3Vlcy8xNjZcbmZ1bmN0aW9uIGlzSW5zdGFuY2UgKG9iaiwgdHlwZSkge1xuICByZXR1cm4gb2JqIGluc3RhbmNlb2YgdHlwZSB8fFxuICAgIChvYmogIT0gbnVsbCAmJiBvYmouY29uc3RydWN0b3IgIT0gbnVsbCAmJiBvYmouY29uc3RydWN0b3IubmFtZSAhPSBudWxsICYmXG4gICAgICBvYmouY29uc3RydWN0b3IubmFtZSA9PT0gdHlwZS5uYW1lKVxufVxuZnVuY3Rpb24gbnVtYmVySXNOYU4gKG9iaikge1xuICAvLyBGb3IgSUUxMSBzdXBwb3J0XG4gIHJldHVybiBvYmogIT09IG9iaiAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXNlbGYtY29tcGFyZVxufVxuIiwiIWZ1bmN0aW9uKHQsZSl7XCJvYmplY3RcIj09dHlwZW9mIGV4cG9ydHMmJlwidW5kZWZpbmVkXCIhPXR5cGVvZiBtb2R1bGU/ZShleHBvcnRzKTpcImZ1bmN0aW9uXCI9PXR5cGVvZiBkZWZpbmUmJmRlZmluZS5hbWQ/ZGVmaW5lKFtcImV4cG9ydHNcIl0sZSk6ZSgodD10fHxzZWxmKS5EQVBqcz17fSl9KHRoaXMsKGZ1bmN0aW9uKHQpe1widXNlIHN0cmljdFwiO1xuLyohICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgQ29weXJpZ2h0IChjKSBNaWNyb3NvZnQgQ29ycG9yYXRpb24uIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gICAgTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlXG4gICAgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGVcbiAgICBMaWNlbnNlIGF0IGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuXG4gICAgVEhJUyBDT0RFIElTIFBST1ZJREVEIE9OIEFOICpBUyBJUyogQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuICAgIEtJTkQsIEVJVEhFUiBFWFBSRVNTIE9SIElNUExJRUQsIElOQ0xVRElORyBXSVRIT1VUIExJTUlUQVRJT04gQU5ZIElNUExJRURcbiAgICBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgVElUTEUsIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLFxuICAgIE1FUkNIQU5UQUJMSVRZIE9SIE5PTi1JTkZSSU5HRU1FTlQuXG5cbiAgICBTZWUgdGhlIEFwYWNoZSBWZXJzaW9uIDIuMCBMaWNlbnNlIGZvciBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnNcbiAgICBhbmQgbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gICAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiogKi92YXIgZT1mdW5jdGlvbih0LHIpe3JldHVybihlPU9iamVjdC5zZXRQcm90b3R5cGVPZnx8e19fcHJvdG9fXzpbXX1pbnN0YW5jZW9mIEFycmF5JiZmdW5jdGlvbih0LGUpe3QuX19wcm90b19fPWV9fHxmdW5jdGlvbih0LGUpe2Zvcih2YXIgciBpbiBlKWUuaGFzT3duUHJvcGVydHkocikmJih0W3JdPWVbcl0pfSkodCxyKX07ZnVuY3Rpb24gcih0LHIpe2Z1bmN0aW9uIG4oKXt0aGlzLmNvbnN0cnVjdG9yPXR9ZSh0LHIpLHQucHJvdG90eXBlPW51bGw9PT1yP09iamVjdC5jcmVhdGUocik6KG4ucHJvdG90eXBlPXIucHJvdG90eXBlLG5ldyBuKX1mdW5jdGlvbiBuKHQsZSxyLG4pe3JldHVybiBuZXcocnx8KHI9UHJvbWlzZSkpKChmdW5jdGlvbihpLHMpe2Z1bmN0aW9uIG8odCl7dHJ5e2Mobi5uZXh0KHQpKX1jYXRjaCh0KXtzKHQpfX1mdW5jdGlvbiB1KHQpe3RyeXtjKG4udGhyb3codCkpfWNhdGNoKHQpe3ModCl9fWZ1bmN0aW9uIGModCl7dmFyIGU7dC5kb25lP2kodC52YWx1ZSk6KGU9dC52YWx1ZSxlIGluc3RhbmNlb2Ygcj9lOm5ldyByKChmdW5jdGlvbih0KXt0KGUpfSkpKS50aGVuKG8sdSl9Yygobj1uLmFwcGx5KHQsZXx8W10pKS5uZXh0KCkpfSkpfWZ1bmN0aW9uIGkodCxlKXt2YXIgcixuLGkscyxvPXtsYWJlbDowLHNlbnQ6ZnVuY3Rpb24oKXtpZigxJmlbMF0pdGhyb3cgaVsxXTtyZXR1cm4gaVsxXX0sdHJ5czpbXSxvcHM6W119O3JldHVybiBzPXtuZXh0OnUoMCksdGhyb3c6dSgxKSxyZXR1cm46dSgyKX0sXCJmdW5jdGlvblwiPT10eXBlb2YgU3ltYm9sJiYoc1tTeW1ib2wuaXRlcmF0b3JdPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXN9KSxzO2Z1bmN0aW9uIHUocyl7cmV0dXJuIGZ1bmN0aW9uKHUpe3JldHVybiBmdW5jdGlvbihzKXtpZihyKXRocm93IG5ldyBUeXBlRXJyb3IoXCJHZW5lcmF0b3IgaXMgYWxyZWFkeSBleGVjdXRpbmcuXCIpO2Zvcig7bzspdHJ5e2lmKHI9MSxuJiYoaT0yJnNbMF0/bi5yZXR1cm46c1swXT9uLnRocm93fHwoKGk9bi5yZXR1cm4pJiZpLmNhbGwobiksMCk6bi5uZXh0KSYmIShpPWkuY2FsbChuLHNbMV0pKS5kb25lKXJldHVybiBpO3N3aXRjaChuPTAsaSYmKHM9WzImc1swXSxpLnZhbHVlXSksc1swXSl7Y2FzZSAwOmNhc2UgMTppPXM7YnJlYWs7Y2FzZSA0OnJldHVybiBvLmxhYmVsKysse3ZhbHVlOnNbMV0sZG9uZTohMX07Y2FzZSA1Om8ubGFiZWwrKyxuPXNbMV0scz1bMF07Y29udGludWU7Y2FzZSA3OnM9by5vcHMucG9wKCksby50cnlzLnBvcCgpO2NvbnRpbnVlO2RlZmF1bHQ6aWYoIShpPW8udHJ5cywoaT1pLmxlbmd0aD4wJiZpW2kubGVuZ3RoLTFdKXx8NiE9PXNbMF0mJjIhPT1zWzBdKSl7bz0wO2NvbnRpbnVlfWlmKDM9PT1zWzBdJiYoIWl8fHNbMV0+aVswXSYmc1sxXTxpWzNdKSl7by5sYWJlbD1zWzFdO2JyZWFrfWlmKDY9PT1zWzBdJiZvLmxhYmVsPGlbMV0pe28ubGFiZWw9aVsxXSxpPXM7YnJlYWt9aWYoaSYmby5sYWJlbDxpWzJdKXtvLmxhYmVsPWlbMl0sby5vcHMucHVzaChzKTticmVha31pWzJdJiZvLm9wcy5wb3AoKSxvLnRyeXMucG9wKCk7Y29udGludWV9cz1lLmNhbGwodCxvKX1jYXRjaCh0KXtzPVs2LHRdLG49MH1maW5hbGx5e3I9aT0wfWlmKDUmc1swXSl0aHJvdyBzWzFdO3JldHVybnt2YWx1ZTpzWzBdP3NbMV06dm9pZCAwLGRvbmU6ITB9fShbcyx1XSl9fX1mdW5jdGlvbiBzKCl7fWZ1bmN0aW9uIG8oKXtvLmluaXQuY2FsbCh0aGlzKX1mdW5jdGlvbiB1KHQpe3JldHVybiB2b2lkIDA9PT10Ll9tYXhMaXN0ZW5lcnM/by5kZWZhdWx0TWF4TGlzdGVuZXJzOnQuX21heExpc3RlbmVyc31mdW5jdGlvbiBjKHQsZSxyKXtpZihlKXQuY2FsbChyKTtlbHNlIGZvcih2YXIgbj10Lmxlbmd0aCxpPXcodCxuKSxzPTA7czxuOysrcylpW3NdLmNhbGwocil9ZnVuY3Rpb24gYSh0LGUscixuKXtpZihlKXQuY2FsbChyLG4pO2Vsc2UgZm9yKHZhciBpPXQubGVuZ3RoLHM9dyh0LGkpLG89MDtvPGk7KytvKXNbb10uY2FsbChyLG4pfWZ1bmN0aW9uIGgodCxlLHIsbixpKXtpZihlKXQuY2FsbChyLG4saSk7ZWxzZSBmb3IodmFyIHM9dC5sZW5ndGgsbz13KHQscyksdT0wO3U8czsrK3Upb1t1XS5jYWxsKHIsbixpKX1mdW5jdGlvbiBmKHQsZSxyLG4saSxzKXtpZihlKXQuY2FsbChyLG4saSxzKTtlbHNlIGZvcih2YXIgbz10Lmxlbmd0aCx1PXcodCxvKSxjPTA7YzxvOysrYyl1W2NdLmNhbGwocixuLGkscyl9ZnVuY3Rpb24gbCh0LGUscixuKXtpZihlKXQuYXBwbHkocixuKTtlbHNlIGZvcih2YXIgaT10Lmxlbmd0aCxzPXcodCxpKSxvPTA7bzxpOysrbylzW29dLmFwcGx5KHIsbil9ZnVuY3Rpb24gZCh0LGUscixuKXt2YXIgaSxvLGMsYTtpZihcImZ1bmN0aW9uXCIhPXR5cGVvZiByKXRocm93IG5ldyBUeXBlRXJyb3IoJ1wibGlzdGVuZXJcIiBhcmd1bWVudCBtdXN0IGJlIGEgZnVuY3Rpb24nKTtpZigobz10Ll9ldmVudHMpPyhvLm5ld0xpc3RlbmVyJiYodC5lbWl0KFwibmV3TGlzdGVuZXJcIixlLHIubGlzdGVuZXI/ci5saXN0ZW5lcjpyKSxvPXQuX2V2ZW50cyksYz1vW2VdKToobz10Ll9ldmVudHM9bmV3IHMsdC5fZXZlbnRzQ291bnQ9MCksYyl7aWYoXCJmdW5jdGlvblwiPT10eXBlb2YgYz9jPW9bZV09bj9bcixjXTpbYyxyXTpuP2MudW5zaGlmdChyKTpjLnB1c2gociksIWMud2FybmVkJiYoaT11KHQpKSYmaT4wJiZjLmxlbmd0aD5pKXtjLndhcm5lZD0hMDt2YXIgaD1uZXcgRXJyb3IoXCJQb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5IGxlYWsgZGV0ZWN0ZWQuIFwiK2MubGVuZ3RoK1wiIFwiK2UrXCIgbGlzdGVuZXJzIGFkZGVkLiBVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdFwiKTtoLm5hbWU9XCJNYXhMaXN0ZW5lcnNFeGNlZWRlZFdhcm5pbmdcIixoLmVtaXR0ZXI9dCxoLnR5cGU9ZSxoLmNvdW50PWMubGVuZ3RoLGE9aCxcImZ1bmN0aW9uXCI9PXR5cGVvZiBjb25zb2xlLndhcm4/Y29uc29sZS53YXJuKGEpOmNvbnNvbGUubG9nKGEpfX1lbHNlIGM9b1tlXT1yLCsrdC5fZXZlbnRzQ291bnQ7cmV0dXJuIHR9ZnVuY3Rpb24gcCh0LGUscil7dmFyIG49ITE7ZnVuY3Rpb24gaSgpe3QucmVtb3ZlTGlzdGVuZXIoZSxpKSxufHwobj0hMCxyLmFwcGx5KHQsYXJndW1lbnRzKSl9cmV0dXJuIGkubGlzdGVuZXI9cixpfWZ1bmN0aW9uIHYodCl7dmFyIGU9dGhpcy5fZXZlbnRzO2lmKGUpe3ZhciByPWVbdF07aWYoXCJmdW5jdGlvblwiPT10eXBlb2YgcilyZXR1cm4gMTtpZihyKXJldHVybiByLmxlbmd0aH1yZXR1cm4gMH1mdW5jdGlvbiB3KHQsZSl7Zm9yKHZhciByPW5ldyBBcnJheShlKTtlLS07KXJbZV09dFtlXTtyZXR1cm4gcn1zLnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKG51bGwpLG8uRXZlbnRFbWl0dGVyPW8sby51c2luZ0RvbWFpbnM9ITEsby5wcm90b3R5cGUuZG9tYWluPXZvaWQgMCxvLnByb3RvdHlwZS5fZXZlbnRzPXZvaWQgMCxvLnByb3RvdHlwZS5fbWF4TGlzdGVuZXJzPXZvaWQgMCxvLmRlZmF1bHRNYXhMaXN0ZW5lcnM9MTAsby5pbml0PWZ1bmN0aW9uKCl7dGhpcy5kb21haW49bnVsbCxvLnVzaW5nRG9tYWlucyYmdW5kZWZpbmVkLmFjdGl2ZSx0aGlzLl9ldmVudHMmJnRoaXMuX2V2ZW50cyE9PU9iamVjdC5nZXRQcm90b3R5cGVPZih0aGlzKS5fZXZlbnRzfHwodGhpcy5fZXZlbnRzPW5ldyBzLHRoaXMuX2V2ZW50c0NvdW50PTApLHRoaXMuX21heExpc3RlbmVycz10aGlzLl9tYXhMaXN0ZW5lcnN8fHZvaWQgMH0sby5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzPWZ1bmN0aW9uKHQpe2lmKFwibnVtYmVyXCIhPXR5cGVvZiB0fHx0PDB8fGlzTmFOKHQpKXRocm93IG5ldyBUeXBlRXJyb3IoJ1wiblwiIGFyZ3VtZW50IG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInKTtyZXR1cm4gdGhpcy5fbWF4TGlzdGVuZXJzPXQsdGhpc30sby5wcm90b3R5cGUuZ2V0TWF4TGlzdGVuZXJzPWZ1bmN0aW9uKCl7cmV0dXJuIHUodGhpcyl9LG8ucHJvdG90eXBlLmVtaXQ9ZnVuY3Rpb24odCl7dmFyIGUscixuLGkscyxvLHUsZD1cImVycm9yXCI9PT10O2lmKG89dGhpcy5fZXZlbnRzKWQ9ZCYmbnVsbD09by5lcnJvcjtlbHNlIGlmKCFkKXJldHVybiExO2lmKHU9dGhpcy5kb21haW4sZCl7aWYoZT1hcmd1bWVudHNbMV0sIXUpe2lmKGUgaW5zdGFuY2VvZiBFcnJvcil0aHJvdyBlO3ZhciBwPW5ldyBFcnJvcignVW5jYXVnaHQsIHVuc3BlY2lmaWVkIFwiZXJyb3JcIiBldmVudC4gKCcrZStcIilcIik7dGhyb3cgcC5jb250ZXh0PWUscH1yZXR1cm4gZXx8KGU9bmV3IEVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50JykpLGUuZG9tYWluRW1pdHRlcj10aGlzLGUuZG9tYWluPXUsZS5kb21haW5UaHJvd249ITEsdS5lbWl0KFwiZXJyb3JcIixlKSwhMX1pZighKHI9b1t0XSkpcmV0dXJuITE7dmFyIHY9XCJmdW5jdGlvblwiPT10eXBlb2Ygcjtzd2l0Y2gobj1hcmd1bWVudHMubGVuZ3RoKXtjYXNlIDE6YyhyLHYsdGhpcyk7YnJlYWs7Y2FzZSAyOmEocix2LHRoaXMsYXJndW1lbnRzWzFdKTticmVhaztjYXNlIDM6aChyLHYsdGhpcyxhcmd1bWVudHNbMV0sYXJndW1lbnRzWzJdKTticmVhaztjYXNlIDQ6ZihyLHYsdGhpcyxhcmd1bWVudHNbMV0sYXJndW1lbnRzWzJdLGFyZ3VtZW50c1szXSk7YnJlYWs7ZGVmYXVsdDpmb3IoaT1uZXcgQXJyYXkobi0xKSxzPTE7czxuO3MrKylpW3MtMV09YXJndW1lbnRzW3NdO2wocix2LHRoaXMsaSl9cmV0dXJuITB9LG8ucHJvdG90eXBlLmFkZExpc3RlbmVyPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIGQodGhpcyx0LGUsITEpfSxvLnByb3RvdHlwZS5vbj1vLnByb3RvdHlwZS5hZGRMaXN0ZW5lcixvLnByb3RvdHlwZS5wcmVwZW5kTGlzdGVuZXI9ZnVuY3Rpb24odCxlKXtyZXR1cm4gZCh0aGlzLHQsZSwhMCl9LG8ucHJvdG90eXBlLm9uY2U9ZnVuY3Rpb24odCxlKXtpZihcImZ1bmN0aW9uXCIhPXR5cGVvZiBlKXRocm93IG5ldyBUeXBlRXJyb3IoJ1wibGlzdGVuZXJcIiBhcmd1bWVudCBtdXN0IGJlIGEgZnVuY3Rpb24nKTtyZXR1cm4gdGhpcy5vbih0LHAodGhpcyx0LGUpKSx0aGlzfSxvLnByb3RvdHlwZS5wcmVwZW5kT25jZUxpc3RlbmVyPWZ1bmN0aW9uKHQsZSl7aWYoXCJmdW5jdGlvblwiIT10eXBlb2YgZSl0aHJvdyBuZXcgVHlwZUVycm9yKCdcImxpc3RlbmVyXCIgYXJndW1lbnQgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7cmV0dXJuIHRoaXMucHJlcGVuZExpc3RlbmVyKHQscCh0aGlzLHQsZSkpLHRoaXN9LG8ucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyPWZ1bmN0aW9uKHQsZSl7dmFyIHIsbixpLG8sdTtpZihcImZ1bmN0aW9uXCIhPXR5cGVvZiBlKXRocm93IG5ldyBUeXBlRXJyb3IoJ1wibGlzdGVuZXJcIiBhcmd1bWVudCBtdXN0IGJlIGEgZnVuY3Rpb24nKTtpZighKG49dGhpcy5fZXZlbnRzKSlyZXR1cm4gdGhpcztpZighKHI9blt0XSkpcmV0dXJuIHRoaXM7aWYocj09PWV8fHIubGlzdGVuZXImJnIubGlzdGVuZXI9PT1lKTA9PS0tdGhpcy5fZXZlbnRzQ291bnQ/dGhpcy5fZXZlbnRzPW5ldyBzOihkZWxldGUgblt0XSxuLnJlbW92ZUxpc3RlbmVyJiZ0aGlzLmVtaXQoXCJyZW1vdmVMaXN0ZW5lclwiLHQsci5saXN0ZW5lcnx8ZSkpO2Vsc2UgaWYoXCJmdW5jdGlvblwiIT10eXBlb2Ygcil7Zm9yKGk9LTEsbz1yLmxlbmd0aDtvLS0gPjA7KWlmKHJbb109PT1lfHxyW29dLmxpc3RlbmVyJiZyW29dLmxpc3RlbmVyPT09ZSl7dT1yW29dLmxpc3RlbmVyLGk9bzticmVha31pZihpPDApcmV0dXJuIHRoaXM7aWYoMT09PXIubGVuZ3RoKXtpZihyWzBdPXZvaWQgMCwwPT0tLXRoaXMuX2V2ZW50c0NvdW50KXJldHVybiB0aGlzLl9ldmVudHM9bmV3IHMsdGhpcztkZWxldGUgblt0XX1lbHNlIWZ1bmN0aW9uKHQsZSl7Zm9yKHZhciByPWUsbj1yKzEsaT10Lmxlbmd0aDtuPGk7cis9MSxuKz0xKXRbcl09dFtuXTt0LnBvcCgpfShyLGkpO24ucmVtb3ZlTGlzdGVuZXImJnRoaXMuZW1pdChcInJlbW92ZUxpc3RlbmVyXCIsdCx1fHxlKX1yZXR1cm4gdGhpc30sby5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzPWZ1bmN0aW9uKHQpe3ZhciBlLHI7aWYoIShyPXRoaXMuX2V2ZW50cykpcmV0dXJuIHRoaXM7aWYoIXIucmVtb3ZlTGlzdGVuZXIpcmV0dXJuIDA9PT1hcmd1bWVudHMubGVuZ3RoPyh0aGlzLl9ldmVudHM9bmV3IHMsdGhpcy5fZXZlbnRzQ291bnQ9MCk6clt0XSYmKDA9PS0tdGhpcy5fZXZlbnRzQ291bnQ/dGhpcy5fZXZlbnRzPW5ldyBzOmRlbGV0ZSByW3RdKSx0aGlzO2lmKDA9PT1hcmd1bWVudHMubGVuZ3RoKXtmb3IodmFyIG4saT1PYmplY3Qua2V5cyhyKSxvPTA7bzxpLmxlbmd0aDsrK28pXCJyZW1vdmVMaXN0ZW5lclwiIT09KG49aVtvXSkmJnRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKG4pO3JldHVybiB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhcInJlbW92ZUxpc3RlbmVyXCIpLHRoaXMuX2V2ZW50cz1uZXcgcyx0aGlzLl9ldmVudHNDb3VudD0wLHRoaXN9aWYoXCJmdW5jdGlvblwiPT10eXBlb2YoZT1yW3RdKSl0aGlzLnJlbW92ZUxpc3RlbmVyKHQsZSk7ZWxzZSBpZihlKWRve3RoaXMucmVtb3ZlTGlzdGVuZXIodCxlW2UubGVuZ3RoLTFdKX13aGlsZShlWzBdKTtyZXR1cm4gdGhpc30sby5wcm90b3R5cGUubGlzdGVuZXJzPWZ1bmN0aW9uKHQpe3ZhciBlLHI9dGhpcy5fZXZlbnRzO3JldHVybiByJiYoZT1yW3RdKT9cImZ1bmN0aW9uXCI9PXR5cGVvZiBlP1tlLmxpc3RlbmVyfHxlXTpmdW5jdGlvbih0KXtmb3IodmFyIGU9bmV3IEFycmF5KHQubGVuZ3RoKSxyPTA7cjxlLmxlbmd0aDsrK3IpZVtyXT10W3JdLmxpc3RlbmVyfHx0W3JdO3JldHVybiBlfShlKTpbXX0sby5saXN0ZW5lckNvdW50PWZ1bmN0aW9uKHQsZSl7cmV0dXJuXCJmdW5jdGlvblwiPT10eXBlb2YgdC5saXN0ZW5lckNvdW50P3QubGlzdGVuZXJDb3VudChlKTp2LmNhbGwodCxlKX0sby5wcm90b3R5cGUubGlzdGVuZXJDb3VudD12LG8ucHJvdG90eXBlLmV2ZW50TmFtZXM9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fZXZlbnRzQ291bnQ+MD9SZWZsZWN0Lm93bktleXModGhpcy5fZXZlbnRzKTpbXX07dmFyIHksbT0xZTcsYj1mdW5jdGlvbigpe2Z1bmN0aW9uIHQoKXt0aGlzLmxvY2tlZD0hMX1yZXR1cm4gdC5wcm90b3R5cGUubG9jaz1mdW5jdGlvbigpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbih0KXtzd2l0Y2godC5sYWJlbCl7Y2FzZSAwOnJldHVybiB0aGlzLmxvY2tlZD9bNCxuZXcgUHJvbWlzZSgoZnVuY3Rpb24odCl7cmV0dXJuIHNldFRpbWVvdXQodCwxKX0pKV06WzMsMl07Y2FzZSAxOnJldHVybiB0LnNlbnQoKSxbMywwXTtjYXNlIDI6cmV0dXJuIHRoaXMubG9ja2VkPSEwLFsyXX19KSl9KSl9LHQucHJvdG90eXBlLnVubG9jaz1mdW5jdGlvbigpe3RoaXMubG9ja2VkPSExfSx0fSgpLGc9ZnVuY3Rpb24odCl7ZnVuY3Rpb24gZShlLHIsbil7dm9pZCAwPT09ciYmKHI9MCksdm9pZCAwPT09biYmKG49bSk7dmFyIGk9dC5jYWxsKHRoaXMpfHx0aGlzO2kudHJhbnNwb3J0PWUsaS5tb2RlPXIsaS5jbG9ja0ZyZXF1ZW5jeT1uLGkuY29ubmVjdGVkPSExLGkuc2VuZE11dGV4PW5ldyBiLGkuYmxvY2tTaXplPWkudHJhbnNwb3J0LnBhY2tldFNpemUtNC0xO3ZhciBzPWkudHJhbnNwb3J0LnBhY2tldFNpemUtMi0xO3JldHVybiBpLm9wZXJhdGlvbkNvdW50PU1hdGguZmxvb3Iocy81KSxpfXJldHVybiByKGUsdCksZS5wcm90b3R5cGUuYnVmZmVyU291cmNlVG9VaW50OEFycmF5PWZ1bmN0aW9uKHQsZSl7aWYoIWUpcmV0dXJuIG5ldyBVaW50OEFycmF5KFt0XSk7dmFyIHI9dm9pZCAwIT09ZS5idWZmZXI/ZS5idWZmZXI6ZSxuPW5ldyBVaW50OEFycmF5KHIuYnl0ZUxlbmd0aCsxKTtyZXR1cm4gbi5zZXQoW3RdKSxuLnNldChuZXcgVWludDhBcnJheShyKSwxKSxufSxlLnByb3RvdHlwZS5zZWxlY3RQcm90b2NvbD1mdW5jdGlvbih0KXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIGU7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24ocil7c3dpdGNoKHIubGFiZWwpe2Nhc2UgMDpyZXR1cm4gZT0yPT09dD81OTE5Njo1OTI5NCxbNCx0aGlzLnN3alNlcXVlbmNlKG5ldyBVaW50OEFycmF5KFsyNTUsMjU1LDI1NSwyNTUsMjU1LDI1NSwyNTVdKSldO2Nhc2UgMTpyZXR1cm4gci5zZW50KCksWzQsdGhpcy5zd2pTZXF1ZW5jZShuZXcgVWludDE2QXJyYXkoW2VdKSldO2Nhc2UgMjpyZXR1cm4gci5zZW50KCksWzQsdGhpcy5zd2pTZXF1ZW5jZShuZXcgVWludDhBcnJheShbMjU1LDI1NSwyNTUsMjU1LDI1NSwyNTUsMjU1XSkpXTtjYXNlIDM6cmV0dXJuIHIuc2VudCgpLFs0LHRoaXMuc3dqU2VxdWVuY2UobmV3IFVpbnQ4QXJyYXkoWzBdKSldO2Nhc2UgNDpyZXR1cm4gci5zZW50KCksWzJdfX0pKX0pKX0sZS5wcm90b3R5cGUuc2VuZD1mdW5jdGlvbih0LGUpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgcixuO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKGkpe3N3aXRjaChpLmxhYmVsKXtjYXNlIDA6cmV0dXJuIHI9dGhpcy5idWZmZXJTb3VyY2VUb1VpbnQ4QXJyYXkodCxlKSxbNCx0aGlzLnNlbmRNdXRleC5sb2NrKCldO2Nhc2UgMTppLnNlbnQoKSxpLmxhYmVsPTI7Y2FzZSAyOnJldHVybiBpLnRyeXMucHVzaChbMiwsNSw2XSksWzQsdGhpcy50cmFuc3BvcnQud3JpdGUocildO2Nhc2UgMzpyZXR1cm4gaS5zZW50KCksWzQsdGhpcy50cmFuc3BvcnQucmVhZCgpXTtjYXNlIDQ6aWYoKG49aS5zZW50KCkpLmdldFVpbnQ4KDApIT09dCl0aHJvdyBuZXcgRXJyb3IoXCJCYWQgcmVzcG9uc2UgZm9yIFwiK3QrXCIgLT4gXCIrbi5nZXRVaW50OCgwKSk7c3dpdGNoKHQpe2Nhc2UgMzpjYXNlIDg6Y2FzZSA5OmNhc2UgMTA6Y2FzZSAxNzpjYXNlIDE4OmNhc2UgMTk6Y2FzZSAyOTpjYXNlIDIzOmNhc2UgMjQ6Y2FzZSAyNjpjYXNlIDIxOmNhc2UgMjI6Y2FzZSA0OmlmKDAhPT1uLmdldFVpbnQ4KDEpKXRocm93IG5ldyBFcnJvcihcIkJhZCBzdGF0dXMgZm9yIFwiK3QrXCIgLT4gXCIrbi5nZXRVaW50OCgxKSl9cmV0dXJuWzIsbl07Y2FzZSA1OnJldHVybiB0aGlzLnNlbmRNdXRleC51bmxvY2soKSxbN107Y2FzZSA2OnJldHVyblsyXX19KSl9KSl9LGUucHJvdG90eXBlLmNsZWFyQWJvcnQ9ZnVuY3Rpb24odCl7cmV0dXJuIHZvaWQgMD09PXQmJih0PTMwKSxuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihlKXtzd2l0Y2goZS5sYWJlbCl7Y2FzZSAwOnJldHVybls0LHRoaXMuc2VuZCg4LG5ldyBVaW50OEFycmF5KFswLHRdKSldO2Nhc2UgMTpyZXR1cm4gZS5zZW50KCksWzJdfX0pKX0pKX0sZS5wcm90b3R5cGUuZGFwSW5mbz1mdW5jdGlvbih0KXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIGUscixuLHM7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24oaSl7c3dpdGNoKGkubGFiZWwpe2Nhc2UgMDpyZXR1cm4gaS50cnlzLnB1c2goWzAsMiwsNF0pLFs0LHRoaXMuc2VuZCgwLG5ldyBVaW50OEFycmF5KFt0XSkpXTtjYXNlIDE6aWYoZT1pLnNlbnQoKSwwPT09KHI9ZS5nZXRVaW50OCgxKSkpcmV0dXJuWzIsXCJcIl07c3dpdGNoKHQpe2Nhc2UgMjQwOmNhc2UgMjU0OmNhc2UgMjU1OmNhc2UgMjUzOmlmKDE9PT1yKXJldHVyblsyLGUuZ2V0VWludDgoMildO2lmKDI9PT1yKXJldHVyblsyLGUuZ2V0VWludDE2KDIpXTtpZig0PT09cilyZXR1cm5bMixlLmdldFVpbnQzMigyKV19cmV0dXJuIG49QXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwobmV3IFVpbnQ4QXJyYXkoZS5idWZmZXIsMixyKSksWzIsU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShudWxsLG4pXTtjYXNlIDI6cmV0dXJuIHM9aS5zZW50KCksWzQsdGhpcy5jbGVhckFib3J0KCldO2Nhc2UgMzp0aHJvdyBpLnNlbnQoKSxzO2Nhc2UgNDpyZXR1cm5bMl19fSkpfSkpfSxlLnByb3RvdHlwZS5zd2pTZXF1ZW5jZT1mdW5jdGlvbih0LGUpe3JldHVybiB2b2lkIDA9PT1lJiYoZT04KnQuYnl0ZUxlbmd0aCksbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIHIsbjtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihpKXtzd2l0Y2goaS5sYWJlbCl7Y2FzZSAwOnI9dGhpcy5idWZmZXJTb3VyY2VUb1VpbnQ4QXJyYXkoZSx0KSxpLmxhYmVsPTE7Y2FzZSAxOnJldHVybiBpLnRyeXMucHVzaChbMSwzLCw1XSksWzQsdGhpcy5zZW5kKDE4LHIpXTtjYXNlIDI6cmV0dXJuIGkuc2VudCgpLFszLDVdO2Nhc2UgMzpyZXR1cm4gbj1pLnNlbnQoKSxbNCx0aGlzLmNsZWFyQWJvcnQoKV07Y2FzZSA0OnRocm93IGkuc2VudCgpLG47Y2FzZSA1OnJldHVyblsyXX19KSl9KSl9LGUucHJvdG90eXBlLnN3akNsb2NrPWZ1bmN0aW9uKHQpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgZTtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihyKXtzd2l0Y2goci5sYWJlbCl7Y2FzZSAwOnJldHVybiByLnRyeXMucHVzaChbMCwyLCw0XSksWzQsdGhpcy5zZW5kKDE3LG5ldyBVaW50OEFycmF5KFsyNTUmdCwoNjUyODAmdCk+PjgsKDE2NzExNjgwJnQpPj4xNiwoNDI3ODE5MDA4MCZ0KT4+MjRdKSldO2Nhc2UgMTpyZXR1cm4gci5zZW50KCksWzMsNF07Y2FzZSAyOnJldHVybiBlPXIuc2VudCgpLFs0LHRoaXMuY2xlYXJBYm9ydCgpXTtjYXNlIDM6dGhyb3cgci5zZW50KCksZTtjYXNlIDQ6cmV0dXJuWzJdfX0pKX0pKX0sZS5wcm90b3R5cGUuc3dqUGlucz1mdW5jdGlvbih0LGUscil7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciBuO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKGkpe3N3aXRjaChpLmxhYmVsKXtjYXNlIDA6cmV0dXJuIGkudHJ5cy5wdXNoKFswLDIsLDRdKSxbNCx0aGlzLnNlbmQoMTYsbmV3IFVpbnQ4QXJyYXkoW3QsZSwyNTUmciwoNjUyODAmcik+PjgsKDE2NzExNjgwJnIpPj4xNiwoNDI3ODE5MDA4MCZyKT4+MjRdKSldO2Nhc2UgMTpyZXR1cm5bMixpLnNlbnQoKS5nZXRVaW50OCgxKV07Y2FzZSAyOnJldHVybiBuPWkuc2VudCgpLFs0LHRoaXMuY2xlYXJBYm9ydCgpXTtjYXNlIDM6dGhyb3cgaS5zZW50KCksbjtjYXNlIDQ6cmV0dXJuWzJdfX0pKX0pKX0sZS5wcm90b3R5cGUuZGFwRGVsYXk9ZnVuY3Rpb24odCl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciBlO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKHIpe3N3aXRjaChyLmxhYmVsKXtjYXNlIDA6cmV0dXJuIHIudHJ5cy5wdXNoKFswLDIsLDRdKSxbNCx0aGlzLnNlbmQoOSxuZXcgVWludDhBcnJheShbMjU1JnQsKDY1MjgwJnQpPj44XSkpXTtjYXNlIDE6cmV0dXJuIHIuc2VudCgpLFszLDRdO2Nhc2UgMjpyZXR1cm4gZT1yLnNlbnQoKSxbNCx0aGlzLmNsZWFyQWJvcnQoKV07Y2FzZSAzOnRocm93IHIuc2VudCgpLGU7Y2FzZSA0OnJldHVyblsyXX19KSl9KSl9LGUucHJvdG90eXBlLmNvbmZpZ3VyZVRyYW5zZmVyPWZ1bmN0aW9uKHQsZSxyKXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIG4scyxvO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKGkpe3N3aXRjaChpLmxhYmVsKXtjYXNlIDA6bj1uZXcgVWludDhBcnJheSg1KSwocz1uZXcgRGF0YVZpZXcobi5idWZmZXIpKS5zZXRVaW50OCgwLHQpLHMuc2V0VWludDE2KDEsZSwhMCkscy5zZXRVaW50MTYoMyxyLCEwKSxpLmxhYmVsPTE7Y2FzZSAxOnJldHVybiBpLnRyeXMucHVzaChbMSwzLCw1XSksWzQsdGhpcy5zZW5kKDQsbildO2Nhc2UgMjpyZXR1cm4gaS5zZW50KCksWzMsNV07Y2FzZSAzOnJldHVybiBvPWkuc2VudCgpLFs0LHRoaXMuY2xlYXJBYm9ydCgpXTtjYXNlIDQ6dGhyb3cgaS5zZW50KCksbztjYXNlIDU6cmV0dXJuWzJdfX0pKX0pKX0sZS5wcm90b3R5cGUuY29ubmVjdD1mdW5jdGlvbigpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgdCxlLHI7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24obil7c3dpdGNoKG4ubGFiZWwpe2Nhc2UgMDpyZXR1cm4hMD09PXRoaXMuY29ubmVjdGVkP1syXTpbNCx0aGlzLnRyYW5zcG9ydC5vcGVuKCldO2Nhc2UgMTpuLnNlbnQoKSxuLmxhYmVsPTI7Y2FzZSAyOnJldHVybiBuLnRyeXMucHVzaChbMiw1LCw4XSksWzQsdGhpcy5zZW5kKDE3LG5ldyBVaW50MzJBcnJheShbdGhpcy5jbG9ja0ZyZXF1ZW5jeV0pKV07Y2FzZSAzOnJldHVybiBuLnNlbnQoKSxbNCx0aGlzLnNlbmQoMixuZXcgVWludDhBcnJheShbdGhpcy5tb2RlXSkpXTtjYXNlIDQ6aWYoMD09PSh0PW4uc2VudCgpKS5nZXRVaW50OCgxKXx8MCE9PXRoaXMubW9kZSYmdC5nZXRVaW50OCgxKSE9PXRoaXMubW9kZSl0aHJvdyBuZXcgRXJyb3IoXCJNb2RlIG5vdCBlbmFibGVkLlwiKTtyZXR1cm5bMyw4XTtjYXNlIDU6cmV0dXJuIGU9bi5zZW50KCksWzQsdGhpcy5jbGVhckFib3J0KCldO2Nhc2UgNjpyZXR1cm4gbi5zZW50KCksWzQsdGhpcy50cmFuc3BvcnQuY2xvc2UoKV07Y2FzZSA3OnRocm93IG4uc2VudCgpLGU7Y2FzZSA4OnJldHVybiBuLnRyeXMucHVzaChbOCwxMSwsMTNdKSxbNCx0aGlzLmNvbmZpZ3VyZVRyYW5zZmVyKDAsMTAwLDApXTtjYXNlIDk6cmV0dXJuIG4uc2VudCgpLFs0LHRoaXMuc2VsZWN0UHJvdG9jb2woMSldO2Nhc2UgMTA6cmV0dXJuIG4uc2VudCgpLFszLDEzXTtjYXNlIDExOnJldHVybiByPW4uc2VudCgpLFs0LHRoaXMudHJhbnNwb3J0LmNsb3NlKCldO2Nhc2UgMTI6dGhyb3cgbi5zZW50KCkscjtjYXNlIDEzOnJldHVybiB0aGlzLmNvbm5lY3RlZD0hMCxbMl19fSkpfSkpfSxlLnByb3RvdHlwZS5kaXNjb25uZWN0PWZ1bmN0aW9uKCl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciB0O3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKGUpe3N3aXRjaChlLmxhYmVsKXtjYXNlIDA6aWYoITE9PT10aGlzLmNvbm5lY3RlZClyZXR1cm5bMl07ZS5sYWJlbD0xO2Nhc2UgMTpyZXR1cm4gZS50cnlzLnB1c2goWzEsMywsNV0pLFs0LHRoaXMuc2VuZCgzKV07Y2FzZSAyOnJldHVybiBlLnNlbnQoKSxbMyw1XTtjYXNlIDM6cmV0dXJuIHQ9ZS5zZW50KCksWzQsdGhpcy5jbGVhckFib3J0KCldO2Nhc2UgNDp0aHJvdyBlLnNlbnQoKSx0O2Nhc2UgNTpyZXR1cm5bNCx0aGlzLnRyYW5zcG9ydC5jbG9zZSgpXTtjYXNlIDY6cmV0dXJuIGUuc2VudCgpLHRoaXMuY29ubmVjdGVkPSExLFsyXX19KSl9KSl9LGUucHJvdG90eXBlLnJlY29ubmVjdD1mdW5jdGlvbigpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbih0KXtzd2l0Y2godC5sYWJlbCl7Y2FzZSAwOnJldHVybls0LHRoaXMuZGlzY29ubmVjdCgpXTtjYXNlIDE6cmV0dXJuIHQuc2VudCgpLFs0LG5ldyBQcm9taXNlKChmdW5jdGlvbih0KXtyZXR1cm4gc2V0VGltZW91dCh0LDEwMCl9KSldO2Nhc2UgMjpyZXR1cm4gdC5zZW50KCksWzQsdGhpcy5jb25uZWN0KCldO2Nhc2UgMzpyZXR1cm4gdC5zZW50KCksWzJdfX0pKX0pKX0sZS5wcm90b3R5cGUucmVzZXQ9ZnVuY3Rpb24oKXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIHQ7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24oZSl7c3dpdGNoKGUubGFiZWwpe2Nhc2UgMDpyZXR1cm4gZS50cnlzLnB1c2goWzAsMiwsNF0pLFs0LHRoaXMuc2VuZCgxMCldO2Nhc2UgMTpyZXR1cm5bMiwxPT09ZS5zZW50KCkuZ2V0VWludDgoMildO2Nhc2UgMjpyZXR1cm4gdD1lLnNlbnQoKSxbNCx0aGlzLmNsZWFyQWJvcnQoKV07Y2FzZSAzOnRocm93IGUuc2VudCgpLHQ7Y2FzZSA0OnJldHVyblsyXX19KSl9KSl9LGUucHJvdG90eXBlLnRyYW5zZmVyPWZ1bmN0aW9uKHQsZSxyLHMpe3JldHVybiB2b2lkIDA9PT1lJiYoZT0yKSx2b2lkIDA9PT1yJiYocj0wKSx2b2lkIDA9PT1zJiYocz0wKSxuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgbixvLHUsYyxhLGgsZjtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihpKXtzd2l0Y2goaS5sYWJlbCl7Y2FzZSAwOm49XCJudW1iZXJcIj09dHlwZW9mIHQ/W3twb3J0OnQsbW9kZTplLHJlZ2lzdGVyOnIsdmFsdWU6c31dOnQsbz1uZXcgVWludDhBcnJheSgyKzUqbi5sZW5ndGgpLCh1PW5ldyBEYXRhVmlldyhvLmJ1ZmZlcikpLnNldFVpbnQ4KDAsMCksdS5zZXRVaW50OCgxLG4ubGVuZ3RoKSxuLmZvckVhY2goKGZ1bmN0aW9uKHQsZSl7dmFyIHI9Mis1KmU7dS5zZXRVaW50OChyLHQucG9ydHx0Lm1vZGV8dC5yZWdpc3RlciksdS5zZXRVaW50MzIocisxLHQudmFsdWV8fDAsITApfSkpLGkubGFiZWw9MTtjYXNlIDE6cmV0dXJuIGkudHJ5cy5wdXNoKFsxLDMsLDVdKSxbNCx0aGlzLnNlbmQoNSxvKV07Y2FzZSAyOmlmKChjPWkuc2VudCgpKS5nZXRVaW50OCgxKSE9PW4ubGVuZ3RoKXRocm93IG5ldyBFcnJvcihcIlRyYW5zZmVyIGNvdW50IG1pc21hdGNoXCIpO2lmKDI9PT0oYT1jLmdldFVpbnQ4KDIpKSl0aHJvdyBuZXcgRXJyb3IoXCJUcmFuc2ZlciByZXNwb25zZSBXQUlUXCIpO2lmKDQ9PT1hKXRocm93IG5ldyBFcnJvcihcIlRyYW5zZmVyIHJlc3BvbnNlIEZBVUxUXCIpO2lmKDg9PT1hKXRocm93IG5ldyBFcnJvcihcIlRyYW5zZmVyIHJlc3BvbnNlIFBST1RPQ09MX0VSUk9SXCIpO2lmKDE2PT09YSl0aHJvdyBuZXcgRXJyb3IoXCJUcmFuc2ZlciByZXNwb25zZSBWQUxVRV9NSVNNQVRDSFwiKTtpZig3PT09YSl0aHJvdyBuZXcgRXJyb3IoXCJUcmFuc2ZlciByZXNwb25zZSBOT19BQ0tcIik7cmV0dXJuXCJudW1iZXJcIj09dHlwZW9mIHQ/WzIsYy5nZXRVaW50MzIoMywhMCldOihoPTQqbi5sZW5ndGgsWzIsbmV3IFVpbnQzMkFycmF5KGMuYnVmZmVyLnNsaWNlKDMsMytoKSldKTtjYXNlIDM6cmV0dXJuIGY9aS5zZW50KCksWzQsdGhpcy5jbGVhckFib3J0KCldO2Nhc2UgNDp0aHJvdyBpLnNlbnQoKSxmO2Nhc2UgNTpyZXR1cm5bMl19fSkpfSkpfSxlLnByb3RvdHlwZS50cmFuc2ZlckJsb2NrPWZ1bmN0aW9uKHQsZSxyKXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIG4scyxvLHUsYyxhLGgsZjtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihpKXtzd2l0Y2goaS5sYWJlbCl7Y2FzZSAwOm89NCxcIm51bWJlclwiPT10eXBlb2Ygcj8obj1yLHM9Mik6KG49ci5sZW5ndGgscz0wLG8rPXIuYnl0ZUxlbmd0aCksdT1uZXcgVWludDhBcnJheShvKSwoYz1uZXcgRGF0YVZpZXcodS5idWZmZXIpKS5zZXRVaW50OCgwLDApLGMuc2V0VWludDE2KDEsbiwhMCksYy5zZXRVaW50OCgzLHR8c3xlKSxcIm51bWJlclwiIT10eXBlb2YgciYmci5mb3JFYWNoKChmdW5jdGlvbih0LGUpe3ZhciByPTQrNCplO2Muc2V0VWludDMyKHIsdCwhMCl9KSksaS5sYWJlbD0xO2Nhc2UgMTpyZXR1cm4gaS50cnlzLnB1c2goWzEsMywsNV0pLFs0LHRoaXMuc2VuZCg2LGMpXTtjYXNlIDI6aWYoKGE9aS5zZW50KCkpLmdldFVpbnQxNigxLCEwKSE9PW4pdGhyb3cgbmV3IEVycm9yKFwiVHJhbnNmZXIgY291bnQgbWlzbWF0Y2hcIik7aWYoMj09PShoPWEuZ2V0VWludDgoMykpKXRocm93IG5ldyBFcnJvcihcIlRyYW5zZmVyIHJlc3BvbnNlIFdBSVRcIik7aWYoND09PWgpdGhyb3cgbmV3IEVycm9yKFwiVHJhbnNmZXIgcmVzcG9uc2UgRkFVTFRcIik7aWYoOD09PWgpdGhyb3cgbmV3IEVycm9yKFwiVHJhbnNmZXIgcmVzcG9uc2UgUFJPVE9DT0xfRVJST1JcIik7aWYoNz09PWgpdGhyb3cgbmV3IEVycm9yKFwiVHJhbnNmZXIgcmVzcG9uc2UgTk9fQUNLXCIpO3JldHVyblwibnVtYmVyXCI9PXR5cGVvZiByP1syLG5ldyBVaW50MzJBcnJheShhLmJ1ZmZlci5zbGljZSg0LDQrNCpuKSldOlszLDVdO2Nhc2UgMzpyZXR1cm4gZj1pLnNlbnQoKSxbNCx0aGlzLmNsZWFyQWJvcnQoKV07Y2FzZSA0OnRocm93IGkuc2VudCgpLGY7Y2FzZSA1OnJldHVyblsyLHZvaWQgMF19fSkpfSkpfSxlfShvKSxBPS9bXFx4YzAtXFx4ZmZdW1xceDgwLVxceGJmXSokL2csQz0vW1xceGMwLVxceGZmXVtcXHg4MC1cXHhiZl0qL2csVT1mdW5jdGlvbigpe2Z1bmN0aW9uIHQoKXt9cmV0dXJuIHQucHJvdG90eXBlLmRlY29kZT1mdW5jdGlvbih0KXt2YXIgZT1BcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChuZXcgVWludDhBcnJheSh0KSkscj1TdHJpbmcuZnJvbUNvZGVQb2ludC5hcHBseSh2b2lkIDAsZSk7dGhpcy5wYXJ0aWFsQ2hhciYmKHI9XCJcIit0aGlzLnBhcnRpYWxDaGFyK3IsdGhpcy5wYXJ0aWFsQ2hhcj12b2lkIDApO3ZhciBuPXIubWF0Y2goQSk7aWYobil7dmFyIGk9blswXS5sZW5ndGg7dGhpcy5wYXJ0aWFsQ2hhcj1yLnNsaWNlKC1pKSxyPXIuc2xpY2UoMCwtaSl9cmV0dXJuIHIucmVwbGFjZShDLHRoaXMuZGVjb2RlclJlcGxhY2VyKX0sdC5wcm90b3R5cGUuZGVjb2RlclJlcGxhY2VyPWZ1bmN0aW9uKHQpe3ZhciBlPXQuY29kZVBvaW50QXQoMCk8PDI0LHI9TWF0aC5jbHozMih+ZSksbj0wLGk9dC5sZW5ndGgscz1cIlwiO2lmKHI8NSYmaT49cil7Zm9yKGU9ZTw8cj4+PjI0K3Isbj0xO248cjtuKz0xKWU9ZTw8Nnw2MyZ0LmNvZGVQb2ludEF0KG4pO2U8PTY1NTM1P3MrPVN0cmluZy5mcm9tQ29kZVBvaW50KGUpOmU8PTExMTQxMTE/KGUtPTY1NTM2LHMrPVN0cmluZy5mcm9tQ29kZVBvaW50KDU1Mjk2KyhlPj4xMCksNTYzMjArKDEwMjMmZSkpKTpuPTB9Zm9yKDtuPGk7bis9MSlzKz1cIu+/vVwiO3JldHVybiBzfSx0fSgpLEU9bmV3IFUsUD1mdW5jdGlvbih0KXtmdW5jdGlvbiBlKHIscyxvKXt2b2lkIDA9PT1zJiYocz0wKSx2b2lkIDA9PT1vJiYobz1tKTt2YXIgdT10LmNhbGwodGhpcyxyLHMsbyl8fHRoaXM7cmV0dXJuIHUuc2VyaWFsUG9sbGluZz0hMSx1LnNlcmlhbExpc3RlbmVycz0hMSx1Lm9uKFwibmV3TGlzdGVuZXJcIiwoZnVuY3Rpb24odCl7cmV0dXJuIG4odSx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKHIpe3JldHVybiB0PT09ZS5FVkVOVF9TRVJJQUxfREFUQSYmMD09PXRoaXMubGlzdGVuZXJDb3VudCh0KSYmKHRoaXMuc2VyaWFsTGlzdGVuZXJzPSEwKSxbMl19KSl9KSl9KSksdS5vbihcInJlbW92ZUxpc3RlbmVyXCIsKGZ1bmN0aW9uKHQpe3Q9PT1lLkVWRU5UX1NFUklBTF9EQVRBJiYoMD09PXUubGlzdGVuZXJDb3VudCh0KSYmKHUuc2VyaWFsTGlzdGVuZXJzPSExKSl9KSksdX1yZXR1cm4gcihlLHQpLGUucHJvdG90eXBlLmlzQnVmZmVyQmluYXJ5PWZ1bmN0aW9uKHQpe2Zvcih2YXIgZT1BcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChuZXcgVWludDE2QXJyYXkodCwwLDUwKSkscj1TdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KG51bGwsZSksbj0wO248ci5sZW5ndGg7bisrKXt2YXIgaT1yLmNoYXJDb2RlQXQobik7aWYoNjU1MzM9PT1pfHxpPD04KXJldHVybiEwfXJldHVybiExfSxlLnByb3RvdHlwZS53cml0ZUJ1ZmZlcj1mdW5jdGlvbih0LHIscyl7cmV0dXJuIHZvaWQgMD09PXMmJihzPTApLG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciBuLG8sdSxjO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKGkpe3N3aXRjaChpLmxhYmVsKXtjYXNlIDA6bj1NYXRoLm1pbih0LmJ5dGVMZW5ndGgscytyKSxvPXQuc2xpY2UocyxuKSwodT1uZXcgVWludDhBcnJheShvLmJ5dGVMZW5ndGgrMSkpLnNldChbby5ieXRlTGVuZ3RoXSksdS5zZXQobmV3IFVpbnQ4QXJyYXkobyksMSksaS5sYWJlbD0xO2Nhc2UgMTpyZXR1cm4gaS50cnlzLnB1c2goWzEsMywsNV0pLFs0LHRoaXMuc2VuZCgxNDAsdSldO2Nhc2UgMjpyZXR1cm4gaS5zZW50KCksWzMsNV07Y2FzZSAzOnJldHVybiBjPWkuc2VudCgpLFs0LHRoaXMuY2xlYXJBYm9ydCgpXTtjYXNlIDQ6dGhyb3cgaS5zZW50KCksYztjYXNlIDU6cmV0dXJuIHRoaXMuZW1pdChlLkVWRU5UX1BST0dSRVNTLHMvdC5ieXRlTGVuZ3RoKSxuPHQuYnl0ZUxlbmd0aD9bMix0aGlzLndyaXRlQnVmZmVyKHQscixuKV06WzJdfX0pKX0pKX0sZS5wcm90b3R5cGUuZmxhc2g9ZnVuY3Rpb24odCxyKXtyZXR1cm4gdm9pZCAwPT09ciYmKHI9NjIpLG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciBuLHMsbztyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihpKXtzd2l0Y2goaS5sYWJlbCl7Y2FzZSAwOm49ZnVuY3Rpb24odCl7cmV0dXJuIHZvaWQgMCE9PXQuYnVmZmVyfSh0KT90LmJ1ZmZlcjp0LHM9dGhpcy5pc0J1ZmZlckJpbmFyeShuKT8wOjEsaS5sYWJlbD0xO2Nhc2UgMTpyZXR1cm4gaS50cnlzLnB1c2goWzEsNiwsOF0pLFs0LHRoaXMuc2VuZCgxMzgsbmV3IFVpbnQzMkFycmF5KFtzXSkpXTtjYXNlIDI6aWYoMCE9PWkuc2VudCgpLmdldFVpbnQ4KDEpKXRocm93IG5ldyBFcnJvcihcIkZsYXNoIGVycm9yXCIpO3JldHVybls0LHRoaXMud3JpdGVCdWZmZXIobixyKV07Y2FzZSAzOnJldHVybiBpLnNlbnQoKSx0aGlzLmVtaXQoZS5FVkVOVF9QUk9HUkVTUywxKSxbNCx0aGlzLnNlbmQoMTM5KV07Y2FzZSA0OmlmKDAhPT1pLnNlbnQoKS5nZXRVaW50OCgxKSl0aHJvdyBuZXcgRXJyb3IoXCJGbGFzaCBlcnJvclwiKTtyZXR1cm5bNCx0aGlzLnNlbmQoMTM3KV07Y2FzZSA1OnJldHVybiBpLnNlbnQoKSxbMyw4XTtjYXNlIDY6cmV0dXJuIG89aS5zZW50KCksWzQsdGhpcy5jbGVhckFib3J0KCldO2Nhc2UgNzp0aHJvdyBpLnNlbnQoKSxvO2Nhc2UgODpyZXR1cm5bMl19fSkpfSkpfSxlLnByb3RvdHlwZS5nZXRTZXJpYWxCYXVkcmF0ZT1mdW5jdGlvbigpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgdDtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihlKXtzd2l0Y2goZS5sYWJlbCl7Y2FzZSAwOnJldHVybiBlLnRyeXMucHVzaChbMCwyLCw0XSksWzQsdGhpcy5zZW5kKDEyOSldO2Nhc2UgMTpyZXR1cm5bMixlLnNlbnQoKS5nZXRVaW50MzIoMSwhMCldO2Nhc2UgMjpyZXR1cm4gdD1lLnNlbnQoKSxbNCx0aGlzLmNsZWFyQWJvcnQoKV07Y2FzZSAzOnRocm93IGUuc2VudCgpLHQ7Y2FzZSA0OnJldHVyblsyXX19KSl9KSl9LGUucHJvdG90eXBlLnNldFNlcmlhbEJhdWRyYXRlPWZ1bmN0aW9uKHQpe3JldHVybiB2b2lkIDA9PT10JiYodD05NjAwKSxuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgZTtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihyKXtzd2l0Y2goci5sYWJlbCl7Y2FzZSAwOnJldHVybiByLnRyeXMucHVzaChbMCwyLCw0XSksWzQsdGhpcy5zZW5kKDEzMCxuZXcgVWludDMyQXJyYXkoW3RdKSldO2Nhc2UgMTpyZXR1cm4gci5zZW50KCksWzMsNF07Y2FzZSAyOnJldHVybiBlPXIuc2VudCgpLFs0LHRoaXMuY2xlYXJBYm9ydCgpXTtjYXNlIDM6dGhyb3cgci5zZW50KCksZTtjYXNlIDQ6cmV0dXJuWzJdfX0pKX0pKX0sZS5wcm90b3R5cGUuc2VyaWFsV3JpdGU9ZnVuY3Rpb24odCl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciBlLHI7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24obil7c3dpdGNoKG4ubGFiZWwpe2Nhc2UgMDooZT10LnNwbGl0KFwiXCIpLm1hcCgoZnVuY3Rpb24odCl7cmV0dXJuIHQuY2hhckNvZGVBdCgwKX0pKSkudW5zaGlmdChlLmxlbmd0aCksbi5sYWJlbD0xO2Nhc2UgMTpyZXR1cm4gbi50cnlzLnB1c2goWzEsMywsNV0pLFs0LHRoaXMuc2VuZCgxMzIsbmV3IFVpbnQ4QXJyYXkoZSkuYnVmZmVyKV07Y2FzZSAyOnJldHVybiBuLnNlbnQoKSxbMyw1XTtjYXNlIDM6cmV0dXJuIHI9bi5zZW50KCksWzQsdGhpcy5jbGVhckFib3J0KCldO2Nhc2UgNDp0aHJvdyBuLnNlbnQoKSxyO2Nhc2UgNTpyZXR1cm5bMl19fSkpfSkpfSxlLnByb3RvdHlwZS5zZXJpYWxSZWFkPWZ1bmN0aW9uKCl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciB0LGUscjtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihuKXtzd2l0Y2gobi5sYWJlbCl7Y2FzZSAwOnJldHVybiBuLnRyeXMucHVzaChbMCwyLCw0XSksWzQsdGhpcy5zZW5kKDEzMSldO2Nhc2UgMTpyZXR1cm4gMD09PSh0PW4uc2VudCgpKS5ieXRlTGVuZ3RofHwoMTMxIT09dC5nZXRVaW50OCgwKXx8MD09PShlPXQuZ2V0VWludDgoMSkpKT9bMix2b2lkIDBdOigyLFsyLHQuYnVmZmVyLnNsaWNlKDIsMitlKV0pO2Nhc2UgMjpyZXR1cm4gcj1uLnNlbnQoKSxbNCx0aGlzLmNsZWFyQWJvcnQoKV07Y2FzZSAzOnRocm93IG4uc2VudCgpLHI7Y2FzZSA0OnJldHVyblsyXX19KSl9KSl9LGUucHJvdG90eXBlLnN0YXJ0U2VyaWFsUmVhZD1mdW5jdGlvbih0LHIpe3JldHVybiB2b2lkIDA9PT10JiYodD0xMDApLHZvaWQgMD09PXImJihyPSEwKSxuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgbixzLG87cmV0dXJuIGkodGhpcywoZnVuY3Rpb24oaSl7c3dpdGNoKGkubGFiZWwpe2Nhc2UgMDp0aGlzLnNlcmlhbFBvbGxpbmc9ITAsaS5sYWJlbD0xO2Nhc2UgMTpyZXR1cm4gdGhpcy5zZXJpYWxQb2xsaW5nP3RoaXMuc2VyaWFsTGlzdGVuZXJzPyhuPXRoaXMuY29ubmVjdGVkLCExIT09dGhpcy5jb25uZWN0ZWR8fCEwIT09cj9bMywzXTpbNCx0aGlzLmNvbm5lY3QoKV0pOlszLDddOlszLDldO2Nhc2UgMjppLnNlbnQoKSxpLmxhYmVsPTM7Y2FzZSAzOnJldHVybls0LHRoaXMuc2VyaWFsUmVhZCgpXTtjYXNlIDQ6cmV0dXJuIHM9aS5zZW50KCksITEhPT1ufHwhMCE9PXI/WzMsNl06WzQsdGhpcy5kaXNjb25uZWN0KCldO2Nhc2UgNTppLnNlbnQoKSxpLmxhYmVsPTY7Y2FzZSA2OnZvaWQgMCE9PXMmJihvPUUuZGVjb2RlKHMpLHRoaXMuZW1pdChlLkVWRU5UX1NFUklBTF9EQVRBLG8pKSxpLmxhYmVsPTc7Y2FzZSA3OnJldHVybls0LG5ldyBQcm9taXNlKChmdW5jdGlvbihlKXtyZXR1cm4gc2V0VGltZW91dChlLHQpfSkpXTtjYXNlIDg6cmV0dXJuIGkuc2VudCgpLFszLDFdO2Nhc2UgOTpyZXR1cm5bMl19fSkpfSkpfSxlLnByb3RvdHlwZS5zdG9wU2VyaWFsUmVhZD1mdW5jdGlvbigpe3RoaXMuc2VyaWFsUG9sbGluZz0hMX0sZS5FVkVOVF9QUk9HUkVTUz1cInByb2dyZXNzXCIsZS5FVkVOVF9TRVJJQUxfREFUQT1cInNlcmlhbFwiLGV9KGcpLFQ9ZnVuY3Rpb24oKXtmdW5jdGlvbiB0KHQsZSxyKXt2b2lkIDA9PT1lJiYoZT0wKSx2b2lkIDA9PT1yJiYocj1tKTt0aGlzLnByb3h5PXZvaWQgMCE9PXQub3Blbj9uZXcgZyh0LGUscik6dH1yZXR1cm4gdC5wcm90b3R5cGUud2FpdERlbGF5PWZ1bmN0aW9uKHQsZSxyKXtyZXR1cm4gdm9pZCAwPT09ZSYmKGU9MCksdm9pZCAwPT09ciYmKHI9MTAwKSxuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgbjtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihpKXtzd2l0Y2goaS5sYWJlbCl7Y2FzZSAwOm49ITAsZT4wJiZzZXRUaW1lb3V0KChmdW5jdGlvbigpe2lmKG4pdGhyb3cgbj0hMSxuZXcgRXJyb3IoXCJXYWl0IHRpbWVkIG91dFwiKX0pLGUpLGkubGFiZWw9MTtjYXNlIDE6cmV0dXJuIG4/WzQsdCgpXTpbMyw1XTtjYXNlIDI6cmV0dXJuITA9PT1pLnNlbnQoKT8obj0hMSxbMl0pOnI+MD9bNCxuZXcgUHJvbWlzZSgoZnVuY3Rpb24odCl7cmV0dXJuIHNldFRpbWVvdXQodCxlKX0pKV06WzMsNF07Y2FzZSAzOmkuc2VudCgpLGkubGFiZWw9NDtjYXNlIDQ6cmV0dXJuWzMsMV07Y2FzZSA1OnJldHVyblsyXX19KSl9KSl9LHQucHJvdG90eXBlLmNvbmNhdFR5cGVkQXJyYXk9ZnVuY3Rpb24odCl7aWYoMT09PXQubGVuZ3RoKXJldHVybiB0WzBdO2Zvcih2YXIgZT0wLHI9MCxuPXQ7cjxuLmxlbmd0aDtyKyspe2UrPW5bcl0ubGVuZ3RofWZvcih2YXIgaT1uZXcgVWludDMyQXJyYXkoZSkscz0wLG89MDtzPHQubGVuZ3RoO3MrKylpLnNldCh0W3NdLG8pLG8rPXRbc10ubGVuZ3RoO3JldHVybiBpfSx0LnByb3RvdHlwZS5yZWFkRFBDb21tYW5kPWZ1bmN0aW9uKHQpe3JldHVyblt7bW9kZToyLHBvcnQ6MCxyZWdpc3Rlcjp0fV19LHQucHJvdG90eXBlLndyaXRlRFBDb21tYW5kPWZ1bmN0aW9uKHQsZSl7aWYoOD09PXQpe2lmKGU9PT10aGlzLnNlbGVjdGVkQWRkcmVzcylyZXR1cm5bXTt0aGlzLnNlbGVjdGVkQWRkcmVzcz1lfXJldHVyblt7bW9kZTowLHBvcnQ6MCxyZWdpc3Rlcjp0LHZhbHVlOmV9XX0sdC5wcm90b3R5cGUucmVhZEFQQ29tbWFuZD1mdW5jdGlvbih0KXt2YXIgZT00Mjc4MTkwMDgwJnR8MjQwJnQ7cmV0dXJuIHRoaXMud3JpdGVEUENvbW1hbmQoOCxlKS5jb25jYXQoe21vZGU6Mixwb3J0OjEscmVnaXN0ZXI6dH0pfSx0LnByb3RvdHlwZS53cml0ZUFQQ29tbWFuZD1mdW5jdGlvbih0LGUpe2lmKDA9PT10KXtpZihlPT09dGhpcy5jc3dWYWx1ZSlyZXR1cm5bXTt0aGlzLmNzd1ZhbHVlPWV9dmFyIHI9NDI3ODE5MDA4MCZ0fDI0MCZ0O3JldHVybiB0aGlzLndyaXRlRFBDb21tYW5kKDgscikuY29uY2F0KHttb2RlOjAscG9ydDoxLHJlZ2lzdGVyOnQsdmFsdWU6ZX0pfSx0LnByb3RvdHlwZS5yZWFkTWVtMTZDb21tYW5kPWZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLndyaXRlQVBDb21tYW5kKDAsNTg3MjAyNjQxKS5jb25jYXQodGhpcy53cml0ZUFQQ29tbWFuZCg0LHQpKS5jb25jYXQodGhpcy5yZWFkQVBDb21tYW5kKDEyKSl9LHQucHJvdG90eXBlLndyaXRlTWVtMTZDb21tYW5kPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIHRoaXMud3JpdGVBUENvbW1hbmQoMCw1ODcyMDI2NDEpLmNvbmNhdCh0aGlzLndyaXRlQVBDb21tYW5kKDQsdCkpLmNvbmNhdCh0aGlzLndyaXRlQVBDb21tYW5kKDEyLGUpKX0sdC5wcm90b3R5cGUucmVhZE1lbTMyQ29tbWFuZD1mdW5jdGlvbih0KXtyZXR1cm4gdGhpcy53cml0ZUFQQ29tbWFuZCgwLDU4NzIwMjY0MikuY29uY2F0KHRoaXMud3JpdGVBUENvbW1hbmQoNCx0KSkuY29uY2F0KHRoaXMucmVhZEFQQ29tbWFuZCgxMikpfSx0LnByb3RvdHlwZS53cml0ZU1lbTMyQ29tbWFuZD1mdW5jdGlvbih0LGUpe3JldHVybiB0aGlzLndyaXRlQVBDb21tYW5kKDAsNTg3MjAyNjQyKS5jb25jYXQodGhpcy53cml0ZUFQQ29tbWFuZCg0LHQpKS5jb25jYXQodGhpcy53cml0ZUFQQ29tbWFuZCgxMixlKSl9LHQucHJvdG90eXBlLnRyYW5zZmVyU2VxdWVuY2U9ZnVuY3Rpb24odCl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciBlLHIsbixzO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKGkpe3N3aXRjaChpLmxhYmVsKXtjYXNlIDA6ZT0oZT1bXSkuY29uY2F0LmFwcGx5KGUsdCkscj1bXSxpLmxhYmVsPTE7Y2FzZSAxOnJldHVybiBlLmxlbmd0aD8obj1lLnNwbGljZSgwLHRoaXMucHJveHkub3BlcmF0aW9uQ291bnQpLFs0LHRoaXMucHJveHkudHJhbnNmZXIobildKTpbMywzXTtjYXNlIDI6cmV0dXJuIHM9aS5zZW50KCksci5wdXNoKHMpLFszLDFdO2Nhc2UgMzpyZXR1cm5bMix0aGlzLmNvbmNhdFR5cGVkQXJyYXkocildfX0pKX0pKX0sdC5wcm90b3R5cGUuY29ubmVjdD1mdW5jdGlvbigpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgdCxlPXRoaXM7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24ocil7c3dpdGNoKHIubGFiZWwpe2Nhc2UgMDpyZXR1cm4gdD0tMTYxMDYxMjczNixbNCx0aGlzLnByb3h5LmNvbm5lY3QoKV07Y2FzZSAxOnJldHVybiByLnNlbnQoKSxbNCx0aGlzLnJlYWREUCgwKV07Y2FzZSAyOnJldHVybiByLnNlbnQoKSxbNCx0aGlzLnRyYW5zZmVyU2VxdWVuY2UoW3RoaXMud3JpdGVEUENvbW1hbmQoMCw0KSx0aGlzLndyaXRlRFBDb21tYW5kKDgsMCksdGhpcy53cml0ZURQQ29tbWFuZCg0LDEzNDIxNzcyODApXSldO2Nhc2UgMzpyZXR1cm4gci5zZW50KCksWzQsdGhpcy53YWl0RGVsYXkoKGZ1bmN0aW9uKCl7cmV0dXJuIG4oZSx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKGUpe3N3aXRjaChlLmxhYmVsKXtjYXNlIDA6cmV0dXJuWzQsdGhpcy5yZWFkRFAoNCldO2Nhc2UgMTpyZXR1cm5bMiwoZS5zZW50KCkmdCk9PT10XX19KSl9KSl9KSldO2Nhc2UgNDpyZXR1cm4gci5zZW50KCksWzJdfX0pKX0pKX0sdC5wcm90b3R5cGUuZGlzY29ubmVjdD1mdW5jdGlvbigpe3JldHVybiB0aGlzLnByb3h5LmRpc2Nvbm5lY3QoKX0sdC5wcm90b3R5cGUucmVjb25uZWN0PWZ1bmN0aW9uKCl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKHQpe3N3aXRjaCh0LmxhYmVsKXtjYXNlIDA6cmV0dXJuWzQsdGhpcy5kaXNjb25uZWN0KCldO2Nhc2UgMTpyZXR1cm4gdC5zZW50KCksWzQsbmV3IFByb21pc2UoKGZ1bmN0aW9uKHQpe3JldHVybiBzZXRUaW1lb3V0KHQsMTAwKX0pKV07Y2FzZSAyOnJldHVybiB0LnNlbnQoKSxbNCx0aGlzLmNvbm5lY3QoKV07Y2FzZSAzOnJldHVybiB0LnNlbnQoKSxbMl19fSkpfSkpfSx0LnByb3RvdHlwZS5yZXNldD1mdW5jdGlvbigpe3JldHVybiB0aGlzLnByb3h5LnJlc2V0KCl9LHQucHJvdG90eXBlLnJlYWREUD1mdW5jdGlvbih0KXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24oZSl7c3dpdGNoKGUubGFiZWwpe2Nhc2UgMDpyZXR1cm5bNCx0aGlzLnByb3h5LnRyYW5zZmVyKHRoaXMucmVhZERQQ29tbWFuZCh0KSldO2Nhc2UgMTpyZXR1cm5bMixlLnNlbnQoKVswXV19fSkpfSkpfSx0LnByb3RvdHlwZS53cml0ZURQPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKHIpe3N3aXRjaChyLmxhYmVsKXtjYXNlIDA6cmV0dXJuWzQsdGhpcy5wcm94eS50cmFuc2Zlcih0aGlzLndyaXRlRFBDb21tYW5kKHQsZSkpXTtjYXNlIDE6cmV0dXJuIHIuc2VudCgpLFsyXX19KSl9KSl9LHQucHJvdG90eXBlLnJlYWRBUD1mdW5jdGlvbih0KXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24oZSl7c3dpdGNoKGUubGFiZWwpe2Nhc2UgMDpyZXR1cm5bNCx0aGlzLnByb3h5LnRyYW5zZmVyKHRoaXMucmVhZEFQQ29tbWFuZCh0KSldO2Nhc2UgMTpyZXR1cm5bMixlLnNlbnQoKVswXV19fSkpfSkpfSx0LnByb3RvdHlwZS53cml0ZUFQPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKHIpe3N3aXRjaChyLmxhYmVsKXtjYXNlIDA6cmV0dXJuWzQsdGhpcy5wcm94eS50cmFuc2Zlcih0aGlzLndyaXRlQVBDb21tYW5kKHQsZSkpXTtjYXNlIDE6cmV0dXJuIHIuc2VudCgpLFsyXX19KSl9KSl9LHQucHJvdG90eXBlLnJlYWRNZW0xNj1mdW5jdGlvbih0KXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24oZSl7c3dpdGNoKGUubGFiZWwpe2Nhc2UgMDpyZXR1cm5bNCx0aGlzLnByb3h5LnRyYW5zZmVyKHRoaXMucmVhZE1lbTE2Q29tbWFuZCh0KSldO2Nhc2UgMTpyZXR1cm5bMixlLnNlbnQoKVswXV19fSkpfSkpfSx0LnByb3RvdHlwZS53cml0ZU1lbTE2PWZ1bmN0aW9uKHQsZSl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKHIpe3N3aXRjaChyLmxhYmVsKXtjYXNlIDA6cmV0dXJuIGU8PD0oMiZ0KTw8MyxbNCx0aGlzLnByb3h5LnRyYW5zZmVyKHRoaXMud3JpdGVNZW0xNkNvbW1hbmQodCxlKSldO2Nhc2UgMTpyZXR1cm4gci5zZW50KCksWzJdfX0pKX0pKX0sdC5wcm90b3R5cGUucmVhZE1lbTMyPWZ1bmN0aW9uKHQpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihlKXtzd2l0Y2goZS5sYWJlbCl7Y2FzZSAwOnJldHVybls0LHRoaXMucHJveHkudHJhbnNmZXIodGhpcy5yZWFkTWVtMzJDb21tYW5kKHQpKV07Y2FzZSAxOnJldHVyblsyLGUuc2VudCgpWzBdXX19KSl9KSl9LHQucHJvdG90eXBlLndyaXRlTWVtMzI9ZnVuY3Rpb24odCxlKXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24ocil7c3dpdGNoKHIubGFiZWwpe2Nhc2UgMDpyZXR1cm5bNCx0aGlzLnByb3h5LnRyYW5zZmVyKHRoaXMud3JpdGVNZW0zMkNvbW1hbmQodCxlKSldO2Nhc2UgMTpyZXR1cm4gci5zZW50KCksWzJdfX0pKX0pKX0sdC5wcm90b3R5cGUucmVhZEJsb2NrPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciByLG4scyxvO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKGkpe3N3aXRjaChpLmxhYmVsKXtjYXNlIDA6cmV0dXJuWzQsdGhpcy50cmFuc2ZlclNlcXVlbmNlKFt0aGlzLndyaXRlQVBDb21tYW5kKDAsNTg3MjAyNjQyKSx0aGlzLndyaXRlQVBDb21tYW5kKDQsdCldKV07Y2FzZSAxOmkuc2VudCgpLHI9W10sbj1lLGkubGFiZWw9MjtjYXNlIDI6cmV0dXJuIG4+MD8ocz1NYXRoLm1pbihuLE1hdGguZmxvb3IodGhpcy5wcm94eS5ibG9ja1NpemUvNCkpLFs0LHRoaXMucHJveHkudHJhbnNmZXJCbG9jaygxLDEyLHMpXSk6WzMsNF07Y2FzZSAzOnJldHVybiBvPWkuc2VudCgpLHIucHVzaChvKSxuLT1zLFszLDJdO2Nhc2UgNDpyZXR1cm5bMix0aGlzLmNvbmNhdFR5cGVkQXJyYXkocildfX0pKX0pKX0sdC5wcm90b3R5cGUud3JpdGVCbG9jaz1mdW5jdGlvbih0LGUpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgcixuO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKGkpe3N3aXRjaChpLmxhYmVsKXtjYXNlIDA6cmV0dXJuWzQsdGhpcy50cmFuc2ZlclNlcXVlbmNlKFt0aGlzLndyaXRlQVBDb21tYW5kKDAsNTg3MjAyNjQyKSx0aGlzLndyaXRlQVBDb21tYW5kKDQsdCldKV07Y2FzZSAxOmkuc2VudCgpLHI9MCxpLmxhYmVsPTI7Y2FzZSAyOnJldHVybiByPGUubGVuZ3RoPyhuPWUuc2xpY2UocixyK01hdGguZmxvb3IodGhpcy5wcm94eS5ibG9ja1NpemUvNCkpLFs0LHRoaXMucHJveHkudHJhbnNmZXJCbG9jaygxLDEyLG4pXSk6WzMsNF07Y2FzZSAzOnJldHVybiBpLnNlbnQoKSxyKz1NYXRoLmZsb29yKHRoaXMucHJveHkuYmxvY2tTaXplLzQpLFszLDJdO2Nhc2UgNDpyZXR1cm5bMl19fSkpfSkpfSx0fSgpLEw9NDg2ODIsXz1mdW5jdGlvbih0KXtmdW5jdGlvbiBlKCl7cmV0dXJuIG51bGwhPT10JiZ0LmFwcGx5KHRoaXMsYXJndW1lbnRzKXx8dGhpc31yZXR1cm4gcihlLHQpLGUucHJvdG90eXBlLmVuYWJsZURlYnVnPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMud3JpdGVNZW0zMigzNzU4MTU3Mjk2LC0xNjA0Mzg2ODE1KX0sZS5wcm90b3R5cGUucmVhZENvcmVSZWdpc3RlckNvbW1hbmQ9ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMud3JpdGVNZW0zMkNvbW1hbmQoMzc1ODE1NzMwMCx0KS5jb25jYXQodGhpcy5yZWFkTWVtMzJDb21tYW5kKDM3NTgxNTcyOTYpKS5jb25jYXQodGhpcy5yZWFkTWVtMzJDb21tYW5kKDM3NTgxNTczMDQpKX0sZS5wcm90b3R5cGUud3JpdGVDb3JlUmVnaXN0ZXJDb21tYW5kPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIHRoaXMud3JpdGVNZW0zMkNvbW1hbmQoMzc1ODE1NzMwNCxlKS5jb25jYXQodGhpcy53cml0ZU1lbTMyQ29tbWFuZCgzNzU4MTU3MzAwLDY1NTM2fHQpKX0sZS5wcm90b3R5cGUuZ2V0U3RhdGU9ZnVuY3Rpb24oKXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIHQsZSxyO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKG4pe3N3aXRjaChuLmxhYmVsKXtjYXNlIDA6cmV0dXJuWzQsdGhpcy5yZWFkTWVtMzIoMzc1ODE1NzI5NildO2Nhc2UgMTpyZXR1cm4gdD1uLnNlbnQoKSxlPTUyNDI4OCZ0PzE6MjYyMTQ0JnQ/MjoxMzEwNzImdD8zOjQsMzM1NTQ0MzImdD9bNCx0aGlzLnJlYWRNZW0zMigzNzU4MTU3Mjk2KV06WzMsM107Y2FzZSAyOnJldHVybiAzMzU1NDQzMiYocj1uLnNlbnQoKSkmJiEoMTY3NzcyMTYmcik/WzIsMF06WzIsZV07Y2FzZSAzOnJldHVyblsyLGVdO2Nhc2UgNDpyZXR1cm5bMl19fSkpfSkpfSxlLnByb3RvdHlwZS5pc0hhbHRlZD1mdW5jdGlvbigpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbih0KXtzd2l0Y2godC5sYWJlbCl7Y2FzZSAwOnJldHVybls0LHRoaXMucmVhZE1lbTMyKDM3NTgxNTcyOTYpXTtjYXNlIDE6cmV0dXJuWzIsISEoMTMxMDcyJnQuc2VudCgpKV19fSkpfSkpfSxlLnByb3RvdHlwZS5oYWx0PWZ1bmN0aW9uKHQsZSl7cmV0dXJuIHZvaWQgMD09PXQmJih0PSEwKSx2b2lkIDA9PT1lJiYoZT0wKSxuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgcj10aGlzO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKG4pe3N3aXRjaChuLmxhYmVsKXtjYXNlIDA6cmV0dXJuWzQsdGhpcy5pc0hhbHRlZCgpXTtjYXNlIDE6cmV0dXJuIG4uc2VudCgpP1syXTpbNCx0aGlzLndyaXRlTWVtMzIoMzc1ODE1NzI5NiwtMTYwNDM4NjgxMyldO2Nhc2UgMjpyZXR1cm4gbi5zZW50KCksdD9bMix0aGlzLndhaXREZWxheSgoZnVuY3Rpb24oKXtyZXR1cm4gci5pc0hhbHRlZCgpfSksZSldOlsyXX19KSl9KSl9LGUucHJvdG90eXBlLnJlc3VtZT1mdW5jdGlvbih0LGUpe3JldHVybiB2b2lkIDA9PT10JiYodD0hMCksdm9pZCAwPT09ZSYmKGU9MCksbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIHI9dGhpcztyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihzKXtzd2l0Y2gocy5sYWJlbCl7Y2FzZSAwOnJldHVybls0LHRoaXMuaXNIYWx0ZWQoKV07Y2FzZSAxOnJldHVybiBzLnNlbnQoKT9bNCx0aGlzLndyaXRlTWVtMzIoMzc1ODE1NzEwNCw3KV06WzJdO2Nhc2UgMjpyZXR1cm4gcy5zZW50KCksWzQsdGhpcy5lbmFibGVEZWJ1ZygpXTtjYXNlIDM6cmV0dXJuIHMuc2VudCgpLHQ/WzIsdGhpcy53YWl0RGVsYXkoKGZ1bmN0aW9uKCl7cmV0dXJuIG4ocix2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKHQpe3N3aXRjaCh0LmxhYmVsKXtjYXNlIDA6cmV0dXJuWzQsdGhpcy5pc0hhbHRlZCgpXTtjYXNlIDE6cmV0dXJuWzIsIXQuc2VudCgpXX19KSl9KSl9KSxlKV06WzJdfX0pKX0pKX0sZS5wcm90b3R5cGUucmVhZENvcmVSZWdpc3Rlcj1mdW5jdGlvbih0KXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIGU7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24ocil7c3dpdGNoKHIubGFiZWwpe2Nhc2UgMDpyZXR1cm5bNCx0aGlzLnRyYW5zZmVyU2VxdWVuY2UoW3RoaXMud3JpdGVNZW0zMkNvbW1hbmQoMzc1ODE1NzMwMCx0KSx0aGlzLnJlYWRNZW0zMkNvbW1hbmQoMzc1ODE1NzI5NildKV07Y2FzZSAxOmlmKGU9ci5zZW50KCksISg2NTUzNiZlWzBdKSl0aHJvdyBuZXcgRXJyb3IoXCJSZWdpc3RlciBub3QgcmVhZHlcIik7cmV0dXJuWzIsdGhpcy5yZWFkTWVtMzIoMzc1ODE1NzMwNCldfX0pKX0pKX0sZS5wcm90b3R5cGUucmVhZENvcmVSZWdpc3RlcnM9ZnVuY3Rpb24odCl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciBlLHIsbixzLG87cmV0dXJuIGkodGhpcywoZnVuY3Rpb24oaSl7c3dpdGNoKGkubGFiZWwpe2Nhc2UgMDplPVtdLHI9MCxuPXQsaS5sYWJlbD0xO2Nhc2UgMTpyZXR1cm4gcjxuLmxlbmd0aD8ocz1uW3JdLFs0LHRoaXMucmVhZENvcmVSZWdpc3RlcihzKV0pOlszLDRdO2Nhc2UgMjpvPWkuc2VudCgpLGUucHVzaChvKSxpLmxhYmVsPTM7Y2FzZSAzOnJldHVybiByKyssWzMsMV07Y2FzZSA0OnJldHVyblsyLGVdfX0pKX0pKX0sZS5wcm90b3R5cGUud3JpdGVDb3JlUmVnaXN0ZXI9ZnVuY3Rpb24odCxlKXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIHI7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24obil7c3dpdGNoKG4ubGFiZWwpe2Nhc2UgMDpyZXR1cm5bNCx0aGlzLnRyYW5zZmVyU2VxdWVuY2UoW3RoaXMud3JpdGVNZW0zMkNvbW1hbmQoMzc1ODE1NzMwNCxlKSx0aGlzLndyaXRlTWVtMzJDb21tYW5kKDM3NTgxNTczMDAsNjU1MzZ8dCksdGhpcy5yZWFkTWVtMzJDb21tYW5kKDM3NTgxNTcyOTYpXSldO2Nhc2UgMTppZihyPW4uc2VudCgpLCEoNjU1MzYmclswXSkpdGhyb3cgbmV3IEVycm9yKFwiUmVnaXN0ZXIgbm90IHJlYWR5XCIpO3JldHVyblsyXX19KSl9KSl9LGUucHJvdG90eXBlLmV4ZWN1dGU9ZnVuY3Rpb24odCxlLHIscyxvKXt2b2lkIDA9PT1vJiYobz10KzEpO2Zvcih2YXIgdT1bXSxjPTU7Yzxhcmd1bWVudHMubGVuZ3RoO2MrKyl1W2MtNV09YXJndW1lbnRzW2NdO3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgbixjLGEsaD10aGlzO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKGkpe3N3aXRjaChpLmxhYmVsKXtjYXNlIDA6Zm9yKGVbZS5sZW5ndGgtMV0hPT1MJiYoKG49bmV3IFVpbnQzMkFycmF5KGUubGVuZ3RoKzEpKS5zZXQoZSksbi5zZXQoW0xdLGUubGVuZ3RoLTEpLGU9biksYz1bdGhpcy53cml0ZUNvcmVSZWdpc3RlckNvbW1hbmQoMTMsciksdGhpcy53cml0ZUNvcmVSZWdpc3RlckNvbW1hbmQoMTUscyksdGhpcy53cml0ZUNvcmVSZWdpc3RlckNvbW1hbmQoMTQsbyldLGE9MDthPE1hdGgubWluKHUubGVuZ3RoLDEyKTthKyspYy5wdXNoKHRoaXMud3JpdGVDb3JlUmVnaXN0ZXJDb21tYW5kKGEsdVthXSkpO3JldHVybiBjLnB1c2godGhpcy53cml0ZUNvcmVSZWdpc3RlckNvbW1hbmQoMTYsMTY3NzcyMTYpKSxbNCx0aGlzLmhhbHQoKV07Y2FzZSAxOnJldHVybiBpLnNlbnQoKSxbNCx0aGlzLnRyYW5zZmVyU2VxdWVuY2UoYyldO2Nhc2UgMjpyZXR1cm4gaS5zZW50KCksWzQsdGhpcy53cml0ZUJsb2NrKHQsZSldO2Nhc2UgMzpyZXR1cm4gaS5zZW50KCksWzQsdGhpcy5yZXN1bWUoITEpXTtjYXNlIDQ6cmV0dXJuIGkuc2VudCgpLFs0LHRoaXMud2FpdERlbGF5KChmdW5jdGlvbigpe3JldHVybiBoLmlzSGFsdGVkKCl9KSwxZTQpXTtjYXNlIDU6cmV0dXJuIGkuc2VudCgpLFsyXX19KSl9KSl9LGUucHJvdG90eXBlLnNvZnRSZXNldD1mdW5jdGlvbigpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbih0KXtzd2l0Y2godC5sYWJlbCl7Y2FzZSAwOnJldHVybls0LHRoaXMud3JpdGVNZW0zMigzNzU4MTU3MzA4LDApXTtjYXNlIDE6cmV0dXJuIHQuc2VudCgpLFsyLHRoaXMud3JpdGVNZW0zMigzNzU4MTU3MDY4LDEwMDI3MDA4NCldfX0pKX0pKX0sZS5wcm90b3R5cGUuc2V0VGFyZ2V0UmVzZXRTdGF0ZT1mdW5jdGlvbih0KXtyZXR1cm4gdm9pZCAwPT09dCYmKHQ9ITApLG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciBlO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKHIpe3N3aXRjaChyLmxhYmVsKXtjYXNlIDA6cmV0dXJuWzQsdGhpcy53cml0ZU1lbTMyKDM3NTgxNTczMDgsMSldO2Nhc2UgMTpyZXR1cm4gci5zZW50KCksITAhPT10P1szLDNdOls0LHRoaXMucmVzZXQoKV07Y2FzZSAyOnJldHVybiByLnNlbnQoKSxbMyw2XTtjYXNlIDM6cmV0dXJuWzQsdGhpcy5yZWFkTWVtMzIoMzc1ODE1NzA2OCldO2Nhc2UgNDpyZXR1cm4gZT1yLnNlbnQoKSxbNCx0aGlzLndyaXRlTWVtMzIoMzc1ODE1NzA2OCwxMDAyNzAwODR8ZSldO2Nhc2UgNTpyLnNlbnQoKSxyLmxhYmVsPTY7Y2FzZSA2OnJldHVybls0LHRoaXMud3JpdGVNZW0zMigzNzU4MTU3MzA4LDApXTtjYXNlIDc6cmV0dXJuIHIuc2VudCgpLFsyXX19KSl9KSl9LGV9KFQpOyh5PXQuRlBCQ3RybE1hc2t8fCh0LkZQQkN0cmxNYXNrPXt9KSlbeS5FTkFCTEU9MV09XCJFTkFCTEVcIix5W3kuS0VZPTJdPVwiS0VZXCI7dmFyIE09ZnVuY3Rpb24oKXtmdW5jdGlvbiB0KHQpe3RoaXMuZGV2aWNlPXQsdGhpcy5vcz1cImJyb3dzZXJcIix0aGlzLnBhY2tldFNpemU9NjR9cmV0dXJuIHQucHJvdG90eXBlLm9wZW49ZnVuY3Rpb24oKXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24odCl7cmV0dXJuWzJdfSkpfSkpfSx0LnByb3RvdHlwZS5jbG9zZT1mdW5jdGlvbigpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5kZXZpY2UuY2xvc2UoKSxbMl19KSl9KSl9LHQucHJvdG90eXBlLnJlYWQ9ZnVuY3Rpb24oKXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIHQsZSxyPXRoaXM7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24obil7c3dpdGNoKG4ubGFiZWwpe2Nhc2UgMDpyZXR1cm5bNCxuZXcgUHJvbWlzZSgoZnVuY3Rpb24odCxlKXtyLmRldmljZS5yZWFkKChmdW5jdGlvbihyLG4pe2lmKHIpcmV0dXJuIGUobmV3IEVycm9yKHIpKTt0KG4pfSkpfSkpXTtjYXNlIDE6cmV0dXJuIHQ9bi5zZW50KCksZT1uZXcgVWludDhBcnJheSh0KS5idWZmZXIsWzIsbmV3IERhdGFWaWV3KGUpXX19KSl9KSl9LHQucHJvdG90eXBlLndyaXRlPWZ1bmN0aW9uKHQpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgZSxyO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKG4pe2ZvcihlPWZ1bmN0aW9uKHQpe3JldHVybiB2b2lkIDAhPT10LmJ1ZmZlcn0odCk/dC5idWZmZXI6dCxyPUFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKG5ldyBVaW50OEFycmF5KGUpKTtyLmxlbmd0aDx0aGlzLnBhY2tldFNpemU7KXIucHVzaCgwKTtpZihcIndpbjMyXCI9PT10aGlzLm9zJiZyLnVuc2hpZnQoMCksdGhpcy5kZXZpY2Uud3JpdGUocikhPT1yLmxlbmd0aCl0aHJvdyBuZXcgRXJyb3IoXCJJbmNvcnJlY3QgYnl0ZWNvdW50IHdyaXR0ZW5cIik7cmV0dXJuWzJdfSkpfSkpfSx0fSgpLHg9ZnVuY3Rpb24oKXtmdW5jdGlvbiB0KHQsZSxyLG4pe3ZvaWQgMD09PWUmJihlPTI1NSksdm9pZCAwPT09ciYmKHI9MSksdm9pZCAwPT09biYmKG49ITEpLHRoaXMuZGV2aWNlPXQsdGhpcy5pbnRlcmZhY2VDbGFzcz1lLHRoaXMuY29uZmlndXJhdGlvbj1yLHRoaXMuYWx3YXlzQ29udHJvbFRyYW5zZmVyPW4sdGhpcy5wYWNrZXRTaXplPTY0fXJldHVybiB0LnByb3RvdHlwZS5idWZmZXJUb0RhdGFWaWV3PWZ1bmN0aW9uKHQpe3ZhciBlPW5ldyBVaW50OEFycmF5KHQpLmJ1ZmZlcjtyZXR1cm4gbmV3IERhdGFWaWV3KGUpfSx0LnByb3RvdHlwZS5pc1ZpZXc9ZnVuY3Rpb24odCl7cmV0dXJuIHZvaWQgMCE9PXQuYnVmZmVyfSx0LnByb3RvdHlwZS5idWZmZXJTb3VyY2VUb0J1ZmZlcj1mdW5jdGlvbih0KXt2YXIgZT10aGlzLmlzVmlldyh0KT90LmJ1ZmZlcjp0O3JldHVybiBCdWZmZXIuZnJvbShlKX0sdC5wcm90b3R5cGUuZXh0ZW5kQnVmZmVyPWZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcy5pc1ZpZXcodCk/dC5idWZmZXI6dCxuPU1hdGgubWluKHIuYnl0ZUxlbmd0aCxlKSxpPW5ldyBVaW50OEFycmF5KG4pO3JldHVybiBpLnNldChuZXcgVWludDhBcnJheShyKSksaX0sdC5wcm90b3R5cGUub3Blbj1mdW5jdGlvbigpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgdCxlLHIsbixzLG8sdT10aGlzO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKGkpe3N3aXRjaChpLmxhYmVsKXtjYXNlIDA6cmV0dXJuIHRoaXMuZGV2aWNlLm9wZW4oKSxbNCxuZXcgUHJvbWlzZSgoZnVuY3Rpb24odCxlKXt1LmRldmljZS5zZXRDb25maWd1cmF0aW9uKHUuY29uZmlndXJhdGlvbiwoZnVuY3Rpb24ocil7cj9lKG5ldyBFcnJvcihyKSk6dCgpfSkpfSkpXTtjYXNlIDE6aWYoaS5zZW50KCksISh0PXRoaXMuZGV2aWNlLmludGVyZmFjZXMuZmlsdGVyKChmdW5jdGlvbih0KXtyZXR1cm4gdC5kZXNjcmlwdG9yLmJJbnRlcmZhY2VDbGFzcz09PXUuaW50ZXJmYWNlQ2xhc3N9KSkpLmxlbmd0aCl0aHJvdyBuZXcgRXJyb3IoXCJObyB2YWxpZCBpbnRlcmZhY2VzIGZvdW5kLlwiKTtpZigoZT10LmZpbmQoKGZ1bmN0aW9uKHQpe3JldHVybiB0LmVuZHBvaW50cy5sZW5ndGg+MH0pKSl8fChlPXRbMF0pLHRoaXMuaW50ZXJmYWNlTnVtYmVyPWUuaW50ZXJmYWNlTnVtYmVyLCF0aGlzLmFsd2F5c0NvbnRyb2xUcmFuc2Zlcil7Zm9yKHI9ZS5lbmRwb2ludHMsdGhpcy5lbmRwb2ludEluPXZvaWQgMCx0aGlzLmVuZHBvaW50T3V0PXZvaWQgMCxuPTAscz1yO248cy5sZW5ndGg7bisrKVwiaW5cIiE9PShvPXNbbl0pLmRpcmVjdGlvbnx8dGhpcy5lbmRwb2ludEluP1wib3V0XCIhPT1vLmRpcmVjdGlvbnx8dGhpcy5lbmRwb2ludE91dHx8KHRoaXMuZW5kcG9pbnRPdXQ9byk6dGhpcy5lbmRwb2ludEluPW87aWYodGhpcy5lbmRwb2ludElufHx0aGlzLmVuZHBvaW50T3V0KXRyeXtlLmNsYWltKCl9Y2F0Y2godCl7dGhpcy5lbmRwb2ludEluPXZvaWQgMCx0aGlzLmVuZHBvaW50T3V0PXZvaWQgMH19cmV0dXJuWzJdfX0pKX0pKX0sdC5wcm90b3R5cGUuY2xvc2U9ZnVuY3Rpb24oKXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuZGV2aWNlLmNsb3NlKCksWzJdfSkpfSkpfSx0LnByb3RvdHlwZS5yZWFkPWZ1bmN0aW9uKCl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciB0LGU9dGhpcztyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihyKXtzd2l0Y2goci5sYWJlbCl7Y2FzZSAwOmlmKHZvaWQgMD09PXRoaXMuaW50ZXJmYWNlTnVtYmVyKXRocm93IG5ldyBFcnJvcihcIk5vIGRldmljZSBvcGVuZWRcIik7cmV0dXJuWzQsbmV3IFByb21pc2UoKGZ1bmN0aW9uKHQscil7ZS5lbmRwb2ludEluP2UuZW5kcG9pbnRJbi50cmFuc2ZlcihlLnBhY2tldFNpemUsKGZ1bmN0aW9uKGUsbil7ZT9yKGUpOnQobil9KSk6ZS5kZXZpY2UuY29udHJvbFRyYW5zZmVyKDE2MSwxLDI1NixlLmludGVyZmFjZU51bWJlcixlLnBhY2tldFNpemUsKGZ1bmN0aW9uKGUsbil7ZT9yKGUpOm4/dChuKTpyKG5ldyBFcnJvcihcIk5vIGJ1ZmZlciByZWFkXCIpKX0pKX0pKV07Y2FzZSAxOnJldHVybiB0PXIuc2VudCgpLFsyLHRoaXMuYnVmZmVyVG9EYXRhVmlldyh0KV19fSkpfSkpfSx0LnByb3RvdHlwZS53cml0ZT1mdW5jdGlvbih0KXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIGUscixuPXRoaXM7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24oaSl7c3dpdGNoKGkubGFiZWwpe2Nhc2UgMDppZih2b2lkIDA9PT10aGlzLmludGVyZmFjZU51bWJlcil0aHJvdyBuZXcgRXJyb3IoXCJObyBkZXZpY2Ugb3BlbmVkXCIpO3JldHVybiBlPXRoaXMuZXh0ZW5kQnVmZmVyKHQsdGhpcy5wYWNrZXRTaXplKSxyPXRoaXMuYnVmZmVyU291cmNlVG9CdWZmZXIoZSksWzQsbmV3IFByb21pc2UoKGZ1bmN0aW9uKHQsZSl7bi5lbmRwb2ludE91dD9uLmVuZHBvaW50T3V0LnRyYW5zZmVyKHIsKGZ1bmN0aW9uKHIpe2lmKHIpcmV0dXJuIGUocik7dCgpfSkpOm4uZGV2aWNlLmNvbnRyb2xUcmFuc2ZlcigzMyw5LDUxMixuLmludGVyZmFjZU51bWJlcixyLChmdW5jdGlvbihyKXtpZihyKXJldHVybiBlKHIpO3QoKX0pKX0pKV07Y2FzZSAxOnJldHVybiBpLnNlbnQoKSxbMl19fSkpfSkpfSx0fSgpLFM9ZnVuY3Rpb24oKXtmdW5jdGlvbiB0KHQsZSxyLG4pe3ZvaWQgMD09PWUmJihlPTI1NSksdm9pZCAwPT09ciYmKHI9MSksdm9pZCAwPT09biYmKG49ITEpLHRoaXMuZGV2aWNlPXQsdGhpcy5pbnRlcmZhY2VDbGFzcz1lLHRoaXMuY29uZmlndXJhdGlvbj1yLHRoaXMuYWx3YXlzQ29udHJvbFRyYW5zZmVyPW4sdGhpcy5wYWNrZXRTaXplPTY0fXJldHVybiB0LnByb3RvdHlwZS5leHRlbmRCdWZmZXI9ZnVuY3Rpb24odCxlKXt2YXIgcj12b2lkIDAhPT10LmJ1ZmZlcj90LmJ1ZmZlcjp0LG49TWF0aC5taW4oci5ieXRlTGVuZ3RoLGUpLGk9bmV3IFVpbnQ4QXJyYXkobik7cmV0dXJuIGkuc2V0KG5ldyBVaW50OEFycmF5KHIpKSxpfSx0LnByb3RvdHlwZS5vcGVuPWZ1bmN0aW9uKCl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciB0LGUscixuLHMsbyx1PXRoaXM7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24oaSl7c3dpdGNoKGkubGFiZWwpe2Nhc2UgMDpyZXR1cm5bNCx0aGlzLmRldmljZS5vcGVuKCldO2Nhc2UgMTpyZXR1cm4gaS5zZW50KCksWzQsdGhpcy5kZXZpY2Uuc2VsZWN0Q29uZmlndXJhdGlvbih0aGlzLmNvbmZpZ3VyYXRpb24pXTtjYXNlIDI6aWYoaS5zZW50KCksISh0PXRoaXMuZGV2aWNlLmNvbmZpZ3VyYXRpb24uaW50ZXJmYWNlcy5maWx0ZXIoKGZ1bmN0aW9uKHQpe3JldHVybiB0LmFsdGVybmF0ZXNbMF0uaW50ZXJmYWNlQ2xhc3M9PT11LmludGVyZmFjZUNsYXNzfSkpKS5sZW5ndGgpdGhyb3cgbmV3IEVycm9yKFwiTm8gdmFsaWQgaW50ZXJmYWNlcyBmb3VuZC5cIik7aWYoKGU9dC5maW5kKChmdW5jdGlvbih0KXtyZXR1cm4gdC5hbHRlcm5hdGVzWzBdLmVuZHBvaW50cy5sZW5ndGg+MH0pKSl8fChlPXRbMF0pLHRoaXMuaW50ZXJmYWNlTnVtYmVyPWUuaW50ZXJmYWNlTnVtYmVyLCF0aGlzLmFsd2F5c0NvbnRyb2xUcmFuc2Zlcilmb3Iocj1lLmFsdGVybmF0ZXNbMF0uZW5kcG9pbnRzLHRoaXMuZW5kcG9pbnRJbj12b2lkIDAsdGhpcy5lbmRwb2ludE91dD12b2lkIDAsbj0wLHM9cjtuPHMubGVuZ3RoO24rKylcImluXCIhPT0obz1zW25dKS5kaXJlY3Rpb258fHRoaXMuZW5kcG9pbnRJbj9cIm91dFwiIT09by5kaXJlY3Rpb258fHRoaXMuZW5kcG9pbnRPdXR8fCh0aGlzLmVuZHBvaW50T3V0PW8pOnRoaXMuZW5kcG9pbnRJbj1vO3JldHVyblsyLHRoaXMuZGV2aWNlLmNsYWltSW50ZXJmYWNlKHRoaXMuaW50ZXJmYWNlTnVtYmVyKV19fSkpfSkpfSx0LnByb3RvdHlwZS5jbG9zZT1mdW5jdGlvbigpe3JldHVybiB0aGlzLmRldmljZS5jbG9zZSgpfSx0LnByb3RvdHlwZS5yZWFkPWZ1bmN0aW9uKCl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciB0O3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKGUpe3N3aXRjaChlLmxhYmVsKXtjYXNlIDA6aWYodm9pZCAwPT09dGhpcy5pbnRlcmZhY2VOdW1iZXIpdGhyb3cgbmV3IEVycm9yKFwiTm8gZGV2aWNlIG9wZW5lZFwiKTtyZXR1cm4gdGhpcy5lbmRwb2ludEluP1s0LHRoaXMuZGV2aWNlLnRyYW5zZmVySW4odGhpcy5lbmRwb2ludEluLmVuZHBvaW50TnVtYmVyLHRoaXMucGFja2V0U2l6ZSldOlszLDJdO2Nhc2UgMTpyZXR1cm4gdD1lLnNlbnQoKSxbMyw0XTtjYXNlIDI6cmV0dXJuWzQsdGhpcy5kZXZpY2UuY29udHJvbFRyYW5zZmVySW4oe3JlcXVlc3RUeXBlOlwiY2xhc3NcIixyZWNpcGllbnQ6XCJpbnRlcmZhY2VcIixyZXF1ZXN0OjEsdmFsdWU6MjU2LGluZGV4OnRoaXMuaW50ZXJmYWNlTnVtYmVyfSx0aGlzLnBhY2tldFNpemUpXTtjYXNlIDM6dD1lLnNlbnQoKSxlLmxhYmVsPTQ7Y2FzZSA0OnJldHVyblsyLHQuZGF0YV19fSkpfSkpfSx0LnByb3RvdHlwZS53cml0ZT1mdW5jdGlvbih0KXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIGU7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24ocil7c3dpdGNoKHIubGFiZWwpe2Nhc2UgMDppZih2b2lkIDA9PT10aGlzLmludGVyZmFjZU51bWJlcil0aHJvdyBuZXcgRXJyb3IoXCJObyBkZXZpY2Ugb3BlbmVkXCIpO3JldHVybiBlPXRoaXMuZXh0ZW5kQnVmZmVyKHQsdGhpcy5wYWNrZXRTaXplKSx0aGlzLmVuZHBvaW50T3V0P1s0LHRoaXMuZGV2aWNlLnRyYW5zZmVyT3V0KHRoaXMuZW5kcG9pbnRPdXQuZW5kcG9pbnROdW1iZXIsZSldOlszLDJdO2Nhc2UgMTpyZXR1cm4gci5zZW50KCksWzMsNF07Y2FzZSAyOnJldHVybls0LHRoaXMuZGV2aWNlLmNvbnRyb2xUcmFuc2Zlck91dCh7cmVxdWVzdFR5cGU6XCJjbGFzc1wiLHJlY2lwaWVudDpcImludGVyZmFjZVwiLHJlcXVlc3Q6OSx2YWx1ZTo1MTIsaW5kZXg6dGhpcy5pbnRlcmZhY2VOdW1iZXJ9LGUpXTtjYXNlIDM6ci5zZW50KCksci5sYWJlbD00O2Nhc2UgNDpyZXR1cm5bMl19fSkpfSkpfSx0fSgpO3QuQURJPVQsdC5DbXNpc0RBUD1nLHQuQ29ydGV4TT1fLHQuREFQTGluaz1QLHQuREVGQVVMVF9DTE9DS19GUkVRVUVOQ1k9bSx0LkhJRD1NLHQuVVNCPXgsdC5XZWJVU0I9UyxPYmplY3QuZGVmaW5lUHJvcGVydHkodCxcIl9fZXNNb2R1bGVcIix7dmFsdWU6ITB9KX0pKTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhcC51bWQuanMubWFwXG4iLCIoZnVuY3Rpb24oYSxiKXtpZihcImZ1bmN0aW9uXCI9PXR5cGVvZiBkZWZpbmUmJmRlZmluZS5hbWQpZGVmaW5lKFtdLGIpO2Vsc2UgaWYoXCJ1bmRlZmluZWRcIiE9dHlwZW9mIGV4cG9ydHMpYigpO2Vsc2V7YigpLGEuRmlsZVNhdmVyPXtleHBvcnRzOnt9fS5leHBvcnRzfX0pKHRoaXMsZnVuY3Rpb24oKXtcInVzZSBzdHJpY3RcIjtmdW5jdGlvbiBiKGEsYil7cmV0dXJuXCJ1bmRlZmluZWRcIj09dHlwZW9mIGI/Yj17YXV0b0JvbTohMX06XCJvYmplY3RcIiE9dHlwZW9mIGImJihjb25zb2xlLndhcm4oXCJEZXByZWNhdGVkOiBFeHBlY3RlZCB0aGlyZCBhcmd1bWVudCB0byBiZSBhIG9iamVjdFwiKSxiPXthdXRvQm9tOiFifSksYi5hdXRvQm9tJiYvXlxccyooPzp0ZXh0XFwvXFxTKnxhcHBsaWNhdGlvblxcL3htbHxcXFMqXFwvXFxTKlxcK3htbClcXHMqOy4qY2hhcnNldFxccyo9XFxzKnV0Zi04L2kudGVzdChhLnR5cGUpP25ldyBCbG9iKFtcIlxcdUZFRkZcIixhXSx7dHlwZTphLnR5cGV9KTphfWZ1bmN0aW9uIGMoYSxiLGMpe3ZhciBkPW5ldyBYTUxIdHRwUmVxdWVzdDtkLm9wZW4oXCJHRVRcIixhKSxkLnJlc3BvbnNlVHlwZT1cImJsb2JcIixkLm9ubG9hZD1mdW5jdGlvbigpe2coZC5yZXNwb25zZSxiLGMpfSxkLm9uZXJyb3I9ZnVuY3Rpb24oKXtjb25zb2xlLmVycm9yKFwiY291bGQgbm90IGRvd25sb2FkIGZpbGVcIil9LGQuc2VuZCgpfWZ1bmN0aW9uIGQoYSl7dmFyIGI9bmV3IFhNTEh0dHBSZXF1ZXN0O2Iub3BlbihcIkhFQURcIixhLCExKTt0cnl7Yi5zZW5kKCl9Y2F0Y2goYSl7fXJldHVybiAyMDA8PWIuc3RhdHVzJiYyOTk+PWIuc3RhdHVzfWZ1bmN0aW9uIGUoYSl7dHJ5e2EuZGlzcGF0Y2hFdmVudChuZXcgTW91c2VFdmVudChcImNsaWNrXCIpKX1jYXRjaChjKXt2YXIgYj1kb2N1bWVudC5jcmVhdGVFdmVudChcIk1vdXNlRXZlbnRzXCIpO2IuaW5pdE1vdXNlRXZlbnQoXCJjbGlja1wiLCEwLCEwLHdpbmRvdywwLDAsMCw4MCwyMCwhMSwhMSwhMSwhMSwwLG51bGwpLGEuZGlzcGF0Y2hFdmVudChiKX19dmFyIGY9XCJvYmplY3RcIj09dHlwZW9mIHdpbmRvdyYmd2luZG93LndpbmRvdz09PXdpbmRvdz93aW5kb3c6XCJvYmplY3RcIj09dHlwZW9mIHNlbGYmJnNlbGYuc2VsZj09PXNlbGY/c2VsZjpcIm9iamVjdFwiPT10eXBlb2YgZ2xvYmFsJiZnbG9iYWwuZ2xvYmFsPT09Z2xvYmFsP2dsb2JhbDp2b2lkIDAsYT1mLm5hdmlnYXRvciYmL01hY2ludG9zaC8udGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSYmL0FwcGxlV2ViS2l0Ly50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpJiYhL1NhZmFyaS8udGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSxnPWYuc2F2ZUFzfHwoXCJvYmplY3RcIiE9dHlwZW9mIHdpbmRvd3x8d2luZG93IT09Zj9mdW5jdGlvbigpe306XCJkb3dubG9hZFwiaW4gSFRNTEFuY2hvckVsZW1lbnQucHJvdG90eXBlJiYhYT9mdW5jdGlvbihiLGcsaCl7dmFyIGk9Zi5VUkx8fGYud2Via2l0VVJMLGo9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImFcIik7Zz1nfHxiLm5hbWV8fFwiZG93bmxvYWRcIixqLmRvd25sb2FkPWcsai5yZWw9XCJub29wZW5lclwiLFwic3RyaW5nXCI9PXR5cGVvZiBiPyhqLmhyZWY9YixqLm9yaWdpbj09PWxvY2F0aW9uLm9yaWdpbj9lKGopOmQoai5ocmVmKT9jKGIsZyxoKTplKGosai50YXJnZXQ9XCJfYmxhbmtcIikpOihqLmhyZWY9aS5jcmVhdGVPYmplY3RVUkwoYiksc2V0VGltZW91dChmdW5jdGlvbigpe2kucmV2b2tlT2JqZWN0VVJMKGouaHJlZil9LDRFNCksc2V0VGltZW91dChmdW5jdGlvbigpe2Uoail9LDApKX06XCJtc1NhdmVPck9wZW5CbG9iXCJpbiBuYXZpZ2F0b3I/ZnVuY3Rpb24oZixnLGgpe2lmKGc9Z3x8Zi5uYW1lfHxcImRvd25sb2FkXCIsXCJzdHJpbmdcIiE9dHlwZW9mIGYpbmF2aWdhdG9yLm1zU2F2ZU9yT3BlbkJsb2IoYihmLGgpLGcpO2Vsc2UgaWYoZChmKSljKGYsZyxoKTtlbHNle3ZhciBpPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJhXCIpO2kuaHJlZj1mLGkudGFyZ2V0PVwiX2JsYW5rXCIsc2V0VGltZW91dChmdW5jdGlvbigpe2UoaSl9KX19OmZ1bmN0aW9uKGIsZCxlLGcpe2lmKGc9Z3x8b3BlbihcIlwiLFwiX2JsYW5rXCIpLGcmJihnLmRvY3VtZW50LnRpdGxlPWcuZG9jdW1lbnQuYm9keS5pbm5lclRleHQ9XCJkb3dubG9hZGluZy4uLlwiKSxcInN0cmluZ1wiPT10eXBlb2YgYilyZXR1cm4gYyhiLGQsZSk7dmFyIGg9XCJhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW1cIj09PWIudHlwZSxpPS9jb25zdHJ1Y3Rvci9pLnRlc3QoZi5IVE1MRWxlbWVudCl8fGYuc2FmYXJpLGo9L0NyaU9TXFwvW1xcZF0rLy50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpO2lmKChqfHxoJiZpfHxhKSYmXCJ1bmRlZmluZWRcIiE9dHlwZW9mIEZpbGVSZWFkZXIpe3ZhciBrPW5ldyBGaWxlUmVhZGVyO2sub25sb2FkZW5kPWZ1bmN0aW9uKCl7dmFyIGE9ay5yZXN1bHQ7YT1qP2E6YS5yZXBsYWNlKC9eZGF0YTpbXjtdKjsvLFwiZGF0YTphdHRhY2htZW50L2ZpbGU7XCIpLGc/Zy5sb2NhdGlvbi5ocmVmPWE6bG9jYXRpb249YSxnPW51bGx9LGsucmVhZEFzRGF0YVVSTChiKX1lbHNle3ZhciBsPWYuVVJMfHxmLndlYmtpdFVSTCxtPWwuY3JlYXRlT2JqZWN0VVJMKGIpO2c/Zy5sb2NhdGlvbj1tOmxvY2F0aW9uLmhyZWY9bSxnPW51bGwsc2V0VGltZW91dChmdW5jdGlvbigpe2wucmV2b2tlT2JqZWN0VVJMKG0pfSw0RTQpfX0pO2Yuc2F2ZUFzPWcuc2F2ZUFzPWcsXCJ1bmRlZmluZWRcIiE9dHlwZW9mIG1vZHVsZSYmKG1vZHVsZS5leHBvcnRzPWcpfSk7XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPUZpbGVTYXZlci5taW4uanMubWFwIiwiLyohIGllZWU3NTQuIEJTRC0zLUNsYXVzZSBMaWNlbnNlLiBGZXJvc3MgQWJvdWtoYWRpamVoIDxodHRwczovL2Zlcm9zcy5vcmcvb3BlbnNvdXJjZT4gKi9cbmV4cG9ydHMucmVhZCA9IGZ1bmN0aW9uIChidWZmZXIsIG9mZnNldCwgaXNMRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtXG4gIHZhciBlTGVuID0gKG5CeXRlcyAqIDgpIC0gbUxlbiAtIDFcbiAgdmFyIGVNYXggPSAoMSA8PCBlTGVuKSAtIDFcbiAgdmFyIGVCaWFzID0gZU1heCA+PiAxXG4gIHZhciBuQml0cyA9IC03XG4gIHZhciBpID0gaXNMRSA/IChuQnl0ZXMgLSAxKSA6IDBcbiAgdmFyIGQgPSBpc0xFID8gLTEgOiAxXG4gIHZhciBzID0gYnVmZmVyW29mZnNldCArIGldXG5cbiAgaSArPSBkXG5cbiAgZSA9IHMgJiAoKDEgPDwgKC1uQml0cykpIC0gMSlcbiAgcyA+Pj0gKC1uQml0cylcbiAgbkJpdHMgKz0gZUxlblxuICBmb3IgKDsgbkJpdHMgPiAwOyBlID0gKGUgKiAyNTYpICsgYnVmZmVyW29mZnNldCArIGldLCBpICs9IGQsIG5CaXRzIC09IDgpIHt9XG5cbiAgbSA9IGUgJiAoKDEgPDwgKC1uQml0cykpIC0gMSlcbiAgZSA+Pj0gKC1uQml0cylcbiAgbkJpdHMgKz0gbUxlblxuICBmb3IgKDsgbkJpdHMgPiAwOyBtID0gKG0gKiAyNTYpICsgYnVmZmVyW29mZnNldCArIGldLCBpICs9IGQsIG5CaXRzIC09IDgpIHt9XG5cbiAgaWYgKGUgPT09IDApIHtcbiAgICBlID0gMSAtIGVCaWFzXG4gIH0gZWxzZSBpZiAoZSA9PT0gZU1heCkge1xuICAgIHJldHVybiBtID8gTmFOIDogKChzID8gLTEgOiAxKSAqIEluZmluaXR5KVxuICB9IGVsc2Uge1xuICAgIG0gPSBtICsgTWF0aC5wb3coMiwgbUxlbilcbiAgICBlID0gZSAtIGVCaWFzXG4gIH1cbiAgcmV0dXJuIChzID8gLTEgOiAxKSAqIG0gKiBNYXRoLnBvdygyLCBlIC0gbUxlbilcbn1cblxuZXhwb3J0cy53cml0ZSA9IGZ1bmN0aW9uIChidWZmZXIsIHZhbHVlLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbSwgY1xuICB2YXIgZUxlbiA9IChuQnl0ZXMgKiA4KSAtIG1MZW4gLSAxXG4gIHZhciBlTWF4ID0gKDEgPDwgZUxlbikgLSAxXG4gIHZhciBlQmlhcyA9IGVNYXggPj4gMVxuICB2YXIgcnQgPSAobUxlbiA9PT0gMjMgPyBNYXRoLnBvdygyLCAtMjQpIC0gTWF0aC5wb3coMiwgLTc3KSA6IDApXG4gIHZhciBpID0gaXNMRSA/IDAgOiAobkJ5dGVzIC0gMSlcbiAgdmFyIGQgPSBpc0xFID8gMSA6IC0xXG4gIHZhciBzID0gdmFsdWUgPCAwIHx8ICh2YWx1ZSA9PT0gMCAmJiAxIC8gdmFsdWUgPCAwKSA/IDEgOiAwXG5cbiAgdmFsdWUgPSBNYXRoLmFicyh2YWx1ZSlcblxuICBpZiAoaXNOYU4odmFsdWUpIHx8IHZhbHVlID09PSBJbmZpbml0eSkge1xuICAgIG0gPSBpc05hTih2YWx1ZSkgPyAxIDogMFxuICAgIGUgPSBlTWF4XG4gIH0gZWxzZSB7XG4gICAgZSA9IE1hdGguZmxvb3IoTWF0aC5sb2codmFsdWUpIC8gTWF0aC5MTjIpXG4gICAgaWYgKHZhbHVlICogKGMgPSBNYXRoLnBvdygyLCAtZSkpIDwgMSkge1xuICAgICAgZS0tXG4gICAgICBjICo9IDJcbiAgICB9XG4gICAgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICB2YWx1ZSArPSBydCAvIGNcbiAgICB9IGVsc2Uge1xuICAgICAgdmFsdWUgKz0gcnQgKiBNYXRoLnBvdygyLCAxIC0gZUJpYXMpXG4gICAgfVxuICAgIGlmICh2YWx1ZSAqIGMgPj0gMikge1xuICAgICAgZSsrXG4gICAgICBjIC89IDJcbiAgICB9XG5cbiAgICBpZiAoZSArIGVCaWFzID49IGVNYXgpIHtcbiAgICAgIG0gPSAwXG4gICAgICBlID0gZU1heFxuICAgIH0gZWxzZSBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIG0gPSAoKHZhbHVlICogYykgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pXG4gICAgICBlID0gZSArIGVCaWFzXG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSB2YWx1ZSAqIE1hdGgucG93KDIsIGVCaWFzIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKVxuICAgICAgZSA9IDBcbiAgICB9XG4gIH1cblxuICBmb3IgKDsgbUxlbiA+PSA4OyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBtICYgMHhmZiwgaSArPSBkLCBtIC89IDI1NiwgbUxlbiAtPSA4KSB7fVxuXG4gIGUgPSAoZSA8PCBtTGVuKSB8IG1cbiAgZUxlbiArPSBtTGVuXG4gIGZvciAoOyBlTGVuID4gMDsgYnVmZmVyW29mZnNldCArIGldID0gZSAmIDB4ZmYsIGkgKz0gZCwgZSAvPSAyNTYsIGVMZW4gLT0gOCkge31cblxuICBidWZmZXJbb2Zmc2V0ICsgaSAtIGRdIHw9IHMgKiAxMjhcbn1cbiIsImV4cG9ydCBjbGFzcyBUd29QYW5lbENvbnRhaW5lcntcblxuICAgIHN0YXRpYyBNSU5fU1BBQ0UgPSA1MDtcblxuICAgIHByaXZhdGUgbGVmdF9jb250YWluZXIgOiBIVE1MRWxlbWVudDtcbiAgICBwcml2YXRlIHNlcGFyYXRvciA6IEhUTUxFbGVtZW50O1xuICAgIHByaXZhdGUgcmlnaHRfY29udGFpbmVyIDogSFRNTEVsZW1lbnQ7XG4gICAgcHJpdmF0ZSBpc19tb3ZpbmcgOiBib29sZWFuID0gZmFsc2U7XG5cbiAgICBjb25zdHJ1Y3RvcihsZWZ0X2NvbnRhaW5lcjogSFRNTEVsZW1lbnQsIHNlcGFyYXRvcjogSFRNTEVsZW1lbnQsIHJpZ2h0X2NvbnRhaW5lcjogSFRNTEVsZW1lbnQpe1xuICAgICAgICB0aGlzLmxlZnRfY29udGFpbmVyID0gbGVmdF9jb250YWluZXI7XG4gICAgICAgIHRoaXMuc2VwYXJhdG9yID0gc2VwYXJhdG9yO1xuICAgICAgICB0aGlzLnJpZ2h0X2NvbnRhaW5lciA9IHJpZ2h0X2NvbnRhaW5lcjtcblxuICAgICAgICB0aGlzLnNlcGFyYXRvci5hZGRFdmVudExpc3RlbmVyKCBcIm1vdXNlZG93blwiLCAoKSA9PiB7IHRoaXMuaXNfbW92aW5nID0gdHJ1ZTsgfSApO1xuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCBcIm1vdXNldXBcIiwgKCkgPT4geyB0aGlzLmlzX21vdmluZyA9IGZhbHNlOyB9ICk7XG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoIFwibW91c2Vtb3ZlXCIsIChldnQpID0+IHsgdGhpcy5tb3VzZV9tb3ZlKGV2dCk7IH0gKTtcbiAgICB9XG5cbiAgICBtb3VzZV9tb3ZlKGV2dDogTW91c2VFdmVudCl7XG4gICAgICAgIGlmKCAhdGhpcy5pc19tb3ZpbmcgKXsgcmV0dXJuOyB9XG5cbiAgICAgICAgbGV0IG5ld1Bvc1ggPSBNYXRoLm1heCggVHdvUGFuZWxDb250YWluZXIuTUlOX1NQQUNFLCBNYXRoLm1pbihldnQuY2xpZW50WCwgZG9jdW1lbnQuYm9keS5jbGllbnRXaWR0aCAtIFR3b1BhbmVsQ29udGFpbmVyLk1JTl9TUEFDRSkpO1xuXG4gICAgICAgIHRoaXMuc2V0X3BhbmVsX3NpemUobmV3UG9zWCk7XG4gICAgfVxuXG4gICAgc2V0X3BhbmVsX3NpemUobGVmdF9zaXplOiBudW1iZXIpe1xuICAgICAgICB0aGlzLnNlcGFyYXRvci5zdHlsZS5sZWZ0ID0gbGVmdF9zaXplICsgXCJweFwiO1xuICAgICAgICB0aGlzLmxlZnRfY29udGFpbmVyLnN0eWxlLndpZHRoID0gbGVmdF9zaXplICsgXCJweFwiO1xuICAgICAgICB0aGlzLnJpZ2h0X2NvbnRhaW5lci5zdHlsZS53aWR0aCA9IChkb2N1bWVudC5ib2R5LmNsaWVudFdpZHRoIC0gbGVmdF9zaXplIC0gdGhpcy5zZXBhcmF0b3IuY2xpZW50V2lkdGgpICsgXCJweFwiO1xuICAgIH1cbn0iLCJpbXBvcnQgeyBCdXR0b24gfSBmcm9tIFwiLi9idXR0b25cIjtcbmltcG9ydCB7IERhcExpbmtXcmFwcGVyIH0gZnJvbSBcIi4vZGFwbGlua1wiO1xuXG5leHBvcnQgY2xhc3MgQWN0aW9uQ29ubmVjdGlvbiB7XG5cbiAgICBwcml2YXRlIGRhcGxpbms6IERhcExpbmtXcmFwcGVyO1xuICAgIHByaXZhdGUgYnV0dG9uOiBCdXR0b247XG4gICAgcHJpdmF0ZSBpbWdfY29ubmVjdDogc3RyaW5nO1xuICAgIHByaXZhdGUgaW1nX2Rpc2Nvbm5lY3Q6IHN0cmluZztcbiAgICBwcml2YXRlIGNiX29uQ29ubmVjdGlvbkNoYWduZTogKGlzQ29ubmVjdGVkOiBib29sZWFuKSA9PiB2b2lkO1xuICAgIHByaXZhdGUgaXNfY29ubmVjdGVkOiBib29sZWFuO1xuXG4gICAgY29uc3RydWN0b3IoZGFwbGluazogRGFwTGlua1dyYXBwZXIsIGJ1dHRvbjogQnV0dG9uLCBpbWdfY29ubmVjdDogc3RyaW5nLCBpbWdfZGlzY29ubmVjdDogc3RyaW5nLCBvbl9jb25uZWN0aW9uX2NoYW5nZSA6IChpc0Nvbm5lY3RlZDogYm9vbGVhbikgPT4gdm9pZCl7XG4gICAgICAgIHRoaXMuZGFwbGluayA9IGRhcGxpbms7XG4gICAgICAgIHRoaXMuYnV0dG9uID0gYnV0dG9uO1xuICAgICAgICB0aGlzLmltZ19jb25uZWN0ID0gaW1nX2Nvbm5lY3Q7XG4gICAgICAgIHRoaXMuaW1nX2Rpc2Nvbm5lY3QgPSBpbWdfZGlzY29ubmVjdDtcbiAgICAgICAgdGhpcy5jYl9vbkNvbm5lY3Rpb25DaGFnbmUgPSBvbl9jb25uZWN0aW9uX2NoYW5nZTtcblxuICAgICAgICB0aGlzLmlzX2Nvbm5lY3RlZCA9IGZhbHNlO1xuXG4gICAgICAgIHRoaXMuYnV0dG9uLmJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5pc19jb25uZWN0ZWQgPyB0aGlzLmRpc2Nvbm5lY3QoKSA6IHRoaXMuY29ubmVjdCgpKTtcbiAgICB9XG5cbiAgICBhc3luYyBjb25uZWN0KCl7XG5cbiAgICAgICAgaWYoICFhd2FpdCB0aGlzLmRhcGxpbmsuY29ubmVjdCgpICl7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmJ1dHRvbi5pY29uLnNyYyA9IHRoaXMuaW1nX2Nvbm5lY3Q7XG4gICAgICAgIHRoaXMuYnV0dG9uLmJ1dHRvbi50aXRsZSA9IFwiQ2xpY2sgdG8gZGlzY29ubmVjdFwiO1xuICAgICAgICB0aGlzLmlzX2Nvbm5lY3RlZCA9IHRydWU7XG5cbiAgICAgICAgaWYoIHRoaXMuY2Jfb25Db25uZWN0aW9uQ2hhZ25lICkgdGhpcy5jYl9vbkNvbm5lY3Rpb25DaGFnbmUodHJ1ZSk7XG4gICAgfVxuXG4gICAgYXN5bmMgZGlzY29ubmVjdCgpe1xuXG4gICAgICAgIGF3YWl0IHRoaXMuZGFwbGluay5kaXNjb25uZWN0KCk7XG5cbiAgICAgICAgdGhpcy5idXR0b24uaWNvbi5zcmMgPSB0aGlzLmltZ19kaXNjb25uZWN0O1xuICAgICAgICB0aGlzLmJ1dHRvbi5idXR0b24udGl0bGUgPSBcIkNsaWNrIHRvIGNvbm5lY3RcIjtcbiAgICAgICAgdGhpcy5pc19jb25uZWN0ZWQgPSBmYWxzZTtcblxuICAgICAgICBpZiggdGhpcy5jYl9vbkNvbm5lY3Rpb25DaGFnbmUgKSB0aGlzLmNiX29uQ29ubmVjdGlvbkNoYWduZShmYWxzZSk7XG4gICAgfVxuXG59IiwiaW1wb3J0IHsgQnV0dG9uIH0gZnJvbSBcIi4uL2J1dHRvblwiO1xuXG5leHBvcnQgY2xhc3MgQWN0aW9uTG9hZHtcblxuICAgIHByaXZhdGUgZmlsZVJlYWRlciA6IEZpbGVSZWFkZXI7XG4gICAgcHJpdmF0ZSBmaWxlX2lucHV0IDogSFRNTElucHV0RWxlbWVudDtcblxuICAgIGNvbnN0cnVjdG9yKCBidXR0b246IEJ1dHRvbiwgb25GaWxlUmVhZGVkOiAoZGF0YTogc3RyaW5nKSA9PiB2b2lkKXtcblxuICAgICAgICB0aGlzLmZpbGVSZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuXG4gICAgICAgIGxldCBkID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgZC5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XG4gICAgICAgIGQuc3R5bGUud2lkdGggPSBcIjBweFwiO1xuICAgICAgICBkLnN0eWxlLmhlaWdodCA9IFwiMHB4XCI7XG4gICAgICAgIGQuc3R5bGUub3ZlcmZsb3cgPSBcImhpZGRlblwiO1xuXG4gICAgICAgIHRoaXMuZmlsZV9pbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbnB1dFwiKTtcbiAgICAgICAgdGhpcy5maWxlX2lucHV0LnR5cGUgPSBcImZpbGVcIjtcbiAgICAgICAgdGhpcy5maWxlX2lucHV0LmFjY2VwdCA9IFwiLnB5XCI7XG5cbiAgICAgICAgZC5hcHBlbmQodGhpcy5maWxlX2lucHV0KTtcblxuICAgICAgICBidXR0b24uYnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLmZpbGVfaW5wdXQuY2xpY2soKSk7XG4gICAgICAgIHRoaXMuZmlsZV9pbnB1dC5hZGRFdmVudExpc3RlbmVyKFwiaW5wdXRcIiwgKCkgPT4gdGhpcy5vcGVuRmlsZSgpKTtcblxuICAgICAgICB0aGlzLmZpbGVSZWFkZXIub25sb2FkID0gKCkgPT4gb25GaWxlUmVhZGVkKHRoaXMuZmlsZVJlYWRlci5yZXN1bHQgYXMgc3RyaW5nKTtcbiAgICAgICAgdGhpcy5maWxlUmVhZGVyLm9uZXJyb3IgPSAoZXZ0KSA9PiBjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIHJlYWQgZmlsZS5cIiwgZXZ0KTtcbiAgICB9XG5cbiAgICBvcGVuRmlsZSgpe1xuICAgICAgICB0aGlzLmZpbGVSZWFkZXIucmVhZEFzVGV4dCgodGhpcy5maWxlX2lucHV0LmZpbGVzIGFzIEZpbGVMaXN0KVswXSwgXCJVVEYtOFwiKTtcbiAgICB9XG5cbn0iLCJpbXBvcnQgeyBCdXR0b24gfSBmcm9tIFwiLi4vYnV0dG9uXCI7XG5pbXBvcnQgeyBHZXREYXRhQ2FsbGJhY2sgfSBmcm9tIFwiLi4vY29tbW9uXCI7XG5pbXBvcnQgeyBEYXBMaW5rV3JhcHBlciB9IGZyb20gXCIuLi9kYXBsaW5rXCI7XG5cbmV4cG9ydCBjbGFzcyBBY3Rpb25SdW57XG5cbiAgICBjb25zdHJ1Y3RvcihkYXBsaW5rIDogRGFwTGlua1dyYXBwZXIsIGJ1dHRvbjogQnV0dG9uLCBnZXRTY3JpcHQ6IEdldERhdGFDYWxsYmFjayl7XG4gICAgICAgIGJ1dHRvbi5idXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IGJ1dHRvbi5pc0VuYWJsZSgpID8gZGFwbGluay5ydW5TY3JpcHQoZ2V0U2NyaXB0KCkpIDogbnVsbCk7XG4gICAgfVxuXG59IiwiaW1wb3J0IHsgQnV0dG9uIH0gZnJvbSBcIi4uL2J1dHRvblwiO1xuaW1wb3J0IHsgc2F2ZUFzIH0gZnJvbSBcImZpbGUtc2F2ZXJcIjtcblxuZXhwb3J0IGNsYXNzIEFjdGlvblNhdmV7XG5cbiAgICBwcml2YXRlIGNiX2dldFNjcmlwdDtcblxuICAgIGNvbnN0cnVjdG9yKGJ1dHRvbjogQnV0dG9uLCBnZXRTY3JpcHQ6IENhbGxhYmxlRnVuY3Rpb24pe1xuICAgICAgICB0aGlzLmNiX2dldFNjcmlwdCA9IGdldFNjcmlwdDtcblxuICAgICAgICBidXR0b24uYnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLnNhdmVGaWxlKFwibWFpbi5weVwiKSk7XG4gICAgfVxuXG4gICAgc2F2ZUZpbGUoZmlsZW5hbWU6IHN0cmluZyl7XG4gICAgICAgIHZhciBibG9iID0gbmV3IEJsb2IoW3RoaXMuY2JfZ2V0U2NyaXB0KCldLCB7dHlwZTogXCJ0ZXh0L3BsYWluO2NoYXJzZXQ9dXRmLThcIn0pO1xuICAgICAgICBzYXZlQXMoYmxvYiwgZmlsZW5hbWUpO1xuICAgIH1cblxufSIsImltcG9ydCB7IEJ1dHRvbiwgQnV0dG9uU3BhY2VyIH0gZnJvbSBcIi4vYnV0dG9uXCI7XG5pbXBvcnQgeyBBY3Rpb25Db25uZWN0aW9uIH0gZnJvbSBcIi4vYWN0aW9uX2Nvbm5lY3Rpb25cIjtcbmltcG9ydCB7IERhcExpbmtXcmFwcGVyIH0gZnJvbSBcIi4vZGFwbGlua1wiO1xuaW1wb3J0IHsgQWN0aW9uUnVuIH0gZnJvbSBcIi4vYWN0aW9ucy9hY3Rpb25fcnVuXCI7XG5pbXBvcnQgeyBTZXJpYWxPdXRwdXQgfSBmcm9tIFwiLi9zZXJpYWxPdXRwdXRcIjtcbmltcG9ydCB7IFR3b1BhbmVsQ29udGFpbmVyIH0gZnJvbSBcIi4vVHdvUGFuZWxDb250YWluZXJcIjtcbmltcG9ydCB7IEFjdGlvblNhdmUgfSBmcm9tIFwiLi9hY3Rpb25zL2FjdGlvbl9zYXZlXCI7XG5pbXBvcnQgeyBBY3Rpb25Mb2FkIH0gZnJvbSBcIi4vYWN0aW9ucy9hY3Rpb25fbG9hZFwiO1xuaW1wb3J0IHsgRmF0RlMgfSBmcm9tIFwiLi9taWNyb0ZBVC9mYXRcIjtcblxuZXhwb3J0IGNsYXNzIEFwcGxpY2F0aW9ue1xuXG4gICAgcHJpdmF0ZSB0b3BfY29udGFpbmVyIDogSFRNTEVsZW1lbnQgPSA8SFRNTEVsZW1lbnQ+ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ0b3BfY29udGFpbmVyXCIpO1xuICAgIHByaXZhdGUgbGVmdF9jb250YWluZXIgOiBIVE1MRWxlbWVudCA9IDxIVE1MRWxlbWVudD5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImxlZnRfY29udGFpbmVyXCIpO1xuICAgIHByaXZhdGUgcmlnaHRfY29udGFpbmVyIDogSFRNTEVsZW1lbnQgPSA8SFRNTEVsZW1lbnQ+ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyaWdodF9jb250YWluZXJcIik7XG4gICAgcHJpdmF0ZSBzcGFjZXJfY29udGFpbmVyIDogSFRNTEVsZW1lbnQgPSA8SFRNTEVsZW1lbnQ+ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzcGFjZXJfY29udGFpbmVyXCIpO1xuXG5cblxuICAgIHByaXZhdGUgZGFwTGlua1dyYXBwZXIgOiBEYXBMaW5rV3JhcHBlcjtcblxuXG5cbiAgICBjb25zdHJ1Y3Rvcihtb25hY29fZWRpdG9yOiBhbnkpe1xuICAgICAgICB0aGlzLmRhcExpbmtXcmFwcGVyID0gbmV3IERhcExpbmtXcmFwcGVyKCk7XG5cbiAgICAgICAgdGhpcy50b3BNZW51KG1vbmFjb19lZGl0b3IpO1xuICAgICAgICB0aGlzLnJpZ2h0UGFuZWwoKTtcblxuXG4gICAgICAgIG5ldyBUd29QYW5lbENvbnRhaW5lcih0aGlzLmxlZnRfY29udGFpbmVyLCB0aGlzLnNwYWNlcl9jb250YWluZXIsIHRoaXMucmlnaHRfY29udGFpbmVyKS5zZXRfcGFuZWxfc2l6ZShkb2N1bWVudC5ib2R5LmNsaWVudFdpZHRoICogMC42Nik7XG4gICAgICAgIGxldCBmYXQgPSBuZXcgRmF0RlMoXCJQWUJGTEFTSFwiKTtcblxuICAgICAgICBmYXQuYWRkRmlsZShcIlRFU1RcIiwgXCJUWFRcIiwgXCJKRSBTVUlTIFRST1AgRk9SVCwgUFVUQUlOICAhISFcIik7XG4gICAgICAgIGZhdC5nZW5lcmF0ZV9oZXgoKTtcbiAgICB9XG5cblxuICAgIHByaXZhdGUgdG9wTWVudShtb25hY29fZWRpdG9yOiBhbnkpe1xuXG4gICAgICAgIC8vIENvbm5lY3Rpb25cbiAgICAgICAgbmV3IEFjdGlvbkNvbm5lY3Rpb24odGhpcy5kYXBMaW5rV3JhcHBlciwgbmV3IEJ1dHRvbih0aGlzLnRvcF9jb250YWluZXIsIFwiaW1nL2Rpc2Nvbm5lY3QucG5nXCIpLCBcImltZy9jb25uZWN0LnBuZ1wiLCBcImltZy9kaXNjb25uZWN0LnBuZ1wiLCAoaXNfY29ubmVjdGVkKSA9PiB7IGlzX2Nvbm5lY3RlZCA/IG1lbnVfcnVuLmVuYWJsZSgpIDogbWVudV9ydW4uZGlzYWJsZSgpOyB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJ1blxuICAgICAgICBsZXQgbWVudV9ydW4gPSBuZXcgQnV0dG9uKHRoaXMudG9wX2NvbnRhaW5lciwgXCJpbWcvcGxheS5wbmdcIik7XG4gICAgICAgIG1lbnVfcnVuLmRpc2FibGUoKTtcbiAgICAgICAgbmV3IEFjdGlvblJ1bih0aGlzLmRhcExpbmtXcmFwcGVyLCBtZW51X3J1biwgKCkgPT4gbW9uYWNvX2VkaXRvci5nZXRWYWx1ZSgpICk7XG5cbiAgICAgICAgLy9GbGFzaFxuICAgICAgICBsZXQgbWVudV9mbGFzaCA9IG5ldyBCdXR0b24odGhpcy50b3BfY29udGFpbmVyLCBcImltZy9mbGFzaC5wbmdcIik7XG5cblxuICAgICAgICBuZXcgQnV0dG9uU3BhY2VyKHRoaXMudG9wX2NvbnRhaW5lcik7XG5cblxuICAgICAgICAvLyBMb2FkXG4gICAgICAgIG5ldyBBY3Rpb25Mb2FkKG5ldyBCdXR0b24odGhpcy50b3BfY29udGFpbmVyLCBcImltZy91cGxvYWQucG5nXCIpLCAoZGF0YSkgPT4gbW9uYWNvX2VkaXRvci5zZXRWYWx1ZShkYXRhKSk7XG5cbiAgICAgICAgLy8gU2F2ZVxuICAgICAgICBuZXcgQWN0aW9uU2F2ZShuZXcgQnV0dG9uKHRoaXMudG9wX2NvbnRhaW5lciwgXCJpbWcvZG93bmxvYWQucG5nXCIpLCAoKSA9PiBtb25hY29fZWRpdG9yLmdldFZhbHVlKCkgKTtcblxuXG4gICAgICAgIG5ldyBCdXR0b25TcGFjZXIodGhpcy50b3BfY29udGFpbmVyKTtcbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICAvLyBTZXR0aW5nc1xuICAgICAgICBsZXQgbWVudV9zZXR0aW5ncyA9IG5ldyBCdXR0b24odGhpcy50b3BfY29udGFpbmVyLCBcImltZy9zZXR0aW5ncy5wbmdcIik7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSByaWdodFBhbmVsKCl7XG4gICAgICAgIGxldCBzZXJpYWxPdXRwdXQgPSBuZXcgU2VyaWFsT3V0cHV0KHRoaXMucmlnaHRfY29udGFpbmVyKTtcbiAgICAgICAgdGhpcy5kYXBMaW5rV3JhcHBlci5vblJlY2VpdmVkRGF0YSggKGRhdGEpID0+IHNlcmlhbE91dHB1dC53cml0ZShkYXRhKSk7XG4gICAgfVxufVxuXG4vLyBAdHMtaWdub3JlXG53aW5kb3dbXCJBcHBsaWNhdGlvblwiXSA9IEFwcGxpY2F0aW9uOyIsImV4cG9ydCBjbGFzcyBCdXR0b257XG5cbiAgICBwcml2YXRlIGlzX2VuYWJsZTogYm9vbGVhbjtcblxuICAgIGJ1dHRvbjogSFRNTERpdkVsZW1lbnQ7XG4gICAgaWNvbjogSFRNTEltYWdlRWxlbWVudDtcblxuICAgIGNvbnN0cnVjdG9yKHBhcmVudDogSFRNTEVsZW1lbnQsIGljb246IHN0cmluZyl7XG4gICAgICAgIHRoaXMuYnV0dG9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgdGhpcy5pY29uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImltZ1wiKTtcblxuICAgICAgICB0aGlzLmJ1dHRvbi5jbGFzc0xpc3QuYWRkKFwibWVudV9idXR0b25cIilcblxuICAgICAgICB0aGlzLmlzX2VuYWJsZSA9IHRydWU7XG4gICAgICAgIHRoaXMuaWNvbi5zcmMgPSBpY29uO1xuICAgICAgICB0aGlzLmJ1dHRvbi5hcHBlbmQodGhpcy5pY29uKTtcbiAgICAgICAgcGFyZW50LmFwcGVuZCh0aGlzLmJ1dHRvbik7XG4gICAgfVxuXG4gICAgZW5hYmxlKCl7XG4gICAgICAgIHRoaXMuYnV0dG9uLmNsYXNzTGlzdC5yZW1vdmUoXCJkaXNhYmxlXCIpO1xuICAgIH1cblxuICAgIGRpc2FibGUoKXtcbiAgICAgICAgdGhpcy5idXR0b24uY2xhc3NMaXN0LmFkZChcImRpc2FibGVcIik7XG4gICAgfVxuXG4gICAgaXNFbmFibGUoKXtcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNfZW5hYmxlO1xuICAgIH1cblxufVxuXG5cblxuZXhwb3J0IGNsYXNzIEJ1dHRvblNwYWNlcntcbiAgICBjb25zdHJ1Y3RvcihwYXJlbnQ6IEhUTUxFbGVtZW50KXtcbiAgICAgICAgbGV0IGJ1dHRvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgIGJ1dHRvbi5jbGFzc0xpc3QuYWRkKFwibWVudV9idXR0b25fc3BhY2VcIilcbiAgICAgICAgcGFyZW50LmFwcGVuZChidXR0b24pO1xuICAgIH1cbn0iLCJpbXBvcnQgKiBhcyBEQVBqcyBmcm9tIFwiZGFwanNcIjtcblxuZXhwb3J0IGNsYXNzIERhcExpbmtXcmFwcGVyIHtcblxuICAgIHByaXZhdGUgdHJhbnNwb3J0PyA6IERBUGpzLldlYlVTQiA9IHVuZGVmaW5lZDtcbiAgICBwcml2YXRlIHRhcmdldD8gOiBEQVBqcy5EQVBMaW5rID0gdW5kZWZpbmVkO1xuICAgIHByaXZhdGUgY2Jfb25SZWNlaXZlRGF0ZT8gOiAoZGF0YTogc3RyaW5nKSA9PiB2b2lkID0gdW5kZWZpbmVkO1xuXG4gICAgY29uc3RydWN0b3IoKXt9XG5cbiAgICBvblJlY2VpdmVkRGF0YSAoIGNiIDogKGRhdGE6IHN0cmluZykgPT4gdm9pZCApe1xuICAgICAgICB0aGlzLmNiX29uUmVjZWl2ZURhdGUgPSBjYjtcbiAgICB9XG5cbiAgICBhc3luYyBjb25uZWN0KCl7XG4gICAgICAgIGlmKCB0aGlzLnRyYW5zcG9ydCA9PSB1bmRlZmluZWQgKXtcbiAgICAgICAgICAgIGlmKCEgYXdhaXQgdGhpcy5jcmVhdGVUYXJnZXQoKSApe1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMudGFyZ2V0Py5zdGFydFNlcmlhbFJlYWQoKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgYXN5bmMgZGlzY29ubmVjdCgpe1xuICAgICAgICBpZiggdGhpcy50YXJnZXQgPT0gdW5kZWZpbmVkICl7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnRhcmdldC5zdG9wU2VyaWFsUmVhZCgpO1xuICAgICAgICB0aGlzLnRhcmdldC5kaXNjb25uZWN0KCk7XG5cbiAgICAgICAgdGhpcy50YXJnZXQgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMudHJhbnNwb3J0ID0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGFzeW5jIHJ1blNjcmlwdChzY3JpcHQ6IHN0cmluZyl7XG4gICAgICAgIFxuICAgICAgICBpZiggIWF3YWl0IHRoaXMuY29ubmVjdCgpICl7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgbGluZXMgPSBzY3JpcHQuc3BsaXQoXCJcXG5cIik7XG4gICAgICAgIGxpbmVzLnB1c2goXCJcIik7XG4gICAgICAgIGxpbmVzLnB1c2goXCJcIik7XG5cbiAgICAgICAgYXdhaXQgdGhpcy50YXJnZXQ/LnNlcmlhbFdyaXRlKFN0cmluZy5mcm9tQ2hhckNvZGUoNSkpOyAvLyBbQ3RybCtFXSBFbmFibGUgcGFzdGUgbW9kZSAoUkVQTCBQeXRob24pXG5cbiAgICAgICAgZm9yKCBsZXQgbGluZSBvZiBsaW5lcyApe1xuICAgICAgICAgICAgYXdhaXQgdGhpcy50YXJnZXQ/LnNlcmlhbFdyaXRlKGxpbmUgKyBcIlxcblwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGF3YWl0IHRoaXMudGFyZ2V0Py5zZXJpYWxXcml0ZShTdHJpbmcuZnJvbUNoYXJDb2RlKDQpKTsgLy8gW0N0cmwrRF0gRGlzYWJsZSBwYXN0ZSBtb2RlIChSRVBMIFB5dGhvbilcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGNyZWF0ZVRhcmdldCgpIDogUHJvbWlzZTxib29sZWFuPiB7XG5cbiAgICAgICAgbGV0IGRldmljZSA6IFVTQkRldmljZTtcblxuICAgICAgICB0cnl7XG4gICAgICAgICAgICBkZXZpY2UgPSBhd2FpdCBuYXZpZ2F0b3IudXNiLnJlcXVlc3REZXZpY2Uoe1xuICAgICAgICAgICAgICAgIGZpbHRlcnM6IFt7dmVuZG9ySWQ6IDB4MEQyOH1dXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaChlKXtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihlKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMudHJhbnNwb3J0ID0gbmV3IERBUGpzLldlYlVTQihkZXZpY2UpO1xuICAgICAgICB0aGlzLnRhcmdldCA9IG5ldyBEQVBqcy5EQVBMaW5rKHRoaXMudHJhbnNwb3J0KTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMudGFyZ2V0Lm9uKERBUGpzLkRBUExpbmsuRVZFTlRfU0VSSUFMX0RBVEEsIGRhdGEgPT4ge1xuICAgICAgICAgICAgaWYodGhpcy5jYl9vblJlY2VpdmVEYXRlICE9IHVuZGVmaW5lZCl7XG4gICAgICAgICAgICAgICAgdGhpcy5jYl9vblJlY2VpdmVEYXRlKGRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBhd2FpdCB0aGlzLnRhcmdldC5jb25uZWN0KCk7XG4gICAgICAgIGF3YWl0IHRoaXMudGFyZ2V0LnNldFNlcmlhbEJhdWRyYXRlKDExNTIwMCk7XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxufSIsImltcG9ydCB7IHNhdmVBcyB9IGZyb20gXCJmaWxlLXNhdmVyXCI7XG5pbXBvcnQgeyBwcmludF9oZXhfZGF0YSB9IGZyb20gXCIuLi9jb21tb25cIjtcbmltcG9ydCB7IEZhdEJQQiB9IGZyb20gXCIuL2ZhdF9CUEJcIlxuaW1wb3J0IHsgRmF0Um9vdERpcmVjdG9yeSwgRmlsZUF0dHJpYnV0ZSB9IGZyb20gXCIuL2ZhdF9yb290RGlyXCI7XG5pbXBvcnQgeyBGYXRUYWJsZSB9IGZyb20gXCIuL2ZhdF90YWJsZVwiO1xuXG5leHBvcnQgY2xhc3MgRmF0RlMge1xuICAgIHByaXZhdGUgQlBCOiBGYXRCUEI7XG4gICAgcHJpdmF0ZSB0YWJsZTogRmF0VGFibGU7XG4gICAgcHJpdmF0ZSByb290OiBGYXRSb290RGlyZWN0b3J5O1xuXG4gICAgY29uc3RydWN0b3Iodm9sdW1lX25hbWU6IHN0cmluZyl7XG4gICAgICAgIHRoaXMuQlBCID0gbmV3IEZhdEJQQigpO1xuICAgICAgICB0aGlzLmNvbnN0cnVjdF9wYnAoKTtcblxuICAgICAgICB0aGlzLnRhYmxlID0gbmV3IEZhdFRhYmxlKHRoaXMuQlBCKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMucm9vdCA9IG5ldyBGYXRSb290RGlyZWN0b3J5KHRoaXMuQlBCLCB0aGlzLnRhYmxlLCB2b2x1bWVfbmFtZSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBjb25zdHJ1Y3RfcGJwKCl7XG4gICAgICAgIHRoaXMuQlBCLmp1bXBfaW5zdCA9IDB4OTBGRUVCO1xuICAgICAgICB0aGlzLkJQQi5vZW1fbmFtZSA9IFwiTVNET1M1LjBcIjtcbiAgICAgICAgdGhpcy5CUEIuc2VjdG9yX3NpemUgPSA1MTI7XG4gICAgICAgIHRoaXMuQlBCLmNsdXN0ZXJfc2l6ZSA9IDE7XG4gICAgICAgIHRoaXMuQlBCLnJlc2VydmVkX3NlY3RvcnMgPSAxO1xuICAgICAgICB0aGlzLkJQQi5mYXRzX251bWJlciA9IDE7XG4gICAgICAgIHRoaXMuQlBCLnJvb3RfZGlyX3NpemUgPSA1MTI7XG4gICAgICAgIHRoaXMuQlBCLnRvdGFsX3NlY3RvcnMgPSAxMDI0O1xuICAgICAgICB0aGlzLkJQQi5kaXNrX3R5cGUgPSAweEY4O1xuICAgICAgICB0aGlzLkJQQi5mYXRfc2l6ZSA9IDQ7XG4gICAgICAgIHRoaXMuQlBCLnNlY3RvcnNfcGVyX3RyYWNrID0gNjM7XG4gICAgICAgIHRoaXMuQlBCLmhlYWRzX251bWJlciA9IDI1NTtcbiAgICAgICAgdGhpcy5CUEIuaGlkZGVuX3NlY3RvcnMgPSAyNTY7XG4gICAgICAgIHRoaXMuQlBCLnRvdGFsXzMyYml0c19zZWN0b3JzID0gMDtcblxuICAgICAgICB0aGlzLkJQQi5kaXNrX2lkZW50aWZpZXIgPSAweDgwO1xuICAgICAgICB0aGlzLkJQQi5zaWduYXR1cmUgPSAweDI5O1xuICAgICAgICB0aGlzLkJQQi5kaXNrX3NlcmlhbCA9IDB4NDYyMTAwMDA7XG4gICAgICAgIHRoaXMuQlBCLmRpc2tfbmFtZSA9IFwiTk8gTkFNRVwiO1xuICAgICAgICB0aGlzLkJQQi5maWxlX3N5c3RlbV90eXBlID0gXCJGQVRcIjtcblxuICAgICAgICB0aGlzLkJQQi5waHlzaWNhbF9kcml2ZV9udW1iZXIgPSAwO1xuICAgICAgICB0aGlzLkJQQi5ib290X3NlY3Rvcl9zaWduYXR1cmUgPSAweEFBNTU7XG4gICAgfVxuXG5cbiAgICBhZGRGaWxlKGZpbGVuYW1lOiBzdHJpbmcsIGV4dGVuc2lvbjogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpe1xuICAgICAgICBsZXQgZW5jID0gbmV3IFRleHRFbmNvZGVyKCk7XG4gICAgICAgIHRoaXMucm9vdC5hZGRGaWxlKGZpbGVuYW1lLCBleHRlbnNpb24sIEZpbGVBdHRyaWJ1dGUuQVJDSElWRSwgZW5jLmVuY29kZShjb250ZW50KSk7XG4gICAgfVxuXG4gICAgZ2VuZXJhdGVfaGV4KCl7XG4gICAgICAgIHJldHVybiAgICAgICAgICB0aGlzLkJQQi5nZW5lcmF0ZUJQQigpXG4gICAgICAgICAgICAgICAgLmNvbmNhdCh0aGlzLnRhYmxlLmdlbmVyYXRlVGFibGUoKSlcbiAgICAgICAgICAgICAgICAuY29uY2F0KHRoaXMucm9vdC5nZW5lcmF0ZVJvb3REaXJlY3RvcnkoKSk7XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgRmF0VXRpbHMgfSBmcm9tIFwiLi9mYXRfY29tbW9uXCI7XG5cbmV4cG9ydCBjbGFzcyBGYXRCUEIge1xuXG4gICAganVtcF9pbnN0OiBudW1iZXIgPSAwO1xuICAgIG9lbV9uYW1lOiBzdHJpbmcgPSBcIlwiO1xuICAgIHNlY3Rvcl9zaXplOiBudW1iZXIgPSAwO1xuICAgIGNsdXN0ZXJfc2l6ZTogbnVtYmVyID0gMDtcbiAgICByZXNlcnZlZF9zZWN0b3JzOiBudW1iZXIgPSAwO1xuICAgIGZhdHNfbnVtYmVyOiBudW1iZXIgPSAwO1xuICAgIHJvb3RfZGlyX3NpemU6IG51bWJlciA9IDA7XG4gICAgdG90YWxfc2VjdG9yczogbnVtYmVyID0gMDtcbiAgICBkaXNrX3R5cGU6IG51bWJlciA9IDA7XG4gICAgZmF0X3NpemU6IG51bWJlciA9IDA7XG4gICAgc2VjdG9yc19wZXJfdHJhY2s6IG51bWJlciA9IDA7XG4gICAgaGVhZHNfbnVtYmVyOiBudW1iZXIgPSAwO1xuICAgIGhpZGRlbl9zZWN0b3JzOiBudW1iZXIgPSAwO1xuICAgIHRvdGFsXzMyYml0c19zZWN0b3JzOiBudW1iZXIgPSAwO1xuXG4gICAgZGlza19pZGVudGlmaWVyOiBudW1iZXIgPSAwO1xuICAgIHNpZ25hdHVyZTogbnVtYmVyID0gMDtcbiAgICBkaXNrX3NlcmlhbDogbnVtYmVyID0gMDtcbiAgICBkaXNrX25hbWU6IHN0cmluZyA9IFwiXCI7XG4gICAgZmlsZV9zeXN0ZW1fdHlwZTogc3RyaW5nID0gXCJcIjtcblxuICAgIHBoeXNpY2FsX2RyaXZlX251bWJlcjogbnVtYmVyID0gMDtcbiAgICBib290X3NlY3Rvcl9zaWduYXR1cmU6IG51bWJlciA9IDA7XG5cbiAgICBjb25zdHJ1Y3Rvcigpe31cblxuICAgIGdlbmVyYXRlQlBCKCkgOiBudW1iZXJbXSB7XG4gICAgICAgIHJldHVybiAgICAgICAgICBGYXRVdGlscy5jb252ZXJ0VG9IZXgodGhpcy5qdW1wX2luc3QsIDMpXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0U3RyaW5nKHRoaXMub2VtX25hbWUsIDgpKVxuICAgICAgICAgICAgICAgIC5jb25jYXQoRmF0VXRpbHMuY29udmVydFRvSGV4KHRoaXMuc2VjdG9yX3NpemUsIDIpKVxuICAgICAgICAgICAgICAgIC5jb25jYXQoRmF0VXRpbHMuY29udmVydFRvSGV4KHRoaXMuY2x1c3Rlcl9zaXplLCAxKSlcbiAgICAgICAgICAgICAgICAuY29uY2F0KEZhdFV0aWxzLmNvbnZlcnRUb0hleCh0aGlzLnJlc2VydmVkX3NlY3RvcnMsIDIpKVxuICAgICAgICAgICAgICAgIC5jb25jYXQoRmF0VXRpbHMuY29udmVydFRvSGV4KHRoaXMuZmF0c19udW1iZXIsIDEpKVxuICAgICAgICAgICAgICAgIC5jb25jYXQoRmF0VXRpbHMuY29udmVydFRvSGV4KHRoaXMucm9vdF9kaXJfc2l6ZSwgMikpXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0VG9IZXgodGhpcy50b3RhbF9zZWN0b3JzLCAyKSlcbiAgICAgICAgICAgICAgICAuY29uY2F0KEZhdFV0aWxzLmNvbnZlcnRUb0hleCh0aGlzLmRpc2tfdHlwZSwgMSkpXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0VG9IZXgodGhpcy5mYXRfc2l6ZSwgMikpXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0VG9IZXgodGhpcy5zZWN0b3JzX3Blcl90cmFjaywgMikpXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0VG9IZXgodGhpcy5oZWFkc19udW1iZXIsIDIpKVxuICAgICAgICAgICAgICAgIC5jb25jYXQoRmF0VXRpbHMuY29udmVydFRvSGV4KHRoaXMuaGlkZGVuX3NlY3RvcnMsIDQpKVxuICAgICAgICAgICAgICAgIC5jb25jYXQoRmF0VXRpbHMuY29udmVydFRvSGV4KHRoaXMudG90YWxfMzJiaXRzX3NlY3RvcnMsIDQpKVxuXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0VG9IZXgodGhpcy5kaXNrX2lkZW50aWZpZXIsIDEpKVxuICAgICAgICAgICAgICAgIC5jb25jYXQoWzB4MDFdKVxuICAgICAgICAgICAgICAgIC5jb25jYXQoRmF0VXRpbHMuY29udmVydFRvSGV4KHRoaXMuc2lnbmF0dXJlLCAxKSlcbiAgICAgICAgICAgICAgICAuY29uY2F0KEZhdFV0aWxzLmNvbnZlcnRUb0hleCh0aGlzLmRpc2tfc2VyaWFsLCA0KSlcbiAgICAgICAgICAgICAgICAuY29uY2F0KEZhdFV0aWxzLmNvbnZlcnRTdHJpbmcodGhpcy5kaXNrX25hbWUsIDExKSlcbiAgICAgICAgICAgICAgICAuY29uY2F0KEZhdFV0aWxzLmNvbnZlcnRTdHJpbmcodGhpcy5maWxlX3N5c3RlbV90eXBlLCA4KSlcbiAgICAgICAgICAgICAgICAuY29uY2F0KEZhdFV0aWxzLmNvbnZlcnRUb0hleCggMCwgNDQ3KSlcbiAgICAgICAgICAgICAgICAuY29uY2F0KEZhdFV0aWxzLmNvbnZlcnRUb0hleCh0aGlzLnBoeXNpY2FsX2RyaXZlX251bWJlciwgMSkpXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0VG9IZXgodGhpcy5ib290X3NlY3Rvcl9zaWduYXR1cmUsIDIpKTtcbiAgICB9XG59IiwiZXhwb3J0IGNsYXNzIEZhdFV0aWxzIHtcbiAgICBzdGF0aWMgY29udmVydFN0cmluZyhzdHI6IFN0cmluZywgZmllbGRfc2l6ZTogbnVtYmVyKTogbnVtYmVyW117XG4gICAgICAgIGxldCByZXMgOiBudW1iZXJbXSA9IFtdO1xuXG4gICAgICAgIGZvcihsZXQgaSA9IDA7IGkgPCBmaWVsZF9zaXplOyArK2kpe1xuICAgICAgICAgICAgcmVzW2ldID0gKGkgPj0gc3RyLmxlbmd0aCkgPyAweDIwIDogc3RyLmNoYXJDb2RlQXQoaSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cblxuICAgIHN0YXRpYyBjb252ZXJ0VG9IZXgobnVtOiBudW1iZXIsIGZpZWxkX3NpemU6IG51bWJlcikgOiBudW1iZXJbXXtcbiAgICAgICAgbGV0IHJlcyA6IG51bWJlcltdID0gW107XG5cbiAgICAgICAgZm9yKGxldCBpID0gMDsgaSA8IGZpZWxkX3NpemU7ICsraSl7XG4gICAgICAgICAgICBsZXQgc2hpZnQgPSA4ICogaTtcbiAgICAgICAgICAgIHJlc1tpXSA9ICggbnVtID4+IHNoaWZ0ICkgJiAweDAwRkZcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxufSIsImltcG9ydCB7IEZhdEJQQiB9IGZyb20gXCIuL2ZhdF9CUEJcIjtcbmltcG9ydCB7IEZhdFV0aWxzIH0gZnJvbSBcIi4vZmF0X2NvbW1vblwiO1xuaW1wb3J0IHsgRmF0VGFibGUgfSBmcm9tIFwiLi9mYXRfdGFibGVcIjtcblxuY2xhc3MgU2VjdG9yIHtcbiAgICBkYXRhOiBVaW50OEFycmF5O1xuXG4gICAgY29uc3RydWN0b3Ioc2VjdG9yX3NpemU6IG51bWJlcil7XG4gICAgICAgIHRoaXMuZGF0YSA9IG5ldyBVaW50OEFycmF5KHNlY3Rvcl9zaXplKTtcblxuICAgICAgICB0aGlzLmVyYXNlKCk7XG4gICAgfVxuXG4gICAgZXJhc2UoKXtcbiAgICAgICAgdGhpcy5kYXRhLmZpbGwoMHhGRik7XG4gICAgfVxuXG4gICAgc2V0KHNvdXJjZTogVWludDhBcnJheSl7XG4gICAgICAgIGZvciggbGV0IGkgPSAwOyBpIDwgdGhpcy5kYXRhLmxlbmd0aDsgaSsrICl7XG4gICAgICAgICAgICB0aGlzLmRhdGFbaV0gPSAoaSA+PSBzb3VyY2UubGVuZ3RoKSA/IDB4MDAgOiBzb3VyY2VbaV07XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5jbGFzcyBGYXRSb290RGlyZWN0b3J5X0ZpbGV7XG4gICAgZmlsZW5hbWU6IHN0cmluZyA9IFwiXCI7XG4gICAgZXh0ZW5zaW9uOiBzdHJpbmcgPSBcIlwiO1xuICAgIGF0dHJpYnV0ZTogRmlsZUF0dHJpYnV0ZSA9IDB4MDA7XG4gICAgY3JlYXRlX21zOiBudW1iZXIgPSAwO1xuICAgIGNyZWF0ZV90aW1lOiBudW1iZXIgPSAwO1xuICAgIGNyZWF0ZV9kYXRlOiBudW1iZXIgPSAwO1xuICAgIGxhc3RfYWNjZXNzX2RhdGU6IG51bWJlciA9IDA7XG4gICAgbW9kaWZpY2F0aW9uX3RpbWU6IG51bWJlciA9IDA7XG4gICAgbW9kaWZpY2F0aW9uX2RhdGU6IG51bWJlciA9IDA7XG4gICAgY2x1c3Rlcl9udW1iZXI6IG51bWJlciA9IDA7XG4gICAgZmlsZV9zaXplOiBudW1iZXIgPSAwO1xuXG4gICAgY29uc3RydWN0b3IoKXt9XG5cbiAgICBnZW5lcmF0ZV9maWxlKCkgOiBudW1iZXJbXSB7XG4gICAgICAgIHJldHVybiAgICAgICAgICBGYXRVdGlscy5jb252ZXJ0U3RyaW5nKHRoaXMuZmlsZW5hbWUsIDgpXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0U3RyaW5nKHRoaXMuZXh0ZW5zaW9uLCAzKSlcbiAgICAgICAgICAgICAgICAuY29uY2F0KEZhdFV0aWxzLmNvbnZlcnRUb0hleCh0aGlzLmF0dHJpYnV0ZSwgMSkpXG4gICAgICAgICAgICAgICAgLmNvbmNhdChbMHgwMF0pXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0VG9IZXgoTWF0aC5mbG9vcih0aGlzLmNyZWF0ZV9tcy8xMCksIDEpKVxuICAgICAgICAgICAgICAgIC5jb25jYXQoRmF0VXRpbHMuY29udmVydFRvSGV4KHRoaXMuY3JlYXRlX3RpbWUsIDIpKVxuICAgICAgICAgICAgICAgIC5jb25jYXQoRmF0VXRpbHMuY29udmVydFRvSGV4KHRoaXMuY3JlYXRlX2RhdGUsIDIpKVxuICAgICAgICAgICAgICAgIC5jb25jYXQoRmF0VXRpbHMuY29udmVydFRvSGV4KHRoaXMubGFzdF9hY2Nlc3NfZGF0ZSwgMikpXG4gICAgICAgICAgICAgICAgLmNvbmNhdChbMHgwMCwgMHgwMF0pXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0VG9IZXgodGhpcy5tb2RpZmljYXRpb25fdGltZSwgMikpXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0VG9IZXgodGhpcy5tb2RpZmljYXRpb25fZGF0ZSwgMikpXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0VG9IZXgodGhpcy5jbHVzdGVyX251bWJlciwgMikpXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0VG9IZXgodGhpcy5maWxlX3NpemUsIDQpKTtcbiAgICB9XG59O1xuXG5leHBvcnQgZW51bSBGaWxlQXR0cmlidXRlIHtcbiAgICBSRUFET05MWSA9IDB4MDEsXG4gICAgSElEREVOID0gMHgwMixcbiAgICBTWVNURU0gPSAweDAzLFxuICAgIFZPTFVNRV9OQU1FID0gMHgwOCxcbiAgICBTVUJESVJFQ1RPUlkgPSAweDEwLFxuICAgIEFSQ0hJVkUgPSAweDIwLFxuICAgIERFVklDRSA9IDB4NDAsXG4gICAgUkVTRVJWRUQgPSAweDgwXG59O1xuXG4vLyAhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISFcbi8vICEhISAgIFRISVMgQ0xBU1MgT05MWSBXT1JLUyBGT1IgMSBTRUNUT1IgUEVSIENMVVNURVIgICEhIVxuLy8gISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhXG5leHBvcnQgY2xhc3MgRmF0Um9vdERpcmVjdG9yeXtcblxuICAgIHN0YXRpYyByZWFkb25seSBGSUxFX05PVF9TRVQgPSBbIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAgXTtcblxuICAgIHByaXZhdGUgc2VjdG9yX3NpemU6IG51bWJlcjtcbiAgICBwcml2YXRlIGZpbGVzOiAobnVsbCB8IEZhdFJvb3REaXJlY3RvcnlfRmlsZSlbXTtcbiAgICBwcml2YXRlIHNlY3RvcnM6IFNlY3RvcltdXG4gICAgcHJpdmF0ZSBmYXRfdGFibGU6IEZhdFRhYmxlO1xuXG4gICAgY29uc3RydWN0b3IoYnBiOiBGYXRCUEIsIGZhdF90YWJsZTogRmF0VGFibGUsIHZvbHVtZV9uYW1lOiBzdHJpbmcpe1xuICAgICAgICB0aGlzLnNlY3Rvcl9zaXplID0gYnBiLnNlY3Rvcl9zaXplO1xuICAgICAgICB0aGlzLmZhdF90YWJsZSA9IGZhdF90YWJsZTtcbiAgICAgICAgdGhpcy5maWxlcyA9IG5ldyBBcnJheShicGIucm9vdF9kaXJfc2l6ZSk7XG4gICAgICAgIHRoaXMuc2VjdG9ycyA9IG5ldyBBcnJheSggTWF0aC5mbG9vciggKCAoYnBiLnRvdGFsX3NlY3RvcnMgKiBicGIuc2VjdG9yX3NpemUpIC0gNTEyIC0gZmF0X3RhYmxlLmdldFNpemUoKSAtIChicGIucm9vdF9kaXJfc2l6ZSAqIDMyKSApIC8gYnBiLnNlY3Rvcl9zaXplICkgKTsgLy8gdG90YWwgZGF0YSBzZWN0b3Igc2l6ZSAob2N0ZXRzKSA9IFRvdGFsX3NpemUgLSBib290X3NlY3RvciAtIEZBVF9UYWJsZSAtIFJvb3REaXJlY3RvcnlcblxuICAgICAgICBmb3IoIGxldCBpID0gMDsgaSA8IHRoaXMuZmlsZXMubGVuZ3RoOyArK2kpe1xuICAgICAgICAgICAgdGhpcy5maWxlc1tpXSA9IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IoIGxldCBpID0gMDsgaSA8IHRoaXMuc2VjdG9ycy5sZW5ndGg7ICsraSApe1xuICAgICAgICAgICAgdGhpcy5zZWN0b3JzW2ldID0gbmV3IFNlY3Rvcih0aGlzLnNlY3Rvcl9zaXplKTtcbiAgICAgICAgfVxuXG4gICAgICAgIFxuICAgICAgICBsZXQgZmlsZSA9IG5ldyBGYXRSb290RGlyZWN0b3J5X0ZpbGUoKTtcblxuICAgICAgICBmaWxlLmZpbGVuYW1lID0gdm9sdW1lX25hbWU7XG4gICAgICAgIGZpbGUuYXR0cmlidXRlID0gRmlsZUF0dHJpYnV0ZS5WT0xVTUVfTkFNRTtcblxuICAgICAgICB0aGlzLmZpbGVzWzBdID0gZmlsZTtcbiAgICB9XG5cbiAgICBhZGRGaWxlKGZpbGVuYW1lOiBzdHJpbmcsIGV4dGVuc2lvbjogc3RyaW5nLCBhdHRyaWJ1dGU6IEZpbGVBdHRyaWJ1dGUsIGNvbnRlbnQ6IFVpbnQ4QXJyYXkpe1xuICAgICAgICBsZXQgZmlsZSA9IG5ldyBGYXRSb290RGlyZWN0b3J5X0ZpbGUoKTtcbiAgICAgICAgbGV0IGRhdGUgPSBuZXcgRGF0ZSgpO1xuICAgICAgICBsZXQgbmJfY2x1c3RlciA9IE1hdGguY2VpbCggY29udGVudC5sZW5ndGggLyB0aGlzLnNlY3Rvcl9zaXplICk7XG5cbiAgICAgICAgZmlsZS5maWxlbmFtZSA9IGZpbGVuYW1lO1xuICAgICAgICBmaWxlLmV4dGVuc2lvbiA9IGV4dGVuc2lvbjtcbiAgICAgICAgZmlsZS5hdHRyaWJ1dGUgPSBhdHRyaWJ1dGU7XG4gICAgICAgIGZpbGUuY3JlYXRlX21zID0gZGF0ZS5nZXRNaWxsaXNlY29uZHMoKTtcbiAgICAgICAgZmlsZS5jcmVhdGVfdGltZSA9IHRoaXMudGltZUZpZWxkKGRhdGUpO1xuICAgICAgICBmaWxlLmNyZWF0ZV9kYXRlID0gdGhpcy5kYXRlRmllbGQoZGF0ZSk7XG4gICAgICAgIGZpbGUubGFzdF9hY2Nlc3NfZGF0ZSA9IHRoaXMuZGF0ZUZpZWxkKGRhdGUpO1xuICAgICAgICBmaWxlLm1vZGlmaWNhdGlvbl90aW1lID0gdGhpcy50aW1lRmllbGQoZGF0ZSk7XG4gICAgICAgIGZpbGUubW9kaWZpY2F0aW9uX2RhdGUgPSB0aGlzLmRhdGVGaWVsZChkYXRlKTtcbiAgICAgICAgZmlsZS5jbHVzdGVyX251bWJlciA9IHRoaXMuZmF0X3RhYmxlLmZpbmRfZnJlZV9jbHVzdGVyKCk7XG4gICAgICAgIGZpbGUuZmlsZV9zaXplID0gY29udGVudC5sZW5ndGg7XG5cblxuICAgICAgICBsZXQgbmV4dF9jbHVzdGVyID0gZmlsZS5jbHVzdGVyX251bWJlcjtcbiAgICAgICAgbGV0IGNsdXN0ZXIgPSAwO1xuXG4gICAgICAgIGZvciggbGV0IGkgPSAwOyBpIDwgbmJfY2x1c3RlcjsgaSsrICl7XG5cbiAgICAgICAgICAgIGNsdXN0ZXIgPSBuZXh0X2NsdXN0ZXI7XG5cbiAgICAgICAgICAgIHRoaXMuc2VjdG9yc1sgY2x1c3RlciAtIDIgXS5zZXQoIGNvbnRlbnQuc2xpY2UoIGkgKiB0aGlzLnNlY3Rvcl9zaXplLCBpICogdGhpcy5zZWN0b3Jfc2l6ZSArIHRoaXMuc2VjdG9yX3NpemUgKSApO1xuXG5cbiAgICAgICAgICAgIG5leHRfY2x1c3RlciA9IHRoaXMuZmF0X3RhYmxlLmZpbmRfZnJlZV9jbHVzdGVyKCk7XG4gICAgICAgICAgICB0aGlzLmZhdF90YWJsZS5zZXRfbmV4dF9jbHVzdGVyKGNsdXN0ZXIsIG5leHRfY2x1c3Rlcik7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmZhdF90YWJsZS5zZXRfbmV4dF9jbHVzdGVyKGNsdXN0ZXIsIEZhdFRhYmxlLkVORF9PRl9GSUxFKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuZmlsZXNbdGhpcy5nZXRBdmFpbGFibGVGaWxlSW5kZXgoKV0gPSBmaWxlO1xuXG4gICAgfVxuXG4gICAgZ2VuZXJhdGVSb290RGlyZWN0b3J5KCkgOiBudW1iZXJbXXtcbiAgICAgICAgbGV0IHJlc3VsdDogbnVtYmVyW10gPSBbXTtcblxuXG4gICAgICAgIHRoaXMuZmlsZXMuZm9yRWFjaCggKGZpbGUpID0+IHtcbiAgICAgICAgICAgIGlmKCBmaWxlID09IG51bGwgKXtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSByZXN1bHQuY29uY2F0KCBGYXRSb290RGlyZWN0b3J5LkZJTEVfTk9UX1NFVCApXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IHJlc3VsdC5jb25jYXQoIGZpbGUuZ2VuZXJhdGVfZmlsZSgpICk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuc2VjdG9ycy5mb3JFYWNoKCAoc2VjdG9yKSA9PiB7XG4gICAgICAgICAgICByZXN1bHQgPSByZXN1bHQuY29uY2F0KCBBcnJheS5mcm9tKHNlY3Rvci5kYXRhKSApO1xuICAgICAgICB9KVxuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZXRBdmFpbGFibGVGaWxlSW5kZXgoKSA6IG51bWJlcntcbiAgICAgICAgZm9yKGxldCBpID0gMDsgaSA8IHRoaXMuZmlsZXMubGVuZ3RoOyArK2kpe1xuICAgICAgICAgICAgaWYoIHRoaXMuZmlsZXNbaV0gPT0gbnVsbCApe1xuICAgICAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIC0xO1xuICAgIH1cblxuICAgIHByaXZhdGUgZGF0ZUZpZWxkKGRhdGU6IERhdGUpIDogbnVtYmVye1xuICAgICAgICBsZXQgcmVzOiBudW1iZXIgPSAweDAwMDA7XG5cbiAgICAgICAgcmVzICA9IChkYXRlLmdldEZ1bGxZZWFyKCkgJiAweDdGKSA8PCA5O1xuICAgICAgICByZXMgKz0gKGRhdGUuZ2V0TW9udGgoKSAmIDB4MEYpIDw8IDU7XG4gICAgICAgIHJlcyArPSBkYXRlLmdldERheSgpICYgMHgxRjtcblxuICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgICBcbiAgICB9XG5cbiAgICBwcml2YXRlIHRpbWVGaWVsZChkYXRlOiBEYXRlKSA6IG51bWJlcntcbiAgICAgICAgbGV0IHJlczogbnVtYmVyID0gMHgwMDAwO1xuXG4gICAgICAgIHJlcyAgPSAoZGF0ZS5nZXRIb3VycygpICYgMHgxRikgPDwgMTE7XG4gICAgICAgIHJlcyArPSAoZGF0ZS5nZXRNaW51dGVzKCkgJiAweDNGKSA8PCA1O1xuICAgICAgICByZXMgKz0gTWF0aC5mbG9vcihkYXRlLmdldFNlY29uZHMoKSAvIDIpICYgMHgxRjtcblxuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cbn0iLCJpbXBvcnQgeyBGYXRCUEIgfSBmcm9tIFwiLi9mYXRfQlBCXCI7XG5cbmV4cG9ydCBjbGFzcyBGYXRUYWJsZSB7XG5cbiAgICBzdGF0aWMgRU5EX09GX0ZJTEUgOiBudW1iZXIgPSAweEZGRjtcbiAgICBzdGF0aWMgQkFEX0NMVVNURVIgOiBudW1iZXIgPSAweEZGNztcblxuICAgIHByaXZhdGUgdGFibGUgOiBVaW50MTZBcnJheTtcbiAgICBwcml2YXRlIHNpemU6IG51bWJlcjtcblxuICAgIGNvbnN0cnVjdG9yKCBicGI6IEZhdEJQQiApe1xuICAgICAgICB0aGlzLnNpemUgPSBNYXRoLmZsb29yKCAoIGJwYi5mYXRfc2l6ZSAqIGJwYi5zZWN0b3Jfc2l6ZSApIC8gMS41KTsgLy8gLyAxLjUgYmVjYXVzZSB3ZSBhcmUgdXNpbmcgRkFUMTJcbiAgICAgICAgdGhpcy50YWJsZSA9IG5ldyBVaW50MTZBcnJheSggdGhpcy5zaXplICk7ICAgIFxuICAgICAgICBcbiAgICAgICAgLy8gTWFnaWNrIG51bWJlclxuICAgICAgICB0aGlzLnRhYmxlWzBdID0gYnBiLmRpc2tfdHlwZSB8IDB4RjAwO1xuXG4gICAgICAgIC8vIFJlc2VydmVkIGNsdXN0ZXJcbiAgICAgICAgdGhpcy50YWJsZVsxXSA9IDB4RkZGO1xuICAgIFxuICAgICAgICBmb3IoIGxldCBpID0gMjsgaSA8IHRoaXMudGFibGUubGVuZ3RoOyArK2kgKXtcbiAgICAgICAgICAgIHRoaXMudGFibGVbaV0gPSAweDAwMDsgICAvL1NldCBjbHVzdGVyIGFzIGF2YWlsYWJsZVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgc2V0X25leHRfY2x1c3RlcihjbHVzdGVyOiBudW1iZXIsIG5leHQ6IG51bWJlcil7XG4gICAgICAgIGlmKCBjbHVzdGVyID49IHRoaXMudGFibGUubGVuZ3RoICl7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnRhYmxlW2NsdXN0ZXJdID0gKG5leHQgPj0gdGhpcy50YWJsZS5sZW5ndGggJiYgbmV4dCAhPSBGYXRUYWJsZS5FTkRfT0ZfRklMRSkgPyBGYXRUYWJsZS5CQURfQ0xVU1RFUiA6IChuZXh0ICYgMHhGRkYpO1xuICAgIH1cblxuICAgIGZpbmRfZnJlZV9jbHVzdGVyKCk6IG51bWJlcntcbiAgICAgICAgZm9yKCBsZXQgaSA9IDI7IGkgPCB0aGlzLnRhYmxlLmxlbmd0aCA7ICsraSl7XG4gICAgICAgICAgICBpZiggdGhpcy50YWJsZVtpXSA9PSAweDAwMCApe1xuICAgICAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIC0xO1xuICAgIH1cblxuICAgIGdlbmVyYXRlVGFibGUoKSA6IG51bWJlcltde1xuICAgICAgICAvKlxuICAgICAgICAgICAgdHdvIDEyIGJpdHMgbnVtYmVycyA6IDB4QUJDIGFuZCAweFhZWlxuICAgICAgICAgICAgY29uY2F0ZW5hdCBpbiAyNCBiaXRzIG51bWJlcjogMHhBQkNYWVpcbiAgICAgICAgICAgIHNob3VsZCBiZSBzdG9yZWQgbGlrZSB0aGlzIDogQkMgWkEgWFlcbiAgICAgICAgKi9cblxuICAgICAgICBsZXQgcmVzdWx0OiBudW1iZXJbXSA9IFtdO1xuXG4gICAgICAgIGZvciggbGV0IGkgPSAwOyBpIDwgdGhpcy50YWJsZS5sZW5ndGg7IGkgKz0gMiApe1xuICAgICAgICAgICAgbGV0IHRtcCA9IDA7XG5cbiAgICAgICAgICAgIHRtcCA9ICh0aGlzLnRhYmxlW2ldICYgMHgwRkZGKSA8PCAxMjtcbiAgICAgICAgICAgIHRtcCB8PSB0aGlzLnRhYmxlW2krMV0gJiAweDBGRkY7XG5cbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKCAgKHRtcCAmIDB4MEZGMDAwKSA+PiAxMiAgKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEJDXG4gICAgICAgICAgICByZXN1bHQucHVzaCggKCh0bXAgJiAweEYwMDAwMCkgPj4gMjApIHwgKCh0bXAgJiAweDAwMDAwRikgPDwgNCkgKTsgICAvLyBaQSA9IChBID4+IDQwKSArIChaIDw8IDgpXG4gICAgICAgICAgICByZXN1bHQucHVzaCggICh0bXAgJiAweDAwMEZGMCkgPj4gNCApOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBYWVxuICAgICAgICB9XG5cbiAgICAgICAgcmVzdWx0LnBvcCgpOyAgIC8vIFRoZSBsYXN0IGVsZW1lbnQgaXMgaW5jb21wbGV0LCBzbyB3ZSByZW1vdmluZyBpdFxuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgZ2V0U2l6ZSgpIDogbnVtYmVye1xuICAgICAgICByZXR1cm4gdGhpcy5zaXplO1xuICAgIH1cblxufSIsImV4cG9ydCBjbGFzcyBTZXJpYWxPdXRwdXQge1xuXG4gICAgcHJpdmF0ZSBvdXRwdXQgOiBIVE1MRWxlbWVudDtcblxuICAgIGNvbnN0cnVjdG9yKHBhcmVudDogSFRNTEVsZW1lbnQpe1xuICAgICAgICB0aGlzLm91dHB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgIHRoaXMub3V0cHV0LmNsYXNzTGlzdC5hZGQoXCJzZXJpYWxfb3V0cHV0XCIpO1xuXG4gICAgICAgIHBhcmVudC5hcHBlbmQodGhpcy5vdXRwdXQpO1xuICAgIH1cblxuICAgIHdyaXRlKHN0cjogc3RyaW5nKXtcbiAgICAgICAgLy90aGlzLm91dHB1dC5pbm5lclRleHQgKz0gYFske3RoaXMuZ2VuZXJhdGVfdGltZV9wcmVmaXgoKX1dICR7c3RyfWA7XG4gICAgICAgIHRoaXMub3V0cHV0LmlubmVyVGV4dCArPSBzdHI7XG4gICAgICAgIHRoaXMub3V0cHV0LnNjcm9sbFRvcCA9IHRoaXMub3V0cHV0LnNjcm9sbEhlaWdodDtcbiAgICB9XG5cbiAgICBjbGVhcigpe1xuICAgICAgICB0aGlzLm91dHB1dC5pbm5lclRleHQgPSBcIlwiO1xuICAgIH1cblxuICAgIC8vIGdlbmVyYXRlX3RpbWVfcHJlZml4KCl7XG4gICAgLy8gICAgIHZhciBkID0gbmV3IERhdGUoKTtcbiAgICAvLyAgICAgcmV0dXJuIGAke3RoaXMuemVyb19wYWRkaW5nKGQuZ2V0SG91cnMoKSwgMil9OiR7dGhpcy56ZXJvX3BhZGRpbmcoZC5nZXRNaW51dGVzKCksIDIpfToke3RoaXMuemVyb19wYWRkaW5nKGQuZ2V0U2Vjb25kcygpLCAyKX0uJHt0aGlzLnplcm9fcGFkZGluZyhkLmdldE1pbGxpc2Vjb25kcygpLCAzKX1gO1xuICAgIC8vIH1cblxuICAgIC8vIHplcm9fcGFkZGluZyhudW06IG51bWJlciwgbmJfemVyb3M6IG51bWJlcil7XG4gICAgLy8gICAgIGxldCBzID0gbnVtLnRvU3RyaW5nKCk7XG5cbiAgICAvLyAgICAgcmV0dXJuIGAke1wiMFwiLnJlcGVhdChNYXRoLm1heCgwLCBuYl96ZXJvcyAtIHMubGVuZ3RoKSl9JHtzfWA7XG4gICAgLy8gfVxufSJdfQ==
