var debug = require('./debug');
var tokens = require('./tokens');
var ProbeTree = require('./probe-tree');

function ProbeEngine() {
  this._probeTrees = {};
}

ProbeEngine.prototype.getPeerPair = function(obj) {
  if (typeof this._probeTrees[obj.treeToken] === 'undefined') {
    return null;
  }
  return this._probeTrees[obj.treeToken].getPeerPair(obj.pathToken);
};


ProbeEngine.prototype._createProbeObj = function(outNeighborNick, currency) {
};

ProbeEngine.prototype._isNeighbor = function(direction, nick, currency, neighbors) {
  for (var i=0; i<neighbors[direction].length; i++) {
    if ((neighbors[direction][i].peerNick === nick) &&
        (neighbors[direction][i].currency === currency)) {
      return true;
    }
  }
  return false;
};

ProbeEngine.prototype._haveProbeFor = function(currency) {
  for (var treeToken in this._probeTrees) {
    if (this._probeTrees[treeToken].getCurrency() === currency) {
      return true;
    }
  }
  return false;
};

function listOutNeighborNicks(currency, neighbors) {
  var ret = [];
  for (var i=0; i<neighbors.out.length; i++) {
    if (neighbors.out[i].currency === currency) {
      ret.push(neighbors.out[i].peerNick);
    }
  }
  return ret;
}

