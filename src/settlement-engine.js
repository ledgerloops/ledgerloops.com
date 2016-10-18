const messages = require('./messages');
const signatures = require('./signatures');

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
// * [pubkey-announce] A to C: My pubkey is ${A1}.
//
// * [conditional-promise] C to B: If ${A1} promises to give 0.01USD to ${C2},
//                                 I will substract it from your debt.
// * [conditional-promise] B to A: If ${A1} promises to give 0.01USD to ${C2},
//                                 I will substract it from your debt.
//
// * [embeddable-promise] (signed, not sent): ${A1} promises to give 0.01USD to ${C2}.
//
// * [satisfy-condition] A to B: Here is a signed promise for 0.01USD from ${A1}
//                               to ${C2}, satisfying your condition:
//                               ${embeddablePromise}, ${signatureFromA1}.
//                               Please distract it from my debt as promised.
// * [confirm-ledger-update] B to A: OK, ledger updated, added a reference to
//                                   ${signatureFromA1} in the ledger entry.
//
// * [satisfy-condition] B to C: Here is a signed promise for 0.01USD from ${A1}
//                               to ${C2}, satisfying your condition:
//                               ${embeddablePromise}, ${signatureFromA1}.
//                               Please distract it from my debt as promised.
// * [confirm-ledger-update] C to B: OK, ledger updated, added a reference to
//                                   ${signatureFromA1} in the ledger entry.
//
// * [claim-fulfillment] C to A: Here is a signed promise for 0.01USD from ${A1}
//                               (which is you) to ${C2} (which is me):
//                               ${embeddablePromise}, ${signatureFromA1}.
//                               Let's settle it against my debt.
//                               ${proofOfOwningC2}
// * [confirm-ledger-update] A to C: OK, ledger updated, added a reference to
//                                   ${signatureFromA1} in the ledger entry.

function SettlementEngine(messagesMock, signaturesMock) {
  // for unit tests, FIXME: use proper mocking tools for this (but for now this is
  // just exploratory draft code, not meant for publication, so good enough like this).
  if (messagesMock) {
    this.messages = messagesMock;
  } else {
    this.messages = messages;
  }
  if (signaturesMock) {
    this.signatures = signaturesMock;
  } else {
    this.signatures = signatures;
  }
}

SettlementEngine.prototype.generateReactions = function(incomingMsg, from) {
  if (from === 'debtor') {
    switch(msg.type) {
    case 'satisfy-condition':
      if (msg.embeddablePromise.pubkey2 === this.pubkey) { // you are C
        // reduce B's debt on ledger
        return [
          { to: 'debtor', msg: this.messages.confirmLedgerUpdate() },
          { to: 'creditor', msg: this.messages.claimFulfillment(msg.embeddablePromise) },
        ];
      } else { // you are B
        // reduce A's debt on ledger
        return [
          { to: 'debtor', msg: this.messages.confirmLedgerUpdate() },
          { to: 'creditor', msg },
        ];
      }
      break;
    case 'claim-fulfillment': // you are A
      // reduce C's debt
      return [
        { to: 'debtor', msg: this.messages.confirmLedgerUpdate() },
      ];
      break;
    }
  } else if (from === 'creditor') {
    switch(msg.msgType) {
    case 'pubkey-announce': // you are C
      this.keypair = this.signatures.generateKeypair();
      var condProm = this.messages.conditionalPromise(msg.pubkey, this.keypair.pub);
      return [
        { to: 'debtor', msg },
      ];
      break;
    case 'conditional-promise':
      if (msg.pubkey1 == this.keypair.pub) { // you are A
        // create embeddable promise
        var embeddablePromise = this.messages.embeddablePromise(this.keypair.pub, msg.pubkey2);
        var signature = this.signatures.sign(embeddablePromise, this.keypair);
        var msg2 = this.messages.satisfyCondition(this.keypair.pub, msg.pubkey2, embeddablePromise, signature);
        return [
          { to: 'creditor', msg: msg2 },
         ];
      } else { // you are B
        return [
          { to: 'debtor', msg },
        ];
      }
      break;
    }
  } else {
    this.keypair = this.signatures.generateKeypair();
    var msg = this.messages.announcePubkey(this.keypair.pub);
    return [
      { to: 'debtor', msg },
    ];
  }
}

module.exports = SettlementEngine;
