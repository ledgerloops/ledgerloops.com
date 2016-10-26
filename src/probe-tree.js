function ProbeTree(treeToken, inNeighborNick, outNeighborNicks, currency) {
  this._treeToken = treeToken;
  this._inNeighborNick = inNeighborNick;
  this._currency = currency;
  this._pathTokens = {};
  for (var i=0; i<outNeighborNicks.length; i++) {
    this._pathTokens[outNeighborNicks[i]] = false;
  }
  this._backtracked = false;
};

ProbeTree.prototype.getCurrency = function() {
  return this._currency;
}

ProbeTree.prototype.addPath = function(pathToken) {
  for (var outNeighborNick in this._pathTokens) {
    if (this._pathTokens[outNeighborNick] === false) {
      this._pathTokens[outNeighborNick] = pathToken;
      return outNeighborNick;
     }
  }
  this._backtracked = pathToken;
  return this._inNeighborNick;
};

ProbeTree.prototype.getPeerPair = function(pathToken) {
  if (this._backtracked === pathToken) {
    return {
      inNeighborNick: this._inNeighborNick,
      outNeighborNick: this._inNeighborNick,
      weBacktrackedThisPathToken: true,
    };
  }
  return {
    inNeighborNick: this._inNeighbor,
    outNeighborNick: this._pathsOut[pathToken],
  };
};

ProbeTree.prototype.getProbeObj = function(outNeighborNick) {
  if (typeof this._pathTokens[outNeighborNick] === 'undefined') {
    return null;
  }
  return {
    treeToken: this._treeToken,
    pathToken: this._pathTokens[outNeighborNick],
    currency: this._currency,
    outNeighborNick,
  };
};

module.exports = ProbeTree;