// TODO: make this method shorter, maybe moving some functionality to ProbeTree class.
ProbeEngine.prototype.handleIncomingProbe = function(fromNick, incomingMsgObj, activeNeighbors) {
  // FIXME: what's the nice way to declare variables that are used locally in two places in the same function?
  var peerPair;
  if (this._isNeighbor('in', fromNick, incomingMsgObj.currency, activeNeighbors)) {
    if (typeof this._probeTrees[incomingMsgObj.treeToken] === 'undefined') { // unknown treeToken
      var outNeighborNicks = listOutNeighborNicks(incomingMsgObj.currency, activeNeighbors);
      if (outNeighborNicks.length === 0) {
        // backtrack immediately
        incomingMsgObj.outNeighborNick = fromNick;
        return Promise.resolve({
          forwardMessages: [ incomingMsgObj ],
          cycleFound: null,
        });
      } else {
        // participate in this probe
        this._probeTrees[incomingMsgObj.treeToken] = new ProbeTree(incomingMsgObj.treeToken, fromNick,
          outNeighborNicks, incomingMsgObj.currency);
        var firstOutNeighborNick = this._probeTrees[incomingMsgObj.treeToken].addPath(incomingMsgObj.pathToken);
        return Promise.resolve({
          forwardMessages: [ this._probeTrees[incomingMsgObj.treeToken].getProbeObj(firstOutNeighborNick) ],
          cycleFound: null,
        });
      }
    } else { // known treeToken coming from an in-neighbor!
      if (this._probeTrees[incomingMsgObj.treeToken].getInNeighborNick() === fromNick) {
        // already received that same treeToken from that same inNeighbor! See if we can make it go round again
        peerPair = this.getPeerPair(incomingMsgObj);
        if (!peerPair) { // pathToken changed, we're trying to make it go round the loop once more:
          incomingMsgObj.outNeighborNick = this._probeTrees[incomingMsgObj.treeToken].guessOutNeighbor(incomingMsgObj.pathToken);
        } else {
          incomingMsgObj.outNeighborNick = peerPair.outNeighborNick;
        }
        return Promise.resolve({
          forwardMessages: [ incomingMsgObj ],
          cycleFound: null,
        });
      } else if (typeof this._probeTrees[incomingMsgObj.treeToken].getInNeighborNick() === 'undefined') {
        // my loop!
        incomingMsgObj.inNeighborNick = fromNick;
        peerPair = this.getPeerPair(incomingMsgObj);
        if (!peerPair) { // pathToken changed, make it go round the loop once more:
          incomingMsgObj.outNeighborNick = this._probeTrees[incomingMsgObj.treeToken].guessOutNeighbor(incomingMsgObj.pathToken);
          return Promise.resolve({
            forwardMessages: [ incomingMsgObj ],
            cycleFound: null,
          });
        }
        incomingMsgObj.outNeighborNick = peerPair.outNeighborNick;
        this._probeTrees[incomingMsgObj.treeToken].setLoopFound(incomingMsgObj.pathToken);
        return Promise.resolve({
          forwardMessages: [],
          cycleFound: incomingMsgObj,
        });
      } else {
        // my P-loop!
        // FIXME: quite some repeated code here from last case
        peerPair = this.getPeerPair(incomingMsgObj);
        if (!peerPair) { // pathToken changed, make it go round the loop once more:
          incomingMsgObj.outNeighborNick = this._probeTrees[incomingMsgObj.treeToken].guessOutNeighbor(incomingMsgObj.pathToken);
          return Promise.resolve({
            forwardMessages: [ incomingMsgObj ],
            cycleFound: null,
          });
        }
        incomingMsgObj.outNeighborNick = peerPair.outNeighborNick;
        this._probeTrees[incomingMsgObj.treeToken].setLoopFound(incomingMsgObj.pathToken);
        return Promise.resolve({
          forwardMessages: [],
          cycleFound: incomingMsgObj,
        });
      }
    }
  } else if (this._isNeighbor('out', fromNick, incomingMsgObj.currency, activeNeighbors)) {
    // One of our out-neighbor backtracked (inside addPath, it will be determined if the correct out-neighbor did, or a different one)
    var newPathToken = tokens.generateToken();
    var nextOutNeighborNick = this._probeTrees[incomingMsgObj.treeToken].addPath(newPathToken, incomingMsgObj.pathToken, fromNick);
    if (typeof nextOutNeighborNick === 'undefined') {
      return Promise.resolve({
        forwardMessages: [],
        cycleFound: null,
      });
    } else if (nextOutNeighborNick === this._probeTrees[incomingMsgObj.treeToken].getInNeighborNick()) { // back to sender
      // no out-neighbors left, backtracking ourselves too.
      incomingMsgObj.outNeighborNick = fromNick;
      // FIXME: the way getInNeighborNick is used here to reverse-engineer what addPath did,
      // and the way the newPathToken was generated but not used, is all a bit ugly. ProbeEngine and ProbeTree
      // responsibilities are too entangled here.
    } else { // next sibling
      incomingMsgObj.pathToken = newPathToken;
      incomingMsgObj.outNeighborNick = nextOutNeighborNick;
    }
    return Promise.resolve({
      forwardMessages: [ incomingMsgObj ],
      cycleFound: null,
    });
  } else {
    // We got a probe message from someone who is a neighbor in the communication graph, but is neither a creditor
    // nor a debtor in the debt graph for this currency. Just backtrack it:
    incomingMsgObj.outNeighborNick = fromNick;
    return Promise.resolve({
      forwardMessages: [ incomingMsgObj ],
      cycleFound: null,
    });
  }
};

ProbeEngine.prototype.maybeSendProbes = function(neighbors) {
  debug.log(neighbors);
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

  var probesToSend = [];
  for (var currency in currenciesThrough) {
    if (!this._haveProbeFor(currency)) {
      var outNeighborNicks = listOutNeighborNicks(currency, neighbors);
      // start ProbeTree here for this currency (and become its tree root):
      var treeToken = tokens.generateToken();
      var pathToken = tokens.generateToken();
      // undefined here indicates no inNeighbor for this tree: vvvv
      this._probeTrees[treeToken] = new ProbeTree(treeToken, undefined, outNeighborNicks, currency);
      var firstOutNeighborNick = this._probeTrees[treeToken].addPath(pathToken);
      probesToSend.push(this._probeTrees[treeToken].getProbeObj(firstOutNeighborNick));
    }
  }
  return Promise.resolve({
    forwardMessages: probesToSend,
    cycleFound: null,
  });
};

module.exports = ProbeEngine;
