var rewire = require('rewire');
var ProbeEngine = rewire('../../src/probe-engine');
var SettlementEngine = rewire('../../src/settlement-engine');
var Agent = rewire('../../src/agents');
var messaging = require('../../src/messaging');
var protocolVersion = require('../../src/messages').protocolVersion;
var debug = require('../../src/debug');
var assert = require('assert');
var sinon = require('sinon');
var stringify = require('canonical-json');

// FIXME: these tests only work because messages are flushed in the same synchronous code
// that creates them. Otherwise, messages from one test would end up at the other test.
// Should use multiple instances of the messaging simulator, see
// https://github.com/michielbdejong/opentabs.net/issues/26

debug.setLevel(true);

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
ProbeEngine.__set__('tokens', {
  generateToken: function() { return 'asdf';  },
});

Agent.__set__('tokens', {
  generateToken: function() { return 'asdf';  },
});


//rewire Signatures in SettlementEngine, then rewire SettlementEngine in Agent:
function MockSignatures() {
}
MockSignatures.prototype.generateKeypair = function() { return 'mocked-pubkey'; };
SettlementEngine.__set__('Signatures', MockSignatures);
Agent.__set__('SettlementEngine', SettlementEngine);

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
    var tokenCounterAlice = 0;
    agents.alice._probeEngine._tokensModule = {
      generateToken: function() { return `token-from-alice-${tokenCounterAlice++}`;  },
    };
    var tokenCounterBob = 0;
    agents.bob._probeEngine._tokensModule = {
      generateToken: function() { return `token-from-bob-${tokenCounterBob++}`;  },
    };
    var tokenCounterCharlie = 0;
    agents.charlie._probeEngine._tokensModule = {
      generateToken: function() { return `token-from-charlie-${tokenCounterCharlie++}`;  },
    };

    agents.alice._ledgers = {
      charlie: { getMyCreditAmount: function() { return 0.1; }, },
      bob: { getMyDebtAmount: function() { return 0.1; }, },
    };
    agents.alice._search._neighbors = {
      'in': {
        '["charlie","USD"]': { awake: true },
       },
       out: {
        '["bob","USD"]': { awake: true },
       },
    };

    agents.bob._ledgers = {
      alice: { getMyCreditAmount: function() { return 0.1; }, },
      charlie: { getMyDebtAmount: function() { return 0.1; }, },
    };
    agents.bob._search._neighbors = {
      'in': {
        '["alice","USD"]': { awake: true },
       },
       out: {
        '["charlie","USD"]': { awake: true },
       },
    };

    agents.charlie._ledgers = {
      bob: { getMyCreditAmount: function() { return 0.1; }, },
      alice: { getMyDebtAmount: function() { return 0.1; }, },
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
    messaging.discardQueue();
  });
  
  it('should send a probe token round', function() {
    // FIXME: get this working with sinon.useFakeTimers
    return agents.alice._probeTimerHandler().then(() => {
      return messaging.flush();
    }).then(messagesSent => {
      assert.deepEqual(messagesSent, [
        {
          fromNick: 'alice',
          msg: stringify({
            protocolVersion,
            msgType: 'probe',
            treeToken: 'token-from-alice-0',
            pathToken: 'token-from-alice-1',
            currency: 'USD',
          }),
          toNick: 'bob',
        },
      ]);

      return messaging.flush();
    }).then(messagesSent => {
      assert.deepEqual(messagesSent, [
        {
          fromNick: 'bob',
          msg: stringify({
            protocolVersion,
            msgType: 'probe',
            treeToken: 'token-from-alice-0',
            pathToken: 'token-from-alice-1',
            currency: 'USD',
          }),
          toNick: 'charlie',
        },
      ]);

      return messaging.flush();
    }).then(messagesSent => {
      assert.deepEqual(messagesSent, [
        {
          fromNick: 'charlie',
          msg: stringify({
            protocolVersion,
            msgType: 'probe',
            treeToken: 'token-from-alice-0',
            pathToken: 'token-from-alice-1',
            currency: 'USD',
          }),
          toNick: 'alice',
        },
      ]);

      return messaging.flush();
    }).then(messagesSent => {
      assert.deepEqual(messagesSent, [
        {
          fromNick: 'alice',
          msg: stringify({
            protocolVersion,
            msgType: 'pubkey-announce',
            treeToken: 'token-from-alice-0',
            pathToken: 'token-from-alice-1',
            pubkey: 'mocked-pubkey',
            currency: 'USD',
            amount: 0.05,
          }),
          toNick: 'charlie',
        },
      ]);
    });
  });
});


