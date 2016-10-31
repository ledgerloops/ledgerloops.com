// using var instead of const here because of https://www.npmjs.com/package/rewire#limitations
var messages = require('./messages');
var debug = require('./debug');
var tokens = require('./tokens');
var Signatures = require('./signatures');
var stringify = require('canonical-json');

const FORWARDING_TIMEOUT = 50;

//  conditionalPromise: function(pubkey, pubkey2) {
//  satisfyCondition: function(pubkey, pubkey2, embeddablePromise, signature) {
//  confirmLedgerUpdate: function(signature) {

// The flow of this engine is as follows:
//
// A owes B owes C owes A 0.01USD.
//
// message types, v0.1:
// * [conditional-promise] C to debtor B: Regarding chain ${A1},
//                                        if ${A1} promises to give 0.01USD to ${C2},
//                                        I will substract it from your debt.
// * [satisfy-condition] A to creditor B: Regarding chain ${A1},
//                                        here is a signed promise for 0.01USD from ${A1}
//                                        to ${C2}, satisfying your condition:
//                                        ${embeddablePromise}, ${signatureFromA1}.
//                                        Please distract it from my debt as promised.
// * [confirm-ledger-update] B to debtor A: Regarding chain ${A1},
//                                          OK, ledger updated, added a reference to
//                                          ${signatureFromA1} in the ledger entry.

function SettlementEngine() {
  this._signatures = new Signatures();
  this._outstandingNegotiations = {};
}

// required fields in obj:
// inNeighborNick
// amount
// currency
SettlementEngine.prototype.initiateNegotiation = function(obj) {
  obj.pubkey = this._signatures.generateKeypair();
  obj.cleartext = tokens.generateToken();
  obj.transactionId = tokens.generateToken();
  // want to send this message to debtor ( = in-neighbor)
  this._outstandingNegotiations[obj.pubkey] = obj;
  return Promise.resolve([
    { toNick: obj.inNeighborNick, msg: messages.conditionalPromise(obj) },
  ]);
};

SettlementEngine.prototype.initiateRejection = function(debtorNick, obj) {
  return Promise.resolve([
    { toNick: debtorNick, msg: messages.pleaseReject(obj) },
  ]);
};

SettlementEngine.prototype.generateReactions = function(fromRole, msgObj, debtorNick, creditorNick) {
  return new Promise((resolve, reject) => {
    if (fromRole === 'debtor') {
      switch(msgObj.msgType) {
      case 'reject':
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
        if (this._signatures.haveKeypair(msgObj.pubkey)) { // you are the initiator
          resolve([
            { to: debtorNick, msg: messages.confirmLedgerUpdate(msgObj) },
          ]);
        } else {
          resolve([
            { to: debtorNick, msg: messages.confirmLedgerUpdate(msgObj) },
            { to: creditorNick, msg: messages.satisfyCondition(msgObj) },
          ]);
        }
        break;
      default:
        reject(new Error(`unknown msgType to debtor: ${msgObj.msgType}`));
      }
    } else if (fromRole === 'creditor') {
      switch(msgObj.msgType) {
      case 'conditional-promise':
        debug.log('conditional-promise from creditor');
        if (this._signatures.haveKeypair(msgObj.pubkey)) { // you are the initiator
          debug.log('pubkey is mine');
          msgObj.signature = this._signatures.sign(msgObj.cleartext, msgObj.pubkey);
          this._outstandingNegotiations[msgObj.pubkey] = 'can-still-reject';
          setTimeout(() => {
            if (typeof this._outstandingNegotiations[msgObj.pubkey] === 'undefined') {
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
