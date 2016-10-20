var SettlementEngine = require('../../src/settlement-engine');
var assert = require('assert');

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
      console.log(sender, receiver, msgObj);
      throw new Error('sender is neither debtor nor creditor of receiver');
    }
    return actors[receiver].engine.generateReactions(fromRole, msgObj, debtorNick, creditorNick).then((reactions) => {
      console.log({ reactions });
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
  // console.log('promises gather, now executing:');
  return Promise.all(promises).then((results) => {
    // console.log('All promises executed', results);
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
      pubkey: 'fake',
    },
  }];
  it('should find a settlement', function() {
    console.log('Step 1:');
    return nextStep(actors, traffic1).then((traffic2) => {
      console.log('Step 2:');
      return nextStep(actors, traffic2);
    }).then((traffic3) => {
      console.log('Step 3:');
      return nextStep(actors, traffic3);
    }).then((traffic4) => {
      console.log('Step 4:');
      return nextStep(actors, traffic4);
    }).then((traffic5) => {
      console.log('Step 5:');
      return nextStep(actors, traffic5);
    }).then((traffic6) => {
      console.log('Step 6:');
      return nextStep(actors, traffic6);
    }).then((traffic7) => {
      console.log('Step 7:');
      return nextStep(actors, traffic7);
    }).then((traffic8) => {
      console.log('Step 8:');
      return nextStep(actors, traffic8);
    }).then((traffic9) => {
      console.log('Step 9:');
      return nextStep(actors, traffic9);
    }).then((traffic10) => {
      assert.equal(traffic10, []);
    });
  });
});
