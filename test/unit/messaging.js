var messaging = require('../../src/messaging');
var debug = require('../../src/debug');
var assert = require('assert');
// var sinon = require('sinon');

debug.setLevel(false);

describe('Messaging channel', function() {
  // having some trouble with sinon - 
  var callback = function(arg1, arg2) {
    callback.called = true;
    callback.args = [ [arg1, arg2] ];
    return Promise.resolve();
  };
  messaging.addChannel('joop', callback);
  describe('when JSON message is sent and messaging is flushed', function() {
    messaging.send('michiel', 'joop', '{"hi": "there" }');
    it('should trigger callback when message arrives', function() {
      return messaging.flush().then(messagesSent => {
        assert.deepEqual(messagesSent, [{
          fromNick: 'michiel',
          toNick: 'joop',
          msg: '{"hi": "there" }',
        }]);
        assert.equal(callback.called, true);
        assert.equal(callback.args[0][0], 'michiel');
        assert.equal(callback.args[0][1], '{"hi": "there" }');
      });
    });
  });
});
