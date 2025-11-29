// jest.polyfills.js
const { TextDecoder, TextEncoder } = require('util');

Object.assign(global, { TextDecoder, TextEncoder });

// Mock BigInt for older Node.js versions
if (typeof BigInt === 'undefined') {
  global.BigInt = require('big-integer');
}