describe('If cycle is broken', function() {
  var clock;
  var agents;
  beforeEach(function () {
    agents = {
      alice: new Agent('alice'),
      bob: new Agent('bob'),
      charlie: new Agent('charlie'),
    };
    // FIXME: not access private vars like this:
    var tokenCounterAlice = 0;
    agents.alice._probeEngine._tokensModule = {
      generateToken: function() { return `token-from-alice-${tokenCounterAlice++}`;  },
    };
    var tokenCounterBob = 0;
    agents.bob._probeEngine._tokensModule = {
      generateToken: function() { return `token-from-bob-${tokenCounterBob++}`;  },
    };
    var tokenCounterCharlie = 0;
    agents.charlie._probeEngine._tokensModule = {
      generateToken: function() { return `token-from-charlie-${tokenCounterCharlie++}`;  },
    };
    // cycle is broken between Bob and Charlie:
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
        // '["charlie","USD"]': { awake: true },
       },
    };

    agents.charlie._search._neighbors = {
      'in': {
        // '["bob","USD"]': { awake: true },
       },
       out: {
        '["alice","USD"]': { awake: true },
       },
    };
  });
  afterEach(function() {
  });
  
  it('should send a probe token round', function() {
    // FIXME: get this working with sinon.useFakeTimers
    return agents.alice._probeTimerHandler().then(() => {
      return messaging.flush();
    }).then(messagesSent => {
      assert.deepEqual(messagesSent, [
        {
          fromNick: 'alice',
          msg: stringify({
            protocolVersion,
            msgType: 'probe',
            treeToken: 'token-from-alice-0',
            pathToken: 'token-from-alice-1',
            currency: 'USD',
          }),
          toNick: 'bob',
        },
      ]);

      return messaging.flush();
    }).then(messagesSent => {
      assert.deepEqual(messagesSent, [
        {
          fromNick: 'bob',
          msg: stringify({
            protocolVersion,
            msgType: 'probe',
            treeToken: 'token-from-alice-0',
            pathToken: 'token-from-alice-1',
            currency: 'USD',
          }),
          toNick: 'alice',
        },
      ]);

      return messaging.flush();
    }).then(messagesSent => {
      assert.deepEqual(messagesSent, [
      ]);
    });
  });
});


