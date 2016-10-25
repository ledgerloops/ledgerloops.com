var tokens = require('./tokens');

function ProbeEngine() {
  this._probes = {};
  this._tokensModule = tokens; // FIXME: because having problems with rewire
}

ProbeEngine.prototype.getOtherPeer = function(inNeighbor, treeToken, pathToken) {
  if (typeof this._probes[treeToken] === 'undefined') {
    return null;
  }
  if (typeof this._probes[treeToken][pathToken] === 'undefined') {
    return null;
  }
  if (this._probes[treeToken][pathToken].inNeighbor !== inNeighbor) {
    return null;
  }
  return this._probes[treeToken][pathToken].outNeighbor;
};

ProbeEngine.prototype._getProbeStatus = function(inNeighbor, treeToken, pathToken) {
  if (typeof this._probes[treeToken] === 'undefined') {
    return 'unknown';
  }
  if (typeof this._probes[treeToken][pathToken] === 'undefined') {
    var probeIsMine = true;
    var backtrack = false;
    for (var existingToken in this.probes[treeToken]) {
      if (typeof this._probes[treeToken][existingToken].inNeighbor !== 'undefined') {
        probeIsMine = false;
      }
      if (this._probes[treeToken][existingToken].inNeighbor === inNeighbor) {
        return 'path-changed'; // this should not normally happen in current algorithm
      } else if (this._probes[treeToken][existingToken].outNeighbor === inNeighbor) {
        backtrack = true;
      }
    }
    // this probe's treeToken was seen before, but either it was mine or it came from a different in-neighbor
    if (probeIsMine) {
      return (backtrack ? 'my-probe-backtracked' : 'my-probe-not-backtracked');
    }
    return (backtrack ? 'backtrack' : 'my-P-shaped-loop');
  }
  if (typeof this._probes[treeToken][pathToken].inNeighbor === 'undefined') {
    return 'my-token-not-backtracked';
  }
  return 'already-routed';
};

ProbeEngine.prototype._createProbeObj = function(outNeighbor) {
  var treeToken = this._tokensModule.generateToken();
  var pathToken = this._tokensModule.generateToken();
  if (typeof this._probes[treeToken] === 'undefined') {
    this._probes[treeToken] = {};
  }
  this._probes[treeToken][pathToken] = {
    outNeighbor,
  };
  return Promise.resolve({ peerNick: outNeighbor.peerNick, currency: outNeighbor.currency, treeToken, pathToken });
};

ProbeEngine.prototype.handleIncomingProbe  = function(fromNick, incomingMsgObj, activeNeighbors) {
//  console.log('ProbeEngine.prototype.handleIncomingProbe', { fromNick, incomingMsgObj }, activeNeighbors);
//  var probeStatus = this_getProbeStatus(fromNick, incomingMsgObj.treeToken, incomingMsgObj.pathToken);
//  switch(probeStatus) {
//  case 'unknown': 
//    forward();
//    return store();
//  case 'my-probe-not-backtracked':
//    return reportLoop();
//  case 'my-P-shaped-loop-same-path':
//    generateNewPathToken(); // for old in-neighbor
//    backtrack(); // for old in-neighbor
//    return reportLoop(); // for new in-neighbor and path
//  case 'my-P-shaped-loop-path-changed':
//    backtrack(); // for old in-neighbor
//    return reportLoop(); // for new in-neighbor and path
//  case 'my-probe-backtracked':
//    generateNewPathToken();
//    return tryNextNeighbor() or fail(); // next out-neighbor or fail if none left
//  case 'backtrack':
//     return tryNextNeighbor() or backtrack(); // next out-neighbor or backtrack if none left
//  case 'path-changed':
//     throw error('path changed'); // this should not normally occur, I think. for now, throw error
//  case 'already-routed':
//     throw error('already routed'); // maybe the original node malfunctioned. for now, throw error
//  default:
//     throw error('unrecognized probe status');
//  };
  if (typeof this._probes[incomingMsgObj.treeToken] === 'undefined') {
    this._probes[incomingMsgObj.treeToken] = {
      pathToken: incomingMsgObj.pathToken,
      inNeighbor: fromNick,
      outNeighbor: activeNeighbors.out[0].peerNick, // TODO: somehow pick the most promising out-neighbor
                                                    // TODO: implement backtracking (requires new msgType)
                                                    // TODO: check if currency matches
    };
    return Promise.resolve({
      forwardMessages: [ {
        to: this._probes[incomingMsgObj.treeToken].outNeighbor,
        msg: incomingMsgObj, // TODO: check what format agent.js expects here
      } ],
      cycleFound: null,
    });
  } else {
    return Promise.resolve({
      forwardMessages: [],
      cycleFound: this._probes[incomingMsgObj.treeToken].outNeighbor
    });
  }
};

ProbeEngine.prototype.maybeSendProbes = function(neighbors) {
  if ((neighbors['in'].length === 0) || (neighbors.out.length === 0)) {
    return Promise.resolve([]);
  }
  return this._createProbeObj(neighbors.out[0]).then(obj => {  // TODO: send to other neighbor pairs too
    return [ obj ];
  });
};

module.exports = ProbeEngine;
