var messaging = require('../../src/messaging');
var assert = require('assert');
var sinon = require('sinon');

describe('Messaging channel', function() {
  var callback = sinon.spy();
  messaging.addChannel('joop', callback);
  describe('when message is sent', function() {
    messaging.send('michiel', 'joop', 'hi there');
    it('should trigger callback when message arrives', function() {
      assert.equal(callback.called, true);
      assert.equal(callback.args[0][0], 'michiel');
      assert.equal(callback.args[0][1], 'hi there');
    });
  });
});
