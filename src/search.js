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
  if (neighborChange === null) {
    return [];
  }

  debug.log('incoming neighbor change', neighborChange);
  var newNeigbors = {
    'in': [],
     out: [],
  };
  var responses;

  switch (neighborChange.change) {
   case neighborChangeConstants.CREDITOR_CREATED:
     this._neighbors.out[JSON.stringify([neighborChange.peerNick, neighborChange.currency])] = {
       myPingPending: null,
       theirPingPending: null,
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
       myPingPending: null,
       theirPingPending: null,
     };
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
       myPingPending: null,
       theirPingPending: null,
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
       myPingPending: null,
       theirPingPending: null,
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
    if (vals[1] === currency && this._neighbors[direction][neighborId].theirPingPending === true) {
      return true;
    }
  }
  return false;
};

Search.prototype._haveInactiveNeighbors = function(direction, currency) {
  for (var neighborId in this._neighbors[direction]) {
    var vals = JSON.parse(neighborId);
    if (vals[1] === currency && this._neighbors[direction][neighborId].myPingPending !== true) {
      return true;
    }
  }
  return false;
};

Search.prototype._handleNeighborStateChange = function(neighborDirection, newNeighborState, neighborNick, currency, isReply) {
  var neighborId = JSON.stringify([neighborNick, currency]);
  if (newNeighborState === false) {
    // consider this message as the rejection of any pings you sent earlier:
    this._neighbors[neighborDirection][neighborId].myPingPending = false;
    if (this._haveAwakeNeighbors(neighborDirection, currency)) {
      // still have other awake neighbors in that direction, so not canceling their pending pings yet
      return [];
    }
  }
  if (newNeighborState === true && !this._haveNeighbors(OPPOSITE[neighborDirection], currency)) {
    // I'm a dead-end, cancel their pending ping:
    this._neighbors[neighborDirection][neighborId].theirPingPending = false;
    return [{
      peerNick: neighborNick,
      currency,
      value: false,
      isReply: true,
    }];
  }
  // initiate positive reply to outgoing ping, but not don't reply to replies:
  if (newNeighborState === true && !this._haveInactiveNeighbors(OPPOSITE[neighborDirection], currency) && !isReply) {
    // I have nowhere to forward their ping to, not because I'm a dead-end, but because I already sent a ping myself which masks theirs:
    // This is necessary for the race test in test/integration/full-flow.js
    this._neighbors[neighborDirection][neighborId].theirPingPending = true;
    return [{
      peerNick: neighborNick,
      currency,
      value: true,
      isReply: true,
    }];
  }
  return this._updateNeighbors(OPPOSITE[neighborDirection], newNeighborState);
};

Search.prototype._updateNeighbors = function(messageDirection, value) {
  var messages = [];
  for (var neighborId in this._neighbors[messageDirection]) {
    if (this._neighbors[messageDirection][neighborId].myPingPending !== value) { // FIXME: careful here, myPingPending could be null or false/true
      var vals = JSON.parse(neighborId);
      messages.push({
        peerNick: vals[0],
        currency: vals[1],
        value,
      });
      this._neighbors[messageDirection][neighborId].myPingPending = value;
    }
  }
  return messages;
};

Search.prototype.onStatusMessage = function(neighborNick, currency, value, isReply) {
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
  if (isReply) {
    this._neighbors[neighborDirection][neighborId].myPingPending = value;
  } else {
    this._neighbors[neighborDirection][neighborId].theirPingPending = value;
  }
  return this._handleNeighborStateChange(neighborDirection, value, neighborNick, currency, isReply);
};

Search.prototype.getActiveNeighbors = function() {
  var ret = {};
  ['in', 'out'].map(direction => {
    ret[direction] = [];
    for (var neighborId in this._neighbors[direction]) {
      if (this._neighbors[direction][neighborId].theirPingPending === true) {
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
