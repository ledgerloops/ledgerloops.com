var tokens = require('./tokens');

function ProbeEngine() {
  this._probes = {};
  this._tokensModule = tokens; // FIXME: because having problems with rewire
}

ProbeEngine.prototype.getPeerPair = function(obj) {
  if (typeof this._probes[obj.treeToken] === 'undefined') {
    return null;
  }
  if (typeof this._probes[obj.treeToken][obj.pathToken] === 'undefined') {
    return null;
  }
  return this._probes[obj.treeToken][obj.pathToken];
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
    return 'my-probe-not-backtracked';
  }
  return 'already-routed';
};

ProbeEngine.prototype._createProbeObj = function(outNeighborNick, currency) {
  var treeToken = this._tokensModule.generateToken();
  var pathToken = this._tokensModule.generateToken();
  // probe create here, so no in-neighbor -vvvvvvvvv
  return this._store(treeToken, pathToken, undefined, outNeighborNick, currency).then(() => {
    return { treeToken, pathToken, outNeighborNick, currency };
  });
};

ProbeEngine.prototype._store = function(treeToken, pathToken, inNeighborNick, outNeighborNick, currency) {
  if (typeof this._probes[treeToken] === 'undefined') {
    this._probes[treeToken] = {};
  }
  this._probes[treeToken][pathToken] = {
    inNeighborNick,
    outNeighborNick,
    currency,
  };
  return Promise.resolve({ peerNick: outNeighborNick, currency, treeToken, pathToken });
};

ProbeEngine.prototype._reportLoop = function(treeToken, pathToken, forwardMessages = []) {
  console.log('reporting loop', this._probes);
  return Promise.resolve({
    forwardMessages,
    cycleFound: {
      treeToken,
      pathToken,
      inNeighborNick: this._probes[treeToken][pathToken].inNeighborNick,
      outNeighborNick: this._probes[treeToken][pathToken].outNeighborNick,
      currency: this._probes[treeToken][pathToken].currency,
    },
  });
};

ProbeEngine.prototype.handleIncomingProbe = function(fromNick, incomingMsgObj, activeNeighbors) {
//  console.log('ProbeEngine.prototype.handleIncomingProbe', { fromNick, incomingMsgObj }, activeNeighbors);

  // FIXME: move these private functions to ProbeEngine.prototype._methodName = function() ...
  function generateNewToken() {
    return Promise.reject('not implemented yet');
  }

  function backtrack(newPathToken = incomingMsgObj.pathToken) {
    return Promise.reject('not implemented yet');
  }

  // FIXME: this programming pattern works nicely here, but it's maybe a bit too uncommon.
  function orIfEmpty(forwardMessages, ifEmptyThen) {
    if (forwardMessages.length === 0) {
      return ifEmptyThen();
    }
    return Promise.resolve({ forwardMessages });
  }

  function fail() {
    return Promise.reject('not implemented yet');
  }

  var probeStatus = this._getProbeStatus(fromNick, incomingMsgObj.treeToken, incomingMsgObj.pathToken);
  switch(probeStatus) {
  case 'unknown': 
    return this._store(incomingMsgObj.treeToken, incomingMsgObj.pathToken,
        fromNick, activeNeighbors.out[0].peerNick, // TODO: somehow pick the most promising out-neighbor
        incomingMsgObj.currency).then(() => {
      return Promise.resolve({
        forwardMessages: [ {
          to: this._probes[incomingMsgObj.treeToken][incomingMsgObj.pathToken].outNeighborNick,
          msg: incomingMsgObj, // TODO: check what format agent.js expects here
        } ],
        cycleFound: null,
      });
    });
  case 'my-probe-not-backtracked':
    this._probes[incomingMsgObj.treeToken][incomingMsgObj.pathToken].inNeighborNick = fromNick;
    return this._reportLoop(incomingMsgObj.treeToken, incomingMsgObj.pathToken);
  case 'my-P-shaped-loop-same-path':
    return generateNewPathToken().then(newPathToken => { // for old in-neighbor
      return backtrack(newPathToken); // for old in-neighbor
    }).then(forwardMessages => {
      return this._reportLoop(incomingMsgObj.treeToken, incomingMsgObj.pathToken, forwardMessages); // for new in-neighbor and path
    });
  case 'my-P-shaped-loop-path-changed':
    return backtrack().then(forwardMessages => { // for old in-neighbor
      return this._reportLoop(incomingMsgObj.treeToken, incomingMsgObj.pathToken, forwardMessages); // for new in-neighbor and path
    });
  case 'my-probe-backtracked':
    return generateNewPathToken().then(newPathToken => {
      return tryNextNeighbor(newPathToken);
    }).then(forwardMessages => {
      return orIfEmpty(forwardMessages, fail); // next out-neighbor or fail if none left
    });
  case 'backtrack':
    return generateNewPathToken().then(newPathToken => {
      return tryNextNeighbor(newPathToken);
    }).then(forwardMessages => {
     return orIfEmpty(forwardMessages, backtrack()); // next out-neighbor or backtrack if none left
    });
  case 'path-changed':
     return Promise.reject(new Error('path changed')); // this should not normally occur, I think. for now, throw error
  case 'already-routed':
     return Promise.reject(new Error('already routed')); // maybe the original node malfunctioned. for now, throw error
  default:
     return Promise.reject(new Error(`unrecognized probe status ${probeStatus}`));
  }
};

ProbeEngine.prototype.maybeSendProbes = function(neighbors) {
  if ((neighbors['in'].length === 0) || (neighbors.out.length === 0)) {
    return Promise.resolve([]);
  }
  return this._createProbeObj(neighbors.out[0].peerNick, neighbors.out[0].currency).then(obj => {  // TODO: send to other neighbor pairs too
    return [ obj ];
  });
};

module.exports = ProbeEngine;
