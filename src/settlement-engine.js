// using var instead of const here because of https://www.npmjs.com/package/rewire#limitations
var messages = require('./messages');
var debug = require('./debug');
var Signatures = require('./signatures');
var stringify = require('canonical-json');

const FORWARDING_TIMEOUT = 50;

//  pubkeyAnnounce: function(pubkey) {
//  conditionalPromise: function(pubkey, pubkey2) {
//  embeddablePromise: function(pubkey, pubkey2) {
//  satisfyCondition: function(pubkey, pubkey2, embeddablePromise, signature) {
//  claimFulfillment: function(pubkey, pubkey2, embeddablePromise, signature, proofOfOwnership) {
//  confirmLedgerUpdate: function(signature) {

// The flow of this engine is as follows:
//
// A owes B owes C owes A 0.01USD.
//
// message types, v0.1:
// * [pubkey-announce] A to debtor C: My pubkey is ${A1}. Let's try to start a chain for 0.01 USD!
//
// * [conditional-promise] C to debtor B: Regarding chain ${A1},
//                                        if ${A1} promises to give 0.01USD to ${C2},
//                                        I will substract it from your debt.
// * [conditional-promise] B to debtor A: Regarding chain ${A1},
//                                        if ${A1} promises to give 0.01USD to ${C2},
//                                        I will substract it from your debt.
//
// * [embeddable-promise] (signed, not sent): ${A1} promises to give 0.01USD to ${C2}.
//
// * [satisfy-condition] A to creditor B: Regarding chain ${A1},
//                                        here is a signed promise for 0.01USD from ${A1}
//                                        to ${C2}, satisfying your condition:
//                                        ${embeddablePromise}, ${signatureFromA1}.
//                                        Please distract it from my debt as promised.
// * [confirm-ledger-update] B to debtor A: Regarding chain ${A1},
//                                          OK, ledger updated, added a reference to
//                                          ${signatureFromA1} in the ledger entry.
//
// * [satisfy-condition] B to creditor C: Regarding chain ${A1},
//                                        here is a signed promise for 0.01USD from ${A1}
//                                        to ${C2}, satisfying your condition:
//                                        ${embeddablePromise}, ${signatureFromA1}.
//                                        Please distract it from my debt as promised.
// * [confirm-ledger-update] C to debtor B: Regarding chain ${A1},
//                                          OK, ledger updated, added a reference to
//                                          ${signatureFromA1} in the ledger entry.
//
// * [claim-fulfillment] C to creditor A: Regarding chain ${A1},
//                                        here is a signed promise for 0.01USD from ${A1}
//                                        (which is you) to ${C2} (which is me):
//                                        ${embeddablePromise}, ${signatureFromA1}.
//                                        Let's settle it against my debt.
//                                        ${proofOfOwningC2}
// * [confirm-ledger-update] A to debtor C: Regarding chain ${A1},
//                                          OK, ledger updated, added a reference to
//                                          ${signatureFromA1} in the ledger entry.

function SettlementEngine() {
  this._signatures = new Signatures();
  console.log('SettlementEngine created', this);
  this._outstandingNegotiations = {};
}

// required fields in obj:
// inNeighborNick
// amount
// currency
SettlementEngine.prototype.initiateNegotiation = function(obj) {
  obj.pubkey = this._signatures.generateKeypair();
  console.log('initiateNeg', obj);
  // want to send this message to debtor ( = in-neighbor)
  this._outstandingNegotiations[obj.pubkey] = obj;
  return Promise.resolve([
    { toNick: obj.inNeighborNick, msg: messages.pubkeyAnnounce(obj) },
  ]);
};

SettlementEngine.prototype.initiateRejection = function(debtorNick, obj) {
  return Promise.resolve([
    { toNick: debtorNick, msg: messages.pleaseReject(obj) },
  ]);
};

