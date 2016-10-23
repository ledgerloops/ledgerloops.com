var Ledger = require('./ledgers');
var SettlementEngine = require('./settlement-engine');
var Search = require('./search');
var stringify = require('./stringify');
var messaging = require('./messaging');
var messages = require('./messages');

const PROBE_INTERVAL = 1000;

function Agent(myNick) {
  this._settlementEngine = new SettlementEngine();
  this._search = new Search(this._sendMessages.bind(this));
  this._myNick = myNick;
  this._ledgers = {};
  this._sentIOUs = {};
  messaging.addChannel(myNick, (fromNick, msgStr) => {
    return this._handleMessage(fromNick, JSON.parse(msgStr));
  });
}

Agent.prototype._ensurePeer = function(peerNick) {
  if (typeof this._ledgers[peerNick] === 'undefined') {
    this._ledgers[peerNick] = new Ledger(peerNick, this._myNick);
  }
};

Agent.prototype.sendIOU = function(creditorNick, amount, currency) {
  this._ensurePeer(creditorNick);
  var debt = this._ledgers[creditorNick].createIOU(amount, currency);
  messaging.send(this._myNick, creditorNick, messages.IOU(debt));
  return new Promise((resolve, reject) => {
    this._sentIOUs[debt.note] = { resolve, reject };
  });
};

Agent.prototype._sendMessages = function(reactions) {
  var promises = [];
  for (var i=0; i<reactions.length; i++) {
    promises.push(messaging.send(this._myNick, reactions[i].toNick, reactions[i].msg));
  }
  return Promise.all(promises);
};

Agent.prototype._handleMessage = function(fromNick, incomingMsgObj) {
  var neighborChanges;
  switch(incomingMsgObj.msgType) {

  case 'IOU':
    // for simplicity, always accept the IOU.
    var debt = incomingMsgObj.debt;
    debt.confirmedByPeer = true;
    this._ensurePeer(fromNick);
    neighborChanges = this._ledgers[fromNick].addDebt(debt);
    return this._sendMessages([{
      toNick: fromNick,
      msg: messages.confirmIOU(debt.note),
    }]).then(() => {
      return Promise.all(neighborChanges.map(neighborChange => this._search.onNeighborChange(neighborChange))).then(results => {
        var promises = [];
        for (var i=0; i<results.length; i++) {
          for (var j=0; j<results[i].length; j++) {
            promises.push(messaging.send(this._myNick, results[i][j].peerNick, messages.ddcd(results[i][j])));
          }
        }
        return Promise.all(promises);
      });
    });
    // break;

  case 'confirm-IOU':
    neighborChanges = this._ledgers[fromNick].markIOUConfirmed(incomingMsgObj.note);
    return Promise.all(neighborChanges.map(neighborChange => this._search.onNeighborChange(neighborChange))).then(results => {
      var promises = [];
      for (var i=0; i<results.length; i++) {
        for (var j=0; j<results[i].length; j++) {
          promises.push(messaging.send(this._myNick, results[i][j].peerNick, messages.ddcd(results[i][j])));
        }
      }
      return Promise.all(promises);
    }).then(() => {
      // handle callbacks linked to this sentIOU:
      this._sentIOUs[incomingMsgObj.note].resolve();
      delete this._sentIOUs[incomingMsgObj.note];
    });
    // break;

  case 'dynamic-decentralized-cycle-detection':
    var result = this._search.onStatusMessage(incomingMsgObj.direction, fromNick, incomingMsgObj.currency, incomingMsgObj.value);
    return Promise.resolve();
    // break;
  default: // msgType is not related to ledgers, but to settlements:
    var [ debtorNick, creditorNick ] = this._search.getPeerPair(incomingMsgObj.pubkey);
    if (fromNick === debtorNick) {
      fromRole = 'debtor';
    } else if (fromNick === creditorNick) {
      fromRole = 'creditor';
    } else {
      throw new Error(`fromNick matches neither debtorNick nor creditorNick`);
    }
    return this._settlementEngine.generateReactions(fromRole, debtorNick, creditorNick,
        incomingMsgObj).then(this._sendMessages.bind(this));
    break;
  }
};

module.exports = Agent;
