var stringify = require('./stringify');

// using camelCase for this constant
// instead of UPPER_CASE for easy ES6-style
// inclusion in objects, see below:
const protocolVersion = 'opentabs-net-0.3';

module.exports = {

    /////////////////////
   // Ledger related: //
  /////////////////////

  IOU: function(debt) {
    return stringify({
      protocolVersion,
      msgType: 'IOU',
      debt,
    });
  },
  confirmIOU: function(note) {
    return stringify({
      protocolVersion,
      msgType: 'confirm-IOU',
      note,
    });
  },

    /////////////////////
   // Search related: //
  /////////////////////

  ddcd: function(obj) {
    return stringify({
      protocolVersion,
      msgType: 'dynamic-decentralized-cycle-detection',
      direction: obj.direction,
      currency: obj.currency,
      value: obj.value,
    });
  },

    //////////////////////////
   // ProbeEngine related: //
  //////////////////////////

  probe: function(obj) {
    return stringify({
      protocolVersion,
      msgType: 'probe',
      treeToken: obj.treeToken,
      pathToken: obj.pathToken,
    });
  },

    ///////////////////////////////
   // SettlementEngine related: //
  ///////////////////////////////

// * [pubkey-announce] A to C: My pubkey is ${A1}.
  pubkeyAnnounce: function(pubkey) {
    return stringify({
      protocolVersion,
      msgType: 'pubkey-announce',
      pubkey,
    });
  },
// * [conditional-promise] C to B: If ${A1} promises to give 0.01USD to ${C2},
//                                 I will substract it from your debt.
  conditionalPromise: function(pubkey, pubkey2) {
    return stringify({
      protocolVersion,
      msgType: 'conditional-promise',
      pubkey,
      pubkey2,
    });
  },
// * [embeddable-promise] (signed, not sent): ${A1} promises to give 0.01USD to ${C2}.
  embeddablePromise: function(pubkey, pubkey2) {
    return stringify({
      protocolVersion,
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
      protocolVersion,
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
      protocolVersion,
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
      protocolVersion,
      msgType: 'confirm-ledger-update',
      pubkey,
    });
  },
};
