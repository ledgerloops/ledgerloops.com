// using var instead of const here because of https://www.npmjs.com/package/rewire#limitations
var messages = require('./messages');
var debug = require('./debug');
var tokens = require('./tokens');
var Signatures = require('./signatures');
var stringify = require('canonical-json');

const FORWARDING_TIMEOUT = 50;

function SettlementEngine(pendingDebtCallback) {
  this._signatures = new Signatures();
  this._outstandingNegotiations = {};
  this._fundingTransaction = {};
  this._fundedTransaction = {};
  this._pubkeyCreatedFor = {};
  this._recordPendingDebt = pendingDebtCallback;
}

// required fields in obj:
// inNeighborNick
// amount
// currency
SettlementEngine.prototype.initiateNegotiation = function(obj) {
  return this._signatures.generateKeypair().then(pubkey => {
    obj.pubkey = pubkey;
    obj.cleartext = tokens.generateToken();
    obj.transactionId = tokens.generateToken();
    // hack to make outgoing object same format as incoming object:
    obj.challenge = {
      cleartext: obj.cleartext,
      pubkey: obj.pubkey,
    };
    obj.transaction = {
      currency: obj.currency,
      amount: obj.amount,
    };
    // want to send this message to debtor ( = in-neighbor)
    this._outstandingNegotiations[obj.transactionId] = obj;
    // will need this to link funding/funded transaction if this pubkey
    // boomerangs:
    this._pubkeyCreatedFor[obj.pubkey] = obj.transactionId;
  console.log('initiating negotiation, from obj:', obj);
    this._recordPendingDebt(obj.inNeighborNick, obj); // obj should have transactionId, amount, currency
    return Promise.resolve([
      { toNick: obj.inNeighborNick, msg: messages.conditionalPromise(obj) },
    ]);
  });
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
        if (typeof this._outstandingNegotiations[msgObj.transactionId] === 'object') {
          delete this._outstandingNegotiations[msgObj.transactionId];
          if (this._signatures.haveKeypair(msgObj.challenge.pubkey)) { // you are A
            resolve([]);
          } else {
            resolve([
              { toNick: creditorNick, msg: messages.reject(this._fundingTransaction[msgObj.transactionId]) },
            ]);
          }
        } else {
          reject(new Error('unexpected message received, don\'t know what to do now!'));
        }
        break;
      case 'satisfy-condition':
        // TODO: verify if the signature is actually correct
        var ledgerUpdateObj = {
          transactionId: msgObj.transactionId,
          addedDebts: {
            [this._outstandingNegotiations[msgObj.transactionId].transaction.currency]:
                -this._outstandingNegotiations[msgObj.transactionId].transaction.amount,
          },
          debtor: debtorNick,
        };
        if (this._signatures.haveKeypair(this._outstandingNegotiations[msgObj.transactionId].challenge.pubkey)) { // you are the initiator
          resolve([
            { toNick: debtorNick, msg: messages.ledgerUpdateInitiate(ledgerUpdateObj) },
          ]);
        } else {
          var mySatisfyConditionObj = {
            transactionId: this._fundingTransaction[msgObj.transactionId],
            solution: msgObj.solution,
            // TODO: get rid of routing info in satisfy-condition objects:
            treeToken: msgObj.routing.treeToken,
            pathToken: msgObj.routing.pathToken,
          };
          resolve([
            { toNick: debtorNick, msg: messages.ledgerUpdateInitiate(ledgerUpdateObj) },
            { toNick: creditorNick, msg: messages.satisfyCondition(mySatisfyConditionObj) },
          ]);
        }
        break;
      default:
        reject(new Error(`unknown msgType to debtor: ${msgObj.msgType}`));
      }
    } else if (fromRole === 'creditor') {
      switch(msgObj.msgType) {
      case 'conditional-promise':
        // First of all, store it:
        // TODO: prefix transaction ids with id of neighbor who generated that id, to avoid clashes across namespaces.
        this._outstandingNegotiations[msgObj.transaction.id] = msgObj;
        debug.log('conditional-promise from creditor', msgObj);
        if (this._signatures.haveKeypair(msgObj.challenge.pubkey)) { // you are the initiator
console.log('have keypair', this._signatures, msgObj);
          debug.log('pubkey is mine');
          this._fundedTransaction[msgObj.transaction.id] =
              this._pubkeyCreatedFor[msgObj.challenge.pubkey];
          this._fundingTransaction[
              this._pubkeyCreatedFor[msgObj.challenge.pubkey]] =
              msgObj.transaction.id;
console.log('I think I can solve this!', msgObj, this._signatures._challenges);
          this._signatures.sign(msgObj.challenge.cleartext, msgObj.challenge.pubkey).then(solution => {
            msgObj.solution = solution;
            msgObj.transactionId = msgObj.transaction.id;
            // TODO: get rid of routing info in satisfy-condition objects:
            msgObj.treeToken = msgObj.routing.treeToken;
            msgObj.pathToken = msgObj.routing.pathToken;
            this._outstandingNegotiations[msgObj.transaction.id] = 'can-still-reject';
            setTimeout(() => {
              if (typeof this._outstandingNegotiations[msgObj.transaction.id] === 'undefined') {
                resolve([]);
              } else {
                this._outstandingNegotiations[msgObj.transaction.id] = msgObj;
                resolve([
                  { toNick: creditorNick, msg: messages.satisfyCondition(msgObj) },
                ]);
              }
            }, FORWARDING_TIMEOUT);
          });
        } else { // you are B
console.log('not have keypair', this._signatures, msgObj);
          // reuse challenge from incoming message:
          var newMsgObj = {
             pubkey: msgObj.challenge.pubkey,
             cleartext: msgObj.challenge.cleartext,
             // reuse routing info:
             treeToken: msgObj.routing.treeToken,
             pathToken: msgObj.routing.pathToken,
             // set same amount and currency for your own conditional promise as what has been promised to you:
             amount: msgObj.transaction.amount,
             currency: msgObj.transaction.currency,
             // but use your own transactionId:
             transactionId: tokens.generateToken(),
          };
          this._fundedTransaction[msgObj.transaction.id] = newMsgObj.transactionId;
          this._fundingTransaction[newMsgObj.transactionId] = msgObj.transaction.id;

          this._outstandingNegotiations[newMsgObj.transactionId] = 'can-still-reject';
        
          setTimeout(() => {
            if (typeof this._outstandingNegotiations[newMsgObj.transactionId] === 'undefined') {
              resolve([]);
            } else {
              // FIXME: messy way to get data fields in the right structure:
console.log('forwarding negotiation, from obj:', newMsgObj);
              this._recordPendingDebt(debtorNick, newMsgObj); // obj should have transactionId, amount, currency
              this._outstandingNegotiations[newMsgObj.transactionId] = JSON.parse(messages.conditionalPromise(newMsgObj));
              resolve([
                { toNick: debtorNick, msg: messages.conditionalPromise(newMsgObj) },
              ]);
            }
          }, FORWARDING_TIMEOUT);
        }
        break;
      case 'please-reject':
        if (this._outstandingNegotiations[this._fundedTransaction[msgObj.transactionId]] === 'can-still-reject') {
          delete this._outstandingNegotiations[this._fundedTransaction[msgObj.transactionId]];
          resolve([
            { toNick: creditorNick, msg: messages.reject(msgObj) },
          ]);
        } else {
          resolve([
            { toNick: debtorNick, msg: messages.pleaseReject(msgObj) },
          ]);
        }
        break;
      default:
        reject(new Error(`unknown msgType to creditor: ${msgObj.msgType}`));
      }
    }
  });
};

module.exports =  SettlementEngine;
