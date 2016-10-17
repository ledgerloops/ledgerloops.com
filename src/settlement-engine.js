const messages = require('./messages');
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

function announcePubkeyToDebtor(debtor) { // you are A
  // generate A1
  // send it to C
}

function onMessageFromCreditor(creditor, msg) {
  switch(msg.type) {
  case 'pubkey-announce': // you are C
    // generate C2
    var condProm = createConditionalPromise(msg.pubkey, C2);
    // send condProm to B
    break;
  case 'conditional-promise':
    if (msg.pubkey1 == A1) { // you are A
      // create embeddable promise
      // sign it with A1
      // put it inside a satisfy-condition
      // send it to B
    } else { // you are B
      // send msg to A
    }
    break;
  }
}
function onMessageFromDebtor(debtor, msg) {
  switch(msg.type) {
  case 'satisfy-condition':
    if (msg.embeddablePromise.pubkey2 === C2) { // you are C
      // reduce B's debt on ledger
      // send confirm-ledger-update to B
      // send claim-fulfillment to A
    } else { // you are B
      // reduce A's debt on ledger
      // send confirm-ledger-update to A
      // send msg to C
    }
    break;
  case 'claim-fulfillment': // you are A
    // reduce C's debt
      // send confirm-ledger-update to C
    break;
  }
}
