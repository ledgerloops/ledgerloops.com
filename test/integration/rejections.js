var rewire = require('rewire');
var SettlementEngine = rewire('../../src/settlement-engine');
var protocolVersion = require('../../src/messages').protocolVersion;
var debug = require('../../src/debug');
var assert = require('assert');
var sinon = require('sinon');
var stringify = require('canonical-json');

debug.setLevel(false);

var shouldHaveKeypairs; // TODO: use sinon for this
function MockSignatures() {};

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

describe('SettlementEngine.generateReactions', function() {
  var engine = new SettlementEngine();
  it('should react correctly to pubkey-announce followed by please-reject', function() {
    shouldHaveKeypairs = [];
    var firstMsg = engine.generateReactions('creditor', {
      msgType: 'pubkey-announce',
      pubkey: 'asdf',
      currency: 'USD',
      amount: 0.05,
    }, 'myDebtor', 'myCreditor').then((reactions) => {
      assert.equal(reactions.length, 0);
    });
    var secondMsg = engine.generateReactions('creditor', {
      msgType: 'please-reject',
      pubkey: 'asdf',
      currency: 'USD',
      amount: 0.05,
    }, 'myDebtor', 'myCreditor').then((reactions) => {
      assert.equal(reactions.length, 1);
      assert.deepEqual(reactions[0], {
        to: 'myCreditor',
        msg: stringify({
          protocolVersion,
          msgType: 'reject',
          pubkey: 'asdf',
          currency: 'USD',
          amount: 0.05,
        })
      });
    });
    // FIXME: this assumes first message goes into can-still-reject synchronously and the please-reject message is also
    // processed synchronously (otherwise the secondMsg promise is already assigned to its var too early, and sits there
    // waiting for the firstMsg promise to resolve before coming into action.
    return firstMsg.then(() => {
      return secondMsg;
    });
  });

  it('should react correctly to conditional-promise if haveKeypair but followed by please-reject', function() {
    shouldHaveKeypairs = ['asdf'];
    var firstMsg = engine.generateReactions('creditor', {
      msgType: 'conditional-promise',
      pubkey: 'asdf',
      pubkey2: 'pub',
          currency: 'USD',
          amount: 0.05,
    }, 'myDebtor', 'myCreditor').then((reactions) => {
      assert.equal(reactions.length, 0);
    });
    
    var secondMsg = engine.generateReactions('creditor', {
      msgType: 'please-reject',
      pubkey: 'asdf',
      pubkey2: 'pub',
          currency: 'USD',
          amount: 0.05,
    }, 'myDebtor', 'myCreditor').then((reactions) => {
      assert.equal(reactions.length, 1);
      assert.deepEqual(reactions[0], {
        to: 'myCreditor',
        msg: stringify({
          protocolVersion,
          msgType: 'reject',
          pubkey: 'asdf',
          pubkey2: 'pub',
          currency: 'USD',
          amount: 0.05,
        })
      });
    });
    return firstMsg.then(() => {
      return secondMsg;
    });
  });

  it('should react correctly to conditional-promise if not haveKeypair but followed by please-reject', function() {
    shouldHaveKeypairs = [];
    var firstMsg = engine.generateReactions('creditor', {
      msgType: 'conditional-promise',
      pubkey: 'asdf',
      pubkey2: 'pub',
          currency: 'USD',
          amount: 0.05,
    }, 'myDebtor', 'myCreditor').then((reactions) => {
      assert.equal(reactions.length, 0);
    });
    
    var secondMsg = engine.generateReactions('creditor', {
      msgType: 'please-reject',
      pubkey: 'asdf',
      pubkey2: 'pub',
          currency: 'USD',
          amount: 0.05,
    }, 'myDebtor', 'myCreditor').then((reactions) => {
      assert.equal(reactions.length, 1);
      assert.deepEqual(reactions[0], {
        to: 'myCreditor',
        msg: stringify({
          protocolVersion,
          msgType: 'reject',
          pubkey: 'asdf',
          pubkey2: 'pub',
          currency: 'USD',
          amount: 0.05,
        })
      });
    });
    return firstMsg.then(() => {
      return secondMsg;
    });
  });
  it('should react correctly to pubkey-announce if please-reject comes too late', function() {
    shouldHaveKeypairs = [];
    return engine.generateReactions('creditor', {
      msgType: 'pubkey-announce',
      pubkey: 'asdf',
      currency: 'USD',
      amount: 0.05,
    }, 'myDebtor', 'myCreditor').then((reactions) => {
      assert.equal(reactions.length, 1);
      assert.deepEqual(reactions[0], {
        to: 'myDebtor',
        msg: stringify({
          protocolVersion,
          msgType: 'conditional-promise',
          pubkey: 'asdf',
          pubkey2: 'pub',
          currency: 'USD',
          amount: 0.05,
        })
      });
    }).then(() => {
      return engine.generateReactions('creditor', {
        msgType: 'please-reject',
        pubkey: 'asdf',
        currency: 'USD',
        amount: 0.05,
      }, 'myDebtor', 'myCreditor');
    }).then((reactions) => {
      assert.equal(reactions.length, 1);
      assert.deepEqual(reactions[0], {
        to: 'myDebtor',
        msg: stringify({
          protocolVersion,
          msgType: 'please-reject',
          pubkey: 'asdf',
          currency: 'USD',
          amount: 0.05,
        })
      });
    });
  });

  it('should react correctly to conditional-promise if haveKeypair if please-reject comes too late', function() {
    shouldHaveKeypairs = ['asdf'];
    return engine.generateReactions('creditor', {
      msgType: 'conditional-promise',
      pubkey: 'asdf',
      pubkey2: 'pub',
          currency: 'USD',
          amount: 0.05,
    }, 'myDebtor', 'myCreditor').then((reactions) => {
      assert.equal(reactions.length, 1);
      assert.deepEqual(reactions[0], {
        to: 'myCreditor',
        msg: stringify({
          protocolVersion,
          msgType: 'satisfy-condition',
          pubkey: 'asdf',
          pubkey2: 'pub',
          embeddablePromise: {
            protocolVersion,
            msgType: 'embeddable-promise',
            pubkey: 'asdf',
            pubkey2: 'pub',
          currency: 'USD',
          amount: 0.05,
          },
          signature: 'signature',
          currency: 'USD',
          amount: 0.05,
        })
      });
    }).then(() => {
      return engine.generateReactions('creditor', {
        msgType: 'please-reject',
        pubkey: 'asdf',
        currency: 'USD',
        amount: 0.05,
      }, 'myDebtor', 'myCreditor');
    }).then((reactions) => {
      assert.equal(reactions.length, 1);
      assert.deepEqual(reactions[0], {
        to: 'myDebtor',
        msg: stringify({
          protocolVersion,
          msgType: 'please-reject',
          pubkey: 'asdf',
          currency: 'USD',
          amount: 0.05,
        })
      });
    });
  });

  it('should react correctly to conditional-promise if not haveKeypair if please-reject comes too late', function() {
    shouldHaveKeypairs = [];
    return engine.generateReactions('creditor', {
      protocolVersion,
      msgType: 'conditional-promise',
      pubkey: 'asdf',
      pubkey2: 'pub',
          currency: 'USD',
          amount: 0.05,
    }, 'myDebtor', 'myCreditor').then((reactions) => {
      assert.equal(reactions.length, 1);
      assert.deepEqual(reactions[0], {
        to: 'myDebtor',
        msg: stringify({
          protocolVersion,
          msgType: 'conditional-promise',
          pubkey: 'asdf',
          pubkey2: 'pub',
          currency: 'USD',
          amount: 0.05,
        })
      });
    }).then(() => {
      return engine.generateReactions('creditor', {
        msgType: 'please-reject',
        pubkey: 'asdf',
        currency: 'USD',
        amount: 0.05,
      }, 'myDebtor', 'myCreditor');
    }).then((reactions) => {
      assert.equal(reactions.length, 1);
      assert.deepEqual(reactions[0], {
        to: 'myDebtor',
        msg: stringify({
          protocolVersion,
          msgType: 'please-reject',
          pubkey: 'asdf',
          currency: 'USD',
          amount: 0.05,
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

  // kickstart process with A sending pubkey-announce to B:
  var traffic1 = [{
    sender: 'a',
    receiver: 'b',
    msgObj: {
      msgType: 'pubkey-announce',
      protocolVersion,
      pubkey: 'fake',
          currency: 'USD',
          amount: 0.05,
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
            msgType: 'conditional-promise',
            protocolVersion,
            pubkey: 'fake',
            pubkey2: 'pub',
          currency: 'USD',
          amount: 0.05,
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
            msgType: 'conditional-promise',
            protocolVersion,
            pubkey: 'fake',
            pubkey2: 'pub',
          currency: 'USD',
          amount: 0.05,
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
            protocolVersion,
            pubkey: 'fake',
            pubkey2: 'pub',
            embeddablePromise: {
              msgType: 'embeddable-promise',
              protocolVersion,
              pubkey: 'fake',
              pubkey2: 'pub',
          currency: 'USD',
          amount: 0.05,
            },
            signature: 'signature',
          currency: 'USD',
          amount: 0.05,
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
            msgType: 'confirm-ledger-update',
            protocolVersion,
            pubkey: 'fake',
          currency: 'USD',
          amount: 0.05,
          },
          receiver: 'a',
          sender: 'c',
        },
        {
          msgObj: {
            msgType: 'satisfy-condition',
            protocolVersion,
            pubkey: 'fake',
            pubkey2: 'pub',
            embeddablePromise: {
              msgType: 'embeddable-promise',
              protocolVersion,
              pubkey: 'fake',
              pubkey2: 'pub',
          currency: 'USD',
          amount: 0.05,
            },
            signature: 'signature',
          currency: 'USD',
          amount: 0.05,
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
            msgType: 'confirm-ledger-update',
            protocolVersion,
           pubkey: 'fake',
          currency: 'USD',
          amount: 0.05,
          },
          receiver: 'c',
          sender: 'b',
        },
        {
          msgObj: {
            msgType: 'claim-fulfillment',
            protocolVersion,
            pubkey: 'fake',
            pubkey2: 'pub',
            embeddablePromise: {
              msgType: 'embeddable-promise',
              protocolVersion,
              pubkey: 'fake',
              pubkey2: 'pub',
          currency: 'USD',
          amount: 0.05,
            },
            signature: 'signature',
            proofOfOwnership: 'proof',
          currency: 'USD',
          amount: 0.05,
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
            msgType: 'confirm-ledger-update',
            protocolVersion,
           pubkey: 'fake',
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
