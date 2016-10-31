var rewire = require('rewire');
var tokens = rewire('../../src/tokens');
var SettlementEngine = rewire('../../src/settlement-engine');
var protocolVersions = require('../../src/messages').protocolVersions;
var debug = require('../../src/debug');
var assert = require('assert');
var sinon = require('sinon');
var stringify = require('canonical-json');

debug.setLevel(true);

var shouldHaveKeypairs; // TODO: use sinon for this
function MockSignatures() {}

MockSignatures.prototype.generateKeypair = function() {
  return 'pub';
};
MockSignatures.prototype.haveKeypair = function(pubkey) {
  debug.log('it is checking keypair', pubkey);
  return (shouldHaveKeypairs.indexOf(pubkey) !== -1);
};
MockSignatures.prototype.proofOfOwnership = function(pubkey) {
  return 'proof';
};
MockSignatures.prototype.sign = function(cleartext, pubkey) {
  debug.log(`signing "${cleartext}" with "${pubkey}"`);
  return 'signature';
};
SettlementEngine.__set__('Signatures', MockSignatures);
debug.log('signatures stub set');

function CryptoMock() {
  this.counter = 0;
}
CryptoMock.prototype.randomBytes = function() {
  return {
    toString: () => {
      return `token-${this.counter++}`;
    },
  };
};
var cryptoMock = new CryptoMock();
tokens.__set__('crypto', cryptoMock);
SettlementEngine.__set__('tokens', tokens);

describe('SettlementEngine.generateReactions', function() {
  var engine = new SettlementEngine();
  it('should react correctly to conditional-promise if haveKeypair', function() {
    shouldHaveKeypairs = ['asdf'];
    return engine.generateReactions('creditor', {
      protocol: protocolVersions.negotiation,
      msgType: 'conditional-promise',
      routing: {
        protocol: protocolVersions.routing,
        treeToken: 'token-0',
        pathToken: 'token-1',
      },
      challenge: {
        name: 'ECDSA',
        namedCurve: 'P-256',
        pubkey: 'asdf',
        cleartext: 'token-2',
      },
      transaction: {
        id: 'token-3',
        currency: 'USD',
        amount: 0.05,
      }
    }, 'myDebtor', 'myCreditor').then((reactions) => {
      assert.equal(reactions.length, 1);
      assert.deepEqual(reactions[0], {
        to: 'myCreditor',
        msg: stringify({
          protocol: protocolVersions.negotiation,
          msgType: 'satisfy-condition',
          transactionId: 'token-3',
          solution: 'signature',
        })
      });
    });
  });

  it('should react correctly to conditional-promise if not haveKeypair', function() {
    shouldHaveKeypairs = [];
    return engine.generateReactions('creditor', {
      protocol: protocolVersions.negotiation,
      msgType: 'conditional-promise',
      routing: {
        protocol: protocolVersions.routing,
        treeToken: 'token-0',
        pathToken: 'token-1',
      },
      challenge: {
        name: 'ECDSA',
        namedCurve: 'P-256',
        pubkey: 'asdf',
        cleartext: 'token-2',
      },
      transaction: {
        id: 'token-3',
        currency: 'USD',
        amount: 0.05,
      }
    }, 'myDebtor', 'myCreditor').then((reactions) => {
      assert.equal(reactions.length, 1);
      assert.deepEqual(reactions[0], {
        to: 'myDebtor',
        msg: stringify({
          protocol: protocolVersions.negotiation,
          msgType: 'conditional-promise',
          routing: {
            protocol: protocolVersions.routing,
            treeToken: 'token-0',
            pathToken: 'token-1',
          },
          challenge: {
            name: 'ECDSA',
            namedCurve: 'P-256',
            pubkey: 'asdf',
            cleartext: 'token-2',
          },
          transaction: {
            id: 'token-0',
            currency: 'USD',
            amount: 0.05,
          }
        })
      });
    });
  });

  it('should react correctly to satisfy-condition (not have pubkey)', function() {
    shouldHaveKeypairs = [];
    return engine.generateReactions('debtor', {
      protocol: protocolVersions.negotiation,
      msgType: 'satisfy-condition',
      transactionId: 'token-0',
      solution: 'signature',
    }, 'myDebtor', 'myCreditor').then((reactions) => {
      assert.equal(reactions.length, 2);
      assert.deepEqual(reactions[0], {
        to: 'myDebtor',
        msg: stringify({
          protocol: protocolVersions.ledger,
          msgType: 'initiate-update',
          transactionId: 'token-0',
        })
      });
      assert.deepEqual(reactions[1], {
        to: 'myCreditor',
        msg: stringify({
          protocol: protocolVersions.negotiation,
          msgType: 'satisfy-condition',
          transactionId: 'token-3',
          solution: 'signature',
        })
      });
    });
  });

  it('should react correctly to satisfy-condition (have pubkey)', function() {
    shouldHaveKeypairs = ['asdf'];
    return engine.generateReactions('debtor', {
      protocol: protocolVersions.negotiation,
      msgType: 'satisfy-condition',
      transactionId: 'token-3',
      solution: 'signature',
    }, 'myDebtor', 'myCreditor').then((reactions) => {
      assert.equal(reactions.length, 1);
      assert.deepEqual(reactions[0], {
        to: 'myDebtor',
        msg: stringify({
          protocol: protocolVersions.ledger,
          msgType: 'initiate-update',
          transactionId: 'token-3',
        })
      });
    });
  });
});

