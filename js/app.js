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
var alert_dialog_1 = require("./alert_dialog");
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
// @ts-ignore
window["AlertDialog"] = alert_dialog_1.AlertDialog;
// @ts-ignore
window["AlertDialogIcon"] = alert_dialog_1.AlertDialogIcon;

},{"./TwoPanelContainer":6,"./actions/action_connection":7,"./actions/action_flash":8,"./actions/action_load":9,"./actions/action_run":10,"./actions/action_save":11,"./actions/action_settings":12,"./alert_dialog":13,"./button/button":15,"./button/buttonSpacer":16,"./button/button_dropdown":17,"./button/button_placeholder":18,"./button/button_toggle":19,"./daplink":21,"./serialOutput":29}],15:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYmFzZTY0LWpzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2J1ZmZlci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9kYXBqcy9kaXN0L2RhcC51bWQuanMiLCJub2RlX21vZHVsZXMvZmlsZS1zYXZlci9kaXN0L0ZpbGVTYXZlci5taW4uanMiLCJub2RlX21vZHVsZXMvaWVlZTc1NC9pbmRleC5qcyIsInNyYy9Ud29QYW5lbENvbnRhaW5lci50cyIsInNyYy9hY3Rpb25zL2FjdGlvbl9jb25uZWN0aW9uLnRzIiwic3JjL2FjdGlvbnMvYWN0aW9uX2ZsYXNoLnRzIiwic3JjL2FjdGlvbnMvYWN0aW9uX2xvYWQudHMiLCJzcmMvYWN0aW9ucy9hY3Rpb25fcnVuLnRzIiwic3JjL2FjdGlvbnMvYWN0aW9uX3NhdmUudHMiLCJzcmMvYWN0aW9ucy9hY3Rpb25fc2V0dGluZ3MudHMiLCJzcmMvYWxlcnRfZGlhbG9nLnRzIiwic3JjL2FwcC50cyIsInNyYy9idXR0b24vYnV0dG9uLnRzIiwic3JjL2J1dHRvbi9idXR0b25TcGFjZXIudHMiLCJzcmMvYnV0dG9uL2J1dHRvbl9kcm9wZG93bi50cyIsInNyYy9idXR0b24vYnV0dG9uX3BsYWNlaG9sZGVyLnRzIiwic3JjL2J1dHRvbi9idXR0b25fdG9nZ2xlLnRzIiwic3JjL2NvbW1vbi50cyIsInNyYy9kYXBsaW5rLnRzIiwic3JjL2loZXhfdXRpbC50cyIsInNyYy9taWNyb0ZBVC9mYXQudHMiLCJzcmMvbWljcm9GQVQvZmF0X0JQQi50cyIsInNyYy9taWNyb0ZBVC9mYXRfY29tbW9uLnRzIiwic3JjL21pY3JvRkFUL2ZhdF9yb290RGlyLnRzIiwic3JjL21pY3JvRkFUL2ZhdF90YWJsZS50cyIsInNyYy9wcm9ncmVzc19kaWFsb2cudHMiLCJzcmMvc2VyaWFsT3V0cHV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3RKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2p2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNoQkE7QUFDQTtBQUNBOzs7O0FDRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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QUMzQixJQUFJLENBQUMsTUFBTSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDNUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBRTNDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQy9CLENBQUM7SUFFRCw0QkFBSyxHQUFMLFVBQU0sR0FBVztRQUNiLHFFQUFxRTtRQUNyRSxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsSUFBSSxHQUFHLENBQUM7UUFDN0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUM7SUFDckQsQ0FBQztJQUVELDRCQUFLLEdBQUw7UUFDSSxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUM7SUFDL0IsQ0FBQztJQVlMLG1CQUFDO0FBQUQsQ0EvQkEsQUErQkMsSUFBQTtBQS9CWSxvQ0FBWSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIid1c2Ugc3RyaWN0J1xuXG5leHBvcnRzLmJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoXG5leHBvcnRzLnRvQnl0ZUFycmF5ID0gdG9CeXRlQXJyYXlcbmV4cG9ydHMuZnJvbUJ5dGVBcnJheSA9IGZyb21CeXRlQXJyYXlcblxudmFyIGxvb2t1cCA9IFtdXG52YXIgcmV2TG9va3VwID0gW11cbnZhciBBcnIgPSB0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcgPyBVaW50OEFycmF5IDogQXJyYXlcblxudmFyIGNvZGUgPSAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLydcbmZvciAodmFyIGkgPSAwLCBsZW4gPSBjb2RlLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG4gIGxvb2t1cFtpXSA9IGNvZGVbaV1cbiAgcmV2TG9va3VwW2NvZGUuY2hhckNvZGVBdChpKV0gPSBpXG59XG5cbi8vIFN1cHBvcnQgZGVjb2RpbmcgVVJMLXNhZmUgYmFzZTY0IHN0cmluZ3MsIGFzIE5vZGUuanMgZG9lcy5cbi8vIFNlZTogaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvQmFzZTY0I1VSTF9hcHBsaWNhdGlvbnNcbnJldkxvb2t1cFsnLScuY2hhckNvZGVBdCgwKV0gPSA2MlxucmV2TG9va3VwWydfJy5jaGFyQ29kZUF0KDApXSA9IDYzXG5cbmZ1bmN0aW9uIGdldExlbnMgKGI2NCkge1xuICB2YXIgbGVuID0gYjY0Lmxlbmd0aFxuXG4gIGlmIChsZW4gJSA0ID4gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBzdHJpbmcuIExlbmd0aCBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgNCcpXG4gIH1cblxuICAvLyBUcmltIG9mZiBleHRyYSBieXRlcyBhZnRlciBwbGFjZWhvbGRlciBieXRlcyBhcmUgZm91bmRcbiAgLy8gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vYmVhdGdhbW1pdC9iYXNlNjQtanMvaXNzdWVzLzQyXG4gIHZhciB2YWxpZExlbiA9IGI2NC5pbmRleE9mKCc9JylcbiAgaWYgKHZhbGlkTGVuID09PSAtMSkgdmFsaWRMZW4gPSBsZW5cblxuICB2YXIgcGxhY2VIb2xkZXJzTGVuID0gdmFsaWRMZW4gPT09IGxlblxuICAgID8gMFxuICAgIDogNCAtICh2YWxpZExlbiAlIDQpXG5cbiAgcmV0dXJuIFt2YWxpZExlbiwgcGxhY2VIb2xkZXJzTGVuXVxufVxuXG4vLyBiYXNlNjQgaXMgNC8zICsgdXAgdG8gdHdvIGNoYXJhY3RlcnMgb2YgdGhlIG9yaWdpbmFsIGRhdGFcbmZ1bmN0aW9uIGJ5dGVMZW5ndGggKGI2NCkge1xuICB2YXIgbGVucyA9IGdldExlbnMoYjY0KVxuICB2YXIgdmFsaWRMZW4gPSBsZW5zWzBdXG4gIHZhciBwbGFjZUhvbGRlcnNMZW4gPSBsZW5zWzFdXG4gIHJldHVybiAoKHZhbGlkTGVuICsgcGxhY2VIb2xkZXJzTGVuKSAqIDMgLyA0KSAtIHBsYWNlSG9sZGVyc0xlblxufVxuXG5mdW5jdGlvbiBfYnl0ZUxlbmd0aCAoYjY0LCB2YWxpZExlbiwgcGxhY2VIb2xkZXJzTGVuKSB7XG4gIHJldHVybiAoKHZhbGlkTGVuICsgcGxhY2VIb2xkZXJzTGVuKSAqIDMgLyA0KSAtIHBsYWNlSG9sZGVyc0xlblxufVxuXG5mdW5jdGlvbiB0b0J5dGVBcnJheSAoYjY0KSB7XG4gIHZhciB0bXBcbiAgdmFyIGxlbnMgPSBnZXRMZW5zKGI2NClcbiAgdmFyIHZhbGlkTGVuID0gbGVuc1swXVxuICB2YXIgcGxhY2VIb2xkZXJzTGVuID0gbGVuc1sxXVxuXG4gIHZhciBhcnIgPSBuZXcgQXJyKF9ieXRlTGVuZ3RoKGI2NCwgdmFsaWRMZW4sIHBsYWNlSG9sZGVyc0xlbikpXG5cbiAgdmFyIGN1ckJ5dGUgPSAwXG5cbiAgLy8gaWYgdGhlcmUgYXJlIHBsYWNlaG9sZGVycywgb25seSBnZXQgdXAgdG8gdGhlIGxhc3QgY29tcGxldGUgNCBjaGFyc1xuICB2YXIgbGVuID0gcGxhY2VIb2xkZXJzTGVuID4gMFxuICAgID8gdmFsaWRMZW4gLSA0XG4gICAgOiB2YWxpZExlblxuXG4gIHZhciBpXG4gIGZvciAoaSA9IDA7IGkgPCBsZW47IGkgKz0gNCkge1xuICAgIHRtcCA9XG4gICAgICAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkpXSA8PCAxOCkgfFxuICAgICAgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMSldIDw8IDEyKSB8XG4gICAgICAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAyKV0gPDwgNikgfFxuICAgICAgcmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAzKV1cbiAgICBhcnJbY3VyQnl0ZSsrXSA9ICh0bXAgPj4gMTYpICYgMHhGRlxuICAgIGFycltjdXJCeXRlKytdID0gKHRtcCA+PiA4KSAmIDB4RkZcbiAgICBhcnJbY3VyQnl0ZSsrXSA9IHRtcCAmIDB4RkZcbiAgfVxuXG4gIGlmIChwbGFjZUhvbGRlcnNMZW4gPT09IDIpIHtcbiAgICB0bXAgPVxuICAgICAgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpKV0gPDwgMikgfFxuICAgICAgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMSldID4+IDQpXG4gICAgYXJyW2N1ckJ5dGUrK10gPSB0bXAgJiAweEZGXG4gIH1cblxuICBpZiAocGxhY2VIb2xkZXJzTGVuID09PSAxKSB7XG4gICAgdG1wID1cbiAgICAgIChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSldIDw8IDEwKSB8XG4gICAgICAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAxKV0gPDwgNCkgfFxuICAgICAgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMildID4+IDIpXG4gICAgYXJyW2N1ckJ5dGUrK10gPSAodG1wID4+IDgpICYgMHhGRlxuICAgIGFycltjdXJCeXRlKytdID0gdG1wICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIGFyclxufVxuXG5mdW5jdGlvbiB0cmlwbGV0VG9CYXNlNjQgKG51bSkge1xuICByZXR1cm4gbG9va3VwW251bSA+PiAxOCAmIDB4M0ZdICtcbiAgICBsb29rdXBbbnVtID4+IDEyICYgMHgzRl0gK1xuICAgIGxvb2t1cFtudW0gPj4gNiAmIDB4M0ZdICtcbiAgICBsb29rdXBbbnVtICYgMHgzRl1cbn1cblxuZnVuY3Rpb24gZW5jb2RlQ2h1bmsgKHVpbnQ4LCBzdGFydCwgZW5kKSB7XG4gIHZhciB0bXBcbiAgdmFyIG91dHB1dCA9IFtdXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSArPSAzKSB7XG4gICAgdG1wID1cbiAgICAgICgodWludDhbaV0gPDwgMTYpICYgMHhGRjAwMDApICtcbiAgICAgICgodWludDhbaSArIDFdIDw8IDgpICYgMHhGRjAwKSArXG4gICAgICAodWludDhbaSArIDJdICYgMHhGRilcbiAgICBvdXRwdXQucHVzaCh0cmlwbGV0VG9CYXNlNjQodG1wKSlcbiAgfVxuICByZXR1cm4gb3V0cHV0LmpvaW4oJycpXG59XG5cbmZ1bmN0aW9uIGZyb21CeXRlQXJyYXkgKHVpbnQ4KSB7XG4gIHZhciB0bXBcbiAgdmFyIGxlbiA9IHVpbnQ4Lmxlbmd0aFxuICB2YXIgZXh0cmFCeXRlcyA9IGxlbiAlIDMgLy8gaWYgd2UgaGF2ZSAxIGJ5dGUgbGVmdCwgcGFkIDIgYnl0ZXNcbiAgdmFyIHBhcnRzID0gW11cbiAgdmFyIG1heENodW5rTGVuZ3RoID0gMTYzODMgLy8gbXVzdCBiZSBtdWx0aXBsZSBvZiAzXG5cbiAgLy8gZ28gdGhyb3VnaCB0aGUgYXJyYXkgZXZlcnkgdGhyZWUgYnl0ZXMsIHdlJ2xsIGRlYWwgd2l0aCB0cmFpbGluZyBzdHVmZiBsYXRlclxuICBmb3IgKHZhciBpID0gMCwgbGVuMiA9IGxlbiAtIGV4dHJhQnl0ZXM7IGkgPCBsZW4yOyBpICs9IG1heENodW5rTGVuZ3RoKSB7XG4gICAgcGFydHMucHVzaChlbmNvZGVDaHVuayh1aW50OCwgaSwgKGkgKyBtYXhDaHVua0xlbmd0aCkgPiBsZW4yID8gbGVuMiA6IChpICsgbWF4Q2h1bmtMZW5ndGgpKSlcbiAgfVxuXG4gIC8vIHBhZCB0aGUgZW5kIHdpdGggemVyb3MsIGJ1dCBtYWtlIHN1cmUgdG8gbm90IGZvcmdldCB0aGUgZXh0cmEgYnl0ZXNcbiAgaWYgKGV4dHJhQnl0ZXMgPT09IDEpIHtcbiAgICB0bXAgPSB1aW50OFtsZW4gLSAxXVxuICAgIHBhcnRzLnB1c2goXG4gICAgICBsb29rdXBbdG1wID4+IDJdICtcbiAgICAgIGxvb2t1cFsodG1wIDw8IDQpICYgMHgzRl0gK1xuICAgICAgJz09J1xuICAgIClcbiAgfSBlbHNlIGlmIChleHRyYUJ5dGVzID09PSAyKSB7XG4gICAgdG1wID0gKHVpbnQ4W2xlbiAtIDJdIDw8IDgpICsgdWludDhbbGVuIC0gMV1cbiAgICBwYXJ0cy5wdXNoKFxuICAgICAgbG9va3VwW3RtcCA+PiAxMF0gK1xuICAgICAgbG9va3VwWyh0bXAgPj4gNCkgJiAweDNGXSArXG4gICAgICBsb29rdXBbKHRtcCA8PCAyKSAmIDB4M0ZdICtcbiAgICAgICc9J1xuICAgIClcbiAgfVxuXG4gIHJldHVybiBwYXJ0cy5qb2luKCcnKVxufVxuIiwiLyohXG4gKiBUaGUgYnVmZmVyIG1vZHVsZSBmcm9tIG5vZGUuanMsIGZvciB0aGUgYnJvd3Nlci5cbiAqXG4gKiBAYXV0aG9yICAgRmVyb3NzIEFib3VraGFkaWplaCA8aHR0cHM6Ly9mZXJvc3Mub3JnPlxuICogQGxpY2Vuc2UgIE1JVFxuICovXG4vKiBlc2xpbnQtZGlzYWJsZSBuby1wcm90byAqL1xuXG4ndXNlIHN0cmljdCdcblxudmFyIGJhc2U2NCA9IHJlcXVpcmUoJ2Jhc2U2NC1qcycpXG52YXIgaWVlZTc1NCA9IHJlcXVpcmUoJ2llZWU3NTQnKVxuXG5leHBvcnRzLkJ1ZmZlciA9IEJ1ZmZlclxuZXhwb3J0cy5TbG93QnVmZmVyID0gU2xvd0J1ZmZlclxuZXhwb3J0cy5JTlNQRUNUX01BWF9CWVRFUyA9IDUwXG5cbnZhciBLX01BWF9MRU5HVEggPSAweDdmZmZmZmZmXG5leHBvcnRzLmtNYXhMZW5ndGggPSBLX01BWF9MRU5HVEhcblxuLyoqXG4gKiBJZiBgQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlRgOlxuICogICA9PT0gdHJ1ZSAgICBVc2UgVWludDhBcnJheSBpbXBsZW1lbnRhdGlvbiAoZmFzdGVzdClcbiAqICAgPT09IGZhbHNlICAgUHJpbnQgd2FybmluZyBhbmQgcmVjb21tZW5kIHVzaW5nIGBidWZmZXJgIHY0Lnggd2hpY2ggaGFzIGFuIE9iamVjdFxuICogICAgICAgICAgICAgICBpbXBsZW1lbnRhdGlvbiAobW9zdCBjb21wYXRpYmxlLCBldmVuIElFNilcbiAqXG4gKiBCcm93c2VycyB0aGF0IHN1cHBvcnQgdHlwZWQgYXJyYXlzIGFyZSBJRSAxMCssIEZpcmVmb3ggNCssIENocm9tZSA3KywgU2FmYXJpIDUuMSssXG4gKiBPcGVyYSAxMS42KywgaU9TIDQuMisuXG4gKlxuICogV2UgcmVwb3J0IHRoYXQgdGhlIGJyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCB0eXBlZCBhcnJheXMgaWYgdGhlIGFyZSBub3Qgc3ViY2xhc3NhYmxlXG4gKiB1c2luZyBfX3Byb3RvX18uIEZpcmVmb3ggNC0yOSBsYWNrcyBzdXBwb3J0IGZvciBhZGRpbmcgbmV3IHByb3BlcnRpZXMgdG8gYFVpbnQ4QXJyYXlgXG4gKiAoU2VlOiBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD02OTU0MzgpLiBJRSAxMCBsYWNrcyBzdXBwb3J0XG4gKiBmb3IgX19wcm90b19fIGFuZCBoYXMgYSBidWdneSB0eXBlZCBhcnJheSBpbXBsZW1lbnRhdGlvbi5cbiAqL1xuQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQgPSB0eXBlZEFycmF5U3VwcG9ydCgpXG5cbmlmICghQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQgJiYgdHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnICYmXG4gICAgdHlwZW9mIGNvbnNvbGUuZXJyb3IgPT09ICdmdW5jdGlvbicpIHtcbiAgY29uc29sZS5lcnJvcihcbiAgICAnVGhpcyBicm93c2VyIGxhY2tzIHR5cGVkIGFycmF5IChVaW50OEFycmF5KSBzdXBwb3J0IHdoaWNoIGlzIHJlcXVpcmVkIGJ5ICcgK1xuICAgICdgYnVmZmVyYCB2NS54LiBVc2UgYGJ1ZmZlcmAgdjQueCBpZiB5b3UgcmVxdWlyZSBvbGQgYnJvd3NlciBzdXBwb3J0LidcbiAgKVxufVxuXG5mdW5jdGlvbiB0eXBlZEFycmF5U3VwcG9ydCAoKSB7XG4gIC8vIENhbiB0eXBlZCBhcnJheSBpbnN0YW5jZXMgY2FuIGJlIGF1Z21lbnRlZD9cbiAgdHJ5IHtcbiAgICB2YXIgYXJyID0gbmV3IFVpbnQ4QXJyYXkoMSlcbiAgICBhcnIuX19wcm90b19fID0geyBfX3Byb3RvX186IFVpbnQ4QXJyYXkucHJvdG90eXBlLCBmb286IGZ1bmN0aW9uICgpIHsgcmV0dXJuIDQyIH0gfVxuICAgIHJldHVybiBhcnIuZm9vKCkgPT09IDQyXG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyLnByb3RvdHlwZSwgJ3BhcmVudCcsIHtcbiAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCFCdWZmZXIuaXNCdWZmZXIodGhpcykpIHJldHVybiB1bmRlZmluZWRcbiAgICByZXR1cm4gdGhpcy5idWZmZXJcbiAgfVxufSlcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJ1ZmZlci5wcm90b3R5cGUsICdvZmZzZXQnLCB7XG4gIGVudW1lcmFibGU6IHRydWUsXG4gIGdldDogZnVuY3Rpb24gKCkge1xuICAgIGlmICghQnVmZmVyLmlzQnVmZmVyKHRoaXMpKSByZXR1cm4gdW5kZWZpbmVkXG4gICAgcmV0dXJuIHRoaXMuYnl0ZU9mZnNldFxuICB9XG59KVxuXG5mdW5jdGlvbiBjcmVhdGVCdWZmZXIgKGxlbmd0aCkge1xuICBpZiAobGVuZ3RoID4gS19NQVhfTEVOR1RIKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1RoZSB2YWx1ZSBcIicgKyBsZW5ndGggKyAnXCIgaXMgaW52YWxpZCBmb3Igb3B0aW9uIFwic2l6ZVwiJylcbiAgfVxuICAvLyBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZVxuICB2YXIgYnVmID0gbmV3IFVpbnQ4QXJyYXkobGVuZ3RoKVxuICBidWYuX19wcm90b19fID0gQnVmZmVyLnByb3RvdHlwZVxuICByZXR1cm4gYnVmXG59XG5cbi8qKlxuICogVGhlIEJ1ZmZlciBjb25zdHJ1Y3RvciByZXR1cm5zIGluc3RhbmNlcyBvZiBgVWludDhBcnJheWAgdGhhdCBoYXZlIHRoZWlyXG4gKiBwcm90b3R5cGUgY2hhbmdlZCB0byBgQnVmZmVyLnByb3RvdHlwZWAuIEZ1cnRoZXJtb3JlLCBgQnVmZmVyYCBpcyBhIHN1YmNsYXNzIG9mXG4gKiBgVWludDhBcnJheWAsIHNvIHRoZSByZXR1cm5lZCBpbnN0YW5jZXMgd2lsbCBoYXZlIGFsbCB0aGUgbm9kZSBgQnVmZmVyYCBtZXRob2RzXG4gKiBhbmQgdGhlIGBVaW50OEFycmF5YCBtZXRob2RzLiBTcXVhcmUgYnJhY2tldCBub3RhdGlvbiB3b3JrcyBhcyBleHBlY3RlZCAtLSBpdFxuICogcmV0dXJucyBhIHNpbmdsZSBvY3RldC5cbiAqXG4gKiBUaGUgYFVpbnQ4QXJyYXlgIHByb3RvdHlwZSByZW1haW5zIHVubW9kaWZpZWQuXG4gKi9cblxuZnVuY3Rpb24gQnVmZmVyIChhcmcsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aCkge1xuICAvLyBDb21tb24gY2FzZS5cbiAgaWYgKHR5cGVvZiBhcmcgPT09ICdudW1iZXInKSB7XG4gICAgaWYgKHR5cGVvZiBlbmNvZGluZ09yT2Zmc2V0ID09PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgJ1RoZSBcInN0cmluZ1wiIGFyZ3VtZW50IG11c3QgYmUgb2YgdHlwZSBzdHJpbmcuIFJlY2VpdmVkIHR5cGUgbnVtYmVyJ1xuICAgICAgKVxuICAgIH1cbiAgICByZXR1cm4gYWxsb2NVbnNhZmUoYXJnKVxuICB9XG4gIHJldHVybiBmcm9tKGFyZywgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKVxufVxuXG4vLyBGaXggc3ViYXJyYXkoKSBpbiBFUzIwMTYuIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL2Zlcm9zcy9idWZmZXIvcHVsbC85N1xuaWYgKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC5zcGVjaWVzICE9IG51bGwgJiZcbiAgICBCdWZmZXJbU3ltYm9sLnNwZWNpZXNdID09PSBCdWZmZXIpIHtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KEJ1ZmZlciwgU3ltYm9sLnNwZWNpZXMsIHtcbiAgICB2YWx1ZTogbnVsbCxcbiAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgd3JpdGFibGU6IGZhbHNlXG4gIH0pXG59XG5cbkJ1ZmZlci5wb29sU2l6ZSA9IDgxOTIgLy8gbm90IHVzZWQgYnkgdGhpcyBpbXBsZW1lbnRhdGlvblxuXG5mdW5jdGlvbiBmcm9tICh2YWx1ZSwgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKSB7XG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIGZyb21TdHJpbmcodmFsdWUsIGVuY29kaW5nT3JPZmZzZXQpXG4gIH1cblxuICBpZiAoQXJyYXlCdWZmZXIuaXNWaWV3KHZhbHVlKSkge1xuICAgIHJldHVybiBmcm9tQXJyYXlMaWtlKHZhbHVlKVxuICB9XG5cbiAgaWYgKHZhbHVlID09IG51bGwpIHtcbiAgICB0aHJvdyBUeXBlRXJyb3IoXG4gICAgICAnVGhlIGZpcnN0IGFyZ3VtZW50IG11c3QgYmUgb25lIG9mIHR5cGUgc3RyaW5nLCBCdWZmZXIsIEFycmF5QnVmZmVyLCBBcnJheSwgJyArXG4gICAgICAnb3IgQXJyYXktbGlrZSBPYmplY3QuIFJlY2VpdmVkIHR5cGUgJyArICh0eXBlb2YgdmFsdWUpXG4gICAgKVxuICB9XG5cbiAgaWYgKGlzSW5zdGFuY2UodmFsdWUsIEFycmF5QnVmZmVyKSB8fFxuICAgICAgKHZhbHVlICYmIGlzSW5zdGFuY2UodmFsdWUuYnVmZmVyLCBBcnJheUJ1ZmZlcikpKSB7XG4gICAgcmV0dXJuIGZyb21BcnJheUJ1ZmZlcih2YWx1ZSwgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKVxuICB9XG5cbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgJ1RoZSBcInZhbHVlXCIgYXJndW1lbnQgbXVzdCBub3QgYmUgb2YgdHlwZSBudW1iZXIuIFJlY2VpdmVkIHR5cGUgbnVtYmVyJ1xuICAgIClcbiAgfVxuXG4gIHZhciB2YWx1ZU9mID0gdmFsdWUudmFsdWVPZiAmJiB2YWx1ZS52YWx1ZU9mKClcbiAgaWYgKHZhbHVlT2YgIT0gbnVsbCAmJiB2YWx1ZU9mICE9PSB2YWx1ZSkge1xuICAgIHJldHVybiBCdWZmZXIuZnJvbSh2YWx1ZU9mLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpXG4gIH1cblxuICB2YXIgYiA9IGZyb21PYmplY3QodmFsdWUpXG4gIGlmIChiKSByZXR1cm4gYlxuXG4gIGlmICh0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2wudG9QcmltaXRpdmUgIT0gbnVsbCAmJlxuICAgICAgdHlwZW9mIHZhbHVlW1N5bWJvbC50b1ByaW1pdGl2ZV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gQnVmZmVyLmZyb20oXG4gICAgICB2YWx1ZVtTeW1ib2wudG9QcmltaXRpdmVdKCdzdHJpbmcnKSwgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoXG4gICAgKVxuICB9XG5cbiAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAnVGhlIGZpcnN0IGFyZ3VtZW50IG11c3QgYmUgb25lIG9mIHR5cGUgc3RyaW5nLCBCdWZmZXIsIEFycmF5QnVmZmVyLCBBcnJheSwgJyArXG4gICAgJ29yIEFycmF5LWxpa2UgT2JqZWN0LiBSZWNlaXZlZCB0eXBlICcgKyAodHlwZW9mIHZhbHVlKVxuICApXG59XG5cbi8qKlxuICogRnVuY3Rpb25hbGx5IGVxdWl2YWxlbnQgdG8gQnVmZmVyKGFyZywgZW5jb2RpbmcpIGJ1dCB0aHJvd3MgYSBUeXBlRXJyb3JcbiAqIGlmIHZhbHVlIGlzIGEgbnVtYmVyLlxuICogQnVmZmVyLmZyb20oc3RyWywgZW5jb2RpbmddKVxuICogQnVmZmVyLmZyb20oYXJyYXkpXG4gKiBCdWZmZXIuZnJvbShidWZmZXIpXG4gKiBCdWZmZXIuZnJvbShhcnJheUJ1ZmZlclssIGJ5dGVPZmZzZXRbLCBsZW5ndGhdXSlcbiAqKi9cbkJ1ZmZlci5mcm9tID0gZnVuY3Rpb24gKHZhbHVlLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGZyb20odmFsdWUsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aClcbn1cblxuLy8gTm90ZTogQ2hhbmdlIHByb3RvdHlwZSAqYWZ0ZXIqIEJ1ZmZlci5mcm9tIGlzIGRlZmluZWQgdG8gd29ya2Fyb3VuZCBDaHJvbWUgYnVnOlxuLy8gaHR0cHM6Ly9naXRodWIuY29tL2Zlcm9zcy9idWZmZXIvcHVsbC8xNDhcbkJ1ZmZlci5wcm90b3R5cGUuX19wcm90b19fID0gVWludDhBcnJheS5wcm90b3R5cGVcbkJ1ZmZlci5fX3Byb3RvX18gPSBVaW50OEFycmF5XG5cbmZ1bmN0aW9uIGFzc2VydFNpemUgKHNpemUpIHtcbiAgaWYgKHR5cGVvZiBzaXplICE9PSAnbnVtYmVyJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wic2l6ZVwiIGFyZ3VtZW50IG11c3QgYmUgb2YgdHlwZSBudW1iZXInKVxuICB9IGVsc2UgaWYgKHNpemUgPCAwKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1RoZSB2YWx1ZSBcIicgKyBzaXplICsgJ1wiIGlzIGludmFsaWQgZm9yIG9wdGlvbiBcInNpemVcIicpXG4gIH1cbn1cblxuZnVuY3Rpb24gYWxsb2MgKHNpemUsIGZpbGwsIGVuY29kaW5nKSB7XG4gIGFzc2VydFNpemUoc2l6ZSlcbiAgaWYgKHNpemUgPD0gMCkge1xuICAgIHJldHVybiBjcmVhdGVCdWZmZXIoc2l6ZSlcbiAgfVxuICBpZiAoZmlsbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgLy8gT25seSBwYXkgYXR0ZW50aW9uIHRvIGVuY29kaW5nIGlmIGl0J3MgYSBzdHJpbmcuIFRoaXNcbiAgICAvLyBwcmV2ZW50cyBhY2NpZGVudGFsbHkgc2VuZGluZyBpbiBhIG51bWJlciB0aGF0IHdvdWxkXG4gICAgLy8gYmUgaW50ZXJwcmV0dGVkIGFzIGEgc3RhcnQgb2Zmc2V0LlxuICAgIHJldHVybiB0eXBlb2YgZW5jb2RpbmcgPT09ICdzdHJpbmcnXG4gICAgICA/IGNyZWF0ZUJ1ZmZlcihzaXplKS5maWxsKGZpbGwsIGVuY29kaW5nKVxuICAgICAgOiBjcmVhdGVCdWZmZXIoc2l6ZSkuZmlsbChmaWxsKVxuICB9XG4gIHJldHVybiBjcmVhdGVCdWZmZXIoc2l6ZSlcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IGZpbGxlZCBCdWZmZXIgaW5zdGFuY2UuXG4gKiBhbGxvYyhzaXplWywgZmlsbFssIGVuY29kaW5nXV0pXG4gKiovXG5CdWZmZXIuYWxsb2MgPSBmdW5jdGlvbiAoc2l6ZSwgZmlsbCwgZW5jb2RpbmcpIHtcbiAgcmV0dXJuIGFsbG9jKHNpemUsIGZpbGwsIGVuY29kaW5nKVxufVxuXG5mdW5jdGlvbiBhbGxvY1Vuc2FmZSAoc2l6ZSkge1xuICBhc3NlcnRTaXplKHNpemUpXG4gIHJldHVybiBjcmVhdGVCdWZmZXIoc2l6ZSA8IDAgPyAwIDogY2hlY2tlZChzaXplKSB8IDApXG59XG5cbi8qKlxuICogRXF1aXZhbGVudCB0byBCdWZmZXIobnVtKSwgYnkgZGVmYXVsdCBjcmVhdGVzIGEgbm9uLXplcm8tZmlsbGVkIEJ1ZmZlciBpbnN0YW5jZS5cbiAqICovXG5CdWZmZXIuYWxsb2NVbnNhZmUgPSBmdW5jdGlvbiAoc2l6ZSkge1xuICByZXR1cm4gYWxsb2NVbnNhZmUoc2l6ZSlcbn1cbi8qKlxuICogRXF1aXZhbGVudCB0byBTbG93QnVmZmVyKG51bSksIGJ5IGRlZmF1bHQgY3JlYXRlcyBhIG5vbi16ZXJvLWZpbGxlZCBCdWZmZXIgaW5zdGFuY2UuXG4gKi9cbkJ1ZmZlci5hbGxvY1Vuc2FmZVNsb3cgPSBmdW5jdGlvbiAoc2l6ZSkge1xuICByZXR1cm4gYWxsb2NVbnNhZmUoc2l6ZSlcbn1cblxuZnVuY3Rpb24gZnJvbVN0cmluZyAoc3RyaW5nLCBlbmNvZGluZykge1xuICBpZiAodHlwZW9mIGVuY29kaW5nICE9PSAnc3RyaW5nJyB8fCBlbmNvZGluZyA9PT0gJycpIHtcbiAgICBlbmNvZGluZyA9ICd1dGY4J1xuICB9XG5cbiAgaWYgKCFCdWZmZXIuaXNFbmNvZGluZyhlbmNvZGluZykpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gIH1cblxuICB2YXIgbGVuZ3RoID0gYnl0ZUxlbmd0aChzdHJpbmcsIGVuY29kaW5nKSB8IDBcbiAgdmFyIGJ1ZiA9IGNyZWF0ZUJ1ZmZlcihsZW5ndGgpXG5cbiAgdmFyIGFjdHVhbCA9IGJ1Zi53cml0ZShzdHJpbmcsIGVuY29kaW5nKVxuXG4gIGlmIChhY3R1YWwgIT09IGxlbmd0aCkge1xuICAgIC8vIFdyaXRpbmcgYSBoZXggc3RyaW5nLCBmb3IgZXhhbXBsZSwgdGhhdCBjb250YWlucyBpbnZhbGlkIGNoYXJhY3RlcnMgd2lsbFxuICAgIC8vIGNhdXNlIGV2ZXJ5dGhpbmcgYWZ0ZXIgdGhlIGZpcnN0IGludmFsaWQgY2hhcmFjdGVyIHRvIGJlIGlnbm9yZWQuIChlLmcuXG4gICAgLy8gJ2FieHhjZCcgd2lsbCBiZSB0cmVhdGVkIGFzICdhYicpXG4gICAgYnVmID0gYnVmLnNsaWNlKDAsIGFjdHVhbClcbiAgfVxuXG4gIHJldHVybiBidWZcbn1cblxuZnVuY3Rpb24gZnJvbUFycmF5TGlrZSAoYXJyYXkpIHtcbiAgdmFyIGxlbmd0aCA9IGFycmF5Lmxlbmd0aCA8IDAgPyAwIDogY2hlY2tlZChhcnJheS5sZW5ndGgpIHwgMFxuICB2YXIgYnVmID0gY3JlYXRlQnVmZmVyKGxlbmd0aClcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkgKz0gMSkge1xuICAgIGJ1ZltpXSA9IGFycmF5W2ldICYgMjU1XG4gIH1cbiAgcmV0dXJuIGJ1ZlxufVxuXG5mdW5jdGlvbiBmcm9tQXJyYXlCdWZmZXIgKGFycmF5LCBieXRlT2Zmc2V0LCBsZW5ndGgpIHtcbiAgaWYgKGJ5dGVPZmZzZXQgPCAwIHx8IGFycmF5LmJ5dGVMZW5ndGggPCBieXRlT2Zmc2V0KSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1wib2Zmc2V0XCIgaXMgb3V0c2lkZSBvZiBidWZmZXIgYm91bmRzJylcbiAgfVxuXG4gIGlmIChhcnJheS5ieXRlTGVuZ3RoIDwgYnl0ZU9mZnNldCArIChsZW5ndGggfHwgMCkpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignXCJsZW5ndGhcIiBpcyBvdXRzaWRlIG9mIGJ1ZmZlciBib3VuZHMnKVxuICB9XG5cbiAgdmFyIGJ1ZlxuICBpZiAoYnl0ZU9mZnNldCA9PT0gdW5kZWZpbmVkICYmIGxlbmd0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgYnVmID0gbmV3IFVpbnQ4QXJyYXkoYXJyYXkpXG4gIH0gZWxzZSBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQpIHtcbiAgICBidWYgPSBuZXcgVWludDhBcnJheShhcnJheSwgYnl0ZU9mZnNldClcbiAgfSBlbHNlIHtcbiAgICBidWYgPSBuZXcgVWludDhBcnJheShhcnJheSwgYnl0ZU9mZnNldCwgbGVuZ3RoKVxuICB9XG5cbiAgLy8gUmV0dXJuIGFuIGF1Z21lbnRlZCBgVWludDhBcnJheWAgaW5zdGFuY2VcbiAgYnVmLl9fcHJvdG9fXyA9IEJ1ZmZlci5wcm90b3R5cGVcbiAgcmV0dXJuIGJ1ZlxufVxuXG5mdW5jdGlvbiBmcm9tT2JqZWN0IChvYmopIHtcbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihvYmopKSB7XG4gICAgdmFyIGxlbiA9IGNoZWNrZWQob2JqLmxlbmd0aCkgfCAwXG4gICAgdmFyIGJ1ZiA9IGNyZWF0ZUJ1ZmZlcihsZW4pXG5cbiAgICBpZiAoYnVmLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIGJ1ZlxuICAgIH1cblxuICAgIG9iai5jb3B5KGJ1ZiwgMCwgMCwgbGVuKVxuICAgIHJldHVybiBidWZcbiAgfVxuXG4gIGlmIChvYmoubGVuZ3RoICE9PSB1bmRlZmluZWQpIHtcbiAgICBpZiAodHlwZW9mIG9iai5sZW5ndGggIT09ICdudW1iZXInIHx8IG51bWJlcklzTmFOKG9iai5sZW5ndGgpKSB7XG4gICAgICByZXR1cm4gY3JlYXRlQnVmZmVyKDApXG4gICAgfVxuICAgIHJldHVybiBmcm9tQXJyYXlMaWtlKG9iailcbiAgfVxuXG4gIGlmIChvYmoudHlwZSA9PT0gJ0J1ZmZlcicgJiYgQXJyYXkuaXNBcnJheShvYmouZGF0YSkpIHtcbiAgICByZXR1cm4gZnJvbUFycmF5TGlrZShvYmouZGF0YSlcbiAgfVxufVxuXG5mdW5jdGlvbiBjaGVja2VkIChsZW5ndGgpIHtcbiAgLy8gTm90ZTogY2Fubm90IHVzZSBgbGVuZ3RoIDwgS19NQVhfTEVOR1RIYCBoZXJlIGJlY2F1c2UgdGhhdCBmYWlscyB3aGVuXG4gIC8vIGxlbmd0aCBpcyBOYU4gKHdoaWNoIGlzIG90aGVyd2lzZSBjb2VyY2VkIHRvIHplcm8uKVxuICBpZiAobGVuZ3RoID49IEtfTUFYX0xFTkdUSCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdBdHRlbXB0IHRvIGFsbG9jYXRlIEJ1ZmZlciBsYXJnZXIgdGhhbiBtYXhpbXVtICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICdzaXplOiAweCcgKyBLX01BWF9MRU5HVEgudG9TdHJpbmcoMTYpICsgJyBieXRlcycpXG4gIH1cbiAgcmV0dXJuIGxlbmd0aCB8IDBcbn1cblxuZnVuY3Rpb24gU2xvd0J1ZmZlciAobGVuZ3RoKSB7XG4gIGlmICgrbGVuZ3RoICE9IGxlbmd0aCkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGVxZXFlcVxuICAgIGxlbmd0aCA9IDBcbiAgfVxuICByZXR1cm4gQnVmZmVyLmFsbG9jKCtsZW5ndGgpXG59XG5cbkJ1ZmZlci5pc0J1ZmZlciA9IGZ1bmN0aW9uIGlzQnVmZmVyIChiKSB7XG4gIHJldHVybiBiICE9IG51bGwgJiYgYi5faXNCdWZmZXIgPT09IHRydWUgJiZcbiAgICBiICE9PSBCdWZmZXIucHJvdG90eXBlIC8vIHNvIEJ1ZmZlci5pc0J1ZmZlcihCdWZmZXIucHJvdG90eXBlKSB3aWxsIGJlIGZhbHNlXG59XG5cbkJ1ZmZlci5jb21wYXJlID0gZnVuY3Rpb24gY29tcGFyZSAoYSwgYikge1xuICBpZiAoaXNJbnN0YW5jZShhLCBVaW50OEFycmF5KSkgYSA9IEJ1ZmZlci5mcm9tKGEsIGEub2Zmc2V0LCBhLmJ5dGVMZW5ndGgpXG4gIGlmIChpc0luc3RhbmNlKGIsIFVpbnQ4QXJyYXkpKSBiID0gQnVmZmVyLmZyb20oYiwgYi5vZmZzZXQsIGIuYnl0ZUxlbmd0aClcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYSkgfHwgIUJ1ZmZlci5pc0J1ZmZlcihiKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAnVGhlIFwiYnVmMVwiLCBcImJ1ZjJcIiBhcmd1bWVudHMgbXVzdCBiZSBvbmUgb2YgdHlwZSBCdWZmZXIgb3IgVWludDhBcnJheSdcbiAgICApXG4gIH1cblxuICBpZiAoYSA9PT0gYikgcmV0dXJuIDBcblxuICB2YXIgeCA9IGEubGVuZ3RoXG4gIHZhciB5ID0gYi5sZW5ndGhcblxuICBmb3IgKHZhciBpID0gMCwgbGVuID0gTWF0aC5taW4oeCwgeSk7IGkgPCBsZW47ICsraSkge1xuICAgIGlmIChhW2ldICE9PSBiW2ldKSB7XG4gICAgICB4ID0gYVtpXVxuICAgICAgeSA9IGJbaV1cbiAgICAgIGJyZWFrXG4gICAgfVxuICB9XG5cbiAgaWYgKHggPCB5KSByZXR1cm4gLTFcbiAgaWYgKHkgPCB4KSByZXR1cm4gMVxuICByZXR1cm4gMFxufVxuXG5CdWZmZXIuaXNFbmNvZGluZyA9IGZ1bmN0aW9uIGlzRW5jb2RpbmcgKGVuY29kaW5nKSB7XG4gIHN3aXRjaCAoU3RyaW5nKGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICBjYXNlICd1dGY4JzpcbiAgICBjYXNlICd1dGYtOCc6XG4gICAgY2FzZSAnYXNjaWknOlxuICAgIGNhc2UgJ2xhdGluMSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgIGNhc2UgJ3VjczInOlxuICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICBjYXNlICd1dGYxNmxlJzpcbiAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG5CdWZmZXIuY29uY2F0ID0gZnVuY3Rpb24gY29uY2F0IChsaXN0LCBsZW5ndGgpIHtcbiAgaWYgKCFBcnJheS5pc0FycmF5KGxpc3QpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJsaXN0XCIgYXJndW1lbnQgbXVzdCBiZSBhbiBBcnJheSBvZiBCdWZmZXJzJylcbiAgfVxuXG4gIGlmIChsaXN0Lmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBCdWZmZXIuYWxsb2MoMClcbiAgfVxuXG4gIHZhciBpXG4gIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCkge1xuICAgIGxlbmd0aCA9IDBcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7ICsraSkge1xuICAgICAgbGVuZ3RoICs9IGxpc3RbaV0ubGVuZ3RoXG4gICAgfVxuICB9XG5cbiAgdmFyIGJ1ZmZlciA9IEJ1ZmZlci5hbGxvY1Vuc2FmZShsZW5ndGgpXG4gIHZhciBwb3MgPSAwXG4gIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgKytpKSB7XG4gICAgdmFyIGJ1ZiA9IGxpc3RbaV1cbiAgICBpZiAoaXNJbnN0YW5jZShidWYsIFVpbnQ4QXJyYXkpKSB7XG4gICAgICBidWYgPSBCdWZmZXIuZnJvbShidWYpXG4gICAgfVxuICAgIGlmICghQnVmZmVyLmlzQnVmZmVyKGJ1ZikpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wibGlzdFwiIGFyZ3VtZW50IG11c3QgYmUgYW4gQXJyYXkgb2YgQnVmZmVycycpXG4gICAgfVxuICAgIGJ1Zi5jb3B5KGJ1ZmZlciwgcG9zKVxuICAgIHBvcyArPSBidWYubGVuZ3RoXG4gIH1cbiAgcmV0dXJuIGJ1ZmZlclxufVxuXG5mdW5jdGlvbiBieXRlTGVuZ3RoIChzdHJpbmcsIGVuY29kaW5nKSB7XG4gIGlmIChCdWZmZXIuaXNCdWZmZXIoc3RyaW5nKSkge1xuICAgIHJldHVybiBzdHJpbmcubGVuZ3RoXG4gIH1cbiAgaWYgKEFycmF5QnVmZmVyLmlzVmlldyhzdHJpbmcpIHx8IGlzSW5zdGFuY2Uoc3RyaW5nLCBBcnJheUJ1ZmZlcikpIHtcbiAgICByZXR1cm4gc3RyaW5nLmJ5dGVMZW5ndGhcbiAgfVxuICBpZiAodHlwZW9mIHN0cmluZyAhPT0gJ3N0cmluZycpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgJ1RoZSBcInN0cmluZ1wiIGFyZ3VtZW50IG11c3QgYmUgb25lIG9mIHR5cGUgc3RyaW5nLCBCdWZmZXIsIG9yIEFycmF5QnVmZmVyLiAnICtcbiAgICAgICdSZWNlaXZlZCB0eXBlICcgKyB0eXBlb2Ygc3RyaW5nXG4gICAgKVxuICB9XG5cbiAgdmFyIGxlbiA9IHN0cmluZy5sZW5ndGhcbiAgdmFyIG11c3RNYXRjaCA9IChhcmd1bWVudHMubGVuZ3RoID4gMiAmJiBhcmd1bWVudHNbMl0gPT09IHRydWUpXG4gIGlmICghbXVzdE1hdGNoICYmIGxlbiA9PT0gMCkgcmV0dXJuIDBcblxuICAvLyBVc2UgYSBmb3IgbG9vcCB0byBhdm9pZCByZWN1cnNpb25cbiAgdmFyIGxvd2VyZWRDYXNlID0gZmFsc2VcbiAgZm9yICg7Oykge1xuICAgIHN3aXRjaCAoZW5jb2RpbmcpIHtcbiAgICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgIGNhc2UgJ2xhdGluMSc6XG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICByZXR1cm4gbGVuXG4gICAgICBjYXNlICd1dGY4JzpcbiAgICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgICAgcmV0dXJuIHV0ZjhUb0J5dGVzKHN0cmluZykubGVuZ3RoXG4gICAgICBjYXNlICd1Y3MyJzpcbiAgICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgICByZXR1cm4gbGVuICogMlxuICAgICAgY2FzZSAnaGV4JzpcbiAgICAgICAgcmV0dXJuIGxlbiA+Pj4gMVxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgcmV0dXJuIGJhc2U2NFRvQnl0ZXMoc3RyaW5nKS5sZW5ndGhcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChsb3dlcmVkQ2FzZSkge1xuICAgICAgICAgIHJldHVybiBtdXN0TWF0Y2ggPyAtMSA6IHV0ZjhUb0J5dGVzKHN0cmluZykubGVuZ3RoIC8vIGFzc3VtZSB1dGY4XG4gICAgICAgIH1cbiAgICAgICAgZW5jb2RpbmcgPSAoJycgKyBlbmNvZGluZykudG9Mb3dlckNhc2UoKVxuICAgICAgICBsb3dlcmVkQ2FzZSA9IHRydWVcbiAgICB9XG4gIH1cbn1cbkJ1ZmZlci5ieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aFxuXG5mdW5jdGlvbiBzbG93VG9TdHJpbmcgKGVuY29kaW5nLCBzdGFydCwgZW5kKSB7XG4gIHZhciBsb3dlcmVkQ2FzZSA9IGZhbHNlXG5cbiAgLy8gTm8gbmVlZCB0byB2ZXJpZnkgdGhhdCBcInRoaXMubGVuZ3RoIDw9IE1BWF9VSU5UMzJcIiBzaW5jZSBpdCdzIGEgcmVhZC1vbmx5XG4gIC8vIHByb3BlcnR5IG9mIGEgdHlwZWQgYXJyYXkuXG5cbiAgLy8gVGhpcyBiZWhhdmVzIG5laXRoZXIgbGlrZSBTdHJpbmcgbm9yIFVpbnQ4QXJyYXkgaW4gdGhhdCB3ZSBzZXQgc3RhcnQvZW5kXG4gIC8vIHRvIHRoZWlyIHVwcGVyL2xvd2VyIGJvdW5kcyBpZiB0aGUgdmFsdWUgcGFzc2VkIGlzIG91dCBvZiByYW5nZS5cbiAgLy8gdW5kZWZpbmVkIGlzIGhhbmRsZWQgc3BlY2lhbGx5IGFzIHBlciBFQ01BLTI2MiA2dGggRWRpdGlvbixcbiAgLy8gU2VjdGlvbiAxMy4zLjMuNyBSdW50aW1lIFNlbWFudGljczogS2V5ZWRCaW5kaW5nSW5pdGlhbGl6YXRpb24uXG4gIGlmIChzdGFydCA9PT0gdW5kZWZpbmVkIHx8IHN0YXJ0IDwgMCkge1xuICAgIHN0YXJ0ID0gMFxuICB9XG4gIC8vIFJldHVybiBlYXJseSBpZiBzdGFydCA+IHRoaXMubGVuZ3RoLiBEb25lIGhlcmUgdG8gcHJldmVudCBwb3RlbnRpYWwgdWludDMyXG4gIC8vIGNvZXJjaW9uIGZhaWwgYmVsb3cuXG4gIGlmIChzdGFydCA+IHRoaXMubGVuZ3RoKSB7XG4gICAgcmV0dXJuICcnXG4gIH1cblxuICBpZiAoZW5kID09PSB1bmRlZmluZWQgfHwgZW5kID4gdGhpcy5sZW5ndGgpIHtcbiAgICBlbmQgPSB0aGlzLmxlbmd0aFxuICB9XG5cbiAgaWYgKGVuZCA8PSAwKSB7XG4gICAgcmV0dXJuICcnXG4gIH1cblxuICAvLyBGb3JjZSBjb2Vyc2lvbiB0byB1aW50MzIuIFRoaXMgd2lsbCBhbHNvIGNvZXJjZSBmYWxzZXkvTmFOIHZhbHVlcyB0byAwLlxuICBlbmQgPj4+PSAwXG4gIHN0YXJ0ID4+Pj0gMFxuXG4gIGlmIChlbmQgPD0gc3RhcnQpIHtcbiAgICByZXR1cm4gJydcbiAgfVxuXG4gIGlmICghZW5jb2RpbmcpIGVuY29kaW5nID0gJ3V0ZjgnXG5cbiAgd2hpbGUgKHRydWUpIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdoZXgnOlxuICAgICAgICByZXR1cm4gaGV4U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICAgIHJldHVybiB1dGY4U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgICByZXR1cm4gYXNjaWlTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICdsYXRpbjEnOlxuICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgICAgcmV0dXJuIGxhdGluMVNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICAgIHJldHVybiBiYXNlNjRTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICd1Y3MyJzpcbiAgICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgICByZXR1cm4gdXRmMTZsZVNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChsb3dlcmVkQ2FzZSkgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5rbm93biBlbmNvZGluZzogJyArIGVuY29kaW5nKVxuICAgICAgICBlbmNvZGluZyA9IChlbmNvZGluZyArICcnKS50b0xvd2VyQ2FzZSgpXG4gICAgICAgIGxvd2VyZWRDYXNlID0gdHJ1ZVxuICAgIH1cbiAgfVxufVxuXG4vLyBUaGlzIHByb3BlcnR5IGlzIHVzZWQgYnkgYEJ1ZmZlci5pc0J1ZmZlcmAgKGFuZCB0aGUgYGlzLWJ1ZmZlcmAgbnBtIHBhY2thZ2UpXG4vLyB0byBkZXRlY3QgYSBCdWZmZXIgaW5zdGFuY2UuIEl0J3Mgbm90IHBvc3NpYmxlIHRvIHVzZSBgaW5zdGFuY2VvZiBCdWZmZXJgXG4vLyByZWxpYWJseSBpbiBhIGJyb3dzZXJpZnkgY29udGV4dCBiZWNhdXNlIHRoZXJlIGNvdWxkIGJlIG11bHRpcGxlIGRpZmZlcmVudFxuLy8gY29waWVzIG9mIHRoZSAnYnVmZmVyJyBwYWNrYWdlIGluIHVzZS4gVGhpcyBtZXRob2Qgd29ya3MgZXZlbiBmb3IgQnVmZmVyXG4vLyBpbnN0YW5jZXMgdGhhdCB3ZXJlIGNyZWF0ZWQgZnJvbSBhbm90aGVyIGNvcHkgb2YgdGhlIGBidWZmZXJgIHBhY2thZ2UuXG4vLyBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9mZXJvc3MvYnVmZmVyL2lzc3Vlcy8xNTRcbkJ1ZmZlci5wcm90b3R5cGUuX2lzQnVmZmVyID0gdHJ1ZVxuXG5mdW5jdGlvbiBzd2FwIChiLCBuLCBtKSB7XG4gIHZhciBpID0gYltuXVxuICBiW25dID0gYlttXVxuICBiW21dID0gaVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnN3YXAxNiA9IGZ1bmN0aW9uIHN3YXAxNiAoKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBpZiAobGVuICUgMiAhPT0gMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdCdWZmZXIgc2l6ZSBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgMTYtYml0cycpXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkgKz0gMikge1xuICAgIHN3YXAodGhpcywgaSwgaSArIDEpXG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zd2FwMzIgPSBmdW5jdGlvbiBzd2FwMzIgKCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgaWYgKGxlbiAlIDQgIT09IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQnVmZmVyIHNpemUgbXVzdCBiZSBhIG11bHRpcGxlIG9mIDMyLWJpdHMnKVxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpICs9IDQpIHtcbiAgICBzd2FwKHRoaXMsIGksIGkgKyAzKVxuICAgIHN3YXAodGhpcywgaSArIDEsIGkgKyAyKVxuICB9XG4gIHJldHVybiB0aGlzXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuc3dhcDY0ID0gZnVuY3Rpb24gc3dhcDY0ICgpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIGlmIChsZW4gJSA4ICE9PSAwKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0J1ZmZlciBzaXplIG11c3QgYmUgYSBtdWx0aXBsZSBvZiA2NC1iaXRzJylcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSArPSA4KSB7XG4gICAgc3dhcCh0aGlzLCBpLCBpICsgNylcbiAgICBzd2FwKHRoaXMsIGkgKyAxLCBpICsgNilcbiAgICBzd2FwKHRoaXMsIGkgKyAyLCBpICsgNSlcbiAgICBzd2FwKHRoaXMsIGkgKyAzLCBpICsgNClcbiAgfVxuICByZXR1cm4gdGhpc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcgKCkge1xuICB2YXIgbGVuZ3RoID0gdGhpcy5sZW5ndGhcbiAgaWYgKGxlbmd0aCA9PT0gMCkgcmV0dXJuICcnXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSByZXR1cm4gdXRmOFNsaWNlKHRoaXMsIDAsIGxlbmd0aClcbiAgcmV0dXJuIHNsb3dUb1N0cmluZy5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUudG9Mb2NhbGVTdHJpbmcgPSBCdWZmZXIucHJvdG90eXBlLnRvU3RyaW5nXG5cbkJ1ZmZlci5wcm90b3R5cGUuZXF1YWxzID0gZnVuY3Rpb24gZXF1YWxzIChiKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyJylcbiAgaWYgKHRoaXMgPT09IGIpIHJldHVybiB0cnVlXG4gIHJldHVybiBCdWZmZXIuY29tcGFyZSh0aGlzLCBiKSA9PT0gMFxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluc3BlY3QgPSBmdW5jdGlvbiBpbnNwZWN0ICgpIHtcbiAgdmFyIHN0ciA9ICcnXG4gIHZhciBtYXggPSBleHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTXG4gIHN0ciA9IHRoaXMudG9TdHJpbmcoJ2hleCcsIDAsIG1heCkucmVwbGFjZSgvKC57Mn0pL2csICckMSAnKS50cmltKClcbiAgaWYgKHRoaXMubGVuZ3RoID4gbWF4KSBzdHIgKz0gJyAuLi4gJ1xuICByZXR1cm4gJzxCdWZmZXIgJyArIHN0ciArICc+J1xufVxuXG5CdWZmZXIucHJvdG90eXBlLmNvbXBhcmUgPSBmdW5jdGlvbiBjb21wYXJlICh0YXJnZXQsIHN0YXJ0LCBlbmQsIHRoaXNTdGFydCwgdGhpc0VuZCkge1xuICBpZiAoaXNJbnN0YW5jZSh0YXJnZXQsIFVpbnQ4QXJyYXkpKSB7XG4gICAgdGFyZ2V0ID0gQnVmZmVyLmZyb20odGFyZ2V0LCB0YXJnZXQub2Zmc2V0LCB0YXJnZXQuYnl0ZUxlbmd0aClcbiAgfVxuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcih0YXJnZXQpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICdUaGUgXCJ0YXJnZXRcIiBhcmd1bWVudCBtdXN0IGJlIG9uZSBvZiB0eXBlIEJ1ZmZlciBvciBVaW50OEFycmF5LiAnICtcbiAgICAgICdSZWNlaXZlZCB0eXBlICcgKyAodHlwZW9mIHRhcmdldClcbiAgICApXG4gIH1cblxuICBpZiAoc3RhcnQgPT09IHVuZGVmaW5lZCkge1xuICAgIHN0YXJ0ID0gMFxuICB9XG4gIGlmIChlbmQgPT09IHVuZGVmaW5lZCkge1xuICAgIGVuZCA9IHRhcmdldCA/IHRhcmdldC5sZW5ndGggOiAwXG4gIH1cbiAgaWYgKHRoaXNTdGFydCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhpc1N0YXJ0ID0gMFxuICB9XG4gIGlmICh0aGlzRW5kID09PSB1bmRlZmluZWQpIHtcbiAgICB0aGlzRW5kID0gdGhpcy5sZW5ndGhcbiAgfVxuXG4gIGlmIChzdGFydCA8IDAgfHwgZW5kID4gdGFyZ2V0Lmxlbmd0aCB8fCB0aGlzU3RhcnQgPCAwIHx8IHRoaXNFbmQgPiB0aGlzLmxlbmd0aCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdvdXQgb2YgcmFuZ2UgaW5kZXgnKVxuICB9XG5cbiAgaWYgKHRoaXNTdGFydCA+PSB0aGlzRW5kICYmIHN0YXJ0ID49IGVuZCkge1xuICAgIHJldHVybiAwXG4gIH1cbiAgaWYgKHRoaXNTdGFydCA+PSB0aGlzRW5kKSB7XG4gICAgcmV0dXJuIC0xXG4gIH1cbiAgaWYgKHN0YXJ0ID49IGVuZCkge1xuICAgIHJldHVybiAxXG4gIH1cblxuICBzdGFydCA+Pj49IDBcbiAgZW5kID4+Pj0gMFxuICB0aGlzU3RhcnQgPj4+PSAwXG4gIHRoaXNFbmQgPj4+PSAwXG5cbiAgaWYgKHRoaXMgPT09IHRhcmdldCkgcmV0dXJuIDBcblxuICB2YXIgeCA9IHRoaXNFbmQgLSB0aGlzU3RhcnRcbiAgdmFyIHkgPSBlbmQgLSBzdGFydFxuICB2YXIgbGVuID0gTWF0aC5taW4oeCwgeSlcblxuICB2YXIgdGhpc0NvcHkgPSB0aGlzLnNsaWNlKHRoaXNTdGFydCwgdGhpc0VuZClcbiAgdmFyIHRhcmdldENvcHkgPSB0YXJnZXQuc2xpY2Uoc3RhcnQsIGVuZClcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKSB7XG4gICAgaWYgKHRoaXNDb3B5W2ldICE9PSB0YXJnZXRDb3B5W2ldKSB7XG4gICAgICB4ID0gdGhpc0NvcHlbaV1cbiAgICAgIHkgPSB0YXJnZXRDb3B5W2ldXG4gICAgICBicmVha1xuICAgIH1cbiAgfVxuXG4gIGlmICh4IDwgeSkgcmV0dXJuIC0xXG4gIGlmICh5IDwgeCkgcmV0dXJuIDFcbiAgcmV0dXJuIDBcbn1cblxuLy8gRmluZHMgZWl0aGVyIHRoZSBmaXJzdCBpbmRleCBvZiBgdmFsYCBpbiBgYnVmZmVyYCBhdCBvZmZzZXQgPj0gYGJ5dGVPZmZzZXRgLFxuLy8gT1IgdGhlIGxhc3QgaW5kZXggb2YgYHZhbGAgaW4gYGJ1ZmZlcmAgYXQgb2Zmc2V0IDw9IGBieXRlT2Zmc2V0YC5cbi8vXG4vLyBBcmd1bWVudHM6XG4vLyAtIGJ1ZmZlciAtIGEgQnVmZmVyIHRvIHNlYXJjaFxuLy8gLSB2YWwgLSBhIHN0cmluZywgQnVmZmVyLCBvciBudW1iZXJcbi8vIC0gYnl0ZU9mZnNldCAtIGFuIGluZGV4IGludG8gYGJ1ZmZlcmA7IHdpbGwgYmUgY2xhbXBlZCB0byBhbiBpbnQzMlxuLy8gLSBlbmNvZGluZyAtIGFuIG9wdGlvbmFsIGVuY29kaW5nLCByZWxldmFudCBpcyB2YWwgaXMgYSBzdHJpbmdcbi8vIC0gZGlyIC0gdHJ1ZSBmb3IgaW5kZXhPZiwgZmFsc2UgZm9yIGxhc3RJbmRleE9mXG5mdW5jdGlvbiBiaWRpcmVjdGlvbmFsSW5kZXhPZiAoYnVmZmVyLCB2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCBkaXIpIHtcbiAgLy8gRW1wdHkgYnVmZmVyIG1lYW5zIG5vIG1hdGNoXG4gIGlmIChidWZmZXIubGVuZ3RoID09PSAwKSByZXR1cm4gLTFcblxuICAvLyBOb3JtYWxpemUgYnl0ZU9mZnNldFxuICBpZiAodHlwZW9mIGJ5dGVPZmZzZXQgPT09ICdzdHJpbmcnKSB7XG4gICAgZW5jb2RpbmcgPSBieXRlT2Zmc2V0XG4gICAgYnl0ZU9mZnNldCA9IDBcbiAgfSBlbHNlIGlmIChieXRlT2Zmc2V0ID4gMHg3ZmZmZmZmZikge1xuICAgIGJ5dGVPZmZzZXQgPSAweDdmZmZmZmZmXG4gIH0gZWxzZSBpZiAoYnl0ZU9mZnNldCA8IC0weDgwMDAwMDAwKSB7XG4gICAgYnl0ZU9mZnNldCA9IC0weDgwMDAwMDAwXG4gIH1cbiAgYnl0ZU9mZnNldCA9ICtieXRlT2Zmc2V0IC8vIENvZXJjZSB0byBOdW1iZXIuXG4gIGlmIChudW1iZXJJc05hTihieXRlT2Zmc2V0KSkge1xuICAgIC8vIGJ5dGVPZmZzZXQ6IGl0IGl0J3MgdW5kZWZpbmVkLCBudWxsLCBOYU4sIFwiZm9vXCIsIGV0Yywgc2VhcmNoIHdob2xlIGJ1ZmZlclxuICAgIGJ5dGVPZmZzZXQgPSBkaXIgPyAwIDogKGJ1ZmZlci5sZW5ndGggLSAxKVxuICB9XG5cbiAgLy8gTm9ybWFsaXplIGJ5dGVPZmZzZXQ6IG5lZ2F0aXZlIG9mZnNldHMgc3RhcnQgZnJvbSB0aGUgZW5kIG9mIHRoZSBidWZmZXJcbiAgaWYgKGJ5dGVPZmZzZXQgPCAwKSBieXRlT2Zmc2V0ID0gYnVmZmVyLmxlbmd0aCArIGJ5dGVPZmZzZXRcbiAgaWYgKGJ5dGVPZmZzZXQgPj0gYnVmZmVyLmxlbmd0aCkge1xuICAgIGlmIChkaXIpIHJldHVybiAtMVxuICAgIGVsc2UgYnl0ZU9mZnNldCA9IGJ1ZmZlci5sZW5ndGggLSAxXG4gIH0gZWxzZSBpZiAoYnl0ZU9mZnNldCA8IDApIHtcbiAgICBpZiAoZGlyKSBieXRlT2Zmc2V0ID0gMFxuICAgIGVsc2UgcmV0dXJuIC0xXG4gIH1cblxuICAvLyBOb3JtYWxpemUgdmFsXG4gIGlmICh0eXBlb2YgdmFsID09PSAnc3RyaW5nJykge1xuICAgIHZhbCA9IEJ1ZmZlci5mcm9tKHZhbCwgZW5jb2RpbmcpXG4gIH1cblxuICAvLyBGaW5hbGx5LCBzZWFyY2ggZWl0aGVyIGluZGV4T2YgKGlmIGRpciBpcyB0cnVlKSBvciBsYXN0SW5kZXhPZlxuICBpZiAoQnVmZmVyLmlzQnVmZmVyKHZhbCkpIHtcbiAgICAvLyBTcGVjaWFsIGNhc2U6IGxvb2tpbmcgZm9yIGVtcHR5IHN0cmluZy9idWZmZXIgYWx3YXlzIGZhaWxzXG4gICAgaWYgKHZhbC5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiAtMVxuICAgIH1cbiAgICByZXR1cm4gYXJyYXlJbmRleE9mKGJ1ZmZlciwgdmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgZGlyKVxuICB9IGVsc2UgaWYgKHR5cGVvZiB2YWwgPT09ICdudW1iZXInKSB7XG4gICAgdmFsID0gdmFsICYgMHhGRiAvLyBTZWFyY2ggZm9yIGEgYnl0ZSB2YWx1ZSBbMC0yNTVdXG4gICAgaWYgKHR5cGVvZiBVaW50OEFycmF5LnByb3RvdHlwZS5pbmRleE9mID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBpZiAoZGlyKSB7XG4gICAgICAgIHJldHVybiBVaW50OEFycmF5LnByb3RvdHlwZS5pbmRleE9mLmNhbGwoYnVmZmVyLCB2YWwsIGJ5dGVPZmZzZXQpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gVWludDhBcnJheS5wcm90b3R5cGUubGFzdEluZGV4T2YuY2FsbChidWZmZXIsIHZhbCwgYnl0ZU9mZnNldClcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGFycmF5SW5kZXhPZihidWZmZXIsIFsgdmFsIF0sIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCBkaXIpXG4gIH1cblxuICB0aHJvdyBuZXcgVHlwZUVycm9yKCd2YWwgbXVzdCBiZSBzdHJpbmcsIG51bWJlciBvciBCdWZmZXInKVxufVxuXG5mdW5jdGlvbiBhcnJheUluZGV4T2YgKGFyciwgdmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgZGlyKSB7XG4gIHZhciBpbmRleFNpemUgPSAxXG4gIHZhciBhcnJMZW5ndGggPSBhcnIubGVuZ3RoXG4gIHZhciB2YWxMZW5ndGggPSB2YWwubGVuZ3RoXG5cbiAgaWYgKGVuY29kaW5nICE9PSB1bmRlZmluZWQpIHtcbiAgICBlbmNvZGluZyA9IFN0cmluZyhlbmNvZGluZykudG9Mb3dlckNhc2UoKVxuICAgIGlmIChlbmNvZGluZyA9PT0gJ3VjczInIHx8IGVuY29kaW5nID09PSAndWNzLTInIHx8XG4gICAgICAgIGVuY29kaW5nID09PSAndXRmMTZsZScgfHwgZW5jb2RpbmcgPT09ICd1dGYtMTZsZScpIHtcbiAgICAgIGlmIChhcnIubGVuZ3RoIDwgMiB8fCB2YWwubGVuZ3RoIDwgMikge1xuICAgICAgICByZXR1cm4gLTFcbiAgICAgIH1cbiAgICAgIGluZGV4U2l6ZSA9IDJcbiAgICAgIGFyckxlbmd0aCAvPSAyXG4gICAgICB2YWxMZW5ndGggLz0gMlxuICAgICAgYnl0ZU9mZnNldCAvPSAyXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZCAoYnVmLCBpKSB7XG4gICAgaWYgKGluZGV4U2l6ZSA9PT0gMSkge1xuICAgICAgcmV0dXJuIGJ1ZltpXVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gYnVmLnJlYWRVSW50MTZCRShpICogaW5kZXhTaXplKVxuICAgIH1cbiAgfVxuXG4gIHZhciBpXG4gIGlmIChkaXIpIHtcbiAgICB2YXIgZm91bmRJbmRleCA9IC0xXG4gICAgZm9yIChpID0gYnl0ZU9mZnNldDsgaSA8IGFyckxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAocmVhZChhcnIsIGkpID09PSByZWFkKHZhbCwgZm91bmRJbmRleCA9PT0gLTEgPyAwIDogaSAtIGZvdW5kSW5kZXgpKSB7XG4gICAgICAgIGlmIChmb3VuZEluZGV4ID09PSAtMSkgZm91bmRJbmRleCA9IGlcbiAgICAgICAgaWYgKGkgLSBmb3VuZEluZGV4ICsgMSA9PT0gdmFsTGVuZ3RoKSByZXR1cm4gZm91bmRJbmRleCAqIGluZGV4U2l6ZVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKGZvdW5kSW5kZXggIT09IC0xKSBpIC09IGkgLSBmb3VuZEluZGV4XG4gICAgICAgIGZvdW5kSW5kZXggPSAtMVxuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAoYnl0ZU9mZnNldCArIHZhbExlbmd0aCA+IGFyckxlbmd0aCkgYnl0ZU9mZnNldCA9IGFyckxlbmd0aCAtIHZhbExlbmd0aFxuICAgIGZvciAoaSA9IGJ5dGVPZmZzZXQ7IGkgPj0gMDsgaS0tKSB7XG4gICAgICB2YXIgZm91bmQgPSB0cnVlXG4gICAgICBmb3IgKHZhciBqID0gMDsgaiA8IHZhbExlbmd0aDsgaisrKSB7XG4gICAgICAgIGlmIChyZWFkKGFyciwgaSArIGopICE9PSByZWFkKHZhbCwgaikpIHtcbiAgICAgICAgICBmb3VuZCA9IGZhbHNlXG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGZvdW5kKSByZXR1cm4gaVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiAtMVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluY2x1ZGVzID0gZnVuY3Rpb24gaW5jbHVkZXMgKHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcpIHtcbiAgcmV0dXJuIHRoaXMuaW5kZXhPZih2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nKSAhPT0gLTFcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5pbmRleE9mID0gZnVuY3Rpb24gaW5kZXhPZiAodmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZykge1xuICByZXR1cm4gYmlkaXJlY3Rpb25hbEluZGV4T2YodGhpcywgdmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgdHJ1ZSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5sYXN0SW5kZXhPZiA9IGZ1bmN0aW9uIGxhc3RJbmRleE9mICh2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nKSB7XG4gIHJldHVybiBiaWRpcmVjdGlvbmFsSW5kZXhPZih0aGlzLCB2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCBmYWxzZSlcbn1cblxuZnVuY3Rpb24gaGV4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICBvZmZzZXQgPSBOdW1iZXIob2Zmc2V0KSB8fCAwXG4gIHZhciByZW1haW5pbmcgPSBidWYubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmICghbGVuZ3RoKSB7XG4gICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gIH0gZWxzZSB7XG4gICAgbGVuZ3RoID0gTnVtYmVyKGxlbmd0aClcbiAgICBpZiAobGVuZ3RoID4gcmVtYWluaW5nKSB7XG4gICAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgICB9XG4gIH1cblxuICB2YXIgc3RyTGVuID0gc3RyaW5nLmxlbmd0aFxuXG4gIGlmIChsZW5ndGggPiBzdHJMZW4gLyAyKSB7XG4gICAgbGVuZ3RoID0gc3RyTGVuIC8gMlxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyArK2kpIHtcbiAgICB2YXIgcGFyc2VkID0gcGFyc2VJbnQoc3RyaW5nLnN1YnN0cihpICogMiwgMiksIDE2KVxuICAgIGlmIChudW1iZXJJc05hTihwYXJzZWQpKSByZXR1cm4gaVxuICAgIGJ1ZltvZmZzZXQgKyBpXSA9IHBhcnNlZFxuICB9XG4gIHJldHVybiBpXG59XG5cbmZ1bmN0aW9uIHV0ZjhXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKHV0ZjhUb0J5dGVzKHN0cmluZywgYnVmLmxlbmd0aCAtIG9mZnNldCksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIGFzY2lpV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcihhc2NpaVRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gbGF0aW4xV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYXNjaWlXcml0ZShidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIGJhc2U2NFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIoYmFzZTY0VG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiB1Y3MyV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcih1dGYxNmxlVG9CeXRlcyhzdHJpbmcsIGJ1Zi5sZW5ndGggLSBvZmZzZXQpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24gd3JpdGUgKHN0cmluZywgb2Zmc2V0LCBsZW5ndGgsIGVuY29kaW5nKSB7XG4gIC8vIEJ1ZmZlciN3cml0ZShzdHJpbmcpXG4gIGlmIChvZmZzZXQgPT09IHVuZGVmaW5lZCkge1xuICAgIGVuY29kaW5nID0gJ3V0ZjgnXG4gICAgbGVuZ3RoID0gdGhpcy5sZW5ndGhcbiAgICBvZmZzZXQgPSAwXG4gIC8vIEJ1ZmZlciN3cml0ZShzdHJpbmcsIGVuY29kaW5nKVxuICB9IGVsc2UgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkICYmIHR5cGVvZiBvZmZzZXQgPT09ICdzdHJpbmcnKSB7XG4gICAgZW5jb2RpbmcgPSBvZmZzZXRcbiAgICBsZW5ndGggPSB0aGlzLmxlbmd0aFxuICAgIG9mZnNldCA9IDBcbiAgLy8gQnVmZmVyI3dyaXRlKHN0cmluZywgb2Zmc2V0WywgbGVuZ3RoXVssIGVuY29kaW5nXSlcbiAgfSBlbHNlIGlmIChpc0Zpbml0ZShvZmZzZXQpKSB7XG4gICAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gICAgaWYgKGlzRmluaXRlKGxlbmd0aCkpIHtcbiAgICAgIGxlbmd0aCA9IGxlbmd0aCA+Pj4gMFxuICAgICAgaWYgKGVuY29kaW5nID09PSB1bmRlZmluZWQpIGVuY29kaW5nID0gJ3V0ZjgnXG4gICAgfSBlbHNlIHtcbiAgICAgIGVuY29kaW5nID0gbGVuZ3RoXG4gICAgICBsZW5ndGggPSB1bmRlZmluZWRcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgJ0J1ZmZlci53cml0ZShzdHJpbmcsIGVuY29kaW5nLCBvZmZzZXRbLCBsZW5ndGhdKSBpcyBubyBsb25nZXIgc3VwcG9ydGVkJ1xuICAgIClcbiAgfVxuXG4gIHZhciByZW1haW5pbmcgPSB0aGlzLmxlbmd0aCAtIG9mZnNldFxuICBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQgfHwgbGVuZ3RoID4gcmVtYWluaW5nKSBsZW5ndGggPSByZW1haW5pbmdcblxuICBpZiAoKHN0cmluZy5sZW5ndGggPiAwICYmIChsZW5ndGggPCAwIHx8IG9mZnNldCA8IDApKSB8fCBvZmZzZXQgPiB0aGlzLmxlbmd0aCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdBdHRlbXB0IHRvIHdyaXRlIG91dHNpZGUgYnVmZmVyIGJvdW5kcycpXG4gIH1cblxuICBpZiAoIWVuY29kaW5nKSBlbmNvZGluZyA9ICd1dGY4J1xuXG4gIHZhciBsb3dlcmVkQ2FzZSA9IGZhbHNlXG4gIGZvciAoOzspIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdoZXgnOlxuICAgICAgICByZXR1cm4gaGV4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICAgIHJldHVybiB1dGY4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgICByZXR1cm4gYXNjaWlXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICdsYXRpbjEnOlxuICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgICAgcmV0dXJuIGxhdGluMVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICAgIC8vIFdhcm5pbmc6IG1heExlbmd0aCBub3QgdGFrZW4gaW50byBhY2NvdW50IGluIGJhc2U2NFdyaXRlXG4gICAgICAgIHJldHVybiBiYXNlNjRXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICd1Y3MyJzpcbiAgICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgICByZXR1cm4gdWNzMldyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChsb3dlcmVkQ2FzZSkgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5rbm93biBlbmNvZGluZzogJyArIGVuY29kaW5nKVxuICAgICAgICBlbmNvZGluZyA9ICgnJyArIGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpXG4gICAgICAgIGxvd2VyZWRDYXNlID0gdHJ1ZVxuICAgIH1cbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uIHRvSlNPTiAoKSB7XG4gIHJldHVybiB7XG4gICAgdHlwZTogJ0J1ZmZlcicsXG4gICAgZGF0YTogQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwodGhpcy5fYXJyIHx8IHRoaXMsIDApXG4gIH1cbn1cblxuZnVuY3Rpb24gYmFzZTY0U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICBpZiAoc3RhcnQgPT09IDAgJiYgZW5kID09PSBidWYubGVuZ3RoKSB7XG4gICAgcmV0dXJuIGJhc2U2NC5mcm9tQnl0ZUFycmF5KGJ1ZilcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmLnNsaWNlKHN0YXJ0LCBlbmQpKVxuICB9XG59XG5cbmZ1bmN0aW9uIHV0ZjhTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcbiAgdmFyIHJlcyA9IFtdXG5cbiAgdmFyIGkgPSBzdGFydFxuICB3aGlsZSAoaSA8IGVuZCkge1xuICAgIHZhciBmaXJzdEJ5dGUgPSBidWZbaV1cbiAgICB2YXIgY29kZVBvaW50ID0gbnVsbFxuICAgIHZhciBieXRlc1BlclNlcXVlbmNlID0gKGZpcnN0Qnl0ZSA+IDB4RUYpID8gNFxuICAgICAgOiAoZmlyc3RCeXRlID4gMHhERikgPyAzXG4gICAgICAgIDogKGZpcnN0Qnl0ZSA+IDB4QkYpID8gMlxuICAgICAgICAgIDogMVxuXG4gICAgaWYgKGkgKyBieXRlc1BlclNlcXVlbmNlIDw9IGVuZCkge1xuICAgICAgdmFyIHNlY29uZEJ5dGUsIHRoaXJkQnl0ZSwgZm91cnRoQnl0ZSwgdGVtcENvZGVQb2ludFxuXG4gICAgICBzd2l0Y2ggKGJ5dGVzUGVyU2VxdWVuY2UpIHtcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgIGlmIChmaXJzdEJ5dGUgPCAweDgwKSB7XG4gICAgICAgICAgICBjb2RlUG9pbnQgPSBmaXJzdEJ5dGVcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgIHNlY29uZEJ5dGUgPSBidWZbaSArIDFdXG4gICAgICAgICAgaWYgKChzZWNvbmRCeXRlICYgMHhDMCkgPT09IDB4ODApIHtcbiAgICAgICAgICAgIHRlbXBDb2RlUG9pbnQgPSAoZmlyc3RCeXRlICYgMHgxRikgPDwgMHg2IHwgKHNlY29uZEJ5dGUgJiAweDNGKVxuICAgICAgICAgICAgaWYgKHRlbXBDb2RlUG9pbnQgPiAweDdGKSB7XG4gICAgICAgICAgICAgIGNvZGVQb2ludCA9IHRlbXBDb2RlUG9pbnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSAzOlxuICAgICAgICAgIHNlY29uZEJ5dGUgPSBidWZbaSArIDFdXG4gICAgICAgICAgdGhpcmRCeXRlID0gYnVmW2kgKyAyXVxuICAgICAgICAgIGlmICgoc2Vjb25kQnl0ZSAmIDB4QzApID09PSAweDgwICYmICh0aGlyZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCkge1xuICAgICAgICAgICAgdGVtcENvZGVQb2ludCA9IChmaXJzdEJ5dGUgJiAweEYpIDw8IDB4QyB8IChzZWNvbmRCeXRlICYgMHgzRikgPDwgMHg2IHwgKHRoaXJkQnl0ZSAmIDB4M0YpXG4gICAgICAgICAgICBpZiAodGVtcENvZGVQb2ludCA+IDB4N0ZGICYmICh0ZW1wQ29kZVBvaW50IDwgMHhEODAwIHx8IHRlbXBDb2RlUG9pbnQgPiAweERGRkYpKSB7XG4gICAgICAgICAgICAgIGNvZGVQb2ludCA9IHRlbXBDb2RlUG9pbnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSA0OlxuICAgICAgICAgIHNlY29uZEJ5dGUgPSBidWZbaSArIDFdXG4gICAgICAgICAgdGhpcmRCeXRlID0gYnVmW2kgKyAyXVxuICAgICAgICAgIGZvdXJ0aEJ5dGUgPSBidWZbaSArIDNdXG4gICAgICAgICAgaWYgKChzZWNvbmRCeXRlICYgMHhDMCkgPT09IDB4ODAgJiYgKHRoaXJkQnl0ZSAmIDB4QzApID09PSAweDgwICYmIChmb3VydGhCeXRlICYgMHhDMCkgPT09IDB4ODApIHtcbiAgICAgICAgICAgIHRlbXBDb2RlUG9pbnQgPSAoZmlyc3RCeXRlICYgMHhGKSA8PCAweDEyIHwgKHNlY29uZEJ5dGUgJiAweDNGKSA8PCAweEMgfCAodGhpcmRCeXRlICYgMHgzRikgPDwgMHg2IHwgKGZvdXJ0aEJ5dGUgJiAweDNGKVxuICAgICAgICAgICAgaWYgKHRlbXBDb2RlUG9pbnQgPiAweEZGRkYgJiYgdGVtcENvZGVQb2ludCA8IDB4MTEwMDAwKSB7XG4gICAgICAgICAgICAgIGNvZGVQb2ludCA9IHRlbXBDb2RlUG9pbnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGNvZGVQb2ludCA9PT0gbnVsbCkge1xuICAgICAgLy8gd2UgZGlkIG5vdCBnZW5lcmF0ZSBhIHZhbGlkIGNvZGVQb2ludCBzbyBpbnNlcnQgYVxuICAgICAgLy8gcmVwbGFjZW1lbnQgY2hhciAoVStGRkZEKSBhbmQgYWR2YW5jZSBvbmx5IDEgYnl0ZVxuICAgICAgY29kZVBvaW50ID0gMHhGRkZEXG4gICAgICBieXRlc1BlclNlcXVlbmNlID0gMVxuICAgIH0gZWxzZSBpZiAoY29kZVBvaW50ID4gMHhGRkZGKSB7XG4gICAgICAvLyBlbmNvZGUgdG8gdXRmMTYgKHN1cnJvZ2F0ZSBwYWlyIGRhbmNlKVxuICAgICAgY29kZVBvaW50IC09IDB4MTAwMDBcbiAgICAgIHJlcy5wdXNoKGNvZGVQb2ludCA+Pj4gMTAgJiAweDNGRiB8IDB4RDgwMClcbiAgICAgIGNvZGVQb2ludCA9IDB4REMwMCB8IGNvZGVQb2ludCAmIDB4M0ZGXG4gICAgfVxuXG4gICAgcmVzLnB1c2goY29kZVBvaW50KVxuICAgIGkgKz0gYnl0ZXNQZXJTZXF1ZW5jZVxuICB9XG5cbiAgcmV0dXJuIGRlY29kZUNvZGVQb2ludHNBcnJheShyZXMpXG59XG5cbi8vIEJhc2VkIG9uIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzIyNzQ3MjcyLzY4MDc0MiwgdGhlIGJyb3dzZXIgd2l0aFxuLy8gdGhlIGxvd2VzdCBsaW1pdCBpcyBDaHJvbWUsIHdpdGggMHgxMDAwMCBhcmdzLlxuLy8gV2UgZ28gMSBtYWduaXR1ZGUgbGVzcywgZm9yIHNhZmV0eVxudmFyIE1BWF9BUkdVTUVOVFNfTEVOR1RIID0gMHgxMDAwXG5cbmZ1bmN0aW9uIGRlY29kZUNvZGVQb2ludHNBcnJheSAoY29kZVBvaW50cykge1xuICB2YXIgbGVuID0gY29kZVBvaW50cy5sZW5ndGhcbiAgaWYgKGxlbiA8PSBNQVhfQVJHVU1FTlRTX0xFTkdUSCkge1xuICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KFN0cmluZywgY29kZVBvaW50cykgLy8gYXZvaWQgZXh0cmEgc2xpY2UoKVxuICB9XG5cbiAgLy8gRGVjb2RlIGluIGNodW5rcyB0byBhdm9pZCBcImNhbGwgc3RhY2sgc2l6ZSBleGNlZWRlZFwiLlxuICB2YXIgcmVzID0gJydcbiAgdmFyIGkgPSAwXG4gIHdoaWxlIChpIDwgbGVuKSB7XG4gICAgcmVzICs9IFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkoXG4gICAgICBTdHJpbmcsXG4gICAgICBjb2RlUG9pbnRzLnNsaWNlKGksIGkgKz0gTUFYX0FSR1VNRU5UU19MRU5HVEgpXG4gICAgKVxuICB9XG4gIHJldHVybiByZXNcbn1cblxuZnVuY3Rpb24gYXNjaWlTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciByZXQgPSAnJ1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyArK2kpIHtcbiAgICByZXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShidWZbaV0gJiAweDdGKVxuICB9XG4gIHJldHVybiByZXRcbn1cblxuZnVuY3Rpb24gbGF0aW4xU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmV0ID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgKytpKSB7XG4gICAgcmV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldKVxuICB9XG4gIHJldHVybiByZXRcbn1cblxuZnVuY3Rpb24gaGV4U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuXG4gIGlmICghc3RhcnQgfHwgc3RhcnQgPCAwKSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgfHwgZW5kIDwgMCB8fCBlbmQgPiBsZW4pIGVuZCA9IGxlblxuXG4gIHZhciBvdXQgPSAnJ1xuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7ICsraSkge1xuICAgIG91dCArPSB0b0hleChidWZbaV0pXG4gIH1cbiAgcmV0dXJuIG91dFxufVxuXG5mdW5jdGlvbiB1dGYxNmxlU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgYnl0ZXMgPSBidWYuc2xpY2Uoc3RhcnQsIGVuZClcbiAgdmFyIHJlcyA9ICcnXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYnl0ZXMubGVuZ3RoOyBpICs9IDIpIHtcbiAgICByZXMgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShieXRlc1tpXSArIChieXRlc1tpICsgMV0gKiAyNTYpKVxuICB9XG4gIHJldHVybiByZXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zbGljZSA9IGZ1bmN0aW9uIHNsaWNlIChzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBzdGFydCA9IH5+c3RhcnRcbiAgZW5kID0gZW5kID09PSB1bmRlZmluZWQgPyBsZW4gOiB+fmVuZFxuXG4gIGlmIChzdGFydCA8IDApIHtcbiAgICBzdGFydCArPSBsZW5cbiAgICBpZiAoc3RhcnQgPCAwKSBzdGFydCA9IDBcbiAgfSBlbHNlIGlmIChzdGFydCA+IGxlbikge1xuICAgIHN0YXJ0ID0gbGVuXG4gIH1cblxuICBpZiAoZW5kIDwgMCkge1xuICAgIGVuZCArPSBsZW5cbiAgICBpZiAoZW5kIDwgMCkgZW5kID0gMFxuICB9IGVsc2UgaWYgKGVuZCA+IGxlbikge1xuICAgIGVuZCA9IGxlblxuICB9XG5cbiAgaWYgKGVuZCA8IHN0YXJ0KSBlbmQgPSBzdGFydFxuXG4gIHZhciBuZXdCdWYgPSB0aGlzLnN1YmFycmF5KHN0YXJ0LCBlbmQpXG4gIC8vIFJldHVybiBhbiBhdWdtZW50ZWQgYFVpbnQ4QXJyYXlgIGluc3RhbmNlXG4gIG5ld0J1Zi5fX3Byb3RvX18gPSBCdWZmZXIucHJvdG90eXBlXG4gIHJldHVybiBuZXdCdWZcbn1cblxuLypcbiAqIE5lZWQgdG8gbWFrZSBzdXJlIHRoYXQgYnVmZmVyIGlzbid0IHRyeWluZyB0byB3cml0ZSBvdXQgb2YgYm91bmRzLlxuICovXG5mdW5jdGlvbiBjaGVja09mZnNldCAob2Zmc2V0LCBleHQsIGxlbmd0aCkge1xuICBpZiAoKG9mZnNldCAlIDEpICE9PSAwIHx8IG9mZnNldCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdvZmZzZXQgaXMgbm90IHVpbnQnKVxuICBpZiAob2Zmc2V0ICsgZXh0ID4gbGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignVHJ5aW5nIHRvIGFjY2VzcyBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnRMRSA9IGZ1bmN0aW9uIHJlYWRVSW50TEUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XVxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyBpXSAqIG11bFxuICB9XG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50QkUgPSBmdW5jdGlvbiByZWFkVUludEJFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcbiAgfVxuXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIC0tYnl0ZUxlbmd0aF1cbiAgdmFyIG11bCA9IDFcbiAgd2hpbGUgKGJ5dGVMZW5ndGggPiAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgLS1ieXRlTGVuZ3RoXSAqIG11bFxuICB9XG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50OCA9IGZ1bmN0aW9uIHJlYWRVSW50OCAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAxLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIHRoaXNbb2Zmc2V0XVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZMRSA9IGZ1bmN0aW9uIHJlYWRVSW50MTZMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIHRoaXNbb2Zmc2V0XSB8ICh0aGlzW29mZnNldCArIDFdIDw8IDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQxNkJFID0gZnVuY3Rpb24gcmVhZFVJbnQxNkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSA8PCA4KSB8IHRoaXNbb2Zmc2V0ICsgMV1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyTEUgPSBmdW5jdGlvbiByZWFkVUludDMyTEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICgodGhpc1tvZmZzZXRdKSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCAxNikpICtcbiAgICAgICh0aGlzW29mZnNldCArIDNdICogMHgxMDAwMDAwKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJCRSA9IGZ1bmN0aW9uIHJlYWRVSW50MzJCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSAqIDB4MTAwMDAwMCkgK1xuICAgICgodGhpc1tvZmZzZXQgKyAxXSA8PCAxNikgfFxuICAgICh0aGlzW29mZnNldCArIDJdIDw8IDgpIHxcbiAgICB0aGlzW29mZnNldCArIDNdKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnRMRSA9IGZ1bmN0aW9uIHJlYWRJbnRMRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIGldICogbXVsXG4gIH1cbiAgbXVsICo9IDB4ODBcblxuICBpZiAodmFsID49IG11bCkgdmFsIC09IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50QkUgPSBmdW5jdGlvbiByZWFkSW50QkUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoXG4gIHZhciBtdWwgPSAxXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIC0taV1cbiAgd2hpbGUgKGkgPiAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgLS1pXSAqIG11bFxuICB9XG4gIG11bCAqPSAweDgwXG5cbiAgaWYgKHZhbCA+PSBtdWwpIHZhbCAtPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aClcblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDggPSBmdW5jdGlvbiByZWFkSW50OCAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAxLCB0aGlzLmxlbmd0aClcbiAgaWYgKCEodGhpc1tvZmZzZXRdICYgMHg4MCkpIHJldHVybiAodGhpc1tvZmZzZXRdKVxuICByZXR1cm4gKCgweGZmIC0gdGhpc1tvZmZzZXRdICsgMSkgKiAtMSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZMRSA9IGZ1bmN0aW9uIHJlYWRJbnQxNkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdIHwgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOClcbiAgcmV0dXJuICh2YWwgJiAweDgwMDApID8gdmFsIHwgMHhGRkZGMDAwMCA6IHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkJFID0gZnVuY3Rpb24gcmVhZEludDE2QkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIDFdIHwgKHRoaXNbb2Zmc2V0XSA8PCA4KVxuICByZXR1cm4gKHZhbCAmIDB4ODAwMCkgPyB2YWwgfCAweEZGRkYwMDAwIDogdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyTEUgPSBmdW5jdGlvbiByZWFkSW50MzJMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSkgfFxuICAgICh0aGlzW29mZnNldCArIDFdIDw8IDgpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCAxNikgfFxuICAgICh0aGlzW29mZnNldCArIDNdIDw8IDI0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQzMkJFID0gZnVuY3Rpb24gcmVhZEludDMyQkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0gPDwgMjQpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCAxNikgfFxuICAgICh0aGlzW29mZnNldCArIDJdIDw8IDgpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAzXSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRmxvYXRMRSA9IGZ1bmN0aW9uIHJlYWRGbG9hdExFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgdHJ1ZSwgMjMsIDQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0QkUgPSBmdW5jdGlvbiByZWFkRmxvYXRCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIGZhbHNlLCAyMywgNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRG91YmxlTEUgPSBmdW5jdGlvbiByZWFkRG91YmxlTEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgOCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCB0cnVlLCA1MiwgOClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRG91YmxlQkUgPSBmdW5jdGlvbiByZWFkRG91YmxlQkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgOCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCBmYWxzZSwgNTIsIDgpXG59XG5cbmZ1bmN0aW9uIGNoZWNrSW50IChidWYsIHZhbHVlLCBvZmZzZXQsIGV4dCwgbWF4LCBtaW4pIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYnVmKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJidWZmZXJcIiBhcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyIGluc3RhbmNlJylcbiAgaWYgKHZhbHVlID4gbWF4IHx8IHZhbHVlIDwgbWluKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignXCJ2YWx1ZVwiIGFyZ3VtZW50IGlzIG91dCBvZiBib3VuZHMnKVxuICBpZiAob2Zmc2V0ICsgZXh0ID4gYnVmLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0luZGV4IG91dCBvZiByYW5nZScpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50TEUgPSBmdW5jdGlvbiB3cml0ZVVJbnRMRSAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICB2YXIgbWF4Qnl0ZXMgPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCkgLSAxXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbWF4Qnl0ZXMsIDApXG4gIH1cblxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgdGhpc1tvZmZzZXRdID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICh2YWx1ZSAvIG11bCkgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludEJFID0gZnVuY3Rpb24gd3JpdGVVSW50QkUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgdmFyIG1heEJ5dGVzID0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpIC0gMVxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG1heEJ5dGVzLCAwKVxuICB9XG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoIC0gMVxuICB2YXIgbXVsID0gMVxuICB0aGlzW29mZnNldCArIGldID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgtLWkgPj0gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAodmFsdWUgLyBtdWwpICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQ4ID0gZnVuY3Rpb24gd3JpdGVVSW50OCAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDEsIDB4ZmYsIDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyAxXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZMRSA9IGZ1bmN0aW9uIHdyaXRlVUludDE2TEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweGZmZmYsIDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZCRSA9IGZ1bmN0aW9uIHdyaXRlVUludDE2QkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweGZmZmYsIDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gOClcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJMRSA9IGZ1bmN0aW9uIHdyaXRlVUludDMyTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweGZmZmZmZmZmLCAwKVxuICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlID4+PiAyNClcbiAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJCRSA9IGZ1bmN0aW9uIHdyaXRlVUludDMyQkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweGZmZmZmZmZmLCAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDI0KVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiAxNilcbiAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gOClcbiAgdGhpc1tvZmZzZXQgKyAzXSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnRMRSA9IGZ1bmN0aW9uIHdyaXRlSW50TEUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgdmFyIGxpbWl0ID0gTWF0aC5wb3coMiwgKDggKiBieXRlTGVuZ3RoKSAtIDEpXG5cbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBsaW1pdCAtIDEsIC1saW1pdClcbiAgfVxuXG4gIHZhciBpID0gMFxuICB2YXIgbXVsID0gMVxuICB2YXIgc3ViID0gMFxuICB0aGlzW29mZnNldF0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICBpZiAodmFsdWUgPCAwICYmIHN1YiA9PT0gMCAmJiB0aGlzW29mZnNldCArIGkgLSAxXSAhPT0gMCkge1xuICAgICAgc3ViID0gMVxuICAgIH1cbiAgICB0aGlzW29mZnNldCArIGldID0gKCh2YWx1ZSAvIG11bCkgPj4gMCkgLSBzdWIgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50QkUgPSBmdW5jdGlvbiB3cml0ZUludEJFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBsaW1pdCA9IE1hdGgucG93KDIsICg4ICogYnl0ZUxlbmd0aCkgLSAxKVxuXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbGltaXQgLSAxLCAtbGltaXQpXG4gIH1cblxuICB2YXIgaSA9IGJ5dGVMZW5ndGggLSAxXG4gIHZhciBtdWwgPSAxXG4gIHZhciBzdWIgPSAwXG4gIHRoaXNbb2Zmc2V0ICsgaV0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKC0taSA+PSAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgaWYgKHZhbHVlIDwgMCAmJiBzdWIgPT09IDAgJiYgdGhpc1tvZmZzZXQgKyBpICsgMV0gIT09IDApIHtcbiAgICAgIHN1YiA9IDFcbiAgICB9XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICgodmFsdWUgLyBtdWwpID4+IDApIC0gc3ViICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDggPSBmdW5jdGlvbiB3cml0ZUludDggKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAxLCAweDdmLCAtMHg4MClcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmICsgdmFsdWUgKyAxXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyAxXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkxFID0gZnVuY3Rpb24gd3JpdGVJbnQxNkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHg3ZmZmLCAtMHg4MDAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZCRSA9IGZ1bmN0aW9uIHdyaXRlSW50MTZCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4N2ZmZiwgLTB4ODAwMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiA4KVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyTEUgPSBmdW5jdGlvbiB3cml0ZUludDMyTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweDdmZmZmZmZmLCAtMHg4MDAwMDAwMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgPj4+IDI0KVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MzJCRSA9IGZ1bmN0aW9uIHdyaXRlSW50MzJCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4N2ZmZmZmZmYsIC0weDgwMDAwMDAwKVxuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmZmZmZmZmYgKyB2YWx1ZSArIDFcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiAyNClcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDgpXG4gIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5mdW5jdGlvbiBjaGVja0lFRUU3NTQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgZXh0LCBtYXgsIG1pbikge1xuICBpZiAob2Zmc2V0ICsgZXh0ID4gYnVmLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0luZGV4IG91dCBvZiByYW5nZScpXG4gIGlmIChvZmZzZXQgPCAwKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW5kZXggb3V0IG9mIHJhbmdlJylcbn1cblxuZnVuY3Rpb24gd3JpdGVGbG9hdCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgY2hlY2tJRUVFNzU0KGJ1ZiwgdmFsdWUsIG9mZnNldCwgNCwgMy40MDI4MjM0NjYzODUyODg2ZSszOCwgLTMuNDAyODIzNDY2Mzg1Mjg4NmUrMzgpXG4gIH1cbiAgaWVlZTc1NC53cml0ZShidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgMjMsIDQpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdExFID0gZnVuY3Rpb24gd3JpdGVGbG9hdExFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVGbG9hdCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUZsb2F0QkUgPSBmdW5jdGlvbiB3cml0ZUZsb2F0QkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gd3JpdGVEb3VibGUgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrSUVFRTc1NChidWYsIHZhbHVlLCBvZmZzZXQsIDgsIDEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4LCAtMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgpXG4gIH1cbiAgaWVlZTc1NC53cml0ZShidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgNTIsIDgpXG4gIHJldHVybiBvZmZzZXQgKyA4XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVEb3VibGVMRSA9IGZ1bmN0aW9uIHdyaXRlRG91YmxlTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUJFID0gZnVuY3Rpb24gd3JpdGVEb3VibGVCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRG91YmxlKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuLy8gY29weSh0YXJnZXRCdWZmZXIsIHRhcmdldFN0YXJ0PTAsIHNvdXJjZVN0YXJ0PTAsIHNvdXJjZUVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS5jb3B5ID0gZnVuY3Rpb24gY29weSAodGFyZ2V0LCB0YXJnZXRTdGFydCwgc3RhcnQsIGVuZCkge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcih0YXJnZXQpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdhcmd1bWVudCBzaG91bGQgYmUgYSBCdWZmZXInKVxuICBpZiAoIXN0YXJ0KSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgJiYgZW5kICE9PSAwKSBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAodGFyZ2V0U3RhcnQgPj0gdGFyZ2V0Lmxlbmd0aCkgdGFyZ2V0U3RhcnQgPSB0YXJnZXQubGVuZ3RoXG4gIGlmICghdGFyZ2V0U3RhcnQpIHRhcmdldFN0YXJ0ID0gMFxuICBpZiAoZW5kID4gMCAmJiBlbmQgPCBzdGFydCkgZW5kID0gc3RhcnRcblxuICAvLyBDb3B5IDAgYnl0ZXM7IHdlJ3JlIGRvbmVcbiAgaWYgKGVuZCA9PT0gc3RhcnQpIHJldHVybiAwXG4gIGlmICh0YXJnZXQubGVuZ3RoID09PSAwIHx8IHRoaXMubGVuZ3RoID09PSAwKSByZXR1cm4gMFxuXG4gIC8vIEZhdGFsIGVycm9yIGNvbmRpdGlvbnNcbiAgaWYgKHRhcmdldFN0YXJ0IDwgMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCd0YXJnZXRTdGFydCBvdXQgb2YgYm91bmRzJylcbiAgfVxuICBpZiAoc3RhcnQgPCAwIHx8IHN0YXJ0ID49IHRoaXMubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW5kZXggb3V0IG9mIHJhbmdlJylcbiAgaWYgKGVuZCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdzb3VyY2VFbmQgb3V0IG9mIGJvdW5kcycpXG5cbiAgLy8gQXJlIHdlIG9vYj9cbiAgaWYgKGVuZCA+IHRoaXMubGVuZ3RoKSBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAodGFyZ2V0Lmxlbmd0aCAtIHRhcmdldFN0YXJ0IDwgZW5kIC0gc3RhcnQpIHtcbiAgICBlbmQgPSB0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0U3RhcnQgKyBzdGFydFxuICB9XG5cbiAgdmFyIGxlbiA9IGVuZCAtIHN0YXJ0XG5cbiAgaWYgKHRoaXMgPT09IHRhcmdldCAmJiB0eXBlb2YgVWludDhBcnJheS5wcm90b3R5cGUuY29weVdpdGhpbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIC8vIFVzZSBidWlsdC1pbiB3aGVuIGF2YWlsYWJsZSwgbWlzc2luZyBmcm9tIElFMTFcbiAgICB0aGlzLmNvcHlXaXRoaW4odGFyZ2V0U3RhcnQsIHN0YXJ0LCBlbmQpXG4gIH0gZWxzZSBpZiAodGhpcyA9PT0gdGFyZ2V0ICYmIHN0YXJ0IDwgdGFyZ2V0U3RhcnQgJiYgdGFyZ2V0U3RhcnQgPCBlbmQpIHtcbiAgICAvLyBkZXNjZW5kaW5nIGNvcHkgZnJvbSBlbmRcbiAgICBmb3IgKHZhciBpID0gbGVuIC0gMTsgaSA+PSAwOyAtLWkpIHtcbiAgICAgIHRhcmdldFtpICsgdGFyZ2V0U3RhcnRdID0gdGhpc1tpICsgc3RhcnRdXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIFVpbnQ4QXJyYXkucHJvdG90eXBlLnNldC5jYWxsKFxuICAgICAgdGFyZ2V0LFxuICAgICAgdGhpcy5zdWJhcnJheShzdGFydCwgZW5kKSxcbiAgICAgIHRhcmdldFN0YXJ0XG4gICAgKVxuICB9XG5cbiAgcmV0dXJuIGxlblxufVxuXG4vLyBVc2FnZTpcbi8vICAgIGJ1ZmZlci5maWxsKG51bWJlclssIG9mZnNldFssIGVuZF1dKVxuLy8gICAgYnVmZmVyLmZpbGwoYnVmZmVyWywgb2Zmc2V0WywgZW5kXV0pXG4vLyAgICBidWZmZXIuZmlsbChzdHJpbmdbLCBvZmZzZXRbLCBlbmRdXVssIGVuY29kaW5nXSlcbkJ1ZmZlci5wcm90b3R5cGUuZmlsbCA9IGZ1bmN0aW9uIGZpbGwgKHZhbCwgc3RhcnQsIGVuZCwgZW5jb2RpbmcpIHtcbiAgLy8gSGFuZGxlIHN0cmluZyBjYXNlczpcbiAgaWYgKHR5cGVvZiB2YWwgPT09ICdzdHJpbmcnKSB7XG4gICAgaWYgKHR5cGVvZiBzdGFydCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGVuY29kaW5nID0gc3RhcnRcbiAgICAgIHN0YXJ0ID0gMFxuICAgICAgZW5kID0gdGhpcy5sZW5ndGhcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBlbmQgPT09ICdzdHJpbmcnKSB7XG4gICAgICBlbmNvZGluZyA9IGVuZFxuICAgICAgZW5kID0gdGhpcy5sZW5ndGhcbiAgICB9XG4gICAgaWYgKGVuY29kaW5nICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mIGVuY29kaW5nICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignZW5jb2RpbmcgbXVzdCBiZSBhIHN0cmluZycpXG4gICAgfVxuICAgIGlmICh0eXBlb2YgZW5jb2RpbmcgPT09ICdzdHJpbmcnICYmICFCdWZmZXIuaXNFbmNvZGluZyhlbmNvZGluZykpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgICB9XG4gICAgaWYgKHZhbC5sZW5ndGggPT09IDEpIHtcbiAgICAgIHZhciBjb2RlID0gdmFsLmNoYXJDb2RlQXQoMClcbiAgICAgIGlmICgoZW5jb2RpbmcgPT09ICd1dGY4JyAmJiBjb2RlIDwgMTI4KSB8fFxuICAgICAgICAgIGVuY29kaW5nID09PSAnbGF0aW4xJykge1xuICAgICAgICAvLyBGYXN0IHBhdGg6IElmIGB2YWxgIGZpdHMgaW50byBhIHNpbmdsZSBieXRlLCB1c2UgdGhhdCBudW1lcmljIHZhbHVlLlxuICAgICAgICB2YWwgPSBjb2RlXG4gICAgICB9XG4gICAgfVxuICB9IGVsc2UgaWYgKHR5cGVvZiB2YWwgPT09ICdudW1iZXInKSB7XG4gICAgdmFsID0gdmFsICYgMjU1XG4gIH1cblxuICAvLyBJbnZhbGlkIHJhbmdlcyBhcmUgbm90IHNldCB0byBhIGRlZmF1bHQsIHNvIGNhbiByYW5nZSBjaGVjayBlYXJseS5cbiAgaWYgKHN0YXJ0IDwgMCB8fCB0aGlzLmxlbmd0aCA8IHN0YXJ0IHx8IHRoaXMubGVuZ3RoIDwgZW5kKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ091dCBvZiByYW5nZSBpbmRleCcpXG4gIH1cblxuICBpZiAoZW5kIDw9IHN0YXJ0KSB7XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIHN0YXJ0ID0gc3RhcnQgPj4+IDBcbiAgZW5kID0gZW5kID09PSB1bmRlZmluZWQgPyB0aGlzLmxlbmd0aCA6IGVuZCA+Pj4gMFxuXG4gIGlmICghdmFsKSB2YWwgPSAwXG5cbiAgdmFyIGlcbiAgaWYgKHR5cGVvZiB2YWwgPT09ICdudW1iZXInKSB7XG4gICAgZm9yIChpID0gc3RhcnQ7IGkgPCBlbmQ7ICsraSkge1xuICAgICAgdGhpc1tpXSA9IHZhbFxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB2YXIgYnl0ZXMgPSBCdWZmZXIuaXNCdWZmZXIodmFsKVxuICAgICAgPyB2YWxcbiAgICAgIDogQnVmZmVyLmZyb20odmFsLCBlbmNvZGluZylcbiAgICB2YXIgbGVuID0gYnl0ZXMubGVuZ3RoXG4gICAgaWYgKGxlbiA9PT0gMCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIHZhbHVlIFwiJyArIHZhbCArXG4gICAgICAgICdcIiBpcyBpbnZhbGlkIGZvciBhcmd1bWVudCBcInZhbHVlXCInKVxuICAgIH1cbiAgICBmb3IgKGkgPSAwOyBpIDwgZW5kIC0gc3RhcnQ7ICsraSkge1xuICAgICAgdGhpc1tpICsgc3RhcnRdID0gYnl0ZXNbaSAlIGxlbl1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpc1xufVxuXG4vLyBIRUxQRVIgRlVOQ1RJT05TXG4vLyA9PT09PT09PT09PT09PT09XG5cbnZhciBJTlZBTElEX0JBU0U2NF9SRSA9IC9bXisvMC05QS1aYS16LV9dL2dcblxuZnVuY3Rpb24gYmFzZTY0Y2xlYW4gKHN0cikge1xuICAvLyBOb2RlIHRha2VzIGVxdWFsIHNpZ25zIGFzIGVuZCBvZiB0aGUgQmFzZTY0IGVuY29kaW5nXG4gIHN0ciA9IHN0ci5zcGxpdCgnPScpWzBdXG4gIC8vIE5vZGUgc3RyaXBzIG91dCBpbnZhbGlkIGNoYXJhY3RlcnMgbGlrZSBcXG4gYW5kIFxcdCBmcm9tIHRoZSBzdHJpbmcsIGJhc2U2NC1qcyBkb2VzIG5vdFxuICBzdHIgPSBzdHIudHJpbSgpLnJlcGxhY2UoSU5WQUxJRF9CQVNFNjRfUkUsICcnKVxuICAvLyBOb2RlIGNvbnZlcnRzIHN0cmluZ3Mgd2l0aCBsZW5ndGggPCAyIHRvICcnXG4gIGlmIChzdHIubGVuZ3RoIDwgMikgcmV0dXJuICcnXG4gIC8vIE5vZGUgYWxsb3dzIGZvciBub24tcGFkZGVkIGJhc2U2NCBzdHJpbmdzIChtaXNzaW5nIHRyYWlsaW5nID09PSksIGJhc2U2NC1qcyBkb2VzIG5vdFxuICB3aGlsZSAoc3RyLmxlbmd0aCAlIDQgIT09IDApIHtcbiAgICBzdHIgPSBzdHIgKyAnPSdcbiAgfVxuICByZXR1cm4gc3RyXG59XG5cbmZ1bmN0aW9uIHRvSGV4IChuKSB7XG4gIGlmIChuIDwgMTYpIHJldHVybiAnMCcgKyBuLnRvU3RyaW5nKDE2KVxuICByZXR1cm4gbi50b1N0cmluZygxNilcbn1cblxuZnVuY3Rpb24gdXRmOFRvQnl0ZXMgKHN0cmluZywgdW5pdHMpIHtcbiAgdW5pdHMgPSB1bml0cyB8fCBJbmZpbml0eVxuICB2YXIgY29kZVBvaW50XG4gIHZhciBsZW5ndGggPSBzdHJpbmcubGVuZ3RoXG4gIHZhciBsZWFkU3Vycm9nYXRlID0gbnVsbFxuICB2YXIgYnl0ZXMgPSBbXVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyArK2kpIHtcbiAgICBjb2RlUG9pbnQgPSBzdHJpbmcuY2hhckNvZGVBdChpKVxuXG4gICAgLy8gaXMgc3Vycm9nYXRlIGNvbXBvbmVudFxuICAgIGlmIChjb2RlUG9pbnQgPiAweEQ3RkYgJiYgY29kZVBvaW50IDwgMHhFMDAwKSB7XG4gICAgICAvLyBsYXN0IGNoYXIgd2FzIGEgbGVhZFxuICAgICAgaWYgKCFsZWFkU3Vycm9nYXRlKSB7XG4gICAgICAgIC8vIG5vIGxlYWQgeWV0XG4gICAgICAgIGlmIChjb2RlUG9pbnQgPiAweERCRkYpIHtcbiAgICAgICAgICAvLyB1bmV4cGVjdGVkIHRyYWlsXG4gICAgICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfSBlbHNlIGlmIChpICsgMSA9PT0gbGVuZ3RoKSB7XG4gICAgICAgICAgLy8gdW5wYWlyZWQgbGVhZFxuICAgICAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH1cblxuICAgICAgICAvLyB2YWxpZCBsZWFkXG4gICAgICAgIGxlYWRTdXJyb2dhdGUgPSBjb2RlUG9pbnRcblxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICAvLyAyIGxlYWRzIGluIGEgcm93XG4gICAgICBpZiAoY29kZVBvaW50IDwgMHhEQzAwKSB7XG4gICAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgICBsZWFkU3Vycm9nYXRlID0gY29kZVBvaW50XG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIC8vIHZhbGlkIHN1cnJvZ2F0ZSBwYWlyXG4gICAgICBjb2RlUG9pbnQgPSAobGVhZFN1cnJvZ2F0ZSAtIDB4RDgwMCA8PCAxMCB8IGNvZGVQb2ludCAtIDB4REMwMCkgKyAweDEwMDAwXG4gICAgfSBlbHNlIGlmIChsZWFkU3Vycm9nYXRlKSB7XG4gICAgICAvLyB2YWxpZCBibXAgY2hhciwgYnV0IGxhc3QgY2hhciB3YXMgYSBsZWFkXG4gICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICB9XG5cbiAgICBsZWFkU3Vycm9nYXRlID0gbnVsbFxuXG4gICAgLy8gZW5jb2RlIHV0ZjhcbiAgICBpZiAoY29kZVBvaW50IDwgMHg4MCkge1xuICAgICAgaWYgKCh1bml0cyAtPSAxKSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKGNvZGVQb2ludClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4ODAwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDIpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDYgfCAweEMwLFxuICAgICAgICBjb2RlUG9pbnQgJiAweDNGIHwgMHg4MFxuICAgICAgKVxuICAgIH0gZWxzZSBpZiAoY29kZVBvaW50IDwgMHgxMDAwMCkge1xuICAgICAgaWYgKCh1bml0cyAtPSAzKSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHhDIHwgMHhFMCxcbiAgICAgICAgY29kZVBvaW50ID4+IDB4NiAmIDB4M0YgfCAweDgwLFxuICAgICAgICBjb2RlUG9pbnQgJiAweDNGIHwgMHg4MFxuICAgICAgKVxuICAgIH0gZWxzZSBpZiAoY29kZVBvaW50IDwgMHgxMTAwMDApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gNCkgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChcbiAgICAgICAgY29kZVBvaW50ID4+IDB4MTIgfCAweEYwLFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHhDICYgMHgzRiB8IDB4ODAsXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDYgJiAweDNGIHwgMHg4MCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGNvZGUgcG9pbnQnKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBieXRlc1xufVxuXG5mdW5jdGlvbiBhc2NpaVRvQnl0ZXMgKHN0cikge1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyArK2kpIHtcbiAgICAvLyBOb2RlJ3MgY29kZSBzZWVtcyB0byBiZSBkb2luZyB0aGlzIGFuZCBub3QgJiAweDdGLi5cbiAgICBieXRlQXJyYXkucHVzaChzdHIuY2hhckNvZGVBdChpKSAmIDB4RkYpXG4gIH1cbiAgcmV0dXJuIGJ5dGVBcnJheVxufVxuXG5mdW5jdGlvbiB1dGYxNmxlVG9CeXRlcyAoc3RyLCB1bml0cykge1xuICB2YXIgYywgaGksIGxvXG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7ICsraSkge1xuICAgIGlmICgodW5pdHMgLT0gMikgPCAwKSBicmVha1xuXG4gICAgYyA9IHN0ci5jaGFyQ29kZUF0KGkpXG4gICAgaGkgPSBjID4+IDhcbiAgICBsbyA9IGMgJSAyNTZcbiAgICBieXRlQXJyYXkucHVzaChsbylcbiAgICBieXRlQXJyYXkucHVzaChoaSlcbiAgfVxuXG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gYmFzZTY0VG9CeXRlcyAoc3RyKSB7XG4gIHJldHVybiBiYXNlNjQudG9CeXRlQXJyYXkoYmFzZTY0Y2xlYW4oc3RyKSlcbn1cblxuZnVuY3Rpb24gYmxpdEJ1ZmZlciAoc3JjLCBkc3QsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyArK2kpIHtcbiAgICBpZiAoKGkgKyBvZmZzZXQgPj0gZHN0Lmxlbmd0aCkgfHwgKGkgPj0gc3JjLmxlbmd0aCkpIGJyZWFrXG4gICAgZHN0W2kgKyBvZmZzZXRdID0gc3JjW2ldXG4gIH1cbiAgcmV0dXJuIGlcbn1cblxuLy8gQXJyYXlCdWZmZXIgb3IgVWludDhBcnJheSBvYmplY3RzIGZyb20gb3RoZXIgY29udGV4dHMgKGkuZS4gaWZyYW1lcykgZG8gbm90IHBhc3Ncbi8vIHRoZSBgaW5zdGFuY2VvZmAgY2hlY2sgYnV0IHRoZXkgc2hvdWxkIGJlIHRyZWF0ZWQgYXMgb2YgdGhhdCB0eXBlLlxuLy8gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vZmVyb3NzL2J1ZmZlci9pc3N1ZXMvMTY2XG5mdW5jdGlvbiBpc0luc3RhbmNlIChvYmosIHR5cGUpIHtcbiAgcmV0dXJuIG9iaiBpbnN0YW5jZW9mIHR5cGUgfHxcbiAgICAob2JqICE9IG51bGwgJiYgb2JqLmNvbnN0cnVjdG9yICE9IG51bGwgJiYgb2JqLmNvbnN0cnVjdG9yLm5hbWUgIT0gbnVsbCAmJlxuICAgICAgb2JqLmNvbnN0cnVjdG9yLm5hbWUgPT09IHR5cGUubmFtZSlcbn1cbmZ1bmN0aW9uIG51bWJlcklzTmFOIChvYmopIHtcbiAgLy8gRm9yIElFMTEgc3VwcG9ydFxuICByZXR1cm4gb2JqICE9PSBvYmogLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1zZWxmLWNvbXBhcmVcbn1cbiIsIiFmdW5jdGlvbih0LGUpe1wib2JqZWN0XCI9PXR5cGVvZiBleHBvcnRzJiZcInVuZGVmaW5lZFwiIT10eXBlb2YgbW9kdWxlP2UoZXhwb3J0cyk6XCJmdW5jdGlvblwiPT10eXBlb2YgZGVmaW5lJiZkZWZpbmUuYW1kP2RlZmluZShbXCJleHBvcnRzXCJdLGUpOmUoKHQ9dHx8c2VsZikuREFQanM9e30pfSh0aGlzLChmdW5jdGlvbih0KXtcInVzZSBzdHJpY3RcIjtcbi8qISAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgIENvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICAgIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZVxuICAgIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlXG4gICAgTGljZW5zZSBhdCBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcblxuICAgIFRISVMgQ09ERSBJUyBQUk9WSURFRCBPTiBBTiAqQVMgSVMqIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbiAgICBLSU5ELCBFSVRIRVIgRVhQUkVTUyBPUiBJTVBMSUVELCBJTkNMVURJTkcgV0lUSE9VVCBMSU1JVEFUSU9OIEFOWSBJTVBMSUVEXG4gICAgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIFRJVExFLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSxcbiAgICBNRVJDSEFOVEFCTElUWSBPUiBOT04tSU5GUklOR0VNRU5ULlxuXG4gICAgU2VlIHRoZSBBcGFjaGUgVmVyc2lvbiAyLjAgTGljZW5zZSBmb3Igc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zXG4gICAgYW5kIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICAgICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqICovdmFyIGU9ZnVuY3Rpb24odCxyKXtyZXR1cm4oZT1PYmplY3Quc2V0UHJvdG90eXBlT2Z8fHtfX3Byb3RvX186W119aW5zdGFuY2VvZiBBcnJheSYmZnVuY3Rpb24odCxlKXt0Ll9fcHJvdG9fXz1lfXx8ZnVuY3Rpb24odCxlKXtmb3IodmFyIHIgaW4gZSllLmhhc093blByb3BlcnR5KHIpJiYodFtyXT1lW3JdKX0pKHQscil9O2Z1bmN0aW9uIHIodCxyKXtmdW5jdGlvbiBuKCl7dGhpcy5jb25zdHJ1Y3Rvcj10fWUodCxyKSx0LnByb3RvdHlwZT1udWxsPT09cj9PYmplY3QuY3JlYXRlKHIpOihuLnByb3RvdHlwZT1yLnByb3RvdHlwZSxuZXcgbil9ZnVuY3Rpb24gbih0LGUscixuKXtyZXR1cm4gbmV3KHJ8fChyPVByb21pc2UpKSgoZnVuY3Rpb24oaSxzKXtmdW5jdGlvbiBvKHQpe3RyeXtjKG4ubmV4dCh0KSl9Y2F0Y2godCl7cyh0KX19ZnVuY3Rpb24gdSh0KXt0cnl7YyhuLnRocm93KHQpKX1jYXRjaCh0KXtzKHQpfX1mdW5jdGlvbiBjKHQpe3ZhciBlO3QuZG9uZT9pKHQudmFsdWUpOihlPXQudmFsdWUsZSBpbnN0YW5jZW9mIHI/ZTpuZXcgcigoZnVuY3Rpb24odCl7dChlKX0pKSkudGhlbihvLHUpfWMoKG49bi5hcHBseSh0LGV8fFtdKSkubmV4dCgpKX0pKX1mdW5jdGlvbiBpKHQsZSl7dmFyIHIsbixpLHMsbz17bGFiZWw6MCxzZW50OmZ1bmN0aW9uKCl7aWYoMSZpWzBdKXRocm93IGlbMV07cmV0dXJuIGlbMV19LHRyeXM6W10sb3BzOltdfTtyZXR1cm4gcz17bmV4dDp1KDApLHRocm93OnUoMSkscmV0dXJuOnUoMil9LFwiZnVuY3Rpb25cIj09dHlwZW9mIFN5bWJvbCYmKHNbU3ltYm9sLml0ZXJhdG9yXT1mdW5jdGlvbigpe3JldHVybiB0aGlzfSkscztmdW5jdGlvbiB1KHMpe3JldHVybiBmdW5jdGlvbih1KXtyZXR1cm4gZnVuY3Rpb24ocyl7aWYocil0aHJvdyBuZXcgVHlwZUVycm9yKFwiR2VuZXJhdG9yIGlzIGFscmVhZHkgZXhlY3V0aW5nLlwiKTtmb3IoO287KXRyeXtpZihyPTEsbiYmKGk9MiZzWzBdP24ucmV0dXJuOnNbMF0/bi50aHJvd3x8KChpPW4ucmV0dXJuKSYmaS5jYWxsKG4pLDApOm4ubmV4dCkmJiEoaT1pLmNhbGwobixzWzFdKSkuZG9uZSlyZXR1cm4gaTtzd2l0Y2gobj0wLGkmJihzPVsyJnNbMF0saS52YWx1ZV0pLHNbMF0pe2Nhc2UgMDpjYXNlIDE6aT1zO2JyZWFrO2Nhc2UgNDpyZXR1cm4gby5sYWJlbCsrLHt2YWx1ZTpzWzFdLGRvbmU6ITF9O2Nhc2UgNTpvLmxhYmVsKyssbj1zWzFdLHM9WzBdO2NvbnRpbnVlO2Nhc2UgNzpzPW8ub3BzLnBvcCgpLG8udHJ5cy5wb3AoKTtjb250aW51ZTtkZWZhdWx0OmlmKCEoaT1vLnRyeXMsKGk9aS5sZW5ndGg+MCYmaVtpLmxlbmd0aC0xXSl8fDYhPT1zWzBdJiYyIT09c1swXSkpe289MDtjb250aW51ZX1pZigzPT09c1swXSYmKCFpfHxzWzFdPmlbMF0mJnNbMV08aVszXSkpe28ubGFiZWw9c1sxXTticmVha31pZig2PT09c1swXSYmby5sYWJlbDxpWzFdKXtvLmxhYmVsPWlbMV0saT1zO2JyZWFrfWlmKGkmJm8ubGFiZWw8aVsyXSl7by5sYWJlbD1pWzJdLG8ub3BzLnB1c2gocyk7YnJlYWt9aVsyXSYmby5vcHMucG9wKCksby50cnlzLnBvcCgpO2NvbnRpbnVlfXM9ZS5jYWxsKHQsbyl9Y2F0Y2godCl7cz1bNix0XSxuPTB9ZmluYWxseXtyPWk9MH1pZig1JnNbMF0pdGhyb3cgc1sxXTtyZXR1cm57dmFsdWU6c1swXT9zWzFdOnZvaWQgMCxkb25lOiEwfX0oW3MsdV0pfX19ZnVuY3Rpb24gcygpe31mdW5jdGlvbiBvKCl7by5pbml0LmNhbGwodGhpcyl9ZnVuY3Rpb24gdSh0KXtyZXR1cm4gdm9pZCAwPT09dC5fbWF4TGlzdGVuZXJzP28uZGVmYXVsdE1heExpc3RlbmVyczp0Ll9tYXhMaXN0ZW5lcnN9ZnVuY3Rpb24gYyh0LGUscil7aWYoZSl0LmNhbGwocik7ZWxzZSBmb3IodmFyIG49dC5sZW5ndGgsaT13KHQsbikscz0wO3M8bjsrK3MpaVtzXS5jYWxsKHIpfWZ1bmN0aW9uIGEodCxlLHIsbil7aWYoZSl0LmNhbGwocixuKTtlbHNlIGZvcih2YXIgaT10Lmxlbmd0aCxzPXcodCxpKSxvPTA7bzxpOysrbylzW29dLmNhbGwocixuKX1mdW5jdGlvbiBoKHQsZSxyLG4saSl7aWYoZSl0LmNhbGwocixuLGkpO2Vsc2UgZm9yKHZhciBzPXQubGVuZ3RoLG89dyh0LHMpLHU9MDt1PHM7Kyt1KW9bdV0uY2FsbChyLG4saSl9ZnVuY3Rpb24gZih0LGUscixuLGkscyl7aWYoZSl0LmNhbGwocixuLGkscyk7ZWxzZSBmb3IodmFyIG89dC5sZW5ndGgsdT13KHQsbyksYz0wO2M8bzsrK2MpdVtjXS5jYWxsKHIsbixpLHMpfWZ1bmN0aW9uIGwodCxlLHIsbil7aWYoZSl0LmFwcGx5KHIsbik7ZWxzZSBmb3IodmFyIGk9dC5sZW5ndGgscz13KHQsaSksbz0wO288aTsrK28pc1tvXS5hcHBseShyLG4pfWZ1bmN0aW9uIGQodCxlLHIsbil7dmFyIGksbyxjLGE7aWYoXCJmdW5jdGlvblwiIT10eXBlb2Ygcil0aHJvdyBuZXcgVHlwZUVycm9yKCdcImxpc3RlbmVyXCIgYXJndW1lbnQgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7aWYoKG89dC5fZXZlbnRzKT8oby5uZXdMaXN0ZW5lciYmKHQuZW1pdChcIm5ld0xpc3RlbmVyXCIsZSxyLmxpc3RlbmVyP3IubGlzdGVuZXI6ciksbz10Ll9ldmVudHMpLGM9b1tlXSk6KG89dC5fZXZlbnRzPW5ldyBzLHQuX2V2ZW50c0NvdW50PTApLGMpe2lmKFwiZnVuY3Rpb25cIj09dHlwZW9mIGM/Yz1vW2VdPW4/W3IsY106W2Mscl06bj9jLnVuc2hpZnQocik6Yy5wdXNoKHIpLCFjLndhcm5lZCYmKGk9dSh0KSkmJmk+MCYmYy5sZW5ndGg+aSl7Yy53YXJuZWQ9ITA7dmFyIGg9bmV3IEVycm9yKFwiUG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSBsZWFrIGRldGVjdGVkLiBcIitjLmxlbmd0aCtcIiBcIitlK1wiIGxpc3RlbmVycyBhZGRlZC4gVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXRcIik7aC5uYW1lPVwiTWF4TGlzdGVuZXJzRXhjZWVkZWRXYXJuaW5nXCIsaC5lbWl0dGVyPXQsaC50eXBlPWUsaC5jb3VudD1jLmxlbmd0aCxhPWgsXCJmdW5jdGlvblwiPT10eXBlb2YgY29uc29sZS53YXJuP2NvbnNvbGUud2FybihhKTpjb25zb2xlLmxvZyhhKX19ZWxzZSBjPW9bZV09ciwrK3QuX2V2ZW50c0NvdW50O3JldHVybiB0fWZ1bmN0aW9uIHAodCxlLHIpe3ZhciBuPSExO2Z1bmN0aW9uIGkoKXt0LnJlbW92ZUxpc3RlbmVyKGUsaSksbnx8KG49ITAsci5hcHBseSh0LGFyZ3VtZW50cykpfXJldHVybiBpLmxpc3RlbmVyPXIsaX1mdW5jdGlvbiB2KHQpe3ZhciBlPXRoaXMuX2V2ZW50cztpZihlKXt2YXIgcj1lW3RdO2lmKFwiZnVuY3Rpb25cIj09dHlwZW9mIHIpcmV0dXJuIDE7aWYocilyZXR1cm4gci5sZW5ndGh9cmV0dXJuIDB9ZnVuY3Rpb24gdyh0LGUpe2Zvcih2YXIgcj1uZXcgQXJyYXkoZSk7ZS0tOylyW2VdPXRbZV07cmV0dXJuIHJ9cy5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZShudWxsKSxvLkV2ZW50RW1pdHRlcj1vLG8udXNpbmdEb21haW5zPSExLG8ucHJvdG90eXBlLmRvbWFpbj12b2lkIDAsby5wcm90b3R5cGUuX2V2ZW50cz12b2lkIDAsby5wcm90b3R5cGUuX21heExpc3RlbmVycz12b2lkIDAsby5kZWZhdWx0TWF4TGlzdGVuZXJzPTEwLG8uaW5pdD1mdW5jdGlvbigpe3RoaXMuZG9tYWluPW51bGwsby51c2luZ0RvbWFpbnMmJnVuZGVmaW5lZC5hY3RpdmUsdGhpcy5fZXZlbnRzJiZ0aGlzLl9ldmVudHMhPT1PYmplY3QuZ2V0UHJvdG90eXBlT2YodGhpcykuX2V2ZW50c3x8KHRoaXMuX2V2ZW50cz1uZXcgcyx0aGlzLl9ldmVudHNDb3VudD0wKSx0aGlzLl9tYXhMaXN0ZW5lcnM9dGhpcy5fbWF4TGlzdGVuZXJzfHx2b2lkIDB9LG8ucHJvdG90eXBlLnNldE1heExpc3RlbmVycz1mdW5jdGlvbih0KXtpZihcIm51bWJlclwiIT10eXBlb2YgdHx8dDwwfHxpc05hTih0KSl0aHJvdyBuZXcgVHlwZUVycm9yKCdcIm5cIiBhcmd1bWVudCBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7cmV0dXJuIHRoaXMuX21heExpc3RlbmVycz10LHRoaXN9LG8ucHJvdG90eXBlLmdldE1heExpc3RlbmVycz1mdW5jdGlvbigpe3JldHVybiB1KHRoaXMpfSxvLnByb3RvdHlwZS5lbWl0PWZ1bmN0aW9uKHQpe3ZhciBlLHIsbixpLHMsbyx1LGQ9XCJlcnJvclwiPT09dDtpZihvPXRoaXMuX2V2ZW50cylkPWQmJm51bGw9PW8uZXJyb3I7ZWxzZSBpZighZClyZXR1cm4hMTtpZih1PXRoaXMuZG9tYWluLGQpe2lmKGU9YXJndW1lbnRzWzFdLCF1KXtpZihlIGluc3RhbmNlb2YgRXJyb3IpdGhyb3cgZTt2YXIgcD1uZXcgRXJyb3IoJ1VuY2F1Z2h0LCB1bnNwZWNpZmllZCBcImVycm9yXCIgZXZlbnQuICgnK2UrXCIpXCIpO3Rocm93IHAuY29udGV4dD1lLHB9cmV0dXJuIGV8fChlPW5ldyBFcnJvcignVW5jYXVnaHQsIHVuc3BlY2lmaWVkIFwiZXJyb3JcIiBldmVudCcpKSxlLmRvbWFpbkVtaXR0ZXI9dGhpcyxlLmRvbWFpbj11LGUuZG9tYWluVGhyb3duPSExLHUuZW1pdChcImVycm9yXCIsZSksITF9aWYoIShyPW9bdF0pKXJldHVybiExO3ZhciB2PVwiZnVuY3Rpb25cIj09dHlwZW9mIHI7c3dpdGNoKG49YXJndW1lbnRzLmxlbmd0aCl7Y2FzZSAxOmMocix2LHRoaXMpO2JyZWFrO2Nhc2UgMjphKHIsdix0aGlzLGFyZ3VtZW50c1sxXSk7YnJlYWs7Y2FzZSAzOmgocix2LHRoaXMsYXJndW1lbnRzWzFdLGFyZ3VtZW50c1syXSk7YnJlYWs7Y2FzZSA0OmYocix2LHRoaXMsYXJndW1lbnRzWzFdLGFyZ3VtZW50c1syXSxhcmd1bWVudHNbM10pO2JyZWFrO2RlZmF1bHQ6Zm9yKGk9bmV3IEFycmF5KG4tMSkscz0xO3M8bjtzKyspaVtzLTFdPWFyZ3VtZW50c1tzXTtsKHIsdix0aGlzLGkpfXJldHVybiEwfSxvLnByb3RvdHlwZS5hZGRMaXN0ZW5lcj1mdW5jdGlvbih0LGUpe3JldHVybiBkKHRoaXMsdCxlLCExKX0sby5wcm90b3R5cGUub249by5wcm90b3R5cGUuYWRkTGlzdGVuZXIsby5wcm90b3R5cGUucHJlcGVuZExpc3RlbmVyPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIGQodGhpcyx0LGUsITApfSxvLnByb3RvdHlwZS5vbmNlPWZ1bmN0aW9uKHQsZSl7aWYoXCJmdW5jdGlvblwiIT10eXBlb2YgZSl0aHJvdyBuZXcgVHlwZUVycm9yKCdcImxpc3RlbmVyXCIgYXJndW1lbnQgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7cmV0dXJuIHRoaXMub24odCxwKHRoaXMsdCxlKSksdGhpc30sby5wcm90b3R5cGUucHJlcGVuZE9uY2VMaXN0ZW5lcj1mdW5jdGlvbih0LGUpe2lmKFwiZnVuY3Rpb25cIiE9dHlwZW9mIGUpdGhyb3cgbmV3IFR5cGVFcnJvcignXCJsaXN0ZW5lclwiIGFyZ3VtZW50IG11c3QgYmUgYSBmdW5jdGlvbicpO3JldHVybiB0aGlzLnByZXBlbmRMaXN0ZW5lcih0LHAodGhpcyx0LGUpKSx0aGlzfSxvLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lcj1mdW5jdGlvbih0LGUpe3ZhciByLG4saSxvLHU7aWYoXCJmdW5jdGlvblwiIT10eXBlb2YgZSl0aHJvdyBuZXcgVHlwZUVycm9yKCdcImxpc3RlbmVyXCIgYXJndW1lbnQgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7aWYoIShuPXRoaXMuX2V2ZW50cykpcmV0dXJuIHRoaXM7aWYoIShyPW5bdF0pKXJldHVybiB0aGlzO2lmKHI9PT1lfHxyLmxpc3RlbmVyJiZyLmxpc3RlbmVyPT09ZSkwPT0tLXRoaXMuX2V2ZW50c0NvdW50P3RoaXMuX2V2ZW50cz1uZXcgczooZGVsZXRlIG5bdF0sbi5yZW1vdmVMaXN0ZW5lciYmdGhpcy5lbWl0KFwicmVtb3ZlTGlzdGVuZXJcIix0LHIubGlzdGVuZXJ8fGUpKTtlbHNlIGlmKFwiZnVuY3Rpb25cIiE9dHlwZW9mIHIpe2ZvcihpPS0xLG89ci5sZW5ndGg7by0tID4wOylpZihyW29dPT09ZXx8cltvXS5saXN0ZW5lciYmcltvXS5saXN0ZW5lcj09PWUpe3U9cltvXS5saXN0ZW5lcixpPW87YnJlYWt9aWYoaTwwKXJldHVybiB0aGlzO2lmKDE9PT1yLmxlbmd0aCl7aWYoclswXT12b2lkIDAsMD09LS10aGlzLl9ldmVudHNDb3VudClyZXR1cm4gdGhpcy5fZXZlbnRzPW5ldyBzLHRoaXM7ZGVsZXRlIG5bdF19ZWxzZSFmdW5jdGlvbih0LGUpe2Zvcih2YXIgcj1lLG49cisxLGk9dC5sZW5ndGg7bjxpO3IrPTEsbis9MSl0W3JdPXRbbl07dC5wb3AoKX0ocixpKTtuLnJlbW92ZUxpc3RlbmVyJiZ0aGlzLmVtaXQoXCJyZW1vdmVMaXN0ZW5lclwiLHQsdXx8ZSl9cmV0dXJuIHRoaXN9LG8ucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycz1mdW5jdGlvbih0KXt2YXIgZSxyO2lmKCEocj10aGlzLl9ldmVudHMpKXJldHVybiB0aGlzO2lmKCFyLnJlbW92ZUxpc3RlbmVyKXJldHVybiAwPT09YXJndW1lbnRzLmxlbmd0aD8odGhpcy5fZXZlbnRzPW5ldyBzLHRoaXMuX2V2ZW50c0NvdW50PTApOnJbdF0mJigwPT0tLXRoaXMuX2V2ZW50c0NvdW50P3RoaXMuX2V2ZW50cz1uZXcgczpkZWxldGUgclt0XSksdGhpcztpZigwPT09YXJndW1lbnRzLmxlbmd0aCl7Zm9yKHZhciBuLGk9T2JqZWN0LmtleXMociksbz0wO288aS5sZW5ndGg7KytvKVwicmVtb3ZlTGlzdGVuZXJcIiE9PShuPWlbb10pJiZ0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhuKTtyZXR1cm4gdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoXCJyZW1vdmVMaXN0ZW5lclwiKSx0aGlzLl9ldmVudHM9bmV3IHMsdGhpcy5fZXZlbnRzQ291bnQ9MCx0aGlzfWlmKFwiZnVuY3Rpb25cIj09dHlwZW9mKGU9clt0XSkpdGhpcy5yZW1vdmVMaXN0ZW5lcih0LGUpO2Vsc2UgaWYoZSlkb3t0aGlzLnJlbW92ZUxpc3RlbmVyKHQsZVtlLmxlbmd0aC0xXSl9d2hpbGUoZVswXSk7cmV0dXJuIHRoaXN9LG8ucHJvdG90eXBlLmxpc3RlbmVycz1mdW5jdGlvbih0KXt2YXIgZSxyPXRoaXMuX2V2ZW50cztyZXR1cm4gciYmKGU9clt0XSk/XCJmdW5jdGlvblwiPT10eXBlb2YgZT9bZS5saXN0ZW5lcnx8ZV06ZnVuY3Rpb24odCl7Zm9yKHZhciBlPW5ldyBBcnJheSh0Lmxlbmd0aCkscj0wO3I8ZS5sZW5ndGg7KytyKWVbcl09dFtyXS5saXN0ZW5lcnx8dFtyXTtyZXR1cm4gZX0oZSk6W119LG8ubGlzdGVuZXJDb3VudD1mdW5jdGlvbih0LGUpe3JldHVyblwiZnVuY3Rpb25cIj09dHlwZW9mIHQubGlzdGVuZXJDb3VudD90Lmxpc3RlbmVyQ291bnQoZSk6di5jYWxsKHQsZSl9LG8ucHJvdG90eXBlLmxpc3RlbmVyQ291bnQ9dixvLnByb3RvdHlwZS5ldmVudE5hbWVzPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX2V2ZW50c0NvdW50PjA/UmVmbGVjdC5vd25LZXlzKHRoaXMuX2V2ZW50cyk6W119O3ZhciB5LG09MWU3LGI9ZnVuY3Rpb24oKXtmdW5jdGlvbiB0KCl7dGhpcy5sb2NrZWQ9ITF9cmV0dXJuIHQucHJvdG90eXBlLmxvY2s9ZnVuY3Rpb24oKXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24odCl7c3dpdGNoKHQubGFiZWwpe2Nhc2UgMDpyZXR1cm4gdGhpcy5sb2NrZWQ/WzQsbmV3IFByb21pc2UoKGZ1bmN0aW9uKHQpe3JldHVybiBzZXRUaW1lb3V0KHQsMSl9KSldOlszLDJdO2Nhc2UgMTpyZXR1cm4gdC5zZW50KCksWzMsMF07Y2FzZSAyOnJldHVybiB0aGlzLmxvY2tlZD0hMCxbMl19fSkpfSkpfSx0LnByb3RvdHlwZS51bmxvY2s9ZnVuY3Rpb24oKXt0aGlzLmxvY2tlZD0hMX0sdH0oKSxnPWZ1bmN0aW9uKHQpe2Z1bmN0aW9uIGUoZSxyLG4pe3ZvaWQgMD09PXImJihyPTApLHZvaWQgMD09PW4mJihuPW0pO3ZhciBpPXQuY2FsbCh0aGlzKXx8dGhpcztpLnRyYW5zcG9ydD1lLGkubW9kZT1yLGkuY2xvY2tGcmVxdWVuY3k9bixpLmNvbm5lY3RlZD0hMSxpLnNlbmRNdXRleD1uZXcgYixpLmJsb2NrU2l6ZT1pLnRyYW5zcG9ydC5wYWNrZXRTaXplLTQtMTt2YXIgcz1pLnRyYW5zcG9ydC5wYWNrZXRTaXplLTItMTtyZXR1cm4gaS5vcGVyYXRpb25Db3VudD1NYXRoLmZsb29yKHMvNSksaX1yZXR1cm4gcihlLHQpLGUucHJvdG90eXBlLmJ1ZmZlclNvdXJjZVRvVWludDhBcnJheT1mdW5jdGlvbih0LGUpe2lmKCFlKXJldHVybiBuZXcgVWludDhBcnJheShbdF0pO3ZhciByPXZvaWQgMCE9PWUuYnVmZmVyP2UuYnVmZmVyOmUsbj1uZXcgVWludDhBcnJheShyLmJ5dGVMZW5ndGgrMSk7cmV0dXJuIG4uc2V0KFt0XSksbi5zZXQobmV3IFVpbnQ4QXJyYXkociksMSksbn0sZS5wcm90b3R5cGUuc2VsZWN0UHJvdG9jb2w9ZnVuY3Rpb24odCl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciBlO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKHIpe3N3aXRjaChyLmxhYmVsKXtjYXNlIDA6cmV0dXJuIGU9Mj09PXQ/NTkxOTY6NTkyOTQsWzQsdGhpcy5zd2pTZXF1ZW5jZShuZXcgVWludDhBcnJheShbMjU1LDI1NSwyNTUsMjU1LDI1NSwyNTUsMjU1XSkpXTtjYXNlIDE6cmV0dXJuIHIuc2VudCgpLFs0LHRoaXMuc3dqU2VxdWVuY2UobmV3IFVpbnQxNkFycmF5KFtlXSkpXTtjYXNlIDI6cmV0dXJuIHIuc2VudCgpLFs0LHRoaXMuc3dqU2VxdWVuY2UobmV3IFVpbnQ4QXJyYXkoWzI1NSwyNTUsMjU1LDI1NSwyNTUsMjU1LDI1NV0pKV07Y2FzZSAzOnJldHVybiByLnNlbnQoKSxbNCx0aGlzLnN3alNlcXVlbmNlKG5ldyBVaW50OEFycmF5KFswXSkpXTtjYXNlIDQ6cmV0dXJuIHIuc2VudCgpLFsyXX19KSl9KSl9LGUucHJvdG90eXBlLnNlbmQ9ZnVuY3Rpb24odCxlKXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIHIsbjtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihpKXtzd2l0Y2goaS5sYWJlbCl7Y2FzZSAwOnJldHVybiByPXRoaXMuYnVmZmVyU291cmNlVG9VaW50OEFycmF5KHQsZSksWzQsdGhpcy5zZW5kTXV0ZXgubG9jaygpXTtjYXNlIDE6aS5zZW50KCksaS5sYWJlbD0yO2Nhc2UgMjpyZXR1cm4gaS50cnlzLnB1c2goWzIsLDUsNl0pLFs0LHRoaXMudHJhbnNwb3J0LndyaXRlKHIpXTtjYXNlIDM6cmV0dXJuIGkuc2VudCgpLFs0LHRoaXMudHJhbnNwb3J0LnJlYWQoKV07Y2FzZSA0OmlmKChuPWkuc2VudCgpKS5nZXRVaW50OCgwKSE9PXQpdGhyb3cgbmV3IEVycm9yKFwiQmFkIHJlc3BvbnNlIGZvciBcIit0K1wiIC0+IFwiK24uZ2V0VWludDgoMCkpO3N3aXRjaCh0KXtjYXNlIDM6Y2FzZSA4OmNhc2UgOTpjYXNlIDEwOmNhc2UgMTc6Y2FzZSAxODpjYXNlIDE5OmNhc2UgMjk6Y2FzZSAyMzpjYXNlIDI0OmNhc2UgMjY6Y2FzZSAyMTpjYXNlIDIyOmNhc2UgNDppZigwIT09bi5nZXRVaW50OCgxKSl0aHJvdyBuZXcgRXJyb3IoXCJCYWQgc3RhdHVzIGZvciBcIit0K1wiIC0+IFwiK24uZ2V0VWludDgoMSkpfXJldHVyblsyLG5dO2Nhc2UgNTpyZXR1cm4gdGhpcy5zZW5kTXV0ZXgudW5sb2NrKCksWzddO2Nhc2UgNjpyZXR1cm5bMl19fSkpfSkpfSxlLnByb3RvdHlwZS5jbGVhckFib3J0PWZ1bmN0aW9uKHQpe3JldHVybiB2b2lkIDA9PT10JiYodD0zMCksbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24oZSl7c3dpdGNoKGUubGFiZWwpe2Nhc2UgMDpyZXR1cm5bNCx0aGlzLnNlbmQoOCxuZXcgVWludDhBcnJheShbMCx0XSkpXTtjYXNlIDE6cmV0dXJuIGUuc2VudCgpLFsyXX19KSl9KSl9LGUucHJvdG90eXBlLmRhcEluZm89ZnVuY3Rpb24odCl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciBlLHIsbixzO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKGkpe3N3aXRjaChpLmxhYmVsKXtjYXNlIDA6cmV0dXJuIGkudHJ5cy5wdXNoKFswLDIsLDRdKSxbNCx0aGlzLnNlbmQoMCxuZXcgVWludDhBcnJheShbdF0pKV07Y2FzZSAxOmlmKGU9aS5zZW50KCksMD09PShyPWUuZ2V0VWludDgoMSkpKXJldHVyblsyLFwiXCJdO3N3aXRjaCh0KXtjYXNlIDI0MDpjYXNlIDI1NDpjYXNlIDI1NTpjYXNlIDI1MzppZigxPT09cilyZXR1cm5bMixlLmdldFVpbnQ4KDIpXTtpZigyPT09cilyZXR1cm5bMixlLmdldFVpbnQxNigyKV07aWYoND09PXIpcmV0dXJuWzIsZS5nZXRVaW50MzIoMildfXJldHVybiBuPUFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKG5ldyBVaW50OEFycmF5KGUuYnVmZmVyLDIscikpLFsyLFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkobnVsbCxuKV07Y2FzZSAyOnJldHVybiBzPWkuc2VudCgpLFs0LHRoaXMuY2xlYXJBYm9ydCgpXTtjYXNlIDM6dGhyb3cgaS5zZW50KCkscztjYXNlIDQ6cmV0dXJuWzJdfX0pKX0pKX0sZS5wcm90b3R5cGUuc3dqU2VxdWVuY2U9ZnVuY3Rpb24odCxlKXtyZXR1cm4gdm9pZCAwPT09ZSYmKGU9OCp0LmJ5dGVMZW5ndGgpLG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciByLG47cmV0dXJuIGkodGhpcywoZnVuY3Rpb24oaSl7c3dpdGNoKGkubGFiZWwpe2Nhc2UgMDpyPXRoaXMuYnVmZmVyU291cmNlVG9VaW50OEFycmF5KGUsdCksaS5sYWJlbD0xO2Nhc2UgMTpyZXR1cm4gaS50cnlzLnB1c2goWzEsMywsNV0pLFs0LHRoaXMuc2VuZCgxOCxyKV07Y2FzZSAyOnJldHVybiBpLnNlbnQoKSxbMyw1XTtjYXNlIDM6cmV0dXJuIG49aS5zZW50KCksWzQsdGhpcy5jbGVhckFib3J0KCldO2Nhc2UgNDp0aHJvdyBpLnNlbnQoKSxuO2Nhc2UgNTpyZXR1cm5bMl19fSkpfSkpfSxlLnByb3RvdHlwZS5zd2pDbG9jaz1mdW5jdGlvbih0KXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIGU7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24ocil7c3dpdGNoKHIubGFiZWwpe2Nhc2UgMDpyZXR1cm4gci50cnlzLnB1c2goWzAsMiwsNF0pLFs0LHRoaXMuc2VuZCgxNyxuZXcgVWludDhBcnJheShbMjU1JnQsKDY1MjgwJnQpPj44LCgxNjcxMTY4MCZ0KT4+MTYsKDQyNzgxOTAwODAmdCk+PjI0XSkpXTtjYXNlIDE6cmV0dXJuIHIuc2VudCgpLFszLDRdO2Nhc2UgMjpyZXR1cm4gZT1yLnNlbnQoKSxbNCx0aGlzLmNsZWFyQWJvcnQoKV07Y2FzZSAzOnRocm93IHIuc2VudCgpLGU7Y2FzZSA0OnJldHVyblsyXX19KSl9KSl9LGUucHJvdG90eXBlLnN3alBpbnM9ZnVuY3Rpb24odCxlLHIpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgbjtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihpKXtzd2l0Y2goaS5sYWJlbCl7Y2FzZSAwOnJldHVybiBpLnRyeXMucHVzaChbMCwyLCw0XSksWzQsdGhpcy5zZW5kKDE2LG5ldyBVaW50OEFycmF5KFt0LGUsMjU1JnIsKDY1MjgwJnIpPj44LCgxNjcxMTY4MCZyKT4+MTYsKDQyNzgxOTAwODAmcik+PjI0XSkpXTtjYXNlIDE6cmV0dXJuWzIsaS5zZW50KCkuZ2V0VWludDgoMSldO2Nhc2UgMjpyZXR1cm4gbj1pLnNlbnQoKSxbNCx0aGlzLmNsZWFyQWJvcnQoKV07Y2FzZSAzOnRocm93IGkuc2VudCgpLG47Y2FzZSA0OnJldHVyblsyXX19KSl9KSl9LGUucHJvdG90eXBlLmRhcERlbGF5PWZ1bmN0aW9uKHQpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgZTtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihyKXtzd2l0Y2goci5sYWJlbCl7Y2FzZSAwOnJldHVybiByLnRyeXMucHVzaChbMCwyLCw0XSksWzQsdGhpcy5zZW5kKDksbmV3IFVpbnQ4QXJyYXkoWzI1NSZ0LCg2NTI4MCZ0KT4+OF0pKV07Y2FzZSAxOnJldHVybiByLnNlbnQoKSxbMyw0XTtjYXNlIDI6cmV0dXJuIGU9ci5zZW50KCksWzQsdGhpcy5jbGVhckFib3J0KCldO2Nhc2UgMzp0aHJvdyByLnNlbnQoKSxlO2Nhc2UgNDpyZXR1cm5bMl19fSkpfSkpfSxlLnByb3RvdHlwZS5jb25maWd1cmVUcmFuc2Zlcj1mdW5jdGlvbih0LGUscil7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciBuLHMsbztyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihpKXtzd2l0Y2goaS5sYWJlbCl7Y2FzZSAwOm49bmV3IFVpbnQ4QXJyYXkoNSksKHM9bmV3IERhdGFWaWV3KG4uYnVmZmVyKSkuc2V0VWludDgoMCx0KSxzLnNldFVpbnQxNigxLGUsITApLHMuc2V0VWludDE2KDMsciwhMCksaS5sYWJlbD0xO2Nhc2UgMTpyZXR1cm4gaS50cnlzLnB1c2goWzEsMywsNV0pLFs0LHRoaXMuc2VuZCg0LG4pXTtjYXNlIDI6cmV0dXJuIGkuc2VudCgpLFszLDVdO2Nhc2UgMzpyZXR1cm4gbz1pLnNlbnQoKSxbNCx0aGlzLmNsZWFyQWJvcnQoKV07Y2FzZSA0OnRocm93IGkuc2VudCgpLG87Y2FzZSA1OnJldHVyblsyXX19KSl9KSl9LGUucHJvdG90eXBlLmNvbm5lY3Q9ZnVuY3Rpb24oKXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIHQsZSxyO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKG4pe3N3aXRjaChuLmxhYmVsKXtjYXNlIDA6cmV0dXJuITA9PT10aGlzLmNvbm5lY3RlZD9bMl06WzQsdGhpcy50cmFuc3BvcnQub3BlbigpXTtjYXNlIDE6bi5zZW50KCksbi5sYWJlbD0yO2Nhc2UgMjpyZXR1cm4gbi50cnlzLnB1c2goWzIsNSwsOF0pLFs0LHRoaXMuc2VuZCgxNyxuZXcgVWludDMyQXJyYXkoW3RoaXMuY2xvY2tGcmVxdWVuY3ldKSldO2Nhc2UgMzpyZXR1cm4gbi5zZW50KCksWzQsdGhpcy5zZW5kKDIsbmV3IFVpbnQ4QXJyYXkoW3RoaXMubW9kZV0pKV07Y2FzZSA0OmlmKDA9PT0odD1uLnNlbnQoKSkuZ2V0VWludDgoMSl8fDAhPT10aGlzLm1vZGUmJnQuZ2V0VWludDgoMSkhPT10aGlzLm1vZGUpdGhyb3cgbmV3IEVycm9yKFwiTW9kZSBub3QgZW5hYmxlZC5cIik7cmV0dXJuWzMsOF07Y2FzZSA1OnJldHVybiBlPW4uc2VudCgpLFs0LHRoaXMuY2xlYXJBYm9ydCgpXTtjYXNlIDY6cmV0dXJuIG4uc2VudCgpLFs0LHRoaXMudHJhbnNwb3J0LmNsb3NlKCldO2Nhc2UgNzp0aHJvdyBuLnNlbnQoKSxlO2Nhc2UgODpyZXR1cm4gbi50cnlzLnB1c2goWzgsMTEsLDEzXSksWzQsdGhpcy5jb25maWd1cmVUcmFuc2ZlcigwLDEwMCwwKV07Y2FzZSA5OnJldHVybiBuLnNlbnQoKSxbNCx0aGlzLnNlbGVjdFByb3RvY29sKDEpXTtjYXNlIDEwOnJldHVybiBuLnNlbnQoKSxbMywxM107Y2FzZSAxMTpyZXR1cm4gcj1uLnNlbnQoKSxbNCx0aGlzLnRyYW5zcG9ydC5jbG9zZSgpXTtjYXNlIDEyOnRocm93IG4uc2VudCgpLHI7Y2FzZSAxMzpyZXR1cm4gdGhpcy5jb25uZWN0ZWQ9ITAsWzJdfX0pKX0pKX0sZS5wcm90b3R5cGUuZGlzY29ubmVjdD1mdW5jdGlvbigpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgdDtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihlKXtzd2l0Y2goZS5sYWJlbCl7Y2FzZSAwOmlmKCExPT09dGhpcy5jb25uZWN0ZWQpcmV0dXJuWzJdO2UubGFiZWw9MTtjYXNlIDE6cmV0dXJuIGUudHJ5cy5wdXNoKFsxLDMsLDVdKSxbNCx0aGlzLnNlbmQoMyldO2Nhc2UgMjpyZXR1cm4gZS5zZW50KCksWzMsNV07Y2FzZSAzOnJldHVybiB0PWUuc2VudCgpLFs0LHRoaXMuY2xlYXJBYm9ydCgpXTtjYXNlIDQ6dGhyb3cgZS5zZW50KCksdDtjYXNlIDU6cmV0dXJuWzQsdGhpcy50cmFuc3BvcnQuY2xvc2UoKV07Y2FzZSA2OnJldHVybiBlLnNlbnQoKSx0aGlzLmNvbm5lY3RlZD0hMSxbMl19fSkpfSkpfSxlLnByb3RvdHlwZS5yZWNvbm5lY3Q9ZnVuY3Rpb24oKXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24odCl7c3dpdGNoKHQubGFiZWwpe2Nhc2UgMDpyZXR1cm5bNCx0aGlzLmRpc2Nvbm5lY3QoKV07Y2FzZSAxOnJldHVybiB0LnNlbnQoKSxbNCxuZXcgUHJvbWlzZSgoZnVuY3Rpb24odCl7cmV0dXJuIHNldFRpbWVvdXQodCwxMDApfSkpXTtjYXNlIDI6cmV0dXJuIHQuc2VudCgpLFs0LHRoaXMuY29ubmVjdCgpXTtjYXNlIDM6cmV0dXJuIHQuc2VudCgpLFsyXX19KSl9KSl9LGUucHJvdG90eXBlLnJlc2V0PWZ1bmN0aW9uKCl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciB0O3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKGUpe3N3aXRjaChlLmxhYmVsKXtjYXNlIDA6cmV0dXJuIGUudHJ5cy5wdXNoKFswLDIsLDRdKSxbNCx0aGlzLnNlbmQoMTApXTtjYXNlIDE6cmV0dXJuWzIsMT09PWUuc2VudCgpLmdldFVpbnQ4KDIpXTtjYXNlIDI6cmV0dXJuIHQ9ZS5zZW50KCksWzQsdGhpcy5jbGVhckFib3J0KCldO2Nhc2UgMzp0aHJvdyBlLnNlbnQoKSx0O2Nhc2UgNDpyZXR1cm5bMl19fSkpfSkpfSxlLnByb3RvdHlwZS50cmFuc2Zlcj1mdW5jdGlvbih0LGUscixzKXtyZXR1cm4gdm9pZCAwPT09ZSYmKGU9Miksdm9pZCAwPT09ciYmKHI9MCksdm9pZCAwPT09cyYmKHM9MCksbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIG4sbyx1LGMsYSxoLGY7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24oaSl7c3dpdGNoKGkubGFiZWwpe2Nhc2UgMDpuPVwibnVtYmVyXCI9PXR5cGVvZiB0P1t7cG9ydDp0LG1vZGU6ZSxyZWdpc3RlcjpyLHZhbHVlOnN9XTp0LG89bmV3IFVpbnQ4QXJyYXkoMis1Km4ubGVuZ3RoKSwodT1uZXcgRGF0YVZpZXcoby5idWZmZXIpKS5zZXRVaW50OCgwLDApLHUuc2V0VWludDgoMSxuLmxlbmd0aCksbi5mb3JFYWNoKChmdW5jdGlvbih0LGUpe3ZhciByPTIrNSplO3Uuc2V0VWludDgocix0LnBvcnR8dC5tb2RlfHQucmVnaXN0ZXIpLHUuc2V0VWludDMyKHIrMSx0LnZhbHVlfHwwLCEwKX0pKSxpLmxhYmVsPTE7Y2FzZSAxOnJldHVybiBpLnRyeXMucHVzaChbMSwzLCw1XSksWzQsdGhpcy5zZW5kKDUsbyldO2Nhc2UgMjppZigoYz1pLnNlbnQoKSkuZ2V0VWludDgoMSkhPT1uLmxlbmd0aCl0aHJvdyBuZXcgRXJyb3IoXCJUcmFuc2ZlciBjb3VudCBtaXNtYXRjaFwiKTtpZigyPT09KGE9Yy5nZXRVaW50OCgyKSkpdGhyb3cgbmV3IEVycm9yKFwiVHJhbnNmZXIgcmVzcG9uc2UgV0FJVFwiKTtpZig0PT09YSl0aHJvdyBuZXcgRXJyb3IoXCJUcmFuc2ZlciByZXNwb25zZSBGQVVMVFwiKTtpZig4PT09YSl0aHJvdyBuZXcgRXJyb3IoXCJUcmFuc2ZlciByZXNwb25zZSBQUk9UT0NPTF9FUlJPUlwiKTtpZigxNj09PWEpdGhyb3cgbmV3IEVycm9yKFwiVHJhbnNmZXIgcmVzcG9uc2UgVkFMVUVfTUlTTUFUQ0hcIik7aWYoNz09PWEpdGhyb3cgbmV3IEVycm9yKFwiVHJhbnNmZXIgcmVzcG9uc2UgTk9fQUNLXCIpO3JldHVyblwibnVtYmVyXCI9PXR5cGVvZiB0P1syLGMuZ2V0VWludDMyKDMsITApXTooaD00Km4ubGVuZ3RoLFsyLG5ldyBVaW50MzJBcnJheShjLmJ1ZmZlci5zbGljZSgzLDMraCkpXSk7Y2FzZSAzOnJldHVybiBmPWkuc2VudCgpLFs0LHRoaXMuY2xlYXJBYm9ydCgpXTtjYXNlIDQ6dGhyb3cgaS5zZW50KCksZjtjYXNlIDU6cmV0dXJuWzJdfX0pKX0pKX0sZS5wcm90b3R5cGUudHJhbnNmZXJCbG9jaz1mdW5jdGlvbih0LGUscil7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciBuLHMsbyx1LGMsYSxoLGY7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24oaSl7c3dpdGNoKGkubGFiZWwpe2Nhc2UgMDpvPTQsXCJudW1iZXJcIj09dHlwZW9mIHI/KG49cixzPTIpOihuPXIubGVuZ3RoLHM9MCxvKz1yLmJ5dGVMZW5ndGgpLHU9bmV3IFVpbnQ4QXJyYXkobyksKGM9bmV3IERhdGFWaWV3KHUuYnVmZmVyKSkuc2V0VWludDgoMCwwKSxjLnNldFVpbnQxNigxLG4sITApLGMuc2V0VWludDgoMyx0fHN8ZSksXCJudW1iZXJcIiE9dHlwZW9mIHImJnIuZm9yRWFjaCgoZnVuY3Rpb24odCxlKXt2YXIgcj00KzQqZTtjLnNldFVpbnQzMihyLHQsITApfSkpLGkubGFiZWw9MTtjYXNlIDE6cmV0dXJuIGkudHJ5cy5wdXNoKFsxLDMsLDVdKSxbNCx0aGlzLnNlbmQoNixjKV07Y2FzZSAyOmlmKChhPWkuc2VudCgpKS5nZXRVaW50MTYoMSwhMCkhPT1uKXRocm93IG5ldyBFcnJvcihcIlRyYW5zZmVyIGNvdW50IG1pc21hdGNoXCIpO2lmKDI9PT0oaD1hLmdldFVpbnQ4KDMpKSl0aHJvdyBuZXcgRXJyb3IoXCJUcmFuc2ZlciByZXNwb25zZSBXQUlUXCIpO2lmKDQ9PT1oKXRocm93IG5ldyBFcnJvcihcIlRyYW5zZmVyIHJlc3BvbnNlIEZBVUxUXCIpO2lmKDg9PT1oKXRocm93IG5ldyBFcnJvcihcIlRyYW5zZmVyIHJlc3BvbnNlIFBST1RPQ09MX0VSUk9SXCIpO2lmKDc9PT1oKXRocm93IG5ldyBFcnJvcihcIlRyYW5zZmVyIHJlc3BvbnNlIE5PX0FDS1wiKTtyZXR1cm5cIm51bWJlclwiPT10eXBlb2Ygcj9bMixuZXcgVWludDMyQXJyYXkoYS5idWZmZXIuc2xpY2UoNCw0KzQqbikpXTpbMyw1XTtjYXNlIDM6cmV0dXJuIGY9aS5zZW50KCksWzQsdGhpcy5jbGVhckFib3J0KCldO2Nhc2UgNDp0aHJvdyBpLnNlbnQoKSxmO2Nhc2UgNTpyZXR1cm5bMix2b2lkIDBdfX0pKX0pKX0sZX0obyksQT0vW1xceGMwLVxceGZmXVtcXHg4MC1cXHhiZl0qJC9nLEM9L1tcXHhjMC1cXHhmZl1bXFx4ODAtXFx4YmZdKi9nLFU9ZnVuY3Rpb24oKXtmdW5jdGlvbiB0KCl7fXJldHVybiB0LnByb3RvdHlwZS5kZWNvZGU9ZnVuY3Rpb24odCl7dmFyIGU9QXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwobmV3IFVpbnQ4QXJyYXkodCkpLHI9U3RyaW5nLmZyb21Db2RlUG9pbnQuYXBwbHkodm9pZCAwLGUpO3RoaXMucGFydGlhbENoYXImJihyPVwiXCIrdGhpcy5wYXJ0aWFsQ2hhcityLHRoaXMucGFydGlhbENoYXI9dm9pZCAwKTt2YXIgbj1yLm1hdGNoKEEpO2lmKG4pe3ZhciBpPW5bMF0ubGVuZ3RoO3RoaXMucGFydGlhbENoYXI9ci5zbGljZSgtaSkscj1yLnNsaWNlKDAsLWkpfXJldHVybiByLnJlcGxhY2UoQyx0aGlzLmRlY29kZXJSZXBsYWNlcil9LHQucHJvdG90eXBlLmRlY29kZXJSZXBsYWNlcj1mdW5jdGlvbih0KXt2YXIgZT10LmNvZGVQb2ludEF0KDApPDwyNCxyPU1hdGguY2x6MzIofmUpLG49MCxpPXQubGVuZ3RoLHM9XCJcIjtpZihyPDUmJmk+PXIpe2ZvcihlPWU8PHI+Pj4yNCtyLG49MTtuPHI7bis9MSllPWU8PDZ8NjMmdC5jb2RlUG9pbnRBdChuKTtlPD02NTUzNT9zKz1TdHJpbmcuZnJvbUNvZGVQb2ludChlKTplPD0xMTE0MTExPyhlLT02NTUzNixzKz1TdHJpbmcuZnJvbUNvZGVQb2ludCg1NTI5NisoZT4+MTApLDU2MzIwKygxMDIzJmUpKSk6bj0wfWZvcig7bjxpO24rPTEpcys9XCLvv71cIjtyZXR1cm4gc30sdH0oKSxFPW5ldyBVLFA9ZnVuY3Rpb24odCl7ZnVuY3Rpb24gZShyLHMsbyl7dm9pZCAwPT09cyYmKHM9MCksdm9pZCAwPT09byYmKG89bSk7dmFyIHU9dC5jYWxsKHRoaXMscixzLG8pfHx0aGlzO3JldHVybiB1LnNlcmlhbFBvbGxpbmc9ITEsdS5zZXJpYWxMaXN0ZW5lcnM9ITEsdS5vbihcIm5ld0xpc3RlbmVyXCIsKGZ1bmN0aW9uKHQpe3JldHVybiBuKHUsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihyKXtyZXR1cm4gdD09PWUuRVZFTlRfU0VSSUFMX0RBVEEmJjA9PT10aGlzLmxpc3RlbmVyQ291bnQodCkmJih0aGlzLnNlcmlhbExpc3RlbmVycz0hMCksWzJdfSkpfSkpfSkpLHUub24oXCJyZW1vdmVMaXN0ZW5lclwiLChmdW5jdGlvbih0KXt0PT09ZS5FVkVOVF9TRVJJQUxfREFUQSYmKDA9PT11Lmxpc3RlbmVyQ291bnQodCkmJih1LnNlcmlhbExpc3RlbmVycz0hMSkpfSkpLHV9cmV0dXJuIHIoZSx0KSxlLnByb3RvdHlwZS5pc0J1ZmZlckJpbmFyeT1mdW5jdGlvbih0KXtmb3IodmFyIGU9QXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwobmV3IFVpbnQxNkFycmF5KHQsMCw1MCkpLHI9U3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShudWxsLGUpLG49MDtuPHIubGVuZ3RoO24rKyl7dmFyIGk9ci5jaGFyQ29kZUF0KG4pO2lmKDY1NTMzPT09aXx8aTw9OClyZXR1cm4hMH1yZXR1cm4hMX0sZS5wcm90b3R5cGUud3JpdGVCdWZmZXI9ZnVuY3Rpb24odCxyLHMpe3JldHVybiB2b2lkIDA9PT1zJiYocz0wKSxuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgbixvLHUsYztyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihpKXtzd2l0Y2goaS5sYWJlbCl7Y2FzZSAwOm49TWF0aC5taW4odC5ieXRlTGVuZ3RoLHMrciksbz10LnNsaWNlKHMsbiksKHU9bmV3IFVpbnQ4QXJyYXkoby5ieXRlTGVuZ3RoKzEpKS5zZXQoW28uYnl0ZUxlbmd0aF0pLHUuc2V0KG5ldyBVaW50OEFycmF5KG8pLDEpLGkubGFiZWw9MTtjYXNlIDE6cmV0dXJuIGkudHJ5cy5wdXNoKFsxLDMsLDVdKSxbNCx0aGlzLnNlbmQoMTQwLHUpXTtjYXNlIDI6cmV0dXJuIGkuc2VudCgpLFszLDVdO2Nhc2UgMzpyZXR1cm4gYz1pLnNlbnQoKSxbNCx0aGlzLmNsZWFyQWJvcnQoKV07Y2FzZSA0OnRocm93IGkuc2VudCgpLGM7Y2FzZSA1OnJldHVybiB0aGlzLmVtaXQoZS5FVkVOVF9QUk9HUkVTUyxzL3QuYnl0ZUxlbmd0aCksbjx0LmJ5dGVMZW5ndGg/WzIsdGhpcy53cml0ZUJ1ZmZlcih0LHIsbildOlsyXX19KSl9KSl9LGUucHJvdG90eXBlLmZsYXNoPWZ1bmN0aW9uKHQscil7cmV0dXJuIHZvaWQgMD09PXImJihyPTYyKSxuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgbixzLG87cmV0dXJuIGkodGhpcywoZnVuY3Rpb24oaSl7c3dpdGNoKGkubGFiZWwpe2Nhc2UgMDpuPWZ1bmN0aW9uKHQpe3JldHVybiB2b2lkIDAhPT10LmJ1ZmZlcn0odCk/dC5idWZmZXI6dCxzPXRoaXMuaXNCdWZmZXJCaW5hcnkobik/MDoxLGkubGFiZWw9MTtjYXNlIDE6cmV0dXJuIGkudHJ5cy5wdXNoKFsxLDYsLDhdKSxbNCx0aGlzLnNlbmQoMTM4LG5ldyBVaW50MzJBcnJheShbc10pKV07Y2FzZSAyOmlmKDAhPT1pLnNlbnQoKS5nZXRVaW50OCgxKSl0aHJvdyBuZXcgRXJyb3IoXCJGbGFzaCBlcnJvclwiKTtyZXR1cm5bNCx0aGlzLndyaXRlQnVmZmVyKG4scildO2Nhc2UgMzpyZXR1cm4gaS5zZW50KCksdGhpcy5lbWl0KGUuRVZFTlRfUFJPR1JFU1MsMSksWzQsdGhpcy5zZW5kKDEzOSldO2Nhc2UgNDppZigwIT09aS5zZW50KCkuZ2V0VWludDgoMSkpdGhyb3cgbmV3IEVycm9yKFwiRmxhc2ggZXJyb3JcIik7cmV0dXJuWzQsdGhpcy5zZW5kKDEzNyldO2Nhc2UgNTpyZXR1cm4gaS5zZW50KCksWzMsOF07Y2FzZSA2OnJldHVybiBvPWkuc2VudCgpLFs0LHRoaXMuY2xlYXJBYm9ydCgpXTtjYXNlIDc6dGhyb3cgaS5zZW50KCksbztjYXNlIDg6cmV0dXJuWzJdfX0pKX0pKX0sZS5wcm90b3R5cGUuZ2V0U2VyaWFsQmF1ZHJhdGU9ZnVuY3Rpb24oKXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIHQ7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24oZSl7c3dpdGNoKGUubGFiZWwpe2Nhc2UgMDpyZXR1cm4gZS50cnlzLnB1c2goWzAsMiwsNF0pLFs0LHRoaXMuc2VuZCgxMjkpXTtjYXNlIDE6cmV0dXJuWzIsZS5zZW50KCkuZ2V0VWludDMyKDEsITApXTtjYXNlIDI6cmV0dXJuIHQ9ZS5zZW50KCksWzQsdGhpcy5jbGVhckFib3J0KCldO2Nhc2UgMzp0aHJvdyBlLnNlbnQoKSx0O2Nhc2UgNDpyZXR1cm5bMl19fSkpfSkpfSxlLnByb3RvdHlwZS5zZXRTZXJpYWxCYXVkcmF0ZT1mdW5jdGlvbih0KXtyZXR1cm4gdm9pZCAwPT09dCYmKHQ9OTYwMCksbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIGU7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24ocil7c3dpdGNoKHIubGFiZWwpe2Nhc2UgMDpyZXR1cm4gci50cnlzLnB1c2goWzAsMiwsNF0pLFs0LHRoaXMuc2VuZCgxMzAsbmV3IFVpbnQzMkFycmF5KFt0XSkpXTtjYXNlIDE6cmV0dXJuIHIuc2VudCgpLFszLDRdO2Nhc2UgMjpyZXR1cm4gZT1yLnNlbnQoKSxbNCx0aGlzLmNsZWFyQWJvcnQoKV07Y2FzZSAzOnRocm93IHIuc2VudCgpLGU7Y2FzZSA0OnJldHVyblsyXX19KSl9KSl9LGUucHJvdG90eXBlLnNlcmlhbFdyaXRlPWZ1bmN0aW9uKHQpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgZSxyO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKG4pe3N3aXRjaChuLmxhYmVsKXtjYXNlIDA6KGU9dC5zcGxpdChcIlwiKS5tYXAoKGZ1bmN0aW9uKHQpe3JldHVybiB0LmNoYXJDb2RlQXQoMCl9KSkpLnVuc2hpZnQoZS5sZW5ndGgpLG4ubGFiZWw9MTtjYXNlIDE6cmV0dXJuIG4udHJ5cy5wdXNoKFsxLDMsLDVdKSxbNCx0aGlzLnNlbmQoMTMyLG5ldyBVaW50OEFycmF5KGUpLmJ1ZmZlcildO2Nhc2UgMjpyZXR1cm4gbi5zZW50KCksWzMsNV07Y2FzZSAzOnJldHVybiByPW4uc2VudCgpLFs0LHRoaXMuY2xlYXJBYm9ydCgpXTtjYXNlIDQ6dGhyb3cgbi5zZW50KCkscjtjYXNlIDU6cmV0dXJuWzJdfX0pKX0pKX0sZS5wcm90b3R5cGUuc2VyaWFsUmVhZD1mdW5jdGlvbigpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgdCxlLHI7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24obil7c3dpdGNoKG4ubGFiZWwpe2Nhc2UgMDpyZXR1cm4gbi50cnlzLnB1c2goWzAsMiwsNF0pLFs0LHRoaXMuc2VuZCgxMzEpXTtjYXNlIDE6cmV0dXJuIDA9PT0odD1uLnNlbnQoKSkuYnl0ZUxlbmd0aHx8KDEzMSE9PXQuZ2V0VWludDgoMCl8fDA9PT0oZT10LmdldFVpbnQ4KDEpKSk/WzIsdm9pZCAwXTooMixbMix0LmJ1ZmZlci5zbGljZSgyLDIrZSldKTtjYXNlIDI6cmV0dXJuIHI9bi5zZW50KCksWzQsdGhpcy5jbGVhckFib3J0KCldO2Nhc2UgMzp0aHJvdyBuLnNlbnQoKSxyO2Nhc2UgNDpyZXR1cm5bMl19fSkpfSkpfSxlLnByb3RvdHlwZS5zdGFydFNlcmlhbFJlYWQ9ZnVuY3Rpb24odCxyKXtyZXR1cm4gdm9pZCAwPT09dCYmKHQ9MTAwKSx2b2lkIDA9PT1yJiYocj0hMCksbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIG4scyxvO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKGkpe3N3aXRjaChpLmxhYmVsKXtjYXNlIDA6dGhpcy5zZXJpYWxQb2xsaW5nPSEwLGkubGFiZWw9MTtjYXNlIDE6cmV0dXJuIHRoaXMuc2VyaWFsUG9sbGluZz90aGlzLnNlcmlhbExpc3RlbmVycz8obj10aGlzLmNvbm5lY3RlZCwhMSE9PXRoaXMuY29ubmVjdGVkfHwhMCE9PXI/WzMsM106WzQsdGhpcy5jb25uZWN0KCldKTpbMyw3XTpbMyw5XTtjYXNlIDI6aS5zZW50KCksaS5sYWJlbD0zO2Nhc2UgMzpyZXR1cm5bNCx0aGlzLnNlcmlhbFJlYWQoKV07Y2FzZSA0OnJldHVybiBzPWkuc2VudCgpLCExIT09bnx8ITAhPT1yP1szLDZdOls0LHRoaXMuZGlzY29ubmVjdCgpXTtjYXNlIDU6aS5zZW50KCksaS5sYWJlbD02O2Nhc2UgNjp2b2lkIDAhPT1zJiYobz1FLmRlY29kZShzKSx0aGlzLmVtaXQoZS5FVkVOVF9TRVJJQUxfREFUQSxvKSksaS5sYWJlbD03O2Nhc2UgNzpyZXR1cm5bNCxuZXcgUHJvbWlzZSgoZnVuY3Rpb24oZSl7cmV0dXJuIHNldFRpbWVvdXQoZSx0KX0pKV07Y2FzZSA4OnJldHVybiBpLnNlbnQoKSxbMywxXTtjYXNlIDk6cmV0dXJuWzJdfX0pKX0pKX0sZS5wcm90b3R5cGUuc3RvcFNlcmlhbFJlYWQ9ZnVuY3Rpb24oKXt0aGlzLnNlcmlhbFBvbGxpbmc9ITF9LGUuRVZFTlRfUFJPR1JFU1M9XCJwcm9ncmVzc1wiLGUuRVZFTlRfU0VSSUFMX0RBVEE9XCJzZXJpYWxcIixlfShnKSxUPWZ1bmN0aW9uKCl7ZnVuY3Rpb24gdCh0LGUscil7dm9pZCAwPT09ZSYmKGU9MCksdm9pZCAwPT09ciYmKHI9bSk7dGhpcy5wcm94eT12b2lkIDAhPT10Lm9wZW4/bmV3IGcodCxlLHIpOnR9cmV0dXJuIHQucHJvdG90eXBlLndhaXREZWxheT1mdW5jdGlvbih0LGUscil7cmV0dXJuIHZvaWQgMD09PWUmJihlPTApLHZvaWQgMD09PXImJihyPTEwMCksbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIG47cmV0dXJuIGkodGhpcywoZnVuY3Rpb24oaSl7c3dpdGNoKGkubGFiZWwpe2Nhc2UgMDpuPSEwLGU+MCYmc2V0VGltZW91dCgoZnVuY3Rpb24oKXtpZihuKXRocm93IG49ITEsbmV3IEVycm9yKFwiV2FpdCB0aW1lZCBvdXRcIil9KSxlKSxpLmxhYmVsPTE7Y2FzZSAxOnJldHVybiBuP1s0LHQoKV06WzMsNV07Y2FzZSAyOnJldHVybiEwPT09aS5zZW50KCk/KG49ITEsWzJdKTpyPjA/WzQsbmV3IFByb21pc2UoKGZ1bmN0aW9uKHQpe3JldHVybiBzZXRUaW1lb3V0KHQsZSl9KSldOlszLDRdO2Nhc2UgMzppLnNlbnQoKSxpLmxhYmVsPTQ7Y2FzZSA0OnJldHVyblszLDFdO2Nhc2UgNTpyZXR1cm5bMl19fSkpfSkpfSx0LnByb3RvdHlwZS5jb25jYXRUeXBlZEFycmF5PWZ1bmN0aW9uKHQpe2lmKDE9PT10Lmxlbmd0aClyZXR1cm4gdFswXTtmb3IodmFyIGU9MCxyPTAsbj10O3I8bi5sZW5ndGg7cisrKXtlKz1uW3JdLmxlbmd0aH1mb3IodmFyIGk9bmV3IFVpbnQzMkFycmF5KGUpLHM9MCxvPTA7czx0Lmxlbmd0aDtzKyspaS5zZXQodFtzXSxvKSxvKz10W3NdLmxlbmd0aDtyZXR1cm4gaX0sdC5wcm90b3R5cGUucmVhZERQQ29tbWFuZD1mdW5jdGlvbih0KXtyZXR1cm5be21vZGU6Mixwb3J0OjAscmVnaXN0ZXI6dH1dfSx0LnByb3RvdHlwZS53cml0ZURQQ29tbWFuZD1mdW5jdGlvbih0LGUpe2lmKDg9PT10KXtpZihlPT09dGhpcy5zZWxlY3RlZEFkZHJlc3MpcmV0dXJuW107dGhpcy5zZWxlY3RlZEFkZHJlc3M9ZX1yZXR1cm5be21vZGU6MCxwb3J0OjAscmVnaXN0ZXI6dCx2YWx1ZTplfV19LHQucHJvdG90eXBlLnJlYWRBUENvbW1hbmQ9ZnVuY3Rpb24odCl7dmFyIGU9NDI3ODE5MDA4MCZ0fDI0MCZ0O3JldHVybiB0aGlzLndyaXRlRFBDb21tYW5kKDgsZSkuY29uY2F0KHttb2RlOjIscG9ydDoxLHJlZ2lzdGVyOnR9KX0sdC5wcm90b3R5cGUud3JpdGVBUENvbW1hbmQ9ZnVuY3Rpb24odCxlKXtpZigwPT09dCl7aWYoZT09PXRoaXMuY3N3VmFsdWUpcmV0dXJuW107dGhpcy5jc3dWYWx1ZT1lfXZhciByPTQyNzgxOTAwODAmdHwyNDAmdDtyZXR1cm4gdGhpcy53cml0ZURQQ29tbWFuZCg4LHIpLmNvbmNhdCh7bW9kZTowLHBvcnQ6MSxyZWdpc3Rlcjp0LHZhbHVlOmV9KX0sdC5wcm90b3R5cGUucmVhZE1lbTE2Q29tbWFuZD1mdW5jdGlvbih0KXtyZXR1cm4gdGhpcy53cml0ZUFQQ29tbWFuZCgwLDU4NzIwMjY0MSkuY29uY2F0KHRoaXMud3JpdGVBUENvbW1hbmQoNCx0KSkuY29uY2F0KHRoaXMucmVhZEFQQ29tbWFuZCgxMikpfSx0LnByb3RvdHlwZS53cml0ZU1lbTE2Q29tbWFuZD1mdW5jdGlvbih0LGUpe3JldHVybiB0aGlzLndyaXRlQVBDb21tYW5kKDAsNTg3MjAyNjQxKS5jb25jYXQodGhpcy53cml0ZUFQQ29tbWFuZCg0LHQpKS5jb25jYXQodGhpcy53cml0ZUFQQ29tbWFuZCgxMixlKSl9LHQucHJvdG90eXBlLnJlYWRNZW0zMkNvbW1hbmQ9ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMud3JpdGVBUENvbW1hbmQoMCw1ODcyMDI2NDIpLmNvbmNhdCh0aGlzLndyaXRlQVBDb21tYW5kKDQsdCkpLmNvbmNhdCh0aGlzLnJlYWRBUENvbW1hbmQoMTIpKX0sdC5wcm90b3R5cGUud3JpdGVNZW0zMkNvbW1hbmQ9ZnVuY3Rpb24odCxlKXtyZXR1cm4gdGhpcy53cml0ZUFQQ29tbWFuZCgwLDU4NzIwMjY0MikuY29uY2F0KHRoaXMud3JpdGVBUENvbW1hbmQoNCx0KSkuY29uY2F0KHRoaXMud3JpdGVBUENvbW1hbmQoMTIsZSkpfSx0LnByb3RvdHlwZS50cmFuc2ZlclNlcXVlbmNlPWZ1bmN0aW9uKHQpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgZSxyLG4scztyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihpKXtzd2l0Y2goaS5sYWJlbCl7Y2FzZSAwOmU9KGU9W10pLmNvbmNhdC5hcHBseShlLHQpLHI9W10saS5sYWJlbD0xO2Nhc2UgMTpyZXR1cm4gZS5sZW5ndGg/KG49ZS5zcGxpY2UoMCx0aGlzLnByb3h5Lm9wZXJhdGlvbkNvdW50KSxbNCx0aGlzLnByb3h5LnRyYW5zZmVyKG4pXSk6WzMsM107Y2FzZSAyOnJldHVybiBzPWkuc2VudCgpLHIucHVzaChzKSxbMywxXTtjYXNlIDM6cmV0dXJuWzIsdGhpcy5jb25jYXRUeXBlZEFycmF5KHIpXX19KSl9KSl9LHQucHJvdG90eXBlLmNvbm5lY3Q9ZnVuY3Rpb24oKXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIHQsZT10aGlzO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKHIpe3N3aXRjaChyLmxhYmVsKXtjYXNlIDA6cmV0dXJuIHQ9LTE2MTA2MTI3MzYsWzQsdGhpcy5wcm94eS5jb25uZWN0KCldO2Nhc2UgMTpyZXR1cm4gci5zZW50KCksWzQsdGhpcy5yZWFkRFAoMCldO2Nhc2UgMjpyZXR1cm4gci5zZW50KCksWzQsdGhpcy50cmFuc2ZlclNlcXVlbmNlKFt0aGlzLndyaXRlRFBDb21tYW5kKDAsNCksdGhpcy53cml0ZURQQ29tbWFuZCg4LDApLHRoaXMud3JpdGVEUENvbW1hbmQoNCwxMzQyMTc3MjgwKV0pXTtjYXNlIDM6cmV0dXJuIHIuc2VudCgpLFs0LHRoaXMud2FpdERlbGF5KChmdW5jdGlvbigpe3JldHVybiBuKGUsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihlKXtzd2l0Y2goZS5sYWJlbCl7Y2FzZSAwOnJldHVybls0LHRoaXMucmVhZERQKDQpXTtjYXNlIDE6cmV0dXJuWzIsKGUuc2VudCgpJnQpPT09dF19fSkpfSkpfSkpXTtjYXNlIDQ6cmV0dXJuIHIuc2VudCgpLFsyXX19KSl9KSl9LHQucHJvdG90eXBlLmRpc2Nvbm5lY3Q9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5wcm94eS5kaXNjb25uZWN0KCl9LHQucHJvdG90eXBlLnJlY29ubmVjdD1mdW5jdGlvbigpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbih0KXtzd2l0Y2godC5sYWJlbCl7Y2FzZSAwOnJldHVybls0LHRoaXMuZGlzY29ubmVjdCgpXTtjYXNlIDE6cmV0dXJuIHQuc2VudCgpLFs0LG5ldyBQcm9taXNlKChmdW5jdGlvbih0KXtyZXR1cm4gc2V0VGltZW91dCh0LDEwMCl9KSldO2Nhc2UgMjpyZXR1cm4gdC5zZW50KCksWzQsdGhpcy5jb25uZWN0KCldO2Nhc2UgMzpyZXR1cm4gdC5zZW50KCksWzJdfX0pKX0pKX0sdC5wcm90b3R5cGUucmVzZXQ9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5wcm94eS5yZXNldCgpfSx0LnByb3RvdHlwZS5yZWFkRFA9ZnVuY3Rpb24odCl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKGUpe3N3aXRjaChlLmxhYmVsKXtjYXNlIDA6cmV0dXJuWzQsdGhpcy5wcm94eS50cmFuc2Zlcih0aGlzLnJlYWREUENvbW1hbmQodCkpXTtjYXNlIDE6cmV0dXJuWzIsZS5zZW50KClbMF1dfX0pKX0pKX0sdC5wcm90b3R5cGUud3JpdGVEUD1mdW5jdGlvbih0LGUpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihyKXtzd2l0Y2goci5sYWJlbCl7Y2FzZSAwOnJldHVybls0LHRoaXMucHJveHkudHJhbnNmZXIodGhpcy53cml0ZURQQ29tbWFuZCh0LGUpKV07Y2FzZSAxOnJldHVybiByLnNlbnQoKSxbMl19fSkpfSkpfSx0LnByb3RvdHlwZS5yZWFkQVA9ZnVuY3Rpb24odCl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKGUpe3N3aXRjaChlLmxhYmVsKXtjYXNlIDA6cmV0dXJuWzQsdGhpcy5wcm94eS50cmFuc2Zlcih0aGlzLnJlYWRBUENvbW1hbmQodCkpXTtjYXNlIDE6cmV0dXJuWzIsZS5zZW50KClbMF1dfX0pKX0pKX0sdC5wcm90b3R5cGUud3JpdGVBUD1mdW5jdGlvbih0LGUpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihyKXtzd2l0Y2goci5sYWJlbCl7Y2FzZSAwOnJldHVybls0LHRoaXMucHJveHkudHJhbnNmZXIodGhpcy53cml0ZUFQQ29tbWFuZCh0LGUpKV07Y2FzZSAxOnJldHVybiByLnNlbnQoKSxbMl19fSkpfSkpfSx0LnByb3RvdHlwZS5yZWFkTWVtMTY9ZnVuY3Rpb24odCl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKGUpe3N3aXRjaChlLmxhYmVsKXtjYXNlIDA6cmV0dXJuWzQsdGhpcy5wcm94eS50cmFuc2Zlcih0aGlzLnJlYWRNZW0xNkNvbW1hbmQodCkpXTtjYXNlIDE6cmV0dXJuWzIsZS5zZW50KClbMF1dfX0pKX0pKX0sdC5wcm90b3R5cGUud3JpdGVNZW0xNj1mdW5jdGlvbih0LGUpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihyKXtzd2l0Y2goci5sYWJlbCl7Y2FzZSAwOnJldHVybiBlPDw9KDImdCk8PDMsWzQsdGhpcy5wcm94eS50cmFuc2Zlcih0aGlzLndyaXRlTWVtMTZDb21tYW5kKHQsZSkpXTtjYXNlIDE6cmV0dXJuIHIuc2VudCgpLFsyXX19KSl9KSl9LHQucHJvdG90eXBlLnJlYWRNZW0zMj1mdW5jdGlvbih0KXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24oZSl7c3dpdGNoKGUubGFiZWwpe2Nhc2UgMDpyZXR1cm5bNCx0aGlzLnByb3h5LnRyYW5zZmVyKHRoaXMucmVhZE1lbTMyQ29tbWFuZCh0KSldO2Nhc2UgMTpyZXR1cm5bMixlLnNlbnQoKVswXV19fSkpfSkpfSx0LnByb3RvdHlwZS53cml0ZU1lbTMyPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKHIpe3N3aXRjaChyLmxhYmVsKXtjYXNlIDA6cmV0dXJuWzQsdGhpcy5wcm94eS50cmFuc2Zlcih0aGlzLndyaXRlTWVtMzJDb21tYW5kKHQsZSkpXTtjYXNlIDE6cmV0dXJuIHIuc2VudCgpLFsyXX19KSl9KSl9LHQucHJvdG90eXBlLnJlYWRCbG9jaz1mdW5jdGlvbih0LGUpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgcixuLHMsbztyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihpKXtzd2l0Y2goaS5sYWJlbCl7Y2FzZSAwOnJldHVybls0LHRoaXMudHJhbnNmZXJTZXF1ZW5jZShbdGhpcy53cml0ZUFQQ29tbWFuZCgwLDU4NzIwMjY0MiksdGhpcy53cml0ZUFQQ29tbWFuZCg0LHQpXSldO2Nhc2UgMTppLnNlbnQoKSxyPVtdLG49ZSxpLmxhYmVsPTI7Y2FzZSAyOnJldHVybiBuPjA/KHM9TWF0aC5taW4obixNYXRoLmZsb29yKHRoaXMucHJveHkuYmxvY2tTaXplLzQpKSxbNCx0aGlzLnByb3h5LnRyYW5zZmVyQmxvY2soMSwxMixzKV0pOlszLDRdO2Nhc2UgMzpyZXR1cm4gbz1pLnNlbnQoKSxyLnB1c2gobyksbi09cyxbMywyXTtjYXNlIDQ6cmV0dXJuWzIsdGhpcy5jb25jYXRUeXBlZEFycmF5KHIpXX19KSl9KSl9LHQucHJvdG90eXBlLndyaXRlQmxvY2s9ZnVuY3Rpb24odCxlKXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIHIsbjtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihpKXtzd2l0Y2goaS5sYWJlbCl7Y2FzZSAwOnJldHVybls0LHRoaXMudHJhbnNmZXJTZXF1ZW5jZShbdGhpcy53cml0ZUFQQ29tbWFuZCgwLDU4NzIwMjY0MiksdGhpcy53cml0ZUFQQ29tbWFuZCg0LHQpXSldO2Nhc2UgMTppLnNlbnQoKSxyPTAsaS5sYWJlbD0yO2Nhc2UgMjpyZXR1cm4gcjxlLmxlbmd0aD8obj1lLnNsaWNlKHIscitNYXRoLmZsb29yKHRoaXMucHJveHkuYmxvY2tTaXplLzQpKSxbNCx0aGlzLnByb3h5LnRyYW5zZmVyQmxvY2soMSwxMixuKV0pOlszLDRdO2Nhc2UgMzpyZXR1cm4gaS5zZW50KCkscis9TWF0aC5mbG9vcih0aGlzLnByb3h5LmJsb2NrU2l6ZS80KSxbMywyXTtjYXNlIDQ6cmV0dXJuWzJdfX0pKX0pKX0sdH0oKSxMPTQ4NjgyLF89ZnVuY3Rpb24odCl7ZnVuY3Rpb24gZSgpe3JldHVybiBudWxsIT09dCYmdC5hcHBseSh0aGlzLGFyZ3VtZW50cyl8fHRoaXN9cmV0dXJuIHIoZSx0KSxlLnByb3RvdHlwZS5lbmFibGVEZWJ1Zz1mdW5jdGlvbigpe3JldHVybiB0aGlzLndyaXRlTWVtMzIoMzc1ODE1NzI5NiwtMTYwNDM4NjgxNSl9LGUucHJvdG90eXBlLnJlYWRDb3JlUmVnaXN0ZXJDb21tYW5kPWZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLndyaXRlTWVtMzJDb21tYW5kKDM3NTgxNTczMDAsdCkuY29uY2F0KHRoaXMucmVhZE1lbTMyQ29tbWFuZCgzNzU4MTU3Mjk2KSkuY29uY2F0KHRoaXMucmVhZE1lbTMyQ29tbWFuZCgzNzU4MTU3MzA0KSl9LGUucHJvdG90eXBlLndyaXRlQ29yZVJlZ2lzdGVyQ29tbWFuZD1mdW5jdGlvbih0LGUpe3JldHVybiB0aGlzLndyaXRlTWVtMzJDb21tYW5kKDM3NTgxNTczMDQsZSkuY29uY2F0KHRoaXMud3JpdGVNZW0zMkNvbW1hbmQoMzc1ODE1NzMwMCw2NTUzNnx0KSl9LGUucHJvdG90eXBlLmdldFN0YXRlPWZ1bmN0aW9uKCl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciB0LGUscjtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihuKXtzd2l0Y2gobi5sYWJlbCl7Y2FzZSAwOnJldHVybls0LHRoaXMucmVhZE1lbTMyKDM3NTgxNTcyOTYpXTtjYXNlIDE6cmV0dXJuIHQ9bi5zZW50KCksZT01MjQyODgmdD8xOjI2MjE0NCZ0PzI6MTMxMDcyJnQ/Mzo0LDMzNTU0NDMyJnQ/WzQsdGhpcy5yZWFkTWVtMzIoMzc1ODE1NzI5NildOlszLDNdO2Nhc2UgMjpyZXR1cm4gMzM1NTQ0MzImKHI9bi5zZW50KCkpJiYhKDE2Nzc3MjE2JnIpP1syLDBdOlsyLGVdO2Nhc2UgMzpyZXR1cm5bMixlXTtjYXNlIDQ6cmV0dXJuWzJdfX0pKX0pKX0sZS5wcm90b3R5cGUuaXNIYWx0ZWQ9ZnVuY3Rpb24oKXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24odCl7c3dpdGNoKHQubGFiZWwpe2Nhc2UgMDpyZXR1cm5bNCx0aGlzLnJlYWRNZW0zMigzNzU4MTU3Mjk2KV07Y2FzZSAxOnJldHVyblsyLCEhKDEzMTA3MiZ0LnNlbnQoKSldfX0pKX0pKX0sZS5wcm90b3R5cGUuaGFsdD1mdW5jdGlvbih0LGUpe3JldHVybiB2b2lkIDA9PT10JiYodD0hMCksdm9pZCAwPT09ZSYmKGU9MCksbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIHI9dGhpcztyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihuKXtzd2l0Y2gobi5sYWJlbCl7Y2FzZSAwOnJldHVybls0LHRoaXMuaXNIYWx0ZWQoKV07Y2FzZSAxOnJldHVybiBuLnNlbnQoKT9bMl06WzQsdGhpcy53cml0ZU1lbTMyKDM3NTgxNTcyOTYsLTE2MDQzODY4MTMpXTtjYXNlIDI6cmV0dXJuIG4uc2VudCgpLHQ/WzIsdGhpcy53YWl0RGVsYXkoKGZ1bmN0aW9uKCl7cmV0dXJuIHIuaXNIYWx0ZWQoKX0pLGUpXTpbMl19fSkpfSkpfSxlLnByb3RvdHlwZS5yZXN1bWU9ZnVuY3Rpb24odCxlKXtyZXR1cm4gdm9pZCAwPT09dCYmKHQ9ITApLHZvaWQgMD09PWUmJihlPTApLG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciByPXRoaXM7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24ocyl7c3dpdGNoKHMubGFiZWwpe2Nhc2UgMDpyZXR1cm5bNCx0aGlzLmlzSGFsdGVkKCldO2Nhc2UgMTpyZXR1cm4gcy5zZW50KCk/WzQsdGhpcy53cml0ZU1lbTMyKDM3NTgxNTcxMDQsNyldOlsyXTtjYXNlIDI6cmV0dXJuIHMuc2VudCgpLFs0LHRoaXMuZW5hYmxlRGVidWcoKV07Y2FzZSAzOnJldHVybiBzLnNlbnQoKSx0P1syLHRoaXMud2FpdERlbGF5KChmdW5jdGlvbigpe3JldHVybiBuKHIsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbih0KXtzd2l0Y2godC5sYWJlbCl7Y2FzZSAwOnJldHVybls0LHRoaXMuaXNIYWx0ZWQoKV07Y2FzZSAxOnJldHVyblsyLCF0LnNlbnQoKV19fSkpfSkpfSksZSldOlsyXX19KSl9KSl9LGUucHJvdG90eXBlLnJlYWRDb3JlUmVnaXN0ZXI9ZnVuY3Rpb24odCl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciBlO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKHIpe3N3aXRjaChyLmxhYmVsKXtjYXNlIDA6cmV0dXJuWzQsdGhpcy50cmFuc2ZlclNlcXVlbmNlKFt0aGlzLndyaXRlTWVtMzJDb21tYW5kKDM3NTgxNTczMDAsdCksdGhpcy5yZWFkTWVtMzJDb21tYW5kKDM3NTgxNTcyOTYpXSldO2Nhc2UgMTppZihlPXIuc2VudCgpLCEoNjU1MzYmZVswXSkpdGhyb3cgbmV3IEVycm9yKFwiUmVnaXN0ZXIgbm90IHJlYWR5XCIpO3JldHVyblsyLHRoaXMucmVhZE1lbTMyKDM3NTgxNTczMDQpXX19KSl9KSl9LGUucHJvdG90eXBlLnJlYWRDb3JlUmVnaXN0ZXJzPWZ1bmN0aW9uKHQpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgZSxyLG4scyxvO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKGkpe3N3aXRjaChpLmxhYmVsKXtjYXNlIDA6ZT1bXSxyPTAsbj10LGkubGFiZWw9MTtjYXNlIDE6cmV0dXJuIHI8bi5sZW5ndGg/KHM9bltyXSxbNCx0aGlzLnJlYWRDb3JlUmVnaXN0ZXIocyldKTpbMyw0XTtjYXNlIDI6bz1pLnNlbnQoKSxlLnB1c2gobyksaS5sYWJlbD0zO2Nhc2UgMzpyZXR1cm4gcisrLFszLDFdO2Nhc2UgNDpyZXR1cm5bMixlXX19KSl9KSl9LGUucHJvdG90eXBlLndyaXRlQ29yZVJlZ2lzdGVyPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciByO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKG4pe3N3aXRjaChuLmxhYmVsKXtjYXNlIDA6cmV0dXJuWzQsdGhpcy50cmFuc2ZlclNlcXVlbmNlKFt0aGlzLndyaXRlTWVtMzJDb21tYW5kKDM3NTgxNTczMDQsZSksdGhpcy53cml0ZU1lbTMyQ29tbWFuZCgzNzU4MTU3MzAwLDY1NTM2fHQpLHRoaXMucmVhZE1lbTMyQ29tbWFuZCgzNzU4MTU3Mjk2KV0pXTtjYXNlIDE6aWYocj1uLnNlbnQoKSwhKDY1NTM2JnJbMF0pKXRocm93IG5ldyBFcnJvcihcIlJlZ2lzdGVyIG5vdCByZWFkeVwiKTtyZXR1cm5bMl19fSkpfSkpfSxlLnByb3RvdHlwZS5leGVjdXRlPWZ1bmN0aW9uKHQsZSxyLHMsbyl7dm9pZCAwPT09byYmKG89dCsxKTtmb3IodmFyIHU9W10sYz01O2M8YXJndW1lbnRzLmxlbmd0aDtjKyspdVtjLTVdPWFyZ3VtZW50c1tjXTtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIG4sYyxhLGg9dGhpcztyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihpKXtzd2l0Y2goaS5sYWJlbCl7Y2FzZSAwOmZvcihlW2UubGVuZ3RoLTFdIT09TCYmKChuPW5ldyBVaW50MzJBcnJheShlLmxlbmd0aCsxKSkuc2V0KGUpLG4uc2V0KFtMXSxlLmxlbmd0aC0xKSxlPW4pLGM9W3RoaXMud3JpdGVDb3JlUmVnaXN0ZXJDb21tYW5kKDEzLHIpLHRoaXMud3JpdGVDb3JlUmVnaXN0ZXJDb21tYW5kKDE1LHMpLHRoaXMud3JpdGVDb3JlUmVnaXN0ZXJDb21tYW5kKDE0LG8pXSxhPTA7YTxNYXRoLm1pbih1Lmxlbmd0aCwxMik7YSsrKWMucHVzaCh0aGlzLndyaXRlQ29yZVJlZ2lzdGVyQ29tbWFuZChhLHVbYV0pKTtyZXR1cm4gYy5wdXNoKHRoaXMud3JpdGVDb3JlUmVnaXN0ZXJDb21tYW5kKDE2LDE2Nzc3MjE2KSksWzQsdGhpcy5oYWx0KCldO2Nhc2UgMTpyZXR1cm4gaS5zZW50KCksWzQsdGhpcy50cmFuc2ZlclNlcXVlbmNlKGMpXTtjYXNlIDI6cmV0dXJuIGkuc2VudCgpLFs0LHRoaXMud3JpdGVCbG9jayh0LGUpXTtjYXNlIDM6cmV0dXJuIGkuc2VudCgpLFs0LHRoaXMucmVzdW1lKCExKV07Y2FzZSA0OnJldHVybiBpLnNlbnQoKSxbNCx0aGlzLndhaXREZWxheSgoZnVuY3Rpb24oKXtyZXR1cm4gaC5pc0hhbHRlZCgpfSksMWU0KV07Y2FzZSA1OnJldHVybiBpLnNlbnQoKSxbMl19fSkpfSkpfSxlLnByb3RvdHlwZS5zb2Z0UmVzZXQ9ZnVuY3Rpb24oKXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24odCl7c3dpdGNoKHQubGFiZWwpe2Nhc2UgMDpyZXR1cm5bNCx0aGlzLndyaXRlTWVtMzIoMzc1ODE1NzMwOCwwKV07Y2FzZSAxOnJldHVybiB0LnNlbnQoKSxbMix0aGlzLndyaXRlTWVtMzIoMzc1ODE1NzA2OCwxMDAyNzAwODQpXX19KSl9KSl9LGUucHJvdG90eXBlLnNldFRhcmdldFJlc2V0U3RhdGU9ZnVuY3Rpb24odCl7cmV0dXJuIHZvaWQgMD09PXQmJih0PSEwKSxuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgZTtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihyKXtzd2l0Y2goci5sYWJlbCl7Y2FzZSAwOnJldHVybls0LHRoaXMud3JpdGVNZW0zMigzNzU4MTU3MzA4LDEpXTtjYXNlIDE6cmV0dXJuIHIuc2VudCgpLCEwIT09dD9bMywzXTpbNCx0aGlzLnJlc2V0KCldO2Nhc2UgMjpyZXR1cm4gci5zZW50KCksWzMsNl07Y2FzZSAzOnJldHVybls0LHRoaXMucmVhZE1lbTMyKDM3NTgxNTcwNjgpXTtjYXNlIDQ6cmV0dXJuIGU9ci5zZW50KCksWzQsdGhpcy53cml0ZU1lbTMyKDM3NTgxNTcwNjgsMTAwMjcwMDg0fGUpXTtjYXNlIDU6ci5zZW50KCksci5sYWJlbD02O2Nhc2UgNjpyZXR1cm5bNCx0aGlzLndyaXRlTWVtMzIoMzc1ODE1NzMwOCwwKV07Y2FzZSA3OnJldHVybiByLnNlbnQoKSxbMl19fSkpfSkpfSxlfShUKTsoeT10LkZQQkN0cmxNYXNrfHwodC5GUEJDdHJsTWFzaz17fSkpW3kuRU5BQkxFPTFdPVwiRU5BQkxFXCIseVt5LktFWT0yXT1cIktFWVwiO3ZhciBNPWZ1bmN0aW9uKCl7ZnVuY3Rpb24gdCh0KXt0aGlzLmRldmljZT10LHRoaXMub3M9XCJicm93c2VyXCIsdGhpcy5wYWNrZXRTaXplPTY0fXJldHVybiB0LnByb3RvdHlwZS5vcGVuPWZ1bmN0aW9uKCl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKHQpe3JldHVyblsyXX0pKX0pKX0sdC5wcm90b3R5cGUuY2xvc2U9ZnVuY3Rpb24oKXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuZGV2aWNlLmNsb3NlKCksWzJdfSkpfSkpfSx0LnByb3RvdHlwZS5yZWFkPWZ1bmN0aW9uKCl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciB0LGUscj10aGlzO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKG4pe3N3aXRjaChuLmxhYmVsKXtjYXNlIDA6cmV0dXJuWzQsbmV3IFByb21pc2UoKGZ1bmN0aW9uKHQsZSl7ci5kZXZpY2UucmVhZCgoZnVuY3Rpb24ocixuKXtpZihyKXJldHVybiBlKG5ldyBFcnJvcihyKSk7dChuKX0pKX0pKV07Y2FzZSAxOnJldHVybiB0PW4uc2VudCgpLGU9bmV3IFVpbnQ4QXJyYXkodCkuYnVmZmVyLFsyLG5ldyBEYXRhVmlldyhlKV19fSkpfSkpfSx0LnByb3RvdHlwZS53cml0ZT1mdW5jdGlvbih0KXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIGUscjtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihuKXtmb3IoZT1mdW5jdGlvbih0KXtyZXR1cm4gdm9pZCAwIT09dC5idWZmZXJ9KHQpP3QuYnVmZmVyOnQscj1BcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChuZXcgVWludDhBcnJheShlKSk7ci5sZW5ndGg8dGhpcy5wYWNrZXRTaXplOylyLnB1c2goMCk7aWYoXCJ3aW4zMlwiPT09dGhpcy5vcyYmci51bnNoaWZ0KDApLHRoaXMuZGV2aWNlLndyaXRlKHIpIT09ci5sZW5ndGgpdGhyb3cgbmV3IEVycm9yKFwiSW5jb3JyZWN0IGJ5dGVjb3VudCB3cml0dGVuXCIpO3JldHVyblsyXX0pKX0pKX0sdH0oKSx4PWZ1bmN0aW9uKCl7ZnVuY3Rpb24gdCh0LGUscixuKXt2b2lkIDA9PT1lJiYoZT0yNTUpLHZvaWQgMD09PXImJihyPTEpLHZvaWQgMD09PW4mJihuPSExKSx0aGlzLmRldmljZT10LHRoaXMuaW50ZXJmYWNlQ2xhc3M9ZSx0aGlzLmNvbmZpZ3VyYXRpb249cix0aGlzLmFsd2F5c0NvbnRyb2xUcmFuc2Zlcj1uLHRoaXMucGFja2V0U2l6ZT02NH1yZXR1cm4gdC5wcm90b3R5cGUuYnVmZmVyVG9EYXRhVmlldz1mdW5jdGlvbih0KXt2YXIgZT1uZXcgVWludDhBcnJheSh0KS5idWZmZXI7cmV0dXJuIG5ldyBEYXRhVmlldyhlKX0sdC5wcm90b3R5cGUuaXNWaWV3PWZ1bmN0aW9uKHQpe3JldHVybiB2b2lkIDAhPT10LmJ1ZmZlcn0sdC5wcm90b3R5cGUuYnVmZmVyU291cmNlVG9CdWZmZXI9ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy5pc1ZpZXcodCk/dC5idWZmZXI6dDtyZXR1cm4gQnVmZmVyLmZyb20oZSl9LHQucHJvdG90eXBlLmV4dGVuZEJ1ZmZlcj1mdW5jdGlvbih0LGUpe3ZhciByPXRoaXMuaXNWaWV3KHQpP3QuYnVmZmVyOnQsbj1NYXRoLm1pbihyLmJ5dGVMZW5ndGgsZSksaT1uZXcgVWludDhBcnJheShuKTtyZXR1cm4gaS5zZXQobmV3IFVpbnQ4QXJyYXkocikpLGl9LHQucHJvdG90eXBlLm9wZW49ZnVuY3Rpb24oKXtyZXR1cm4gbih0aGlzLHZvaWQgMCx2b2lkIDAsKGZ1bmN0aW9uKCl7dmFyIHQsZSxyLG4scyxvLHU9dGhpcztyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihpKXtzd2l0Y2goaS5sYWJlbCl7Y2FzZSAwOnJldHVybiB0aGlzLmRldmljZS5vcGVuKCksWzQsbmV3IFByb21pc2UoKGZ1bmN0aW9uKHQsZSl7dS5kZXZpY2Uuc2V0Q29uZmlndXJhdGlvbih1LmNvbmZpZ3VyYXRpb24sKGZ1bmN0aW9uKHIpe3I/ZShuZXcgRXJyb3IocikpOnQoKX0pKX0pKV07Y2FzZSAxOmlmKGkuc2VudCgpLCEodD10aGlzLmRldmljZS5pbnRlcmZhY2VzLmZpbHRlcigoZnVuY3Rpb24odCl7cmV0dXJuIHQuZGVzY3JpcHRvci5iSW50ZXJmYWNlQ2xhc3M9PT11LmludGVyZmFjZUNsYXNzfSkpKS5sZW5ndGgpdGhyb3cgbmV3IEVycm9yKFwiTm8gdmFsaWQgaW50ZXJmYWNlcyBmb3VuZC5cIik7aWYoKGU9dC5maW5kKChmdW5jdGlvbih0KXtyZXR1cm4gdC5lbmRwb2ludHMubGVuZ3RoPjB9KSkpfHwoZT10WzBdKSx0aGlzLmludGVyZmFjZU51bWJlcj1lLmludGVyZmFjZU51bWJlciwhdGhpcy5hbHdheXNDb250cm9sVHJhbnNmZXIpe2ZvcihyPWUuZW5kcG9pbnRzLHRoaXMuZW5kcG9pbnRJbj12b2lkIDAsdGhpcy5lbmRwb2ludE91dD12b2lkIDAsbj0wLHM9cjtuPHMubGVuZ3RoO24rKylcImluXCIhPT0obz1zW25dKS5kaXJlY3Rpb258fHRoaXMuZW5kcG9pbnRJbj9cIm91dFwiIT09by5kaXJlY3Rpb258fHRoaXMuZW5kcG9pbnRPdXR8fCh0aGlzLmVuZHBvaW50T3V0PW8pOnRoaXMuZW5kcG9pbnRJbj1vO2lmKHRoaXMuZW5kcG9pbnRJbnx8dGhpcy5lbmRwb2ludE91dCl0cnl7ZS5jbGFpbSgpfWNhdGNoKHQpe3RoaXMuZW5kcG9pbnRJbj12b2lkIDAsdGhpcy5lbmRwb2ludE91dD12b2lkIDB9fXJldHVyblsyXX19KSl9KSl9LHQucHJvdG90eXBlLmNsb3NlPWZ1bmN0aW9uKCl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLmRldmljZS5jbG9zZSgpLFsyXX0pKX0pKX0sdC5wcm90b3R5cGUucmVhZD1mdW5jdGlvbigpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgdCxlPXRoaXM7cmV0dXJuIGkodGhpcywoZnVuY3Rpb24ocil7c3dpdGNoKHIubGFiZWwpe2Nhc2UgMDppZih2b2lkIDA9PT10aGlzLmludGVyZmFjZU51bWJlcil0aHJvdyBuZXcgRXJyb3IoXCJObyBkZXZpY2Ugb3BlbmVkXCIpO3JldHVybls0LG5ldyBQcm9taXNlKChmdW5jdGlvbih0LHIpe2UuZW5kcG9pbnRJbj9lLmVuZHBvaW50SW4udHJhbnNmZXIoZS5wYWNrZXRTaXplLChmdW5jdGlvbihlLG4pe2U/cihlKTp0KG4pfSkpOmUuZGV2aWNlLmNvbnRyb2xUcmFuc2ZlcigxNjEsMSwyNTYsZS5pbnRlcmZhY2VOdW1iZXIsZS5wYWNrZXRTaXplLChmdW5jdGlvbihlLG4pe2U/cihlKTpuP3Qobik6cihuZXcgRXJyb3IoXCJObyBidWZmZXIgcmVhZFwiKSl9KSl9KSldO2Nhc2UgMTpyZXR1cm4gdD1yLnNlbnQoKSxbMix0aGlzLmJ1ZmZlclRvRGF0YVZpZXcodCldfX0pKX0pKX0sdC5wcm90b3R5cGUud3JpdGU9ZnVuY3Rpb24odCl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciBlLHIsbj10aGlzO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKGkpe3N3aXRjaChpLmxhYmVsKXtjYXNlIDA6aWYodm9pZCAwPT09dGhpcy5pbnRlcmZhY2VOdW1iZXIpdGhyb3cgbmV3IEVycm9yKFwiTm8gZGV2aWNlIG9wZW5lZFwiKTtyZXR1cm4gZT10aGlzLmV4dGVuZEJ1ZmZlcih0LHRoaXMucGFja2V0U2l6ZSkscj10aGlzLmJ1ZmZlclNvdXJjZVRvQnVmZmVyKGUpLFs0LG5ldyBQcm9taXNlKChmdW5jdGlvbih0LGUpe24uZW5kcG9pbnRPdXQ/bi5lbmRwb2ludE91dC50cmFuc2ZlcihyLChmdW5jdGlvbihyKXtpZihyKXJldHVybiBlKHIpO3QoKX0pKTpuLmRldmljZS5jb250cm9sVHJhbnNmZXIoMzMsOSw1MTIsbi5pbnRlcmZhY2VOdW1iZXIsciwoZnVuY3Rpb24ocil7aWYocilyZXR1cm4gZShyKTt0KCl9KSl9KSldO2Nhc2UgMTpyZXR1cm4gaS5zZW50KCksWzJdfX0pKX0pKX0sdH0oKSxTPWZ1bmN0aW9uKCl7ZnVuY3Rpb24gdCh0LGUscixuKXt2b2lkIDA9PT1lJiYoZT0yNTUpLHZvaWQgMD09PXImJihyPTEpLHZvaWQgMD09PW4mJihuPSExKSx0aGlzLmRldmljZT10LHRoaXMuaW50ZXJmYWNlQ2xhc3M9ZSx0aGlzLmNvbmZpZ3VyYXRpb249cix0aGlzLmFsd2F5c0NvbnRyb2xUcmFuc2Zlcj1uLHRoaXMucGFja2V0U2l6ZT02NH1yZXR1cm4gdC5wcm90b3R5cGUuZXh0ZW5kQnVmZmVyPWZ1bmN0aW9uKHQsZSl7dmFyIHI9dm9pZCAwIT09dC5idWZmZXI/dC5idWZmZXI6dCxuPU1hdGgubWluKHIuYnl0ZUxlbmd0aCxlKSxpPW5ldyBVaW50OEFycmF5KG4pO3JldHVybiBpLnNldChuZXcgVWludDhBcnJheShyKSksaX0sdC5wcm90b3R5cGUub3Blbj1mdW5jdGlvbigpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgdCxlLHIsbixzLG8sdT10aGlzO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKGkpe3N3aXRjaChpLmxhYmVsKXtjYXNlIDA6cmV0dXJuWzQsdGhpcy5kZXZpY2Uub3BlbigpXTtjYXNlIDE6cmV0dXJuIGkuc2VudCgpLFs0LHRoaXMuZGV2aWNlLnNlbGVjdENvbmZpZ3VyYXRpb24odGhpcy5jb25maWd1cmF0aW9uKV07Y2FzZSAyOmlmKGkuc2VudCgpLCEodD10aGlzLmRldmljZS5jb25maWd1cmF0aW9uLmludGVyZmFjZXMuZmlsdGVyKChmdW5jdGlvbih0KXtyZXR1cm4gdC5hbHRlcm5hdGVzWzBdLmludGVyZmFjZUNsYXNzPT09dS5pbnRlcmZhY2VDbGFzc30pKSkubGVuZ3RoKXRocm93IG5ldyBFcnJvcihcIk5vIHZhbGlkIGludGVyZmFjZXMgZm91bmQuXCIpO2lmKChlPXQuZmluZCgoZnVuY3Rpb24odCl7cmV0dXJuIHQuYWx0ZXJuYXRlc1swXS5lbmRwb2ludHMubGVuZ3RoPjB9KSkpfHwoZT10WzBdKSx0aGlzLmludGVyZmFjZU51bWJlcj1lLmludGVyZmFjZU51bWJlciwhdGhpcy5hbHdheXNDb250cm9sVHJhbnNmZXIpZm9yKHI9ZS5hbHRlcm5hdGVzWzBdLmVuZHBvaW50cyx0aGlzLmVuZHBvaW50SW49dm9pZCAwLHRoaXMuZW5kcG9pbnRPdXQ9dm9pZCAwLG49MCxzPXI7bjxzLmxlbmd0aDtuKyspXCJpblwiIT09KG89c1tuXSkuZGlyZWN0aW9ufHx0aGlzLmVuZHBvaW50SW4/XCJvdXRcIiE9PW8uZGlyZWN0aW9ufHx0aGlzLmVuZHBvaW50T3V0fHwodGhpcy5lbmRwb2ludE91dD1vKTp0aGlzLmVuZHBvaW50SW49bztyZXR1cm5bMix0aGlzLmRldmljZS5jbGFpbUludGVyZmFjZSh0aGlzLmludGVyZmFjZU51bWJlcildfX0pKX0pKX0sdC5wcm90b3R5cGUuY2xvc2U9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5kZXZpY2UuY2xvc2UoKX0sdC5wcm90b3R5cGUucmVhZD1mdW5jdGlvbigpe3JldHVybiBuKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24oKXt2YXIgdDtyZXR1cm4gaSh0aGlzLChmdW5jdGlvbihlKXtzd2l0Y2goZS5sYWJlbCl7Y2FzZSAwOmlmKHZvaWQgMD09PXRoaXMuaW50ZXJmYWNlTnVtYmVyKXRocm93IG5ldyBFcnJvcihcIk5vIGRldmljZSBvcGVuZWRcIik7cmV0dXJuIHRoaXMuZW5kcG9pbnRJbj9bNCx0aGlzLmRldmljZS50cmFuc2ZlckluKHRoaXMuZW5kcG9pbnRJbi5lbmRwb2ludE51bWJlcix0aGlzLnBhY2tldFNpemUpXTpbMywyXTtjYXNlIDE6cmV0dXJuIHQ9ZS5zZW50KCksWzMsNF07Y2FzZSAyOnJldHVybls0LHRoaXMuZGV2aWNlLmNvbnRyb2xUcmFuc2ZlckluKHtyZXF1ZXN0VHlwZTpcImNsYXNzXCIscmVjaXBpZW50OlwiaW50ZXJmYWNlXCIscmVxdWVzdDoxLHZhbHVlOjI1NixpbmRleDp0aGlzLmludGVyZmFjZU51bWJlcn0sdGhpcy5wYWNrZXRTaXplKV07Y2FzZSAzOnQ9ZS5zZW50KCksZS5sYWJlbD00O2Nhc2UgNDpyZXR1cm5bMix0LmRhdGFdfX0pKX0pKX0sdC5wcm90b3R5cGUud3JpdGU9ZnVuY3Rpb24odCl7cmV0dXJuIG4odGhpcyx2b2lkIDAsdm9pZCAwLChmdW5jdGlvbigpe3ZhciBlO3JldHVybiBpKHRoaXMsKGZ1bmN0aW9uKHIpe3N3aXRjaChyLmxhYmVsKXtjYXNlIDA6aWYodm9pZCAwPT09dGhpcy5pbnRlcmZhY2VOdW1iZXIpdGhyb3cgbmV3IEVycm9yKFwiTm8gZGV2aWNlIG9wZW5lZFwiKTtyZXR1cm4gZT10aGlzLmV4dGVuZEJ1ZmZlcih0LHRoaXMucGFja2V0U2l6ZSksdGhpcy5lbmRwb2ludE91dD9bNCx0aGlzLmRldmljZS50cmFuc2Zlck91dCh0aGlzLmVuZHBvaW50T3V0LmVuZHBvaW50TnVtYmVyLGUpXTpbMywyXTtjYXNlIDE6cmV0dXJuIHIuc2VudCgpLFszLDRdO2Nhc2UgMjpyZXR1cm5bNCx0aGlzLmRldmljZS5jb250cm9sVHJhbnNmZXJPdXQoe3JlcXVlc3RUeXBlOlwiY2xhc3NcIixyZWNpcGllbnQ6XCJpbnRlcmZhY2VcIixyZXF1ZXN0OjksdmFsdWU6NTEyLGluZGV4OnRoaXMuaW50ZXJmYWNlTnVtYmVyfSxlKV07Y2FzZSAzOnIuc2VudCgpLHIubGFiZWw9NDtjYXNlIDQ6cmV0dXJuWzJdfX0pKX0pKX0sdH0oKTt0LkFEST1ULHQuQ21zaXNEQVA9Zyx0LkNvcnRleE09Xyx0LkRBUExpbms9UCx0LkRFRkFVTFRfQ0xPQ0tfRlJFUVVFTkNZPW0sdC5ISUQ9TSx0LlVTQj14LHQuV2ViVVNCPVMsT2JqZWN0LmRlZmluZVByb3BlcnR5KHQsXCJfX2VzTW9kdWxlXCIse3ZhbHVlOiEwfSl9KSk7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1kYXAudW1kLmpzLm1hcFxuIiwiKGZ1bmN0aW9uKGEsYil7aWYoXCJmdW5jdGlvblwiPT10eXBlb2YgZGVmaW5lJiZkZWZpbmUuYW1kKWRlZmluZShbXSxiKTtlbHNlIGlmKFwidW5kZWZpbmVkXCIhPXR5cGVvZiBleHBvcnRzKWIoKTtlbHNle2IoKSxhLkZpbGVTYXZlcj17ZXhwb3J0czp7fX0uZXhwb3J0c319KSh0aGlzLGZ1bmN0aW9uKCl7XCJ1c2Ugc3RyaWN0XCI7ZnVuY3Rpb24gYihhLGIpe3JldHVyblwidW5kZWZpbmVkXCI9PXR5cGVvZiBiP2I9e2F1dG9Cb206ITF9Olwib2JqZWN0XCIhPXR5cGVvZiBiJiYoY29uc29sZS53YXJuKFwiRGVwcmVjYXRlZDogRXhwZWN0ZWQgdGhpcmQgYXJndW1lbnQgdG8gYmUgYSBvYmplY3RcIiksYj17YXV0b0JvbTohYn0pLGIuYXV0b0JvbSYmL15cXHMqKD86dGV4dFxcL1xcUyp8YXBwbGljYXRpb25cXC94bWx8XFxTKlxcL1xcUypcXCt4bWwpXFxzKjsuKmNoYXJzZXRcXHMqPVxccyp1dGYtOC9pLnRlc3QoYS50eXBlKT9uZXcgQmxvYihbXCJcXHVGRUZGXCIsYV0se3R5cGU6YS50eXBlfSk6YX1mdW5jdGlvbiBjKGEsYixjKXt2YXIgZD1uZXcgWE1MSHR0cFJlcXVlc3Q7ZC5vcGVuKFwiR0VUXCIsYSksZC5yZXNwb25zZVR5cGU9XCJibG9iXCIsZC5vbmxvYWQ9ZnVuY3Rpb24oKXtnKGQucmVzcG9uc2UsYixjKX0sZC5vbmVycm9yPWZ1bmN0aW9uKCl7Y29uc29sZS5lcnJvcihcImNvdWxkIG5vdCBkb3dubG9hZCBmaWxlXCIpfSxkLnNlbmQoKX1mdW5jdGlvbiBkKGEpe3ZhciBiPW5ldyBYTUxIdHRwUmVxdWVzdDtiLm9wZW4oXCJIRUFEXCIsYSwhMSk7dHJ5e2Iuc2VuZCgpfWNhdGNoKGEpe31yZXR1cm4gMjAwPD1iLnN0YXR1cyYmMjk5Pj1iLnN0YXR1c31mdW5jdGlvbiBlKGEpe3RyeXthLmRpc3BhdGNoRXZlbnQobmV3IE1vdXNlRXZlbnQoXCJjbGlja1wiKSl9Y2F0Y2goYyl7dmFyIGI9ZG9jdW1lbnQuY3JlYXRlRXZlbnQoXCJNb3VzZUV2ZW50c1wiKTtiLmluaXRNb3VzZUV2ZW50KFwiY2xpY2tcIiwhMCwhMCx3aW5kb3csMCwwLDAsODAsMjAsITEsITEsITEsITEsMCxudWxsKSxhLmRpc3BhdGNoRXZlbnQoYil9fXZhciBmPVwib2JqZWN0XCI9PXR5cGVvZiB3aW5kb3cmJndpbmRvdy53aW5kb3c9PT13aW5kb3c/d2luZG93Olwib2JqZWN0XCI9PXR5cGVvZiBzZWxmJiZzZWxmLnNlbGY9PT1zZWxmP3NlbGY6XCJvYmplY3RcIj09dHlwZW9mIGdsb2JhbCYmZ2xvYmFsLmdsb2JhbD09PWdsb2JhbD9nbG9iYWw6dm9pZCAwLGE9Zi5uYXZpZ2F0b3ImJi9NYWNpbnRvc2gvLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCkmJi9BcHBsZVdlYktpdC8udGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSYmIS9TYWZhcmkvLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCksZz1mLnNhdmVBc3x8KFwib2JqZWN0XCIhPXR5cGVvZiB3aW5kb3d8fHdpbmRvdyE9PWY/ZnVuY3Rpb24oKXt9OlwiZG93bmxvYWRcImluIEhUTUxBbmNob3JFbGVtZW50LnByb3RvdHlwZSYmIWE/ZnVuY3Rpb24oYixnLGgpe3ZhciBpPWYuVVJMfHxmLndlYmtpdFVSTCxqPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJhXCIpO2c9Z3x8Yi5uYW1lfHxcImRvd25sb2FkXCIsai5kb3dubG9hZD1nLGoucmVsPVwibm9vcGVuZXJcIixcInN0cmluZ1wiPT10eXBlb2YgYj8oai5ocmVmPWIsai5vcmlnaW49PT1sb2NhdGlvbi5vcmlnaW4/ZShqKTpkKGouaHJlZik/YyhiLGcsaCk6ZShqLGoudGFyZ2V0PVwiX2JsYW5rXCIpKTooai5ocmVmPWkuY3JlYXRlT2JqZWN0VVJMKGIpLHNldFRpbWVvdXQoZnVuY3Rpb24oKXtpLnJldm9rZU9iamVjdFVSTChqLmhyZWYpfSw0RTQpLHNldFRpbWVvdXQoZnVuY3Rpb24oKXtlKGopfSwwKSl9OlwibXNTYXZlT3JPcGVuQmxvYlwiaW4gbmF2aWdhdG9yP2Z1bmN0aW9uKGYsZyxoKXtpZihnPWd8fGYubmFtZXx8XCJkb3dubG9hZFwiLFwic3RyaW5nXCIhPXR5cGVvZiBmKW5hdmlnYXRvci5tc1NhdmVPck9wZW5CbG9iKGIoZixoKSxnKTtlbHNlIGlmKGQoZikpYyhmLGcsaCk7ZWxzZXt2YXIgaT1kb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYVwiKTtpLmhyZWY9ZixpLnRhcmdldD1cIl9ibGFua1wiLHNldFRpbWVvdXQoZnVuY3Rpb24oKXtlKGkpfSl9fTpmdW5jdGlvbihiLGQsZSxnKXtpZihnPWd8fG9wZW4oXCJcIixcIl9ibGFua1wiKSxnJiYoZy5kb2N1bWVudC50aXRsZT1nLmRvY3VtZW50LmJvZHkuaW5uZXJUZXh0PVwiZG93bmxvYWRpbmcuLi5cIiksXCJzdHJpbmdcIj09dHlwZW9mIGIpcmV0dXJuIGMoYixkLGUpO3ZhciBoPVwiYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtXCI9PT1iLnR5cGUsaT0vY29uc3RydWN0b3IvaS50ZXN0KGYuSFRNTEVsZW1lbnQpfHxmLnNhZmFyaSxqPS9DcmlPU1xcL1tcXGRdKy8udGVzdChuYXZpZ2F0b3IudXNlckFnZW50KTtpZigoanx8aCYmaXx8YSkmJlwidW5kZWZpbmVkXCIhPXR5cGVvZiBGaWxlUmVhZGVyKXt2YXIgaz1uZXcgRmlsZVJlYWRlcjtrLm9ubG9hZGVuZD1mdW5jdGlvbigpe3ZhciBhPWsucmVzdWx0O2E9aj9hOmEucmVwbGFjZSgvXmRhdGE6W147XSo7LyxcImRhdGE6YXR0YWNobWVudC9maWxlO1wiKSxnP2cubG9jYXRpb24uaHJlZj1hOmxvY2F0aW9uPWEsZz1udWxsfSxrLnJlYWRBc0RhdGFVUkwoYil9ZWxzZXt2YXIgbD1mLlVSTHx8Zi53ZWJraXRVUkwsbT1sLmNyZWF0ZU9iamVjdFVSTChiKTtnP2cubG9jYXRpb249bTpsb2NhdGlvbi5ocmVmPW0sZz1udWxsLHNldFRpbWVvdXQoZnVuY3Rpb24oKXtsLnJldm9rZU9iamVjdFVSTChtKX0sNEU0KX19KTtmLnNhdmVBcz1nLnNhdmVBcz1nLFwidW5kZWZpbmVkXCIhPXR5cGVvZiBtb2R1bGUmJihtb2R1bGUuZXhwb3J0cz1nKX0pO1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1GaWxlU2F2ZXIubWluLmpzLm1hcCIsIi8qISBpZWVlNzU0LiBCU0QtMy1DbGF1c2UgTGljZW5zZS4gRmVyb3NzIEFib3VraGFkaWplaCA8aHR0cHM6Ly9mZXJvc3Mub3JnL29wZW5zb3VyY2U+ICovXG5leHBvcnRzLnJlYWQgPSBmdW5jdGlvbiAoYnVmZmVyLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbVxuICB2YXIgZUxlbiA9IChuQnl0ZXMgKiA4KSAtIG1MZW4gLSAxXG4gIHZhciBlTWF4ID0gKDEgPDwgZUxlbikgLSAxXG4gIHZhciBlQmlhcyA9IGVNYXggPj4gMVxuICB2YXIgbkJpdHMgPSAtN1xuICB2YXIgaSA9IGlzTEUgPyAobkJ5dGVzIC0gMSkgOiAwXG4gIHZhciBkID0gaXNMRSA/IC0xIDogMVxuICB2YXIgcyA9IGJ1ZmZlcltvZmZzZXQgKyBpXVxuXG4gIGkgKz0gZFxuXG4gIGUgPSBzICYgKCgxIDw8ICgtbkJpdHMpKSAtIDEpXG4gIHMgPj49ICgtbkJpdHMpXG4gIG5CaXRzICs9IGVMZW5cbiAgZm9yICg7IG5CaXRzID4gMDsgZSA9IChlICogMjU2KSArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KSB7fVxuXG4gIG0gPSBlICYgKCgxIDw8ICgtbkJpdHMpKSAtIDEpXG4gIGUgPj49ICgtbkJpdHMpXG4gIG5CaXRzICs9IG1MZW5cbiAgZm9yICg7IG5CaXRzID4gMDsgbSA9IChtICogMjU2KSArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KSB7fVxuXG4gIGlmIChlID09PSAwKSB7XG4gICAgZSA9IDEgLSBlQmlhc1xuICB9IGVsc2UgaWYgKGUgPT09IGVNYXgpIHtcbiAgICByZXR1cm4gbSA/IE5hTiA6ICgocyA/IC0xIDogMSkgKiBJbmZpbml0eSlcbiAgfSBlbHNlIHtcbiAgICBtID0gbSArIE1hdGgucG93KDIsIG1MZW4pXG4gICAgZSA9IGUgLSBlQmlhc1xuICB9XG4gIHJldHVybiAocyA/IC0xIDogMSkgKiBtICogTWF0aC5wb3coMiwgZSAtIG1MZW4pXG59XG5cbmV4cG9ydHMud3JpdGUgPSBmdW5jdGlvbiAoYnVmZmVyLCB2YWx1ZSwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG0sIGNcbiAgdmFyIGVMZW4gPSAobkJ5dGVzICogOCkgLSBtTGVuIC0gMVxuICB2YXIgZU1heCA9ICgxIDw8IGVMZW4pIC0gMVxuICB2YXIgZUJpYXMgPSBlTWF4ID4+IDFcbiAgdmFyIHJ0ID0gKG1MZW4gPT09IDIzID8gTWF0aC5wb3coMiwgLTI0KSAtIE1hdGgucG93KDIsIC03NykgOiAwKVxuICB2YXIgaSA9IGlzTEUgPyAwIDogKG5CeXRlcyAtIDEpXG4gIHZhciBkID0gaXNMRSA/IDEgOiAtMVxuICB2YXIgcyA9IHZhbHVlIDwgMCB8fCAodmFsdWUgPT09IDAgJiYgMSAvIHZhbHVlIDwgMCkgPyAxIDogMFxuXG4gIHZhbHVlID0gTWF0aC5hYnModmFsdWUpXG5cbiAgaWYgKGlzTmFOKHZhbHVlKSB8fCB2YWx1ZSA9PT0gSW5maW5pdHkpIHtcbiAgICBtID0gaXNOYU4odmFsdWUpID8gMSA6IDBcbiAgICBlID0gZU1heFxuICB9IGVsc2Uge1xuICAgIGUgPSBNYXRoLmZsb29yKE1hdGgubG9nKHZhbHVlKSAvIE1hdGguTE4yKVxuICAgIGlmICh2YWx1ZSAqIChjID0gTWF0aC5wb3coMiwgLWUpKSA8IDEpIHtcbiAgICAgIGUtLVxuICAgICAgYyAqPSAyXG4gICAgfVxuICAgIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgdmFsdWUgKz0gcnQgLyBjXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbHVlICs9IHJ0ICogTWF0aC5wb3coMiwgMSAtIGVCaWFzKVxuICAgIH1cbiAgICBpZiAodmFsdWUgKiBjID49IDIpIHtcbiAgICAgIGUrK1xuICAgICAgYyAvPSAyXG4gICAgfVxuXG4gICAgaWYgKGUgKyBlQmlhcyA+PSBlTWF4KSB7XG4gICAgICBtID0gMFxuICAgICAgZSA9IGVNYXhcbiAgICB9IGVsc2UgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICBtID0gKCh2YWx1ZSAqIGMpIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKVxuICAgICAgZSA9IGUgKyBlQmlhc1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gdmFsdWUgKiBNYXRoLnBvdygyLCBlQmlhcyAtIDEpICogTWF0aC5wb3coMiwgbUxlbilcbiAgICAgIGUgPSAwXG4gICAgfVxuICB9XG5cbiAgZm9yICg7IG1MZW4gPj0gODsgYnVmZmVyW29mZnNldCArIGldID0gbSAmIDB4ZmYsIGkgKz0gZCwgbSAvPSAyNTYsIG1MZW4gLT0gOCkge31cblxuICBlID0gKGUgPDwgbUxlbikgfCBtXG4gIGVMZW4gKz0gbUxlblxuICBmb3IgKDsgZUxlbiA+IDA7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IGUgJiAweGZmLCBpICs9IGQsIGUgLz0gMjU2LCBlTGVuIC09IDgpIHt9XG5cbiAgYnVmZmVyW29mZnNldCArIGkgLSBkXSB8PSBzICogMTI4XG59XG4iLCJleHBvcnQgY2xhc3MgVHdvUGFuZWxDb250YWluZXJ7XG5cbiAgICBzdGF0aWMgTUlOX1NQQUNFID0gNTA7XG5cbiAgICBwcml2YXRlIGxlZnRfY29udGFpbmVyIDogSFRNTEVsZW1lbnQ7XG4gICAgcHJpdmF0ZSBzZXBhcmF0b3IgOiBIVE1MRWxlbWVudDtcbiAgICBwcml2YXRlIHJpZ2h0X2NvbnRhaW5lciA6IEhUTUxFbGVtZW50O1xuICAgIHByaXZhdGUgaXNfbW92aW5nIDogYm9vbGVhbiA9IGZhbHNlO1xuXG4gICAgY29uc3RydWN0b3IobGVmdF9jb250YWluZXI6IEhUTUxFbGVtZW50LCBzZXBhcmF0b3I6IEhUTUxFbGVtZW50LCByaWdodF9jb250YWluZXI6IEhUTUxFbGVtZW50KXtcbiAgICAgICAgdGhpcy5sZWZ0X2NvbnRhaW5lciA9IGxlZnRfY29udGFpbmVyO1xuICAgICAgICB0aGlzLnNlcGFyYXRvciA9IHNlcGFyYXRvcjtcbiAgICAgICAgdGhpcy5yaWdodF9jb250YWluZXIgPSByaWdodF9jb250YWluZXI7XG5cbiAgICAgICAgdGhpcy5zZXBhcmF0b3IuYWRkRXZlbnRMaXN0ZW5lciggXCJtb3VzZWRvd25cIiwgKCkgPT4geyB0aGlzLmlzX21vdmluZyA9IHRydWU7IH0gKTtcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lciggXCJtb3VzZXVwXCIsICgpID0+IHsgdGhpcy5pc19tb3ZpbmcgPSBmYWxzZTsgfSApO1xuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCBcIm1vdXNlbW92ZVwiLCAoZXZ0KSA9PiB7IHRoaXMubW91c2VfbW92ZShldnQpOyB9ICk7XG4gICAgfVxuXG4gICAgbW91c2VfbW92ZShldnQ6IE1vdXNlRXZlbnQpe1xuICAgICAgICBpZiggIXRoaXMuaXNfbW92aW5nICl7IHJldHVybjsgfVxuXG4gICAgICAgIGxldCBuZXdQb3NYID0gTWF0aC5tYXgoIFR3b1BhbmVsQ29udGFpbmVyLk1JTl9TUEFDRSwgTWF0aC5taW4oZXZ0LmNsaWVudFgsIGRvY3VtZW50LmJvZHkuY2xpZW50V2lkdGggLSBUd29QYW5lbENvbnRhaW5lci5NSU5fU1BBQ0UpKTtcblxuICAgICAgICB0aGlzLnNldF9wYW5lbF9zaXplKG5ld1Bvc1gpO1xuICAgIH1cblxuICAgIHNldF9wYW5lbF9zaXplKGxlZnRfc2l6ZTogbnVtYmVyKXtcbiAgICAgICAgbGV0IHBlcmNlbnQgPSAobGVmdF9zaXplIC8gZG9jdW1lbnQuYm9keS5jbGllbnRXaWR0aCkgKiAxMDA7XG5cbiAgICAgICAgdGhpcy5zZXBhcmF0b3Iuc3R5bGUubGVmdCA9IHBlcmNlbnQgKyBcIiVcIjtcbiAgICAgICAgdGhpcy5sZWZ0X2NvbnRhaW5lci5zdHlsZS53aWR0aCA9IHBlcmNlbnQgKyBcIiVcIjtcbiAgICAgICAgdGhpcy5yaWdodF9jb250YWluZXIuc3R5bGUud2lkdGggPSBgY2FsYygkezEwMC1wZXJjZW50fSUgLSAke3RoaXMuc2VwYXJhdG9yLmNsaWVudFdpZHRofXB4KWA7XG4gICAgfVxuXG4gICAgaGlkZV9yaWdodF9wYW5lbCgpe1xuICAgICAgICB0aGlzLnJpZ2h0X2NvbnRhaW5lci5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XG4gICAgICAgIHRoaXMuc2VwYXJhdG9yLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcbiAgICAgICAgdGhpcy5sZWZ0X2NvbnRhaW5lci5zdHlsZS53aWR0aCA9IFwiMTAwJVwiO1xuICAgIH1cblxuICAgIHNob3dfcmlnaHRfcGFuZWwoKXtcbiAgICAgICAgdGhpcy5yaWdodF9jb250YWluZXIuc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjtcbiAgICAgICAgdGhpcy5zZXBhcmF0b3Iuc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjtcbiAgICAgICAgdGhpcy5zZXRfcGFuZWxfc2l6ZSg1MCk7XG4gICAgfVxufSIsImltcG9ydCB7IE9uQ29ubmVjdGlvbkNoYW5nZUNhbGxiYWNrIH0gZnJvbSBcIi4uL2NvbW1vblwiO1xuaW1wb3J0IHsgRGFwTGlua1dyYXBwZXIgfSBmcm9tIFwiLi4vZGFwbGlua1wiO1xuaW1wb3J0IHsgQWN0aW9uIH0gZnJvbSBcIi4vYWN0aW9uXCI7XG5cbmV4cG9ydCBjbGFzcyBBY3Rpb25Db25uZWN0aW9uIGltcGxlbWVudHMgQWN0aW9uIHtcblxuICAgIHByaXZhdGUgZGFwbGluazogRGFwTGlua1dyYXBwZXI7XG4gICAgcHJpdmF0ZSBpc19jb25uZWN0ZWQ6IGJvb2xlYW47XG5cbiAgICBjb25zdHJ1Y3RvcihkYXBsaW5rOiBEYXBMaW5rV3JhcHBlcil7XG4gICAgICAgIHRoaXMuZGFwbGluayA9IGRhcGxpbms7XG5cbiAgICAgICAgdGhpcy5pc19jb25uZWN0ZWQgPSBmYWxzZTtcbiAgICAgICAgZGFwbGluay5hZGRDb25uZWN0aW9uQ2hhbmdlTGlzdGVuZXIoIChpc19jb25uKSA9PiB0aGlzLm9uQ29ubmVjdGlvbkNoYW5nZShpc19jb25uKSApO1xuICAgIH1cblxuICAgIGFzeW5jIGNvbm5lY3QoKSA6IFByb21pc2U8Ym9vbGVhbj57XG4gICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmRhcGxpbmsuY29ubmVjdCgpO1xuICAgIH1cblxuICAgIGFzeW5jIGRpc2Nvbm5lY3QoKSA6IFByb21pc2U8Ym9vbGVhbj57XG4gICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmRhcGxpbmsuZGlzY29ubmVjdCgpO1xuICAgIH1cblxuICAgIGFzeW5jIHJ1bigpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICAgICAgaWYoIHRoaXMuaXNfY29ubmVjdGVkICl7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5kaXNjb25uZWN0KCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbm5lY3QoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgb25Db25uZWN0aW9uQ2hhbmdlKGlzX2Nvbm5lY3RlZDogYm9vbGVhbil7XG4gICAgICAgIHRoaXMuaXNfY29ubmVjdGVkID0gaXNfY29ubmVjdGVkO1xuICAgIH1cbn0iLCJpbXBvcnQgeyBHZXRTY3JpcHRDYWxsYmFjaywgdG9IZXhTdHJpbmcgfSBmcm9tIFwiLi4vY29tbW9uXCI7XG5pbXBvcnQgeyBGYXRGUyB9IGZyb20gXCIuLi9taWNyb0ZBVC9mYXRcIjtcblxuaW1wb3J0IHsgc2F2ZUFzIH0gZnJvbSBcImZpbGUtc2F2ZXJcIjtcbmltcG9ydCB7IERhcExpbmtXcmFwcGVyIH0gZnJvbSBcIi4uL2RhcGxpbmtcIjtcbmltcG9ydCB7IEFjdGlvbiB9IGZyb20gXCIuL2FjdGlvblwiO1xuaW1wb3J0IHsgU2VyaWFsT3V0cHV0IH0gZnJvbSBcIi4uL3NlcmlhbE91dHB1dFwiO1xuaW1wb3J0IHsgSUhleCB9IGZyb20gXCIuLi9paGV4X3V0aWxcIjtcbmltcG9ydCB7IFByb2dyZXNzRGlhbG9nLCBQcm9ncmVzc01lc3NhZ2VUeXBlIH0gZnJvbSBcIi4uL3Byb2dyZXNzX2RpYWxvZ1wiO1xuaW1wb3J0IHsgQWxlcnREaWFsb2csIEFsZXJ0RGlhbG9nSWNvbiB9IGZyb20gXCIuLi9hbGVydF9kaWFsb2dcIjtcblxuY2xhc3MgRmF0RmlsZSB7XG4gICAgbmFtZTogc3RyaW5nID0gXCJcIjtcbiAgICBleHRlbnNpb246IHN0cmluZyA9IFwiXCI7XG4gICAgaXNCaW5hcnk6IGJvb2xlYW4gPSBmYWxzZTtcbiAgICBwYXRoOiBzdHJpbmcgPSBcIlwiO1xufVxuXG5leHBvcnQgY2xhc3MgQWN0aW9uRmxhc2ggaW1wbGVtZW50cyBBY3Rpb24ge1xuXG4gICAgc3RhdGljIHJlYWRvbmx5IEZMQVNIX1NUQVJUX0FERFJFU1MgOiBudW1iZXIgPSAweDA4MDAwMDAwO1xuXG5cbiAgICBwcml2YXRlIGdldF9zY3JpcHRfY2I6IEdldFNjcmlwdENhbGxiYWNrO1xuICAgIHByaXZhdGUgZGFwbGluazogRGFwTGlua1dyYXBwZXI7XG4gICAgcHJpdmF0ZSBzZXJpYWxfb3VwdXQ6IFNlcmlhbE91dHB1dDtcbiAgICBwcml2YXRlIGRpYWxvZzogUHJvZ3Jlc3NEaWFsb2c7XG5cbiAgICBjb25zdHJ1Y3RvcihkYXBsaW5rOiBEYXBMaW5rV3JhcHBlciwgc2VyaWFsX291dHB1dDogU2VyaWFsT3V0cHV0LCBnZXRfc2NyaXB0OiBHZXRTY3JpcHRDYWxsYmFjayl7XG4gICAgICAgIHRoaXMuZ2V0X3NjcmlwdF9jYiA9IGdldF9zY3JpcHQ7XG4gICAgICAgIHRoaXMuZGFwbGluayA9IGRhcGxpbms7XG4gICAgICAgIHRoaXMuc2VyaWFsX291cHV0ID0gc2VyaWFsX291dHB1dDtcbiAgICAgICAgdGhpcy5kaWFsb2cgPSBuZXcgUHJvZ3Jlc3NEaWFsb2coKTtcbiAgICB9XG5cbiAgICBhc3luYyBydW4oKSA6IFByb21pc2U8Ym9vbGVhbj57XG4gICAgICAgIGlmKCB0aGlzLmRhcGxpbmsuaXNDb25uZWN0ZWQoKSApXG4gICAgICAgIHtcbiAgICAgICAgICAgIHRoaXMuZGlhbG9nLm9wZW4oKTtcbiAgICAgICAgICAgIHRoaXMuZGlhbG9nLmFkZEluZm8oXCJTZWFyY2hpbmcgZm9yIE1pY3JvUHl0aG9uLi4uXCIpO1xuXG4gICAgICAgICAgICBpZiggYXdhaXQgdGhpcy5kYXBsaW5rLmlzTWljcm9weXRob25PblRhcmdldCgpICl7XG4gICAgICAgICAgICAgICAgdGhpcy5kaWFsb2cuYWRkSW5mbyhcIk1pY3JvUHl0aG9uIHdhcyBmb3VuZC5cIik7XG4gICAgICAgICAgICAgICAgdGhpcy5kaWFsb2cuYWRkSW5mbyhcIkZsYXNoaW5nIHB5dGhvbiBzY3JpcHRzXCIpO1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuZGFwbGluay5mbGFzaE1haW4oICAgdGhpcy5nZXRfc2NyaXB0X2NiKCksIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKHByZzogbnVtYmVyKSA9PiB0aGlzLmRpYWxvZy5zZXRQcm9ncmVzc1ZhbHVlKHByZyoxMDApLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZGlhbG9nLmFkZEluZm8oXCJbRmxhc2hNYWluXSBFcnJvcjogXCIgKyBlcnIsIFByb2dyZXNzTWVzc2FnZVR5cGUuRVJST1IpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5kaWFsb2cuYWRkSW5mbyhcIlRyeSB1bnBsdWdnaW5nIGFuZCByZXBsdWdnaW5nIHlvdXIgYm9hcmQuLi5cIiwgUHJvZ3Jlc3NNZXNzYWdlVHlwZS5FUlJPUik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB0aGlzLnNlcmlhbF9vdXB1dC5jbGVhcigpO1xuICAgICAgICAgICAgICAgIHRoaXMuZGlhbG9nLnNob3dDbG9zZUJ1dHRvbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgICAgICB0aGlzLmRpYWxvZy5hZGRJbmZvKFwiTWljcm9QeXRob24gd2FzIG5vdCBmb3VuZC4uLiBSZWZsYXNoIGV2ZXJ5dGhpbmcuXCIsIFByb2dyZXNzTWVzc2FnZVR5cGUuV0FSTklORyk7XG4gICAgICAgICAgICAgICAgdGhpcy5kaWFsb2cuYWRkSW5mbyhcIkZsYXNoaW5nIE1pY3JvUHl0aG9uLi4uXCIpO1xuXG4gICAgICAgICAgICAgICAgbGV0IGJpbiA9IGF3YWl0IHRoaXMuZ2VuZXJhdGVCaW5hcnkoKTtcblxuICAgICAgICAgICAgICAgIGlmKCBiaW4gPT0gbnVsbCApe1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmRpYWxvZy5hZGRJbmZvKFwiRmFpbGVkIHRvIGdlbmVyYXRlIGJpbmFyeS4uLiBBYm9ydFwiKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgICAgICBsZXQgaGV4ID0gbmV3IElIZXgoQWN0aW9uRmxhc2guRkxBU0hfU1RBUlRfQUREUkVTUykucGFyc2VCaW4oYmluKTtcblxuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmRhcGxpbmsuZmxhc2goICAgbmV3IFRleHRFbmNvZGVyKCkuZW5jb2RlKGhleCksIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKHByZzogbnVtYmVyKSA9PiAgdGhpcy5kaWFsb2cuc2V0UHJvZ3Jlc3NWYWx1ZShwcmcqMTAwKSwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5kaWFsb2cuYWRkSW5mbyhcIltGbGFzaF0gRXJyb3I6IFwiICsgZXJyLCBQcm9ncmVzc01lc3NhZ2VUeXBlLkVSUk9SKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZGlhbG9nLmFkZEluZm8oXCJUcnkgdW5wbHVnZ2luZyBhbmQgcmVwbHVnZ2luZyB5b3VyIGJvYXJkLi4uXCIsIFByb2dyZXNzTWVzc2FnZVR5cGUuRVJST1IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHRoaXMuZGlhbG9nLnNob3dDbG9zZUJ1dHRvbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICBsZXQgYmluID0gYXdhaXQgdGhpcy5nZW5lcmF0ZUJpbmFyeSgpO1xuICAgICAgICAgICAgaWYoIGJpbiAhPSBudWxsICl7XG4gICAgICAgICAgICAgICAgc2F2ZUFzKCBuZXcgQmxvYiggW25ldyBJSGV4KEFjdGlvbkZsYXNoLkZMQVNIX1NUQVJUX0FERFJFU1MpLnBhcnNlQmluKGJpbildICksIFwiZmxhc2guaGV4XCIgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZ2VuZXJhdGVCaW5hcnkoKSA6IFByb21pc2U8VWludDhBcnJheSB8IG51bGw+e1xuICAgICAgICBsZXQgZmF0ID0gbmV3IEZhdEZTKFwiUFlCRkxBU0hcIik7XG4gICAgICAgIGxldCBiYXNlIDogQXJyYXlCdWZmZXI7XG5cbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgbGV0IGZpbGVzIDogRmF0RmlsZVtdID0gYXdhaXQgdGhpcy5yZWFkRmlsZUFzSlNPTihcImFzc2V0cy9mYXQuanNvblwiKTsgLy9KU09OLnBhcnNlKCBhd2FpdCB0aGlzLnJlYWRGaWxlQXNUZXh0KFwiYXNzZXRzL2ZhdC5qc29uXCIpKVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBmaWxlcy5mb3JFYWNoKCBhc3luYyAoZmlsZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGZpbGUpXG5cbiAgICAgICAgICAgICAgICBpZihmaWxlLmlzQmluYXJ5KVxuICAgICAgICAgICAgICAgICAgICBmYXQuYWRkQmluYXJ5RmlsZShmaWxlLm5hbWUsIGZpbGUuZXh0ZW5zaW9uLCBuZXcgVWludDhBcnJheSggYXdhaXQgdGhpcy5yZWFkRmlsZUFzQmluYXJ5KGZpbGUucGF0aCkpIClcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgIGZhdC5hZGRGaWxlKGZpbGUubmFtZSwgZmlsZS5leHRlbnNpb24sIGF3YWl0IHRoaXMucmVhZEZpbGVBc1RleHQoZmlsZS5wYXRoKSlcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBiYXNlID0gYXdhaXQgdGhpcy5yZWFkRmlsZUFzQmluYXJ5KFwiYXNzZXRzL21pY3JvcHl0aG9uX0w0NzVfdjEuMThfUEFEREVELmJpblwiKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaChlOiBhbnkpe1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIltHRU5FUkFURSBCSU5BUlldOiBcIiwgZSk7XG4gICAgICAgICAgICBuZXcgQWxlcnREaWFsb2coXCJGYXRhbCBlcnJvclwiLCBgQW4gZXJyb3Igb2NjdXJlZCBkdXJpbmcgdGhlIGltYWdlIGdlbmVyYXRpb246IDxici8+PGRpdiBjbGFzcz1cImNpdGF0aW9uLWVycm9yXCI+JHtlLm1lc3NhZ2V9PC9kaXY+PGJyLz5DaGVjayB5b3VyIGludGVybmV0IGNvbm5lY3Rpb24gb3IgcmVzdGFydCB5b3VyIGJyb3dzZXIuYCwgQWxlcnREaWFsb2dJY29uLkVSUk9SKS5vcGVuKCk7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGZhdC5hZGRGaWxlKFwiTUFJTlwiLCBcIlBZXCIsIHRoaXMuZ2V0X3NjcmlwdF9jYigpKTtcblxuICAgICAgICBsZXQgZmF0X3BhcnQgPSBmYXQuZ2VuZXJhdGVfYmluYXJ5KCk7XG5cbiAgICAgICAgbGV0IGJpbl9maWxlID0gbmV3IFVpbnQ4QXJyYXkoIGJhc2UuYnl0ZUxlbmd0aCArIGZhdF9wYXJ0Lmxlbmd0aCk7XG4gICAgICAgIGJpbl9maWxlLnNldChuZXcgVWludDhBcnJheShiYXNlKSwgMCk7XG4gICAgICAgIGJpbl9maWxlLnNldChuZXcgVWludDhBcnJheShmYXRfcGFydCksIGJhc2UuYnl0ZUxlbmd0aCk7XG5cbiAgICAgICAgY29uc29sZS5sb2coYEJpbmFyeSBzaXplIDogICR7YmluX2ZpbGUuYnl0ZUxlbmd0aH0gYnl0ZXNgKVxuXG4gICAgICAgIHJldHVybiBiaW5fZmlsZTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHJlYWRGaWxlQXNKU09OKGZpbGU6IHN0cmluZykgOiBQcm9taXNlPGFueT4ge1xuICAgICAgICBsZXQgcmVwID0gYXdhaXQgZmV0Y2goZmlsZSk7XG4gICAgICAgIHJldHVybiByZXAuanNvbigpO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgcmVhZEZpbGVBc1RleHQoZmlsZTogc3RyaW5nKSA6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgICAgIGxldCByZXAgPSBhd2FpdCBmZXRjaChmaWxlKTtcbiAgICAgICAgcmV0dXJuIHJlcC50ZXh0KCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyByZWFkRmlsZUFzQmluYXJ5KGZpbGU6IHN0cmluZykgOiBQcm9taXNlPEFycmF5QnVmZmVyPiB7XG4gICAgICAgIGxldCByZXAgPSBhd2FpdCBmZXRjaChmaWxlKTtcbiAgICAgICAgcmV0dXJuIHJlcC5hcnJheUJ1ZmZlcigpO1xuICAgIH1cbn0iLCJpbXBvcnQgeyBBY3Rpb24gfSBmcm9tIFwiLi9hY3Rpb25cIjtcblxuZXhwb3J0IGNsYXNzIEFjdGlvbkxvYWQgaW1wbGVtZW50cyBBY3Rpb24ge1xuXG4gICAgcHJpdmF0ZSBmaWxlUmVhZGVyIDogRmlsZVJlYWRlcjtcbiAgICBwcml2YXRlIGZpbGVfaW5wdXQgOiBIVE1MSW5wdXRFbGVtZW50O1xuXG4gICAgY29uc3RydWN0b3IoIG9uRmlsZVJlYWRlZDogKGRhdGE6IHN0cmluZykgPT4gdm9pZCl7XG5cbiAgICAgICAgdGhpcy5maWxlUmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcblxuICAgICAgICBsZXQgZCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgIGQuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xuICAgICAgICBkLnN0eWxlLndpZHRoID0gXCIwcHhcIjtcbiAgICAgICAgZC5zdHlsZS5oZWlnaHQgPSBcIjBweFwiO1xuICAgICAgICBkLnN0eWxlLm92ZXJmbG93ID0gXCJoaWRkZW5cIjtcblxuICAgICAgICB0aGlzLmZpbGVfaW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW5wdXRcIik7XG4gICAgICAgIHRoaXMuZmlsZV9pbnB1dC50eXBlID0gXCJmaWxlXCI7XG4gICAgICAgIHRoaXMuZmlsZV9pbnB1dC5hY2NlcHQgPSBcIi5weVwiO1xuXG4gICAgICAgIGQuYXBwZW5kKHRoaXMuZmlsZV9pbnB1dCk7XG5cbiAgICAgICAgdGhpcy5maWxlX2lucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJpbnB1dFwiLCAoKSA9PiB0aGlzLm9wZW5GaWxlKCkpO1xuXG4gICAgICAgIHRoaXMuZmlsZVJlYWRlci5vbmxvYWQgPSAoKSA9PiBvbkZpbGVSZWFkZWQodGhpcy5maWxlUmVhZGVyLnJlc3VsdCBhcyBzdHJpbmcpO1xuICAgICAgICB0aGlzLmZpbGVSZWFkZXIub25lcnJvciA9IChldnQpID0+IGNvbnNvbGUuZXJyb3IoXCJGYWlsZWQgdG8gcmVhZCBmaWxlLlwiLCBldnQpO1xuICAgIH1cblxuICAgIG9wZW5GaWxlKCl7XG4gICAgICAgIHRoaXMuZmlsZVJlYWRlci5yZWFkQXNUZXh0KCh0aGlzLmZpbGVfaW5wdXQuZmlsZXMgYXMgRmlsZUxpc3QpWzBdLCBcIlVURi04XCIpO1xuICAgIH1cblxuICAgIGFzeW5jIHJ1bigpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICAgICAgdGhpcy5maWxlX2lucHV0LmNsaWNrKCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbn0iLCJpbXBvcnQgeyBHZXRTY3JpcHRDYWxsYmFjayB9IGZyb20gXCIuLi9jb21tb25cIjtcbmltcG9ydCB7IERhcExpbmtXcmFwcGVyIH0gZnJvbSBcIi4uL2RhcGxpbmtcIjtcbmltcG9ydCB7IFByb2dyZXNzRGlhbG9nLCBQcm9ncmVzc01lc3NhZ2VUeXBlIH0gZnJvbSBcIi4uL3Byb2dyZXNzX2RpYWxvZ1wiO1xuaW1wb3J0IHsgQWN0aW9uIH0gZnJvbSBcIi4vYWN0aW9uXCI7XG5cbmV4cG9ydCBjbGFzcyBBY3Rpb25SdW4gaW1wbGVtZW50cyBBY3Rpb257XG5cbiAgICBwcml2YXRlIGRhcGxpbms6IERhcExpbmtXcmFwcGVyO1xuICAgIHByaXZhdGUgZ2V0U2NyaXB0X2NiOiBHZXRTY3JpcHRDYWxsYmFjaztcbiAgICBwcml2YXRlIGRpYWxvZzogUHJvZ3Jlc3NEaWFsb2c7XG5cbiAgICBjb25zdHJ1Y3RvcihkYXBsaW5rIDogRGFwTGlua1dyYXBwZXIsIGdldFNjcmlwdDogR2V0U2NyaXB0Q2FsbGJhY2spe1xuICAgICAgICB0aGlzLmRhcGxpbmsgPSBkYXBsaW5rO1xuICAgICAgICB0aGlzLmdldFNjcmlwdF9jYiA9IGdldFNjcmlwdDtcbiAgICAgICAgdGhpcy5kaWFsb2cgPSBuZXcgUHJvZ3Jlc3NEaWFsb2coXCJSdW5uaW5nLi4uXCIpO1xuICAgIH1cblxuICAgIGFzeW5jIHJ1bigpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICAgICAgbGV0IGlzX2Vycm9yID0gZmFsc2U7XG5cbiAgICAgICAgdGhpcy5kaWFsb2cub3BlbigpO1xuICAgICAgICB0aGlzLmRpYWxvZy5hZGRJbmZvKFwiU2VuZGluZyBzY3JpcHQgdG8gdGFyZ2V0XCIpO1xuXG4gICAgICAgIGF3YWl0IHRoaXMuZGFwbGluay5ydW5TY3JpcHQoICAgdGhpcy5nZXRTY3JpcHRfY2IoKSwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKHByZ3MpID0+IHRoaXMuZGlhbG9nLnNldFByb2dyZXNzVmFsdWUocHJncyAqIDEwMCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRpYWxvZy5hZGRJbmZvKGVyciwgUHJvZ3Jlc3NNZXNzYWdlVHlwZS5FUlJPUik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzX2Vycm9yID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9ICk7XG5cbiAgICAgICAgaWYoIGlzX2Vycm9yICl7XG4gICAgICAgICAgICB0aGlzLmRpYWxvZy5zaG93Q2xvc2VCdXR0b24oKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgdGhpcy5kaWFsb2cuY2xvc2UoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbn0iLCJpbXBvcnQgeyBzYXZlQXMgfSBmcm9tIFwiZmlsZS1zYXZlclwiO1xuaW1wb3J0IHsgR2V0U2NyaXB0Q2FsbGJhY2sgfSBmcm9tIFwiLi4vY29tbW9uXCI7XG5pbXBvcnQgeyBBY3Rpb24gfSBmcm9tIFwiLi9hY3Rpb25cIjtcblxuZXhwb3J0IGNsYXNzIEFjdGlvblNhdmUgaW1wbGVtZW50cyBBY3Rpb257XG5cbiAgICBwcml2YXRlIGNiX2dldFNjcmlwdCA6IEdldFNjcmlwdENhbGxiYWNrO1xuXG4gICAgY29uc3RydWN0b3IoZ2V0U2NyaXB0OiBHZXRTY3JpcHRDYWxsYmFjayl7XG4gICAgICAgIHRoaXMuY2JfZ2V0U2NyaXB0ID0gZ2V0U2NyaXB0O1xuICAgIH1cblxuICAgIHNhdmVGaWxlKGZpbGVuYW1lOiBzdHJpbmcpe1xuICAgICAgICB2YXIgYmxvYiA9IG5ldyBCbG9iKFt0aGlzLmNiX2dldFNjcmlwdCgpXSwge3R5cGU6IFwidGV4dC9wbGFpbjtjaGFyc2V0PXV0Zi04XCJ9KTtcbiAgICAgICAgc2F2ZUFzKGJsb2IsIGZpbGVuYW1lKTtcbiAgICB9XG5cbiAgICBhc3luYyBydW4oKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgICAgIHRoaXMuc2F2ZUZpbGUoXCJtYWluLnB5XCIpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG59IiwiaW1wb3J0IHsgQWN0aW9uIH0gZnJvbSBcIi4vYWN0aW9uXCI7XG5cbmV4cG9ydCBjbGFzcyBBY3Rpb25TZXR0aW5ncyBpbXBsZW1lbnRzIEFjdGlvbiB7XG4gICAgY29uc3RydWN0b3IoKXtcblxuICAgIH1cblxuICAgIGFzeW5jIHJ1bigpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxufSIsImV4cG9ydCBlbnVtIEFsZXJ0RGlhbG9nSWNvbntcbiAgICBOT05FID0gXCJhbGVydC1kaWFsb2ctaWNvbi1ub25lXCIsXG4gICAgSU5GTyA9IFwiYWxlcnQtZGlhbG9nLWljb24taW5mb1wiLFxuICAgIFdBUk5JTkcgPSBcImFsZXJ0LWRpYWxvZy1pY29uLXdhcm5pbmdcIixcbiAgICBFUlJPUiA9IFwiYWxlcnQtZGlhbG9nLWljb24tZXJyb3JcIlxufVxuXG5leHBvcnQgY2xhc3MgQWxlcnREaWFsb2cge1xuXG4gICAgcHJpdmF0ZSBkaWFsb2c6IEhUTUxFbGVtZW50O1xuXG4gICAgY29uc3RydWN0b3IodGl0bGU/OiBzdHJpbmcsIHRleHQ/OiBzdHJpbmcsIGljb246IEFsZXJ0RGlhbG9nSWNvbiA9IEFsZXJ0RGlhbG9nSWNvbi5OT05FKXtcblxuICAgICAgICB0aGlzLmRpYWxvZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgIHRoaXMuZGlhbG9nLmNsYXNzTGlzdC5hZGQoXCJhbGVydC1kaWFsb2dcIik7XG4gICAgICAgIHRoaXMuZGlhbG9nLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcblxuICAgICAgICBsZXQgY29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgY29udGFpbmVyLmNsYXNzTGlzdC5hZGQoXCJhbGVydC1kaWFsb2ctY29udGFpbmVyXCIpXG5cbiAgICAgICAgbGV0IHRpdGxlX2VsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgdGl0bGVfZWwuY2xhc3NMaXN0LmFkZChcImFsZXJ0LWRpYWxvZy10aXRsZVwiLCBpY29uKTtcbiAgICAgICAgdGl0bGVfZWwuaW5uZXJUZXh0ID0gdGl0bGUgfHwgXCJcIjtcblxuICAgICAgICBsZXQgY29udGVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgIGNvbnRlbnQuY2xhc3NMaXN0LmFkZChcImFsZXJ0LWRpYWxvZy1jb250ZW50XCIpO1xuXG4gICAgICAgIGxldCB0ZXh0X2VsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInBcIik7XG4gICAgICAgIHRleHRfZWwuaW5uZXJIVE1MID0gdGV4dCB8fCBcIlwiO1xuXG4gICAgICAgIGxldCBjbG9zZV9idXR0b24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYnV0dG9uXCIpO1xuICAgICAgICBjbG9zZV9idXR0b24uY2xhc3NMaXN0LmFkZChcImFsZXJ0LWRpYWxvZy1jbG9zZS1idXR0b25cIik7XG4gICAgICAgIGNsb3NlX2J1dHRvbi5pbm5lclRleHQgPSBcIkNsb3NlXCI7XG4gICAgICAgIGNsb3NlX2J1dHRvbi5hZGRFdmVudExpc3RlbmVyKCBcImNsaWNrXCIsICgpID0+IHRoaXMuY2xvc2UoKSApO1xuXG4gICAgICAgIGNvbnRlbnQuYXBwZW5kKHRleHRfZWwpO1xuICAgICAgICBjb250ZW50LmFwcGVuZChjbG9zZV9idXR0b24pO1xuXG4gICAgICAgIGNvbnRhaW5lci5hcHBlbmQodGl0bGVfZWwpO1xuICAgICAgICBjb250YWluZXIuYXBwZW5kKGNvbnRlbnQpO1xuXG4gICAgICAgIHRoaXMuZGlhbG9nLmFwcGVuZChjb250YWluZXIpO1xuXG4gICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kKHRoaXMuZGlhbG9nKTtcbiAgICB9XG5cbiAgICBvcGVuKHRpdGxlPzogc3RyaW5nLCB0ZXh0Pzogc3RyaW5nLCBpY29uPzogQWxlcnREaWFsb2dJY29uKXtcbiAgICAgICAgaWYoIHRpdGxlICl7XG4gICAgICAgICAgICAodGhpcy5kaWFsb2cucXVlcnlTZWxlY3RvcihcIi5hbGVydC1kaWFsb2ctdGl0bGVcIikgYXMgSFRNTEVsZW1lbnQpLmlubmVySFRNTCA9IHRpdGxlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYoIHRleHQgKXtcbiAgICAgICAgICAgICh0aGlzLmRpYWxvZy5xdWVyeVNlbGVjdG9yKFwiLmFsZXJ0LWRpYWxvZy1jb250ZW50IHBcIikgYXMgSFRNTEVsZW1lbnQpLmlubmVySFRNTCA9IHRleHQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiggaWNvbiApe1xuICAgICAgICAgICAgbGV0IHRpdGxlX2VsID0gdGhpcy5kaWFsb2cucXVlcnlTZWxlY3RvcihcIi5hbGVydC1kaWFsb2ctdGl0bGVcIikgYXMgSFRNTEVsZW1lbnQ7XG4gICAgICAgICAgICB0aXRsZV9lbC5jbGFzc0xpc3QucmVtb3ZlKEFsZXJ0RGlhbG9nSWNvbi5OT05FLCBBbGVydERpYWxvZ0ljb24uSU5GTywgQWxlcnREaWFsb2dJY29uLldBUk5JTkcsIEFsZXJ0RGlhbG9nSWNvbi5FUlJPUik7XG4gICAgICAgICAgICB0aXRsZV9lbC5jbGFzc0xpc3QuYWRkKGljb24pO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5kaWFsb2cuc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjtcbiAgICB9XG5cbiAgICBjbG9zZSgpe1xuICAgICAgICB0aGlzLmRpYWxvZy5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XG4gICAgfVxuXG59OyIsImltcG9ydCB7IEJ1dHRvbiB9IGZyb20gXCIuL2J1dHRvbi9idXR0b25cIjtcbmltcG9ydCB7IEFjdGlvbkNvbm5lY3Rpb24gfSBmcm9tIFwiLi9hY3Rpb25zL2FjdGlvbl9jb25uZWN0aW9uXCI7XG5pbXBvcnQgeyBEYXBMaW5rV3JhcHBlciB9IGZyb20gXCIuL2RhcGxpbmtcIjtcbmltcG9ydCB7IEFjdGlvblJ1biB9IGZyb20gXCIuL2FjdGlvbnMvYWN0aW9uX3J1blwiO1xuaW1wb3J0IHsgU2VyaWFsT3V0cHV0IH0gZnJvbSBcIi4vc2VyaWFsT3V0cHV0XCI7XG5pbXBvcnQgeyBUd29QYW5lbENvbnRhaW5lciB9IGZyb20gXCIuL1R3b1BhbmVsQ29udGFpbmVyXCI7XG5pbXBvcnQgeyBBY3Rpb25TYXZlIH0gZnJvbSBcIi4vYWN0aW9ucy9hY3Rpb25fc2F2ZVwiO1xuaW1wb3J0IHsgQWN0aW9uTG9hZCB9IGZyb20gXCIuL2FjdGlvbnMvYWN0aW9uX2xvYWRcIjtcbmltcG9ydCB7IEFjdGlvbkZsYXNoIH0gZnJvbSBcIi4vYWN0aW9ucy9hY3Rpb25fZmxhc2hcIjtcbmltcG9ydCB7IFRvZ2dsZUJ1dHRvbiB9IGZyb20gXCIuL2J1dHRvbi9idXR0b25fdG9nZ2xlXCI7XG5pbXBvcnQgeyBBY3Rpb25TZXR0aW5ncyB9IGZyb20gXCIuL2FjdGlvbnMvYWN0aW9uX3NldHRpbmdzXCI7XG5pbXBvcnQgeyBCdXR0b25TcGFjZXIgfSBmcm9tIFwiLi9idXR0b24vYnV0dG9uU3BhY2VyXCI7XG5pbXBvcnQgeyBQbGFjZUhvbGRlckJ1dHRvbiB9IGZyb20gXCIuL2J1dHRvbi9idXR0b25fcGxhY2Vob2xkZXJcIjtcbmltcG9ydCB7IEdldFNjcmlwdENhbGxiYWNrLCBTZXRTY3JpcHRDYWxsYmFjayB9IGZyb20gXCIuL2NvbW1vblwiO1xuaW1wb3J0IHsgQnV0dG9uRHJvcGRvd24sIEJ1dHRvbkRyb3Bkb3duRWxlbWVudCB9IGZyb20gXCIuL2J1dHRvbi9idXR0b25fZHJvcGRvd25cIjtcbmltcG9ydCB7IEFsZXJ0RGlhbG9nLCBBbGVydERpYWxvZ0ljb24gfSBmcm9tIFwiLi9hbGVydF9kaWFsb2dcIjtcblxuZXhwb3J0IGNsYXNzIEFwcGxpY2F0aW9ue1xuXG4gICAgcHJpdmF0ZSB0b3BfY29udGFpbmVyIDogSFRNTEVsZW1lbnQgPSA8SFRNTEVsZW1lbnQ+ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ0b3BfY29udGFpbmVyXCIpO1xuICAgIHByaXZhdGUgbGVmdF9jb250YWluZXIgOiBIVE1MRWxlbWVudCA9IDxIVE1MRWxlbWVudD5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImxlZnRfY29udGFpbmVyXCIpO1xuICAgIHByaXZhdGUgcmlnaHRfY29udGFpbmVyIDogSFRNTEVsZW1lbnQgPSA8SFRNTEVsZW1lbnQ+ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyaWdodF9jb250YWluZXJcIik7XG4gICAgcHJpdmF0ZSBzcGFjZXJfY29udGFpbmVyIDogSFRNTEVsZW1lbnQgPSA8SFRNTEVsZW1lbnQ+ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzcGFjZXJfY29udGFpbmVyXCIpO1xuXG5cbiAgICBwcml2YXRlIGJ1dHRvbl9ydW4/IDogQnV0dG9uO1xuICAgIHByaXZhdGUgYnV0dG9uX2Nvbm4/OiBUb2dnbGVCdXR0b247XG5cbiAgICBwcml2YXRlIGRhcExpbmtXcmFwcGVyIDogRGFwTGlua1dyYXBwZXI7XG4gICAgcHJpdmF0ZSBzZXJpYWxfb3V0cHV0IDogU2VyaWFsT3V0cHV0O1xuXG5cblxuICAgIGNvbnN0cnVjdG9yKGdldF9zY3JpcHQ6IEdldFNjcmlwdENhbGxiYWNrLCBzZXRfc2NyaXB0OiBTZXRTY3JpcHRDYWxsYmFjayl7XG4gICAgICAgIHRoaXMuZGFwTGlua1dyYXBwZXIgPSBuZXcgRGFwTGlua1dyYXBwZXIoKTtcblxuICAgICAgICB0aGlzLnNlcmlhbF9vdXRwdXQgPSBuZXcgU2VyaWFsT3V0cHV0KHRoaXMucmlnaHRfY29udGFpbmVyKTtcbiAgICAgICAgdGhpcy5kYXBMaW5rV3JhcHBlci5hZGRSZWljZWl2ZWREYXRhTGlzdGVuZXIoIChkYXRhKSA9PiB0aGlzLnNlcmlhbF9vdXRwdXQud3JpdGUoZGF0YSkpO1xuICAgICAgICB0aGlzLmRhcExpbmtXcmFwcGVyLmFkZENvbm5lY3Rpb25DaGFuZ2VMaXN0ZW5lciggaXNfY29ubmVjdGVkID0+IHRoaXMub25Db25uZWN0aW9uQ2hhbmdlKGlzX2Nvbm5lY3RlZCkpO1xuXG5cbiAgICAgICAgdGhpcy50b3BNZW51KGdldF9zY3JpcHQsIHNldF9zY3JpcHQpO1xuXG5cbiAgICAgICAgdGhpcy5idXR0b25fcnVuPy5kaXNhYmxlKCk7XG5cbiAgICAgICAgaWYoIHRoaXMuZGFwTGlua1dyYXBwZXIuaXNXZWJVU0JBdmFpbGFibGUoKSApe1xuICAgICAgICAgICAgbmV3IFR3b1BhbmVsQ29udGFpbmVyKHRoaXMubGVmdF9jb250YWluZXIsIHRoaXMuc3BhY2VyX2NvbnRhaW5lciwgdGhpcy5yaWdodF9jb250YWluZXIpLnNldF9wYW5lbF9zaXplKGRvY3VtZW50LmJvZHkuY2xpZW50V2lkdGggKiAwLjY2KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgbmV3IFR3b1BhbmVsQ29udGFpbmVyKHRoaXMubGVmdF9jb250YWluZXIsIHRoaXMuc3BhY2VyX2NvbnRhaW5lciwgdGhpcy5yaWdodF9jb250YWluZXIpLmhpZGVfcmlnaHRfcGFuZWwoKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG4gICAgcHJpdmF0ZSB0b3BNZW51KGdldF9zY3JpcHQ6IEdldFNjcmlwdENhbGxiYWNrLCBzZXRfc2NyaXB0OiBTZXRTY3JpcHRDYWxsYmFjayl7XG5cbiAgICAgICAgbGV0IGFjdF9jb25uZWN0aW9uID0gIG5ldyBBY3Rpb25Db25uZWN0aW9uKHRoaXMuZGFwTGlua1dyYXBwZXIpO1xuICAgICAgICBsZXQgYWN0X3J1biA9IG5ldyBBY3Rpb25SdW4odGhpcy5kYXBMaW5rV3JhcHBlciwgZ2V0X3NjcmlwdCk7XG4gICAgICAgIGxldCBhY3RfZmxhc2ggPSBuZXcgQWN0aW9uRmxhc2godGhpcy5kYXBMaW5rV3JhcHBlciwgdGhpcy5zZXJpYWxfb3V0cHV0LCBnZXRfc2NyaXB0KTtcbiAgICAgICAgbGV0IGFjdF9sb2FkID0gbmV3IEFjdGlvbkxvYWQoc2V0X3NjcmlwdCk7XG4gICAgICAgIGxldCBhY3Rfc2F2ZSA9IG5ldyBBY3Rpb25TYXZlKGdldF9zY3JpcHQpO1xuICAgICAgICBsZXQgYWN0X3NldHRpbmdzID0gbmV3IEFjdGlvblNldHRpbmdzKCk7XG5cbiAgICAgICAgaWYoIHRoaXMuZGFwTGlua1dyYXBwZXIuaXNXZWJVU0JBdmFpbGFibGUoKSApe1xuICAgICAgICAgICAgdGhpcy5idXR0b25fY29ubiA9IG5ldyBUb2dnbGVCdXR0b24odGhpcy50b3BfY29udGFpbmVyLCBcImltZy9kaXNjb25uZWN0LnBuZ1wiLCBcImltZy9jb25uZWN0LnBuZ1wiLCBhY3RfY29ubmVjdGlvbiwgXCJDbGljayB0byBjb25uZWN0XCIsIFwiQ2xpY2sgdG8gZGlzY29ubmVjdFwiKTtcbiAgICAgICAgICAgIHRoaXMuYnV0dG9uX3J1biA9IG5ldyBCdXR0b24odGhpcy50b3BfY29udGFpbmVyLCBcImltZy9wbGF5LnBuZ1wiLCBhY3RfcnVuLCBcIlJ1biBzY3JpcHQgb24gdGFyZ2V0XCIpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICBuZXcgUGxhY2VIb2xkZXJCdXR0b24odGhpcy50b3BfY29udGFpbmVyKTsgIC8vIENvbm5lY3Rpb24gcGxhY2Vob2xkZXJcbiAgICAgICAgICAgIG5ldyBQbGFjZUhvbGRlckJ1dHRvbih0aGlzLnRvcF9jb250YWluZXIpOyAgLy8gUGxheSBwbGFjZWhvbGRlclxuICAgICAgICB9XG4gICAgICAgIG5ldyBCdXR0b24odGhpcy50b3BfY29udGFpbmVyLCBcImltZy9mbGFzaC5wbmdcIiwgYWN0X2ZsYXNoLCBcIkZsYXNoIG9yIERvd25sb2FkXCIpO1xuXG4gICAgICAgIG5ldyBCdXR0b25TcGFjZXIodGhpcy50b3BfY29udGFpbmVyKTtcblxuICAgICAgICBuZXcgQnV0dG9uKHRoaXMudG9wX2NvbnRhaW5lciwgXCJpbWcvdXBsb2FkLnBuZ1wiLCBhY3RfbG9hZCwgXCJMb2FkIHB5dGhvbiBmaWxlXCIpO1xuICAgICAgICBuZXcgQnV0dG9uKHRoaXMudG9wX2NvbnRhaW5lciwgXCJpbWcvZG93bmxvYWQucG5nXCIsIGFjdF9zYXZlLCBcIlNhdmUgcHl0aG9uIGZpbGVcIik7XG5cbiAgICAgICAgbmV3IEJ1dHRvblNwYWNlcih0aGlzLnRvcF9jb250YWluZXIpO1xuXG4gICAgICAgIG5ldyBCdXR0b25Ecm9wZG93bih0aGlzLnRvcF9jb250YWluZXIsIFwiaW1nL3NldHRpbmdzLnBuZ1wiLCBbIG5ldyBCdXR0b25Ecm9wZG93bkVsZW1lbnQoXCJDbGVhciBjb25zb2xlXCIsICgpID0+IHt0aGlzLnNlcmlhbF9vdXRwdXQuY2xlYXIoKX0sIFwiZjEyMFwiKSwgbmV3IEJ1dHRvbkRyb3Bkb3duRWxlbWVudChcIkZvcmNlIHRhc2sgc3RvcFwiLCAoKSA9PiB7IHRoaXMuZGFwTGlua1dyYXBwZXIuc2VuZEtleWJvYXJkSW50ZXJydXB0KCk7IH0sIFwiZjU0Y1wiKSBdLCBcIlNldHRpbmdzXCIpO1xuICAgIH1cblxuICAgIHByaXZhdGUgb25Db25uZWN0aW9uQ2hhbmdlKGlzX2Nvbm5lY3RlZDogYm9vbGVhbil7XG4gICAgICAgIGlmKGlzX2Nvbm5lY3RlZCl7XG4gICAgICAgICAgICB0aGlzLmJ1dHRvbl9ydW4/LmVuYWJsZSgpO1xuICAgICAgICAgICAgdGhpcy5idXR0b25fY29ubj8uc2V0QnV0dG9uU3RhdGUoZmFsc2UpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICB0aGlzLmJ1dHRvbl9ydW4/LmRpc2FibGUoKTtcbiAgICAgICAgICAgIHRoaXMuYnV0dG9uX2Nvbm4/LnNldEJ1dHRvblN0YXRlKHRydWUpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vLyBAdHMtaWdub3JlXG53aW5kb3dbXCJBcHBsaWNhdGlvblwiXSA9IEFwcGxpY2F0aW9uO1xuLy8gQHRzLWlnbm9yZVxud2luZG93W1wiQWxlcnREaWFsb2dcIl0gPSBBbGVydERpYWxvZztcbi8vIEB0cy1pZ25vcmVcbndpbmRvd1tcIkFsZXJ0RGlhbG9nSWNvblwiXSA9IEFsZXJ0RGlhbG9nSWNvbjsiLCJpbXBvcnQgeyBBY3Rpb24gfSBmcm9tIFwiLi4vYWN0aW9ucy9hY3Rpb25cIjtcblxuZXhwb3J0IGNsYXNzIEJ1dHRvbntcblxuICAgIHByb3RlY3RlZCBpc19lbmFibGU6IGJvb2xlYW47XG4gICAgcHJvdGVjdGVkIGFjdGlvbjogQWN0aW9uO1xuICAgIHByb3RlY3RlZCBidXR0b246IEhUTUxEaXZFbGVtZW50O1xuICAgIHByb3RlY3RlZCBpY29uOiBIVE1MSW1hZ2VFbGVtZW50O1xuXG4gICAgY29uc3RydWN0b3IocGFyZW50OiBIVE1MRWxlbWVudCwgaWNvbjogc3RyaW5nLCBhY3Rpb246IEFjdGlvbiwgdGl0bGU6IHN0cmluZyA9IFwiXCIpe1xuICAgICAgICB0aGlzLmJ1dHRvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgIHRoaXMuaWNvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbWdcIik7XG5cbiAgICAgICAgdGhpcy5idXR0b24uY2xhc3NMaXN0LmFkZChcIm1lbnVfYnV0dG9uXCIpXG4gICAgICAgIHRoaXMuYnV0dG9uLnRpdGxlID0gdGl0bGU7XG5cbiAgICAgICAgdGhpcy5hY3Rpb24gPSBhY3Rpb247XG4gICAgICAgIHRoaXMuaXNfZW5hYmxlID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5pY29uLnNyYyA9IGljb247XG4gICAgICAgIHRoaXMuYnV0dG9uLmFwcGVuZCh0aGlzLmljb24pO1xuICAgICAgICBwYXJlbnQuYXBwZW5kKHRoaXMuYnV0dG9uKTtcblxuICAgICAgICB0aGlzLmJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5vbkJ1dHRvbkNsaWNrKCkpO1xuICAgIH1cblxuICAgIGVuYWJsZSgpe1xuICAgICAgICB0aGlzLmJ1dHRvbi5jbGFzc0xpc3QucmVtb3ZlKFwiZGlzYWJsZVwiKTtcbiAgICB9XG5cbiAgICBkaXNhYmxlKCl7XG4gICAgICAgIHRoaXMuYnV0dG9uLmNsYXNzTGlzdC5hZGQoXCJkaXNhYmxlXCIpO1xuICAgIH1cblxuICAgIGlzRW5hYmxlKCl7XG4gICAgICAgIHJldHVybiB0aGlzLmlzX2VuYWJsZTtcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgYXN5bmMgb25CdXR0b25DbGljaygpe1xuICAgICAgICBpZiggdGhpcy5pc19lbmFibGUgKXtcbiAgICAgICAgICAgIHRoaXMuYWN0aW9uLnJ1bigpO1xuICAgICAgICB9XG4gICAgfVxufSIsIlxuZXhwb3J0IGNsYXNzIEJ1dHRvblNwYWNlcntcbiAgICBjb25zdHJ1Y3RvcihwYXJlbnQ6IEhUTUxFbGVtZW50KXtcbiAgICAgICAgbGV0IGJ1dHRvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgIGJ1dHRvbi5jbGFzc0xpc3QuYWRkKFwibWVudV9idXR0b25fc3BhY2VcIilcbiAgICAgICAgcGFyZW50LmFwcGVuZChidXR0b24pO1xuICAgIH1cbn0iLCJpbXBvcnQgeyBBY3Rpb24gfSBmcm9tIFwiLi4vYWN0aW9ucy9hY3Rpb25cIjtcbmltcG9ydCB7IEFjdGlvbkNvbm5lY3Rpb24gfSBmcm9tIFwiLi4vYWN0aW9ucy9hY3Rpb25fY29ubmVjdGlvblwiO1xuaW1wb3J0IHsgQnV0dG9uIH0gZnJvbSBcIi4vYnV0dG9uXCI7XG5cbmV4cG9ydCBjbGFzcyBCdXR0b25Ecm9wZG93bkVsZW1lbnQge1xuICAgIC8qKlxuICAgICAqIFRoZSBoZXhhZGVjaW1hbCBmb250IGF3ZXNvbWUgaWNvblxuICAgICAqL1xuICAgIGljb24/OiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBUZXh0IHNob3cgaW4gZHJvcGRvd25cbiAgICAgKi9cbiAgICBuYW1lOiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBGdW5jdGlvbiB0byBleGVjdXRlIG9uIGNsaWNrXG4gICAgICovXG4gICAgZmN0OiAoKSA9PiB2b2lkO1xuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIG5hbWUgVGV4dCBzaG93IGluIGRyb3Bkb3duXG4gICAgICogQHBhcmFtIGZjdCBGdW5jdGlvbiB0byBleGVjdXRlIG9uIGNsaWNrXG4gICAgICogQHBhcmFtIGljb24gW29wdGlvbm5hbF0gVGhlIGhleGFkZWNpbWFsIGZvbnQgYXdlc29tZSBpY29uXG4gICAgICovXG4gICAgY29uc3RydWN0b3IobmFtZTogc3RyaW5nLCBmY3Q6ICgpID0+IHZvaWQsIGljb24/OiBzdHJpbmcpe1xuICAgICAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgICAgICB0aGlzLmZjdCA9IGZjdDtcbiAgICAgICAgdGhpcy5pY29uID0gaWNvbjtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBCdXR0b25Ecm9wZG93biBleHRlbmRzIEJ1dHRvbiB7XG4gICAgcHJpdmF0ZSBkcm9wZG93bjogSFRNTERpdkVsZW1lbnQ7XG5cbiAgICBjb25zdHJ1Y3RvcihwYXJlbnQ6IEhUTUxFbGVtZW50LCBpY29uOiBzdHJpbmcsIGRyb3Bkb3duRWxlbWVudHM6IEJ1dHRvbkRyb3Bkb3duRWxlbWVudFtdLCB0aXRsZTogc3RyaW5nID0gXCJcIil7XG4gICAgICAgIGxldCBhY3Rpb246IEFjdGlvbiA9IHsgXG4gICAgICAgICAgICBydW46IGFzeW5jICgpID0+IHRoaXMuaW50ZXJuYWxBY3Rpb24oKSBcbiAgICAgICAgfTtcblxuICAgICAgICBzdXBlcihwYXJlbnQsIGljb24sIGFjdGlvbiwgdGl0bGUpO1xuXG4gICAgICAgIGxldCBidXR0b25fYm91bmRzID0gdGhpcy5idXR0b24uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICAgICAgdGhpcy5kcm9wZG93biA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgIHRoaXMuZHJvcGRvd24uY2xhc3NMaXN0LmFkZChcIm1lbnVfYnV0dG9uX2Ryb3Bkb3duXCIpO1xuICAgICAgICB0aGlzLmRyb3Bkb3duLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcbiAgICAgICAgdGhpcy5kcm9wZG93bi5zdHlsZS50b3AgPSBidXR0b25fYm91bmRzLnRvcCArIDQgKyBidXR0b25fYm91bmRzLmhlaWdodCArIFwicHhcIjtcbiAgICAgICAgdGhpcy5kcm9wZG93bi5zdHlsZS5sZWZ0ID0gYnV0dG9uX2JvdW5kcy5sZWZ0ICsgXCJweFwiO1xuXG4gICAgICAgIHRoaXMucG9wdWxhdGVEb3JwZG93bihkcm9wZG93bkVsZW1lbnRzKTtcblxuICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZCh0aGlzLmRyb3Bkb3duKTtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsIChldnQpID0+IHRoaXMuY2xpY2tfb3V0c2lkZShldnQpICk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBpbnRlcm5hbEFjdGlvbigpIHtcblxuICAgICAgICBpZiggdGhpcy5kcm9wZG93bi5zdHlsZS5kaXNwbGF5ID09IFwibm9uZVwiICl7XG4gICAgICAgICAgICB0aGlzLmRyb3Bkb3duLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIHRoaXMuZHJvcGRvd24uc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBjbGlja19vdXRzaWRlKGV2ZW50OiBhbnkpe1xuXG4gICAgICAgIGlmKCAoZXZlbnQucGF0aCBhcyBbXSkuZmluZEluZGV4KCAodmFsdWUpID0+IHZhbHVlID09IHRoaXMuYnV0dG9uIHx8IHZhbHVlID09IHRoaXMuZHJvcGRvd24gKSA9PSAtMSApe1xuICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBwb3B1bGF0ZURvcnBkb3duKGl0ZW1zOiBCdXR0b25Ecm9wZG93bkVsZW1lbnRbXSl7XG4gICAgICAgIGl0ZW1zLmZvckVhY2goIChpdGVtKSA9PiB7XG5cbiAgICAgICAgICAgIGxldCBlbnRyeSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJwXCIpO1xuXG4gICAgICAgICAgICBpZiggaXRlbS5pY29uICl7XG4gICAgICAgICAgICAgICAgZW50cnkuaW5uZXJIVE1MID0gYDxzcGFuIGNsYXNzPVwiZmFcIj4mI3gke2l0ZW0uaWNvbn07PC9zcGFuPmBcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZW50cnkuaW5uZXJIVE1MICs9IGl0ZW0ubmFtZTtcblxuICAgICAgICAgICAgZW50cnkuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHsgdGhpcy5jbG9zZSgpOyBpdGVtLmZjdCgpOyAgfSApO1xuXG4gICAgICAgICAgICB0aGlzLmRyb3Bkb3duLmFwcGVuZChlbnRyeSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgY2xvc2UoKXtcbiAgICAgICAgdGhpcy5kcm9wZG93bi5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XG4gICAgfVxufTsiLCJpbXBvcnQgeyBCdXR0b24gfSBmcm9tIFwiLi9idXR0b25cIlxuXG5leHBvcnQgY2xhc3MgUGxhY2VIb2xkZXJCdXR0b24gZXh0ZW5kcyBCdXR0b257XG5cbiAgICBjb25zdHJ1Y3RvcihwYXJlbnQ6IEhUTUxFbGVtZW50KXtcbiAgICAgICAgc3VwZXIocGFyZW50LCBcIlwiLCB7cnVuOiBhc3luYyAoKSA9PiB0cnVlfSk7XG4gICAgICAgIHRoaXMuYnV0dG9uLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcbiAgICAgICAgdGhpcy5idXR0b24uc3R5bGUud2lkdGggPSBcIjBcIjtcbiAgICAgICAgdGhpcy5idXR0b24uc3R5bGUuaGVpZ2h0ID0gXCIwXCI7XG4gICAgfVxufSIsImltcG9ydCB7IEFjdGlvbiB9IGZyb20gXCIuLi9hY3Rpb25zL2FjdGlvblwiO1xuaW1wb3J0IHsgQnV0dG9uIH0gZnJvbSBcIi4vYnV0dG9uXCJcblxuZXhwb3J0IGNsYXNzIFRvZ2dsZUJ1dHRvbiBleHRlbmRzIEJ1dHRvbntcblxuICAgIHByaXZhdGUgbG9ja19idXR0b25fc3RhdGUgPSBmYWxzZTtcbiAgICBwcml2YXRlIGlzX0Ffc2hvdyA9IHRydWU7XG4gICAgcHJpdmF0ZSBpY29uQTogc3RyaW5nO1xuICAgIHByaXZhdGUgaWNvbkI6IHN0cmluZztcbiAgICBwcml2YXRlIHRpdGxlQTogc3RyaW5nO1xuICAgIHByaXZhdGUgdGl0bGVCOiBzdHJpbmc7XG5cbiAgICBjb25zdHJ1Y3RvcihwYXJlbnQ6IEhUTUxFbGVtZW50LCBpY29uQTogc3RyaW5nLCBpY29uQjogc3RyaW5nLCBhY3Rpb246IEFjdGlvbiwgdGl0bGVBOiBzdHJpbmcgPSBcIlwiLCB0aXRsZUIgOiBzdHJpbmcgPSBcIlwiKXtcbiAgICAgICAgc3VwZXIocGFyZW50LCBpY29uQSwgYWN0aW9uKTtcblxuICAgICAgICB0aGlzLmljb25BID0gaWNvbkE7XG4gICAgICAgIHRoaXMuaWNvbkIgPSBpY29uQjtcbiAgICAgICAgdGhpcy50aXRsZUEgPSB0aXRsZUE7XG4gICAgICAgIHRoaXMudGl0bGVCID0gdGl0bGVCO1xuICAgIH1cblxuICAgIHNldEJ1dHRvblN0YXRlKHNob3dfZGVmYXVsdDogYm9vbGVhbil7XG4gICAgICAgIGlmKCB0aGlzLmxvY2tfYnV0dG9uX3N0YXRlICl7IHJldHVybjsgfVxuICAgICAgICB0aGlzLmludGVybmFsX3NldEJ1dHRvblN0YXRlKHNob3dfZGVmYXVsdCk7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIGFzeW5jIG9uQnV0dG9uQ2xpY2soKXtcbiAgICAgICAgaWYoICEgdGhpcy5pc19lbmFibGUgKXsgcmV0dXJuOyB9XG5cbiAgICAgICAgdGhpcy5sb2NrX2J1dHRvbl9zdGF0ZSA9IHRydWU7XG4gICAgICAgIGlmKCBhd2FpdCB0aGlzLmFjdGlvbi5ydW4oKSApeyBcbiAgICAgICAgICAgIHRoaXMuaW50ZXJuYWxfc2V0QnV0dG9uU3RhdGUoIXRoaXMuaXNfQV9zaG93KTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmxvY2tfYnV0dG9uX3N0YXRlID0gZmFsc2U7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBpbnRlcm5hbF9zZXRCdXR0b25TdGF0ZShzaG93X0E6IGJvb2xlYW4pe1xuICAgICAgICBpZiggc2hvd19BICl7XG4gICAgICAgICAgICB0aGlzLmJ1dHRvbi50aXRsZSA9IHRoaXMudGl0bGVBO1xuICAgICAgICAgICAgdGhpcy5pY29uLnNyYyA9IHRoaXMuaWNvbkE7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIHRoaXMuYnV0dG9uLnRpdGxlID0gdGhpcy50aXRsZUI7XG4gICAgICAgICAgICB0aGlzLmljb24uc3JjID0gdGhpcy5pY29uQjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuaXNfQV9zaG93ID0gc2hvd19BO1xuICAgIH1cbn0iLCJleHBvcnQgdHlwZSBHZXRTY3JpcHRDYWxsYmFjayA9ICgpID0+IHN0cmluZztcbmV4cG9ydCB0eXBlIFNldFNjcmlwdENhbGxiYWNrID0gKHNjcmlwdDogc3RyaW5nKSA9PiB2b2lkO1xuZXhwb3J0IHR5cGUgT25Qcm9ncmVzc0NhbGxiYWNrID0gKHByb2dyZXNzOiBudW1iZXIpID0+IHZvaWQ7XG5leHBvcnQgdHlwZSBPbkVycm9yQ2FsbGJhY2sgPSAoZXJyb3I6IHN0cmluZykgPT4gdm9pZDtcbmV4cG9ydCB0eXBlIE9uQ29ubmVjdGlvbkNoYW5nZUNhbGxiYWNrID0gKGlzX2Nvbm5lY3RlZDogYm9vbGVhbikgPT4gdm9pZDtcblxuXG5leHBvcnQgZnVuY3Rpb24gcHJpbnRfaGV4X2RhdGEoIHZhbHVlcyA6IG51bWJlcltdICl7XG5cbiAgICBsZXQgc3RyID0gXCJcIjtcblxuICAgIHZhbHVlcy5mb3JFYWNoKCAodmFsdWUsIGlkeCkgPT4ge1xuXG4gICAgICAgIHN0ciArPSB0b0hleFN0cmluZyh2YWx1ZSwgMik7XG5cbiAgICAgICAgaWYoIChpZHggKyAxKSAlIDQgPT0gMCl7XG4gICAgICAgICAgICBzdHIgKz0gXCIgXCI7XG4gICAgICAgIH1cblxuICAgIH0pO1xuXG4gICAgY29uc29sZS5sb2coc3RyKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRvSGV4U3RyaW5nKHZhbHVlOiBudW1iZXIsIG5iX2RpZ2l0OiBudW1iZXIgKSA6IHN0cmluZ3tcbiAgICBsZXQgcyA9IHZhbHVlLnRvU3RyaW5nKDE2KS50b1VwcGVyQ2FzZSgpO1xuXG4gICAgaWYoIHMubGVuZ3RoID4gbmJfZGlnaXQgKVxuICAgICAgICBjb25zb2xlLndhcm4oYFtUUlVOQ0FURSBXQVJOXSA6IE5lZWQgdG8gcmVwcmVzZW50ICR7c30gb24gJHtuYl9kaWdpdH0gZGlnaXRzLi4uYCk7XG5cbiAgICByZXR1cm4gXCIwXCIucmVwZWF0KCBNYXRoLm1heCgwLCBuYl9kaWdpdCAtIHMubGVuZ3RoKSApICsgcztcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHdhaXQobXM6IG51bWJlcik6IFByb21pc2U8dm9pZD57XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoIChyZXNvbHZlKSA9PiB7XG4gICAgICAgIHNldFRpbWVvdXQoICgpID0+IHJlc29sdmUoKSwgbXMpO1xuICAgIH0pO1xufVxuIiwiaW1wb3J0ICogYXMgREFQanMgZnJvbSBcImRhcGpzXCI7XG5pbXBvcnQgeyBBbGVydERpYWxvZywgQWxlcnREaWFsb2dJY29uIH0gZnJvbSBcIi4vYWxlcnRfZGlhbG9nXCI7XG5pbXBvcnQgeyBPbkNvbm5lY3Rpb25DaGFuZ2VDYWxsYmFjaywgT25FcnJvckNhbGxiYWNrLCBPblByb2dyZXNzQ2FsbGJhY2ssIHdhaXQgfSBmcm9tIFwiLi9jb21tb25cIjtcblxuZXhwb3J0IGNsYXNzIERhcExpbmtXcmFwcGVyIHtcblxuICAgIHN0YXRpYyByZWFkb25seSBMRU5HVEhfU0VSSUFMX0JVRkZFUiA6IG51bWJlciA9IDMwO1xuXG4gICAgcHJpdmF0ZSBpc193ZWJ1c2JfYXZhaWxhYmxlOiBib29sZWFuO1xuICAgIHByaXZhdGUgZGV2aWNlPzogVVNCRGV2aWNlID0gdW5kZWZpbmVkO1xuICAgIHByaXZhdGUgdHJhbnNwb3J0PyA6IERBUGpzLldlYlVTQiA9IHVuZGVmaW5lZDtcbiAgICBwcml2YXRlIHRhcmdldD8gOiBEQVBqcy5EQVBMaW5rID0gdW5kZWZpbmVkO1xuXG4gICAgcHJpdmF0ZSBjYl9vblJlY2VpdmVEYXRhIDogQXJyYXk8KGRhdGE6IHN0cmluZykgPT4gdm9pZD4gPSBbXTtcbiAgICBwcml2YXRlIHNlcmlhbF9idWZmZXIgOiBzdHJpbmcgPSBcIlwiO1xuICAgIHByaXZhdGUgb25Db25uZWN0aW9uQ2hhbmdlX2NiOiBPbkNvbm5lY3Rpb25DaGFuZ2VDYWxsYmFja1tdID0gW107XG5cbiAgICBjb25zdHJ1Y3Rvcigpe1xuICAgICAgICBpZiggbmF2aWdhdG9yLnVzYiApe1xuICAgICAgICAgICAgbmF2aWdhdG9yLnVzYi5hZGRFdmVudExpc3RlbmVyKCdkaXNjb25uZWN0JywgZXZlbnQgPT4ge1xuICAgICAgICAgICAgICAgIGlmKCB0aGlzLmlzQ29ubmVjdGVkKCkgKXtcbiAgICAgICAgICAgICAgICAgICAgaWYodGhpcy5kZXZpY2U/LnNlcmlhbE51bWJlciA9PSBldmVudC5kZXZpY2Uuc2VyaWFsTnVtYmVyKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZGlzY29ubmVjdCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHRoaXMuaXNfd2VidXNiX2F2YWlsYWJsZSA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIHRoaXMuaXNfd2VidXNiX2F2YWlsYWJsZSA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaXNXZWJVU0JBdmFpbGFibGUoKXtcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNfd2VidXNiX2F2YWlsYWJsZTtcbiAgICB9XG5cbiAgICBhZGRSZWljZWl2ZWREYXRhTGlzdGVuZXIgKCBjYiA6IChkYXRhOiBzdHJpbmcpID0+IHZvaWQgKXtcbiAgICAgICAgdGhpcy5jYl9vblJlY2VpdmVEYXRhLnB1c2goY2IpO1xuICAgIH1cblxuICAgIGFzeW5jIGNvbm5lY3QoKSA6IFByb21pc2U8Ym9vbGVhbj57XG4gICAgICAgIGlmKCAhIHRoaXMuaXNDb25uZWN0ZWQoKSApe1xuICAgICAgICAgICAgaWYoIXRoaXMuaXNfd2VidXNiX2F2YWlsYWJsZSB8fCAhIGF3YWl0IHRoaXMuY3JlYXRlVGFyZ2V0KCkgKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBhd2FpdCB0aGlzLnRhcmdldD8uc2VyaWFsV3JpdGUoU3RyaW5nLmZyb21DaGFyQ29kZSgxKSk7IC8vIFtDdHJsK0FdIGVudGVyIHJhdyBtb2RlIChSRVBMIFB5dGhvbilcbiAgICAgICAgdGhpcy50YXJnZXQ/LnN0YXJ0U2VyaWFsUmVhZCgpO1xuICAgICAgICB0aGlzLmNhbGxPbkNvbm5lY3Rpb25DaGFuZ2VDYWxsYmFja3ModHJ1ZSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIGFzeW5jIGRpc2Nvbm5lY3QoKSA6IFByb21pc2U8Ym9vbGVhbj57XG4gICAgICAgIGlmKCAhIHRoaXMuaXNDb25uZWN0ZWQoKSApe1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy50YXJnZXQ/LnN0b3BTZXJpYWxSZWFkKCk7XG5cbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgYXdhaXQgdGhpcy50YXJnZXQ/LmRpc2Nvbm5lY3QoKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaChlKXt9XG5cbiAgICAgICAgdGhpcy50YXJnZXQgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMudHJhbnNwb3J0ID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLmRldmljZSA9IHVuZGVmaW5lZDtcblxuICAgICAgICB0aGlzLmZsdXNoU2VyaWFsKCk7XG4gICAgICAgIHRoaXMuY2FsbE9uQ29ubmVjdGlvbkNoYW5nZUNhbGxiYWNrcyhmYWxzZSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIGFzeW5jIHJ1blNjcmlwdChzY3JpcHQ6IHN0cmluZywgb25fcHJvZ3Jlc3M6IE9uUHJvZ3Jlc3NDYWxsYmFjaywgb25fZXJyb3I6IE9uRXJyb3JDYWxsYmFjayl7XG4gICAgICAgIFxuICAgICAgICBpZiggIWF3YWl0IHRoaXMuY29ubmVjdCgpICl7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBhd2FpdCB0aGlzLnNlbmRTY3JpcHQoc2NyaXB0ICsgXCJcXG5cXG5cXG5cIiwgb25fcHJvZ3Jlc3MsIG9uX2Vycm9yKTtcbiAgICB9XG5cbiAgICBhc3luYyBmbGFzaE1haW4oc2NyaXB0OiBzdHJpbmcsIG9uX3Byb2dyZXNzIDogT25Qcm9ncmVzc0NhbGxiYWNrLCBvbl9lcnJvcjogT25FcnJvckNhbGxiYWNrKXtcblxuICAgICAgICBsZXQgYmluX2RhdGEgPSBuZXcgVGV4dEVuY29kZXIoKS5lbmNvZGUoc2NyaXB0KTtcbiAgICAgICAgbGV0IHByb2cgPSBcInByb2c9W1wiO1xuICAgICAgICBcbiAgICAgICAgbGV0IHBhcnRfbGVuZ3RoID0gNDA7XG4gICAgICAgIGxldCBuYl9wYXJ0ID0gTWF0aC5jZWlsKGJpbl9kYXRhLmxlbmd0aCAvIHBhcnRfbGVuZ3RoKTtcblxuICAgICAgICBvbl9wcm9ncmVzcygwKTtcbiAgICAgICAgXG4gICAgICAgIGZvciggbGV0IGkgPSAwOyBpIDwgbmJfcGFydDsgKytpICl7XG4gICAgICAgICAgICBwcm9nICs9IGJpbl9kYXRhLnNsaWNlKGkgKiBwYXJ0X2xlbmd0aCwgKGkrMSkgKiBwYXJ0X2xlbmd0aCkuam9pbihcIixcIik7XG4gICAgICAgICAgICBwcm9nICs9IFwiLFxcblwiXG4gICAgICAgIH1cblxuICAgICAgICBwcm9nICs9IFwiXVxcblwiO1xuXG4gICAgICAgIGxldCBtYWluID0gIHByb2cgK1xuICAgICAgICAgICAgICAgICAgICBgd2l0aCBvcGVuKFwibWFpbi5weVwiLCBcIndiXCIpIGFzIGY6XFxuYCArXG4gICAgICAgICAgICAgICAgICAgIGBcXHRmLndyaXRlKGJ5dGVhcnJheShwcm9nKSlcXG5gICsgXG4gICAgICAgICAgICAgICAgICAgIFwiXFxuXCJcbiAgICAgICAgICAgICAgICAgICAgXCJcXG5cIlxuICAgICAgICAgICAgICAgICAgICBcIlxcblwiO1xuXG4gICAgICAgIGF3YWl0IHRoaXMuc2VuZFNjcmlwdChtYWluLCBvbl9wcm9ncmVzcywgb25fZXJyb3IpO1xuICAgICAgICBhd2FpdCB0aGlzLnRhcmdldD8uc2VyaWFsV3JpdGUoU3RyaW5nLmZyb21DaGFyQ29kZSgyKSk7IC8vIFtDdHJsK0JdIGV4aXQgcmF3IG1vZGUgKFJFUEwgUHl0aG9uKVxuICAgICAgICBhd2FpdCB0aGlzLnRhcmdldD8uc2VyaWFsV3JpdGUoU3RyaW5nLmZyb21DaGFyQ29kZSg0KSk7IC8vIFtDdHJsK0RdIFNvZnQgcmVzZXQgKFJFUEwgUHl0aG9uKVxuXG4gICAgICAgIG9uX3Byb2dyZXNzKDEpO1xuICAgIH1cblxuICAgIGlzQ29ubmVjdGVkKCkgOiBib29sZWFue1xuICAgICAgICByZXR1cm4gdGhpcy50YXJnZXQgIT0gdW5kZWZpbmVkICYmIHRoaXMudGFyZ2V0LmNvbm5lY3RlZDtcbiAgICB9XG5cbiAgICBhc3luYyBmbGFzaChoZXg6IFVpbnQ4QXJyYXksIG9uX3Byb2dyZXNzIDogT25Qcm9ncmVzc0NhbGxiYWNrLCBvbl9lcnJvcjogT25FcnJvckNhbGxiYWNrKSA6IFByb21pc2U8dm9pZD57XG4gICAgICAgIGlmKCAhdGhpcy5pc0Nvbm5lY3RlZCgpICl7IHJldHVybjsgfVxuXG4gICAgICAgIHRoaXMudGFyZ2V0Py5vbihEQVBqcy5EQVBMaW5rLkVWRU5UX1BST0dSRVNTLCBwcm9ncmVzcyA9PiBvbl9wcm9ncmVzcyhwcm9ncmVzcykgKTtcblxuICAgICAgICB0cnl7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnRhcmdldD8uc3RvcFNlcmlhbFJlYWQoKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMudGFyZ2V0Py5yZXNldCgpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy50YXJnZXQ/LmZsYXNoKGhleCk7XG4gICAgICAgICAgICBhd2FpdCB3YWl0KDEwMDApO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy50YXJnZXQ/LnJlc2V0KCk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2goZTogYW55KXtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihcIltGTEFTSF06IFwiLCBlKTtcbiAgICAgICAgICAgIG9uX2Vycm9yKGUubWVzc2FnZSk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnRhcmdldD8ub24oREFQanMuREFQTGluay5FVkVOVF9QUk9HUkVTUywgcHJvZ3Jlc3MgPT4ge30gKTtcbiAgICB9XG5cbiAgICBhc3luYyBpc01pY3JvcHl0aG9uT25UYXJnZXQoKXtcbiAgICAgICAgaWYoICF0aGlzLmlzQ29ubmVjdGVkKCkgKXsgcmV0dXJuOyB9XG5cbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgYXdhaXQgdGhpcy50YXJnZXQ/LnNlcmlhbFdyaXRlKFN0cmluZy5mcm9tQ2hhckNvZGUoMykpOyAvLyBbQ3RybCtDXVxuICAgICAgICAgICAgYXdhaXQgd2FpdCgyMDAwKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMudGFyZ2V0Py5zZXJpYWxXcml0ZShTdHJpbmcuZnJvbUNoYXJDb2RlKDQpKTsgLy8gW0N0cmwrRF1cblxuICAgICAgICAgICAgbGV0IHJlYWQgOiBzdHJpbmcgPSAgbmV3IFRleHREZWNvZGVyKCkuZGVjb2RlKCBhd2FpdCB0aGlzLnRhcmdldD8uc2VyaWFsUmVhZCgpICk7XG4gICAgICAgICAgICBhd2FpdCB3YWl0KDIwMDApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gKHJlYWQuaW5kZXhPZihcIk1QWVwiKSAhPSAtMSk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2goZTogYW55KXtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJbSVNfTUlDUk9QWVRIT05fT05fVEFSR0VUXTogXCIsIGUpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYWRkQ29ubmVjdGlvbkNoYW5nZUxpc3RlbmVyKGNiOiBPbkNvbm5lY3Rpb25DaGFuZ2VDYWxsYmFjayk6IHZvaWR7XG4gICAgICAgIHRoaXMub25Db25uZWN0aW9uQ2hhbmdlX2NiLnB1c2goY2IpO1xuICAgIH1cblxuICAgIGFzeW5jIHNlbmRLZXlib2FyZEludGVycnVwdCgpe1xuICAgICAgICBpZiggIXRoaXMuaXNDb25uZWN0ZWQoKSApeyByZXR1cm47IH1cblxuICAgICAgICB0cnl7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnRhcmdldD8uc2VyaWFsV3JpdGUoU3RyaW5nLmZyb21DaGFyQ29kZSgzKSk7IC8vIFtDdHJsK0NdXG4gICAgICAgICAgICBhd2FpdCB3YWl0KDEwMDApO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoKGU6IGFueSl7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiW1NFTkRfS0VZQk9BUkRfSU5URVJSVVBUXTogXCIsIGUpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBjYWxsT25Db25uZWN0aW9uQ2hhbmdlQ2FsbGJhY2tzKGlzX2Nvbm5lY3RlZDogYm9vbGVhbil7XG4gICAgICAgIHRoaXMub25Db25uZWN0aW9uQ2hhbmdlX2NiLmZvckVhY2goIGNiID0+IGNiKGlzX2Nvbm5lY3RlZCkgKTtcbiAgICB9XG5cblxuICAgIHByaXZhdGUgYXN5bmMgc2VuZFNjcmlwdChzY3JpcHQ6IHN0cmluZywgb25fcHJvZ3Jlc3M/OiBPblByb2dyZXNzQ2FsbGJhY2ssIG9uX2Vycm9yPzogT25FcnJvckNhbGxiYWNrICl7XG5cbiAgICAgICAgaWYoICF0aGlzLmlzQ29ubmVjdGVkKCkgKXsgcmV0dXJuOyB9XG4gICAgICAgIGlmKCBzY3JpcHQubGVuZ3RoID09IDAgKXsgcmV0dXJuOyB9XG5cbiAgICAgICAgbGV0IGZpbmFsX3NjcmlwdCA9IGBkZWYgX19zZW5kX3NjcmlwdF9leGVjdXRpb25fXygpOlxcblxcdGAgKyBzY3JpcHQucmVwbGFjZSgvXFxuL2csIFwiXFxuXFx0XCIpICsgXCJcXG5cXG5cIjtcblxuICAgICAgICBsZXQgY2h1bmtzID0gZmluYWxfc2NyaXB0Lm1hdGNoKG5ldyBSZWdFeHAoJ1tcXFxcc1xcXFxTXXsxLCcgKyBEYXBMaW5rV3JhcHBlci5MRU5HVEhfU0VSSUFMX0JVRkZFUiArICd9JywgJ2cnKSkgfHwgW107XG5cbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgYXdhaXQgdGhpcy50YXJnZXQ/LnNlcmlhbFdyaXRlKFN0cmluZy5mcm9tQ2hhckNvZGUoMykpOyAvLyBbQ3RybCtDXVxuICAgICAgICAgICAgYXdhaXQgd2FpdCgyMDAwKTtcblxuICAgICAgICAgICAgdGhpcy5mbHVzaFNlcmlhbCgpO1xuXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnRhcmdldD8uc2VyaWFsV3JpdGUoU3RyaW5nLmZyb21DaGFyQ29kZSgxKSk7IC8vIFtDdHJsK0FdIGVudGVyIHJhdyBtb2RlIChSRVBMIFB5dGhvbilcbiAgICAgICAgICAgIGF3YWl0IHdhaXQoMjUwKTtcblxuICAgICAgICAgICAgZm9yKGxldCBpID0gMDsgaSA8IGNodW5rcy5sZW5ndGg7ICsraSApe1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMudGFyZ2V0Py5zZXJpYWxXcml0ZShjaHVua3NbaV0pO1xuICAgICAgICAgICAgICAgIGF3YWl0IHdhaXQoMTApO1xuXG4gICAgICAgICAgICAgICAgaWYob25fcHJvZ3Jlc3MgIT0gdW5kZWZpbmVkKXtcbiAgICAgICAgICAgICAgICAgICAgb25fcHJvZ3Jlc3MoIGkgLyBjaHVua3MubGVuZ3RoICk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnRhcmdldD8uc2VyaWFsV3JpdGUoIFwidHJ5OlxcblwiKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMudGFyZ2V0Py5zZXJpYWxXcml0ZSggICAgIFwiXFx0X19zZW5kX3NjcmlwdF9leGVjdXRpb25fXygpXFxuXCIpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy50YXJnZXQ/LnNlcmlhbFdyaXRlKCBcImV4Y2VwdCBLZXlib2FyZEludGVycnVwdDpcXG5cIik7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnRhcmdldD8uc2VyaWFsV3JpdGUoICAgICBcIlxcdHByaW50KFxcXCItLUlOVEVSUlVQVCBSVU5OSU5HIFBST0dSQU0tLVxcXCIpXFxuXFxuXCIpO1xuXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnRhcmdldD8uc2VyaWFsV3JpdGUoU3RyaW5nLmZyb21DaGFyQ29kZSg0KSk7IC8vIFtDdHJsK0RdIEV4ZWN1dGUgcHl0aG9uIGNvZGUgKFJFUEwgUHl0aG9uKVxuICAgICAgICB9XG4gICAgICAgIGNhdGNoKGU6IGFueSl7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oXCJbU0VORCBTQ1JJUFRdOiBcIiwgZSk7XG4gICAgICAgICAgICBpZihvbl9lcnJvcil7IG9uX2Vycm9yKGUubWVzc2FnZSk7IH1cbiAgICAgICAgfVxuXG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBjcmVhdGVUYXJnZXQoKSA6IFByb21pc2U8Ym9vbGVhbj4ge1xuXG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIHRoaXMuZGV2aWNlID0gYXdhaXQgbmF2aWdhdG9yLnVzYi5yZXF1ZXN0RGV2aWNlKHtcbiAgICAgICAgICAgICAgICBmaWx0ZXJzOiBbe3ZlbmRvcklkOiAweDBEMjh9XVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2goZTogYW55KXtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihlKTtcblxuICAgICAgICAgICAgaWYoIGUubWVzc2FnZS5pbmRleE9mKFwiTm8gZGV2aWNlIHNlbGVjdGVkXCIpID09IC0xICl7XG4gICAgICAgICAgICAgICAgbmV3IEFsZXJ0RGlhbG9nKFwiV2ViVVNCIEVycm9yXCIsIGBBbiBlcnJvciBvY2N1cmVkIHdpdGggdGhlIFdlYlVTQjogPGJyLz48ZGl2IGNsYXNzPVwiY2l0YXRpb24tZXJyb3JcIj4ke2UubWVzc2FnZX08L2Rpdj48YnIvPlRyeSB1bnBsdWdnaW5nIGFuZCByZXBsdWdnaW5nIHlvdXIgYm9hcmQgb3IgcmVzdGFydCB5b3VyIGJyb3dzZXIuPGJyLz48YnIvPjxpPk5vdGU6IFdlYlVTQiBpcyBleHBlcmltZW50YWwgYW5kIG9ubHkgc3VwcG9ydCBvbiBjaHJvbWUgYmFzZWQgYnJvd3NlciAoY2hyb21lLCBjaHJvbWl1bSwgYnJhdmUsIGVkZ2UsIGV0Yyk8L2k+YCwgQWxlcnREaWFsb2dJY29uLkVSUk9SKS5vcGVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnRyYW5zcG9ydCA9IG5ldyBEQVBqcy5XZWJVU0IodGhpcy5kZXZpY2UpO1xuICAgICAgICB0aGlzLnRhcmdldCA9IG5ldyBEQVBqcy5EQVBMaW5rKHRoaXMudHJhbnNwb3J0KTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMudGFyZ2V0Lm9uKERBUGpzLkRBUExpbmsuRVZFTlRfU0VSSUFMX0RBVEEsIGRhdGEgPT4gdGhpcy5vbkV2ZW50U2VyaWFsRGF0YShkYXRhKSApO1xuXG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMudGFyZ2V0LmNvbm5lY3QoKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMudGFyZ2V0LnNldFNlcmlhbEJhdWRyYXRlKDExNTIwMCk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2goZTogYW55KXtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihlKTtcbiAgICAgICAgICAgIG5ldyBBbGVydERpYWxvZyhcIkNvbm5lY3Rpb24gZmFpbGVkXCIsIGBBbiBlcnJvciBvY2N1cmVkIGR1cmluZyB0aGUgY29ubmVjdGlvbjogPGJyLz48ZGl2IGNsYXNzPVwiY2l0YXRpb24tZXJyb3JcIj4ke2UubWVzc2FnZX08L2Rpdj48YnIvPlRyeSB1bnBsdWdnaW5nIGFuZCByZXBsdWdnaW5nIHlvdXIgYm9hcmQuLi5gLCBBbGVydERpYWxvZ0ljb24uRVJST1IpLm9wZW4oKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHByaXZhdGUgZmx1c2hTZXJpYWwoKXtcbiAgICAgICAgaWYoIHRoaXMuc2VyaWFsX2J1ZmZlci5sZW5ndGggPiAwICl7XG4gICAgICAgICAgICB0aGlzLnNlcmlhbF9idWZmZXIgPSBcIlwiO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBvbkV2ZW50U2VyaWFsRGF0YShkYXRhOiBzdHJpbmcpe1xuICAgICAgICBsZXQgc3BsaXRzID0gZGF0YS5zcGxpdCgvKD88PVxcbikvKTsgLy8gU3BsaXQgYnV0IGtlZXAgdGhlICdcXG4nXG5cbiAgICAgICAgc3BsaXRzLmZvckVhY2goIChzcGxpdCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zZXJpYWxfYnVmZmVyICs9IHNwbGl0O1xuXG4gICAgICAgICAgICBpZiggc3BsaXQuYXQoLTEpID09ICdcXG4nICl7XG4gICAgICAgICAgICAgICAgdGhpcy5jYWxsT25SZWNlaXZlQ2FsbGJhY2tzKCB0aGlzLmNsZWFuU3RyaW5nKHRoaXMuc2VyaWFsX2J1ZmZlcikgKTtcbiAgICAgICAgICAgICAgICB0aGlzLnNlcmlhbF9idWZmZXIgPSBcIlwiO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGNhbGxPblJlY2VpdmVDYWxsYmFja3MoZGF0YTogc3RyaW5nKXtcbiAgICAgICAgdGhpcy5jYl9vblJlY2VpdmVEYXRhLmZvckVhY2goIChjYikgPT4ge1xuICAgICAgICAgICAgY2IoZGF0YSk7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgcHJpdmF0ZSBjbGVhblN0cmluZyhzdHI6IHN0cmluZyk6IHN0cmluZ3tcbiAgICAgICAgcmV0dXJuICAgc3RyLnJlcGxhY2UoL1xceDA0XFx4MDQvZywgXCJcIilcbiAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcPk9LW1xceDA0XFw+XSovZywgXCJcIilcbiAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcPlxcPlxcPlsgXFxyXFxuXSovZywgXCJcIilcblxuICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvW1xcPlxcclxcbl0qcmF3IFJFUEw7IENUUkwtQiB0byBleGl0W1xcclxcbl0qL2csIFwiXCIpXG4gICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9UeXBlIFwiaGVscFxcKFxcKVwiIGZvciBtb3JlIGluZm9ybWF0aW9uLltcXHJcXG5dKi9nLCBcIlwiKVxuICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvTWljcm9QeXRob24gW1xcc1xcU10qXFxuJC9nLCBcIlwiKTtcbiAgICB9XG59IiwiZXhwb3J0IGNsYXNzIElIZXgge1xuXG4gICAgcHJpdmF0ZSBiYXNlX2FkZHJlc3M6IG51bWJlcjtcblxuICAgIGNvbnN0cnVjdG9yKGJhc2VfYWRkcmVzczogbnVtYmVyKXtcbiAgICAgICAgdGhpcy5iYXNlX2FkZHJlc3MgPSBiYXNlX2FkZHJlc3M7XG4gICAgfVxuXG4gICAgcGFyc2VCaW4oYmluX2ZpbGU6IFVpbnQ4QXJyYXkpe1xuICAgICAgICBsZXQgaWhleCA9IHRoaXMuYWRkcmVzc0xpbmUodGhpcy5iYXNlX2FkZHJlc3MpO1xuICAgICAgICBsZXQgbmJfbGluZXMgPSBNYXRoLmNlaWwoYmluX2ZpbGUubGVuZ3RoIC8gMTYpOyAvLyAxNiBvY3RlY3RzIHBhciBkYXRhIGxpbmVcbiAgICAgICAgbGV0IG9mZnNldCA9IDA7XG4gICAgICAgIGxldCBwZW5kaW5nX2FkZHJlc3NfbGluZSA9IFwiXCI7XG5cbiAgICAgICAgZm9yKGxldCBpID0gMDsgaSA8IG5iX2xpbmVzOyBpKysgKXtcbiAgICAgICAgICAgIGxldCBjcmMgPSAweDEwO1xuICAgICAgICAgICAgbGV0IHBhcnQgPSBiaW5fZmlsZS5zbGljZShpICogMTYsIChpKzEpICogMTYpO1xuICAgICAgICAgICAgbGV0IGFkZHJlc3MgPSBpKjE2O1xuICAgICAgICAgICAgbGV0IGxpbmUgPSBgOiR7dGhpcy50b0hleFN0cmluZyhwYXJ0Lmxlbmd0aCwgMil9YDtcblxuICAgICAgICAgICAgLy8gVGhlIGFkZHJlc3Mgb3ZlcmZsb3cgdGhlIDE2IGJpdHMgP1xuICAgICAgICAgICAgaWYoIGFkZHJlc3MgLSBvZmZzZXQgPiAweEZGRkYgKXtcbiAgICAgICAgICAgICAgICBvZmZzZXQgKz0gMHgxMDAwMFxuICAgICAgICAgICAgICAgIHBlbmRpbmdfYWRkcmVzc19saW5lID0gdGhpcy5hZGRyZXNzTGluZSh0aGlzLmJhc2VfYWRkcmVzcyArIG9mZnNldCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEFkZHJlc3NcbiAgICAgICAgICAgIGxpbmUgKz0gdGhpcy50b0hleFN0cmluZyhhZGRyZXNzIC0gb2Zmc2V0LCA0KTtcbiAgICAgICAgICAgIGNyYyArPSAoKGFkZHJlc3MgLSBvZmZzZXQpICYgMHhGRjAwKSA+PiA4IDtcbiAgICAgICAgICAgIGNyYyArPSAoYWRkcmVzcyAtIG9mZnNldCkgJiAweDAwRkY7XG5cbiAgICAgICAgICAgIC8vIEZpZWxkXG4gICAgICAgICAgICBsaW5lICs9IFwiMDBcIjtcbiAgICAgICAgICAgIGNyYyArPSAweDAwO1xuXG4gICAgICAgICAgICAvLyBEYXRhXG4gICAgICAgICAgICBsZXQgaXNfZGF0YV9vbmx5X0ZGID0gdHJ1ZTtcbiAgICAgICAgICAgIHBhcnQuZm9yRWFjaCggKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgbGluZSArPSB0aGlzLnRvSGV4U3RyaW5nKHZhbHVlLCAyKTtcbiAgICAgICAgICAgICAgICBjcmMgKz0gdmFsdWU7XG5cbiAgICAgICAgICAgICAgICBpZiggdmFsdWUgIT0gMHhGRiApeyBpc19kYXRhX29ubHlfRkYgPSBmYWxzZTsgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIGlmIGRhdGEgYXJlIG9ubHkgRkYgYW5kIG9mZnNldCA8IDB4MDgwOF8wMDAwIChhZGRyZXNzIG9mIEZBVCBmaWxlc3lzdGVtKVxuICAgICAgICAgICAgaWYoIGlzX2RhdGFfb25seV9GRiAmJiBvZmZzZXQgPCAweDA4MDgwMDAwMCApeyBjb250aW51ZTsgfVxuXG4gICAgICAgICAgICAvLyBDaGVja3N1bVxuICAgICAgICAgICAgbGluZSArPSB0aGlzLmNvbXB1dGVDUkMoY3JjKTtcblxuICAgICAgICAgICAgLy8gSWYgd2UgYXJlIHdhaW50aW5nIHRvIHByaW50IGFkZHJlc3MgbGluZSwgZG8gaXQgYmVmb3JlIGFkZCBkYXRhIGxpbmVcbiAgICAgICAgICAgIGlmKCBwZW5kaW5nX2FkZHJlc3NfbGluZS5sZW5ndGggPiAwICl7XG4gICAgICAgICAgICAgICAgaWhleCArPSBwZW5kaW5nX2FkZHJlc3NfbGluZTtcbiAgICAgICAgICAgICAgICBwZW5kaW5nX2FkZHJlc3NfbGluZSA9IFwiXCI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEFkZCBsaW5lXG4gICAgICAgICAgICBpaGV4ICs9IGAke2xpbmV9XFxuYFxuICAgICAgICB9XG5cbiAgICAgICAgaWhleCArPSBcIjowMDAwMDAwMUZGXFxuXCI7XG5cbiAgICAgICAgY29uc29sZS5sb2coYGlIZXggc2l6ZSA6ICAke2loZXgubGVuZ3RofSBieXRlc2ApXG5cbiAgICAgICAgcmV0dXJuIGloZXg7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBvZmZzZXRMaW5lKCBvZmZzZXQ6IG51bWJlciApe1xuICAgICAgICBsZXQgc2hpZnRfYWRkciA9IChvZmZzZXQgJiAweEZGRkYwMDAwKSA+PiA0O1xuICAgICAgICByZXR1cm4gYDowMjAwMDAwMiR7dGhpcy50b0hleFN0cmluZyhzaGlmdF9hZGRyLCA0KX0ke3RoaXMuY29tcHV0ZUNSQyggMHgwNCArICgoc2hpZnRfYWRkciAmIDB4RkYwMCkgPj4gOCkgKyAoc2hpZnRfYWRkciAmIDB4MDBGRikgKX1cXG5gO1xuICAgIH1cblxuICAgIHByaXZhdGUgYWRkcmVzc0xpbmUoIG1lbW9yeV9hZGRyZXNzOiBudW1iZXIgKXtcbiAgICAgICAgbGV0IHNoaWZ0X2FkZHIgPSAobWVtb3J5X2FkZHJlc3MgJiAweEZGRkYwMDAwKSA+PiAxNjtcbiAgICAgICAgcmV0dXJuIGA6MDIwMDAwMDQke3RoaXMudG9IZXhTdHJpbmcoc2hpZnRfYWRkciwgNCl9JHt0aGlzLmNvbXB1dGVDUkMoIDB4MDYgKyAoKHNoaWZ0X2FkZHIgJiAweEZGMDApID4+IDgpICsgKHNoaWZ0X2FkZHIgJiAweDAwRkYpICl9XFxuYDtcbiAgICB9XG5cbiAgICBwcml2YXRlIGNvbXB1dGVDUkMoc3VtOiBudW1iZXIpOiBzdHJpbmd7XG4gICAgICAgIHJldHVybiB0aGlzLnRvSGV4U3RyaW5nKCAofihzdW0gJiAweEZGKSArIDEpICYgMHhGRiwgMilcbiAgICB9XG5cbiAgICBwcml2YXRlIHRvSGV4U3RyaW5nKHZhbHVlOiBudW1iZXIsIG5iX2RpZ2l0OiBudW1iZXIgKSA6IHN0cmluZ3tcbiAgICAgICAgbGV0IHMgPSB2YWx1ZS50b1N0cmluZygxNikudG9VcHBlckNhc2UoKTtcblxuICAgICAgICBpZiggcy5sZW5ndGggPiBuYl9kaWdpdCApXG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYFtUUlVOQ0FURSBXQVJOXSA6IE5lZWQgdG8gcmVwcmVzZW50ICR7c30gb24gJHtuYl9kaWdpdH0gZGlnaXRzLi4uYCk7XG5cbiAgICAgICAgcmV0dXJuIFwiMFwiLnJlcGVhdCggTWF0aC5tYXgoMCwgbmJfZGlnaXQgLSBzLmxlbmd0aCkgKSArIHM7XG4gICAgfVxufSIsImltcG9ydCB7IEZhdEJQQiB9IGZyb20gXCIuL2ZhdF9CUEJcIlxuaW1wb3J0IHsgRmF0Um9vdERpcmVjdG9yeSwgRmlsZUF0dHJpYnV0ZSB9IGZyb20gXCIuL2ZhdF9yb290RGlyXCI7XG5pbXBvcnQgeyBGYXRUYWJsZSB9IGZyb20gXCIuL2ZhdF90YWJsZVwiO1xuXG5leHBvcnQgY2xhc3MgRmF0RlMge1xuICAgIHByaXZhdGUgQlBCOiBGYXRCUEI7XG4gICAgcHJpdmF0ZSB0YWJsZTogRmF0VGFibGU7XG4gICAgcHJpdmF0ZSByb290OiBGYXRSb290RGlyZWN0b3J5O1xuXG4gICAgY29uc3RydWN0b3Iodm9sdW1lX25hbWU6IHN0cmluZyl7XG4gICAgICAgIHRoaXMuQlBCID0gbmV3IEZhdEJQQigpO1xuICAgICAgICB0aGlzLmNvbnN0cnVjdF9wYnAoKTtcblxuICAgICAgICB0aGlzLnRhYmxlID0gbmV3IEZhdFRhYmxlKHRoaXMuQlBCKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMucm9vdCA9IG5ldyBGYXRSb290RGlyZWN0b3J5KHRoaXMuQlBCLCB0aGlzLnRhYmxlLCB2b2x1bWVfbmFtZSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBjb25zdHJ1Y3RfcGJwKCl7XG4gICAgICAgIHRoaXMuQlBCLmp1bXBfaW5zdCA9IDB4OTBGRUVCO1xuICAgICAgICB0aGlzLkJQQi5vZW1fbmFtZSA9IFwiTVNET1M1LjBcIjtcbiAgICAgICAgdGhpcy5CUEIuc2VjdG9yX3NpemUgPSA1MTI7XG4gICAgICAgIHRoaXMuQlBCLmNsdXN0ZXJfc2l6ZSA9IDE7XG4gICAgICAgIHRoaXMuQlBCLnJlc2VydmVkX3NlY3RvcnMgPSAxO1xuICAgICAgICB0aGlzLkJQQi5mYXRzX251bWJlciA9IDE7XG4gICAgICAgIHRoaXMuQlBCLnJvb3RfZGlyX3NpemUgPSA1MTI7XG4gICAgICAgIHRoaXMuQlBCLnRvdGFsX3NlY3RvcnMgPSAxMDI0O1xuICAgICAgICB0aGlzLkJQQi5kaXNrX3R5cGUgPSAweEY4O1xuICAgICAgICB0aGlzLkJQQi5mYXRfc2l6ZSA9IDQ7XG4gICAgICAgIHRoaXMuQlBCLnNlY3RvcnNfcGVyX3RyYWNrID0gNjM7XG4gICAgICAgIHRoaXMuQlBCLmhlYWRzX251bWJlciA9IDI1NTtcbiAgICAgICAgdGhpcy5CUEIuaGlkZGVuX3NlY3RvcnMgPSAyNTY7XG4gICAgICAgIHRoaXMuQlBCLnRvdGFsXzMyYml0c19zZWN0b3JzID0gMDtcblxuICAgICAgICB0aGlzLkJQQi5kaXNrX2lkZW50aWZpZXIgPSAweDgwO1xuICAgICAgICB0aGlzLkJQQi5zaWduYXR1cmUgPSAweDI5O1xuICAgICAgICB0aGlzLkJQQi5kaXNrX3NlcmlhbCA9IDB4NDYyMTAwMDA7XG4gICAgICAgIHRoaXMuQlBCLmRpc2tfbmFtZSA9IFwiTk8gTkFNRVwiO1xuICAgICAgICB0aGlzLkJQQi5maWxlX3N5c3RlbV90eXBlID0gXCJGQVRcIjtcblxuICAgICAgICB0aGlzLkJQQi5waHlzaWNhbF9kcml2ZV9udW1iZXIgPSAwO1xuICAgICAgICB0aGlzLkJQQi5ib290X3NlY3Rvcl9zaWduYXR1cmUgPSAweEFBNTU7XG4gICAgfVxuXG5cbiAgICBhZGRGaWxlKGZpbGVuYW1lOiBzdHJpbmcsIGV4dGVuc2lvbjogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpe1xuICAgICAgICBsZXQgZW5jID0gbmV3IFRleHRFbmNvZGVyKCk7XG4gICAgICAgIHRoaXMucm9vdC5hZGRGaWxlKGZpbGVuYW1lLCBleHRlbnNpb24sIEZpbGVBdHRyaWJ1dGUuQVJDSElWRSwgZW5jLmVuY29kZShjb250ZW50KSk7XG4gICAgfVxuXG4gICAgYWRkQmluYXJ5RmlsZShmaWxlbmFtZTogc3RyaW5nLCBleHRlbnNpb246IHN0cmluZywgY29udGVudDogVWludDhBcnJheSl7XG4gICAgICAgIHRoaXMucm9vdC5hZGRGaWxlKGZpbGVuYW1lLCBleHRlbnNpb24sIEZpbGVBdHRyaWJ1dGUuQVJDSElWRSwgY29udGVudCk7XG4gICAgfVxuXG4gICAgZ2VuZXJhdGVfYmluYXJ5KCl7XG4gICAgICAgIHJldHVybiAgICAgICAgICB0aGlzLkJQQi5nZW5lcmF0ZUJQQigpXG4gICAgICAgICAgICAgICAgLmNvbmNhdCh0aGlzLnRhYmxlLmdlbmVyYXRlVGFibGUoKSlcbiAgICAgICAgICAgICAgICAuY29uY2F0KHRoaXMucm9vdC5nZW5lcmF0ZVJvb3REaXJlY3RvcnkoKSk7XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgRmF0VXRpbHMgfSBmcm9tIFwiLi9mYXRfY29tbW9uXCI7XG5cbmV4cG9ydCBjbGFzcyBGYXRCUEIge1xuXG4gICAganVtcF9pbnN0OiBudW1iZXIgPSAwO1xuICAgIG9lbV9uYW1lOiBzdHJpbmcgPSBcIlwiO1xuICAgIHNlY3Rvcl9zaXplOiBudW1iZXIgPSAwO1xuICAgIGNsdXN0ZXJfc2l6ZTogbnVtYmVyID0gMDtcbiAgICByZXNlcnZlZF9zZWN0b3JzOiBudW1iZXIgPSAwO1xuICAgIGZhdHNfbnVtYmVyOiBudW1iZXIgPSAwO1xuICAgIHJvb3RfZGlyX3NpemU6IG51bWJlciA9IDA7XG4gICAgdG90YWxfc2VjdG9yczogbnVtYmVyID0gMDtcbiAgICBkaXNrX3R5cGU6IG51bWJlciA9IDA7XG4gICAgZmF0X3NpemU6IG51bWJlciA9IDA7XG4gICAgc2VjdG9yc19wZXJfdHJhY2s6IG51bWJlciA9IDA7XG4gICAgaGVhZHNfbnVtYmVyOiBudW1iZXIgPSAwO1xuICAgIGhpZGRlbl9zZWN0b3JzOiBudW1iZXIgPSAwO1xuICAgIHRvdGFsXzMyYml0c19zZWN0b3JzOiBudW1iZXIgPSAwO1xuXG4gICAgZGlza19pZGVudGlmaWVyOiBudW1iZXIgPSAwO1xuICAgIHNpZ25hdHVyZTogbnVtYmVyID0gMDtcbiAgICBkaXNrX3NlcmlhbDogbnVtYmVyID0gMDtcbiAgICBkaXNrX25hbWU6IHN0cmluZyA9IFwiXCI7XG4gICAgZmlsZV9zeXN0ZW1fdHlwZTogc3RyaW5nID0gXCJcIjtcblxuICAgIHBoeXNpY2FsX2RyaXZlX251bWJlcjogbnVtYmVyID0gMDtcbiAgICBib290X3NlY3Rvcl9zaWduYXR1cmU6IG51bWJlciA9IDA7XG5cbiAgICBjb25zdHJ1Y3Rvcigpe31cblxuICAgIGdlbmVyYXRlQlBCKCkgOiBudW1iZXJbXSB7XG4gICAgICAgIHJldHVybiAgICAgICAgICBGYXRVdGlscy5jb252ZXJ0VG9IZXgodGhpcy5qdW1wX2luc3QsIDMpXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0U3RyaW5nKHRoaXMub2VtX25hbWUsIDgpKVxuICAgICAgICAgICAgICAgIC5jb25jYXQoRmF0VXRpbHMuY29udmVydFRvSGV4KHRoaXMuc2VjdG9yX3NpemUsIDIpKVxuICAgICAgICAgICAgICAgIC5jb25jYXQoRmF0VXRpbHMuY29udmVydFRvSGV4KHRoaXMuY2x1c3Rlcl9zaXplLCAxKSlcbiAgICAgICAgICAgICAgICAuY29uY2F0KEZhdFV0aWxzLmNvbnZlcnRUb0hleCh0aGlzLnJlc2VydmVkX3NlY3RvcnMsIDIpKVxuICAgICAgICAgICAgICAgIC5jb25jYXQoRmF0VXRpbHMuY29udmVydFRvSGV4KHRoaXMuZmF0c19udW1iZXIsIDEpKVxuICAgICAgICAgICAgICAgIC5jb25jYXQoRmF0VXRpbHMuY29udmVydFRvSGV4KHRoaXMucm9vdF9kaXJfc2l6ZSwgMikpXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0VG9IZXgodGhpcy50b3RhbF9zZWN0b3JzLCAyKSlcbiAgICAgICAgICAgICAgICAuY29uY2F0KEZhdFV0aWxzLmNvbnZlcnRUb0hleCh0aGlzLmRpc2tfdHlwZSwgMSkpXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0VG9IZXgodGhpcy5mYXRfc2l6ZSwgMikpXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0VG9IZXgodGhpcy5zZWN0b3JzX3Blcl90cmFjaywgMikpXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0VG9IZXgodGhpcy5oZWFkc19udW1iZXIsIDIpKVxuICAgICAgICAgICAgICAgIC5jb25jYXQoRmF0VXRpbHMuY29udmVydFRvSGV4KHRoaXMuaGlkZGVuX3NlY3RvcnMsIDQpKVxuICAgICAgICAgICAgICAgIC5jb25jYXQoRmF0VXRpbHMuY29udmVydFRvSGV4KHRoaXMudG90YWxfMzJiaXRzX3NlY3RvcnMsIDQpKVxuXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0VG9IZXgodGhpcy5kaXNrX2lkZW50aWZpZXIsIDEpKVxuICAgICAgICAgICAgICAgIC5jb25jYXQoWzB4MDFdKVxuICAgICAgICAgICAgICAgIC5jb25jYXQoRmF0VXRpbHMuY29udmVydFRvSGV4KHRoaXMuc2lnbmF0dXJlLCAxKSlcbiAgICAgICAgICAgICAgICAuY29uY2F0KEZhdFV0aWxzLmNvbnZlcnRUb0hleCh0aGlzLmRpc2tfc2VyaWFsLCA0KSlcbiAgICAgICAgICAgICAgICAuY29uY2F0KEZhdFV0aWxzLmNvbnZlcnRTdHJpbmcodGhpcy5kaXNrX25hbWUsIDExKSlcbiAgICAgICAgICAgICAgICAuY29uY2F0KEZhdFV0aWxzLmNvbnZlcnRTdHJpbmcodGhpcy5maWxlX3N5c3RlbV90eXBlLCA4KSlcbiAgICAgICAgICAgICAgICAuY29uY2F0KEZhdFV0aWxzLmNvbnZlcnRUb0hleCggMCwgNDQ3KSlcbiAgICAgICAgICAgICAgICAuY29uY2F0KEZhdFV0aWxzLmNvbnZlcnRUb0hleCh0aGlzLnBoeXNpY2FsX2RyaXZlX251bWJlciwgMSkpXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0VG9IZXgodGhpcy5ib290X3NlY3Rvcl9zaWduYXR1cmUsIDIpKTtcbiAgICB9XG59IiwiZXhwb3J0IGNsYXNzIEZhdFV0aWxzIHtcbiAgICBzdGF0aWMgY29udmVydFN0cmluZyhzdHI6IFN0cmluZywgZmllbGRfc2l6ZTogbnVtYmVyKTogbnVtYmVyW117XG4gICAgICAgIGxldCByZXMgOiBudW1iZXJbXSA9IFtdO1xuXG4gICAgICAgIGZvcihsZXQgaSA9IDA7IGkgPCBmaWVsZF9zaXplOyArK2kpe1xuICAgICAgICAgICAgcmVzW2ldID0gKGkgPj0gc3RyLmxlbmd0aCkgPyAweDIwIDogc3RyLmNoYXJDb2RlQXQoaSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cblxuICAgIHN0YXRpYyBjb252ZXJ0VG9IZXgobnVtOiBudW1iZXIsIGZpZWxkX3NpemU6IG51bWJlcikgOiBudW1iZXJbXXtcbiAgICAgICAgbGV0IHJlcyA6IG51bWJlcltdID0gW107XG5cbiAgICAgICAgZm9yKGxldCBpID0gMDsgaSA8IGZpZWxkX3NpemU7ICsraSl7XG4gICAgICAgICAgICBsZXQgc2hpZnQgPSA4ICogaTtcbiAgICAgICAgICAgIHJlc1tpXSA9ICggbnVtID4+IHNoaWZ0ICkgJiAweDAwRkZcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxufSIsImltcG9ydCB7IEZhdEJQQiB9IGZyb20gXCIuL2ZhdF9CUEJcIjtcbmltcG9ydCB7IEZhdFV0aWxzIH0gZnJvbSBcIi4vZmF0X2NvbW1vblwiO1xuaW1wb3J0IHsgRmF0VGFibGUgfSBmcm9tIFwiLi9mYXRfdGFibGVcIjtcblxuY2xhc3MgU2VjdG9yIHtcbiAgICBkYXRhOiBVaW50OEFycmF5O1xuXG4gICAgY29uc3RydWN0b3Ioc2VjdG9yX3NpemU6IG51bWJlcil7XG4gICAgICAgIHRoaXMuZGF0YSA9IG5ldyBVaW50OEFycmF5KHNlY3Rvcl9zaXplKTtcblxuICAgICAgICB0aGlzLmVyYXNlKCk7XG4gICAgfVxuXG4gICAgZXJhc2UoKXtcbiAgICAgICAgdGhpcy5kYXRhLmZpbGwoMHhGRik7XG4gICAgfVxuXG4gICAgc2V0KHNvdXJjZTogVWludDhBcnJheSl7XG4gICAgICAgIGZvciggbGV0IGkgPSAwOyBpIDwgdGhpcy5kYXRhLmxlbmd0aDsgaSsrICl7XG4gICAgICAgICAgICB0aGlzLmRhdGFbaV0gPSAoaSA+PSBzb3VyY2UubGVuZ3RoKSA/IDB4MDAgOiBzb3VyY2VbaV07XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5jbGFzcyBGYXRSb290RGlyZWN0b3J5X0ZpbGV7XG4gICAgZmlsZW5hbWU6IHN0cmluZyA9IFwiXCI7XG4gICAgZXh0ZW5zaW9uOiBzdHJpbmcgPSBcIlwiO1xuICAgIGF0dHJpYnV0ZTogRmlsZUF0dHJpYnV0ZSA9IDB4MDA7XG4gICAgY3JlYXRlX21zOiBudW1iZXIgPSAwO1xuICAgIGNyZWF0ZV90aW1lOiBudW1iZXIgPSAwO1xuICAgIGNyZWF0ZV9kYXRlOiBudW1iZXIgPSAwO1xuICAgIGxhc3RfYWNjZXNzX2RhdGU6IG51bWJlciA9IDA7XG4gICAgbW9kaWZpY2F0aW9uX3RpbWU6IG51bWJlciA9IDA7XG4gICAgbW9kaWZpY2F0aW9uX2RhdGU6IG51bWJlciA9IDA7XG4gICAgY2x1c3Rlcl9udW1iZXI6IG51bWJlciA9IDA7XG4gICAgZmlsZV9zaXplOiBudW1iZXIgPSAwO1xuXG4gICAgY29uc3RydWN0b3IoKXt9XG5cbiAgICBnZW5lcmF0ZV9maWxlKCkgOiBudW1iZXJbXSB7XG4gICAgICAgIHJldHVybiAgICAgICAgICBGYXRVdGlscy5jb252ZXJ0U3RyaW5nKHRoaXMuZmlsZW5hbWUsIDgpXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0U3RyaW5nKHRoaXMuZXh0ZW5zaW9uLCAzKSlcbiAgICAgICAgICAgICAgICAuY29uY2F0KEZhdFV0aWxzLmNvbnZlcnRUb0hleCh0aGlzLmF0dHJpYnV0ZSwgMSkpXG4gICAgICAgICAgICAgICAgLmNvbmNhdChbMHgwMF0pXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0VG9IZXgoTWF0aC5mbG9vcih0aGlzLmNyZWF0ZV9tcy8xMCksIDEpKVxuICAgICAgICAgICAgICAgIC5jb25jYXQoRmF0VXRpbHMuY29udmVydFRvSGV4KHRoaXMuY3JlYXRlX3RpbWUsIDIpKVxuICAgICAgICAgICAgICAgIC5jb25jYXQoRmF0VXRpbHMuY29udmVydFRvSGV4KHRoaXMuY3JlYXRlX2RhdGUsIDIpKVxuICAgICAgICAgICAgICAgIC5jb25jYXQoRmF0VXRpbHMuY29udmVydFRvSGV4KHRoaXMubGFzdF9hY2Nlc3NfZGF0ZSwgMikpXG4gICAgICAgICAgICAgICAgLmNvbmNhdChbMHgwMCwgMHgwMF0pXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0VG9IZXgodGhpcy5tb2RpZmljYXRpb25fdGltZSwgMikpXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0VG9IZXgodGhpcy5tb2RpZmljYXRpb25fZGF0ZSwgMikpXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0VG9IZXgodGhpcy5jbHVzdGVyX251bWJlciwgMikpXG4gICAgICAgICAgICAgICAgLmNvbmNhdChGYXRVdGlscy5jb252ZXJ0VG9IZXgodGhpcy5maWxlX3NpemUsIDQpKTtcbiAgICB9XG59O1xuXG5leHBvcnQgZW51bSBGaWxlQXR0cmlidXRlIHtcbiAgICBSRUFET05MWSA9IDB4MDEsXG4gICAgSElEREVOID0gMHgwMixcbiAgICBTWVNURU0gPSAweDAzLFxuICAgIFZPTFVNRV9OQU1FID0gMHgwOCxcbiAgICBTVUJESVJFQ1RPUlkgPSAweDEwLFxuICAgIEFSQ0hJVkUgPSAweDIwLFxuICAgIERFVklDRSA9IDB4NDAsXG4gICAgUkVTRVJWRUQgPSAweDgwXG59O1xuXG4vLyAhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISFcbi8vICEhISAgIFRISVMgQ0xBU1MgT05MWSBXT1JLUyBGT1IgMSBTRUNUT1IgUEVSIENMVVNURVIgICEhIVxuLy8gISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhXG5leHBvcnQgY2xhc3MgRmF0Um9vdERpcmVjdG9yeXtcblxuICAgIHN0YXRpYyByZWFkb25seSBGSUxFX05PVF9TRVQgPSBbIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAgXTtcblxuICAgIHByaXZhdGUgc2VjdG9yX3NpemU6IG51bWJlcjtcbiAgICBwcml2YXRlIGZpbGVzOiAobnVsbCB8IEZhdFJvb3REaXJlY3RvcnlfRmlsZSlbXTtcbiAgICBwcml2YXRlIHNlY3RvcnM6IFNlY3RvcltdXG4gICAgcHJpdmF0ZSBmYXRfdGFibGU6IEZhdFRhYmxlO1xuICAgIHByaXZhdGUgYmlnZ2VzdF9jbHVzdGVyX3VzZTogbnVtYmVyO1xuXG4gICAgY29uc3RydWN0b3IoYnBiOiBGYXRCUEIsIGZhdF90YWJsZTogRmF0VGFibGUsIHZvbHVtZV9uYW1lOiBzdHJpbmcpe1xuICAgICAgICB0aGlzLnNlY3Rvcl9zaXplID0gYnBiLnNlY3Rvcl9zaXplO1xuICAgICAgICB0aGlzLmZhdF90YWJsZSA9IGZhdF90YWJsZTtcbiAgICAgICAgdGhpcy5maWxlcyA9IG5ldyBBcnJheShicGIucm9vdF9kaXJfc2l6ZSk7XG4gICAgICAgIHRoaXMuc2VjdG9ycyA9IG5ldyBBcnJheSggTWF0aC5mbG9vciggKCAoYnBiLnRvdGFsX3NlY3RvcnMgKiBicGIuc2VjdG9yX3NpemUpIC0gNTEyIC0gZmF0X3RhYmxlLmdldFNpemUoKSAtIChicGIucm9vdF9kaXJfc2l6ZSAqIDMyKSApIC8gYnBiLnNlY3Rvcl9zaXplICkgKTsgLy8gdG90YWwgZGF0YSBzZWN0b3Igc2l6ZSAob2N0ZXRzKSA9IFRvdGFsX3NpemUgLSBib290X3NlY3RvciAtIEZBVF9UYWJsZSAtIFJvb3REaXJlY3RvcnlcblxuICAgICAgICBmb3IoIGxldCBpID0gMDsgaSA8IHRoaXMuZmlsZXMubGVuZ3RoOyArK2kpe1xuICAgICAgICAgICAgdGhpcy5maWxlc1tpXSA9IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IoIGxldCBpID0gMDsgaSA8IHRoaXMuc2VjdG9ycy5sZW5ndGg7ICsraSApe1xuICAgICAgICAgICAgdGhpcy5zZWN0b3JzW2ldID0gbmV3IFNlY3Rvcih0aGlzLnNlY3Rvcl9zaXplKTtcbiAgICAgICAgfVxuXG4gICAgICAgIFxuICAgICAgICBsZXQgZmlsZSA9IG5ldyBGYXRSb290RGlyZWN0b3J5X0ZpbGUoKTtcblxuICAgICAgICBmaWxlLmZpbGVuYW1lID0gdm9sdW1lX25hbWU7XG4gICAgICAgIGZpbGUuYXR0cmlidXRlID0gRmlsZUF0dHJpYnV0ZS5WT0xVTUVfTkFNRTtcblxuICAgICAgICB0aGlzLmZpbGVzWzBdID0gZmlsZTtcbiAgICAgICAgdGhpcy5iaWdnZXN0X2NsdXN0ZXJfdXNlID0gMDtcbiAgICB9XG5cbiAgICBhZGRGaWxlKGZpbGVuYW1lOiBzdHJpbmcsIGV4dGVuc2lvbjogc3RyaW5nLCBhdHRyaWJ1dGU6IEZpbGVBdHRyaWJ1dGUsIGNvbnRlbnQ6IFVpbnQ4QXJyYXkpe1xuICAgICAgICBsZXQgZmlsZSA9IG5ldyBGYXRSb290RGlyZWN0b3J5X0ZpbGUoKTtcbiAgICAgICAgbGV0IGRhdGUgPSBuZXcgRGF0ZSgpO1xuICAgICAgICBsZXQgbmJfY2x1c3RlciA9IE1hdGguY2VpbCggY29udGVudC5sZW5ndGggLyB0aGlzLnNlY3Rvcl9zaXplICk7XG5cbiAgICAgICAgZmlsZS5maWxlbmFtZSA9IGZpbGVuYW1lO1xuICAgICAgICBmaWxlLmV4dGVuc2lvbiA9IGV4dGVuc2lvbjtcbiAgICAgICAgZmlsZS5hdHRyaWJ1dGUgPSBhdHRyaWJ1dGU7XG4gICAgICAgIGZpbGUuY3JlYXRlX21zID0gZGF0ZS5nZXRNaWxsaXNlY29uZHMoKTtcbiAgICAgICAgZmlsZS5jcmVhdGVfdGltZSA9IHRoaXMudGltZUZpZWxkKGRhdGUpO1xuICAgICAgICBmaWxlLmNyZWF0ZV9kYXRlID0gdGhpcy5kYXRlRmllbGQoZGF0ZSk7XG4gICAgICAgIGZpbGUubGFzdF9hY2Nlc3NfZGF0ZSA9IHRoaXMuZGF0ZUZpZWxkKGRhdGUpO1xuICAgICAgICBmaWxlLm1vZGlmaWNhdGlvbl90aW1lID0gdGhpcy50aW1lRmllbGQoZGF0ZSk7XG4gICAgICAgIGZpbGUubW9kaWZpY2F0aW9uX2RhdGUgPSB0aGlzLmRhdGVGaWVsZChkYXRlKTtcbiAgICAgICAgZmlsZS5jbHVzdGVyX251bWJlciA9IHRoaXMuZmF0X3RhYmxlLmZpbmRfZnJlZV9jbHVzdGVyKCk7XG4gICAgICAgIGZpbGUuZmlsZV9zaXplID0gY29udGVudC5sZW5ndGg7XG5cblxuICAgICAgICBsZXQgbmV4dF9jbHVzdGVyID0gZmlsZS5jbHVzdGVyX251bWJlcjtcbiAgICAgICAgbGV0IGNsdXN0ZXIgPSAwO1xuXG4gICAgICAgIGZvciggbGV0IGkgPSAwOyBpIDwgbmJfY2x1c3RlcjsgaSsrICl7XG5cbiAgICAgICAgICAgIGNsdXN0ZXIgPSBuZXh0X2NsdXN0ZXI7XG5cbiAgICAgICAgICAgIGlmKCBjbHVzdGVyID4gdGhpcy5iaWdnZXN0X2NsdXN0ZXJfdXNlICkgdGhpcy5iaWdnZXN0X2NsdXN0ZXJfdXNlID0gY2x1c3RlcjtcblxuICAgICAgICAgICAgdGhpcy5zZWN0b3JzWyBjbHVzdGVyIC0gMiBdLnNldCggY29udGVudC5zbGljZSggaSAqIHRoaXMuc2VjdG9yX3NpemUsIGkgKiB0aGlzLnNlY3Rvcl9zaXplICsgdGhpcy5zZWN0b3Jfc2l6ZSApICk7XG5cblxuICAgICAgICAgICAgbmV4dF9jbHVzdGVyID0gdGhpcy5mYXRfdGFibGUuZmluZF9mcmVlX2NsdXN0ZXIoY2x1c3Rlcik7XG4gICAgICAgICAgICB0aGlzLmZhdF90YWJsZS5zZXRfbmV4dF9jbHVzdGVyKGNsdXN0ZXIsIG5leHRfY2x1c3Rlcik7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmZhdF90YWJsZS5zZXRfbmV4dF9jbHVzdGVyKGNsdXN0ZXIsIEZhdFRhYmxlLkVORF9PRl9GSUxFKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuZmlsZXNbdGhpcy5nZXRBdmFpbGFibGVGaWxlSW5kZXgoKV0gPSBmaWxlO1xuXG4gICAgfVxuXG4gICAgZ2VuZXJhdGVSb290RGlyZWN0b3J5KCkgOiBudW1iZXJbXXtcbiAgICAgICAgbGV0IHJlc3VsdDogbnVtYmVyW10gPSBbXTtcblxuXG4gICAgICAgIHRoaXMuZmlsZXMuZm9yRWFjaCggKGZpbGUpID0+IHtcbiAgICAgICAgICAgIGlmKCBmaWxlID09IG51bGwgKXtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSByZXN1bHQuY29uY2F0KCBGYXRSb290RGlyZWN0b3J5LkZJTEVfTk9UX1NFVCApXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IHJlc3VsdC5jb25jYXQoIGZpbGUuZ2VuZXJhdGVfZmlsZSgpICk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGZvcihsZXQgaSA9IDA7IGkgPCB0aGlzLnNlY3RvcnMubGVuZ3RoICYmIGkgPCB0aGlzLmJpZ2dlc3RfY2x1c3Rlcl91c2U7ICsraSApe1xuXG4gICAgICAgICAgICByZXN1bHQgPSByZXN1bHQuY29uY2F0KCBBcnJheS5mcm9tKHRoaXMuc2VjdG9yc1tpXS5kYXRhKSApO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICBwcml2YXRlIGdldEF2YWlsYWJsZUZpbGVJbmRleCgpIDogbnVtYmVye1xuICAgICAgICBmb3IobGV0IGkgPSAwOyBpIDwgdGhpcy5maWxlcy5sZW5ndGg7ICsraSl7XG4gICAgICAgICAgICBpZiggdGhpcy5maWxlc1tpXSA9PSBudWxsICl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gLTE7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBkYXRlRmllbGQoZGF0ZTogRGF0ZSkgOiBudW1iZXJ7XG4gICAgICAgIGxldCByZXM6IG51bWJlciA9IDB4MDAwMDtcblxuICAgICAgICByZXMgID0gKGRhdGUuZ2V0RnVsbFllYXIoKSAmIDB4N0YpIDw8IDk7XG4gICAgICAgIHJlcyArPSAoZGF0ZS5nZXRNb250aCgpICYgMHgwRikgPDwgNTtcbiAgICAgICAgcmVzICs9IGRhdGUuZ2V0RGF5KCkgJiAweDFGO1xuXG4gICAgICAgIHJldHVybiByZXM7XG4gICAgICAgIFxuICAgIH1cblxuICAgIHByaXZhdGUgdGltZUZpZWxkKGRhdGU6IERhdGUpIDogbnVtYmVye1xuICAgICAgICBsZXQgcmVzOiBudW1iZXIgPSAweDAwMDA7XG5cbiAgICAgICAgcmVzICA9IChkYXRlLmdldEhvdXJzKCkgJiAweDFGKSA8PCAxMTtcbiAgICAgICAgcmVzICs9IChkYXRlLmdldE1pbnV0ZXMoKSAmIDB4M0YpIDw8IDU7XG4gICAgICAgIHJlcyArPSBNYXRoLmZsb29yKGRhdGUuZ2V0U2Vjb25kcygpIC8gMikgJiAweDFGO1xuXG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxufSIsImltcG9ydCB7IEZhdEJQQiB9IGZyb20gXCIuL2ZhdF9CUEJcIjtcblxuZXhwb3J0IGNsYXNzIEZhdFRhYmxlIHtcblxuICAgIHN0YXRpYyBFTkRfT0ZfRklMRSA6IG51bWJlciA9IDB4RkZGO1xuICAgIHN0YXRpYyBCQURfQ0xVU1RFUiA6IG51bWJlciA9IDB4RkY3O1xuXG4gICAgcHJpdmF0ZSB0YWJsZSA6IFVpbnQxNkFycmF5O1xuICAgIHByaXZhdGUgc2l6ZTogbnVtYmVyO1xuXG4gICAgY29uc3RydWN0b3IoIGJwYjogRmF0QlBCICl7XG4gICAgICAgIHRoaXMuc2l6ZSA9IE1hdGguZmxvb3IoICggYnBiLmZhdF9zaXplICogYnBiLnNlY3Rvcl9zaXplICkgLyAxLjUpOyAvLyAvIDEuNSBiZWNhdXNlIHdlIGFyZSB1c2luZyBGQVQxMlxuICAgICAgICB0aGlzLnRhYmxlID0gbmV3IFVpbnQxNkFycmF5KCB0aGlzLnNpemUgKTsgICAgXG4gICAgICAgIFxuICAgICAgICAvLyBNYWdpY2sgbnVtYmVyXG4gICAgICAgIHRoaXMudGFibGVbMF0gPSBicGIuZGlza190eXBlIHwgMHhGMDA7XG5cbiAgICAgICAgLy8gUmVzZXJ2ZWQgY2x1c3RlclxuICAgICAgICB0aGlzLnRhYmxlWzFdID0gMHhGRkY7XG4gICAgXG4gICAgICAgIGZvciggbGV0IGkgPSAyOyBpIDwgdGhpcy50YWJsZS5sZW5ndGg7ICsraSApe1xuICAgICAgICAgICAgdGhpcy50YWJsZVtpXSA9IDB4MDAwOyAgIC8vU2V0IGNsdXN0ZXIgYXMgYXZhaWxhYmxlXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzZXRfbmV4dF9jbHVzdGVyKGNsdXN0ZXI6IG51bWJlciwgbmV4dDogbnVtYmVyKXtcbiAgICAgICAgaWYoIGNsdXN0ZXIgPj0gdGhpcy50YWJsZS5sZW5ndGggKXtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMudGFibGVbY2x1c3Rlcl0gPSAobmV4dCA+PSB0aGlzLnRhYmxlLmxlbmd0aCAmJiBuZXh0ICE9IEZhdFRhYmxlLkVORF9PRl9GSUxFKSA/IEZhdFRhYmxlLkJBRF9DTFVTVEVSIDogKG5leHQgJiAweEZGRik7XG4gICAgfVxuXG4gICAgZmluZF9mcmVlX2NsdXN0ZXIoZXhjZXB0OiBudW1iZXIgPSAtMSk6IG51bWJlcntcbiAgICAgICAgZm9yKCBsZXQgaSA9IDI7IGkgPCB0aGlzLnRhYmxlLmxlbmd0aCA7ICsraSl7XG4gICAgICAgICAgICBpZiggdGhpcy50YWJsZVtpXSA9PSAweDAwMCAmJiBpICE9IGV4Y2VwdCl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gLTE7XG4gICAgfVxuXG4gICAgZ2VuZXJhdGVUYWJsZSgpIDogbnVtYmVyW117XG4gICAgICAgIC8qXG4gICAgICAgICAgICB0d28gMTIgYml0cyBudW1iZXJzIDogMHhBQkMgYW5kIDB4WFlaXG4gICAgICAgICAgICBjb25jYXRlbmF0IGluIDI0IGJpdHMgbnVtYmVyOiAweEFCQ1hZWlxuICAgICAgICAgICAgc2hvdWxkIGJlIHN0b3JlZCBsaWtlIHRoaXMgOiBCQyBaQSBYWVxuICAgICAgICAqL1xuXG4gICAgICAgIGxldCByZXN1bHQ6IG51bWJlcltdID0gW107XG5cbiAgICAgICAgZm9yKCBsZXQgaSA9IDA7IGkgPCB0aGlzLnRhYmxlLmxlbmd0aDsgaSArPSAyICl7XG4gICAgICAgICAgICBsZXQgdG1wID0gMDtcblxuICAgICAgICAgICAgdG1wID0gKHRoaXMudGFibGVbaV0gJiAweDBGRkYpIDw8IDEyO1xuICAgICAgICAgICAgdG1wIHw9IHRoaXMudGFibGVbaSsxXSAmIDB4MEZGRjtcblxuICAgICAgICAgICAgcmVzdWx0LnB1c2goICAodG1wICYgMHgwRkYwMDApID4+IDEyICApOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQkNcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKCAoKHRtcCAmIDB4RjAwMDAwKSA+PiAyMCkgfCAoKHRtcCAmIDB4MDAwMDBGKSA8PCA0KSApOyAgIC8vIFpBID0gKEEgPj4gNDApICsgKFogPDwgOClcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKCAgKHRtcCAmIDB4MDAwRkYwKSA+PiA0ICk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFhZXG4gICAgICAgIH1cblxuICAgICAgICByZXN1bHQucG9wKCk7ICAgLy8gVGhlIGxhc3QgZWxlbWVudCBpcyBpbmNvbXBsZXQsIHNvIHdlIHJlbW92aW5nIGl0XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICBnZXRTaXplKCkgOiBudW1iZXJ7XG4gICAgICAgIHJldHVybiB0aGlzLnNpemU7XG4gICAgfVxuXG59IiwiZXhwb3J0IGVudW0gUHJvZ3Jlc3NNZXNzYWdlVHlwZSB7XG4gICAgSU5GTyA9IFwiaW5mb1wiLFxuICAgIFdBUk5JTkcgPSBcIndhcm5pbmdcIixcbiAgICBFUlJPUiA9IFwiZXJyb3JcIlxufTtcblxuZXhwb3J0IGNsYXNzIFByb2dyZXNzRGlhbG9ne1xuXG4gICAgcHJpdmF0ZSBkaWFsb2c6IEhUTUxFbGVtZW50O1xuICAgIHByaXZhdGUgcHJvZ3Jlc3NfYmFyX2RpdjogSFRNTEVsZW1lbnQ7XG5cbiAgICBjb25zdHJ1Y3Rvcih0aXRsZTogc3RyaW5nID0gXCJVcGxvYWRpbmcuLi5cIiwgdGV4dDogc3RyaW5nID0gXCJZb3VyIHByb2dyYW0gaXMgdXBsb2FkaW5nIHRvIHlvdXIgdGFyZ2V0LCBwbGVhc2Ugd2FpdC48YnIvPjxici8+PGk+RG8gbm90IHVucGx1Z2dlZCB5b3VyIGJvYXJkLCBkbyBub3QgY2xvc2UgdGhpcyB0YWIgbm9yIGNoYW5nZSB0YWIgZHVyaW5nIHVwbG9hZGluZy48L2k+XCIpe1xuICAgICAgICB0aGlzLmRpYWxvZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgIHRoaXMuZGlhbG9nLmNsYXNzTGlzdC5hZGQoXCJwcm9ncmVzcy1kaWFsb2dcIik7XG4gICAgICAgIHRoaXMuZGlhbG9nLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcblxuICAgICAgICBsZXQgY29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgY29udGFpbmVyLmNsYXNzTGlzdC5hZGQoXCJwcm9ncmVzcy1kaWFsb2ctY29udGFpbmVyXCIpXG5cbiAgICAgICAgbGV0IHRpdGxlX2VsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgdGl0bGVfZWwuY2xhc3NMaXN0LmFkZChcInByb2dyZXNzLWRpYWxvZy10aXRsZVwiKTtcbiAgICAgICAgdGl0bGVfZWwuaW5uZXJUZXh0ID0gdGl0bGU7XG5cbiAgICAgICAgbGV0IGNvbnRlbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICBjb250ZW50LmNsYXNzTGlzdC5hZGQoXCJwcm9ncmVzcy1kaWFsb2ctY29udGVudFwiKTtcblxuICAgICAgICBsZXQgdGV4dF9lbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJwXCIpO1xuICAgICAgICB0ZXh0X2VsLmlubmVySFRNTCA9IHRleHQ7XG5cbiAgICAgICAgbGV0IGNsb3NlX2J1dHRvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJidXR0b25cIik7XG4gICAgICAgIGNsb3NlX2J1dHRvbi5jbGFzc0xpc3QuYWRkKFwicHJvZ3Jlc3MtZGlhbG9nLWNsb3NlLWJ1dHRvblwiKTtcbiAgICAgICAgY2xvc2VfYnV0dG9uLmlubmVyVGV4dCA9IFwiQ2xvc2VcIjtcbiAgICAgICAgY2xvc2VfYnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoIFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5jbG9zZSgpICk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLnByb2dyZXNzX2Jhcl9kaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICB0aGlzLnByb2dyZXNzX2Jhcl9kaXYuY2xhc3NMaXN0LmFkZChcInByb2dyZXNzLWRpYWxvZy1iYXItY29udGFpbmVyXCIpXG5cbiAgICAgICAgbGV0IHZhbHVlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInBcIik7XG4gICAgICAgIHZhbHVlLmNsYXNzTGlzdC5hZGQoXCJwcm9ncmVzcy1kaWFsb2ctYmFyLXZhbHVlXCIpO1xuXG4gICAgICAgIGxldCBiYXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICBiYXIuY2xhc3NMaXN0LmFkZChcInByb2dyZXNzLWRpYWxvZy1iYXItY3Vyc29yXCIpO1xuXG4gICAgICAgIHRoaXMucHJvZ3Jlc3NfYmFyX2Rpdi5hcHBlbmQodmFsdWUpO1xuICAgICAgICB0aGlzLnByb2dyZXNzX2Jhcl9kaXYuYXBwZW5kKGJhcik7XG5cbiAgICAgICAgbGV0IGluZm9zID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgaW5mb3MuY2xhc3NMaXN0LmFkZChcInByb2dyZXNzLWRpYWxvZy1pbmZvc1wiKTtcblxuXG4gICAgICAgIGNvbnRlbnQuYXBwZW5kKHRleHRfZWwpO1xuICAgICAgICBjb250ZW50LmFwcGVuZCh0aGlzLnByb2dyZXNzX2Jhcl9kaXYpO1xuICAgICAgICBjb250ZW50LmFwcGVuZChcIlN0YXR1czpcIik7XG4gICAgICAgIGNvbnRlbnQuYXBwZW5kKGluZm9zKTtcbiAgICAgICAgY29udGVudC5hcHBlbmQoY2xvc2VfYnV0dG9uKTtcblxuICAgICAgICBjb250YWluZXIuYXBwZW5kKHRpdGxlX2VsKTtcbiAgICAgICAgY29udGFpbmVyLmFwcGVuZChjb250ZW50KTtcblxuICAgICAgICB0aGlzLmRpYWxvZy5hcHBlbmQoY29udGFpbmVyKTtcblxuICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZCh0aGlzLmRpYWxvZyk7XG4gICAgfVxuXG4gICAgc2hvd0Nsb3NlQnV0dG9uKCl7XG4gICAgICAgICh0aGlzLmRpYWxvZy5xdWVyeVNlbGVjdG9yKFwiLnByb2dyZXNzLWRpYWxvZy1jbG9zZS1idXR0b25cIikgYXMgSFRNTEVsZW1lbnQpLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XG4gICAgfVxuXG4gICAgc2V0UHJvZ3Jlc3NWYWx1ZShwcm9ncmVzczogbnVtYmVyKXtcbiAgICAgICAgKHRoaXMuZGlhbG9nLnF1ZXJ5U2VsZWN0b3IoXCIucHJvZ3Jlc3MtZGlhbG9nLWJhci12YWx1ZVwiKSBhcyBIVE1MRWxlbWVudCkuaW5uZXJIVE1MID0gTWF0aC5yb3VuZChwcm9ncmVzcykgKyBcIiVcIjtcbiAgICAgICAgKHRoaXMuZGlhbG9nLnF1ZXJ5U2VsZWN0b3IoXCIucHJvZ3Jlc3MtZGlhbG9nLWJhci1jdXJzb3JcIikgYXMgSFRNTEVsZW1lbnQpLnN0eWxlLndpZHRoID0gcHJvZ3Jlc3MgKyBcIiVcIjtcbiAgICB9XG5cbiAgICBhZGRJbmZvKGxpbmU6IHN0cmluZywgdHlwZTogUHJvZ3Jlc3NNZXNzYWdlVHlwZSA9IFByb2dyZXNzTWVzc2FnZVR5cGUuSU5GTyl7XG4gICAgICAgICh0aGlzLmRpYWxvZy5xdWVyeVNlbGVjdG9yKFwiLnByb2dyZXNzLWRpYWxvZy1pbmZvc1wiKSBhcyBIVE1MRWxlbWVudCkuaW5uZXJIVE1MICs9IGA8c3BhbiBjbGFzcz1cIiR7dHlwZX1cIj4ke2xpbmV9PC9zcGFuPjxici8+YDtcbiAgICB9XG5cbiAgICBvcGVuKCl7XG4gICAgICAgIHRoaXMuZGlhbG9nLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XG5cbiAgICAgICAgdGhpcy5zZXRQcm9ncmVzc1ZhbHVlKDApO1xuICAgICAgICAodGhpcy5kaWFsb2cucXVlcnlTZWxlY3RvcihcIi5wcm9ncmVzcy1kaWFsb2ctY2xvc2UtYnV0dG9uXCIpIGFzIEhUTUxFbGVtZW50KS5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XG4gICAgICAgICh0aGlzLmRpYWxvZy5xdWVyeVNlbGVjdG9yKFwiLnByb2dyZXNzLWRpYWxvZy1pbmZvc1wiKSBhcyBIVE1MRWxlbWVudCkuaW5uZXJIVE1MID0gXCJcIjtcbiAgICB9XG5cbiAgICBjbG9zZSgpe1xuICAgICAgICB0aGlzLmRpYWxvZy5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XG4gICAgfVxufTsiLCJleHBvcnQgY2xhc3MgU2VyaWFsT3V0cHV0IHtcblxuICAgIHByaXZhdGUgb3V0cHV0IDogSFRNTEVsZW1lbnQ7XG5cbiAgICBjb25zdHJ1Y3RvcihwYXJlbnQ6IEhUTUxFbGVtZW50KXtcbiAgICAgICAgdGhpcy5vdXRwdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICB0aGlzLm91dHB1dC5jbGFzc0xpc3QuYWRkKFwic2VyaWFsX291dHB1dFwiKTtcblxuICAgICAgICBwYXJlbnQuYXBwZW5kKHRoaXMub3V0cHV0KTtcbiAgICB9XG5cbiAgICB3cml0ZShzdHI6IHN0cmluZyl7XG4gICAgICAgIC8vdGhpcy5vdXRwdXQuaW5uZXJUZXh0ICs9IGBbJHt0aGlzLmdlbmVyYXRlX3RpbWVfcHJlZml4KCl9XSAke3N0cn1gO1xuICAgICAgICB0aGlzLm91dHB1dC5pbm5lclRleHQgKz0gc3RyO1xuICAgICAgICB0aGlzLm91dHB1dC5zY3JvbGxUb3AgPSB0aGlzLm91dHB1dC5zY3JvbGxIZWlnaHQ7XG4gICAgfVxuXG4gICAgY2xlYXIoKXtcbiAgICAgICAgdGhpcy5vdXRwdXQuaW5uZXJUZXh0ID0gXCJcIjtcbiAgICB9XG5cbiAgICAvLyBnZW5lcmF0ZV90aW1lX3ByZWZpeCgpe1xuICAgIC8vICAgICB2YXIgZCA9IG5ldyBEYXRlKCk7XG4gICAgLy8gICAgIHJldHVybiBgJHt0aGlzLnplcm9fcGFkZGluZyhkLmdldEhvdXJzKCksIDIpfToke3RoaXMuemVyb19wYWRkaW5nKGQuZ2V0TWludXRlcygpLCAyKX06JHt0aGlzLnplcm9fcGFkZGluZyhkLmdldFNlY29uZHMoKSwgMil9LiR7dGhpcy56ZXJvX3BhZGRpbmcoZC5nZXRNaWxsaXNlY29uZHMoKSwgMyl9YDtcbiAgICAvLyB9XG5cbiAgICAvLyB6ZXJvX3BhZGRpbmcobnVtOiBudW1iZXIsIG5iX3plcm9zOiBudW1iZXIpe1xuICAgIC8vICAgICBsZXQgcyA9IG51bS50b1N0cmluZygpO1xuXG4gICAgLy8gICAgIHJldHVybiBgJHtcIjBcIi5yZXBlYXQoTWF0aC5tYXgoMCwgbmJfemVyb3MgLSBzLmxlbmd0aCkpfSR7c31gO1xuICAgIC8vIH1cbn0iXX0=
