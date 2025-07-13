/**
 * Script to clear all pool data from localStorage
 * Run this in the browser console to remove any cached pools
 */

// Clear pool tracker storage
localStorage.removeItem('blitz_created_pools');

// Clear any pool cache
localStorage.removeItem('pool_cache');

// Clear any other pool-related storage
const keysToRemove = [];
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && (key.includes('pool') || key.includes('Pool'))) {
    keysToRemove.push(key);
  }
}

keysToRemove.forEach(key => {
  localStorage.removeItem(key);
  console.log(`Removed: ${key}`);
});

// Dispatch event to clear runtime caches
window.dispatchEvent(new Event('pool-cache-refresh'));

console.log('✅ All pool data cleared successfully!');
console.log('Please refresh the page to see the changes.');