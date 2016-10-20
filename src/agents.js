var Ledger = require('./ledgers');
var SettlementEngine = require('./settlement-engine');
var search = require('./search');
var stringify = require('./stringify');
var messaging = require('./messaging');
var messages = require('./messages');

function Agent(myNick) {
  this._settlementEngine = new SettlementEngine();
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

Agent.prototype._maybeStartChains = function() {
  return search.findNewPeerPairs(this._ledgers).then((newPubkeys) => {
    var messages = [];
    for (var i=0; i<newPubkeys.length; i++) {
      var peerPair = search.getPeerPair(newPubkeys[i]);
      var msg = messages.pubkeyAnnounce(newPubkeys[i]); // TODO: include amount and currency in this and other msgTypes
      messages.push({ to: peerPair.debtorNick, msg });
    }
    console.log('maybeStartChains', this._myNick, messages);
    return this._sendMessages(messages);
  });
};

Agent.prototype.sendIOU = function(creditorNick, amount, currency) {
  this._ensurePeer(creditorNick);
  var debt = this._ledgers[creditorNick].createIOU(amount, currency);
  messaging.send(this._myNick, creditorNick, messages.IOU(debt));
  return this._maybeStartChains();
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
    this._ledgers[fromNick].addDebt(debt);
    // FIXME: consider the following debt graph:
    //
    //  A -> B -> C
    //        ^   /
    //         \ v
    //          D
    //
    // B will use A's pubkey to pair A and C, but that never loops back to A.
    // However, B would now also create a new keypair to pair D and C.
    // A current sub-efficiency is that as long as A->B->C negotiation is outstanding,
    // B needs to reserve (part of) B->C for that, and so the D->B->C->D loop can never
    // fully drain until the search on A's pubkey expires (and currently there is no
    // mechanism for expiration).
    return this._maybeStartChains().then(() => {
      return this._sendMessages([{
        toNick: fromNick,
        msg: messages.confirmIOU(fromNick, debt.note),
      }]);
    });
    // break;

  case 'confirm-IOU':
    this._ledgers[fromNick].markIOUConfirmed(incomingMsgObj.note);
    return this._maybeStartChains();
    // break;

  default: // msgType is not related to ledgers, but to settlements:
    var [ debtorNick, creditorNick ] = search.getPeerPair(incomingMsgObj.pubkey);
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
