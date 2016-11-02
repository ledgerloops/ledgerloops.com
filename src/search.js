var neighborChangeConstants = require('./neighbor-change-constants');
var debug = require('./debug');

const OPPOSITE  = {
  'in': 'out',
  out: 'in',
};
const WAKE_UP = true;
const GO_TO_SLEEP = false;

function Search(messagesCallback) {
  this._sendMessages = messagesCallback;
  this._neighbors = {
    'in': {},
    out: {},
  };
}

//        sends IOU
// debtor   ----->   creditor
//           owes
// [in] [out]      [in]    [out]

Search.prototype.onNeighborChange = function(neighborChange) {
  debug.log('incoming neighbor change', neighborChange);
  var newNeigbors = {
    'in': [],
     out: [],
  };
  var responses;

  switch (neighborChange.change) {
   case neighborChangeConstants.CREDITOR_CREATED:
     this._neighbors.out[JSON.stringify([neighborChange.peerNick, neighborChange.currency])] = {
       lastSentValue: null,
       lastRcvdValue: null,
     };
     return this._updateNeighbors('in', true);
     // break;

   case neighborChangeConstants.CREDITOR_REMOVED:
     delete this._neighbors.out[JSON.stringify([neighborChange.peerNick, neighborChange.currency])];
     if (this._haveNeighbors('out')) { // it was not your last creditor
       return Promise.resolve();
     }
     return this._updateNeighbors('in', false);
     // break;

   case neighborChangeConstants.DEBTOR_CREATED:
     this._neighbors['in'][JSON.stringify([neighborChange.peerNick, neighborChange.currency])] = {
       lastSentValue: null,
       lastRcvdValue: null,
     };
console.log('debtor/in-neighbor created', neighborChange, 'updating outneighbors');
     return this._updateNeighbors('out', true);
     // break;

   case neighborChangeConstants.DEBTOR_REMOVED:
     delete this._neighbors['in'][JSON.stringify([neighborChange.peerNick, neighborChange.currency])];
     if (this._haveNeighbors('in')) { // it was not your last debtor
       return Promise.resolve();
     }
     return this._updateNeighbors('out', false);
     // break;

   case neighborChangeConstants.DEBTOR_TO_CREDITOR:
     delete this._neighbors['in'][JSON.stringify([neighborChange.peerNick, neighborChange.currency])];
     this._neighbors.out[JSON.stringify([neighborChange.peerNick, neighborChange.currency])] = {
       lastSentValue: null,
       lastRcvdValue: null,
     };
     if (this._haveNeighbors('in')) { // it was not your last debtor
       // and you just got a new creditor
       return this._updateNeighbors('in', true);
     }
     return this._updateNeighbors('out', false);
     // break;

   case neighborChangeConstants.CREDITOR_TO_DEBTOR:
     delete this._neighbors.out[JSON.stringify([neighborChange.peerNick, neighborChange.currency])];
     this._neighbors['in'][JSON.stringify([neighborChange.peerNick, neighborChange.currency])] = {
       lastSentValue: null,
       lastRcvdValue: null,
     };
     if (this._haveNeighbors('out')) { // it was not your last creditor
       // and you just got a new debtor
       return this._updateNeighbors('out', true);
     }
     return this._updateNeighbors('in', false);
     // break;
   }
};

Search.prototype._haveNeighbors = function(direction, currency) {
  for (var neighborId in this._neighbors[direction]) {
    var vals = JSON.parse(neighborId);
    if (vals[1] === currency) {
      return true;
    }
  }
  return false;
};

Search.prototype._haveAwakeNeighbors = function(direction, currency) {
  for (var neighborId in this._neighbors[direction]) {
    var vals = JSON.parse(neighborId);
    if (vals[1] === currency && this._neighbors[direction][neighborId].lastRcvdValue === true) {
      return true;
    }
  }
  return false;
};

Search.prototype._handleNeighborStateChange = function(neighborDirection, newNeighborState, neighborNick, currency) {
  if (newNeighborState === false && this._haveAwakeNeighbors(neighborDirection, currency)) {
    // still have other awake neighbors in that direction
    return [];
  }
  if (newNeighborState === true && !this._haveNeighbors(OPPOSITE[neighborDirection], currency)) {
    // I'm a dead-end
    return [{
      peerNick: neighborNick,
      currency,
      value: false,
    }];
  }
  return this._updateNeighbors(OPPOSITE[neighborDirection], newNeighborState);
};

Search.prototype._updateNeighbors = function(messageDirection, value) {
  var messages = [];
  for (var neighborId in this._neighbors[messageDirection]) {
    if (this._neighbors[messageDirection][neighborId].lastSentValue !== value) { // FIXME: careful here, lastSentValue could be null or false/true
      var vals = JSON.parse(neighborId);
      console.log('found a neighbor to update', { vals, value }, this._neighbors[messageDirection]);
      messages.push({
        peerNick: vals[0],
        currency: vals[1],
        value,
      });
      this._neighbors[messageDirection][neighborId].lastSentValue = value;
} else {
console.log(neighborId, 'knows already', messageDirection, value, this._neighbors);
    }
  }
  console.log('messages from _updateNeighbors', { messageDirection, value, messages });
  return messages;
};

Search.prototype.onStatusMessage = function(neighborNick, currency, value) {
  var neighborDirection;
  var neighborId = JSON.stringify([neighborNick, currency]);
  if (typeof this._neighbors['in'][neighborId] !== 'undefined') {
    neighborDirection = 'in';
  } else if (typeof this._neighbors.out[neighborId] !== 'undefined') {
    neighborDirection = 'out';
  } else {
    debug.log(`${neighborNick} is not a neighbor for currency ${currency}!`);
    return Promise.resolve([]);
  }
  debug.log(`Reacting to status message from ${neighborNick}, value: ${value}`, { neighborDirection });
  this._neighbors[neighborDirection][neighborId].lastRcvdValue = value;
  return this._handleNeighborStateChange(neighborDirection, value, neighborNick, currency);
};

Search.prototype.getActiveNeighbors = function() {
console.log('getting active neighbors', this._neighbors);
  var ret = {};
  ['in', 'out'].map(direction => {
    ret[direction] = [];
    for (var neighborId in this._neighbors[direction]) {
      if (this._neighbors[direction][neighborId].awake) {
        var vals = JSON.parse(neighborId);
        ret[direction].push({
          peerNick: vals[0],
          currency: vals[1],
        });
      }
    }
   });
  return ret;
};

module.exports = Search;
