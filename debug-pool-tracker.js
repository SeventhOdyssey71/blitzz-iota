// Debug script to check pool tracking
const { PoolTracker } = require('./lib/services/pool-tracker');

// Mock window and localStorage for node environment
global.window = {};
global.localStorage = {
  getItem: (key) => {
    console.log('Getting key:', key);
    // Return some test data
    return JSON.stringify([{
      poolId: '0xtest123',
      coinTypeA: '0x2::iota::IOTA',
      coinTypeB: '0xabcd::stiota::StIota',
      createdAt: Date.now()
    }]);
  },
  setItem: (key, value) => {
    console.log('Setting key:', key, 'value:', value);
  }
};

// Test the pool tracker
console.log('Testing PoolTracker...');
const pools = PoolTracker.getPools();
console.log('Current pools:', pools);

const found = PoolTracker.findPool('0x2::iota::IOTA', '0xabcd::stiota::StIota');
console.log('Found pool:', found);
EOF < /dev/null