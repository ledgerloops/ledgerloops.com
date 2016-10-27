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

ProbeEngine.prototype._isNeighbor = function(direction, nick, currency, neighbors) {
console.log('ProbeEngine.prototype._isNeighbor', direction, nick, currency, neighbors);
  for (var i=0; i<neighbors[direction].length; i++) {
    console.log(i, neighbors[direction][i]);
    if ((neighbors[direction][i].peerNick === nick) &&
        (neighbors[direction][i].currency === currency)) {
      return true;
    }
  }
  return false;
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

// TODO: make this method shorter, maybe moving some functionality to ProbeTree class.
ProbeEngine.prototype.handleIncomingProbe = function(fromNick, incomingMsgObj, activeNeighbors) {
console.log('ProbeEngine.prototype.handleIncomingProbe', {fromNick, incomingMsgObj }, activeNeighbors);
  // FIXME: what's the nice way to declare variables that are used locally in two places in the same function?
  var peerPair;
  if (this._isNeighbor('in', fromNick, incomingMsgObj.currency, activeNeighbors)) {
    console.log('this probe message comes from an in-neighbor');
    if (typeof this._probeTrees[incomingMsgObj.treeToken] === 'undefined') { // unknown treeToken
      var outNeighborNicks = listOutNeighborNicks(incomingMsgObj.currency, activeNeighbors);
      console.log('handling incoming probe', { incomingMsgObj, outNeighborNicks });
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
        console.log('participating in new probe tree', outNeighborNicks, incomingMsgObj.currency);
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
        console.log('My loop!');
        incomingMsgObj.inNeighborNick = fromNick;
        console.log(incomingMsgObj, this._probeTrees);
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
    console.log('this probe message comes from an out-neighbor');
    // One of our out-neighbor backtracked (inside addPath, it will be determined if the correct out-neighbor did, or a different one)
    var newPathToken = this._tokensModule.generateToken();
    var nextOutNeighborNick = this._probeTrees[incomingMsgObj.treeToken].addPath(newPathToken, incomingMsgObj.pathToken, fromNick);
    console.log('picked', {nextOutNeighborNick});
    if (typeof nextOutNeighborNick === 'undefined') {
      console.log('own tree backtracked, done here.');
      return Promise.resolve({
        forwardMessages: [],
        cycleFound: null,
      });
    } else if (nextOutNeighborNick === this._probeTrees[incomingMsgObj.treeToken].getInNeighborNick()) { // back to sender
      console.log('reverse-engineered that as back to sender,', nextOutNeighborNick);
      // no out-neighbors left, backtracking ourselves too.
      incomingMsgObj.outNeighborNick = fromNick;
      // FIXME: the way getInNeighborNick is used here to reverse-engineer what addPath did,
      // and the way the newPathToken was generated but not used, is all a bit ugly. ProbeEngine and ProbeTree
      // responsibilities are too entangled here.
    } else { // next sibling
      console.log('reverse-engineered that as next sibling,', nextOutNeighborNick);
      incomingMsgObj.pathToken = newPathToken;
      incomingMsgObj.outNeighborNick = nextOutNeighborNick;
    }
    return Promise.resolve({
      forwardMessages: [ incomingMsgObj ],
      cycleFound: null,
    });
  } else {
    console.log('this probe message comes from a comms-only neighbor!');
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
      console.log('new probe tree created', outNeighborNicks, currency);
      probesToSend.push(this._probeTrees[treeToken].getProbeObj(firstOutNeighborNick));
    }
  }
console.log({probesToSend });
  return Promise.resolve({
    forwardMessages: probesToSend,
    cycleFound: null,
  });
};

module.exports = ProbeEngine;
