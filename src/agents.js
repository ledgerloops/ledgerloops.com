var Ledger = require('./ledgers');
var ProbeEngine = require('./probe-engine');
var SettlementEngine = require('./settlement-engine');
var Search = require('./search');
var messaging = require('./messaging');
var debug = require('./debug');
var messages = require('./messages');

const PROBE_INTERVAL = 1000;
const SETTLEMENT_AMOUNT = { // lower values make it more likely a loop is found, but require more small ledger loops to settle a big amount
// To hide information about the exact amounts of your current debts and credits,
// values that obey f(x) = coin * 10^magnitude, for a in [1,2,5], and magnitude integer (positive, zero, or negative) are encouraged, so:
//
// coin=1 coin=2 coin=5
// ....,  ....., .....,
// 0.001, 0.002, 0.005, magnitude = -3
//  0.01,  0.02,  0.05, magnitude = -2
//   0.1,   0.2,   0.5, magnitude = -1
//     1,     2,     5, magnitude = 0
//    10,    20,    50, magnitude = 1
//   100,   200,   500, magnitude = 2
//  1000,  2000,  5000, magnitude = 3
// ....,  ....., .....,
//

  USD: 0.05,
};

function Agent(myNick) {
  this._settlementEngine = new SettlementEngine((peerNick, obj) => { this._createPendingSettlement(peerNick, obj); }, () => {
    this._probeEngine.reprobe();
  });
  this._search = new Search(this._sendMessages.bind(this));
  this._probeEngine = new ProbeEngine();
  this._probeTimer = setInterval(() => { this._probeTimerHandler(); }, PROBE_INTERVAL);
  this._myNick = myNick;
  this._ledgers = {};
  this._sentIOUs = {};
  messaging.addChannel(myNick, (fromNick, msgStr) => {
    return this._handleMessage(fromNick, JSON.parse(msgStr));
  });
}

Agent.prototype._createPendingSettlement = function(peerNick, obj) {
  this._ledgers[peerNick].createPendingSettlement(obj.transactionId, obj.amount, obj.currency);
};

Agent.prototype._handleCycle = function(cycleObj) {
  if (cycleObj === null) {
    return Promise.resolve();
  }
  var myDebtAtOutNeighbor = this._ledgers[cycleObj.outNeighborNick].getMyDebtAmount(cycleObj.currency);
  if (myDebtAtOutNeighbor <= SETTLEMENT_AMOUNT[cycleObj.currency]) {
    return Promise.resolve();
  }

  var myCreditAtInNeighbor = this._ledgers[cycleObj.inNeighborNick].getMyCreditAmount(cycleObj.currency);
  if (myCreditAtInNeighbor <= SETTLEMENT_AMOUNT[cycleObj.currency]) {
    return Promise.resolve();
  }
  cycleObj.amount = SETTLEMENT_AMOUNT[cycleObj.currency];
  return this._settlementEngine.initiateNegotiation(cycleObj).then(this._sendMessages.bind(this));
};

Agent.prototype._handleProbeEngineOutput = function (output) {
  return this._handleCycle(output.cycleFound).then(() => {
    return Promise.all(output.forwardMessages.map(probeMsgObj => {
      if (typeof probeMsgObj.outNeighborNick === 'undefined') {
        throw new Error('where should this message go to?');
      }
      return messaging.send(this._myNick, probeMsgObj.outNeighborNick, messages.probe(probeMsgObj));
    }));
  });
};

Agent.prototype._probeTimerHandler = function() {
  var activeNeighbors = this._search.getActiveNeighbors();
  return this._probeEngine.maybeSendProbes(activeNeighbors).then(output => {
    if (output.length) {
      debug.log(`${this._myNick} initiates probes:`, activeNeighbors, this._ledgers, this._search, output);
    }
    return this._handleProbeEngineOutput(output);
  });
};

