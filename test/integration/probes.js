var rewire = require('rewire');
var Agent = rewire('../../src/agents');
var messaging = require('../../src/messaging');
var debug = require('../../src/debug');
var assert = require('assert');
var sinon = require('sinon');
var stringify = require('../../src/stringify'); // TODO: do this via rewire as well (but not urgent, current approach works fine too)

// FIXME: these tests only work because messages are flushed in the same synchronous code
// that creates them. Otherwise, messages from one test would end up at the other test.
// Should use multiple instances of the messaging simulator, see
// https://github.com/michielbdejong/opentabs.net/issues/26

debug.setLevel(false);

var DateMock = function() {
};
DateMock.prototype.toString = function() {
  return 'the now time';
};
Agent.__set__('Date', DateMock);

CryptoMock = {
  randomBytes: function() {
    return {
      toString: function() {
        return 'some-random-hash';
      }
    };
  },
};
Agent.__set__('crypto', CryptoMock);
console.log('crypto mock installed');

describe('Once a cycle has been found', function() {
  var clock;
  var agents;
  beforeEach(function () {
    agents = {
      alice: new Agent('alice'),
      bob: new Agent('bob'),
      charlie: new Agent('charlie'),
    };
    // FIXME: not access private vars like this:
    agents.alice._ensurePeer('bob');
    agents.alice._ensurePeer('charlie');
    agents.bob._ensurePeer('alice');
    agents.bob._ensurePeer('charlie');
    agents.charlie._ensurePeer('alice');
    agents.charlie._ensurePeer('bob');

    agents.alice._search._neighbors = {
      'in': {
        '["charlie","USD"]': { awake: true },
       },
       out: {
        '["bob","USD"]': { awake: true },
       },
    };

    agents.bob._search._neighbors = {
      'in': {
        '["alice","USD"]': { awake: true },
       },
       out: {
        '["charlie","USD"]': { awake: true },
       },
    };

    agents.charlie._search._neighbors = {
      'in': {
        '["bob","USD"]': { awake: true },
       },
       out: {
        '["alice","USD"]': { awake: true },
       },
    };
  });
  afterEach(function() {
  });
  
  it('should send a probe token', function() {
    // FIXME: get this working with sinon.useFakeTimers
    return agents.alice._probeTimerHandler().then(() => {
      return messaging.flush();
    }).then(messagesSent => {
      assert.deepEqual(messagesSent, [
        {
          fromNick: 'alice',
          msg: stringify({
            protocolVersion: 'opentabs-net-0.3',
            msgType: 'probe',
            treeToken: 'some-random-token',
            pathToken: 'some-random-token',
          }),
          toNick: 'bob',
        }
      ]);
    });
  });
});
