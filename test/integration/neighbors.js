var rewire = require('rewire');
var Agent = rewire('../../src/agents');
var messaging = require('../../src/messaging');
var assert = require('assert');
var sinon = require('sinon');
var stringify = require('../../src/stringify'); // TODO: do this via rewire as well (but not urgent, current approach works fine too)

var DateMock = function() {
};
DateMock.prototype.toString = function() {
  return 'the now time';
};
Agent.__set__('Date', DateMock);

describe('IOUs between Alice and Bob', function() {
  var agents = {
    alice: new Agent('alice'),
    bob: new Agent('bob'),
  };
  it('should update search neighbors', function() {
    agents.alice.sendIOU('bob', 0.01, 'USD');
    return messaging.flush().then(messagesSent => {
      assert.deepEqual(messagesSent, [
        {
          fromNick: 'alice',
          msg: stringify({
            msgType: 'IOU',
            debt: {
              debtor: 'alice',
              note: 'IOU sent from alice to bob on the now time',
              addedDebts: {
                USD: 0.01,
              },
            },
          }),
          toNick: 'bob'
        }, 
      ]);

      // TODO: not access private vars here
      assert.deepEqual(agents.alice._search._neighbors['in'], {});
      assert.deepEqual(agents.alice._search._neighbors['out'], {});
      assert.deepEqual(agents.bob._search._neighbors['in'], {});
      assert.deepEqual(agents.bob._search._neighbors['out'], { '["alice","USD"]': { active: true } });

      return messaging.flush();
    }).then(messagesSent => {
      assert.deepEqual(messagesSent, [
        {
          fromNick: 'bob',
          msg: stringify({
            msgType: 'confirm-IOU',
            note: 'IOU sent from alice to bob on the now time',
          }),
          toNick: 'alice'
        }, 
        {
          fromNick: 'bob',
          msg: stringify({
             msgType: 'dynamic-decentralized-cycle-detection',
             direction: 'in',
             currency: 'USD',
             value: false,
          }),
          toNick: 'alice'
        }, 
      ]);

      // TODO: not access private vars here
      assert.deepEqual(agents.alice._search._neighbors['in'], { '["bob","USD"]': { active: false } });
      assert.deepEqual(agents.alice._search._neighbors['out'], {});
      assert.deepEqual(agents.bob._search._neighbors['in'], {});
      assert.deepEqual(agents.bob._search._neighbors['out'], { '["alice","USD"]': { active: true } });

      return messaging.flush();
    }).then(messagesSent => {
      assert.deepEqual(messagesSent, [
        {
          fromNick: 'alice',
          msg: stringify({
             msgType: 'dynamic-decentralized-cycle-detection',
             direction: 'out',
             currency: 'USD',
             value: false,
          }),
          toNick: 'bob'
        }, 
      ]);

      // TODO: not access private vars here
      assert.deepEqual(agents.alice._search._neighbors['in'], { '["bob","USD"]': { active: false } });
      assert.deepEqual(agents.alice._search._neighbors['out'], {});
      assert.deepEqual(agents.bob._search._neighbors['in'], {});
      assert.deepEqual(agents.bob._search._neighbors['out'], { '["alice","USD"]': { active: false } });

      agents.bob.sendIOU('alice', 0.02, 'USD');
      return messaging.flush();
    }).then(messagesSent => {
      assert.deepEqual(messagesSent, [
        {
          fromNick: 'bob',
          msg: stringify({
            msgType: 'IOU',
            debt: {
              debtor: 'bob',
              note: 'IOU sent from bob to alice on the now time',
              addedDebts: {
                USD: 0.02,
              },
            },
          }),
          toNick: 'alice'
        }, 
      ]);
      assert.deepEqual(agents.alice._search._neighbors['in'], {});
      assert.deepEqual(agents.alice._search._neighbors['out'], { '["bob","USD"]': { active: true } });
      assert.deepEqual(agents.bob._search._neighbors['in'], {});
      assert.deepEqual(agents.bob._search._neighbors['out'], { '["alice","USD"]': { active: false } });

      return messaging.flush();
    }).then(messagesSent => {
      assert.deepEqual(messagesSent, [
        {
          fromNick: 'alice',
          msg: stringify({
            msgType: 'confirm-IOU',
            note: 'IOU sent from bob to alice on the now time',
          }),
          toNick: 'bob'
        }, 
        {
          fromNick: 'alice',
          msg: stringify({
             msgType: 'dynamic-decentralized-cycle-detection',
             direction: 'in',
             currency: 'USD',
             value: false,
          }),
          toNick: 'bob'
        }, 
      ]);
      assert.deepEqual(agents.alice._search._neighbors['in'], {});
      assert.deepEqual(agents.alice._search._neighbors['out'], { '["bob","USD"]': { active: true } });
      assert.deepEqual(agents.bob._search._neighbors['in'], { '["alice","USD"]': { active: false } });
      assert.deepEqual(agents.bob._search._neighbors['out'], {});

      return messaging.flush();
    }).then(messagesSent => {
      assert.deepEqual(messagesSent, [
        {
          fromNick: 'bob',
          msg: stringify({
             msgType: 'dynamic-decentralized-cycle-detection',
             direction: 'out',
             currency: 'USD',
             value: false,
          }),
          toNick: 'alice'
        }, 
      ]);
      assert.deepEqual(agents.alice._search._neighbors['in'], {});
      assert.deepEqual(agents.alice._search._neighbors['out'], { '["bob","USD"]': { active: false } });
      assert.deepEqual(agents.bob._search._neighbors['in'], { '["alice","USD"]': { active: false } });
      assert.deepEqual(agents.bob._search._neighbors['out'], {});


      return messaging.flush();
    }).then(() => {
      assert.deepEqual(agents.alice._search._neighbors['in'], {});
      assert.deepEqual(agents.alice._search._neighbors['out'], { '["bob","USD"]': { active: false } });
      assert.deepEqual(agents.bob._search._neighbors['in'], { '["alice","USD"]': { active: false } });
      assert.deepEqual(agents.bob._search._neighbors['out'], {});

      agents.alice.sendIOU('bob', 0.01, 'USD');
      return messaging.flush();
    }).then(() => {
      assert.deepEqual(agents.alice._search._neighbors['in'], {});
      assert.deepEqual(agents.alice._search._neighbors['out'], { '["bob","USD"]': { active: false } });
      assert.deepEqual(agents.bob._search._neighbors['in'], {});
      assert.deepEqual(agents.bob._search._neighbors['out'], {});

      return messaging.flush();
    }).then(() => {
      assert.deepEqual(agents.alice._search._neighbors['in'], {});
      assert.deepEqual(agents.alice._search._neighbors['out'], {});
      assert.deepEqual(agents.bob._search._neighbors['in'], {});
      assert.deepEqual(agents.bob._search._neighbors['out'], {});
    });
  });
});

