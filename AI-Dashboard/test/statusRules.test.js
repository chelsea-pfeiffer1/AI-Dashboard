const assert = require('node:assert/strict');
const { isActiveStatus, isBlockedStatus, isDoneStatus } = require('../src/statusRules');

assert.equal(isDoneStatus('Ready for Release'), true);
assert.equal(isDoneStatus('Abandoned'), true);
assert.equal(isDoneStatus('Done'), true);
assert.equal(isDoneStatus('In Progress'), false);
assert.equal(isBlockedStatus('Blocked'), true);
assert.equal(isBlockedStatus('Ready for Release'), false);
assert.equal(isActiveStatus('In Progress'), true);
assert.equal(isActiveStatus('Ready for Release'), false);

console.log('statusRules tests passed');
