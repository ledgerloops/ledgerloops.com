function ProbeTree(treeToken, inNeighborNick, outNeighborNicks, currency) {
  this._treeToken = treeToken;
  this._inNeighborNick = inNeighborNick;
  this._currency = currency;
  this._pathTokens = {};
  for (var i=0; i<outNeighborNicks.length; i++) {
    this._pathTokens[outNeighborNicks[i]] = false;
  }
  this._outloopsReceived = []; // might use this in the future, for https://github.com/michielbdejong/opentabs.net/issues/28
  this._backtracksReceived = [];
  this._backtrackSent = false;
  this._loopFound = false;
}

ProbeTree.prototype.getCurrency = function() {
  return this._currency;
};

ProbeTree.prototype.getInNeighborNick = function() {
  return this._inNeighborNick;
};


ProbeTree.prototype.setLoopFound = function() {
  this._loopFound = true;
};

ProbeTree.prototype.addPath = function(newPathToken, backtrackedPathToken, backtrackedOutNeighborNick) {
  var outNeighborNick;
  if (backtrackedPathToken && backtrackedOutNeighborNick) {
    if (this._pathTokens[backtrackedOutNeighborNick] === backtrackedPathToken) {
      this._backtracksReceived.push(outNeighborNick);
    } else {
      for (outNeighborNick in this._pathTokens) {
        if (this._pathTokens[outNeighborNick] === backtrackedPathToken) {
          this._outloopsReceived.push({
            pathToken: backtrackedPathToken,
            outboundOutNeighborNick: outNeighborNick,
            inboundOutNeighborNick: backtrackedOutNeighborNick,
          });
        }
      }
    }
  }
  console.log('picking next outNeighbor to try', this._pathTokens);
  // Pick the next outNeighbor to try, Depth-First-Search.
  for (outNeighborNick in this._pathTokens) {
    if (this._pathTokens[outNeighborNick] === false) {
      console.log(`this._pathTokens['${outNeighborNick}'] === false`);
      this._pathTokens[outNeighborNick] = newPathToken;
      return outNeighborNick;
     }
  }
  // All outNeighbors have been tried, backtrack Depth-First-Search.
  this._backtrackSent = backtrackedPathToken;
  // FIXME: pathToken was generated by ProbeEngine but is not used here,
  // that's a bit of a waste. See corresponding FIXME note in ProbeEngine code.
  console.log('back to inNeighbor', this._inNeighborNick);
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
  for (var outNeighborNick in this._pathTokens) {
    if (this._pathTokens[outNeighborNick] === pathToken) {
      return {
        inNeighborNick: this._inNeighbor,
        outNeighborNick,
      };
    }
  }
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

ProbeTree.prototype.handleIncomingProbe = function(fromNick, probeObj) {
  console.log({ fromNick, probeObj });
};

module.exports = ProbeTree;