Agent.prototype._ensurePeer = function(peerNick) {
  if (typeof this._ledgers[peerNick] === 'undefined') {
    this._ledgers[peerNick] = new Ledger(peerNick, this._myNick);
  }
};

Agent.prototype.sendIOU = function(creditorNick, amount, currency, waitForConfirmation) {
  this._ensurePeer(creditorNick);
  var debt = this._ledgers[creditorNick].createIOU(amount, currency);
  if (waitForConfirmation) {
    return new Promise((resolve, reject) => {
     this._sentIOUs[debt.transactionId] = { resolve, reject };
    });
  } else {
    this._sentIOUs[debt.transactionId] = { resolve: function() {}, reject: function(err) { throw err; } };
    return messaging.send(this._myNick, creditorNick, messages.ledgerUpdateInitiate(debt));
  }
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

  case 'initiate-update':
    // for simplicity, always accept the IOU.
    var debt = incomingMsgObj;
    debt.confirmedByPeer = true;
    this._ensurePeer(fromNick);
    neighborChanges = this._ledgers[fromNick].addDebt(debt);
console.log('creditor neighborChanges', fromNick, this._myNick, neighborChanges);
    return this._sendMessages([{
      toNick: fromNick,
      msg: messages.ledgerUpdateConfirm(debt),
    }]).then(() => {
      return Promise.all(neighborChanges.map(neighborChange => Promise.resolve(this._search.onNeighborChange(neighborChange)))).then(results => {
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

  case 'confirm-update':
    neighborChanges = this._ledgers[fromNick].markIOUConfirmed(incomingMsgObj.transactionId);
console.log('debtor neighborChanges', this._myNick, fromNick, neighborChanges);
    return Promise.all(neighborChanges.map(neighborChange => Promise.resolve(this._search.onNeighborChange(neighborChange)))).then(results => {
      var promises = [];
      for (var i=0; i<results.length; i++) {
        for (var j=0; j<results[i].length; j++) {
          promises.push(messaging.send(this._myNick, results[i][j].peerNick, messages.ddcd(results[i][j])));
        }
      }
      return Promise.all(promises);
    }).then(() => {
      // handle callbacks linked to this sentIOU (not applicable when a pending settlements is confirms instead of a pending IOU
      if (typeof this._sentIOUs[incomingMsgObj.transactionId] !== 'undefined') {
        this._sentIOUs[incomingMsgObj.transactionId].resolve();
      }
      delete this._sentIOUs[incomingMsgObj.transactionId];
    });
    // break;

  case 'update-status':
    var results = this._search.onStatusMessage(fromNick, incomingMsgObj.currency, incomingMsgObj.value, incomingMsgObj.isReply);
    var promises = [];
    for (var i=0; i<results.length; i++) {
      promises.push(messaging.send(this._myNick, results[i].peerNick, messages.ddcd(results[i])));
    }
    return Promise.all(promises);
    // break;

  case 'probe':
    return this._probeEngine.handleIncomingProbe(fromNick, incomingMsgObj, this._search.getActiveNeighbors()).then(output => {
      return this._handleProbeEngineOutput(output);
    });
    // break;

  default: // msgType is related to settlements:
    var peerPair = this._probeEngine.getPeerPair(incomingMsgObj.routing);
    var debtorNick = peerPair.inNeighborNick;
    var creditorNick = peerPair.outNeighborNick;
    if ((typeof debtorNick === 'undefined') || (typeof creditorNick === 'undefined')) {
      throw new Error('unroutable negotiation message', incomingMsgObj);
    }
    if (fromNick === debtorNick) {
      fromRole = 'debtor';
    } else if (fromNick === creditorNick) {
      fromRole = 'creditor';
    } else {
      throw new Error(`fromNick matches neither debtorNick nor creditorNick`);
    }
    return this._settlementEngine.generateReactions(fromRole, incomingMsgObj,
        debtorNick, creditorNick).then(this._sendMessages.bind(this));
    // break;
  }
};

module.exports = Agent;
