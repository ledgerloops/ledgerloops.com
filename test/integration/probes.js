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

describe('Once a cycle has been found', function() {
  var clock;
  beforeEach(function () {
    clock = sinon.useFakeTimers();
  });
  afterEach(function() {
    clock.restore();
  });
  
  it('should send a probe token', function() {
    var agents = {
      alice: new Agent('alice'),
      bob: new Agent('bob'),
      charlie: new Agent('charlie'),
    };
    agents.alice.sendIOU('bob', 0.01, 'USD');
    agents.bob.sendIOU('charlie', 0.01, 'USD');
    agents.charlie.sendIOU('alice', 0.01, 'USD');

    return messaging.flush().then(messagesSent => {
      return messaging.flush();
    }).then(messagesSent => {
      return messaging.flush();
    }).then(messagesSent => {
      return messaging.flush();
    }).then(messagesSent => {
      return messaging.flush();
    }).then(messagesSent => {
      return messaging.flush();
    }).then(messagesSent => {
      return messaging.flush();
    }).then(messagesSent => {
      clock.tick(1010);
      console.log(agents.alice._probeEngine._probes);
      console.log(agents.bob._probeEngine._probes);
      console.log(agents.charlie._probeEngine._probes);
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          console.log(agents.alice._probeEngine._probes);
          console.log(agents.bob._probeEngine._probes);
          console.log(agents.charlie._probeEngine._probes);
          console.log('resolving');
          resolve();
        }, 500);
        clock.tick(1600);
      });
    });
  });
});
