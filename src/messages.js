var stringify = require('canonical-json');

// using camelCase for this constant
// instead of UPPER_CASE for easy ES6-style
// inclusion in objects, see below:
const negotiationProtocolVersion = 'ledgerloops-0.4';
const routingProtocolVersion = 'ddcd-dfs-0.1';
const ledgerProtocolVersion = 'local-ledgers-0.1';

module.exports = {
  protocolVersions: {
    negotiation: negotiationProtocolVersion,
    routing: routingProtocolVersion,
    ledger: ledgerProtocolVersion,
  },

    /////////////////////
   // Ledger related: //
  /////////////////////

  ledgerUpdateInitiate: function(obj) {
    return stringify({
      protocol: ledgerProtocolVersion,
      msgType: 'initiate-update',
      transactionId: obj.transactionId,
      note: obj.note,
      debtor: obj.debtor,
      addedDebts: obj.addedDebts, // object { [currency]: amount }
    });
  },
  ledgerUpdateConfirm: function(obj) {
    return stringify({
      protocol: ledgerProtocolVersion,
      msgType: 'confirm-update',
      transactionId: obj.transactionId,
    });
  },

    //////////////////////
   // Routing related: //
  //////////////////////

  ddcd: function(obj) {
    return stringify({
      protocol: routingProtocolVersion,
      msgType: 'update-status',
      currency: obj.currency,
      value: obj.value,
      isReply: !!obj.isReply,
    });
  },
  probe: function(obj) {
    return stringify({
      protocol: routingProtocolVersion,
      msgType: 'probe',
      treeToken: obj.treeToken,
      pathToken: obj.pathToken,
      currency: obj.currency,
    });
  },

    //////////////////////////
   // Negotiation related: //
  //////////////////////////

// * [conditional-promise] C to B: If ${A1} promises to give 0.01USD to ${C2},
//                                 I will substract it from your debt.
  conditionalPromise: function(obj) {
    return stringify({
      protocol: negotiationProtocolVersion,
      msgType: 'conditional-promise',
      transaction: {
        id: obj.transactionId,
        currency: obj.currency,
        amount: obj.amount,
      },
      challenge: {
        name: 'ECDSA',
        namedCurve: 'P-256',
        pubkey: obj.pubkey,
        cleartext: obj.cleartext,
      },
      routing: {
        protocol: routingProtocolVersion,
        treeToken: obj.treeToken,
        pathToken: obj.pathToken,
      },
    });
  },
// * [please-reject] C to B: Please reject my outstanding conditionalPromise
//                           with this routingInfo
  pleaseReject: function(obj) {
    return stringify({
      protocol: negotiationProtocolVersion,
      msgType: 'please-reject',
      transactionId: obj.transactionId,
    });
  },
// * [reject] B to C: Rejecting outstanding conditionalPromise
//                           with this routingInfo
  reject: function(obj) {
    return stringify({
      protocol: negotiationProtocolVersion,
      msgType: 'reject',
      transactionId: obj.transactionId,
    });
  },
// * [satisfy-condition] A to B: Here is a signed promise for 0.01USD from ${A1}
//                               to ${C2}, satisfying your condition:
//                               ${embeddablePromise}, ${signatureFromA1}.
//                               Please distract it from my debt as promised.
  satisfyCondition: function(obj) {
    if (typeof obj.treeToken === 'undefined') {
      throw new Error('where is your treeToken?');
    }
    return stringify({
      protocol: negotiationProtocolVersion,
      msgType: 'satisfy-condition',
      transactionId: obj.transactionId,
      solution: obj.solution,
      // TODO: get rid of routing info in this message type, transactionId should be enough for agents.
      routing: {
        protocol: routingProtocolVersion,
        treeToken: obj.treeToken,
        pathToken: obj.pathToken,
      },
    });
  },
};
