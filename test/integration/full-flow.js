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

describe('three agents', function() {
  var agents = {
    alice: new Agent('alice'),
    bob: new Agent('bob'),
    charlie: new Agent('charlie'),
  };
  it('should setlle debt loop', function() {  
    agents.alice.sendIOU('bob', 0.1, 'USD');
    agents.bob.sendIOU('charlie', 0.1, 'USD');
    agents.charlie.sendIOU('alice', 0.1, 'USD');
    return messaging.flush().then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'alice', 'bob', 'initiate-update' ],
        [ 'bob', 'charlie', 'initiate-update' ],
        [ 'charlie', 'alice', 'initiate-update' ],
      ]);
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'bob', 'alice', 'confirm-update' ],
        [ 'bob', 'alice', 'update-status', false ],
        [ 'charlie', 'bob', 'confirm-update' ],
        [ 'charlie', 'bob', 'update-status', false ],
        [ 'alice', 'charlie', 'confirm-update' ],
        [ 'alice', 'charlie', 'update-status', false ],
      ]);
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'alice', 'charlie', 'update-status' ],
        [ 'alice', 'charlie', 'update-status' ],
        [ 'bob', 'alice', 'update-status' ],
        [ 'bob', 'alice', 'update-status' ],
        [ 'charlie', 'bob', 'update-status' ],
        [ 'charlie', 'bob', 'update-status' ],
      ]);
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'charlie', 'bob', 'update-status' ],
        [ 'charlie', 'bob', 'update-status' ],
        [ 'alice', 'charlie', 'update-status' ],
        [ 'alice', 'charlie', 'update-status' ],
        [ 'bob', 'alice', 'update-status' ],
        [ 'bob', 'alice', 'update-status' ],
      ]);
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
      ]);
      return messaging.flush();
    });
  });
});