function nextStep(actors, incoming) {
  var outgoing = [];
  var promises = [];
  function reactTo(sender, receiver, msgObj) {
    var debtorNick = actors[receiver].debtorNick;
    var creditorNick = actors[receiver].creditorNick;
    var fromRole;
    if (sender === debtorNick) {
      fromRole = 'debtor';
    } else if (sender === creditorNick) {
      fromRole = 'creditor';
    } else if (typeof sender === 'undefined') {
      fromRole = 'kickstarter';
    } else {
      debug.log(sender, receiver, msgObj);
      throw new Error('sender is neither debtor nor creditor of receiver');
    }
    return actors[receiver].engine.generateReactions(fromRole, msgObj, debtorNick, creditorNick).then((reactions) => {
      debug.log({ reactions });
      for (var i=0; i<reactions.length; i++) {
        outgoing.push({
          sender: receiver,
          receiver: reactions[i].to,
          msgObj: JSON.parse(reactions[i].msg),
        });
      }
    });
  }

  for (var i=0; i<incoming.length; i++) {
    promises.push(reactTo(incoming[i].sender, incoming[i].receiver, incoming[i].msgObj));
  }
  // debug.log('promises gather, now executing:');
  return Promise.all(promises).then((results) => {
    // debug.log('All promises executed', results);
    return outgoing;
  }, (err) => {
    console.error('Something went wrong', err);
  });
}

