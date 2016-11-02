var messages = require('../../src/messages');
var assert = require('assert');

describe('Messages', function() {
  describe('msgObj.msgType', function() {
    it('should be correct for each type', function() {
      var msgTypes = {
        ledgerUpdateInitiate: 'initiate-update',
        ledgerUpdateConfirm: 'confirm-update',
        ddcd: 'update-status',
        probe: 'probe',
        conditionalPromise: 'conditional-promise',
        pleaseReject: 'please-reject',
        reject: 'reject',
        satisfyCondition: 'satisfy-condition',
     }; 
     for (var func in msgTypes) {
       var msgObj = JSON.parse(messages[func]({ treeToken: 'hello' }));
       assert.equal(msgObj.msgType, msgTypes[func]);
     }
    });
  });
});
