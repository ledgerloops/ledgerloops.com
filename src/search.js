var neighborChangeConstants = require('./neighbor-change-constants');

function Search(messagesCallback) {
  this._sendMessages = messagesCallback;
  this._neighbors = {
    'in': {},
    out: {},
  };
  this._active = {
    'in': true, // false here would mean dead-start
    out: true,  // false here would mean dead-end
  };
}

Search.prototype.onNeighborChange = function(neighborChange) {
  var newNeigbors = {
    'in': [],
     out: [],
  };
  switch (neighborChange.change) {
   case neighborChangeConstants.CREDITOR_CREATED:
     this._neighbors['in'][JSON.stringify([neighborChange.peerNick, neighborChange.currency])] = {
       active: true,
     };
     return this._updateStates(neighborChange, 'in');
     // break;
   case neighborChangeConstants.CREDITOR_REMOVED:
     delete this._neighbors['in'][JSON.stringify([neighborChange.peerNick, neighborChange.currency])];
     return this._updateStates();
     // break;
   case neighborChangeConstants.DEBTOR_CREATED:
     this._neighbors.out[JSON.stringify([neighborChange.peerNick, neighborChange.currency])] = {
       active: true,
     };
     return this._updateStates(neighborChange, 'out');
     // break;
   case neighborChangeConstants.DEBTOR_REMOVED:
     delete this._neighbors.out[JSON.stringify([neighborChange.peerNick, neighborChange.currency])];
     return this._updateStates();
     // break;
   case neighborChangeConstants.DEBTOR_TO_CREDITOR:
     delete this._neighbors.out[JSON.stringify([neighborChange.peerNick, neighborChange.currency])];
     this._neighbors['in'][JSON.stringify([neighborChange.peerNick, neighborChange.currency])] = {
       active: true,
     };
     return this._updateStates(neighborChange, 'in');
     // break;
   case neighborChangeConstants.CREDITOR_TO_DEBTOR:
     delete this._neighbors['in'][JSON.stringify([neighborChange.peerNick, neighborChange.currency])];
     this._neighbors.out[JSON.stringify([neighborChange.peerNick, neighborChange.currency])] = {
       active: true,
     };
     return this._updateStates(neighborChange, 'out');
     // break;
   }
};

Search.prototype._updateStates = function(newNeighbor, direction) {
  var oppositeDirection = (direction === 'in' ? 'out' : 'in');
  var oldOppositeStatus = this._active[oppositeDirection];
  var messages = this._updateState('in').concat(this._updateState('out'));
  if (newNeighbor && !this._active[oppositeDirection] && !oldOppositeStatus) {
    // new neigbor should be notified that this node was already not active on
    // the opposite side, and still isn't after this status update:
    messages.push({
      peerNick: newNeighbor.peerNick,
      currency: newNeighbor.currency,
      direction: oppositeDirection,
      value: false,
    });
  }
  return messages;
};

// direction 'in' means check in-neighbors
Search.prototype._updateState = function(direction) {
  for (var i in this._neighbors[direction]) {
    if (this._neighbors[direction][i].active) {
      return this._setStatus(direction, true);
    }
  }
  return this._setStatus(direction, false);
};

// direction 'in' value false means dead-start
// direction 'out' value false means dead-end
Search.prototype._setStatus = function(direction, value) {
  if (this._active[direction] !== value) {
    this._active[direction] = value;
    var oppositeDirection = (direction === 'in' ? 'out' : 'in');
    return Object.keys(this._neighbors[oppositeDirection]).map(neighborId => {
      var vals = JSON.parse(neighborId);
      return {
        peerNick: vals[0],
        currency: vals[1],
        direction,
        value,
      };
    });
  }
  return [];
};

Search.prototype.onStatusMessage = function(direction, neighborNick, currency, value) {
  var neighborId = JSON.stringify([neighborNick, currency]);
  this._neighbors[direction][neighborId].active = value;
  return this._updateState(direction);
};

module.exports = Search;