SettlementEngine.prototype.generateReactions = function(fromRole, msgObj, debtorNick, creditorNick) {
  console.log('generateReactions', {fromRole, msgObj, debtorNick, creditorNick}, msgObj);
  return new Promise((resolve, reject) => {
    if (fromRole === 'debtor') {
      switch(msgObj.msgType) {
      case 'reject':
        console.log(this);
        if (typeof this._outstandingNegotiations[msgObj.pubkey] === 'object') {
          delete this._outstandingNegotiations[msgObj.pubkey];
          if (this._signatures.haveKeypair(msgObj.pubkey)) { // you are A
            resolve([]);
          } else {
            resolve([
              { to: creditorNick, msg: messages.reject(msgObj) },
            ]);
          }
        } else {
          reject(new Error('unexpected message received, don\'t know what to do now!'));
        }
        break;
      case 'satisfy-condition':
        console.log('satisfy-condition from debtor', msgObj);
        if (this._signatures.haveKeypair(msgObj.embeddablePromise.pubkey2)) { // you are C
          // reduce B's debt on ledger
          msgObj.proofOfOwnership = this._signatures.proofOfOwnership(msgObj.embeddablePromise.pubkey2);
          resolve([
            { to: debtorNick, msg: messages.confirmLedgerUpdate(msgObj) },
            { to: creditorNick, msg: messages.claimFulfillment(msgObj) },
          ]);
        } else { // you are B
          // reduce A's debt on ledger
          resolve([
            { to: debtorNick, msg: messages.confirmLedgerUpdate(msgObj) },
            { to: creditorNick, msg: messages.satisfyCondition(msgObj) },
          ]);
        }
        break;
      case 'claim-fulfillment': // you are A
        // reduce C's debt:
        // TODO, here and in other places: actually check the signature on the claim and stuff :)
        resolve([
          { to: debtorNick, msg: messages.confirmLedgerUpdate(msgObj) },
        ]);
        break;
      default:
        reject(new Error(`unknown msgType to debtor: ${msgObj.msgType}`));
      }
    } else if (fromRole === 'creditor') {
      switch(msgObj.msgType) {
      case 'pubkey-announce': // you are C
        msgObj.pubkey2 = this._signatures.generateKeypair();
        this._outstandingNegotiations[msgObj.pubkey] = 'can-still-reject';
        setTimeout(() => {
          if (typeof this._outstandingNegotiations[msgObj.pubkey] === 'undefined') {
            console.log('chain was rejected shortly after it reached me!');
            resolve([]);
          } else {
            this._outstandingNegotiations[msgObj.pubkey] = msgObj;
            resolve([
              { to: debtorNick, msg: messages.conditionalPromise(msgObj) },
            ]);
          }
        }, FORWARDING_TIMEOUT);
        break;
      case 'conditional-promise':
        debug.log('conditional-promise from creditor');
        if (this._signatures.haveKeypair(msgObj.pubkey)) { // you are A
          debug.log('pubkey is mine');
          // create embeddable promise
          // FIXME: not sure yet if embeddablePromise should be double-JSON-encoded to make signature deterministic,
          // or included in parsed form (as it is now), to make the message easier to machine-read later:
          msgObj.embeddablePromise = JSON.parse(messages.embeddablePromise(msgObj));
          msgObj.signature = this._signatures.sign(msgObj.embeddablePromise, msgObj.pubkey);
          console.log(msgObj);
          this._outstandingNegotiations[msgObj.pubkey] = 'can-still-reject';
          setTimeout(() => {
            if (typeof this._outstandingNegotiations[msgObj.pubkey] === 'undefined') {
              console.log('chain was rejected shortly after it reached me!');
              resolve([]);
            } else {
              this._outstandingNegotiations[msgObj.pubkey] = msgObj;
              resolve([
                { to: creditorNick, msg: messages.satisfyCondition(msgObj) },
              ]);
            }
          }, FORWARDING_TIMEOUT);
        } else { // you are B
          this._outstandingNegotiations[msgObj.pubkey] = 'can-still-reject';
          setTimeout(() => {
            if (typeof this._outstandingNegotiations[msgObj.pubkey] === 'undefined') {
              console.log('chain was rejected shortly after it reached me!');
              resolve([]);
            } else {
              this._outstandingNegotiations[msgObj.pubkey] = msgObj;
              resolve([
                { to: debtorNick, msg: messages.conditionalPromise(msgObj) },
              ]);
            }
          }, FORWARDING_TIMEOUT);
        }
        break;
      case 'please-reject':
        if (this._outstandingNegotiations[msgObj.pubkey] === 'can-still-reject') {
          delete this._outstandingNegotiations[msgObj.pubkey];
          resolve([
            { to: creditorNick, msg: messages.reject(msgObj) },
          ]);
        } else {
          resolve([
            { to: debtorNick, msg: messages.pleaseReject(msgObj) },
          ]);
        }
        break;
      case 'confirm-ledger-update':
        // TODO: encode ledger update into reactions returned here
        delete this._outstandingNegotiations[msgObj.pubkey];
        resolve([]);
        break;
      default:
        reject(new Error(`unknown msgType to creditor: ${msgObj.msgType}`));
      }
    }
  });
};

module.exports =  SettlementEngine;
