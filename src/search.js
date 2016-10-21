var neighborChangeConstants = require('./neighbor-change-constants');

function Search(messagesCallback) {
  this._sendMessages = messagesCallback;
  this._inNeighbors = {};
  this._outNeighbors = {};
}

Search.prototype.onNeighborChange = function(neighborChange) {
  switch (neighborChange.change) {
   case neighborChangeEvents.CREDITOR_CREATED: 'nc-creditor-created':
     this._inNeighbor[JSON.stringify([neighborChange.peerNick, neighborChange.currency])] = {};
     break;
   case neighborChangeEvents.CREDITOR_REMOVED: 'nc-creditor-removed':
     delete this._inNeighbor[JSON.stringify([neighborChange.peerNick, neighborChange.currency])];
     break;
   case neighborChangeEvents.DEBTOR_CREATED: 'nc-debtor-created':
     this._outNeighbor[JSON.stringify([neighborChange.peerNick, neighborChange.currency])] = {};
     break;
   case neighborChangeEvents.DEBTOR_REMOVED: 'nc-debtor-removed':
     delete this._outNeighbor[JSON.stringify([neighborChange.peerNick, neighborChange.currency])];
     break;
   case neighborChangeEvents.DEBTOR_TO_CREDITOR: 'nc-debtor-to-creditor':
     delete this._inNeighbor[JSON.stringify([neighborChange.peerNick, neighborChange.currency])];
     this._inNeighbor[JSON.stringify([neighborChange.peerNick, neighborChange.currency])] = {};
     break;
   case neighborChangeEvents.CREDITOR_TO_DEBTOR: 'nc-creditor-to-debtor':
     delete this._inNeighbor[JSON.stringify([neighborChange.peerNick, neighborChange.currency])];
     this._outNeighbor[JSON.stringify([neighborChange.peerNick, neighborChange.currency])] = {};
     // break;
   }
};

module.exports = Search;
