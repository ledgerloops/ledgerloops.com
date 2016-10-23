var neighborChangeConstants = require('./neighbor-change-constants');

function Search(messagesCallback) {
  this._sendMessages = messagesCallback;
  this._inNeighbors = {};
  this._outNeighbors = {};
}

Search.prototype.onNeighborChange = function(neighborChange) {
  switch (neighborChange.change) {
   case neighborChangeEvents.CREDITOR_CREATED:
     this._inNeighbor[JSON.stringify([neighborChange.peerNick, neighborChange.currency])] = {};
     break;
   case neighborChangeEvents.CREDITOR_REMOVED:
     delete this._inNeighbor[JSON.stringify([neighborChange.peerNick, neighborChange.currency])];
     break;
   case neighborChangeEvents.DEBTOR_CREATED:
     this._outNeighbor[JSON.stringify([neighborChange.peerNick, neighborChange.currency])] = {};
     break;
   case neighborChangeEvents.DEBTOR_REMOVED:
     delete this._outNeighbor[JSON.stringify([neighborChange.peerNick, neighborChange.currency])];
     break;
   case neighborChangeEvents.DEBTOR_TO_CREDITOR:
     delete this._inNeighbor[JSON.stringify([neighborChange.peerNick, neighborChange.currency])];
     this._inNeighbor[JSON.stringify([neighborChange.peerNick, neighborChange.currency])] = {};
     break;
   case neighborChangeEvents.CREDITOR_TO_DEBTOR:
     delete this._inNeighbor[JSON.stringify([neighborChange.peerNick, neighborChange.currency])];
     this._outNeighbor[JSON.stringify([neighborChange.peerNick, neighborChange.currency])] = {};
     // break;
   }
};

module.exports = Search;
