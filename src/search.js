var neighborChangeConstants = require('./neighbor-change-constants');

function Search(messagesCallback) {
  this._sendMessages = messagesCallback;
  this._inNeighbors = {};
  this._outNeighbors = {};
}

Search.prototype.onNeighborChange = function(neighborChange) {
  switch (neighborChange.change) {
   case neighborChangeConstants.CREDITOR_CREATED:
     this._inNeighbors[JSON.stringify([neighborChange.peerNick, neighborChange.currency])] = {};
     break;
   case neighborChangeConstants.CREDITOR_REMOVED:
     delete this._inNeighbors[JSON.stringify([neighborChange.peerNick, neighborChange.currency])];
     break;
   case neighborChangeConstants.DEBTOR_CREATED:
     this._outNeighbors[JSON.stringify([neighborChange.peerNick, neighborChange.currency])] = {};
     break;
   case neighborChangeConstants.DEBTOR_REMOVED:
     delete this._outNeighbors[JSON.stringify([neighborChange.peerNick, neighborChange.currency])];
     break;
   case neighborChangeConstants.DEBTOR_TO_CREDITOR:
     delete this._outNeighbors[JSON.stringify([neighborChange.peerNick, neighborChange.currency])];
     this._inNeighbors[JSON.stringify([neighborChange.peerNick, neighborChange.currency])] = {};
     break;
   case neighborChangeConstants.CREDITOR_TO_DEBTOR:
     delete this._inNeighbors[JSON.stringify([neighborChange.peerNick, neighborChange.currency])];
     this._outNeighbors[JSON.stringify([neighborChange.peerNick, neighborChange.currency])] = {};
     // break;
   }
};

module.exports = Search;