describe('If two cycles exist', function() {
  var clock;
  var agents;
  beforeEach(function () {
    agents = {
      alice: new Agent('alice'),
      bob: new Agent('bob'),
      charlie: new Agent('charlie'),
      daphne: new Agent('daphne'),
      edward: new Agent('edward'),
    };
    // FIXME: not access private vars like this:
    var tokenCounterAlice = 0;
    agents.alice._probeEngine._tokensModule = {
      generateToken: function() { return `token-from-alice-${tokenCounterAlice++}`;  },
    };
    var tokenCounterBob = 0;
    agents.bob._probeEngine._tokensModule = {
      generateToken: function() { return `token-from-bob-${tokenCounterBob++}`;  },
    };
    var tokenCounterCharlie = 0;
    agents.charlie._probeEngine._tokensModule = {
      generateToken: function() { return `token-from-charlie-${tokenCounterCharlie++}`;  },
    };
    var tokenCounterDaphne = 0;
    agents.daphne._probeEngine._tokensModule = {
      generateToken: function() { return `token-from-daphne-${tokenCounterDaphne++}`;  },
    };
    var tokenCounterEdward = 0;
    agents.edward._probeEngine._tokensModule = {
      generateToken: function() { return `token-from-edward-${tokenCounterEdward++}`;  },
    };

    //        ---------
    //   --> C  -->    \
    //  B <------- A ------> E
    // / --> D  -->    / /
    // \      --------- /
    //  ----------------

    agents.alice._ledgers = {
      charlie: { getMyCreditAmount: function() { return 0.1; }, },
      bob: { getMyDebtAmount: function() { return 0.1; }, },
    };
    agents.alice._search._neighbors = {
      'in': {
        '["charlie","USD"]': { awake: true },
        '["daphne","USD"]': { awake: true },
       },
       out: {
        '["edward","USD"]': { awake: true },
        '["bob","USD"]': { awake: true },
       },
    };

    agents.bob._search._neighbors = {
      'in': {
        '["alice","USD"]': { awake: true },
       },
       out: {
        '["edward","USD"]': { awake: true },
        '["charlie","USD"]': { awake: true },
        '["daphne","USD"]': { awake: true },
       },
    };

    agents.charlie._search._neighbors = {
      'in': {
        '["bob","USD"]': { awake: true },
       },
       out: {
        '["edward","USD"]': { awake: true },
        '["alice","USD"]': { awake: true },
       },
    };
    agents.daphne._search._neighbors = {
      'in': {
        '["bob","USD"]': { awake: true },
       },
       out: {
        '["edward","USD"]': { awake: true },
        '["alice","USD"]': { awake: true },
       },
    };
    agents.edward._search._neighbors = {
      'in': {
        '["alice","USD"]': { awake: true },
        '["bob","USD"]': { awake: true },
        '["charlie","USD"]': { awake: true },
        '["daphne","USD"]': { awake: true },
       },
       out: {
       },
    };

  });
  afterEach(function() {
  });
  
  it('should send a probe token round one of the cycles', function() {
    // FIXME: get this working with sinon.useFakeTimers
    return agents.alice._probeTimerHandler().then(() => {
      return messaging.flush();
    }).then(messagesSent => {
      assert.deepEqual(messagesSent, [
        {
          fromNick: 'alice',
          msg: stringify({
            protocolVersion,
            msgType: 'probe',
            treeToken: 'token-from-alice-0',
            pathToken: 'token-from-alice-1',
            currency: 'USD',
          }),
          toNick: 'edward',
        },
      ]);

      return messaging.flush();
    }).then(messagesSent => {
      assert.deepEqual(messagesSent, [
        {
          fromNick: 'edward',
          msg: stringify({
            protocolVersion,
            msgType: 'probe',
            treeToken: 'token-from-alice-0',
            pathToken: 'token-from-alice-1',
            currency: 'USD',
          }),
          toNick: 'alice',
        },
      ]);

      return messaging.flush();
    }).then(messagesSent => {
      assert.deepEqual(messagesSent, [
        {
          fromNick: 'alice',
          msg: stringify({
            protocolVersion,
            msgType: 'probe',
            treeToken: 'token-from-alice-0',
            pathToken: 'token-from-alice-2',
            currency: 'USD',
          }),
          toNick: 'bob',
        },
      ]);

      return messaging.flush();
    }).then(messagesSent => {
      assert.deepEqual(messagesSent, [
        {
          fromNick: 'bob',
          msg: stringify({
            protocolVersion,
            msgType: 'probe',
            treeToken: 'token-from-alice-0',
            pathToken: 'token-from-alice-2',
            currency: 'USD',
          }),
          toNick: 'edward',
        },
      ]);

      return messaging.flush();
    }).then(messagesSent => {
      assert.deepEqual(messagesSent, [
        {
          fromNick: 'edward',
          msg: stringify({
            protocolVersion,
            msgType: 'probe',
            treeToken: 'token-from-alice-0',
            pathToken: 'token-from-alice-2',
            currency: 'USD',
          }),
          toNick: 'bob',
        },
      ]);

      return messaging.flush();
    }).then(messagesSent => {
      assert.deepEqual(messagesSent, [
        {
          fromNick: 'bob',
          msg: stringify({
            protocolVersion,
            msgType: 'probe',
            treeToken: 'token-from-alice-0',
            pathToken: 'token-from-bob-0',
            currency: 'USD',
          }),
          toNick: 'charlie',
        },
      ]);

      return messaging.flush();
    }).then(messagesSent => {
      assert.deepEqual(messagesSent, [
        {
          fromNick: 'charlie',
          msg: stringify({
            protocolVersion,
            msgType: 'probe',
            treeToken: 'token-from-alice-0',
            pathToken: 'token-from-bob-0',
            currency: 'USD',
          }),
          toNick: 'edward',
        },
      ]);

      return messaging.flush();
    }).then(messagesSent => {
      assert.deepEqual(messagesSent, [
        {
          fromNick: 'edward',
          msg: stringify({
            protocolVersion,
            msgType: 'probe',
            treeToken: 'token-from-alice-0',
            pathToken: 'token-from-bob-0',
            currency: 'USD',
          }),
          toNick: 'charlie',
        },
      ]);

      return messaging.flush();
    }).then(messagesSent => {
      assert.deepEqual(messagesSent, [
        {
          fromNick: 'charlie',
          msg: stringify({
            protocolVersion,
            msgType: 'probe',
            treeToken: 'token-from-alice-0',
            pathToken: 'token-from-charlie-0',
            currency: 'USD',
          }),
          toNick: 'alice',
        },
      ]);

      return messaging.flush();
    }).then(messagesSent => {
      assert.deepEqual(messagesSent, [
        {
          fromNick: 'alice',
          msg: stringify({
            protocolVersion,
            msgType: 'probe',
            treeToken: 'token-from-alice-0',
            pathToken: 'token-from-charlie-0',
            currency: 'USD',
          }),
          toNick: 'bob',
        },
      ]);

      return messaging.flush();
    }).then(messagesSent => {
      assert.deepEqual(messagesSent, [
        {
          fromNick: 'bob',
          msg: stringify({
            protocolVersion,
            msgType: 'probe',
            treeToken: 'token-from-alice-0',
            pathToken: 'token-from-charlie-0',
            currency: 'USD',
          }),
          toNick: 'charlie',
        },
      ]);

      return messaging.flush();
    }).then(messagesSent => {
      assert.deepEqual(messagesSent, [
        {
          fromNick: 'charlie',
          msg: stringify({
            protocolVersion,
            msgType: 'probe',
            treeToken: 'token-from-alice-0',
            pathToken: 'token-from-charlie-0',
            currency: 'USD',
          }),
          toNick: 'alice',
        },
      ]);

      return messaging.flush();
    }).then(messagesSent => {
      assert.deepEqual(messagesSent, [
        {
          fromNick: 'alice',
          msg: stringify({
            protocolVersion,
            msgType: 'pubkey-announce',
            treeToken: 'token-from-alice-0',
            pathToken: 'token-from-charlie-0',
            pubkey: 'mocked-pubkey',
            currency: 'USD',
            amount: 0.05,
          }),
          toNick: 'charlie',
        },
      ]);
    });
  });
});
