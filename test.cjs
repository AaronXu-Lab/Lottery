const assert = require('node:assert/strict');
const { choose } = require('./code.js');
const original = Array.from({ length: 36 }, (_, i) => i);
for (let count = 1; count <= 36; count++) {
  for (let run = 0; run < 100; run++) {
    const winners = choose(original, count);
    assert.equal(winners.length, count);
    assert.equal(new Set(winners).size, count);
    assert.ok(winners.every(value => original.includes(value)));
  }
}
assert.deepEqual(original, Array.from({ length: 36 }, (_, i) => i));
let pool = original.slice();
const selected = [];
for (const count of [2, 1, 2, 31]) {
  const winners = choose(pool, count);
  selected.push(...winners);
  pool = pool.filter(value => !winners.includes(value));
}
assert.equal(pool.length, 0);
assert.equal(new Set(selected).size, 36);
assert.deepEqual(choose([1, 2, 3], 2, () => 0), [1, 2]);
assert.deepEqual(choose([1, 2, 3], 1, () => 0.999), [3]);
console.log('Passed: 3,600 draws, unique winners, unchanged input, and non-repeating rounds.');
