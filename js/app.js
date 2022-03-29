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
        var percent = (left_size / document.body.clientWidth) * 100;
        this.separator.style.left = percent + "%";
        this.left_container.style.width = percent + "%";
        this.right_container.style.width = "calc(".concat(100 - percent, "% - ").concat(this.separator.clientWidth, "px)");
    };
    TwoPanelContainer.prototype.hide_right_panel = function () {
        this.right_container.style.display = "none";
        this.separator.style.display = "none";
        this.left_container.style.width = "100%";
    };
    TwoPanelContainer.prototype.show_right_panel = function () {
        this.right_container.style.display = "block";
        this.separator.style.display = "block";
        this.set_panel_size(50);
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
    function ActionConnection(daplink) {
        var _this = this;
        this.daplink = daplink;
        this.is_connected = false;
        daplink.addConnectionChangeListener(function (is_conn) { return _this.onConnectionChange(is_conn); });
    }
    ActionConnection.prototype.connect = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.daplink.connect()];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    ActionConnection.prototype.disconnect = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.daplink.disconnect()];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    ActionConnection.prototype.run = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (this.is_connected) {
                    return [2 /*return*/, this.disconnect()];
                }
                else {
                    return [2 /*return*/, this.connect()];
                }
                return [2 /*return*/];
            });
        });
    };
    ActionConnection.prototype.onConnectionChange = function (is_connected) {
        this.is_connected = is_connected;
    };
    return ActionConnection;
}());
exports.ActionConnection = ActionConnection;

},{}],8:[function(require,module,exports){
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
exports.ActionFlash = void 0;
var fat_1 = require("../microFAT/fat");
var file_saver_1 = require("file-saver");
var ihex_util_1 = require("../ihex_util");
var progress_dialog_1 = require("../progress_dialog");
var alert_dialog_1 = require("../alert_dialog");
var FatFile = /** @class */ (function () {
    function FatFile() {
        this.name = "";
        this.extension = "";
        this.isBinary = false;
        this.path = "";
    }
    return FatFile;
}());
var ActionFlash = /** @class */ (function () {
    function ActionFlash(daplink, serial_output, get_script) {
        this.get_script_cb = get_script;
        this.daplink = daplink;
        this.serial_ouput = serial_output;
        this.dialog = new progress_dialog_1.ProgressDialog();
    }
    ActionFlash.prototype.run = function () {
        return __awaiter(this, void 0, void 0, function () {
            var bin, hex, bin;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.daplink.isConnected()) return [3 /*break*/, 9];
                        this.dialog.open();
                        this.dialog.addInfo("Searching for MicroPython...");
                        return [4 /*yield*/, this.daplink.isMicropythonOnTarget()];
                    case 1:
                        if (!_a.sent()) return [3 /*break*/, 3];
                        this.dialog.addInfo("MicroPython was found.");
                        this.dialog.addInfo("Flashing python scripts");
                        return [4 /*yield*/, this.daplink.flashMain(this.get_script_cb(), function (prg) { return _this.dialog.setProgressValue(prg * 100); }, function (err) {
                                _this.dialog.addInfo("[FlashMain] Error: " + err, progress_dialog_1.ProgressMessageType.ERROR);
                                _this.dialog.addInfo("Try unplugging and replugging your board...", progress_dialog_1.ProgressMessageType.ERROR);
                            })];
                    case 2:
                        _a.sent();
                        this.serial_ouput.clear();
                        this.dialog.showCloseButton();
                        return [3 /*break*/, 8];
                    case 3:
                        this.dialog.addInfo("MicroPython was not found... Reflash everything.", progress_dialog_1.ProgressMessageType.WARNING);
                        this.dialog.addInfo("Flashing MicroPython...");
                        return [4 /*yield*/, this.generateBinary()];
                    case 4:
                        bin = _a.sent();
                        if (!(bin == null)) return [3 /*break*/, 5];
                        this.dialog.addInfo("Failed to generate binary... Abort");
                        return [3 /*break*/, 7];
                    case 5:
                        hex = new ihex_util_1.IHex(ActionFlash.FLASH_START_ADDRESS).parseBin(bin);
                        return [4 /*yield*/, this.daplink.flash(new TextEncoder().encode(hex), function (prg) { return _this.dialog.setProgressValue(prg * 100); }, function (err) {
                                _this.dialog.addInfo("[Flash] Error: " + err, progress_dialog_1.ProgressMessageType.ERROR);
                                _this.dialog.addInfo("Try unplugging and replugging your board...", progress_dialog_1.ProgressMessageType.ERROR);
                            })];
                    case 6:
                        _a.sent();
                        _a.label = 7;
                    case 7:
                        this.dialog.showCloseButton();
                        _a.label = 8;
                    case 8: return [3 /*break*/, 11];
                    case 9: return [4 /*yield*/, this.generateBinary()];
                    case 10:
                        bin = _a.sent();
                        if (bin != null) {
                            (0, file_saver_1.saveAs)(new Blob([new ihex_util_1.IHex(ActionFlash.FLASH_START_ADDRESS).parseBin(bin)]), "flash.hex");
                        }
                        _a.label = 11;
                    case 11: return [2 /*return*/, true];
                }
            });
        });
    };
    ActionFlash.prototype.generateBinary = function () {
        return __awaiter(this, void 0, void 0, function () {
            var fat, base, files, e_1, fat_part, bin_file;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        fat = new fat_1.FatFS("PYBFLASH");
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, , 5]);
                        return [4 /*yield*/, this.readFileAsJSON("assets/fat.json")];
                    case 2:
                        files = _a.sent();
                        files.forEach(function (file) { return __awaiter(_this, void 0, void 0, function () {
                            var _a, _b, _c, _d, _e, _f, _g;
                            return __generator(this, function (_h) {
                                switch (_h.label) {
                                    case 0:
                                        console.log(file);
                                        if (!file.isBinary) return [3 /*break*/, 2];
                                        _b = (_a = fat).addBinaryFile;
                                        _c = [file.name, file.extension];
                                        _d = Uint8Array.bind;
                                        return [4 /*yield*/, this.readFileAsBinary(file.path)];
                                    case 1:
                                        _b.apply(_a, _c.concat([new (_d.apply(Uint8Array, [void 0, _h.sent()]))()]));
                                        return [3 /*break*/, 4];
                                    case 2:
                                        _f = (_e = fat).addFile;
                                        _g = [file.name, file.extension];
                                        return [4 /*yield*/, this.readFileAsText(file.path)];
                                    case 3:
                                        _f.apply(_e, _g.concat([_h.sent()]));
                                        _h.label = 4;
                                    case 4: return [2 /*return*/];
                                }
                            });
                        }); });
                        return [4 /*yield*/, this.readFileAsBinary("assets/micropython_L475_v1.18_PADDED.bin")];
                    case 3:
                        base = _a.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        e_1 = _a.sent();
                        console.error("[GENERATE BINARY]: ", e_1);
                        new alert_dialog_1.AlertDialog("Fatal error", "An error occured during the image generation: <br/><div class=\"citation-error\">".concat(e_1.message, "</div><br/>Check your internet connection or restart your browser."), alert_dialog_1.AlertDialogIcon.ERROR).open();
                        return [2 /*return*/, null];
                    case 5:
                        fat.addFile("MAIN", "PY", this.get_script_cb());
                        fat_part = fat.generate_binary();
                        bin_file = new Uint8Array(base.byteLength + fat_part.length);
                        bin_file.set(new Uint8Array(base), 0);
                        bin_file.set(new Uint8Array(fat_part), base.byteLength);
                        console.log("Binary size :  ".concat(bin_file.byteLength, " bytes"));
                        return [2 /*return*/, bin_file];
                }
            });
        });
    };
    ActionFlash.prototype.readFileAsJSON = function (file) {
        return __awaiter(this, void 0, void 0, function () {
            var rep;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, fetch(file)];
                    case 1:
                        rep = _a.sent();
                        return [2 /*return*/, rep.json()];
                }
            });
        });
    };
    ActionFlash.prototype.readFileAsText = function (file) {
        return __awaiter(this, void 0, void 0, function () {
            var rep;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, fetch(file)];
                    case 1:
                        rep = _a.sent();
                        return [2 /*return*/, rep.text()];
                }
            });
        });
    };
    ActionFlash.prototype.readFileAsBinary = function (file) {
        return __awaiter(this, void 0, void 0, function () {
            var rep;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, fetch(file)];
                    case 1:
                        rep = _a.sent();
                        return [2 /*return*/, rep.arrayBuffer()];
                }
            });
        });
    };
    ActionFlash.FLASH_START_ADDRESS = 0x08000000;
    return ActionFlash;
}());
exports.ActionFlash = ActionFlash;

},{"../alert_dialog":13,"../ihex_util":22,"../microFAT/fat":23,"../progress_dialog":28,"file-saver":4}],9:[function(require,module,exports){
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
exports.ActionLoad = void 0;
var ActionLoad = /** @class */ (function () {
    function ActionLoad(onFileReaded) {
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
        this.file_input.addEventListener("input", function () { return _this.openFile(); });
        this.fileReader.onload = function () { return onFileReaded(_this.fileReader.result); };
        this.fileReader.onerror = function (evt) { return console.error("Failed to read file.", evt); };
    }
    ActionLoad.prototype.openFile = function () {
        this.fileReader.readAsText(this.file_input.files[0], "UTF-8");
    };
    ActionLoad.prototype.run = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.file_input.click();
                return [2 /*return*/, true];
            });
        });
    };
    return ActionLoad;
}());
exports.ActionLoad = ActionLoad;

},{}],10:[function(require,module,exports){
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
exports.ActionRun = void 0;
var progress_dialog_1 = require("../progress_dialog");
var ActionRun = /** @class */ (function () {
    function ActionRun(daplink, getScript) {
        this.daplink = daplink;
        this.getScript_cb = getScript;
        this.dialog = new progress_dialog_1.ProgressDialog("Running...");
    }
    ActionRun.prototype.run = function () {
        return __awaiter(this, void 0, void 0, function () {
            var is_error;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        is_error = false;
                        this.dialog.open();
                        this.dialog.addInfo("Sending script to target");
                        return [4 /*yield*/, this.daplink.runScript(this.getScript_cb(), function (prgs) { return _this.dialog.setProgressValue(prgs * 100); }, function (err) {
                                _this.dialog.addInfo(err, progress_dialog_1.ProgressMessageType.ERROR);
                                is_error = true;
                            })];
                    case 1:
                        _a.sent();
                        if (is_error) {
                            this.dialog.showCloseButton();
                        }
                        else {
                            this.dialog.close();
                        }
                        return [2 /*return*/, true];
                }
            });
        });
    };
    return ActionRun;
}());
exports.ActionRun = ActionRun;

},{"../progress_dialog":28}],11:[function(require,module,exports){
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
exports.ActionSave = void 0;
var file_saver_1 = require("file-saver");
var ActionSave = /** @class */ (function () {
    function ActionSave(getScript) {
        this.cb_getScript = getScript;
    }
    ActionSave.prototype.saveFile = function (filename) {
        var blob = new Blob([this.cb_getScript()], { type: "text/plain;charset=utf-8" });
        (0, file_saver_1.saveAs)(blob, filename);
    };
    ActionSave.prototype.run = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.saveFile("main.py");
                return [2 /*return*/, true];
            });
        });
    };
    return ActionSave;
}());
exports.ActionSave = ActionSave;

},{"file-saver":4}],12:[function(require,module,exports){
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
exports.ActionSettings = void 0;
var ActionSettings = /** @class */ (function () {
    function ActionSettings() {
    }
    ActionSettings.prototype.run = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, true];
            });
        });
    };
    return ActionSettings;
}());
exports.ActionSettings = ActionSettings;

},{}],13:[function(require,module,exports){
"use strict";
exports.__esModule = true;
exports.AlertDialog = exports.AlertDialogIcon = void 0;
var AlertDialogIcon;
(function (AlertDialogIcon) {
    AlertDialogIcon["NONE"] = "alert-dialog-icon-none";
    AlertDialogIcon["INFO"] = "alert-dialog-icon-info";
    AlertDialogIcon["WARNING"] = "alert-dialog-icon-warning";
    AlertDialogIcon["ERROR"] = "alert-dialog-icon-error";
})(AlertDialogIcon = exports.AlertDialogIcon || (exports.AlertDialogIcon = {}));
var AlertDialog = /** @class */ (function () {
    function AlertDialog(title, text, icon) {
        if (icon === void 0) { icon = AlertDialogIcon.NONE; }
        var _this = this;
        this.dialog = document.createElement("div");
        this.dialog.classList.add("alert-dialog");
        this.dialog.style.display = "none";
        var container = document.createElement("div");
        container.classList.add("alert-dialog-container");
        var title_el = document.createElement("div");
        title_el.classList.add("alert-dialog-title", icon);
        title_el.innerText = title || "";
        var content = document.createElement("div");
        content.classList.add("alert-dialog-content");
        var text_el = document.createElement("p");
        text_el.innerHTML = text || "";
        var close_button = document.createElement("button");
        close_button.classList.add("alert-dialog-close-button");
        close_button.innerText = "Close";
        close_button.addEventListener("click", function () { return _this.close(); });
        content.append(text_el);
        content.append(close_button);
        container.append(title_el);
        container.append(content);
        this.dialog.append(container);
        document.body.append(this.dialog);
    }
    AlertDialog.prototype.open = function (title, text, icon) {
        if (title) {
            this.dialog.querySelector(".alert-dialog-title").innerHTML = title;
        }
        if (text) {
            this.dialog.querySelector(".alert-dialog-content p").innerHTML = text;
        }
        if (icon) {
            var title_el = this.dialog.querySelector(".alert-dialog-title");
            title_el.classList.remove(AlertDialogIcon.NONE, AlertDialogIcon.INFO, AlertDialogIcon.WARNING, AlertDialogIcon.ERROR);
            title_el.classList.add(icon);
        }
        this.dialog.style.display = "block";
    };
    AlertDialog.prototype.close = function () {
        this.dialog.style.display = "none";
    };
    return AlertDialog;
}());
exports.AlertDialog = AlertDialog;
;

},{}],14:[function(require,module,exports){
"use strict";
exports.__esModule = true;
exports.Application = void 0;
var button_1 = require("./button/button");
var action_connection_1 = require("./actions/action_connection");
var daplink_1 = require("./daplink");
var action_run_1 = require("./actions/action_run");
var serialOutput_1 = require("./serialOutput");
var TwoPanelContainer_1 = require("./TwoPanelContainer");
var action_save_1 = require("./actions/action_save");
var action_load_1 = require("./actions/action_load");
var action_flash_1 = require("./actions/action_flash");
var button_toggle_1 = require("./button/button_toggle");
var action_settings_1 = require("./actions/action_settings");
var buttonSpacer_1 = require("./button/buttonSpacer");
var button_placeholder_1 = require("./button/button_placeholder");
var button_dropdown_1 = require("./button/button_dropdown");
var Application = /** @class */ (function () {
    function Application(get_script, set_script) {
        var _this = this;
        var _a;
        this.top_container = document.getElementById("top_container");
        this.left_container = document.getElementById("left_container");
        this.right_container = document.getElementById("right_container");
        this.spacer_container = document.getElementById("spacer_container");
        this.dapLinkWrapper = new daplink_1.DapLinkWrapper();
        this.serial_output = new serialOutput_1.SerialOutput(this.right_container);
        this.dapLinkWrapper.addReiceivedDataListener(function (data) { return _this.serial_output.write(data); });
        this.dapLinkWrapper.addConnectionChangeListener(function (is_connected) { return _this.onConnectionChange(is_connected); });
        this.topMenu(get_script, set_script);
        (_a = this.button_run) === null || _a === void 0 ? void 0 : _a.disable();
        if (this.dapLinkWrapper.isWebUSBAvailable()) {
            new TwoPanelContainer_1.TwoPanelContainer(this.left_container, this.spacer_container, this.right_container).set_panel_size(document.body.clientWidth * 0.66);
        }
        else {
            new TwoPanelContainer_1.TwoPanelContainer(this.left_container, this.spacer_container, this.right_container).hide_right_panel();
        }
    }
    Application.prototype.topMenu = function (get_script, set_script) {
        var _this = this;
        var act_connection = new action_connection_1.ActionConnection(this.dapLinkWrapper);
        var act_run = new action_run_1.ActionRun(this.dapLinkWrapper, get_script);
        var act_flash = new action_flash_1.ActionFlash(this.dapLinkWrapper, this.serial_output, get_script);
        var act_load = new action_load_1.ActionLoad(set_script);
        var act_save = new action_save_1.ActionSave(get_script);
        var act_settings = new action_settings_1.ActionSettings();
        if (this.dapLinkWrapper.isWebUSBAvailable()) {
            this.button_conn = new button_toggle_1.ToggleButton(this.top_container, "img/disconnect.png", "img/connect.png", act_connection, "Click to connect", "Click to disconnect");
            this.button_run = new button_1.Button(this.top_container, "img/play.png", act_run, "Run script on target");
        }
        else {
            new button_placeholder_1.PlaceHolderButton(this.top_container); // Connection placeholder
            new button_placeholder_1.PlaceHolderButton(this.top_container); // Play placeholder
        }
        new button_1.Button(this.top_container, "img/flash.png", act_flash, "Flash or Download");
        new buttonSpacer_1.ButtonSpacer(this.top_container);
        new button_1.Button(this.top_container, "img/upload.png", act_load, "Load python file");
        new button_1.Button(this.top_container, "img/download.png", act_save, "Save python file");
        new buttonSpacer_1.ButtonSpacer(this.top_container);
        new button_dropdown_1.ButtonDropdown(this.top_container, "img/settings.png", [new button_dropdown_1.ButtonDropdownElement("Clear console", function () { _this.serial_output.clear(); }, "f120"), new button_dropdown_1.ButtonDropdownElement("Force task stop", function () { _this.dapLinkWrapper.sendKeyboardInterrupt(); }, "f54c")], "Settings");
    };
    Application.prototype.onConnectionChange = function (is_connected) {
        var _a, _b, _c, _d;
        if (is_connected) {
            (_a = this.button_run) === null || _a === void 0 ? void 0 : _a.enable();
            (_b = this.button_conn) === null || _b === void 0 ? void 0 : _b.setButtonState(false);
        }
        else {
            (_c = this.button_run) === null || _c === void 0 ? void 0 : _c.disable();
            (_d = this.button_conn) === null || _d === void 0 ? void 0 : _d.setButtonState(true);
        }
    };
    return Application;
}());
exports.Application = Application;
// @ts-ignore
window["Application"] = Application;

},{"./TwoPanelContainer":6,"./actions/action_connection":7,"./actions/action_flash":8,"./actions/action_load":9,"./actions/action_run":10,"./actions/action_save":11,"./actions/action_settings":12,"./button/button":15,"./button/buttonSpacer":16,"./button/button_dropdown":17,"./button/button_placeholder":18,"./button/button_toggle":19,"./daplink":21,"./serialOutput":29}],15:[function(require,module,exports){
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
exports.Button = void 0;
var Button = /** @class */ (function () {
    function Button(parent, icon, action, title) {
        if (title === void 0) { title = ""; }
        var _this = this;
        this.button = document.createElement("div");
        this.icon = document.createElement("img");
        this.button.classList.add("menu_button");
        this.button.title = title;
        this.action = action;
        this.is_enable = true;
        this.icon.src = icon;
        this.button.append(this.icon);
        parent.append(this.button);
        this.button.addEventListener("click", function () { return _this.onButtonClick(); });
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
    Button.prototype.onButtonClick = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (this.is_enable) {
                    this.action.run();
                }
                return [2 /*return*/];
            });
        });
    };
    return Button;
}());
exports.Button = Button;

},{}],16:[function(require,module,exports){
"use strict";
exports.__esModule = true;
exports.ButtonSpacer = void 0;
var ButtonSpacer = /** @class */ (function () {
    function ButtonSpacer(parent) {
        var button = document.createElement("div");
        button.classList.add("menu_button_space");
        parent.append(button);
    }
    return ButtonSpacer;
}());
exports.ButtonSpacer = ButtonSpacer;

},{}],17:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
exports.ButtonDropdown = exports.ButtonDropdownElement = void 0;
var button_1 = require("./button");
var ButtonDropdownElement = /** @class */ (function () {
    /**
     * @param name Text show in dropdown
     * @param fct Function to execute on click
     * @param icon [optionnal] The hexadecimal font awesome icon
     */
    function ButtonDropdownElement(name, fct, icon) {
        this.name = name;
        this.fct = fct;
        this.icon = icon;
    }
    return ButtonDropdownElement;
}());
exports.ButtonDropdownElement = ButtonDropdownElement;
var ButtonDropdown = /** @class */ (function (_super) {
    __extends(ButtonDropdown, _super);
    function ButtonDropdown(parent, icon, dropdownElements, title) {
        if (title === void 0) { title = ""; }
        var _this = this;
        var action = {
            run: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, this.internalAction()];
            }); }); }
        };
        _this = _super.call(this, parent, icon, action, title) || this;
        var button_bounds = _this.button.getBoundingClientRect();
        _this.dropdown = document.createElement("div");
        _this.dropdown.classList.add("menu_button_dropdown");
        _this.dropdown.style.display = "none";
        _this.dropdown.style.top = button_bounds.top + 4 + button_bounds.height + "px";
        _this.dropdown.style.left = button_bounds.left + "px";
        _this.populateDorpdown(dropdownElements);
        document.body.append(_this.dropdown);
        document.body.addEventListener("mousedown", function (evt) { return _this.click_outside(evt); });
        return _this;
    }
    ButtonDropdown.prototype.internalAction = function () {
        if (this.dropdown.style.display == "none") {
            this.dropdown.style.display = "block";
        }
        else {
            this.dropdown.style.display = "none";
        }
        return true;
    };
    ButtonDropdown.prototype.click_outside = function (event) {
        var _this = this;
        if (event.path.findIndex(function (value) { return value == _this.button || value == _this.dropdown; }) == -1) {
            this.close();
        }
    };
    ButtonDropdown.prototype.populateDorpdown = function (items) {
        var _this = this;
        items.forEach(function (item) {
            var entry = document.createElement("p");
            if (item.icon) {
                entry.innerHTML = "<span class=\"fa\">&#x".concat(item.icon, ";</span>");
            }
            entry.innerHTML += item.name;
            entry.addEventListener("click", function () { _this.close(); item.fct(); });
            _this.dropdown.append(entry);
        });
    };
    ButtonDropdown.prototype.close = function () {
        this.dropdown.style.display = "none";
    };
    return ButtonDropdown;
}(button_1.Button));
exports.ButtonDropdown = ButtonDropdown;
;

},{"./button":15}],18:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
exports.PlaceHolderButton = void 0;
var button_1 = require("./button");
var PlaceHolderButton = /** @class */ (function (_super) {
    __extends(PlaceHolderButton, _super);
    function PlaceHolderButton(parent) {
        var _this = _super.call(this, parent, "", { run: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, true];
            }); }); } }) || this;
        _this.button.style.display = "none";
        _this.button.style.width = "0";
        _this.button.style.height = "0";
        return _this;
    }
    return PlaceHolderButton;
}(button_1.Button));
exports.PlaceHolderButton = PlaceHolderButton;

},{"./button":15}],19:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
exports.ToggleButton = void 0;
var button_1 = require("./button");
var ToggleButton = /** @class */ (function (_super) {
    __extends(ToggleButton, _super);
    function ToggleButton(parent, iconA, iconB, action, titleA, titleB) {
        if (titleA === void 0) { titleA = ""; }
        if (titleB === void 0) { titleB = ""; }
        var _this = _super.call(this, parent, iconA, action) || this;
        _this.lock_button_state = false;
        _this.is_A_show = true;
        _this.iconA = iconA;
        _this.iconB = iconB;
        _this.titleA = titleA;
        _this.titleB = titleB;
        return _this;
    }
    ToggleButton.prototype.setButtonState = function (show_default) {
        if (this.lock_button_state) {
            return;
        }
        this.internal_setButtonState(show_default);
    };
    ToggleButton.prototype.onButtonClick = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.is_enable) {
                            return [2 /*return*/];
                        }
                        this.lock_button_state = true;
                        return [4 /*yield*/, this.action.run()];
                    case 1:
                        if (_a.sent()) {
                            this.internal_setButtonState(!this.is_A_show);
                        }
                        this.lock_button_state = false;
                        return [2 /*return*/];
                }
            });
        });
    };
    ToggleButton.prototype.internal_setButtonState = function (show_A) {
        if (show_A) {
            this.button.title = this.titleA;
            this.icon.src = this.iconA;
        }
        else {
            this.button.title = this.titleB;
            this.icon.src = this.iconB;
        }
        this.is_A_show = show_A;
    };
    return ToggleButton;
}(button_1.Button));
exports.ToggleButton = ToggleButton;

},{"./button":15}],20:[function(require,module,exports){
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
exports.wait = exports.toHexString = exports.print_hex_data = void 0;
function print_hex_data(values) {
    var str = "";
    values.forEach(function (value, idx) {
        str += toHexString(value, 2);
        if ((idx + 1) % 4 == 0) {
            str += " ";
        }
    });
    console.log(str);
}
exports.print_hex_data = print_hex_data;
function toHexString(value, nb_digit) {
    var s = value.toString(16).toUpperCase();
    if (s.length > nb_digit)
        console.warn("[TRUNCATE WARN] : Need to represent ".concat(s, " on ").concat(nb_digit, " digits..."));
    return "0".repeat(Math.max(0, nb_digit - s.length)) + s;
}
exports.toHexString = toHexString;
function wait(ms) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve) {
                    setTimeout(function () { return resolve(); }, ms);
                })];
        });
    });
}
exports.wait = wait;

},{}],21:[function(require,module,exports){
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
var alert_dialog_1 = require("./alert_dialog");
var common_1 = require("./common");
var DapLinkWrapper = /** @class */ (function () {
    function DapLinkWrapper() {
        var _this = this;
        this.device = undefined;
        this.transport = undefined;
        this.target = undefined;
        this.cb_onReceiveData = [];
        this.serial_buffer = "";
        this.onConnectionChange_cb = [];
        if (navigator.usb) {
            navigator.usb.addEventListener('disconnect', function (event) {
                var _a;
                if (_this.isConnected()) {
                    if (((_a = _this.device) === null || _a === void 0 ? void 0 : _a.serialNumber) == event.device.serialNumber) {
                        _this.disconnect();
                    }
                }
            });
            this.is_webusb_available = true;
        }
        else {
            this.is_webusb_available = false;
        }
    }
    DapLinkWrapper.prototype.isWebUSBAvailable = function () {
        return this.is_webusb_available;
    };
    DapLinkWrapper.prototype.addReiceivedDataListener = function (cb) {
        this.cb_onReceiveData.push(cb);
    };
    DapLinkWrapper.prototype.connect = function () {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function () {
            var _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        if (!!this.isConnected()) return [3 /*break*/, 3];
                        _c = !this.is_webusb_available;
                        if (_c) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.createTarget()];
                    case 1:
                        _c = !(_d.sent());
                        _d.label = 2;
                    case 2:
                        if (_c) {
                            return [2 /*return*/, false];
                        }
                        _d.label = 3;
                    case 3: return [4 /*yield*/, ((_a = this.target) === null || _a === void 0 ? void 0 : _a.serialWrite(String.fromCharCode(1)))];
                    case 4:
                        _d.sent(); // [Ctrl+A] enter raw mode (REPL Python)
                        (_b = this.target) === null || _b === void 0 ? void 0 : _b.startSerialRead();
                        this.callOnConnectionChangeCallbacks(true);
                        return [2 /*return*/, true];
                }
            });
        });
    };
    DapLinkWrapper.prototype.disconnect = function () {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function () {
            var e_1;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!this.isConnected()) {
                            return [2 /*return*/, false];
                        }
                        (_a = this.target) === null || _a === void 0 ? void 0 : _a.stopSerialRead();
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, ((_b = this.target) === null || _b === void 0 ? void 0 : _b.disconnect())];
                    case 2:
                        _c.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        e_1 = _c.sent();
                        return [3 /*break*/, 4];
                    case 4:
                        this.target = undefined;
                        this.transport = undefined;
                        this.device = undefined;
                        this.flushSerial();
                        this.callOnConnectionChangeCallbacks(false);
                        return [2 /*return*/, true];
                }
            });
        });
    };
    DapLinkWrapper.prototype.runScript = function (script, on_progress, on_error) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.connect()];
                    case 1:
                        if (!(_a.sent())) {
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.sendScript(script + "\n\n\n", on_progress, on_error)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    DapLinkWrapper.prototype.flashMain = function (script, on_progress, on_error) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function () {
            var bin_data, prog, part_length, nb_part, i, main;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        bin_data = new TextEncoder().encode(script);
                        prog = "prog=[";
                        part_length = 40;
                        nb_part = Math.ceil(bin_data.length / part_length);
                        on_progress(0);
                        for (i = 0; i < nb_part; ++i) {
                            prog += bin_data.slice(i * part_length, (i + 1) * part_length).join(",");
                            prog += ",\n";
                        }
                        prog += "]\n";
                        main = prog +
                            "with open(\"main.py\", \"wb\") as f:\n" +
                            "\tf.write(bytearray(prog))\n" +
                            "\n";
                        "\n";
                        "\n";
                        return [4 /*yield*/, this.sendScript(main, on_progress, on_error)];
                    case 1:
                        _c.sent();
                        return [4 /*yield*/, ((_a = this.target) === null || _a === void 0 ? void 0 : _a.serialWrite(String.fromCharCode(2)))];
                    case 2:
                        _c.sent(); // [Ctrl+B] exit raw mode (REPL Python)
                        return [4 /*yield*/, ((_b = this.target) === null || _b === void 0 ? void 0 : _b.serialWrite(String.fromCharCode(4)))];
                    case 3:
                        _c.sent(); // [Ctrl+D] Soft reset (REPL Python)
                        on_progress(1);
                        return [2 /*return*/];
                }
            });
        });
    };
    DapLinkWrapper.prototype.isConnected = function () {
        return this.target != undefined && this.target.connected;
    };
    DapLinkWrapper.prototype.flash = function (hex, on_progress, on_error) {
        var _a, _b, _c, _d, _e, _f;
        return __awaiter(this, void 0, void 0, function () {
            var e_2;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        if (!this.isConnected()) {
                            return [2 /*return*/];
                        }
                        (_a = this.target) === null || _a === void 0 ? void 0 : _a.on(DAPjs.DAPLink.EVENT_PROGRESS, function (progress) { return on_progress(progress); });
                        _g.label = 1;
                    case 1:
                        _g.trys.push([1, 7, , 8]);
                        return [4 /*yield*/, ((_b = this.target) === null || _b === void 0 ? void 0 : _b.stopSerialRead())];
                    case 2:
                        _g.sent();
                        return [4 /*yield*/, ((_c = this.target) === null || _c === void 0 ? void 0 : _c.reset())];
                    case 3:
                        _g.sent();
                        return [4 /*yield*/, ((_d = this.target) === null || _d === void 0 ? void 0 : _d.flash(hex))];
                    case 4:
                        _g.sent();
                        return [4 /*yield*/, (0, common_1.wait)(1000)];
                    case 5:
                        _g.sent();
                        return [4 /*yield*/, ((_e = this.target) === null || _e === void 0 ? void 0 : _e.reset())];
                    case 6:
                        _g.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        e_2 = _g.sent();
                        console.warn("[FLASH]: ", e_2);
                        on_error(e_2.message);
                        return [3 /*break*/, 8];
                    case 8:
                        (_f = this.target) === null || _f === void 0 ? void 0 : _f.on(DAPjs.DAPLink.EVENT_PROGRESS, function (progress) { });
                        return [2 /*return*/];
                }
            });
        });
    };
    DapLinkWrapper.prototype.isMicropythonOnTarget = function () {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function () {
            var read, _d, _e, e_3;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        if (!this.isConnected()) {
                            return [2 /*return*/];
                        }
                        _f.label = 1;
                    case 1:
                        _f.trys.push([1, 7, , 8]);
                        return [4 /*yield*/, ((_a = this.target) === null || _a === void 0 ? void 0 : _a.serialWrite(String.fromCharCode(3)))];
                    case 2:
                        _f.sent(); // [Ctrl+C]
                        return [4 /*yield*/, (0, common_1.wait)(2000)];
                    case 3:
                        _f.sent();
                        return [4 /*yield*/, ((_b = this.target) === null || _b === void 0 ? void 0 : _b.serialWrite(String.fromCharCode(4)))];
                    case 4:
                        _f.sent(); // [Ctrl+D]
                        _e = (_d = new TextDecoder()).decode;
                        return [4 /*yield*/, ((_c = this.target) === null || _c === void 0 ? void 0 : _c.serialRead())];
                    case 5:
                        read = _e.apply(_d, [_f.sent()]);
                        return [4 /*yield*/, (0, common_1.wait)(2000)];
                    case 6:
                        _f.sent();
                        return [2 /*return*/, (read.indexOf("MPY") != -1)];
                    case 7:
                        e_3 = _f.sent();
                        console.error("[IS_MICROPYTHON_ON_TARGET]: ", e_3);
                        return [2 /*return*/, false];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    DapLinkWrapper.prototype.addConnectionChangeListener = function (cb) {
        this.onConnectionChange_cb.push(cb);
    };
    DapLinkWrapper.prototype.sendKeyboardInterrupt = function () {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var e_4;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!this.isConnected()) {
                            return [2 /*return*/];
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 4, , 5]);
                        return [4 /*yield*/, ((_a = this.target) === null || _a === void 0 ? void 0 : _a.serialWrite(String.fromCharCode(3)))];
                    case 2:
                        _b.sent(); // [Ctrl+C]
                        return [4 /*yield*/, (0, common_1.wait)(1000)];
                    case 3:
                        _b.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        e_4 = _b.sent();
                        console.error("[SEND_KEYBOARD_INTERRUPT]: ", e_4);
                        return [2 /*return*/, false];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    DapLinkWrapper.prototype.callOnConnectionChangeCallbacks = function (is_connected) {
        this.onConnectionChange_cb.forEach(function (cb) { return cb(is_connected); });
    };
    DapLinkWrapper.prototype.sendScript = function (script, on_progress, on_error) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        return __awaiter(this, void 0, void 0, function () {
            var final_script, chunks, i, e_5;
            return __generator(this, function (_j) {
                switch (_j.label) {
                    case 0:
                        if (!this.isConnected()) {
                            return [2 /*return*/];
                        }
                        if (script.length == 0) {
                            return [2 /*return*/];
                        }
                        final_script = "def __send_script_execution__():\n\t" + script.replace(/\n/g, "\n\t") + "\n\n";
                        chunks = final_script.match(new RegExp('[\\s\\S]{1,' + DapLinkWrapper.LENGTH_SERIAL_BUFFER + '}', 'g')) || [];
                        _j.label = 1;
                    case 1:
                        _j.trys.push([1, 16, , 17]);
                        return [4 /*yield*/, ((_a = this.target) === null || _a === void 0 ? void 0 : _a.serialWrite(String.fromCharCode(3)))];
                    case 2:
                        _j.sent(); // [Ctrl+C]
                        return [4 /*yield*/, (0, common_1.wait)(2000)];
                    case 3:
                        _j.sent();
                        this.flushSerial();
                        return [4 /*yield*/, ((_b = this.target) === null || _b === void 0 ? void 0 : _b.serialWrite(String.fromCharCode(1)))];
                    case 4:
                        _j.sent(); // [Ctrl+A] enter raw mode (REPL Python)
                        return [4 /*yield*/, (0, common_1.wait)(250)];
                    case 5:
                        _j.sent();
                        i = 0;
                        _j.label = 6;
                    case 6:
                        if (!(i < chunks.length)) return [3 /*break*/, 10];
                        return [4 /*yield*/, ((_c = this.target) === null || _c === void 0 ? void 0 : _c.serialWrite(chunks[i]))];
                    case 7:
                        _j.sent();
                        return [4 /*yield*/, (0, common_1.wait)(10)];
                    case 8:
                        _j.sent();
                        if (on_progress != undefined) {
                            on_progress(i / chunks.length);
                        }
                        _j.label = 9;
                    case 9:
                        ++i;
                        return [3 /*break*/, 6];
                    case 10: return [4 /*yield*/, ((_d = this.target) === null || _d === void 0 ? void 0 : _d.serialWrite("try:\n"))];
                    case 11:
                        _j.sent();
                        return [4 /*yield*/, ((_e = this.target) === null || _e === void 0 ? void 0 : _e.serialWrite("\t__send_script_execution__()\n"))];
                    case 12:
                        _j.sent();
                        return [4 /*yield*/, ((_f = this.target) === null || _f === void 0 ? void 0 : _f.serialWrite("except KeyboardInterrupt:\n"))];
                    case 13:
                        _j.sent();
                        return [4 /*yield*/, ((_g = this.target) === null || _g === void 0 ? void 0 : _g.serialWrite("\tprint(\"--INTERRUPT RUNNING PROGRAM--\")\n\n"))];
                    case 14:
                        _j.sent();
                        return [4 /*yield*/, ((_h = this.target) === null || _h === void 0 ? void 0 : _h.serialWrite(String.fromCharCode(4)))];
                    case 15:
                        _j.sent(); // [Ctrl+D] Execute python code (REPL Python)
                        return [3 /*break*/, 17];
                    case 16:
                        e_5 = _j.sent();
                        console.warn("[SEND SCRIPT]: ", e_5);
                        if (on_error) {
                            on_error(e_5.message);
                        }
                        return [3 /*break*/, 17];
                    case 17: return [2 /*return*/];
                }
            });
        });
    };
    DapLinkWrapper.prototype.createTarget = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, e_6, e_7;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        _a = this;
                        return [4 /*yield*/, navigator.usb.requestDevice({
                                filters: [{ vendorId: 0x0D28 }]
                            })];
                    case 1:
                        _a.device = _b.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        e_6 = _b.sent();
                        console.warn(e_6);
                        if (e_6.message.indexOf("No device selected") == -1) {
                            new alert_dialog_1.AlertDialog("WebUSB Error", "An error occured with the WebUSB: <br/><div class=\"citation-error\">".concat(e_6.message, "</div><br/>Try unplugging and replugging your board or restart your browser.<br/><br/><i>Note: WebUSB is experimental and only support on chrome based browser (chrome, chromium, brave, edge, etc)</i>"), alert_dialog_1.AlertDialogIcon.ERROR).open();
                        }
                        return [2 /*return*/, false];
                    case 3:
                        this.transport = new DAPjs.WebUSB(this.device);
                        this.target = new DAPjs.DAPLink(this.transport);
                        this.target.on(DAPjs.DAPLink.EVENT_SERIAL_DATA, function (data) { return _this.onEventSerialData(data); });
                        _b.label = 4;
                    case 4:
                        _b.trys.push([4, 7, , 8]);
                        return [4 /*yield*/, this.target.connect()];
                    case 5:
                        _b.sent();
                        return [4 /*yield*/, this.target.setSerialBaudrate(115200)];
                    case 6:
                        _b.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        e_7 = _b.sent();
                        console.warn(e_7);
                        new alert_dialog_1.AlertDialog("Connection failed", "An error occured during the connection: <br/><div class=\"citation-error\">".concat(e_7.message, "</div><br/>Try unplugging and replugging your board..."), alert_dialog_1.AlertDialogIcon.ERROR).open();
                        return [2 /*return*/, false];
                    case 8: return [2 /*return*/, true];
                }
            });
        });
    };
    DapLinkWrapper.prototype.flushSerial = function () {
        if (this.serial_buffer.length > 0) {
            this.serial_buffer = "";
        }
    };
    DapLinkWrapper.prototype.onEventSerialData = function (data) {
        var _this = this;
        var splits = data.split(/(?<=\n)/); // Split but keep the '\n'
        splits.forEach(function (split) {
            _this.serial_buffer += split;
            if (split.at(-1) == '\n') {
                _this.callOnReceiveCallbacks(_this.cleanString(_this.serial_buffer));
                _this.serial_buffer = "";
            }
        });
    };
    DapLinkWrapper.prototype.callOnReceiveCallbacks = function (data) {
        this.cb_onReceiveData.forEach(function (cb) {
            cb(data);
        });
    };
    DapLinkWrapper.prototype.cleanString = function (str) {
        return str.replace(/\x04\x04/g, "")
            .replace(/\>OK[\x04\>]*/g, "")
            .replace(/\>\>\>[ \r\n]*/g, "")
            .replace(/[\>\r\n]*raw REPL; CTRL-B to exit[\r\n]*/g, "")
            .replace(/Type "help\(\)" for more information.[\r\n]*/g, "")
            .replace(/MicroPython [\s\S]*\n$/g, "");
    };
    DapLinkWrapper.LENGTH_SERIAL_BUFFER = 30;
    return DapLinkWrapper;
}());
exports.DapLinkWrapper = DapLinkWrapper;

},{"./alert_dialog":13,"./common":20,"dapjs":3}],22:[function(require,module,exports){
"use strict";
exports.__esModule = true;
exports.IHex = void 0;
var IHex = /** @class */ (function () {
    function IHex(base_address) {
        this.base_address = base_address;
    }
    IHex.prototype.parseBin = function (bin_file) {
        var _this = this;
        var ihex = this.addressLine(this.base_address);
        var nb_lines = Math.ceil(bin_file.length / 16); // 16 octects par data line
        var offset = 0;
        var pending_address_line = "";
        var _loop_1 = function (i) {
            var crc = 0x10;
            var part = bin_file.slice(i * 16, (i + 1) * 16);
            var address = i * 16;
            var line = ":".concat(this_1.toHexString(part.length, 2));
            // The address overflow the 16 bits ?
            if (address - offset > 0xFFFF) {
                offset += 0x10000;
                pending_address_line = this_1.addressLine(this_1.base_address + offset);
            }
            // Address
            line += this_1.toHexString(address - offset, 4);
            crc += ((address - offset) & 0xFF00) >> 8;
            crc += (address - offset) & 0x00FF;
            // Field
            line += "00";
            crc += 0x00;
            // Data
            var is_data_only_FF = true;
            part.forEach(function (value) {
                line += _this.toHexString(value, 2);
                crc += value;
                if (value != 0xFF) {
                    is_data_only_FF = false;
                }
            });
            // if data are only FF and offset < 0x0808_0000 (address of FAT filesystem)
            if (is_data_only_FF && offset < 0x080800000) {
                return "continue";
            }
            // Checksum
            line += this_1.computeCRC(crc);
            // If we are wainting to print address line, do it before add data line
            if (pending_address_line.length > 0) {
                ihex += pending_address_line;
                pending_address_line = "";
            }
            // Add line
            ihex += "".concat(line, "\n");
        };
        var this_1 = this;
        for (var i = 0; i < nb_lines; i++) {
            _loop_1(i);
        }
        ihex += ":00000001FF\n";
        console.log("iHex size :  ".concat(ihex.length, " bytes"));
        return ihex;
    };
    IHex.prototype.offsetLine = function (offset) {
        var shift_addr = (offset & 0xFFFF0000) >> 4;
        return ":02000002".concat(this.toHexString(shift_addr, 4)).concat(this.computeCRC(0x04 + ((shift_addr & 0xFF00) >> 8) + (shift_addr & 0x00FF)), "\n");
    };
    IHex.prototype.addressLine = function (memory_address) {
        var shift_addr = (memory_address & 0xFFFF0000) >> 16;
        return ":02000004".concat(this.toHexString(shift_addr, 4)).concat(this.computeCRC(0x06 + ((shift_addr & 0xFF00) >> 8) + (shift_addr & 0x00FF)), "\n");
    };
    IHex.prototype.computeCRC = function (sum) {
        return this.toHexString((~(sum & 0xFF) + 1) & 0xFF, 2);
    };
    IHex.prototype.toHexString = function (value, nb_digit) {
        var s = value.toString(16).toUpperCase();
        if (s.length > nb_digit)
            console.warn("[TRUNCATE WARN] : Need to represent ".concat(s, " on ").concat(nb_digit, " digits..."));
        return "0".repeat(Math.max(0, nb_digit - s.length)) + s;
    };
    return IHex;
}());
exports.IHex = IHex;

},{}],23:[function(require,module,exports){
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
    FatFS.prototype.addBinaryFile = function (filename, extension, content) {
        this.root.addFile(filename, extension, fat_rootDir_1.FileAttribute.ARCHIVE, content);
    };
    FatFS.prototype.generate_binary = function () {
        return this.BPB.generateBPB()
            .concat(this.table.generateTable())
            .concat(this.root.generateRootDirectory());
    };
    return FatFS;
}());
exports.FatFS = FatFS;

},{"./fat_BPB":24,"./fat_rootDir":26,"./fat_table":27}],24:[function(require,module,exports){
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

},{"./fat_common":25}],25:[function(require,module,exports){
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

},{}],26:[function(require,module,exports){
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
        this.biggest_cluster_use = 0;
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
            if (cluster > this.biggest_cluster_use)
                this.biggest_cluster_use = cluster;
            this.sectors[cluster - 2].set(content.slice(i * this.sector_size, i * this.sector_size + this.sector_size));
            next_cluster = this.fat_table.find_free_cluster(cluster);
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
        for (var i = 0; i < this.sectors.length && i < this.biggest_cluster_use; ++i) {
            result = result.concat(Array.from(this.sectors[i].data));
        }
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

},{"./fat_common":25,"./fat_table":27}],27:[function(require,module,exports){
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
    FatTable.prototype.find_free_cluster = function (except) {
        if (except === void 0) { except = -1; }
        for (var i = 2; i < this.table.length; ++i) {
            if (this.table[i] == 0x000 && i != except) {
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

},{}],28:[function(require,module,exports){
"use strict";
exports.__esModule = true;
exports.ProgressDialog = exports.ProgressMessageType = void 0;
var ProgressMessageType;
(function (ProgressMessageType) {
    ProgressMessageType["INFO"] = "info";
    ProgressMessageType["WARNING"] = "warning";
    ProgressMessageType["ERROR"] = "error";
})(ProgressMessageType = exports.ProgressMessageType || (exports.ProgressMessageType = {}));
;
var ProgressDialog = /** @class */ (function () {
    function ProgressDialog(title, text) {
        if (title === void 0) { title = "Uploading..."; }
        if (text === void 0) { text = "Your program is uploading to your target, please wait.<br/><br/><i>Do not unplugged your board, do not close this tab nor change tab during uploading.</i>"; }
        var _this = this;
        this.dialog = document.createElement("div");
        this.dialog.classList.add("progress-dialog");
        this.dialog.style.display = "none";
        var container = document.createElement("div");
        container.classList.add("progress-dialog-container");
        var title_el = document.createElement("div");
        title_el.classList.add("progress-dialog-title");
        title_el.innerText = title;
        var content = document.createElement("div");
        content.classList.add("progress-dialog-content");
        var text_el = document.createElement("p");
        text_el.innerHTML = text;
        var close_button = document.createElement("button");
        close_button.classList.add("progress-dialog-close-button");
        close_button.innerText = "Close";
        close_button.addEventListener("click", function () { return _this.close(); });
        this.progress_bar_div = document.createElement("div");
        this.progress_bar_div.classList.add("progress-dialog-bar-container");
        var value = document.createElement("p");
        value.classList.add("progress-dialog-bar-value");
        var bar = document.createElement("div");
        bar.classList.add("progress-dialog-bar-cursor");
        this.progress_bar_div.append(value);
        this.progress_bar_div.append(bar);
        var infos = document.createElement("div");
        infos.classList.add("progress-dialog-infos");
        content.append(text_el);
        content.append(this.progress_bar_div);
        content.append("Status:");
        content.append(infos);
        content.append(close_button);
        container.append(title_el);
        container.append(content);
        this.dialog.append(container);
        document.body.append(this.dialog);
    }
    ProgressDialog.prototype.showCloseButton = function () {
        this.dialog.querySelector(".progress-dialog-close-button").style.display = "block";
    };
    ProgressDialog.prototype.setProgressValue = function (progress) {
        this.dialog.querySelector(".progress-dialog-bar-value").innerHTML = Math.round(progress) + "%";
        this.dialog.querySelector(".progress-dialog-bar-cursor").style.width = progress + "%";
    };
    ProgressDialog.prototype.addInfo = function (line, type) {
        if (type === void 0) { type = ProgressMessageType.INFO; }
        this.dialog.querySelector(".progress-dialog-infos").innerHTML += "<span class=\"".concat(type, "\">").concat(line, "</span><br/>");
    };
    ProgressDialog.prototype.open = function () {
        this.dialog.style.display = "block";
        this.setProgressValue(0);
        this.dialog.querySelector(".progress-dialog-close-button").style.display = "none";
        this.dialog.querySelector(".progress-dialog-infos").innerHTML = "";
    };
    ProgressDialog.prototype.close = function () {
        this.dialog.style.display = "none";
    };
    return ProgressDialog;
}());
exports.ProgressDialog = ProgressDialog;
;

},{}],29:[function(require,module,exports){
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

},{}]},{},[14])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYmFzZTY0LWpzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2J1ZmZlci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9kYXBqcy9kaXN0L2RhcC51bWQuanMiLCJub2RlX21vZHVsZXMvZmlsZS1zYXZlci9kaXN0L0ZpbGVTYXZlci5taW4uanMiLCJub2RlX21vZHVsZXMvaWVlZTc1NC9pbmRleC5qcyIsInNyYy9Ud29QYW5lbENvbnRhaW5lci50cyIsInNyYy9hY3Rpb25zL2FjdGlvbl9jb25uZWN0aW9uLnRzIiwic3JjL2FjdGlvbnMvYWN0aW9uX2ZsYXNoLnRzIiwic3JjL2FjdGlvbnMvYWN0aW9uX2xvYWQudHMiLCJzcmMvYWN0aW9ucy9hY3Rpb25fcnVuLnRzIiwic3JjL2FjdGlvbnMvYWN0aW9uX3NhdmUudHMiLCJzcmMvYWN0aW9ucy9hY3Rpb25fc2V0dGluZ3MudHMiLCJzcmMvYWxlcnRfZGlhbG9nLnRzIiwic3JjL2FwcC50cyIsInNyYy9idXR0b24vYnV0dG9uLnRzIiwic3JjL2J1dHRvbi9idXR0b25TcGFjZXIudHMiLCJzcmMvYnV0dG9uL2J1dHRvbl9kcm9wZG93bi50cyIsInNyYy9idXR0b24vYnV0dG9uX3BsYWNlaG9sZGVyLnRzIiwic3JjL2J1dHRvbi9idXR0b25fdG9nZ2xlLnRzIiwic3JjL2NvbW1vbi50cyIsInNyYy9kYXBsaW5rLnRzIiwic3JjL2loZXhfdXRpbC50cyIsInNyYy9taWNyb0ZBVC9mYXQudHMiLCJzcmMvbWljcm9GQVQvZmF0X0JQQi50cyIsInNyYy9taWNyb0ZBVC9mYXRfY29tbW9uLnRzIiwic3JjL21pY3JvRkFUL2ZhdF9yb290RGlyLnRzIiwic3JjL21pY3JvRkFUL2ZhdF90YWJsZS50cyIsInNyYy9wcm9ncmVzc19kaWFsb2cudHMiLCJzcmMvc2VyaWFsT3V0cHV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3RKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2p2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNoQkE7QUFDQTtBQUNBOzs7O0FDRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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QztRQUUzQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUMvQixDQUFDO0lBRUQsNEJBQUssR0FBTCxVQUFNLEdBQVc7UUFDYixxRUFBcUU7UUFDckUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLElBQUksR0FBRyxDQUFDO1FBQzdCLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDO0lBQ3JELENBQUM7SUFFRCw0QkFBSyxHQUFMO1FBQ0ksSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDO0lBQy9CLENBQUM7SUFZTCxtQkFBQztBQUFELENBL0JBLEFBK0JDLElBQUE7QUEvQlksb0NBQVkiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIndXNlIHN0cmljdCdcblxuZXhwb3J0cy5ieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aFxuZXhwb3J0cy50b0J5dGVBcnJheSA9IHRvQnl0ZUFycmF5XG5leHBvcnRzLmZyb21CeXRlQXJyYXkgPSBmcm9tQnl0ZUFycmF5XG5cbnZhciBsb29rdXAgPSBbXVxudmFyIHJldkxvb2t1cCA9IFtdXG52YXIgQXJyID0gdHlwZW9mIFVpbnQ4QXJyYXkgIT09ICd1bmRlZmluZWQnID8gVWludDhBcnJheSA6IEFycmF5XG5cbnZhciBjb2RlID0gJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky8nXG5mb3IgKHZhciBpID0gMCwgbGVuID0gY29kZS5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICBsb29rdXBbaV0gPSBjb2RlW2ldXG4gIHJldkxvb2t1cFtjb2RlLmNoYXJDb2RlQXQoaSldID0gaVxufVxuXG4vLyBTdXBwb3J0IGRlY29kaW5nIFVSTC1zYWZlIGJhc2U2NCBzdHJpbmdzLCBhcyBOb2RlLmpzIGRvZXMuXG4vLyBTZWU6IGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0Jhc2U2NCNVUkxfYXBwbGljYXRpb25zXG5yZXZMb29rdXBbJy0nLmNoYXJDb2RlQXQoMCldID0gNjJcbnJldkxvb2t1cFsnXycuY2hhckNvZGVBdCgwKV0gPSA2M1xuXG5mdW5jdGlvbiBnZXRMZW5zIChiNjQpIHtcbiAgdmFyIGxlbiA9IGI2NC5sZW5ndGhcblxuICBpZiAobGVuICUgNCA+IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgc3RyaW5nLiBMZW5ndGggbXVzdCBiZSBhIG11bHRpcGxlIG9mIDQnKVxuICB9XG5cbiAgLy8gVHJpbSBvZmYgZXh0cmEgYnl0ZXMgYWZ0ZXIgcGxhY2Vob2xkZXIgYnl0ZXMgYXJlIGZvdW5kXG4gIC8vIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL2JlYXRnYW1taXQvYmFzZTY0LWpzL2lzc3Vlcy80MlxuICB2YXIgdmFsaWRMZW4gPSBiNjQuaW5kZXhPZignPScpXG4gIGlmICh2YWxpZExlbiA9PT0gLTEpIHZhbGlkTGVuID0gbGVuXG5cbiAgdmFyIHBsYWNlSG9sZGVyc0xlbiA9IHZhbGlkTGVuID09PSBsZW5cbiAgICA/IDBcbiAgICA6IDQgLSAodmFsaWRMZW4gJSA0KVxuXG4gIHJldHVybiBbdmFsaWRMZW4sIHBsYWNlSG9sZGVyc0xlbl1cbn1cblxuLy8gYmFzZTY0IGlzIDQvMyArIHVwIHRvIHR3byBjaGFyYWN0ZXJzIG9mIHRoZSBvcmlnaW5hbCBkYXRhXG5mdW5jdGlvbiBieXRlTGVuZ3RoIChiNjQpIHtcbiAgdmFyIGxlbnMgPSBnZXRMZW5zKGI2NClcbiAgdmFyIHZhbGlkTGVuID0gbGVuc1swXVxuICB2YXIgcGxhY2VIb2xkZXJzTGVuID0gbGVuc1sxXVxuICByZXR1cm4gKCh2YWxpZExlbiArIHBsYWNlSG9sZGVyc0xlbikgKiAzIC8gNCkgLSBwbGFjZUhvbGRlcnNMZW5cbn1cblxuZnVuY3Rpb24gX2J5dGVMZW5ndGggKGI2NCwgdmFsaWRMZW4sIHBsYWNlSG9sZGVyc0xlbikge1xuICByZXR1cm4gKCh2YWxpZExlbiArIHBsYWNlSG9sZGVyc0xlbikgKiAzIC8gNCkgLSBwbGFjZUhvbGRlcnNMZW5cbn1cblxuZnVuY3Rpb24gdG9CeXRlQXJyYXkgKGI2NCkge1xuICB2YXIgdG1wXG4gIHZhciBsZW5zID0gZ2V0TGVucyhiNjQpXG4gIHZhciB2YWxpZExlbiA9IGxlbnNbMF1cbiAgdmFyIHBsYWNlSG9sZGVyc0xlbiA9IGxlbnNbMV1cblxuICB2YXIgYXJyID0gbmV3IEFycihfYnl0ZUxlbmd0aChiNjQsIHZhbGlkTGVuLCBwbGFjZUhvbGRlcnNMZW4pKVxuXG4gIHZhciBjdXJCeXRlID0gMFxuXG4gIC8vIGlmIHRoZXJlIGFyZSBwbGFjZWhvbGRlcnMsIG9ubHkgZ2V0IHVwIHRvIHRoZSBsYXN0IGNvbXBsZXRlIDQgY2hhcnNcbiAgdmFyIGxlbiA9IHBsYWNlSG9sZGVyc0xlbiA+IDBcbiAgICA/IHZhbGlkTGVuIC0gNFxuICAgIDogdmFsaWRMZW5cblxuICB2YXIgaVxuICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpICs9IDQpIHtcbiAgICB0bXAgPVxuICAgICAgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpKV0gPDwgMTgpIHxcbiAgICAgIChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDEpXSA8PCAxMikgfFxuICAgICAgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMildIDw8IDYpIHxcbiAgICAgIHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMyldXG4gICAgYXJyW2N1ckJ5dGUrK10gPSAodG1wID4+IDE2KSAmIDB4RkZcbiAgICBhcnJbY3VyQnl0ZSsrXSA9ICh0bXAgPj4gOCkgJiAweEZGXG4gICAgYXJyW2N1ckJ5dGUrK10gPSB0bXAgJiAweEZGXG4gIH1cblxuICBpZiAocGxhY2VIb2xkZXJzTGVuID09PSAyKSB7XG4gICAgdG1wID1cbiAgICAgIChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSldIDw8IDIpIHxcbiAgICAgIChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDEpXSA+PiA0KVxuICAgIGFycltjdXJCeXRlKytdID0gdG1wICYgMHhGRlxuICB9XG5cbiAgaWYgKHBsYWNlSG9sZGVyc0xlbiA9PT0gMSkge1xuICAgIHRtcCA9XG4gICAgICAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkpXSA8PCAxMCkgfFxuICAgICAgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMSldIDw8IDQpIHxcbiAgICAgIChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDIpXSA+PiAyKVxuICAgIGFycltjdXJCeXRlKytdID0gKHRtcCA+PiA4KSAmIDB4RkZcbiAgICBhcnJbY3VyQnl0ZSsrXSA9IHRtcCAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBhcnJcbn1cblxuZnVuY3Rpb24gdHJpcGxldFRvQmFzZTY0IChudW0pIHtcbiAgcmV0dXJuIGxvb2t1cFtudW0gPj4gMTggJiAweDNGXSArXG4gICAgbG9va3VwW251bSA+PiAxMiAmIDB4M0ZdICtcbiAgICBsb29rdXBbbnVtID4+IDYgJiAweDNGXSArXG4gICAgbG9va3VwW251bSAmIDB4M0ZdXG59XG5cbmZ1bmN0aW9uIGVuY29kZUNodW5rICh1aW50OCwgc3RhcnQsIGVuZCkge1xuICB2YXIgdG1wXG4gIHZhciBvdXRwdXQgPSBbXVxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkgKz0gMykge1xuICAgIHRtcCA9XG4gICAgICAoKHVpbnQ4W2ldIDw8IDE2KSAmIDB4RkYwMDAwKSArXG4gICAgICAoKHVpbnQ4W2kgKyAxXSA8PCA4KSAmIDB4RkYwMCkgK1xuICAgICAgKHVpbnQ4W2kgKyAyXSAmIDB4RkYpXG4gICAgb3V0cHV0LnB1c2godHJpcGxldFRvQmFzZTY0KHRtcCkpXG4gIH1cbiAgcmV0dXJuIG91dHB1dC5qb2luKCcnKVxufVxuXG5mdW5jdGlvbiBmcm9tQnl0ZUFycmF5ICh1aW50OCkge1xuICB2YXIgdG1wXG4gIHZhciBsZW4gPSB1aW50OC5sZW5ndGhcbiAgdmFyIGV4dHJhQnl0ZXMgPSBsZW4gJSAzIC8vIGlmIHdlIGhhdmUgMSBieXRlIGxlZnQsIHBhZCAyIGJ5dGVzXG4gIHZhciBwYXJ0cyA9IFtdXG4gIHZhciBtYXhDaHVua0xlbmd0aCA9IDE2MzgzIC8vIG11c3QgYmUgbXVsdGlwbGUgb2YgM1xuXG4gIC8vIGdvIHRocm91Z2ggdGhlIGFycmF5IGV2ZXJ5IHRocmVlIGJ5dGVzLCB3ZSdsbCBkZWFsIHdpdGggdHJhaWxpbmcgc3R1ZmYgbGF0ZXJcbiAgZm9yICh2YXIgaSA9IDAsIGxlbjIgPSBsZW4gLSBleHRyYUJ5dGVzOyBpIDwgbGVuMjsgaSArPSBtYXhDaHVua0xlbmd0aCkge1xuICAgIHBhcnRzLnB1c2goZW5jb2RlQ2h1bmsodWludDgsIGksIChpICsgbWF4Q2h1bmtMZW5ndGgpID4gbGVuMiA/IGxlbjIgOiAoaSArIG1heENodW5rTGVuZ3RoKSkpXG4gIH1cblxuICAvLyBwYWQgdGhlIGVuZCB3aXRoIHplcm9zLCBidXQgbWFrZSBzdXJlIHRvIG5vdCBmb3JnZXQgdGhlIGV4dHJhIGJ5dGVzXG4gIGlmIChleHRyYUJ5dGVzID09PSAxKSB7XG4gICAgdG1wID0gdWludDhbbGVuIC0gMV1cbiAgICBwYXJ0cy5wdXNoKFxuICAgICAgbG9va3VwW3RtcCA+PiAyXSArXG4gICAgICBsb29rdXBbKHRtcCA8PCA0KSAmIDB4M0ZdICtcbiAgICAgICc9PSdcbiAgICApXG4gIH0gZWxzZSBpZiAoZXh0cmFCeXRlcyA9PT0gMikge1xuICAgIHRtcCA9ICh1aW50OFtsZW4gLSAyXSA8PCA4KSArIHVpbnQ4W2xlbiAtIDFdXG4gICAgcGFydHMucHVzaChcbiAgICAgIGxvb2t1cFt0bXAgPj4gMTBdICtcbiAgICAgIGxvb2t1cFsodG1wID4+IDQpICYgMHgzRl0gK1xuICAgICAgbG9va3VwWyh0bXAgPDwgMikgJiAweDNGXSArXG4gICAgICAnPSdcbiAgICApXG4gIH1cblxuICByZXR1cm4gcGFydHMuam9pbignJylcbn1cbiIsIi8qIVxuICogVGhlIGJ1ZmZlciBtb2R1bGUgZnJvbSBub2RlLmpzLCBmb3IgdGhlIGJyb3dzZXIuXG4gKlxuICogQGF1dGhvciAgIEZlcm9zcyBBYm91a2hhZGlqZWggPGh0dHBzOi8vZmVyb3NzLm9yZz5cbiAqIEBsaWNlbnNlICBNSVRcbiAqL1xuLyogZXNsaW50LWRpc2FibGUgbm8tcHJvdG8gKi9cblxuJ3VzZSBzdHJpY3QnXG5cbnZhciBiYXNlNjQgPSByZXF1aXJlKCdiYXNlNjQtanMnKVxudmFyIGllZWU3NTQgPSByZXF1aXJlKCdpZWVlNzU0JylcblxuZXhwb3J0cy5CdWZmZXIgPSBCdWZmZXJcbmV4cG9ydHMuU2xvd0J1ZmZlciA9IFNsb3dCdWZmZXJcbmV4cG9ydHMuSU5TUEVDVF9NQVhfQllURVMgPSA1MFxuXG52YXIgS19NQVhfTEVOR1RIID0gMHg3ZmZmZmZmZlxuZXhwb3J0cy5rTWF4TGVuZ3RoID0gS19NQVhfTEVOR1RIXG5cbi8qKlxuICogSWYgYEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUYDpcbiAqICAgPT09IHRydWUgICAgVXNlIFVpbnQ4QXJyYXkgaW1wbGVtZW50YXRpb24gKGZhc3Rlc3QpXG4gKiAgID09PSBmYWxzZSAgIFByaW50IHdhcm5pbmcgYW5kIHJlY29tbWVuZCB1c2luZyBgYnVmZmVyYCB2NC54IHdoaWNoIGhhcyBhbiBPYmplY3RcbiAqICAgICAgICAgICAgICAgaW1wbGVtZW50YXRpb24gKG1vc3QgY29tcGF0aWJsZSwgZXZlbiBJRTYpXG4gKlxuICogQnJvd3NlcnMgdGhhdCBzdXBwb3J0IHR5cGVkIGFycmF5cyBhcmUgSUUgMTArLCBGaXJlZm94IDQrLCBDaHJvbWUgNyssIFNhZmFyaSA1LjErLFxuICogT3BlcmEgMTEuNissIGlPUyA0LjIrLlxuICpcbiAqIFdlIHJlcG9ydCB0aGF0IHRoZSBicm93c2VyIGRvZXMgbm90IHN1cHBvcnQgdHlwZWQgYXJyYXlzIGlmIHRoZSBhcmUgbm90IHN1YmNsYXNzYWJsZVxuICogdXNpbmcgX19wcm90b19fLiBGaXJlZm94IDQtMjkgbGFja3Mgc3VwcG9ydCBmb3IgYWRkaW5nIG5ldyBwcm9wZXJ0aWVzIHRvIGBVaW50OEFycmF5YFxuICogKFNlZTogaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9Njk1NDM4KS4gSUUgMTAgbGFja3Mgc3VwcG9ydFxuICogZm9yIF9fcHJvdG9fXyBhbmQgaGFzIGEgYnVnZ3kgdHlwZWQgYXJyYXkgaW1wbGVtZW50YXRpb24uXG4gKi9cbkJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUID0gdHlwZWRBcnJheVN1cHBvcnQoKVxuXG5pZiAoIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUICYmIHR5cGVvZiBjb25zb2xlICE9PSAndW5kZWZpbmVkJyAmJlxuICAgIHR5cGVvZiBjb25zb2xlLmVycm9yID09PSAnZnVuY3Rpb24nKSB7XG4gIGNvbnNvbGUuZXJyb3IoXG4gICAgJ1RoaXMgYnJvd3NlciBsYWNrcyB0eXBlZCBhcnJheSAoVWludDhBcnJheSkgc3VwcG9ydCB3aGljaCBpcyByZXF1aXJlZCBieSAnICtcbiAgICAnYGJ1ZmZlcmAgdjUueC4gVXNlIGBidWZmZXJgIHY0LnggaWYgeW91IHJlcXVpcmUgb2xkIGJyb3dzZXIgc3VwcG9ydC4nXG4gIClcbn1cblxuZnVuY3Rpb24gdHlwZWRBcnJheVN1cHBvcnQgKCkge1xuICAvLyBDYW4gdHlwZWQgYXJyYXkgaW5zdGFuY2VzIGNhbiBiZSBhdWdtZW50ZWQ/XG4gIHRyeSB7XG4gICAgdmFyIGFyciA9IG5ldyBVaW50OEFycmF5KDEpXG4gICAgYXJyLl9fcHJvdG9fXyA9IHsgX19wcm90b19fOiBVaW50OEFycmF5LnByb3RvdHlwZSwgZm9vOiBmdW5jdGlvbiAoKSB7IHJldHVybiA0MiB9IH1cbiAgICByZXR1cm4gYXJyLmZvbygpID09PSA0MlxuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbn1cblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJ1ZmZlci5wcm90b3R5cGUsICdwYXJlbnQnLCB7XG4gIGVudW1lcmFibGU6IHRydWUsXG4gIGdldDogZnVuY3Rpb24gKCkge1xuICAgIGlmICghQnVmZmVyLmlzQnVmZmVyKHRoaXMpKSByZXR1cm4gdW5kZWZpbmVkXG4gICAgcmV0dXJuIHRoaXMuYnVmZmVyXG4gIH1cbn0pXG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShCdWZmZXIucHJvdG90eXBlLCAnb2Zmc2V0Jywge1xuICBlbnVtZXJhYmxlOiB0cnVlLFxuICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcih0aGlzKSkgcmV0dXJuIHVuZGVmaW5lZFxuICAgIHJldHVybiB0aGlzLmJ5dGVPZmZzZXRcbiAgfVxufSlcblxuZnVuY3Rpb24gY3JlYXRlQnVmZmVyIChsZW5ndGgpIHtcbiAgaWYgKGxlbmd0aCA+IEtfTUFYX0xFTkdUSCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdUaGUgdmFsdWUgXCInICsgbGVuZ3RoICsgJ1wiIGlzIGludmFsaWQgZm9yIG9wdGlvbiBcInNpemVcIicpXG4gIH1cbiAgLy8gUmV0dXJuIGFuIGF1Z21lbnRlZCBgVWludDhBcnJheWAgaW5zdGFuY2VcbiAgdmFyIGJ1ZiA9IG5ldyBVaW50OEFycmF5KGxlbmd0aClcbiAgYnVmLl9fcHJvdG9fXyA9IEJ1ZmZlci5wcm90b3R5cGVcbiAgcmV0dXJuIGJ1ZlxufVxuXG4vKipcbiAqIFRoZSBCdWZmZXIgY29uc3RydWN0b3IgcmV0dXJucyBpbnN0YW5jZXMgb2YgYFVpbnQ4QXJyYXlgIHRoYXQgaGF2ZSB0aGVpclxuICogcHJvdG90eXBlIGNoYW5nZWQgdG8gYEJ1ZmZlci5wcm90b3R5cGVgLiBGdXJ0aGVybW9yZSwgYEJ1ZmZlcmAgaXMgYSBzdWJjbGFzcyBvZlxuICogYFVpbnQ4QXJyYXlgLCBzbyB0aGUgcmV0dXJuZWQgaW5zdGFuY2VzIHdpbGwgaGF2ZSBhbGwgdGhlIG5vZGUgYEJ1ZmZlcmAgbWV0aG9kc1xuICogYW5kIHRoZSBgVWludDhBcnJheWAgbWV0aG9kcy4gU3F1YXJlIGJyYWNrZXQgbm90YXRpb24gd29ya3MgYXMgZXhwZWN0ZWQgLS0gaXRcbiAqIHJldHVybnMgYSBzaW5nbGUgb2N0ZXQuXG4gKlxuICogVGhlIGBVaW50OEFycmF5YCBwcm90b3R5cGUgcmVtYWlucyB1bm1vZGlmaWVkLlxuICovXG5cbmZ1bmN0aW9uIEJ1ZmZlciAoYXJnLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpIHtcbiAgLy8gQ29tbW9uIGNhc2UuXG4gIGlmICh0eXBlb2YgYXJnID09PSAnbnVtYmVyJykge1xuICAgIGlmICh0eXBlb2YgZW5jb2RpbmdPck9mZnNldCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAgICdUaGUgXCJzdHJpbmdcIiBhcmd1bWVudCBtdXN0IGJlIG9mIHR5cGUgc3RyaW5nLiBSZWNlaXZlZCB0eXBlIG51bWJlcidcbiAgICAgIClcbiAgICB9XG4gICAgcmV0dXJuIGFsbG9jVW5zYWZlKGFyZylcbiAgfVxuICByZXR1cm4gZnJvbShhcmcsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aClcbn1cblxuLy8gRml4IHN1YmFycmF5KCkgaW4gRVMyMDE2LiBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9mZXJvc3MvYnVmZmVyL3B1bGwvOTdcbmlmICh0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2wuc3BlY2llcyAhPSBudWxsICYmXG4gICAgQnVmZmVyW1N5bWJvbC5zcGVjaWVzXSA9PT0gQnVmZmVyKSB7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShCdWZmZXIsIFN5bWJvbC5zcGVjaWVzLCB7XG4gICAgdmFsdWU6IG51bGwsXG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgIHdyaXRhYmxlOiBmYWxzZVxuICB9KVxufVxuXG5CdWZmZXIucG9vbFNpemUgPSA4MTkyIC8vIG5vdCB1c2VkIGJ5IHRoaXMgaW1wbGVtZW50YXRpb25cblxuZnVuY3Rpb24gZnJvbSAodmFsdWUsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aCkge1xuICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgIHJldHVybiBmcm9tU3RyaW5nKHZhbHVlLCBlbmNvZGluZ09yT2Zmc2V0KVxuICB9XG5cbiAgaWYgKEFycmF5QnVmZmVyLmlzVmlldyh2YWx1ZSkpIHtcbiAgICByZXR1cm4gZnJvbUFycmF5TGlrZSh2YWx1ZSlcbiAgfVxuXG4gIGlmICh2YWx1ZSA9PSBudWxsKSB7XG4gICAgdGhyb3cgVHlwZUVycm9yKFxuICAgICAgJ1RoZSBmaXJzdCBhcmd1bWVudCBtdXN0IGJlIG9uZSBvZiB0eXBlIHN0cmluZywgQnVmZmVyLCBBcnJheUJ1ZmZlciwgQXJyYXksICcgK1xuICAgICAgJ29yIEFycmF5LWxpa2UgT2JqZWN0LiBSZWNlaXZlZCB0eXBlICcgKyAodHlwZW9mIHZhbHVlKVxuICAgIClcbiAgfVxuXG4gIGlmIChpc0luc3RhbmNlKHZhbHVlLCBBcnJheUJ1ZmZlcikgfHxcbiAgICAgICh2YWx1ZSAmJiBpc0luc3RhbmNlKHZhbHVlLmJ1ZmZlciwgQXJyYXlCdWZmZXIpKSkge1xuICAgIHJldHVybiBmcm9tQXJyYXlCdWZmZXIodmFsdWUsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aClcbiAgfVxuXG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICdUaGUgXCJ2YWx1ZVwiIGFyZ3VtZW50IG11c3Qgbm90IGJlIG9mIHR5cGUgbnVtYmVyLiBSZWNlaXZlZCB0eXBlIG51bWJlcidcbiAgICApXG4gIH1cblxuICB2YXIgdmFsdWVPZiA9IHZhbHVlLnZhbHVlT2YgJiYgdmFsdWUudmFsdWVPZigpXG4gIGlmICh2YWx1ZU9mICE9IG51bGwgJiYgdmFsdWVPZiAhPT0gdmFsdWUpIHtcbiAgICByZXR1cm4gQnVmZmVyLmZyb20odmFsdWVPZiwgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKVxuICB9XG5cbiAgdmFyIGIgPSBmcm9tT2JqZWN0KHZhbHVlKVxuICBpZiAoYikgcmV0dXJuIGJcblxuICBpZiAodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLnRvUHJpbWl0aXZlICE9IG51bGwgJiZcbiAgICAgIHR5cGVvZiB2YWx1ZVtTeW1ib2wudG9QcmltaXRpdmVdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIEJ1ZmZlci5mcm9tKFxuICAgICAgdmFsdWVbU3ltYm9sLnRvUHJpbWl0aXZlXSgnc3RyaW5nJyksIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aFxuICAgIClcbiAgfVxuXG4gIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgJ1RoZSBmaXJzdCBhcmd1bWVudCBtdXN0IGJlIG9uZSBvZiB0eXBlIHN0cmluZywgQnVmZmVyLCBBcnJheUJ1ZmZlciwgQXJyYXksICcgK1xuICAgICdvciBBcnJheS1saWtlIE9iamVjdC4gUmVjZWl2ZWQgdHlwZSAnICsgKHR5cGVvZiB2YWx1ZSlcbiAgKVxufVxuXG4vKipcbiAqIEZ1bmN0aW9uYWxseSBlcXVpdmFsZW50IHRvIEJ1ZmZlcihhcmcsIGVuY29kaW5nKSBidXQgdGhyb3dzIGEgVHlwZUVycm9yXG4gKiBpZiB2YWx1ZSBpcyBhIG51bWJlci5cbiAqIEJ1ZmZlci5mcm9tKHN0clssIGVuY29kaW5nXSlcbiAqIEJ1ZmZlci5mcm9tKGFycmF5KVxuICogQnVmZmVyLmZyb20oYnVmZmVyKVxuICogQnVmZmVyLmZyb20oYXJyYXlCdWZmZXJbLCBieXRlT2Zmc2V0WywgbGVuZ3RoXV0pXG4gKiovXG5CdWZmZXIuZnJvbSA9IGZ1bmN0aW9uICh2YWx1ZSwgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBmcm9tKHZhbHVlLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpXG59XG5cbi8vIE5vdGU6IENoYW5nZSBwcm90b3R5cGUgKmFmdGVyKiBCdWZmZXIuZnJvbSBpcyBkZWZpbmVkIHRvIHdvcmthcm91bmQgQ2hyb21lIGJ1Zzpcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9mZXJvc3MvYnVmZmVyL3B1bGwvMTQ4XG5CdWZmZXIucHJvdG90eXBlLl9fcHJvdG9fXyA9IFVpbnQ4QXJyYXkucHJvdG90eXBlXG5CdWZmZXIuX19wcm90b19fID0gVWludDhBcnJheVxuXG5mdW5jdGlvbiBhc3NlcnRTaXplIChzaXplKSB7XG4gIGlmICh0eXBlb2Ygc2l6ZSAhPT0gJ251bWJlcicpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcInNpemVcIiBhcmd1bWVudCBtdXN0IGJlIG9mIHR5cGUgbnVtYmVyJylcbiAgfSBlbHNlIGlmIChzaXplIDwgMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdUaGUgdmFsdWUgXCInICsgc2l6ZSArICdcIiBpcyBpbnZhbGlkIGZvciBvcHRpb24gXCJzaXplXCInKVxuICB9XG59XG5cbmZ1bmN0aW9uIGFsbG9jIChzaXplLCBmaWxsLCBlbmNvZGluZykge1xuICBhc3NlcnRTaXplKHNpemUpXG4gIGlmIChzaXplIDw9IDApIHtcbiAgICByZXR1cm4gY3JlYXRlQnVmZmVyKHNpemUpXG4gIH1cbiAgaWYgKGZpbGwgIT09IHVuZGVmaW5lZCkge1xuICAgIC8vIE9ubHkgcGF5IGF0dGVudGlvbiB0byBlbmNvZGluZyBpZiBpdCdzIGEgc3RyaW5nLiBUaGlzXG4gICAgLy8gcHJldmVudHMgYWNjaWRlbnRhbGx5IHNlbmRpbmcgaW4gYSBudW1iZXIgdGhhdCB3b3VsZFxuICAgIC8vIGJlIGludGVycHJldHRlZCBhcyBhIHN0YXJ0IG9mZnNldC5cbiAgICByZXR1cm4gdHlwZW9mIGVuY29kaW5nID09PSAnc3RyaW5nJ1xuICAgICAgPyBjcmVhdGVCdWZmZXIoc2l6ZSkuZmlsbChmaWxsLCBlbmNvZGluZylcbiAgICAgIDogY3JlYXRlQnVmZmVyKHNpemUpLmZpbGwoZmlsbClcbiAgfVxuICByZXR1cm4gY3JlYXRlQnVmZmVyKHNpemUpXG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBmaWxsZWQgQnVmZmVyIGluc3RhbmNlLlxuICogYWxsb2Moc2l6ZVssIGZpbGxbLCBlbmNvZGluZ11dKVxuICoqL1xuQnVmZmVyLmFsbG9jID0gZnVuY3Rpb24gKHNpemUsIGZpbGwsIGVuY29kaW5nKSB7XG4gIHJldHVybiBhbGxvYyhzaXplLCBmaWxsLCBlbmNvZGluZylcbn1cblxuZnVuY3Rpb24gYWxsb2NVbnNhZmUgKHNpemUpIHtcbiAgYXNzZXJ0U2l6ZShzaXplKVxuICByZXR1cm4gY3JlYXRlQnVmZmVyKHNpemUgPCAwID8gMCA6IGNoZWNrZWQoc2l6ZSkgfCAwKVxufVxuXG4vKipcbiAqIEVxdWl2YWxlbnQgdG8gQnVmZmVyKG51bSksIGJ5IGRlZmF1bHQgY3JlYXRlcyBhIG5vbi16ZXJvLWZpbGxlZCBCdWZmZXIgaW5zdGFuY2UuXG4gKiAqL1xuQnVmZmVyLmFsbG9jVW5zYWZlID0gZnVuY3Rpb24gKHNpemUpIHtcbiAgcmV0dXJuIGFsbG9jVW5zYWZlKHNpemUpXG59XG4vKipcbiAqIEVxdWl2YWxlbnQgdG8gU2xvd0J1ZmZlcihudW0pLCBieSBkZWZhdWx0IGNyZWF0ZXMgYSBub24temVyby1maWxsZWQgQnVmZmVyIGluc3RhbmNlLlxuICovXG5CdWZmZXIuYWxsb2NVbnNhZmVTbG93ID0gZnVuY3Rpb24gKHNpemUpIHtcbiAgcmV0dXJuIGFsbG9jVW5zYWZlKHNpemUpXG59XG5cbmZ1bmN0aW9uIGZyb21TdHJpbmcgKHN0cmluZywgZW5jb2RpbmcpIHtcbiAgaWYgKHR5cGVvZiBlbmNvZGluZyAhPT0gJ3N0cmluZycgfHwgZW5jb2RpbmcgPT09ICcnKSB7XG4gICAgZW5jb2RpbmcgPSAndXRmOCdcbiAgfVxuXG4gIGlmICghQnVmZmVyLmlzRW5jb2RpbmcoZW5jb2RpbmcpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5rbm93biBlbmNvZGluZzogJyArIGVuY29kaW5nKVxuICB9XG5cbiAgdmFyIGxlbmd0aCA9IGJ5dGVMZW5ndGgoc3RyaW5nLCBlbmNvZGluZykgfCAwXG4gIHZhciBidWYgPSBjcmVhdGVCdWZmZXIobGVuZ3RoKVxuXG4gIHZhciBhY3R1YWwgPSBidWYud3JpdGUoc3RyaW5nLCBlbmNvZGluZylcblxuICBpZiAoYWN0dWFsICE9PSBsZW5ndGgpIHtcbiAgICAvLyBXcml0aW5nIGEgaGV4IHN0cmluZywgZm9yIGV4YW1wbGUsIHRoYXQgY29udGFpbnMgaW52YWxpZCBjaGFyYWN0ZXJzIHdpbGxcbiAgICAvLyBjYXVzZSBldmVyeXRoaW5nIGFmdGVyIHRoZSBmaXJzdCBpbnZhbGlkIGNoYXJhY3RlciB0byBiZSBpZ25vcmVkLiAoZS5nLlxuICAgIC8vICdhYnh4Y2QnIHdpbGwgYmUgdHJlYXRlZCBhcyAnYWInKVxuICAgIGJ1ZiA9IGJ1Zi5zbGljZSgwLCBhY3R1YWwpXG4gIH1cblxuICByZXR1cm4gYnVmXG59XG5cbmZ1bmN0aW9uIGZyb21BcnJheUxpa2UgKGFycmF5KSB7XG4gIHZhciBsZW5ndGggPSBhcnJheS5sZW5ndGggPCAwID8gMCA6IGNoZWNrZWQoYXJyYXkubGVuZ3RoKSB8IDBcbiAgdmFyIGJ1ZiA9IGNyZWF0ZUJ1ZmZlcihsZW5ndGgpXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpICs9IDEpIHtcbiAgICBidWZbaV0gPSBhcnJheVtpXSAmIDI1NVxuICB9XG4gIHJldHVybiBidWZcbn1cblxuZnVuY3Rpb24gZnJvbUFycmF5QnVmZmVyIChhcnJheSwgYnl0ZU9mZnNldCwgbGVuZ3RoKSB7XG4gIGlmIChieXRlT2Zmc2V0IDwgMCB8fCBhcnJheS5ieXRlTGVuZ3RoIDwgYnl0ZU9mZnNldCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdcIm9mZnNldFwiIGlzIG91dHNpZGUgb2YgYnVmZmVyIGJvdW5kcycpXG4gIH1cblxuICBpZiAoYXJyYXkuYnl0ZUxlbmd0aCA8IGJ5dGVPZmZzZXQgKyAobGVuZ3RoIHx8IDApKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1wibGVuZ3RoXCIgaXMgb3V0c2lkZSBvZiBidWZmZXIgYm91bmRzJylcbiAgfVxuXG4gIHZhciBidWZcbiAgaWYgKGJ5dGVPZmZzZXQgPT09IHVuZGVmaW5lZCAmJiBsZW5ndGggPT09IHVuZGVmaW5lZCkge1xuICAgIGJ1ZiA9IG5ldyBVaW50OEFycmF5KGFycmF5KVxuICB9IGVsc2UgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgYnVmID0gbmV3IFVpbnQ4QXJyYXkoYXJyYXksIGJ5dGVPZmZzZXQpXG4gIH0gZWxzZSB7XG4gICAgYnVmID0gbmV3IFVpbnQ4QXJyYXkoYXJyYXksIGJ5dGVPZmZzZXQsIGxlbmd0aClcbiAgfVxuXG4gIC8vIFJldHVybiBhbiBhdWdtZW50ZWQgYFVpbnQ4QXJyYXlgIGluc3RhbmNlXG4gIGJ1Zi5fX3Byb3RvX18gPSBCdWZmZXIucHJvdG90eXBlXG4gIHJldHVybiBidWZcbn1cblxuZnVuY3Rpb24gZnJvbU9iamVjdCAob2JqKSB7XG4gIGlmIChCdWZmZXIuaXNCdWZmZXIob2JqKSkge1xuICAgIHZhciBsZW4gPSBjaGVja2VkKG9iai5sZW5ndGgpIHwgMFxuICAgIHZhciBidWYgPSBjcmVhdGVCdWZmZXIobGVuKVxuXG4gICAgaWYgKGJ1Zi5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBidWZcbiAgICB9XG5cbiAgICBvYmouY29weShidWYsIDAsIDAsIGxlbilcbiAgICByZXR1cm4gYnVmXG4gIH1cblxuICBpZiAob2JqLmxlbmd0aCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgaWYgKHR5cGVvZiBvYmoubGVuZ3RoICE9PSAnbnVtYmVyJyB8fCBudW1iZXJJc05hTihvYmoubGVuZ3RoKSkge1xuICAgICAgcmV0dXJuIGNyZWF0ZUJ1ZmZlcigwKVxuICAgIH1cbiAgICByZXR1cm4gZnJvbUFycmF5TGlrZShvYmopXG4gIH1cblxuICBpZiAob2JqLnR5cGUgPT09ICdCdWZmZXInICYmIEFycmF5LmlzQXJyYXkob2JqLmRhdGEpKSB7XG4gICAgcmV0dXJuIGZyb21BcnJheUxpa2Uob2JqLmRhdGEpXG4gIH1cbn1cblxuZnVuY3Rpb24gY2hlY2tlZCAobGVuZ3RoKSB7XG4gIC8vIE5vdGU6IGNhbm5vdCB1c2UgYGxlbmd0aCA8IEtfTUFYX0xFTkdUSGAgaGVyZSBiZWNhdXNlIHRoYXQgZmFpbHMgd2hlblxuICAvLyBsZW5ndGggaXMgTmFOICh3aGljaCBpcyBvdGhlcndpc2UgY29lcmNlZCB0byB6ZXJvLilcbiAgaWYgKGxlbmd0aCA+PSBLX01BWF9MRU5HVEgpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQXR0ZW1wdCB0byBhbGxvY2F0ZSBCdWZmZXIgbGFyZ2VyIHRoYW4gbWF4aW11bSAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAnc2l6ZTogMHgnICsgS19NQVhfTEVOR1RILnRvU3RyaW5nKDE2KSArICcgYnl0ZXMnKVxuICB9XG4gIHJldHVybiBsZW5ndGggfCAwXG59XG5cbmZ1bmN0aW9uIFNsb3dCdWZmZXIgKGxlbmd0aCkge1xuICBpZiAoK2xlbmd0aCAhPSBsZW5ndGgpIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBlcWVxZXFcbiAgICBsZW5ndGggPSAwXG4gIH1cbiAgcmV0dXJuIEJ1ZmZlci5hbGxvYygrbGVuZ3RoKVxufVxuXG5CdWZmZXIuaXNCdWZmZXIgPSBmdW5jdGlvbiBpc0J1ZmZlciAoYikge1xuICByZXR1cm4gYiAhPSBudWxsICYmIGIuX2lzQnVmZmVyID09PSB0cnVlICYmXG4gICAgYiAhPT0gQnVmZmVyLnByb3RvdHlwZSAvLyBzbyBCdWZmZXIuaXNCdWZmZXIoQnVmZmVyLnByb3RvdHlwZSkgd2lsbCBiZSBmYWxzZVxufVxuXG5CdWZmZXIuY29tcGFyZSA9IGZ1bmN0aW9uIGNvbXBhcmUgKGEsIGIpIHtcbiAgaWYgKGlzSW5zdGFuY2UoYSwgVWludDhBcnJheSkpIGEgPSBCdWZmZXIuZnJvbShhLCBhLm9mZnNldCwgYS5ieXRlTGVuZ3RoKVxuICBpZiAoaXNJbnN0YW5jZShiLCBVaW50OEFycmF5KSkgYiA9IEJ1ZmZlci5mcm9tKGIsIGIub2Zmc2V0LCBiLmJ5dGVMZW5ndGgpXG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGEpIHx8ICFCdWZmZXIuaXNCdWZmZXIoYikpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgJ1RoZSBcImJ1ZjFcIiwgXCJidWYyXCIgYXJndW1lbnRzIG11c3QgYmUgb25lIG9mIHR5cGUgQnVmZmVyIG9yIFVpbnQ4QXJyYXknXG4gICAgKVxuICB9XG5cbiAgaWYgKGEgPT09IGIpIHJldHVybiAwXG5cbiAgdmFyIHggPSBhLmxlbmd0aFxuICB2YXIgeSA9IGIubGVuZ3RoXG5cbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IE1hdGgubWluKHgsIHkpOyBpIDwgbGVuOyArK2kpIHtcbiAgICBpZiAoYVtpXSAhPT0gYltpXSkge1xuICAgICAgeCA9IGFbaV1cbiAgICAgIHkgPSBiW2ldXG4gICAgICBicmVha1xuICAgIH1cbiAgfVxuXG4gIGlmICh4IDwgeSkgcmV0dXJuIC0xXG4gIGlmICh5IDwgeCkgcmV0dXJuIDFcbiAgcmV0dXJuIDBcbn1cblxuQnVmZmVyLmlzRW5jb2RpbmcgPSBmdW5jdGlvbiBpc0VuY29kaW5nIChlbmNvZGluZykge1xuICBzd2l0Y2ggKFN0cmluZyhlbmNvZGluZykudG9Mb3dlckNhc2UoKSkge1xuICAgIGNhc2UgJ2hleCc6XG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgIGNhc2UgJ2FzY2lpJzpcbiAgICBjYXNlICdsYXRpbjEnOlxuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0dXJuIHRydWVcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIGZhbHNlXG4gIH1cbn1cblxuQnVmZmVyLmNvbmNhdCA9IGZ1bmN0aW9uIGNvbmNhdCAobGlzdCwgbGVuZ3RoKSB7XG4gIGlmICghQXJyYXkuaXNBcnJheShsaXN0KSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wibGlzdFwiIGFyZ3VtZW50IG11c3QgYmUgYW4gQXJyYXkgb2YgQnVmZmVycycpXG4gIH1cblxuICBpZiAobGlzdC5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gQnVmZmVyLmFsbG9jKDApXG4gIH1cblxuICB2YXIgaVxuICBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQpIHtcbiAgICBsZW5ndGggPSAwXG4gICAgZm9yIChpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyArK2kpIHtcbiAgICAgIGxlbmd0aCArPSBsaXN0W2ldLmxlbmd0aFxuICAgIH1cbiAgfVxuXG4gIHZhciBidWZmZXIgPSBCdWZmZXIuYWxsb2NVbnNhZmUobGVuZ3RoKVxuICB2YXIgcG9zID0gMFxuICBmb3IgKGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7ICsraSkge1xuICAgIHZhciBidWYgPSBsaXN0W2ldXG4gICAgaWYgKGlzSW5zdGFuY2UoYnVmLCBVaW50OEFycmF5KSkge1xuICAgICAgYnVmID0gQnVmZmVyLmZyb20oYnVmKVxuICAgIH1cbiAgICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihidWYpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcImxpc3RcIiBhcmd1bWVudCBtdXN0IGJlIGFuIEFycmF5IG9mIEJ1ZmZlcnMnKVxuICAgIH1cbiAgICBidWYuY29weShidWZmZXIsIHBvcylcbiAgICBwb3MgKz0gYnVmLmxlbmd0aFxuICB9XG4gIHJldHVybiBidWZmZXJcbn1cblxuZnVuY3Rpb24gYnl0ZUxlbmd0aCAoc3RyaW5nLCBlbmNvZGluZykge1xuICBpZiAoQnVmZmVyLmlzQnVmZmVyKHN0cmluZykpIHtcbiAgICByZXR1cm4gc3RyaW5nLmxlbmd0aFxuICB9XG4gIGlmIChBcnJheUJ1ZmZlci5pc1ZpZXcoc3RyaW5nKSB8fCBpc0luc3RhbmNlKHN0cmluZywgQXJyYXlCdWZmZXIpKSB7XG4gICAgcmV0dXJuIHN0cmluZy5ieXRlTGVuZ3RoXG4gIH1cbiAgaWYgKHR5cGVvZiBzdHJpbmcgIT09ICdzdHJpbmcnKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICdUaGUgXCJzdHJpbmdcIiBhcmd1bWVudCBtdXN0IGJlIG9uZSBvZiB0eXBlIHN0cmluZywgQnVmZmVyLCBvciBBcnJheUJ1ZmZlci4gJyArXG4gICAgICAnUmVjZWl2ZWQgdHlwZSAnICsgdHlwZW9mIHN0cmluZ1xuICAgIClcbiAgfVxuXG4gIHZhciBsZW4gPSBzdHJpbmcubGVuZ3RoXG4gIHZhciBtdXN0TWF0Y2ggPSAoYXJndW1lbnRzLmxlbmd0aCA+IDIgJiYgYXJndW1lbnRzWzJdID09PSB0cnVlKVxuICBpZiAoIW11c3RNYXRjaCAmJiBsZW4gPT09IDApIHJldHVybiAwXG5cbiAgLy8gVXNlIGEgZm9yIGxvb3AgdG8gYXZvaWQgcmVjdXJzaW9uXG4gIHZhciBsb3dlcmVkQ2FzZSA9IGZhbHNlXG4gIGZvciAoOzspIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdhc2NpaSc6XG4gICAgICBjYXNlICdsYXRpbjEnOlxuICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgICAgcmV0dXJuIGxlblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICAgIHJldHVybiB1dGY4VG9CeXRlcyhzdHJpbmcpLmxlbmd0aFxuICAgICAgY2FzZSAndWNzMic6XG4gICAgICBjYXNlICd1Y3MtMic6XG4gICAgICBjYXNlICd1dGYxNmxlJzpcbiAgICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgICAgcmV0dXJuIGxlbiAqIDJcbiAgICAgIGNhc2UgJ2hleCc6XG4gICAgICAgIHJldHVybiBsZW4gPj4+IDFcbiAgICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICAgIHJldHVybiBiYXNlNjRUb0J5dGVzKHN0cmluZykubGVuZ3RoXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAobG93ZXJlZENhc2UpIHtcbiAgICAgICAgICByZXR1cm4gbXVzdE1hdGNoID8gLTEgOiB1dGY4VG9CeXRlcyhzdHJpbmcpLmxlbmd0aCAvLyBhc3N1bWUgdXRmOFxuICAgICAgICB9XG4gICAgICAgIGVuY29kaW5nID0gKCcnICsgZW5jb2RpbmcpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5CdWZmZXIuYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGhcblxuZnVuY3Rpb24gc2xvd1RvU3RyaW5nIChlbmNvZGluZywgc3RhcnQsIGVuZCkge1xuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuXG4gIC8vIE5vIG5lZWQgdG8gdmVyaWZ5IHRoYXQgXCJ0aGlzLmxlbmd0aCA8PSBNQVhfVUlOVDMyXCIgc2luY2UgaXQncyBhIHJlYWQtb25seVxuICAvLyBwcm9wZXJ0eSBvZiBhIHR5cGVkIGFycmF5LlxuXG4gIC8vIFRoaXMgYmVoYXZlcyBuZWl0aGVyIGxpa2UgU3RyaW5nIG5vciBVaW50OEFycmF5IGluIHRoYXQgd2Ugc2V0IHN0YXJ0L2VuZFxuICAvLyB0byB0aGVpciB1cHBlci9sb3dlciBib3VuZHMgaWYgdGhlIHZhbHVlIHBhc3NlZCBpcyBvdXQgb2YgcmFuZ2UuXG4gIC8vIHVuZGVmaW5lZCBpcyBoYW5kbGVkIHNwZWNpYWxseSBhcyBwZXIgRUNNQS0yNjIgNnRoIEVkaXRpb24sXG4gIC8vIFNlY3Rpb24gMTMuMy4zLjcgUnVudGltZSBTZW1hbnRpY3M6IEtleWVkQmluZGluZ0luaXRpYWxpemF0aW9uLlxuICBpZiAoc3RhcnQgPT09IHVuZGVmaW5lZCB8fCBzdGFydCA8IDApIHtcbiAgICBzdGFydCA9IDBcbiAgfVxuICAvLyBSZXR1cm4gZWFybHkgaWYgc3RhcnQgPiB0aGlzLmxlbmd0aC4gRG9uZSBoZXJlIHRvIHByZXZlbnQgcG90ZW50aWFsIHVpbnQzMlxuICAvLyBjb2VyY2lvbiBmYWlsIGJlbG93LlxuICBpZiAoc3RhcnQgPiB0aGlzLmxlbmd0aCkge1xuICAgIHJldHVybiAnJ1xuICB9XG5cbiAgaWYgKGVuZCA9PT0gdW5kZWZpbmVkIHx8IGVuZCA+IHRoaXMubGVuZ3RoKSB7XG4gICAgZW5kID0gdGhpcy5sZW5ndGhcbiAgfVxuXG4gIGlmIChlbmQgPD0gMCkge1xuICAgIHJldHVybiAnJ1xuICB9XG5cbiAgLy8gRm9yY2UgY29lcnNpb24gdG8gdWludDMyLiBUaGlzIHdpbGwgYWxzbyBjb2VyY2UgZmFsc2V5L05hTiB2YWx1ZXMgdG8gMC5cbiAgZW5kID4+Pj0gMFxuICBzdGFydCA+Pj49IDBcblxuICBpZiAoZW5kIDw9IHN0YXJ0KSB7XG4gICAgcmV0dXJuICcnXG4gIH1cblxuICBpZiAoIWVuY29kaW5nKSBlbmNvZGluZyA9ICd1dGY4J1xuXG4gIHdoaWxlICh0cnVlKSB7XG4gICAgc3dpdGNoIChlbmNvZGluZykge1xuICAgICAgY2FzZSAnaGV4JzpcbiAgICAgICAgcmV0dXJuIGhleFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ3V0ZjgnOlxuICAgICAgY2FzZSAndXRmLTgnOlxuICAgICAgICByZXR1cm4gdXRmOFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgICAgcmV0dXJuIGFzY2lpU2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnbGF0aW4xJzpcbiAgICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICAgIHJldHVybiBsYXRpbjFTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgICByZXR1cm4gYmFzZTY0U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAndWNzMic6XG4gICAgICBjYXNlICd1Y3MtMic6XG4gICAgICBjYXNlICd1dGYxNmxlJzpcbiAgICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgICAgcmV0dXJuIHV0ZjE2bGVTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAobG93ZXJlZENhc2UpIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgICAgICAgZW5jb2RpbmcgPSAoZW5jb2RpbmcgKyAnJykudG9Mb3dlckNhc2UoKVxuICAgICAgICBsb3dlcmVkQ2FzZSA9IHRydWVcbiAgICB9XG4gIH1cbn1cblxuLy8gVGhpcyBwcm9wZXJ0eSBpcyB1c2VkIGJ5IGBCdWZmZXIuaXNCdWZmZXJgIChhbmQgdGhlIGBpcy1idWZmZXJgIG5wbSBwYWNrYWdlKVxuLy8gdG8gZGV0ZWN0IGEgQnVmZmVyIGluc3RhbmNlLiBJdCdzIG5vdCBwb3NzaWJsZSB0byB1c2UgYGluc3RhbmNlb2YgQnVmZmVyYFxuLy8gcmVsaWFibHkgaW4gYSBicm93c2VyaWZ5IGNvbnRleHQgYmVjYXVzZSB0aGVyZSBjb3VsZCBiZSBtdWx0aXBsZSBkaWZmZXJlbnRcbi8vIGNvcGllcyBvZiB0aGUgJ2J1ZmZlcicgcGFja2FnZSBpbiB1c2UuIFRoaXMgbWV0aG9kIHdvcmtzIGV2ZW4gZm9yIEJ1ZmZlclxuLy8gaW5zdGFuY2VzIHRoYXQgd2VyZSBjcmVhdGVkIGZyb20gYW5vdGhlciBjb3B5IG9mIHRoZSBgYnVmZmVyYCBwYWNrYWdlLlxuLy8gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vZmVyb3NzL2J1ZmZlci9pc3N1ZXMvMTU0XG5CdWZmZXIucHJvdG90eXBlLl9pc0J1ZmZlciA9IHRydWVcblxuZnVuY3Rpb24gc3dhcCAoYiwgbiwgbSkge1xuICB2YXIgaSA9IGJbbl1cbiAgYltuXSA9IGJbbV1cbiAgYlttXSA9IGlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zd2FwMTYgPSBmdW5jdGlvbiBzd2FwMTYgKCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgaWYgKGxlbiAlIDIgIT09IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQnVmZmVyIHNpemUgbXVzdCBiZSBhIG11bHRpcGxlIG9mIDE2LWJpdHMnKVxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpICs9IDIpIHtcbiAgICBzd2FwKHRoaXMsIGksIGkgKyAxKVxuICB9XG4gIHJldHVybiB0aGlzXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuc3dhcDMyID0gZnVuY3Rpb24gc3dhcDMyICgpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIGlmIChsZW4gJSA0ICE9PSAwKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0J1ZmZlciBzaXplIG11c3QgYmUgYSBtdWx0aXBsZSBvZiAzMi1iaXRzJylcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSArPSA0KSB7XG4gICAgc3dhcCh0aGlzLCBpLCBpICsgMylcbiAgICBzd2FwKHRoaXMsIGkgKyAxLCBpICsgMilcbiAgfVxuICByZXR1cm4gdGhpc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnN3YXA2NCA9IGZ1bmN0aW9uIHN3YXA2NCAoKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBpZiAobGVuICUgOCAhPT0gMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdCdWZmZXIgc2l6ZSBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgNjQtYml0cycpXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkgKz0gOCkge1xuICAgIHN3YXAodGhpcywgaSwgaSArIDcpXG4gICAgc3dhcCh0aGlzLCBpICsgMSwgaSArIDYpXG4gICAgc3dhcCh0aGlzLCBpICsgMiwgaSArIDUpXG4gICAgc3dhcCh0aGlzLCBpICsgMywgaSArIDQpXG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nICgpIHtcbiAgdmFyIGxlbmd0aCA9IHRoaXMubGVuZ3RoXG4gIGlmIChsZW5ndGggPT09IDApIHJldHVybiAnJ1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHV0ZjhTbGljZSh0aGlzLCAwLCBsZW5ndGgpXG4gIHJldHVybiBzbG93VG9TdHJpbmcuYXBwbHkodGhpcywgYXJndW1lbnRzKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnRvTG9jYWxlU3RyaW5nID0gQnVmZmVyLnByb3RvdHlwZS50b1N0cmluZ1xuXG5CdWZmZXIucHJvdG90eXBlLmVxdWFscyA9IGZ1bmN0aW9uIGVxdWFscyAoYikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihiKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnQgbXVzdCBiZSBhIEJ1ZmZlcicpXG4gIGlmICh0aGlzID09PSBiKSByZXR1cm4gdHJ1ZVxuICByZXR1cm4gQnVmZmVyLmNvbXBhcmUodGhpcywgYikgPT09IDBcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5pbnNwZWN0ID0gZnVuY3Rpb24gaW5zcGVjdCAoKSB7XG4gIHZhciBzdHIgPSAnJ1xuICB2YXIgbWF4ID0gZXhwb3J0cy5JTlNQRUNUX01BWF9CWVRFU1xuICBzdHIgPSB0aGlzLnRvU3RyaW5nKCdoZXgnLCAwLCBtYXgpLnJlcGxhY2UoLyguezJ9KS9nLCAnJDEgJykudHJpbSgpXG4gIGlmICh0aGlzLmxlbmd0aCA+IG1heCkgc3RyICs9ICcgLi4uICdcbiAgcmV0dXJuICc8QnVmZmVyICcgKyBzdHIgKyAnPidcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5jb21wYXJlID0gZnVuY3Rpb24gY29tcGFyZSAodGFyZ2V0LCBzdGFydCwgZW5kLCB0aGlzU3RhcnQsIHRoaXNFbmQpIHtcbiAgaWYgKGlzSW5zdGFuY2UodGFyZ2V0LCBVaW50OEFycmF5KSkge1xuICAgIHRhcmdldCA9IEJ1ZmZlci5mcm9tKHRhcmdldCwgdGFyZ2V0Lm9mZnNldCwgdGFyZ2V0LmJ5dGVMZW5ndGgpXG4gIH1cbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIodGFyZ2V0KSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAnVGhlIFwidGFyZ2V0XCIgYXJndW1lbnQgbXVzdCBiZSBvbmUgb2YgdHlwZSBCdWZmZXIgb3IgVWludDhBcnJheS4gJyArXG4gICAgICAnUmVjZWl2ZWQgdHlwZSAnICsgKHR5cGVvZiB0YXJnZXQpXG4gICAgKVxuICB9XG5cbiAgaWYgKHN0YXJ0ID09PSB1bmRlZmluZWQpIHtcbiAgICBzdGFydCA9IDBcbiAgfVxuICBpZiAoZW5kID09PSB1bmRlZmluZWQpIHtcbiAgICBlbmQgPSB0YXJnZXQgPyB0YXJnZXQubGVuZ3RoIDogMFxuICB9XG4gIGlmICh0aGlzU3RhcnQgPT09IHVuZGVmaW5lZCkge1xuICAgIHRoaXNTdGFydCA9IDBcbiAgfVxuICBpZiAodGhpc0VuZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhpc0VuZCA9IHRoaXMubGVuZ3RoXG4gIH1cblxuICBpZiAoc3RhcnQgPCAwIHx8IGVuZCA+IHRhcmdldC5sZW5ndGggfHwgdGhpc1N0YXJ0IDwgMCB8fCB0aGlzRW5kID4gdGhpcy5sZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignb3V0IG9mIHJhbmdlIGluZGV4JylcbiAgfVxuXG4gIGlmICh0aGlzU3RhcnQgPj0gdGhpc0VuZCAmJiBzdGFydCA+PSBlbmQpIHtcbiAgICByZXR1cm4gMFxuICB9XG4gIGlmICh0aGlzU3RhcnQgPj0gdGhpc0VuZCkge1xuICAgIHJldHVybiAtMVxuICB9XG4gIGlmIChzdGFydCA+PSBlbmQpIHtcbiAgICByZXR1cm4gMVxuICB9XG5cbiAgc3RhcnQgPj4+PSAwXG4gIGVuZCA+Pj49IDBcbiAgdGhpc1N0YXJ0ID4+Pj0gMFxuICB0aGlzRW5kID4+Pj0gMFxuXG4gIGlmICh0aGlzID09PSB0YXJnZXQpIHJldHVybiAwXG5cbiAgdmFyIHggPSB0aGlzRW5kIC0gdGhpc1N0YXJ0XG4gIHZhciB5ID0gZW5kIC0gc3RhcnRcbiAgdmFyIGxlbiA9IE1hdGgubWluKHgsIHkpXG5cbiAgdmFyIHRoaXNDb3B5ID0gdGhpcy5zbGljZSh0aGlzU3RhcnQsIHRoaXNFbmQpXG4gIHZhciB0YXJnZXRDb3B5ID0gdGFyZ2V0LnNsaWNlKHN0YXJ0LCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSkge1xuICAgIGlmICh0aGlzQ29weVtpXSAhPT0gdGFyZ2V0Q29weVtpXSkge1xuICAgICAgeCA9IHRoaXNDb3B5W2ldXG4gICAgICB5ID0gdGFyZ2V0Q29weVtpXVxuICAgICAgYnJlYWtcbiAgICB9XG4gIH1cblxuICBpZiAoeCA8IHkpIHJldHVybiAtMVxuICBpZiAoeSA8IHgpIHJldHVybiAxXG4gIHJldHVybiAwXG59XG5cbi8vIEZpbmRzIGVpdGhlciB0aGUgZmlyc3QgaW5kZXggb2YgYHZhbGAgaW4gYGJ1ZmZlcmAgYXQgb2Zmc2V0ID49IGBieXRlT2Zmc2V0YCxcbi8vIE9SIHRoZSBsYXN0IGluZGV4IG9mIGB2YWxgIGluIGBidWZmZXJgIGF0IG9mZnNldCA8PSBgYnl0ZU9mZnNldGAuXG4vL1xuLy8gQXJndW1lbnRzOlxuLy8gLSBidWZmZXIgLSBhIEJ1ZmZlciB0byBzZWFyY2hcbi8vIC0gdmFsIC0gYSBzdHJpbmcsIEJ1ZmZlciwgb3IgbnVtYmVyXG4vLyAtIGJ5dGVPZmZzZXQgLSBhbiBpbmRleCBpbnRvIGBidWZmZXJgOyB3aWxsIGJlIGNsYW1wZWQgdG8gYW4gaW50MzJcbi8vIC0gZW5jb2RpbmcgLSBhbiBvcHRpb25hbCBlbmNvZGluZywgcmVsZXZhbnQgaXMgdmFsIGlzIGEgc3RyaW5nXG4vLyAtIGRpciAtIHRydWUgZm9yIGluZGV4T2YsIGZhbHNlIGZvciBsYXN0SW5kZXhPZlxuZnVuY3Rpb24gYmlkaXJlY3Rpb25hbEluZGV4T2YgKGJ1ZmZlciwgdmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgZGlyKSB7XG4gIC8vIEVtcHR5IGJ1ZmZlciBtZWFucyBubyBtYXRjaFxuICBpZiAoYnVmZmVyLmxlbmd0aCA9PT0gMCkgcmV0dXJuIC0xXG5cbiAgLy8gTm9ybWFsaXplIGJ5dGVPZmZzZXRcbiAgaWYgKHR5cGVvZiBieXRlT2Zmc2V0ID09PSAnc3RyaW5nJykge1xuICAgIGVuY29kaW5nID0gYnl0ZU9mZnNldFxuICAgIGJ5dGVPZmZzZXQgPSAwXG4gIH0gZWxzZSBpZiAoYnl0ZU9mZnNldCA+IDB4N2ZmZmZmZmYpIHtcbiAgICBieXRlT2Zmc2V0ID0gMHg3ZmZmZmZmZlxuICB9IGVsc2UgaWYgKGJ5dGVPZmZzZXQgPCAtMHg4MDAwMDAwMCkge1xuICAgIGJ5dGVPZmZzZXQgPSAtMHg4MDAwMDAwMFxuICB9XG4gIGJ5dGVPZmZzZXQgPSArYnl0ZU9mZnNldCAvLyBDb2VyY2UgdG8gTnVtYmVyLlxuICBpZiAobnVtYmVySXNOYU4oYnl0ZU9mZnNldCkpIHtcbiAgICAvLyBieXRlT2Zmc2V0OiBpdCBpdCdzIHVuZGVmaW5lZCwgbnVsbCwgTmFOLCBcImZvb1wiLCBldGMsIHNlYXJjaCB3aG9sZSBidWZmZXJcbiAgICBieXRlT2Zmc2V0ID0gZGlyID8gMCA6IChidWZmZXIubGVuZ3RoIC0gMSlcbiAgfVxuXG4gIC8vIE5vcm1hbGl6ZSBieXRlT2Zmc2V0OiBuZWdhdGl2ZSBvZmZzZXRzIHN0YXJ0IGZyb20gdGhlIGVuZCBvZiB0aGUgYnVmZmVyXG4gIGlmIChieXRlT2Zmc2V0IDwgMCkgYnl0ZU9mZnNldCA9IGJ1ZmZlci5sZW5ndGggKyBieXRlT2Zmc2V0XG4gIGlmIChieXRlT2Zmc2V0ID49IGJ1ZmZlci5sZW5ndGgpIHtcbiAgICBpZiAoZGlyKSByZXR1cm4gLTFcbiAgICBlbHNlIGJ5dGVPZmZzZXQgPSBidWZmZXIubGVuZ3RoIC0gMVxuICB9IGVsc2UgaWYgKGJ5dGVPZmZzZXQgPCAwKSB7XG4gICAgaWYgKGRpcikgYnl0ZU9mZnNldCA9IDBcbiAgICBlbHNlIHJldHVybiAtMVxuICB9XG5cbiAgLy8gTm9ybWFsaXplIHZhbFxuICBpZiAodHlwZW9mIHZhbCA9PT0gJ3N0cmluZycpIHtcbiAgICB2YWwgPSBCdWZmZXIuZnJvbSh2YWwsIGVuY29kaW5nKVxuICB9XG5cbiAgLy8gRmluYWxseSwgc2VhcmNoIGVpdGhlciBpbmRleE9mIChpZiBkaXIgaXMgdHJ1ZSkgb3IgbGFzdEluZGV4T2ZcbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcih2YWwpKSB7XG4gICAgLy8gU3BlY2lhbCBjYXNlOiBsb29raW5nIGZvciBlbXB0eSBzdHJpbmcvYnVmZmVyIGFsd2F5cyBmYWlsc1xuICAgIGlmICh2YWwubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gLTFcbiAgICB9XG4gICAgcmV0dXJuIGFycmF5SW5kZXhPZihidWZmZXIsIHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIGRpcilcbiAgfSBlbHNlIGlmICh0eXBlb2YgdmFsID09PSAnbnVtYmVyJykge1xuICAgIHZhbCA9IHZhbCAmIDB4RkYgLy8gU2VhcmNoIGZvciBhIGJ5dGUgdmFsdWUgWzAtMjU1XVxuICAgIGlmICh0eXBlb2YgVWludDhBcnJheS5wcm90b3R5cGUuaW5kZXhPZiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgaWYgKGRpcikge1xuICAgICAgICByZXR1cm4gVWludDhBcnJheS5wcm90b3R5cGUuaW5kZXhPZi5jYWxsKGJ1ZmZlciwgdmFsLCBieXRlT2Zmc2V0KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFVpbnQ4QXJyYXkucHJvdG90eXBlLmxhc3RJbmRleE9mLmNhbGwoYnVmZmVyLCB2YWwsIGJ5dGVPZmZzZXQpXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBhcnJheUluZGV4T2YoYnVmZmVyLCBbIHZhbCBdLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgZGlyKVxuICB9XG5cbiAgdGhyb3cgbmV3IFR5cGVFcnJvcigndmFsIG11c3QgYmUgc3RyaW5nLCBudW1iZXIgb3IgQnVmZmVyJylcbn1cblxuZnVuY3Rpb24gYXJyYXlJbmRleE9mIChhcnIsIHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIGRpcikge1xuICB2YXIgaW5kZXhTaXplID0gMVxuICB2YXIgYXJyTGVuZ3RoID0gYXJyLmxlbmd0aFxuICB2YXIgdmFsTGVuZ3RoID0gdmFsLmxlbmd0aFxuXG4gIGlmIChlbmNvZGluZyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgZW5jb2RpbmcgPSBTdHJpbmcoZW5jb2RpbmcpLnRvTG93ZXJDYXNlKClcbiAgICBpZiAoZW5jb2RpbmcgPT09ICd1Y3MyJyB8fCBlbmNvZGluZyA9PT0gJ3Vjcy0yJyB8fFxuICAgICAgICBlbmNvZGluZyA9PT0gJ3V0ZjE2bGUnIHx8IGVuY29kaW5nID09PSAndXRmLTE2bGUnKSB7XG4gICAgICBpZiAoYXJyLmxlbmd0aCA8IDIgfHwgdmFsLmxlbmd0aCA8IDIpIHtcbiAgICAgICAgcmV0dXJuIC0xXG4gICAgICB9XG4gICAgICBpbmRleFNpemUgPSAyXG4gICAgICBhcnJMZW5ndGggLz0gMlxuICAgICAgdmFsTGVuZ3RoIC89IDJcbiAgICAgIGJ5dGVPZmZzZXQgLz0gMlxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWQgKGJ1ZiwgaSkge1xuICAgIGlmIChpbmRleFNpemUgPT09IDEpIHtcbiAgICAgIHJldHVybiBidWZbaV1cbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGJ1Zi5yZWFkVUludDE2QkUoaSAqIGluZGV4U2l6ZSlcbiAgICB9XG4gIH1cblxuICB2YXIgaVxuICBpZiAoZGlyKSB7XG4gICAgdmFyIGZvdW5kSW5kZXggPSAtMVxuICAgIGZvciAoaSA9IGJ5dGVPZmZzZXQ7IGkgPCBhcnJMZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHJlYWQoYXJyLCBpKSA9PT0gcmVhZCh2YWwsIGZvdW5kSW5kZXggPT09IC0xID8gMCA6IGkgLSBmb3VuZEluZGV4KSkge1xuICAgICAgICBpZiAoZm91bmRJbmRleCA9PT0gLTEpIGZvdW5kSW5kZXggPSBpXG4gICAgICAgIGlmIChpIC0gZm91bmRJbmRleCArIDEgPT09IHZhbExlbmd0aCkgcmV0dXJuIGZvdW5kSW5kZXggKiBpbmRleFNpemVcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChmb3VuZEluZGV4ICE9PSAtMSkgaSAtPSBpIC0gZm91bmRJbmRleFxuICAgICAgICBmb3VuZEluZGV4ID0gLTFcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKGJ5dGVPZmZzZXQgKyB2YWxMZW5ndGggPiBhcnJMZW5ndGgpIGJ5dGVPZmZzZXQgPSBhcnJMZW5ndGggLSB2YWxMZW5ndGhcbiAgICBmb3IgKGkgPSBieXRlT2Zmc2V0OyBpID49IDA7IGktLSkge1xuICAgICAgdmFyIGZvdW5kID0gdHJ1ZVxuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCB2YWxMZW5ndGg7IGorKykge1xuICAgICAgICBpZiAocmVhZChhcnIsIGkgKyBqKSAhPT0gcmVhZCh2YWwsIGopKSB7XG4gICAgICAgICAgZm91bmQgPSBmYWxzZVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChmb3VuZCkgcmV0dXJuIGlcbiAgICB9XG4gIH1cblxuICByZXR1cm4gLTFcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5pbmNsdWRlcyA9IGZ1bmN0aW9uIGluY2x1ZGVzICh2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nKSB7XG4gIHJldHVybiB0aGlzLmluZGV4T2YodmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZykgIT09IC0xXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuaW5kZXhPZiA9IGZ1bmN0aW9uIGluZGV4T2YgKHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcpIHtcbiAgcmV0dXJuIGJpZGlyZWN0aW9uYWxJbmRleE9mKHRoaXMsIHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIHRydWUpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUubGFzdEluZGV4T2YgPSBmdW5jdGlvbiBsYXN0SW5kZXhPZiAodmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZykge1xuICByZXR1cm4gYmlkaXJlY3Rpb25hbEluZGV4T2YodGhpcywgdmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgZmFsc2UpXG59XG5cbmZ1bmN0aW9uIGhleFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgb2Zmc2V0ID0gTnVtYmVyKG9mZnNldCkgfHwgMFxuICB2YXIgcmVtYWluaW5nID0gYnVmLmxlbmd0aCAtIG9mZnNldFxuICBpZiAoIWxlbmd0aCkge1xuICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICB9IGVsc2Uge1xuICAgIGxlbmd0aCA9IE51bWJlcihsZW5ndGgpXG4gICAgaWYgKGxlbmd0aCA+IHJlbWFpbmluZykge1xuICAgICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gICAgfVxuICB9XG5cbiAgdmFyIHN0ckxlbiA9IHN0cmluZy5sZW5ndGhcblxuICBpZiAobGVuZ3RoID4gc3RyTGVuIC8gMikge1xuICAgIGxlbmd0aCA9IHN0ckxlbiAvIDJcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgKytpKSB7XG4gICAgdmFyIHBhcnNlZCA9IHBhcnNlSW50KHN0cmluZy5zdWJzdHIoaSAqIDIsIDIpLCAxNilcbiAgICBpZiAobnVtYmVySXNOYU4ocGFyc2VkKSkgcmV0dXJuIGlcbiAgICBidWZbb2Zmc2V0ICsgaV0gPSBwYXJzZWRcbiAgfVxuICByZXR1cm4gaVxufVxuXG5mdW5jdGlvbiB1dGY4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcih1dGY4VG9CeXRlcyhzdHJpbmcsIGJ1Zi5sZW5ndGggLSBvZmZzZXQpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBhc2NpaVdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIoYXNjaWlUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIGxhdGluMVdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGFzY2lpV3JpdGUoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBiYXNlNjRXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKGJhc2U2NFRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gdWNzMldyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIodXRmMTZsZVRvQnl0ZXMoc3RyaW5nLCBidWYubGVuZ3RoIC0gb2Zmc2V0KSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uIHdyaXRlIChzdHJpbmcsIG9mZnNldCwgbGVuZ3RoLCBlbmNvZGluZykge1xuICAvLyBCdWZmZXIjd3JpdGUoc3RyaW5nKVxuICBpZiAob2Zmc2V0ID09PSB1bmRlZmluZWQpIHtcbiAgICBlbmNvZGluZyA9ICd1dGY4J1xuICAgIGxlbmd0aCA9IHRoaXMubGVuZ3RoXG4gICAgb2Zmc2V0ID0gMFxuICAvLyBCdWZmZXIjd3JpdGUoc3RyaW5nLCBlbmNvZGluZylcbiAgfSBlbHNlIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCAmJiB0eXBlb2Ygb2Zmc2V0ID09PSAnc3RyaW5nJykge1xuICAgIGVuY29kaW5nID0gb2Zmc2V0XG4gICAgbGVuZ3RoID0gdGhpcy5sZW5ndGhcbiAgICBvZmZzZXQgPSAwXG4gIC8vIEJ1ZmZlciN3cml0ZShzdHJpbmcsIG9mZnNldFssIGxlbmd0aF1bLCBlbmNvZGluZ10pXG4gIH0gZWxzZSBpZiAoaXNGaW5pdGUob2Zmc2V0KSkge1xuICAgIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICAgIGlmIChpc0Zpbml0ZShsZW5ndGgpKSB7XG4gICAgICBsZW5ndGggPSBsZW5ndGggPj4+IDBcbiAgICAgIGlmIChlbmNvZGluZyA9PT0gdW5kZWZpbmVkKSBlbmNvZGluZyA9ICd1dGY4J1xuICAgIH0gZWxzZSB7XG4gICAgICBlbmNvZGluZyA9IGxlbmd0aFxuICAgICAgbGVuZ3RoID0gdW5kZWZpbmVkXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICdCdWZmZXIud3JpdGUoc3RyaW5nLCBlbmNvZGluZywgb2Zmc2V0WywgbGVuZ3RoXSkgaXMgbm8gbG9uZ2VyIHN1cHBvcnRlZCdcbiAgICApXG4gIH1cblxuICB2YXIgcmVtYWluaW5nID0gdGhpcy5sZW5ndGggLSBvZmZzZXRcbiAgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkIHx8IGxlbmd0aCA+IHJlbWFpbmluZykgbGVuZ3RoID0gcmVtYWluaW5nXG5cbiAgaWYgKChzdHJpbmcubGVuZ3RoID4gMCAmJiAobGVuZ3RoIDwgMCB8fCBvZmZzZXQgPCAwKSkgfHwgb2Zmc2V0ID4gdGhpcy5sZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQXR0ZW1wdCB0byB3cml0ZSBvdXRzaWRlIGJ1ZmZlciBib3VuZHMnKVxuICB9XG5cbiAgaWYgKCFlbmNvZGluZykgZW5jb2RpbmcgPSAndXRmOCdcblxuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuICBmb3IgKDs7KSB7XG4gICAgc3dpdGNoIChlbmNvZGluZykge1xuICAgICAgY2FzZSAnaGV4JzpcbiAgICAgICAgcmV0dXJuIGhleFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ3V0ZjgnOlxuICAgICAgY2FzZSAndXRmLTgnOlxuICAgICAgICByZXR1cm4gdXRmOFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgICAgcmV0dXJuIGFzY2lpV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAnbGF0aW4xJzpcbiAgICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICAgIHJldHVybiBsYXRpbjFXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgICAvLyBXYXJuaW5nOiBtYXhMZW5ndGggbm90IHRha2VuIGludG8gYWNjb3VudCBpbiBiYXNlNjRXcml0ZVxuICAgICAgICByZXR1cm4gYmFzZTY0V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAndWNzMic6XG4gICAgICBjYXNlICd1Y3MtMic6XG4gICAgICBjYXNlICd1dGYxNmxlJzpcbiAgICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgICAgcmV0dXJuIHVjczJXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAobG93ZXJlZENhc2UpIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgICAgICAgZW5jb2RpbmcgPSAoJycgKyBlbmNvZGluZykudG9Mb3dlckNhc2UoKVxuICAgICAgICBsb3dlcmVkQ2FzZSA9IHRydWVcbiAgICB9XG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiB0b0pTT04gKCkge1xuICByZXR1cm4ge1xuICAgIHR5cGU6ICdCdWZmZXInLFxuICAgIGRhdGE6IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKHRoaXMuX2FyciB8fCB0aGlzLCAwKVxuICB9XG59XG5cbmZ1bmN0aW9uIGJhc2U2NFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgaWYgKHN0YXJ0ID09PSAwICYmIGVuZCA9PT0gYnVmLmxlbmd0aCkge1xuICAgIHJldHVybiBiYXNlNjQuZnJvbUJ5dGVBcnJheShidWYpXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGJhc2U2NC5mcm9tQnl0ZUFycmF5KGJ1Zi5zbGljZShzdGFydCwgZW5kKSlcbiAgfVxufVxuXG5mdW5jdGlvbiB1dGY4U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG4gIHZhciByZXMgPSBbXVxuXG4gIHZhciBpID0gc3RhcnRcbiAgd2hpbGUgKGkgPCBlbmQpIHtcbiAgICB2YXIgZmlyc3RCeXRlID0gYnVmW2ldXG4gICAgdmFyIGNvZGVQb2ludCA9IG51bGxcbiAgICB2YXIgYnl0ZXNQZXJTZXF1ZW5jZSA9IChmaXJzdEJ5dGUgPiAweEVGKSA/IDRcbiAgICAgIDogKGZpcnN0Qnl0ZSA+IDB4REYpID8gM1xuICAgICAgICA6IChmaXJzdEJ5dGUgPiAweEJGKSA/IDJcbiAgICAgICAgICA6IDFcblxuICAgIGlmIChpICsgYnl0ZXNQZXJTZXF1ZW5jZSA8PSBlbmQpIHtcbiAgICAgIHZhciBzZWNvbmRCeXRlLCB0aGlyZEJ5dGUsIGZvdXJ0aEJ5dGUsIHRlbXBDb2RlUG9pbnRcblxuICAgICAgc3dpdGNoIChieXRlc1BlclNlcXVlbmNlKSB7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICBpZiAoZmlyc3RCeXRlIDwgMHg4MCkge1xuICAgICAgICAgICAgY29kZVBvaW50ID0gZmlyc3RCeXRlXG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICBzZWNvbmRCeXRlID0gYnVmW2kgKyAxXVxuICAgICAgICAgIGlmICgoc2Vjb25kQnl0ZSAmIDB4QzApID09PSAweDgwKSB7XG4gICAgICAgICAgICB0ZW1wQ29kZVBvaW50ID0gKGZpcnN0Qnl0ZSAmIDB4MUYpIDw8IDB4NiB8IChzZWNvbmRCeXRlICYgMHgzRilcbiAgICAgICAgICAgIGlmICh0ZW1wQ29kZVBvaW50ID4gMHg3Rikge1xuICAgICAgICAgICAgICBjb2RlUG9pbnQgPSB0ZW1wQ29kZVBvaW50XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgMzpcbiAgICAgICAgICBzZWNvbmRCeXRlID0gYnVmW2kgKyAxXVxuICAgICAgICAgIHRoaXJkQnl0ZSA9IGJ1ZltpICsgMl1cbiAgICAgICAgICBpZiAoKHNlY29uZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCAmJiAodGhpcmRCeXRlICYgMHhDMCkgPT09IDB4ODApIHtcbiAgICAgICAgICAgIHRlbXBDb2RlUG9pbnQgPSAoZmlyc3RCeXRlICYgMHhGKSA8PCAweEMgfCAoc2Vjb25kQnl0ZSAmIDB4M0YpIDw8IDB4NiB8ICh0aGlyZEJ5dGUgJiAweDNGKVxuICAgICAgICAgICAgaWYgKHRlbXBDb2RlUG9pbnQgPiAweDdGRiAmJiAodGVtcENvZGVQb2ludCA8IDB4RDgwMCB8fCB0ZW1wQ29kZVBvaW50ID4gMHhERkZGKSkge1xuICAgICAgICAgICAgICBjb2RlUG9pbnQgPSB0ZW1wQ29kZVBvaW50XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgNDpcbiAgICAgICAgICBzZWNvbmRCeXRlID0gYnVmW2kgKyAxXVxuICAgICAgICAgIHRoaXJkQnl0ZSA9IGJ1ZltpICsgMl1cbiAgICAgICAgICBmb3VydGhCeXRlID0gYnVmW2kgKyAzXVxuICAgICAgICAgIGlmICgoc2Vjb25kQnl0ZSAmIDB4QzApID09PSAweDgwICYmICh0aGlyZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCAmJiAoZm91cnRoQnl0ZSAmIDB4QzApID09PSAweDgwKSB7XG4gICAgICAgICAgICB0ZW1wQ29kZVBvaW50ID0gKGZpcnN0Qnl0ZSAmIDB4RikgPDwgMHgxMiB8IChzZWNvbmRCeXRlICYgMHgzRikgPDwgMHhDIHwgKHRoaXJkQnl0ZSAmIDB4M0YpIDw8IDB4NiB8IChmb3VydGhCeXRlICYgMHgzRilcbiAgICAgICAgICAgIGlmICh0ZW1wQ29kZVBvaW50ID4gMHhGRkZGICYmIHRlbXBDb2RlUG9pbnQgPCAweDExMDAwMCkge1xuICAgICAgICAgICAgICBjb2RlUG9pbnQgPSB0ZW1wQ29kZVBvaW50XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChjb2RlUG9pbnQgPT09IG51bGwpIHtcbiAgICAgIC8vIHdlIGRpZCBub3QgZ2VuZXJhdGUgYSB2YWxpZCBjb2RlUG9pbnQgc28gaW5zZXJ0IGFcbiAgICAgIC8vIHJlcGxhY2VtZW50IGNoYXIgKFUrRkZGRCkgYW5kIGFkdmFuY2Ugb25seSAxIGJ5dGVcbiAgICAgIGNvZGVQb2ludCA9IDB4RkZGRFxuICAgICAgYnl0ZXNQZXJTZXF1ZW5jZSA9IDFcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA+IDB4RkZGRikge1xuICAgICAgLy8gZW5jb2RlIHRvIHV0ZjE2IChzdXJyb2dhdGUgcGFpciBkYW5jZSlcbiAgICAgIGNvZGVQb2ludCAtPSAweDEwMDAwXG4gICAgICByZXMucHVzaChjb2RlUG9pbnQgPj4+IDEwICYgMHgzRkYgfCAweEQ4MDApXG4gICAgICBjb2RlUG9pbnQgPSAweERDMDAgfCBjb2RlUG9pbnQgJiAweDNGRlxuICAgIH1cblxuICAgIHJlcy5wdXNoKGNvZGVQb2ludClcbiAgICBpICs9IGJ5dGVzUGVyU2VxdWVuY2VcbiAgfVxuXG4gIHJldHVybiBkZWNvZGVDb2RlUG9pbnRzQXJyYXkocmVzKVxufVxuXG4vLyBCYXNlZCBvbiBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8yMjc0NzI3Mi82ODA3NDIsIHRoZSBicm93c2VyIHdpdGhcbi8vIHRoZSBsb3dlc3QgbGltaXQgaXMgQ2hyb21lLCB3aXRoIDB4MTAwMDAgYXJncy5cbi8vIFdlIGdvIDEgbWFnbml0dWRlIGxlc3MsIGZvciBzYWZldHlcbnZhciBNQVhfQVJHVU1FTlRTX0xFTkdUSCA9IDB4MTAwMFxuXG5mdW5jdGlvbiBkZWNvZGVDb2RlUG9pbnRzQXJyYXkgKGNvZGVQb2ludHMpIHtcbiAgdmFyIGxlbiA9IGNvZGVQb2ludHMubGVuZ3RoXG4gIGlmIChsZW4gPD0gTUFYX0FSR1VNRU5UU19MRU5HVEgpIHtcbiAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShTdHJpbmcsIGNvZGVQb2ludHMpIC8vIGF2b2lkIGV4dHJhIHNsaWNlKClcbiAgfVxuXG4gIC8vIERlY29kZSBpbiBjaHVua3MgdG8gYXZvaWQgXCJjYWxsIHN0YWNrIHNpemUgZXhjZWVkZWRcIi5cbiAgdmFyIHJlcyA9ICcnXG4gIHZhciBpID0gMFxuICB3aGlsZSAoaSA8IGxlbikge1xuICAgIHJlcyArPSBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KFxuICAgICAgU3RyaW5nLFxuICAgICAgY29kZVBvaW50cy5zbGljZShpLCBpICs9IE1BWF9BUkdVTUVOVFNfTEVOR1RIKVxuICAgIClcbiAgfVxuICByZXR1cm4gcmVzXG59XG5cbmZ1bmN0aW9uIGFzY2lpU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmV0ID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgKytpKSB7XG4gICAgcmV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldICYgMHg3RilcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIGxhdGluMVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJldCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7ICsraSkge1xuICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSlcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIGhleFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcblxuICBpZiAoIXN0YXJ0IHx8IHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIGlmICghZW5kIHx8IGVuZCA8IDAgfHwgZW5kID4gbGVuKSBlbmQgPSBsZW5cblxuICB2YXIgb3V0ID0gJydcbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyArK2kpIHtcbiAgICBvdXQgKz0gdG9IZXgoYnVmW2ldKVxuICB9XG4gIHJldHVybiBvdXRcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGJ5dGVzID0gYnVmLnNsaWNlKHN0YXJ0LCBlbmQpXG4gIHZhciByZXMgPSAnJ1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGJ5dGVzLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgcmVzICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnl0ZXNbaV0gKyAoYnl0ZXNbaSArIDFdICogMjU2KSlcbiAgfVxuICByZXR1cm4gcmVzXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuc2xpY2UgPSBmdW5jdGlvbiBzbGljZSAoc3RhcnQsIGVuZCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgc3RhcnQgPSB+fnN0YXJ0XG4gIGVuZCA9IGVuZCA9PT0gdW5kZWZpbmVkID8gbGVuIDogfn5lbmRcblxuICBpZiAoc3RhcnQgPCAwKSB7XG4gICAgc3RhcnQgKz0gbGVuXG4gICAgaWYgKHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIH0gZWxzZSBpZiAoc3RhcnQgPiBsZW4pIHtcbiAgICBzdGFydCA9IGxlblxuICB9XG5cbiAgaWYgKGVuZCA8IDApIHtcbiAgICBlbmQgKz0gbGVuXG4gICAgaWYgKGVuZCA8IDApIGVuZCA9IDBcbiAgfSBlbHNlIGlmIChlbmQgPiBsZW4pIHtcbiAgICBlbmQgPSBsZW5cbiAgfVxuXG4gIGlmIChlbmQgPCBzdGFydCkgZW5kID0gc3RhcnRcblxuICB2YXIgbmV3QnVmID0gdGhpcy5zdWJhcnJheShzdGFydCwgZW5kKVxuICAvLyBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZVxuICBuZXdCdWYuX19wcm90b19fID0gQnVmZmVyLnByb3RvdHlwZVxuICByZXR1cm4gbmV3QnVmXG59XG5cbi8qXG4gKiBOZWVkIHRvIG1ha2Ugc3VyZSB0aGF0IGJ1ZmZlciBpc24ndCB0cnlpbmcgdG8gd3JpdGUgb3V0IG9mIGJvdW5kcy5cbiAqL1xuZnVuY3Rpb24gY2hlY2tPZmZzZXQgKG9mZnNldCwgZXh0LCBsZW5ndGgpIHtcbiAgaWYgKChvZmZzZXQgJSAxKSAhPT0gMCB8fCBvZmZzZXQgPCAwKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignb2Zmc2V0IGlzIG5vdCB1aW50JylcbiAgaWYgKG9mZnNldCArIGV4dCA+IGxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1RyeWluZyB0byBhY2Nlc3MgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50TEUgPSBmdW5jdGlvbiByZWFkVUludExFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldF1cbiAgdmFyIG11bCA9IDFcbiAgdmFyIGkgPSAwXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgaV0gKiBtdWxcbiAgfVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludEJFID0gZnVuY3Rpb24gcmVhZFVJbnRCRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG4gIH1cblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAtLWJ5dGVMZW5ndGhdXG4gIHZhciBtdWwgPSAxXG4gIHdoaWxlIChieXRlTGVuZ3RoID4gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIC0tYnl0ZUxlbmd0aF0gKiBtdWxcbiAgfVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDggPSBmdW5jdGlvbiByZWFkVUludDggKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMSwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiB0aGlzW29mZnNldF1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2TEUgPSBmdW5jdGlvbiByZWFkVUludDE2TEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiB0aGlzW29mZnNldF0gfCAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZCRSA9IGZ1bmN0aW9uIHJlYWRVSW50MTZCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuICh0aGlzW29mZnNldF0gPDwgOCkgfCB0aGlzW29mZnNldCArIDFdXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQzMkxFID0gZnVuY3Rpb24gcmVhZFVJbnQzMkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAoKHRoaXNbb2Zmc2V0XSkgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOCkgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgMTYpKSArXG4gICAgICAodGhpc1tvZmZzZXQgKyAzXSAqIDB4MTAwMDAwMClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyQkUgPSBmdW5jdGlvbiByZWFkVUludDMyQkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0gKiAweDEwMDAwMDApICtcbiAgICAoKHRoaXNbb2Zmc2V0ICsgMV0gPDwgMTYpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCA4KSB8XG4gICAgdGhpc1tvZmZzZXQgKyAzXSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50TEUgPSBmdW5jdGlvbiByZWFkSW50TEUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XVxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyBpXSAqIG11bFxuICB9XG4gIG11bCAqPSAweDgwXG5cbiAgaWYgKHZhbCA+PSBtdWwpIHZhbCAtPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aClcblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludEJFID0gZnVuY3Rpb24gcmVhZEludEJFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuXG4gIHZhciBpID0gYnl0ZUxlbmd0aFxuICB2YXIgbXVsID0gMVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAtLWldXG4gIHdoaWxlIChpID4gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIC0taV0gKiBtdWxcbiAgfVxuICBtdWwgKj0gMHg4MFxuXG4gIGlmICh2YWwgPj0gbXVsKSB2YWwgLT0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpXG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQ4ID0gZnVuY3Rpb24gcmVhZEludDggKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMSwgdGhpcy5sZW5ndGgpXG4gIGlmICghKHRoaXNbb2Zmc2V0XSAmIDB4ODApKSByZXR1cm4gKHRoaXNbb2Zmc2V0XSlcbiAgcmV0dXJuICgoMHhmZiAtIHRoaXNbb2Zmc2V0XSArIDEpICogLTEpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDE2TEUgPSBmdW5jdGlvbiByZWFkSW50MTZMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XSB8ICh0aGlzW29mZnNldCArIDFdIDw8IDgpXG4gIHJldHVybiAodmFsICYgMHg4MDAwKSA/IHZhbCB8IDB4RkZGRjAwMDAgOiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZCRSA9IGZ1bmN0aW9uIHJlYWRJbnQxNkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAxXSB8ICh0aGlzW29mZnNldF0gPDwgOClcbiAgcmV0dXJuICh2YWwgJiAweDgwMDApID8gdmFsIHwgMHhGRkZGMDAwMCA6IHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQzMkxFID0gZnVuY3Rpb24gcmVhZEludDMyTEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0pIHxcbiAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgMTYpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAzXSA8PCAyNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MzJCRSA9IGZ1bmN0aW9uIHJlYWRJbnQzMkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdIDw8IDI0KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgMTYpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCA4KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgM10pXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0TEUgPSBmdW5jdGlvbiByZWFkRmxvYXRMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIHRydWUsIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdEJFID0gZnVuY3Rpb24gcmVhZEZsb2F0QkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCBmYWxzZSwgMjMsIDQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUxFID0gZnVuY3Rpb24gcmVhZERvdWJsZUxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDgsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgdHJ1ZSwgNTIsIDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUJFID0gZnVuY3Rpb24gcmVhZERvdWJsZUJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDgsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgZmFsc2UsIDUyLCA4KVxufVxuXG5mdW5jdGlvbiBjaGVja0ludCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBleHQsIG1heCwgbWluKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGJ1ZikpIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wiYnVmZmVyXCIgYXJndW1lbnQgbXVzdCBiZSBhIEJ1ZmZlciBpbnN0YW5jZScpXG4gIGlmICh2YWx1ZSA+IG1heCB8fCB2YWx1ZSA8IG1pbikgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1widmFsdWVcIiBhcmd1bWVudCBpcyBvdXQgb2YgYm91bmRzJylcbiAgaWYgKG9mZnNldCArIGV4dCA+IGJ1Zi5sZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbmRleCBvdXQgb2YgcmFuZ2UnKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludExFID0gZnVuY3Rpb24gd3JpdGVVSW50TEUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgdmFyIG1heEJ5dGVzID0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpIC0gMVxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG1heEJ5dGVzLCAwKVxuICB9XG5cbiAgdmFyIG11bCA9IDFcbiAgdmFyIGkgPSAwXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAodmFsdWUgLyBtdWwpICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnRCRSA9IGZ1bmN0aW9uIHdyaXRlVUludEJFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBtYXhCeXRlcyA9IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKSAtIDFcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBtYXhCeXRlcywgMClcbiAgfVxuXG4gIHZhciBpID0gYnl0ZUxlbmd0aCAtIDFcbiAgdmFyIG11bCA9IDFcbiAgdGhpc1tvZmZzZXQgKyBpXSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoLS1pID49IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB0aGlzW29mZnNldCArIGldID0gKHZhbHVlIC8gbXVsKSAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50OCA9IGZ1bmN0aW9uIHdyaXRlVUludDggKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAxLCAweGZmLCAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgMVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDE2TEUgPSBmdW5jdGlvbiB3cml0ZVVJbnQxNkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHhmZmZmLCAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDE2QkUgPSBmdW5jdGlvbiB3cml0ZVVJbnQxNkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHhmZmZmLCAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDgpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyTEUgPSBmdW5jdGlvbiB3cml0ZVVJbnQzMkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHhmZmZmZmZmZiwgMClcbiAgdGhpc1tvZmZzZXQgKyAzXSA9ICh2YWx1ZSA+Pj4gMjQpXG4gIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDE2KVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyQkUgPSBmdW5jdGlvbiB3cml0ZVVJbnQzMkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHhmZmZmZmZmZiwgMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiAyNClcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDgpXG4gIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50TEUgPSBmdW5jdGlvbiB3cml0ZUludExFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBsaW1pdCA9IE1hdGgucG93KDIsICg4ICogYnl0ZUxlbmd0aCkgLSAxKVxuXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbGltaXQgLSAxLCAtbGltaXQpXG4gIH1cblxuICB2YXIgaSA9IDBcbiAgdmFyIG11bCA9IDFcbiAgdmFyIHN1YiA9IDBcbiAgdGhpc1tvZmZzZXRdID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgaWYgKHZhbHVlIDwgMCAmJiBzdWIgPT09IDAgJiYgdGhpc1tvZmZzZXQgKyBpIC0gMV0gIT09IDApIHtcbiAgICAgIHN1YiA9IDFcbiAgICB9XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICgodmFsdWUgLyBtdWwpID4+IDApIC0gc3ViICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludEJFID0gZnVuY3Rpb24gd3JpdGVJbnRCRSAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICB2YXIgbGltaXQgPSBNYXRoLnBvdygyLCAoOCAqIGJ5dGVMZW5ndGgpIC0gMSlcblxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIGxpbWl0IC0gMSwgLWxpbWl0KVxuICB9XG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoIC0gMVxuICB2YXIgbXVsID0gMVxuICB2YXIgc3ViID0gMFxuICB0aGlzW29mZnNldCArIGldID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgtLWkgPj0gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIGlmICh2YWx1ZSA8IDAgJiYgc3ViID09PSAwICYmIHRoaXNbb2Zmc2V0ICsgaSArIDFdICE9PSAwKSB7XG4gICAgICBzdWIgPSAxXG4gICAgfVxuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAoKHZhbHVlIC8gbXVsKSA+PiAwKSAtIHN1YiAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQ4ID0gZnVuY3Rpb24gd3JpdGVJbnQ4ICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMSwgMHg3ZiwgLTB4ODApXG4gIGlmICh2YWx1ZSA8IDApIHZhbHVlID0gMHhmZiArIHZhbHVlICsgMVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgMVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZMRSA9IGZ1bmN0aW9uIHdyaXRlSW50MTZMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4N2ZmZiwgLTB4ODAwMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDE2QkUgPSBmdW5jdGlvbiB3cml0ZUludDE2QkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweDdmZmYsIC0weDgwMDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gOClcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQzMkxFID0gZnVuY3Rpb24gd3JpdGVJbnQzMkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHg3ZmZmZmZmZiwgLTB4ODAwMDAwMDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDE2KVxuICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlID4+PiAyNClcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyQkUgPSBmdW5jdGlvbiB3cml0ZUludDMyQkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweDdmZmZmZmZmLCAtMHg4MDAwMDAwMClcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmZmZmZmZmICsgdmFsdWUgKyAxXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gMjQpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDE2KVxuICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiA4KVxuICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuZnVuY3Rpb24gY2hlY2tJRUVFNzU0IChidWYsIHZhbHVlLCBvZmZzZXQsIGV4dCwgbWF4LCBtaW4pIHtcbiAgaWYgKG9mZnNldCArIGV4dCA+IGJ1Zi5sZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbmRleCBvdXQgb2YgcmFuZ2UnKVxuICBpZiAob2Zmc2V0IDwgMCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0luZGV4IG91dCBvZiByYW5nZScpXG59XG5cbmZ1bmN0aW9uIHdyaXRlRmxvYXQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrSUVFRTc1NChidWYsIHZhbHVlLCBvZmZzZXQsIDQsIDMuNDAyODIzNDY2Mzg1Mjg4NmUrMzgsIC0zLjQwMjgyMzQ2NjM4NTI4ODZlKzM4KVxuICB9XG4gIGllZWU3NTQud3JpdGUoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDIzLCA0KVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRMRSA9IGZ1bmN0aW9uIHdyaXRlRmxvYXRMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRmxvYXQodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdEJFID0gZnVuY3Rpb24gd3JpdGVGbG9hdEJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVGbG9hdCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIHdyaXRlRG91YmxlIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBjaGVja0lFRUU3NTQoYnVmLCB2YWx1ZSwgb2Zmc2V0LCA4LCAxLjc5NzY5MzEzNDg2MjMxNTdFKzMwOCwgLTEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4KVxuICB9XG4gIGllZWU3NTQud3JpdGUoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDUyLCA4KVxuICByZXR1cm4gb2Zmc2V0ICsgOFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRG91YmxlTEUgPSBmdW5jdGlvbiB3cml0ZURvdWJsZUxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVEb3VibGUodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVEb3VibGVCRSA9IGZ1bmN0aW9uIHdyaXRlRG91YmxlQkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbi8vIGNvcHkodGFyZ2V0QnVmZmVyLCB0YXJnZXRTdGFydD0wLCBzb3VyY2VTdGFydD0wLCBzb3VyY2VFbmQ9YnVmZmVyLmxlbmd0aClcbkJ1ZmZlci5wcm90b3R5cGUuY29weSA9IGZ1bmN0aW9uIGNvcHkgKHRhcmdldCwgdGFyZ2V0U3RhcnQsIHN0YXJ0LCBlbmQpIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIodGFyZ2V0KSkgdGhyb3cgbmV3IFR5cGVFcnJvcignYXJndW1lbnQgc2hvdWxkIGJlIGEgQnVmZmVyJylcbiAgaWYgKCFzdGFydCkgc3RhcnQgPSAwXG4gIGlmICghZW5kICYmIGVuZCAhPT0gMCkgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKHRhcmdldFN0YXJ0ID49IHRhcmdldC5sZW5ndGgpIHRhcmdldFN0YXJ0ID0gdGFyZ2V0Lmxlbmd0aFxuICBpZiAoIXRhcmdldFN0YXJ0KSB0YXJnZXRTdGFydCA9IDBcbiAgaWYgKGVuZCA+IDAgJiYgZW5kIDwgc3RhcnQpIGVuZCA9IHN0YXJ0XG5cbiAgLy8gQ29weSAwIGJ5dGVzOyB3ZSdyZSBkb25lXG4gIGlmIChlbmQgPT09IHN0YXJ0KSByZXR1cm4gMFxuICBpZiAodGFyZ2V0Lmxlbmd0aCA9PT0gMCB8fCB0aGlzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIDBcblxuICAvLyBGYXRhbCBlcnJvciBjb25kaXRpb25zXG4gIGlmICh0YXJnZXRTdGFydCA8IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcigndGFyZ2V0U3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIH1cbiAgaWYgKHN0YXJ0IDwgMCB8fCBzdGFydCA+PSB0aGlzLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0luZGV4IG91dCBvZiByYW5nZScpXG4gIGlmIChlbmQgPCAwKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignc291cmNlRW5kIG91dCBvZiBib3VuZHMnKVxuXG4gIC8vIEFyZSB3ZSBvb2I/XG4gIGlmIChlbmQgPiB0aGlzLmxlbmd0aCkgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKHRhcmdldC5sZW5ndGggLSB0YXJnZXRTdGFydCA8IGVuZCAtIHN0YXJ0KSB7XG4gICAgZW5kID0gdGFyZ2V0Lmxlbmd0aCAtIHRhcmdldFN0YXJ0ICsgc3RhcnRcbiAgfVxuXG4gIHZhciBsZW4gPSBlbmQgLSBzdGFydFxuXG4gIGlmICh0aGlzID09PSB0YXJnZXQgJiYgdHlwZW9mIFVpbnQ4QXJyYXkucHJvdG90eXBlLmNvcHlXaXRoaW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAvLyBVc2UgYnVpbHQtaW4gd2hlbiBhdmFpbGFibGUsIG1pc3NpbmcgZnJvbSBJRTExXG4gICAgdGhpcy5jb3B5V2l0aGluKHRhcmdldFN0YXJ0LCBzdGFydCwgZW5kKVxuICB9IGVsc2UgaWYgKHRoaXMgPT09IHRhcmdldCAmJiBzdGFydCA8IHRhcmdldFN0YXJ0ICYmIHRhcmdldFN0YXJ0IDwgZW5kKSB7XG4gICAgLy8gZGVzY2VuZGluZyBjb3B5IGZyb20gZW5kXG4gICAgZm9yICh2YXIgaSA9IGxlbiAtIDE7IGkgPj0gMDsgLS1pKSB7XG4gICAgICB0YXJnZXRbaSArIHRhcmdldFN0YXJ0XSA9IHRoaXNbaSArIHN0YXJ0XVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBVaW50OEFycmF5LnByb3RvdHlwZS5zZXQuY2FsbChcbiAgICAgIHRhcmdldCxcbiAgICAgIHRoaXMuc3ViYXJyYXkoc3RhcnQsIGVuZCksXG4gICAgICB0YXJnZXRTdGFydFxuICAgIClcbiAgfVxuXG4gIHJldHVybiBsZW5cbn1cblxuLy8gVXNhZ2U6XG4vLyAgICBidWZmZXIuZmlsbChudW1iZXJbLCBvZmZzZXRbLCBlbmRdXSlcbi8vICAgIGJ1ZmZlci5maWxsKGJ1ZmZlclssIG9mZnNldFssIGVuZF1dKVxuLy8gICAgYnVmZmVyLmZpbGwoc3RyaW5nWywgb2Zmc2V0WywgZW5kXV1bLCBlbmNvZGluZ10pXG5CdWZmZXIucHJvdG90eXBlLmZpbGwgPSBmdW5jdGlvbiBmaWxsICh2YWwsIHN0YXJ0LCBlbmQsIGVuY29kaW5nKSB7XG4gIC8vIEhhbmRsZSBzdHJpbmcgY2FzZXM6XG4gIGlmICh0eXBlb2YgdmFsID09PSAnc3RyaW5nJykge1xuICAgIGlmICh0eXBlb2Ygc3RhcnQgPT09ICdzdHJpbmcnKSB7XG4gICAgICBlbmNvZGluZyA9IHN0YXJ0XG4gICAgICBzdGFydCA9IDBcbiAgICAgIGVuZCA9IHRoaXMubGVuZ3RoXG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZW5kID09PSAnc3RyaW5nJykge1xuICAgICAgZW5jb2RpbmcgPSBlbmRcbiAgICAgIGVuZCA9IHRoaXMubGVuZ3RoXG4gICAgfVxuICAgIGlmIChlbmNvZGluZyAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiBlbmNvZGluZyAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2VuY29kaW5nIG11c3QgYmUgYSBzdHJpbmcnKVxuICAgIH1cbiAgICBpZiAodHlwZW9mIGVuY29kaW5nID09PSAnc3RyaW5nJyAmJiAhQnVmZmVyLmlzRW5jb2RpbmcoZW5jb2RpbmcpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gICAgfVxuICAgIGlmICh2YWwubGVuZ3RoID09PSAxKSB7XG4gICAgICB2YXIgY29kZSA9IHZhbC5jaGFyQ29kZUF0KDApXG4gICAgICBpZiAoKGVuY29kaW5nID09PSAndXRmOCcgJiYgY29kZSA8IDEyOCkgfHxcbiAgICAgICAgICBlbmNvZGluZyA9PT0gJ2xhdGluMScpIHtcbiAgICAgICAgLy8gRmFzdCBwYXRoOiBJZiBgdmFsYCBmaXRzIGludG8gYSBzaW5nbGUgYnl0ZSwgdXNlIHRoYXQgbnVtZXJpYyB2YWx1ZS5cbiAgICAgICAgdmFsID0gY29kZVxuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIGlmICh0eXBlb2YgdmFsID09PSAnbnVtYmVyJykge1xuICAgIHZhbCA9IHZhbCAmIDI1NVxuICB9XG5cbiAgLy8gSW52YWxpZCByYW5nZXMgYXJlIG5vdCBzZXQgdG8gYSBkZWZhdWx0LCBzbyBjYW4gcmFuZ2UgY2hlY2sgZWFybHkuXG4gIGlmIChzdGFydCA8IDAgfHwgdGhpcy5sZW5ndGggPCBzdGFydCB8fCB0aGlzLmxlbmd0aCA8IGVuZCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdPdXQgb2YgcmFuZ2UgaW5kZXgnKVxuICB9XG5cbiAgaWYgKGVuZCA8PSBzdGFydCkge1xuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBzdGFydCA9IHN0YXJ0ID4+PiAwXG4gIGVuZCA9IGVuZCA9PT0gdW5kZWZpbmVkID8gdGhpcy5sZW5ndGggOiBlbmQgPj4+IDBcblxuICBpZiAoIXZhbCkgdmFsID0gMFxuXG4gIHZhciBpXG4gIGlmICh0eXBlb2YgdmFsID09PSAnbnVtYmVyJykge1xuICAgIGZvciAoaSA9IHN0YXJ0OyBpIDwgZW5kOyArK2kpIHtcbiAgICAgIHRoaXNbaV0gPSB2YWxcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdmFyIGJ5dGVzID0gQnVmZmVyLmlzQnVmZmVyKHZhbClcbiAgICAgID8gdmFsXG4gICAgICA6IEJ1ZmZlci5mcm9tKHZhbCwgZW5jb2RpbmcpXG4gICAgdmFyIGxlbiA9IGJ5dGVzLmxlbmd0aFxuICAgIGlmIChsZW4gPT09IDApIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSB2YWx1ZSBcIicgKyB2YWwgK1xuICAgICAgICAnXCIgaXMgaW52YWxpZCBmb3IgYXJndW1lbnQgXCJ2YWx1ZVwiJylcbiAgICB9XG4gICAgZm9yIChpID0gMDsgaSA8IGVuZCAtIHN0YXJ0OyArK2kpIHtcbiAgICAgIHRoaXNbaSArIHN0YXJ0XSA9IGJ5dGVzW2kgJSBsZW5dXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXNcbn1cblxuLy8gSEVMUEVSIEZVTkNUSU9OU1xuLy8gPT09PT09PT09PT09PT09PVxuXG52YXIgSU5WQUxJRF9CQVNFNjRfUkUgPSAvW14rLzAtOUEtWmEtei1fXS9nXG5cbmZ1bmN0aW9uIGJhc2U2NGNsZWFuIChzdHIpIHtcbiAgLy8gTm9kZSB0YWtlcyBlcXVhbCBzaWducyBhcyBlbmQgb2YgdGhlIEJhc2U2NCBlbmNvZGluZ1xuICBzdHIgPSBzdHIuc3BsaXQoJz0nKVswXVxuICAvLyBOb2RlIHN0cmlwcyBvdXQgaW52YWxpZCBjaGFyYWN0ZXJzIGxpa2UgXFxuIGFuZCBcXHQgZnJvbSB0aGUgc3RyaW5nLCBiYXNlNjQtanMgZG9lcyBub3RcbiAgc3RyID0gc3RyLnRyaW0oKS5yZXBsYWNlKElOVkFMSURfQkFTRTY0X1JFLCAnJylcbiAgLy8gTm9kZSBjb252ZXJ0cyBzdHJpbmdzIHdpdGggbGVuZ3RoIDwgMiB0byAnJ1xuICBpZiAoc3RyLmxlbmd0aCA8IDIpIHJldHVybiAnJ1xuICAvLyBOb2RlIGFsbG93cyBmb3Igbm9uLXBhZGRlZCBiYXNlNjQgc3RyaW5ncyAobWlzc2luZyB0cmFpbGluZyA9PT0pLCBiYXNlNjQtanMgZG9lcyBub3RcbiAgd2hpbGUgKHN0ci5sZW5ndGggJSA0ICE9PSAwKSB7XG4gICAgc3RyID0gc3RyICsgJz0nXG4gIH1cbiAgcmV0dXJuIHN0clxufVxuXG5mdW5jdGlvbiB0b0hleCAobikge1xuICBpZiAobiA8IDE2KSByZXR1cm4gJzAnICsgbi50b1N0cmluZygxNilcbiAgcmV0dXJuIG4udG9TdHJpbmcoMTYpXG59XG5cbmZ1bmN0aW9uIHV0ZjhUb0J5dGVzIChzdHJpbmcsIHVuaXRzKSB7XG4gIHVuaXRzID0gdW5pdHMgfHwgSW5maW5pdHlcbiAgdmFyIGNvZGVQb2ludFxuICB2YXIgbGVuZ3RoID0gc3RyaW5nLmxlbmd0aFxuICB2YXIgbGVhZFN1cnJvZ2F0ZSA9IG51bGxcbiAgdmFyIGJ5dGVzID0gW11cblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgKytpKSB7XG4gICAgY29kZVBvaW50ID0gc3RyaW5nLmNoYXJDb2RlQXQoaSlcblxuICAgIC8vIGlzIHN1cnJvZ2F0ZSBjb21wb25lbnRcbiAgICBpZiAoY29kZVBvaW50ID4gMHhEN0ZGICYmIGNvZGVQb2ludCA8IDB4RTAwMCkge1xuICAgICAgLy8gbGFzdCBjaGFyIHdhcyBhIGxlYWRcbiAgICAgIGlmICghbGVhZFN1cnJvZ2F0ZSkge1xuICAgICAgICAvLyBubyBsZWFkIHlldFxuICAgICAgICBpZiAoY29kZVBvaW50ID4gMHhEQkZGKSB7XG4gICAgICAgICAgLy8gdW5leHBlY3RlZCB0cmFpbFxuICAgICAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH0gZWxzZSBpZiAoaSArIDEgPT09IGxlbmd0aCkge1xuICAgICAgICAgIC8vIHVucGFpcmVkIGxlYWRcbiAgICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gdmFsaWQgbGVhZFxuICAgICAgICBsZWFkU3Vycm9nYXRlID0gY29kZVBvaW50XG5cbiAgICAgICAgY29udGludWVcbiAgICAgIH1cblxuICAgICAgLy8gMiBsZWFkcyBpbiBhIHJvd1xuICAgICAgaWYgKGNvZGVQb2ludCA8IDB4REMwMCkge1xuICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgbGVhZFN1cnJvZ2F0ZSA9IGNvZGVQb2ludFxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICAvLyB2YWxpZCBzdXJyb2dhdGUgcGFpclxuICAgICAgY29kZVBvaW50ID0gKGxlYWRTdXJyb2dhdGUgLSAweEQ4MDAgPDwgMTAgfCBjb2RlUG9pbnQgLSAweERDMDApICsgMHgxMDAwMFxuICAgIH0gZWxzZSBpZiAobGVhZFN1cnJvZ2F0ZSkge1xuICAgICAgLy8gdmFsaWQgYm1wIGNoYXIsIGJ1dCBsYXN0IGNoYXIgd2FzIGEgbGVhZFxuICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgfVxuXG4gICAgbGVhZFN1cnJvZ2F0ZSA9IG51bGxcblxuICAgIC8vIGVuY29kZSB1dGY4XG4gICAgaWYgKGNvZGVQb2ludCA8IDB4ODApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMSkgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChjb2RlUG9pbnQpXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDgwMCkge1xuICAgICAgaWYgKCh1bml0cyAtPSAyKSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2IHwgMHhDMCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4MTAwMDApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMykgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChcbiAgICAgICAgY29kZVBvaW50ID4+IDB4QyB8IDB4RTAsXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDYgJiAweDNGIHwgMHg4MCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4MTEwMDAwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDQpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDEyIHwgMHhGMCxcbiAgICAgICAgY29kZVBvaW50ID4+IDB4QyAmIDB4M0YgfCAweDgwLFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2ICYgMHgzRiB8IDB4ODAsXG4gICAgICAgIGNvZGVQb2ludCAmIDB4M0YgfCAweDgwXG4gICAgICApXG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBjb2RlIHBvaW50JylcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYnl0ZXNcbn1cblxuZnVuY3Rpb24gYXNjaWlUb0J5dGVzIChzdHIpIHtcbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgKytpKSB7XG4gICAgLy8gTm9kZSdzIGNvZGUgc2VlbXMgdG8gYmUgZG9pbmcgdGhpcyBhbmQgbm90ICYgMHg3Ri4uXG4gICAgYnl0ZUFycmF5LnB1c2goc3RyLmNoYXJDb2RlQXQoaSkgJiAweEZGKVxuICB9XG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVRvQnl0ZXMgKHN0ciwgdW5pdHMpIHtcbiAgdmFyIGMsIGhpLCBsb1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyArK2kpIHtcbiAgICBpZiAoKHVuaXRzIC09IDIpIDwgMCkgYnJlYWtcblxuICAgIGMgPSBzdHIuY2hhckNvZGVBdChpKVxuICAgIGhpID0gYyA+PiA4XG4gICAgbG8gPSBjICUgMjU2XG4gICAgYnl0ZUFycmF5LnB1c2gobG8pXG4gICAgYnl0ZUFycmF5LnB1c2goaGkpXG4gIH1cblxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIGJhc2U2NFRvQnl0ZXMgKHN0cikge1xuICByZXR1cm4gYmFzZTY0LnRvQnl0ZUFycmF5KGJhc2U2NGNsZWFuKHN0cikpXG59XG5cbmZ1bmN0aW9uIGJsaXRCdWZmZXIgKHNyYywgZHN0LCBvZmZzZXQsIGxlbmd0aCkge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgKytpKSB7XG4gICAgaWYgKChpICsgb2Zmc2V0ID49IGRzdC5sZW5ndGgpIHx8IChpID49IHNyYy5sZW5ndGgpKSBicmVha1xuICAgIGRzdFtpICsgb2Zmc2V0XSA9IHNyY1tpXVxuICB9XG4gIHJldHVybiBpXG59XG5cbi8vIEFycmF5QnVmZmVyIG9yIFVpbnQ4QXJyYXkgb2JqZWN0cyBmcm9tIG90aGVyIGNvbnRleHRzIChpLmUuIGlmcmFtZXMpIGRvIG5vdCBwYXNzXG4vLyB0aGUgYGluc3RhbmNlb2ZgIGNoZWNrIGJ1dCB0aGV5IHNob3VsZCBiZSB0cmVhdGVkIGFzIG9mIHRoYXQgdHlwZS5cbi8vIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL2Zlcm9zcy9idWZmZXIvaXNzdWVzLzE2NlxuZnVuY3Rpb24gaXNJbnN0YW5jZSAob2JqLCB0eXBlKSB7XG4gIHJldHVybiBvYmogaW5zdGFuY2VvZiB0eXBlIHx8XG4gICAgKG9iaiAhPSBudWxsICYmIG9iai5jb25zdHJ1Y3RvciAhPSBudWxsICYmIG9iai5jb25zdHJ1Y3Rvci5uYW1lICE9IG51bGwgJiZcbiAgICAgIG9iai5jb25zdHJ1Y3Rvci5uYW1lID09PSB0eXBlLm5hbWUpXG59XG5mdW5jdGlvbiBudW1iZXJJc05hTiAob2JqKSB7XG4gIC8vIEZvciBJRTExIHN1cHBvcnRcbiAgcmV0dXJuIG9iaiAhPT0gb2JqIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tc2VsZi1jb21wYXJlXG59XG4iLCIhZnVuY3Rpb24odCxlKXtcIm9iamVjdFwiPT10eXBlb2YgZXhwb3J0cyYmXCJ1bmRlZmluZWRcIiE9dHlwZW9mIG1vZHVsZT9lKGV4cG9ydHMpOlwiZnVuY3Rpb25cIj09dHlwZW9mIGRlZmluZSYmZGVmaW5lLmFtZD9kZWZpbmUoW1wiZXhwb3J0c1wiXSxlKTplKCh0PXR8fHNlbGYpLkRBUGpzPXt9KX0odGhpcywoZnVuY3Rpb24odCl7XCJ1c2Ugc3RyaWN0XCI7XG4vKiEgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAgICBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2VcbiAgICB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS4gWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZVxuICAgIExpY2Vuc2UgYXQgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG5cbiAgICBUSElTIENPREUgSVMgUFJPVklERUQgT04gQU4gKkFTIElTKiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4gICAgS0lORCwgRUlUSEVSIEVYUFJFU1MgT1IgSU1QTElFRCwgSU5DTFVESU5HIFdJVEhPVVQgTElNSVRBVElPTiBBTlkgSU1QTElFRFxuICAgIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBUSVRMRSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UsXG4gICAgTUVSQ0hBTlRBQkxJVFkgT1IgTk9OLUlORlJJTkdFTUVOVC5cblxuICAgIFNlZSB0aGUgQXBhY2hlIFZlcnNpb24gMi4wIExpY2Vuc2UgZm9yIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9uc1xuICAgIGFuZCBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiAqL3ZhciBlPWZ1bmN0aW9uKHQscil7cmV0dXJuKGU9T2JqZWN0LnNldFByb3RvdHlwZU9mfHx7X19wcm90b19fOltdfWluc3RhbmNlb2YgQXJyYXkmJmZ1bmN0aW9uKHQsZSl7dC5fX3Byb3RvX189ZX18fGZ1bmN0aW9uKHQsZSl7Zm9yKHZhciByIGluIGUpZS5oYXNPd25Qcm9wZXJ0eShyKSYmKHRbcl09ZVtyXSl9KSh0LHIpfTtmdW5jdGlvbiByKHQscil7ZnVuY3Rpb24gbigpe3RoaXMuY29uc3RydWN0b3I9dH1lKHQsciksdC5wcm90b3R5cGU9bnVsbD09PXI/T2JqZWN0LmNyZWF0ZShyKToobi5wcm90b3R5cGU9ci5wcm90b3R5cGUsbmV3IG4pfWZ1bmN0aW9uIG4odCxlLHIsbil7cmV0dXJuIG5ldyhyfHwocj1Qcm9taXNlKSkoKGZ1bmN0aW9uKGkscyl7ZnVuY3Rpb24gbyh0KXt0cnl7YyhuLm5leHQodCkpfWNhdGNoKHQpe3ModCl9fWZ1bmN0aW9uIHUodCl7dHJ5e2Mobi50aHJvdyh0KSl9Y2F0Y2godCl7cyh0KX19ZnVuY3Rpb24gYyh0KXt2YXIgZTt0LmRvbmU/aSh0LnZhbHVlKTooZT10LnZhbHVlLGUgaW5zdGFuY2VvZiByP2U6bmV3IHIoKGZ1bmN0aW9uKHQpe3QoZSl9KSkpLnRoZW4obyx1KX1jKChuPW4uYXBwbHkodCxlfHxbXSkpLm5leHQoKSl9KSl9ZnVuY3Rpb24gaSh0LGUpe3ZhciByLG4saSxzLG89e2xhYmVsOjAsc2VudDpmdW5jdGlvbigpe2lmKDEmaVswXSl0aHJvdyBpWzFdO3JldHVybiBpWzFdfSx0cnlzOltdLG9wczpbXX07cmV0dXJuIHM9e25leHQ6dSgwKSx0aHJvdzp1KDEpLHJldHVybjp1KDIpfSxcImZ1bmN0aW9uXCI9PXR5cGVvZiBTeW1ib2wmJihzW1N5bWJvbC5pdGVyYXRvcl09ZnVuY3Rpb24oKXtyZXR1cm4gdGhpc30pLHM7ZnVuY3Rpb24gdShzKXtyZXR1cm4gZnVuY3Rpb24odSl7cmV0dXJuIGZ1bmN0aW9uKHMpe2lmKHIpdGhyb3cgbmV3IFR5cGVFcnJvcihcIkdlbmVyYXRvciBpcyBhbHJlYWR5IGV4ZWN1dGluZy5cIik7Zm9yKDtvOyl0cnl7aWYocj0xLG4mJihpPTImc1swXT9uLnJldHVybjpzWzBdP24udGhyb3d8fCgoaT1uLnJldHVybikmJmkuY2FsbChuKSwwKTpuLm5leHQpJiYhKGk9aS5jYWxsKG4sc1sxXSkpLmRvbmUpcmV0dXJuIGk7c3dpdGNoKG49MCxpJiYocz1bMiZzWzBdLGkudmFsdWVdKSxzWzBdKXtjYXNlIDA6Y2FzZSAxOmk9czticmVhaztjYXNlIDQ6cmV0dXJuIG8ubGFiZWwrKyx7dmFsdWU6c1sxXSxkb25lOiExfTtjYXNlIDU6by5sYWJlbCsrLG49c1sxXSxzPVswXTtjb250aW51ZTtjYXNlIDc6cz1vLm9wcy5wb3AoKSxvLnRyeXMucG9wKCk7Y29udGludWU7ZGVmYXVsdDppZighKGk9by50cnlzLChpPWkubGVuZ3RoPjAmJmlbaS5sZW5ndGgtMV0pfHw2IT09c1swXSYmMiE9PXNbMF0pKXtvPTA7Y29udGludWV9aWYoMz09PXNbMF0mJighaXx8c1sxXT5pWzBdJiZzWzFdPGlbM10pKXtvLmxhYmVsPXNbMV07YnJlYWt9aWYoNj09PXNbMF0mJm8ubGFiZWw8aVsxXSl7by5sYWJlbD1pWzFdLGk9czticmVha31pZihpJiZvLmxhYmVsPGlbMl0pe28ubGFiZWw9aVsyXSxvLm9wcy5wdXNoKHMpO2JyZWFrfWlbMl0mJm8ub3BzLnBvcCgpLG8udHJ5cy5wb3AoKTtjb250aW51ZX1zPWUuY2FsbCh0LG8pfWNhdGNoKHQpe3M9WzYsdF0sbj0wfWZpbmFsbHl7cj1pPTB9aWYoNSZzWzBdKXRocm93IHNbMV07cmV0dXJue3ZhbHVlOnNbMF0/c1sxXTp2b2lkIDAsZG9uZTohMH19KFtzLHVdKX19fWZ1bmN0aW9uIHMoKXt9ZnVuY3Rpb24gbygpe28uaW5pdC5jYWxsKHRoaXMpfWZ1bmN0aW9uIHUodCl7cmV0dXJuIHZvaWQgMD09PXQuX21heExpc3RlbmVycz9vLmRlZmF1bHRNYXhMaXN0ZW5lcnM6dC5fbWF4TGlzdGVuZXJzfWZ1bmN0aW9uIGModCxlLHIpe2lmKGUpdC5jYWxsKHIpO2Vsc2UgZm9yKHZhciBuPXQubGVuZ3RoLGk9dyh0LG4pLHM9MDtzPG47KytzKWlbc10uY2FsbChyKX1mdW5jdGlvbiBhKHQsZSxyLG4pe2lmKGUpdC5jYWxsKHIsbik7ZWxzZSBmb3IodmFyIGk9dC5sZW5ndGgscz13KHQsaSksbz0wO288aTsrK28pc1tvXS5jYWxsKHIsbil9ZnVuY3Rpb24gaCh0LGUscixuLGkpe2lmKGUpdC5jYWxsKHIsbixpKTtlbHNlIGZvcih2YXIgcz10Lmxlbmd0aCxvPXcodCxzKSx1PTA7dTxzOysrdSlvW3VdLmNhbGwocixuLGkpfWZ1bmN0aW9uIGYodCxlLHIsbixpLHMpe2lmKGUpdC5jYWxsKHIsbixpLHMpO2Vsc2UgZm9yKHZhciBvPXQubGVuZ3RoLHU9dyh0LG8pLGM9MDtjPG87KytjKXVbY10uY2FsbChyLG4saSxzKX1mdW5jdGlvbiBsKHQsZSxyLG4pe2lmKGUpdC5hcHBseShyLG4pO2Vsc2UgZm9yKHZhciBpPXQubGVuZ3RoLHM9dyh0LGkpLG89MDtvPGk7KytvKXNbb10uYXBwbHkocixuKX1mdW5jdGlvbiBkKHQsZSxyLG4pe3ZhciBpLG8sYyxhO2lmKFwiZnVuY3Rpb25cIiE9dHlwZW9mIHIpdGhyb3cgbmV3IFR5cGVFcnJvcignXCJsaXN0ZW5lclwiIGFyZ3VtZW50IG11c3QgYmUgYSBmdW5jdGlvbicpO2lmKChvPXQuX2V2ZW50cyk/KG8ubmV3TGlzdGVuZXImJih0LmVtaXQoXCJuZXdMaXN0ZW5lclwiLGUsci5saXN0ZW5lcj9yLmxpc3RlbmVyOnIpLG89dC5fZXZlbnRzKSxjPW9bZV0pOihvPXQuX2V2ZW50cz1uZXcgcyx0Ll9ldmVudHNDb3VudD0wKSxjKXtpZihcImZ1bmN0aW9uXCI9PXR5cGVvZiBjP2M9b1tlXT1uP1tyLGNdOltjLHJdOm4/Yy51bnNoaWZ0KHIpOmMucHVzaChyKSwhYy53YXJuZWQmJihpPXUodCkpJiZpPjAmJmMubGVuZ3RoPmkpe2Mud2FybmVkPSEwO3ZhciBoPW5ldyBFcnJvcihcIlBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgbGVhayBkZXRlY3RlZC4gXCIrYy5sZW5ndGgrXCIgXCIrZStcIiBsaXN0ZW5lcnMgYWRkZWQuIFVzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0XCIpO2gubmFtZT1cIk1heExpc3RlbmVyc0V4Y2VlZGVkV2FybmluZ1wiLGguZW1pdHRlcj10LGgudHlwZT1lLGguY291bnQ9Yy5sZW5ndGgsYT1oLFwiZnVuY3Rpb25cIj09dHlwZW9mIGNvbnNvbGUud2Fybj9jb25zb2xlLndhcm4oYSk6Y29uc29sZS5sb2coYSl9fWVsc2UgYz1vW2VdPXIsKyt0Ll9ldmVudHNDb3VudDtyZXR1cm4gdH1mdW5jdGlvbiBwKHQsZSxyKXt2YXIgbj0hMTtmdW5jdGlvbiBpKCl7dC5yZW1vdmVMaXN0ZW5lcihlLGkpLG58fChuPSEwLHIuYXBwbHkodCxhcmd1bWVudHMpKX1yZXR1cm4gaS5saXN0ZW5lcj1yLGl9ZnVuY3Rpb24gdih0KXt2YXIgZT10aGlzLl9ldmVudHM7aWYoZSl7dmFyIHI9ZVt0XTtpZihcImZ1bmN0aW9uXCI9PXR5cGVvZiByKXJldHVybiAxO2lmKHIpcmV0dXJuIHIubGVuZ3RofXJldHVybiAwfWZ1bmN0aW9uIHcodCxlKXtmb3IodmFyIHI9bmV3IEFycmF5KGUpO2UtLTspcltlXT10W2VdO3JldHVybiByfXMucHJvdG90eXBlPU9iamVjdC5jcmVhdGUobnVsbCksby5FdmVudEVtaXR0ZXI9byxvLnVzaW5nRG9tYWlucz0hMSxvLnByb3RvdHlwZS5kb21haW49dm9pZCAwLG8ucHJvdG90eXBlLl9ldmVudHM9dm9pZCAwLG8ucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnM9dm9pZCAwLG8uZGVmYXVsdE1heExpc3RlbmVycz0xMCxvLmluaXQ9ZnVuY3Rpb24oKXt0aGlzLmRvbWFpbj1udWxsLG8udXNpbmdEb21haW5zJiZ1bmRlZmluZWQuYWN0aXZlLHRoaXMuX2V2ZW50cyYmdGhpcy5fZXZlbnRzIT09T2JqZWN0LmdldFByb3RvdHlwZU9mKHRoaXMpLl9ldmVudHN8fCh0aGlzLl9ldmVudHM9bmV3IHMsdGhpcy5fZXZlbnRzQ291bnQ9MCksdGhpcy5fbWF4TGlzdGVuZXJzPXRoaXMuX21heExpc3RlbmVyc3x8dm9pZCAwfSxvLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnM9ZnVuY3Rpb24odCl7aWYoXCJudW1iZXJcIiE9dHlwZW9mIHR8fHQ8MHx8aXNOYU4odCkpdGhyb3cgbmV3IFR5cGVFcnJvcignXCJuXCIgYXJndW1lbnQgbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO3JldHVybiB0aGlzLl9tYXhMaXN0ZW5lcnM9dCx0aGlzfSxvLnByb3RvdHlwZS5nZXRNYXhMaXN0ZW5lcnM9ZnVuY3Rpb24oKXtyZXR1cm4gdSh0aGlzKX0sby5wcm90b3R5cGUuZW1pdD1mdW5jdGlvbih0KXt2YXIgZSxyLG4saSxzLG8sdSxkPVwiZXJyb3JcIj09PXQ7aWYobz10aGlzLl9ldmVudHMpZD1kJiZudWxsPT1vLmVycm9yO2Vsc2UgaWYoIWQpcmV0dXJuITE7aWYodT10aGlzLmRvbWFpbixkKXtpZihlPWFyZ3VtZW50c1sxXSwhdSl7aWYoZSBpbnN0YW5jZW9mIEVycm9yKXRocm93IGU7dmFyIHA9bmV3IEVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LiAoJytlK1wiKVwiKTt0aHJvdyBwLmNvbnRleHQ9ZSxwfXJldHVybiBlfHwoZT1uZXcgRXJyb3IoJ1VuY2F1Z2h0LCB1bnNwZWNpZmllZCBcImVycm9yXCIgZXZlbnQnKSksZS5kb21haW5FbWl0dGVyPXRoaXMsZS5kb21haW49dSxlLmRvbWFpblRocm93bj0hMSx1LmVtaXQoXCJlcnJvclwiLGUpLCExfWlmKCEocj1vW3RdKSlyZXR1cm4hMTt2YXIgdj1cImZ1bmN0aW9uXCI9PXR5cGVvZiByO3N3aXRjaChuPWFyZ3VtZW50cy5sZW5ndGgpe2Nhc2UgMTpjKHIsdix0aGlzKTticmVhaztjYXNlIDI6YShyLHYsdGhpcyxhcmd1bWVudHNbMV0pO2JyZWFrO2Nhc2UgMzpoKHIsdix0aGlzLGFyZ3VtZW50c1sxXSxhcmd1bWVudHNbMl0pO2JyZWFrO2Nhc2UgNDpmKHIsdix0aGlzLGFyZ3VtZW50c1sxXSxhcmd1bWVudHNbMl0sYXJndW1lbnRzWzNdKTticmVhaztkZWZhdWx0OmZvcihpPW5ldyBBcnJheShuLTEpLHM9MTtzPG47cysrKWlbcy0xXT1hcmd1bWVudHNbc107bChyLHYsdGhpcyxpKX1yZXR1cm4hMH0sby5wcm90b3R5cGUuYWRkTGlzdGVuZXI9ZnVuY3Rpb24odCxlKXtyZXR1cm4gZCh0aGlzLHQsZSwhMSl9LG8ucHJvdG90eXBlLm9uPW8ucHJvdG90eXBlLmFkZExpc3RlbmVyLG8ucHJvdG90eXBlLnByZXBlbmRMaXN0ZW5lcj1mdW5jdGlvbih0LGUpe3JldHVybiBkKHRoaXMsdCxlLCEwKX0sby5wcm90b3R5cGUub25jZT1mdW5jdGlvbih0LGUpe2lmKFwiZnVuY3Rpb25cIiE9dHlwZW9mIGUpdGhyb3cgbmV3IFR5cGVFcnJvcignXCJsaXN0ZW5lclwiIGFyZ3VtZW50IG11c3QgYmUgYSBmdW5jdGlvbicpO3JldHVybiB0aGlzLm9uKHQscCh0aGlzLHQsZSkpLHRoaXN9LG8ucHJvdG90eXBlLnByZXBlbmRPbmNlTGlzdGVuZXI9ZnVuY3Rpb24odCxlKXtpZihcImZ1bmN0aW9uXCIhPXR5cGVvZiBlKXRocm93IG5ldyBUeXBlRXJyb3IoJ1wibGlzdGVuZXJcIiBhcmd1bWVudCBtdXN0IGJlIGEgZnVuY3Rpb24nKTtyZXR1cm4gdGhpcy5wcmVwZW5kTGlzdGVuZXIodCxwKHRoaXMsdCxlKSksdGhpc30sby5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXI9ZnVuY3Rpb24odCxlKXt2YXIgcixuLGksbyx1O2lmKFwiZnVuY3Rpb25cIiE9dHlwZW9mIGUpdGhyb3cgbmV3IFR5cGVFcnJvcignXCJsaXN0ZW5lclwiIGFyZ3VtZW50IG11c3QgYmUgYSBmdW5jdGlvbicpO2lmKCEobj10aGlzLl9ldmVudHMpKXJldHVybiB0aGlzO2lmKCEocj1uW3RdKSlyZXR1cm4gdGhpcztpZihyPT09ZXx8ci5saXN0ZW5lciYmci5saXN0ZW5lcj09PWUpMD09LS10aGlzLl9ldmVudHNDb3VudD90aGlzLl9ldmVudHM9bmV3IHM6KGRlbGV0ZSBuW3RdLG4ucmVtb3ZlTGlzdGVuZXImJnRoaXMuZW1pdChcInJlbW92ZUxpc3RlbmVyXCIsdCxyLmxpc3RlbmVyfHxlKSk7ZWxzZSBpZihcImZ1bmN0aW9uXCIhPXR5cGVvZiByKXtmb3IoaT0tMSxvPXIubGVuZ3RoO28tLSA+MDspaWYocltvXT09PWV8fHJbb10ubGlzdGVuZXImJnJbb10ubGlzdGVuZXI9PT1lKXt1PXJbb10ubGlzdGVuZXIsaT1vO2JyZWFrfWlmKGk8MClyZXR1cm4gdGhpcztpZigxPT09ci5sZW5ndGgpe2lmKHJbMF09dm9pZCAwLDA9PS0tdGhpcy5fZXZlbnRzQ291bnQpcmV0dXJuIHRoaXMuX2V2ZW50cz1uZXcgcyx0aGlzO2RlbGV0ZSBuW3RdfWVsc2UhZnVuY3Rpb24odCxlKXtmb3IodmFyIHI9ZSxuPXIrMSxpPXQubGVuZ3RoO248aTtyKz0xLG4rPTEpdFtyXT10W25dO3QucG9wKCl9KHIsaSk7bi5yZW1vdmVMaXN0ZW5lciYmdGhpcy5lbWl0KFwicmVtb3ZlTGlzdGVuZXJcIix0LHV8fGUpfXJldHVybiB0aGlzfSxvLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnM9ZnVuY3Rpb24odCl7dmFyIGUscjtpZighKHI9dGhpcy5fZXZlbnRzKSlyZXR1cm4gdGhpcztpZighci5yZW1vdmVMaXN0ZW5lcilyZXR1cm4gMD09PWFyZ3VtZW50cy5sZW5ndGg/KHRoaXMuX2V2ZW50cz1uZXcgcyx0aGlzLl9ldmVudHNDb3VudD0wKTpyW3RdJiYoMD09LS10aGlzLl9ldmVudHNDb3VudD90aGlzLl9ldmVudHM9bmV3IHM6ZGVsZXRlIHJbdF0pLHRoaXM7aWYoMD09PWFyZ3VtZW50cy5sZW5ndGgpe2Zvcih2YXIgbixpPU9iamVjdC5rZXlzKHIpLG89MDtvPGkubGVuZ3RoOysrbylcInJlbW92ZUxpc3RlbmVyXCIhPT0obj1pW29dKSYmdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMobik7cmV0dXJuIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKFwicmVtb3ZlTGlzdGVuZXJcIiksdGhpcy5fZXZlbnRzPW5ldyBzLHRoaXMuX2V2ZW50c0NvdW50PTAsdGhpc31pZihcImZ1bmN0aW9uXCI9PXR5cGVvZihlPXJbdF0pKXRoaXMucmVtb3ZlTGlzdGVuZXIodCxlKTtlbHNlIGlmKGUpZG97dGhpcy5yZW1vdmVMaXN0ZW5lcih0LGVbZS5sZW5ndGgtMV0pfXdoaWxlKGVbMF0pO3JldHVybiB0aGlzfSxvLnByb3RvdHlwZS5saXN0ZW5lcnM9ZnVuY3Rpb24odCl7dmFyIGUscj10aGlzLl9ldmVudHM7cmV0dXJuIHImJihlPXJbdF0pP1wiZnVuY3Rpb25cIj09dHlwZW9mIGU/W2UubGlzdGVuZXJ8fGVdOmZ1bmN0aW9uKHQpe2Zvcih2YXIgZT1uZXcgQXJyYXkodC5sZW5ndGgpLHI9MDtyPGUubGVuZ3RoOysrcillW3JdPXRbcl0ubGlzdGVuZXJ8fHRbcl07cmV0dXJuIGV9KGUpOltdfSxvLmxpc3RlbmVyQ291bnQ9ZnVuY3Rpb24odCxlKXtyZXR1cm5cImZ1bmN0aW9uXCI9PXR5cGVvZiB0Lmxpc3RlbmVyQ291bnQ/dC5saXN0ZW5lckNvdW50KGUpOnYuY2FsbCh0LGUpfSxvLnByb3RvdHlwZS5saXN0ZW5lckNvdW50PXYsby5wcm90b3R5cGUuZXZlbnROYW1lcz1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9ldmVudHNDb3VudD4wP1JlZmxlY3Qub3duS2V5cyh0aGlzLl9ldmVudHMpOltdfTt2YXIgeSxtPTFlNyxiPWZ1bmN0aW9uKCl7ZnVuY3Rpb24gdCgpe3RoaXMubG9ja2VkPSExfXJldHVybiB0LnByb3RvdHlwZS5sb2NrPWZ1bmN0aW9uKCl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKHQpe3N3aXRjaCh0LmxhYmVsKXtjYXNlIDA6cmV0dXJuIHRoaXMubG9ja2VkP1s0LG5ldyBQcm9taXNlKChmdW5jdGlvbih0KXtyZXR1cm4gc2V0VGltZW91dCh0LDEpfSkpXTpbMywyXTtjYXNlIDE6cmV0dXJuIHQuc2VudCgpLFszLDBdO2Nhc2UgMjpyZXR1cm4gdGhpcy5sb2NrZWQ9ITAsWzJdfX0pKX0pKX0sdC5wcm90b3R5cGUudW5sb2NrPWZ1bmN0aW9uKCl7dGhpcy5sb2NrZWQ9ITF9LHR9KCksZz1mdW5jdGlvbih0KXtmdW5jdGlvbiBlKGUscixuKXt2b2lkIDA9PT1yJiYocj0wKSx2b2lkIDA9PT1uJiYobj1tKTt2YXIgaT10LmNhbGwodGhpcyl8fHRoaXM7aS50cmFuc3BvcnQ9ZSxpLm1vZGU9cixpLmNsb2NrRnJlcXVlbmN5PW4saS5jb25uZWN0ZWQ9ITEsaS5zZW5kTXV0ZXg9bmV3IGIsaS5ibG9ja1NpemU9aS50cmFuc3BvcnQucGFja2V0U2l6ZS00LTE7dmFyIHM9aS50cmFuc3BvcnQucGFja2V0U2l6ZS0yLTE7cmV0dXJuIGkub3BlcmF0aW9uQ291bnQ9TWF0aC5mbG9vcihzLzUpLGl9cmV0dXJuIHIoZSx0KSxlLnByb3RvdHlwZS5idWZmZXJTb3VyY2VUb1VpbnQ4QXJyYXk9ZnVuY3Rpb24odCxlKXtpZighZSlyZXR1cm4gbmV3IFVpbnQ4QXJyYXkoW3RdKTt2YXIgcj12b2lkIDAhPT1lLmJ1ZmZlcj9lLmJ1ZmZlcjplLG49bmV3IFVpbnQ4QXJyYXkoci5ieXRlTGVuZ3RoKzEpO3JldHVybiBuLnNldChbdF0pLG4uc2V0KG5ldyBVaW50OEFycmF5KHIpLDEpLG59LGUucHJvdG90eXBlLnNlbGVjdFByb3RvY29sPWZ1bmN0aW9uKHQpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgZTtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihyKXtzd2l0Y2goci5sYWJlbCl7Y2FzZSAwOnJldHVybiBlPTI9PT10PzU5MTk2OjU5Mjk0LFs0LHRoaXMuc3dqU2VxdWVuY2UobmV3IFVpbnQ4QXJyYXkoWzI1NSwyNTUsMjU1LDI1NSwyNTUsMjU1LDI1NV0pKV07Y2FzZSAxOnJldHVybiByLnNlbnQoKSxbNCx0aGlzLnN3alNlcXVlbmNlKG5ldyBVaW50MTZBcnJheShbZV0pKV07Y2FzZSAyOnJldHVybiByLnNlbnQoKSxbNCx0aGlzLnN3alNlcXVlbmNlKG5ldyBVaW50OEFycmF5KFsyNTUsMjU1LDI1NSwyNTUsMjU1LDI1NSwyNTVdKSldO2Nhc2UgMzpyZXR1cm4gci5zZW50KCksWzQsdGhpcy5zd2pTZXF1ZW5jZShuZXcgVWludDhBcnJheShbMF0pKV07Y2FzZSA0OnJldHVybiByLnNlbnQoKSxbMl19fSkpfSkpfSxlLnByb3RvdHlwZS5zZW5kPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciByLG47cmV0dXJuIGkodGhpcywoZnVuY3Rpb24oaSl7c3dpdGNoKGkubGFiZWwpe2Nhc2UgMDpyZXR1cm4gcj10aGlzLmJ1ZmZlclNvdXJjZVRvVWludDhBcnJheSh0LGUpLFs0LHRoaXMuc2VuZE11dGV4LmxvY2soKV07Y2FzZSAxOmkuc2VudCgpLGkubGFiZWw9MjtjYXNlIDI6cmV0dXJuIGkudHJ5cy5wdXNoKFsyLCw1LDZdKSxbNCx0aGlzLnRyYW5zcG9ydC53cml0ZShyKV07Y2FzZSAzOnJldHVybiBpLnNlbnQoKSxbNCx0aGlzLnRyYW5zcG9ydC5yZWFkKCldO2Nhc2UgNDppZigobj1pLnNlbnQoKSkuZ2V0VWludDgoMCkhPT10KXRocm93IG5ldyBFcnJvcihcIkJhZCByZXNwb25zZSBmb3IgXCIrdCtcIiAtPiBcIituLmdldFVpbnQ4KDApKTtzd2l0Y2godCl7Y2FzZSAzOmNhc2UgODpjYXNlIDk6Y2FzZSAxMDpjYXNlIDE3OmNhc2UgMTg6Y2FzZSAxOTpjYXNlIDI5OmNhc2UgMjM6Y2FzZSAyNDpjYXNlIDI2OmNhc2UgMjE6Y2FzZSAyMjpjYXNlIDQ6aWYoMCE9PW4uZ2V0VWludDgoMSkpdGhyb3cgbmV3IEVycm9yKFwiQmFkIHN0YXR1cyBmb3IgXCIrdCtcIiAtPiBcIituLmdldFVpbnQ4KDEpKX1yZXR1cm5bMixuXTtjYXNlIDU6cmV0dXJuIHRoaXMuc2VuZE11dGV4LnVubG9jaygpLFs3XTtjYXNlIDY6cmV0dXJuWzJdfX0pKX0pKX0sZS5wcm90b3R5cGUuY2xlYXJBYm9ydD1mdW5jdGlvbih0KXtyZXR1cm4gdm9pZCAwPT09dCYmKHQ9MzApLG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKGUpe3N3aXRjaChlLmxhYmVsKXtjYXNlIDA6cmV0dXJuWzQsdGhpcy5zZW5kKDgsbmV3IFVpbnQ4QXJyYXkoWzAsdF0pKV07Y2FzZSAxOnJldHVybiBlLnNlbnQoKSxbMl19fSkpfSkpfSxlLnByb3RvdHlwZS5kYXBJbmZvPWZ1bmN0aW9uKHQpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgZSxyLG4scztyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihpKXtzd2l0Y2goaS5sYWJlbCl7Y2FzZSAwOnJldHVybiBpLnRyeXMucHVzaChbMCwyLCw0XSksWzQsdGhpcy5zZW5kKDAsbmV3IFVpbnQ4QXJyYXkoW3RdKSldO2Nhc2UgMTppZihlPWkuc2VudCgpLDA9PT0ocj1lLmdldFVpbnQ4KDEpKSlyZXR1cm5bMixcIlwiXTtzd2l0Y2godCl7Y2FzZSAyNDA6Y2FzZSAyNTQ6Y2FzZSAyNTU6Y2FzZSAyNTM6aWYoMT09PXIpcmV0dXJuWzIsZS5nZXRVaW50OCgyKV07aWYoMj09PXIpcmV0dXJuWzIsZS5nZXRVaW50MTYoMildO2lmKDQ9PT1yKXJldHVyblsyLGUuZ2V0VWludDMyKDIpXX1yZXR1cm4gbj1BcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChuZXcgVWludDhBcnJheShlLmJ1ZmZlciwyLHIpKSxbMixTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KG51bGwsbildO2Nhc2UgMjpyZXR1cm4gcz1pLnNlbnQoKSxbNCx0aGlzLmNsZWFyQWJvcnQoKV07Y2FzZSAzOnRocm93IGkuc2VudCgpLHM7Y2FzZSA0OnJldHVyblsyXX19KSl9KSl9LGUucHJvdG90eXBlLnN3alNlcXVlbmNlPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIHZvaWQgMD09PWUmJihlPTgqdC5ieXRlTGVuZ3RoKSxuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgcixuO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKGkpe3N3aXRjaChpLmxhYmVsKXtjYXNlIDA6cj10aGlzLmJ1ZmZlclNvdXJjZVRvVWludDhBcnJheShlLHQpLGkubGFiZWw9MTtjYXNlIDE6cmV0dXJuIGkudHJ5cy5wdXNoKFsxLDMsLDVdKSxbNCx0aGlzLnNlbmQoMTgscildO2Nhc2UgMjpyZXR1cm4gaS5zZW50KCksWzMsNV07Y2FzZSAzOnJldHVybiBuPWkuc2VudCgpLFs0LHRoaXMuY2xlYXJBYm9ydCgpXTtjYXNlIDQ6dGhyb3cgaS5zZW50KCksbjtjYXNlIDU6cmV0dXJuWzJdfX0pKX0pKX0sZS5wcm90b3R5cGUuc3dqQ2xvY2s9ZnVuY3Rpb24odCl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciBlO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKHIpe3N3aXRjaChyLmxhYmVsKXtjYXNlIDA6cmV0dXJuIHIudHJ5cy5wdXNoKFswLDIsLDRdKSxbNCx0aGlzLnNlbmQoMTcsbmV3IFVpbnQ4QXJyYXkoWzI1NSZ0LCg2NTI4MCZ0KT4+OCwoMTY3MTE2ODAmdCk+PjE2LCg0Mjc4MTkwMDgwJnQpPj4yNF0pKV07Y2FzZSAxOnJldHVybiByLnNlbnQoKSxbMyw0XTtjYXNlIDI6cmV0dXJuIGU9ci5zZW50KCksWzQsdGhpcy5jbGVhckFib3J0KCldO2Nhc2UgMzp0aHJvdyByLnNlbnQoKSxlO2Nhc2UgNDpyZXR1cm5bMl19fSkpfSkpfSxlLnByb3RvdHlwZS5zd2pQaW5zPWZ1bmN0aW9uKHQsZSxyKXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIG47cmV0dXJuIGkodGhpcywoZnVuY3Rpb24oaSl7c3dpdGNoKGkubGFiZWwpe2Nhc2UgMDpyZXR1cm4gaS50cnlzLnB1c2goWzAsMiwsNF0pLFs0LHRoaXMuc2VuZCgxNixuZXcgVWludDhBcnJheShbdCxlLDI1NSZyLCg2NTI4MCZyKT4+OCwoMTY3MTE2ODAmcik+PjE2LCg0Mjc4MTkwMDgwJnIpPj4yNF0pKV07Y2FzZSAxOnJldHVyblsyLGkuc2VudCgpLmdldFVpbnQ4KDEpXTtjYXNlIDI6cmV0dXJuIG49aS5zZW50KCksWzQsdGhpcy5jbGVhckFib3J0KCldO2Nhc2UgMzp0aHJvdyBpLnNlbnQoKSxuO2Nhc2UgNDpyZXR1cm5bMl19fSkpfSkpfSxlLnByb3RvdHlwZS5kYXBEZWxheT1mdW5jdGlvbih0KXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIGU7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24ocil7c3dpdGNoKHIubGFiZWwpe2Nhc2UgMDpyZXR1cm4gci50cnlzLnB1c2goWzAsMiwsNF0pLFs0LHRoaXMuc2VuZCg5LG5ldyBVaW50OEFycmF5KFsyNTUmdCwoNjUyODAmdCk+PjhdKSldO2Nhc2UgMTpyZXR1cm4gci5zZW50KCksWzMsNF07Y2FzZSAyOnJldHVybiBlPXIuc2VudCgpLFs0LHRoaXMuY2xlYXJBYm9ydCgpXTtjYXNlIDM6dGhyb3cgci5zZW50KCksZTtjYXNlIDQ6cmV0dXJuWzJdfX0pKX0pKX0sZS5wcm90b3R5cGUuY29uZmlndXJlVHJhbnNmZXI9ZnVuY3Rpb24odCxlLHIpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgbixzLG87cmV0dXJuIGkodGhpcywoZnVuY3Rpb24oaSl7c3dpdGNoKGkubGFiZWwpe2Nhc2UgMDpuPW5ldyBVaW50OEFycmF5KDUpLChzPW5ldyBEYXRhVmlldyhuLmJ1ZmZlcikpLnNldFVpbnQ4KDAsdCkscy5zZXRVaW50MTYoMSxlLCEwKSxzLnNldFVpbnQxNigzLHIsITApLGkubGFiZWw9MTtjYXNlIDE6cmV0dXJuIGkudHJ5cy5wdXNoKFsxLDMsLDVdKSxbNCx0aGlzLnNlbmQoNCxuKV07Y2FzZSAyOnJldHVybiBpLnNlbnQoKSxbMyw1XTtjYXNlIDM6cmV0dXJuIG89aS5zZW50KCksWzQsdGhpcy5jbGVhckFib3J0KCldO2Nhc2UgNDp0aHJvdyBpLnNlbnQoKSxvO2Nhc2UgNTpyZXR1cm5bMl19fSkpfSkpfSxlLnByb3RvdHlwZS5jb25uZWN0PWZ1bmN0aW9uKCl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciB0LGUscjtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihuKXtzd2l0Y2gobi5sYWJlbCl7Y2FzZSAwOnJldHVybiEwPT09dGhpcy5jb25uZWN0ZWQ/WzJdOls0LHRoaXMudHJhbnNwb3J0Lm9wZW4oKV07Y2FzZSAxOm4uc2VudCgpLG4ubGFiZWw9MjtjYXNlIDI6cmV0dXJuIG4udHJ5cy5wdXNoKFsyLDUsLDhdKSxbNCx0aGlzLnNlbmQoMTcsbmV3IFVpbnQzMkFycmF5KFt0aGlzLmNsb2NrRnJlcXVlbmN5XSkpXTtjYXNlIDM6cmV0dXJuIG4uc2VudCgpLFs0LHRoaXMuc2VuZCgyLG5ldyBVaW50OEFycmF5KFt0aGlzLm1vZGVdKSldO2Nhc2UgNDppZigwPT09KHQ9bi5zZW50KCkpLmdldFVpbnQ4KDEpfHwwIT09dGhpcy5tb2RlJiZ0LmdldFVpbnQ4KDEpIT09dGhpcy5tb2RlKXRocm93IG5ldyBFcnJvcihcIk1vZGUgbm90IGVuYWJsZWQuXCIpO3JldHVyblszLDhdO2Nhc2UgNTpyZXR1cm4gZT1uLnNlbnQoKSxbNCx0aGlzLmNsZWFyQWJvcnQoKV07Y2FzZSA2OnJldHVybiBuLnNlbnQoKSxbNCx0aGlzLnRyYW5zcG9ydC5jbG9zZSgpXTtjYXNlIDc6dGhyb3cgbi5zZW50KCksZTtjYXNlIDg6cmV0dXJuIG4udHJ5cy5wdXNoKFs4LDExLCwxM10pLFs0LHRoaXMuY29uZmlndXJlVHJhbnNmZXIoMCwxMDAsMCldO2Nhc2UgOTpyZXR1cm4gbi5zZW50KCksWzQsdGhpcy5zZWxlY3RQcm90b2NvbCgxKV07Y2FzZSAxMDpyZXR1cm4gbi5zZW50KCksWzMsMTNdO2Nhc2UgMTE6cmV0dXJuIHI9bi5zZW50KCksWzQsdGhpcy50cmFuc3BvcnQuY2xvc2UoKV07Y2FzZSAxMjp0aHJvdyBuLnNlbnQoKSxyO2Nhc2UgMTM6cmV0dXJuIHRoaXMuY29ubmVjdGVkPSEwLFsyXX19KSl9KSl9LGUucHJvdG90eXBlLmRpc2Nvbm5lY3Q9ZnVuY3Rpb24oKXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIHQ7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24oZSl7c3dpdGNoKGUubGFiZWwpe2Nhc2UgMDppZighMT09PXRoaXMuY29ubmVjdGVkKXJldHVyblsyXTtlLmxhYmVsPTE7Y2FzZSAxOnJldHVybiBlLnRyeXMucHVzaChbMSwzLCw1XSksWzQsdGhpcy5zZW5kKDMpXTtjYXNlIDI6cmV0dXJuIGUuc2VudCgpLFszLDVdO2Nhc2UgMzpyZXR1cm4gdD1lLnNlbnQoKSxbNCx0aGlzLmNsZWFyQWJvcnQoKV07Y2FzZSA0OnRocm93IGUuc2VudCgpLHQ7Y2FzZSA1OnJldHVybls0LHRoaXMudHJhbnNwb3J0LmNsb3NlKCldO2Nhc2UgNjpyZXR1cm4gZS5zZW50KCksdGhpcy5jb25uZWN0ZWQ9ITEsWzJdfX0pKX0pKX0sZS5wcm90b3R5cGUucmVjb25uZWN0PWZ1bmN0aW9uKCl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKHQpe3N3aXRjaCh0LmxhYmVsKXtjYXNlIDA6cmV0dXJuWzQsdGhpcy5kaXNjb25uZWN0KCldO2Nhc2UgMTpyZXR1cm4gdC5zZW50KCksWzQsbmV3IFByb21pc2UoKGZ1bmN0aW9uKHQpe3JldHVybiBzZXRUaW1lb3V0KHQsMTAwKX0pKV07Y2FzZSAyOnJldHVybiB0LnNlbnQoKSxbNCx0aGlzLmNvbm5lY3QoKV07Y2FzZSAzOnJldHVybiB0LnNlbnQoKSxbMl19fSkpfSkpfSxlLnByb3RvdHlwZS5yZXNldD1mdW5jdGlvbigpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgdDtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihlKXtzd2l0Y2goZS5sYWJlbCl7Y2FzZSAwOnJldHVybiBlLnRyeXMucHVzaChbMCwyLCw0XSksWzQsdGhpcy5zZW5kKDEwKV07Y2FzZSAxOnJldHVyblsyLDE9PT1lLnNlbnQoKS5nZXRVaW50OCgyKV07Y2FzZSAyOnJldHVybiB0PWUuc2VudCgpLFs0LHRoaXMuY2xlYXJBYm9ydCgpXTtjYXNlIDM6dGhyb3cgZS5zZW50KCksdDtjYXNlIDQ6cmV0dXJuWzJdfX0pKX0pKX0sZS5wcm90b3R5cGUudHJhbnNmZXI9ZnVuY3Rpb24odCxlLHIscyl7cmV0dXJuIHZvaWQgMD09PWUmJihlPTIpLHZvaWQgMD09PXImJihyPTApLHZvaWQgMD09PXMmJihzPTApLG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciBuLG8sdSxjLGEsaCxmO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKGkpe3N3aXRjaChpLmxhYmVsKXtjYXNlIDA6bj1cIm51bWJlclwiPT10eXBlb2YgdD9be3BvcnQ6dCxtb2RlOmUscmVnaXN0ZXI6cix2YWx1ZTpzfV06dCxvPW5ldyBVaW50OEFycmF5KDIrNSpuLmxlbmd0aCksKHU9bmV3IERhdGFWaWV3KG8uYnVmZmVyKSkuc2V0VWludDgoMCwwKSx1LnNldFVpbnQ4KDEsbi5sZW5ndGgpLG4uZm9yRWFjaCgoZnVuY3Rpb24odCxlKXt2YXIgcj0yKzUqZTt1LnNldFVpbnQ4KHIsdC5wb3J0fHQubW9kZXx0LnJlZ2lzdGVyKSx1LnNldFVpbnQzMihyKzEsdC52YWx1ZXx8MCwhMCl9KSksaS5sYWJlbD0xO2Nhc2UgMTpyZXR1cm4gaS50cnlzLnB1c2goWzEsMywsNV0pLFs0LHRoaXMuc2VuZCg1LG8pXTtjYXNlIDI6aWYoKGM9aS5zZW50KCkpLmdldFVpbnQ4KDEpIT09bi5sZW5ndGgpdGhyb3cgbmV3IEVycm9yKFwiVHJhbnNmZXIgY291bnQgbWlzbWF0Y2hcIik7aWYoMj09PShhPWMuZ2V0VWludDgoMikpKXRocm93IG5ldyBFcnJvcihcIlRyYW5zZmVyIHJlc3BvbnNlIFdBSVRcIik7aWYoND09PWEpdGhyb3cgbmV3IEVycm9yKFwiVHJhbnNmZXIgcmVzcG9uc2UgRkFVTFRcIik7aWYoOD09PWEpdGhyb3cgbmV3IEVycm9yKFwiVHJhbnNmZXIgcmVzcG9uc2UgUFJPVE9DT0xfRVJST1JcIik7aWYoMTY9PT1hKXRocm93IG5ldyBFcnJvcihcIlRyYW5zZmVyIHJlc3BvbnNlIFZBTFVFX01JU01BVENIXCIpO2lmKDc9PT1hKXRocm93IG5ldyBFcnJvcihcIlRyYW5zZmVyIHJlc3BvbnNlIE5PX0FDS1wiKTtyZXR1cm5cIm51bWJlclwiPT10eXBlb2YgdD9bMixjLmdldFVpbnQzMigzLCEwKV06KGg9NCpuLmxlbmd0aCxbMixuZXcgVWludDMyQXJyYXkoYy5idWZmZXIuc2xpY2UoMywzK2gpKV0pO2Nhc2UgMzpyZXR1cm4gZj1pLnNlbnQoKSxbNCx0aGlzLmNsZWFyQWJvcnQoKV07Y2FzZSA0OnRocm93IGkuc2VudCgpLGY7Y2FzZSA1OnJldHVyblsyXX19KSl9KSl9LGUucHJvdG90eXBlLnRyYW5zZmVyQmxvY2s9ZnVuY3Rpb24odCxlLHIpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgbixzLG8sdSxjLGEsaCxmO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKGkpe3N3aXRjaChpLmxhYmVsKXtjYXNlIDA6bz00LFwibnVtYmVyXCI9PXR5cGVvZiByPyhuPXIscz0yKToobj1yLmxlbmd0aCxzPTAsbys9ci5ieXRlTGVuZ3RoKSx1PW5ldyBVaW50OEFycmF5KG8pLChjPW5ldyBEYXRhVmlldyh1LmJ1ZmZlcikpLnNldFVpbnQ4KDAsMCksYy5zZXRVaW50MTYoMSxuLCEwKSxjLnNldFVpbnQ4KDMsdHxzfGUpLFwibnVtYmVyXCIhPXR5cGVvZiByJiZyLmZvckVhY2goKGZ1bmN0aW9uKHQsZSl7dmFyIHI9NCs0KmU7Yy5zZXRVaW50MzIocix0LCEwKX0pKSxpLmxhYmVsPTE7Y2FzZSAxOnJldHVybiBpLnRyeXMucHVzaChbMSwzLCw1XSksWzQsdGhpcy5zZW5kKDYsYyldO2Nhc2UgMjppZigoYT1pLnNlbnQoKSkuZ2V0VWludDE2KDEsITApIT09bil0aHJvdyBuZXcgRXJyb3IoXCJUcmFuc2ZlciBjb3VudCBtaXNtYXRjaFwiKTtpZigyPT09KGg9YS5nZXRVaW50OCgzKSkpdGhyb3cgbmV3IEVycm9yKFwiVHJhbnNmZXIgcmVzcG9uc2UgV0FJVFwiKTtpZig0PT09aCl0aHJvdyBuZXcgRXJyb3IoXCJUcmFuc2ZlciByZXNwb25zZSBGQVVMVFwiKTtpZig4PT09aCl0aHJvdyBuZXcgRXJyb3IoXCJUcmFuc2ZlciByZXNwb25zZSBQUk9UT0NPTF9FUlJPUlwiKTtpZig3PT09aCl0aHJvdyBuZXcgRXJyb3IoXCJUcmFuc2ZlciByZXNwb25zZSBOT19BQ0tcIik7cmV0dXJuXCJudW1iZXJcIj09dHlwZW9mIHI/WzIsbmV3IFVpbnQzMkFycmF5KGEuYnVmZmVyLnNsaWNlKDQsNCs0Km4pKV06WzMsNV07Y2FzZSAzOnJldHVybiBmPWkuc2VudCgpLFs0LHRoaXMuY2xlYXJBYm9ydCgpXTtjYXNlIDQ6dGhyb3cgaS5zZW50KCksZjtjYXNlIDU6cmV0dXJuWzIsdm9pZCAwXX19KSl9KSl9LGV9KG8pLEE9L1tcXHhjMC1cXHhmZl1bXFx4ODAtXFx4YmZdKiQvZyxDPS9bXFx4YzAtXFx4ZmZdW1xceDgwLVxceGJmXSovZyxVPWZ1bmN0aW9uKCl7ZnVuY3Rpb24gdCgpe31yZXR1cm4gdC5wcm90b3R5cGUuZGVjb2RlPWZ1bmN0aW9uKHQpe3ZhciBlPUFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKG5ldyBVaW50OEFycmF5KHQpKSxyPVN0cmluZy5mcm9tQ29kZVBvaW50LmFwcGx5KHZvaWQgMCxlKTt0aGlzLnBhcnRpYWxDaGFyJiYocj1cIlwiK3RoaXMucGFydGlhbENoYXIrcix0aGlzLnBhcnRpYWxDaGFyPXZvaWQgMCk7dmFyIG49ci5tYXRjaChBKTtpZihuKXt2YXIgaT1uWzBdLmxlbmd0aDt0aGlzLnBhcnRpYWxDaGFyPXIuc2xpY2UoLWkpLHI9ci5zbGljZSgwLC1pKX1yZXR1cm4gci5yZXBsYWNlKEMsdGhpcy5kZWNvZGVyUmVwbGFjZXIpfSx0LnByb3RvdHlwZS5kZWNvZGVyUmVwbGFjZXI9ZnVuY3Rpb24odCl7dmFyIGU9dC5jb2RlUG9pbnRBdCgwKTw8MjQscj1NYXRoLmNsejMyKH5lKSxuPTAsaT10Lmxlbmd0aCxzPVwiXCI7aWYocjw1JiZpPj1yKXtmb3IoZT1lPDxyPj4+MjQrcixuPTE7bjxyO24rPTEpZT1lPDw2fDYzJnQuY29kZVBvaW50QXQobik7ZTw9NjU1MzU/cys9U3RyaW5nLmZyb21Db2RlUG9pbnQoZSk6ZTw9MTExNDExMT8oZS09NjU1MzYscys9U3RyaW5nLmZyb21Db2RlUG9pbnQoNTUyOTYrKGU+PjEwKSw1NjMyMCsoMTAyMyZlKSkpOm49MH1mb3IoO248aTtuKz0xKXMrPVwi77+9XCI7cmV0dXJuIHN9LHR9KCksRT1uZXcgVSxQPWZ1bmN0aW9uKHQpe2Z1bmN0aW9uIGUocixzLG8pe3ZvaWQgMD09PXMmJihzPTApLHZvaWQgMD09PW8mJihvPW0pO3ZhciB1PXQuY2FsbCh0aGlzLHIscyxvKXx8dGhpcztyZXR1cm4gdS5zZXJpYWxQb2xsaW5nPSExLHUuc2VyaWFsTGlzdGVuZXJzPSExLHUub24oXCJuZXdMaXN0ZW5lclwiLChmdW5jdGlvbih0KXtyZXR1cm4gbih1LHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24ocil7cmV0dXJuIHQ9PT1lLkVWRU5UX1NFUklBTF9EQVRBJiYwPT09dGhpcy5saXN0ZW5lckNvdW50KHQpJiYodGhpcy5zZXJpYWxMaXN0ZW5lcnM9ITApLFsyXX0pKX0pKX0pKSx1Lm9uKFwicmVtb3ZlTGlzdGVuZXJcIiwoZnVuY3Rpb24odCl7dD09PWUuRVZFTlRfU0VSSUFMX0RBVEEmJigwPT09dS5saXN0ZW5lckNvdW50KHQpJiYodS5zZXJpYWxMaXN0ZW5lcnM9ITEpKX0pKSx1fXJldHVybiByKGUsdCksZS5wcm90b3R5cGUuaXNCdWZmZXJCaW5hcnk9ZnVuY3Rpb24odCl7Zm9yKHZhciBlPUFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKG5ldyBVaW50MTZBcnJheSh0LDAsNTApKSxyPVN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkobnVsbCxlKSxuPTA7bjxyLmxlbmd0aDtuKyspe3ZhciBpPXIuY2hhckNvZGVBdChuKTtpZig2NTUzMz09PWl8fGk8PTgpcmV0dXJuITB9cmV0dXJuITF9LGUucHJvdG90eXBlLndyaXRlQnVmZmVyPWZ1bmN0aW9uKHQscixzKXtyZXR1cm4gdm9pZCAwPT09cyYmKHM9MCksbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIG4sbyx1LGM7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24oaSl7c3dpdGNoKGkubGFiZWwpe2Nhc2UgMDpuPU1hdGgubWluKHQuYnl0ZUxlbmd0aCxzK3IpLG89dC5zbGljZShzLG4pLCh1PW5ldyBVaW50OEFycmF5KG8uYnl0ZUxlbmd0aCsxKSkuc2V0KFtvLmJ5dGVMZW5ndGhdKSx1LnNldChuZXcgVWludDhBcnJheShvKSwxKSxpLmxhYmVsPTE7Y2FzZSAxOnJldHVybiBpLnRyeXMucHVzaChbMSwzLCw1XSksWzQsdGhpcy5zZW5kKDE0MCx1KV07Y2FzZSAyOnJldHVybiBpLnNlbnQoKSxbMyw1XTtjYXNlIDM6cmV0dXJuIGM9aS5zZW50KCksWzQsdGhpcy5jbGVhckFib3J0KCldO2Nhc2UgNDp0aHJvdyBpLnNlbnQoKSxjO2Nhc2UgNTpyZXR1cm4gdGhpcy5lbWl0KGUuRVZFTlRfUFJPR1JFU1Mscy90LmJ5dGVMZW5ndGgpLG48dC5ieXRlTGVuZ3RoP1syLHRoaXMud3JpdGVCdWZmZXIodCxyLG4pXTpbMl19fSkpfSkpfSxlLnByb3RvdHlwZS5mbGFzaD1mdW5jdGlvbih0LHIpe3JldHVybiB2b2lkIDA9PT1yJiYocj02Miksbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIG4scyxvO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKGkpe3N3aXRjaChpLmxhYmVsKXtjYXNlIDA6bj1mdW5jdGlvbih0KXtyZXR1cm4gdm9pZCAwIT09dC5idWZmZXJ9KHQpP3QuYnVmZmVyOnQscz10aGlzLmlzQnVmZmVyQmluYXJ5KG4pPzA6MSxpLmxhYmVsPTE7Y2FzZSAxOnJldHVybiBpLnRyeXMucHVzaChbMSw2LCw4XSksWzQsdGhpcy5zZW5kKDEzOCxuZXcgVWludDMyQXJyYXkoW3NdKSldO2Nhc2UgMjppZigwIT09aS5zZW50KCkuZ2V0VWludDgoMSkpdGhyb3cgbmV3IEVycm9yKFwiRmxhc2ggZXJyb3JcIik7cmV0dXJuWzQsdGhpcy53cml0ZUJ1ZmZlcihuLHIpXTtjYXNlIDM6cmV0dXJuIGkuc2VudCgpLHRoaXMuZW1pdChlLkVWRU5UX1BST0dSRVNTLDEpLFs0LHRoaXMuc2VuZCgxMzkpXTtjYXNlIDQ6aWYoMCE9PWkuc2VudCgpLmdldFVpbnQ4KDEpKXRocm93IG5ldyBFcnJvcihcIkZsYXNoIGVycm9yXCIpO3JldHVybls0LHRoaXMuc2VuZCgxMzcpXTtjYXNlIDU6cmV0dXJuIGkuc2VudCgpLFszLDhdO2Nhc2UgNjpyZXR1cm4gbz1pLnNlbnQoKSxbNCx0aGlzLmNsZWFyQWJvcnQoKV07Y2FzZSA3OnRocm93IGkuc2VudCgpLG87Y2FzZSA4OnJldHVyblsyXX19KSl9KSl9LGUucHJvdG90eXBlLmdldFNlcmlhbEJhdWRyYXRlPWZ1bmN0aW9uKCl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciB0O3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKGUpe3N3aXRjaChlLmxhYmVsKXtjYXNlIDA6cmV0dXJuIGUudHJ5cy5wdXNoKFswLDIsLDRdKSxbNCx0aGlzLnNlbmQoMTI5KV07Y2FzZSAxOnJldHVyblsyLGUuc2VudCgpLmdldFVpbnQzMigxLCEwKV07Y2FzZSAyOnJldHVybiB0PWUuc2VudCgpLFs0LHRoaXMuY2xlYXJBYm9ydCgpXTtjYXNlIDM6dGhyb3cgZS5zZW50KCksdDtjYXNlIDQ6cmV0dXJuWzJdfX0pKX0pKX0sZS5wcm90b3R5cGUuc2V0U2VyaWFsQmF1ZHJhdGU9ZnVuY3Rpb24odCl7cmV0dXJuIHZvaWQgMD09PXQmJih0PTk2MDApLG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciBlO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKHIpe3N3aXRjaChyLmxhYmVsKXtjYXNlIDA6cmV0dXJuIHIudHJ5cy5wdXNoKFswLDIsLDRdKSxbNCx0aGlzLnNlbmQoMTMwLG5ldyBVaW50MzJBcnJheShbdF0pKV07Y2FzZSAxOnJldHVybiByLnNlbnQoKSxbMyw0XTtjYXNlIDI6cmV0dXJuIGU9ci5zZW50KCksWzQsdGhpcy5jbGVhckFib3J0KCldO2Nhc2UgMzp0aHJvdyByLnNlbnQoKSxlO2Nhc2UgNDpyZXR1cm5bMl19fSkpfSkpfSxlLnByb3RvdHlwZS5zZXJpYWxXcml0ZT1mdW5jdGlvbih0KXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIGUscjtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihuKXtzd2l0Y2gobi5sYWJlbCl7Y2FzZSAwOihlPXQuc3BsaXQoXCJcIikubWFwKChmdW5jdGlvbih0KXtyZXR1cm4gdC5jaGFyQ29kZUF0KDApfSkpKS51bnNoaWZ0KGUubGVuZ3RoKSxuLmxhYmVsPTE7Y2FzZSAxOnJldHVybiBuLnRyeXMucHVzaChbMSwzLCw1XSksWzQsdGhpcy5zZW5kKDEzMixuZXcgVWludDhBcnJheShlKS5idWZmZXIpXTtjYXNlIDI6cmV0dXJuIG4uc2VudCgpLFszLDVdO2Nhc2UgMzpyZXR1cm4gcj1uLnNlbnQoKSxbNCx0aGlzLmNsZWFyQWJvcnQoKV07Y2FzZSA0OnRocm93IG4uc2VudCgpLHI7Y2FzZSA1OnJldHVyblsyXX19KSl9KSl9LGUucHJvdG90eXBlLnNlcmlhbFJlYWQ9ZnVuY3Rpb24oKXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIHQsZSxyO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKG4pe3N3aXRjaChuLmxhYmVsKXtjYXNlIDA6cmV0dXJuIG4udHJ5cy5wdXNoKFswLDIsLDRdKSxbNCx0aGlzLnNlbmQoMTMxKV07Y2FzZSAxOnJldHVybiAwPT09KHQ9bi5zZW50KCkpLmJ5dGVMZW5ndGh8fCgxMzEhPT10LmdldFVpbnQ4KDApfHwwPT09KGU9dC5nZXRVaW50OCgxKSkpP1syLHZvaWQgMF06KDIsWzIsdC5idWZmZXIuc2xpY2UoMiwyK2UpXSk7Y2FzZSAyOnJldHVybiByPW4uc2VudCgpLFs0LHRoaXMuY2xlYXJBYm9ydCgpXTtjYXNlIDM6dGhyb3cgbi5zZW50KCkscjtjYXNlIDQ6cmV0dXJuWzJdfX0pKX0pKX0sZS5wcm90b3R5cGUuc3RhcnRTZXJpYWxSZWFkPWZ1bmN0aW9uKHQscil7cmV0dXJuIHZvaWQgMD09PXQmJih0PTEwMCksdm9pZCAwPT09ciYmKHI9ITApLG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciBuLHMsbztyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihpKXtzd2l0Y2goaS5sYWJlbCl7Y2FzZSAwOnRoaXMuc2VyaWFsUG9sbGluZz0hMCxpLmxhYmVsPTE7Y2FzZSAxOnJldHVybiB0aGlzLnNlcmlhbFBvbGxpbmc/dGhpcy5zZXJpYWxMaXN0ZW5lcnM/KG49dGhpcy5jb25uZWN0ZWQsITEhPT10aGlzLmNvbm5lY3RlZHx8ITAhPT1yP1szLDNdOls0LHRoaXMuY29ubmVjdCgpXSk6WzMsN106WzMsOV07Y2FzZSAyOmkuc2VudCgpLGkubGFiZWw9MztjYXNlIDM6cmV0dXJuWzQsdGhpcy5zZXJpYWxSZWFkKCldO2Nhc2UgNDpyZXR1cm4gcz1pLnNlbnQoKSwhMSE9PW58fCEwIT09cj9bMyw2XTpbNCx0aGlzLmRpc2Nvbm5lY3QoKV07Y2FzZSA1Omkuc2VudCgpLGkubGFiZWw9NjtjYXNlIDY6dm9pZCAwIT09cyYmKG89RS5kZWNvZGUocyksdGhpcy5lbWl0KGUuRVZFTlRfU0VSSUFMX0RBVEEsbykpLGkubGFiZWw9NztjYXNlIDc6cmV0dXJuWzQsbmV3IFByb21pc2UoKGZ1bmN0aW9uKGUpe3JldHVybiBzZXRUaW1lb3V0KGUsdCl9KSldO2Nhc2UgODpyZXR1cm4gaS5zZW50KCksWzMsMV07Y2FzZSA5OnJldHVyblsyXX19KSl9KSl9LGUucHJvdG90eXBlLnN0b3BTZXJpYWxSZWFkPWZ1bmN0aW9uKCl7dGhpcy5zZXJpYWxQb2xsaW5nPSExfSxlLkVWRU5UX1BST0dSRVNTPVwicHJvZ3Jlc3NcIixlLkVWRU5UX1NFUklBTF9EQVRBPVwic2VyaWFsXCIsZX0oZyksVD1mdW5jdGlvbigpe2Z1bmN0aW9uIHQodCxlLHIpe3ZvaWQgMD09PWUmJihlPTApLHZvaWQgMD09PXImJihyPW0pO3RoaXMucHJveHk9dm9pZCAwIT09dC5vcGVuP25ldyBnKHQsZSxyKTp0fXJldHVybiB0LnByb3RvdHlwZS53YWl0RGVsYXk9ZnVuY3Rpb24odCxlLHIpe3JldHVybiB2b2lkIDA9PT1lJiYoZT0wKSx2b2lkIDA9PT1yJiYocj0xMDApLG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciBuO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKGkpe3N3aXRjaChpLmxhYmVsKXtjYXNlIDA6bj0hMCxlPjAmJnNldFRpbWVvdXQoKGZ1bmN0aW9uKCl7aWYobil0aHJvdyBuPSExLG5ldyBFcnJvcihcIldhaXQgdGltZWQgb3V0XCIpfSksZSksaS5sYWJlbD0xO2Nhc2UgMTpyZXR1cm4gbj9bNCx0KCldOlszLDVdO2Nhc2UgMjpyZXR1cm4hMD09PWkuc2VudCgpPyhuPSExLFsyXSk6cj4wP1s0LG5ldyBQcm9taXNlKChmdW5jdGlvbih0KXtyZXR1cm4gc2V0VGltZW91dCh0LGUpfSkpXTpbMyw0XTtjYXNlIDM6aS5zZW50KCksaS5sYWJlbD00O2Nhc2UgNDpyZXR1cm5bMywxXTtjYXNlIDU6cmV0dXJuWzJdfX0pKX0pKX0sdC5wcm90b3R5cGUuY29uY2F0VHlwZWRBcnJheT1mdW5jdGlvbih0KXtpZigxPT09dC5sZW5ndGgpcmV0dXJuIHRbMF07Zm9yKHZhciBlPTAscj0wLG49dDtyPG4ubGVuZ3RoO3IrKyl7ZSs9bltyXS5sZW5ndGh9Zm9yKHZhciBpPW5ldyBVaW50MzJBcnJheShlKSxzPTAsbz0wO3M8dC5sZW5ndGg7cysrKWkuc2V0KHRbc10sbyksbys9dFtzXS5sZW5ndGg7cmV0dXJuIGl9LHQucHJvdG90eXBlLnJlYWREUENvbW1hbmQ9ZnVuY3Rpb24odCl7cmV0dXJuW3ttb2RlOjIscG9ydDowLHJlZ2lzdGVyOnR9XX0sdC5wcm90b3R5cGUud3JpdGVEUENvbW1hbmQ9ZnVuY3Rpb24odCxlKXtpZig4PT09dCl7aWYoZT09PXRoaXMuc2VsZWN0ZWRBZGRyZXNzKXJldHVybltdO3RoaXMuc2VsZWN0ZWRBZGRyZXNzPWV9cmV0dXJuW3ttb2RlOjAscG9ydDowLHJlZ2lzdGVyOnQsdmFsdWU6ZX1dfSx0LnByb3RvdHlwZS5yZWFkQVBDb21tYW5kPWZ1bmN0aW9uKHQpe3ZhciBlPTQyNzgxOTAwODAmdHwyNDAmdDtyZXR1cm4gdGhpcy53cml0ZURQQ29tbWFuZCg4LGUpLmNvbmNhdCh7bW9kZToyLHBvcnQ6MSxyZWdpc3Rlcjp0fSl9LHQucHJvdG90eXBlLndyaXRlQVBDb21tYW5kPWZ1bmN0aW9uKHQsZSl7aWYoMD09PXQpe2lmKGU9PT10aGlzLmNzd1ZhbHVlKXJldHVybltdO3RoaXMuY3N3VmFsdWU9ZX12YXIgcj00Mjc4MTkwMDgwJnR8MjQwJnQ7cmV0dXJuIHRoaXMud3JpdGVEUENvbW1hbmQoOCxyKS5jb25jYXQoe21vZGU6MCxwb3J0OjEscmVnaXN0ZXI6dCx2YWx1ZTplfSl9LHQucHJvdG90eXBlLnJlYWRNZW0xNkNvbW1hbmQ9ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMud3JpdGVBUENvbW1hbmQoMCw1ODcyMDI2NDEpLmNvbmNhdCh0aGlzLndyaXRlQVBDb21tYW5kKDQsdCkpLmNvbmNhdCh0aGlzLnJlYWRBUENvbW1hbmQoMTIpKX0sdC5wcm90b3R5cGUud3JpdGVNZW0xNkNvbW1hbmQ9ZnVuY3Rpb24odCxlKXtyZXR1cm4gdGhpcy53cml0ZUFQQ29tbWFuZCgwLDU4NzIwMjY0MSkuY29uY2F0KHRoaXMud3JpdGVBUENvbW1hbmQoNCx0KSkuY29uY2F0KHRoaXMud3JpdGVBUENvbW1hbmQoMTIsZSkpfSx0LnByb3RvdHlwZS5yZWFkTWVtMzJDb21tYW5kPWZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLndyaXRlQVBDb21tYW5kKDAsNTg3MjAyNjQyKS5jb25jYXQodGhpcy53cml0ZUFQQ29tbWFuZCg0LHQpKS5jb25jYXQodGhpcy5yZWFkQVBDb21tYW5kKDEyKSl9LHQucHJvdG90eXBlLndyaXRlTWVtMzJDb21tYW5kPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIHRoaXMud3JpdGVBUENvbW1hbmQoMCw1ODcyMDI2NDIpLmNvbmNhdCh0aGlzLndyaXRlQVBDb21tYW5kKDQsdCkpLmNvbmNhdCh0aGlzLndyaXRlQVBDb21tYW5kKDEyLGUpKX0sdC5wcm90b3R5cGUudHJhbnNmZXJTZXF1ZW5jZT1mdW5jdGlvbih0KXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIGUscixuLHM7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24oaSl7c3dpdGNoKGkubGFiZWwpe2Nhc2UgMDplPShlPVtdKS5jb25jYXQuYXBwbHkoZSx0KSxyPVtdLGkubGFiZWw9MTtjYXNlIDE6cmV0dXJuIGUubGVuZ3RoPyhuPWUuc3BsaWNlKDAsdGhpcy5wcm94eS5vcGVyYXRpb25Db3VudCksWzQsdGhpcy5wcm94eS50cmFuc2ZlcihuKV0pOlszLDNdO2Nhc2UgMjpyZXR1cm4gcz1pLnNlbnQoKSxyLnB1c2gocyksWzMsMV07Y2FzZSAzOnJldHVyblsyLHRoaXMuY29uY2F0VHlwZWRBcnJheShyKV19fSkpfSkpfSx0LnByb3RvdHlwZS5jb25uZWN0PWZ1bmN0aW9uKCl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciB0LGU9dGhpcztyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihyKXtzd2l0Y2goci5sYWJlbCl7Y2FzZSAwOnJldHVybiB0PS0xNjEwNjEyNzM2LFs0LHRoaXMucHJveHkuY29ubmVjdCgpXTtjYXNlIDE6cmV0dXJuIHIuc2VudCgpLFs0LHRoaXMucmVhZERQKDApXTtjYXNlIDI6cmV0dXJuIHIuc2VudCgpLFs0LHRoaXMudHJhbnNmZXJTZXF1ZW5jZShbdGhpcy53cml0ZURQQ29tbWFuZCgwLDQpLHRoaXMud3JpdGVEUENvbW1hbmQoOCwwKSx0aGlzLndyaXRlRFBDb21tYW5kKDQsMTM0MjE3NzI4MCldKV07Y2FzZSAzOnJldHVybiByLnNlbnQoKSxbNCx0aGlzLndhaXREZWxheSgoZnVuY3Rpb24oKXtyZXR1cm4gbihlLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24oZSl7c3dpdGNoKGUubGFiZWwpe2Nhc2UgMDpyZXR1cm5bNCx0aGlzLnJlYWREUCg0KV07Y2FzZSAxOnJldHVyblsyLChlLnNlbnQoKSZ0KT09PXRdfX0pKX0pKX0pKV07Y2FzZSA0OnJldHVybiByLnNlbnQoKSxbMl19fSkpfSkpfSx0LnByb3RvdHlwZS5kaXNjb25uZWN0PWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMucHJveHkuZGlzY29ubmVjdCgpfSx0LnByb3RvdHlwZS5yZWNvbm5lY3Q9ZnVuY3Rpb24oKXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24odCl7c3dpdGNoKHQubGFiZWwpe2Nhc2UgMDpyZXR1cm5bNCx0aGlzLmRpc2Nvbm5lY3QoKV07Y2FzZSAxOnJldHVybiB0LnNlbnQoKSxbNCxuZXcgUHJvbWlzZSgoZnVuY3Rpb24odCl7cmV0dXJuIHNldFRpbWVvdXQodCwxMDApfSkpXTtjYXNlIDI6cmV0dXJuIHQuc2VudCgpLFs0LHRoaXMuY29ubmVjdCgpXTtjYXNlIDM6cmV0dXJuIHQuc2VudCgpLFsyXX19KSl9KSl9LHQucHJvdG90eXBlLnJlc2V0PWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMucHJveHkucmVzZXQoKX0sdC5wcm90b3R5cGUucmVhZERQPWZ1bmN0aW9uKHQpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihlKXtzd2l0Y2goZS5sYWJlbCl7Y2FzZSAwOnJldHVybls0LHRoaXMucHJveHkudHJhbnNmZXIodGhpcy5yZWFkRFBDb21tYW5kKHQpKV07Y2FzZSAxOnJldHVyblsyLGUuc2VudCgpWzBdXX19KSl9KSl9LHQucHJvdG90eXBlLndyaXRlRFA9ZnVuY3Rpb24odCxlKXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24ocil7c3dpdGNoKHIubGFiZWwpe2Nhc2UgMDpyZXR1cm5bNCx0aGlzLnByb3h5LnRyYW5zZmVyKHRoaXMud3JpdGVEUENvbW1hbmQodCxlKSldO2Nhc2UgMTpyZXR1cm4gci5zZW50KCksWzJdfX0pKX0pKX0sdC5wcm90b3R5cGUucmVhZEFQPWZ1bmN0aW9uKHQpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihlKXtzd2l0Y2goZS5sYWJlbCl7Y2FzZSAwOnJldHVybls0LHRoaXMucHJveHkudHJhbnNmZXIodGhpcy5yZWFkQVBDb21tYW5kKHQpKV07Y2FzZSAxOnJldHVyblsyLGUuc2VudCgpWzBdXX19KSl9KSl9LHQucHJvdG90eXBlLndyaXRlQVA9ZnVuY3Rpb24odCxlKXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24ocil7c3dpdGNoKHIubGFiZWwpe2Nhc2UgMDpyZXR1cm5bNCx0aGlzLnByb3h5LnRyYW5zZmVyKHRoaXMud3JpdGVBUENvbW1hbmQodCxlKSldO2Nhc2UgMTpyZXR1cm4gci5zZW50KCksWzJdfX0pKX0pKX0sdC5wcm90b3R5cGUucmVhZE1lbTE2PWZ1bmN0aW9uKHQpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihlKXtzd2l0Y2goZS5sYWJlbCl7Y2FzZSAwOnJldHVybls0LHRoaXMucHJveHkudHJhbnNmZXIodGhpcy5yZWFkTWVtMTZDb21tYW5kKHQpKV07Y2FzZSAxOnJldHVyblsyLGUuc2VudCgpWzBdXX19KSl9KSl9LHQucHJvdG90eXBlLndyaXRlTWVtMTY9ZnVuY3Rpb24odCxlKXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24ocil7c3dpdGNoKHIubGFiZWwpe2Nhc2UgMDpyZXR1cm4gZTw8PSgyJnQpPDwzLFs0LHRoaXMucHJveHkudHJhbnNmZXIodGhpcy53cml0ZU1lbTE2Q29tbWFuZCh0LGUpKV07Y2FzZSAxOnJldHVybiByLnNlbnQoKSxbMl19fSkpfSkpfSx0LnByb3RvdHlwZS5yZWFkTWVtMzI9ZnVuY3Rpb24odCl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKGUpe3N3aXRjaChlLmxhYmVsKXtjYXNlIDA6cmV0dXJuWzQsdGhpcy5wcm94eS50cmFuc2Zlcih0aGlzLnJlYWRNZW0zMkNvbW1hbmQodCkpXTtjYXNlIDE6cmV0dXJuWzIsZS5zZW50KClbMF1dfX0pKX0pKX0sdC5wcm90b3R5cGUud3JpdGVNZW0zMj1mdW5jdGlvbih0LGUpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihyKXtzd2l0Y2goci5sYWJlbCl7Y2FzZSAwOnJldHVybls0LHRoaXMucHJveHkudHJhbnNmZXIodGhpcy53cml0ZU1lbTMyQ29tbWFuZCh0LGUpKV07Y2FzZSAxOnJldHVybiByLnNlbnQoKSxbMl19fSkpfSkpfSx0LnByb3RvdHlwZS5yZWFkQmxvY2s9ZnVuY3Rpb24odCxlKXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIHIsbixzLG87cmV0dXJuIGkodGhpcywoZnVuY3Rpb24oaSl7c3dpdGNoKGkubGFiZWwpe2Nhc2UgMDpyZXR1cm5bNCx0aGlzLnRyYW5zZmVyU2VxdWVuY2UoW3RoaXMud3JpdGVBUENvbW1hbmQoMCw1ODcyMDI2NDIpLHRoaXMud3JpdGVBUENvbW1hbmQoNCx0KV0pXTtjYXNlIDE6aS5zZW50KCkscj1bXSxuPWUsaS5sYWJlbD0yO2Nhc2UgMjpyZXR1cm4gbj4wPyhzPU1hdGgubWluKG4sTWF0aC5mbG9vcih0aGlzLnByb3h5LmJsb2NrU2l6ZS80KSksWzQsdGhpcy5wcm94eS50cmFuc2ZlckJsb2NrKDEsMTIscyldKTpbMyw0XTtjYXNlIDM6cmV0dXJuIG89aS5zZW50KCksci5wdXNoKG8pLG4tPXMsWzMsMl07Y2FzZSA0OnJldHVyblsyLHRoaXMuY29uY2F0VHlwZWRBcnJheShyKV19fSkpfSkpfSx0LnByb3RvdHlwZS53cml0ZUJsb2NrPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciByLG47cmV0dXJuIGkodGhpcywoZnVuY3Rpb24oaSl7c3dpdGNoKGkubGFiZWwpe2Nhc2UgMDpyZXR1cm5bNCx0aGlzLnRyYW5zZmVyU2VxdWVuY2UoW3RoaXMud3JpdGVBUENvbW1hbmQoMCw1ODcyMDI2NDIpLHRoaXMud3JpdGVBUENvbW1hbmQoNCx0KV0pXTtjYXNlIDE6aS5zZW50KCkscj0wLGkubGFiZWw9MjtjYXNlIDI6cmV0dXJuIHI8ZS5sZW5ndGg/KG49ZS5zbGljZShyLHIrTWF0aC5mbG9vcih0aGlzLnByb3h5LmJsb2NrU2l6ZS80KSksWzQsdGhpcy5wcm94eS50cmFuc2ZlckJsb2NrKDEsMTIsbildKTpbMyw0XTtjYXNlIDM6cmV0dXJuIGkuc2VudCgpLHIrPU1hdGguZmxvb3IodGhpcy5wcm94eS5ibG9ja1NpemUvNCksWzMsMl07Y2FzZSA0OnJldHVyblsyXX19KSl9KSl9LHR9KCksTD00ODY4MixfPWZ1bmN0aW9uKHQpe2Z1bmN0aW9uIGUoKXtyZXR1cm4gbnVsbCE9PXQmJnQuYXBwbHkodGhpcyxhcmd1bWVudHMpfHx0aGlzfXJldHVybiByKGUsdCksZS5wcm90b3R5cGUuZW5hYmxlRGVidWc9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy53cml0ZU1lbTMyKDM3NTgxNTcyOTYsLTE2MDQzODY4MTUpfSxlLnByb3RvdHlwZS5yZWFkQ29yZVJlZ2lzdGVyQ29tbWFuZD1mdW5jdGlvbih0KXtyZXR1cm4gdGhpcy53cml0ZU1lbTMyQ29tbWFuZCgzNzU4MTU3MzAwLHQpLmNvbmNhdCh0aGlzLnJlYWRNZW0zMkNvbW1hbmQoMzc1ODE1NzI5NikpLmNvbmNhdCh0aGlzLnJlYWRNZW0zMkNvbW1hbmQoMzc1ODE1NzMwNCkpfSxlLnByb3RvdHlwZS53cml0ZUNvcmVSZWdpc3RlckNvbW1hbmQ9ZnVuY3Rpb24odCxlKXtyZXR1cm4gdGhpcy53cml0ZU1lbTMyQ29tbWFuZCgzNzU4MTU3MzA0LGUpLmNvbmNhdCh0aGlzLndyaXRlTWVtMzJDb21tYW5kKDM3NTgxNTczMDAsNjU1MzZ8dCkpfSxlLnByb3RvdHlwZS5nZXRTdGF0ZT1mdW5jdGlvbigpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgdCxlLHI7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24obil7c3dpdGNoKG4ubGFiZWwpe2Nhc2UgMDpyZXR1cm5bNCx0aGlzLnJlYWRNZW0zMigzNzU4MTU3Mjk2KV07Y2FzZSAxOnJldHVybiB0PW4uc2VudCgpLGU9NTI0Mjg4JnQ/MToyNjIxNDQmdD8yOjEzMTA3MiZ0PzM6NCwzMzU1NDQzMiZ0P1s0LHRoaXMucmVhZE1lbTMyKDM3NTgxNTcyOTYpXTpbMywzXTtjYXNlIDI6cmV0dXJuIDMzNTU0NDMyJihyPW4uc2VudCgpKSYmISgxNjc3NzIxNiZyKT9bMiwwXTpbMixlXTtjYXNlIDM6cmV0dXJuWzIsZV07Y2FzZSA0OnJldHVyblsyXX19KSl9KSl9LGUucHJvdG90eXBlLmlzSGFsdGVkPWZ1bmN0aW9uKCl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKHQpe3N3aXRjaCh0LmxhYmVsKXtjYXNlIDA6cmV0dXJuWzQsdGhpcy5yZWFkTWVtMzIoMzc1ODE1NzI5NildO2Nhc2UgMTpyZXR1cm5bMiwhISgxMzEwNzImdC5zZW50KCkpXX19KSl9KSl9LGUucHJvdG90eXBlLmhhbHQ9ZnVuY3Rpb24odCxlKXtyZXR1cm4gdm9pZCAwPT09dCYmKHQ9ITApLHZvaWQgMD09PWUmJihlPTApLG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciByPXRoaXM7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24obil7c3dpdGNoKG4ubGFiZWwpe2Nhc2UgMDpyZXR1cm5bNCx0aGlzLmlzSGFsdGVkKCldO2Nhc2UgMTpyZXR1cm4gbi5zZW50KCk/WzJdOls0LHRoaXMud3JpdGVNZW0zMigzNzU4MTU3Mjk2LC0xNjA0Mzg2ODEzKV07Y2FzZSAyOnJldHVybiBuLnNlbnQoKSx0P1syLHRoaXMud2FpdERlbGF5KChmdW5jdGlvbigpe3JldHVybiByLmlzSGFsdGVkKCl9KSxlKV06WzJdfX0pKX0pKX0sZS5wcm90b3R5cGUucmVzdW1lPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIHZvaWQgMD09PXQmJih0PSEwKSx2b2lkIDA9PT1lJiYoZT0wKSxuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgcj10aGlzO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKHMpe3N3aXRjaChzLmxhYmVsKXtjYXNlIDA6cmV0dXJuWzQsdGhpcy5pc0hhbHRlZCgpXTtjYXNlIDE6cmV0dXJuIHMuc2VudCgpP1s0LHRoaXMud3JpdGVNZW0zMigzNzU4MTU3MTA0LDcpXTpbMl07Y2FzZSAyOnJldHVybiBzLnNlbnQoKSxbNCx0aGlzLmVuYWJsZURlYnVnKCldO2Nhc2UgMzpyZXR1cm4gcy5zZW50KCksdD9bMix0aGlzLndhaXREZWxheSgoZnVuY3Rpb24oKXtyZXR1cm4gbihyLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24odCl7c3dpdGNoKHQubGFiZWwpe2Nhc2UgMDpyZXR1cm5bNCx0aGlzLmlzSGFsdGVkKCldO2Nhc2UgMTpyZXR1cm5bMiwhdC5zZW50KCldfX0pKX0pKX0pLGUpXTpbMl19fSkpfSkpfSxlLnByb3RvdHlwZS5yZWFkQ29yZVJlZ2lzdGVyPWZ1bmN0aW9uKHQpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgZTtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihyKXtzd2l0Y2goci5sYWJlbCl7Y2FzZSAwOnJldHVybls0LHRoaXMudHJhbnNmZXJTZXF1ZW5jZShbdGhpcy53cml0ZU1lbTMyQ29tbWFuZCgzNzU4MTU3MzAwLHQpLHRoaXMucmVhZE1lbTMyQ29tbWFuZCgzNzU4MTU3Mjk2KV0pXTtjYXNlIDE6aWYoZT1yLnNlbnQoKSwhKDY1NTM2JmVbMF0pKXRocm93IG5ldyBFcnJvcihcIlJlZ2lzdGVyIG5vdCByZWFkeVwiKTtyZXR1cm5bMix0aGlzLnJlYWRNZW0zMigzNzU4MTU3MzA0KV19fSkpfSkpfSxlLnByb3RvdHlwZS5yZWFkQ29yZVJlZ2lzdGVycz1mdW5jdGlvbih0KXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIGUscixuLHMsbztyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihpKXtzd2l0Y2goaS5sYWJlbCl7Y2FzZSAwOmU9W10scj0wLG49dCxpLmxhYmVsPTE7Y2FzZSAxOnJldHVybiByPG4ubGVuZ3RoPyhzPW5bcl0sWzQsdGhpcy5yZWFkQ29yZVJlZ2lzdGVyKHMpXSk6WzMsNF07Y2FzZSAyOm89aS5zZW50KCksZS5wdXNoKG8pLGkubGFiZWw9MztjYXNlIDM6cmV0dXJuIHIrKyxbMywxXTtjYXNlIDQ6cmV0dXJuWzIsZV19fSkpfSkpfSxlLnByb3RvdHlwZS53cml0ZUNvcmVSZWdpc3Rlcj1mdW5jdGlvbih0LGUpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgcjtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihuKXtzd2l0Y2gobi5sYWJlbCl7Y2FzZSAwOnJldHVybls0LHRoaXMudHJhbnNmZXJTZXF1ZW5jZShbdGhpcy53cml0ZU1lbTMyQ29tbWFuZCgzNzU4MTU3MzA0LGUpLHRoaXMud3JpdGVNZW0zMkNvbW1hbmQoMzc1ODE1NzMwMCw2NTUzNnx0KSx0aGlzLnJlYWRNZW0zMkNvbW1hbmQoMzc1ODE1NzI5NildKV07Y2FzZSAxOmlmKHI9bi5zZW50KCksISg2NTUzNiZyWzBdKSl0aHJvdyBuZXcgRXJyb3IoXCJSZWdpc3RlciBub3QgcmVhZHlcIik7cmV0dXJuWzJdfX0pKX0pKX0sZS5wcm90b3R5cGUuZXhlY3V0ZT1mdW5jdGlvbih0LGUscixzLG8pe3ZvaWQgMD09PW8mJihvPXQrMSk7Zm9yKHZhciB1PVtdLGM9NTtjPGFyZ3VtZW50cy5sZW5ndGg7YysrKXVbYy01XT1hcmd1bWVudHNbY107cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciBuLGMsYSxoPXRoaXM7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24oaSl7c3dpdGNoKGkubGFiZWwpe2Nhc2UgMDpmb3IoZVtlLmxlbmd0aC0xXSE9PUwmJigobj1uZXcgVWludDMyQXJyYXkoZS5sZW5ndGgrMSkpLnNldChlKSxuLnNldChbTF0sZS5sZW5ndGgtMSksZT1uKSxjPVt0aGlzLndyaXRlQ29yZVJlZ2lzdGVyQ29tbWFuZCgxMyxyKSx0aGlzLndyaXRlQ29yZVJlZ2lzdGVyQ29tbWFuZCgxNSxzKSx0aGlzLndyaXRlQ29yZVJlZ2lzdGVyQ29tbWFuZCgxNCxvKV0sYT0wO2E8TWF0aC5taW4odS5sZW5ndGgsMTIpO2ErKyljLnB1c2godGhpcy53cml0ZUNvcmVSZWdpc3RlckNvbW1hbmQoYSx1W2FdKSk7cmV0dXJuIGMucHVzaCh0aGlzLndyaXRlQ29yZVJlZ2lzdGVyQ29tbWFuZCgxNiwxNjc3NzIxNikpLFs0LHRoaXMuaGFsdCgpXTtjYXNlIDE6cmV0dXJuIGkuc2VudCgpLFs0LHRoaXMudHJhbnNmZXJTZXF1ZW5jZShjKV07Y2FzZSAyOnJldHVybiBpLnNlbnQoKSxbNCx0aGlzLndyaXRlQmxvY2sodCxlKV07Y2FzZSAzOnJldHVybiBpLnNlbnQoKSxbNCx0aGlzLnJlc3VtZSghMSldO2Nhc2UgNDpyZXR1cm4gaS5zZW50KCksWzQsdGhpcy53YWl0RGVsYXkoKGZ1bmN0aW9uKCl7cmV0dXJuIGguaXNIYWx0ZWQoKX0pLDFlNCldO2Nhc2UgNTpyZXR1cm4gaS5zZW50KCksWzJdfX0pKX0pKX0sZS5wcm90b3R5cGUuc29mdFJlc2V0PWZ1bmN0aW9uKCl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKHQpe3N3aXRjaCh0LmxhYmVsKXtjYXNlIDA6cmV0dXJuWzQsdGhpcy53cml0ZU1lbTMyKDM3NTgxNTczMDgsMCldO2Nhc2UgMTpyZXR1cm4gdC5zZW50KCksWzIsdGhpcy53cml0ZU1lbTMyKDM3NTgxNTcwNjgsMTAwMjcwMDg0KV19fSkpfSkpfSxlLnByb3RvdHlwZS5zZXRUYXJnZXRSZXNldFN0YXRlPWZ1bmN0aW9uKHQpe3JldHVybiB2b2lkIDA9PT10JiYodD0hMCksbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIGU7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24ocil7c3dpdGNoKHIubGFiZWwpe2Nhc2UgMDpyZXR1cm5bNCx0aGlzLndyaXRlTWVtMzIoMzc1ODE1NzMwOCwxKV07Y2FzZSAxOnJldHVybiByLnNlbnQoKSwhMCE9PXQ/WzMsM106WzQsdGhpcy5yZXNldCgpXTtjYXNlIDI6cmV0dXJuIHIuc2VudCgpLFszLDZdO2Nhc2UgMzpyZXR1cm5bNCx0aGlzLnJlYWRNZW0zMigzNzU4MTU3MDY4KV07Y2FzZSA0OnJldHVybiBlPXIuc2VudCgpLFs0LHRoaXMud3JpdGVNZW0zMigzNzU4MTU3MDY4LDEwMDI3MDA4NHxlKV07Y2FzZSA1OnIuc2VudCgpLHIubGFiZWw9NjtjYXNlIDY6cmV0dXJuWzQsdGhpcy53cml0ZU1lbTMyKDM3NTgxNTczMDgsMCldO2Nhc2UgNzpyZXR1cm4gci5zZW50KCksWzJdfX0pKX0pKX0sZX0oVCk7KHk9dC5GUEJDdHJsTWFza3x8KHQuRlBCQ3RybE1hc2s9e30pKVt5LkVOQUJMRT0xXT1cIkVOQUJMRVwiLHlbeS5LRVk9Ml09XCJLRVlcIjt2YXIgTT1mdW5jdGlvbigpe2Z1bmN0aW9uIHQodCl7dGhpcy5kZXZpY2U9dCx0aGlzLm9zPVwiYnJvd3NlclwiLHRoaXMucGFja2V0U2l6ZT02NH1yZXR1cm4gdC5wcm90b3R5cGUub3Blbj1mdW5jdGlvbigpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbih0KXtyZXR1cm5bMl19KSl9KSl9LHQucHJvdG90eXBlLmNsb3NlPWZ1bmN0aW9uKCl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLmRldmljZS5jbG9zZSgpLFsyXX0pKX0pKX0sdC5wcm90b3R5cGUucmVhZD1mdW5jdGlvbigpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgdCxlLHI9dGhpcztyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihuKXtzd2l0Y2gobi5sYWJlbCl7Y2FzZSAwOnJldHVybls0LG5ldyBQcm9taXNlKChmdW5jdGlvbih0LGUpe3IuZGV2aWNlLnJlYWQoKGZ1bmN0aW9uKHIsbil7aWYocilyZXR1cm4gZShuZXcgRXJyb3IocikpO3Qobil9KSl9KSldO2Nhc2UgMTpyZXR1cm4gdD1uLnNlbnQoKSxlPW5ldyBVaW50OEFycmF5KHQpLmJ1ZmZlcixbMixuZXcgRGF0YVZpZXcoZSldfX0pKX0pKX0sdC5wcm90b3R5cGUud3JpdGU9ZnVuY3Rpb24odCl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciBlLHI7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24obil7Zm9yKGU9ZnVuY3Rpb24odCl7cmV0dXJuIHZvaWQgMCE9PXQuYnVmZmVyfSh0KT90LmJ1ZmZlcjp0LHI9QXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwobmV3IFVpbnQ4QXJyYXkoZSkpO3IubGVuZ3RoPHRoaXMucGFja2V0U2l6ZTspci5wdXNoKDApO2lmKFwid2luMzJcIj09PXRoaXMub3MmJnIudW5zaGlmdCgwKSx0aGlzLmRldmljZS53cml0ZShyKSE9PXIubGVuZ3RoKXRocm93IG5ldyBFcnJvcihcIkluY29ycmVjdCBieXRlY291bnQgd3JpdHRlblwiKTtyZXR1cm5bMl19KSl9KSl9LHR9KCkseD1mdW5jdGlvbigpe2Z1bmN0aW9uIHQodCxlLHIsbil7dm9pZCAwPT09ZSYmKGU9MjU1KSx2b2lkIDA9PT1yJiYocj0xKSx2b2lkIDA9PT1uJiYobj0hMSksdGhpcy5kZXZpY2U9dCx0aGlzLmludGVyZmFjZUNsYXNzPWUsdGhpcy5jb25maWd1cmF0aW9uPXIsdGhpcy5hbHdheXNDb250cm9sVHJhbnNmZXI9bix0aGlzLnBhY2tldFNpemU9NjR9cmV0dXJuIHQucHJvdG90eXBlLmJ1ZmZlclRvRGF0YVZpZXc9ZnVuY3Rpb24odCl7dmFyIGU9bmV3IFVpbnQ4QXJyYXkodCkuYnVmZmVyO3JldHVybiBuZXcgRGF0YVZpZXcoZSl9LHQucHJvdG90eXBlLmlzVmlldz1mdW5jdGlvbih0KXtyZXR1cm4gdm9pZCAwIT09dC5idWZmZXJ9LHQucHJvdG90eXBlLmJ1ZmZlclNvdXJjZVRvQnVmZmVyPWZ1bmN0aW9uKHQpe3ZhciBlPXRoaXMuaXNWaWV3KHQpP3QuYnVmZmVyOnQ7cmV0dXJuIEJ1ZmZlci5mcm9tKGUpfSx0LnByb3RvdHlwZS5leHRlbmRCdWZmZXI9ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzLmlzVmlldyh0KT90LmJ1ZmZlcjp0LG49TWF0aC5taW4oci5ieXRlTGVuZ3RoLGUpLGk9bmV3IFVpbnQ4QXJyYXkobik7cmV0dXJuIGkuc2V0KG5ldyBVaW50OEFycmF5KHIpKSxpfSx0LnByb3RvdHlwZS5vcGVuPWZ1bmN0aW9uKCl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciB0LGUscixuLHMsbyx1PXRoaXM7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24oaSl7c3dpdGNoKGkubGFiZWwpe2Nhc2UgMDpyZXR1cm4gdGhpcy5kZXZpY2Uub3BlbigpLFs0LG5ldyBQcm9taXNlKChmdW5jdGlvbih0LGUpe3UuZGV2aWNlLnNldENvbmZpZ3VyYXRpb24odS5jb25maWd1cmF0aW9uLChmdW5jdGlvbihyKXtyP2UobmV3IEVycm9yKHIpKTp0KCl9KSl9KSldO2Nhc2UgMTppZihpLnNlbnQoKSwhKHQ9dGhpcy5kZXZpY2UuaW50ZXJmYWNlcy5maWx0ZXIoKGZ1bmN0aW9uKHQpe3JldHVybiB0LmRlc2NyaXB0b3IuYkludGVyZmFjZUNsYXNzPT09dS5pbnRlcmZhY2VDbGFzc30pKSkubGVuZ3RoKXRocm93IG5ldyBFcnJvcihcIk5vIHZhbGlkIGludGVyZmFjZXMgZm91bmQuXCIpO2lmKChlPXQuZmluZCgoZnVuY3Rpb24odCl7cmV0dXJuIHQuZW5kcG9pbnRzLmxlbmd0aD4wfSkpKXx8KGU9dFswXSksdGhpcy5pbnRlcmZhY2VOdW1iZXI9ZS5pbnRlcmZhY2VOdW1iZXIsIXRoaXMuYWx3YXlzQ29udHJvbFRyYW5zZmVyKXtmb3Iocj1lLmVuZHBvaW50cyx0aGlzLmVuZHBvaW50SW49dm9pZCAwLHRoaXMuZW5kcG9pbnRPdXQ9dm9pZCAwLG49MCxzPXI7bjxzLmxlbmd0aDtuKyspXCJpblwiIT09KG89c1tuXSkuZGlyZWN0aW9ufHx0aGlzLmVuZHBvaW50SW4/XCJvdXRcIiE9PW8uZGlyZWN0aW9ufHx0aGlzLmVuZHBvaW50T3V0fHwodGhpcy5lbmRwb2ludE91dD1vKTp0aGlzLmVuZHBvaW50SW49bztpZih0aGlzLmVuZHBvaW50SW58fHRoaXMuZW5kcG9pbnRPdXQpdHJ5e2UuY2xhaW0oKX1jYXRjaCh0KXt0aGlzLmVuZHBvaW50SW49dm9pZCAwLHRoaXMuZW5kcG9pbnRPdXQ9dm9pZCAwfX1yZXR1cm5bMl19fSkpfSkpfSx0LnByb3RvdHlwZS5jbG9zZT1mdW5jdGlvbigpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5kZXZpY2UuY2xvc2UoKSxbMl19KSl9KSl9LHQucHJvdG90eXBlLnJlYWQ9ZnVuY3Rpb24oKXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIHQsZT10aGlzO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKHIpe3N3aXRjaChyLmxhYmVsKXtjYXNlIDA6aWYodm9pZCAwPT09dGhpcy5pbnRlcmZhY2VOdW1iZXIpdGhyb3cgbmV3IEVycm9yKFwiTm8gZGV2aWNlIG9wZW5lZFwiKTtyZXR1cm5bNCxuZXcgUHJvbWlzZSgoZnVuY3Rpb24odCxyKXtlLmVuZHBvaW50SW4/ZS5lbmRwb2ludEluLnRyYW5zZmVyKGUucGFja2V0U2l6ZSwoZnVuY3Rpb24oZSxuKXtlP3IoZSk6dChuKX0pKTplLmRldmljZS5jb250cm9sVHJhbnNmZXIoMTYxLDEsMjU2LGUuaW50ZXJmYWNlTnVtYmVyLGUucGFja2V0U2l6ZSwoZnVuY3Rpb24oZSxuKXtlP3IoZSk6bj90KG4pOnIobmV3IEVycm9yKFwiTm8gYnVmZmVyIHJlYWRcIikpfSkpfSkpXTtjYXNlIDE6cmV0dXJuIHQ9ci5zZW50KCksWzIsdGhpcy5idWZmZXJUb0RhdGFWaWV3KHQpXX19KSl9KSl9LHQucHJvdG90eXBlLndyaXRlPWZ1bmN0aW9uKHQpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgZSxyLG49dGhpcztyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihpKXtzd2l0Y2goaS5sYWJlbCl7Y2FzZSAwOmlmKHZvaWQgMD09PXRoaXMuaW50ZXJmYWNlTnVtYmVyKXRocm93IG5ldyBFcnJvcihcIk5vIGRldmljZSBvcGVuZWRcIik7cmV0dXJuIGU9dGhpcy5leHRlbmRCdWZmZXIodCx0aGlzLnBhY2tldFNpemUpLHI9dGhpcy5idWZmZXJTb3VyY2VUb0J1ZmZlcihlKSxbNCxuZXcgUHJvbWlzZSgoZnVuY3Rpb24odCxlKXtuLmVuZHBvaW50T3V0P24uZW5kcG9pbnRPdXQudHJhbnNmZXIociwoZnVuY3Rpb24ocil7aWYocilyZXR1cm4gZShyKTt0KCl9KSk6bi5kZXZpY2UuY29udHJvbFRyYW5zZmVyKDMzLDksNTEyLG4uaW50ZXJmYWNlTnVtYmVyLHIsKGZ1bmN0aW9uKHIpe2lmKHIpcmV0dXJuIGUocik7dCgpfSkpfSkpXTtjYXNlIDE6cmV0dXJuIGkuc2VudCgpLFsyXX19KSl9KSl9LHR9KCksUz1mdW5jdGlvbigpe2Z1bmN0aW9uIHQodCxlLHIsbil7dm9pZCAwPT09ZSYmKGU9MjU1KSx2b2lkIDA9PT1yJiYocj0xKSx2b2lkIDA9PT1uJiYobj0hMSksdGhpcy5kZXZpY2U9dCx0aGlzLmludGVyZmFjZUNsYXNzPWUsdGhpcy5jb25maWd1cmF0aW9uPXIsdGhpcy5hbHdheXNDb250cm9sVHJhbnNmZXI9bix0aGlzLnBhY2tldFNpemU9NjR9cmV0dXJuIHQucHJvdG90eXBlLmV4dGVuZEJ1ZmZlcj1mdW5jdGlvbih0LGUpe3ZhciByPXZvaWQgMCE9PXQuYnVmZmVyP3QuYnVmZmVyOnQsbj1NYXRoLm1pbihyLmJ5dGVMZW5ndGgsZSksaT1uZXcgVWludDhBcnJheShuKTtyZXR1cm4gaS5zZXQobmV3IFVpbnQ4QXJyYXkocikpLGl9LHQucHJvdG90eXBlLm9wZW49ZnVuY3Rpb24oKXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIHQsZSxyLG4scyxvLHU9dGhpcztyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihpKXtzd2l0Y2goaS5sYWJlbCl7Y2FzZSAwOnJldHVybls0LHRoaXMuZGV2aWNlLm9wZW4oKV07Y2FzZSAxOnJldHVybiBpLnNlbnQoKSxbNCx0aGlzLmRldmljZS5zZWxlY3RDb25maWd1cmF0aW9uKHRoaXMuY29uZmlndXJhdGlvbildO2Nhc2UgMjppZihpLnNlbnQoKSwhKHQ9dGhpcy5kZXZpY2UuY29uZmlndXJhdGlvbi5pbnRlcmZhY2VzLmZpbHRlcigoZnVuY3Rpb24odCl7cmV0dXJuIHQuYWx0ZXJuYXRlc1swXS5pbnRlcmZhY2VDbGFzcz09PXUuaW50ZXJmYWNlQ2xhc3N9KSkpLmxlbmd0aCl0aHJvdyBuZXcgRXJyb3IoXCJObyB2YWxpZCBpbnRlcmZhY2VzIGZvdW5kLlwiKTtpZigoZT10LmZpbmQoKGZ1bmN0aW9uKHQpe3JldHVybiB0LmFsdGVybmF0ZXNbMF0uZW5kcG9pbnRzLmxlbmd0aD4wfSkpKXx8KGU9dFswXSksdGhpcy5pbnRlcmZhY2VOdW1iZXI9ZS5pbnRlcmZhY2VOdW1iZXIsIXRoaXMuYWx3YXlzQ29udHJvbFRyYW5zZmVyKWZvcihyPWUuYWx0ZXJuYXRlc1swXS5lbmRwb2ludHMsdGhpcy5lbmRwb2ludEluPXZvaWQgMCx0aGlzLmVuZHBvaW50T3V0PXZvaWQgMCxuPTAscz1yO248cy5sZW5ndGg7bisrKVwiaW5cIiE9PShvPXNbbl0pLmRpcmVjdGlvbnx8dGhpcy5lbmRwb2ludEluP1wib3V0XCIhPT1vLmRpcmVjdGlvbnx8dGhpcy5lbmRwb2ludE91dHx8KHRoaXMuZW5kcG9pbnRPdXQ9byk6dGhpcy5lbmRwb2ludEluPW87cmV0dXJuWzIsdGhpcy5kZXZpY2UuY2xhaW1JbnRlcmZhY2UodGhpcy5pbnRlcmZhY2VOdW1iZXIpXX19KSl9KSl9LHQucHJvdG90eXBlLmNsb3NlPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuZGV2aWNlLmNsb3NlKCl9LHQucHJvdG90eXBlLnJlYWQ9ZnVuY3Rpb24oKXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIHQ7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24oZSl7c3dpdGNoKGUubGFiZWwpe2Nhc2UgMDppZih2b2lkIDA9PT10aGlzLmludGVyZmFjZU51bWJlcil0aHJvdyBuZXcgRXJyb3IoXCJObyBkZXZpY2Ugb3BlbmVkXCIpO3JldHVybiB0aGlzLmVuZHBvaW50SW4/WzQsdGhpcy5kZXZpY2UudHJhbnNmZXJJbih0aGlzLmVuZHBvaW50SW4uZW5kcG9pbnROdW1iZXIsdGhpcy5wYWNrZXRTaXplKV06WzMsMl07Y2FzZSAxOnJldHVybiB0PWUuc2VudCgpLFszLDRdO2Nhc2UgMjpyZXR1cm5bNCx0aGlzLmRldmljZS5jb250cm9sVHJhbnNmZXJJbih7cmVxdWVzdFR5cGU6XCJjbGFzc1wiLHJlY2lwaWVudDpcImludGVyZmFjZVwiLHJlcXVlc3Q6MSx2YWx1ZToyNTYsaW5kZXg6dGhpcy5pbnRlcmZhY2VOdW1iZXJ9LHRoaXMucGFja2V0U2l6ZSldO2Nhc2UgMzp0PWUuc2VudCgpLGUubGFiZWw9NDtjYXNlIDQ6cmV0dXJuWzIsdC5kYXRhXX19KSl9KSl9LHQucHJvdG90eXBlLndyaXRlPWZ1bmN0aW9uKHQpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgZTtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihyKXtzd2l0Y2goci5sYWJlbCl7Y2FzZSAwOmlmKHZvaWQgMD09PXRoaXMuaW50ZXJmYWNlTnVtYmVyKXRocm93IG5ldyBFcnJvcihcIk5vIGRldmljZSBvcGVuZWRcIik7cmV0dXJuIGU9dGhpcy5leHRlbmRCdWZmZXIodCx0aGlzLnBhY2tldFNpemUpLHRoaXMuZW5kcG9pbnRPdXQ/WzQsdGhpcy5kZXZpY2UudHJhbnNmZXJPdXQodGhpcy5lbmRwb2ludE91dC5lbmRwb2ludE51bWJlcixlKV06WzMsMl07Y2FzZSAxOnJldHVybiByLnNlbnQoKSxbMyw0XTtjYXNlIDI6cmV0dXJuWzQsdGhpcy5kZXZpY2UuY29udHJvbFRyYW5zZmVyT3V0KHtyZXF1ZXN0VHlwZTpcImNsYXNzXCIscmVjaXBpZW50OlwiaW50ZXJmYWNlXCIscmVxdWVzdDo5LHZhbHVlOjUxMixpbmRleDp0aGlzLmludGVyZmFjZU51bWJlcn0sZSldO2Nhc2UgMzpyLnNlbnQoKSxyLmxhYmVsPTQ7Y2FzZSA0OnJldHVyblsyXX19KSl9KSl9LHR9KCk7dC5BREk9VCx0LkNtc2lzREFQPWcsdC5Db3J0ZXhNPV8sdC5EQVBMaW5rPVAsdC5ERUZBVUxUX0NMT0NLX0ZSRVFVRU5DWT1tLHQuSElEPU0sdC5VU0I9eCx0LldlYlVTQj1TLE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0LFwiX19lc01vZHVsZVwiLHt2YWx1ZTohMH0pfSkpO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGFwLnVtZC5qcy5tYXBcbiIsIihmdW5jdGlvbihhLGIpe2lmKFwiZnVuY3Rpb25cIj09dHlwZW9mIGRlZmluZSYmZGVmaW5lLmFtZClkZWZpbmUoW10sYik7ZWxzZSBpZihcInVuZGVmaW5lZFwiIT10eXBlb2YgZXhwb3J0cyliKCk7ZWxzZXtiKCksYS5GaWxlU2F2ZXI9e2V4cG9ydHM6e319LmV4cG9ydHN9fSkodGhpcyxmdW5jdGlvbigpe1widXNlIHN0cmljdFwiO2Z1bmN0aW9uIGIoYSxiKXtyZXR1cm5cInVuZGVmaW5lZFwiPT10eXBlb2YgYj9iPXthdXRvQm9tOiExfTpcIm9iamVjdFwiIT10eXBlb2YgYiYmKGNvbnNvbGUud2FybihcIkRlcHJlY2F0ZWQ6IEV4cGVjdGVkIHRoaXJkIGFyZ3VtZW50IHRvIGJlIGEgb2JqZWN0XCIpLGI9e2F1dG9Cb206IWJ9KSxiLmF1dG9Cb20mJi9eXFxzKig/OnRleHRcXC9cXFMqfGFwcGxpY2F0aW9uXFwveG1sfFxcUypcXC9cXFMqXFwreG1sKVxccyo7LipjaGFyc2V0XFxzKj1cXHMqdXRmLTgvaS50ZXN0KGEudHlwZSk/bmV3IEJsb2IoW1wiXFx1RkVGRlwiLGFdLHt0eXBlOmEudHlwZX0pOmF9ZnVuY3Rpb24gYyhhLGIsYyl7dmFyIGQ9bmV3IFhNTEh0dHBSZXF1ZXN0O2Qub3BlbihcIkdFVFwiLGEpLGQucmVzcG9uc2VUeXBlPVwiYmxvYlwiLGQub25sb2FkPWZ1bmN0aW9uKCl7ZyhkLnJlc3BvbnNlLGIsYyl9LGQub25lcnJvcj1mdW5jdGlvbigpe2NvbnNvbGUuZXJyb3IoXCJjb3VsZCBub3QgZG93bmxvYWQgZmlsZVwiKX0sZC5zZW5kKCl9ZnVuY3Rpb24gZChhKXt2YXIgYj1uZXcgWE1MSHR0cFJlcXVlc3Q7Yi5vcGVuKFwiSEVBRFwiLGEsITEpO3RyeXtiLnNlbmQoKX1jYXRjaChhKXt9cmV0dXJuIDIwMDw9Yi5zdGF0dXMmJjI5OT49Yi5zdGF0dXN9ZnVuY3Rpb24gZShhKXt0cnl7YS5kaXNwYXRjaEV2ZW50KG5ldyBNb3VzZUV2ZW50KFwiY2xpY2tcIikpfWNhdGNoKGMpe3ZhciBiPWRvY3VtZW50LmNyZWF0ZUV2ZW50KFwiTW91c2VFdmVudHNcIik7Yi5pbml0TW91c2VFdmVudChcImNsaWNrXCIsITAsITAsd2luZG93LDAsMCwwLDgwLDIwLCExLCExLCExLCExLDAsbnVsbCksYS5kaXNwYXRjaEV2ZW50KGIpfX12YXIgZj1cIm9iamVjdFwiPT10eXBlb2Ygd2luZG93JiZ3aW5kb3cud2luZG93PT09d2luZG93P3dpbmRvdzpcIm9iamVjdFwiPT10eXBlb2Ygc2VsZiYmc2VsZi5zZWxmPT09c2VsZj9zZWxmOlwib2JqZWN0XCI9PXR5cGVvZiBnbG9iYWwmJmdsb2JhbC5nbG9iYWw9PT1nbG9iYWw/Z2xvYmFsOnZvaWQgMCxhPWYubmF2aWdhdG9yJiYvTWFjaW50b3NoLy50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpJiYvQXBwbGVXZWJLaXQvLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCkmJiEvU2FmYXJpLy50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpLGc9Zi5zYXZlQXN8fChcIm9iamVjdFwiIT10eXBlb2Ygd2luZG93fHx3aW5kb3chPT1mP2Z1bmN0aW9uKCl7fTpcImRvd25sb2FkXCJpbiBIVE1MQW5jaG9yRWxlbWVudC5wcm90b3R5cGUmJiFhP2Z1bmN0aW9uKGIsZyxoKXt2YXIgaT1mLlVSTHx8Zi53ZWJraXRVUkwsaj1kb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYVwiKTtnPWd8fGIubmFtZXx8XCJkb3dubG9hZFwiLGouZG93bmxvYWQ9ZyxqLnJlbD1cIm5vb3BlbmVyXCIsXCJzdHJpbmdcIj09dHlwZW9mIGI/KGouaHJlZj1iLGoub3JpZ2luPT09bG9jYXRpb24ub3JpZ2luP2Uoaik6ZChqLmhyZWYpP2MoYixnLGgpOmUoaixqLnRhcmdldD1cIl9ibGFua1wiKSk6KGouaHJlZj1pLmNyZWF0ZU9iamVjdFVSTChiKSxzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7aS5yZXZva2VPYmplY3RVUkwoai5ocmVmKX0sNEU0KSxzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7ZShqKX0sMCkpfTpcIm1zU2F2ZU9yT3BlbkJsb2JcImluIG5hdmlnYXRvcj9mdW5jdGlvbihmLGcsaCl7aWYoZz1nfHxmLm5hbWV8fFwiZG93bmxvYWRcIixcInN0cmluZ1wiIT10eXBlb2YgZiluYXZpZ2F0b3IubXNTYXZlT3JPcGVuQmxvYihiKGYsaCksZyk7ZWxzZSBpZihkKGYpKWMoZixnLGgpO2Vsc2V7dmFyIGk9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImFcIik7aS5ocmVmPWYsaS50YXJnZXQ9XCJfYmxhbmtcIixzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7ZShpKX0pfX06ZnVuY3Rpb24oYixkLGUsZyl7aWYoZz1nfHxvcGVuKFwiXCIsXCJfYmxhbmtcIiksZyYmKGcuZG9jdW1lbnQudGl0bGU9Zy5kb2N1bWVudC5ib2R5LmlubmVyVGV4dD1cImRvd25sb2FkaW5nLi4uXCIpLFwic3RyaW5nXCI9PXR5cGVvZiBiKXJldHVybiBjKGIsZCxlKTt2YXIgaD1cImFwcGxpY2F0aW9uL29jdGV0LXN0cmVhbVwiPT09Yi50eXBlLGk9L2NvbnN0cnVjdG9yL2kudGVzdChmLkhUTUxFbGVtZW50KXx8Zi5zYWZhcmksaj0vQ3JpT1NcXC9bXFxkXSsvLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCk7aWYoKGp8fGgmJml8fGEpJiZcInVuZGVmaW5lZFwiIT10eXBlb2YgRmlsZVJlYWRlcil7dmFyIGs9bmV3IEZpbGVSZWFkZXI7ay5vbmxvYWRlbmQ9ZnVuY3Rpb24oKXt2YXIgYT1rLnJlc3VsdDthPWo/YTphLnJlcGxhY2UoL15kYXRhOlteO10qOy8sXCJkYXRhOmF0dGFjaG1lbnQvZmlsZTtcIiksZz9nLmxvY2F0aW9uLmhyZWY9YTpsb2NhdGlvbj1hLGc9bnVsbH0say5yZWFkQXNEYXRhVVJMKGIpfWVsc2V7dmFyIGw9Zi5VUkx8fGYud2Via2l0VVJMLG09bC5jcmVhdGVPYmplY3RVUkwoYik7Zz9nLmxvY2F0aW9uPW06bG9jYXRpb24uaHJlZj1tLGc9bnVsbCxzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7bC5yZXZva2VPYmplY3RVUkwobSl9LDRFNCl9fSk7Zi5zYXZlQXM9Zy5zYXZlQXM9ZyxcInVuZGVmaW5lZFwiIT10eXBlb2YgbW9kdWxlJiYobW9kdWxlLmV4cG9ydHM9Zyl9KTtcblxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9RmlsZVNhdmVyLm1pbi5qcy5tYXAiLCIvKiEgaWVlZTc1NC4gQlNELTMtQ2xhdXNlIExpY2Vuc2UuIEZlcm9zcyBBYm91a2hhZGlqZWggPGh0dHBzOi8vZmVyb3NzLm9yZy9vcGVuc291cmNlPiAqL1xuZXhwb3J0cy5yZWFkID0gZnVuY3Rpb24gKGJ1ZmZlciwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG1cbiAgdmFyIGVMZW4gPSAobkJ5dGVzICogOCkgLSBtTGVuIC0gMVxuICB2YXIgZU1heCA9ICgxIDw8IGVMZW4pIC0gMVxuICB2YXIgZUJpYXMgPSBlTWF4ID4+IDFcbiAgdmFyIG5CaXRzID0gLTdcbiAgdmFyIGkgPSBpc0xFID8gKG5CeXRlcyAtIDEpIDogMFxuICB2YXIgZCA9IGlzTEUgPyAtMSA6IDFcbiAgdmFyIHMgPSBidWZmZXJbb2Zmc2V0ICsgaV1cblxuICBpICs9IGRcblxuICBlID0gcyAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKVxuICBzID4+PSAoLW5CaXRzKVxuICBuQml0cyArPSBlTGVuXG4gIGZvciAoOyBuQml0cyA+IDA7IGUgPSAoZSAqIDI1NikgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCkge31cblxuICBtID0gZSAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKVxuICBlID4+PSAoLW5CaXRzKVxuICBuQml0cyArPSBtTGVuXG4gIGZvciAoOyBuQml0cyA+IDA7IG0gPSAobSAqIDI1NikgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCkge31cblxuICBpZiAoZSA9PT0gMCkge1xuICAgIGUgPSAxIC0gZUJpYXNcbiAgfSBlbHNlIGlmIChlID09PSBlTWF4KSB7XG4gICAgcmV0dXJuIG0gPyBOYU4gOiAoKHMgPyAtMSA6IDEpICogSW5maW5pdHkpXG4gIH0gZWxzZSB7XG4gICAgbSA9IG0gKyBNYXRoLnBvdygyLCBtTGVuKVxuICAgIGUgPSBlIC0gZUJpYXNcbiAgfVxuICByZXR1cm4gKHMgPyAtMSA6IDEpICogbSAqIE1hdGgucG93KDIsIGUgLSBtTGVuKVxufVxuXG5leHBvcnRzLndyaXRlID0gZnVuY3Rpb24gKGJ1ZmZlciwgdmFsdWUsIG9mZnNldCwgaXNMRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtLCBjXG4gIHZhciBlTGVuID0gKG5CeXRlcyAqIDgpIC0gbUxlbiAtIDFcbiAgdmFyIGVNYXggPSAoMSA8PCBlTGVuKSAtIDFcbiAgdmFyIGVCaWFzID0gZU1heCA+PiAxXG4gIHZhciBydCA9IChtTGVuID09PSAyMyA/IE1hdGgucG93KDIsIC0yNCkgLSBNYXRoLnBvdygyLCAtNzcpIDogMClcbiAgdmFyIGkgPSBpc0xFID8gMCA6IChuQnl0ZXMgLSAxKVxuICB2YXIgZCA9IGlzTEUgPyAxIDogLTFcbiAgdmFyIHMgPSB2YWx1ZSA8IDAgfHwgKHZhbHVlID09PSAwICYmIDEgLyB2YWx1ZSA8IDApID8gMSA6IDBcblxuICB2YWx1ZSA9IE1hdGguYWJzKHZhbHVlKVxuXG4gIGlmIChpc05hTih2YWx1ZSkgfHwgdmFsdWUgPT09IEluZmluaXR5KSB7XG4gICAgbSA9IGlzTmFOKHZhbHVlKSA/IDEgOiAwXG4gICAgZSA9IGVNYXhcbiAgfSBlbHNlIHtcbiAgICBlID0gTWF0aC5mbG9vcihNYXRoLmxvZyh2YWx1ZSkgLyBNYXRoLkxOMilcbiAgICBpZiAodmFsdWUgKiAoYyA9IE1hdGgucG93KDIsIC1lKSkgPCAxKSB7XG4gICAgICBlLS1cbiAgICAgIGMgKj0gMlxuICAgIH1cbiAgICBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIHZhbHVlICs9IHJ0IC8gY1xuICAgIH0gZWxzZSB7XG4gICAgICB2YWx1ZSArPSBydCAqIE1hdGgucG93KDIsIDEgLSBlQmlhcylcbiAgICB9XG4gICAgaWYgKHZhbHVlICogYyA+PSAyKSB7XG4gICAgICBlKytcbiAgICAgIGMgLz0gMlxuICAgIH1cblxuICAgIGlmIChlICsgZUJpYXMgPj0gZU1heCkge1xuICAgICAgbSA9IDBcbiAgICAgIGUgPSBlTWF4XG4gICAgfSBlbHNlIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgbSA9ICgodmFsdWUgKiBjKSAtIDEpICogTWF0aC5wb3coMiwgbUxlbilcbiAgICAgIGUgPSBlICsgZUJpYXNcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IHZhbHVlICogTWF0aC5wb3coMiwgZUJpYXMgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pXG4gICAgICBlID0gMFxuICAgIH1cbiAgfVxuXG4gIGZvciAoOyBtTGVuID49IDg7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IG0gJiAweGZmLCBpICs9IGQsIG0gLz0gMjU2LCBtTGVuIC09IDgpIHt9XG5cbiAgZSA9IChlIDw8IG1MZW4pIHwgbVxuICBlTGVuICs9IG1MZW5cbiAgZm9yICg7IGVMZW4gPiAwOyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBlICYgMHhmZiwgaSArPSBkLCBlIC89IDI1NiwgZUxlbiAtPSA4KSB7fVxuXG4gIGJ1ZmZlcltvZmZzZXQgKyBpIC0gZF0gfD0gcyAqIDEyOFxufVxuIiwiZXhwb3J0IGNsYXNzIFR3b1BhbmVsQ29udGFpbmVye1xuXG4gICAgc3RhdGljIE1JTl9TUEFDRSA9IDUwO1xuXG4gICAgcHJpdmF0ZSBsZWZ0X2NvbnRhaW5lciA6IEhUTUxFbGVtZW50O1xuICAgIHByaXZhdGUgc2VwYXJhdG9yIDogSFRNTEVsZW1lbnQ7XG4gICAgcHJpdmF0ZSByaWdodF9jb250YWluZXIgOiBIVE1MRWxlbWVudDtcbiAgICBwcml2YXRlIGlzX21vdmluZyA6IGJvb2xlYW4gPSBmYWxzZTtcblxuICAgIGNvbnN0cnVjdG9yKGxlZnRfY29udGFpbmVyOiBIVE1MRWxlbWVudCwgc2VwYXJhdG9yOiBIVE1MRWxlbWVudCwgcmlnaHRfY29udGFpbmVyOiBIVE1MRWxlbWVudCl7XG4gICAgICAgIHRoaXMubGVmdF9jb250YWluZXIgPSBsZWZ0X2NvbnRhaW5lcjtcbiAgICAgICAgdGhpcy5zZXBhcmF0b3IgPSBzZXBhcmF0b3I7XG4gICAgICAgIHRoaXMucmlnaHRfY29udGFpbmVyID0gcmlnaHRfY29udGFpbmVyO1xuXG4gICAgICAgIHRoaXMuc2VwYXJhdG9yLmFkZEV2ZW50TGlzdGVuZXIoIFwibW91c2Vkb3duXCIsICgpID0+IHsgdGhpcy5pc19tb3ZpbmcgPSB0cnVlOyB9ICk7XG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoIFwibW91c2V1cFwiLCAoKSA9PiB7IHRoaXMuaXNfbW92aW5nID0gZmFsc2U7IH0gKTtcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lciggXCJtb3VzZW1vdmVcIiwgKGV2dCkgPT4geyB0aGlzLm1vdXNlX21vdmUoZXZ0KTsgfSApO1xuICAgIH1cblxuICAgIG1vdXNlX21vdmUoZXZ0OiBNb3VzZUV2ZW50KXtcbiAgICAgICAgaWYoICF0aGlzLmlzX21vdmluZyApeyByZXR1cm47IH1cblxuICAgICAgICBsZXQgbmV3UG9zWCA9IE1hdGgubWF4KCBUd29QYW5lbENvbnRhaW5lci5NSU5fU1BBQ0UsIE1hdGgubWluKGV2dC5jbGllbnRYLCBkb2N1bWVudC5ib2R5LmNsaWVudFdpZHRoIC0gVHdvUGFuZWxDb250YWluZXIuTUlOX1NQQUNFKSk7XG5cbiAgICAgICAgdGhpcy5zZXRfcGFuZWxfc2l6ZShuZXdQb3NYKTtcbiAgICB9XG5cbiAgICBzZXRfcGFuZWxfc2l6ZShsZWZ0X3NpemU6IG51bWJlcil7XG4gICAgICAgIGxldCBwZXJjZW50ID0gKGxlZnRfc2l6ZSAvIGRvY3VtZW50LmJvZHkuY2xpZW50V2lkdGgpICogMTAwO1xuXG4gICAgICAgIHRoaXMuc2VwYXJhdG9yLnN0eWxlLmxlZnQgPSBwZXJjZW50ICsgXCIlXCI7XG4gICAgICAgIHRoaXMubGVmdF9jb250YWluZXIuc3R5bGUud2lkdGggPSBwZXJjZW50ICsgXCIlXCI7XG4gICAgICAgIHRoaXMucmlnaHRfY29udGFpbmVyLnN0eWxlLndpZHRoID0gYGNhbGMoJHsxMDAtcGVyY2VudH0lIC0gJHt0aGlzLnNlcGFyYXRvci5jbGllbnRXaWR0aH1weClgO1xuICAgIH1cblxuICAgIGhpZGVfcmlnaHRfcGFuZWwoKXtcbiAgICAgICAgdGhpcy5yaWdodF9jb250YWluZXIuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xuICAgICAgICB0aGlzLnNlcGFyYXRvci5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XG4gICAgICAgIHRoaXMubGVmdF9jb250YWluZXIuc3R5bGUud2lkdGggPSBcIjEwMCVcIjtcbiAgICB9XG5cbiAgICBzaG93X3JpZ2h0X3BhbmVsKCl7XG4gICAgICAgIHRoaXMucmlnaHRfY29udGFpbmVyLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XG4gICAgICAgIHRoaXMuc2VwYXJhdG9yLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XG4gICAgICAgIHRoaXMuc2V0X3BhbmVsX3NpemUoNTApO1xuICAgIH1cbn0iLCJpbXBvcnQgeyBPbkNvbm5lY3Rpb25DaGFuZ2VDYWxsYmFjayB9IGZyb20gXCIuLi9jb21tb25cIjtcbmltcG9ydCB7IERhcExpbmtXcmFwcGVyIH0gZnJvbSBcIi4uL2RhcGxpbmtcIjtcbmltcG9ydCB7IEFjdGlvbiB9IGZyb20gXCIuL2FjdGlvblwiO1xuXG5leHBvcnQgY2xhc3MgQWN0aW9uQ29ubmVjdGlvbiBpbXBsZW1lbnRzIEFjdGlvbiB7XG5cbiAgICBwcml2YXRlIGRhcGxpbms6IERhcExpbmtXcmFwcGVyO1xuICAgIHByaXZhdGUgaXNfY29ubmVjdGVkOiBib29sZWFuO1xuXG4gICAgY29uc3RydWN0b3IoZGFwbGluazogRGFwTGlua1dyYXBwZXIpe1xuICAgICAgICB0aGlzLmRhcGxpbmsgPSBkYXBsaW5rO1xuXG4gICAgICAgIHRoaXMuaXNfY29ubmVjdGVkID0gZmFsc2U7XG4gICAgICAgIGRhcGxpbmsuYWRkQ29ubmVjdGlvbkNoYW5nZUxpc3RlbmVyKCAoaXNfY29ubikgPT4gdGhpcy5vbkNvbm5lY3Rpb25DaGFuZ2UoaXNfY29ubikgKTtcbiAgICB9XG5cbiAgICBhc3luYyBjb25uZWN0KCkgOiBQcm9taXNlPGJvb2xlYW4+e1xuICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5kYXBsaW5rLmNvbm5lY3QoKTtcbiAgICB9XG5cbiAgICBhc3luYyBkaXNjb25uZWN0KCkgOiBQcm9taXNlPGJvb2xlYW4+e1xuICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5kYXBsaW5rLmRpc2Nvbm5lY3QoKTtcbiAgICB9XG5cbiAgICBhc3luYyBydW4oKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgICAgIGlmKCB0aGlzLmlzX2Nvbm5lY3RlZCApe1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGlzY29ubmVjdCgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb25uZWN0KCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIG9uQ29ubmVjdGlvbkNoYW5nZShpc19jb25uZWN0ZWQ6IGJvb2xlYW4pe1xuICAgICAgICB0aGlzLmlzX2Nvbm5lY3RlZCA9IGlzX2Nvbm5lY3RlZDtcbiAgICB9XG59IiwiaW1wb3J0IHsgR2V0U2NyaXB0Q2FsbGJhY2ssIHRvSGV4U3RyaW5nIH0gZnJvbSBcIi4uL2NvbW1vblwiO1xuaW1wb3J0IHsgRmF0RlMgfSBmcm9tIFwiLi4vbWljcm9GQVQvZmF0XCI7XG5cbmltcG9ydCB7IHNhdmVBcyB9IGZyb20gXCJmaWxlLXNhdmVyXCI7XG5pbXBvcnQgeyBEYXBMaW5rV3JhcHBlciB9IGZyb20gXCIuLi9kYXBsaW5rXCI7XG5pbXBvcnQgeyBBY3Rpb24gfSBmcm9tIFwiLi9hY3Rpb25cIjtcbmltcG9ydCB7IFNlcmlhbE91dHB1dCB9IGZyb20gXCIuLi9zZXJpYWxPdXRwdXRcIjtcbmltcG9ydCB7IElIZXggfSBmcm9tIFwiLi4vaWhleF91dGlsXCI7XG5pbXBvcnQgeyBQcm9ncmVzc0RpYWxvZywgUHJvZ3Jlc3NNZXNzYWdlVHlwZSB9IGZyb20gXCIuLi9wcm9ncmVzc19kaWFsb2dcIjtcbmltcG9ydCB7IEFsZXJ0RGlhbG9nLCBBbGVydERpYWxvZ0ljb24gfSBmcm9tIFwiLi4vYWxlcnRfZGlhbG9nXCI7XG5cbmNsYXNzIEZhdEZpbGUge1xuICAgIG5hbWU6IHN0cmluZyA9IFwiXCI7XG4gICAgZXh0ZW5zaW9uOiBzdHJpbmcgPSBcIlwiO1xuICAgIGlzQmluYXJ5OiBib29sZWFuID0gZmFsc2U7XG4gICAgcGF0aDogc3RyaW5nID0gXCJcIjtcbn1cblxuZXhwb3J0IGNsYXNzIEFjdGlvbkZsYXNoIGltcGxlbWVudHMgQWN0aW9uIHtcblxuICAgIHN0YXRpYyByZWFkb25seSBGTEFTSF9TVEFSVF9BRERSRVNTIDogbnVtYmVyID0gMHgwODAwMDAwMDtcblxuXG4gICAgcHJpdmF0ZSBnZXRfc2NyaXB0X2NiOiBHZXRTY3JpcHRDYWxsYmFjaztcbiAgICBwcml2YXRlIGRhcGxpbms6IERhcExpbmtXcmFwcGVyO1xuICAgIHByaXZhdGUgc2VyaWFsX291cHV0OiBTZXJpYWxPdXRwdXQ7XG4gICAgcHJpdmF0ZSBkaWFsb2c6IFByb2dyZXNzRGlhbG9nO1xuXG4gICAgY29uc3RydWN0b3IoZGFwbGluazogRGFwTGlua1dyYXBwZXIsIHNlcmlhbF9vdXRwdXQ6IFNlcmlhbE91dHB1dCwgZ2V0X3NjcmlwdDogR2V0U2NyaXB0Q2FsbGJhY2spe1xuICAgICAgICB0aGlzLmdldF9zY3JpcHRfY2IgPSBnZXRfc2NyaXB0O1xuICAgICAgICB0aGlzLmRhcGxpbmsgPSBkYXBsaW5rO1xuICAgICAgICB0aGlzLnNlcmlhbF9vdXB1dCA9IHNlcmlhbF9vdXRwdXQ7XG4gICAgICAgIHRoaXMuZGlhbG9nID0gbmV3IFByb2dyZXNzRGlhbG9nKCk7XG4gICAgfVxuXG4gICAgYXN5bmMgcnVuKCkgOiBQcm9taXNlPGJvb2xlYW4+e1xuICAgICAgICBpZiggdGhpcy5kYXBsaW5rLmlzQ29ubmVjdGVkKCkgKVxuICAgICAgICB7XG4gICAgICAgICAgICB0aGlzLmRpYWxvZy5vcGVuKCk7XG4gICAgICAgICAgICB0aGlzLmRpYWxvZy5hZGRJbmZvKFwiU2VhcmNoaW5nIGZvciBNaWNyb1B5dGhvbi4uLlwiKTtcblxuICAgICAgICAgICAgaWYoIGF3YWl0IHRoaXMuZGFwbGluay5pc01pY3JvcHl0aG9uT25UYXJnZXQoKSApe1xuICAgICAgICAgICAgICAgIHRoaXMuZGlhbG9nLmFkZEluZm8oXCJNaWNyb1B5dGhvbiB3YXMgZm91bmQuXCIpO1xuICAgICAgICAgICAgICAgIHRoaXMuZGlhbG9nLmFkZEluZm8oXCJGbGFzaGluZyBweXRob24gc2NyaXB0c1wiKTtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmRhcGxpbmsuZmxhc2hNYWluKCAgIHRoaXMuZ2V0X3NjcmlwdF9jYigpLCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChwcmc6IG51bWJlcikgPT4gdGhpcy5kaWFsb2cuc2V0UHJvZ3Jlc3NWYWx1ZShwcmcqMTAwKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRpYWxvZy5hZGRJbmZvKFwiW0ZsYXNoTWFpbl0gRXJyb3I6IFwiICsgZXJyLCBQcm9ncmVzc01lc3NhZ2VUeXBlLkVSUk9SKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZGlhbG9nLmFkZEluZm8oXCJUcnkgdW5wbHVnZ2luZyBhbmQgcmVwbHVnZ2luZyB5b3VyIGJvYXJkLi4uXCIsIFByb2dyZXNzTWVzc2FnZVR5cGUuRVJST1IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXJpYWxfb3VwdXQuY2xlYXIoKTtcbiAgICAgICAgICAgICAgICB0aGlzLmRpYWxvZy5zaG93Q2xvc2VCdXR0b24oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgdGhpcy5kaWFsb2cuYWRkSW5mbyhcIk1pY3JvUHl0aG9uIHdhcyBub3QgZm91bmQuLi4gUmVmbGFzaCBldmVyeXRoaW5nLlwiLCBQcm9ncmVzc01lc3NhZ2VUeXBlLldBUk5JTkcpO1xuICAgICAgICAgICAgICAgIHRoaXMuZGlhbG9nLmFkZEluZm8oXCJGbGFzaGluZyBNaWNyb1B5dGhvbi4uLlwiKTtcblxuICAgICAgICAgICAgICAgIGxldCBiaW4gPSBhd2FpdCB0aGlzLmdlbmVyYXRlQmluYXJ5KCk7XG5cbiAgICAgICAgICAgICAgICBpZiggYmluID09IG51bGwgKXtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kaWFsb2cuYWRkSW5mbyhcIkZhaWxlZCB0byBnZW5lcmF0ZSBiaW5hcnkuLi4gQWJvcnRcIilcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGhleCA9IG5ldyBJSGV4KEFjdGlvbkZsYXNoLkZMQVNIX1NUQVJUX0FERFJFU1MpLnBhcnNlQmluKGJpbik7XG5cbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5kYXBsaW5rLmZsYXNoKCAgIG5ldyBUZXh0RW5jb2RlcigpLmVuY29kZShoZXgpLCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChwcmc6IG51bWJlcikgPT4gIHRoaXMuZGlhbG9nLnNldFByb2dyZXNzVmFsdWUocHJnKjEwMCksIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZGlhbG9nLmFkZEluZm8oXCJbRmxhc2hdIEVycm9yOiBcIiArIGVyciwgUHJvZ3Jlc3NNZXNzYWdlVHlwZS5FUlJPUilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRpYWxvZy5hZGRJbmZvKFwiVHJ5IHVucGx1Z2dpbmcgYW5kIHJlcGx1Z2dpbmcgeW91ciBib2FyZC4uLlwiLCBQcm9ncmVzc01lc3NhZ2VUeXBlLkVSUk9SKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0aGlzLmRpYWxvZy5zaG93Q2xvc2VCdXR0b24oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgbGV0IGJpbiA9IGF3YWl0IHRoaXMuZ2VuZXJhdGVCaW5hcnkoKTtcbiAgICAgICAgICAgIGlmKCBiaW4gIT0gbnVsbCApe1xuICAgICAgICAgICAgICAgIHNhdmVBcyggbmV3IEJsb2IoIFtuZXcgSUhleChBY3Rpb25GbGFzaC5GTEFTSF9TVEFSVF9BRERSRVNTKS5wYXJzZUJpbihiaW4pXSApLCBcImZsYXNoLmhleFwiICk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGdlbmVyYXRlQmluYXJ5KCkgOiBQcm9taXNlPFVpbnQ4QXJyYXkgfCBudWxsPntcbiAgICAgICAgbGV0IGZhdCA9IG5ldyBGYXRGUyhcIlBZQkZMQVNIXCIpO1xuICAgICAgICBsZXQgYmFzZSA6IEFycmF5QnVmZmVyO1xuXG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIGxldCBmaWxlcyA6IEZhdEZpbGVbXSA9IGF3YWl0IHRoaXMucmVhZEZpbGVBc0pTT04oXCJhc3NldHMvZmF0Lmpzb25cIik7IC8vSlNPTi5wYXJzZSggYXdhaXQgdGhpcy5yZWFkRmlsZUFzVGV4dChcImFzc2V0cy9mYXQuanNvblwiKSlcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZmlsZXMuZm9yRWFjaCggYXN5bmMgKGZpbGUpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhmaWxlKVxuXG4gICAgICAgICAgICAgICAgaWYoZmlsZS5pc0JpbmFyeSlcbiAgICAgICAgICAgICAgICAgICAgZmF0LmFkZEJpbmFyeUZpbGUoZmlsZS5uYW1lLCBmaWxlLmV4dGVuc2lvbiwgbmV3IFVpbnQ4QXJyYXkoIGF3YWl0IHRoaXMucmVhZEZpbGVBc0JpbmFyeShmaWxlLnBhdGgpKSApXG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICBmYXQuYWRkRmlsZShmaWxlLm5hbWUsIGZpbGUuZXh0ZW5zaW9uLCBhd2FpdCB0aGlzLnJlYWRGaWxlQXNUZXh0KGZpbGUucGF0aCkpXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgYmFzZSA9IGF3YWl0IHRoaXMucmVhZEZpbGVBc0JpbmFyeShcImFzc2V0cy9taWNyb3B5dGhvbl9MNDc1X3YxLjE4X1BBRERFRC5iaW5cIik7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2goZTogYW55KXtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJbR0VORVJBVEUgQklOQVJZXTogXCIsIGUpO1xuICAgICAgICAgICAgbmV3IEFsZXJ0RGlhbG9nKFwiRmF0YWwgZXJyb3JcIiwgYEFuIGVycm9yIG9jY3VyZWQgZHVyaW5nIHRoZSBpbWFnZSBnZW5lcmF0aW9uOiA8YnIvPjxkaXYgY2xhc3M9XCJjaXRhdGlvbi1lcnJvclwiPiR7ZS5tZXNzYWdlfTwvZGl2Pjxici8+Q2hlY2sgeW91ciBpbnRlcm5ldCBjb25uZWN0aW9uIG9yIHJlc3RhcnQgeW91ciBicm93c2VyLmAsIEFsZXJ0RGlhbG9nSWNvbi5FUlJPUikub3BlbigpO1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICBmYXQuYWRkRmlsZShcIk1BSU5cIiwgXCJQWVwiLCB0aGlzLmdldF9zY3JpcHRfY2IoKSk7XG5cbiAgICAgICAgbGV0IGZhdF9wYXJ0ID0gZmF0LmdlbmVyYXRlX2JpbmFyeSgpO1xuXG4gICAgICAgIGxldCBiaW5fZmlsZSA9IG5ldyBVaW50OEFycmF5KCBiYXNlLmJ5dGVMZW5ndGggKyBmYXRfcGFydC5sZW5ndGgpO1xuICAgICAgICBiaW5fZmlsZS5zZXQobmV3IFVpbnQ4QXJyYXkoYmFzZSksIDApO1xuICAgICAgICBiaW5fZmlsZS5zZXQobmV3IFVpbnQ4QXJyYXkoZmF0X3BhcnQpLCBiYXNlLmJ5dGVMZW5ndGgpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKGBCaW5hcnkgc2l6ZSA6ICAke2Jpbl9maWxlLmJ5dGVMZW5ndGh9IGJ5dGVzYClcblxuICAgICAgICByZXR1cm4gYmluX2ZpbGU7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyByZWFkRmlsZUFzSlNPTihmaWxlOiBzdHJpbmcpIDogUHJvbWlzZTxhbnk+IHtcbiAgICAgICAgbGV0IHJlcCA9IGF3YWl0IGZldGNoKGZpbGUpO1xuICAgICAgICByZXR1cm4gcmVwLmpzb24oKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHJlYWRGaWxlQXNUZXh0KGZpbGU6IHN0cmluZykgOiBQcm9taXNlPHN0cmluZz4ge1xuICAgICAgICBsZXQgcmVwID0gYXdhaXQgZmV0Y2goZmlsZSk7XG4gICAgICAgIHJldHVybiByZXAudGV4dCgpO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgcmVhZEZpbGVBc0JpbmFyeShmaWxlOiBzdHJpbmcpIDogUHJvbWlzZTxBcnJheUJ1ZmZlcj4ge1xuICAgICAgICBsZXQgcmVwID0gYXdhaXQgZmV0Y2goZmlsZSk7XG4gICAgICAgIHJldHVybiByZXAuYXJyYXlCdWZmZXIoKTtcbiAgICB9XG59IiwiaW1wb3J0IHsgQWN0aW9uIH0gZnJvbSBcIi4vYWN0aW9uXCI7XG5cbmV4cG9ydCBjbGFzcyBBY3Rpb25Mb2FkIGltcGxlbWVudHMgQWN0aW9uIHtcblxuICAgIHByaXZhdGUgZmlsZVJlYWRlciA6IEZpbGVSZWFkZXI7XG4gICAgcHJpdmF0ZSBmaWxlX2lucHV0IDogSFRNTElucHV0RWxlbWVudDtcblxuICAgIGNvbnN0cnVjdG9yKCBvbkZpbGVSZWFkZWQ6IChkYXRhOiBzdHJpbmcpID0+IHZvaWQpe1xuXG4gICAgICAgIHRoaXMuZmlsZVJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG5cbiAgICAgICAgbGV0IGQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICBkLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcbiAgICAgICAgZC5zdHlsZS53aWR0aCA9IFwiMHB4XCI7XG4gICAgICAgIGQuc3R5bGUuaGVpZ2h0ID0gXCIwcHhcIjtcbiAgICAgICAgZC5zdHlsZS5vdmVyZmxvdyA9IFwiaGlkZGVuXCI7XG5cbiAgICAgICAgdGhpcy5maWxlX2lucHV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImlucHV0XCIpO1xuICAgICAgICB0aGlzLmZpbGVfaW5wdXQudHlwZSA9IFwiZmlsZVwiO1xuICAgICAgICB0aGlzLmZpbGVfaW5wdXQuYWNjZXB0ID0gXCIucHlcIjtcblxuICAgICAgICBkLmFwcGVuZCh0aGlzLmZpbGVfaW5wdXQpO1xuXG4gICAgICAgIHRoaXMuZmlsZV9pbnB1dC5hZGRFdmVudExpc3RlbmVyKFwiaW5wdXRcIiwgKCkgPT4gdGhpcy5vcGVuRmlsZSgpKTtcblxuICAgICAgICB0aGlzLmZpbGVSZWFkZXIub25sb2FkID0gKCkgPT4gb25GaWxlUmVhZGVkKHRoaXMuZmlsZVJlYWRlci5yZXN1bHQgYXMgc3RyaW5nKTtcbiAgICAgICAgdGhpcy5maWxlUmVhZGVyLm9uZXJyb3IgPSAoZXZ0KSA9PiBjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIHJlYWQgZmlsZS5cIiwgZXZ0KTtcbiAgICB9XG5cbiAgICBvcGVuRmlsZSgpe1xuICAgICAgICB0aGlzLmZpbGVSZWFkZXIucmVhZEFzVGV4dCgodGhpcy5maWxlX2lucHV0LmZpbGVzIGFzIEZpbGVMaXN0KVswXSwgXCJVVEYtOFwiKTtcbiAgICB9XG5cbiAgICBhc3luYyBydW4oKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgICAgIHRoaXMuZmlsZV9pbnB1dC5jbGljaygpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG59IiwiaW1wb3J0IHsgR2V0U2NyaXB0Q2FsbGJhY2sgfSBmcm9tIFwiLi4vY29tbW9uXCI7XG5pbXBvcnQgeyBEYXBMaW5rV3JhcHBlciB9IGZyb20gXCIuLi9kYXBsaW5rXCI7XG5pbXBvcnQgeyBQcm9ncmVzc0RpYWxvZywgUHJvZ3Jlc3NNZXNzYWdlVHlwZSB9IGZyb20gXCIuLi9wcm9ncmVzc19kaWFsb2dcIjtcbmltcG9ydCB7IEFjdGlvbiB9IGZyb20gXCIuL2FjdGlvblwiO1xuXG5leHBvcnQgY2xhc3MgQWN0aW9uUnVuIGltcGxlbWVudHMgQWN0aW9ue1xuXG4gICAgcHJpdmF0ZSBkYXBsaW5rOiBEYXBMaW5rV3JhcHBlcjtcbiAgICBwcml2YXRlIGdldFNjcmlwdF9jYjogR2V0U2NyaXB0Q2FsbGJhY2s7XG4gICAgcHJpdmF0ZSBkaWFsb2c6IFByb2dyZXNzRGlhbG9nO1xuXG4gICAgY29uc3RydWN0b3IoZGFwbGluayA6IERhcExpbmtXcmFwcGVyLCBnZXRTY3JpcHQ6IEdldFNjcmlwdENhbGxiYWNrKXtcbiAgICAgICAgdGhpcy5kYXBsaW5rID0gZGFwbGluaztcbiAgICAgICAgdGhpcy5nZXRTY3JpcHRfY2IgPSBnZXRTY3JpcHQ7XG4gICAgICAgIHRoaXMuZGlhbG9nID0gbmV3IFByb2dyZXNzRGlhbG9nKFwiUnVubmluZy4uLlwiKTtcbiAgICB9XG5cbiAgICBhc3luYyBydW4oKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgICAgIGxldCBpc19lcnJvciA9IGZhbHNlO1xuXG4gICAgICAgIHRoaXMuZGlhbG9nLm9wZW4oKTtcbiAgICAgICAgdGhpcy5kaWFsb2cuYWRkSW5mbyhcIlNlbmRpbmcgc2NyaXB0IHRvIHRhcmdldFwiKTtcblxuICAgICAgICBhd2FpdCB0aGlzLmRhcGxpbmsucnVuU2NyaXB0KCAgIHRoaXMuZ2V0U2NyaXB0X2NiKCksIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChwcmdzKSA9PiB0aGlzLmRpYWxvZy5zZXRQcm9ncmVzc1ZhbHVlKHByZ3MgKiAxMDApLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5kaWFsb2cuYWRkSW5mbyhlcnIsIFByb2dyZXNzTWVzc2FnZVR5cGUuRVJST1IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc19lcnJvciA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSApO1xuXG4gICAgICAgIGlmKCBpc19lcnJvciApe1xuICAgICAgICAgICAgdGhpcy5kaWFsb2cuc2hvd0Nsb3NlQnV0dG9uKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIHRoaXMuZGlhbG9nLmNsb3NlKCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG59IiwiaW1wb3J0IHsgc2F2ZUFzIH0gZnJvbSBcImZpbGUtc2F2ZXJcIjtcbmltcG9ydCB7IEdldFNjcmlwdENhbGxiYWNrIH0gZnJvbSBcIi4uL2NvbW1vblwiO1xuaW1wb3J0IHsgQWN0aW9uIH0gZnJvbSBcIi4vYWN0aW9uXCI7XG5cbmV4cG9ydCBjbGFzcyBBY3Rpb25TYXZlIGltcGxlbWVudHMgQWN0aW9ue1xuXG4gICAgcHJpdmF0ZSBjYl9nZXRTY3JpcHQgOiBHZXRTY3JpcHRDYWxsYmFjaztcblxuICAgIGNvbnN0cnVjdG9yKGdldFNjcmlwdDogR2V0U2NyaXB0Q2FsbGJhY2spe1xuICAgICAgICB0aGlzLmNiX2dldFNjcmlwdCA9IGdldFNjcmlwdDtcbiAgICB9XG5cbiAgICBzYXZlRmlsZShmaWxlbmFtZTogc3RyaW5nKXtcbiAgICAgICAgdmFyIGJsb2IgPSBuZXcgQmxvYihbdGhpcy5jYl9nZXRTY3JpcHQoKV0sIHt0eXBlOiBcInRleHQvcGxhaW47Y2hhcnNldD11dGYtOFwifSk7XG4gICAgICAgIHNhdmVBcyhibG9iLCBmaWxlbmFtZSk7XG4gICAgfVxuXG4gICAgYXN5bmMgcnVuKCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgICAgICB0aGlzLnNhdmVGaWxlKFwibWFpbi5weVwiKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxufSIsImltcG9ydCB7IEFjdGlvbiB9IGZyb20gXCIuL2FjdGlvblwiO1xuXG5leHBvcnQgY2xhc3MgQWN0aW9uU2V0dGluZ3MgaW1wbGVtZW50cyBBY3Rpb24ge1xuICAgIGNvbnN0cnVjdG9yKCl7XG5cbiAgICB9XG5cbiAgICBhc3luYyBydW4oKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbn0iLCJleHBvcnQgZW51bSBBbGVydERpYWxvZ0ljb257XG4gICAgTk9ORSA9IFwiYWxlcnQtZGlhbG9nLWljb24tbm9uZVwiLFxuICAgIElORk8gPSBcImFsZXJ0LWRpYWxvZy1pY29uLWluZm9cIixcbiAgICBXQVJOSU5HID0gXCJhbGVydC1kaWFsb2ctaWNvbi13YXJuaW5nXCIsXG4gICAgRVJST1IgPSBcImFsZXJ0LWRpYWxvZy1pY29uLWVycm9yXCJcbn1cblxuZXhwb3J0IGNsYXNzIEFsZXJ0RGlhbG9nIHtcblxuICAgIHByaXZhdGUgZGlhbG9nOiBIVE1MRWxlbWVudDtcblxuICAgIGNvbnN0cnVjdG9yKHRpdGxlPzogc3RyaW5nLCB0ZXh0Pzogc3RyaW5nLCBpY29uOiBBbGVydERpYWxvZ0ljb24gPSBBbGVydERpYWxvZ0ljb24uTk9ORSl7XG5cbiAgICAgICAgdGhpcy5kaWFsb2cgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICB0aGlzLmRpYWxvZy5jbGFzc0xpc3QuYWRkKFwiYWxlcnQtZGlhbG9nXCIpO1xuICAgICAgICB0aGlzLmRpYWxvZy5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XG5cbiAgICAgICAgbGV0IGNvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgIGNvbnRhaW5lci5jbGFzc0xpc3QuYWRkKFwiYWxlcnQtZGlhbG9nLWNvbnRhaW5lclwiKVxuXG4gICAgICAgIGxldCB0aXRsZV9lbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgIHRpdGxlX2VsLmNsYXNzTGlzdC5hZGQoXCJhbGVydC1kaWFsb2ctdGl0bGVcIiwgaWNvbik7XG4gICAgICAgIHRpdGxlX2VsLmlubmVyVGV4dCA9IHRpdGxlIHx8IFwiXCI7XG5cbiAgICAgICAgbGV0IGNvbnRlbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICBjb250ZW50LmNsYXNzTGlzdC5hZGQoXCJhbGVydC1kaWFsb2ctY29udGVudFwiKTtcblxuICAgICAgICBsZXQgdGV4dF9lbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJwXCIpO1xuICAgICAgICB0ZXh0X2VsLmlubmVySFRNTCA9IHRleHQgfHwgXCJcIjtcblxuICAgICAgICBsZXQgY2xvc2VfYnV0dG9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKTtcbiAgICAgICAgY2xvc2VfYnV0dG9uLmNsYXNzTGlzdC5hZGQoXCJhbGVydC1kaWFsb2ctY2xvc2UtYnV0dG9uXCIpO1xuICAgICAgICBjbG9zZV9idXR0b24uaW5uZXJUZXh0ID0gXCJDbG9zZVwiO1xuICAgICAgICBjbG9zZV9idXR0b24uYWRkRXZlbnRMaXN0ZW5lciggXCJjbGlja1wiLCAoKSA9PiB0aGlzLmNsb3NlKCkgKTtcblxuICAgICAgICBjb250ZW50LmFwcGVuZCh0ZXh0X2VsKTtcbiAgICAgICAgY29udGVudC5hcHBlbmQoY2xvc2VfYnV0dG9uKTtcblxuICAgICAgICBjb250YWluZXIuYXBwZW5kKHRpdGxlX2VsKTtcbiAgICAgICAgY29udGFpbmVyLmFwcGVuZChjb250ZW50KTtcblxuICAgICAgICB0aGlzLmRpYWxvZy5hcHBlbmQoY29udGFpbmVyKTtcblxuICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZCh0aGlzLmRpYWxvZyk7XG4gICAgfVxuXG4gICAgb3Blbih0aXRsZT86IHN0cmluZywgdGV4dD86IHN0cmluZywgaWNvbj86IEFsZXJ0RGlhbG9nSWNvbil7XG4gICAgICAgIGlmKCB0aXRsZSApe1xuICAgICAgICAgICAgKHRoaXMuZGlhbG9nLnF1ZXJ5U2VsZWN0b3IoXCIuYWxlcnQtZGlhbG9nLXRpdGxlXCIpIGFzIEhUTUxFbGVtZW50KS5pbm5lckhUTUwgPSB0aXRsZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKCB0ZXh0ICl7XG4gICAgICAgICAgICAodGhpcy5kaWFsb2cucXVlcnlTZWxlY3RvcihcIi5hbGVydC1kaWFsb2ctY29udGVudCBwXCIpIGFzIEhUTUxFbGVtZW50KS5pbm5lckhUTUwgPSB0ZXh0O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYoIGljb24gKXtcbiAgICAgICAgICAgIGxldCB0aXRsZV9lbCA9IHRoaXMuZGlhbG9nLnF1ZXJ5U2VsZWN0b3IoXCIuYWxlcnQtZGlhbG9nLXRpdGxlXCIpIGFzIEhUTUxFbGVtZW50O1xuICAgICAgICAgICAgdGl0bGVfZWwuY2xhc3NMaXN0LnJlbW92ZShBbGVydERpYWxvZ0ljb24uTk9ORSwgQWxlcnREaWFsb2dJY29uLklORk8sIEFsZXJ0RGlhbG9nSWNvbi5XQVJOSU5HLCBBbGVydERpYWxvZ0ljb24uRVJST1IpO1xuICAgICAgICAgICAgdGl0bGVfZWwuY2xhc3NMaXN0LmFkZChpY29uKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZGlhbG9nLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XG4gICAgfVxuXG4gICAgY2xvc2UoKXtcbiAgICAgICAgdGhpcy5kaWFsb2cuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xuICAgIH1cblxufTsiLCJpbXBvcnQgeyBCdXR0b24gfSBmcm9tIFwiLi9idXR0b24vYnV0dG9uXCI7XG5pbXBvcnQgeyBBY3Rpb25Db25uZWN0aW9uIH0gZnJvbSBcIi4vYWN0aW9ucy9hY3Rpb25fY29ubmVjdGlvblwiO1xuaW1wb3J0IHsgRGFwTGlua1dyYXBwZXIgfSBmcm9tIFwiLi9kYXBsaW5rXCI7XG5pbXBvcnQgeyBBY3Rpb25SdW4gfSBmcm9tIFwiLi9hY3Rpb25zL2FjdGlvbl9ydW5cIjtcbmltcG9ydCB7IFNlcmlhbE91dHB1dCB9IGZyb20gXCIuL3NlcmlhbE91dHB1dFwiO1xuaW1wb3J0IHsgVHdvUGFuZWxDb250YWluZXIgfSBmcm9tIFwiLi9Ud29QYW5lbENvbnRhaW5lclwiO1xuaW1wb3J0IHsgQWN0aW9uU2F2ZSB9IGZyb20gXCIuL2FjdGlvbnMvYWN0aW9uX3NhdmVcIjtcbmltcG9ydCB7IEFjdGlvbkxvYWQgfSBmcm9tIFwiLi9hY3Rpb25zL2FjdGlvbl9sb2FkXCI7XG5pbXBvcnQgeyBBY3Rpb25GbGFzaCB9IGZyb20gXCIuL2FjdGlvbnMvYWN0aW9uX2ZsYXNoXCI7XG5pbXBvcnQgeyBUb2dnbGVCdXR0b24gfSBmcm9tIFwiLi9idXR0b24vYnV0dG9uX3RvZ2dsZVwiO1xuaW1wb3J0IHsgQWN0aW9uU2V0dGluZ3MgfSBmcm9tIFwiLi9hY3Rpb25zL2FjdGlvbl9zZXR0aW5nc1wiO1xuaW1wb3J0IHsgQnV0dG9uU3BhY2VyIH0gZnJvbSBcIi4vYnV0dG9uL2J1dHRvblNwYWNlclwiO1xuaW1wb3J0IHsgUGxhY2VIb2xkZXJCdXR0b24gfSBmcm9tIFwiLi9idXR0b24vYnV0dG9uX3BsYWNlaG9sZGVyXCI7XG5pbXBvcnQgeyBHZXRTY3JpcHRDYWxsYmFjaywgU2V0U2NyaXB0Q2FsbGJhY2sgfSBmcm9tIFwiLi9jb21tb25cIjtcbmltcG9ydCB7IEJ1dHRvbkRyb3Bkb3duLCBCdXR0b25Ecm9wZG93bkVsZW1lbnQgfSBmcm9tIFwiLi9idXR0b24vYnV0dG9uX2Ryb3Bkb3duXCI7XG5cbmV4cG9ydCBjbGFzcyBBcHBsaWNhdGlvbntcblxuICAgIHByaXZhdGUgdG9wX2NvbnRhaW5lciA6IEhUTUxFbGVtZW50ID0gPEhUTUxFbGVtZW50PmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidG9wX2NvbnRhaW5lclwiKTtcbiAgICBwcml2YXRlIGxlZnRfY29udGFpbmVyIDogSFRNTEVsZW1lbnQgPSA8SFRNTEVsZW1lbnQ+ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJsZWZ0X2NvbnRhaW5lclwiKTtcbiAgICBwcml2YXRlIHJpZ2h0X2NvbnRhaW5lciA6IEhUTUxFbGVtZW50ID0gPEhUTUxFbGVtZW50PmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicmlnaHRfY29udGFpbmVyXCIpO1xuICAgIHByaXZhdGUgc3BhY2VyX2NvbnRhaW5lciA6IEhUTUxFbGVtZW50ID0gPEhUTUxFbGVtZW50PmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic3BhY2VyX2NvbnRhaW5lclwiKTtcblxuXG4gICAgcHJpdmF0ZSBidXR0b25fcnVuPyA6IEJ1dHRvbjtcbiAgICBwcml2YXRlIGJ1dHRvbl9jb25uPzogVG9nZ2xlQnV0dG9uO1xuXG4gICAgcHJpdmF0ZSBkYXBMaW5rV3JhcHBlciA6IERhcExpbmtXcmFwcGVyO1xuICAgIHByaXZhdGUgc2VyaWFsX291dHB1dCA6IFNlcmlhbE91dHB1dDtcblxuXG5cbiAgICBjb25zdHJ1Y3RvcihnZXRfc2NyaXB0OiBHZXRTY3JpcHRDYWxsYmFjaywgc2V0X3NjcmlwdDogU2V0U2NyaXB0Q2FsbGJhY2spe1xuICAgICAgICB0aGlzLmRhcExpbmtXcmFwcGVyID0gbmV3IERhcExpbmtXcmFwcGVyKCk7XG5cbiAgICAgICAgdGhpcy5zZXJpYWxfb3V0cHV0ID0gbmV3IFNlcmlhbE91dHB1dCh0aGlzLnJpZ2h0X2NvbnRhaW5lcik7XG4gICAgICAgIHRoaXMuZGFwTGlua1dyYXBwZXIuYWRkUmVpY2VpdmVkRGF0YUxpc3RlbmVyKCAoZGF0YSkgPT4gdGhpcy5zZXJpYWxfb3V0cHV0LndyaXRlKGRhdGEpKTtcbiAgICAgICAgdGhpcy5kYXBMaW5rV3JhcHBlci5hZGRDb25uZWN0aW9uQ2hhbmdlTGlzdGVuZXIoIGlzX2Nvbm5lY3RlZCA9PiB0aGlzLm9uQ29ubmVjdGlvbkNoYW5nZShpc19jb25uZWN0ZWQpKTtcblxuXG4gICAgICAgIHRoaXMudG9wTWVudShnZXRfc2NyaXB0LCBzZXRfc2NyaXB0KTtcblxuXG4gICAgICAgIHRoaXMuYnV0dG9uX3J1bj8uZGlzYWJsZSgpO1xuXG4gICAgICAgIGlmKCB0aGlzLmRhcExpbmtXcmFwcGVyLmlzV2ViVVNCQXZhaWxhYmxlKCkgKXtcbiAgICAgICAgICAgIG5ldyBUd29QYW5lbENvbnRhaW5lcih0aGlzLmxlZnRfY29udGFpbmVyLCB0aGlzLnNwYWNlcl9jb250YWluZXIsIHRoaXMucmlnaHRfY29udGFpbmVyKS5zZXRfcGFuZWxfc2l6ZShkb2N1bWVudC5ib2R5LmNsaWVudFdpZHRoICogMC42Nik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIG5ldyBUd29QYW5lbENvbnRhaW5lcih0aGlzLmxlZnRfY29udGFpbmVyLCB0aGlzLnNwYWNlcl9jb250YWluZXIsIHRoaXMucmlnaHRfY29udGFpbmVyKS5oaWRlX3JpZ2h0X3BhbmVsKCk7XG4gICAgICAgIH1cbiAgICB9XG5cblxuICAgIHByaXZhdGUgdG9wTWVudShnZXRfc2NyaXB0OiBHZXRTY3JpcHRDYWxsYmFjaywgc2V0X3NjcmlwdDogU2V0U2NyaXB0Q2FsbGJhY2spe1xuXG4gICAgICAgIGxldCBhY3RfY29ubmVjdGlvbiA9ICBuZXcgQWN0aW9uQ29ubmVjdGlvbih0aGlzLmRhcExpbmtXcmFwcGVyKTtcbiAgICAgICAgbGV0IGFjdF9ydW4gPSBuZXcgQWN0aW9uUnVuKHRoaXMuZGFwTGlua1dyYXBwZXIsIGdldF9zY3JpcHQpO1xuICAgICAgICBsZXQgYWN0X2ZsYXNoID0gbmV3IEFjdGlvbkZsYXNoKHRoaXMuZGFwTGlua1dyYXBwZXIsIHRoaXMuc2VyaWFsX291dHB1dCwgZ2V0X3NjcmlwdCk7XG4gICAgICAgIGxldCBhY3RfbG9hZCA9IG5ldyBBY3Rpb25Mb2FkKHNldF9zY3JpcHQpO1xuICAgICAgICBsZXQgYWN0X3NhdmUgPSBuZXcgQWN0aW9uU2F2ZShnZXRfc2NyaXB0KTtcbiAgICAgICAgbGV0IGFjdF9zZXR0aW5ncyA9IG5ldyBBY3Rpb25TZXR0aW5ncygpO1xuXG4gICAgICAgIGlmKCB0aGlzLmRhcExpbmtXcmFwcGVyLmlzV2ViVVNCQXZhaWxhYmxlKCkgKXtcbiAgICAgICAgICAgIHRoaXMuYnV0dG9uX2Nvbm4gPSBuZXcgVG9nZ2xlQnV0dG9uKHRoaXMudG9wX2NvbnRhaW5lciwgXCJpbWcvZGlzY29ubmVjdC5wbmdcIiwgXCJpbWcvY29ubmVjdC5wbmdcIiwgYWN0X2Nvbm5lY3Rpb24sIFwiQ2xpY2sgdG8gY29ubmVjdFwiLCBcIkNsaWNrIHRvIGRpc2Nvbm5lY3RcIik7XG4gICAgICAgICAgICB0aGlzLmJ1dHRvbl9ydW4gPSBuZXcgQnV0dG9uKHRoaXMudG9wX2NvbnRhaW5lciwgXCJpbWcvcGxheS5wbmdcIiwgYWN0X3J1biwgXCJSdW4gc2NyaXB0IG9uIHRhcmdldFwiKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgbmV3IFBsYWNlSG9sZGVyQnV0dG9uKHRoaXMudG9wX2NvbnRhaW5lcik7ICAvLyBDb25uZWN0aW9uIHBsYWNlaG9sZGVyXG4gICAgICAgICAgICBuZXcgUGxhY2VIb2xkZXJCdXR0b24odGhpcy50b3BfY29udGFpbmVyKTsgIC8vIFBsYXkgcGxhY2Vob2xkZXJcbiAgICAgICAgfVxuICAgICAgICBuZXcgQnV0dG9uKHRoaXMudG9wX2NvbnRhaW5lciwgXCJpbWcvZmxhc2gucG5nXCIsIGFjdF9mbGFzaCwgXCJGbGFzaCBvciBEb3dubG9hZFwiKTtcblxuICAgICAgICBuZXcgQnV0dG9uU3BhY2VyKHRoaXMudG9wX2NvbnRhaW5lcik7XG5cbiAgICAgICAgbmV3IEJ1dHRvbih0aGlzLnRvcF9jb250YWluZXIsIFwiaW1nL3VwbG9hZC5wbmdcIiwgYWN0X2xvYWQsIFwiTG9hZCBweXRob24gZmlsZVwiKTtcbiAgICAgICAgbmV3IEJ1dHRvbih0aGlzLnRvcF9jb250YWluZXIsIFwiaW1nL2Rvd25sb2FkLnBuZ1wiLCBhY3Rfc2F2ZSwgXCJTYXZlIHB5dGhvbiBmaWxlXCIpO1xuXG4gICAgICAgIG5ldyBCdXR0b25TcGFjZXIodGhpcy50b3BfY29udGFpbmVyKTtcblxuICAgICAgICBuZXcgQnV0dG9uRHJvcGRvd24odGhpcy50b3BfY29udGFpbmVyLCBcImltZy9zZXR0aW5ncy5wbmdcIiwgWyBuZXcgQnV0dG9uRHJvcGRvd25FbGVtZW50KFwiQ2xlYXIgY29uc29sZVwiLCAoKSA9PiB7dGhpcy5zZXJpYWxfb3V0cHV0LmNsZWFyKCl9LCBcImYxMjBcIiksIG5ldyBCdXR0b25Ecm9wZG93bkVsZW1lbnQoXCJGb3JjZSB0YXNrIHN0b3BcIiwgKCkgPT4geyB0aGlzLmRhcExpbmtXcmFwcGVyLnNlbmRLZXlib2FyZEludGVycnVwdCgpOyB9LCBcImY1NGNcIikgXSwgXCJTZXR0aW5nc1wiKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIG9uQ29ubmVjdGlvbkNoYW5nZShpc19jb25uZWN0ZWQ6IGJvb2xlYW4pe1xuICAgICAgICBpZihpc19jb25uZWN0ZWQpe1xuICAgICAgICAgICAgdGhpcy5idXR0b25fcnVuPy5lbmFibGUoKTtcbiAgICAgICAgICAgIHRoaXMuYnV0dG9uX2Nvbm4/LnNldEJ1dHRvblN0YXRlKGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgdGhpcy5idXR0b25fcnVuPy5kaXNhYmxlKCk7XG4gICAgICAgICAgICB0aGlzLmJ1dHRvbl9jb25uPy5zZXRCdXR0b25TdGF0ZSh0cnVlKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy8gQHRzLWlnbm9yZVxud2luZG93W1wiQXBwbGljYXRpb25cIl0gPSBBcHBsaWNhdGlvbjsiLCJpbXBvcnQgeyBBY3Rpb24gfSBmcm9tIFwiLi4vYWN0aW9ucy9hY3Rpb25cIjtcblxuZXhwb3J0IGNsYXNzIEJ1dHRvbntcblxuICAgIHByb3RlY3RlZCBpc19lbmFibGU6IGJvb2xlYW47XG4gICAgcHJvdGVjdGVkIGFjdGlvbjogQWN0aW9uO1xuICAgIHByb3RlY3RlZCBidXR0b246IEhUTUxEaXZFbGVtZW50O1xuICAgIHByb3RlY3RlZCBpY29uOiBIVE1MSW1hZ2VFbGVtZW50O1xuXG4gICAgY29uc3RydWN0b3IocGFyZW50OiBIVE1MRWxlbWVudCwgaWNvbjogc3RyaW5nLCBhY3Rpb246IEFjdGlvbiwgdGl0bGU6IHN0cmluZyA9IFwiXCIpe1xuICAgICAgICB0aGlzLmJ1dHRvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgIHRoaXMuaWNvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbWdcIik7XG5cbiAgICAgICAgdGhpcy5idXR0b24uY2xhc3NMaXN0LmFkZChcIm1lbnVfYnV0dG9uXCIpXG4gICAgICAgIHRoaXMuYnV0dG9uLnRpdGxlID0gdGl0bGU7XG5cbiAgICAgICAgdGhpcy5hY3Rpb24gPSBhY3Rpb247XG4gICAgICAgIHRoaXMuaXNfZW5hYmxlID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5pY29uLnNyYyA9IGljb247XG4gICAgICAgIHRoaXMuYnV0dG9uLmFwcGVuZCh0aGlzLmljb24pO1xuICAgICAgICBwYXJlbnQuYXBwZW5kKHRoaXMuYnV0dG9uKTtcblxuICAgICAgICB0aGlzLmJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5vbkJ1dHRvbkNsaWNrKCkpO1xuICAgIH1cblxuICAgIGVuYWJsZSgpe1xuICAgICAgICB0aGlzLmJ1dHRvbi5jbGFzc0xpc3QucmVtb3ZlKFwiZGlzYWJsZVwiKTtcbiAgICB9XG5cbiAgICBkaXNhYmxlKCl7XG4gICAgICAgIHRoaXMuYnV0dG9uLmNsYXNzTGlzdC5hZGQoXCJkaXNhYmxlXCIpO1xuICAgIH1cblxuICAgIGlzRW5hYmxlKCl7XG4gICAgICAgIHJldHVybiB0aGlzLmlzX2VuYWJsZTtcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgYXN5bmMgb25CdXR0b25DbGljaygpe1xuICAgICAgICBpZiggdGhpcy5pc19lbmFibGUgKXtcbiAgICAgICAgICAgIHRoaXMuYWN0aW9uLnJ1bigpO1xuICAgICAgICB9XG4gICAgfVxufSIsIlxuZXhwb3J0IGNsYXNzIEJ1dHRvblNwYWNlcntcbiAgICBjb25zdHJ1Y3RvcihwYXJlbnQ6IEhUTUxFbGVtZW50KXtcbiAgICAgICAgbGV0IGJ1dHRvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgIGJ1dHRvbi5jbGFzc0xpc3QuYWRkKFwibWVudV9idXR0b25fc3BhY2VcIilcbiAgICAgICAgcGFyZW50LmFwcGVuZChidXR0b24pO1xuICAgIH1cbn0iLCJpbXBvcnQgeyBBY3Rpb24gfSBmcm9tIFwiLi4vYWN0aW9ucy9hY3Rpb25cIjtcbmltcG9ydCB7IEFjdGlvbkNvbm5lY3Rpb24gfSBmcm9tIFwiLi4vYWN0aW9ucy9hY3Rpb25fY29ubmVjdGlvblwiO1xuaW1wb3J0IHsgQnV0dG9uIH0gZnJvbSBcIi4vYnV0dG9uXCI7XG5cbmV4cG9ydCBjbGFzcyBCdXR0b25Ecm9wZG93bkVsZW1lbnQge1xuICAgIC8qKlxuICAgICAqIFRoZSBoZXhhZGVjaW1hbCBmb250IGF3ZXNvbWUgaWNvblxuICAgICAqL1xuICAgIGljb24/OiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBUZXh0IHNob3cgaW4gZHJvcGRvd25cbiAgICAgKi9cbiAgICBuYW1lOiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBGdW5jdGlvbiB0byBleGVjdXRlIG9uIGNsaWNrXG4gICAgICovXG4gICAgZmN0OiAoKSA9PiB2b2lkO1xuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIG5hbWUgVGV4dCBzaG93IGluIGRyb3Bkb3duXG4gICAgICogQHBhcmFtIGZjdCBGdW5jdGlvbiB0byBleGVjdXRlIG9uIGNsaWNrXG4gICAgICogQHBhcmFtIGljb24gW29wdGlvbm5hbF0gVGhlIGhleGFkZWNpbWFsIGZvbnQgYXdlc29tZSBpY29uXG4gICAgICovXG4gICAgY29uc3RydWN0b3IobmFtZTogc3RyaW5nLCBmY3Q6ICgpID0+IHZvaWQsIGljb24/OiBzdHJpbmcpe1xuICAgICAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgICAgICB0aGlzLmZjdCA9IGZjdDtcbiAgICAgICAgdGhpcy5pY29uID0gaWNvbjtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBCdXR0b25Ecm9wZG93biBleHRlbmRzIEJ1dHRvbiB7XG4gICAgcHJpdmF0ZSBkcm9wZG93bjogSFRNTERpdkVsZW1lbnQ7XG5cbiAgICBjb25zdHJ1Y3RvcihwYXJlbnQ6IEhUTUxFbGVtZW50LCBpY29uOiBzdHJpbmcsIGRyb3Bkb3duRWxlbWVudHM6IEJ1dHRvbkRyb3Bkb3duRWxlbWVudFtdLCB0aXRsZTogc3RyaW5nID0gXCJcIil7XG4gICAgICAgIGxldCBhY3Rpb246IEFjdGlvbiA9IHsgXG4gICAgICAgICAgICBydW46IGFzeW5jICgpID0+IHRoaXMuaW50ZXJuYWxBY3Rpb24oKSBcbiAgICAgICAgfTtcblxuICAgICAgICBzdXBlcihwYXJlbnQsIGljb24sIGFjdGlvbiwgdGl0bGUpO1xuXG4gICAgICAgIGxldCBidXR0b25fYm91bmRzID0gdGhpcy5idXR0b24uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICAgICAgdGhpcy5kcm9wZG93biA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgIHRoaXMuZHJvcGRvd24uY2xhc3NMaXN0LmFkZChcIm1lbnVfYnV0dG9uX2Ryb3Bkb3duXCIpO1xuICAgICAgICB0aGlzLmRyb3Bkb3duLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcbiAgICAgICAgdGhpcy5kcm9wZG93bi5zdHlsZS50b3AgPSBidXR0b25fYm91bmRzLnRvcCArIDQgKyBidXR0b25fYm91bmRzLmhlaWdodCArIFwicHhcIjtcbiAgICAgICAgdGhpcy5kcm9wZG93bi5zdHlsZS5sZWZ0ID0gYnV0dG9uX2JvdW5kcy5sZWZ0ICsgXCJweFwiO1xuXG4gICAgICAgIHRoaXMucG9wdWxhdGVEb3JwZG93bihkcm9wZG93bkVsZW1lbnRzKTtcblxuICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZCh0aGlzLmRyb3Bkb3duKTtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsIChldnQpID0+IHRoaXMuY2xpY2tfb3V0c2lkZShldnQpICk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBpbnRlcm5hbEFjdGlvbigpIHtcblxuICAgICAgICBpZiggdGhpcy5kcm9wZG93bi5zdHlsZS5kaXNwbGF5ID09IFwibm9uZVwiICl7XG4gICAgICAgICAgICB0aGlzLmRyb3Bkb3duLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIHRoaXMuZHJvcGRvd24uc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBjbGlja19vdXRzaWRlKGV2ZW50OiBhbnkpe1xuXG4gICAgICAgIGlmKCAoZXZlbnQucGF0aCBhcyBbXSkuZmluZEluZGV4KCAodmFsdWUpID0+IHZhbHVlID09IHRoaXMuYnV0dG9uIHx8IHZhbHVlID09IHRoaXMuZHJvcGRvd24gKSA9PSAtMSApe1xuICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBwb3B1bGF0ZURvcnBkb3duKGl0ZW1zOiBCdXR0b25Ecm9wZG93bkVsZW1lbnRbXSl7XG4gICAgICAgIGl0ZW1zLmZvckVhY2goIChpdGVtKSA9PiB7XG5cbiAgICAgICAgICAgIGxldCBlbnRyeSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJwXCIpO1xuXG4gICAgICAgICAgICBpZiggaXRlbS5pY29uICl7XG4gICAgICAgICAgICAgICAgZW50cnkuaW5uZXJIVE1MID0gYDxzcGFuIGNsYXNzPVwiZmFcIj4mI3gke2l0ZW0uaWNvbn07PC9zcGFuPmBcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZW50cnkuaW5uZXJIVE1MICs9IGl0ZW0ubmFtZTtcblxuICAgICAgICAgICAgZW50cnkuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHsgdGhpcy5jbG9zZSgpOyBpdGVtLmZjdCgpOyAgfSApO1xuXG4gICAgICAgICAgICB0aGlzLmRyb3Bkb3duLmFwcGVuZChlbnRyeSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgY2xvc2UoKXtcbiAgICAgICAgdGhpcy5kcm9wZG93bi5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XG4gICAgfVxufTsiLCJpbXBvcnQgeyBCdXR0b24gfSBmcm9tIFwiLi9idXR0b25cIlxuXG5leHBvcnQgY2xhc3MgUGxhY2VIb2xkZXJCdXR0b24gZXh0ZW5kcyBCdXR0b257XG5cbiAgICBjb25zdHJ1Y3RvcihwYXJlbnQ6IEhUTUxFbGVtZW50KXtcbiAgICAgICAgc3VwZXIocGFyZW50LCBcIlwiLCB7cnVuOiBhc3luYyAoKSA9PiB0cnVlfSk7XG4gICAgICAgIHRoaXMuYnV0dG9uLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcbiAgICAgICAgdGhpcy5idXR0b24uc3R5bGUud2lkdGggPSBcIjBcIjtcbiAgICAgICAgdGhpcy5idXR0b24uc3R5bGUuaGVpZ2h0ID0gXCIwXCI7XG4gICAgfVxufSIsImltcG9ydCB7IEFjdGlvbiB9IGZyb20gXCIuLi9hY3Rpb25zL2FjdGlvblwiO1xuaW1wb3J0IHsgQnV0dG9uIH0gZnJvbSBcIi4vYnV0dG9uXCJcblxuZXhwb3J0IGNsYXNzIFRvZ2dsZUJ1dHRvbiBleHRlbmRzIEJ1dHRvbntcblxuICAgIHByaXZhdGUgbG9ja19idXR0b25fc3RhdGUgPSBmYWxzZTtcbiAgICBwcml2YXRlIGlzX0Ffc2hvdyA9IHRydWU7XG4gICAgcHJpdmF0ZSBpY29uQTogc3RyaW5nO1xuICAgIHByaXZhdGUgaWNvbkI6IHN0cmluZztcbiAgICBwcml2YXRlIHRpdGxlQTogc3RyaW5nO1xuICAgIHByaXZhdGUgdGl0bGVCOiBzdHJpbmc7XG5cbiAgICBjb25zdHJ1Y3RvcihwYXJlbnQ6IEhUTUxFbGVtZW50LCBpY29uQTogc3RyaW5nLCBpY29uQjogc3RyaW5nLCBhY3Rpb246IEFjdGlvbiwgdGl0bGVBOiBzdHJpbmcgPSBcIlwiLCB0aXRsZUIgOiBzdHJpbmcgPSBcIlwiKXtcbiAgICAgICAgc3VwZXIocGFyZW50LCBpY29uQSwgYWN0aW9uKTtcblxuICAgICAgICB0aGlzLmljb25BID0gaWNvbkE7XG4gICAgICAgIHRoaXMuaWNvbkIgPSBpY29uQjtcbiAgICAgICAgdGhpcy50aXRsZUEgPSB0aXRsZUE7XG4gICAgICAgIHRoaXMudGl0bGVCID0gdGl0bGVCO1xuICAgIH1cblxuICAgIHNldEJ1dHRvblN0YXRlKHNob3dfZGVmYXVsdDogYm9vbGVhbil7XG4gICAgICAgIGlmKCB0aGlzLmxvY2tfYnV0dG9uX3N0YXRlICl7IHJldHVybjsgfVxuICAgICAgICB0aGlzLmludGVybmFsX3NldEJ1dHRvblN0YXRlKHNob3dfZGVmYXVsdCk7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIGFzeW5jIG9uQnV0dG9uQ2xpY2soKXtcbiAgICAgICAgaWYoICEgdGhpcy5pc19lbmFibGUgKXsgcmV0dXJuOyB9XG5cbiAgICAgICAgdGhpcy5sb2NrX2J1dHRvbl9zdGF0ZSA9IHRydWU7XG4gICAgICAgIGlmKCBhd2FpdCB0aGlzLmFjdGlvbi5ydW4oKSApeyBcbiAgICAgICAgICAgIHRoaXMuaW50ZXJuYWxfc2V0QnV0dG9uU3RhdGUoIXRoaXMuaXNfQV9zaG93KTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmxvY2tfYnV0dG9uX3N0YXRlID0gZmFsc2U7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBpbnRlcm5hbF9zZXRCdXR0b25TdGF0ZShzaG93X0E6IGJvb2xlYW4pe1xuICAgICAgICBpZiggc2hvd19BICl7XG4gICAgICAgICAgICB0aGlzLmJ1dHRvbi50aXRsZSA9IHRoaXMudGl0bGVBO1xuICAgICAgICAgICAgdGhpcy5pY29uLnNyYyA9IHRoaXMuaWNvbkE7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIHRoaXMuYnV0dG9uLnRpdGxlID0gdGhpcy50aXRsZUI7XG4gICAgICAgICAgICB0aGlzLmljb24uc3JjID0gdGhpcy5pY29uQjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuaXNfQV9zaG93ID0gc2hvd19BO1xuICAgIH1cbn0iLCJleHBvcnQgdHlwZSBHZXRTY3JpcHRDYWxsYmFjayA9ICgpID0+IHN0cmluZztcbmV4cG9ydCB0eXBlIFNldFNjcmlwdENhbGxiYWNrID0gKHNjcmlwdDogc3RyaW5nKSA9PiB2b2lkO1xuZXhwb3J0IHR5cGUgT25Qcm9ncmVzc0NhbGxiYWNrID0gKHByb2dyZXNzOiBudW1iZXIpID0+IHZvaWQ7XG5leHBvcnQgdHlwZSBPbkVycm9yQ2FsbGJhY2sgPSAoZXJyb3I6IHN0cmluZykgPT4gdm9pZDtcbmV4cG9ydCB0eXBlIE9uQ29ubmVjdGlvbkNoYW5nZUNhbGxiYWNrID0gKGlzX2Nvbm5lY3RlZDogYm9vbGVhbikgPT4gdm9pZDtcblxuXG5leHBvcnQgZnVuY3Rpb24gcHJpbnRfaGV4X2RhdGEoIHZhbHVlcyA6IG51bWJlcltdICl7XG5cbiAgICBsZXQgc3RyID0gXCJcIjtcblxuICAgIHZhbHVlcy5mb3JFYWNoKCAodmFsdWUsIGlkeCkgPT4ge1xuXG4gICAgICAgIHN0ciArPSB0b0hleFN0cmluZyh2YWx1ZSwgMik7XG5cbiAgICAgICAgaWYoIChpZHggKyAxKSAlIDQgPT0gMCl7XG4gICAgICAgICAgICBzdHIgKz0gXCIgXCI7XG4gICAgICAgIH1cblxuICAgIH0pO1xuXG4gICAgY29uc29sZS5sb2coc3RyKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRvSGV4U3RyaW5nKHZhbHVlOiBudW1iZXIsIG5iX2RpZ2l0OiBudW1iZXIgKSA6IHN0cmluZ3tcbiAgICBsZXQgcyA9IHZhbHVlLnRvU3RyaW5nKDE2KS50b1VwcGVyQ2FzZSgpO1xuXG4gICAgaWYoIHMubGVuZ3RoID4gbmJfZGlnaXQgKVxuICAgICAgICBjb25zb2xlLndhcm4oYFtUUlVOQ0FURSBXQVJOXSA6IE5lZWQgdG8gcmVwcmVzZW50ICR7c30gb24gJHtuYl9kaWdpdH0gZGlnaXRzLi4uYCk7XG5cbiAgICByZXR1cm4gXCIwXCIucmVwZWF0KCBNYXRoLm1heCgwLCBuYl9kaWdpdCAtIHMubGVuZ3RoKSApICsgcztcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHdhaXQobXM6IG51bWJlcik6IFByb21pc2U8dm9pZD57XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoIChyZXNvbHZlKSA9PiB7XG4gICAgICAgIHNldFRpbWVvdXQoICgpID0+IHJlc29sdmUoKSwgbXMpO1xuICAgIH0pO1xufVxuIiwiaW1wb3J0ICogYXMgREFQanMgZnJvbSBcImRhcGpzXCI7XG5pbXBvcnQgeyBBbGVydERpYWxvZywgQWxlcnREaWFsb2dJY29uIH0gZnJvbSBcIi4vYWxlcnRfZGlhbG9nXCI7XG5pbXBvcnQgeyBPbkNvbm5lY3Rpb25DaGFuZ2VDYWxsYmFjaywgT25FcnJvckNhbGxiYWNrLCBPblByb2dyZXNzQ2FsbGJhY2ssIHdhaXQgfSBmcm9tIFwiLi9jb21tb25cIjtcblxuZXhwb3J0IGNsYXNzIERhcExpbmtXcmFwcGVyIHtcblxuICAgIHN0YXRpYyByZWFkb25seSBMRU5HVEhfU0VSSUFMX0JVRkZFUiA6IG51bWJlciA9IDMwO1xuXG4gICAgcHJpdmF0ZSBpc193ZWJ1c2JfYXZhaWxhYmxlOiBib29sZWFuO1xuICAgIHByaXZhdGUgZGV2aWNlPzogVVNCRGV2aWNlID0gdW5kZWZpbmVkO1xuICAgIHByaXZhdGUgdHJhbnNwb3J0PyA6IERBUGpzLldlYlVTQiA9IHVuZGVmaW5lZDtcbiAgICBwcml2YXRlIHRhcmdldD8gOiBEQVBqcy5EQVBMaW5rID0gdW5kZWZpbmVkO1xuXG4gICAgcHJpdmF0ZSBjYl9vblJlY2VpdmVEYXRhIDogQXJyYXk8KGRhdGE6IHN0cmluZykgPT4gdm9pZD4gPSBbXTtcbiAgICBwcml2YXRlIHNlcmlhbF9idWZmZXIgOiBzdHJpbmcgPSBcIlwiO1xuICAgIHByaXZhdGUgb25Db25uZWN0aW9uQ2hhbmdlX2NiOiBPbkNvbm5lY3Rpb25DaGFuZ2VDYWxsYmFja1tdID0gW107XG5cbiAgICBjb25zdHJ1Y3Rvcigpe1xuICAgICAgICBpZiggbmF2aWdhdG9yLnVzYiApe1xuICAgICAgICAgICAgbmF2aWdhdG9yLnVzYi5hZGRFdmVudExpc3RlbmVyKCdkaXNjb25uZWN0JywgZXZlbnQgPT4ge1xuICAgICAgICAgICAgICAgIGlmKCB0aGlzLmlzQ29ubmVjdGVkKCkgKXtcbiAgICAgICAgICAgICAgICAgICAgaWYodGhpcy5kZXZpY2U/LnNlcmlhbE51bWJlciA9PSBldmVudC5kZXZpY2Uuc2VyaWFsTnVtYmVyKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZGlzY29ubmVjdCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHRoaXMuaXNfd2VidXNiX2F2YWlsYWJsZSA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIHRoaXMuaXNfd2VidXNiX2F2YWlsYWJsZSA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaXNXZWJVU0JBdmFpbGFibGUoKXtcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNfd2VidXNiX2F2YWlsYWJsZTtcbiAgICB9XG5cbiAgICBhZGRSZWljZWl2ZWREYXRhTGlzdGVuZXIgKCBjYiA6IChkYXRhOiBzdHJpbmcpID0+IHZvaWQgKXtcbiAgICAgICAgdGhpcy5jYl9vblJlY2VpdmVEYXRhLnB1c2goY2IpO1xuICAgIH1cblxuICAgIGFzeW5jIGNvbm5lY3QoKSA6IFByb21pc2U8Ym9vbGVhbj57XG4gICAgICAgIGlmKCAhIHRoaXMuaXNDb25uZWN0ZWQoKSApe1xuICAgICAgICAgICAgaWYoIXRoaXMuaXNfd2VidXNiX2F2YWlsYWJsZSB8fCAhIGF3YWl0IHRoaXMuY3JlYXRlVGFyZ2V0KCkgKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBhd2FpdCB0aGlzLnRhcmdldD8uc2VyaWFsV3JpdGUoU3RyaW5nLmZyb21DaGFyQ29kZSgxKSk7IC8vIFtDdHJsK0FdIGVudGVyIHJhdyBtb2RlIChSRVBMIFB5dGhvbilcbiAgICAgICAgdGhpcy50YXJnZXQ/LnN0YXJ0U2VyaWFsUmVhZCgpO1xuICAgICAgICB0aGlzLmNhbGxPbkNvbm5lY3Rpb25DaGFuZ2VDYWxsYmFja3ModHJ1ZSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIGFzeW5jIGRpc2Nvbm5lY3QoKSA6IFByb21pc2U8Ym9vbGVhbj57XG4gICAgICAgIGlmKCAhIHRoaXMuaXNDb25uZWN0ZWQoKSApe1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy50YXJnZXQ/LnN0b3BTZXJpYWxSZWFkKCk7XG5cbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgYXdhaXQgdGhpcy50YXJnZXQ/LmRpc2Nvbm5lY3QoKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaChlKXt9XG5cbiAgICAgICAgdGhpcy50YXJnZXQgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMudHJhbnNwb3J0ID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLmRldmljZSA9IHVuZGVmaW5lZDtcblxuICAgICAgICB0aGlzLmZsdXNoU2VyaWFsKCk7XG4gICAgICAgIHRoaXMuY2FsbE9uQ29ubmVjdGlvbkNoYW5nZUNhbGxiYWNrcyhmYWxzZSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIGFzeW5jIHJ1blNjcmlwdChzY3JpcHQ6IHN0cmluZywgb25fcHJvZ3Jlc3M6IE9uUHJvZ3Jlc3NDYWxsYmFjaywgb25fZXJyb3I6IE9uRXJyb3JDYWxsYmFjayl7XG4gICAgICAgIFxuICAgICAgICBpZiggIWF3YWl0IHRoaXMuY29ubmVjdCgpICl7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBhd2FpdCB0aGlzLnNlbmRTY3JpcHQoc2NyaXB0ICsgXCJcXG5cXG5cXG5cIiwgb25fcHJvZ3Jlc3MsIG9uX2Vycm9yKTtcbiAgICB9XG5cbiAgICBhc3luYyBmbGFzaE1haW4oc2NyaXB0OiBzdHJpbmcsIG9uX3Byb2dyZXNzIDogT25Qcm9ncmVzc0NhbGxiYWNrLCBvbl9lcnJvcjogT25FcnJvckNhbGxiYWNrKXtcblxuICAgICAgICBsZXQgYmluX2RhdGEgPSBuZXcgVGV4dEVuY29kZXIoKS5lbmNvZGUoc2NyaXB0KTtcbiAgICAgICAgbGV0IHByb2cgPSBcInByb2c9W1wiO1xuICAgICAgICBcbiAgICAgICAgbGV0IHBhcnRfbGVuZ3RoID0gNDA7XG4gICAgICAgIGxldCBuYl9wYXJ0ID0gTWF0aC5jZWlsKGJpbl9kYXRhLmxlbmd0aCAvIHBhcnRfbGVuZ3RoKTtcblxuICAgICAgICBvbl9wcm9ncmVzcygwKTtcbiAgICAgICAgXG4gICAgICAgIGZvciggbGV0IGkgPSAwOyBpIDwgbmJfcGFydDsgKytpICl7XG4gICAgICAgICAgICBwcm9nICs9IGJpbl9kYXRhLnNsaWNlKGkgKiBwYXJ0X2xlbmd0aCwgKGkrMSkgKiBwYXJ0X2xlbmd0aCkuam9pbihcIixcIik7XG4gICAgICAgICAgICBwcm9nICs9IFwiLFxcblwiXG4gICAgICAgIH1cblxuICAgICAgICBwcm9nICs9IFwiXVxcblwiO1xuXG4gICAgICAgIGxldCBtYWluID0gIHByb2cgK1xuICAgICAgICAgICAgICAgICAgICBgd2l0aCBvcGVuKFwibWFpbi5weVwiLCBcIndiXCIpIGFzIGY6XFxuYCArXG4gICAgICAgICAgICAgICAgICAgIGBcXHRmLndyaXRlKGJ5dGVhcnJheShwcm9nKSlcXG5gICsgXG4gICAgICAgICAgICAgICAgICAgIFwiXFxuXCJcbiAgICAgICAgICAgICAgICAgICAgXCJcXG5cIlxuICAgICAgICAgICAgICAgICAgICBcIlxcblwiO1xuXG4gICAgICAgIGF3YWl0IHRoaXMuc2VuZFNjcmlwdChtYWluLCBvbl9wcm9ncmVzcywgb25fZXJyb3IpO1xuICAgICAgICBhd2FpdCB0aGlzLnRhcmdldD8uc2VyaWFsV3JpdGUoU3RyaW5nLmZyb21DaGFyQ29kZSgyKSk7IC8vIFtDdHJsK0JdIGV4aXQgcmF3IG1vZGUgKFJFUEwgUHl0aG9uKVxuICAgICAgICBhd2FpdCB0aGlzLnRhcmdldD8uc2VyaWFsV3JpdGUoU3RyaW5nLmZyb21DaGFyQ29kZSg0KSk7IC8vIFtDdHJsK0RdIFNvZnQgcmVzZXQgKFJFUEwgUHl0aG9uKVxuXG4gICAgICAgIG9uX3Byb2dyZXNzKDEpO1xuICAgIH1cblxuICAgIGlzQ29ubmVjdGVkKCkgOiBib29sZWFue1xuICAgICAgICByZXR1cm4gdGhpcy50YXJnZXQgIT0gdW5kZWZpbmVkICYmIHRoaXMudGFyZ2V0LmNvbm5lY3RlZDtcbiAgICB9XG5cbiAgICBhc3luYyBmbGFzaChoZXg6IFVpbnQ4QXJyYXksIG9uX3Byb2dyZXNzIDogT25Qcm9ncmVzc0NhbGxiYWNrLCBvbl9lcnJvcjogT25FcnJvckNhbGxiYWNrKSA6IFByb21pc2U8dm9pZD57XG4gICAgICAgIGlmKCAhdGhpcy5pc0Nvbm5lY3RlZCgpICl7IHJldHVybjsgfVxuXG4gICAgICAgIHRoaXMudGFyZ2V0Py5vbihEQVBqcy5EQVBMaW5rLkVWRU5UX1BST0dSRVNTLCBwcm9ncmVzcyA9PiBvbl9wcm9ncmVzcyhwcm9ncmVzcykgKTtcblxuICAgICAgICB0cnl7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnRhcmdldD8uc3RvcFNlcmlhbFJlYWQoKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMudGFyZ2V0Py5yZXNldCgpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy50YXJnZXQ/LmZsYXNoKGhleCk7XG4gICAgICAgICAgICBhd2FpdCB3YWl0KDEwMDApO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy50YXJnZXQ/LnJlc2V0KCk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2goZTogYW55KXtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihcIltGTEFTSF06IFwiLCBlKTtcbiAgICAgICAgICAgIG9uX2Vycm9yKGUubWVzc2FnZSk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnRhcmdldD8ub24oREFQanMuREFQTGluay5FVkVOVF9QUk9HUkVTUywgcHJvZ3Jlc3MgPT4ge30gKTtcbiAgICB9XG5cbiAgICBhc3luYyBpc01pY3JvcHl0aG9uT25UYXJnZXQoKXtcbiAgICAgICAgaWYoICF0aGlzLmlzQ29ubmVjdGVkKCkgKXsgcmV0dXJuOyB9XG5cbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgYXdhaXQgdGhpcy50YXJnZXQ/LnNlcmlhbFdyaXRlKFN0cmluZy5mcm9tQ2hhckNvZGUoMykpOyAvLyBbQ3RybCtDXVxuICAgICAgICAgICAgYXdhaXQgd2FpdCgyMDAwKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMudGFyZ2V0Py5zZXJpYWxXcml0ZShTdHJpbmcuZnJvbUNoYXJDb2RlKDQpKTsgLy8gW0N0cmwrRF1cblxuICAgICAgICAgICAgbGV0IHJlYWQgOiBzdHJpbmcgPSAgbmV3IFRleHREZWNvZGVyKCkuZGVjb2RlKCBhd2FpdCB0aGlzLnRhcmdldD8uc2VyaWFsUmVhZCgpICk7XG4gICAgICAgICAgICBhd2FpdCB3YWl0KDIwMDApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gKHJlYWQuaW5kZXhPZihcIk1QWVwiKSAhPSAtMSk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2goZTogYW55KXtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJbSVNfTUlDUk9QWVRIT05fT05fVEFSR0VUXTogXCIsIGUpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYWRkQ29ubmVjdGlvbkNoYW5nZUxpc3RlbmVyKGNiOiBPbkNvbm5lY3Rpb25DaGFuZ2VDYWxsYmFjayk6IHZvaWR7XG4gICAgICAgIHRoaXMub25Db25uZWN0aW9uQ2hhbmdlX2NiLnB1c2goY2IpO1xuICAgIH1cblxuICAgIGFzeW5jIHNlbmRLZXlib2FyZEludGVycnVwdCgpe1xuICAgICAgICBpZiggIXRoaXMuaXNDb25uZWN0ZWQoKSApeyByZXR1cm47IH1cblxuICAgICAgICB0cnl7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnRhcmdldD8uc2VyaWFsV3JpdGUoU3RyaW5nLmZyb21DaGFyQ29kZSgzKSk7IC8vIFtDdHJsK0NdXG4gICAgICAgICAgICBhd2FpdCB3YWl0KDEwMDApO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoKGU6IGFueSl7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiW1NFTkRfS0VZQk9BUkRfSU5URVJSVVBUXTogXCIsIGUpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBjYWxsT25Db25uZWN0aW9uQ2hhbmdlQ2FsbGJhY2tzKGlzX2Nvbm5lY3RlZDogYm9vbGVhbil7XG4gICAgICAgIHRoaXMub25Db25uZWN0aW9uQ2hhbmdlX2NiLmZvckVhY2goIGNiID0+IGNiKGlzX2Nvbm5lY3RlZCkgKTtcbiAgICB9XG5cblxuICAgIHByaXZhdGUgYXN5bmMgc2VuZFNjcmlwdChzY3JpcHQ6IHN0cmluZywgb25fcHJvZ3Jlc3M/OiBPblByb2dyZXNzQ2FsbGJhY2ssIG9uX2Vycm9yPzogT25FcnJvckNhbGxiYWNrICl7XG5cbiAgICAgICAgaWYoICF0aGlzLmlzQ29ubmVjdGVkKCkgKXsgcmV0dXJuOyB9XG4gICAgICAgIGlmKCBzY3JpcHQubGVuZ3RoID09IDAgKXsgcmV0dXJuOyB9XG5cbiAgICAgICAgbGV0IGZpbmFsX3NjcmlwdCA9IGBkZWYgX19zZW5kX3NjcmlwdF9leGVjdXRpb25fXygpOlxcblxcdGAgKyBzY3JpcHQucmVwbGFjZSgvXFxuL2csIFwiXFxuXFx0XCIpICsgXCJcXG5cXG5cIjtcblxuICAgICAgICBsZXQgY2h1bmtzID0gZmluYWxfc2NyaXB0Lm1hdGNoKG5ldyBSZWdFeHAoJ1tcXFxcc1xcXFxTXXsxLCcgKyBEYXBMaW5rV3JhcHBlci5MRU5HVEhfU0VSSUFMX0JVRkZFUiArICd9JywgJ2cnKSkgfHwgW107XG5cbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgYXdhaXQgdGhpcy50YXJnZXQ/LnNlcmlhbFdyaXRlKFN0cmluZy5mcm9tQ2hhckNvZGUoMykpOyAvLyBbQ3RybCtDXVxuICAgICAgICAgICAgYXdhaXQgd2FpdCgyMDAwKTtcblxuICAgICAgICAgICAgdGhpcy5mbHVzaFNlcmlhbCgpO1xuXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnRhcmdldD8uc2VyaWFsV3JpdGUoU3RyaW5nLmZyb21DaGFyQ29kZSgxKSk7IC8vIFtDdHJsK0FdIGVudGVyIHJhdyBtb2RlIChSRVBMIFB5dGhvbilcbiAgICAgICAgICAgIGF3YWl0IHdhaXQoMjUwKTtcblxuICAgICAgICAgICAgZm9yKGxldCBpID0gMDsgaSA8IGNodW5rcy5sZW5ndGg7ICsraSApe1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMudGFyZ2V0Py5zZXJpYWxXcml0ZShjaHVua3NbaV0pO1xuICAgICAgICAgICAgICAgIGF3YWl0IHdhaXQoMTApO1xuXG4gICAgICAgICAgICAgICAgaWYob25fcHJvZ3Jlc3MgIT0gdW5kZWZpbmVkKXtcbiAgICAgICAgICAgICAgICAgICAgb25fcHJvZ3Jlc3MoIGkgLyBjaHVua3MubGVuZ3RoICk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnRhcmdldD8uc2VyaWFsV3JpdGUoIFwidHJ5OlxcblwiKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMudGFyZ2V0Py5zZXJpYWxXcml0ZSggICAgIFwiXFx0X19zZW5kX3NjcmlwdF9leGVjdXRpb25fXygpXFxuXCIpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy50YXJnZXQ/LnNlcmlhbFdyaXRlKCBcImV4Y2VwdCBLZXlib2FyZEludGVycnVwdDpcXG5cIik7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnRhcmdldD8uc2VyaWFsV3JpdGUoICAgICBcIlxcdHByaW50KFxcXCItLUlOVEVSUlVQVCBSVU5OSU5HIFBST0dSQU0tLVxcXCIpXFxuXFxuXCIpO1xuXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnRhcmdldD8uc2VyaWFsV3JpdGUoU3RyaW5nLmZyb21DaGFyQ29kZSg0KSk7IC8vIFtDdHJsK0RdIEV4ZWN1dGUgcHl0aG9uIGNvZGUgKFJFUEwgUHl0aG9uKVxuICAgICAgICB9XG4gICAgICAgIGNhdGNoKGU6IGFueSl7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oXCJbU0VORCBTQ1JJUFRdOiBcIiwgZSk7XG4gICAgICAgICAgICBpZihvbl9lcnJvcil7IG9uX2Vycm9yKGUubWVzc2FnZSk7IH1cbiAgICAgICAgfVxuXG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBjcmVhdGVUYXJnZXQoKSA6IFByb21pc2U8Ym9vbGVhbj4ge1xuXG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIHRoaXMuZGV2aWNlID0gYXdhaXQgbmF2aWdhdG9yLnVzYi5yZXF1ZXN0RGV2aWNlKHtcbiAgICAgICAgICAgICAgICBmaWx0ZXJzOiBbe3ZlbmRvcklkOiAweDBEMjh9XVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2goZTogYW55KXtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihlKTtcblxuICAgICAgICAgICAgaWYoIGUubWVzc2FnZS5pbmRleE9mKFwiTm8gZGV2aWNlIHNlbGVjdGVkXCIpID09IC0xICl7XG4gICAgICAgICAgICAgICAgbmV3IEFsZXJ0RGlhbG9nKFwiV2ViVVNCIEVycm9yXCIsIGBBbiBlcnJvciBvY2N1cmVkIHdpdGggdGhlIFdlYlVTQjogPGJyLz48ZGl2IGNsYXNzPVwiY2l0YXRpb24tZXJyb3JcIj4ke2UubWVzc2FnZX08L2Rpdj48YnIvPlRyeSB1bnBsdWdnaW5nIGFuZCByZXBsdWdnaW5nIHlvdXIgYm9hcmQgb3IgcmVzdGFydCB5b3VyIGJyb3dzZXIuPGJyLz48YnIvPjxpPk5vdGU6IFdlYlVTQiBpcyBleHBlcmltZW50YWwgYW5kIG9ubHkgc3VwcG9ydCBvbiBjaHJvbWUgYmFzZWQgYnJvd3NlciAoY2hyb21lLCBjaHJvbWl1bSwgYnJhdmUsIGVkZ2UsIGV0Yyk8L2k+YCwgQWxlcnREaWFsb2dJY29uLkVSUk9SKS5vcGVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnRyYW5zcG9ydCA9IG5ldyBEQVBqcy5XZWJVU0IodGhpcy5kZXZpY2UpO1xuICAgICAgICB0aGlzLnRhcmdldCA9IG5ldyBEQVBqcy5EQVBMaW5rKHRoaXMudHJhbnNwb3J0KTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMudGFyZ2V0Lm9uKERBUGpzLkRBUExpbmsuRVZFTlRfU0VSSUFMX0RBVEEsIGRhdGEgPT4gdGhpcy5vbkV2ZW50U2VyaWFsRGF0YShkYXRhKSApO1xuXG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMudGFyZ2V0LmNvbm5lY3QoKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMudGFyZ2V0LnNldFNlcmlhbEJhdWRyYXRlKDExNTIwMCk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2goZTogYW55KXtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihlKTtcbiAgICAgICAgICAgIG5ldyBBbGVydERpYWxvZyhcIkNvbm5lY3Rpb24gZmFpbGVkXCIsIGBBbiBlcnJvciBvY2N1cmVkIGR1cmluZyB0aGUgY29ubmVjdGlvbjogPGJyLz48ZGl2IGNsYXNzPVwiY2l0YXRpb24tZXJyb3JcIj4ke2UubWVzc2FnZX08L2Rpdj48YnIvPlRyeSB1bnBsdWdnaW5nIGFuZCByZXBsdWdnaW5nIHlvdXIgYm9hcmQuLi5gLCBBbGVydERpYWxvZ0ljb24uRVJST1IpLm9wZW4oKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHByaXZhdGUgZmx1c2hTZXJpYWwoKXtcbiAgICAgICAgaWYoIHRoaXMuc2VyaWFsX2J1ZmZlci5sZW5ndGggPiAwICl7XG4gICAgICAgICAgICB0aGlzLnNlcmlhbF9idWZmZXIgPSBcIlwiO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBvbkV2ZW50U2VyaWFsRGF0YShkYXRhOiBzdHJpbmcpe1xuICAgICAgICBsZXQgc3BsaXRzID0gZGF0YS5zcGxpdCgvKD88PVxcbikvKTsgLy8gU3BsaXQgYnV0IGtlZXAgdGhlICdcXG4nXG5cbiAgICAgICAgc3BsaXRzLmZvckVhY2goIChzcGxpdCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zZXJpYWxfYnVmZmVyICs9IHNwbGl0O1xuXG4gICAgICAgICAgICBpZiggc3BsaXQuYXQoLTEpID09ICdcXG4nICl7XG4gICAgICAgICAgICAgICAgdGhpcy5jYWxsT25SZWNlaXZlQ2FsbGJhY2tzKCB0aGlzLmNsZWFuU3RyaW5nKHRoaXMuc2VyaWFsX2J1ZmZlcikgKTtcbiAgICAgICAgICAgICAgICB0aGlzLnNlcmlhbF9idWZmZXIgPSBcIlwiO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGNhbGxPblJlY2VpdmVDYWxsYmFja3MoZGF0YTogc3RyaW5nKXtcbiAgICAgICAgdGhpcy5jYl9vblJlY2VpdmVEYXRhLmZvckVhY2goIChjYikgPT4ge1xuICAgICAgICAgICAgY2IoZGF0YSk7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgcHJpdmF0ZSBjbGVhblN0cmluZyhzdHI6IHN0cmluZyk6IHN0cmluZ3tcbiAgICAgICAgcmV0dXJuICAgc3RyLnJlcGxhY2UoL1xceDA0XFx4MDQvZywgXCJcIilcbiAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcPk9LW1xceDA0XFw+XSovZywgXCJcIilcbiAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcPlxcPlxcPlsgXFxyXFxuXSovZywgXCJcIilcblxuICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvW1xcPlxcclxcbl0qcmF3IFJFUEw7IENUUkwtQiB0byBleGl0W1xcclxcbl0qL2csIFwiXCIpXG4gICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9UeXBlIFwiaGVscFxcKFxcKVwiIGZvciBtb3JlIGluZm9ybWF0aW9uLltcXHJcXG5dKi9nLCBcIlwiKVxuICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvTWljcm9QeXRob24gW1xcc1xcU10qXFxuJC9nLCBcIlwiKTtcbiAgICB9XG59IiwiZXhwb3J0IGNsYXNzIElIZXgge1xuXG4gICAgcHJpdmF0ZSBiYXNlX2FkZHJlc3M6IG51bWJlcjtcblxuICAgIGNvbnN0cnVjdG9yKGJhc2VfYWRkcmVzczogbnVtYmVyKXtcbiAgICAgICAgdGhpcy5iYXNlX2FkZHJlc3MgPSBiYXNlX2FkZHJlc3M7XG4gICAgfVxuXG4gICAgcGFyc2VCaW4oYmluX2ZpbGU6IFVpbnQ4QXJyYXkpe1xuICAgICAgICBsZXQgaWhleCA9IHRoaXMuYWRkcmVzc0xpbmUodGhpcy5iYXNlX2FkZHJlc3MpO1xuICAgICAgICBsZXQgbmJfbGluZXMgPSBNYXRoLmNlaWwoYmluX2ZpbGUubGVuZ3RoIC8gMTYpOyAvLyAxNiBvY3RlY3RzIHBhciBkYXRhIGxpbmVcbiAgICAgICAgbGV0IG9mZnNldCA9IDA7XG4gICAgICAgIGxldCBwZW5kaW5nX2FkZHJlc3NfbGluZSA9IFwiXCI7XG5cbiAgICAgICAgZm9yKGxldCBpID0gMDsgaSA8IG5iX2xpbmVzOyBpKysgKXtcbiAgICAgICAgICAgIGxldCBjcmMgPSAweDEwO1xuICAgICAgICAgICAgbGV0IHBhcnQgPSBiaW5fZmlsZS5zbGljZShpICogMTYsIChpKzEpICogMTYpO1xuICAgICAgICAgICAgbGV0IGFkZHJlc3MgPSBpKjE2O1xuICAgICAgICAgICAgbGV0IGxpbmUgPSBgOiR7dGhpcy50b0hleFN0cmluZyhwYXJ0Lmxlbmd0aCwgMil9YDtcblxuICAgICAgICAgICAgLy8gVGhlIGFkZHJlc3Mgb3ZlcmZsb3cgdGhlIDE2IGJpdHMgP1xuICAgICAgICAgICAgaWYoIGFkZHJlc3MgLSBvZmZzZXQgPiAweEZGRkYgKXtcbiAgICAgICAgICAgICAgICBvZmZzZXQgKz0gMHgxMDAwMFxuICAgICAgICAgICAgICAgIHBlbmRpbmdfYWRkcmVzc19saW5lID0gdGhpcy5hZGRyZXNzTGluZSh0aGlzLmJhc2VfYWRkcmVzcyArIG9mZnNldCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEFkZHJlc3NcbiAgICAgICAgICAgIGxpbmUgKz0gdGhpcy50b0hleFN0cmluZyhhZGRyZXNzIC0gb2Zmc2V0LCA0KTtcbiAgICAgICAgICAgIGNyYyArPSAoKGFkZHJlc3MgLSBvZmZzZXQpICYgMHhGRjAwKSA+PiA4IDtcbiAgICAgICAgICAgIGNyYyArPSAoYWRkcmVzcyAtIG9mZnNldCkgJiAweDAwRkY7XG5cbiAgICAgICAgICAgIC8vIEZpZWxkXG4gICAgICAgICAgICBsaW5lICs9IFwiMDBcIjtcbiAgICAgICAgICAgIGNyYyArPSAweDAwO1xuXG4gICAgICAgICAgICAvLyBEYXRhXG4gICAgICAgICAgICBsZXQgaXNfZGF0YV9vbmx5X0ZGID0gdHJ1ZTtcbiAgICAgICAgICAgIHBhcnQuZm9yRWFjaCggKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgbGluZSArPSB0aGlzLnRvSGV4U3RyaW5nKHZhbHVlLCAyKTtcbiAgICAgICAgICAgICAgICBjcmMgKz0gdmFsdWU7XG5cbiAgICAgICAgICAgICAgICBpZiggdmFsdWUgIT0gMHhGRiApeyBpc19kYXRhX29ubHlfRkYgPSBmYWxzZTsgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIGlmIGRhdGEgYXJlIG9ubHkgRkYgYW5kIG9mZnNldCA8IDB4MDgwOF8wMDAwIChhZGRyZXNzIG9mIEZBVCBmaWxlc3lzdGVtKVxuICAgICAgICAgICAgaWYoIGlzX2RhdGFfb25seV9GRiAmJiBvZmZzZXQgPCAweDA4MDgwMDAwMCApeyBjb250aW51ZTsgfVxuXG4gICAgICAgICAgICAvLyBDaGVja3N1bVxuICAgICAgICAgICAgbGluZSArPSB0aGlzLmNvbXB1dGVDUkMoY3JjKTtcblxuICAgICAgICAgICAgLy8gSWYgd2UgYXJlIHdhaW50aW5nIHRvIHByaW50IGFkZHJlc3MgbGluZSwgZG8gaXQgYmVmb3JlIGFkZCBkYXRhIGxpbmVcbiAgICAgICAgICAgIGlmKCBwZW5kaW5nX2FkZHJlc3NfbGluZS5sZW5ndGggPiAwICl7XG4gICAgICAgICAgICAgICAgaWhleCArPSBwZW5kaW5nX2FkZHJlc3NfbGluZTtcbiAgICAgICAgICAgICAgICBwZW5kaW5nX2FkZHJlc3NfbGluZSA9IFwiXCI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEFkZCBsaW5lXG4gICAgICAgICAgICBpaGV4ICs9IGAke2xpbmV9XFxuYFxuICAgICAgICB9XG5cbiAgICAgICAgaWhleCArPSBcIjowMDAwMDAwMUZGXFxuXCI7XG5cbiAgICAgICAgY29uc29sZS5sb2coYGlIZXggc2l6ZSA6ICAke2loZXgubGVuZ3RofSBieXRlc2ApXG5cbiAgICAgICAgcmV0dXJuIGloZXg7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBvZmZzZXRMaW5lKCBvZmZzZXQ6IG51bWJlciApe1xuICAgICAgICBsZXQgc2hpZnRfYWRkciA9IChvZmZzZXQgJiAweEZGRkYwMDAwKSA+PiA0O1xuICAgICAgICByZXR1cm4gYDowMjAwMDAwMiR7dGhpcy50b0hleFN0cmluZyhzaGlmdF9hZGRyLCA0KX0ke3RoaXMuY29tcHV0ZUNSQyggMHgwNCArICgoc2hpZnRfYWRkciAmIDB4RkYwMCkgPj4gOCkgKyAoc2hpZnRfYWRkciAmIDB4MDBGRikgKX1cXG5gO1xuICAgIH1cblxuICAgIHByaXZhdGUgYWRkcmVzc0xpbmUoIG1lbW9yeV9hZGRyZXNzOiBudW1iZXIgKXtcbiAgICAgICAgbGV0IHNoaWZ0X2FkZHIgPSAobWVtb3J5X2FkZHJlc3MgJiAweEZGRkYwMDAwKSA+PiAxNjtcbiAgICAgICAgcmV0dXJuIGA6MDIwMDAwMDQke3RoaXMudG9IZXhTdHJpbmcoc2hpZnRfYWRkciwgNCl9JHt0aGlzLmNvbXB1dGVDUkMoIDB4MDYgKyAoKHNoaWZ0X2FkZHIgJiAweEZGMDApID4+IDgpICsgKHNoaWZ0X2FkZHIgJiAweDAwRkYpICl9XFxuYDtcbiAgICB9XG5cbiAgICBwcml2YXRlIGNvbXB1dGVDUkMoc3VtOiBudW1iZXIpOiBzdHJpbmd7XG4gICAgICAgIHJldHVybiB0aGlzLnRvSGV4U3RyaW5nKCAofihzdW0gJiAweEZGKSArIDEpICYgMHhGRiwgMilcbiAgICB9XG5cbiAgICBwcml2YXRlIHRvSGV4U3RyaW5nKHZhbHVlOiBudW1iZXIsIG5iX2RpZ2l0OiBudW1iZXIgKSA6IHN0cmluZ3tcbiAgICAgICAgbGV0IHMgPSB2YWx1ZS50b1N0cmluZygxNikudG9VcHBlckNhc2UoKTtcblxuICAgICAgICBpZiggcy5sZW5ndGggPiBuYl9kaWdpdCApXG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYFtUUlVOQ0FURSBXQVJOXSA6IE5lZWQgdG8gcmVwcmVzZW50ICR7c30gb24gJHtuYl9kaWdpdH0gZGlnaXRzLi4uYCk7XG5cbiAgICAgICAgcmV0dXJuIFwiMFwiLnJlcGVhdCggTWF0aC5tYXgoMCwgbmJfZGlnaXQgLSBzLmxlbmd0aCkgKSArIHM7XG4gICAgfVxufSIsImltcG9ydCB7IEZhdEJQQiB9IGZyb20gXCIuL2ZhdF9CUEJcIlxuaW1wb3J0IHsgRmF0Um9vdERpcmVjdG9yeSwgRmlsZUF0dHJpYnV0ZSB9IGZyb20gXCIuL2ZhdF9yb290RGlyXCI7XG5pbXBvcnQgeyBGYXRUYWJsZSB9IGZyb20gXCIuL2ZhdF90YWJsZVwiO1xuXG5leHBvcnQgY2xhc3MgRmF0RlMge1xuICAgIHByaXZhdGUgQlBCOiBGYXRCUEI7XG4gICAgcHJpdmF0ZSB0YWJsZTogRmF0VGFibGU7XG4gICAgcHJpdmF0ZSByb290OiBGYXRSb290RGlyZWN0b3J5O1xuXG4gICAgY29uc3RydWN0b3Iodm9sdW1lX25hbWU6IHN0cmluZyl7XG4gICAgICAgIHRoaXMuQlBCID0gbmV3IEZhdEJQQigpO1xuICAgICAgICB0aGlzLmNvbnN0cnVjdF9wYnAoKTtcblxuICAgICAgICB0aGlzLnRhYmxlID0gbmV3IEZhdFRhYmxlKHRoaXMuQlBCKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMucm9vdCA9IG5ldyBGYXRSb290RGlyZWN0b3J5KHRoaXMuQlBCLCB0aGlzLnRhYmxlLCB2b2x1bWVfbmFtZSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBjb25zdHJ1Y3RfcGJwKCl7XG4gICAgICAgIHRoaXMuQlBCLmp1bXBfaW5zdCA9IDB4OTBGRUVCO1xuICAgICAgICB0aGlzLkJQQi5vZW1fbmFtZSA9IFwiTVNET1M1LjBcIjtcbiAgICAgICAgdGhpcy5CUEIuc2VjdG9yX3NpemUgPSA1MTI7XG4gICAgICAgIHRoaXMuQlBCLmNsdXN0ZXJfc2l6ZSA9IDE7XG4gICAgICAgIHRoaXMuQlBCLnJlc2VydmVkX3NlY3RvcnMgPSAxO1xuICAgICAgICB0aGlzLkJQQi5mYXRzX251bWJlciA9IDE7XG4gICAgICAgIHRoaXMuQlBCLnJvb3RfZGlyX3NpemUgPSA1MTI7XG4gICAgICAgIHRoaXMuQlBCLnRvdGFsX3NlY3RvcnMgPSAxMDI0O1xuICAgICAgICB0aGlzLkJQQi5kaXNrX3R5cGUgPSAweEY4O1xuICAgICAgICB0aGlzLkJQQi5mYXRfc2l6ZSA9IDQ7XG4gICAgICAgIHRoaXMuQlBCLnNlY3RvcnNfcGVyX3RyYWNrID0gNjM7XG4gICAgICAgIHRoaXMuQlBCLmhlYWRzX251bWJlciA9IDI1NTtcbiAgICAgICAgdGhpcy5CUEIuaGlkZGVuX3NlY3RvcnMgPSAyNTY7XG4gICAgICAgIHRoaXMuQlBCLnRvdGFsXzMyYml0c19zZWN0b3JzID0gMDtcblxuICAgICAgICB0aGlzLkJQQi5kaXNrX2lkZW50aWZpZXIgPSAweDgwO1xuICAgICAgICB0aGlzLkJQQi5zaWduYXR1cmUgPSAweDI5O1xuICAgICAgICB0aGlzLkJQQi5kaXNrX3NlcmlhbCA9IDB4NDYyMTAwMDA7XG4gICAgICAgIHRoaXMuQlBCLmRpc2tfbmFtZSA9IFwiTk8gTkFNRVwiO1xuICAgICAgICB0aGlzLkJQQi5maWxlX3N5c3RlbV90eXBlID0gXCJGQVRcIjtcblxuICAgICAgICB0aGlzLkJQQi5waHlzaWNhbF9kcml2ZV9udW1iZXIgPSAwO1xuICAgICAgICB0aGlzLkJQQi5ib290X3NlY3Rvcl9zaWduYXR1cmUgPSAweEFBNTU7XG4gICAgfVxuXG5cbiAgICBhZGRGaWxlKGZpbGVuYW1lOiBzdHJpbmcsIGV4dGVuc2lvbjogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpe1xuICAgICAgICBsZXQgZW5jID0gbmV3IFRleHRFbmNvZGVyKCk7XG4gICAgICAgIHRoaXMucm9vdC5hZGRGaWxlKGZpbGVuYW1lLCBleHRlbnNpb24sIEZpbGVBdHRyaWJ1dGUuQVJDSElWRSwgZW5jLmVuY29kZShjb250ZW50KSk7XG4gICAgfVxuXG4gICAgYWRkQmluYXJ5RmlsZShmaWxlbmFtZTogc3RyaW5nLCBleHRlbnNpb246IHN0cmluZywgY29udGVudDogVWludDhBcnJheSl7XG4gICAgICAgIHRoaXMucm9vdC5hZGRGaWxlKGZpbGVuYW1lLCBleHRlbnNpb24sIEZpbGVBdHRyaWJ1dGUuQVJDSElWRSwgY29udGVudCk7XG4gICAgfVxuXG4gICAgZ2VuZXJhdGVfYmluYXJ5KCl7XG4gICAgICAgIHJldHVybiAgICAgICAgICB0aGlzLkJQQi5nZW5lcmF0ZUJQQigpXG4gICAgICAgICAgICAgICAgLmNvbmNhdCh0aGlzLnRhYmxlLmdlbmVyYXRlVGFibGUoKSlcbiAgICAgICAgICAgICAgICAuY29uY2F0KHRoaXMucm9vdC5nZW5lcmF0ZVJvb3REaXJlY3RvcnkoKSk7XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgRmF0VXRpbHMgfSBmcm9tIFwiLi9mYXRfY29tbW9uXCI7XG5cbmV4cG9ydCBjbGFzcyBGYXRCUEIge1xuXG4gICAganVtcF9pbnN0OiBudW1iZXIgPSAwO1xuICAgIG9lbV9uYW1lOiBzdHJpbmcgPSBcIlwiO1xuICAgIHNlY3Rvcl9zaXplOiBudW1iZXIgPSAwO1xuICAgIGNsdXN0ZXJfc2l6ZTogbnVtYmVyID0gMDtcbiAgICByZXNlcnZlZF9zZWN0b3JzOiBudW1iZXIgPSAwO1xuICAgIGZhdHNfbnVtYmVyOiBudW1iZXIgPSAwO1xuICAgIHJvb3RfZGlyX3NpemU6IG51bWJlciA9IDA7XG4gICAgdG90YWxfc2VjdG9yczogbnVtYmVyID0gMDtcbiAgICBkaXNrX3R5cGU6IG51bWJlciA9IDA7XG4gICAgZmF0X3NpemU6IG51bWJlciA9IDA7XG4gICAgc2VjdG9yc19wZXJfdHJhY2s6IG51bWJlciA9IDA7XG4gICAgaGVhZHNfbnVtYmVyOiBudW1iZXIgPSAwO1xuICAgIGhpZGRlbl9zZWN0b3JzOiBudW1iZXIgPSAwO1xuICAgIHRvdGFsXzMyYml0c19zZWN0b3JzOiBudW1iZXIgPSAwO1xuXG4gICAgZGlza19pZGVudGlmaWVyOiBudW1iZXIgPSAwO1xuICAgIHNpZ25hdHVyZTogbnVtYmVyID0gMDtcbiAgICBkaXNrX3NlcmlhbDogbnVtYmVyID0gMDtcbiAgICBkaXNrX25hbWU6IHN0cmluZyA9IFwiXCI7XG4gICAgZmlsZV9zeXN0ZW1fdHlwZTogc3RyaW5nID0gXCJcIjtcblxuICAgIHBoeXNpY2FsX2RyaXZlX251bWJlcjogbnVtYmVyID0gMDtcbiAgICBib290X3NlY3Rvcl9zaWduYXR1cmU6IG51bWJlciA9IDA7XG5cbiAgICBjb25zdHJ1Y3Rvcigpe31cblxuICAgIGdlbmVyYXRlQlBCKCkgOiBudW1iZXJbXSB7XG4gICAgICAgIHJldHVybiAgICAgICAgICBGYXRVdGlscy5jb252ZXJ0VG9IZXgodGhpcy5qdW1wX2luc3QsIDMpXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0U3RyaW5nKHRoaXMub2VtX25hbWUsIDgpKVxuICAgICAgICAgICAgICAgIC5jb25jYXQoRmF0VXRpbHMuY29udmVydFRvSGV4KHRoaXMuc2VjdG9yX3NpemUsIDIpKVxuICAgICAgICAgICAgICAgIC5jb25jYXQoRmF0VXRpbHMuY29udmVydFRvSGV4KHRoaXMuY2x1c3Rlcl9zaXplLCAxKSlcbiAgICAgICAgICAgICAgICAuY29uY2F0KEZhdFV0aWxzLmNvbnZlcnRUb0hleCh0aGlzLnJlc2VydmVkX3NlY3RvcnMsIDIpKVxuICAgICAgICAgICAgICAgIC5jb25jYXQoRmF0VXRpbHMuY29udmVydFRvSGV4KHRoaXMuZmF0c19udW1iZXIsIDEpKVxuICAgICAgICAgICAgICAgIC5jb25jYXQoRmF0VXRpbHMuY29udmVydFRvSGV4KHRoaXMucm9vdF9kaXJfc2l6ZSwgMikpXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0VG9IZXgodGhpcy50b3RhbF9zZWN0b3JzLCAyKSlcbiAgICAgICAgICAgICAgICAuY29uY2F0KEZhdFV0aWxzLmNvbnZlcnRUb0hleCh0aGlzLmRpc2tfdHlwZSwgMSkpXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0VG9IZXgodGhpcy5mYXRfc2l6ZSwgMikpXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0VG9IZXgodGhpcy5zZWN0b3JzX3Blcl90cmFjaywgMikpXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0VG9IZXgodGhpcy5oZWFkc19udW1iZXIsIDIpKVxuICAgICAgICAgICAgICAgIC5jb25jYXQoRmF0VXRpbHMuY29udmVydFRvSGV4KHRoaXMuaGlkZGVuX3NlY3RvcnMsIDQpKVxuICAgICAgICAgICAgICAgIC5jb25jYXQoRmF0VXRpbHMuY29udmVydFRvSGV4KHRoaXMudG90YWxfMzJiaXRzX3NlY3RvcnMsIDQpKVxuXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0VG9IZXgodGhpcy5kaXNrX2lkZW50aWZpZXIsIDEpKVxuICAgICAgICAgICAgICAgIC5jb25jYXQoWzB4MDFdKVxuICAgICAgICAgICAgICAgIC5jb25jYXQoRmF0VXRpbHMuY29udmVydFRvSGV4KHRoaXMuc2lnbmF0dXJlLCAxKSlcbiAgICAgICAgICAgICAgICAuY29uY2F0KEZhdFV0aWxzLmNvbnZlcnRUb0hleCh0aGlzLmRpc2tfc2VyaWFsLCA0KSlcbiAgICAgICAgICAgICAgICAuY29uY2F0KEZhdFV0aWxzLmNvbnZlcnRTdHJpbmcodGhpcy5kaXNrX25hbWUsIDExKSlcbiAgICAgICAgICAgICAgICAuY29uY2F0KEZhdFV0aWxzLmNvbnZlcnRTdHJpbmcodGhpcy5maWxlX3N5c3RlbV90eXBlLCA4KSlcbiAgICAgICAgICAgICAgICAuY29uY2F0KEZhdFV0aWxzLmNvbnZlcnRUb0hleCggMCwgNDQ3KSlcbiAgICAgICAgICAgICAgICAuY29uY2F0KEZhdFV0aWxzLmNvbnZlcnRUb0hleCh0aGlzLnBoeXNpY2FsX2RyaXZlX251bWJlciwgMSkpXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0VG9IZXgodGhpcy5ib290X3NlY3Rvcl9zaWduYXR1cmUsIDIpKTtcbiAgICB9XG59IiwiZXhwb3J0IGNsYXNzIEZhdFV0aWxzIHtcbiAgICBzdGF0aWMgY29udmVydFN0cmluZyhzdHI6IFN0cmluZywgZmllbGRfc2l6ZTogbnVtYmVyKTogbnVtYmVyW117XG4gICAgICAgIGxldCByZXMgOiBudW1iZXJbXSA9IFtdO1xuXG4gICAgICAgIGZvcihsZXQgaSA9IDA7IGkgPCBmaWVsZF9zaXplOyArK2kpe1xuICAgICAgICAgICAgcmVzW2ldID0gKGkgPj0gc3RyLmxlbmd0aCkgPyAweDIwIDogc3RyLmNoYXJDb2RlQXQoaSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cblxuICAgIHN0YXRpYyBjb252ZXJ0VG9IZXgobnVtOiBudW1iZXIsIGZpZWxkX3NpemU6IG51bWJlcikgOiBudW1iZXJbXXtcbiAgICAgICAgbGV0IHJlcyA6IG51bWJlcltdID0gW107XG5cbiAgICAgICAgZm9yKGxldCBpID0gMDsgaSA8IGZpZWxkX3NpemU7ICsraSl7XG4gICAgICAgICAgICBsZXQgc2hpZnQgPSA4ICogaTtcbiAgICAgICAgICAgIHJlc1tpXSA9ICggbnVtID4+IHNoaWZ0ICkgJiAweDAwRkZcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxufSIsImltcG9ydCB7IEZhdEJQQiB9IGZyb20gXCIuL2ZhdF9CUEJcIjtcbmltcG9ydCB7IEZhdFV0aWxzIH0gZnJvbSBcIi4vZmF0X2NvbW1vblwiO1xuaW1wb3J0IHsgRmF0VGFibGUgfSBmcm9tIFwiLi9mYXRfdGFibGVcIjtcblxuY2xhc3MgU2VjdG9yIHtcbiAgICBkYXRhOiBVaW50OEFycmF5O1xuXG4gICAgY29uc3RydWN0b3Ioc2VjdG9yX3NpemU6IG51bWJlcil7XG4gICAgICAgIHRoaXMuZGF0YSA9IG5ldyBVaW50OEFycmF5KHNlY3Rvcl9zaXplKTtcblxuICAgICAgICB0aGlzLmVyYXNlKCk7XG4gICAgfVxuXG4gICAgZXJhc2UoKXtcbiAgICAgICAgdGhpcy5kYXRhLmZpbGwoMHhGRik7XG4gICAgfVxuXG4gICAgc2V0KHNvdXJjZTogVWludDhBcnJheSl7XG4gICAgICAgIGZvciggbGV0IGkgPSAwOyBpIDwgdGhpcy5kYXRhLmxlbmd0aDsgaSsrICl7XG4gICAgICAgICAgICB0aGlzLmRhdGFbaV0gPSAoaSA+PSBzb3VyY2UubGVuZ3RoKSA/IDB4MDAgOiBzb3VyY2VbaV07XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5jbGFzcyBGYXRSb290RGlyZWN0b3J5X0ZpbGV7XG4gICAgZmlsZW5hbWU6IHN0cmluZyA9IFwiXCI7XG4gICAgZXh0ZW5zaW9uOiBzdHJpbmcgPSBcIlwiO1xuICAgIGF0dHJpYnV0ZTogRmlsZUF0dHJpYnV0ZSA9IDB4MDA7XG4gICAgY3JlYXRlX21zOiBudW1iZXIgPSAwO1xuICAgIGNyZWF0ZV90aW1lOiBudW1iZXIgPSAwO1xuICAgIGNyZWF0ZV9kYXRlOiBudW1iZXIgPSAwO1xuICAgIGxhc3RfYWNjZXNzX2RhdGU6IG51bWJlciA9IDA7XG4gICAgbW9kaWZpY2F0aW9uX3RpbWU6IG51bWJlciA9IDA7XG4gICAgbW9kaWZpY2F0aW9uX2RhdGU6IG51bWJlciA9IDA7XG4gICAgY2x1c3Rlcl9udW1iZXI6IG51bWJlciA9IDA7XG4gICAgZmlsZV9zaXplOiBudW1iZXIgPSAwO1xuXG4gICAgY29uc3RydWN0b3IoKXt9XG5cbiAgICBnZW5lcmF0ZV9maWxlKCkgOiBudW1iZXJbXSB7XG4gICAgICAgIHJldHVybiAgICAgICAgICBGYXRVdGlscy5jb252ZXJ0U3RyaW5nKHRoaXMuZmlsZW5hbWUsIDgpXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0U3RyaW5nKHRoaXMuZXh0ZW5zaW9uLCAzKSlcbiAgICAgICAgICAgICAgICAuY29uY2F0KEZhdFV0aWxzLmNvbnZlcnRUb0hleCh0aGlzLmF0dHJpYnV0ZSwgMSkpXG4gICAgICAgICAgICAgICAgLmNvbmNhdChbMHgwMF0pXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0VG9IZXgoTWF0aC5mbG9vcih0aGlzLmNyZWF0ZV9tcy8xMCksIDEpKVxuICAgICAgICAgICAgICAgIC5jb25jYXQoRmF0VXRpbHMuY29udmVydFRvSGV4KHRoaXMuY3JlYXRlX3RpbWUsIDIpKVxuICAgICAgICAgICAgICAgIC5jb25jYXQoRmF0VXRpbHMuY29udmVydFRvSGV4KHRoaXMuY3JlYXRlX2RhdGUsIDIpKVxuICAgICAgICAgICAgICAgIC5jb25jYXQoRmF0VXRpbHMuY29udmVydFRvSGV4KHRoaXMubGFzdF9hY2Nlc3NfZGF0ZSwgMikpXG4gICAgICAgICAgICAgICAgLmNvbmNhdChbMHgwMCwgMHgwMF0pXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0VG9IZXgodGhpcy5tb2RpZmljYXRpb25fdGltZSwgMikpXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0VG9IZXgodGhpcy5tb2RpZmljYXRpb25fZGF0ZSwgMikpXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0VG9IZXgodGhpcy5jbHVzdGVyX251bWJlciwgMikpXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0VG9IZXgodGhpcy5maWxlX3NpemUsIDQpKTtcbiAgICB9XG59O1xuXG5leHBvcnQgZW51bSBGaWxlQXR0cmlidXRlIHtcbiAgICBSRUFET05MWSA9IDB4MDEsXG4gICAgSElEREVOID0gMHgwMixcbiAgICBTWVNURU0gPSAweDAzLFxuICAgIFZPTFVNRV9OQU1FID0gMHgwOCxcbiAgICBTVUJESVJFQ1RPUlkgPSAweDEwLFxuICAgIEFSQ0hJVkUgPSAweDIwLFxuICAgIERFVklDRSA9IDB4NDAsXG4gICAgUkVTRVJWRUQgPSAweDgwXG59O1xuXG4vLyAhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISFcbi8vICEhISAgIFRISVMgQ0xBU1MgT05MWSBXT1JLUyBGT1IgMSBTRUNUT1IgUEVSIENMVVNURVIgICEhIVxuLy8gISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhXG5leHBvcnQgY2xhc3MgRmF0Um9vdERpcmVjdG9yeXtcblxuICAgIHN0YXRpYyByZWFkb25seSBGSUxFX05PVF9TRVQgPSBbIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAgXTtcblxuICAgIHByaXZhdGUgc2VjdG9yX3NpemU6IG51bWJlcjtcbiAgICBwcml2YXRlIGZpbGVzOiAobnVsbCB8IEZhdFJvb3REaXJlY3RvcnlfRmlsZSlbXTtcbiAgICBwcml2YXRlIHNlY3RvcnM6IFNlY3RvcltdXG4gICAgcHJpdmF0ZSBmYXRfdGFibGU6IEZhdFRhYmxlO1xuICAgIHByaXZhdGUgYmlnZ2VzdF9jbHVzdGVyX3VzZTogbnVtYmVyO1xuXG4gICAgY29uc3RydWN0b3IoYnBiOiBGYXRCUEIsIGZhdF90YWJsZTogRmF0VGFibGUsIHZvbHVtZV9uYW1lOiBzdHJpbmcpe1xuICAgICAgICB0aGlzLnNlY3Rvcl9zaXplID0gYnBiLnNlY3Rvcl9zaXplO1xuICAgICAgICB0aGlzLmZhdF90YWJsZSA9IGZhdF90YWJsZTtcbiAgICAgICAgdGhpcy5maWxlcyA9IG5ldyBBcnJheShicGIucm9vdF9kaXJfc2l6ZSk7XG4gICAgICAgIHRoaXMuc2VjdG9ycyA9IG5ldyBBcnJheSggTWF0aC5mbG9vciggKCAoYnBiLnRvdGFsX3NlY3RvcnMgKiBicGIuc2VjdG9yX3NpemUpIC0gNTEyIC0gZmF0X3RhYmxlLmdldFNpemUoKSAtIChicGIucm9vdF9kaXJfc2l6ZSAqIDMyKSApIC8gYnBiLnNlY3Rvcl9zaXplICkgKTsgLy8gdG90YWwgZGF0YSBzZWN0b3Igc2l6ZSAob2N0ZXRzKSA9IFRvdGFsX3NpemUgLSBib290X3NlY3RvciAtIEZBVF9UYWJsZSAtIFJvb3REaXJlY3RvcnlcblxuICAgICAgICBmb3IoIGxldCBpID0gMDsgaSA8IHRoaXMuZmlsZXMubGVuZ3RoOyArK2kpe1xuICAgICAgICAgICAgdGhpcy5maWxlc1tpXSA9IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IoIGxldCBpID0gMDsgaSA8IHRoaXMuc2VjdG9ycy5sZW5ndGg7ICsraSApe1xuICAgICAgICAgICAgdGhpcy5zZWN0b3JzW2ldID0gbmV3IFNlY3Rvcih0aGlzLnNlY3Rvcl9zaXplKTtcbiAgICAgICAgfVxuXG4gICAgICAgIFxuICAgICAgICBsZXQgZmlsZSA9IG5ldyBGYXRSb290RGlyZWN0b3J5X0ZpbGUoKTtcblxuICAgICAgICBmaWxlLmZpbGVuYW1lID0gdm9sdW1lX25hbWU7XG4gICAgICAgIGZpbGUuYXR0cmlidXRlID0gRmlsZUF0dHJpYnV0ZS5WT0xVTUVfTkFNRTtcblxuICAgICAgICB0aGlzLmZpbGVzWzBdID0gZmlsZTtcbiAgICAgICAgdGhpcy5iaWdnZXN0X2NsdXN0ZXJfdXNlID0gMDtcbiAgICB9XG5cbiAgICBhZGRGaWxlKGZpbGVuYW1lOiBzdHJpbmcsIGV4dGVuc2lvbjogc3RyaW5nLCBhdHRyaWJ1dGU6IEZpbGVBdHRyaWJ1dGUsIGNvbnRlbnQ6IFVpbnQ4QXJyYXkpe1xuICAgICAgICBsZXQgZmlsZSA9IG5ldyBGYXRSb290RGlyZWN0b3J5X0ZpbGUoKTtcbiAgICAgICAgbGV0IGRhdGUgPSBuZXcgRGF0ZSgpO1xuICAgICAgICBsZXQgbmJfY2x1c3RlciA9IE1hdGguY2VpbCggY29udGVudC5sZW5ndGggLyB0aGlzLnNlY3Rvcl9zaXplICk7XG5cbiAgICAgICAgZmlsZS5maWxlbmFtZSA9IGZpbGVuYW1lO1xuICAgICAgICBmaWxlLmV4dGVuc2lvbiA9IGV4dGVuc2lvbjtcbiAgICAgICAgZmlsZS5hdHRyaWJ1dGUgPSBhdHRyaWJ1dGU7XG4gICAgICAgIGZpbGUuY3JlYXRlX21zID0gZGF0ZS5nZXRNaWxsaXNlY29uZHMoKTtcbiAgICAgICAgZmlsZS5jcmVhdGVfdGltZSA9IHRoaXMudGltZUZpZWxkKGRhdGUpO1xuICAgICAgICBmaWxlLmNyZWF0ZV9kYXRlID0gdGhpcy5kYXRlRmllbGQoZGF0ZSk7XG4gICAgICAgIGZpbGUubGFzdF9hY2Nlc3NfZGF0ZSA9IHRoaXMuZGF0ZUZpZWxkKGRhdGUpO1xuICAgICAgICBmaWxlLm1vZGlmaWNhdGlvbl90aW1lID0gdGhpcy50aW1lRmllbGQoZGF0ZSk7XG4gICAgICAgIGZpbGUubW9kaWZpY2F0aW9uX2RhdGUgPSB0aGlzLmRhdGVGaWVsZChkYXRlKTtcbiAgICAgICAgZmlsZS5jbHVzdGVyX251bWJlciA9IHRoaXMuZmF0X3RhYmxlLmZpbmRfZnJlZV9jbHVzdGVyKCk7XG4gICAgICAgIGZpbGUuZmlsZV9zaXplID0gY29udGVudC5sZW5ndGg7XG5cblxuICAgICAgICBsZXQgbmV4dF9jbHVzdGVyID0gZmlsZS5jbHVzdGVyX251bWJlcjtcbiAgICAgICAgbGV0IGNsdXN0ZXIgPSAwO1xuXG4gICAgICAgIGZvciggbGV0IGkgPSAwOyBpIDwgbmJfY2x1c3RlcjsgaSsrICl7XG5cbiAgICAgICAgICAgIGNsdXN0ZXIgPSBuZXh0X2NsdXN0ZXI7XG5cbiAgICAgICAgICAgIGlmKCBjbHVzdGVyID4gdGhpcy5iaWdnZXN0X2NsdXN0ZXJfdXNlICkgdGhpcy5iaWdnZXN0X2NsdXN0ZXJfdXNlID0gY2x1c3RlcjtcblxuICAgICAgICAgICAgdGhpcy5zZWN0b3JzWyBjbHVzdGVyIC0gMiBdLnNldCggY29udGVudC5zbGljZSggaSAqIHRoaXMuc2VjdG9yX3NpemUsIGkgKiB0aGlzLnNlY3Rvcl9zaXplICsgdGhpcy5zZWN0b3Jfc2l6ZSApICk7XG5cblxuICAgICAgICAgICAgbmV4dF9jbHVzdGVyID0gdGhpcy5mYXRfdGFibGUuZmluZF9mcmVlX2NsdXN0ZXIoY2x1c3Rlcik7XG4gICAgICAgICAgICB0aGlzLmZhdF90YWJsZS5zZXRfbmV4dF9jbHVzdGVyKGNsdXN0ZXIsIG5leHRfY2x1c3Rlcik7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmZhdF90YWJsZS5zZXRfbmV4dF9jbHVzdGVyKGNsdXN0ZXIsIEZhdFRhYmxlLkVORF9PRl9GSUxFKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuZmlsZXNbdGhpcy5nZXRBdmFpbGFibGVGaWxlSW5kZXgoKV0gPSBmaWxlO1xuXG4gICAgfVxuXG4gICAgZ2VuZXJhdGVSb290RGlyZWN0b3J5KCkgOiBudW1iZXJbXXtcbiAgICAgICAgbGV0IHJlc3VsdDogbnVtYmVyW10gPSBbXTtcblxuXG4gICAgICAgIHRoaXMuZmlsZXMuZm9yRWFjaCggKGZpbGUpID0+IHtcbiAgICAgICAgICAgIGlmKCBmaWxlID09IG51bGwgKXtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSByZXN1bHQuY29uY2F0KCBGYXRSb290RGlyZWN0b3J5LkZJTEVfTk9UX1NFVCApXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IHJlc3VsdC5jb25jYXQoIGZpbGUuZ2VuZXJhdGVfZmlsZSgpICk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGZvcihsZXQgaSA9IDA7IGkgPCB0aGlzLnNlY3RvcnMubGVuZ3RoICYmIGkgPCB0aGlzLmJpZ2dlc3RfY2x1c3Rlcl91c2U7ICsraSApe1xuXG4gICAgICAgICAgICByZXN1bHQgPSByZXN1bHQuY29uY2F0KCBBcnJheS5mcm9tKHRoaXMuc2VjdG9yc1tpXS5kYXRhKSApO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICBwcml2YXRlIGdldEF2YWlsYWJsZUZpbGVJbmRleCgpIDogbnVtYmVye1xuICAgICAgICBmb3IobGV0IGkgPSAwOyBpIDwgdGhpcy5maWxlcy5sZW5ndGg7ICsraSl7XG4gICAgICAgICAgICBpZiggdGhpcy5maWxlc1tpXSA9PSBudWxsICl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gLTE7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBkYXRlRmllbGQoZGF0ZTogRGF0ZSkgOiBudW1iZXJ7XG4gICAgICAgIGxldCByZXM6IG51bWJlciA9IDB4MDAwMDtcblxuICAgICAgICByZXMgID0gKGRhdGUuZ2V0RnVsbFllYXIoKSAmIDB4N0YpIDw8IDk7XG4gICAgICAgIHJlcyArPSAoZGF0ZS5nZXRNb250aCgpICYgMHgwRikgPDwgNTtcbiAgICAgICAgcmVzICs9IGRhdGUuZ2V0RGF5KCkgJiAweDFGO1xuXG4gICAgICAgIHJldHVybiByZXM7XG4gICAgICAgIFxuICAgIH1cblxuICAgIHByaXZhdGUgdGltZUZpZWxkKGRhdGU6IERhdGUpIDogbnVtYmVye1xuICAgICAgICBsZXQgcmVzOiBudW1iZXIgPSAweDAwMDA7XG5cbiAgICAgICAgcmVzICA9IChkYXRlLmdldEhvdXJzKCkgJiAweDFGKSA8PCAxMTtcbiAgICAgICAgcmVzICs9IChkYXRlLmdldE1pbnV0ZXMoKSAmIDB4M0YpIDw8IDU7XG4gICAgICAgIHJlcyArPSBNYXRoLmZsb29yKGRhdGUuZ2V0U2Vjb25kcygpIC8gMikgJiAweDFGO1xuXG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxufSIsImltcG9ydCB7IEZhdEJQQiB9IGZyb20gXCIuL2ZhdF9CUEJcIjtcblxuZXhwb3J0IGNsYXNzIEZhdFRhYmxlIHtcblxuICAgIHN0YXRpYyBFTkRfT0ZfRklMRSA6IG51bWJlciA9IDB4RkZGO1xuICAgIHN0YXRpYyBCQURfQ0xVU1RFUiA6IG51bWJlciA9IDB4RkY3O1xuXG4gICAgcHJpdmF0ZSB0YWJsZSA6IFVpbnQxNkFycmF5O1xuICAgIHByaXZhdGUgc2l6ZTogbnVtYmVyO1xuXG4gICAgY29uc3RydWN0b3IoIGJwYjogRmF0QlBCICl7XG4gICAgICAgIHRoaXMuc2l6ZSA9IE1hdGguZmxvb3IoICggYnBiLmZhdF9zaXplICogYnBiLnNlY3Rvcl9zaXplICkgLyAxLjUpOyAvLyAvIDEuNSBiZWNhdXNlIHdlIGFyZSB1c2luZyBGQVQxMlxuICAgICAgICB0aGlzLnRhYmxlID0gbmV3IFVpbnQxNkFycmF5KCB0aGlzLnNpemUgKTsgICAgXG4gICAgICAgIFxuICAgICAgICAvLyBNYWdpY2sgbnVtYmVyXG4gICAgICAgIHRoaXMudGFibGVbMF0gPSBicGIuZGlza190eXBlIHwgMHhGMDA7XG5cbiAgICAgICAgLy8gUmVzZXJ2ZWQgY2x1c3RlclxuICAgICAgICB0aGlzLnRhYmxlWzFdID0gMHhGRkY7XG4gICAgXG4gICAgICAgIGZvciggbGV0IGkgPSAyOyBpIDwgdGhpcy50YWJsZS5sZW5ndGg7ICsraSApe1xuICAgICAgICAgICAgdGhpcy50YWJsZVtpXSA9IDB4MDAwOyAgIC8vU2V0IGNsdXN0ZXIgYXMgYXZhaWxhYmxlXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzZXRfbmV4dF9jbHVzdGVyKGNsdXN0ZXI6IG51bWJlciwgbmV4dDogbnVtYmVyKXtcbiAgICAgICAgaWYoIGNsdXN0ZXIgPj0gdGhpcy50YWJsZS5sZW5ndGggKXtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMudGFibGVbY2x1c3Rlcl0gPSAobmV4dCA+PSB0aGlzLnRhYmxlLmxlbmd0aCAmJiBuZXh0ICE9IEZhdFRhYmxlLkVORF9PRl9GSUxFKSA/IEZhdFRhYmxlLkJBRF9DTFVTVEVSIDogKG5leHQgJiAweEZGRik7XG4gICAgfVxuXG4gICAgZmluZF9mcmVlX2NsdXN0ZXIoZXhjZXB0OiBudW1iZXIgPSAtMSk6IG51bWJlcntcbiAgICAgICAgZm9yKCBsZXQgaSA9IDI7IGkgPCB0aGlzLnRhYmxlLmxlbmd0aCA7ICsraSl7XG4gICAgICAgICAgICBpZiggdGhpcy50YWJsZVtpXSA9PSAweDAwMCAmJiBpICE9IGV4Y2VwdCl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gLTE7XG4gICAgfVxuXG4gICAgZ2VuZXJhdGVUYWJsZSgpIDogbnVtYmVyW117XG4gICAgICAgIC8qXG4gICAgICAgICAgICB0d28gMTIgYml0cyBudW1iZXJzIDogMHhBQkMgYW5kIDB4WFlaXG4gICAgICAgICAgICBjb25jYXRlbmF0IGluIDI0IGJpdHMgbnVtYmVyOiAweEFCQ1hZWlxuICAgICAgICAgICAgc2hvdWxkIGJlIHN0b3JlZCBsaWtlIHRoaXMgOiBCQyBaQSBYWVxuICAgICAgICAqL1xuXG4gICAgICAgIGxldCByZXN1bHQ6IG51bWJlcltdID0gW107XG5cbiAgICAgICAgZm9yKCBsZXQgaSA9IDA7IGkgPCB0aGlzLnRhYmxlLmxlbmd0aDsgaSArPSAyICl7XG4gICAgICAgICAgICBsZXQgdG1wID0gMDtcblxuICAgICAgICAgICAgdG1wID0gKHRoaXMudGFibGVbaV0gJiAweDBGRkYpIDw8IDEyO1xuICAgICAgICAgICAgdG1wIHw9IHRoaXMudGFibGVbaSsxXSAmIDB4MEZGRjtcblxuICAgICAgICAgICAgcmVzdWx0LnB1c2goICAodG1wICYgMHgwRkYwMDApID4+IDEyICApOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQkNcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKCAoKHRtcCAmIDB4RjAwMDAwKSA+PiAyMCkgfCAoKHRtcCAmIDB4MDAwMDBGKSA8PCA0KSApOyAgIC8vIFpBID0gKEEgPj4gNDApICsgKFogPDwgOClcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKCAgKHRtcCAmIDB4MDAwRkYwKSA+PiA0ICk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFhZXG4gICAgICAgIH1cblxuICAgICAgICByZXN1bHQucG9wKCk7ICAgLy8gVGhlIGxhc3QgZWxlbWVudCBpcyBpbmNvbXBsZXQsIHNvIHdlIHJlbW92aW5nIGl0XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICBnZXRTaXplKCkgOiBudW1iZXJ7XG4gICAgICAgIHJldHVybiB0aGlzLnNpemU7XG4gICAgfVxuXG59IiwiZXhwb3J0IGVudW0gUHJvZ3Jlc3NNZXNzYWdlVHlwZSB7XG4gICAgSU5GTyA9IFwiaW5mb1wiLFxuICAgIFdBUk5JTkcgPSBcIndhcm5pbmdcIixcbiAgICBFUlJPUiA9IFwiZXJyb3JcIlxufTtcblxuZXhwb3J0IGNsYXNzIFByb2dyZXNzRGlhbG9ne1xuXG4gICAgcHJpdmF0ZSBkaWFsb2c6IEhUTUxFbGVtZW50O1xuICAgIHByaXZhdGUgcHJvZ3Jlc3NfYmFyX2RpdjogSFRNTEVsZW1lbnQ7XG5cbiAgICBjb25zdHJ1Y3Rvcih0aXRsZTogc3RyaW5nID0gXCJVcGxvYWRpbmcuLi5cIiwgdGV4dDogc3RyaW5nID0gXCJZb3VyIHByb2dyYW0gaXMgdXBsb2FkaW5nIHRvIHlvdXIgdGFyZ2V0LCBwbGVhc2Ugd2FpdC48YnIvPjxici8+PGk+RG8gbm90IHVucGx1Z2dlZCB5b3VyIGJvYXJkLCBkbyBub3QgY2xvc2UgdGhpcyB0YWIgbm9yIGNoYW5nZSB0YWIgZHVyaW5nIHVwbG9hZGluZy48L2k+XCIpe1xuICAgICAgICB0aGlzLmRpYWxvZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgIHRoaXMuZGlhbG9nLmNsYXNzTGlzdC5hZGQoXCJwcm9ncmVzcy1kaWFsb2dcIik7XG4gICAgICAgIHRoaXMuZGlhbG9nLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcblxuICAgICAgICBsZXQgY29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgY29udGFpbmVyLmNsYXNzTGlzdC5hZGQoXCJwcm9ncmVzcy1kaWFsb2ctY29udGFpbmVyXCIpXG5cbiAgICAgICAgbGV0IHRpdGxlX2VsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgdGl0bGVfZWwuY2xhc3NMaXN0LmFkZChcInByb2dyZXNzLWRpYWxvZy10aXRsZVwiKTtcbiAgICAgICAgdGl0bGVfZWwuaW5uZXJUZXh0ID0gdGl0bGU7XG5cbiAgICAgICAgbGV0IGNvbnRlbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICBjb250ZW50LmNsYXNzTGlzdC5hZGQoXCJwcm9ncmVzcy1kaWFsb2ctY29udGVudFwiKTtcblxuICAgICAgICBsZXQgdGV4dF9lbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJwXCIpO1xuICAgICAgICB0ZXh0X2VsLmlubmVySFRNTCA9IHRleHQ7XG5cbiAgICAgICAgbGV0IGNsb3NlX2J1dHRvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJidXR0b25cIik7XG4gICAgICAgIGNsb3NlX2J1dHRvbi5jbGFzc0xpc3QuYWRkKFwicHJvZ3Jlc3MtZGlhbG9nLWNsb3NlLWJ1dHRvblwiKTtcbiAgICAgICAgY2xvc2VfYnV0dG9uLmlubmVyVGV4dCA9IFwiQ2xvc2VcIjtcbiAgICAgICAgY2xvc2VfYnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoIFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5jbG9zZSgpICk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLnByb2dyZXNzX2Jhcl9kaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICB0aGlzLnByb2dyZXNzX2Jhcl9kaXYuY2xhc3NMaXN0LmFkZChcInByb2dyZXNzLWRpYWxvZy1iYXItY29udGFpbmVyXCIpXG5cbiAgICAgICAgbGV0IHZhbHVlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInBcIik7XG4gICAgICAgIHZhbHVlLmNsYXNzTGlzdC5hZGQoXCJwcm9ncmVzcy1kaWFsb2ctYmFyLXZhbHVlXCIpO1xuXG4gICAgICAgIGxldCBiYXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICBiYXIuY2xhc3NMaXN0LmFkZChcInByb2dyZXNzLWRpYWxvZy1iYXItY3Vyc29yXCIpO1xuXG4gICAgICAgIHRoaXMucHJvZ3Jlc3NfYmFyX2Rpdi5hcHBlbmQodmFsdWUpO1xuICAgICAgICB0aGlzLnByb2dyZXNzX2Jhcl9kaXYuYXBwZW5kKGJhcik7XG5cbiAgICAgICAgbGV0IGluZm9zID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgaW5mb3MuY2xhc3NMaXN0LmFkZChcInByb2dyZXNzLWRpYWxvZy1pbmZvc1wiKTtcblxuXG4gICAgICAgIGNvbnRlbnQuYXBwZW5kKHRleHRfZWwpO1xuICAgICAgICBjb250ZW50LmFwcGVuZCh0aGlzLnByb2dyZXNzX2Jhcl9kaXYpO1xuICAgICAgICBjb250ZW50LmFwcGVuZChcIlN0YXR1czpcIik7XG4gICAgICAgIGNvbnRlbnQuYXBwZW5kKGluZm9zKTtcbiAgICAgICAgY29udGVudC5hcHBlbmQoY2xvc2VfYnV0dG9uKTtcblxuICAgICAgICBjb250YWluZXIuYXBwZW5kKHRpdGxlX2VsKTtcbiAgICAgICAgY29udGFpbmVyLmFwcGVuZChjb250ZW50KTtcblxuICAgICAgICB0aGlzLmRpYWxvZy5hcHBlbmQoY29udGFpbmVyKTtcblxuICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZCh0aGlzLmRpYWxvZyk7XG4gICAgfVxuXG4gICAgc2hvd0Nsb3NlQnV0dG9uKCl7XG4gICAgICAgICh0aGlzLmRpYWxvZy5xdWVyeVNlbGVjdG9yKFwiLnByb2dyZXNzLWRpYWxvZy1jbG9zZS1idXR0b25cIikgYXMgSFRNTEVsZW1lbnQpLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XG4gICAgfVxuXG4gICAgc2V0UHJvZ3Jlc3NWYWx1ZShwcm9ncmVzczogbnVtYmVyKXtcbiAgICAgICAgKHRoaXMuZGlhbG9nLnF1ZXJ5U2VsZWN0b3IoXCIucHJvZ3Jlc3MtZGlhbG9nLWJhci12YWx1ZVwiKSBhcyBIVE1MRWxlbWVudCkuaW5uZXJIVE1MID0gTWF0aC5yb3VuZChwcm9ncmVzcykgKyBcIiVcIjtcbiAgICAgICAgKHRoaXMuZGlhbG9nLnF1ZXJ5U2VsZWN0b3IoXCIucHJvZ3Jlc3MtZGlhbG9nLWJhci1jdXJzb3JcIikgYXMgSFRNTEVsZW1lbnQpLnN0eWxlLndpZHRoID0gcHJvZ3Jlc3MgKyBcIiVcIjtcbiAgICB9XG5cbiAgICBhZGRJbmZvKGxpbmU6IHN0cmluZywgdHlwZTogUHJvZ3Jlc3NNZXNzYWdlVHlwZSA9IFByb2dyZXNzTWVzc2FnZVR5cGUuSU5GTyl7XG4gICAgICAgICh0aGlzLmRpYWxvZy5xdWVyeVNlbGVjdG9yKFwiLnByb2dyZXNzLWRpYWxvZy1pbmZvc1wiKSBhcyBIVE1MRWxlbWVudCkuaW5uZXJIVE1MICs9IGA8c3BhbiBjbGFzcz1cIiR7dHlwZX1cIj4ke2xpbmV9PC9zcGFuPjxici8+YDtcbiAgICB9XG5cbiAgICBvcGVuKCl7XG4gICAgICAgIHRoaXMuZGlhbG9nLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XG5cbiAgICAgICAgdGhpcy5zZXRQcm9ncmVzc1ZhbHVlKDApO1xuICAgICAgICAodGhpcy5kaWFsb2cucXVlcnlTZWxlY3RvcihcIi5wcm9ncmVzcy1kaWFsb2ctY2xvc2UtYnV0dG9uXCIpIGFzIEhUTUxFbGVtZW50KS5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XG4gICAgICAgICh0aGlzLmRpYWxvZy5xdWVyeVNlbGVjdG9yKFwiLnByb2dyZXNzLWRpYWxvZy1pbmZvc1wiKSBhcyBIVE1MRWxlbWVudCkuaW5uZXJIVE1MID0gXCJcIjtcbiAgICB9XG5cbiAgICBjbG9zZSgpe1xuICAgICAgICB0aGlzLmRpYWxvZy5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XG4gICAgfVxufTsiLCJleHBvcnQgY2xhc3MgU2VyaWFsT3V0cHV0IHtcblxuICAgIHByaXZhdGUgb3V0cHV0IDogSFRNTEVsZW1lbnQ7XG5cbiAgICBjb25zdHJ1Y3RvcihwYXJlbnQ6IEhUTUxFbGVtZW50KXtcbiAgICAgICAgdGhpcy5vdXRwdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICB0aGlzLm91dHB1dC5jbGFzc0xpc3QuYWRkKFwic2VyaWFsX291dHB1dFwiKTtcblxuICAgICAgICBwYXJlbnQuYXBwZW5kKHRoaXMub3V0cHV0KTtcbiAgICB9XG5cbiAgICB3cml0ZShzdHI6IHN0cmluZyl7XG4gICAgICAgIC8vdGhpcy5vdXRwdXQuaW5uZXJUZXh0ICs9IGBbJHt0aGlzLmdlbmVyYXRlX3RpbWVfcHJlZml4KCl9XSAke3N0cn1gO1xuICAgICAgICB0aGlzLm91dHB1dC5pbm5lclRleHQgKz0gc3RyO1xuICAgICAgICB0aGlzLm91dHB1dC5zY3JvbGxUb3AgPSB0aGlzLm91dHB1dC5zY3JvbGxIZWlnaHQ7XG4gICAgfVxuXG4gICAgY2xlYXIoKXtcbiAgICAgICAgdGhpcy5vdXRwdXQuaW5uZXJUZXh0ID0gXCJcIjtcbiAgICB9XG5cbiAgICAvLyBnZW5lcmF0ZV90aW1lX3ByZWZpeCgpe1xuICAgIC8vICAgICB2YXIgZCA9IG5ldyBEYXRlKCk7XG4gICAgLy8gICAgIHJldHVybiBgJHt0aGlzLnplcm9fcGFkZGluZyhkLmdldEhvdXJzKCksIDIpfToke3RoaXMuemVyb19wYWRkaW5nKGQuZ2V0TWludXRlcygpLCAyKX06JHt0aGlzLnplcm9fcGFkZGluZyhkLmdldFNlY29uZHMoKSwgMil9LiR7dGhpcy56ZXJvX3BhZGRpbmcoZC5nZXRNaWxsaXNlY29uZHMoKSwgMyl9YDtcbiAgICAvLyB9XG5cbiAgICAvLyB6ZXJvX3BhZGRpbmcobnVtOiBudW1iZXIsIG5iX3plcm9zOiBudW1iZXIpe1xuICAgIC8vICAgICBsZXQgcyA9IG51bS50b1N0cmluZygpO1xuXG4gICAgLy8gICAgIHJldHVybiBgJHtcIjBcIi5yZXBlYXQoTWF0aC5tYXgoMCwgbmJfemVyb3MgLSBzLmxlbmd0aCkpfSR7c31gO1xuICAgIC8vIH1cbn0iXX0=