describe('Cycle Detection', function() {
  // avoiding names alice and bob which are already used in the first test
  // and would cause the two asynchronous tests to interfere with each other
  var agents = {
    charlie: new Agent('charlie'),
    daphne: new Agent('daphne'),
    edward: new Agent('edward'),
    fred: new Agent('fred'),
    geraldine: new Agent('geraldine'),
  };
  it('agents on a cycle should stay active, others not', function() {
    agents.fred.sendIOU('edward', 0.01, 'USD');
    agents.edward.sendIOU('charlie', 0.01, 'USD');
    agents.daphne.sendIOU('edward', 0.01, 'USD');
    // F -> E -> C
    //     ^
    //    /
    //   D
    return messaging.flush().then(messagesSent => {
      assert.deepEqual(messagesSent, [
        {
          fromNick: 'fred',
          msg: stringify({
            msgType: 'IOU',
            debt: {
              debtor: 'fred',
              note: 'IOU sent from fred to edward on the now time',
              addedDebts: {
                USD: 0.01,
              },
            },
          }),
          toNick: 'edward'
        }, 
        {
          fromNick: 'edward',
          msg: stringify({
            msgType: 'IOU',
            debt: {
              debtor: 'edward',
              note: 'IOU sent from edward to charlie on the now time',
              addedDebts: {
                USD: 0.01,
              },
            },
          }),
          toNick: 'charlie'
        }, 
        {
          fromNick: 'daphne',
          msg: stringify({
            msgType: 'IOU',
            debt: {
              debtor: 'daphne',
              note: 'IOU sent from daphne to edward on the now time',
              addedDebts: {
                USD: 0.01,
              },
            },
          }),
          toNick: 'edward'
        }, 
      ]);

      return messaging.flush();
    }).then(messagesSent => {
      assert.deepEqual(messagesSent, [
        {
          fromNick: 'edward',
          msg: stringify({
            msgType: 'confirm-IOU',
            note: 'IOU sent from fred to edward on the now time',
          }),
          toNick: 'fred'
        }, 
        {
          fromNick: 'charlie',
          msg: stringify({
            msgType: 'confirm-IOU',
            note: 'IOU sent from edward to charlie on the now time',
          }),
          toNick: 'edward'
        }, 
        {
          fromNick: 'edward',
          msg: stringify({
            msgType: 'confirm-IOU',
            note: 'IOU sent from daphne to edward on the now time',
          }),
          toNick: 'daphne'
        }, 
        {
          fromNick: 'edward',
          msg: stringify({
             msgType: 'dynamic-decentralized-cycle-detection',
             direction: 'in',
             currency: 'USD',
             value: false,
          }),
          toNick: 'fred'
        }, 
        {
          fromNick: 'charlie',
          msg: stringify({
             msgType: 'dynamic-decentralized-cycle-detection',
             direction: 'in',
             currency: 'USD',
             value: false,
          }),
          toNick: 'edward'
        }, 
        {
          fromNick: 'edward',
          msg: stringify({
             msgType: 'dynamic-decentralized-cycle-detection',
             direction: 'in',
             currency: 'USD',
             value: false,
          }),
          toNick: 'daphne'
        }, 
      ]);

      return messaging.flush();
    }).then(messagesSent => {
      assert.deepEqual(messagesSent, [
        {
          fromNick: 'fred',
          msg: stringify({
             msgType: 'dynamic-decentralized-cycle-detection',
             direction: 'out',
             currency: 'USD',
             value: false,
          }),
          toNick: 'edward'
        }, 
        {
          fromNick: 'edward',
          msg: stringify({
             msgType: 'dynamic-decentralized-cycle-detection',
             direction: 'in',
             currency: 'USD',
             value: true,
          }),
          toNick: 'fred'
        }, 
        {
          fromNick: 'edward',
          msg: stringify({
             msgType: 'dynamic-decentralized-cycle-detection',
             direction: 'in',
             currency: 'USD',
             value: true,
          }),
          toNick: 'daphne'
        }, 
        {
          fromNick: 'daphne',
          msg: stringify({
             msgType: 'dynamic-decentralized-cycle-detection',
             direction: 'out',
             currency: 'USD',
             value: false,
          }),
          toNick: 'edward'
        }, 
      ]);

      return messaging.flush();
    }).then(messagesSent => {
      assert.deepEqual(messagesSent, [
      ]);

      // FIXME: not access private vars here:
      assert.deepEqual(agents.fred._search._active, { 'in': false, out: false });
      assert.deepEqual(agents.edward._search._active, { 'in': false, out: false });
      assert.deepEqual(agents.charlie._search._active, { 'in': false, out: false });
      assert.deepEqual(agents.daphne._search._active, { 'in': false, out: false });
      // assert.deepEqual(agents.fred._search._active, { 'in': true, out: false });
      // assert.deepEqual(agents.edward._search._active, { 'in': false, out: false });
      // assert.deepEqual(agents.charlie._search._active, { 'in': false, out: true });
      // assert.deepEqual(agents.daphne._search._active, { 'in': true, out: false });

      agents.charlie.sendIOU('daphne', 0.01, 'USD');
      // F -> E -> C
      //     ^    /
      //    /    /
      //   D  <--

      return messaging.flush();
    }).then(messagesSent => {
      assert.deepEqual(messagesSent, [
        {
          fromNick: 'charlie',
          msg: stringify({
            msgType: 'IOU',
            debt: {
              debtor: 'charlie',
              note: 'IOU sent from charlie to daphne on the now time',
              addedDebts: {
                USD: 0.01,
              },
            },
          }),
          toNick: 'daphne',
        },
      ]);

      return messaging.flush();
    }).then(messagesSent => {
      assert.deepEqual(messagesSent, [
        {
          fromNick: 'daphne',
          msg: stringify({
            msgType: 'confirm-IOU',
            note: 'IOU sent from charlie to daphne on the now time',
          }),
          toNick: 'charlie'
        }, 
        {
          fromNick: 'daphne',
          msg: stringify({
             msgType: 'dynamic-decentralized-cycle-detection',
             direction: 'out',
             currency: 'USD',
             value: true,
          }),
          toNick: 'edward'
        }, 
      ]);

      return messaging.flush();
    }).then(messagesSent => {
      assert.deepEqual(messagesSent, [
        {
          fromNick: 'charlie',
          msg: stringify({
             msgType: 'dynamic-decentralized-cycle-detection',
             direction: 'in',
             currency: 'USD',
             value: true,
          }),
          toNick: 'edward'
        }, 
      ]);

      return messaging.flush();
    }).then(messagesSent => {
      assert.deepEqual(messagesSent, [
      ]);
    });
  });
});
