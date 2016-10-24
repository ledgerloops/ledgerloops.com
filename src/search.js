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
  this._awake = false;
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
       awake: true,
     };
     return this._handleNeighborStateChange('out', 'awake');
     // break;

   case neighborChangeConstants.CREDITOR_REMOVED:
     delete this._neighbors.out[JSON.stringify([neighborChange.peerNick, neighborChange.currency])];
     return this._handleNeighborStateChange('out', 'deleted');
     // break;

   case neighborChangeConstants.DEBTOR_CREATED:
     this._neighbors['in'][JSON.stringify([neighborChange.peerNick, neighborChange.currency])] = {
       awake: true,
     };
     return this._handleNeighborStateChange('in', 'awake');
     // break;

   case neighborChangeConstants.DEBTOR_REMOVED:
     delete this._neighbors['in'][JSON.stringify([neighborChange.peerNick, neighborChange.currency])];
     return this._handleNeighborStateChange('in', 'deleted');
     // break;

   case neighborChangeConstants.DEBTOR_TO_CREDITOR:
     delete this._neighbors['in'][JSON.stringify([neighborChange.peerNick, neighborChange.currency])];
     responses = this._handleNeighborStateChange('in', 'deleted');

     this._neighbors.out[JSON.stringify([neighborChange.peerNick, neighborChange.currency])] = {
       awake: true,
     };
     return responses.concat(this._handleNeighborStateChange('out', 'awake'));
     // break;

   case neighborChangeConstants.CREDITOR_TO_DEBTOR:
     delete this._neighbors.out[JSON.stringify([neighborChange.peerNick, neighborChange.currency])];
     responses = this._handleNeighborStateChange('out', 'deleted');
     debug.log('responses to creditor deletion (becomes a debtor)', responses);
     this._neighbors['in'][JSON.stringify([neighborChange.peerNick, neighborChange.currency])] = {
       awake: true,
     };
     return responses.concat(this._handleNeighborStateChange('in', 'awake'));
     // break;
   }
};

Search.prototype._haveNeighbors = function(direction) {
  return (Object.keys(this._neighbors[direction]).length > 0);
};
  
Search.prototype._haveAwakeNeighbors = function(direction) {
  for (var neighborId in this._neighbors[direction]) {
    if (this._neighbors[direction][neighborId].awake) {
      return true;
    }
  }
  return false;
};
  
Search.prototype._handleNeighborStateChange = function(neighborDirection, newNeighborState) {
  if (newNeighborState === 'awake') {
    if (this._haveNeighbors(OPPOSITE[neighborDirection])) {
      if (!this._awake) {
        // Wake up, guys!
        debug.log('waking up!');
        this._awake = true;
        debug.log(`Waking up ${OPPOSITE[neighborDirection]}-neighbors:`);
        return this._updateNeighbors(OPPOSITE[neighborDirection], WAKE_UP);
      } else {
        // Were already awake, no change:
        debug.log('was already awake!');
        return [];
      }
    } else {
      // dead-end notification:
      debug.log('staying asleep, I\'m a dead-end!', this._neighbors);
      debug.log(`Putting to sleep ${neighborDirection}-neighbors:`);
      return this._updateNeighbors(neighborDirection, GO_TO_SLEEP);
    }
  }
  if (newNeighborState === 'asleep' && !this._haveAwakeNeighbors(neighborDirection)) {
    // last awake neighbor in that direction went to sleep
    debug.log(`Last ${neighborDirection}-neighbor just went to sleep! Going to sleep myself too`);
    this._awake = false;
    debug.log(`And telling my ${OPPOSITE[neighborDirection]}-neighbors to go to sleep too:`);
    return this._updateNeighbors(OPPOSITE[neighborDirection], GO_TO_SLEEP);
  }
  debug.log({ neighborDirection, newNeighborState }, this._haveNeighbors(neighborDirection), this._awake);
  if (newNeighborState === 'deleted' && !this._haveNeighbors(neighborDirection) && this._awake) {
    // last neighbor in that direction deleted while we were awake
    debug.log(`Last ${neighborDirection}-neighbor was deleted while we were awake! Sleeping...`);
    this._awake = false;
    debug.log(`And telling my {OPPOSITE[$neighborDirection]}-neighbors to go to sleep too:`);
    return this._updateNeighbors(OPPOSITE[neighborDirection], GO_TO_SLEEP);
  }
  // no messages resulting from neighbor state change:
  debug.log(`no messages resulting from neighbor state change`);
  return [];
};

Search.prototype._updateNeighbors = function(messageDirection, value) {
  var messages = [];
  for (var neighborId in this._neighbors[messageDirection]) {
    var vals = JSON.parse(neighborId);
    if (this._neighbors[messageDirection][neighborId].awake !== value) {
      this._neighbors[messageDirection][neighborId].awake = value;
      messages.push({
        peerNick: vals[0],
        currency: vals[1],
        value,
      });
    }
  }
  debug.log('messages from _updateNeighbors', { messageDirection, value, messages });
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
    console.error(`${neighborNick} is not a neighbor for currency ${currency}!`);
    return [];
  }
  debug.log(`Reacting to status message from ${neighborNick}, value: ${value}`, { neighborDirection });
  if (this._neighbors[neighborDirection][neighborId].awake && value === GO_TO_SLEEP) {
    debug.log(`Setting ${neighborDirection}-neighbor ${neighborNick} to sleep`);
    this._neighbors[neighborDirection][neighborId].awake = false;
    return this._handleNeighborStateChange(neighborDirection, 'asleep');
  }
  if (!this._neighbors[neighborDirection][neighborId].awake && value === WAKE_UP) {
    debug.log(`Setting ${neighborDirection}-neighbor ${neighborNick} to awake`);
    this._neighbors[neighborDirection][neighborId].awake = true;
    return this._handleNeighborStateChange(neighborDirection, 'awake');
  }
  console.error(`${neighborDirection}-neighbor ${neighborNick} already had its awake bit set to ${value}!`);
  return [];
};

module.exports = Search;
