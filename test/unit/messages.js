var messages = require('../../src/messages');
var assert = require('assert');

describe('Messages', function() {
  describe('msgObj.msgType', function() {
    it('should be correct for each type', function() {
      var msgTypes = {
        IOU: 'IOU',
        confirmIOU: 'confirm-IOU',
        pubkeyAnnounce: 'pubkey-announce',
        conditionalPromise: 'conditional-promise',
        embeddablePromise: 'embeddable-promise',
        satisfyCondition: 'satisfy-condition',
        claimFulfillment: 'claim-fulfillment',
        confirmLedgerUpdate: 'confirm-ledger-update',
     }; 
     for (func in msgTypes) {
       var msgObj = JSON.parse(messages[func]({}));
       assert.equal(msgObj.msgType, msgTypes[func]);
     }
    });
  });
});
