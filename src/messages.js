var stringify = require('./stringify');

// using camelCase for this constant
// instead of UPPER_CASE for easy ES6-style
// inclusion in objects, see below:
const protocolVersion = 'opentabs-net-0.4';

module.exports = {
  protocolVersion,

    /////////////////////
   // Ledger related: //
  /////////////////////

  IOU: function(obj) {
    return stringify({
      protocolVersion,
      msgType: 'IOU',
      debtor: obj.debtor,
      note: obj.note,
      addedDebts: obj.addedDebts, // object { [currency]: amount }
    });
  },
  confirmIOU: function(obj) {
    return stringify({
      protocolVersion,
      msgType: 'confirm-IOU',
      note: obj.note,
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
    console.log('creating probe msg from', obj);
    return stringify({
      protocolVersion,
      msgType: 'probe',
      treeToken: obj.treeToken,
      pathToken: obj.pathToken,
      currency: obj.currency,
    });
  },

    ///////////////////////////////
   // SettlementEngine related: //
  ///////////////////////////////

// * [pubkey-announce] A to C: My pubkey is ${A1}.
  pubkeyAnnounce: function(obj) {
    return stringify({
      protocolVersion,
      msgType: 'pubkey-announce',
      treeToken: obj.treeToken,
      pathToken: obj.pathToken,
      pubkey: obj.pubkey,
    });
  },
// * [conditional-promise] C to B: If ${A1} promises to give 0.01USD to ${C2},
//                                 I will substract it from your debt.
  conditionalPromise: function(obj) {
    return stringify({
      protocolVersion,
      msgType: 'conditional-promise',
      pubkey: obj.pubkey,
      pubkey2: obj.pubkey2,
      treeToken: obj.treeToken,
      pathToken: obj.pathToken,
    });
  },
// * [embeddable-promise] (signed, not sent): ${A1} promises to give 0.01USD to ${C2}.
  embeddablePromise: function(obj) {
    return stringify({
      protocolVersion,
      msgType: 'embeddable-promise',
      // no tree/path token since this message will not be sent/routed
      pubkey: obj.pubkey,
      pubkey2: obj.pubkey2,
    });
  },
// * [satisfy-condition] A to B: Here is a signed promise for 0.01USD from ${A1}
//                               to ${C2}, satisfying your condition:
//                               ${embeddablePromise}, ${signatureFromA1}.
//                               Please distract it from my debt as promised.
  satisfyCondition: function(obj) {
    return stringify({
      protocolVersion,
      msgType: 'satisfy-condition',
      treeToken: obj.treeToken,
      pathToken: obj.pathToken,
      pubkey: obj.pubkey,
      pubkey2: obj.pubkey2,
      embeddablePromise: obj.embeddablePromise,
      signature: obj.signature,
    });
  },
// * [claim-fulfillment] C to A: Here is a signed promise for 0.01USD from ${A1}
//                               (which is you) to ${C2} (which is me):
//                               ${embeddablePromise}, ${signatureFromA1}.
//                               Let's settle it against my debt.
//                               ${proofOfOwningC2}
  claimFulfillment: function(obj) {
    return stringify({
      protocolVersion,
      msgType: 'claim-fulfillment',
      treeToken: obj.treeToken,
      pathToken: obj.pathToken,
      embeddablePromise: obj.embeddablePromise,
      pubkey: obj.pubkey,
      signature: obj.signature,
      pubkey2: obj.pubkey2,
      proofOfOwnership: obj.proofOfOwnership,
    });
  },
// * [confirm-ledger-update] B to A: OK, ledger updated, added a reference to
//                                   chain ${A1} in the ledger entry.
  confirmLedgerUpdate: function(obj) {
    return stringify({
      protocolVersion,
      msgType: 'confirm-ledger-update',
      treeToken: obj.treeToken,
      pathToken: obj.pathToken,
      pubkey: obj.pubkey,
    });
  },
};
