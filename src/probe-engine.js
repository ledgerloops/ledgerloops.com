var tokens = require('./tokens');
var ProbeTree = require('./probe-tree');

function ProbeEngine() {
  this._probeTrees = {};
  this._tokensModule = tokens; // FIXME: because having problems with rewire
}

ProbeEngine.prototype.getPeerPair = function(obj) {
  if (typeof this._probeTrees[obj.treeToken] === 'undefined') {
    return null;
  }
  return this._probeTrees[obj.treeToken].getPeerPair(obj.pathToken);
};


ProbeEngine.prototype._createProbeObj = function(outNeighborNick, currency) {
};

ProbeEngine.prototype._validInNeighbor = function(fromNick, incomingMsgObj, activeNeighbors) {
  console.log('_validInNeighbor', { fromNick, incomingMsgObj, activeNeighbors });
  return true;
};

ProbeEngine.prototype._haveProbeFor = function(currency) {
  for (var treeToken in this._probeTrees) {
    if (this._probeTree.getCurrency() === currency) {
      return true;
    }
  }
  return false;
};

function listOutNeighborNicks(currency, neighbors) {
  console.log('listOutNeighborNicks', neighbors);
  var ret = [];
  for (var i=0; i<neighbors.out.length; i++) {
    if (neighbors.out[i].currency === currency) {
      ret.push(neighbors.out[i].peerNick);
    }
  }
  return ret;
}

ProbeEngine.prototype.handleIncomingProbe = function(fromNick, incomingMsgObj, activeNeighbors) {
  if (typeof this._probeTrees[incomingMsgObj.treeToken] === 'undefined') {
    var outNeighborNicks = listOutNeighborNicks(incomingMsgObj.currency, activeNeighbors);
    if (this._validInNeighbor(fromNick, incomingMsgObj, activeNeighbors)) {
      this._probeTrees[incomingMsgObj.treeToken] = new ProbeTree(incomingMsgObj.treeToken, fromNick,
          outNeighborNicks, incomingMsgObj.currency);
    }
  }
  return this._probeTrees[incomingMsgObj.treeToken].handleIncomingProbe(fromNick, incomingMsgObj);
};

ProbeEngine.prototype.maybeSendProbes = function(neighbors) {
  var currenciesIn = {};
  var currenciesThrough = {};
  var i;
  for (i=0; i<neighbors['in'].length; i++) {
    currenciesIn[neighbors['in'][i].currency] = true;
  }  
  for (i=0; i<neighbors.out.length; i++) {
    if (currenciesIn[neighbors.out[i].currency]) {
      currenciesThrough[neighbors.out[i].currency] = true;
    }
  }
  console.log({ currenciesIn, currenciesThrough });

  var probesToSend = [];
  for (var currency in currenciesThrough) {
    if (!this._haveProbeFor(currency)) {
      var outNeighborNicks = listOutNeighborNicks(currency, neighbors);
      // start ProbeTree here for this currency (and become its tree root):
      var treeToken = this._tokensModule.generateToken();
      var pathToken = this._tokensModule.generateToken();
      // undefined here indicates no inNeighbor for this tree: vvvv
      this._probeTrees[treeToken] = new ProbeTree(treeToken, undefined, outNeighborNicks, currency);
      var firstOutNeighborNick = this._probeTrees[treeToken].addPath(pathToken);
      console.log('probe tree created', outNeighborNicks, currency);
      probesToSend.push(this._probeTrees[treeToken].getProbeObj(firstOutNeighborNick));
    }
  }

  return Promise.resolve({
    forwardMessages: probesToSend,
    cycleFound: null,
  });
};

module.exports = ProbeEngine;
