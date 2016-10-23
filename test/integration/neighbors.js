var rewire = require('rewire');
var Agent = rewire('../../src/agents');
var assert = require('assert');
var sinon = require('sinon');
var stringify = require('../../src/stringify'); // TODO: do this via rewire as well (but not urgent, current approach works fine too)

describe('one IOU sent', function() {
  var agents = {
    alice: new Agent('alice'),
    bob: new Agent('bob'),
  };
  it('should update search neighbors', function() {
    return agents.alice.sendIOU('bob', 0.01, 'USD').then(() => {
      // TODO: not access private vars here
      assert.deepEqual(agents.alice._search._inNeighbors, { '["bob","USD"]': {} });
      assert.deepEqual(agents.alice._search._outNeighbors, {});
      assert.deepEqual(agents.bob._search._inNeighbors, {});
      assert.deepEqual(agents.bob._search._outNeighbors, { '["alice","USD"]': {} });

      return agents.bob.sendIOU('alice', 0.02, 'USD');
    }).then(() => {
      assert.deepEqual(agents.alice._search._inNeighbors, {});
      assert.deepEqual(agents.alice._search._outNeighbors, { '["bob","USD"]': {} });
      assert.deepEqual(agents.bob._search._inNeighbors, { '["alice","USD"]': {} });
      assert.deepEqual(agents.bob._search._outNeighbors, {});

      return agents.alice.sendIOU('bob', 0.01, 'USD');
    }).then(() => {
      assert.deepEqual(agents.alice._search._inNeighbors, {});
      assert.deepEqual(agents.alice._search._outNeighbors, {});
      assert.deepEqual(agents.bob._search._inNeighbors, {});
      assert.deepEqual(agents.bob._search._outNeighbors, {});
    });
  });
});
