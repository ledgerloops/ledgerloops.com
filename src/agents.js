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
  messaging.addChannel(myNick, (fromNick, msgStr) => {
    this._handleMessage(fromNick, JSON.parse(msgStr));
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
  return messaging.send(this._myNick, creditorNick, messages.IOU(debt));
};

Agent.prototype._sendMessages = function(reactions) {
  console.log(reactions);
  for (var i=0; i<reactions.length; i++) {
    messaging.send(this._myNick, reactions[i].toNick, reactions[i].msg);
  }
};

Agent.prototype._handleMessage = function(fromNick, incomingMsgObj) {
  switch(incomingMsgObj.msgType) {

  case 'IOU':
    // for simplicity, always accept the IOU.
    var debt = incomingMsgObj.debt;
    debt.confirmedByPeer = true;
    this._ensurePeer(fromNick);
    var neighborChange = this._ledgers[fromNick].addDebt(debt);
    return this._sendMessages([{
      toNick: fromNick,
      msg: messages.confirmIOU(fromNick, debt.note),
    }]).then(() => {
      return this._search.onNeighborChange(neighborChange);
    });
    // break;

  case 'confirm-IOU':
    var neighborChange = this._ledgers[fromNick].markIOUConfirmed(incomingMsgObj.note);
    return this._search.onNeighborChange(neighborChange);
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
    this._settlementEngine.generateReactions(fromRole, debtorNick, creditorNick,
        incomingMsgObj).then(this._sendMessages.bind(this));
    break;
  }
};

module.exports = Agent;
