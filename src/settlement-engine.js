const messages = require('./messages');
const signatures = require('./signatures');
const stringify = require('./stringify');

//  pubkeyAnnounce: function(pubkey) {
//  conditionalPromise: function(pubkey1, pubkey2) {
//  embeddablePromise: function(pubkey1, pubkey2) {
//  satisfyCondition: function(pubkey1, pubkey2, embeddablePromise, signature) {
//  claimFulfillment: function(pubkey1, pubkey2, embeddablePromise, signature1, proofOfOwnership2) {
//  confirmLedgerUpdate: function(signature) {

// The flow of this engine is as follows:
//
// A owes B owes C owes A 0.01USD.
//
// message types, v0.1:
// * [pubkey-announce] A to debtor C: My pubkey is ${A1}.
//
// * [conditional-promise] C to debtor B: If ${A1} promises to give 0.01USD to ${C2},
//                                        I will substract it from your debt.
// * [conditional-promise] B to debtor A: If ${A1} promises to give 0.01USD to ${C2},
//                                        I will substract it from your debt.
//
// * [embeddable-promise] (signed, not sent): ${A1} promises to give 0.01USD to ${C2}.
//
// * [satisfy-condition] A to creditor B: Here is a signed promise for 0.01USD from ${A1}
//                                        to ${C2}, satisfying your condition:
//                                        ${embeddablePromise}, ${signatureFromA1}.
//                                        Please distract it from my debt as promised.
// * [confirm-ledger-update] B to debtor A: OK, ledger updated, added a reference to
//                                          ${signatureFromA1} in the ledger entry.
//
// * [satisfy-condition] B to creditor C: Here is a signed promise for 0.01USD from ${A1}
//                                        to ${C2}, satisfying your condition:
//                                        ${embeddablePromise}, ${signatureFromA1}.
//                                        Please distract it from my debt as promised.
// * [confirm-ledger-update] C to debtor B: OK, ledger updated, added a reference to
//                                          ${signatureFromA1} in the ledger entry.
//
// * [claim-fulfillment] C to creditor A: Here is a signed promise for 0.01USD from ${A1}
//                                        (which is you) to ${C2} (which is me):
//                                        ${embeddablePromise}, ${signatureFromA1}.
//                                        Let's settle it against my debt.
//                                        ${proofOfOwningC2}
// * [confirm-ledger-update] A to debtor C: OK, ledger updated, added a reference to
//                                          ${signatureFromA1} in the ledger entry.

function SettlementEngine() { // messagesMock, signaturesMock) {
//  // for unit tests, FIXME: use proper mocking tools for this (but for now this is
//  // just exploratory draft code, not meant for publication, so good enough like this).
//  // note that this is not currently used as there is only an integration test for
//  // settlements which tests this settlement-engine + messages + signatures,
//  // not a unit test for settlement-engine itself.
//  if (messagesMock) {
//    messages = messagesMock;
//  } else {
//    messages = messages;
//  }
//  if (signaturesMock) {
//    signatures = signaturesMock;
//  } else {
//    signatures = signatures;
//  }
}

SettlementEngine.prototype.generateReactions = function(fromRole, msgObj, debtorNick, creditorNick) {
  console.log('generateReactions', fromRole, msgObj, debtorNick, creditorNick);
  return new Promise((resolve, reject) => {
    if (fromRole === 'debtor') {
      switch(msgObj.msgType) {
      case 'satisfy-condition':
        console.log('satisfy-condition from debtor', msgObj);
        if (this.keypair && msgObj.embeddablePromise.pubkey2 === this.keypair.pub) { // you are C
          // reduce B's debt on ledger
          resolve([
            { to: debtorNick, msg: messages.confirmLedgerUpdate() },
            { to: creditorNick, msg: messages.claimFulfillment(msgObj.embeddablePromise) },
          ]);
        } else { // you are B
          // reduce A's debt on ledger
          resolve([
            { to: debtorNick, msg: messages.confirmLedgerUpdate() },
            { to: creditorNick, msg: stringify(msgObj) },
          ]);
        }
        break;
      case 'claim-fulfillment': // you are A
        // reduce C's debt:
        resolve([
          { to: debtorNick, msg: messages.confirmLedgerUpdate() },
        ]);
        break;
      default:
        reject(`unknown msgType to debtor: ${msgObj.msgType}`);
      }
    } else if (fromRole === 'creditor') {
      switch(msgObj.msgType) {
      case 'pubkey-announce': // you are C
        this.keypair = signatures.generateKeypair();
        var condProm = messages.conditionalPromise(msgObj.pubkey, this.keypair.pub);
        resolve([
          { to: debtorNick, msg: condProm },
        ]);
        break;
      case 'conditional-promise':
        console.log('conditional-promise from creditor');
        if (this.keypair && msgObj.pubkey1 == this.keypair.pub) { // you are A
          console.log('pubkey1 is mine');
          // create embeddable promise
          var embeddablePromise = messages.embeddablePromise(this.keypair.pub, msgObj.pubkey2);
          var signature = signatures.sign(embeddablePromise, this.keypair);
          // FIXME: not sure yet if embeddablePromise should be double-JSON-encoded to make signature deterministic,
          // or included in parsed form (as it is now), to make the message easier to machine-read later:
          var msg2 = messages.satisfyCondition(this.keypair.pub, msgObj.pubkey2, JSON.parse(embeddablePromise), signature);
          resolve([
            { to: creditorNick, msg: msg2 },
           ]);
        } else { // you are B
          resolve([
            { to: debtorNick, msg: stringify(msgObj) },
          ]);
        }
        break;
      case 'confirm-ledger-update':
        // TODO: encode ledger update into reactions returned here
        resolve([]);
        break;
      default:
        reject(`unknown msgType to creditor: ${msgObj.msgType}`);
      }
    // TODO: Make this a separate function:
    } else {
      this.keypair = signatures.generateKeypair();
      var msg = messages.pubkeyAnnounce(this.keypair.pub);
      resolve([
        { to: debtorNick, msg },
      ]);
    }
  });
}

module.exports = SettlementEngine;
