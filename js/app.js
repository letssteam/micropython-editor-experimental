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
                            var _a, _b, _c, _d, _e, _f;
                            return __generator(this, function (_g) {
                                switch (_g.label) {
                                    case 0:
                                        if (!file.isBinary) return [3 /*break*/, 2];
                                        _b = (_a = fat).addBinaryFile;
                                        _c = [file.name, file.extension];
                                        return [4 /*yield*/, this.readFileAsBinary(file.path)];
                                    case 1:
                                        _b.apply(_a, _c.concat([_g.sent()]));
                                        return [3 /*break*/, 4];
                                    case 2:
                                        _e = (_d = fat).addFile;
                                        _f = [file.name, file.extension];
                                        return [4 /*yield*/, this.readFileAsText(file.path)];
                                    case 3:
                                        _e.apply(_d, _f.concat([_g.sent()]));
                                        _g.label = 4;
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
                    case 0: return [4 /*yield*/, this.fetchNoCache(file)];
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
                    case 0: return [4 /*yield*/, this.fetchNoCache(file)];
                    case 1:
                        rep = _a.sent();
                        return [2 /*return*/, rep.text()];
                }
            });
        });
    };
    ActionFlash.prototype.readFileAsBinary = function (file) {
        return __awaiter(this, void 0, void 0, function () {
            var rep, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.fetchNoCache(file)];
                    case 1:
                        rep = _b.sent();
                        _a = Uint8Array.bind;
                        return [4 /*yield*/, rep.arrayBuffer()];
                    case 2: return [2 /*return*/, new (_a.apply(Uint8Array, [void 0, _b.sent()]))()];
                }
            });
        });
    };
    ActionFlash.prototype.fetchNoCache = function (file, method) {
        if (method === void 0) { method = "GET"; }
        var myHeaders = new Headers();
        myHeaders.append('pragma', 'no-cache');
        myHeaders.append('cache-control', 'no-cache');
        return fetch(file, { method: method, headers: myHeaders });
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
var alert_dialog_1 = require("./alert_dialog");
var version_1 = require("./version");
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
        new button_dropdown_1.ButtonDropdown(this.top_container, "img/settings.png", [new button_dropdown_1.ButtonDropdownElement("Clear console", function () { _this.serial_output.clear(); }, "f120"), new button_dropdown_1.ButtonDropdownElement("Force task stop", function () { _this.dapLinkWrapper.sendKeyboardInterrupt(); }, "f54c"), new button_dropdown_1.ButtonDropdownElement("About", function () { return _this.about(); }, "f059")], "Settings");
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
    Application.prototype.about = function () {
        new alert_dialog_1.AlertDialog("About", "Version: ".concat(version_1.APP_VERSION), alert_dialog_1.AlertDialogIcon.INFO).open();
    };
    return Application;
}());
exports.Application = Application;
// @ts-ignore
window["Application"] = Application;
// @ts-ignore
window["AlertDialog"] = alert_dialog_1.AlertDialog;
// @ts-ignore
window["AlertDialogIcon"] = alert_dialog_1.AlertDialogIcon;

},{"./TwoPanelContainer":6,"./actions/action_connection":7,"./actions/action_flash":8,"./actions/action_load":9,"./actions/action_run":10,"./actions/action_save":11,"./actions/action_settings":12,"./alert_dialog":13,"./button/button":15,"./button/buttonSpacer":16,"./button/button_dropdown":17,"./button/button_placeholder":18,"./button/button_toggle":19,"./daplink":21,"./serialOutput":29,"./version":30}],15:[function(require,module,exports){
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

},{}],30:[function(require,module,exports){
"use strict";
exports.__esModule = true;
exports.APP_VERSION = void 0;
exports.APP_VERSION = "main_6f1fd8d_2022-04-01";

},{}]},{},[14])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYmFzZTY0LWpzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2J1ZmZlci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9kYXBqcy9kaXN0L2RhcC51bWQuanMiLCJub2RlX21vZHVsZXMvZmlsZS1zYXZlci9kaXN0L0ZpbGVTYXZlci5taW4uanMiLCJub2RlX21vZHVsZXMvaWVlZTc1NC9pbmRleC5qcyIsInNyYy9Ud29QYW5lbENvbnRhaW5lci50cyIsInNyYy9hY3Rpb25zL2FjdGlvbl9jb25uZWN0aW9uLnRzIiwic3JjL2FjdGlvbnMvYWN0aW9uX2ZsYXNoLnRzIiwic3JjL2FjdGlvbnMvYWN0aW9uX2xvYWQudHMiLCJzcmMvYWN0aW9ucy9hY3Rpb25fcnVuLnRzIiwic3JjL2FjdGlvbnMvYWN0aW9uX3NhdmUudHMiLCJzcmMvYWN0aW9ucy9hY3Rpb25fc2V0dGluZ3MudHMiLCJzcmMvYWxlcnRfZGlhbG9nLnRzIiwic3JjL2FwcC50cyIsInNyYy9idXR0b24vYnV0dG9uLnRzIiwic3JjL2J1dHRvbi9idXR0b25TcGFjZXIudHMiLCJzcmMvYnV0dG9uL2J1dHRvbl9kcm9wZG93bi50cyIsInNyYy9idXR0b24vYnV0dG9uX3BsYWNlaG9sZGVyLnRzIiwic3JjL2J1dHRvbi9idXR0b25fdG9nZ2xlLnRzIiwic3JjL2NvbW1vbi50cyIsInNyYy9kYXBsaW5rLnRzIiwic3JjL2loZXhfdXRpbC50cyIsInNyYy9taWNyb0ZBVC9mYXQudHMiLCJzcmMvbWljcm9GQVQvZmF0X0JQQi50cyIsInNyYy9taWNyb0ZBVC9mYXRfY29tbW9uLnRzIiwic3JjL21pY3JvRkFUL2ZhdF9yb290RGlyLnRzIiwic3JjL21pY3JvRkFUL2ZhdF90YWJsZS50cyIsInNyYy9wcm9ncmVzc19kaWFsb2cudHMiLCJzcmMvc2VyaWFsT3V0cHV0LnRzIiwic3JjL3ZlcnNpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDdEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDanZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2hCQTtBQUNBO0FBQ0E7Ozs7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FB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RCw0QkFBSyxHQUFMO1FBQ0ksSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDO0lBQy9CLENBQUM7SUFZTCxtQkFBQztBQUFELENBL0JBLEFBK0JDLElBQUE7QUEvQlksb0NBQVk7Ozs7OztBQ0FaLFFBQUEsV0FBVyxHQUFHLGlCQUFpQixDQUFDIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiJ3VzZSBzdHJpY3QnXG5cbmV4cG9ydHMuYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGhcbmV4cG9ydHMudG9CeXRlQXJyYXkgPSB0b0J5dGVBcnJheVxuZXhwb3J0cy5mcm9tQnl0ZUFycmF5ID0gZnJvbUJ5dGVBcnJheVxuXG52YXIgbG9va3VwID0gW11cbnZhciByZXZMb29rdXAgPSBbXVxudmFyIEFyciA9IHR5cGVvZiBVaW50OEFycmF5ICE9PSAndW5kZWZpbmVkJyA/IFVpbnQ4QXJyYXkgOiBBcnJheVxuXG52YXIgY29kZSA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvJ1xuZm9yICh2YXIgaSA9IDAsIGxlbiA9IGNvZGUubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgbG9va3VwW2ldID0gY29kZVtpXVxuICByZXZMb29rdXBbY29kZS5jaGFyQ29kZUF0KGkpXSA9IGlcbn1cblxuLy8gU3VwcG9ydCBkZWNvZGluZyBVUkwtc2FmZSBiYXNlNjQgc3RyaW5ncywgYXMgTm9kZS5qcyBkb2VzLlxuLy8gU2VlOiBodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9CYXNlNjQjVVJMX2FwcGxpY2F0aW9uc1xucmV2TG9va3VwWyctJy5jaGFyQ29kZUF0KDApXSA9IDYyXG5yZXZMb29rdXBbJ18nLmNoYXJDb2RlQXQoMCldID0gNjNcblxuZnVuY3Rpb24gZ2V0TGVucyAoYjY0KSB7XG4gIHZhciBsZW4gPSBiNjQubGVuZ3RoXG5cbiAgaWYgKGxlbiAlIDQgPiAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHN0cmluZy4gTGVuZ3RoIG11c3QgYmUgYSBtdWx0aXBsZSBvZiA0JylcbiAgfVxuXG4gIC8vIFRyaW0gb2ZmIGV4dHJhIGJ5dGVzIGFmdGVyIHBsYWNlaG9sZGVyIGJ5dGVzIGFyZSBmb3VuZFxuICAvLyBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9iZWF0Z2FtbWl0L2Jhc2U2NC1qcy9pc3N1ZXMvNDJcbiAgdmFyIHZhbGlkTGVuID0gYjY0LmluZGV4T2YoJz0nKVxuICBpZiAodmFsaWRMZW4gPT09IC0xKSB2YWxpZExlbiA9IGxlblxuXG4gIHZhciBwbGFjZUhvbGRlcnNMZW4gPSB2YWxpZExlbiA9PT0gbGVuXG4gICAgPyAwXG4gICAgOiA0IC0gKHZhbGlkTGVuICUgNClcblxuICByZXR1cm4gW3ZhbGlkTGVuLCBwbGFjZUhvbGRlcnNMZW5dXG59XG5cbi8vIGJhc2U2NCBpcyA0LzMgKyB1cCB0byB0d28gY2hhcmFjdGVycyBvZiB0aGUgb3JpZ2luYWwgZGF0YVxuZnVuY3Rpb24gYnl0ZUxlbmd0aCAoYjY0KSB7XG4gIHZhciBsZW5zID0gZ2V0TGVucyhiNjQpXG4gIHZhciB2YWxpZExlbiA9IGxlbnNbMF1cbiAgdmFyIHBsYWNlSG9sZGVyc0xlbiA9IGxlbnNbMV1cbiAgcmV0dXJuICgodmFsaWRMZW4gKyBwbGFjZUhvbGRlcnNMZW4pICogMyAvIDQpIC0gcGxhY2VIb2xkZXJzTGVuXG59XG5cbmZ1bmN0aW9uIF9ieXRlTGVuZ3RoIChiNjQsIHZhbGlkTGVuLCBwbGFjZUhvbGRlcnNMZW4pIHtcbiAgcmV0dXJuICgodmFsaWRMZW4gKyBwbGFjZUhvbGRlcnNMZW4pICogMyAvIDQpIC0gcGxhY2VIb2xkZXJzTGVuXG59XG5cbmZ1bmN0aW9uIHRvQnl0ZUFycmF5IChiNjQpIHtcbiAgdmFyIHRtcFxuICB2YXIgbGVucyA9IGdldExlbnMoYjY0KVxuICB2YXIgdmFsaWRMZW4gPSBsZW5zWzBdXG4gIHZhciBwbGFjZUhvbGRlcnNMZW4gPSBsZW5zWzFdXG5cbiAgdmFyIGFyciA9IG5ldyBBcnIoX2J5dGVMZW5ndGgoYjY0LCB2YWxpZExlbiwgcGxhY2VIb2xkZXJzTGVuKSlcblxuICB2YXIgY3VyQnl0ZSA9IDBcblxuICAvLyBpZiB0aGVyZSBhcmUgcGxhY2Vob2xkZXJzLCBvbmx5IGdldCB1cCB0byB0aGUgbGFzdCBjb21wbGV0ZSA0IGNoYXJzXG4gIHZhciBsZW4gPSBwbGFjZUhvbGRlcnNMZW4gPiAwXG4gICAgPyB2YWxpZExlbiAtIDRcbiAgICA6IHZhbGlkTGVuXG5cbiAgdmFyIGlcbiAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSArPSA0KSB7XG4gICAgdG1wID1cbiAgICAgIChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSldIDw8IDE4KSB8XG4gICAgICAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAxKV0gPDwgMTIpIHxcbiAgICAgIChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDIpXSA8PCA2KSB8XG4gICAgICByZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDMpXVxuICAgIGFycltjdXJCeXRlKytdID0gKHRtcCA+PiAxNikgJiAweEZGXG4gICAgYXJyW2N1ckJ5dGUrK10gPSAodG1wID4+IDgpICYgMHhGRlxuICAgIGFycltjdXJCeXRlKytdID0gdG1wICYgMHhGRlxuICB9XG5cbiAgaWYgKHBsYWNlSG9sZGVyc0xlbiA9PT0gMikge1xuICAgIHRtcCA9XG4gICAgICAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkpXSA8PCAyKSB8XG4gICAgICAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAxKV0gPj4gNClcbiAgICBhcnJbY3VyQnl0ZSsrXSA9IHRtcCAmIDB4RkZcbiAgfVxuXG4gIGlmIChwbGFjZUhvbGRlcnNMZW4gPT09IDEpIHtcbiAgICB0bXAgPVxuICAgICAgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpKV0gPDwgMTApIHxcbiAgICAgIChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDEpXSA8PCA0KSB8XG4gICAgICAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAyKV0gPj4gMilcbiAgICBhcnJbY3VyQnl0ZSsrXSA9ICh0bXAgPj4gOCkgJiAweEZGXG4gICAgYXJyW2N1ckJ5dGUrK10gPSB0bXAgJiAweEZGXG4gIH1cblxuICByZXR1cm4gYXJyXG59XG5cbmZ1bmN0aW9uIHRyaXBsZXRUb0Jhc2U2NCAobnVtKSB7XG4gIHJldHVybiBsb29rdXBbbnVtID4+IDE4ICYgMHgzRl0gK1xuICAgIGxvb2t1cFtudW0gPj4gMTIgJiAweDNGXSArXG4gICAgbG9va3VwW251bSA+PiA2ICYgMHgzRl0gK1xuICAgIGxvb2t1cFtudW0gJiAweDNGXVxufVxuXG5mdW5jdGlvbiBlbmNvZGVDaHVuayAodWludDgsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHRtcFxuICB2YXIgb3V0cHV0ID0gW11cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpICs9IDMpIHtcbiAgICB0bXAgPVxuICAgICAgKCh1aW50OFtpXSA8PCAxNikgJiAweEZGMDAwMCkgK1xuICAgICAgKCh1aW50OFtpICsgMV0gPDwgOCkgJiAweEZGMDApICtcbiAgICAgICh1aW50OFtpICsgMl0gJiAweEZGKVxuICAgIG91dHB1dC5wdXNoKHRyaXBsZXRUb0Jhc2U2NCh0bXApKVxuICB9XG4gIHJldHVybiBvdXRwdXQuam9pbignJylcbn1cblxuZnVuY3Rpb24gZnJvbUJ5dGVBcnJheSAodWludDgpIHtcbiAgdmFyIHRtcFxuICB2YXIgbGVuID0gdWludDgubGVuZ3RoXG4gIHZhciBleHRyYUJ5dGVzID0gbGVuICUgMyAvLyBpZiB3ZSBoYXZlIDEgYnl0ZSBsZWZ0LCBwYWQgMiBieXRlc1xuICB2YXIgcGFydHMgPSBbXVxuICB2YXIgbWF4Q2h1bmtMZW5ndGggPSAxNjM4MyAvLyBtdXN0IGJlIG11bHRpcGxlIG9mIDNcblxuICAvLyBnbyB0aHJvdWdoIHRoZSBhcnJheSBldmVyeSB0aHJlZSBieXRlcywgd2UnbGwgZGVhbCB3aXRoIHRyYWlsaW5nIHN0dWZmIGxhdGVyXG4gIGZvciAodmFyIGkgPSAwLCBsZW4yID0gbGVuIC0gZXh0cmFCeXRlczsgaSA8IGxlbjI7IGkgKz0gbWF4Q2h1bmtMZW5ndGgpIHtcbiAgICBwYXJ0cy5wdXNoKGVuY29kZUNodW5rKHVpbnQ4LCBpLCAoaSArIG1heENodW5rTGVuZ3RoKSA+IGxlbjIgPyBsZW4yIDogKGkgKyBtYXhDaHVua0xlbmd0aCkpKVxuICB9XG5cbiAgLy8gcGFkIHRoZSBlbmQgd2l0aCB6ZXJvcywgYnV0IG1ha2Ugc3VyZSB0byBub3QgZm9yZ2V0IHRoZSBleHRyYSBieXRlc1xuICBpZiAoZXh0cmFCeXRlcyA9PT0gMSkge1xuICAgIHRtcCA9IHVpbnQ4W2xlbiAtIDFdXG4gICAgcGFydHMucHVzaChcbiAgICAgIGxvb2t1cFt0bXAgPj4gMl0gK1xuICAgICAgbG9va3VwWyh0bXAgPDwgNCkgJiAweDNGXSArXG4gICAgICAnPT0nXG4gICAgKVxuICB9IGVsc2UgaWYgKGV4dHJhQnl0ZXMgPT09IDIpIHtcbiAgICB0bXAgPSAodWludDhbbGVuIC0gMl0gPDwgOCkgKyB1aW50OFtsZW4gLSAxXVxuICAgIHBhcnRzLnB1c2goXG4gICAgICBsb29rdXBbdG1wID4+IDEwXSArXG4gICAgICBsb29rdXBbKHRtcCA+PiA0KSAmIDB4M0ZdICtcbiAgICAgIGxvb2t1cFsodG1wIDw8IDIpICYgMHgzRl0gK1xuICAgICAgJz0nXG4gICAgKVxuICB9XG5cbiAgcmV0dXJuIHBhcnRzLmpvaW4oJycpXG59XG4iLCIvKiFcbiAqIFRoZSBidWZmZXIgbW9kdWxlIGZyb20gbm9kZS5qcywgZm9yIHRoZSBicm93c2VyLlxuICpcbiAqIEBhdXRob3IgICBGZXJvc3MgQWJvdWtoYWRpamVoIDxodHRwczovL2Zlcm9zcy5vcmc+XG4gKiBAbGljZW5zZSAgTUlUXG4gKi9cbi8qIGVzbGludC1kaXNhYmxlIG5vLXByb3RvICovXG5cbid1c2Ugc3RyaWN0J1xuXG52YXIgYmFzZTY0ID0gcmVxdWlyZSgnYmFzZTY0LWpzJylcbnZhciBpZWVlNzU0ID0gcmVxdWlyZSgnaWVlZTc1NCcpXG5cbmV4cG9ydHMuQnVmZmVyID0gQnVmZmVyXG5leHBvcnRzLlNsb3dCdWZmZXIgPSBTbG93QnVmZmVyXG5leHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTID0gNTBcblxudmFyIEtfTUFYX0xFTkdUSCA9IDB4N2ZmZmZmZmZcbmV4cG9ydHMua01heExlbmd0aCA9IEtfTUFYX0xFTkdUSFxuXG4vKipcbiAqIElmIGBCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVGA6XG4gKiAgID09PSB0cnVlICAgIFVzZSBVaW50OEFycmF5IGltcGxlbWVudGF0aW9uIChmYXN0ZXN0KVxuICogICA9PT0gZmFsc2UgICBQcmludCB3YXJuaW5nIGFuZCByZWNvbW1lbmQgdXNpbmcgYGJ1ZmZlcmAgdjQueCB3aGljaCBoYXMgYW4gT2JqZWN0XG4gKiAgICAgICAgICAgICAgIGltcGxlbWVudGF0aW9uIChtb3N0IGNvbXBhdGlibGUsIGV2ZW4gSUU2KVxuICpcbiAqIEJyb3dzZXJzIHRoYXQgc3VwcG9ydCB0eXBlZCBhcnJheXMgYXJlIElFIDEwKywgRmlyZWZveCA0KywgQ2hyb21lIDcrLCBTYWZhcmkgNS4xKyxcbiAqIE9wZXJhIDExLjYrLCBpT1MgNC4yKy5cbiAqXG4gKiBXZSByZXBvcnQgdGhhdCB0aGUgYnJvd3NlciBkb2VzIG5vdCBzdXBwb3J0IHR5cGVkIGFycmF5cyBpZiB0aGUgYXJlIG5vdCBzdWJjbGFzc2FibGVcbiAqIHVzaW5nIF9fcHJvdG9fXy4gRmlyZWZveCA0LTI5IGxhY2tzIHN1cHBvcnQgZm9yIGFkZGluZyBuZXcgcHJvcGVydGllcyB0byBgVWludDhBcnJheWBcbiAqIChTZWU6IGh0dHBzOi8vYnVnemlsbGEubW96aWxsYS5vcmcvc2hvd19idWcuY2dpP2lkPTY5NTQzOCkuIElFIDEwIGxhY2tzIHN1cHBvcnRcbiAqIGZvciBfX3Byb3RvX18gYW5kIGhhcyBhIGJ1Z2d5IHR5cGVkIGFycmF5IGltcGxlbWVudGF0aW9uLlxuICovXG5CdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCA9IHR5cGVkQXJyYXlTdXBwb3J0KClcblxuaWYgKCFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCAmJiB0eXBlb2YgY29uc29sZSAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICB0eXBlb2YgY29uc29sZS5lcnJvciA9PT0gJ2Z1bmN0aW9uJykge1xuICBjb25zb2xlLmVycm9yKFxuICAgICdUaGlzIGJyb3dzZXIgbGFja3MgdHlwZWQgYXJyYXkgKFVpbnQ4QXJyYXkpIHN1cHBvcnQgd2hpY2ggaXMgcmVxdWlyZWQgYnkgJyArXG4gICAgJ2BidWZmZXJgIHY1LnguIFVzZSBgYnVmZmVyYCB2NC54IGlmIHlvdSByZXF1aXJlIG9sZCBicm93c2VyIHN1cHBvcnQuJ1xuICApXG59XG5cbmZ1bmN0aW9uIHR5cGVkQXJyYXlTdXBwb3J0ICgpIHtcbiAgLy8gQ2FuIHR5cGVkIGFycmF5IGluc3RhbmNlcyBjYW4gYmUgYXVnbWVudGVkP1xuICB0cnkge1xuICAgIHZhciBhcnIgPSBuZXcgVWludDhBcnJheSgxKVxuICAgIGFyci5fX3Byb3RvX18gPSB7IF9fcHJvdG9fXzogVWludDhBcnJheS5wcm90b3R5cGUsIGZvbzogZnVuY3Rpb24gKCkgeyByZXR1cm4gNDIgfSB9XG4gICAgcmV0dXJuIGFyci5mb28oKSA9PT0gNDJcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShCdWZmZXIucHJvdG90eXBlLCAncGFyZW50Jywge1xuICBlbnVtZXJhYmxlOiB0cnVlLFxuICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcih0aGlzKSkgcmV0dXJuIHVuZGVmaW5lZFxuICAgIHJldHVybiB0aGlzLmJ1ZmZlclxuICB9XG59KVxuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyLnByb3RvdHlwZSwgJ29mZnNldCcsIHtcbiAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCFCdWZmZXIuaXNCdWZmZXIodGhpcykpIHJldHVybiB1bmRlZmluZWRcbiAgICByZXR1cm4gdGhpcy5ieXRlT2Zmc2V0XG4gIH1cbn0pXG5cbmZ1bmN0aW9uIGNyZWF0ZUJ1ZmZlciAobGVuZ3RoKSB7XG4gIGlmIChsZW5ndGggPiBLX01BWF9MRU5HVEgpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignVGhlIHZhbHVlIFwiJyArIGxlbmd0aCArICdcIiBpcyBpbnZhbGlkIGZvciBvcHRpb24gXCJzaXplXCInKVxuICB9XG4gIC8vIFJldHVybiBhbiBhdWdtZW50ZWQgYFVpbnQ4QXJyYXlgIGluc3RhbmNlXG4gIHZhciBidWYgPSBuZXcgVWludDhBcnJheShsZW5ndGgpXG4gIGJ1Zi5fX3Byb3RvX18gPSBCdWZmZXIucHJvdG90eXBlXG4gIHJldHVybiBidWZcbn1cblxuLyoqXG4gKiBUaGUgQnVmZmVyIGNvbnN0cnVjdG9yIHJldHVybnMgaW5zdGFuY2VzIG9mIGBVaW50OEFycmF5YCB0aGF0IGhhdmUgdGhlaXJcbiAqIHByb3RvdHlwZSBjaGFuZ2VkIHRvIGBCdWZmZXIucHJvdG90eXBlYC4gRnVydGhlcm1vcmUsIGBCdWZmZXJgIGlzIGEgc3ViY2xhc3Mgb2ZcbiAqIGBVaW50OEFycmF5YCwgc28gdGhlIHJldHVybmVkIGluc3RhbmNlcyB3aWxsIGhhdmUgYWxsIHRoZSBub2RlIGBCdWZmZXJgIG1ldGhvZHNcbiAqIGFuZCB0aGUgYFVpbnQ4QXJyYXlgIG1ldGhvZHMuIFNxdWFyZSBicmFja2V0IG5vdGF0aW9uIHdvcmtzIGFzIGV4cGVjdGVkIC0tIGl0XG4gKiByZXR1cm5zIGEgc2luZ2xlIG9jdGV0LlxuICpcbiAqIFRoZSBgVWludDhBcnJheWAgcHJvdG90eXBlIHJlbWFpbnMgdW5tb2RpZmllZC5cbiAqL1xuXG5mdW5jdGlvbiBCdWZmZXIgKGFyZywgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKSB7XG4gIC8vIENvbW1vbiBjYXNlLlxuICBpZiAodHlwZW9mIGFyZyA9PT0gJ251bWJlcicpIHtcbiAgICBpZiAodHlwZW9mIGVuY29kaW5nT3JPZmZzZXQgPT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICAnVGhlIFwic3RyaW5nXCIgYXJndW1lbnQgbXVzdCBiZSBvZiB0eXBlIHN0cmluZy4gUmVjZWl2ZWQgdHlwZSBudW1iZXInXG4gICAgICApXG4gICAgfVxuICAgIHJldHVybiBhbGxvY1Vuc2FmZShhcmcpXG4gIH1cbiAgcmV0dXJuIGZyb20oYXJnLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpXG59XG5cbi8vIEZpeCBzdWJhcnJheSgpIGluIEVTMjAxNi4gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vZmVyb3NzL2J1ZmZlci9wdWxsLzk3XG5pZiAodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLnNwZWNpZXMgIT0gbnVsbCAmJlxuICAgIEJ1ZmZlcltTeW1ib2wuc3BlY2llc10gPT09IEJ1ZmZlcikge1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyLCBTeW1ib2wuc3BlY2llcywge1xuICAgIHZhbHVlOiBudWxsLFxuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICB3cml0YWJsZTogZmFsc2VcbiAgfSlcbn1cblxuQnVmZmVyLnBvb2xTaXplID0gODE5MiAvLyBub3QgdXNlZCBieSB0aGlzIGltcGxlbWVudGF0aW9uXG5cbmZ1bmN0aW9uIGZyb20gKHZhbHVlLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpIHtcbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gZnJvbVN0cmluZyh2YWx1ZSwgZW5jb2RpbmdPck9mZnNldClcbiAgfVxuXG4gIGlmIChBcnJheUJ1ZmZlci5pc1ZpZXcodmFsdWUpKSB7XG4gICAgcmV0dXJuIGZyb21BcnJheUxpa2UodmFsdWUpXG4gIH1cblxuICBpZiAodmFsdWUgPT0gbnVsbCkge1xuICAgIHRocm93IFR5cGVFcnJvcihcbiAgICAgICdUaGUgZmlyc3QgYXJndW1lbnQgbXVzdCBiZSBvbmUgb2YgdHlwZSBzdHJpbmcsIEJ1ZmZlciwgQXJyYXlCdWZmZXIsIEFycmF5LCAnICtcbiAgICAgICdvciBBcnJheS1saWtlIE9iamVjdC4gUmVjZWl2ZWQgdHlwZSAnICsgKHR5cGVvZiB2YWx1ZSlcbiAgICApXG4gIH1cblxuICBpZiAoaXNJbnN0YW5jZSh2YWx1ZSwgQXJyYXlCdWZmZXIpIHx8XG4gICAgICAodmFsdWUgJiYgaXNJbnN0YW5jZSh2YWx1ZS5idWZmZXIsIEFycmF5QnVmZmVyKSkpIHtcbiAgICByZXR1cm4gZnJvbUFycmF5QnVmZmVyKHZhbHVlLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpXG4gIH1cblxuICBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAnVGhlIFwidmFsdWVcIiBhcmd1bWVudCBtdXN0IG5vdCBiZSBvZiB0eXBlIG51bWJlci4gUmVjZWl2ZWQgdHlwZSBudW1iZXInXG4gICAgKVxuICB9XG5cbiAgdmFyIHZhbHVlT2YgPSB2YWx1ZS52YWx1ZU9mICYmIHZhbHVlLnZhbHVlT2YoKVxuICBpZiAodmFsdWVPZiAhPSBudWxsICYmIHZhbHVlT2YgIT09IHZhbHVlKSB7XG4gICAgcmV0dXJuIEJ1ZmZlci5mcm9tKHZhbHVlT2YsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aClcbiAgfVxuXG4gIHZhciBiID0gZnJvbU9iamVjdCh2YWx1ZSlcbiAgaWYgKGIpIHJldHVybiBiXG5cbiAgaWYgKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC50b1ByaW1pdGl2ZSAhPSBudWxsICYmXG4gICAgICB0eXBlb2YgdmFsdWVbU3ltYm9sLnRvUHJpbWl0aXZlXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiBCdWZmZXIuZnJvbShcbiAgICAgIHZhbHVlW1N5bWJvbC50b1ByaW1pdGl2ZV0oJ3N0cmluZycpLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGhcbiAgICApXG4gIH1cblxuICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICdUaGUgZmlyc3QgYXJndW1lbnQgbXVzdCBiZSBvbmUgb2YgdHlwZSBzdHJpbmcsIEJ1ZmZlciwgQXJyYXlCdWZmZXIsIEFycmF5LCAnICtcbiAgICAnb3IgQXJyYXktbGlrZSBPYmplY3QuIFJlY2VpdmVkIHR5cGUgJyArICh0eXBlb2YgdmFsdWUpXG4gIClcbn1cblxuLyoqXG4gKiBGdW5jdGlvbmFsbHkgZXF1aXZhbGVudCB0byBCdWZmZXIoYXJnLCBlbmNvZGluZykgYnV0IHRocm93cyBhIFR5cGVFcnJvclxuICogaWYgdmFsdWUgaXMgYSBudW1iZXIuXG4gKiBCdWZmZXIuZnJvbShzdHJbLCBlbmNvZGluZ10pXG4gKiBCdWZmZXIuZnJvbShhcnJheSlcbiAqIEJ1ZmZlci5mcm9tKGJ1ZmZlcilcbiAqIEJ1ZmZlci5mcm9tKGFycmF5QnVmZmVyWywgYnl0ZU9mZnNldFssIGxlbmd0aF1dKVxuICoqL1xuQnVmZmVyLmZyb20gPSBmdW5jdGlvbiAodmFsdWUsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gZnJvbSh2YWx1ZSwgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKVxufVxuXG4vLyBOb3RlOiBDaGFuZ2UgcHJvdG90eXBlICphZnRlciogQnVmZmVyLmZyb20gaXMgZGVmaW5lZCB0byB3b3JrYXJvdW5kIENocm9tZSBidWc6XG4vLyBodHRwczovL2dpdGh1Yi5jb20vZmVyb3NzL2J1ZmZlci9wdWxsLzE0OFxuQnVmZmVyLnByb3RvdHlwZS5fX3Byb3RvX18gPSBVaW50OEFycmF5LnByb3RvdHlwZVxuQnVmZmVyLl9fcHJvdG9fXyA9IFVpbnQ4QXJyYXlcblxuZnVuY3Rpb24gYXNzZXJ0U2l6ZSAoc2l6ZSkge1xuICBpZiAodHlwZW9mIHNpemUgIT09ICdudW1iZXInKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJzaXplXCIgYXJndW1lbnQgbXVzdCBiZSBvZiB0eXBlIG51bWJlcicpXG4gIH0gZWxzZSBpZiAoc2l6ZSA8IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignVGhlIHZhbHVlIFwiJyArIHNpemUgKyAnXCIgaXMgaW52YWxpZCBmb3Igb3B0aW9uIFwic2l6ZVwiJylcbiAgfVxufVxuXG5mdW5jdGlvbiBhbGxvYyAoc2l6ZSwgZmlsbCwgZW5jb2RpbmcpIHtcbiAgYXNzZXJ0U2l6ZShzaXplKVxuICBpZiAoc2l6ZSA8PSAwKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUJ1ZmZlcihzaXplKVxuICB9XG4gIGlmIChmaWxsICE9PSB1bmRlZmluZWQpIHtcbiAgICAvLyBPbmx5IHBheSBhdHRlbnRpb24gdG8gZW5jb2RpbmcgaWYgaXQncyBhIHN0cmluZy4gVGhpc1xuICAgIC8vIHByZXZlbnRzIGFjY2lkZW50YWxseSBzZW5kaW5nIGluIGEgbnVtYmVyIHRoYXQgd291bGRcbiAgICAvLyBiZSBpbnRlcnByZXR0ZWQgYXMgYSBzdGFydCBvZmZzZXQuXG4gICAgcmV0dXJuIHR5cGVvZiBlbmNvZGluZyA9PT0gJ3N0cmluZydcbiAgICAgID8gY3JlYXRlQnVmZmVyKHNpemUpLmZpbGwoZmlsbCwgZW5jb2RpbmcpXG4gICAgICA6IGNyZWF0ZUJ1ZmZlcihzaXplKS5maWxsKGZpbGwpXG4gIH1cbiAgcmV0dXJuIGNyZWF0ZUJ1ZmZlcihzaXplKVxufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgZmlsbGVkIEJ1ZmZlciBpbnN0YW5jZS5cbiAqIGFsbG9jKHNpemVbLCBmaWxsWywgZW5jb2RpbmddXSlcbiAqKi9cbkJ1ZmZlci5hbGxvYyA9IGZ1bmN0aW9uIChzaXplLCBmaWxsLCBlbmNvZGluZykge1xuICByZXR1cm4gYWxsb2Moc2l6ZSwgZmlsbCwgZW5jb2RpbmcpXG59XG5cbmZ1bmN0aW9uIGFsbG9jVW5zYWZlIChzaXplKSB7XG4gIGFzc2VydFNpemUoc2l6ZSlcbiAgcmV0dXJuIGNyZWF0ZUJ1ZmZlcihzaXplIDwgMCA/IDAgOiBjaGVja2VkKHNpemUpIHwgMClcbn1cblxuLyoqXG4gKiBFcXVpdmFsZW50IHRvIEJ1ZmZlcihudW0pLCBieSBkZWZhdWx0IGNyZWF0ZXMgYSBub24temVyby1maWxsZWQgQnVmZmVyIGluc3RhbmNlLlxuICogKi9cbkJ1ZmZlci5hbGxvY1Vuc2FmZSA9IGZ1bmN0aW9uIChzaXplKSB7XG4gIHJldHVybiBhbGxvY1Vuc2FmZShzaXplKVxufVxuLyoqXG4gKiBFcXVpdmFsZW50IHRvIFNsb3dCdWZmZXIobnVtKSwgYnkgZGVmYXVsdCBjcmVhdGVzIGEgbm9uLXplcm8tZmlsbGVkIEJ1ZmZlciBpbnN0YW5jZS5cbiAqL1xuQnVmZmVyLmFsbG9jVW5zYWZlU2xvdyA9IGZ1bmN0aW9uIChzaXplKSB7XG4gIHJldHVybiBhbGxvY1Vuc2FmZShzaXplKVxufVxuXG5mdW5jdGlvbiBmcm9tU3RyaW5nIChzdHJpbmcsIGVuY29kaW5nKSB7XG4gIGlmICh0eXBlb2YgZW5jb2RpbmcgIT09ICdzdHJpbmcnIHx8IGVuY29kaW5nID09PSAnJykge1xuICAgIGVuY29kaW5nID0gJ3V0ZjgnXG4gIH1cblxuICBpZiAoIUJ1ZmZlci5pc0VuY29kaW5nKGVuY29kaW5nKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgfVxuXG4gIHZhciBsZW5ndGggPSBieXRlTGVuZ3RoKHN0cmluZywgZW5jb2RpbmcpIHwgMFxuICB2YXIgYnVmID0gY3JlYXRlQnVmZmVyKGxlbmd0aClcblxuICB2YXIgYWN0dWFsID0gYnVmLndyaXRlKHN0cmluZywgZW5jb2RpbmcpXG5cbiAgaWYgKGFjdHVhbCAhPT0gbGVuZ3RoKSB7XG4gICAgLy8gV3JpdGluZyBhIGhleCBzdHJpbmcsIGZvciBleGFtcGxlLCB0aGF0IGNvbnRhaW5zIGludmFsaWQgY2hhcmFjdGVycyB3aWxsXG4gICAgLy8gY2F1c2UgZXZlcnl0aGluZyBhZnRlciB0aGUgZmlyc3QgaW52YWxpZCBjaGFyYWN0ZXIgdG8gYmUgaWdub3JlZC4gKGUuZy5cbiAgICAvLyAnYWJ4eGNkJyB3aWxsIGJlIHRyZWF0ZWQgYXMgJ2FiJylcbiAgICBidWYgPSBidWYuc2xpY2UoMCwgYWN0dWFsKVxuICB9XG5cbiAgcmV0dXJuIGJ1ZlxufVxuXG5mdW5jdGlvbiBmcm9tQXJyYXlMaWtlIChhcnJheSkge1xuICB2YXIgbGVuZ3RoID0gYXJyYXkubGVuZ3RoIDwgMCA/IDAgOiBjaGVja2VkKGFycmF5Lmxlbmd0aCkgfCAwXG4gIHZhciBidWYgPSBjcmVhdGVCdWZmZXIobGVuZ3RoKVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSArPSAxKSB7XG4gICAgYnVmW2ldID0gYXJyYXlbaV0gJiAyNTVcbiAgfVxuICByZXR1cm4gYnVmXG59XG5cbmZ1bmN0aW9uIGZyb21BcnJheUJ1ZmZlciAoYXJyYXksIGJ5dGVPZmZzZXQsIGxlbmd0aCkge1xuICBpZiAoYnl0ZU9mZnNldCA8IDAgfHwgYXJyYXkuYnl0ZUxlbmd0aCA8IGJ5dGVPZmZzZXQpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignXCJvZmZzZXRcIiBpcyBvdXRzaWRlIG9mIGJ1ZmZlciBib3VuZHMnKVxuICB9XG5cbiAgaWYgKGFycmF5LmJ5dGVMZW5ndGggPCBieXRlT2Zmc2V0ICsgKGxlbmd0aCB8fCAwKSkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdcImxlbmd0aFwiIGlzIG91dHNpZGUgb2YgYnVmZmVyIGJvdW5kcycpXG4gIH1cblxuICB2YXIgYnVmXG4gIGlmIChieXRlT2Zmc2V0ID09PSB1bmRlZmluZWQgJiYgbGVuZ3RoID09PSB1bmRlZmluZWQpIHtcbiAgICBidWYgPSBuZXcgVWludDhBcnJheShhcnJheSlcbiAgfSBlbHNlIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCkge1xuICAgIGJ1ZiA9IG5ldyBVaW50OEFycmF5KGFycmF5LCBieXRlT2Zmc2V0KVxuICB9IGVsc2Uge1xuICAgIGJ1ZiA9IG5ldyBVaW50OEFycmF5KGFycmF5LCBieXRlT2Zmc2V0LCBsZW5ndGgpXG4gIH1cblxuICAvLyBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZVxuICBidWYuX19wcm90b19fID0gQnVmZmVyLnByb3RvdHlwZVxuICByZXR1cm4gYnVmXG59XG5cbmZ1bmN0aW9uIGZyb21PYmplY3QgKG9iaikge1xuICBpZiAoQnVmZmVyLmlzQnVmZmVyKG9iaikpIHtcbiAgICB2YXIgbGVuID0gY2hlY2tlZChvYmoubGVuZ3RoKSB8IDBcbiAgICB2YXIgYnVmID0gY3JlYXRlQnVmZmVyKGxlbilcblxuICAgIGlmIChidWYubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gYnVmXG4gICAgfVxuXG4gICAgb2JqLmNvcHkoYnVmLCAwLCAwLCBsZW4pXG4gICAgcmV0dXJuIGJ1ZlxuICB9XG5cbiAgaWYgKG9iai5sZW5ndGggIT09IHVuZGVmaW5lZCkge1xuICAgIGlmICh0eXBlb2Ygb2JqLmxlbmd0aCAhPT0gJ251bWJlcicgfHwgbnVtYmVySXNOYU4ob2JqLmxlbmd0aCkpIHtcbiAgICAgIHJldHVybiBjcmVhdGVCdWZmZXIoMClcbiAgICB9XG4gICAgcmV0dXJuIGZyb21BcnJheUxpa2Uob2JqKVxuICB9XG5cbiAgaWYgKG9iai50eXBlID09PSAnQnVmZmVyJyAmJiBBcnJheS5pc0FycmF5KG9iai5kYXRhKSkge1xuICAgIHJldHVybiBmcm9tQXJyYXlMaWtlKG9iai5kYXRhKVxuICB9XG59XG5cbmZ1bmN0aW9uIGNoZWNrZWQgKGxlbmd0aCkge1xuICAvLyBOb3RlOiBjYW5ub3QgdXNlIGBsZW5ndGggPCBLX01BWF9MRU5HVEhgIGhlcmUgYmVjYXVzZSB0aGF0IGZhaWxzIHdoZW5cbiAgLy8gbGVuZ3RoIGlzIE5hTiAod2hpY2ggaXMgb3RoZXJ3aXNlIGNvZXJjZWQgdG8gemVyby4pXG4gIGlmIChsZW5ndGggPj0gS19NQVhfTEVOR1RIKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0F0dGVtcHQgdG8gYWxsb2NhdGUgQnVmZmVyIGxhcmdlciB0aGFuIG1heGltdW0gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgJ3NpemU6IDB4JyArIEtfTUFYX0xFTkdUSC50b1N0cmluZygxNikgKyAnIGJ5dGVzJylcbiAgfVxuICByZXR1cm4gbGVuZ3RoIHwgMFxufVxuXG5mdW5jdGlvbiBTbG93QnVmZmVyIChsZW5ndGgpIHtcbiAgaWYgKCtsZW5ndGggIT0gbGVuZ3RoKSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgZXFlcWVxXG4gICAgbGVuZ3RoID0gMFxuICB9XG4gIHJldHVybiBCdWZmZXIuYWxsb2MoK2xlbmd0aClcbn1cblxuQnVmZmVyLmlzQnVmZmVyID0gZnVuY3Rpb24gaXNCdWZmZXIgKGIpIHtcbiAgcmV0dXJuIGIgIT0gbnVsbCAmJiBiLl9pc0J1ZmZlciA9PT0gdHJ1ZSAmJlxuICAgIGIgIT09IEJ1ZmZlci5wcm90b3R5cGUgLy8gc28gQnVmZmVyLmlzQnVmZmVyKEJ1ZmZlci5wcm90b3R5cGUpIHdpbGwgYmUgZmFsc2Vcbn1cblxuQnVmZmVyLmNvbXBhcmUgPSBmdW5jdGlvbiBjb21wYXJlIChhLCBiKSB7XG4gIGlmIChpc0luc3RhbmNlKGEsIFVpbnQ4QXJyYXkpKSBhID0gQnVmZmVyLmZyb20oYSwgYS5vZmZzZXQsIGEuYnl0ZUxlbmd0aClcbiAgaWYgKGlzSW5zdGFuY2UoYiwgVWludDhBcnJheSkpIGIgPSBCdWZmZXIuZnJvbShiLCBiLm9mZnNldCwgYi5ieXRlTGVuZ3RoKVxuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihhKSB8fCAhQnVmZmVyLmlzQnVmZmVyKGIpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICdUaGUgXCJidWYxXCIsIFwiYnVmMlwiIGFyZ3VtZW50cyBtdXN0IGJlIG9uZSBvZiB0eXBlIEJ1ZmZlciBvciBVaW50OEFycmF5J1xuICAgIClcbiAgfVxuXG4gIGlmIChhID09PSBiKSByZXR1cm4gMFxuXG4gIHZhciB4ID0gYS5sZW5ndGhcbiAgdmFyIHkgPSBiLmxlbmd0aFxuXG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBNYXRoLm1pbih4LCB5KTsgaSA8IGxlbjsgKytpKSB7XG4gICAgaWYgKGFbaV0gIT09IGJbaV0pIHtcbiAgICAgIHggPSBhW2ldXG4gICAgICB5ID0gYltpXVxuICAgICAgYnJlYWtcbiAgICB9XG4gIH1cblxuICBpZiAoeCA8IHkpIHJldHVybiAtMVxuICBpZiAoeSA8IHgpIHJldHVybiAxXG4gIHJldHVybiAwXG59XG5cbkJ1ZmZlci5pc0VuY29kaW5nID0gZnVuY3Rpb24gaXNFbmNvZGluZyAoZW5jb2RpbmcpIHtcbiAgc3dpdGNoIChTdHJpbmcoZW5jb2RpbmcpLnRvTG93ZXJDYXNlKCkpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnbGF0aW4xJzpcbiAgICBjYXNlICdiaW5hcnknOlxuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldHVybiB0cnVlXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbkJ1ZmZlci5jb25jYXQgPSBmdW5jdGlvbiBjb25jYXQgKGxpc3QsIGxlbmd0aCkge1xuICBpZiAoIUFycmF5LmlzQXJyYXkobGlzdCkpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcImxpc3RcIiBhcmd1bWVudCBtdXN0IGJlIGFuIEFycmF5IG9mIEJ1ZmZlcnMnKVxuICB9XG5cbiAgaWYgKGxpc3QubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIEJ1ZmZlci5hbGxvYygwKVxuICB9XG5cbiAgdmFyIGlcbiAgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgbGVuZ3RoID0gMFxuICAgIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgKytpKSB7XG4gICAgICBsZW5ndGggKz0gbGlzdFtpXS5sZW5ndGhcbiAgICB9XG4gIH1cblxuICB2YXIgYnVmZmVyID0gQnVmZmVyLmFsbG9jVW5zYWZlKGxlbmd0aClcbiAgdmFyIHBvcyA9IDBcbiAgZm9yIChpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyArK2kpIHtcbiAgICB2YXIgYnVmID0gbGlzdFtpXVxuICAgIGlmIChpc0luc3RhbmNlKGJ1ZiwgVWludDhBcnJheSkpIHtcbiAgICAgIGJ1ZiA9IEJ1ZmZlci5mcm9tKGJ1ZilcbiAgICB9XG4gICAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYnVmKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJsaXN0XCIgYXJndW1lbnQgbXVzdCBiZSBhbiBBcnJheSBvZiBCdWZmZXJzJylcbiAgICB9XG4gICAgYnVmLmNvcHkoYnVmZmVyLCBwb3MpXG4gICAgcG9zICs9IGJ1Zi5sZW5ndGhcbiAgfVxuICByZXR1cm4gYnVmZmVyXG59XG5cbmZ1bmN0aW9uIGJ5dGVMZW5ndGggKHN0cmluZywgZW5jb2RpbmcpIHtcbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihzdHJpbmcpKSB7XG4gICAgcmV0dXJuIHN0cmluZy5sZW5ndGhcbiAgfVxuICBpZiAoQXJyYXlCdWZmZXIuaXNWaWV3KHN0cmluZykgfHwgaXNJbnN0YW5jZShzdHJpbmcsIEFycmF5QnVmZmVyKSkge1xuICAgIHJldHVybiBzdHJpbmcuYnl0ZUxlbmd0aFxuICB9XG4gIGlmICh0eXBlb2Ygc3RyaW5nICE9PSAnc3RyaW5nJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAnVGhlIFwic3RyaW5nXCIgYXJndW1lbnQgbXVzdCBiZSBvbmUgb2YgdHlwZSBzdHJpbmcsIEJ1ZmZlciwgb3IgQXJyYXlCdWZmZXIuICcgK1xuICAgICAgJ1JlY2VpdmVkIHR5cGUgJyArIHR5cGVvZiBzdHJpbmdcbiAgICApXG4gIH1cblxuICB2YXIgbGVuID0gc3RyaW5nLmxlbmd0aFxuICB2YXIgbXVzdE1hdGNoID0gKGFyZ3VtZW50cy5sZW5ndGggPiAyICYmIGFyZ3VtZW50c1syXSA9PT0gdHJ1ZSlcbiAgaWYgKCFtdXN0TWF0Y2ggJiYgbGVuID09PSAwKSByZXR1cm4gMFxuXG4gIC8vIFVzZSBhIGZvciBsb29wIHRvIGF2b2lkIHJlY3Vyc2lvblxuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuICBmb3IgKDs7KSB7XG4gICAgc3dpdGNoIChlbmNvZGluZykge1xuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgY2FzZSAnbGF0aW4xJzpcbiAgICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICAgIHJldHVybiBsZW5cbiAgICAgIGNhc2UgJ3V0ZjgnOlxuICAgICAgY2FzZSAndXRmLTgnOlxuICAgICAgICByZXR1cm4gdXRmOFRvQnl0ZXMoc3RyaW5nKS5sZW5ndGhcbiAgICAgIGNhc2UgJ3VjczInOlxuICAgICAgY2FzZSAndWNzLTInOlxuICAgICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICAgIHJldHVybiBsZW4gKiAyXG4gICAgICBjYXNlICdoZXgnOlxuICAgICAgICByZXR1cm4gbGVuID4+PiAxXG4gICAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgICByZXR1cm4gYmFzZTY0VG9CeXRlcyhzdHJpbmcpLmxlbmd0aFxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGxvd2VyZWRDYXNlKSB7XG4gICAgICAgICAgcmV0dXJuIG11c3RNYXRjaCA/IC0xIDogdXRmOFRvQnl0ZXMoc3RyaW5nKS5sZW5ndGggLy8gYXNzdW1lIHV0ZjhcbiAgICAgICAgfVxuICAgICAgICBlbmNvZGluZyA9ICgnJyArIGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpXG4gICAgICAgIGxvd2VyZWRDYXNlID0gdHJ1ZVxuICAgIH1cbiAgfVxufVxuQnVmZmVyLmJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoXG5cbmZ1bmN0aW9uIHNsb3dUb1N0cmluZyAoZW5jb2RpbmcsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxvd2VyZWRDYXNlID0gZmFsc2VcblxuICAvLyBObyBuZWVkIHRvIHZlcmlmeSB0aGF0IFwidGhpcy5sZW5ndGggPD0gTUFYX1VJTlQzMlwiIHNpbmNlIGl0J3MgYSByZWFkLW9ubHlcbiAgLy8gcHJvcGVydHkgb2YgYSB0eXBlZCBhcnJheS5cblxuICAvLyBUaGlzIGJlaGF2ZXMgbmVpdGhlciBsaWtlIFN0cmluZyBub3IgVWludDhBcnJheSBpbiB0aGF0IHdlIHNldCBzdGFydC9lbmRcbiAgLy8gdG8gdGhlaXIgdXBwZXIvbG93ZXIgYm91bmRzIGlmIHRoZSB2YWx1ZSBwYXNzZWQgaXMgb3V0IG9mIHJhbmdlLlxuICAvLyB1bmRlZmluZWQgaXMgaGFuZGxlZCBzcGVjaWFsbHkgYXMgcGVyIEVDTUEtMjYyIDZ0aCBFZGl0aW9uLFxuICAvLyBTZWN0aW9uIDEzLjMuMy43IFJ1bnRpbWUgU2VtYW50aWNzOiBLZXllZEJpbmRpbmdJbml0aWFsaXphdGlvbi5cbiAgaWYgKHN0YXJ0ID09PSB1bmRlZmluZWQgfHwgc3RhcnQgPCAwKSB7XG4gICAgc3RhcnQgPSAwXG4gIH1cbiAgLy8gUmV0dXJuIGVhcmx5IGlmIHN0YXJ0ID4gdGhpcy5sZW5ndGguIERvbmUgaGVyZSB0byBwcmV2ZW50IHBvdGVudGlhbCB1aW50MzJcbiAgLy8gY29lcmNpb24gZmFpbCBiZWxvdy5cbiAgaWYgKHN0YXJ0ID4gdGhpcy5sZW5ndGgpIHtcbiAgICByZXR1cm4gJydcbiAgfVxuXG4gIGlmIChlbmQgPT09IHVuZGVmaW5lZCB8fCBlbmQgPiB0aGlzLmxlbmd0aCkge1xuICAgIGVuZCA9IHRoaXMubGVuZ3RoXG4gIH1cblxuICBpZiAoZW5kIDw9IDApIHtcbiAgICByZXR1cm4gJydcbiAgfVxuXG4gIC8vIEZvcmNlIGNvZXJzaW9uIHRvIHVpbnQzMi4gVGhpcyB3aWxsIGFsc28gY29lcmNlIGZhbHNleS9OYU4gdmFsdWVzIHRvIDAuXG4gIGVuZCA+Pj49IDBcbiAgc3RhcnQgPj4+PSAwXG5cbiAgaWYgKGVuZCA8PSBzdGFydCkge1xuICAgIHJldHVybiAnJ1xuICB9XG5cbiAgaWYgKCFlbmNvZGluZykgZW5jb2RpbmcgPSAndXRmOCdcblxuICB3aGlsZSAodHJ1ZSkge1xuICAgIHN3aXRjaCAoZW5jb2RpbmcpIHtcbiAgICAgIGNhc2UgJ2hleCc6XG4gICAgICAgIHJldHVybiBoZXhTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICd1dGY4JzpcbiAgICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgICAgcmV0dXJuIHV0ZjhTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICdhc2NpaSc6XG4gICAgICAgIHJldHVybiBhc2NpaVNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ2xhdGluMSc6XG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICByZXR1cm4gbGF0aW4xU2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgcmV0dXJuIGJhc2U2NFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ3VjczInOlxuICAgICAgY2FzZSAndWNzLTInOlxuICAgICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICAgIHJldHVybiB1dGYxNmxlU2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGxvd2VyZWRDYXNlKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gICAgICAgIGVuY29kaW5nID0gKGVuY29kaW5nICsgJycpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5cbi8vIFRoaXMgcHJvcGVydHkgaXMgdXNlZCBieSBgQnVmZmVyLmlzQnVmZmVyYCAoYW5kIHRoZSBgaXMtYnVmZmVyYCBucG0gcGFja2FnZSlcbi8vIHRvIGRldGVjdCBhIEJ1ZmZlciBpbnN0YW5jZS4gSXQncyBub3QgcG9zc2libGUgdG8gdXNlIGBpbnN0YW5jZW9mIEJ1ZmZlcmBcbi8vIHJlbGlhYmx5IGluIGEgYnJvd3NlcmlmeSBjb250ZXh0IGJlY2F1c2UgdGhlcmUgY291bGQgYmUgbXVsdGlwbGUgZGlmZmVyZW50XG4vLyBjb3BpZXMgb2YgdGhlICdidWZmZXInIHBhY2thZ2UgaW4gdXNlLiBUaGlzIG1ldGhvZCB3b3JrcyBldmVuIGZvciBCdWZmZXJcbi8vIGluc3RhbmNlcyB0aGF0IHdlcmUgY3JlYXRlZCBmcm9tIGFub3RoZXIgY29weSBvZiB0aGUgYGJ1ZmZlcmAgcGFja2FnZS5cbi8vIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL2Zlcm9zcy9idWZmZXIvaXNzdWVzLzE1NFxuQnVmZmVyLnByb3RvdHlwZS5faXNCdWZmZXIgPSB0cnVlXG5cbmZ1bmN0aW9uIHN3YXAgKGIsIG4sIG0pIHtcbiAgdmFyIGkgPSBiW25dXG4gIGJbbl0gPSBiW21dXG4gIGJbbV0gPSBpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuc3dhcDE2ID0gZnVuY3Rpb24gc3dhcDE2ICgpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIGlmIChsZW4gJSAyICE9PSAwKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0J1ZmZlciBzaXplIG11c3QgYmUgYSBtdWx0aXBsZSBvZiAxNi1iaXRzJylcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSArPSAyKSB7XG4gICAgc3dhcCh0aGlzLCBpLCBpICsgMSlcbiAgfVxuICByZXR1cm4gdGhpc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnN3YXAzMiA9IGZ1bmN0aW9uIHN3YXAzMiAoKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBpZiAobGVuICUgNCAhPT0gMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdCdWZmZXIgc2l6ZSBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgMzItYml0cycpXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkgKz0gNCkge1xuICAgIHN3YXAodGhpcywgaSwgaSArIDMpXG4gICAgc3dhcCh0aGlzLCBpICsgMSwgaSArIDIpXG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zd2FwNjQgPSBmdW5jdGlvbiBzd2FwNjQgKCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgaWYgKGxlbiAlIDggIT09IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQnVmZmVyIHNpemUgbXVzdCBiZSBhIG11bHRpcGxlIG9mIDY0LWJpdHMnKVxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpICs9IDgpIHtcbiAgICBzd2FwKHRoaXMsIGksIGkgKyA3KVxuICAgIHN3YXAodGhpcywgaSArIDEsIGkgKyA2KVxuICAgIHN3YXAodGhpcywgaSArIDIsIGkgKyA1KVxuICAgIHN3YXAodGhpcywgaSArIDMsIGkgKyA0KVxuICB9XG4gIHJldHVybiB0aGlzXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZyAoKSB7XG4gIHZhciBsZW5ndGggPSB0aGlzLmxlbmd0aFxuICBpZiAobGVuZ3RoID09PSAwKSByZXR1cm4gJydcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHJldHVybiB1dGY4U2xpY2UodGhpcywgMCwgbGVuZ3RoKVxuICByZXR1cm4gc2xvd1RvU3RyaW5nLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcbn1cblxuQnVmZmVyLnByb3RvdHlwZS50b0xvY2FsZVN0cmluZyA9IEJ1ZmZlci5wcm90b3R5cGUudG9TdHJpbmdcblxuQnVmZmVyLnByb3RvdHlwZS5lcXVhbHMgPSBmdW5jdGlvbiBlcXVhbHMgKGIpIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYikpIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50IG11c3QgYmUgYSBCdWZmZXInKVxuICBpZiAodGhpcyA9PT0gYikgcmV0dXJuIHRydWVcbiAgcmV0dXJuIEJ1ZmZlci5jb21wYXJlKHRoaXMsIGIpID09PSAwXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuaW5zcGVjdCA9IGZ1bmN0aW9uIGluc3BlY3QgKCkge1xuICB2YXIgc3RyID0gJydcbiAgdmFyIG1heCA9IGV4cG9ydHMuSU5TUEVDVF9NQVhfQllURVNcbiAgc3RyID0gdGhpcy50b1N0cmluZygnaGV4JywgMCwgbWF4KS5yZXBsYWNlKC8oLnsyfSkvZywgJyQxICcpLnRyaW0oKVxuICBpZiAodGhpcy5sZW5ndGggPiBtYXgpIHN0ciArPSAnIC4uLiAnXG4gIHJldHVybiAnPEJ1ZmZlciAnICsgc3RyICsgJz4nXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuY29tcGFyZSA9IGZ1bmN0aW9uIGNvbXBhcmUgKHRhcmdldCwgc3RhcnQsIGVuZCwgdGhpc1N0YXJ0LCB0aGlzRW5kKSB7XG4gIGlmIChpc0luc3RhbmNlKHRhcmdldCwgVWludDhBcnJheSkpIHtcbiAgICB0YXJnZXQgPSBCdWZmZXIuZnJvbSh0YXJnZXQsIHRhcmdldC5vZmZzZXQsIHRhcmdldC5ieXRlTGVuZ3RoKVxuICB9XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKHRhcmdldCkpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgJ1RoZSBcInRhcmdldFwiIGFyZ3VtZW50IG11c3QgYmUgb25lIG9mIHR5cGUgQnVmZmVyIG9yIFVpbnQ4QXJyYXkuICcgK1xuICAgICAgJ1JlY2VpdmVkIHR5cGUgJyArICh0eXBlb2YgdGFyZ2V0KVxuICAgIClcbiAgfVxuXG4gIGlmIChzdGFydCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgc3RhcnQgPSAwXG4gIH1cbiAgaWYgKGVuZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgZW5kID0gdGFyZ2V0ID8gdGFyZ2V0Lmxlbmd0aCA6IDBcbiAgfVxuICBpZiAodGhpc1N0YXJ0ID09PSB1bmRlZmluZWQpIHtcbiAgICB0aGlzU3RhcnQgPSAwXG4gIH1cbiAgaWYgKHRoaXNFbmQgPT09IHVuZGVmaW5lZCkge1xuICAgIHRoaXNFbmQgPSB0aGlzLmxlbmd0aFxuICB9XG5cbiAgaWYgKHN0YXJ0IDwgMCB8fCBlbmQgPiB0YXJnZXQubGVuZ3RoIHx8IHRoaXNTdGFydCA8IDAgfHwgdGhpc0VuZCA+IHRoaXMubGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ291dCBvZiByYW5nZSBpbmRleCcpXG4gIH1cblxuICBpZiAodGhpc1N0YXJ0ID49IHRoaXNFbmQgJiYgc3RhcnQgPj0gZW5kKSB7XG4gICAgcmV0dXJuIDBcbiAgfVxuICBpZiAodGhpc1N0YXJ0ID49IHRoaXNFbmQpIHtcbiAgICByZXR1cm4gLTFcbiAgfVxuICBpZiAoc3RhcnQgPj0gZW5kKSB7XG4gICAgcmV0dXJuIDFcbiAgfVxuXG4gIHN0YXJ0ID4+Pj0gMFxuICBlbmQgPj4+PSAwXG4gIHRoaXNTdGFydCA+Pj49IDBcbiAgdGhpc0VuZCA+Pj49IDBcblxuICBpZiAodGhpcyA9PT0gdGFyZ2V0KSByZXR1cm4gMFxuXG4gIHZhciB4ID0gdGhpc0VuZCAtIHRoaXNTdGFydFxuICB2YXIgeSA9IGVuZCAtIHN0YXJ0XG4gIHZhciBsZW4gPSBNYXRoLm1pbih4LCB5KVxuXG4gIHZhciB0aGlzQ29weSA9IHRoaXMuc2xpY2UodGhpc1N0YXJ0LCB0aGlzRW5kKVxuICB2YXIgdGFyZ2V0Q29weSA9IHRhcmdldC5zbGljZShzdGFydCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyArK2kpIHtcbiAgICBpZiAodGhpc0NvcHlbaV0gIT09IHRhcmdldENvcHlbaV0pIHtcbiAgICAgIHggPSB0aGlzQ29weVtpXVxuICAgICAgeSA9IHRhcmdldENvcHlbaV1cbiAgICAgIGJyZWFrXG4gICAgfVxuICB9XG5cbiAgaWYgKHggPCB5KSByZXR1cm4gLTFcbiAgaWYgKHkgPCB4KSByZXR1cm4gMVxuICByZXR1cm4gMFxufVxuXG4vLyBGaW5kcyBlaXRoZXIgdGhlIGZpcnN0IGluZGV4IG9mIGB2YWxgIGluIGBidWZmZXJgIGF0IG9mZnNldCA+PSBgYnl0ZU9mZnNldGAsXG4vLyBPUiB0aGUgbGFzdCBpbmRleCBvZiBgdmFsYCBpbiBgYnVmZmVyYCBhdCBvZmZzZXQgPD0gYGJ5dGVPZmZzZXRgLlxuLy9cbi8vIEFyZ3VtZW50czpcbi8vIC0gYnVmZmVyIC0gYSBCdWZmZXIgdG8gc2VhcmNoXG4vLyAtIHZhbCAtIGEgc3RyaW5nLCBCdWZmZXIsIG9yIG51bWJlclxuLy8gLSBieXRlT2Zmc2V0IC0gYW4gaW5kZXggaW50byBgYnVmZmVyYDsgd2lsbCBiZSBjbGFtcGVkIHRvIGFuIGludDMyXG4vLyAtIGVuY29kaW5nIC0gYW4gb3B0aW9uYWwgZW5jb2RpbmcsIHJlbGV2YW50IGlzIHZhbCBpcyBhIHN0cmluZ1xuLy8gLSBkaXIgLSB0cnVlIGZvciBpbmRleE9mLCBmYWxzZSBmb3IgbGFzdEluZGV4T2ZcbmZ1bmN0aW9uIGJpZGlyZWN0aW9uYWxJbmRleE9mIChidWZmZXIsIHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIGRpcikge1xuICAvLyBFbXB0eSBidWZmZXIgbWVhbnMgbm8gbWF0Y2hcbiAgaWYgKGJ1ZmZlci5sZW5ndGggPT09IDApIHJldHVybiAtMVxuXG4gIC8vIE5vcm1hbGl6ZSBieXRlT2Zmc2V0XG4gIGlmICh0eXBlb2YgYnl0ZU9mZnNldCA9PT0gJ3N0cmluZycpIHtcbiAgICBlbmNvZGluZyA9IGJ5dGVPZmZzZXRcbiAgICBieXRlT2Zmc2V0ID0gMFxuICB9IGVsc2UgaWYgKGJ5dGVPZmZzZXQgPiAweDdmZmZmZmZmKSB7XG4gICAgYnl0ZU9mZnNldCA9IDB4N2ZmZmZmZmZcbiAgfSBlbHNlIGlmIChieXRlT2Zmc2V0IDwgLTB4ODAwMDAwMDApIHtcbiAgICBieXRlT2Zmc2V0ID0gLTB4ODAwMDAwMDBcbiAgfVxuICBieXRlT2Zmc2V0ID0gK2J5dGVPZmZzZXQgLy8gQ29lcmNlIHRvIE51bWJlci5cbiAgaWYgKG51bWJlcklzTmFOKGJ5dGVPZmZzZXQpKSB7XG4gICAgLy8gYnl0ZU9mZnNldDogaXQgaXQncyB1bmRlZmluZWQsIG51bGwsIE5hTiwgXCJmb29cIiwgZXRjLCBzZWFyY2ggd2hvbGUgYnVmZmVyXG4gICAgYnl0ZU9mZnNldCA9IGRpciA/IDAgOiAoYnVmZmVyLmxlbmd0aCAtIDEpXG4gIH1cblxuICAvLyBOb3JtYWxpemUgYnl0ZU9mZnNldDogbmVnYXRpdmUgb2Zmc2V0cyBzdGFydCBmcm9tIHRoZSBlbmQgb2YgdGhlIGJ1ZmZlclxuICBpZiAoYnl0ZU9mZnNldCA8IDApIGJ5dGVPZmZzZXQgPSBidWZmZXIubGVuZ3RoICsgYnl0ZU9mZnNldFxuICBpZiAoYnl0ZU9mZnNldCA+PSBidWZmZXIubGVuZ3RoKSB7XG4gICAgaWYgKGRpcikgcmV0dXJuIC0xXG4gICAgZWxzZSBieXRlT2Zmc2V0ID0gYnVmZmVyLmxlbmd0aCAtIDFcbiAgfSBlbHNlIGlmIChieXRlT2Zmc2V0IDwgMCkge1xuICAgIGlmIChkaXIpIGJ5dGVPZmZzZXQgPSAwXG4gICAgZWxzZSByZXR1cm4gLTFcbiAgfVxuXG4gIC8vIE5vcm1hbGl6ZSB2YWxcbiAgaWYgKHR5cGVvZiB2YWwgPT09ICdzdHJpbmcnKSB7XG4gICAgdmFsID0gQnVmZmVyLmZyb20odmFsLCBlbmNvZGluZylcbiAgfVxuXG4gIC8vIEZpbmFsbHksIHNlYXJjaCBlaXRoZXIgaW5kZXhPZiAoaWYgZGlyIGlzIHRydWUpIG9yIGxhc3RJbmRleE9mXG4gIGlmIChCdWZmZXIuaXNCdWZmZXIodmFsKSkge1xuICAgIC8vIFNwZWNpYWwgY2FzZTogbG9va2luZyBmb3IgZW1wdHkgc3RyaW5nL2J1ZmZlciBhbHdheXMgZmFpbHNcbiAgICBpZiAodmFsLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIC0xXG4gICAgfVxuICAgIHJldHVybiBhcnJheUluZGV4T2YoYnVmZmVyLCB2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCBkaXIpXG4gIH0gZWxzZSBpZiAodHlwZW9mIHZhbCA9PT0gJ251bWJlcicpIHtcbiAgICB2YWwgPSB2YWwgJiAweEZGIC8vIFNlYXJjaCBmb3IgYSBieXRlIHZhbHVlIFswLTI1NV1cbiAgICBpZiAodHlwZW9mIFVpbnQ4QXJyYXkucHJvdG90eXBlLmluZGV4T2YgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGlmIChkaXIpIHtcbiAgICAgICAgcmV0dXJuIFVpbnQ4QXJyYXkucHJvdG90eXBlLmluZGV4T2YuY2FsbChidWZmZXIsIHZhbCwgYnl0ZU9mZnNldClcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBVaW50OEFycmF5LnByb3RvdHlwZS5sYXN0SW5kZXhPZi5jYWxsKGJ1ZmZlciwgdmFsLCBieXRlT2Zmc2V0KVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gYXJyYXlJbmRleE9mKGJ1ZmZlciwgWyB2YWwgXSwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIGRpcilcbiAgfVxuXG4gIHRocm93IG5ldyBUeXBlRXJyb3IoJ3ZhbCBtdXN0IGJlIHN0cmluZywgbnVtYmVyIG9yIEJ1ZmZlcicpXG59XG5cbmZ1bmN0aW9uIGFycmF5SW5kZXhPZiAoYXJyLCB2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCBkaXIpIHtcbiAgdmFyIGluZGV4U2l6ZSA9IDFcbiAgdmFyIGFyckxlbmd0aCA9IGFyci5sZW5ndGhcbiAgdmFyIHZhbExlbmd0aCA9IHZhbC5sZW5ndGhcblxuICBpZiAoZW5jb2RpbmcgIT09IHVuZGVmaW5lZCkge1xuICAgIGVuY29kaW5nID0gU3RyaW5nKGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpXG4gICAgaWYgKGVuY29kaW5nID09PSAndWNzMicgfHwgZW5jb2RpbmcgPT09ICd1Y3MtMicgfHxcbiAgICAgICAgZW5jb2RpbmcgPT09ICd1dGYxNmxlJyB8fCBlbmNvZGluZyA9PT0gJ3V0Zi0xNmxlJykge1xuICAgICAgaWYgKGFyci5sZW5ndGggPCAyIHx8IHZhbC5sZW5ndGggPCAyKSB7XG4gICAgICAgIHJldHVybiAtMVxuICAgICAgfVxuICAgICAgaW5kZXhTaXplID0gMlxuICAgICAgYXJyTGVuZ3RoIC89IDJcbiAgICAgIHZhbExlbmd0aCAvPSAyXG4gICAgICBieXRlT2Zmc2V0IC89IDJcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiByZWFkIChidWYsIGkpIHtcbiAgICBpZiAoaW5kZXhTaXplID09PSAxKSB7XG4gICAgICByZXR1cm4gYnVmW2ldXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBidWYucmVhZFVJbnQxNkJFKGkgKiBpbmRleFNpemUpXG4gICAgfVxuICB9XG5cbiAgdmFyIGlcbiAgaWYgKGRpcikge1xuICAgIHZhciBmb3VuZEluZGV4ID0gLTFcbiAgICBmb3IgKGkgPSBieXRlT2Zmc2V0OyBpIDwgYXJyTGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChyZWFkKGFyciwgaSkgPT09IHJlYWQodmFsLCBmb3VuZEluZGV4ID09PSAtMSA/IDAgOiBpIC0gZm91bmRJbmRleCkpIHtcbiAgICAgICAgaWYgKGZvdW5kSW5kZXggPT09IC0xKSBmb3VuZEluZGV4ID0gaVxuICAgICAgICBpZiAoaSAtIGZvdW5kSW5kZXggKyAxID09PSB2YWxMZW5ndGgpIHJldHVybiBmb3VuZEluZGV4ICogaW5kZXhTaXplXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoZm91bmRJbmRleCAhPT0gLTEpIGkgLT0gaSAtIGZvdW5kSW5kZXhcbiAgICAgICAgZm91bmRJbmRleCA9IC0xXG4gICAgICB9XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChieXRlT2Zmc2V0ICsgdmFsTGVuZ3RoID4gYXJyTGVuZ3RoKSBieXRlT2Zmc2V0ID0gYXJyTGVuZ3RoIC0gdmFsTGVuZ3RoXG4gICAgZm9yIChpID0gYnl0ZU9mZnNldDsgaSA+PSAwOyBpLS0pIHtcbiAgICAgIHZhciBmb3VuZCA9IHRydWVcbiAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgdmFsTGVuZ3RoOyBqKyspIHtcbiAgICAgICAgaWYgKHJlYWQoYXJyLCBpICsgaikgIT09IHJlYWQodmFsLCBqKSkge1xuICAgICAgICAgIGZvdW5kID0gZmFsc2VcbiAgICAgICAgICBicmVha1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoZm91bmQpIHJldHVybiBpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIC0xXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuaW5jbHVkZXMgPSBmdW5jdGlvbiBpbmNsdWRlcyAodmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZykge1xuICByZXR1cm4gdGhpcy5pbmRleE9mKHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcpICE9PSAtMVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluZGV4T2YgPSBmdW5jdGlvbiBpbmRleE9mICh2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nKSB7XG4gIHJldHVybiBiaWRpcmVjdGlvbmFsSW5kZXhPZih0aGlzLCB2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCB0cnVlKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmxhc3RJbmRleE9mID0gZnVuY3Rpb24gbGFzdEluZGV4T2YgKHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcpIHtcbiAgcmV0dXJuIGJpZGlyZWN0aW9uYWxJbmRleE9mKHRoaXMsIHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIGZhbHNlKVxufVxuXG5mdW5jdGlvbiBoZXhXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIG9mZnNldCA9IE51bWJlcihvZmZzZXQpIHx8IDBcbiAgdmFyIHJlbWFpbmluZyA9IGJ1Zi5sZW5ndGggLSBvZmZzZXRcbiAgaWYgKCFsZW5ndGgpIHtcbiAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgfSBlbHNlIHtcbiAgICBsZW5ndGggPSBOdW1iZXIobGVuZ3RoKVxuICAgIGlmIChsZW5ndGggPiByZW1haW5pbmcpIHtcbiAgICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICAgIH1cbiAgfVxuXG4gIHZhciBzdHJMZW4gPSBzdHJpbmcubGVuZ3RoXG5cbiAgaWYgKGxlbmd0aCA+IHN0ckxlbiAvIDIpIHtcbiAgICBsZW5ndGggPSBzdHJMZW4gLyAyXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgIHZhciBwYXJzZWQgPSBwYXJzZUludChzdHJpbmcuc3Vic3RyKGkgKiAyLCAyKSwgMTYpXG4gICAgaWYgKG51bWJlcklzTmFOKHBhcnNlZCkpIHJldHVybiBpXG4gICAgYnVmW29mZnNldCArIGldID0gcGFyc2VkXG4gIH1cbiAgcmV0dXJuIGlcbn1cblxuZnVuY3Rpb24gdXRmOFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIodXRmOFRvQnl0ZXMoc3RyaW5nLCBidWYubGVuZ3RoIC0gb2Zmc2V0KSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gYXNjaWlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKGFzY2lpVG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBsYXRpbjFXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBhc2NpaVdyaXRlKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gYmFzZTY0V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcihiYXNlNjRUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIHVjczJXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKHV0ZjE2bGVUb0J5dGVzKHN0cmluZywgYnVmLmxlbmd0aCAtIG9mZnNldCksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbiB3cml0ZSAoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCwgZW5jb2RpbmcpIHtcbiAgLy8gQnVmZmVyI3dyaXRlKHN0cmluZylcbiAgaWYgKG9mZnNldCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgZW5jb2RpbmcgPSAndXRmOCdcbiAgICBsZW5ndGggPSB0aGlzLmxlbmd0aFxuICAgIG9mZnNldCA9IDBcbiAgLy8gQnVmZmVyI3dyaXRlKHN0cmluZywgZW5jb2RpbmcpXG4gIH0gZWxzZSBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQgJiYgdHlwZW9mIG9mZnNldCA9PT0gJ3N0cmluZycpIHtcbiAgICBlbmNvZGluZyA9IG9mZnNldFxuICAgIGxlbmd0aCA9IHRoaXMubGVuZ3RoXG4gICAgb2Zmc2V0ID0gMFxuICAvLyBCdWZmZXIjd3JpdGUoc3RyaW5nLCBvZmZzZXRbLCBsZW5ndGhdWywgZW5jb2RpbmddKVxuICB9IGVsc2UgaWYgKGlzRmluaXRlKG9mZnNldCkpIHtcbiAgICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgICBpZiAoaXNGaW5pdGUobGVuZ3RoKSkge1xuICAgICAgbGVuZ3RoID0gbGVuZ3RoID4+PiAwXG4gICAgICBpZiAoZW5jb2RpbmcgPT09IHVuZGVmaW5lZCkgZW5jb2RpbmcgPSAndXRmOCdcbiAgICB9IGVsc2Uge1xuICAgICAgZW5jb2RpbmcgPSBsZW5ndGhcbiAgICAgIGxlbmd0aCA9IHVuZGVmaW5lZFxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAnQnVmZmVyLndyaXRlKHN0cmluZywgZW5jb2RpbmcsIG9mZnNldFssIGxlbmd0aF0pIGlzIG5vIGxvbmdlciBzdXBwb3J0ZWQnXG4gICAgKVxuICB9XG5cbiAgdmFyIHJlbWFpbmluZyA9IHRoaXMubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCB8fCBsZW5ndGggPiByZW1haW5pbmcpIGxlbmd0aCA9IHJlbWFpbmluZ1xuXG4gIGlmICgoc3RyaW5nLmxlbmd0aCA+IDAgJiYgKGxlbmd0aCA8IDAgfHwgb2Zmc2V0IDwgMCkpIHx8IG9mZnNldCA+IHRoaXMubGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0F0dGVtcHQgdG8gd3JpdGUgb3V0c2lkZSBidWZmZXIgYm91bmRzJylcbiAgfVxuXG4gIGlmICghZW5jb2RpbmcpIGVuY29kaW5nID0gJ3V0ZjgnXG5cbiAgdmFyIGxvd2VyZWRDYXNlID0gZmFsc2VcbiAgZm9yICg7Oykge1xuICAgIHN3aXRjaCAoZW5jb2RpbmcpIHtcbiAgICAgIGNhc2UgJ2hleCc6XG4gICAgICAgIHJldHVybiBoZXhXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICd1dGY4JzpcbiAgICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgICAgcmV0dXJuIHV0ZjhXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICdhc2NpaSc6XG4gICAgICAgIHJldHVybiBhc2NpaVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ2xhdGluMSc6XG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICByZXR1cm4gbGF0aW4xV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgLy8gV2FybmluZzogbWF4TGVuZ3RoIG5vdCB0YWtlbiBpbnRvIGFjY291bnQgaW4gYmFzZTY0V3JpdGVcbiAgICAgICAgcmV0dXJuIGJhc2U2NFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ3VjczInOlxuICAgICAgY2FzZSAndWNzLTInOlxuICAgICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICAgIHJldHVybiB1Y3MyV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGxvd2VyZWRDYXNlKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gICAgICAgIGVuY29kaW5nID0gKCcnICsgZW5jb2RpbmcpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gdG9KU09OICgpIHtcbiAgcmV0dXJuIHtcbiAgICB0eXBlOiAnQnVmZmVyJyxcbiAgICBkYXRhOiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCh0aGlzLl9hcnIgfHwgdGhpcywgMClcbiAgfVxufVxuXG5mdW5jdGlvbiBiYXNlNjRTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIGlmIChzdGFydCA9PT0gMCAmJiBlbmQgPT09IGJ1Zi5sZW5ndGgpIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmKVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBiYXNlNjQuZnJvbUJ5dGVBcnJheShidWYuc2xpY2Uoc3RhcnQsIGVuZCkpXG4gIH1cbn1cblxuZnVuY3Rpb24gdXRmOFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuICB2YXIgcmVzID0gW11cblxuICB2YXIgaSA9IHN0YXJ0XG4gIHdoaWxlIChpIDwgZW5kKSB7XG4gICAgdmFyIGZpcnN0Qnl0ZSA9IGJ1ZltpXVxuICAgIHZhciBjb2RlUG9pbnQgPSBudWxsXG4gICAgdmFyIGJ5dGVzUGVyU2VxdWVuY2UgPSAoZmlyc3RCeXRlID4gMHhFRikgPyA0XG4gICAgICA6IChmaXJzdEJ5dGUgPiAweERGKSA/IDNcbiAgICAgICAgOiAoZmlyc3RCeXRlID4gMHhCRikgPyAyXG4gICAgICAgICAgOiAxXG5cbiAgICBpZiAoaSArIGJ5dGVzUGVyU2VxdWVuY2UgPD0gZW5kKSB7XG4gICAgICB2YXIgc2Vjb25kQnl0ZSwgdGhpcmRCeXRlLCBmb3VydGhCeXRlLCB0ZW1wQ29kZVBvaW50XG5cbiAgICAgIHN3aXRjaCAoYnl0ZXNQZXJTZXF1ZW5jZSkge1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgaWYgKGZpcnN0Qnl0ZSA8IDB4ODApIHtcbiAgICAgICAgICAgIGNvZGVQb2ludCA9IGZpcnN0Qnl0ZVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgc2Vjb25kQnl0ZSA9IGJ1ZltpICsgMV1cbiAgICAgICAgICBpZiAoKHNlY29uZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCkge1xuICAgICAgICAgICAgdGVtcENvZGVQb2ludCA9IChmaXJzdEJ5dGUgJiAweDFGKSA8PCAweDYgfCAoc2Vjb25kQnl0ZSAmIDB4M0YpXG4gICAgICAgICAgICBpZiAodGVtcENvZGVQb2ludCA+IDB4N0YpIHtcbiAgICAgICAgICAgICAgY29kZVBvaW50ID0gdGVtcENvZGVQb2ludFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgc2Vjb25kQnl0ZSA9IGJ1ZltpICsgMV1cbiAgICAgICAgICB0aGlyZEJ5dGUgPSBidWZbaSArIDJdXG4gICAgICAgICAgaWYgKChzZWNvbmRCeXRlICYgMHhDMCkgPT09IDB4ODAgJiYgKHRoaXJkQnl0ZSAmIDB4QzApID09PSAweDgwKSB7XG4gICAgICAgICAgICB0ZW1wQ29kZVBvaW50ID0gKGZpcnN0Qnl0ZSAmIDB4RikgPDwgMHhDIHwgKHNlY29uZEJ5dGUgJiAweDNGKSA8PCAweDYgfCAodGhpcmRCeXRlICYgMHgzRilcbiAgICAgICAgICAgIGlmICh0ZW1wQ29kZVBvaW50ID4gMHg3RkYgJiYgKHRlbXBDb2RlUG9pbnQgPCAweEQ4MDAgfHwgdGVtcENvZGVQb2ludCA+IDB4REZGRikpIHtcbiAgICAgICAgICAgICAgY29kZVBvaW50ID0gdGVtcENvZGVQb2ludFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlIDQ6XG4gICAgICAgICAgc2Vjb25kQnl0ZSA9IGJ1ZltpICsgMV1cbiAgICAgICAgICB0aGlyZEJ5dGUgPSBidWZbaSArIDJdXG4gICAgICAgICAgZm91cnRoQnl0ZSA9IGJ1ZltpICsgM11cbiAgICAgICAgICBpZiAoKHNlY29uZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCAmJiAodGhpcmRCeXRlICYgMHhDMCkgPT09IDB4ODAgJiYgKGZvdXJ0aEJ5dGUgJiAweEMwKSA9PT0gMHg4MCkge1xuICAgICAgICAgICAgdGVtcENvZGVQb2ludCA9IChmaXJzdEJ5dGUgJiAweEYpIDw8IDB4MTIgfCAoc2Vjb25kQnl0ZSAmIDB4M0YpIDw8IDB4QyB8ICh0aGlyZEJ5dGUgJiAweDNGKSA8PCAweDYgfCAoZm91cnRoQnl0ZSAmIDB4M0YpXG4gICAgICAgICAgICBpZiAodGVtcENvZGVQb2ludCA+IDB4RkZGRiAmJiB0ZW1wQ29kZVBvaW50IDwgMHgxMTAwMDApIHtcbiAgICAgICAgICAgICAgY29kZVBvaW50ID0gdGVtcENvZGVQb2ludFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoY29kZVBvaW50ID09PSBudWxsKSB7XG4gICAgICAvLyB3ZSBkaWQgbm90IGdlbmVyYXRlIGEgdmFsaWQgY29kZVBvaW50IHNvIGluc2VydCBhXG4gICAgICAvLyByZXBsYWNlbWVudCBjaGFyIChVK0ZGRkQpIGFuZCBhZHZhbmNlIG9ubHkgMSBieXRlXG4gICAgICBjb2RlUG9pbnQgPSAweEZGRkRcbiAgICAgIGJ5dGVzUGVyU2VxdWVuY2UgPSAxXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPiAweEZGRkYpIHtcbiAgICAgIC8vIGVuY29kZSB0byB1dGYxNiAoc3Vycm9nYXRlIHBhaXIgZGFuY2UpXG4gICAgICBjb2RlUG9pbnQgLT0gMHgxMDAwMFxuICAgICAgcmVzLnB1c2goY29kZVBvaW50ID4+PiAxMCAmIDB4M0ZGIHwgMHhEODAwKVxuICAgICAgY29kZVBvaW50ID0gMHhEQzAwIHwgY29kZVBvaW50ICYgMHgzRkZcbiAgICB9XG5cbiAgICByZXMucHVzaChjb2RlUG9pbnQpXG4gICAgaSArPSBieXRlc1BlclNlcXVlbmNlXG4gIH1cblxuICByZXR1cm4gZGVjb2RlQ29kZVBvaW50c0FycmF5KHJlcylcbn1cblxuLy8gQmFzZWQgb24gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMjI3NDcyNzIvNjgwNzQyLCB0aGUgYnJvd3NlciB3aXRoXG4vLyB0aGUgbG93ZXN0IGxpbWl0IGlzIENocm9tZSwgd2l0aCAweDEwMDAwIGFyZ3MuXG4vLyBXZSBnbyAxIG1hZ25pdHVkZSBsZXNzLCBmb3Igc2FmZXR5XG52YXIgTUFYX0FSR1VNRU5UU19MRU5HVEggPSAweDEwMDBcblxuZnVuY3Rpb24gZGVjb2RlQ29kZVBvaW50c0FycmF5IChjb2RlUG9pbnRzKSB7XG4gIHZhciBsZW4gPSBjb2RlUG9pbnRzLmxlbmd0aFxuICBpZiAobGVuIDw9IE1BWF9BUkdVTUVOVFNfTEVOR1RIKSB7XG4gICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkoU3RyaW5nLCBjb2RlUG9pbnRzKSAvLyBhdm9pZCBleHRyYSBzbGljZSgpXG4gIH1cblxuICAvLyBEZWNvZGUgaW4gY2h1bmtzIHRvIGF2b2lkIFwiY2FsbCBzdGFjayBzaXplIGV4Y2VlZGVkXCIuXG4gIHZhciByZXMgPSAnJ1xuICB2YXIgaSA9IDBcbiAgd2hpbGUgKGkgPCBsZW4pIHtcbiAgICByZXMgKz0gU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShcbiAgICAgIFN0cmluZyxcbiAgICAgIGNvZGVQb2ludHMuc2xpY2UoaSwgaSArPSBNQVhfQVJHVU1FTlRTX0xFTkdUSClcbiAgICApXG4gIH1cbiAgcmV0dXJuIHJlc1xufVxuXG5mdW5jdGlvbiBhc2NpaVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJldCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7ICsraSkge1xuICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSAmIDB4N0YpXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5mdW5jdGlvbiBsYXRpbjFTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciByZXQgPSAnJ1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyArK2kpIHtcbiAgICByZXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShidWZbaV0pXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5mdW5jdGlvbiBoZXhTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG5cbiAgaWYgKCFzdGFydCB8fCBzdGFydCA8IDApIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCB8fCBlbmQgPCAwIHx8IGVuZCA+IGxlbikgZW5kID0gbGVuXG5cbiAgdmFyIG91dCA9ICcnXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgKytpKSB7XG4gICAgb3V0ICs9IHRvSGV4KGJ1ZltpXSlcbiAgfVxuICByZXR1cm4gb3V0XG59XG5cbmZ1bmN0aW9uIHV0ZjE2bGVTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciBieXRlcyA9IGJ1Zi5zbGljZShzdGFydCwgZW5kKVxuICB2YXIgcmVzID0gJydcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBieXRlcy5sZW5ndGg7IGkgKz0gMikge1xuICAgIHJlcyArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ5dGVzW2ldICsgKGJ5dGVzW2kgKyAxXSAqIDI1NikpXG4gIH1cbiAgcmV0dXJuIHJlc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnNsaWNlID0gZnVuY3Rpb24gc2xpY2UgKHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIHN0YXJ0ID0gfn5zdGFydFxuICBlbmQgPSBlbmQgPT09IHVuZGVmaW5lZCA/IGxlbiA6IH5+ZW5kXG5cbiAgaWYgKHN0YXJ0IDwgMCkge1xuICAgIHN0YXJ0ICs9IGxlblxuICAgIGlmIChzdGFydCA8IDApIHN0YXJ0ID0gMFxuICB9IGVsc2UgaWYgKHN0YXJ0ID4gbGVuKSB7XG4gICAgc3RhcnQgPSBsZW5cbiAgfVxuXG4gIGlmIChlbmQgPCAwKSB7XG4gICAgZW5kICs9IGxlblxuICAgIGlmIChlbmQgPCAwKSBlbmQgPSAwXG4gIH0gZWxzZSBpZiAoZW5kID4gbGVuKSB7XG4gICAgZW5kID0gbGVuXG4gIH1cblxuICBpZiAoZW5kIDwgc3RhcnQpIGVuZCA9IHN0YXJ0XG5cbiAgdmFyIG5ld0J1ZiA9IHRoaXMuc3ViYXJyYXkoc3RhcnQsIGVuZClcbiAgLy8gUmV0dXJuIGFuIGF1Z21lbnRlZCBgVWludDhBcnJheWAgaW5zdGFuY2VcbiAgbmV3QnVmLl9fcHJvdG9fXyA9IEJ1ZmZlci5wcm90b3R5cGVcbiAgcmV0dXJuIG5ld0J1ZlxufVxuXG4vKlxuICogTmVlZCB0byBtYWtlIHN1cmUgdGhhdCBidWZmZXIgaXNuJ3QgdHJ5aW5nIHRvIHdyaXRlIG91dCBvZiBib3VuZHMuXG4gKi9cbmZ1bmN0aW9uIGNoZWNrT2Zmc2V0IChvZmZzZXQsIGV4dCwgbGVuZ3RoKSB7XG4gIGlmICgob2Zmc2V0ICUgMSkgIT09IDAgfHwgb2Zmc2V0IDwgMCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ29mZnNldCBpcyBub3QgdWludCcpXG4gIGlmIChvZmZzZXQgKyBleHQgPiBsZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdUcnlpbmcgdG8gYWNjZXNzIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludExFID0gZnVuY3Rpb24gcmVhZFVJbnRMRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIGldICogbXVsXG4gIH1cblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnRCRSA9IGZ1bmN0aW9uIHJlYWRVSW50QkUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuICB9XG5cbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0ICsgLS1ieXRlTGVuZ3RoXVxuICB2YXIgbXVsID0gMVxuICB3aGlsZSAoYnl0ZUxlbmd0aCA+IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyAtLWJ5dGVMZW5ndGhdICogbXVsXG4gIH1cblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQ4ID0gZnVuY3Rpb24gcmVhZFVJbnQ4IChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDEsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gdGhpc1tvZmZzZXRdXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQxNkxFID0gZnVuY3Rpb24gcmVhZFVJbnQxNkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gdGhpc1tvZmZzZXRdIHwgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2QkUgPSBmdW5jdGlvbiByZWFkVUludDE2QkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiAodGhpc1tvZmZzZXRdIDw8IDgpIHwgdGhpc1tvZmZzZXQgKyAxXVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJMRSA9IGZ1bmN0aW9uIHJlYWRVSW50MzJMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKCh0aGlzW29mZnNldF0pIHxcbiAgICAgICh0aGlzW29mZnNldCArIDFdIDw8IDgpIHxcbiAgICAgICh0aGlzW29mZnNldCArIDJdIDw8IDE2KSkgK1xuICAgICAgKHRoaXNbb2Zmc2V0ICsgM10gKiAweDEwMDAwMDApXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQzMkJFID0gZnVuY3Rpb24gcmVhZFVJbnQzMkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdICogMHgxMDAwMDAwKSArXG4gICAgKCh0aGlzW29mZnNldCArIDFdIDw8IDE2KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgOCkgfFxuICAgIHRoaXNbb2Zmc2V0ICsgM10pXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludExFID0gZnVuY3Rpb24gcmVhZEludExFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldF1cbiAgdmFyIG11bCA9IDFcbiAgdmFyIGkgPSAwXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgaV0gKiBtdWxcbiAgfVxuICBtdWwgKj0gMHg4MFxuXG4gIGlmICh2YWwgPj0gbXVsKSB2YWwgLT0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpXG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnRCRSA9IGZ1bmN0aW9uIHJlYWRJbnRCRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgaSA9IGJ5dGVMZW5ndGhcbiAgdmFyIG11bCA9IDFcbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0ICsgLS1pXVxuICB3aGlsZSAoaSA+IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyAtLWldICogbXVsXG4gIH1cbiAgbXVsICo9IDB4ODBcblxuICBpZiAodmFsID49IG11bCkgdmFsIC09IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50OCA9IGZ1bmN0aW9uIHJlYWRJbnQ4IChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDEsIHRoaXMubGVuZ3RoKVxuICBpZiAoISh0aGlzW29mZnNldF0gJiAweDgwKSkgcmV0dXJuICh0aGlzW29mZnNldF0pXG4gIHJldHVybiAoKDB4ZmYgLSB0aGlzW29mZnNldF0gKyAxKSAqIC0xKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkxFID0gZnVuY3Rpb24gcmVhZEludDE2TEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldF0gfCAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KVxuICByZXR1cm4gKHZhbCAmIDB4ODAwMCkgPyB2YWwgfCAweEZGRkYwMDAwIDogdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDE2QkUgPSBmdW5jdGlvbiByZWFkSW50MTZCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0ICsgMV0gfCAodGhpc1tvZmZzZXRdIDw8IDgpXG4gIHJldHVybiAodmFsICYgMHg4MDAwKSA/IHZhbCB8IDB4RkZGRjAwMDAgOiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MzJMRSA9IGZ1bmN0aW9uIHJlYWRJbnQzMkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdKSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOCkgfFxuICAgICh0aGlzW29mZnNldCArIDJdIDw8IDE2KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgM10gPDwgMjQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyQkUgPSBmdW5jdGlvbiByZWFkSW50MzJCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSA8PCAyNCkgfFxuICAgICh0aGlzW29mZnNldCArIDFdIDw8IDE2KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgOCkgfFxuICAgICh0aGlzW29mZnNldCArIDNdKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdExFID0gZnVuY3Rpb24gcmVhZEZsb2F0TEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCB0cnVlLCAyMywgNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRmxvYXRCRSA9IGZ1bmN0aW9uIHJlYWRGbG9hdEJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgZmFsc2UsIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVMRSA9IGZ1bmN0aW9uIHJlYWREb3VibGVMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA4LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIHRydWUsIDUyLCA4KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVCRSA9IGZ1bmN0aW9uIHJlYWREb3VibGVCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA4LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIGZhbHNlLCA1MiwgOClcbn1cblxuZnVuY3Rpb24gY2hlY2tJbnQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgZXh0LCBtYXgsIG1pbikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihidWYpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdcImJ1ZmZlclwiIGFyZ3VtZW50IG11c3QgYmUgYSBCdWZmZXIgaW5zdGFuY2UnKVxuICBpZiAodmFsdWUgPiBtYXggfHwgdmFsdWUgPCBtaW4pIHRocm93IG5ldyBSYW5nZUVycm9yKCdcInZhbHVlXCIgYXJndW1lbnQgaXMgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChvZmZzZXQgKyBleHQgPiBidWYubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW5kZXggb3V0IG9mIHJhbmdlJylcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnRMRSA9IGZ1bmN0aW9uIHdyaXRlVUludExFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBtYXhCeXRlcyA9IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKSAtIDFcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBtYXhCeXRlcywgMClcbiAgfVxuXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB0aGlzW29mZnNldF0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB0aGlzW29mZnNldCArIGldID0gKHZhbHVlIC8gbXVsKSAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50QkUgPSBmdW5jdGlvbiB3cml0ZVVJbnRCRSAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICB2YXIgbWF4Qnl0ZXMgPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCkgLSAxXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbWF4Qnl0ZXMsIDApXG4gIH1cblxuICB2YXIgaSA9IGJ5dGVMZW5ndGggLSAxXG4gIHZhciBtdWwgPSAxXG4gIHRoaXNbb2Zmc2V0ICsgaV0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKC0taSA+PSAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICh2YWx1ZSAvIG11bCkgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDggPSBmdW5jdGlvbiB3cml0ZVVJbnQ4ICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMSwgMHhmZiwgMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDFcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQxNkxFID0gZnVuY3Rpb24gd3JpdGVVSW50MTZMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4ZmZmZiwgMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQxNkJFID0gZnVuY3Rpb24gd3JpdGVVSW50MTZCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4ZmZmZiwgMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiA4KVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQzMkxFID0gZnVuY3Rpb24gd3JpdGVVSW50MzJMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4ZmZmZmZmZmYsIDApXG4gIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgPj4+IDI0KVxuICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiAxNilcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQzMkJFID0gZnVuY3Rpb24gd3JpdGVVSW50MzJCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4ZmZmZmZmZmYsIDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gMjQpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDE2KVxuICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiA4KVxuICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludExFID0gZnVuY3Rpb24gd3JpdGVJbnRMRSAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICB2YXIgbGltaXQgPSBNYXRoLnBvdygyLCAoOCAqIGJ5dGVMZW5ndGgpIC0gMSlcblxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIGxpbWl0IC0gMSwgLWxpbWl0KVxuICB9XG5cbiAgdmFyIGkgPSAwXG4gIHZhciBtdWwgPSAxXG4gIHZhciBzdWIgPSAwXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIGlmICh2YWx1ZSA8IDAgJiYgc3ViID09PSAwICYmIHRoaXNbb2Zmc2V0ICsgaSAtIDFdICE9PSAwKSB7XG4gICAgICBzdWIgPSAxXG4gICAgfVxuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAoKHZhbHVlIC8gbXVsKSA+PiAwKSAtIHN1YiAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnRCRSA9IGZ1bmN0aW9uIHdyaXRlSW50QkUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgdmFyIGxpbWl0ID0gTWF0aC5wb3coMiwgKDggKiBieXRlTGVuZ3RoKSAtIDEpXG5cbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBsaW1pdCAtIDEsIC1saW1pdClcbiAgfVxuXG4gIHZhciBpID0gYnl0ZUxlbmd0aCAtIDFcbiAgdmFyIG11bCA9IDFcbiAgdmFyIHN1YiA9IDBcbiAgdGhpc1tvZmZzZXQgKyBpXSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoLS1pID49IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICBpZiAodmFsdWUgPCAwICYmIHN1YiA9PT0gMCAmJiB0aGlzW29mZnNldCArIGkgKyAxXSAhPT0gMCkge1xuICAgICAgc3ViID0gMVxuICAgIH1cbiAgICB0aGlzW29mZnNldCArIGldID0gKCh2YWx1ZSAvIG11bCkgPj4gMCkgLSBzdWIgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50OCA9IGZ1bmN0aW9uIHdyaXRlSW50OCAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDEsIDB4N2YsIC0weDgwKVxuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmYgKyB2YWx1ZSArIDFcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDFcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDE2TEUgPSBmdW5jdGlvbiB3cml0ZUludDE2TEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweDdmZmYsIC0weDgwMDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkJFID0gZnVuY3Rpb24gd3JpdGVJbnQxNkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHg3ZmZmLCAtMHg4MDAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDgpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MzJMRSA9IGZ1bmN0aW9uIHdyaXRlSW50MzJMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4N2ZmZmZmZmYsIC0weDgwMDAwMDAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiAxNilcbiAgdGhpc1tvZmZzZXQgKyAzXSA9ICh2YWx1ZSA+Pj4gMjQpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQzMkJFID0gZnVuY3Rpb24gd3JpdGVJbnQzMkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHg3ZmZmZmZmZiwgLTB4ODAwMDAwMDApXG4gIGlmICh2YWx1ZSA8IDApIHZhbHVlID0gMHhmZmZmZmZmZiArIHZhbHVlICsgMVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDI0KVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiAxNilcbiAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gOClcbiAgdGhpc1tvZmZzZXQgKyAzXSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbmZ1bmN0aW9uIGNoZWNrSUVFRTc1NCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBleHQsIG1heCwgbWluKSB7XG4gIGlmIChvZmZzZXQgKyBleHQgPiBidWYubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW5kZXggb3V0IG9mIHJhbmdlJylcbiAgaWYgKG9mZnNldCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbmRleCBvdXQgb2YgcmFuZ2UnKVxufVxuXG5mdW5jdGlvbiB3cml0ZUZsb2F0IChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBjaGVja0lFRUU3NTQoYnVmLCB2YWx1ZSwgb2Zmc2V0LCA0LCAzLjQwMjgyMzQ2NjM4NTI4ODZlKzM4LCAtMy40MDI4MjM0NjYzODUyODg2ZSszOClcbiAgfVxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCAyMywgNClcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUZsb2F0TEUgPSBmdW5jdGlvbiB3cml0ZUZsb2F0TEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRCRSA9IGZ1bmN0aW9uIHdyaXRlRmxvYXRCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRmxvYXQodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiB3cml0ZURvdWJsZSAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgY2hlY2tJRUVFNzU0KGJ1ZiwgdmFsdWUsIG9mZnNldCwgOCwgMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgsIC0xLjc5NzY5MzEzNDg2MjMxNTdFKzMwOClcbiAgfVxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCA1MiwgOClcbiAgcmV0dXJuIG9mZnNldCArIDhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUxFID0gZnVuY3Rpb24gd3JpdGVEb3VibGVMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRG91YmxlKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRG91YmxlQkUgPSBmdW5jdGlvbiB3cml0ZURvdWJsZUJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVEb3VibGUodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG4vLyBjb3B5KHRhcmdldEJ1ZmZlciwgdGFyZ2V0U3RhcnQ9MCwgc291cmNlU3RhcnQ9MCwgc291cmNlRW5kPWJ1ZmZlci5sZW5ndGgpXG5CdWZmZXIucHJvdG90eXBlLmNvcHkgPSBmdW5jdGlvbiBjb3B5ICh0YXJnZXQsIHRhcmdldFN0YXJ0LCBzdGFydCwgZW5kKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKHRhcmdldCkpIHRocm93IG5ldyBUeXBlRXJyb3IoJ2FyZ3VtZW50IHNob3VsZCBiZSBhIEJ1ZmZlcicpXG4gIGlmICghc3RhcnQpIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCAmJiBlbmQgIT09IDApIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmICh0YXJnZXRTdGFydCA+PSB0YXJnZXQubGVuZ3RoKSB0YXJnZXRTdGFydCA9IHRhcmdldC5sZW5ndGhcbiAgaWYgKCF0YXJnZXRTdGFydCkgdGFyZ2V0U3RhcnQgPSAwXG4gIGlmIChlbmQgPiAwICYmIGVuZCA8IHN0YXJ0KSBlbmQgPSBzdGFydFxuXG4gIC8vIENvcHkgMCBieXRlczsgd2UncmUgZG9uZVxuICBpZiAoZW5kID09PSBzdGFydCkgcmV0dXJuIDBcbiAgaWYgKHRhcmdldC5sZW5ndGggPT09IDAgfHwgdGhpcy5sZW5ndGggPT09IDApIHJldHVybiAwXG5cbiAgLy8gRmF0YWwgZXJyb3IgY29uZGl0aW9uc1xuICBpZiAodGFyZ2V0U3RhcnQgPCAwKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3RhcmdldFN0YXJ0IG91dCBvZiBib3VuZHMnKVxuICB9XG4gIGlmIChzdGFydCA8IDAgfHwgc3RhcnQgPj0gdGhpcy5sZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbmRleCBvdXQgb2YgcmFuZ2UnKVxuICBpZiAoZW5kIDwgMCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3NvdXJjZUVuZCBvdXQgb2YgYm91bmRzJylcblxuICAvLyBBcmUgd2Ugb29iP1xuICBpZiAoZW5kID4gdGhpcy5sZW5ndGgpIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmICh0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0U3RhcnQgPCBlbmQgLSBzdGFydCkge1xuICAgIGVuZCA9IHRhcmdldC5sZW5ndGggLSB0YXJnZXRTdGFydCArIHN0YXJ0XG4gIH1cblxuICB2YXIgbGVuID0gZW5kIC0gc3RhcnRcblxuICBpZiAodGhpcyA9PT0gdGFyZ2V0ICYmIHR5cGVvZiBVaW50OEFycmF5LnByb3RvdHlwZS5jb3B5V2l0aGluID09PSAnZnVuY3Rpb24nKSB7XG4gICAgLy8gVXNlIGJ1aWx0LWluIHdoZW4gYXZhaWxhYmxlLCBtaXNzaW5nIGZyb20gSUUxMVxuICAgIHRoaXMuY29weVdpdGhpbih0YXJnZXRTdGFydCwgc3RhcnQsIGVuZClcbiAgfSBlbHNlIGlmICh0aGlzID09PSB0YXJnZXQgJiYgc3RhcnQgPCB0YXJnZXRTdGFydCAmJiB0YXJnZXRTdGFydCA8IGVuZCkge1xuICAgIC8vIGRlc2NlbmRpbmcgY29weSBmcm9tIGVuZFxuICAgIGZvciAodmFyIGkgPSBsZW4gLSAxOyBpID49IDA7IC0taSkge1xuICAgICAgdGFyZ2V0W2kgKyB0YXJnZXRTdGFydF0gPSB0aGlzW2kgKyBzdGFydF1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgVWludDhBcnJheS5wcm90b3R5cGUuc2V0LmNhbGwoXG4gICAgICB0YXJnZXQsXG4gICAgICB0aGlzLnN1YmFycmF5KHN0YXJ0LCBlbmQpLFxuICAgICAgdGFyZ2V0U3RhcnRcbiAgICApXG4gIH1cblxuICByZXR1cm4gbGVuXG59XG5cbi8vIFVzYWdlOlxuLy8gICAgYnVmZmVyLmZpbGwobnVtYmVyWywgb2Zmc2V0WywgZW5kXV0pXG4vLyAgICBidWZmZXIuZmlsbChidWZmZXJbLCBvZmZzZXRbLCBlbmRdXSlcbi8vICAgIGJ1ZmZlci5maWxsKHN0cmluZ1ssIG9mZnNldFssIGVuZF1dWywgZW5jb2RpbmddKVxuQnVmZmVyLnByb3RvdHlwZS5maWxsID0gZnVuY3Rpb24gZmlsbCAodmFsLCBzdGFydCwgZW5kLCBlbmNvZGluZykge1xuICAvLyBIYW5kbGUgc3RyaW5nIGNhc2VzOlxuICBpZiAodHlwZW9mIHZhbCA9PT0gJ3N0cmluZycpIHtcbiAgICBpZiAodHlwZW9mIHN0YXJ0ID09PSAnc3RyaW5nJykge1xuICAgICAgZW5jb2RpbmcgPSBzdGFydFxuICAgICAgc3RhcnQgPSAwXG4gICAgICBlbmQgPSB0aGlzLmxlbmd0aFxuICAgIH0gZWxzZSBpZiAodHlwZW9mIGVuZCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGVuY29kaW5nID0gZW5kXG4gICAgICBlbmQgPSB0aGlzLmxlbmd0aFxuICAgIH1cbiAgICBpZiAoZW5jb2RpbmcgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2YgZW5jb2RpbmcgIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdlbmNvZGluZyBtdXN0IGJlIGEgc3RyaW5nJylcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBlbmNvZGluZyA9PT0gJ3N0cmluZycgJiYgIUJ1ZmZlci5pc0VuY29kaW5nKGVuY29kaW5nKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5rbm93biBlbmNvZGluZzogJyArIGVuY29kaW5nKVxuICAgIH1cbiAgICBpZiAodmFsLmxlbmd0aCA9PT0gMSkge1xuICAgICAgdmFyIGNvZGUgPSB2YWwuY2hhckNvZGVBdCgwKVxuICAgICAgaWYgKChlbmNvZGluZyA9PT0gJ3V0ZjgnICYmIGNvZGUgPCAxMjgpIHx8XG4gICAgICAgICAgZW5jb2RpbmcgPT09ICdsYXRpbjEnKSB7XG4gICAgICAgIC8vIEZhc3QgcGF0aDogSWYgYHZhbGAgZml0cyBpbnRvIGEgc2luZ2xlIGJ5dGUsIHVzZSB0aGF0IG51bWVyaWMgdmFsdWUuXG4gICAgICAgIHZhbCA9IGNvZGVcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSBpZiAodHlwZW9mIHZhbCA9PT0gJ251bWJlcicpIHtcbiAgICB2YWwgPSB2YWwgJiAyNTVcbiAgfVxuXG4gIC8vIEludmFsaWQgcmFuZ2VzIGFyZSBub3Qgc2V0IHRvIGEgZGVmYXVsdCwgc28gY2FuIHJhbmdlIGNoZWNrIGVhcmx5LlxuICBpZiAoc3RhcnQgPCAwIHx8IHRoaXMubGVuZ3RoIDwgc3RhcnQgfHwgdGhpcy5sZW5ndGggPCBlbmQpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignT3V0IG9mIHJhbmdlIGluZGV4JylcbiAgfVxuXG4gIGlmIChlbmQgPD0gc3RhcnQpIHtcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgc3RhcnQgPSBzdGFydCA+Pj4gMFxuICBlbmQgPSBlbmQgPT09IHVuZGVmaW5lZCA/IHRoaXMubGVuZ3RoIDogZW5kID4+PiAwXG5cbiAgaWYgKCF2YWwpIHZhbCA9IDBcblxuICB2YXIgaVxuICBpZiAodHlwZW9mIHZhbCA9PT0gJ251bWJlcicpIHtcbiAgICBmb3IgKGkgPSBzdGFydDsgaSA8IGVuZDsgKytpKSB7XG4gICAgICB0aGlzW2ldID0gdmFsXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhciBieXRlcyA9IEJ1ZmZlci5pc0J1ZmZlcih2YWwpXG4gICAgICA/IHZhbFxuICAgICAgOiBCdWZmZXIuZnJvbSh2YWwsIGVuY29kaW5nKVxuICAgIHZhciBsZW4gPSBieXRlcy5sZW5ndGhcbiAgICBpZiAobGVuID09PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgdmFsdWUgXCInICsgdmFsICtcbiAgICAgICAgJ1wiIGlzIGludmFsaWQgZm9yIGFyZ3VtZW50IFwidmFsdWVcIicpXG4gICAgfVxuICAgIGZvciAoaSA9IDA7IGkgPCBlbmQgLSBzdGFydDsgKytpKSB7XG4gICAgICB0aGlzW2kgKyBzdGFydF0gPSBieXRlc1tpICUgbGVuXVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzXG59XG5cbi8vIEhFTFBFUiBGVU5DVElPTlNcbi8vID09PT09PT09PT09PT09PT1cblxudmFyIElOVkFMSURfQkFTRTY0X1JFID0gL1teKy8wLTlBLVphLXotX10vZ1xuXG5mdW5jdGlvbiBiYXNlNjRjbGVhbiAoc3RyKSB7XG4gIC8vIE5vZGUgdGFrZXMgZXF1YWwgc2lnbnMgYXMgZW5kIG9mIHRoZSBCYXNlNjQgZW5jb2RpbmdcbiAgc3RyID0gc3RyLnNwbGl0KCc9JylbMF1cbiAgLy8gTm9kZSBzdHJpcHMgb3V0IGludmFsaWQgY2hhcmFjdGVycyBsaWtlIFxcbiBhbmQgXFx0IGZyb20gdGhlIHN0cmluZywgYmFzZTY0LWpzIGRvZXMgbm90XG4gIHN0ciA9IHN0ci50cmltKCkucmVwbGFjZShJTlZBTElEX0JBU0U2NF9SRSwgJycpXG4gIC8vIE5vZGUgY29udmVydHMgc3RyaW5ncyB3aXRoIGxlbmd0aCA8IDIgdG8gJydcbiAgaWYgKHN0ci5sZW5ndGggPCAyKSByZXR1cm4gJydcbiAgLy8gTm9kZSBhbGxvd3MgZm9yIG5vbi1wYWRkZWQgYmFzZTY0IHN0cmluZ3MgKG1pc3NpbmcgdHJhaWxpbmcgPT09KSwgYmFzZTY0LWpzIGRvZXMgbm90XG4gIHdoaWxlIChzdHIubGVuZ3RoICUgNCAhPT0gMCkge1xuICAgIHN0ciA9IHN0ciArICc9J1xuICB9XG4gIHJldHVybiBzdHJcbn1cblxuZnVuY3Rpb24gdG9IZXggKG4pIHtcbiAgaWYgKG4gPCAxNikgcmV0dXJuICcwJyArIG4udG9TdHJpbmcoMTYpXG4gIHJldHVybiBuLnRvU3RyaW5nKDE2KVxufVxuXG5mdW5jdGlvbiB1dGY4VG9CeXRlcyAoc3RyaW5nLCB1bml0cykge1xuICB1bml0cyA9IHVuaXRzIHx8IEluZmluaXR5XG4gIHZhciBjb2RlUG9pbnRcbiAgdmFyIGxlbmd0aCA9IHN0cmluZy5sZW5ndGhcbiAgdmFyIGxlYWRTdXJyb2dhdGUgPSBudWxsXG4gIHZhciBieXRlcyA9IFtdXG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgIGNvZGVQb2ludCA9IHN0cmluZy5jaGFyQ29kZUF0KGkpXG5cbiAgICAvLyBpcyBzdXJyb2dhdGUgY29tcG9uZW50XG4gICAgaWYgKGNvZGVQb2ludCA+IDB4RDdGRiAmJiBjb2RlUG9pbnQgPCAweEUwMDApIHtcbiAgICAgIC8vIGxhc3QgY2hhciB3YXMgYSBsZWFkXG4gICAgICBpZiAoIWxlYWRTdXJyb2dhdGUpIHtcbiAgICAgICAgLy8gbm8gbGVhZCB5ZXRcbiAgICAgICAgaWYgKGNvZGVQb2ludCA+IDB4REJGRikge1xuICAgICAgICAgIC8vIHVuZXhwZWN0ZWQgdHJhaWxcbiAgICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9IGVsc2UgaWYgKGkgKyAxID09PSBsZW5ndGgpIHtcbiAgICAgICAgICAvLyB1bnBhaXJlZCBsZWFkXG4gICAgICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHZhbGlkIGxlYWRcbiAgICAgICAgbGVhZFN1cnJvZ2F0ZSA9IGNvZGVQb2ludFxuXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIC8vIDIgbGVhZHMgaW4gYSByb3dcbiAgICAgIGlmIChjb2RlUG9pbnQgPCAweERDMDApIHtcbiAgICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgICAgIGxlYWRTdXJyb2dhdGUgPSBjb2RlUG9pbnRcbiAgICAgICAgY29udGludWVcbiAgICAgIH1cblxuICAgICAgLy8gdmFsaWQgc3Vycm9nYXRlIHBhaXJcbiAgICAgIGNvZGVQb2ludCA9IChsZWFkU3Vycm9nYXRlIC0gMHhEODAwIDw8IDEwIHwgY29kZVBvaW50IC0gMHhEQzAwKSArIDB4MTAwMDBcbiAgICB9IGVsc2UgaWYgKGxlYWRTdXJyb2dhdGUpIHtcbiAgICAgIC8vIHZhbGlkIGJtcCBjaGFyLCBidXQgbGFzdCBjaGFyIHdhcyBhIGxlYWRcbiAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgIH1cblxuICAgIGxlYWRTdXJyb2dhdGUgPSBudWxsXG5cbiAgICAvLyBlbmNvZGUgdXRmOFxuICAgIGlmIChjb2RlUG9pbnQgPCAweDgwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDEpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goY29kZVBvaW50KVxuICAgIH0gZWxzZSBpZiAoY29kZVBvaW50IDwgMHg4MDApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMikgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChcbiAgICAgICAgY29kZVBvaW50ID4+IDB4NiB8IDB4QzAsXG4gICAgICAgIGNvZGVQb2ludCAmIDB4M0YgfCAweDgwXG4gICAgICApXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDEwMDAwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDMpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goXG4gICAgICAgIGNvZGVQb2ludCA+PiAweEMgfCAweEUwLFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2ICYgMHgzRiB8IDB4ODAsXG4gICAgICAgIGNvZGVQb2ludCAmIDB4M0YgfCAweDgwXG4gICAgICApXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDExMDAwMCkge1xuICAgICAgaWYgKCh1bml0cyAtPSA0KSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHgxMiB8IDB4RjAsXG4gICAgICAgIGNvZGVQb2ludCA+PiAweEMgJiAweDNGIHwgMHg4MCxcbiAgICAgICAgY29kZVBvaW50ID4+IDB4NiAmIDB4M0YgfCAweDgwLFxuICAgICAgICBjb2RlUG9pbnQgJiAweDNGIHwgMHg4MFxuICAgICAgKVxuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgY29kZSBwb2ludCcpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGJ5dGVzXG59XG5cbmZ1bmN0aW9uIGFzY2lpVG9CeXRlcyAoc3RyKSB7XG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7ICsraSkge1xuICAgIC8vIE5vZGUncyBjb2RlIHNlZW1zIHRvIGJlIGRvaW5nIHRoaXMgYW5kIG5vdCAmIDB4N0YuLlxuICAgIGJ5dGVBcnJheS5wdXNoKHN0ci5jaGFyQ29kZUF0KGkpICYgMHhGRilcbiAgfVxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIHV0ZjE2bGVUb0J5dGVzIChzdHIsIHVuaXRzKSB7XG4gIHZhciBjLCBoaSwgbG9cbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgKytpKSB7XG4gICAgaWYgKCh1bml0cyAtPSAyKSA8IDApIGJyZWFrXG5cbiAgICBjID0gc3RyLmNoYXJDb2RlQXQoaSlcbiAgICBoaSA9IGMgPj4gOFxuICAgIGxvID0gYyAlIDI1NlxuICAgIGJ5dGVBcnJheS5wdXNoKGxvKVxuICAgIGJ5dGVBcnJheS5wdXNoKGhpKVxuICB9XG5cbiAgcmV0dXJuIGJ5dGVBcnJheVxufVxuXG5mdW5jdGlvbiBiYXNlNjRUb0J5dGVzIChzdHIpIHtcbiAgcmV0dXJuIGJhc2U2NC50b0J5dGVBcnJheShiYXNlNjRjbGVhbihzdHIpKVxufVxuXG5mdW5jdGlvbiBibGl0QnVmZmVyIChzcmMsIGRzdCwgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgIGlmICgoaSArIG9mZnNldCA+PSBkc3QubGVuZ3RoKSB8fCAoaSA+PSBzcmMubGVuZ3RoKSkgYnJlYWtcbiAgICBkc3RbaSArIG9mZnNldF0gPSBzcmNbaV1cbiAgfVxuICByZXR1cm4gaVxufVxuXG4vLyBBcnJheUJ1ZmZlciBvciBVaW50OEFycmF5IG9iamVjdHMgZnJvbSBvdGhlciBjb250ZXh0cyAoaS5lLiBpZnJhbWVzKSBkbyBub3QgcGFzc1xuLy8gdGhlIGBpbnN0YW5jZW9mYCBjaGVjayBidXQgdGhleSBzaG91bGQgYmUgdHJlYXRlZCBhcyBvZiB0aGF0IHR5cGUuXG4vLyBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9mZXJvc3MvYnVmZmVyL2lzc3Vlcy8xNjZcbmZ1bmN0aW9uIGlzSW5zdGFuY2UgKG9iaiwgdHlwZSkge1xuICByZXR1cm4gb2JqIGluc3RhbmNlb2YgdHlwZSB8fFxuICAgIChvYmogIT0gbnVsbCAmJiBvYmouY29uc3RydWN0b3IgIT0gbnVsbCAmJiBvYmouY29uc3RydWN0b3IubmFtZSAhPSBudWxsICYmXG4gICAgICBvYmouY29uc3RydWN0b3IubmFtZSA9PT0gdHlwZS5uYW1lKVxufVxuZnVuY3Rpb24gbnVtYmVySXNOYU4gKG9iaikge1xuICAvLyBGb3IgSUUxMSBzdXBwb3J0XG4gIHJldHVybiBvYmogIT09IG9iaiAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXNlbGYtY29tcGFyZVxufVxuIiwiIWZ1bmN0aW9uKHQsZSl7XCJvYmplY3RcIj09dHlwZW9mIGV4cG9ydHMmJlwidW5kZWZpbmVkXCIhPXR5cGVvZiBtb2R1bGU/ZShleHBvcnRzKTpcImZ1bmN0aW9uXCI9PXR5cGVvZiBkZWZpbmUmJmRlZmluZS5hbWQ/ZGVmaW5lKFtcImV4cG9ydHNcIl0sZSk6ZSgodD10fHxzZWxmKS5EQVBqcz17fSl9KHRoaXMsKGZ1bmN0aW9uKHQpe1widXNlIHN0cmljdFwiO1xuLyohICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgQ29weXJpZ2h0IChjKSBNaWNyb3NvZnQgQ29ycG9yYXRpb24uIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gICAgTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlXG4gICAgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGVcbiAgICBMaWNlbnNlIGF0IGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuXG4gICAgVEhJUyBDT0RFIElTIFBST1ZJREVEIE9OIEFOICpBUyBJUyogQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuICAgIEtJTkQsIEVJVEhFUiBFWFBSRVNTIE9SIElNUExJRUQsIElOQ0xVRElORyBXSVRIT1VUIExJTUlUQVRJT04gQU5ZIElNUExJRURcbiAgICBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgVElUTEUsIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLFxuICAgIE1FUkNIQU5UQUJMSVRZIE9SIE5PTi1JTkZSSU5HRU1FTlQuXG5cbiAgICBTZWUgdGhlIEFwYWNoZSBWZXJzaW9uIDIuMCBMaWNlbnNlIGZvciBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnNcbiAgICBhbmQgbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gICAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiogKi92YXIgZT1mdW5jdGlvbih0LHIpe3JldHVybihlPU9iamVjdC5zZXRQcm90b3R5cGVPZnx8e19fcHJvdG9fXzpbXX1pbnN0YW5jZW9mIEFycmF5JiZmdW5jdGlvbih0LGUpe3QuX19wcm90b19fPWV9fHxmdW5jdGlvbih0LGUpe2Zvcih2YXIgciBpbiBlKWUuaGFzT3duUHJvcGVydHkocikmJih0W3JdPWVbcl0pfSkodCxyKX07ZnVuY3Rpb24gcih0LHIpe2Z1bmN0aW9uIG4oKXt0aGlzLmNvbnN0cnVjdG9yPXR9ZSh0LHIpLHQucHJvdG90eXBlPW51bGw9PT1yP09iamVjdC5jcmVhdGUocik6KG4ucHJvdG90eXBlPXIucHJvdG90eXBlLG5ldyBuKX1mdW5jdGlvbiBuKHQsZSxyLG4pe3JldHVybiBuZXcocnx8KHI9UHJvbWlzZSkpKChmdW5jdGlvbihpLHMpe2Z1bmN0aW9uIG8odCl7dHJ5e2Mobi5uZXh0KHQpKX1jYXRjaCh0KXtzKHQpfX1mdW5jdGlvbiB1KHQpe3RyeXtjKG4udGhyb3codCkpfWNhdGNoKHQpe3ModCl9fWZ1bmN0aW9uIGModCl7dmFyIGU7dC5kb25lP2kodC52YWx1ZSk6KGU9dC52YWx1ZSxlIGluc3RhbmNlb2Ygcj9lOm5ldyByKChmdW5jdGlvbih0KXt0KGUpfSkpKS50aGVuKG8sdSl9Yygobj1uLmFwcGx5KHQsZXx8W10pKS5uZXh0KCkpfSkpfWZ1bmN0aW9uIGkodCxlKXt2YXIgcixuLGkscyxvPXtsYWJlbDowLHNlbnQ6ZnVuY3Rpb24oKXtpZigxJmlbMF0pdGhyb3cgaVsxXTtyZXR1cm4gaVsxXX0sdHJ5czpbXSxvcHM6W119O3JldHVybiBzPXtuZXh0OnUoMCksdGhyb3c6dSgxKSxyZXR1cm46dSgyKX0sXCJmdW5jdGlvblwiPT10eXBlb2YgU3ltYm9sJiYoc1tTeW1ib2wuaXRlcmF0b3JdPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXN9KSxzO2Z1bmN0aW9uIHUocyl7cmV0dXJuIGZ1bmN0aW9uKHUpe3JldHVybiBmdW5jdGlvbihzKXtpZihyKXRocm93IG5ldyBUeXBlRXJyb3IoXCJHZW5lcmF0b3IgaXMgYWxyZWFkeSBleGVjdXRpbmcuXCIpO2Zvcig7bzspdHJ5e2lmKHI9MSxuJiYoaT0yJnNbMF0/bi5yZXR1cm46c1swXT9uLnRocm93fHwoKGk9bi5yZXR1cm4pJiZpLmNhbGwobiksMCk6bi5uZXh0KSYmIShpPWkuY2FsbChuLHNbMV0pKS5kb25lKXJldHVybiBpO3N3aXRjaChuPTAsaSYmKHM9WzImc1swXSxpLnZhbHVlXSksc1swXSl7Y2FzZSAwOmNhc2UgMTppPXM7YnJlYWs7Y2FzZSA0OnJldHVybiBvLmxhYmVsKysse3ZhbHVlOnNbMV0sZG9uZTohMX07Y2FzZSA1Om8ubGFiZWwrKyxuPXNbMV0scz1bMF07Y29udGludWU7Y2FzZSA3OnM9by5vcHMucG9wKCksby50cnlzLnBvcCgpO2NvbnRpbnVlO2RlZmF1bHQ6aWYoIShpPW8udHJ5cywoaT1pLmxlbmd0aD4wJiZpW2kubGVuZ3RoLTFdKXx8NiE9PXNbMF0mJjIhPT1zWzBdKSl7bz0wO2NvbnRpbnVlfWlmKDM9PT1zWzBdJiYoIWl8fHNbMV0+aVswXSYmc1sxXTxpWzNdKSl7by5sYWJlbD1zWzFdO2JyZWFrfWlmKDY9PT1zWzBdJiZvLmxhYmVsPGlbMV0pe28ubGFiZWw9aVsxXSxpPXM7YnJlYWt9aWYoaSYmby5sYWJlbDxpWzJdKXtvLmxhYmVsPWlbMl0sby5vcHMucHVzaChzKTticmVha31pWzJdJiZvLm9wcy5wb3AoKSxvLnRyeXMucG9wKCk7Y29udGludWV9cz1lLmNhbGwodCxvKX1jYXRjaCh0KXtzPVs2LHRdLG49MH1maW5hbGx5e3I9aT0wfWlmKDUmc1swXSl0aHJvdyBzWzFdO3JldHVybnt2YWx1ZTpzWzBdP3NbMV06dm9pZCAwLGRvbmU6ITB9fShbcyx1XSl9fX1mdW5jdGlvbiBzKCl7fWZ1bmN0aW9uIG8oKXtvLmluaXQuY2FsbCh0aGlzKX1mdW5jdGlvbiB1KHQpe3JldHVybiB2b2lkIDA9PT10Ll9tYXhMaXN0ZW5lcnM/by5kZWZhdWx0TWF4TGlzdGVuZXJzOnQuX21heExpc3RlbmVyc31mdW5jdGlvbiBjKHQsZSxyKXtpZihlKXQuY2FsbChyKTtlbHNlIGZvcih2YXIgbj10Lmxlbmd0aCxpPXcodCxuKSxzPTA7czxuOysrcylpW3NdLmNhbGwocil9ZnVuY3Rpb24gYSh0LGUscixuKXtpZihlKXQuY2FsbChyLG4pO2Vsc2UgZm9yKHZhciBpPXQubGVuZ3RoLHM9dyh0LGkpLG89MDtvPGk7KytvKXNbb10uY2FsbChyLG4pfWZ1bmN0aW9uIGgodCxlLHIsbixpKXtpZihlKXQuY2FsbChyLG4saSk7ZWxzZSBmb3IodmFyIHM9dC5sZW5ndGgsbz13KHQscyksdT0wO3U8czsrK3Upb1t1XS5jYWxsKHIsbixpKX1mdW5jdGlvbiBmKHQsZSxyLG4saSxzKXtpZihlKXQuY2FsbChyLG4saSxzKTtlbHNlIGZvcih2YXIgbz10Lmxlbmd0aCx1PXcodCxvKSxjPTA7YzxvOysrYyl1W2NdLmNhbGwocixuLGkscyl9ZnVuY3Rpb24gbCh0LGUscixuKXtpZihlKXQuYXBwbHkocixuKTtlbHNlIGZvcih2YXIgaT10Lmxlbmd0aCxzPXcodCxpKSxvPTA7bzxpOysrbylzW29dLmFwcGx5KHIsbil9ZnVuY3Rpb24gZCh0LGUscixuKXt2YXIgaSxvLGMsYTtpZihcImZ1bmN0aW9uXCIhPXR5cGVvZiByKXRocm93IG5ldyBUeXBlRXJyb3IoJ1wibGlzdGVuZXJcIiBhcmd1bWVudCBtdXN0IGJlIGEgZnVuY3Rpb24nKTtpZigobz10Ll9ldmVudHMpPyhvLm5ld0xpc3RlbmVyJiYodC5lbWl0KFwibmV3TGlzdGVuZXJcIixlLHIubGlzdGVuZXI/ci5saXN0ZW5lcjpyKSxvPXQuX2V2ZW50cyksYz1vW2VdKToobz10Ll9ldmVudHM9bmV3IHMsdC5fZXZlbnRzQ291bnQ9MCksYyl7aWYoXCJmdW5jdGlvblwiPT10eXBlb2YgYz9jPW9bZV09bj9bcixjXTpbYyxyXTpuP2MudW5zaGlmdChyKTpjLnB1c2gociksIWMud2FybmVkJiYoaT11KHQpKSYmaT4wJiZjLmxlbmd0aD5pKXtjLndhcm5lZD0hMDt2YXIgaD1uZXcgRXJyb3IoXCJQb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5IGxlYWsgZGV0ZWN0ZWQuIFwiK2MubGVuZ3RoK1wiIFwiK2UrXCIgbGlzdGVuZXJzIGFkZGVkLiBVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdFwiKTtoLm5hbWU9XCJNYXhMaXN0ZW5lcnNFeGNlZWRlZFdhcm5pbmdcIixoLmVtaXR0ZXI9dCxoLnR5cGU9ZSxoLmNvdW50PWMubGVuZ3RoLGE9aCxcImZ1bmN0aW9uXCI9PXR5cGVvZiBjb25zb2xlLndhcm4/Y29uc29sZS53YXJuKGEpOmNvbnNvbGUubG9nKGEpfX1lbHNlIGM9b1tlXT1yLCsrdC5fZXZlbnRzQ291bnQ7cmV0dXJuIHR9ZnVuY3Rpb24gcCh0LGUscil7dmFyIG49ITE7ZnVuY3Rpb24gaSgpe3QucmVtb3ZlTGlzdGVuZXIoZSxpKSxufHwobj0hMCxyLmFwcGx5KHQsYXJndW1lbnRzKSl9cmV0dXJuIGkubGlzdGVuZXI9cixpfWZ1bmN0aW9uIHYodCl7dmFyIGU9dGhpcy5fZXZlbnRzO2lmKGUpe3ZhciByPWVbdF07aWYoXCJmdW5jdGlvblwiPT10eXBlb2YgcilyZXR1cm4gMTtpZihyKXJldHVybiByLmxlbmd0aH1yZXR1cm4gMH1mdW5jdGlvbiB3KHQsZSl7Zm9yKHZhciByPW5ldyBBcnJheShlKTtlLS07KXJbZV09dFtlXTtyZXR1cm4gcn1zLnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKG51bGwpLG8uRXZlbnRFbWl0dGVyPW8sby51c2luZ0RvbWFpbnM9ITEsby5wcm90b3R5cGUuZG9tYWluPXZvaWQgMCxvLnByb3RvdHlwZS5fZXZlbnRzPXZvaWQgMCxvLnByb3RvdHlwZS5fbWF4TGlzdGVuZXJzPXZvaWQgMCxvLmRlZmF1bHRNYXhMaXN0ZW5lcnM9MTAsby5pbml0PWZ1bmN0aW9uKCl7dGhpcy5kb21haW49bnVsbCxvLnVzaW5nRG9tYWlucyYmdW5kZWZpbmVkLmFjdGl2ZSx0aGlzLl9ldmVudHMmJnRoaXMuX2V2ZW50cyE9PU9iamVjdC5nZXRQcm90b3R5cGVPZih0aGlzKS5fZXZlbnRzfHwodGhpcy5fZXZlbnRzPW5ldyBzLHRoaXMuX2V2ZW50c0NvdW50PTApLHRoaXMuX21heExpc3RlbmVycz10aGlzLl9tYXhMaXN0ZW5lcnN8fHZvaWQgMH0sby5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzPWZ1bmN0aW9uKHQpe2lmKFwibnVtYmVyXCIhPXR5cGVvZiB0fHx0PDB8fGlzTmFOKHQpKXRocm93IG5ldyBUeXBlRXJyb3IoJ1wiblwiIGFyZ3VtZW50IG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInKTtyZXR1cm4gdGhpcy5fbWF4TGlzdGVuZXJzPXQsdGhpc30sby5wcm90b3R5cGUuZ2V0TWF4TGlzdGVuZXJzPWZ1bmN0aW9uKCl7cmV0dXJuIHUodGhpcyl9LG8ucHJvdG90eXBlLmVtaXQ9ZnVuY3Rpb24odCl7dmFyIGUscixuLGkscyxvLHUsZD1cImVycm9yXCI9PT10O2lmKG89dGhpcy5fZXZlbnRzKWQ9ZCYmbnVsbD09by5lcnJvcjtlbHNlIGlmKCFkKXJldHVybiExO2lmKHU9dGhpcy5kb21haW4sZCl7aWYoZT1hcmd1bWVudHNbMV0sIXUpe2lmKGUgaW5zdGFuY2VvZiBFcnJvcil0aHJvdyBlO3ZhciBwPW5ldyBFcnJvcignVW5jYXVnaHQsIHVuc3BlY2lmaWVkIFwiZXJyb3JcIiBldmVudC4gKCcrZStcIilcIik7dGhyb3cgcC5jb250ZXh0PWUscH1yZXR1cm4gZXx8KGU9bmV3IEVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50JykpLGUuZG9tYWluRW1pdHRlcj10aGlzLGUuZG9tYWluPXUsZS5kb21haW5UaHJvd249ITEsdS5lbWl0KFwiZXJyb3JcIixlKSwhMX1pZighKHI9b1t0XSkpcmV0dXJuITE7dmFyIHY9XCJmdW5jdGlvblwiPT10eXBlb2Ygcjtzd2l0Y2gobj1hcmd1bWVudHMubGVuZ3RoKXtjYXNlIDE6YyhyLHYsdGhpcyk7YnJlYWs7Y2FzZSAyOmEocix2LHRoaXMsYXJndW1lbnRzWzFdKTticmVhaztjYXNlIDM6aChyLHYsdGhpcyxhcmd1bWVudHNbMV0sYXJndW1lbnRzWzJdKTticmVhaztjYXNlIDQ6ZihyLHYsdGhpcyxhcmd1bWVudHNbMV0sYXJndW1lbnRzWzJdLGFyZ3VtZW50c1szXSk7YnJlYWs7ZGVmYXVsdDpmb3IoaT1uZXcgQXJyYXkobi0xKSxzPTE7czxuO3MrKylpW3MtMV09YXJndW1lbnRzW3NdO2wocix2LHRoaXMsaSl9cmV0dXJuITB9LG8ucHJvdG90eXBlLmFkZExpc3RlbmVyPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIGQodGhpcyx0LGUsITEpfSxvLnByb3RvdHlwZS5vbj1vLnByb3RvdHlwZS5hZGRMaXN0ZW5lcixvLnByb3RvdHlwZS5wcmVwZW5kTGlzdGVuZXI9ZnVuY3Rpb24odCxlKXtyZXR1cm4gZCh0aGlzLHQsZSwhMCl9LG8ucHJvdG90eXBlLm9uY2U9ZnVuY3Rpb24odCxlKXtpZihcImZ1bmN0aW9uXCIhPXR5cGVvZiBlKXRocm93IG5ldyBUeXBlRXJyb3IoJ1wibGlzdGVuZXJcIiBhcmd1bWVudCBtdXN0IGJlIGEgZnVuY3Rpb24nKTtyZXR1cm4gdGhpcy5vbih0LHAodGhpcyx0LGUpKSx0aGlzfSxvLnByb3RvdHlwZS5wcmVwZW5kT25jZUxpc3RlbmVyPWZ1bmN0aW9uKHQsZSl7aWYoXCJmdW5jdGlvblwiIT10eXBlb2YgZSl0aHJvdyBuZXcgVHlwZUVycm9yKCdcImxpc3RlbmVyXCIgYXJndW1lbnQgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7cmV0dXJuIHRoaXMucHJlcGVuZExpc3RlbmVyKHQscCh0aGlzLHQsZSkpLHRoaXN9LG8ucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyPWZ1bmN0aW9uKHQsZSl7dmFyIHIsbixpLG8sdTtpZihcImZ1bmN0aW9uXCIhPXR5cGVvZiBlKXRocm93IG5ldyBUeXBlRXJyb3IoJ1wibGlzdGVuZXJcIiBhcmd1bWVudCBtdXN0IGJlIGEgZnVuY3Rpb24nKTtpZighKG49dGhpcy5fZXZlbnRzKSlyZXR1cm4gdGhpcztpZighKHI9blt0XSkpcmV0dXJuIHRoaXM7aWYocj09PWV8fHIubGlzdGVuZXImJnIubGlzdGVuZXI9PT1lKTA9PS0tdGhpcy5fZXZlbnRzQ291bnQ/dGhpcy5fZXZlbnRzPW5ldyBzOihkZWxldGUgblt0XSxuLnJlbW92ZUxpc3RlbmVyJiZ0aGlzLmVtaXQoXCJyZW1vdmVMaXN0ZW5lclwiLHQsci5saXN0ZW5lcnx8ZSkpO2Vsc2UgaWYoXCJmdW5jdGlvblwiIT10eXBlb2Ygcil7Zm9yKGk9LTEsbz1yLmxlbmd0aDtvLS0gPjA7KWlmKHJbb109PT1lfHxyW29dLmxpc3RlbmVyJiZyW29dLmxpc3RlbmVyPT09ZSl7dT1yW29dLmxpc3RlbmVyLGk9bzticmVha31pZihpPDApcmV0dXJuIHRoaXM7aWYoMT09PXIubGVuZ3RoKXtpZihyWzBdPXZvaWQgMCwwPT0tLXRoaXMuX2V2ZW50c0NvdW50KXJldHVybiB0aGlzLl9ldmVudHM9bmV3IHMsdGhpcztkZWxldGUgblt0XX1lbHNlIWZ1bmN0aW9uKHQsZSl7Zm9yKHZhciByPWUsbj1yKzEsaT10Lmxlbmd0aDtuPGk7cis9MSxuKz0xKXRbcl09dFtuXTt0LnBvcCgpfShyLGkpO24ucmVtb3ZlTGlzdGVuZXImJnRoaXMuZW1pdChcInJlbW92ZUxpc3RlbmVyXCIsdCx1fHxlKX1yZXR1cm4gdGhpc30sby5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzPWZ1bmN0aW9uKHQpe3ZhciBlLHI7aWYoIShyPXRoaXMuX2V2ZW50cykpcmV0dXJuIHRoaXM7aWYoIXIucmVtb3ZlTGlzdGVuZXIpcmV0dXJuIDA9PT1hcmd1bWVudHMubGVuZ3RoPyh0aGlzLl9ldmVudHM9bmV3IHMsdGhpcy5fZXZlbnRzQ291bnQ9MCk6clt0XSYmKDA9PS0tdGhpcy5fZXZlbnRzQ291bnQ/dGhpcy5fZXZlbnRzPW5ldyBzOmRlbGV0ZSByW3RdKSx0aGlzO2lmKDA9PT1hcmd1bWVudHMubGVuZ3RoKXtmb3IodmFyIG4saT1PYmplY3Qua2V5cyhyKSxvPTA7bzxpLmxlbmd0aDsrK28pXCJyZW1vdmVMaXN0ZW5lclwiIT09KG49aVtvXSkmJnRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKG4pO3JldHVybiB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhcInJlbW92ZUxpc3RlbmVyXCIpLHRoaXMuX2V2ZW50cz1uZXcgcyx0aGlzLl9ldmVudHNDb3VudD0wLHRoaXN9aWYoXCJmdW5jdGlvblwiPT10eXBlb2YoZT1yW3RdKSl0aGlzLnJlbW92ZUxpc3RlbmVyKHQsZSk7ZWxzZSBpZihlKWRve3RoaXMucmVtb3ZlTGlzdGVuZXIodCxlW2UubGVuZ3RoLTFdKX13aGlsZShlWzBdKTtyZXR1cm4gdGhpc30sby5wcm90b3R5cGUubGlzdGVuZXJzPWZ1bmN0aW9uKHQpe3ZhciBlLHI9dGhpcy5fZXZlbnRzO3JldHVybiByJiYoZT1yW3RdKT9cImZ1bmN0aW9uXCI9PXR5cGVvZiBlP1tlLmxpc3RlbmVyfHxlXTpmdW5jdGlvbih0KXtmb3IodmFyIGU9bmV3IEFycmF5KHQubGVuZ3RoKSxyPTA7cjxlLmxlbmd0aDsrK3IpZVtyXT10W3JdLmxpc3RlbmVyfHx0W3JdO3JldHVybiBlfShlKTpbXX0sby5saXN0ZW5lckNvdW50PWZ1bmN0aW9uKHQsZSl7cmV0dXJuXCJmdW5jdGlvblwiPT10eXBlb2YgdC5saXN0ZW5lckNvdW50P3QubGlzdGVuZXJDb3VudChlKTp2LmNhbGwodCxlKX0sby5wcm90b3R5cGUubGlzdGVuZXJDb3VudD12LG8ucHJvdG90eXBlLmV2ZW50TmFtZXM9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fZXZlbnRzQ291bnQ+MD9SZWZsZWN0Lm93bktleXModGhpcy5fZXZlbnRzKTpbXX07dmFyIHksbT0xZTcsYj1mdW5jdGlvbigpe2Z1bmN0aW9uIHQoKXt0aGlzLmxvY2tlZD0hMX1yZXR1cm4gdC5wcm90b3R5cGUubG9jaz1mdW5jdGlvbigpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbih0KXtzd2l0Y2godC5sYWJlbCl7Y2FzZSAwOnJldHVybiB0aGlzLmxvY2tlZD9bNCxuZXcgUHJvbWlzZSgoZnVuY3Rpb24odCl7cmV0dXJuIHNldFRpbWVvdXQodCwxKX0pKV06WzMsMl07Y2FzZSAxOnJldHVybiB0LnNlbnQoKSxbMywwXTtjYXNlIDI6cmV0dXJuIHRoaXMubG9ja2VkPSEwLFsyXX19KSl9KSl9LHQucHJvdG90eXBlLnVubG9jaz1mdW5jdGlvbigpe3RoaXMubG9ja2VkPSExfSx0fSgpLGc9ZnVuY3Rpb24odCl7ZnVuY3Rpb24gZShlLHIsbil7dm9pZCAwPT09ciYmKHI9MCksdm9pZCAwPT09biYmKG49bSk7dmFyIGk9dC5jYWxsKHRoaXMpfHx0aGlzO2kudHJhbnNwb3J0PWUsaS5tb2RlPXIsaS5jbG9ja0ZyZXF1ZW5jeT1uLGkuY29ubmVjdGVkPSExLGkuc2VuZE11dGV4PW5ldyBiLGkuYmxvY2tTaXplPWkudHJhbnNwb3J0LnBhY2tldFNpemUtNC0xO3ZhciBzPWkudHJhbnNwb3J0LnBhY2tldFNpemUtMi0xO3JldHVybiBpLm9wZXJhdGlvbkNvdW50PU1hdGguZmxvb3Iocy81KSxpfXJldHVybiByKGUsdCksZS5wcm90b3R5cGUuYnVmZmVyU291cmNlVG9VaW50OEFycmF5PWZ1bmN0aW9uKHQsZSl7aWYoIWUpcmV0dXJuIG5ldyBVaW50OEFycmF5KFt0XSk7dmFyIHI9dm9pZCAwIT09ZS5idWZmZXI/ZS5idWZmZXI6ZSxuPW5ldyBVaW50OEFycmF5KHIuYnl0ZUxlbmd0aCsxKTtyZXR1cm4gbi5zZXQoW3RdKSxuLnNldChuZXcgVWludDhBcnJheShyKSwxKSxufSxlLnByb3RvdHlwZS5zZWxlY3RQcm90b2NvbD1mdW5jdGlvbih0KXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIGU7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24ocil7c3dpdGNoKHIubGFiZWwpe2Nhc2UgMDpyZXR1cm4gZT0yPT09dD81OTE5Njo1OTI5NCxbNCx0aGlzLnN3alNlcXVlbmNlKG5ldyBVaW50OEFycmF5KFsyNTUsMjU1LDI1NSwyNTUsMjU1LDI1NSwyNTVdKSldO2Nhc2UgMTpyZXR1cm4gci5zZW50KCksWzQsdGhpcy5zd2pTZXF1ZW5jZShuZXcgVWludDE2QXJyYXkoW2VdKSldO2Nhc2UgMjpyZXR1cm4gci5zZW50KCksWzQsdGhpcy5zd2pTZXF1ZW5jZShuZXcgVWludDhBcnJheShbMjU1LDI1NSwyNTUsMjU1LDI1NSwyNTUsMjU1XSkpXTtjYXNlIDM6cmV0dXJuIHIuc2VudCgpLFs0LHRoaXMuc3dqU2VxdWVuY2UobmV3IFVpbnQ4QXJyYXkoWzBdKSldO2Nhc2UgNDpyZXR1cm4gci5zZW50KCksWzJdfX0pKX0pKX0sZS5wcm90b3R5cGUuc2VuZD1mdW5jdGlvbih0LGUpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgcixuO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKGkpe3N3aXRjaChpLmxhYmVsKXtjYXNlIDA6cmV0dXJuIHI9dGhpcy5idWZmZXJTb3VyY2VUb1VpbnQ4QXJyYXkodCxlKSxbNCx0aGlzLnNlbmRNdXRleC5sb2NrKCldO2Nhc2UgMTppLnNlbnQoKSxpLmxhYmVsPTI7Y2FzZSAyOnJldHVybiBpLnRyeXMucHVzaChbMiwsNSw2XSksWzQsdGhpcy50cmFuc3BvcnQud3JpdGUocildO2Nhc2UgMzpyZXR1cm4gaS5zZW50KCksWzQsdGhpcy50cmFuc3BvcnQucmVhZCgpXTtjYXNlIDQ6aWYoKG49aS5zZW50KCkpLmdldFVpbnQ4KDApIT09dCl0aHJvdyBuZXcgRXJyb3IoXCJCYWQgcmVzcG9uc2UgZm9yIFwiK3QrXCIgLT4gXCIrbi5nZXRVaW50OCgwKSk7c3dpdGNoKHQpe2Nhc2UgMzpjYXNlIDg6Y2FzZSA5OmNhc2UgMTA6Y2FzZSAxNzpjYXNlIDE4OmNhc2UgMTk6Y2FzZSAyOTpjYXNlIDIzOmNhc2UgMjQ6Y2FzZSAyNjpjYXNlIDIxOmNhc2UgMjI6Y2FzZSA0OmlmKDAhPT1uLmdldFVpbnQ4KDEpKXRocm93IG5ldyBFcnJvcihcIkJhZCBzdGF0dXMgZm9yIFwiK3QrXCIgLT4gXCIrbi5nZXRVaW50OCgxKSl9cmV0dXJuWzIsbl07Y2FzZSA1OnJldHVybiB0aGlzLnNlbmRNdXRleC51bmxvY2soKSxbN107Y2FzZSA2OnJldHVyblsyXX19KSl9KSl9LGUucHJvdG90eXBlLmNsZWFyQWJvcnQ9ZnVuY3Rpb24odCl7cmV0dXJuIHZvaWQgMD09PXQmJih0PTMwKSxuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihlKXtzd2l0Y2goZS5sYWJlbCl7Y2FzZSAwOnJldHVybls0LHRoaXMuc2VuZCg4LG5ldyBVaW50OEFycmF5KFswLHRdKSldO2Nhc2UgMTpyZXR1cm4gZS5zZW50KCksWzJdfX0pKX0pKX0sZS5wcm90b3R5cGUuZGFwSW5mbz1mdW5jdGlvbih0KXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIGUscixuLHM7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24oaSl7c3dpdGNoKGkubGFiZWwpe2Nhc2UgMDpyZXR1cm4gaS50cnlzLnB1c2goWzAsMiwsNF0pLFs0LHRoaXMuc2VuZCgwLG5ldyBVaW50OEFycmF5KFt0XSkpXTtjYXNlIDE6aWYoZT1pLnNlbnQoKSwwPT09KHI9ZS5nZXRVaW50OCgxKSkpcmV0dXJuWzIsXCJcIl07c3dpdGNoKHQpe2Nhc2UgMjQwOmNhc2UgMjU0OmNhc2UgMjU1OmNhc2UgMjUzOmlmKDE9PT1yKXJldHVyblsyLGUuZ2V0VWludDgoMildO2lmKDI9PT1yKXJldHVyblsyLGUuZ2V0VWludDE2KDIpXTtpZig0PT09cilyZXR1cm5bMixlLmdldFVpbnQzMigyKV19cmV0dXJuIG49QXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwobmV3IFVpbnQ4QXJyYXkoZS5idWZmZXIsMixyKSksWzIsU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShudWxsLG4pXTtjYXNlIDI6cmV0dXJuIHM9aS5zZW50KCksWzQsdGhpcy5jbGVhckFib3J0KCldO2Nhc2UgMzp0aHJvdyBpLnNlbnQoKSxzO2Nhc2UgNDpyZXR1cm5bMl19fSkpfSkpfSxlLnByb3RvdHlwZS5zd2pTZXF1ZW5jZT1mdW5jdGlvbih0LGUpe3JldHVybiB2b2lkIDA9PT1lJiYoZT04KnQuYnl0ZUxlbmd0aCksbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIHIsbjtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihpKXtzd2l0Y2goaS5sYWJlbCl7Y2FzZSAwOnI9dGhpcy5idWZmZXJTb3VyY2VUb1VpbnQ4QXJyYXkoZSx0KSxpLmxhYmVsPTE7Y2FzZSAxOnJldHVybiBpLnRyeXMucHVzaChbMSwzLCw1XSksWzQsdGhpcy5zZW5kKDE4LHIpXTtjYXNlIDI6cmV0dXJuIGkuc2VudCgpLFszLDVdO2Nhc2UgMzpyZXR1cm4gbj1pLnNlbnQoKSxbNCx0aGlzLmNsZWFyQWJvcnQoKV07Y2FzZSA0OnRocm93IGkuc2VudCgpLG47Y2FzZSA1OnJldHVyblsyXX19KSl9KSl9LGUucHJvdG90eXBlLnN3akNsb2NrPWZ1bmN0aW9uKHQpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgZTtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihyKXtzd2l0Y2goci5sYWJlbCl7Y2FzZSAwOnJldHVybiByLnRyeXMucHVzaChbMCwyLCw0XSksWzQsdGhpcy5zZW5kKDE3LG5ldyBVaW50OEFycmF5KFsyNTUmdCwoNjUyODAmdCk+PjgsKDE2NzExNjgwJnQpPj4xNiwoNDI3ODE5MDA4MCZ0KT4+MjRdKSldO2Nhc2UgMTpyZXR1cm4gci5zZW50KCksWzMsNF07Y2FzZSAyOnJldHVybiBlPXIuc2VudCgpLFs0LHRoaXMuY2xlYXJBYm9ydCgpXTtjYXNlIDM6dGhyb3cgci5zZW50KCksZTtjYXNlIDQ6cmV0dXJuWzJdfX0pKX0pKX0sZS5wcm90b3R5cGUuc3dqUGlucz1mdW5jdGlvbih0LGUscil7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciBuO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKGkpe3N3aXRjaChpLmxhYmVsKXtjYXNlIDA6cmV0dXJuIGkudHJ5cy5wdXNoKFswLDIsLDRdKSxbNCx0aGlzLnNlbmQoMTYsbmV3IFVpbnQ4QXJyYXkoW3QsZSwyNTUmciwoNjUyODAmcik+PjgsKDE2NzExNjgwJnIpPj4xNiwoNDI3ODE5MDA4MCZyKT4+MjRdKSldO2Nhc2UgMTpyZXR1cm5bMixpLnNlbnQoKS5nZXRVaW50OCgxKV07Y2FzZSAyOnJldHVybiBuPWkuc2VudCgpLFs0LHRoaXMuY2xlYXJBYm9ydCgpXTtjYXNlIDM6dGhyb3cgaS5zZW50KCksbjtjYXNlIDQ6cmV0dXJuWzJdfX0pKX0pKX0sZS5wcm90b3R5cGUuZGFwRGVsYXk9ZnVuY3Rpb24odCl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciBlO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKHIpe3N3aXRjaChyLmxhYmVsKXtjYXNlIDA6cmV0dXJuIHIudHJ5cy5wdXNoKFswLDIsLDRdKSxbNCx0aGlzLnNlbmQoOSxuZXcgVWludDhBcnJheShbMjU1JnQsKDY1MjgwJnQpPj44XSkpXTtjYXNlIDE6cmV0dXJuIHIuc2VudCgpLFszLDRdO2Nhc2UgMjpyZXR1cm4gZT1yLnNlbnQoKSxbNCx0aGlzLmNsZWFyQWJvcnQoKV07Y2FzZSAzOnRocm93IHIuc2VudCgpLGU7Y2FzZSA0OnJldHVyblsyXX19KSl9KSl9LGUucHJvdG90eXBlLmNvbmZpZ3VyZVRyYW5zZmVyPWZ1bmN0aW9uKHQsZSxyKXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIG4scyxvO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKGkpe3N3aXRjaChpLmxhYmVsKXtjYXNlIDA6bj1uZXcgVWludDhBcnJheSg1KSwocz1uZXcgRGF0YVZpZXcobi5idWZmZXIpKS5zZXRVaW50OCgwLHQpLHMuc2V0VWludDE2KDEsZSwhMCkscy5zZXRVaW50MTYoMyxyLCEwKSxpLmxhYmVsPTE7Y2FzZSAxOnJldHVybiBpLnRyeXMucHVzaChbMSwzLCw1XSksWzQsdGhpcy5zZW5kKDQsbildO2Nhc2UgMjpyZXR1cm4gaS5zZW50KCksWzMsNV07Y2FzZSAzOnJldHVybiBvPWkuc2VudCgpLFs0LHRoaXMuY2xlYXJBYm9ydCgpXTtjYXNlIDQ6dGhyb3cgaS5zZW50KCksbztjYXNlIDU6cmV0dXJuWzJdfX0pKX0pKX0sZS5wcm90b3R5cGUuY29ubmVjdD1mdW5jdGlvbigpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgdCxlLHI7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24obil7c3dpdGNoKG4ubGFiZWwpe2Nhc2UgMDpyZXR1cm4hMD09PXRoaXMuY29ubmVjdGVkP1syXTpbNCx0aGlzLnRyYW5zcG9ydC5vcGVuKCldO2Nhc2UgMTpuLnNlbnQoKSxuLmxhYmVsPTI7Y2FzZSAyOnJldHVybiBuLnRyeXMucHVzaChbMiw1LCw4XSksWzQsdGhpcy5zZW5kKDE3LG5ldyBVaW50MzJBcnJheShbdGhpcy5jbG9ja0ZyZXF1ZW5jeV0pKV07Y2FzZSAzOnJldHVybiBuLnNlbnQoKSxbNCx0aGlzLnNlbmQoMixuZXcgVWludDhBcnJheShbdGhpcy5tb2RlXSkpXTtjYXNlIDQ6aWYoMD09PSh0PW4uc2VudCgpKS5nZXRVaW50OCgxKXx8MCE9PXRoaXMubW9kZSYmdC5nZXRVaW50OCgxKSE9PXRoaXMubW9kZSl0aHJvdyBuZXcgRXJyb3IoXCJNb2RlIG5vdCBlbmFibGVkLlwiKTtyZXR1cm5bMyw4XTtjYXNlIDU6cmV0dXJuIGU9bi5zZW50KCksWzQsdGhpcy5jbGVhckFib3J0KCldO2Nhc2UgNjpyZXR1cm4gbi5zZW50KCksWzQsdGhpcy50cmFuc3BvcnQuY2xvc2UoKV07Y2FzZSA3OnRocm93IG4uc2VudCgpLGU7Y2FzZSA4OnJldHVybiBuLnRyeXMucHVzaChbOCwxMSwsMTNdKSxbNCx0aGlzLmNvbmZpZ3VyZVRyYW5zZmVyKDAsMTAwLDApXTtjYXNlIDk6cmV0dXJuIG4uc2VudCgpLFs0LHRoaXMuc2VsZWN0UHJvdG9jb2woMSldO2Nhc2UgMTA6cmV0dXJuIG4uc2VudCgpLFszLDEzXTtjYXNlIDExOnJldHVybiByPW4uc2VudCgpLFs0LHRoaXMudHJhbnNwb3J0LmNsb3NlKCldO2Nhc2UgMTI6dGhyb3cgbi5zZW50KCkscjtjYXNlIDEzOnJldHVybiB0aGlzLmNvbm5lY3RlZD0hMCxbMl19fSkpfSkpfSxlLnByb3RvdHlwZS5kaXNjb25uZWN0PWZ1bmN0aW9uKCl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciB0O3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKGUpe3N3aXRjaChlLmxhYmVsKXtjYXNlIDA6aWYoITE9PT10aGlzLmNvbm5lY3RlZClyZXR1cm5bMl07ZS5sYWJlbD0xO2Nhc2UgMTpyZXR1cm4gZS50cnlzLnB1c2goWzEsMywsNV0pLFs0LHRoaXMuc2VuZCgzKV07Y2FzZSAyOnJldHVybiBlLnNlbnQoKSxbMyw1XTtjYXNlIDM6cmV0dXJuIHQ9ZS5zZW50KCksWzQsdGhpcy5jbGVhckFib3J0KCldO2Nhc2UgNDp0aHJvdyBlLnNlbnQoKSx0O2Nhc2UgNTpyZXR1cm5bNCx0aGlzLnRyYW5zcG9ydC5jbG9zZSgpXTtjYXNlIDY6cmV0dXJuIGUuc2VudCgpLHRoaXMuY29ubmVjdGVkPSExLFsyXX19KSl9KSl9LGUucHJvdG90eXBlLnJlY29ubmVjdD1mdW5jdGlvbigpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbih0KXtzd2l0Y2godC5sYWJlbCl7Y2FzZSAwOnJldHVybls0LHRoaXMuZGlzY29ubmVjdCgpXTtjYXNlIDE6cmV0dXJuIHQuc2VudCgpLFs0LG5ldyBQcm9taXNlKChmdW5jdGlvbih0KXtyZXR1cm4gc2V0VGltZW91dCh0LDEwMCl9KSldO2Nhc2UgMjpyZXR1cm4gdC5zZW50KCksWzQsdGhpcy5jb25uZWN0KCldO2Nhc2UgMzpyZXR1cm4gdC5zZW50KCksWzJdfX0pKX0pKX0sZS5wcm90b3R5cGUucmVzZXQ9ZnVuY3Rpb24oKXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIHQ7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24oZSl7c3dpdGNoKGUubGFiZWwpe2Nhc2UgMDpyZXR1cm4gZS50cnlzLnB1c2goWzAsMiwsNF0pLFs0LHRoaXMuc2VuZCgxMCldO2Nhc2UgMTpyZXR1cm5bMiwxPT09ZS5zZW50KCkuZ2V0VWludDgoMildO2Nhc2UgMjpyZXR1cm4gdD1lLnNlbnQoKSxbNCx0aGlzLmNsZWFyQWJvcnQoKV07Y2FzZSAzOnRocm93IGUuc2VudCgpLHQ7Y2FzZSA0OnJldHVyblsyXX19KSl9KSl9LGUucHJvdG90eXBlLnRyYW5zZmVyPWZ1bmN0aW9uKHQsZSxyLHMpe3JldHVybiB2b2lkIDA9PT1lJiYoZT0yKSx2b2lkIDA9PT1yJiYocj0wKSx2b2lkIDA9PT1zJiYocz0wKSxuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgbixvLHUsYyxhLGgsZjtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihpKXtzd2l0Y2goaS5sYWJlbCl7Y2FzZSAwOm49XCJudW1iZXJcIj09dHlwZW9mIHQ/W3twb3J0OnQsbW9kZTplLHJlZ2lzdGVyOnIsdmFsdWU6c31dOnQsbz1uZXcgVWludDhBcnJheSgyKzUqbi5sZW5ndGgpLCh1PW5ldyBEYXRhVmlldyhvLmJ1ZmZlcikpLnNldFVpbnQ4KDAsMCksdS5zZXRVaW50OCgxLG4ubGVuZ3RoKSxuLmZvckVhY2goKGZ1bmN0aW9uKHQsZSl7dmFyIHI9Mis1KmU7dS5zZXRVaW50OChyLHQucG9ydHx0Lm1vZGV8dC5yZWdpc3RlciksdS5zZXRVaW50MzIocisxLHQudmFsdWV8fDAsITApfSkpLGkubGFiZWw9MTtjYXNlIDE6cmV0dXJuIGkudHJ5cy5wdXNoKFsxLDMsLDVdKSxbNCx0aGlzLnNlbmQoNSxvKV07Y2FzZSAyOmlmKChjPWkuc2VudCgpKS5nZXRVaW50OCgxKSE9PW4ubGVuZ3RoKXRocm93IG5ldyBFcnJvcihcIlRyYW5zZmVyIGNvdW50IG1pc21hdGNoXCIpO2lmKDI9PT0oYT1jLmdldFVpbnQ4KDIpKSl0aHJvdyBuZXcgRXJyb3IoXCJUcmFuc2ZlciByZXNwb25zZSBXQUlUXCIpO2lmKDQ9PT1hKXRocm93IG5ldyBFcnJvcihcIlRyYW5zZmVyIHJlc3BvbnNlIEZBVUxUXCIpO2lmKDg9PT1hKXRocm93IG5ldyBFcnJvcihcIlRyYW5zZmVyIHJlc3BvbnNlIFBST1RPQ09MX0VSUk9SXCIpO2lmKDE2PT09YSl0aHJvdyBuZXcgRXJyb3IoXCJUcmFuc2ZlciByZXNwb25zZSBWQUxVRV9NSVNNQVRDSFwiKTtpZig3PT09YSl0aHJvdyBuZXcgRXJyb3IoXCJUcmFuc2ZlciByZXNwb25zZSBOT19BQ0tcIik7cmV0dXJuXCJudW1iZXJcIj09dHlwZW9mIHQ/WzIsYy5nZXRVaW50MzIoMywhMCldOihoPTQqbi5sZW5ndGgsWzIsbmV3IFVpbnQzMkFycmF5KGMuYnVmZmVyLnNsaWNlKDMsMytoKSldKTtjYXNlIDM6cmV0dXJuIGY9aS5zZW50KCksWzQsdGhpcy5jbGVhckFib3J0KCldO2Nhc2UgNDp0aHJvdyBpLnNlbnQoKSxmO2Nhc2UgNTpyZXR1cm5bMl19fSkpfSkpfSxlLnByb3RvdHlwZS50cmFuc2ZlckJsb2NrPWZ1bmN0aW9uKHQsZSxyKXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIG4scyxvLHUsYyxhLGgsZjtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihpKXtzd2l0Y2goaS5sYWJlbCl7Y2FzZSAwOm89NCxcIm51bWJlclwiPT10eXBlb2Ygcj8obj1yLHM9Mik6KG49ci5sZW5ndGgscz0wLG8rPXIuYnl0ZUxlbmd0aCksdT1uZXcgVWludDhBcnJheShvKSwoYz1uZXcgRGF0YVZpZXcodS5idWZmZXIpKS5zZXRVaW50OCgwLDApLGMuc2V0VWludDE2KDEsbiwhMCksYy5zZXRVaW50OCgzLHR8c3xlKSxcIm51bWJlclwiIT10eXBlb2YgciYmci5mb3JFYWNoKChmdW5jdGlvbih0LGUpe3ZhciByPTQrNCplO2Muc2V0VWludDMyKHIsdCwhMCl9KSksaS5sYWJlbD0xO2Nhc2UgMTpyZXR1cm4gaS50cnlzLnB1c2goWzEsMywsNV0pLFs0LHRoaXMuc2VuZCg2LGMpXTtjYXNlIDI6aWYoKGE9aS5zZW50KCkpLmdldFVpbnQxNigxLCEwKSE9PW4pdGhyb3cgbmV3IEVycm9yKFwiVHJhbnNmZXIgY291bnQgbWlzbWF0Y2hcIik7aWYoMj09PShoPWEuZ2V0VWludDgoMykpKXRocm93IG5ldyBFcnJvcihcIlRyYW5zZmVyIHJlc3BvbnNlIFdBSVRcIik7aWYoND09PWgpdGhyb3cgbmV3IEVycm9yKFwiVHJhbnNmZXIgcmVzcG9uc2UgRkFVTFRcIik7aWYoOD09PWgpdGhyb3cgbmV3IEVycm9yKFwiVHJhbnNmZXIgcmVzcG9uc2UgUFJPVE9DT0xfRVJST1JcIik7aWYoNz09PWgpdGhyb3cgbmV3IEVycm9yKFwiVHJhbnNmZXIgcmVzcG9uc2UgTk9fQUNLXCIpO3JldHVyblwibnVtYmVyXCI9PXR5cGVvZiByP1syLG5ldyBVaW50MzJBcnJheShhLmJ1ZmZlci5zbGljZSg0LDQrNCpuKSldOlszLDVdO2Nhc2UgMzpyZXR1cm4gZj1pLnNlbnQoKSxbNCx0aGlzLmNsZWFyQWJvcnQoKV07Y2FzZSA0OnRocm93IGkuc2VudCgpLGY7Y2FzZSA1OnJldHVyblsyLHZvaWQgMF19fSkpfSkpfSxlfShvKSxBPS9bXFx4YzAtXFx4ZmZdW1xceDgwLVxceGJmXSokL2csQz0vW1xceGMwLVxceGZmXVtcXHg4MC1cXHhiZl0qL2csVT1mdW5jdGlvbigpe2Z1bmN0aW9uIHQoKXt9cmV0dXJuIHQucHJvdG90eXBlLmRlY29kZT1mdW5jdGlvbih0KXt2YXIgZT1BcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChuZXcgVWludDhBcnJheSh0KSkscj1TdHJpbmcuZnJvbUNvZGVQb2ludC5hcHBseSh2b2lkIDAsZSk7dGhpcy5wYXJ0aWFsQ2hhciYmKHI9XCJcIit0aGlzLnBhcnRpYWxDaGFyK3IsdGhpcy5wYXJ0aWFsQ2hhcj12b2lkIDApO3ZhciBuPXIubWF0Y2goQSk7aWYobil7dmFyIGk9blswXS5sZW5ndGg7dGhpcy5wYXJ0aWFsQ2hhcj1yLnNsaWNlKC1pKSxyPXIuc2xpY2UoMCwtaSl9cmV0dXJuIHIucmVwbGFjZShDLHRoaXMuZGVjb2RlclJlcGxhY2VyKX0sdC5wcm90b3R5cGUuZGVjb2RlclJlcGxhY2VyPWZ1bmN0aW9uKHQpe3ZhciBlPXQuY29kZVBvaW50QXQoMCk8PDI0LHI9TWF0aC5jbHozMih+ZSksbj0wLGk9dC5sZW5ndGgscz1cIlwiO2lmKHI8NSYmaT49cil7Zm9yKGU9ZTw8cj4+PjI0K3Isbj0xO248cjtuKz0xKWU9ZTw8Nnw2MyZ0LmNvZGVQb2ludEF0KG4pO2U8PTY1NTM1P3MrPVN0cmluZy5mcm9tQ29kZVBvaW50KGUpOmU8PTExMTQxMTE/KGUtPTY1NTM2LHMrPVN0cmluZy5mcm9tQ29kZVBvaW50KDU1Mjk2KyhlPj4xMCksNTYzMjArKDEwMjMmZSkpKTpuPTB9Zm9yKDtuPGk7bis9MSlzKz1cIu+/vVwiO3JldHVybiBzfSx0fSgpLEU9bmV3IFUsUD1mdW5jdGlvbih0KXtmdW5jdGlvbiBlKHIscyxvKXt2b2lkIDA9PT1zJiYocz0wKSx2b2lkIDA9PT1vJiYobz1tKTt2YXIgdT10LmNhbGwodGhpcyxyLHMsbyl8fHRoaXM7cmV0dXJuIHUuc2VyaWFsUG9sbGluZz0hMSx1LnNlcmlhbExpc3RlbmVycz0hMSx1Lm9uKFwibmV3TGlzdGVuZXJcIiwoZnVuY3Rpb24odCl7cmV0dXJuIG4odSx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKHIpe3JldHVybiB0PT09ZS5FVkVOVF9TRVJJQUxfREFUQSYmMD09PXRoaXMubGlzdGVuZXJDb3VudCh0KSYmKHRoaXMuc2VyaWFsTGlzdGVuZXJzPSEwKSxbMl19KSl9KSl9KSksdS5vbihcInJlbW92ZUxpc3RlbmVyXCIsKGZ1bmN0aW9uKHQpe3Q9PT1lLkVWRU5UX1NFUklBTF9EQVRBJiYoMD09PXUubGlzdGVuZXJDb3VudCh0KSYmKHUuc2VyaWFsTGlzdGVuZXJzPSExKSl9KSksdX1yZXR1cm4gcihlLHQpLGUucHJvdG90eXBlLmlzQnVmZmVyQmluYXJ5PWZ1bmN0aW9uKHQpe2Zvcih2YXIgZT1BcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChuZXcgVWludDE2QXJyYXkodCwwLDUwKSkscj1TdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KG51bGwsZSksbj0wO248ci5sZW5ndGg7bisrKXt2YXIgaT1yLmNoYXJDb2RlQXQobik7aWYoNjU1MzM9PT1pfHxpPD04KXJldHVybiEwfXJldHVybiExfSxlLnByb3RvdHlwZS53cml0ZUJ1ZmZlcj1mdW5jdGlvbih0LHIscyl7cmV0dXJuIHZvaWQgMD09PXMmJihzPTApLG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciBuLG8sdSxjO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKGkpe3N3aXRjaChpLmxhYmVsKXtjYXNlIDA6bj1NYXRoLm1pbih0LmJ5dGVMZW5ndGgscytyKSxvPXQuc2xpY2UocyxuKSwodT1uZXcgVWludDhBcnJheShvLmJ5dGVMZW5ndGgrMSkpLnNldChbby5ieXRlTGVuZ3RoXSksdS5zZXQobmV3IFVpbnQ4QXJyYXkobyksMSksaS5sYWJlbD0xO2Nhc2UgMTpyZXR1cm4gaS50cnlzLnB1c2goWzEsMywsNV0pLFs0LHRoaXMuc2VuZCgxNDAsdSldO2Nhc2UgMjpyZXR1cm4gaS5zZW50KCksWzMsNV07Y2FzZSAzOnJldHVybiBjPWkuc2VudCgpLFs0LHRoaXMuY2xlYXJBYm9ydCgpXTtjYXNlIDQ6dGhyb3cgaS5zZW50KCksYztjYXNlIDU6cmV0dXJuIHRoaXMuZW1pdChlLkVWRU5UX1BST0dSRVNTLHMvdC5ieXRlTGVuZ3RoKSxuPHQuYnl0ZUxlbmd0aD9bMix0aGlzLndyaXRlQnVmZmVyKHQscixuKV06WzJdfX0pKX0pKX0sZS5wcm90b3R5cGUuZmxhc2g9ZnVuY3Rpb24odCxyKXtyZXR1cm4gdm9pZCAwPT09ciYmKHI9NjIpLG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciBuLHMsbztyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihpKXtzd2l0Y2goaS5sYWJlbCl7Y2FzZSAwOm49ZnVuY3Rpb24odCl7cmV0dXJuIHZvaWQgMCE9PXQuYnVmZmVyfSh0KT90LmJ1ZmZlcjp0LHM9dGhpcy5pc0J1ZmZlckJpbmFyeShuKT8wOjEsaS5sYWJlbD0xO2Nhc2UgMTpyZXR1cm4gaS50cnlzLnB1c2goWzEsNiwsOF0pLFs0LHRoaXMuc2VuZCgxMzgsbmV3IFVpbnQzMkFycmF5KFtzXSkpXTtjYXNlIDI6aWYoMCE9PWkuc2VudCgpLmdldFVpbnQ4KDEpKXRocm93IG5ldyBFcnJvcihcIkZsYXNoIGVycm9yXCIpO3JldHVybls0LHRoaXMud3JpdGVCdWZmZXIobixyKV07Y2FzZSAzOnJldHVybiBpLnNlbnQoKSx0aGlzLmVtaXQoZS5FVkVOVF9QUk9HUkVTUywxKSxbNCx0aGlzLnNlbmQoMTM5KV07Y2FzZSA0OmlmKDAhPT1pLnNlbnQoKS5nZXRVaW50OCgxKSl0aHJvdyBuZXcgRXJyb3IoXCJGbGFzaCBlcnJvclwiKTtyZXR1cm5bNCx0aGlzLnNlbmQoMTM3KV07Y2FzZSA1OnJldHVybiBpLnNlbnQoKSxbMyw4XTtjYXNlIDY6cmV0dXJuIG89aS5zZW50KCksWzQsdGhpcy5jbGVhckFib3J0KCldO2Nhc2UgNzp0aHJvdyBpLnNlbnQoKSxvO2Nhc2UgODpyZXR1cm5bMl19fSkpfSkpfSxlLnByb3RvdHlwZS5nZXRTZXJpYWxCYXVkcmF0ZT1mdW5jdGlvbigpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgdDtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihlKXtzd2l0Y2goZS5sYWJlbCl7Y2FzZSAwOnJldHVybiBlLnRyeXMucHVzaChbMCwyLCw0XSksWzQsdGhpcy5zZW5kKDEyOSldO2Nhc2UgMTpyZXR1cm5bMixlLnNlbnQoKS5nZXRVaW50MzIoMSwhMCldO2Nhc2UgMjpyZXR1cm4gdD1lLnNlbnQoKSxbNCx0aGlzLmNsZWFyQWJvcnQoKV07Y2FzZSAzOnRocm93IGUuc2VudCgpLHQ7Y2FzZSA0OnJldHVyblsyXX19KSl9KSl9LGUucHJvdG90eXBlLnNldFNlcmlhbEJhdWRyYXRlPWZ1bmN0aW9uKHQpe3JldHVybiB2b2lkIDA9PT10JiYodD05NjAwKSxuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgZTtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihyKXtzd2l0Y2goci5sYWJlbCl7Y2FzZSAwOnJldHVybiByLnRyeXMucHVzaChbMCwyLCw0XSksWzQsdGhpcy5zZW5kKDEzMCxuZXcgVWludDMyQXJyYXkoW3RdKSldO2Nhc2UgMTpyZXR1cm4gci5zZW50KCksWzMsNF07Y2FzZSAyOnJldHVybiBlPXIuc2VudCgpLFs0LHRoaXMuY2xlYXJBYm9ydCgpXTtjYXNlIDM6dGhyb3cgci5zZW50KCksZTtjYXNlIDQ6cmV0dXJuWzJdfX0pKX0pKX0sZS5wcm90b3R5cGUuc2VyaWFsV3JpdGU9ZnVuY3Rpb24odCl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciBlLHI7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24obil7c3dpdGNoKG4ubGFiZWwpe2Nhc2UgMDooZT10LnNwbGl0KFwiXCIpLm1hcCgoZnVuY3Rpb24odCl7cmV0dXJuIHQuY2hhckNvZGVBdCgwKX0pKSkudW5zaGlmdChlLmxlbmd0aCksbi5sYWJlbD0xO2Nhc2UgMTpyZXR1cm4gbi50cnlzLnB1c2goWzEsMywsNV0pLFs0LHRoaXMuc2VuZCgxMzIsbmV3IFVpbnQ4QXJyYXkoZSkuYnVmZmVyKV07Y2FzZSAyOnJldHVybiBuLnNlbnQoKSxbMyw1XTtjYXNlIDM6cmV0dXJuIHI9bi5zZW50KCksWzQsdGhpcy5jbGVhckFib3J0KCldO2Nhc2UgNDp0aHJvdyBuLnNlbnQoKSxyO2Nhc2UgNTpyZXR1cm5bMl19fSkpfSkpfSxlLnByb3RvdHlwZS5zZXJpYWxSZWFkPWZ1bmN0aW9uKCl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciB0LGUscjtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihuKXtzd2l0Y2gobi5sYWJlbCl7Y2FzZSAwOnJldHVybiBuLnRyeXMucHVzaChbMCwyLCw0XSksWzQsdGhpcy5zZW5kKDEzMSldO2Nhc2UgMTpyZXR1cm4gMD09PSh0PW4uc2VudCgpKS5ieXRlTGVuZ3RofHwoMTMxIT09dC5nZXRVaW50OCgwKXx8MD09PShlPXQuZ2V0VWludDgoMSkpKT9bMix2b2lkIDBdOigyLFsyLHQuYnVmZmVyLnNsaWNlKDIsMitlKV0pO2Nhc2UgMjpyZXR1cm4gcj1uLnNlbnQoKSxbNCx0aGlzLmNsZWFyQWJvcnQoKV07Y2FzZSAzOnRocm93IG4uc2VudCgpLHI7Y2FzZSA0OnJldHVyblsyXX19KSl9KSl9LGUucHJvdG90eXBlLnN0YXJ0U2VyaWFsUmVhZD1mdW5jdGlvbih0LHIpe3JldHVybiB2b2lkIDA9PT10JiYodD0xMDApLHZvaWQgMD09PXImJihyPSEwKSxuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgbixzLG87cmV0dXJuIGkodGhpcywoZnVuY3Rpb24oaSl7c3dpdGNoKGkubGFiZWwpe2Nhc2UgMDp0aGlzLnNlcmlhbFBvbGxpbmc9ITAsaS5sYWJlbD0xO2Nhc2UgMTpyZXR1cm4gdGhpcy5zZXJpYWxQb2xsaW5nP3RoaXMuc2VyaWFsTGlzdGVuZXJzPyhuPXRoaXMuY29ubmVjdGVkLCExIT09dGhpcy5jb25uZWN0ZWR8fCEwIT09cj9bMywzXTpbNCx0aGlzLmNvbm5lY3QoKV0pOlszLDddOlszLDldO2Nhc2UgMjppLnNlbnQoKSxpLmxhYmVsPTM7Y2FzZSAzOnJldHVybls0LHRoaXMuc2VyaWFsUmVhZCgpXTtjYXNlIDQ6cmV0dXJuIHM9aS5zZW50KCksITEhPT1ufHwhMCE9PXI/WzMsNl06WzQsdGhpcy5kaXNjb25uZWN0KCldO2Nhc2UgNTppLnNlbnQoKSxpLmxhYmVsPTY7Y2FzZSA2OnZvaWQgMCE9PXMmJihvPUUuZGVjb2RlKHMpLHRoaXMuZW1pdChlLkVWRU5UX1NFUklBTF9EQVRBLG8pKSxpLmxhYmVsPTc7Y2FzZSA3OnJldHVybls0LG5ldyBQcm9taXNlKChmdW5jdGlvbihlKXtyZXR1cm4gc2V0VGltZW91dChlLHQpfSkpXTtjYXNlIDg6cmV0dXJuIGkuc2VudCgpLFszLDFdO2Nhc2UgOTpyZXR1cm5bMl19fSkpfSkpfSxlLnByb3RvdHlwZS5zdG9wU2VyaWFsUmVhZD1mdW5jdGlvbigpe3RoaXMuc2VyaWFsUG9sbGluZz0hMX0sZS5FVkVOVF9QUk9HUkVTUz1cInByb2dyZXNzXCIsZS5FVkVOVF9TRVJJQUxfREFUQT1cInNlcmlhbFwiLGV9KGcpLFQ9ZnVuY3Rpb24oKXtmdW5jdGlvbiB0KHQsZSxyKXt2b2lkIDA9PT1lJiYoZT0wKSx2b2lkIDA9PT1yJiYocj1tKTt0aGlzLnByb3h5PXZvaWQgMCE9PXQub3Blbj9uZXcgZyh0LGUscik6dH1yZXR1cm4gdC5wcm90b3R5cGUud2FpdERlbGF5PWZ1bmN0aW9uKHQsZSxyKXtyZXR1cm4gdm9pZCAwPT09ZSYmKGU9MCksdm9pZCAwPT09ciYmKHI9MTAwKSxuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgbjtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihpKXtzd2l0Y2goaS5sYWJlbCl7Y2FzZSAwOm49ITAsZT4wJiZzZXRUaW1lb3V0KChmdW5jdGlvbigpe2lmKG4pdGhyb3cgbj0hMSxuZXcgRXJyb3IoXCJXYWl0IHRpbWVkIG91dFwiKX0pLGUpLGkubGFiZWw9MTtjYXNlIDE6cmV0dXJuIG4/WzQsdCgpXTpbMyw1XTtjYXNlIDI6cmV0dXJuITA9PT1pLnNlbnQoKT8obj0hMSxbMl0pOnI+MD9bNCxuZXcgUHJvbWlzZSgoZnVuY3Rpb24odCl7cmV0dXJuIHNldFRpbWVvdXQodCxlKX0pKV06WzMsNF07Y2FzZSAzOmkuc2VudCgpLGkubGFiZWw9NDtjYXNlIDQ6cmV0dXJuWzMsMV07Y2FzZSA1OnJldHVyblsyXX19KSl9KSl9LHQucHJvdG90eXBlLmNvbmNhdFR5cGVkQXJyYXk9ZnVuY3Rpb24odCl7aWYoMT09PXQubGVuZ3RoKXJldHVybiB0WzBdO2Zvcih2YXIgZT0wLHI9MCxuPXQ7cjxuLmxlbmd0aDtyKyspe2UrPW5bcl0ubGVuZ3RofWZvcih2YXIgaT1uZXcgVWludDMyQXJyYXkoZSkscz0wLG89MDtzPHQubGVuZ3RoO3MrKylpLnNldCh0W3NdLG8pLG8rPXRbc10ubGVuZ3RoO3JldHVybiBpfSx0LnByb3RvdHlwZS5yZWFkRFBDb21tYW5kPWZ1bmN0aW9uKHQpe3JldHVyblt7bW9kZToyLHBvcnQ6MCxyZWdpc3Rlcjp0fV19LHQucHJvdG90eXBlLndyaXRlRFBDb21tYW5kPWZ1bmN0aW9uKHQsZSl7aWYoOD09PXQpe2lmKGU9PT10aGlzLnNlbGVjdGVkQWRkcmVzcylyZXR1cm5bXTt0aGlzLnNlbGVjdGVkQWRkcmVzcz1lfXJldHVyblt7bW9kZTowLHBvcnQ6MCxyZWdpc3Rlcjp0LHZhbHVlOmV9XX0sdC5wcm90b3R5cGUucmVhZEFQQ29tbWFuZD1mdW5jdGlvbih0KXt2YXIgZT00Mjc4MTkwMDgwJnR8MjQwJnQ7cmV0dXJuIHRoaXMud3JpdGVEUENvbW1hbmQoOCxlKS5jb25jYXQoe21vZGU6Mixwb3J0OjEscmVnaXN0ZXI6dH0pfSx0LnByb3RvdHlwZS53cml0ZUFQQ29tbWFuZD1mdW5jdGlvbih0LGUpe2lmKDA9PT10KXtpZihlPT09dGhpcy5jc3dWYWx1ZSlyZXR1cm5bXTt0aGlzLmNzd1ZhbHVlPWV9dmFyIHI9NDI3ODE5MDA4MCZ0fDI0MCZ0O3JldHVybiB0aGlzLndyaXRlRFBDb21tYW5kKDgscikuY29uY2F0KHttb2RlOjAscG9ydDoxLHJlZ2lzdGVyOnQsdmFsdWU6ZX0pfSx0LnByb3RvdHlwZS5yZWFkTWVtMTZDb21tYW5kPWZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLndyaXRlQVBDb21tYW5kKDAsNTg3MjAyNjQxKS5jb25jYXQodGhpcy53cml0ZUFQQ29tbWFuZCg0LHQpKS5jb25jYXQodGhpcy5yZWFkQVBDb21tYW5kKDEyKSl9LHQucHJvdG90eXBlLndyaXRlTWVtMTZDb21tYW5kPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIHRoaXMud3JpdGVBUENvbW1hbmQoMCw1ODcyMDI2NDEpLmNvbmNhdCh0aGlzLndyaXRlQVBDb21tYW5kKDQsdCkpLmNvbmNhdCh0aGlzLndyaXRlQVBDb21tYW5kKDEyLGUpKX0sdC5wcm90b3R5cGUucmVhZE1lbTMyQ29tbWFuZD1mdW5jdGlvbih0KXtyZXR1cm4gdGhpcy53cml0ZUFQQ29tbWFuZCgwLDU4NzIwMjY0MikuY29uY2F0KHRoaXMud3JpdGVBUENvbW1hbmQoNCx0KSkuY29uY2F0KHRoaXMucmVhZEFQQ29tbWFuZCgxMikpfSx0LnByb3RvdHlwZS53cml0ZU1lbTMyQ29tbWFuZD1mdW5jdGlvbih0LGUpe3JldHVybiB0aGlzLndyaXRlQVBDb21tYW5kKDAsNTg3MjAyNjQyKS5jb25jYXQodGhpcy53cml0ZUFQQ29tbWFuZCg0LHQpKS5jb25jYXQodGhpcy53cml0ZUFQQ29tbWFuZCgxMixlKSl9LHQucHJvdG90eXBlLnRyYW5zZmVyU2VxdWVuY2U9ZnVuY3Rpb24odCl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciBlLHIsbixzO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKGkpe3N3aXRjaChpLmxhYmVsKXtjYXNlIDA6ZT0oZT1bXSkuY29uY2F0LmFwcGx5KGUsdCkscj1bXSxpLmxhYmVsPTE7Y2FzZSAxOnJldHVybiBlLmxlbmd0aD8obj1lLnNwbGljZSgwLHRoaXMucHJveHkub3BlcmF0aW9uQ291bnQpLFs0LHRoaXMucHJveHkudHJhbnNmZXIobildKTpbMywzXTtjYXNlIDI6cmV0dXJuIHM9aS5zZW50KCksci5wdXNoKHMpLFszLDFdO2Nhc2UgMzpyZXR1cm5bMix0aGlzLmNvbmNhdFR5cGVkQXJyYXkocildfX0pKX0pKX0sdC5wcm90b3R5cGUuY29ubmVjdD1mdW5jdGlvbigpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgdCxlPXRoaXM7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24ocil7c3dpdGNoKHIubGFiZWwpe2Nhc2UgMDpyZXR1cm4gdD0tMTYxMDYxMjczNixbNCx0aGlzLnByb3h5LmNvbm5lY3QoKV07Y2FzZSAxOnJldHVybiByLnNlbnQoKSxbNCx0aGlzLnJlYWREUCgwKV07Y2FzZSAyOnJldHVybiByLnNlbnQoKSxbNCx0aGlzLnRyYW5zZmVyU2VxdWVuY2UoW3RoaXMud3JpdGVEUENvbW1hbmQoMCw0KSx0aGlzLndyaXRlRFBDb21tYW5kKDgsMCksdGhpcy53cml0ZURQQ29tbWFuZCg0LDEzNDIxNzcyODApXSldO2Nhc2UgMzpyZXR1cm4gci5zZW50KCksWzQsdGhpcy53YWl0RGVsYXkoKGZ1bmN0aW9uKCl7cmV0dXJuIG4oZSx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKGUpe3N3aXRjaChlLmxhYmVsKXtjYXNlIDA6cmV0dXJuWzQsdGhpcy5yZWFkRFAoNCldO2Nhc2UgMTpyZXR1cm5bMiwoZS5zZW50KCkmdCk9PT10XX19KSl9KSl9KSldO2Nhc2UgNDpyZXR1cm4gci5zZW50KCksWzJdfX0pKX0pKX0sdC5wcm90b3R5cGUuZGlzY29ubmVjdD1mdW5jdGlvbigpe3JldHVybiB0aGlzLnByb3h5LmRpc2Nvbm5lY3QoKX0sdC5wcm90b3R5cGUucmVjb25uZWN0PWZ1bmN0aW9uKCl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKHQpe3N3aXRjaCh0LmxhYmVsKXtjYXNlIDA6cmV0dXJuWzQsdGhpcy5kaXNjb25uZWN0KCldO2Nhc2UgMTpyZXR1cm4gdC5zZW50KCksWzQsbmV3IFByb21pc2UoKGZ1bmN0aW9uKHQpe3JldHVybiBzZXRUaW1lb3V0KHQsMTAwKX0pKV07Y2FzZSAyOnJldHVybiB0LnNlbnQoKSxbNCx0aGlzLmNvbm5lY3QoKV07Y2FzZSAzOnJldHVybiB0LnNlbnQoKSxbMl19fSkpfSkpfSx0LnByb3RvdHlwZS5yZXNldD1mdW5jdGlvbigpe3JldHVybiB0aGlzLnByb3h5LnJlc2V0KCl9LHQucHJvdG90eXBlLnJlYWREUD1mdW5jdGlvbih0KXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24oZSl7c3dpdGNoKGUubGFiZWwpe2Nhc2UgMDpyZXR1cm5bNCx0aGlzLnByb3h5LnRyYW5zZmVyKHRoaXMucmVhZERQQ29tbWFuZCh0KSldO2Nhc2UgMTpyZXR1cm5bMixlLnNlbnQoKVswXV19fSkpfSkpfSx0LnByb3RvdHlwZS53cml0ZURQPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKHIpe3N3aXRjaChyLmxhYmVsKXtjYXNlIDA6cmV0dXJuWzQsdGhpcy5wcm94eS50cmFuc2Zlcih0aGlzLndyaXRlRFBDb21tYW5kKHQsZSkpXTtjYXNlIDE6cmV0dXJuIHIuc2VudCgpLFsyXX19KSl9KSl9LHQucHJvdG90eXBlLnJlYWRBUD1mdW5jdGlvbih0KXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24oZSl7c3dpdGNoKGUubGFiZWwpe2Nhc2UgMDpyZXR1cm5bNCx0aGlzLnByb3h5LnRyYW5zZmVyKHRoaXMucmVhZEFQQ29tbWFuZCh0KSldO2Nhc2UgMTpyZXR1cm5bMixlLnNlbnQoKVswXV19fSkpfSkpfSx0LnByb3RvdHlwZS53cml0ZUFQPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKHIpe3N3aXRjaChyLmxhYmVsKXtjYXNlIDA6cmV0dXJuWzQsdGhpcy5wcm94eS50cmFuc2Zlcih0aGlzLndyaXRlQVBDb21tYW5kKHQsZSkpXTtjYXNlIDE6cmV0dXJuIHIuc2VudCgpLFsyXX19KSl9KSl9LHQucHJvdG90eXBlLnJlYWRNZW0xNj1mdW5jdGlvbih0KXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24oZSl7c3dpdGNoKGUubGFiZWwpe2Nhc2UgMDpyZXR1cm5bNCx0aGlzLnByb3h5LnRyYW5zZmVyKHRoaXMucmVhZE1lbTE2Q29tbWFuZCh0KSldO2Nhc2UgMTpyZXR1cm5bMixlLnNlbnQoKVswXV19fSkpfSkpfSx0LnByb3RvdHlwZS53cml0ZU1lbTE2PWZ1bmN0aW9uKHQsZSl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKHIpe3N3aXRjaChyLmxhYmVsKXtjYXNlIDA6cmV0dXJuIGU8PD0oMiZ0KTw8MyxbNCx0aGlzLnByb3h5LnRyYW5zZmVyKHRoaXMud3JpdGVNZW0xNkNvbW1hbmQodCxlKSldO2Nhc2UgMTpyZXR1cm4gci5zZW50KCksWzJdfX0pKX0pKX0sdC5wcm90b3R5cGUucmVhZE1lbTMyPWZ1bmN0aW9uKHQpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihlKXtzd2l0Y2goZS5sYWJlbCl7Y2FzZSAwOnJldHVybls0LHRoaXMucHJveHkudHJhbnNmZXIodGhpcy5yZWFkTWVtMzJDb21tYW5kKHQpKV07Y2FzZSAxOnJldHVyblsyLGUuc2VudCgpWzBdXX19KSl9KSl9LHQucHJvdG90eXBlLndyaXRlTWVtMzI9ZnVuY3Rpb24odCxlKXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24ocil7c3dpdGNoKHIubGFiZWwpe2Nhc2UgMDpyZXR1cm5bNCx0aGlzLnByb3h5LnRyYW5zZmVyKHRoaXMud3JpdGVNZW0zMkNvbW1hbmQodCxlKSldO2Nhc2UgMTpyZXR1cm4gci5zZW50KCksWzJdfX0pKX0pKX0sdC5wcm90b3R5cGUucmVhZEJsb2NrPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciByLG4scyxvO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKGkpe3N3aXRjaChpLmxhYmVsKXtjYXNlIDA6cmV0dXJuWzQsdGhpcy50cmFuc2ZlclNlcXVlbmNlKFt0aGlzLndyaXRlQVBDb21tYW5kKDAsNTg3MjAyNjQyKSx0aGlzLndyaXRlQVBDb21tYW5kKDQsdCldKV07Y2FzZSAxOmkuc2VudCgpLHI9W10sbj1lLGkubGFiZWw9MjtjYXNlIDI6cmV0dXJuIG4+MD8ocz1NYXRoLm1pbihuLE1hdGguZmxvb3IodGhpcy5wcm94eS5ibG9ja1NpemUvNCkpLFs0LHRoaXMucHJveHkudHJhbnNmZXJCbG9jaygxLDEyLHMpXSk6WzMsNF07Y2FzZSAzOnJldHVybiBvPWkuc2VudCgpLHIucHVzaChvKSxuLT1zLFszLDJdO2Nhc2UgNDpyZXR1cm5bMix0aGlzLmNvbmNhdFR5cGVkQXJyYXkocildfX0pKX0pKX0sdC5wcm90b3R5cGUud3JpdGVCbG9jaz1mdW5jdGlvbih0LGUpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgcixuO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKGkpe3N3aXRjaChpLmxhYmVsKXtjYXNlIDA6cmV0dXJuWzQsdGhpcy50cmFuc2ZlclNlcXVlbmNlKFt0aGlzLndyaXRlQVBDb21tYW5kKDAsNTg3MjAyNjQyKSx0aGlzLndyaXRlQVBDb21tYW5kKDQsdCldKV07Y2FzZSAxOmkuc2VudCgpLHI9MCxpLmxhYmVsPTI7Y2FzZSAyOnJldHVybiByPGUubGVuZ3RoPyhuPWUuc2xpY2UocixyK01hdGguZmxvb3IodGhpcy5wcm94eS5ibG9ja1NpemUvNCkpLFs0LHRoaXMucHJveHkudHJhbnNmZXJCbG9jaygxLDEyLG4pXSk6WzMsNF07Y2FzZSAzOnJldHVybiBpLnNlbnQoKSxyKz1NYXRoLmZsb29yKHRoaXMucHJveHkuYmxvY2tTaXplLzQpLFszLDJdO2Nhc2UgNDpyZXR1cm5bMl19fSkpfSkpfSx0fSgpLEw9NDg2ODIsXz1mdW5jdGlvbih0KXtmdW5jdGlvbiBlKCl7cmV0dXJuIG51bGwhPT10JiZ0LmFwcGx5KHRoaXMsYXJndW1lbnRzKXx8dGhpc31yZXR1cm4gcihlLHQpLGUucHJvdG90eXBlLmVuYWJsZURlYnVnPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMud3JpdGVNZW0zMigzNzU4MTU3Mjk2LC0xNjA0Mzg2ODE1KX0sZS5wcm90b3R5cGUucmVhZENvcmVSZWdpc3RlckNvbW1hbmQ9ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMud3JpdGVNZW0zMkNvbW1hbmQoMzc1ODE1NzMwMCx0KS5jb25jYXQodGhpcy5yZWFkTWVtMzJDb21tYW5kKDM3NTgxNTcyOTYpKS5jb25jYXQodGhpcy5yZWFkTWVtMzJDb21tYW5kKDM3NTgxNTczMDQpKX0sZS5wcm90b3R5cGUud3JpdGVDb3JlUmVnaXN0ZXJDb21tYW5kPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIHRoaXMud3JpdGVNZW0zMkNvbW1hbmQoMzc1ODE1NzMwNCxlKS5jb25jYXQodGhpcy53cml0ZU1lbTMyQ29tbWFuZCgzNzU4MTU3MzAwLDY1NTM2fHQpKX0sZS5wcm90b3R5cGUuZ2V0U3RhdGU9ZnVuY3Rpb24oKXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIHQsZSxyO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKG4pe3N3aXRjaChuLmxhYmVsKXtjYXNlIDA6cmV0dXJuWzQsdGhpcy5yZWFkTWVtMzIoMzc1ODE1NzI5NildO2Nhc2UgMTpyZXR1cm4gdD1uLnNlbnQoKSxlPTUyNDI4OCZ0PzE6MjYyMTQ0JnQ/MjoxMzEwNzImdD8zOjQsMzM1NTQ0MzImdD9bNCx0aGlzLnJlYWRNZW0zMigzNzU4MTU3Mjk2KV06WzMsM107Y2FzZSAyOnJldHVybiAzMzU1NDQzMiYocj1uLnNlbnQoKSkmJiEoMTY3NzcyMTYmcik/WzIsMF06WzIsZV07Y2FzZSAzOnJldHVyblsyLGVdO2Nhc2UgNDpyZXR1cm5bMl19fSkpfSkpfSxlLnByb3RvdHlwZS5pc0hhbHRlZD1mdW5jdGlvbigpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbih0KXtzd2l0Y2godC5sYWJlbCl7Y2FzZSAwOnJldHVybls0LHRoaXMucmVhZE1lbTMyKDM3NTgxNTcyOTYpXTtjYXNlIDE6cmV0dXJuWzIsISEoMTMxMDcyJnQuc2VudCgpKV19fSkpfSkpfSxlLnByb3RvdHlwZS5oYWx0PWZ1bmN0aW9uKHQsZSl7cmV0dXJuIHZvaWQgMD09PXQmJih0PSEwKSx2b2lkIDA9PT1lJiYoZT0wKSxuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgcj10aGlzO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKG4pe3N3aXRjaChuLmxhYmVsKXtjYXNlIDA6cmV0dXJuWzQsdGhpcy5pc0hhbHRlZCgpXTtjYXNlIDE6cmV0dXJuIG4uc2VudCgpP1syXTpbNCx0aGlzLndyaXRlTWVtMzIoMzc1ODE1NzI5NiwtMTYwNDM4NjgxMyldO2Nhc2UgMjpyZXR1cm4gbi5zZW50KCksdD9bMix0aGlzLndhaXREZWxheSgoZnVuY3Rpb24oKXtyZXR1cm4gci5pc0hhbHRlZCgpfSksZSldOlsyXX19KSl9KSl9LGUucHJvdG90eXBlLnJlc3VtZT1mdW5jdGlvbih0LGUpe3JldHVybiB2b2lkIDA9PT10JiYodD0hMCksdm9pZCAwPT09ZSYmKGU9MCksbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIHI9dGhpcztyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihzKXtzd2l0Y2gocy5sYWJlbCl7Y2FzZSAwOnJldHVybls0LHRoaXMuaXNIYWx0ZWQoKV07Y2FzZSAxOnJldHVybiBzLnNlbnQoKT9bNCx0aGlzLndyaXRlTWVtMzIoMzc1ODE1NzEwNCw3KV06WzJdO2Nhc2UgMjpyZXR1cm4gcy5zZW50KCksWzQsdGhpcy5lbmFibGVEZWJ1ZygpXTtjYXNlIDM6cmV0dXJuIHMuc2VudCgpLHQ/WzIsdGhpcy53YWl0RGVsYXkoKGZ1bmN0aW9uKCl7cmV0dXJuIG4ocix2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKHQpe3N3aXRjaCh0LmxhYmVsKXtjYXNlIDA6cmV0dXJuWzQsdGhpcy5pc0hhbHRlZCgpXTtjYXNlIDE6cmV0dXJuWzIsIXQuc2VudCgpXX19KSl9KSl9KSxlKV06WzJdfX0pKX0pKX0sZS5wcm90b3R5cGUucmVhZENvcmVSZWdpc3Rlcj1mdW5jdGlvbih0KXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIGU7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24ocil7c3dpdGNoKHIubGFiZWwpe2Nhc2UgMDpyZXR1cm5bNCx0aGlzLnRyYW5zZmVyU2VxdWVuY2UoW3RoaXMud3JpdGVNZW0zMkNvbW1hbmQoMzc1ODE1NzMwMCx0KSx0aGlzLnJlYWRNZW0zMkNvbW1hbmQoMzc1ODE1NzI5NildKV07Y2FzZSAxOmlmKGU9ci5zZW50KCksISg2NTUzNiZlWzBdKSl0aHJvdyBuZXcgRXJyb3IoXCJSZWdpc3RlciBub3QgcmVhZHlcIik7cmV0dXJuWzIsdGhpcy5yZWFkTWVtMzIoMzc1ODE1NzMwNCldfX0pKX0pKX0sZS5wcm90b3R5cGUucmVhZENvcmVSZWdpc3RlcnM9ZnVuY3Rpb24odCl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciBlLHIsbixzLG87cmV0dXJuIGkodGhpcywoZnVuY3Rpb24oaSl7c3dpdGNoKGkubGFiZWwpe2Nhc2UgMDplPVtdLHI9MCxuPXQsaS5sYWJlbD0xO2Nhc2UgMTpyZXR1cm4gcjxuLmxlbmd0aD8ocz1uW3JdLFs0LHRoaXMucmVhZENvcmVSZWdpc3RlcihzKV0pOlszLDRdO2Nhc2UgMjpvPWkuc2VudCgpLGUucHVzaChvKSxpLmxhYmVsPTM7Y2FzZSAzOnJldHVybiByKyssWzMsMV07Y2FzZSA0OnJldHVyblsyLGVdfX0pKX0pKX0sZS5wcm90b3R5cGUud3JpdGVDb3JlUmVnaXN0ZXI9ZnVuY3Rpb24odCxlKXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIHI7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24obil7c3dpdGNoKG4ubGFiZWwpe2Nhc2UgMDpyZXR1cm5bNCx0aGlzLnRyYW5zZmVyU2VxdWVuY2UoW3RoaXMud3JpdGVNZW0zMkNvbW1hbmQoMzc1ODE1NzMwNCxlKSx0aGlzLndyaXRlTWVtMzJDb21tYW5kKDM3NTgxNTczMDAsNjU1MzZ8dCksdGhpcy5yZWFkTWVtMzJDb21tYW5kKDM3NTgxNTcyOTYpXSldO2Nhc2UgMTppZihyPW4uc2VudCgpLCEoNjU1MzYmclswXSkpdGhyb3cgbmV3IEVycm9yKFwiUmVnaXN0ZXIgbm90IHJlYWR5XCIpO3JldHVyblsyXX19KSl9KSl9LGUucHJvdG90eXBlLmV4ZWN1dGU9ZnVuY3Rpb24odCxlLHIscyxvKXt2b2lkIDA9PT1vJiYobz10KzEpO2Zvcih2YXIgdT1bXSxjPTU7Yzxhcmd1bWVudHMubGVuZ3RoO2MrKyl1W2MtNV09YXJndW1lbnRzW2NdO3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgbixjLGEsaD10aGlzO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKGkpe3N3aXRjaChpLmxhYmVsKXtjYXNlIDA6Zm9yKGVbZS5sZW5ndGgtMV0hPT1MJiYoKG49bmV3IFVpbnQzMkFycmF5KGUubGVuZ3RoKzEpKS5zZXQoZSksbi5zZXQoW0xdLGUubGVuZ3RoLTEpLGU9biksYz1bdGhpcy53cml0ZUNvcmVSZWdpc3RlckNvbW1hbmQoMTMsciksdGhpcy53cml0ZUNvcmVSZWdpc3RlckNvbW1hbmQoMTUscyksdGhpcy53cml0ZUNvcmVSZWdpc3RlckNvbW1hbmQoMTQsbyldLGE9MDthPE1hdGgubWluKHUubGVuZ3RoLDEyKTthKyspYy5wdXNoKHRoaXMud3JpdGVDb3JlUmVnaXN0ZXJDb21tYW5kKGEsdVthXSkpO3JldHVybiBjLnB1c2godGhpcy53cml0ZUNvcmVSZWdpc3RlckNvbW1hbmQoMTYsMTY3NzcyMTYpKSxbNCx0aGlzLmhhbHQoKV07Y2FzZSAxOnJldHVybiBpLnNlbnQoKSxbNCx0aGlzLnRyYW5zZmVyU2VxdWVuY2UoYyldO2Nhc2UgMjpyZXR1cm4gaS5zZW50KCksWzQsdGhpcy53cml0ZUJsb2NrKHQsZSldO2Nhc2UgMzpyZXR1cm4gaS5zZW50KCksWzQsdGhpcy5yZXN1bWUoITEpXTtjYXNlIDQ6cmV0dXJuIGkuc2VudCgpLFs0LHRoaXMud2FpdERlbGF5KChmdW5jdGlvbigpe3JldHVybiBoLmlzSGFsdGVkKCl9KSwxZTQpXTtjYXNlIDU6cmV0dXJuIGkuc2VudCgpLFsyXX19KSl9KSl9LGUucHJvdG90eXBlLnNvZnRSZXNldD1mdW5jdGlvbigpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbih0KXtzd2l0Y2godC5sYWJlbCl7Y2FzZSAwOnJldHVybls0LHRoaXMud3JpdGVNZW0zMigzNzU4MTU3MzA4LDApXTtjYXNlIDE6cmV0dXJuIHQuc2VudCgpLFsyLHRoaXMud3JpdGVNZW0zMigzNzU4MTU3MDY4LDEwMDI3MDA4NCldfX0pKX0pKX0sZS5wcm90b3R5cGUuc2V0VGFyZ2V0UmVzZXRTdGF0ZT1mdW5jdGlvbih0KXtyZXR1cm4gdm9pZCAwPT09dCYmKHQ9ITApLG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciBlO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKHIpe3N3aXRjaChyLmxhYmVsKXtjYXNlIDA6cmV0dXJuWzQsdGhpcy53cml0ZU1lbTMyKDM3NTgxNTczMDgsMSldO2Nhc2UgMTpyZXR1cm4gci5zZW50KCksITAhPT10P1szLDNdOls0LHRoaXMucmVzZXQoKV07Y2FzZSAyOnJldHVybiByLnNlbnQoKSxbMyw2XTtjYXNlIDM6cmV0dXJuWzQsdGhpcy5yZWFkTWVtMzIoMzc1ODE1NzA2OCldO2Nhc2UgNDpyZXR1cm4gZT1yLnNlbnQoKSxbNCx0aGlzLndyaXRlTWVtMzIoMzc1ODE1NzA2OCwxMDAyNzAwODR8ZSldO2Nhc2UgNTpyLnNlbnQoKSxyLmxhYmVsPTY7Y2FzZSA2OnJldHVybls0LHRoaXMud3JpdGVNZW0zMigzNzU4MTU3MzA4LDApXTtjYXNlIDc6cmV0dXJuIHIuc2VudCgpLFsyXX19KSl9KSl9LGV9KFQpOyh5PXQuRlBCQ3RybE1hc2t8fCh0LkZQQkN0cmxNYXNrPXt9KSlbeS5FTkFCTEU9MV09XCJFTkFCTEVcIix5W3kuS0VZPTJdPVwiS0VZXCI7dmFyIE09ZnVuY3Rpb24oKXtmdW5jdGlvbiB0KHQpe3RoaXMuZGV2aWNlPXQsdGhpcy5vcz1cImJyb3dzZXJcIix0aGlzLnBhY2tldFNpemU9NjR9cmV0dXJuIHQucHJvdG90eXBlLm9wZW49ZnVuY3Rpb24oKXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24odCl7cmV0dXJuWzJdfSkpfSkpfSx0LnByb3RvdHlwZS5jbG9zZT1mdW5jdGlvbigpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5kZXZpY2UuY2xvc2UoKSxbMl19KSl9KSl9LHQucHJvdG90eXBlLnJlYWQ9ZnVuY3Rpb24oKXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIHQsZSxyPXRoaXM7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24obil7c3dpdGNoKG4ubGFiZWwpe2Nhc2UgMDpyZXR1cm5bNCxuZXcgUHJvbWlzZSgoZnVuY3Rpb24odCxlKXtyLmRldmljZS5yZWFkKChmdW5jdGlvbihyLG4pe2lmKHIpcmV0dXJuIGUobmV3IEVycm9yKHIpKTt0KG4pfSkpfSkpXTtjYXNlIDE6cmV0dXJuIHQ9bi5zZW50KCksZT1uZXcgVWludDhBcnJheSh0KS5idWZmZXIsWzIsbmV3IERhdGFWaWV3KGUpXX19KSl9KSl9LHQucHJvdG90eXBlLndyaXRlPWZ1bmN0aW9uKHQpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgZSxyO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKG4pe2ZvcihlPWZ1bmN0aW9uKHQpe3JldHVybiB2b2lkIDAhPT10LmJ1ZmZlcn0odCk/dC5idWZmZXI6dCxyPUFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKG5ldyBVaW50OEFycmF5KGUpKTtyLmxlbmd0aDx0aGlzLnBhY2tldFNpemU7KXIucHVzaCgwKTtpZihcIndpbjMyXCI9PT10aGlzLm9zJiZyLnVuc2hpZnQoMCksdGhpcy5kZXZpY2Uud3JpdGUocikhPT1yLmxlbmd0aCl0aHJvdyBuZXcgRXJyb3IoXCJJbmNvcnJlY3QgYnl0ZWNvdW50IHdyaXR0ZW5cIik7cmV0dXJuWzJdfSkpfSkpfSx0fSgpLHg9ZnVuY3Rpb24oKXtmdW5jdGlvbiB0KHQsZSxyLG4pe3ZvaWQgMD09PWUmJihlPTI1NSksdm9pZCAwPT09ciYmKHI9MSksdm9pZCAwPT09biYmKG49ITEpLHRoaXMuZGV2aWNlPXQsdGhpcy5pbnRlcmZhY2VDbGFzcz1lLHRoaXMuY29uZmlndXJhdGlvbj1yLHRoaXMuYWx3YXlzQ29udHJvbFRyYW5zZmVyPW4sdGhpcy5wYWNrZXRTaXplPTY0fXJldHVybiB0LnByb3RvdHlwZS5idWZmZXJUb0RhdGFWaWV3PWZ1bmN0aW9uKHQpe3ZhciBlPW5ldyBVaW50OEFycmF5KHQpLmJ1ZmZlcjtyZXR1cm4gbmV3IERhdGFWaWV3KGUpfSx0LnByb3RvdHlwZS5pc1ZpZXc9ZnVuY3Rpb24odCl7cmV0dXJuIHZvaWQgMCE9PXQuYnVmZmVyfSx0LnByb3RvdHlwZS5idWZmZXJTb3VyY2VUb0J1ZmZlcj1mdW5jdGlvbih0KXt2YXIgZT10aGlzLmlzVmlldyh0KT90LmJ1ZmZlcjp0O3JldHVybiBCdWZmZXIuZnJvbShlKX0sdC5wcm90b3R5cGUuZXh0ZW5kQnVmZmVyPWZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcy5pc1ZpZXcodCk/dC5idWZmZXI6dCxuPU1hdGgubWluKHIuYnl0ZUxlbmd0aCxlKSxpPW5ldyBVaW50OEFycmF5KG4pO3JldHVybiBpLnNldChuZXcgVWludDhBcnJheShyKSksaX0sdC5wcm90b3R5cGUub3Blbj1mdW5jdGlvbigpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgdCxlLHIsbixzLG8sdT10aGlzO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKGkpe3N3aXRjaChpLmxhYmVsKXtjYXNlIDA6cmV0dXJuIHRoaXMuZGV2aWNlLm9wZW4oKSxbNCxuZXcgUHJvbWlzZSgoZnVuY3Rpb24odCxlKXt1LmRldmljZS5zZXRDb25maWd1cmF0aW9uKHUuY29uZmlndXJhdGlvbiwoZnVuY3Rpb24ocil7cj9lKG5ldyBFcnJvcihyKSk6dCgpfSkpfSkpXTtjYXNlIDE6aWYoaS5zZW50KCksISh0PXRoaXMuZGV2aWNlLmludGVyZmFjZXMuZmlsdGVyKChmdW5jdGlvbih0KXtyZXR1cm4gdC5kZXNjcmlwdG9yLmJJbnRlcmZhY2VDbGFzcz09PXUuaW50ZXJmYWNlQ2xhc3N9KSkpLmxlbmd0aCl0aHJvdyBuZXcgRXJyb3IoXCJObyB2YWxpZCBpbnRlcmZhY2VzIGZvdW5kLlwiKTtpZigoZT10LmZpbmQoKGZ1bmN0aW9uKHQpe3JldHVybiB0LmVuZHBvaW50cy5sZW5ndGg+MH0pKSl8fChlPXRbMF0pLHRoaXMuaW50ZXJmYWNlTnVtYmVyPWUuaW50ZXJmYWNlTnVtYmVyLCF0aGlzLmFsd2F5c0NvbnRyb2xUcmFuc2Zlcil7Zm9yKHI9ZS5lbmRwb2ludHMsdGhpcy5lbmRwb2ludEluPXZvaWQgMCx0aGlzLmVuZHBvaW50T3V0PXZvaWQgMCxuPTAscz1yO248cy5sZW5ndGg7bisrKVwiaW5cIiE9PShvPXNbbl0pLmRpcmVjdGlvbnx8dGhpcy5lbmRwb2ludEluP1wib3V0XCIhPT1vLmRpcmVjdGlvbnx8dGhpcy5lbmRwb2ludE91dHx8KHRoaXMuZW5kcG9pbnRPdXQ9byk6dGhpcy5lbmRwb2ludEluPW87aWYodGhpcy5lbmRwb2ludElufHx0aGlzLmVuZHBvaW50T3V0KXRyeXtlLmNsYWltKCl9Y2F0Y2godCl7dGhpcy5lbmRwb2ludEluPXZvaWQgMCx0aGlzLmVuZHBvaW50T3V0PXZvaWQgMH19cmV0dXJuWzJdfX0pKX0pKX0sdC5wcm90b3R5cGUuY2xvc2U9ZnVuY3Rpb24oKXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuZGV2aWNlLmNsb3NlKCksWzJdfSkpfSkpfSx0LnByb3RvdHlwZS5yZWFkPWZ1bmN0aW9uKCl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciB0LGU9dGhpcztyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihyKXtzd2l0Y2goci5sYWJlbCl7Y2FzZSAwOmlmKHZvaWQgMD09PXRoaXMuaW50ZXJmYWNlTnVtYmVyKXRocm93IG5ldyBFcnJvcihcIk5vIGRldmljZSBvcGVuZWRcIik7cmV0dXJuWzQsbmV3IFByb21pc2UoKGZ1bmN0aW9uKHQscil7ZS5lbmRwb2ludEluP2UuZW5kcG9pbnRJbi50cmFuc2ZlcihlLnBhY2tldFNpemUsKGZ1bmN0aW9uKGUsbil7ZT9yKGUpOnQobil9KSk6ZS5kZXZpY2UuY29udHJvbFRyYW5zZmVyKDE2MSwxLDI1NixlLmludGVyZmFjZU51bWJlcixlLnBhY2tldFNpemUsKGZ1bmN0aW9uKGUsbil7ZT9yKGUpOm4/dChuKTpyKG5ldyBFcnJvcihcIk5vIGJ1ZmZlciByZWFkXCIpKX0pKX0pKV07Y2FzZSAxOnJldHVybiB0PXIuc2VudCgpLFsyLHRoaXMuYnVmZmVyVG9EYXRhVmlldyh0KV19fSkpfSkpfSx0LnByb3RvdHlwZS53cml0ZT1mdW5jdGlvbih0KXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIGUscixuPXRoaXM7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24oaSl7c3dpdGNoKGkubGFiZWwpe2Nhc2UgMDppZih2b2lkIDA9PT10aGlzLmludGVyZmFjZU51bWJlcil0aHJvdyBuZXcgRXJyb3IoXCJObyBkZXZpY2Ugb3BlbmVkXCIpO3JldHVybiBlPXRoaXMuZXh0ZW5kQnVmZmVyKHQsdGhpcy5wYWNrZXRTaXplKSxyPXRoaXMuYnVmZmVyU291cmNlVG9CdWZmZXIoZSksWzQsbmV3IFByb21pc2UoKGZ1bmN0aW9uKHQsZSl7bi5lbmRwb2ludE91dD9uLmVuZHBvaW50T3V0LnRyYW5zZmVyKHIsKGZ1bmN0aW9uKHIpe2lmKHIpcmV0dXJuIGUocik7dCgpfSkpOm4uZGV2aWNlLmNvbnRyb2xUcmFuc2ZlcigzMyw5LDUxMixuLmludGVyZmFjZU51bWJlcixyLChmdW5jdGlvbihyKXtpZihyKXJldHVybiBlKHIpO3QoKX0pKX0pKV07Y2FzZSAxOnJldHVybiBpLnNlbnQoKSxbMl19fSkpfSkpfSx0fSgpLFM9ZnVuY3Rpb24oKXtmdW5jdGlvbiB0KHQsZSxyLG4pe3ZvaWQgMD09PWUmJihlPTI1NSksdm9pZCAwPT09ciYmKHI9MSksdm9pZCAwPT09biYmKG49ITEpLHRoaXMuZGV2aWNlPXQsdGhpcy5pbnRlcmZhY2VDbGFzcz1lLHRoaXMuY29uZmlndXJhdGlvbj1yLHRoaXMuYWx3YXlzQ29udHJvbFRyYW5zZmVyPW4sdGhpcy5wYWNrZXRTaXplPTY0fXJldHVybiB0LnByb3RvdHlwZS5leHRlbmRCdWZmZXI9ZnVuY3Rpb24odCxlKXt2YXIgcj12b2lkIDAhPT10LmJ1ZmZlcj90LmJ1ZmZlcjp0LG49TWF0aC5taW4oci5ieXRlTGVuZ3RoLGUpLGk9bmV3IFVpbnQ4QXJyYXkobik7cmV0dXJuIGkuc2V0KG5ldyBVaW50OEFycmF5KHIpKSxpfSx0LnByb3RvdHlwZS5vcGVuPWZ1bmN0aW9uKCl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciB0LGUscixuLHMsbyx1PXRoaXM7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24oaSl7c3dpdGNoKGkubGFiZWwpe2Nhc2UgMDpyZXR1cm5bNCx0aGlzLmRldmljZS5vcGVuKCldO2Nhc2UgMTpyZXR1cm4gaS5zZW50KCksWzQsdGhpcy5kZXZpY2Uuc2VsZWN0Q29uZmlndXJhdGlvbih0aGlzLmNvbmZpZ3VyYXRpb24pXTtjYXNlIDI6aWYoaS5zZW50KCksISh0PXRoaXMuZGV2aWNlLmNvbmZpZ3VyYXRpb24uaW50ZXJmYWNlcy5maWx0ZXIoKGZ1bmN0aW9uKHQpe3JldHVybiB0LmFsdGVybmF0ZXNbMF0uaW50ZXJmYWNlQ2xhc3M9PT11LmludGVyZmFjZUNsYXNzfSkpKS5sZW5ndGgpdGhyb3cgbmV3IEVycm9yKFwiTm8gdmFsaWQgaW50ZXJmYWNlcyBmb3VuZC5cIik7aWYoKGU9dC5maW5kKChmdW5jdGlvbih0KXtyZXR1cm4gdC5hbHRlcm5hdGVzWzBdLmVuZHBvaW50cy5sZW5ndGg+MH0pKSl8fChlPXRbMF0pLHRoaXMuaW50ZXJmYWNlTnVtYmVyPWUuaW50ZXJmYWNlTnVtYmVyLCF0aGlzLmFsd2F5c0NvbnRyb2xUcmFuc2Zlcilmb3Iocj1lLmFsdGVybmF0ZXNbMF0uZW5kcG9pbnRzLHRoaXMuZW5kcG9pbnRJbj12b2lkIDAsdGhpcy5lbmRwb2ludE91dD12b2lkIDAsbj0wLHM9cjtuPHMubGVuZ3RoO24rKylcImluXCIhPT0obz1zW25dKS5kaXJlY3Rpb258fHRoaXMuZW5kcG9pbnRJbj9cIm91dFwiIT09by5kaXJlY3Rpb258fHRoaXMuZW5kcG9pbnRPdXR8fCh0aGlzLmVuZHBvaW50T3V0PW8pOnRoaXMuZW5kcG9pbnRJbj1vO3JldHVyblsyLHRoaXMuZGV2aWNlLmNsYWltSW50ZXJmYWNlKHRoaXMuaW50ZXJmYWNlTnVtYmVyKV19fSkpfSkpfSx0LnByb3RvdHlwZS5jbG9zZT1mdW5jdGlvbigpe3JldHVybiB0aGlzLmRldmljZS5jbG9zZSgpfSx0LnByb3RvdHlwZS5yZWFkPWZ1bmN0aW9uKCl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciB0O3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKGUpe3N3aXRjaChlLmxhYmVsKXtjYXNlIDA6aWYodm9pZCAwPT09dGhpcy5pbnRlcmZhY2VOdW1iZXIpdGhyb3cgbmV3IEVycm9yKFwiTm8gZGV2aWNlIG9wZW5lZFwiKTtyZXR1cm4gdGhpcy5lbmRwb2ludEluP1s0LHRoaXMuZGV2aWNlLnRyYW5zZmVySW4odGhpcy5lbmRwb2ludEluLmVuZHBvaW50TnVtYmVyLHRoaXMucGFja2V0U2l6ZSldOlszLDJdO2Nhc2UgMTpyZXR1cm4gdD1lLnNlbnQoKSxbMyw0XTtjYXNlIDI6cmV0dXJuWzQsdGhpcy5kZXZpY2UuY29udHJvbFRyYW5zZmVySW4oe3JlcXVlc3RUeXBlOlwiY2xhc3NcIixyZWNpcGllbnQ6XCJpbnRlcmZhY2VcIixyZXF1ZXN0OjEsdmFsdWU6MjU2LGluZGV4OnRoaXMuaW50ZXJmYWNlTnVtYmVyfSx0aGlzLnBhY2tldFNpemUpXTtjYXNlIDM6dD1lLnNlbnQoKSxlLmxhYmVsPTQ7Y2FzZSA0OnJldHVyblsyLHQuZGF0YV19fSkpfSkpfSx0LnByb3RvdHlwZS53cml0ZT1mdW5jdGlvbih0KXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIGU7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24ocil7c3dpdGNoKHIubGFiZWwpe2Nhc2UgMDppZih2b2lkIDA9PT10aGlzLmludGVyZmFjZU51bWJlcil0aHJvdyBuZXcgRXJyb3IoXCJObyBkZXZpY2Ugb3BlbmVkXCIpO3JldHVybiBlPXRoaXMuZXh0ZW5kQnVmZmVyKHQsdGhpcy5wYWNrZXRTaXplKSx0aGlzLmVuZHBvaW50T3V0P1s0LHRoaXMuZGV2aWNlLnRyYW5zZmVyT3V0KHRoaXMuZW5kcG9pbnRPdXQuZW5kcG9pbnROdW1iZXIsZSldOlszLDJdO2Nhc2UgMTpyZXR1cm4gci5zZW50KCksWzMsNF07Y2FzZSAyOnJldHVybls0LHRoaXMuZGV2aWNlLmNvbnRyb2xUcmFuc2Zlck91dCh7cmVxdWVzdFR5cGU6XCJjbGFzc1wiLHJlY2lwaWVudDpcImludGVyZmFjZVwiLHJlcXVlc3Q6OSx2YWx1ZTo1MTIsaW5kZXg6dGhpcy5pbnRlcmZhY2VOdW1iZXJ9LGUpXTtjYXNlIDM6ci5zZW50KCksci5sYWJlbD00O2Nhc2UgNDpyZXR1cm5bMl19fSkpfSkpfSx0fSgpO3QuQURJPVQsdC5DbXNpc0RBUD1nLHQuQ29ydGV4TT1fLHQuREFQTGluaz1QLHQuREVGQVVMVF9DTE9DS19GUkVRVUVOQ1k9bSx0LkhJRD1NLHQuVVNCPXgsdC5XZWJVU0I9UyxPYmplY3QuZGVmaW5lUHJvcGVydHkodCxcIl9fZXNNb2R1bGVcIix7dmFsdWU6ITB9KX0pKTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhcC51bWQuanMubWFwXG4iLCIoZnVuY3Rpb24oYSxiKXtpZihcImZ1bmN0aW9uXCI9PXR5cGVvZiBkZWZpbmUmJmRlZmluZS5hbWQpZGVmaW5lKFtdLGIpO2Vsc2UgaWYoXCJ1bmRlZmluZWRcIiE9dHlwZW9mIGV4cG9ydHMpYigpO2Vsc2V7YigpLGEuRmlsZVNhdmVyPXtleHBvcnRzOnt9fS5leHBvcnRzfX0pKHRoaXMsZnVuY3Rpb24oKXtcInVzZSBzdHJpY3RcIjtmdW5jdGlvbiBiKGEsYil7cmV0dXJuXCJ1bmRlZmluZWRcIj09dHlwZW9mIGI/Yj17YXV0b0JvbTohMX06XCJvYmplY3RcIiE9dHlwZW9mIGImJihjb25zb2xlLndhcm4oXCJEZXByZWNhdGVkOiBFeHBlY3RlZCB0aGlyZCBhcmd1bWVudCB0byBiZSBhIG9iamVjdFwiKSxiPXthdXRvQm9tOiFifSksYi5hdXRvQm9tJiYvXlxccyooPzp0ZXh0XFwvXFxTKnxhcHBsaWNhdGlvblxcL3htbHxcXFMqXFwvXFxTKlxcK3htbClcXHMqOy4qY2hhcnNldFxccyo9XFxzKnV0Zi04L2kudGVzdChhLnR5cGUpP25ldyBCbG9iKFtcIlxcdUZFRkZcIixhXSx7dHlwZTphLnR5cGV9KTphfWZ1bmN0aW9uIGMoYSxiLGMpe3ZhciBkPW5ldyBYTUxIdHRwUmVxdWVzdDtkLm9wZW4oXCJHRVRcIixhKSxkLnJlc3BvbnNlVHlwZT1cImJsb2JcIixkLm9ubG9hZD1mdW5jdGlvbigpe2coZC5yZXNwb25zZSxiLGMpfSxkLm9uZXJyb3I9ZnVuY3Rpb24oKXtjb25zb2xlLmVycm9yKFwiY291bGQgbm90IGRvd25sb2FkIGZpbGVcIil9LGQuc2VuZCgpfWZ1bmN0aW9uIGQoYSl7dmFyIGI9bmV3IFhNTEh0dHBSZXF1ZXN0O2Iub3BlbihcIkhFQURcIixhLCExKTt0cnl7Yi5zZW5kKCl9Y2F0Y2goYSl7fXJldHVybiAyMDA8PWIuc3RhdHVzJiYyOTk+PWIuc3RhdHVzfWZ1bmN0aW9uIGUoYSl7dHJ5e2EuZGlzcGF0Y2hFdmVudChuZXcgTW91c2VFdmVudChcImNsaWNrXCIpKX1jYXRjaChjKXt2YXIgYj1kb2N1bWVudC5jcmVhdGVFdmVudChcIk1vdXNlRXZlbnRzXCIpO2IuaW5pdE1vdXNlRXZlbnQoXCJjbGlja1wiLCEwLCEwLHdpbmRvdywwLDAsMCw4MCwyMCwhMSwhMSwhMSwhMSwwLG51bGwpLGEuZGlzcGF0Y2hFdmVudChiKX19dmFyIGY9XCJvYmplY3RcIj09dHlwZW9mIHdpbmRvdyYmd2luZG93LndpbmRvdz09PXdpbmRvdz93aW5kb3c6XCJvYmplY3RcIj09dHlwZW9mIHNlbGYmJnNlbGYuc2VsZj09PXNlbGY/c2VsZjpcIm9iamVjdFwiPT10eXBlb2YgZ2xvYmFsJiZnbG9iYWwuZ2xvYmFsPT09Z2xvYmFsP2dsb2JhbDp2b2lkIDAsYT1mLm5hdmlnYXRvciYmL01hY2ludG9zaC8udGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSYmL0FwcGxlV2ViS2l0Ly50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpJiYhL1NhZmFyaS8udGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSxnPWYuc2F2ZUFzfHwoXCJvYmplY3RcIiE9dHlwZW9mIHdpbmRvd3x8d2luZG93IT09Zj9mdW5jdGlvbigpe306XCJkb3dubG9hZFwiaW4gSFRNTEFuY2hvckVsZW1lbnQucHJvdG90eXBlJiYhYT9mdW5jdGlvbihiLGcsaCl7dmFyIGk9Zi5VUkx8fGYud2Via2l0VVJMLGo9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImFcIik7Zz1nfHxiLm5hbWV8fFwiZG93bmxvYWRcIixqLmRvd25sb2FkPWcsai5yZWw9XCJub29wZW5lclwiLFwic3RyaW5nXCI9PXR5cGVvZiBiPyhqLmhyZWY9YixqLm9yaWdpbj09PWxvY2F0aW9uLm9yaWdpbj9lKGopOmQoai5ocmVmKT9jKGIsZyxoKTplKGosai50YXJnZXQ9XCJfYmxhbmtcIikpOihqLmhyZWY9aS5jcmVhdGVPYmplY3RVUkwoYiksc2V0VGltZW91dChmdW5jdGlvbigpe2kucmV2b2tlT2JqZWN0VVJMKGouaHJlZil9LDRFNCksc2V0VGltZW91dChmdW5jdGlvbigpe2Uoail9LDApKX06XCJtc1NhdmVPck9wZW5CbG9iXCJpbiBuYXZpZ2F0b3I/ZnVuY3Rpb24oZixnLGgpe2lmKGc9Z3x8Zi5uYW1lfHxcImRvd25sb2FkXCIsXCJzdHJpbmdcIiE9dHlwZW9mIGYpbmF2aWdhdG9yLm1zU2F2ZU9yT3BlbkJsb2IoYihmLGgpLGcpO2Vsc2UgaWYoZChmKSljKGYsZyxoKTtlbHNle3ZhciBpPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJhXCIpO2kuaHJlZj1mLGkudGFyZ2V0PVwiX2JsYW5rXCIsc2V0VGltZW91dChmdW5jdGlvbigpe2UoaSl9KX19OmZ1bmN0aW9uKGIsZCxlLGcpe2lmKGc9Z3x8b3BlbihcIlwiLFwiX2JsYW5rXCIpLGcmJihnLmRvY3VtZW50LnRpdGxlPWcuZG9jdW1lbnQuYm9keS5pbm5lclRleHQ9XCJkb3dubG9hZGluZy4uLlwiKSxcInN0cmluZ1wiPT10eXBlb2YgYilyZXR1cm4gYyhiLGQsZSk7dmFyIGg9XCJhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW1cIj09PWIudHlwZSxpPS9jb25zdHJ1Y3Rvci9pLnRlc3QoZi5IVE1MRWxlbWVudCl8fGYuc2FmYXJpLGo9L0NyaU9TXFwvW1xcZF0rLy50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpO2lmKChqfHxoJiZpfHxhKSYmXCJ1bmRlZmluZWRcIiE9dHlwZW9mIEZpbGVSZWFkZXIpe3ZhciBrPW5ldyBGaWxlUmVhZGVyO2sub25sb2FkZW5kPWZ1bmN0aW9uKCl7dmFyIGE9ay5yZXN1bHQ7YT1qP2E6YS5yZXBsYWNlKC9eZGF0YTpbXjtdKjsvLFwiZGF0YTphdHRhY2htZW50L2ZpbGU7XCIpLGc/Zy5sb2NhdGlvbi5ocmVmPWE6bG9jYXRpb249YSxnPW51bGx9LGsucmVhZEFzRGF0YVVSTChiKX1lbHNle3ZhciBsPWYuVVJMfHxmLndlYmtpdFVSTCxtPWwuY3JlYXRlT2JqZWN0VVJMKGIpO2c/Zy5sb2NhdGlvbj1tOmxvY2F0aW9uLmhyZWY9bSxnPW51bGwsc2V0VGltZW91dChmdW5jdGlvbigpe2wucmV2b2tlT2JqZWN0VVJMKG0pfSw0RTQpfX0pO2Yuc2F2ZUFzPWcuc2F2ZUFzPWcsXCJ1bmRlZmluZWRcIiE9dHlwZW9mIG1vZHVsZSYmKG1vZHVsZS5leHBvcnRzPWcpfSk7XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPUZpbGVTYXZlci5taW4uanMubWFwIiwiLyohIGllZWU3NTQuIEJTRC0zLUNsYXVzZSBMaWNlbnNlLiBGZXJvc3MgQWJvdWtoYWRpamVoIDxodHRwczovL2Zlcm9zcy5vcmcvb3BlbnNvdXJjZT4gKi9cbmV4cG9ydHMucmVhZCA9IGZ1bmN0aW9uIChidWZmZXIsIG9mZnNldCwgaXNMRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtXG4gIHZhciBlTGVuID0gKG5CeXRlcyAqIDgpIC0gbUxlbiAtIDFcbiAgdmFyIGVNYXggPSAoMSA8PCBlTGVuKSAtIDFcbiAgdmFyIGVCaWFzID0gZU1heCA+PiAxXG4gIHZhciBuQml0cyA9IC03XG4gIHZhciBpID0gaXNMRSA/IChuQnl0ZXMgLSAxKSA6IDBcbiAgdmFyIGQgPSBpc0xFID8gLTEgOiAxXG4gIHZhciBzID0gYnVmZmVyW29mZnNldCArIGldXG5cbiAgaSArPSBkXG5cbiAgZSA9IHMgJiAoKDEgPDwgKC1uQml0cykpIC0gMSlcbiAgcyA+Pj0gKC1uQml0cylcbiAgbkJpdHMgKz0gZUxlblxuICBmb3IgKDsgbkJpdHMgPiAwOyBlID0gKGUgKiAyNTYpICsgYnVmZmVyW29mZnNldCArIGldLCBpICs9IGQsIG5CaXRzIC09IDgpIHt9XG5cbiAgbSA9IGUgJiAoKDEgPDwgKC1uQml0cykpIC0gMSlcbiAgZSA+Pj0gKC1uQml0cylcbiAgbkJpdHMgKz0gbUxlblxuICBmb3IgKDsgbkJpdHMgPiAwOyBtID0gKG0gKiAyNTYpICsgYnVmZmVyW29mZnNldCArIGldLCBpICs9IGQsIG5CaXRzIC09IDgpIHt9XG5cbiAgaWYgKGUgPT09IDApIHtcbiAgICBlID0gMSAtIGVCaWFzXG4gIH0gZWxzZSBpZiAoZSA9PT0gZU1heCkge1xuICAgIHJldHVybiBtID8gTmFOIDogKChzID8gLTEgOiAxKSAqIEluZmluaXR5KVxuICB9IGVsc2Uge1xuICAgIG0gPSBtICsgTWF0aC5wb3coMiwgbUxlbilcbiAgICBlID0gZSAtIGVCaWFzXG4gIH1cbiAgcmV0dXJuIChzID8gLTEgOiAxKSAqIG0gKiBNYXRoLnBvdygyLCBlIC0gbUxlbilcbn1cblxuZXhwb3J0cy53cml0ZSA9IGZ1bmN0aW9uIChidWZmZXIsIHZhbHVlLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbSwgY1xuICB2YXIgZUxlbiA9IChuQnl0ZXMgKiA4KSAtIG1MZW4gLSAxXG4gIHZhciBlTWF4ID0gKDEgPDwgZUxlbikgLSAxXG4gIHZhciBlQmlhcyA9IGVNYXggPj4gMVxuICB2YXIgcnQgPSAobUxlbiA9PT0gMjMgPyBNYXRoLnBvdygyLCAtMjQpIC0gTWF0aC5wb3coMiwgLTc3KSA6IDApXG4gIHZhciBpID0gaXNMRSA/IDAgOiAobkJ5dGVzIC0gMSlcbiAgdmFyIGQgPSBpc0xFID8gMSA6IC0xXG4gIHZhciBzID0gdmFsdWUgPCAwIHx8ICh2YWx1ZSA9PT0gMCAmJiAxIC8gdmFsdWUgPCAwKSA/IDEgOiAwXG5cbiAgdmFsdWUgPSBNYXRoLmFicyh2YWx1ZSlcblxuICBpZiAoaXNOYU4odmFsdWUpIHx8IHZhbHVlID09PSBJbmZpbml0eSkge1xuICAgIG0gPSBpc05hTih2YWx1ZSkgPyAxIDogMFxuICAgIGUgPSBlTWF4XG4gIH0gZWxzZSB7XG4gICAgZSA9IE1hdGguZmxvb3IoTWF0aC5sb2codmFsdWUpIC8gTWF0aC5MTjIpXG4gICAgaWYgKHZhbHVlICogKGMgPSBNYXRoLnBvdygyLCAtZSkpIDwgMSkge1xuICAgICAgZS0tXG4gICAgICBjICo9IDJcbiAgICB9XG4gICAgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICB2YWx1ZSArPSBydCAvIGNcbiAgICB9IGVsc2Uge1xuICAgICAgdmFsdWUgKz0gcnQgKiBNYXRoLnBvdygyLCAxIC0gZUJpYXMpXG4gICAgfVxuICAgIGlmICh2YWx1ZSAqIGMgPj0gMikge1xuICAgICAgZSsrXG4gICAgICBjIC89IDJcbiAgICB9XG5cbiAgICBpZiAoZSArIGVCaWFzID49IGVNYXgpIHtcbiAgICAgIG0gPSAwXG4gICAgICBlID0gZU1heFxuICAgIH0gZWxzZSBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIG0gPSAoKHZhbHVlICogYykgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pXG4gICAgICBlID0gZSArIGVCaWFzXG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSB2YWx1ZSAqIE1hdGgucG93KDIsIGVCaWFzIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKVxuICAgICAgZSA9IDBcbiAgICB9XG4gIH1cblxuICBmb3IgKDsgbUxlbiA+PSA4OyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBtICYgMHhmZiwgaSArPSBkLCBtIC89IDI1NiwgbUxlbiAtPSA4KSB7fVxuXG4gIGUgPSAoZSA8PCBtTGVuKSB8IG1cbiAgZUxlbiArPSBtTGVuXG4gIGZvciAoOyBlTGVuID4gMDsgYnVmZmVyW29mZnNldCArIGldID0gZSAmIDB4ZmYsIGkgKz0gZCwgZSAvPSAyNTYsIGVMZW4gLT0gOCkge31cblxuICBidWZmZXJbb2Zmc2V0ICsgaSAtIGRdIHw9IHMgKiAxMjhcbn1cbiIsImV4cG9ydCBjbGFzcyBUd29QYW5lbENvbnRhaW5lcntcblxuICAgIHN0YXRpYyBNSU5fU1BBQ0UgPSA1MDtcblxuICAgIHByaXZhdGUgbGVmdF9jb250YWluZXIgOiBIVE1MRWxlbWVudDtcbiAgICBwcml2YXRlIHNlcGFyYXRvciA6IEhUTUxFbGVtZW50O1xuICAgIHByaXZhdGUgcmlnaHRfY29udGFpbmVyIDogSFRNTEVsZW1lbnQ7XG4gICAgcHJpdmF0ZSBpc19tb3ZpbmcgOiBib29sZWFuID0gZmFsc2U7XG5cbiAgICBjb25zdHJ1Y3RvcihsZWZ0X2NvbnRhaW5lcjogSFRNTEVsZW1lbnQsIHNlcGFyYXRvcjogSFRNTEVsZW1lbnQsIHJpZ2h0X2NvbnRhaW5lcjogSFRNTEVsZW1lbnQpe1xuICAgICAgICB0aGlzLmxlZnRfY29udGFpbmVyID0gbGVmdF9jb250YWluZXI7XG4gICAgICAgIHRoaXMuc2VwYXJhdG9yID0gc2VwYXJhdG9yO1xuICAgICAgICB0aGlzLnJpZ2h0X2NvbnRhaW5lciA9IHJpZ2h0X2NvbnRhaW5lcjtcblxuICAgICAgICB0aGlzLnNlcGFyYXRvci5hZGRFdmVudExpc3RlbmVyKCBcIm1vdXNlZG93blwiLCAoKSA9PiB7IHRoaXMuaXNfbW92aW5nID0gdHJ1ZTsgfSApO1xuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCBcIm1vdXNldXBcIiwgKCkgPT4geyB0aGlzLmlzX21vdmluZyA9IGZhbHNlOyB9ICk7XG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoIFwibW91c2Vtb3ZlXCIsIChldnQpID0+IHsgdGhpcy5tb3VzZV9tb3ZlKGV2dCk7IH0gKTtcbiAgICB9XG5cbiAgICBtb3VzZV9tb3ZlKGV2dDogTW91c2VFdmVudCl7XG4gICAgICAgIGlmKCAhdGhpcy5pc19tb3ZpbmcgKXsgcmV0dXJuOyB9XG5cbiAgICAgICAgbGV0IG5ld1Bvc1ggPSBNYXRoLm1heCggVHdvUGFuZWxDb250YWluZXIuTUlOX1NQQUNFLCBNYXRoLm1pbihldnQuY2xpZW50WCwgZG9jdW1lbnQuYm9keS5jbGllbnRXaWR0aCAtIFR3b1BhbmVsQ29udGFpbmVyLk1JTl9TUEFDRSkpO1xuXG4gICAgICAgIHRoaXMuc2V0X3BhbmVsX3NpemUobmV3UG9zWCk7XG4gICAgfVxuXG4gICAgc2V0X3BhbmVsX3NpemUobGVmdF9zaXplOiBudW1iZXIpe1xuICAgICAgICBsZXQgcGVyY2VudCA9IChsZWZ0X3NpemUgLyBkb2N1bWVudC5ib2R5LmNsaWVudFdpZHRoKSAqIDEwMDtcblxuICAgICAgICB0aGlzLnNlcGFyYXRvci5zdHlsZS5sZWZ0ID0gcGVyY2VudCArIFwiJVwiO1xuICAgICAgICB0aGlzLmxlZnRfY29udGFpbmVyLnN0eWxlLndpZHRoID0gcGVyY2VudCArIFwiJVwiO1xuICAgICAgICB0aGlzLnJpZ2h0X2NvbnRhaW5lci5zdHlsZS53aWR0aCA9IGBjYWxjKCR7MTAwLXBlcmNlbnR9JSAtICR7dGhpcy5zZXBhcmF0b3IuY2xpZW50V2lkdGh9cHgpYDtcbiAgICB9XG5cbiAgICBoaWRlX3JpZ2h0X3BhbmVsKCl7XG4gICAgICAgIHRoaXMucmlnaHRfY29udGFpbmVyLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcbiAgICAgICAgdGhpcy5zZXBhcmF0b3Iuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xuICAgICAgICB0aGlzLmxlZnRfY29udGFpbmVyLnN0eWxlLndpZHRoID0gXCIxMDAlXCI7XG4gICAgfVxuXG4gICAgc2hvd19yaWdodF9wYW5lbCgpe1xuICAgICAgICB0aGlzLnJpZ2h0X2NvbnRhaW5lci5zdHlsZS5kaXNwbGF5ID0gXCJibG9ja1wiO1xuICAgICAgICB0aGlzLnNlcGFyYXRvci5zdHlsZS5kaXNwbGF5ID0gXCJibG9ja1wiO1xuICAgICAgICB0aGlzLnNldF9wYW5lbF9zaXplKDUwKTtcbiAgICB9XG59IiwiaW1wb3J0IHsgT25Db25uZWN0aW9uQ2hhbmdlQ2FsbGJhY2sgfSBmcm9tIFwiLi4vY29tbW9uXCI7XG5pbXBvcnQgeyBEYXBMaW5rV3JhcHBlciB9IGZyb20gXCIuLi9kYXBsaW5rXCI7XG5pbXBvcnQgeyBBY3Rpb24gfSBmcm9tIFwiLi9hY3Rpb25cIjtcblxuZXhwb3J0IGNsYXNzIEFjdGlvbkNvbm5lY3Rpb24gaW1wbGVtZW50cyBBY3Rpb24ge1xuXG4gICAgcHJpdmF0ZSBkYXBsaW5rOiBEYXBMaW5rV3JhcHBlcjtcbiAgICBwcml2YXRlIGlzX2Nvbm5lY3RlZDogYm9vbGVhbjtcblxuICAgIGNvbnN0cnVjdG9yKGRhcGxpbms6IERhcExpbmtXcmFwcGVyKXtcbiAgICAgICAgdGhpcy5kYXBsaW5rID0gZGFwbGluaztcblxuICAgICAgICB0aGlzLmlzX2Nvbm5lY3RlZCA9IGZhbHNlO1xuICAgICAgICBkYXBsaW5rLmFkZENvbm5lY3Rpb25DaGFuZ2VMaXN0ZW5lciggKGlzX2Nvbm4pID0+IHRoaXMub25Db25uZWN0aW9uQ2hhbmdlKGlzX2Nvbm4pICk7XG4gICAgfVxuXG4gICAgYXN5bmMgY29ubmVjdCgpIDogUHJvbWlzZTxib29sZWFuPntcbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZGFwbGluay5jb25uZWN0KCk7XG4gICAgfVxuXG4gICAgYXN5bmMgZGlzY29ubmVjdCgpIDogUHJvbWlzZTxib29sZWFuPntcbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZGFwbGluay5kaXNjb25uZWN0KCk7XG4gICAgfVxuXG4gICAgYXN5bmMgcnVuKCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgICAgICBpZiggdGhpcy5pc19jb25uZWN0ZWQgKXtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmRpc2Nvbm5lY3QoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29ubmVjdCgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBvbkNvbm5lY3Rpb25DaGFuZ2UoaXNfY29ubmVjdGVkOiBib29sZWFuKXtcbiAgICAgICAgdGhpcy5pc19jb25uZWN0ZWQgPSBpc19jb25uZWN0ZWQ7XG4gICAgfVxufSIsImltcG9ydCB7IEdldFNjcmlwdENhbGxiYWNrLCB0b0hleFN0cmluZyB9IGZyb20gXCIuLi9jb21tb25cIjtcbmltcG9ydCB7IEZhdEZTIH0gZnJvbSBcIi4uL21pY3JvRkFUL2ZhdFwiO1xuXG5pbXBvcnQgeyBzYXZlQXMgfSBmcm9tIFwiZmlsZS1zYXZlclwiO1xuaW1wb3J0IHsgRGFwTGlua1dyYXBwZXIgfSBmcm9tIFwiLi4vZGFwbGlua1wiO1xuaW1wb3J0IHsgQWN0aW9uIH0gZnJvbSBcIi4vYWN0aW9uXCI7XG5pbXBvcnQgeyBTZXJpYWxPdXRwdXQgfSBmcm9tIFwiLi4vc2VyaWFsT3V0cHV0XCI7XG5pbXBvcnQgeyBJSGV4IH0gZnJvbSBcIi4uL2loZXhfdXRpbFwiO1xuaW1wb3J0IHsgUHJvZ3Jlc3NEaWFsb2csIFByb2dyZXNzTWVzc2FnZVR5cGUgfSBmcm9tIFwiLi4vcHJvZ3Jlc3NfZGlhbG9nXCI7XG5pbXBvcnQgeyBBbGVydERpYWxvZywgQWxlcnREaWFsb2dJY29uIH0gZnJvbSBcIi4uL2FsZXJ0X2RpYWxvZ1wiO1xuXG5jbGFzcyBGYXRGaWxlIHtcbiAgICBuYW1lOiBzdHJpbmcgPSBcIlwiO1xuICAgIGV4dGVuc2lvbjogc3RyaW5nID0gXCJcIjtcbiAgICBpc0JpbmFyeTogYm9vbGVhbiA9IGZhbHNlO1xuICAgIHBhdGg6IHN0cmluZyA9IFwiXCI7XG59XG5cbmV4cG9ydCBjbGFzcyBBY3Rpb25GbGFzaCBpbXBsZW1lbnRzIEFjdGlvbiB7XG5cbiAgICBzdGF0aWMgcmVhZG9ubHkgRkxBU0hfU1RBUlRfQUREUkVTUyA6IG51bWJlciA9IDB4MDgwMDAwMDA7XG5cblxuICAgIHByaXZhdGUgZ2V0X3NjcmlwdF9jYjogR2V0U2NyaXB0Q2FsbGJhY2s7XG4gICAgcHJpdmF0ZSBkYXBsaW5rOiBEYXBMaW5rV3JhcHBlcjtcbiAgICBwcml2YXRlIHNlcmlhbF9vdXB1dDogU2VyaWFsT3V0cHV0O1xuICAgIHByaXZhdGUgZGlhbG9nOiBQcm9ncmVzc0RpYWxvZztcblxuICAgIGNvbnN0cnVjdG9yKGRhcGxpbms6IERhcExpbmtXcmFwcGVyLCBzZXJpYWxfb3V0cHV0OiBTZXJpYWxPdXRwdXQsIGdldF9zY3JpcHQ6IEdldFNjcmlwdENhbGxiYWNrKXtcbiAgICAgICAgdGhpcy5nZXRfc2NyaXB0X2NiID0gZ2V0X3NjcmlwdDtcbiAgICAgICAgdGhpcy5kYXBsaW5rID0gZGFwbGluaztcbiAgICAgICAgdGhpcy5zZXJpYWxfb3VwdXQgPSBzZXJpYWxfb3V0cHV0O1xuICAgICAgICB0aGlzLmRpYWxvZyA9IG5ldyBQcm9ncmVzc0RpYWxvZygpO1xuICAgIH1cblxuICAgIGFzeW5jIHJ1bigpIDogUHJvbWlzZTxib29sZWFuPntcbiAgICAgICAgaWYoIHRoaXMuZGFwbGluay5pc0Nvbm5lY3RlZCgpIClcbiAgICAgICAge1xuICAgICAgICAgICAgdGhpcy5kaWFsb2cub3BlbigpO1xuICAgICAgICAgICAgdGhpcy5kaWFsb2cuYWRkSW5mbyhcIlNlYXJjaGluZyBmb3IgTWljcm9QeXRob24uLi5cIik7XG5cbiAgICAgICAgICAgIGlmKCBhd2FpdCB0aGlzLmRhcGxpbmsuaXNNaWNyb3B5dGhvbk9uVGFyZ2V0KCkgKXtcbiAgICAgICAgICAgICAgICB0aGlzLmRpYWxvZy5hZGRJbmZvKFwiTWljcm9QeXRob24gd2FzIGZvdW5kLlwiKTtcbiAgICAgICAgICAgICAgICB0aGlzLmRpYWxvZy5hZGRJbmZvKFwiRmxhc2hpbmcgcHl0aG9uIHNjcmlwdHNcIik7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5kYXBsaW5rLmZsYXNoTWFpbiggICB0aGlzLmdldF9zY3JpcHRfY2IoKSwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAocHJnOiBudW1iZXIpID0+IHRoaXMuZGlhbG9nLnNldFByb2dyZXNzVmFsdWUocHJnKjEwMCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5kaWFsb2cuYWRkSW5mbyhcIltGbGFzaE1haW5dIEVycm9yOiBcIiArIGVyciwgUHJvZ3Jlc3NNZXNzYWdlVHlwZS5FUlJPUilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRpYWxvZy5hZGRJbmZvKFwiVHJ5IHVucGx1Z2dpbmcgYW5kIHJlcGx1Z2dpbmcgeW91ciBib2FyZC4uLlwiLCBQcm9ncmVzc01lc3NhZ2VUeXBlLkVSUk9SKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHRoaXMuc2VyaWFsX291cHV0LmNsZWFyKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5kaWFsb2cuc2hvd0Nsb3NlQnV0dG9uKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgIHRoaXMuZGlhbG9nLmFkZEluZm8oXCJNaWNyb1B5dGhvbiB3YXMgbm90IGZvdW5kLi4uIFJlZmxhc2ggZXZlcnl0aGluZy5cIiwgUHJvZ3Jlc3NNZXNzYWdlVHlwZS5XQVJOSU5HKTtcbiAgICAgICAgICAgICAgICB0aGlzLmRpYWxvZy5hZGRJbmZvKFwiRmxhc2hpbmcgTWljcm9QeXRob24uLi5cIik7XG5cbiAgICAgICAgICAgICAgICBsZXQgYmluID0gYXdhaXQgdGhpcy5nZW5lcmF0ZUJpbmFyeSgpO1xuXG4gICAgICAgICAgICAgICAgaWYoIGJpbiA9PSBudWxsICl7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGlhbG9nLmFkZEluZm8oXCJGYWlsZWQgdG8gZ2VuZXJhdGUgYmluYXJ5Li4uIEFib3J0XCIpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgICAgIGxldCBoZXggPSBuZXcgSUhleChBY3Rpb25GbGFzaC5GTEFTSF9TVEFSVF9BRERSRVNTKS5wYXJzZUJpbihiaW4pO1xuXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuZGFwbGluay5mbGFzaCggICBuZXcgVGV4dEVuY29kZXIoKS5lbmNvZGUoaGV4KSwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAocHJnOiBudW1iZXIpID0+ICB0aGlzLmRpYWxvZy5zZXRQcm9ncmVzc1ZhbHVlKHByZyoxMDApLCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRpYWxvZy5hZGRJbmZvKFwiW0ZsYXNoXSBFcnJvcjogXCIgKyBlcnIsIFByb2dyZXNzTWVzc2FnZVR5cGUuRVJST1IpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5kaWFsb2cuYWRkSW5mbyhcIlRyeSB1bnBsdWdnaW5nIGFuZCByZXBsdWdnaW5nIHlvdXIgYm9hcmQuLi5cIiwgUHJvZ3Jlc3NNZXNzYWdlVHlwZS5FUlJPUik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdGhpcy5kaWFsb2cuc2hvd0Nsb3NlQnV0dG9uKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIGxldCBiaW4gPSBhd2FpdCB0aGlzLmdlbmVyYXRlQmluYXJ5KCk7XG4gICAgICAgICAgICBpZiggYmluICE9IG51bGwgKXtcbiAgICAgICAgICAgICAgICBzYXZlQXMoIG5ldyBCbG9iKCBbbmV3IElIZXgoQWN0aW9uRmxhc2guRkxBU0hfU1RBUlRfQUREUkVTUykucGFyc2VCaW4oYmluKV0gKSwgXCJmbGFzaC5oZXhcIiApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBnZW5lcmF0ZUJpbmFyeSgpIDogUHJvbWlzZTxVaW50OEFycmF5IHwgbnVsbD57XG4gICAgICAgIGxldCBmYXQgPSBuZXcgRmF0RlMoXCJQWUJGTEFTSFwiKTtcbiAgICAgICAgbGV0IGJhc2UgOiBBcnJheUJ1ZmZlcjtcblxuICAgICAgICB0cnl7XG4gICAgICAgICAgICBsZXQgZmlsZXMgOiBGYXRGaWxlW10gPSBhd2FpdCB0aGlzLnJlYWRGaWxlQXNKU09OKFwiYXNzZXRzL2ZhdC5qc29uXCIpOyAvL0pTT04ucGFyc2UoIGF3YWl0IHRoaXMucmVhZEZpbGVBc1RleHQoXCJhc3NldHMvZmF0Lmpzb25cIikpXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGZpbGVzLmZvckVhY2goIGFzeW5jIChmaWxlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYoZmlsZS5pc0JpbmFyeSlcbiAgICAgICAgICAgICAgICAgICAgZmF0LmFkZEJpbmFyeUZpbGUoZmlsZS5uYW1lLCBmaWxlLmV4dGVuc2lvbiwgYXdhaXQgdGhpcy5yZWFkRmlsZUFzQmluYXJ5KGZpbGUucGF0aCkgKVxuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgZmF0LmFkZEZpbGUoZmlsZS5uYW1lLCBmaWxlLmV4dGVuc2lvbiwgYXdhaXQgdGhpcy5yZWFkRmlsZUFzVGV4dChmaWxlLnBhdGgpKVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGJhc2UgPSBhd2FpdCB0aGlzLnJlYWRGaWxlQXNCaW5hcnkoXCJhc3NldHMvbWljcm9weXRob25fTDQ3NV92MS4xOF9QQURERUQuYmluXCIpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoKGU6IGFueSl7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiW0dFTkVSQVRFIEJJTkFSWV06IFwiLCBlKTtcbiAgICAgICAgICAgIG5ldyBBbGVydERpYWxvZyhcIkZhdGFsIGVycm9yXCIsIGBBbiBlcnJvciBvY2N1cmVkIGR1cmluZyB0aGUgaW1hZ2UgZ2VuZXJhdGlvbjogPGJyLz48ZGl2IGNsYXNzPVwiY2l0YXRpb24tZXJyb3JcIj4ke2UubWVzc2FnZX08L2Rpdj48YnIvPkNoZWNrIHlvdXIgaW50ZXJuZXQgY29ubmVjdGlvbiBvciByZXN0YXJ0IHlvdXIgYnJvd3Nlci5gLCBBbGVydERpYWxvZ0ljb24uRVJST1IpLm9wZW4oKTtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgZmF0LmFkZEZpbGUoXCJNQUlOXCIsIFwiUFlcIiwgdGhpcy5nZXRfc2NyaXB0X2NiKCkpO1xuXG4gICAgICAgIGxldCBmYXRfcGFydCA9IGZhdC5nZW5lcmF0ZV9iaW5hcnkoKTtcblxuICAgICAgICBsZXQgYmluX2ZpbGUgPSBuZXcgVWludDhBcnJheSggYmFzZS5ieXRlTGVuZ3RoICsgZmF0X3BhcnQubGVuZ3RoKTtcbiAgICAgICAgYmluX2ZpbGUuc2V0KG5ldyBVaW50OEFycmF5KGJhc2UpLCAwKTtcbiAgICAgICAgYmluX2ZpbGUuc2V0KG5ldyBVaW50OEFycmF5KGZhdF9wYXJ0KSwgYmFzZS5ieXRlTGVuZ3RoKTtcblxuICAgICAgICBjb25zb2xlLmxvZyhgQmluYXJ5IHNpemUgOiAgJHtiaW5fZmlsZS5ieXRlTGVuZ3RofSBieXRlc2ApXG5cbiAgICAgICAgcmV0dXJuIGJpbl9maWxlO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgcmVhZEZpbGVBc0pTT04oZmlsZTogc3RyaW5nKSA6IFByb21pc2U8YW55PiB7XG4gICAgICAgIGxldCByZXAgPSBhd2FpdCB0aGlzLmZldGNoTm9DYWNoZShmaWxlKTtcbiAgICAgICAgcmV0dXJuIHJlcC5qc29uKCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyByZWFkRmlsZUFzVGV4dChmaWxlOiBzdHJpbmcpIDogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICAgICAgbGV0IHJlcCA9IGF3YWl0IHRoaXMuZmV0Y2hOb0NhY2hlKGZpbGUpO1xuICAgICAgICByZXR1cm4gcmVwLnRleHQoKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHJlYWRGaWxlQXNCaW5hcnkoZmlsZTogc3RyaW5nKSA6IFByb21pc2U8VWludDhBcnJheT4ge1xuICAgICAgICBsZXQgcmVwID0gYXdhaXQgdGhpcy5mZXRjaE5vQ2FjaGUoZmlsZSk7XG4gICAgICAgIHJldHVybiBuZXcgVWludDhBcnJheSggYXdhaXQgcmVwLmFycmF5QnVmZmVyKCkpO1xuICAgIH1cblxuICAgIHByaXZhdGUgZmV0Y2hOb0NhY2hlKGZpbGU6IHN0cmluZywgbWV0aG9kOiBzdHJpbmcgPSBcIkdFVFwiKSA6IFByb21pc2U8UmVzcG9uc2U+e1xuICAgICAgICB2YXIgbXlIZWFkZXJzID0gbmV3IEhlYWRlcnMoKTtcbiAgICAgICAgbXlIZWFkZXJzLmFwcGVuZCgncHJhZ21hJywgJ25vLWNhY2hlJyk7XG4gICAgICAgIG15SGVhZGVycy5hcHBlbmQoJ2NhY2hlLWNvbnRyb2wnLCAnbm8tY2FjaGUnKTtcblxuICAgICAgICByZXR1cm4gZmV0Y2goZmlsZSwgeyBtZXRob2Q6IG1ldGhvZCwgaGVhZGVyczogbXlIZWFkZXJzIH0pO1xuICAgIH1cbn0iLCJpbXBvcnQgeyBBY3Rpb24gfSBmcm9tIFwiLi9hY3Rpb25cIjtcblxuZXhwb3J0IGNsYXNzIEFjdGlvbkxvYWQgaW1wbGVtZW50cyBBY3Rpb24ge1xuXG4gICAgcHJpdmF0ZSBmaWxlUmVhZGVyIDogRmlsZVJlYWRlcjtcbiAgICBwcml2YXRlIGZpbGVfaW5wdXQgOiBIVE1MSW5wdXRFbGVtZW50O1xuXG4gICAgY29uc3RydWN0b3IoIG9uRmlsZVJlYWRlZDogKGRhdGE6IHN0cmluZykgPT4gdm9pZCl7XG5cbiAgICAgICAgdGhpcy5maWxlUmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcblxuICAgICAgICBsZXQgZCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgIGQuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xuICAgICAgICBkLnN0eWxlLndpZHRoID0gXCIwcHhcIjtcbiAgICAgICAgZC5zdHlsZS5oZWlnaHQgPSBcIjBweFwiO1xuICAgICAgICBkLnN0eWxlLm92ZXJmbG93ID0gXCJoaWRkZW5cIjtcblxuICAgICAgICB0aGlzLmZpbGVfaW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW5wdXRcIik7XG4gICAgICAgIHRoaXMuZmlsZV9pbnB1dC50eXBlID0gXCJmaWxlXCI7XG4gICAgICAgIHRoaXMuZmlsZV9pbnB1dC5hY2NlcHQgPSBcIi5weVwiO1xuXG4gICAgICAgIGQuYXBwZW5kKHRoaXMuZmlsZV9pbnB1dCk7XG5cbiAgICAgICAgdGhpcy5maWxlX2lucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJpbnB1dFwiLCAoKSA9PiB0aGlzLm9wZW5GaWxlKCkpO1xuXG4gICAgICAgIHRoaXMuZmlsZVJlYWRlci5vbmxvYWQgPSAoKSA9PiBvbkZpbGVSZWFkZWQodGhpcy5maWxlUmVhZGVyLnJlc3VsdCBhcyBzdHJpbmcpO1xuICAgICAgICB0aGlzLmZpbGVSZWFkZXIub25lcnJvciA9IChldnQpID0+IGNvbnNvbGUuZXJyb3IoXCJGYWlsZWQgdG8gcmVhZCBmaWxlLlwiLCBldnQpO1xuICAgIH1cblxuICAgIG9wZW5GaWxlKCl7XG4gICAgICAgIHRoaXMuZmlsZVJlYWRlci5yZWFkQXNUZXh0KCh0aGlzLmZpbGVfaW5wdXQuZmlsZXMgYXMgRmlsZUxpc3QpWzBdLCBcIlVURi04XCIpO1xuICAgIH1cblxuICAgIGFzeW5jIHJ1bigpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICAgICAgdGhpcy5maWxlX2lucHV0LmNsaWNrKCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbn0iLCJpbXBvcnQgeyBHZXRTY3JpcHRDYWxsYmFjayB9IGZyb20gXCIuLi9jb21tb25cIjtcbmltcG9ydCB7IERhcExpbmtXcmFwcGVyIH0gZnJvbSBcIi4uL2RhcGxpbmtcIjtcbmltcG9ydCB7IFByb2dyZXNzRGlhbG9nLCBQcm9ncmVzc01lc3NhZ2VUeXBlIH0gZnJvbSBcIi4uL3Byb2dyZXNzX2RpYWxvZ1wiO1xuaW1wb3J0IHsgQWN0aW9uIH0gZnJvbSBcIi4vYWN0aW9uXCI7XG5cbmV4cG9ydCBjbGFzcyBBY3Rpb25SdW4gaW1wbGVtZW50cyBBY3Rpb257XG5cbiAgICBwcml2YXRlIGRhcGxpbms6IERhcExpbmtXcmFwcGVyO1xuICAgIHByaXZhdGUgZ2V0U2NyaXB0X2NiOiBHZXRTY3JpcHRDYWxsYmFjaztcbiAgICBwcml2YXRlIGRpYWxvZzogUHJvZ3Jlc3NEaWFsb2c7XG5cbiAgICBjb25zdHJ1Y3RvcihkYXBsaW5rIDogRGFwTGlua1dyYXBwZXIsIGdldFNjcmlwdDogR2V0U2NyaXB0Q2FsbGJhY2spe1xuICAgICAgICB0aGlzLmRhcGxpbmsgPSBkYXBsaW5rO1xuICAgICAgICB0aGlzLmdldFNjcmlwdF9jYiA9IGdldFNjcmlwdDtcbiAgICAgICAgdGhpcy5kaWFsb2cgPSBuZXcgUHJvZ3Jlc3NEaWFsb2coXCJSdW5uaW5nLi4uXCIpO1xuICAgIH1cblxuICAgIGFzeW5jIHJ1bigpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICAgICAgbGV0IGlzX2Vycm9yID0gZmFsc2U7XG5cbiAgICAgICAgdGhpcy5kaWFsb2cub3BlbigpO1xuICAgICAgICB0aGlzLmRpYWxvZy5hZGRJbmZvKFwiU2VuZGluZyBzY3JpcHQgdG8gdGFyZ2V0XCIpO1xuXG4gICAgICAgIGF3YWl0IHRoaXMuZGFwbGluay5ydW5TY3JpcHQoICAgdGhpcy5nZXRTY3JpcHRfY2IoKSwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKHByZ3MpID0+IHRoaXMuZGlhbG9nLnNldFByb2dyZXNzVmFsdWUocHJncyAqIDEwMCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRpYWxvZy5hZGRJbmZvKGVyciwgUHJvZ3Jlc3NNZXNzYWdlVHlwZS5FUlJPUik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzX2Vycm9yID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9ICk7XG5cbiAgICAgICAgaWYoIGlzX2Vycm9yICl7XG4gICAgICAgICAgICB0aGlzLmRpYWxvZy5zaG93Q2xvc2VCdXR0b24oKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgdGhpcy5kaWFsb2cuY2xvc2UoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbn0iLCJpbXBvcnQgeyBzYXZlQXMgfSBmcm9tIFwiZmlsZS1zYXZlclwiO1xuaW1wb3J0IHsgR2V0U2NyaXB0Q2FsbGJhY2sgfSBmcm9tIFwiLi4vY29tbW9uXCI7XG5pbXBvcnQgeyBBY3Rpb24gfSBmcm9tIFwiLi9hY3Rpb25cIjtcblxuZXhwb3J0IGNsYXNzIEFjdGlvblNhdmUgaW1wbGVtZW50cyBBY3Rpb257XG5cbiAgICBwcml2YXRlIGNiX2dldFNjcmlwdCA6IEdldFNjcmlwdENhbGxiYWNrO1xuXG4gICAgY29uc3RydWN0b3IoZ2V0U2NyaXB0OiBHZXRTY3JpcHRDYWxsYmFjayl7XG4gICAgICAgIHRoaXMuY2JfZ2V0U2NyaXB0ID0gZ2V0U2NyaXB0O1xuICAgIH1cblxuICAgIHNhdmVGaWxlKGZpbGVuYW1lOiBzdHJpbmcpe1xuICAgICAgICB2YXIgYmxvYiA9IG5ldyBCbG9iKFt0aGlzLmNiX2dldFNjcmlwdCgpXSwge3R5cGU6IFwidGV4dC9wbGFpbjtjaGFyc2V0PXV0Zi04XCJ9KTtcbiAgICAgICAgc2F2ZUFzKGJsb2IsIGZpbGVuYW1lKTtcbiAgICB9XG5cbiAgICBhc3luYyBydW4oKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgICAgIHRoaXMuc2F2ZUZpbGUoXCJtYWluLnB5XCIpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG59IiwiaW1wb3J0IHsgQWN0aW9uIH0gZnJvbSBcIi4vYWN0aW9uXCI7XG5cbmV4cG9ydCBjbGFzcyBBY3Rpb25TZXR0aW5ncyBpbXBsZW1lbnRzIEFjdGlvbiB7XG4gICAgY29uc3RydWN0b3IoKXtcblxuICAgIH1cblxuICAgIGFzeW5jIHJ1bigpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxufSIsImV4cG9ydCBlbnVtIEFsZXJ0RGlhbG9nSWNvbntcbiAgICBOT05FID0gXCJhbGVydC1kaWFsb2ctaWNvbi1ub25lXCIsXG4gICAgSU5GTyA9IFwiYWxlcnQtZGlhbG9nLWljb24taW5mb1wiLFxuICAgIFdBUk5JTkcgPSBcImFsZXJ0LWRpYWxvZy1pY29uLXdhcm5pbmdcIixcbiAgICBFUlJPUiA9IFwiYWxlcnQtZGlhbG9nLWljb24tZXJyb3JcIlxufVxuXG5leHBvcnQgY2xhc3MgQWxlcnREaWFsb2cge1xuXG4gICAgcHJpdmF0ZSBkaWFsb2c6IEhUTUxFbGVtZW50O1xuXG4gICAgY29uc3RydWN0b3IodGl0bGU/OiBzdHJpbmcsIHRleHQ/OiBzdHJpbmcsIGljb246IEFsZXJ0RGlhbG9nSWNvbiA9IEFsZXJ0RGlhbG9nSWNvbi5OT05FKXtcblxuICAgICAgICB0aGlzLmRpYWxvZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgIHRoaXMuZGlhbG9nLmNsYXNzTGlzdC5hZGQoXCJhbGVydC1kaWFsb2dcIik7XG4gICAgICAgIHRoaXMuZGlhbG9nLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcblxuICAgICAgICBsZXQgY29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgY29udGFpbmVyLmNsYXNzTGlzdC5hZGQoXCJhbGVydC1kaWFsb2ctY29udGFpbmVyXCIpXG5cbiAgICAgICAgbGV0IHRpdGxlX2VsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgdGl0bGVfZWwuY2xhc3NMaXN0LmFkZChcImFsZXJ0LWRpYWxvZy10aXRsZVwiLCBpY29uKTtcbiAgICAgICAgdGl0bGVfZWwuaW5uZXJUZXh0ID0gdGl0bGUgfHwgXCJcIjtcblxuICAgICAgICBsZXQgY29udGVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgIGNvbnRlbnQuY2xhc3NMaXN0LmFkZChcImFsZXJ0LWRpYWxvZy1jb250ZW50XCIpO1xuXG4gICAgICAgIGxldCB0ZXh0X2VsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInBcIik7XG4gICAgICAgIHRleHRfZWwuaW5uZXJIVE1MID0gdGV4dCB8fCBcIlwiO1xuXG4gICAgICAgIGxldCBjbG9zZV9idXR0b24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYnV0dG9uXCIpO1xuICAgICAgICBjbG9zZV9idXR0b24uY2xhc3NMaXN0LmFkZChcImFsZXJ0LWRpYWxvZy1jbG9zZS1idXR0b25cIik7XG4gICAgICAgIGNsb3NlX2J1dHRvbi5pbm5lclRleHQgPSBcIkNsb3NlXCI7XG4gICAgICAgIGNsb3NlX2J1dHRvbi5hZGRFdmVudExpc3RlbmVyKCBcImNsaWNrXCIsICgpID0+IHRoaXMuY2xvc2UoKSApO1xuXG4gICAgICAgIGNvbnRlbnQuYXBwZW5kKHRleHRfZWwpO1xuICAgICAgICBjb250ZW50LmFwcGVuZChjbG9zZV9idXR0b24pO1xuXG4gICAgICAgIGNvbnRhaW5lci5hcHBlbmQodGl0bGVfZWwpO1xuICAgICAgICBjb250YWluZXIuYXBwZW5kKGNvbnRlbnQpO1xuXG4gICAgICAgIHRoaXMuZGlhbG9nLmFwcGVuZChjb250YWluZXIpO1xuXG4gICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kKHRoaXMuZGlhbG9nKTtcbiAgICB9XG5cbiAgICBvcGVuKHRpdGxlPzogc3RyaW5nLCB0ZXh0Pzogc3RyaW5nLCBpY29uPzogQWxlcnREaWFsb2dJY29uKXtcbiAgICAgICAgaWYoIHRpdGxlICl7XG4gICAgICAgICAgICAodGhpcy5kaWFsb2cucXVlcnlTZWxlY3RvcihcIi5hbGVydC1kaWFsb2ctdGl0bGVcIikgYXMgSFRNTEVsZW1lbnQpLmlubmVySFRNTCA9IHRpdGxlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYoIHRleHQgKXtcbiAgICAgICAgICAgICh0aGlzLmRpYWxvZy5xdWVyeVNlbGVjdG9yKFwiLmFsZXJ0LWRpYWxvZy1jb250ZW50IHBcIikgYXMgSFRNTEVsZW1lbnQpLmlubmVySFRNTCA9IHRleHQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiggaWNvbiApe1xuICAgICAgICAgICAgbGV0IHRpdGxlX2VsID0gdGhpcy5kaWFsb2cucXVlcnlTZWxlY3RvcihcIi5hbGVydC1kaWFsb2ctdGl0bGVcIikgYXMgSFRNTEVsZW1lbnQ7XG4gICAgICAgICAgICB0aXRsZV9lbC5jbGFzc0xpc3QucmVtb3ZlKEFsZXJ0RGlhbG9nSWNvbi5OT05FLCBBbGVydERpYWxvZ0ljb24uSU5GTywgQWxlcnREaWFsb2dJY29uLldBUk5JTkcsIEFsZXJ0RGlhbG9nSWNvbi5FUlJPUik7XG4gICAgICAgICAgICB0aXRsZV9lbC5jbGFzc0xpc3QuYWRkKGljb24pO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5kaWFsb2cuc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjtcbiAgICB9XG5cbiAgICBjbG9zZSgpe1xuICAgICAgICB0aGlzLmRpYWxvZy5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XG4gICAgfVxuXG59OyIsImltcG9ydCB7IEJ1dHRvbiB9IGZyb20gXCIuL2J1dHRvbi9idXR0b25cIjtcbmltcG9ydCB7IEFjdGlvbkNvbm5lY3Rpb24gfSBmcm9tIFwiLi9hY3Rpb25zL2FjdGlvbl9jb25uZWN0aW9uXCI7XG5pbXBvcnQgeyBEYXBMaW5rV3JhcHBlciB9IGZyb20gXCIuL2RhcGxpbmtcIjtcbmltcG9ydCB7IEFjdGlvblJ1biB9IGZyb20gXCIuL2FjdGlvbnMvYWN0aW9uX3J1blwiO1xuaW1wb3J0IHsgU2VyaWFsT3V0cHV0IH0gZnJvbSBcIi4vc2VyaWFsT3V0cHV0XCI7XG5pbXBvcnQgeyBUd29QYW5lbENvbnRhaW5lciB9IGZyb20gXCIuL1R3b1BhbmVsQ29udGFpbmVyXCI7XG5pbXBvcnQgeyBBY3Rpb25TYXZlIH0gZnJvbSBcIi4vYWN0aW9ucy9hY3Rpb25fc2F2ZVwiO1xuaW1wb3J0IHsgQWN0aW9uTG9hZCB9IGZyb20gXCIuL2FjdGlvbnMvYWN0aW9uX2xvYWRcIjtcbmltcG9ydCB7IEFjdGlvbkZsYXNoIH0gZnJvbSBcIi4vYWN0aW9ucy9hY3Rpb25fZmxhc2hcIjtcbmltcG9ydCB7IFRvZ2dsZUJ1dHRvbiB9IGZyb20gXCIuL2J1dHRvbi9idXR0b25fdG9nZ2xlXCI7XG5pbXBvcnQgeyBBY3Rpb25TZXR0aW5ncyB9IGZyb20gXCIuL2FjdGlvbnMvYWN0aW9uX3NldHRpbmdzXCI7XG5pbXBvcnQgeyBCdXR0b25TcGFjZXIgfSBmcm9tIFwiLi9idXR0b24vYnV0dG9uU3BhY2VyXCI7XG5pbXBvcnQgeyBQbGFjZUhvbGRlckJ1dHRvbiB9IGZyb20gXCIuL2J1dHRvbi9idXR0b25fcGxhY2Vob2xkZXJcIjtcbmltcG9ydCB7IEdldFNjcmlwdENhbGxiYWNrLCBTZXRTY3JpcHRDYWxsYmFjayB9IGZyb20gXCIuL2NvbW1vblwiO1xuaW1wb3J0IHsgQnV0dG9uRHJvcGRvd24sIEJ1dHRvbkRyb3Bkb3duRWxlbWVudCB9IGZyb20gXCIuL2J1dHRvbi9idXR0b25fZHJvcGRvd25cIjtcbmltcG9ydCB7IEFsZXJ0RGlhbG9nLCBBbGVydERpYWxvZ0ljb24gfSBmcm9tIFwiLi9hbGVydF9kaWFsb2dcIjtcbmltcG9ydCB7IEFQUF9WRVJTSU9OIH0gZnJvbSBcIi4vdmVyc2lvblwiO1xuXG5leHBvcnQgY2xhc3MgQXBwbGljYXRpb257XG5cbiAgICBwcml2YXRlIHRvcF9jb250YWluZXIgOiBIVE1MRWxlbWVudCA9IDxIVE1MRWxlbWVudD5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInRvcF9jb250YWluZXJcIik7XG4gICAgcHJpdmF0ZSBsZWZ0X2NvbnRhaW5lciA6IEhUTUxFbGVtZW50ID0gPEhUTUxFbGVtZW50PmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibGVmdF9jb250YWluZXJcIik7XG4gICAgcHJpdmF0ZSByaWdodF9jb250YWluZXIgOiBIVE1MRWxlbWVudCA9IDxIVE1MRWxlbWVudD5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInJpZ2h0X2NvbnRhaW5lclwiKTtcbiAgICBwcml2YXRlIHNwYWNlcl9jb250YWluZXIgOiBIVE1MRWxlbWVudCA9IDxIVE1MRWxlbWVudD5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInNwYWNlcl9jb250YWluZXJcIik7XG5cblxuICAgIHByaXZhdGUgYnV0dG9uX3J1bj8gOiBCdXR0b247XG4gICAgcHJpdmF0ZSBidXR0b25fY29ubj86IFRvZ2dsZUJ1dHRvbjtcblxuICAgIHByaXZhdGUgZGFwTGlua1dyYXBwZXIgOiBEYXBMaW5rV3JhcHBlcjtcbiAgICBwcml2YXRlIHNlcmlhbF9vdXRwdXQgOiBTZXJpYWxPdXRwdXQ7XG5cblxuXG4gICAgY29uc3RydWN0b3IoZ2V0X3NjcmlwdDogR2V0U2NyaXB0Q2FsbGJhY2ssIHNldF9zY3JpcHQ6IFNldFNjcmlwdENhbGxiYWNrKXtcbiAgICAgICAgdGhpcy5kYXBMaW5rV3JhcHBlciA9IG5ldyBEYXBMaW5rV3JhcHBlcigpO1xuXG4gICAgICAgIHRoaXMuc2VyaWFsX291dHB1dCA9IG5ldyBTZXJpYWxPdXRwdXQodGhpcy5yaWdodF9jb250YWluZXIpO1xuICAgICAgICB0aGlzLmRhcExpbmtXcmFwcGVyLmFkZFJlaWNlaXZlZERhdGFMaXN0ZW5lciggKGRhdGEpID0+IHRoaXMuc2VyaWFsX291dHB1dC53cml0ZShkYXRhKSk7XG4gICAgICAgIHRoaXMuZGFwTGlua1dyYXBwZXIuYWRkQ29ubmVjdGlvbkNoYW5nZUxpc3RlbmVyKCBpc19jb25uZWN0ZWQgPT4gdGhpcy5vbkNvbm5lY3Rpb25DaGFuZ2UoaXNfY29ubmVjdGVkKSk7XG5cblxuICAgICAgICB0aGlzLnRvcE1lbnUoZ2V0X3NjcmlwdCwgc2V0X3NjcmlwdCk7XG5cblxuICAgICAgICB0aGlzLmJ1dHRvbl9ydW4/LmRpc2FibGUoKTtcblxuICAgICAgICBpZiggdGhpcy5kYXBMaW5rV3JhcHBlci5pc1dlYlVTQkF2YWlsYWJsZSgpICl7XG4gICAgICAgICAgICBuZXcgVHdvUGFuZWxDb250YWluZXIodGhpcy5sZWZ0X2NvbnRhaW5lciwgdGhpcy5zcGFjZXJfY29udGFpbmVyLCB0aGlzLnJpZ2h0X2NvbnRhaW5lcikuc2V0X3BhbmVsX3NpemUoZG9jdW1lbnQuYm9keS5jbGllbnRXaWR0aCAqIDAuNjYpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICBuZXcgVHdvUGFuZWxDb250YWluZXIodGhpcy5sZWZ0X2NvbnRhaW5lciwgdGhpcy5zcGFjZXJfY29udGFpbmVyLCB0aGlzLnJpZ2h0X2NvbnRhaW5lcikuaGlkZV9yaWdodF9wYW5lbCgpO1xuICAgICAgICB9XG4gICAgfVxuXG5cbiAgICBwcml2YXRlIHRvcE1lbnUoZ2V0X3NjcmlwdDogR2V0U2NyaXB0Q2FsbGJhY2ssIHNldF9zY3JpcHQ6IFNldFNjcmlwdENhbGxiYWNrKXtcblxuICAgICAgICBsZXQgYWN0X2Nvbm5lY3Rpb24gPSAgbmV3IEFjdGlvbkNvbm5lY3Rpb24odGhpcy5kYXBMaW5rV3JhcHBlcik7XG4gICAgICAgIGxldCBhY3RfcnVuID0gbmV3IEFjdGlvblJ1bih0aGlzLmRhcExpbmtXcmFwcGVyLCBnZXRfc2NyaXB0KTtcbiAgICAgICAgbGV0IGFjdF9mbGFzaCA9IG5ldyBBY3Rpb25GbGFzaCh0aGlzLmRhcExpbmtXcmFwcGVyLCB0aGlzLnNlcmlhbF9vdXRwdXQsIGdldF9zY3JpcHQpO1xuICAgICAgICBsZXQgYWN0X2xvYWQgPSBuZXcgQWN0aW9uTG9hZChzZXRfc2NyaXB0KTtcbiAgICAgICAgbGV0IGFjdF9zYXZlID0gbmV3IEFjdGlvblNhdmUoZ2V0X3NjcmlwdCk7XG4gICAgICAgIGxldCBhY3Rfc2V0dGluZ3MgPSBuZXcgQWN0aW9uU2V0dGluZ3MoKTtcblxuICAgICAgICBpZiggdGhpcy5kYXBMaW5rV3JhcHBlci5pc1dlYlVTQkF2YWlsYWJsZSgpICl7XG4gICAgICAgICAgICB0aGlzLmJ1dHRvbl9jb25uID0gbmV3IFRvZ2dsZUJ1dHRvbih0aGlzLnRvcF9jb250YWluZXIsIFwiaW1nL2Rpc2Nvbm5lY3QucG5nXCIsIFwiaW1nL2Nvbm5lY3QucG5nXCIsIGFjdF9jb25uZWN0aW9uLCBcIkNsaWNrIHRvIGNvbm5lY3RcIiwgXCJDbGljayB0byBkaXNjb25uZWN0XCIpO1xuICAgICAgICAgICAgdGhpcy5idXR0b25fcnVuID0gbmV3IEJ1dHRvbih0aGlzLnRvcF9jb250YWluZXIsIFwiaW1nL3BsYXkucG5nXCIsIGFjdF9ydW4sIFwiUnVuIHNjcmlwdCBvbiB0YXJnZXRcIik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIG5ldyBQbGFjZUhvbGRlckJ1dHRvbih0aGlzLnRvcF9jb250YWluZXIpOyAgLy8gQ29ubmVjdGlvbiBwbGFjZWhvbGRlclxuICAgICAgICAgICAgbmV3IFBsYWNlSG9sZGVyQnV0dG9uKHRoaXMudG9wX2NvbnRhaW5lcik7ICAvLyBQbGF5IHBsYWNlaG9sZGVyXG4gICAgICAgIH1cbiAgICAgICAgbmV3IEJ1dHRvbih0aGlzLnRvcF9jb250YWluZXIsIFwiaW1nL2ZsYXNoLnBuZ1wiLCBhY3RfZmxhc2gsIFwiRmxhc2ggb3IgRG93bmxvYWRcIik7XG5cbiAgICAgICAgbmV3IEJ1dHRvblNwYWNlcih0aGlzLnRvcF9jb250YWluZXIpO1xuXG4gICAgICAgIG5ldyBCdXR0b24odGhpcy50b3BfY29udGFpbmVyLCBcImltZy91cGxvYWQucG5nXCIsIGFjdF9sb2FkLCBcIkxvYWQgcHl0aG9uIGZpbGVcIik7XG4gICAgICAgIG5ldyBCdXR0b24odGhpcy50b3BfY29udGFpbmVyLCBcImltZy9kb3dubG9hZC5wbmdcIiwgYWN0X3NhdmUsIFwiU2F2ZSBweXRob24gZmlsZVwiKTtcblxuICAgICAgICBuZXcgQnV0dG9uU3BhY2VyKHRoaXMudG9wX2NvbnRhaW5lcik7XG5cbiAgICAgICAgbmV3IEJ1dHRvbkRyb3Bkb3duKHRoaXMudG9wX2NvbnRhaW5lciwgXCJpbWcvc2V0dGluZ3MucG5nXCIsIFsgbmV3IEJ1dHRvbkRyb3Bkb3duRWxlbWVudChcIkNsZWFyIGNvbnNvbGVcIiwgKCkgPT4ge3RoaXMuc2VyaWFsX291dHB1dC5jbGVhcigpfSwgXCJmMTIwXCIpLCBuZXcgQnV0dG9uRHJvcGRvd25FbGVtZW50KFwiRm9yY2UgdGFzayBzdG9wXCIsICgpID0+IHsgdGhpcy5kYXBMaW5rV3JhcHBlci5zZW5kS2V5Ym9hcmRJbnRlcnJ1cHQoKTsgfSwgXCJmNTRjXCIpLCBuZXcgQnV0dG9uRHJvcGRvd25FbGVtZW50KFwiQWJvdXRcIiwgKCkgPT4gdGhpcy5hYm91dCgpLCBcImYwNTlcIikgXSwgXCJTZXR0aW5nc1wiKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIG9uQ29ubmVjdGlvbkNoYW5nZShpc19jb25uZWN0ZWQ6IGJvb2xlYW4pe1xuICAgICAgICBpZihpc19jb25uZWN0ZWQpe1xuICAgICAgICAgICAgdGhpcy5idXR0b25fcnVuPy5lbmFibGUoKTtcbiAgICAgICAgICAgIHRoaXMuYnV0dG9uX2Nvbm4/LnNldEJ1dHRvblN0YXRlKGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgdGhpcy5idXR0b25fcnVuPy5kaXNhYmxlKCk7XG4gICAgICAgICAgICB0aGlzLmJ1dHRvbl9jb25uPy5zZXRCdXR0b25TdGF0ZSh0cnVlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYWJvdXQoKXtcbiAgICAgICAgbmV3IEFsZXJ0RGlhbG9nKFwiQWJvdXRcIiwgYFZlcnNpb246ICR7QVBQX1ZFUlNJT059YCwgQWxlcnREaWFsb2dJY29uLklORk8pLm9wZW4oKTtcbiAgICB9XG59XG5cbi8vIEB0cy1pZ25vcmVcbndpbmRvd1tcIkFwcGxpY2F0aW9uXCJdID0gQXBwbGljYXRpb247XG4vLyBAdHMtaWdub3JlXG53aW5kb3dbXCJBbGVydERpYWxvZ1wiXSA9IEFsZXJ0RGlhbG9nO1xuLy8gQHRzLWlnbm9yZVxud2luZG93W1wiQWxlcnREaWFsb2dJY29uXCJdID0gQWxlcnREaWFsb2dJY29uOyIsImltcG9ydCB7IEFjdGlvbiB9IGZyb20gXCIuLi9hY3Rpb25zL2FjdGlvblwiO1xuXG5leHBvcnQgY2xhc3MgQnV0dG9ue1xuXG4gICAgcHJvdGVjdGVkIGlzX2VuYWJsZTogYm9vbGVhbjtcbiAgICBwcm90ZWN0ZWQgYWN0aW9uOiBBY3Rpb247XG4gICAgcHJvdGVjdGVkIGJ1dHRvbjogSFRNTERpdkVsZW1lbnQ7XG4gICAgcHJvdGVjdGVkIGljb246IEhUTUxJbWFnZUVsZW1lbnQ7XG5cbiAgICBjb25zdHJ1Y3RvcihwYXJlbnQ6IEhUTUxFbGVtZW50LCBpY29uOiBzdHJpbmcsIGFjdGlvbjogQWN0aW9uLCB0aXRsZTogc3RyaW5nID0gXCJcIil7XG4gICAgICAgIHRoaXMuYnV0dG9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgdGhpcy5pY29uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImltZ1wiKTtcblxuICAgICAgICB0aGlzLmJ1dHRvbi5jbGFzc0xpc3QuYWRkKFwibWVudV9idXR0b25cIilcbiAgICAgICAgdGhpcy5idXR0b24udGl0bGUgPSB0aXRsZTtcblxuICAgICAgICB0aGlzLmFjdGlvbiA9IGFjdGlvbjtcbiAgICAgICAgdGhpcy5pc19lbmFibGUgPSB0cnVlO1xuICAgICAgICB0aGlzLmljb24uc3JjID0gaWNvbjtcbiAgICAgICAgdGhpcy5idXR0b24uYXBwZW5kKHRoaXMuaWNvbik7XG4gICAgICAgIHBhcmVudC5hcHBlbmQodGhpcy5idXR0b24pO1xuXG4gICAgICAgIHRoaXMuYnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLm9uQnV0dG9uQ2xpY2soKSk7XG4gICAgfVxuXG4gICAgZW5hYmxlKCl7XG4gICAgICAgIHRoaXMuYnV0dG9uLmNsYXNzTGlzdC5yZW1vdmUoXCJkaXNhYmxlXCIpO1xuICAgIH1cblxuICAgIGRpc2FibGUoKXtcbiAgICAgICAgdGhpcy5idXR0b24uY2xhc3NMaXN0LmFkZChcImRpc2FibGVcIik7XG4gICAgfVxuXG4gICAgaXNFbmFibGUoKXtcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNfZW5hYmxlO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBhc3luYyBvbkJ1dHRvbkNsaWNrKCl7XG4gICAgICAgIGlmKCB0aGlzLmlzX2VuYWJsZSApe1xuICAgICAgICAgICAgdGhpcy5hY3Rpb24ucnVuKCk7XG4gICAgICAgIH1cbiAgICB9XG59IiwiXG5leHBvcnQgY2xhc3MgQnV0dG9uU3BhY2Vye1xuICAgIGNvbnN0cnVjdG9yKHBhcmVudDogSFRNTEVsZW1lbnQpe1xuICAgICAgICBsZXQgYnV0dG9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgYnV0dG9uLmNsYXNzTGlzdC5hZGQoXCJtZW51X2J1dHRvbl9zcGFjZVwiKVxuICAgICAgICBwYXJlbnQuYXBwZW5kKGJ1dHRvbik7XG4gICAgfVxufSIsImltcG9ydCB7IEFjdGlvbiB9IGZyb20gXCIuLi9hY3Rpb25zL2FjdGlvblwiO1xuaW1wb3J0IHsgQWN0aW9uQ29ubmVjdGlvbiB9IGZyb20gXCIuLi9hY3Rpb25zL2FjdGlvbl9jb25uZWN0aW9uXCI7XG5pbXBvcnQgeyBCdXR0b24gfSBmcm9tIFwiLi9idXR0b25cIjtcblxuZXhwb3J0IGNsYXNzIEJ1dHRvbkRyb3Bkb3duRWxlbWVudCB7XG4gICAgLyoqXG4gICAgICogVGhlIGhleGFkZWNpbWFsIGZvbnQgYXdlc29tZSBpY29uXG4gICAgICovXG4gICAgaWNvbj86IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIFRleHQgc2hvdyBpbiBkcm9wZG93blxuICAgICAqL1xuICAgIG5hbWU6IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIEZ1bmN0aW9uIHRvIGV4ZWN1dGUgb24gY2xpY2tcbiAgICAgKi9cbiAgICBmY3Q6ICgpID0+IHZvaWQ7XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0gbmFtZSBUZXh0IHNob3cgaW4gZHJvcGRvd25cbiAgICAgKiBAcGFyYW0gZmN0IEZ1bmN0aW9uIHRvIGV4ZWN1dGUgb24gY2xpY2tcbiAgICAgKiBAcGFyYW0gaWNvbiBbb3B0aW9ubmFsXSBUaGUgaGV4YWRlY2ltYWwgZm9udCBhd2Vzb21lIGljb25cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihuYW1lOiBzdHJpbmcsIGZjdDogKCkgPT4gdm9pZCwgaWNvbj86IHN0cmluZyl7XG4gICAgICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgICAgIHRoaXMuZmN0ID0gZmN0O1xuICAgICAgICB0aGlzLmljb24gPSBpY29uO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIEJ1dHRvbkRyb3Bkb3duIGV4dGVuZHMgQnV0dG9uIHtcbiAgICBwcml2YXRlIGRyb3Bkb3duOiBIVE1MRGl2RWxlbWVudDtcblxuICAgIGNvbnN0cnVjdG9yKHBhcmVudDogSFRNTEVsZW1lbnQsIGljb246IHN0cmluZywgZHJvcGRvd25FbGVtZW50czogQnV0dG9uRHJvcGRvd25FbGVtZW50W10sIHRpdGxlOiBzdHJpbmcgPSBcIlwiKXtcbiAgICAgICAgbGV0IGFjdGlvbjogQWN0aW9uID0geyBcbiAgICAgICAgICAgIHJ1bjogYXN5bmMgKCkgPT4gdGhpcy5pbnRlcm5hbEFjdGlvbigpIFxuICAgICAgICB9O1xuXG4gICAgICAgIHN1cGVyKHBhcmVudCwgaWNvbiwgYWN0aW9uLCB0aXRsZSk7XG5cbiAgICAgICAgbGV0IGJ1dHRvbl9ib3VuZHMgPSB0aGlzLmJ1dHRvbi5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblxuICAgICAgICB0aGlzLmRyb3Bkb3duID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgdGhpcy5kcm9wZG93bi5jbGFzc0xpc3QuYWRkKFwibWVudV9idXR0b25fZHJvcGRvd25cIik7XG4gICAgICAgIHRoaXMuZHJvcGRvd24uc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xuICAgICAgICB0aGlzLmRyb3Bkb3duLnN0eWxlLnRvcCA9IGJ1dHRvbl9ib3VuZHMudG9wICsgNCArIGJ1dHRvbl9ib3VuZHMuaGVpZ2h0ICsgXCJweFwiO1xuICAgICAgICB0aGlzLmRyb3Bkb3duLnN0eWxlLmxlZnQgPSBidXR0b25fYm91bmRzLmxlZnQgKyBcInB4XCI7XG5cbiAgICAgICAgdGhpcy5wb3B1bGF0ZURvcnBkb3duKGRyb3Bkb3duRWxlbWVudHMpO1xuXG4gICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kKHRoaXMuZHJvcGRvd24pO1xuICAgICAgICBkb2N1bWVudC5ib2R5LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIiwgKGV2dCkgPT4gdGhpcy5jbGlja19vdXRzaWRlKGV2dCkgKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGludGVybmFsQWN0aW9uKCkge1xuXG4gICAgICAgIGlmKCB0aGlzLmRyb3Bkb3duLnN0eWxlLmRpc3BsYXkgPT0gXCJub25lXCIgKXtcbiAgICAgICAgICAgIHRoaXMuZHJvcGRvd24uc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjtcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgdGhpcy5kcm9wZG93bi5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGNsaWNrX291dHNpZGUoZXZlbnQ6IGFueSl7XG5cbiAgICAgICAgaWYoIChldmVudC5wYXRoIGFzIFtdKS5maW5kSW5kZXgoICh2YWx1ZSkgPT4gdmFsdWUgPT0gdGhpcy5idXR0b24gfHwgdmFsdWUgPT0gdGhpcy5kcm9wZG93biApID09IC0xICl7XG4gICAgICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIHBvcHVsYXRlRG9ycGRvd24oaXRlbXM6IEJ1dHRvbkRyb3Bkb3duRWxlbWVudFtdKXtcbiAgICAgICAgaXRlbXMuZm9yRWFjaCggKGl0ZW0pID0+IHtcblxuICAgICAgICAgICAgbGV0IGVudHJ5ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInBcIik7XG5cbiAgICAgICAgICAgIGlmKCBpdGVtLmljb24gKXtcbiAgICAgICAgICAgICAgICBlbnRyeS5pbm5lckhUTUwgPSBgPHNwYW4gY2xhc3M9XCJmYVwiPiYjeCR7aXRlbS5pY29ufTs8L3NwYW4+YFxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBlbnRyeS5pbm5lckhUTUwgKz0gaXRlbS5uYW1lO1xuXG4gICAgICAgICAgICBlbnRyeS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4geyB0aGlzLmNsb3NlKCk7IGl0ZW0uZmN0KCk7ICB9ICk7XG5cbiAgICAgICAgICAgIHRoaXMuZHJvcGRvd24uYXBwZW5kKGVudHJ5KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBjbG9zZSgpe1xuICAgICAgICB0aGlzLmRyb3Bkb3duLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcbiAgICB9XG59OyIsImltcG9ydCB7IEJ1dHRvbiB9IGZyb20gXCIuL2J1dHRvblwiXG5cbmV4cG9ydCBjbGFzcyBQbGFjZUhvbGRlckJ1dHRvbiBleHRlbmRzIEJ1dHRvbntcblxuICAgIGNvbnN0cnVjdG9yKHBhcmVudDogSFRNTEVsZW1lbnQpe1xuICAgICAgICBzdXBlcihwYXJlbnQsIFwiXCIsIHtydW46IGFzeW5jICgpID0+IHRydWV9KTtcbiAgICAgICAgdGhpcy5idXR0b24uc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xuICAgICAgICB0aGlzLmJ1dHRvbi5zdHlsZS53aWR0aCA9IFwiMFwiO1xuICAgICAgICB0aGlzLmJ1dHRvbi5zdHlsZS5oZWlnaHQgPSBcIjBcIjtcbiAgICB9XG59IiwiaW1wb3J0IHsgQWN0aW9uIH0gZnJvbSBcIi4uL2FjdGlvbnMvYWN0aW9uXCI7XG5pbXBvcnQgeyBCdXR0b24gfSBmcm9tIFwiLi9idXR0b25cIlxuXG5leHBvcnQgY2xhc3MgVG9nZ2xlQnV0dG9uIGV4dGVuZHMgQnV0dG9ue1xuXG4gICAgcHJpdmF0ZSBsb2NrX2J1dHRvbl9zdGF0ZSA9IGZhbHNlO1xuICAgIHByaXZhdGUgaXNfQV9zaG93ID0gdHJ1ZTtcbiAgICBwcml2YXRlIGljb25BOiBzdHJpbmc7XG4gICAgcHJpdmF0ZSBpY29uQjogc3RyaW5nO1xuICAgIHByaXZhdGUgdGl0bGVBOiBzdHJpbmc7XG4gICAgcHJpdmF0ZSB0aXRsZUI6IHN0cmluZztcblxuICAgIGNvbnN0cnVjdG9yKHBhcmVudDogSFRNTEVsZW1lbnQsIGljb25BOiBzdHJpbmcsIGljb25COiBzdHJpbmcsIGFjdGlvbjogQWN0aW9uLCB0aXRsZUE6IHN0cmluZyA9IFwiXCIsIHRpdGxlQiA6IHN0cmluZyA9IFwiXCIpe1xuICAgICAgICBzdXBlcihwYXJlbnQsIGljb25BLCBhY3Rpb24pO1xuXG4gICAgICAgIHRoaXMuaWNvbkEgPSBpY29uQTtcbiAgICAgICAgdGhpcy5pY29uQiA9IGljb25CO1xuICAgICAgICB0aGlzLnRpdGxlQSA9IHRpdGxlQTtcbiAgICAgICAgdGhpcy50aXRsZUIgPSB0aXRsZUI7XG4gICAgfVxuXG4gICAgc2V0QnV0dG9uU3RhdGUoc2hvd19kZWZhdWx0OiBib29sZWFuKXtcbiAgICAgICAgaWYoIHRoaXMubG9ja19idXR0b25fc3RhdGUgKXsgcmV0dXJuOyB9XG4gICAgICAgIHRoaXMuaW50ZXJuYWxfc2V0QnV0dG9uU3RhdGUoc2hvd19kZWZhdWx0KTtcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgYXN5bmMgb25CdXR0b25DbGljaygpe1xuICAgICAgICBpZiggISB0aGlzLmlzX2VuYWJsZSApeyByZXR1cm47IH1cblxuICAgICAgICB0aGlzLmxvY2tfYnV0dG9uX3N0YXRlID0gdHJ1ZTtcbiAgICAgICAgaWYoIGF3YWl0IHRoaXMuYWN0aW9uLnJ1bigpICl7IFxuICAgICAgICAgICAgdGhpcy5pbnRlcm5hbF9zZXRCdXR0b25TdGF0ZSghdGhpcy5pc19BX3Nob3cpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMubG9ja19idXR0b25fc3RhdGUgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGludGVybmFsX3NldEJ1dHRvblN0YXRlKHNob3dfQTogYm9vbGVhbil7XG4gICAgICAgIGlmKCBzaG93X0EgKXtcbiAgICAgICAgICAgIHRoaXMuYnV0dG9uLnRpdGxlID0gdGhpcy50aXRsZUE7XG4gICAgICAgICAgICB0aGlzLmljb24uc3JjID0gdGhpcy5pY29uQTtcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgdGhpcy5idXR0b24udGl0bGUgPSB0aGlzLnRpdGxlQjtcbiAgICAgICAgICAgIHRoaXMuaWNvbi5zcmMgPSB0aGlzLmljb25CO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5pc19BX3Nob3cgPSBzaG93X0E7XG4gICAgfVxufSIsImV4cG9ydCB0eXBlIEdldFNjcmlwdENhbGxiYWNrID0gKCkgPT4gc3RyaW5nO1xuZXhwb3J0IHR5cGUgU2V0U2NyaXB0Q2FsbGJhY2sgPSAoc2NyaXB0OiBzdHJpbmcpID0+IHZvaWQ7XG5leHBvcnQgdHlwZSBPblByb2dyZXNzQ2FsbGJhY2sgPSAocHJvZ3Jlc3M6IG51bWJlcikgPT4gdm9pZDtcbmV4cG9ydCB0eXBlIE9uRXJyb3JDYWxsYmFjayA9IChlcnJvcjogc3RyaW5nKSA9PiB2b2lkO1xuZXhwb3J0IHR5cGUgT25Db25uZWN0aW9uQ2hhbmdlQ2FsbGJhY2sgPSAoaXNfY29ubmVjdGVkOiBib29sZWFuKSA9PiB2b2lkO1xuXG5cbmV4cG9ydCBmdW5jdGlvbiBwcmludF9oZXhfZGF0YSggdmFsdWVzIDogbnVtYmVyW10gKXtcblxuICAgIGxldCBzdHIgPSBcIlwiO1xuXG4gICAgdmFsdWVzLmZvckVhY2goICh2YWx1ZSwgaWR4KSA9PiB7XG5cbiAgICAgICAgc3RyICs9IHRvSGV4U3RyaW5nKHZhbHVlLCAyKTtcblxuICAgICAgICBpZiggKGlkeCArIDEpICUgNCA9PSAwKXtcbiAgICAgICAgICAgIHN0ciArPSBcIiBcIjtcbiAgICAgICAgfVxuXG4gICAgfSk7XG5cbiAgICBjb25zb2xlLmxvZyhzdHIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdG9IZXhTdHJpbmcodmFsdWU6IG51bWJlciwgbmJfZGlnaXQ6IG51bWJlciApIDogc3RyaW5ne1xuICAgIGxldCBzID0gdmFsdWUudG9TdHJpbmcoMTYpLnRvVXBwZXJDYXNlKCk7XG5cbiAgICBpZiggcy5sZW5ndGggPiBuYl9kaWdpdCApXG4gICAgICAgIGNvbnNvbGUud2FybihgW1RSVU5DQVRFIFdBUk5dIDogTmVlZCB0byByZXByZXNlbnQgJHtzfSBvbiAke25iX2RpZ2l0fSBkaWdpdHMuLi5gKTtcblxuICAgIHJldHVybiBcIjBcIi5yZXBlYXQoIE1hdGgubWF4KDAsIG5iX2RpZ2l0IC0gcy5sZW5ndGgpICkgKyBzO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gd2FpdChtczogbnVtYmVyKTogUHJvbWlzZTx2b2lkPntcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZSggKHJlc29sdmUpID0+IHtcbiAgICAgICAgc2V0VGltZW91dCggKCkgPT4gcmVzb2x2ZSgpLCBtcyk7XG4gICAgfSk7XG59XG4iLCJpbXBvcnQgKiBhcyBEQVBqcyBmcm9tIFwiZGFwanNcIjtcbmltcG9ydCB7IEFsZXJ0RGlhbG9nLCBBbGVydERpYWxvZ0ljb24gfSBmcm9tIFwiLi9hbGVydF9kaWFsb2dcIjtcbmltcG9ydCB7IE9uQ29ubmVjdGlvbkNoYW5nZUNhbGxiYWNrLCBPbkVycm9yQ2FsbGJhY2ssIE9uUHJvZ3Jlc3NDYWxsYmFjaywgd2FpdCB9IGZyb20gXCIuL2NvbW1vblwiO1xuXG5leHBvcnQgY2xhc3MgRGFwTGlua1dyYXBwZXIge1xuXG4gICAgc3RhdGljIHJlYWRvbmx5IExFTkdUSF9TRVJJQUxfQlVGRkVSIDogbnVtYmVyID0gMzA7XG5cbiAgICBwcml2YXRlIGlzX3dlYnVzYl9hdmFpbGFibGU6IGJvb2xlYW47XG4gICAgcHJpdmF0ZSBkZXZpY2U/OiBVU0JEZXZpY2UgPSB1bmRlZmluZWQ7XG4gICAgcHJpdmF0ZSB0cmFuc3BvcnQ/IDogREFQanMuV2ViVVNCID0gdW5kZWZpbmVkO1xuICAgIHByaXZhdGUgdGFyZ2V0PyA6IERBUGpzLkRBUExpbmsgPSB1bmRlZmluZWQ7XG5cbiAgICBwcml2YXRlIGNiX29uUmVjZWl2ZURhdGEgOiBBcnJheTwoZGF0YTogc3RyaW5nKSA9PiB2b2lkPiA9IFtdO1xuICAgIHByaXZhdGUgc2VyaWFsX2J1ZmZlciA6IHN0cmluZyA9IFwiXCI7XG4gICAgcHJpdmF0ZSBvbkNvbm5lY3Rpb25DaGFuZ2VfY2I6IE9uQ29ubmVjdGlvbkNoYW5nZUNhbGxiYWNrW10gPSBbXTtcblxuICAgIGNvbnN0cnVjdG9yKCl7XG4gICAgICAgIGlmKCBuYXZpZ2F0b3IudXNiICl7XG4gICAgICAgICAgICBuYXZpZ2F0b3IudXNiLmFkZEV2ZW50TGlzdGVuZXIoJ2Rpc2Nvbm5lY3QnLCBldmVudCA9PiB7XG4gICAgICAgICAgICAgICAgaWYoIHRoaXMuaXNDb25uZWN0ZWQoKSApe1xuICAgICAgICAgICAgICAgICAgICBpZih0aGlzLmRldmljZT8uc2VyaWFsTnVtYmVyID09IGV2ZW50LmRldmljZS5zZXJpYWxOdW1iZXIpe1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5kaXNjb25uZWN0KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdGhpcy5pc193ZWJ1c2JfYXZhaWxhYmxlID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgdGhpcy5pc193ZWJ1c2JfYXZhaWxhYmxlID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpc1dlYlVTQkF2YWlsYWJsZSgpe1xuICAgICAgICByZXR1cm4gdGhpcy5pc193ZWJ1c2JfYXZhaWxhYmxlO1xuICAgIH1cblxuICAgIGFkZFJlaWNlaXZlZERhdGFMaXN0ZW5lciAoIGNiIDogKGRhdGE6IHN0cmluZykgPT4gdm9pZCApe1xuICAgICAgICB0aGlzLmNiX29uUmVjZWl2ZURhdGEucHVzaChjYik7XG4gICAgfVxuXG4gICAgYXN5bmMgY29ubmVjdCgpIDogUHJvbWlzZTxib29sZWFuPntcbiAgICAgICAgaWYoICEgdGhpcy5pc0Nvbm5lY3RlZCgpICl7XG4gICAgICAgICAgICBpZighdGhpcy5pc193ZWJ1c2JfYXZhaWxhYmxlIHx8ICEgYXdhaXQgdGhpcy5jcmVhdGVUYXJnZXQoKSApe1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGF3YWl0IHRoaXMudGFyZ2V0Py5zZXJpYWxXcml0ZShTdHJpbmcuZnJvbUNoYXJDb2RlKDEpKTsgLy8gW0N0cmwrQV0gZW50ZXIgcmF3IG1vZGUgKFJFUEwgUHl0aG9uKVxuICAgICAgICB0aGlzLnRhcmdldD8uc3RhcnRTZXJpYWxSZWFkKCk7XG4gICAgICAgIHRoaXMuY2FsbE9uQ29ubmVjdGlvbkNoYW5nZUNhbGxiYWNrcyh0cnVlKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgYXN5bmMgZGlzY29ubmVjdCgpIDogUHJvbWlzZTxib29sZWFuPntcbiAgICAgICAgaWYoICEgdGhpcy5pc0Nvbm5lY3RlZCgpICl7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnRhcmdldD8uc3RvcFNlcmlhbFJlYWQoKTtcblxuICAgICAgICB0cnl7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnRhcmdldD8uZGlzY29ubmVjdCgpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoKGUpe31cblxuICAgICAgICB0aGlzLnRhcmdldCA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy50cmFuc3BvcnQgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMuZGV2aWNlID0gdW5kZWZpbmVkO1xuXG4gICAgICAgIHRoaXMuZmx1c2hTZXJpYWwoKTtcbiAgICAgICAgdGhpcy5jYWxsT25Db25uZWN0aW9uQ2hhbmdlQ2FsbGJhY2tzKGZhbHNlKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgYXN5bmMgcnVuU2NyaXB0KHNjcmlwdDogc3RyaW5nLCBvbl9wcm9ncmVzczogT25Qcm9ncmVzc0NhbGxiYWNrLCBvbl9lcnJvcjogT25FcnJvckNhbGxiYWNrKXtcbiAgICAgICAgXG4gICAgICAgIGlmKCAhYXdhaXQgdGhpcy5jb25uZWN0KCkgKXtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGF3YWl0IHRoaXMuc2VuZFNjcmlwdChzY3JpcHQgKyBcIlxcblxcblxcblwiLCBvbl9wcm9ncmVzcywgb25fZXJyb3IpO1xuICAgIH1cblxuICAgIGFzeW5jIGZsYXNoTWFpbihzY3JpcHQ6IHN0cmluZywgb25fcHJvZ3Jlc3MgOiBPblByb2dyZXNzQ2FsbGJhY2ssIG9uX2Vycm9yOiBPbkVycm9yQ2FsbGJhY2spe1xuXG4gICAgICAgIGxldCBiaW5fZGF0YSA9IG5ldyBUZXh0RW5jb2RlcigpLmVuY29kZShzY3JpcHQpO1xuICAgICAgICBsZXQgcHJvZyA9IFwicHJvZz1bXCI7XG4gICAgICAgIFxuICAgICAgICBsZXQgcGFydF9sZW5ndGggPSA0MDtcbiAgICAgICAgbGV0IG5iX3BhcnQgPSBNYXRoLmNlaWwoYmluX2RhdGEubGVuZ3RoIC8gcGFydF9sZW5ndGgpO1xuXG4gICAgICAgIG9uX3Byb2dyZXNzKDApO1xuICAgICAgICBcbiAgICAgICAgZm9yKCBsZXQgaSA9IDA7IGkgPCBuYl9wYXJ0OyArK2kgKXtcbiAgICAgICAgICAgIHByb2cgKz0gYmluX2RhdGEuc2xpY2UoaSAqIHBhcnRfbGVuZ3RoLCAoaSsxKSAqIHBhcnRfbGVuZ3RoKS5qb2luKFwiLFwiKTtcbiAgICAgICAgICAgIHByb2cgKz0gXCIsXFxuXCJcbiAgICAgICAgfVxuXG4gICAgICAgIHByb2cgKz0gXCJdXFxuXCI7XG5cbiAgICAgICAgbGV0IG1haW4gPSAgcHJvZyArXG4gICAgICAgICAgICAgICAgICAgIGB3aXRoIG9wZW4oXCJtYWluLnB5XCIsIFwid2JcIikgYXMgZjpcXG5gICtcbiAgICAgICAgICAgICAgICAgICAgYFxcdGYud3JpdGUoYnl0ZWFycmF5KHByb2cpKVxcbmAgKyBcbiAgICAgICAgICAgICAgICAgICAgXCJcXG5cIlxuICAgICAgICAgICAgICAgICAgICBcIlxcblwiXG4gICAgICAgICAgICAgICAgICAgIFwiXFxuXCI7XG5cbiAgICAgICAgYXdhaXQgdGhpcy5zZW5kU2NyaXB0KG1haW4sIG9uX3Byb2dyZXNzLCBvbl9lcnJvcik7XG4gICAgICAgIGF3YWl0IHRoaXMudGFyZ2V0Py5zZXJpYWxXcml0ZShTdHJpbmcuZnJvbUNoYXJDb2RlKDIpKTsgLy8gW0N0cmwrQl0gZXhpdCByYXcgbW9kZSAoUkVQTCBQeXRob24pXG4gICAgICAgIGF3YWl0IHRoaXMudGFyZ2V0Py5zZXJpYWxXcml0ZShTdHJpbmcuZnJvbUNoYXJDb2RlKDQpKTsgLy8gW0N0cmwrRF0gU29mdCByZXNldCAoUkVQTCBQeXRob24pXG5cbiAgICAgICAgb25fcHJvZ3Jlc3MoMSk7XG4gICAgfVxuXG4gICAgaXNDb25uZWN0ZWQoKSA6IGJvb2xlYW57XG4gICAgICAgIHJldHVybiB0aGlzLnRhcmdldCAhPSB1bmRlZmluZWQgJiYgdGhpcy50YXJnZXQuY29ubmVjdGVkO1xuICAgIH1cblxuICAgIGFzeW5jIGZsYXNoKGhleDogVWludDhBcnJheSwgb25fcHJvZ3Jlc3MgOiBPblByb2dyZXNzQ2FsbGJhY2ssIG9uX2Vycm9yOiBPbkVycm9yQ2FsbGJhY2spIDogUHJvbWlzZTx2b2lkPntcbiAgICAgICAgaWYoICF0aGlzLmlzQ29ubmVjdGVkKCkgKXsgcmV0dXJuOyB9XG5cbiAgICAgICAgdGhpcy50YXJnZXQ/Lm9uKERBUGpzLkRBUExpbmsuRVZFTlRfUFJPR1JFU1MsIHByb2dyZXNzID0+IG9uX3Byb2dyZXNzKHByb2dyZXNzKSApO1xuXG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMudGFyZ2V0Py5zdG9wU2VyaWFsUmVhZCgpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy50YXJnZXQ/LnJlc2V0KCk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnRhcmdldD8uZmxhc2goaGV4KTtcbiAgICAgICAgICAgIGF3YWl0IHdhaXQoMTAwMCk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnRhcmdldD8ucmVzZXQoKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaChlOiBhbnkpe1xuICAgICAgICAgICAgY29uc29sZS53YXJuKFwiW0ZMQVNIXTogXCIsIGUpO1xuICAgICAgICAgICAgb25fZXJyb3IoZS5tZXNzYWdlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMudGFyZ2V0Py5vbihEQVBqcy5EQVBMaW5rLkVWRU5UX1BST0dSRVNTLCBwcm9ncmVzcyA9PiB7fSApO1xuICAgIH1cblxuICAgIGFzeW5jIGlzTWljcm9weXRob25PblRhcmdldCgpe1xuICAgICAgICBpZiggIXRoaXMuaXNDb25uZWN0ZWQoKSApeyByZXR1cm47IH1cblxuICAgICAgICB0cnl7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnRhcmdldD8uc2VyaWFsV3JpdGUoU3RyaW5nLmZyb21DaGFyQ29kZSgzKSk7IC8vIFtDdHJsK0NdXG4gICAgICAgICAgICBhd2FpdCB3YWl0KDIwMDApO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy50YXJnZXQ/LnNlcmlhbFdyaXRlKFN0cmluZy5mcm9tQ2hhckNvZGUoNCkpOyAvLyBbQ3RybCtEXVxuXG4gICAgICAgICAgICBsZXQgcmVhZCA6IHN0cmluZyA9ICBuZXcgVGV4dERlY29kZXIoKS5kZWNvZGUoIGF3YWl0IHRoaXMudGFyZ2V0Py5zZXJpYWxSZWFkKCkgKTtcbiAgICAgICAgICAgIGF3YWl0IHdhaXQoMjAwMCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiAocmVhZC5pbmRleE9mKFwiTVBZXCIpICE9IC0xKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaChlOiBhbnkpe1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIltJU19NSUNST1BZVEhPTl9PTl9UQVJHRVRdOiBcIiwgZSk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhZGRDb25uZWN0aW9uQ2hhbmdlTGlzdGVuZXIoY2I6IE9uQ29ubmVjdGlvbkNoYW5nZUNhbGxiYWNrKTogdm9pZHtcbiAgICAgICAgdGhpcy5vbkNvbm5lY3Rpb25DaGFuZ2VfY2IucHVzaChjYik7XG4gICAgfVxuXG4gICAgYXN5bmMgc2VuZEtleWJvYXJkSW50ZXJydXB0KCl7XG4gICAgICAgIGlmKCAhdGhpcy5pc0Nvbm5lY3RlZCgpICl7IHJldHVybjsgfVxuXG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMudGFyZ2V0Py5zZXJpYWxXcml0ZShTdHJpbmcuZnJvbUNoYXJDb2RlKDMpKTsgLy8gW0N0cmwrQ11cbiAgICAgICAgICAgIGF3YWl0IHdhaXQoMTAwMCk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2goZTogYW55KXtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJbU0VORF9LRVlCT0FSRF9JTlRFUlJVUFRdOiBcIiwgZSk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGNhbGxPbkNvbm5lY3Rpb25DaGFuZ2VDYWxsYmFja3MoaXNfY29ubmVjdGVkOiBib29sZWFuKXtcbiAgICAgICAgdGhpcy5vbkNvbm5lY3Rpb25DaGFuZ2VfY2IuZm9yRWFjaCggY2IgPT4gY2IoaXNfY29ubmVjdGVkKSApO1xuICAgIH1cblxuXG4gICAgcHJpdmF0ZSBhc3luYyBzZW5kU2NyaXB0KHNjcmlwdDogc3RyaW5nLCBvbl9wcm9ncmVzcz86IE9uUHJvZ3Jlc3NDYWxsYmFjaywgb25fZXJyb3I/OiBPbkVycm9yQ2FsbGJhY2sgKXtcblxuICAgICAgICBpZiggIXRoaXMuaXNDb25uZWN0ZWQoKSApeyByZXR1cm47IH1cbiAgICAgICAgaWYoIHNjcmlwdC5sZW5ndGggPT0gMCApeyByZXR1cm47IH1cblxuICAgICAgICBsZXQgZmluYWxfc2NyaXB0ID0gYGRlZiBfX3NlbmRfc2NyaXB0X2V4ZWN1dGlvbl9fKCk6XFxuXFx0YCArIHNjcmlwdC5yZXBsYWNlKC9cXG4vZywgXCJcXG5cXHRcIikgKyBcIlxcblxcblwiO1xuXG4gICAgICAgIGxldCBjaHVua3MgPSBmaW5hbF9zY3JpcHQubWF0Y2gobmV3IFJlZ0V4cCgnW1xcXFxzXFxcXFNdezEsJyArIERhcExpbmtXcmFwcGVyLkxFTkdUSF9TRVJJQUxfQlVGRkVSICsgJ30nLCAnZycpKSB8fCBbXTtcblxuICAgICAgICB0cnl7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnRhcmdldD8uc2VyaWFsV3JpdGUoU3RyaW5nLmZyb21DaGFyQ29kZSgzKSk7IC8vIFtDdHJsK0NdXG4gICAgICAgICAgICBhd2FpdCB3YWl0KDIwMDApO1xuXG4gICAgICAgICAgICB0aGlzLmZsdXNoU2VyaWFsKCk7XG5cbiAgICAgICAgICAgIGF3YWl0IHRoaXMudGFyZ2V0Py5zZXJpYWxXcml0ZShTdHJpbmcuZnJvbUNoYXJDb2RlKDEpKTsgLy8gW0N0cmwrQV0gZW50ZXIgcmF3IG1vZGUgKFJFUEwgUHl0aG9uKVxuICAgICAgICAgICAgYXdhaXQgd2FpdCgyNTApO1xuXG4gICAgICAgICAgICBmb3IobGV0IGkgPSAwOyBpIDwgY2h1bmtzLmxlbmd0aDsgKytpICl7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy50YXJnZXQ/LnNlcmlhbFdyaXRlKGNodW5rc1tpXSk7XG4gICAgICAgICAgICAgICAgYXdhaXQgd2FpdCgxMCk7XG5cbiAgICAgICAgICAgICAgICBpZihvbl9wcm9ncmVzcyAhPSB1bmRlZmluZWQpe1xuICAgICAgICAgICAgICAgICAgICBvbl9wcm9ncmVzcyggaSAvIGNodW5rcy5sZW5ndGggKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGF3YWl0IHRoaXMudGFyZ2V0Py5zZXJpYWxXcml0ZSggXCJ0cnk6XFxuXCIpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy50YXJnZXQ/LnNlcmlhbFdyaXRlKCAgICAgXCJcXHRfX3NlbmRfc2NyaXB0X2V4ZWN1dGlvbl9fKClcXG5cIik7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnRhcmdldD8uc2VyaWFsV3JpdGUoIFwiZXhjZXB0IEtleWJvYXJkSW50ZXJydXB0OlxcblwiKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMudGFyZ2V0Py5zZXJpYWxXcml0ZSggICAgIFwiXFx0cHJpbnQoXFxcIi0tSU5URVJSVVBUIFJVTk5JTkcgUFJPR1JBTS0tXFxcIilcXG5cXG5cIik7XG5cbiAgICAgICAgICAgIGF3YWl0IHRoaXMudGFyZ2V0Py5zZXJpYWxXcml0ZShTdHJpbmcuZnJvbUNoYXJDb2RlKDQpKTsgLy8gW0N0cmwrRF0gRXhlY3V0ZSBweXRob24gY29kZSAoUkVQTCBQeXRob24pXG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2goZTogYW55KXtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihcIltTRU5EIFNDUklQVF06IFwiLCBlKTtcbiAgICAgICAgICAgIGlmKG9uX2Vycm9yKXsgb25fZXJyb3IoZS5tZXNzYWdlKTsgfVxuICAgICAgICB9XG5cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGNyZWF0ZVRhcmdldCgpIDogUHJvbWlzZTxib29sZWFuPiB7XG5cbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgdGhpcy5kZXZpY2UgPSBhd2FpdCBuYXZpZ2F0b3IudXNiLnJlcXVlc3REZXZpY2Uoe1xuICAgICAgICAgICAgICAgIGZpbHRlcnM6IFt7dmVuZG9ySWQ6IDB4MEQyOH1dXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaChlOiBhbnkpe1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGUpO1xuXG4gICAgICAgICAgICBpZiggZS5tZXNzYWdlLmluZGV4T2YoXCJObyBkZXZpY2Ugc2VsZWN0ZWRcIikgPT0gLTEgKXtcbiAgICAgICAgICAgICAgICBuZXcgQWxlcnREaWFsb2coXCJXZWJVU0IgRXJyb3JcIiwgYEFuIGVycm9yIG9jY3VyZWQgd2l0aCB0aGUgV2ViVVNCOiA8YnIvPjxkaXYgY2xhc3M9XCJjaXRhdGlvbi1lcnJvclwiPiR7ZS5tZXNzYWdlfTwvZGl2Pjxici8+VHJ5IHVucGx1Z2dpbmcgYW5kIHJlcGx1Z2dpbmcgeW91ciBib2FyZCBvciByZXN0YXJ0IHlvdXIgYnJvd3Nlci48YnIvPjxici8+PGk+Tm90ZTogV2ViVVNCIGlzIGV4cGVyaW1lbnRhbCBhbmQgb25seSBzdXBwb3J0IG9uIGNocm9tZSBiYXNlZCBicm93c2VyIChjaHJvbWUsIGNocm9taXVtLCBicmF2ZSwgZWRnZSwgZXRjKTwvaT5gLCBBbGVydERpYWxvZ0ljb24uRVJST1IpLm9wZW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMudHJhbnNwb3J0ID0gbmV3IERBUGpzLldlYlVTQih0aGlzLmRldmljZSk7XG4gICAgICAgIHRoaXMudGFyZ2V0ID0gbmV3IERBUGpzLkRBUExpbmsodGhpcy50cmFuc3BvcnQpO1xuICAgICAgICBcbiAgICAgICAgdGhpcy50YXJnZXQub24oREFQanMuREFQTGluay5FVkVOVF9TRVJJQUxfREFUQSwgZGF0YSA9PiB0aGlzLm9uRXZlbnRTZXJpYWxEYXRhKGRhdGEpICk7XG5cbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgYXdhaXQgdGhpcy50YXJnZXQuY29ubmVjdCgpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy50YXJnZXQuc2V0U2VyaWFsQmF1ZHJhdGUoMTE1MjAwKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaChlOiBhbnkpe1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGUpO1xuICAgICAgICAgICAgbmV3IEFsZXJ0RGlhbG9nKFwiQ29ubmVjdGlvbiBmYWlsZWRcIiwgYEFuIGVycm9yIG9jY3VyZWQgZHVyaW5nIHRoZSBjb25uZWN0aW9uOiA8YnIvPjxkaXYgY2xhc3M9XCJjaXRhdGlvbi1lcnJvclwiPiR7ZS5tZXNzYWdlfTwvZGl2Pjxici8+VHJ5IHVucGx1Z2dpbmcgYW5kIHJlcGx1Z2dpbmcgeW91ciBib2FyZC4uLmAsIEFsZXJ0RGlhbG9nSWNvbi5FUlJPUikub3BlbigpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBmbHVzaFNlcmlhbCgpe1xuICAgICAgICBpZiggdGhpcy5zZXJpYWxfYnVmZmVyLmxlbmd0aCA+IDAgKXtcbiAgICAgICAgICAgIHRoaXMuc2VyaWFsX2J1ZmZlciA9IFwiXCI7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIG9uRXZlbnRTZXJpYWxEYXRhKGRhdGE6IHN0cmluZyl7XG4gICAgICAgIGxldCBzcGxpdHMgPSBkYXRhLnNwbGl0KC8oPzw9XFxuKS8pOyAvLyBTcGxpdCBidXQga2VlcCB0aGUgJ1xcbidcblxuICAgICAgICBzcGxpdHMuZm9yRWFjaCggKHNwbGl0KSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNlcmlhbF9idWZmZXIgKz0gc3BsaXQ7XG5cbiAgICAgICAgICAgIGlmKCBzcGxpdC5hdCgtMSkgPT0gJ1xcbicgKXtcbiAgICAgICAgICAgICAgICB0aGlzLmNhbGxPblJlY2VpdmVDYWxsYmFja3MoIHRoaXMuY2xlYW5TdHJpbmcodGhpcy5zZXJpYWxfYnVmZmVyKSApO1xuICAgICAgICAgICAgICAgIHRoaXMuc2VyaWFsX2J1ZmZlciA9IFwiXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgY2FsbE9uUmVjZWl2ZUNhbGxiYWNrcyhkYXRhOiBzdHJpbmcpe1xuICAgICAgICB0aGlzLmNiX29uUmVjZWl2ZURhdGEuZm9yRWFjaCggKGNiKSA9PiB7XG4gICAgICAgICAgICBjYihkYXRhKTtcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBwcml2YXRlIGNsZWFuU3RyaW5nKHN0cjogc3RyaW5nKTogc3RyaW5ne1xuICAgICAgICByZXR1cm4gICBzdHIucmVwbGFjZSgvXFx4MDRcXHgwNC9nLCBcIlwiKVxuICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFw+T0tbXFx4MDRcXD5dKi9nLCBcIlwiKVxuICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFw+XFw+XFw+WyBcXHJcXG5dKi9nLCBcIlwiKVxuXG4gICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9bXFw+XFxyXFxuXSpyYXcgUkVQTDsgQ1RSTC1CIHRvIGV4aXRbXFxyXFxuXSovZywgXCJcIilcbiAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1R5cGUgXCJoZWxwXFwoXFwpXCIgZm9yIG1vcmUgaW5mb3JtYXRpb24uW1xcclxcbl0qL2csIFwiXCIpXG4gICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9NaWNyb1B5dGhvbiBbXFxzXFxTXSpcXG4kL2csIFwiXCIpO1xuICAgIH1cbn0iLCJleHBvcnQgY2xhc3MgSUhleCB7XG5cbiAgICBwcml2YXRlIGJhc2VfYWRkcmVzczogbnVtYmVyO1xuXG4gICAgY29uc3RydWN0b3IoYmFzZV9hZGRyZXNzOiBudW1iZXIpe1xuICAgICAgICB0aGlzLmJhc2VfYWRkcmVzcyA9IGJhc2VfYWRkcmVzcztcbiAgICB9XG5cbiAgICBwYXJzZUJpbihiaW5fZmlsZTogVWludDhBcnJheSl7XG4gICAgICAgIGxldCBpaGV4ID0gdGhpcy5hZGRyZXNzTGluZSh0aGlzLmJhc2VfYWRkcmVzcyk7XG4gICAgICAgIGxldCBuYl9saW5lcyA9IE1hdGguY2VpbChiaW5fZmlsZS5sZW5ndGggLyAxNik7IC8vIDE2IG9jdGVjdHMgcGFyIGRhdGEgbGluZVxuICAgICAgICBsZXQgb2Zmc2V0ID0gMDtcbiAgICAgICAgbGV0IHBlbmRpbmdfYWRkcmVzc19saW5lID0gXCJcIjtcblxuICAgICAgICBmb3IobGV0IGkgPSAwOyBpIDwgbmJfbGluZXM7IGkrKyApe1xuICAgICAgICAgICAgbGV0IGNyYyA9IDB4MTA7XG4gICAgICAgICAgICBsZXQgcGFydCA9IGJpbl9maWxlLnNsaWNlKGkgKiAxNiwgKGkrMSkgKiAxNik7XG4gICAgICAgICAgICBsZXQgYWRkcmVzcyA9IGkqMTY7XG4gICAgICAgICAgICBsZXQgbGluZSA9IGA6JHt0aGlzLnRvSGV4U3RyaW5nKHBhcnQubGVuZ3RoLCAyKX1gO1xuXG4gICAgICAgICAgICAvLyBUaGUgYWRkcmVzcyBvdmVyZmxvdyB0aGUgMTYgYml0cyA/XG4gICAgICAgICAgICBpZiggYWRkcmVzcyAtIG9mZnNldCA+IDB4RkZGRiApe1xuICAgICAgICAgICAgICAgIG9mZnNldCArPSAweDEwMDAwXG4gICAgICAgICAgICAgICAgcGVuZGluZ19hZGRyZXNzX2xpbmUgPSB0aGlzLmFkZHJlc3NMaW5lKHRoaXMuYmFzZV9hZGRyZXNzICsgb2Zmc2V0KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQWRkcmVzc1xuICAgICAgICAgICAgbGluZSArPSB0aGlzLnRvSGV4U3RyaW5nKGFkZHJlc3MgLSBvZmZzZXQsIDQpO1xuICAgICAgICAgICAgY3JjICs9ICgoYWRkcmVzcyAtIG9mZnNldCkgJiAweEZGMDApID4+IDggO1xuICAgICAgICAgICAgY3JjICs9IChhZGRyZXNzIC0gb2Zmc2V0KSAmIDB4MDBGRjtcblxuICAgICAgICAgICAgLy8gRmllbGRcbiAgICAgICAgICAgIGxpbmUgKz0gXCIwMFwiO1xuICAgICAgICAgICAgY3JjICs9IDB4MDA7XG5cbiAgICAgICAgICAgIC8vIERhdGFcbiAgICAgICAgICAgIGxldCBpc19kYXRhX29ubHlfRkYgPSB0cnVlO1xuICAgICAgICAgICAgcGFydC5mb3JFYWNoKCAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICBsaW5lICs9IHRoaXMudG9IZXhTdHJpbmcodmFsdWUsIDIpO1xuICAgICAgICAgICAgICAgIGNyYyArPSB2YWx1ZTtcblxuICAgICAgICAgICAgICAgIGlmKCB2YWx1ZSAhPSAweEZGICl7IGlzX2RhdGFfb25seV9GRiA9IGZhbHNlOyB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gaWYgZGF0YSBhcmUgb25seSBGRiBhbmQgb2Zmc2V0IDwgMHgwODA4XzAwMDAgKGFkZHJlc3Mgb2YgRkFUIGZpbGVzeXN0ZW0pXG4gICAgICAgICAgICBpZiggaXNfZGF0YV9vbmx5X0ZGICYmIG9mZnNldCA8IDB4MDgwODAwMDAwICl7IGNvbnRpbnVlOyB9XG5cbiAgICAgICAgICAgIC8vIENoZWNrc3VtXG4gICAgICAgICAgICBsaW5lICs9IHRoaXMuY29tcHV0ZUNSQyhjcmMpO1xuXG4gICAgICAgICAgICAvLyBJZiB3ZSBhcmUgd2FpbnRpbmcgdG8gcHJpbnQgYWRkcmVzcyBsaW5lLCBkbyBpdCBiZWZvcmUgYWRkIGRhdGEgbGluZVxuICAgICAgICAgICAgaWYoIHBlbmRpbmdfYWRkcmVzc19saW5lLmxlbmd0aCA+IDAgKXtcbiAgICAgICAgICAgICAgICBpaGV4ICs9IHBlbmRpbmdfYWRkcmVzc19saW5lO1xuICAgICAgICAgICAgICAgIHBlbmRpbmdfYWRkcmVzc19saW5lID0gXCJcIjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQWRkIGxpbmVcbiAgICAgICAgICAgIGloZXggKz0gYCR7bGluZX1cXG5gXG4gICAgICAgIH1cblxuICAgICAgICBpaGV4ICs9IFwiOjAwMDAwMDAxRkZcXG5cIjtcblxuICAgICAgICBjb25zb2xlLmxvZyhgaUhleCBzaXplIDogICR7aWhleC5sZW5ndGh9IGJ5dGVzYClcblxuICAgICAgICByZXR1cm4gaWhleDtcbiAgICB9XG5cbiAgICBwcml2YXRlIG9mZnNldExpbmUoIG9mZnNldDogbnVtYmVyICl7XG4gICAgICAgIGxldCBzaGlmdF9hZGRyID0gKG9mZnNldCAmIDB4RkZGRjAwMDApID4+IDQ7XG4gICAgICAgIHJldHVybiBgOjAyMDAwMDAyJHt0aGlzLnRvSGV4U3RyaW5nKHNoaWZ0X2FkZHIsIDQpfSR7dGhpcy5jb21wdXRlQ1JDKCAweDA0ICsgKChzaGlmdF9hZGRyICYgMHhGRjAwKSA+PiA4KSArIChzaGlmdF9hZGRyICYgMHgwMEZGKSApfVxcbmA7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhZGRyZXNzTGluZSggbWVtb3J5X2FkZHJlc3M6IG51bWJlciApe1xuICAgICAgICBsZXQgc2hpZnRfYWRkciA9IChtZW1vcnlfYWRkcmVzcyAmIDB4RkZGRjAwMDApID4+IDE2O1xuICAgICAgICByZXR1cm4gYDowMjAwMDAwNCR7dGhpcy50b0hleFN0cmluZyhzaGlmdF9hZGRyLCA0KX0ke3RoaXMuY29tcHV0ZUNSQyggMHgwNiArICgoc2hpZnRfYWRkciAmIDB4RkYwMCkgPj4gOCkgKyAoc2hpZnRfYWRkciAmIDB4MDBGRikgKX1cXG5gO1xuICAgIH1cblxuICAgIHByaXZhdGUgY29tcHV0ZUNSQyhzdW06IG51bWJlcik6IHN0cmluZ3tcbiAgICAgICAgcmV0dXJuIHRoaXMudG9IZXhTdHJpbmcoICh+KHN1bSAmIDB4RkYpICsgMSkgJiAweEZGLCAyKVxuICAgIH1cblxuICAgIHByaXZhdGUgdG9IZXhTdHJpbmcodmFsdWU6IG51bWJlciwgbmJfZGlnaXQ6IG51bWJlciApIDogc3RyaW5ne1xuICAgICAgICBsZXQgcyA9IHZhbHVlLnRvU3RyaW5nKDE2KS50b1VwcGVyQ2FzZSgpO1xuXG4gICAgICAgIGlmKCBzLmxlbmd0aCA+IG5iX2RpZ2l0IClcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgW1RSVU5DQVRFIFdBUk5dIDogTmVlZCB0byByZXByZXNlbnQgJHtzfSBvbiAke25iX2RpZ2l0fSBkaWdpdHMuLi5gKTtcblxuICAgICAgICByZXR1cm4gXCIwXCIucmVwZWF0KCBNYXRoLm1heCgwLCBuYl9kaWdpdCAtIHMubGVuZ3RoKSApICsgcztcbiAgICB9XG59IiwiaW1wb3J0IHsgRmF0QlBCIH0gZnJvbSBcIi4vZmF0X0JQQlwiXG5pbXBvcnQgeyBGYXRSb290RGlyZWN0b3J5LCBGaWxlQXR0cmlidXRlIH0gZnJvbSBcIi4vZmF0X3Jvb3REaXJcIjtcbmltcG9ydCB7IEZhdFRhYmxlIH0gZnJvbSBcIi4vZmF0X3RhYmxlXCI7XG5cbmV4cG9ydCBjbGFzcyBGYXRGUyB7XG4gICAgcHJpdmF0ZSBCUEI6IEZhdEJQQjtcbiAgICBwcml2YXRlIHRhYmxlOiBGYXRUYWJsZTtcbiAgICBwcml2YXRlIHJvb3Q6IEZhdFJvb3REaXJlY3Rvcnk7XG5cbiAgICBjb25zdHJ1Y3Rvcih2b2x1bWVfbmFtZTogc3RyaW5nKXtcbiAgICAgICAgdGhpcy5CUEIgPSBuZXcgRmF0QlBCKCk7XG4gICAgICAgIHRoaXMuY29uc3RydWN0X3BicCgpO1xuXG4gICAgICAgIHRoaXMudGFibGUgPSBuZXcgRmF0VGFibGUodGhpcy5CUEIpO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5yb290ID0gbmV3IEZhdFJvb3REaXJlY3RvcnkodGhpcy5CUEIsIHRoaXMudGFibGUsIHZvbHVtZV9uYW1lKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGNvbnN0cnVjdF9wYnAoKXtcbiAgICAgICAgdGhpcy5CUEIuanVtcF9pbnN0ID0gMHg5MEZFRUI7XG4gICAgICAgIHRoaXMuQlBCLm9lbV9uYW1lID0gXCJNU0RPUzUuMFwiO1xuICAgICAgICB0aGlzLkJQQi5zZWN0b3Jfc2l6ZSA9IDUxMjtcbiAgICAgICAgdGhpcy5CUEIuY2x1c3Rlcl9zaXplID0gMTtcbiAgICAgICAgdGhpcy5CUEIucmVzZXJ2ZWRfc2VjdG9ycyA9IDE7XG4gICAgICAgIHRoaXMuQlBCLmZhdHNfbnVtYmVyID0gMTtcbiAgICAgICAgdGhpcy5CUEIucm9vdF9kaXJfc2l6ZSA9IDUxMjtcbiAgICAgICAgdGhpcy5CUEIudG90YWxfc2VjdG9ycyA9IDEwMjQ7XG4gICAgICAgIHRoaXMuQlBCLmRpc2tfdHlwZSA9IDB4Rjg7XG4gICAgICAgIHRoaXMuQlBCLmZhdF9zaXplID0gNDtcbiAgICAgICAgdGhpcy5CUEIuc2VjdG9yc19wZXJfdHJhY2sgPSA2MztcbiAgICAgICAgdGhpcy5CUEIuaGVhZHNfbnVtYmVyID0gMjU1O1xuICAgICAgICB0aGlzLkJQQi5oaWRkZW5fc2VjdG9ycyA9IDI1NjtcbiAgICAgICAgdGhpcy5CUEIudG90YWxfMzJiaXRzX3NlY3RvcnMgPSAwO1xuXG4gICAgICAgIHRoaXMuQlBCLmRpc2tfaWRlbnRpZmllciA9IDB4ODA7XG4gICAgICAgIHRoaXMuQlBCLnNpZ25hdHVyZSA9IDB4Mjk7XG4gICAgICAgIHRoaXMuQlBCLmRpc2tfc2VyaWFsID0gMHg0NjIxMDAwMDtcbiAgICAgICAgdGhpcy5CUEIuZGlza19uYW1lID0gXCJOTyBOQU1FXCI7XG4gICAgICAgIHRoaXMuQlBCLmZpbGVfc3lzdGVtX3R5cGUgPSBcIkZBVFwiO1xuXG4gICAgICAgIHRoaXMuQlBCLnBoeXNpY2FsX2RyaXZlX251bWJlciA9IDA7XG4gICAgICAgIHRoaXMuQlBCLmJvb3Rfc2VjdG9yX3NpZ25hdHVyZSA9IDB4QUE1NTtcbiAgICB9XG5cblxuICAgIGFkZEZpbGUoZmlsZW5hbWU6IHN0cmluZywgZXh0ZW5zaW9uOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZyl7XG4gICAgICAgIGxldCBlbmMgPSBuZXcgVGV4dEVuY29kZXIoKTtcbiAgICAgICAgdGhpcy5yb290LmFkZEZpbGUoZmlsZW5hbWUsIGV4dGVuc2lvbiwgRmlsZUF0dHJpYnV0ZS5BUkNISVZFLCBlbmMuZW5jb2RlKGNvbnRlbnQpKTtcbiAgICB9XG5cbiAgICBhZGRCaW5hcnlGaWxlKGZpbGVuYW1lOiBzdHJpbmcsIGV4dGVuc2lvbjogc3RyaW5nLCBjb250ZW50OiBVaW50OEFycmF5KXtcbiAgICAgICAgdGhpcy5yb290LmFkZEZpbGUoZmlsZW5hbWUsIGV4dGVuc2lvbiwgRmlsZUF0dHJpYnV0ZS5BUkNISVZFLCBjb250ZW50KTtcbiAgICB9XG5cbiAgICBnZW5lcmF0ZV9iaW5hcnkoKXtcbiAgICAgICAgcmV0dXJuICAgICAgICAgIHRoaXMuQlBCLmdlbmVyYXRlQlBCKClcbiAgICAgICAgICAgICAgICAuY29uY2F0KHRoaXMudGFibGUuZ2VuZXJhdGVUYWJsZSgpKVxuICAgICAgICAgICAgICAgIC5jb25jYXQodGhpcy5yb290LmdlbmVyYXRlUm9vdERpcmVjdG9yeSgpKTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBGYXRVdGlscyB9IGZyb20gXCIuL2ZhdF9jb21tb25cIjtcblxuZXhwb3J0IGNsYXNzIEZhdEJQQiB7XG5cbiAgICBqdW1wX2luc3Q6IG51bWJlciA9IDA7XG4gICAgb2VtX25hbWU6IHN0cmluZyA9IFwiXCI7XG4gICAgc2VjdG9yX3NpemU6IG51bWJlciA9IDA7XG4gICAgY2x1c3Rlcl9zaXplOiBudW1iZXIgPSAwO1xuICAgIHJlc2VydmVkX3NlY3RvcnM6IG51bWJlciA9IDA7XG4gICAgZmF0c19udW1iZXI6IG51bWJlciA9IDA7XG4gICAgcm9vdF9kaXJfc2l6ZTogbnVtYmVyID0gMDtcbiAgICB0b3RhbF9zZWN0b3JzOiBudW1iZXIgPSAwO1xuICAgIGRpc2tfdHlwZTogbnVtYmVyID0gMDtcbiAgICBmYXRfc2l6ZTogbnVtYmVyID0gMDtcbiAgICBzZWN0b3JzX3Blcl90cmFjazogbnVtYmVyID0gMDtcbiAgICBoZWFkc19udW1iZXI6IG51bWJlciA9IDA7XG4gICAgaGlkZGVuX3NlY3RvcnM6IG51bWJlciA9IDA7XG4gICAgdG90YWxfMzJiaXRzX3NlY3RvcnM6IG51bWJlciA9IDA7XG5cbiAgICBkaXNrX2lkZW50aWZpZXI6IG51bWJlciA9IDA7XG4gICAgc2lnbmF0dXJlOiBudW1iZXIgPSAwO1xuICAgIGRpc2tfc2VyaWFsOiBudW1iZXIgPSAwO1xuICAgIGRpc2tfbmFtZTogc3RyaW5nID0gXCJcIjtcbiAgICBmaWxlX3N5c3RlbV90eXBlOiBzdHJpbmcgPSBcIlwiO1xuXG4gICAgcGh5c2ljYWxfZHJpdmVfbnVtYmVyOiBudW1iZXIgPSAwO1xuICAgIGJvb3Rfc2VjdG9yX3NpZ25hdHVyZTogbnVtYmVyID0gMDtcblxuICAgIGNvbnN0cnVjdG9yKCl7fVxuXG4gICAgZ2VuZXJhdGVCUEIoKSA6IG51bWJlcltdIHtcbiAgICAgICAgcmV0dXJuICAgICAgICAgIEZhdFV0aWxzLmNvbnZlcnRUb0hleCh0aGlzLmp1bXBfaW5zdCwgMylcbiAgICAgICAgICAgICAgICAuY29uY2F0KEZhdFV0aWxzLmNvbnZlcnRTdHJpbmcodGhpcy5vZW1fbmFtZSwgOCkpXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0VG9IZXgodGhpcy5zZWN0b3Jfc2l6ZSwgMikpXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0VG9IZXgodGhpcy5jbHVzdGVyX3NpemUsIDEpKVxuICAgICAgICAgICAgICAgIC5jb25jYXQoRmF0VXRpbHMuY29udmVydFRvSGV4KHRoaXMucmVzZXJ2ZWRfc2VjdG9ycywgMikpXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0VG9IZXgodGhpcy5mYXRzX251bWJlciwgMSkpXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0VG9IZXgodGhpcy5yb290X2Rpcl9zaXplLCAyKSlcbiAgICAgICAgICAgICAgICAuY29uY2F0KEZhdFV0aWxzLmNvbnZlcnRUb0hleCh0aGlzLnRvdGFsX3NlY3RvcnMsIDIpKVxuICAgICAgICAgICAgICAgIC5jb25jYXQoRmF0VXRpbHMuY29udmVydFRvSGV4KHRoaXMuZGlza190eXBlLCAxKSlcbiAgICAgICAgICAgICAgICAuY29uY2F0KEZhdFV0aWxzLmNvbnZlcnRUb0hleCh0aGlzLmZhdF9zaXplLCAyKSlcbiAgICAgICAgICAgICAgICAuY29uY2F0KEZhdFV0aWxzLmNvbnZlcnRUb0hleCh0aGlzLnNlY3RvcnNfcGVyX3RyYWNrLCAyKSlcbiAgICAgICAgICAgICAgICAuY29uY2F0KEZhdFV0aWxzLmNvbnZlcnRUb0hleCh0aGlzLmhlYWRzX251bWJlciwgMikpXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0VG9IZXgodGhpcy5oaWRkZW5fc2VjdG9ycywgNCkpXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0VG9IZXgodGhpcy50b3RhbF8zMmJpdHNfc2VjdG9ycywgNCkpXG5cbiAgICAgICAgICAgICAgICAuY29uY2F0KEZhdFV0aWxzLmNvbnZlcnRUb0hleCh0aGlzLmRpc2tfaWRlbnRpZmllciwgMSkpXG4gICAgICAgICAgICAgICAgLmNvbmNhdChbMHgwMV0pXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0VG9IZXgodGhpcy5zaWduYXR1cmUsIDEpKVxuICAgICAgICAgICAgICAgIC5jb25jYXQoRmF0VXRpbHMuY29udmVydFRvSGV4KHRoaXMuZGlza19zZXJpYWwsIDQpKVxuICAgICAgICAgICAgICAgIC5jb25jYXQoRmF0VXRpbHMuY29udmVydFN0cmluZyh0aGlzLmRpc2tfbmFtZSwgMTEpKVxuICAgICAgICAgICAgICAgIC5jb25jYXQoRmF0VXRpbHMuY29udmVydFN0cmluZyh0aGlzLmZpbGVfc3lzdGVtX3R5cGUsIDgpKVxuICAgICAgICAgICAgICAgIC5jb25jYXQoRmF0VXRpbHMuY29udmVydFRvSGV4KCAwLCA0NDcpKVxuICAgICAgICAgICAgICAgIC5jb25jYXQoRmF0VXRpbHMuY29udmVydFRvSGV4KHRoaXMucGh5c2ljYWxfZHJpdmVfbnVtYmVyLCAxKSlcbiAgICAgICAgICAgICAgICAuY29uY2F0KEZhdFV0aWxzLmNvbnZlcnRUb0hleCh0aGlzLmJvb3Rfc2VjdG9yX3NpZ25hdHVyZSwgMikpO1xuICAgIH1cbn0iLCJleHBvcnQgY2xhc3MgRmF0VXRpbHMge1xuICAgIHN0YXRpYyBjb252ZXJ0U3RyaW5nKHN0cjogU3RyaW5nLCBmaWVsZF9zaXplOiBudW1iZXIpOiBudW1iZXJbXXtcbiAgICAgICAgbGV0IHJlcyA6IG51bWJlcltdID0gW107XG5cbiAgICAgICAgZm9yKGxldCBpID0gMDsgaSA8IGZpZWxkX3NpemU7ICsraSl7XG4gICAgICAgICAgICByZXNbaV0gPSAoaSA+PSBzdHIubGVuZ3RoKSA/IDB4MjAgOiBzdHIuY2hhckNvZGVBdChpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxuXG4gICAgc3RhdGljIGNvbnZlcnRUb0hleChudW06IG51bWJlciwgZmllbGRfc2l6ZTogbnVtYmVyKSA6IG51bWJlcltde1xuICAgICAgICBsZXQgcmVzIDogbnVtYmVyW10gPSBbXTtcblxuICAgICAgICBmb3IobGV0IGkgPSAwOyBpIDwgZmllbGRfc2l6ZTsgKytpKXtcbiAgICAgICAgICAgIGxldCBzaGlmdCA9IDggKiBpO1xuICAgICAgICAgICAgcmVzW2ldID0gKCBudW0gPj4gc2hpZnQgKSAmIDB4MDBGRlxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG59IiwiaW1wb3J0IHsgRmF0QlBCIH0gZnJvbSBcIi4vZmF0X0JQQlwiO1xuaW1wb3J0IHsgRmF0VXRpbHMgfSBmcm9tIFwiLi9mYXRfY29tbW9uXCI7XG5pbXBvcnQgeyBGYXRUYWJsZSB9IGZyb20gXCIuL2ZhdF90YWJsZVwiO1xuXG5jbGFzcyBTZWN0b3Ige1xuICAgIGRhdGE6IFVpbnQ4QXJyYXk7XG5cbiAgICBjb25zdHJ1Y3RvcihzZWN0b3Jfc2l6ZTogbnVtYmVyKXtcbiAgICAgICAgdGhpcy5kYXRhID0gbmV3IFVpbnQ4QXJyYXkoc2VjdG9yX3NpemUpO1xuXG4gICAgICAgIHRoaXMuZXJhc2UoKTtcbiAgICB9XG5cbiAgICBlcmFzZSgpe1xuICAgICAgICB0aGlzLmRhdGEuZmlsbCgweEZGKTtcbiAgICB9XG5cbiAgICBzZXQoc291cmNlOiBVaW50OEFycmF5KXtcbiAgICAgICAgZm9yKCBsZXQgaSA9IDA7IGkgPCB0aGlzLmRhdGEubGVuZ3RoOyBpKysgKXtcbiAgICAgICAgICAgIHRoaXMuZGF0YVtpXSA9IChpID49IHNvdXJjZS5sZW5ndGgpID8gMHgwMCA6IHNvdXJjZVtpXTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbmNsYXNzIEZhdFJvb3REaXJlY3RvcnlfRmlsZXtcbiAgICBmaWxlbmFtZTogc3RyaW5nID0gXCJcIjtcbiAgICBleHRlbnNpb246IHN0cmluZyA9IFwiXCI7XG4gICAgYXR0cmlidXRlOiBGaWxlQXR0cmlidXRlID0gMHgwMDtcbiAgICBjcmVhdGVfbXM6IG51bWJlciA9IDA7XG4gICAgY3JlYXRlX3RpbWU6IG51bWJlciA9IDA7XG4gICAgY3JlYXRlX2RhdGU6IG51bWJlciA9IDA7XG4gICAgbGFzdF9hY2Nlc3NfZGF0ZTogbnVtYmVyID0gMDtcbiAgICBtb2RpZmljYXRpb25fdGltZTogbnVtYmVyID0gMDtcbiAgICBtb2RpZmljYXRpb25fZGF0ZTogbnVtYmVyID0gMDtcbiAgICBjbHVzdGVyX251bWJlcjogbnVtYmVyID0gMDtcbiAgICBmaWxlX3NpemU6IG51bWJlciA9IDA7XG5cbiAgICBjb25zdHJ1Y3Rvcigpe31cblxuICAgIGdlbmVyYXRlX2ZpbGUoKSA6IG51bWJlcltdIHtcbiAgICAgICAgcmV0dXJuICAgICAgICAgIEZhdFV0aWxzLmNvbnZlcnRTdHJpbmcodGhpcy5maWxlbmFtZSwgOClcbiAgICAgICAgICAgICAgICAuY29uY2F0KEZhdFV0aWxzLmNvbnZlcnRTdHJpbmcodGhpcy5leHRlbnNpb24sIDMpKVxuICAgICAgICAgICAgICAgIC5jb25jYXQoRmF0VXRpbHMuY29udmVydFRvSGV4KHRoaXMuYXR0cmlidXRlLCAxKSlcbiAgICAgICAgICAgICAgICAuY29uY2F0KFsweDAwXSlcbiAgICAgICAgICAgICAgICAuY29uY2F0KEZhdFV0aWxzLmNvbnZlcnRUb0hleChNYXRoLmZsb29yKHRoaXMuY3JlYXRlX21zLzEwKSwgMSkpXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0VG9IZXgodGhpcy5jcmVhdGVfdGltZSwgMikpXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0VG9IZXgodGhpcy5jcmVhdGVfZGF0ZSwgMikpXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0VG9IZXgodGhpcy5sYXN0X2FjY2Vzc19kYXRlLCAyKSlcbiAgICAgICAgICAgICAgICAuY29uY2F0KFsweDAwLCAweDAwXSlcbiAgICAgICAgICAgICAgICAuY29uY2F0KEZhdFV0aWxzLmNvbnZlcnRUb0hleCh0aGlzLm1vZGlmaWNhdGlvbl90aW1lLCAyKSlcbiAgICAgICAgICAgICAgICAuY29uY2F0KEZhdFV0aWxzLmNvbnZlcnRUb0hleCh0aGlzLm1vZGlmaWNhdGlvbl9kYXRlLCAyKSlcbiAgICAgICAgICAgICAgICAuY29uY2F0KEZhdFV0aWxzLmNvbnZlcnRUb0hleCh0aGlzLmNsdXN0ZXJfbnVtYmVyLCAyKSlcbiAgICAgICAgICAgICAgICAuY29uY2F0KEZhdFV0aWxzLmNvbnZlcnRUb0hleCh0aGlzLmZpbGVfc2l6ZSwgNCkpO1xuICAgIH1cbn07XG5cbmV4cG9ydCBlbnVtIEZpbGVBdHRyaWJ1dGUge1xuICAgIFJFQURPTkxZID0gMHgwMSxcbiAgICBISURERU4gPSAweDAyLFxuICAgIFNZU1RFTSA9IDB4MDMsXG4gICAgVk9MVU1FX05BTUUgPSAweDA4LFxuICAgIFNVQkRJUkVDVE9SWSA9IDB4MTAsXG4gICAgQVJDSElWRSA9IDB4MjAsXG4gICAgREVWSUNFID0gMHg0MCxcbiAgICBSRVNFUlZFRCA9IDB4ODBcbn07XG5cbi8vICEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhIVxuLy8gISEhICAgVEhJUyBDTEFTUyBPTkxZIFdPUktTIEZPUiAxIFNFQ1RPUiBQRVIgQ0xVU1RFUiAgISEhXG4vLyAhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISFcbmV4cG9ydCBjbGFzcyBGYXRSb290RGlyZWN0b3J5e1xuXG4gICAgc3RhdGljIHJlYWRvbmx5IEZJTEVfTk9UX1NFVCA9IFsgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCBdO1xuXG4gICAgcHJpdmF0ZSBzZWN0b3Jfc2l6ZTogbnVtYmVyO1xuICAgIHByaXZhdGUgZmlsZXM6IChudWxsIHwgRmF0Um9vdERpcmVjdG9yeV9GaWxlKVtdO1xuICAgIHByaXZhdGUgc2VjdG9yczogU2VjdG9yW11cbiAgICBwcml2YXRlIGZhdF90YWJsZTogRmF0VGFibGU7XG4gICAgcHJpdmF0ZSBiaWdnZXN0X2NsdXN0ZXJfdXNlOiBudW1iZXI7XG5cbiAgICBjb25zdHJ1Y3RvcihicGI6IEZhdEJQQiwgZmF0X3RhYmxlOiBGYXRUYWJsZSwgdm9sdW1lX25hbWU6IHN0cmluZyl7XG4gICAgICAgIHRoaXMuc2VjdG9yX3NpemUgPSBicGIuc2VjdG9yX3NpemU7XG4gICAgICAgIHRoaXMuZmF0X3RhYmxlID0gZmF0X3RhYmxlO1xuICAgICAgICB0aGlzLmZpbGVzID0gbmV3IEFycmF5KGJwYi5yb290X2Rpcl9zaXplKTtcbiAgICAgICAgdGhpcy5zZWN0b3JzID0gbmV3IEFycmF5KCBNYXRoLmZsb29yKCAoIChicGIudG90YWxfc2VjdG9ycyAqIGJwYi5zZWN0b3Jfc2l6ZSkgLSA1MTIgLSBmYXRfdGFibGUuZ2V0U2l6ZSgpIC0gKGJwYi5yb290X2Rpcl9zaXplICogMzIpICkgLyBicGIuc2VjdG9yX3NpemUgKSApOyAvLyB0b3RhbCBkYXRhIHNlY3RvciBzaXplIChvY3RldHMpID0gVG90YWxfc2l6ZSAtIGJvb3Rfc2VjdG9yIC0gRkFUX1RhYmxlIC0gUm9vdERpcmVjdG9yeVxuXG4gICAgICAgIGZvciggbGV0IGkgPSAwOyBpIDwgdGhpcy5maWxlcy5sZW5ndGg7ICsraSl7XG4gICAgICAgICAgICB0aGlzLmZpbGVzW2ldID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciggbGV0IGkgPSAwOyBpIDwgdGhpcy5zZWN0b3JzLmxlbmd0aDsgKytpICl7XG4gICAgICAgICAgICB0aGlzLnNlY3RvcnNbaV0gPSBuZXcgU2VjdG9yKHRoaXMuc2VjdG9yX3NpemUpO1xuICAgICAgICB9XG5cbiAgICAgICAgXG4gICAgICAgIGxldCBmaWxlID0gbmV3IEZhdFJvb3REaXJlY3RvcnlfRmlsZSgpO1xuXG4gICAgICAgIGZpbGUuZmlsZW5hbWUgPSB2b2x1bWVfbmFtZTtcbiAgICAgICAgZmlsZS5hdHRyaWJ1dGUgPSBGaWxlQXR0cmlidXRlLlZPTFVNRV9OQU1FO1xuXG4gICAgICAgIHRoaXMuZmlsZXNbMF0gPSBmaWxlO1xuICAgICAgICB0aGlzLmJpZ2dlc3RfY2x1c3Rlcl91c2UgPSAwO1xuICAgIH1cblxuICAgIGFkZEZpbGUoZmlsZW5hbWU6IHN0cmluZywgZXh0ZW5zaW9uOiBzdHJpbmcsIGF0dHJpYnV0ZTogRmlsZUF0dHJpYnV0ZSwgY29udGVudDogVWludDhBcnJheSl7XG4gICAgICAgIGxldCBmaWxlID0gbmV3IEZhdFJvb3REaXJlY3RvcnlfRmlsZSgpO1xuICAgICAgICBsZXQgZGF0ZSA9IG5ldyBEYXRlKCk7XG4gICAgICAgIGxldCBuYl9jbHVzdGVyID0gTWF0aC5jZWlsKCBjb250ZW50Lmxlbmd0aCAvIHRoaXMuc2VjdG9yX3NpemUgKTtcblxuICAgICAgICBmaWxlLmZpbGVuYW1lID0gZmlsZW5hbWU7XG4gICAgICAgIGZpbGUuZXh0ZW5zaW9uID0gZXh0ZW5zaW9uO1xuICAgICAgICBmaWxlLmF0dHJpYnV0ZSA9IGF0dHJpYnV0ZTtcbiAgICAgICAgZmlsZS5jcmVhdGVfbXMgPSBkYXRlLmdldE1pbGxpc2Vjb25kcygpO1xuICAgICAgICBmaWxlLmNyZWF0ZV90aW1lID0gdGhpcy50aW1lRmllbGQoZGF0ZSk7XG4gICAgICAgIGZpbGUuY3JlYXRlX2RhdGUgPSB0aGlzLmRhdGVGaWVsZChkYXRlKTtcbiAgICAgICAgZmlsZS5sYXN0X2FjY2Vzc19kYXRlID0gdGhpcy5kYXRlRmllbGQoZGF0ZSk7XG4gICAgICAgIGZpbGUubW9kaWZpY2F0aW9uX3RpbWUgPSB0aGlzLnRpbWVGaWVsZChkYXRlKTtcbiAgICAgICAgZmlsZS5tb2RpZmljYXRpb25fZGF0ZSA9IHRoaXMuZGF0ZUZpZWxkKGRhdGUpO1xuICAgICAgICBmaWxlLmNsdXN0ZXJfbnVtYmVyID0gdGhpcy5mYXRfdGFibGUuZmluZF9mcmVlX2NsdXN0ZXIoKTtcbiAgICAgICAgZmlsZS5maWxlX3NpemUgPSBjb250ZW50Lmxlbmd0aDtcblxuXG4gICAgICAgIGxldCBuZXh0X2NsdXN0ZXIgPSBmaWxlLmNsdXN0ZXJfbnVtYmVyO1xuICAgICAgICBsZXQgY2x1c3RlciA9IDA7XG5cbiAgICAgICAgZm9yKCBsZXQgaSA9IDA7IGkgPCBuYl9jbHVzdGVyOyBpKysgKXtcblxuICAgICAgICAgICAgY2x1c3RlciA9IG5leHRfY2x1c3RlcjtcblxuICAgICAgICAgICAgaWYoIGNsdXN0ZXIgPiB0aGlzLmJpZ2dlc3RfY2x1c3Rlcl91c2UgKSB0aGlzLmJpZ2dlc3RfY2x1c3Rlcl91c2UgPSBjbHVzdGVyO1xuXG4gICAgICAgICAgICB0aGlzLnNlY3RvcnNbIGNsdXN0ZXIgLSAyIF0uc2V0KCBjb250ZW50LnNsaWNlKCBpICogdGhpcy5zZWN0b3Jfc2l6ZSwgaSAqIHRoaXMuc2VjdG9yX3NpemUgKyB0aGlzLnNlY3Rvcl9zaXplICkgKTtcblxuXG4gICAgICAgICAgICBuZXh0X2NsdXN0ZXIgPSB0aGlzLmZhdF90YWJsZS5maW5kX2ZyZWVfY2x1c3RlcihjbHVzdGVyKTtcbiAgICAgICAgICAgIHRoaXMuZmF0X3RhYmxlLnNldF9uZXh0X2NsdXN0ZXIoY2x1c3RlciwgbmV4dF9jbHVzdGVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZmF0X3RhYmxlLnNldF9uZXh0X2NsdXN0ZXIoY2x1c3RlciwgRmF0VGFibGUuRU5EX09GX0ZJTEUpO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5maWxlc1t0aGlzLmdldEF2YWlsYWJsZUZpbGVJbmRleCgpXSA9IGZpbGU7XG5cbiAgICB9XG5cbiAgICBnZW5lcmF0ZVJvb3REaXJlY3RvcnkoKSA6IG51bWJlcltde1xuICAgICAgICBsZXQgcmVzdWx0OiBudW1iZXJbXSA9IFtdO1xuXG5cbiAgICAgICAgdGhpcy5maWxlcy5mb3JFYWNoKCAoZmlsZSkgPT4ge1xuICAgICAgICAgICAgaWYoIGZpbGUgPT0gbnVsbCApe1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IHJlc3VsdC5jb25jYXQoIEZhdFJvb3REaXJlY3RvcnkuRklMRV9OT1RfU0VUIClcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gcmVzdWx0LmNvbmNhdCggZmlsZS5nZW5lcmF0ZV9maWxlKCkgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgZm9yKGxldCBpID0gMDsgaSA8IHRoaXMuc2VjdG9ycy5sZW5ndGggJiYgaSA8IHRoaXMuYmlnZ2VzdF9jbHVzdGVyX3VzZTsgKytpICl7XG5cbiAgICAgICAgICAgIHJlc3VsdCA9IHJlc3VsdC5jb25jYXQoIEFycmF5LmZyb20odGhpcy5zZWN0b3JzW2ldLmRhdGEpICk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIHByaXZhdGUgZ2V0QXZhaWxhYmxlRmlsZUluZGV4KCkgOiBudW1iZXJ7XG4gICAgICAgIGZvcihsZXQgaSA9IDA7IGkgPCB0aGlzLmZpbGVzLmxlbmd0aDsgKytpKXtcbiAgICAgICAgICAgIGlmKCB0aGlzLmZpbGVzW2ldID09IG51bGwgKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gaTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiAtMTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGRhdGVGaWVsZChkYXRlOiBEYXRlKSA6IG51bWJlcntcbiAgICAgICAgbGV0IHJlczogbnVtYmVyID0gMHgwMDAwO1xuXG4gICAgICAgIHJlcyAgPSAoZGF0ZS5nZXRGdWxsWWVhcigpICYgMHg3RikgPDwgOTtcbiAgICAgICAgcmVzICs9IChkYXRlLmdldE1vbnRoKCkgJiAweDBGKSA8PCA1O1xuICAgICAgICByZXMgKz0gZGF0ZS5nZXREYXkoKSAmIDB4MUY7XG5cbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICAgICAgXG4gICAgfVxuXG4gICAgcHJpdmF0ZSB0aW1lRmllbGQoZGF0ZTogRGF0ZSkgOiBudW1iZXJ7XG4gICAgICAgIGxldCByZXM6IG51bWJlciA9IDB4MDAwMDtcblxuICAgICAgICByZXMgID0gKGRhdGUuZ2V0SG91cnMoKSAmIDB4MUYpIDw8IDExO1xuICAgICAgICByZXMgKz0gKGRhdGUuZ2V0TWludXRlcygpICYgMHgzRikgPDwgNTtcbiAgICAgICAgcmVzICs9IE1hdGguZmxvb3IoZGF0ZS5nZXRTZWNvbmRzKCkgLyAyKSAmIDB4MUY7XG5cbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG59IiwiaW1wb3J0IHsgRmF0QlBCIH0gZnJvbSBcIi4vZmF0X0JQQlwiO1xuXG5leHBvcnQgY2xhc3MgRmF0VGFibGUge1xuXG4gICAgc3RhdGljIEVORF9PRl9GSUxFIDogbnVtYmVyID0gMHhGRkY7XG4gICAgc3RhdGljIEJBRF9DTFVTVEVSIDogbnVtYmVyID0gMHhGRjc7XG5cbiAgICBwcml2YXRlIHRhYmxlIDogVWludDE2QXJyYXk7XG4gICAgcHJpdmF0ZSBzaXplOiBudW1iZXI7XG5cbiAgICBjb25zdHJ1Y3RvciggYnBiOiBGYXRCUEIgKXtcbiAgICAgICAgdGhpcy5zaXplID0gTWF0aC5mbG9vciggKCBicGIuZmF0X3NpemUgKiBicGIuc2VjdG9yX3NpemUgKSAvIDEuNSk7IC8vIC8gMS41IGJlY2F1c2Ugd2UgYXJlIHVzaW5nIEZBVDEyXG4gICAgICAgIHRoaXMudGFibGUgPSBuZXcgVWludDE2QXJyYXkoIHRoaXMuc2l6ZSApOyAgICBcbiAgICAgICAgXG4gICAgICAgIC8vIE1hZ2ljayBudW1iZXJcbiAgICAgICAgdGhpcy50YWJsZVswXSA9IGJwYi5kaXNrX3R5cGUgfCAweEYwMDtcblxuICAgICAgICAvLyBSZXNlcnZlZCBjbHVzdGVyXG4gICAgICAgIHRoaXMudGFibGVbMV0gPSAweEZGRjtcbiAgICBcbiAgICAgICAgZm9yKCBsZXQgaSA9IDI7IGkgPCB0aGlzLnRhYmxlLmxlbmd0aDsgKytpICl7XG4gICAgICAgICAgICB0aGlzLnRhYmxlW2ldID0gMHgwMDA7ICAgLy9TZXQgY2x1c3RlciBhcyBhdmFpbGFibGVcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHNldF9uZXh0X2NsdXN0ZXIoY2x1c3RlcjogbnVtYmVyLCBuZXh0OiBudW1iZXIpe1xuICAgICAgICBpZiggY2x1c3RlciA+PSB0aGlzLnRhYmxlLmxlbmd0aCApe1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy50YWJsZVtjbHVzdGVyXSA9IChuZXh0ID49IHRoaXMudGFibGUubGVuZ3RoICYmIG5leHQgIT0gRmF0VGFibGUuRU5EX09GX0ZJTEUpID8gRmF0VGFibGUuQkFEX0NMVVNURVIgOiAobmV4dCAmIDB4RkZGKTtcbiAgICB9XG5cbiAgICBmaW5kX2ZyZWVfY2x1c3RlcihleGNlcHQ6IG51bWJlciA9IC0xKTogbnVtYmVye1xuICAgICAgICBmb3IoIGxldCBpID0gMjsgaSA8IHRoaXMudGFibGUubGVuZ3RoIDsgKytpKXtcbiAgICAgICAgICAgIGlmKCB0aGlzLnRhYmxlW2ldID09IDB4MDAwICYmIGkgIT0gZXhjZXB0KXtcbiAgICAgICAgICAgICAgICByZXR1cm4gaTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiAtMTtcbiAgICB9XG5cbiAgICBnZW5lcmF0ZVRhYmxlKCkgOiBudW1iZXJbXXtcbiAgICAgICAgLypcbiAgICAgICAgICAgIHR3byAxMiBiaXRzIG51bWJlcnMgOiAweEFCQyBhbmQgMHhYWVpcbiAgICAgICAgICAgIGNvbmNhdGVuYXQgaW4gMjQgYml0cyBudW1iZXI6IDB4QUJDWFlaXG4gICAgICAgICAgICBzaG91bGQgYmUgc3RvcmVkIGxpa2UgdGhpcyA6IEJDIFpBIFhZXG4gICAgICAgICovXG5cbiAgICAgICAgbGV0IHJlc3VsdDogbnVtYmVyW10gPSBbXTtcblxuICAgICAgICBmb3IoIGxldCBpID0gMDsgaSA8IHRoaXMudGFibGUubGVuZ3RoOyBpICs9IDIgKXtcbiAgICAgICAgICAgIGxldCB0bXAgPSAwO1xuXG4gICAgICAgICAgICB0bXAgPSAodGhpcy50YWJsZVtpXSAmIDB4MEZGRikgPDwgMTI7XG4gICAgICAgICAgICB0bXAgfD0gdGhpcy50YWJsZVtpKzFdICYgMHgwRkZGO1xuXG4gICAgICAgICAgICByZXN1bHQucHVzaCggICh0bXAgJiAweDBGRjAwMCkgPj4gMTIgICk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBCQ1xuICAgICAgICAgICAgcmVzdWx0LnB1c2goICgodG1wICYgMHhGMDAwMDApID4+IDIwKSB8ICgodG1wICYgMHgwMDAwMEYpIDw8IDQpICk7ICAgLy8gWkEgPSAoQSA+PiA0MCkgKyAoWiA8PCA4KVxuICAgICAgICAgICAgcmVzdWx0LnB1c2goICAodG1wICYgMHgwMDBGRjApID4+IDQgKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gWFlcbiAgICAgICAgfVxuXG4gICAgICAgIHJlc3VsdC5wb3AoKTsgICAvLyBUaGUgbGFzdCBlbGVtZW50IGlzIGluY29tcGxldCwgc28gd2UgcmVtb3ZpbmcgaXRcblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIGdldFNpemUoKSA6IG51bWJlcntcbiAgICAgICAgcmV0dXJuIHRoaXMuc2l6ZTtcbiAgICB9XG5cbn0iLCJleHBvcnQgZW51bSBQcm9ncmVzc01lc3NhZ2VUeXBlIHtcbiAgICBJTkZPID0gXCJpbmZvXCIsXG4gICAgV0FSTklORyA9IFwid2FybmluZ1wiLFxuICAgIEVSUk9SID0gXCJlcnJvclwiXG59O1xuXG5leHBvcnQgY2xhc3MgUHJvZ3Jlc3NEaWFsb2d7XG5cbiAgICBwcml2YXRlIGRpYWxvZzogSFRNTEVsZW1lbnQ7XG4gICAgcHJpdmF0ZSBwcm9ncmVzc19iYXJfZGl2OiBIVE1MRWxlbWVudDtcblxuICAgIGNvbnN0cnVjdG9yKHRpdGxlOiBzdHJpbmcgPSBcIlVwbG9hZGluZy4uLlwiLCB0ZXh0OiBzdHJpbmcgPSBcIllvdXIgcHJvZ3JhbSBpcyB1cGxvYWRpbmcgdG8geW91ciB0YXJnZXQsIHBsZWFzZSB3YWl0Ljxici8+PGJyLz48aT5EbyBub3QgdW5wbHVnZ2VkIHlvdXIgYm9hcmQsIGRvIG5vdCBjbG9zZSB0aGlzIHRhYiBub3IgY2hhbmdlIHRhYiBkdXJpbmcgdXBsb2FkaW5nLjwvaT5cIil7XG4gICAgICAgIHRoaXMuZGlhbG9nID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgdGhpcy5kaWFsb2cuY2xhc3NMaXN0LmFkZChcInByb2dyZXNzLWRpYWxvZ1wiKTtcbiAgICAgICAgdGhpcy5kaWFsb2cuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xuXG4gICAgICAgIGxldCBjb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICBjb250YWluZXIuY2xhc3NMaXN0LmFkZChcInByb2dyZXNzLWRpYWxvZy1jb250YWluZXJcIilcblxuICAgICAgICBsZXQgdGl0bGVfZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICB0aXRsZV9lbC5jbGFzc0xpc3QuYWRkKFwicHJvZ3Jlc3MtZGlhbG9nLXRpdGxlXCIpO1xuICAgICAgICB0aXRsZV9lbC5pbm5lclRleHQgPSB0aXRsZTtcblxuICAgICAgICBsZXQgY29udGVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgIGNvbnRlbnQuY2xhc3NMaXN0LmFkZChcInByb2dyZXNzLWRpYWxvZy1jb250ZW50XCIpO1xuXG4gICAgICAgIGxldCB0ZXh0X2VsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInBcIik7XG4gICAgICAgIHRleHRfZWwuaW5uZXJIVE1MID0gdGV4dDtcblxuICAgICAgICBsZXQgY2xvc2VfYnV0dG9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKTtcbiAgICAgICAgY2xvc2VfYnV0dG9uLmNsYXNzTGlzdC5hZGQoXCJwcm9ncmVzcy1kaWFsb2ctY2xvc2UtYnV0dG9uXCIpO1xuICAgICAgICBjbG9zZV9idXR0b24uaW5uZXJUZXh0ID0gXCJDbG9zZVwiO1xuICAgICAgICBjbG9zZV9idXR0b24uYWRkRXZlbnRMaXN0ZW5lciggXCJjbGlja1wiLCAoKSA9PiB0aGlzLmNsb3NlKCkgKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMucHJvZ3Jlc3NfYmFyX2RpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgIHRoaXMucHJvZ3Jlc3NfYmFyX2Rpdi5jbGFzc0xpc3QuYWRkKFwicHJvZ3Jlc3MtZGlhbG9nLWJhci1jb250YWluZXJcIilcblxuICAgICAgICBsZXQgdmFsdWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwicFwiKTtcbiAgICAgICAgdmFsdWUuY2xhc3NMaXN0LmFkZChcInByb2dyZXNzLWRpYWxvZy1iYXItdmFsdWVcIik7XG5cbiAgICAgICAgbGV0IGJhciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgIGJhci5jbGFzc0xpc3QuYWRkKFwicHJvZ3Jlc3MtZGlhbG9nLWJhci1jdXJzb3JcIik7XG5cbiAgICAgICAgdGhpcy5wcm9ncmVzc19iYXJfZGl2LmFwcGVuZCh2YWx1ZSk7XG4gICAgICAgIHRoaXMucHJvZ3Jlc3NfYmFyX2Rpdi5hcHBlbmQoYmFyKTtcblxuICAgICAgICBsZXQgaW5mb3MgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICBpbmZvcy5jbGFzc0xpc3QuYWRkKFwicHJvZ3Jlc3MtZGlhbG9nLWluZm9zXCIpO1xuXG5cbiAgICAgICAgY29udGVudC5hcHBlbmQodGV4dF9lbCk7XG4gICAgICAgIGNvbnRlbnQuYXBwZW5kKHRoaXMucHJvZ3Jlc3NfYmFyX2Rpdik7XG4gICAgICAgIGNvbnRlbnQuYXBwZW5kKFwiU3RhdHVzOlwiKTtcbiAgICAgICAgY29udGVudC5hcHBlbmQoaW5mb3MpO1xuICAgICAgICBjb250ZW50LmFwcGVuZChjbG9zZV9idXR0b24pO1xuXG4gICAgICAgIGNvbnRhaW5lci5hcHBlbmQodGl0bGVfZWwpO1xuICAgICAgICBjb250YWluZXIuYXBwZW5kKGNvbnRlbnQpO1xuXG4gICAgICAgIHRoaXMuZGlhbG9nLmFwcGVuZChjb250YWluZXIpO1xuXG4gICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kKHRoaXMuZGlhbG9nKTtcbiAgICB9XG5cbiAgICBzaG93Q2xvc2VCdXR0b24oKXtcbiAgICAgICAgKHRoaXMuZGlhbG9nLnF1ZXJ5U2VsZWN0b3IoXCIucHJvZ3Jlc3MtZGlhbG9nLWNsb3NlLWJ1dHRvblwiKSBhcyBIVE1MRWxlbWVudCkuc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjtcbiAgICB9XG5cbiAgICBzZXRQcm9ncmVzc1ZhbHVlKHByb2dyZXNzOiBudW1iZXIpe1xuICAgICAgICAodGhpcy5kaWFsb2cucXVlcnlTZWxlY3RvcihcIi5wcm9ncmVzcy1kaWFsb2ctYmFyLXZhbHVlXCIpIGFzIEhUTUxFbGVtZW50KS5pbm5lckhUTUwgPSBNYXRoLnJvdW5kKHByb2dyZXNzKSArIFwiJVwiO1xuICAgICAgICAodGhpcy5kaWFsb2cucXVlcnlTZWxlY3RvcihcIi5wcm9ncmVzcy1kaWFsb2ctYmFyLWN1cnNvclwiKSBhcyBIVE1MRWxlbWVudCkuc3R5bGUud2lkdGggPSBwcm9ncmVzcyArIFwiJVwiO1xuICAgIH1cblxuICAgIGFkZEluZm8obGluZTogc3RyaW5nLCB0eXBlOiBQcm9ncmVzc01lc3NhZ2VUeXBlID0gUHJvZ3Jlc3NNZXNzYWdlVHlwZS5JTkZPKXtcbiAgICAgICAgKHRoaXMuZGlhbG9nLnF1ZXJ5U2VsZWN0b3IoXCIucHJvZ3Jlc3MtZGlhbG9nLWluZm9zXCIpIGFzIEhUTUxFbGVtZW50KS5pbm5lckhUTUwgKz0gYDxzcGFuIGNsYXNzPVwiJHt0eXBlfVwiPiR7bGluZX08L3NwYW4+PGJyLz5gO1xuICAgIH1cblxuICAgIG9wZW4oKXtcbiAgICAgICAgdGhpcy5kaWFsb2cuc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjtcblxuICAgICAgICB0aGlzLnNldFByb2dyZXNzVmFsdWUoMCk7XG4gICAgICAgICh0aGlzLmRpYWxvZy5xdWVyeVNlbGVjdG9yKFwiLnByb2dyZXNzLWRpYWxvZy1jbG9zZS1idXR0b25cIikgYXMgSFRNTEVsZW1lbnQpLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcbiAgICAgICAgKHRoaXMuZGlhbG9nLnF1ZXJ5U2VsZWN0b3IoXCIucHJvZ3Jlc3MtZGlhbG9nLWluZm9zXCIpIGFzIEhUTUxFbGVtZW50KS5pbm5lckhUTUwgPSBcIlwiO1xuICAgIH1cblxuICAgIGNsb3NlKCl7XG4gICAgICAgIHRoaXMuZGlhbG9nLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcbiAgICB9XG59OyIsImV4cG9ydCBjbGFzcyBTZXJpYWxPdXRwdXQge1xuXG4gICAgcHJpdmF0ZSBvdXRwdXQgOiBIVE1MRWxlbWVudDtcblxuICAgIGNvbnN0cnVjdG9yKHBhcmVudDogSFRNTEVsZW1lbnQpe1xuICAgICAgICB0aGlzLm91dHB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgIHRoaXMub3V0cHV0LmNsYXNzTGlzdC5hZGQoXCJzZXJpYWxfb3V0cHV0XCIpO1xuXG4gICAgICAgIHBhcmVudC5hcHBlbmQodGhpcy5vdXRwdXQpO1xuICAgIH1cblxuICAgIHdyaXRlKHN0cjogc3RyaW5nKXtcbiAgICAgICAgLy90aGlzLm91dHB1dC5pbm5lclRleHQgKz0gYFske3RoaXMuZ2VuZXJhdGVfdGltZV9wcmVmaXgoKX1dICR7c3RyfWA7XG4gICAgICAgIHRoaXMub3V0cHV0LmlubmVyVGV4dCArPSBzdHI7XG4gICAgICAgIHRoaXMub3V0cHV0LnNjcm9sbFRvcCA9IHRoaXMub3V0cHV0LnNjcm9sbEhlaWdodDtcbiAgICB9XG5cbiAgICBjbGVhcigpe1xuICAgICAgICB0aGlzLm91dHB1dC5pbm5lclRleHQgPSBcIlwiO1xuICAgIH1cblxuICAgIC8vIGdlbmVyYXRlX3RpbWVfcHJlZml4KCl7XG4gICAgLy8gICAgIHZhciBkID0gbmV3IERhdGUoKTtcbiAgICAvLyAgICAgcmV0dXJuIGAke3RoaXMuemVyb19wYWRkaW5nKGQuZ2V0SG91cnMoKSwgMil9OiR7dGhpcy56ZXJvX3BhZGRpbmcoZC5nZXRNaW51dGVzKCksIDIpfToke3RoaXMuemVyb19wYWRkaW5nKGQuZ2V0U2Vjb25kcygpLCAyKX0uJHt0aGlzLnplcm9fcGFkZGluZyhkLmdldE1pbGxpc2Vjb25kcygpLCAzKX1gO1xuICAgIC8vIH1cblxuICAgIC8vIHplcm9fcGFkZGluZyhudW06IG51bWJlciwgbmJfemVyb3M6IG51bWJlcil7XG4gICAgLy8gICAgIGxldCBzID0gbnVtLnRvU3RyaW5nKCk7XG5cbiAgICAvLyAgICAgcmV0dXJuIGAke1wiMFwiLnJlcGVhdChNYXRoLm1heCgwLCBuYl96ZXJvcyAtIHMubGVuZ3RoKSl9JHtzfWA7XG4gICAgLy8gfVxufSIsImV4cG9ydCBjb25zdCBBUFBfVkVSU0lPTiA9IFwiJSVBUFBfVkVSU0lPTiUlXCI7Il19
