var Agent = require('../../src/agents');
var messaging = require('../../src/messaging');
var debug = require('../../src/debug');
var assert = require('assert');

debug.setLevel(false);

function messageTypes(traffic) {
  var msgType = [];
  for (var i=0; i<traffic.length; i++) {
    msgType.push([traffic[i].fromNick, traffic[i].toNick, JSON.parse(traffic[i].msg).msgType]);
    if (msgType[msgType.length-1][2] === 'update-status') {
      msgType[msgType.length-1].push(JSON.parse(traffic[i].msg).value);
    }
  }
  return msgType;
}

function checkNeighborStates(agents) {
  for (var main in agents) {
    for (var dir in agents[main]._search._neighbors) {
      for (var other in agents[main]._search._neighbors[dir]) {
        var peerNick = agents[main]._search._neighbors[dir].peerNick;
        var thinksAwake = agents[main]._search._neighbors[dir].awake;
        assert.equal(thinksAwake, agents[peerNick]._search._awake);
      }
    }
  }
}

describe('three agents staggered', function() {
  var agents = {
    alice: new Agent('alice'),
    bob: new Agent('bob'),
    charlie: new Agent('charlie'),
  };
  it('should setlle debt loop', function() {  
    return agents.alice.sendIOU('bob', 0.1, 'USD').then(() => {
      console.log('IOU alice to bob sent');
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'alice', 'bob', 'initiate-update' ],
      ]);
      checkNeighborStates();
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'bob', 'alice', 'confirm-update' ],
      ]);
      checkNeighborStates();
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
      ]);
      checkNeighborStates();
      return agents.bob.sendIOU('charlie', 0.1, 'USD');
      console.log('IOU bob to charlie sent');
    }).then(() => {
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'bob', 'charlie', 'initiate-update' ],
      ]);
      checkNeighborStates();
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'charlie', 'bob', 'confirm-update' ],
      ]);
      checkNeighborStates();
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'bob', 'alice', 'update-status', true ],
      ]);
      checkNeighborStates();
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
      ]);
      checkNeighborStates();
      return agents.charlie.sendIOU('alice', 0.1, 'USD');
    }).then(() => {
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'charlie', 'alice', 'initiate-update' ],
      ]);
      checkNeighborStates();
console.log(agents.alice._search);
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'alice', 'charlie', 'confirm-update' ],
        [ 'alice', 'bob', 'update-status', true ],
      ]);
      checkNeighborStates();
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'charlie', 'bob', 'update-status', true ],
      ]);
      checkNeighborStates();
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
      ]);
      checkNeighborStates();
      assert.equal(agents.alice._search._awake, true);
      assert.equal(agents.bob._search._awake, true);
      assert.equal(agents.charlie._search._awake, true);
      return agents.alice._probeTimerHandler();
    }).then(() => {
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'charlie', 'bob', 'probe' ],
      ]);
      checkNeighborStates();
    });
  });
});

// describe('three agents racing', function() {
//   var agents = {
//     daphne: new Agent('daphne'),
//     edward: new Agent('edward'),
//     fred: new Agent('fred'),
//   };
//   it('should setlle debt loop', function() {  
//     return agents.daphne.sendIOU('edward', 0.1, 'USD').then(() => {
//       return agents.edward.sendIOU('fred', 0.1, 'USD');
//     }).then(() => {
//       return agents.fred.sendIOU('daphne', 0.1, 'USD');
//     }).then(() => {
//       return messaging.flush();
//     }).then(traffic => {
//       console.log(messageTypes(traffic));
//       assert.deepEqual(messageTypes(traffic), [
//         [ 'daphne', 'edward', 'initiate-update' ],
//         [ 'edward', 'fred', 'initiate-update' ],
//         [ 'fred', 'daphne', 'initiate-update' ],
//       ]);
//       return messaging.flush();
//     }).then(traffic => {
//       console.log(messageTypes(traffic));
//       assert.deepEqual(messageTypes(traffic), [
//         [ 'edward', 'daphne', 'confirm-update' ],
//         [ 'fred', 'edward', 'confirm-update' ],
//         [ 'daphne', 'fred', 'confirm-update' ],
//       ]);
//       return messaging.flush();
//     }).then(traffic => {
//       console.log(messageTypes(traffic));
//       assert.deepEqual(messageTypes(traffic), [
//         [ 'daphne', 'fred', 'update-status', true ],
//         [ 'edward', 'daphne', 'update-status', true ],
//         [ 'fred', 'edward', 'update-status', true ],
//       ]);
//       return messaging.flush();
//     }).then(traffic => {
//       console.log(messageTypes(traffic));
//       assert.deepEqual(messageTypes(traffic), [
//       ]);
//       assert.equal(agents.daphne._search._awake, true);
//       assert.equal(agents.edward._search._awake, true);
//       assert.equal(agents.fred._search._awake, true);
//       return agents.daphne._probeTimerHandler();
//     }).then(() => {
//       return agents.edward._probeTimerHandler();
//     }).then(() => {
//       return agents.fred._probeTimerHandler();
//     }).then(() => {
//       return messaging.flush();
//     }).then(traffic => {
//       console.log(messageTypes(traffic));
//       assert.deepEqual(messageTypes(traffic), [
//         [ 'daphne', 'edward', 'probe' ],
//         [ 'edward', 'fred', 'probe' ],
//         [ 'fred', 'daphne', 'probe' ],
//       ]);
//       return messaging.flush();
//     }).then(traffic => {
//       console.log(messageTypes(traffic));
//       assert.deepEqual(messageTypes(traffic), [
//         [ 'edward', 'fred', 'probe' ],
//         [ 'fred', 'daphne', 'probe' ],
//         [ 'daphne', 'edward', 'probe' ],
//       ]);
//       return messaging.flush();
//     });
//   });
// });
