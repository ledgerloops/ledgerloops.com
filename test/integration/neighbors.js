var rewire = require('rewire');
var Agent = rewire('../../src/agents');
var messaging = require('../../src/messaging');
var assert = require('assert');
var sinon = require('sinon');
var stringify = require('../../src/stringify'); // TODO: do this via rewire as well (but not urgent, current approach works fine too)

describe('one IOU sent', function() {
  var agents = {
    alice: new Agent('alice'),
    bob: new Agent('bob'),
  };
  it('should update search neighbors', function() {
    agents.alice.sendIOU('bob', 0.01, 'USD');
    return messaging.flush().then(() => {
      // TODO: not access private vars here
      assert.deepEqual(agents.alice._search._neighbors['in'], {});
      assert.deepEqual(agents.alice._search._neighbors['out'], {});
      assert.deepEqual(agents.bob._search._neighbors['in'], {});
      assert.deepEqual(agents.bob._search._neighbors['out'], { '["alice","USD"]': { active: true } });
      return messaging.flush();
    }).then(() => {
      // TODO: not access private vars here
      assert.deepEqual(agents.alice._search._neighbors['in'], { '["bob","USD"]': { active: false } });
      assert.deepEqual(agents.alice._search._neighbors['out'], {});
      assert.deepEqual(agents.bob._search._neighbors['in'], {});
      assert.deepEqual(agents.bob._search._neighbors['out'], { '["alice","USD"]': { active: true } });

//      return agents.bob.sendIOU('alice', 0.02, 'USD');
//    }).then(() => {
//      assert.deepEqual(agents.alice._search._neighbors['in'], {});
//      assert.deepEqual(agents.alice._search._neighbors['out'], { '["bob","USD"]': { active: true } });
//      assert.deepEqual(agents.bob._search._neighbors['in'], { '["alice","USD"]': { active: true } });
//      assert.deepEqual(agents.bob._search._neighbors['out'], {});
//
//      return agents.alice.sendIOU('bob', 0.01, 'USD');
//    }).then(() => {
//      assert.deepEqual(agents.alice._search._neighbors['in'], {});
//      assert.deepEqual(agents.alice._search._neighbors['out'], {});
//      assert.deepEqual(agents.bob._search._neighbors['in'], {});
//      assert.deepEqual(agents.bob._search._neighbors['out'], {});
    });
  });
});