describe('Settlement process', function() {
  var actors = {
    'a': {
      debtorNick: 'b',
      creditorNick: 'c',
      engine: new SettlementEngine(),
    },
    'b': {
      debtorNick: 'c',
      creditorNick: 'a',
      engine: new SettlementEngine(),
    },
    'c': {
      debtorNick: 'a',
      creditorNick: 'b',
      engine: new SettlementEngine(),
    },
  };

  // kickstart process with A sending conditional-promise to B:
  var traffic1 = [{
    sender: 'a',
    receiver: 'b',
    msgObj: {
      protocol: protocolVersions.negotiation,
      msgType: 'conditional-promise',
      routing: {
        protocol: protocolVersions.routing,
        treeToken: 'token-0',
        pathToken: 'token-1',
      },
      challenge: {
        name: 'ECDSA',
        namedCurve: 'P-256',
        pubkey: 'fake',
        cleartext: 'token-2',
      },
      transaction: {
        id: 'token-3',
        currency: 'USD',
        amount: 0.05,
      }
    },
  }];
  it('should find a settlement', function() {
    debug.log('Step 1:');
    // FIXME: this is a bit weird as it sets the keypairs for all agents at the same time:
    // But we know that B is going to react to this traffic, so it's OK here:
    shouldHaveKeypairs = [];
    return nextStep(actors, traffic1).then((traffic2) => {
      assert.deepEqual(traffic2, [
        {
          msgObj: {
            protocol: protocolVersions.negotiation,
            msgType: 'conditional-promise',
            routing: {
              protocol: protocolVersions.routing,
              treeToken: 'token-0',
              pathToken: 'token-1',
            },
            challenge: {
              name: 'ECDSA',
              namedCurve: 'P-256',
              pubkey: 'fake',
              cleartext: 'token-2',
            },
            transaction: {
              id: 'token-1',
              currency: 'USD',
              amount: 0.05,
            }
          },
          receiver: 'c',
          sender: 'b',
        }
      ]);
      debug.log('Step 2:');
      shouldHaveKeypairs = []; // c is the only one reacting now
      return nextStep(actors, traffic2);
    }).then((traffic3) => {
      assert.deepEqual(traffic3, [
        {
          msgObj: {
            protocol: protocolVersions.negotiation,
            msgType: 'conditional-promise',
            routing: {
              protocol: protocolVersions.routing,
              treeToken: 'token-0',
              pathToken: 'token-1',
            },
            challenge: {
              name: 'ECDSA',
              namedCurve: 'P-256',
              pubkey: 'fake',
              cleartext: 'token-2',
            },
            transaction: {
              id: 'token-2',
              currency: 'USD',
              amount: 0.05,
            }
          },
          receiver: 'a',
          sender: 'c',
        }
      ]);
      debug.log('Step 3:');
      shouldHaveKeypairs = ['fake']; // a is the only one reacting now
      return nextStep(actors, traffic3);
    }).then((traffic4) => {
      assert.deepEqual(traffic4, [
        {
          msgObj: {
            msgType: 'satisfy-condition',
            protocol: protocolVersions.negotiation,
            solution: 'signature',
            transactionId: 'token-2',
          },
          receiver: 'c',
          sender: 'a',
        }
      ]);
      debug.log('Step 4:');
      shouldHaveKeypairs = []; // c is the only one reacting now
      return nextStep(actors, traffic4);
    }).then((traffic5) => {
      assert.deepEqual(traffic5, [
        {
          msgObj: {
            protocol: protocolVersions.ledger,
            msgType: 'initiate-update',
            transactionId: 'token-2',
            debtor: 'a',
            addedDebts: {
              'USD': -0.05,
            },
          },
          receiver: 'a',
          sender: 'c',
        },
        {
          msgObj: {
            msgType: 'satisfy-condition',
            protocol: protocolVersions.negotiation,
            solution: 'signature',
            transactionId: 'token-2',
          },
          receiver: 'b',
          sender: 'c',
        }
      ]);
      debug.log('Step 5:');
      shouldHaveKeypairs = ['pub']; // a is now responding only to confirm-legder-update; setting this for b
      return nextStep(actors, traffic5);
    }).then((traffic6) => {
      assert.deepEqual(traffic6, [
        {
          msgObj: {
            protocol: protocolVersions.ledger,
            msgType: 'initiate-update',
            transactionId: 'token-2',
            currency: 'USD',
            amount: 0.05,
          },
          receiver: 'c',
          sender: 'b',
        },
        {
          msgObj: {
            msgType: 'satisfy-condition',
            protocol: protocolVersions.negotiation,
            solution: 'signature',
            transactionId: 'token-2',
          },
          receiver: 'a',
          sender: 'b',
        }
      ]);
      debug.log('Step 6:');
      shouldHaveKeypairs = ['fake']; // c is now responding only to confirm-legder-update; setting this for a
      return nextStep(actors, traffic6);
    }).then((traffic7) => {
      assert.deepEqual(traffic7, [
        {
          msgObj: {
            protocol: protocolVersions.ledger,
            msgType: 'initiate-update',
            transactionId: 'token-2',
            currency: 'USD',
            amount: 0.05,
          },
          receiver: 'b',
          sender: 'a',
        },
      ]);
      shouldHaveKeypairs = ['pub']; // setting this for b
      debug.log('Step 7:');
      return nextStep(actors, traffic7);
    }).then((traffic8) => {
      assert.equal(traffic8.length, 0);
    });
  });
});
