// Run this in your browser console to clear all pool data

// Clear pool tracker storage
localStorage.removeItem('blitz_created_pools');

// Clear any pool cache
localStorage.removeItem('pool_cache');

// Clear window flag
if (window.poolsCleared) {
  delete window.poolsCleared;
}

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
console.log('The page will now reload...');

// Reload the page after a short delay
setTimeout(() => {
  location.reload();
}, 1000);