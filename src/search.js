var neighborChangeConstants = require('./neighbor-change-constants');

function Search(messagesCallback) {
  this._sendMessages = messagesCallback;
  this._inNeighbors = {};
  this._outNeighbors = {};
}

Search.prototype.onNeighborChange = function(neighborChange) {
  this._inNeighbors[neighborNick] = neighborType['in'];
  if (typeof this._outNeighbors[neighborNick] === 'undefined') {
    this._outNeighbors[neighborNick] = {};
  }
  this._outNneighbors[neighborNick].active = neighborType;
};
module.exports = Search;
