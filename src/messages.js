var stringify = require('./stringify');

module.exports = {
  IOU: function(debt) {
    return stringify({
      msgType: 'IOU',
      debt,
    });
  },
  confirmIOU: function(note) {
    return stringify({
      msgType: 'confirm-IOU',
      note,
    });
  },
// * [pubkey-announce] A to C: My pubkey is ${A1}.
  pubkeyAnnounce: function(pubkey) {
    return stringify({
      msgType: 'pubkey-announce',
      pubkey,
    });
  },
// * [conditional-promise] C to B: If ${A1} promises to give 0.01USD to ${C2},
//                                 I will substract it from your debt.
  conditionalPromise: function(pubkey, pubkey2) {
    return stringify({
      msgType: 'conditional-promise',
      pubkey,
      pubkey2,
    });
  },
// * [embeddable-promise] (signed, not sent): ${A1} promises to give 0.01USD to ${C2}.
  embeddablePromise: function(pubkey, pubkey2) {
    return stringify({
      msgType: 'embeddable-promise',
      pubkey,
      pubkey2,
    });
  },
// * [satisfy-condition] A to B: Here is a signed promise for 0.01USD from ${A1}
//                               to ${C2}, satisfying your condition:
//                               ${embeddablePromise}, ${signatureFromA1}.
//                               Please distract it from my debt as promised.
  satisfyCondition: function(pubkey, pubkey2, embeddablePromise, signature) {
    return stringify({
      msgType: 'satisfy-condition',
      pubkey,
      pubkey2,
      embeddablePromise,
      signature,
    });
  },
// * [claim-fulfillment] C to A: Here is a signed promise for 0.01USD from ${A1}
//                               (which is you) to ${C2} (which is me):
//                               ${embeddablePromise}, ${signatureFromA1}.
//                               Let's settle it against my debt.
//                               ${proofOfOwningC2}
  claimFulfillment: function(pubkey, pubkey2, embeddablePromise, signature1, proofOfOwnership2) {
    return stringify({
      msgType: 'claim-fulfillment',
      embeddablePromise,
      pubkey,
      signature1,
      pubkey2,
      proofOfOwnership2,
    });
  },
// * [confirm-ledger-update] B to A: OK, ledger updated, added a reference to
//                                   chain ${A1} in the ledger entry.
  confirmLedgerUpdate: function(pubkey) {
    return stringify({
      msgType: 'confirm-ledger-update',
      pubkey,
    });
  },
};
