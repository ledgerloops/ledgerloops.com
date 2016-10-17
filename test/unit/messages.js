var messages = require('../../src/messages');

var tests = [
  (function test_msgTypeMatches() {
    return new Promise((resolve, reject) => {
      var msgTypes = {
        pubkeyAnnounce: 'pubkey-announce',
        conditionalPromise: 'conditional-promise',
        embeddablePromise: 'embeddable-promise',
        satisfyCondition: 'satisfy-condition',
        claimFulfillment: 'claim-fulfillment',
        confirmLedgerUpdate: 'confirm-ledger-update',
     }; 
      for (func in msgTypes) {
        var msg = JSON.parse(messages[func]());
        if (msg.msgType !== msgTypes[func]) {
          console.log(func, msgTypes[func], msg.msgType);
          reject();
          return;
        }
      }
      resolve();
    });
  })(),
];

Promise.all(tests).then(() => { console.log('OK'); });
