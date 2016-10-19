var Ledger = require('./ledgers');
var SettlementEngine = require('./settlement-engine');

function Agent(myNick) {
  this._settlementEngine = new SettlementEngine();
  this._myNick = myNick;
  this._ledgers = [];
}

Agent.prototype.addPeer = function(peerNick) {
  this._ledgers.push(new Ledger(peerNick, this._myNick));
};

Agent.prototype.generateReactions = function(incomingMsg, from) {
  return this._settlementEngine.generateReactions(incomingMsg, from);
};

module.exports = Agent;
