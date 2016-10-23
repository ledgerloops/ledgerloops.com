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
  switch (neighborChange.change) {
   case neighborChangeConstants.CREDITOR_CREATED:
     this._neighbors['in'][JSON.stringify([neighborChange.peerNick, neighborChange.currency])] = {
       active: true,
     };
     return this._updateState('in').concat(this._updateState('out'));
     // break;
   case neighborChangeConstants.CREDITOR_REMOVED:
     delete this._neighbors['in'][JSON.stringify([neighborChange.peerNick, neighborChange.currency])];
     return this._updateState('in').concat(this._updateState('out'));
     // break;
   case neighborChangeConstants.DEBTOR_CREATED:
     this._neighbors.out[JSON.stringify([neighborChange.peerNick, neighborChange.currency])] = {
       active: true,
     };
     return this._updateState('in').concat(this._updateState('out'));
     // break;
   case neighborChangeConstants.DEBTOR_REMOVED:
     delete this._neighbors.out[JSON.stringify([neighborChange.peerNick, neighborChange.currency])];
     return this._updateState('in').concat(this._updateState('out'));
     // break;
   case neighborChangeConstants.DEBTOR_TO_CREDITOR:
     delete this._neighbors.out[JSON.stringify([neighborChange.peerNick, neighborChange.currency])];
     this._neighbors['in'][JSON.stringify([neighborChange.peerNick, neighborChange.currency])] = {
       active: true,
     };
     return this._updateState('in').concat(this._updateState('out'));
     // break;
   case neighborChangeConstants.CREDITOR_TO_DEBTOR:
     delete this._neighbors['in'][JSON.stringify([neighborChange.peerNick, neighborChange.currency])];
     this._neighbors.out[JSON.stringify([neighborChange.peerNick, neighborChange.currency])] = {
       active: true,
     };
     return this._updateState('in').concat(this._updateState('out'));
     // break;
   }
};

// direction 'in' means check in-neighbors
Search.prototype._updateState = function(direction) {
  for (var i in this._neighbors[direction]) {
    if (this._neighbors[direction][i].active) {
      console.log('active neighbor found', direction);
      return this._setStatus(direction, true);
    }
  }
  console.log('no active neighbor found', direction);
  var res = this._setStatus(direction, false);
  console.log({ res }, this._neighbors);
  return res;
};

// direction 'in' value false means dead-start
// direction 'out' value false means dead-end
Search.prototype._setStatus = function(direction, value) {
  if (this._active[direction] !== value) {
    this._active[direction] = value;
    var oppositeDirection = (direction === 'in' ? 'out' : 'in');
    console.log({ direction, value, oppositeDirection });
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
  console.log('onStatusMessage', { direction, neighborNick, currency, value}, this._neighbors);
  var neighborId = JSON.stringify([neighborNick, currency]);
  console.log(neighborId, this._neighbors[direction][neighborId]);
  this._neighbors[direction][neighborId].active = value;
  console.log('calling _updateState');
  return this._updateState(direction);
};

module.exports = Search;
