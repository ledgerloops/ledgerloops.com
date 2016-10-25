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

ProbeEngine.prototype._getProbeStatus = function(inNeighborNick, treeToken, pathToken) {
  console.log('ProbeEngine.prototype._getProbeStatus = function(', { inNeighborNick, treeToken, pathToken }, this._probes);
  if (typeof this._probes[treeToken] === 'undefined') {
    return 'unknown';
  }
  if (typeof this._probes[treeToken][pathToken] === 'undefined') {
    var probeIsMine = true;
    var backtrack = false;
    for (var existingToken in this._probes[treeToken]) {
      if (typeof this._probes[treeToken][existingToken].inNeighborNick !== 'undefined') {
        console.log('this treeToken is not mine');
        probeIsMine = false;
      }
      if (this._probes[treeToken][existingToken].inNeighborNick === inNeighborNick) {
        return 'path-changed'; // this should not normally happen in current algorithm
      } else if (this._probes[treeToken][existingToken].outNeighborNick === inNeighborNick) {
        backtrack = true;
      }
    }
    // this probe's treeToken was seen before, but either it was mine or it came from a different in-neighbor
    if (probeIsMine) {
      return (backtrack ? 'my-probe-backtracked' : 'my-probe-not-backtracked');
    }
    return (backtrack ? 'backtrack' : 'my-P-shaped-loop');
  }
  if (typeof this._probes[treeToken][pathToken].inNeighborNick === 'undefined') {
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

ProbeEngine.prototype._tryNextNeighborOrParent = function(treeToken, pathToken, newPathToken, activeNeighbors) {
  var inNeighborNick;
  var currency;
  var outNeighborsTried = {};
  for (var triedPathToken in this._probes[treeToken]) {
    if (typeof this._probes[treeToken][triedPathToken].inNeighborNick !== 'undefined') {
      inNeighborNick = this._probes[treeToken][triedPathToken].inNeighborNick;
      currency = this._probes[treeToken][triedPathToken].currency;
    }
    outNeighborsTried[this._probes[treeToken][triedPathToken].outNeighborNick] = true;
  }
  console.log(this._probes, inNeighborNick, currency, outNeighborsTried);
  var backtrackMsgObj = { // for old in-neighbor
    treeToken,
    pathToken: newPathToken,
    currency,
  };
  for (var i=0; i< activeNeighbors.out.length; i++) {
    if (!outNeighborsTried[activeNeighbors.out[i].peerNick]) {
      return [
        {
           to: activeNeighbors.out[i].peerNick,
           msg: backtrackMsgObj,
        }
      ];
    }
  }
  if (inNeighborNick) {
    return [
      {
         to: inNeighborNick,
         msg: backtrackMsgObj,
      }
    ];
   }
   return []; // treeToken was mine and failed, it will die out.
};

ProbeEngine.prototype.handleIncomingProbe = function(fromNick, incomingMsgObj, activeNeighbors) {
//  console.log('ProbeEngine.prototype.handleIncomingProbe', { fromNick, incomingMsgObj }, activeNeighbors);

  var probeStatus = this._getProbeStatus(fromNick, incomingMsgObj.treeToken, incomingMsgObj.pathToken);

  if (probeStatus === 'unknown' && activeNeighbors.out.length === 0) {
    console.log('no outNeighbors! backtracking');
    this._store(incomingMsgObj.treeToken, incomingMsgObj.pathToken, fromNick, undefined, incomingMsgObj.currency);
    probeStatus = 'backtrack'; // FIXME: this is effectively a GOTO statement
  }
  switch(probeStatus) {
  case 'unknown':
    return this._store(incomingMsgObj.treeToken, incomingMsgObj.pathToken,
        fromNick, activeNeighbors.out[0].peerNick, // TODO: somehow pick the most promising out-neighbor first
        incomingMsgObj.currency).then(() => {
      return Promise.resolve({
        forwardMessages: [ {
          to: this._probes[incomingMsgObj.treeToken][incomingMsgObj.pathToken].outNeighborNick,
          msg: incomingMsgObj,
        } ],
        cycleFound: null,
      });
    });
  case 'my-probe-not-backtracked':
    this._probes[incomingMsgObj.treeToken][incomingMsgObj.pathToken].inNeighborNick = fromNick;
    return this._reportLoop(incomingMsgObj.treeToken, incomingMsgObj.pathToken);
  case 'my-P-shaped-loop-same-path':
  case 'my-P-shaped-loop-path-changed':
    return Promise.resolve(this._tokensModule.generateToken()).then(newPathToken => { // for old in-neighbor
      var backtrackMsgObj = { // for old in-neighbor
        treeToken: incomingMsgObj.treeToken,
        pathToken: newPathToken,
        currency: incomingMsgObj.currency,
      };
      return [
        {
          to: this._probes[incomingMsgObj.treeToken][incomingMsgObj.pathToken].inNeighborNick,
          msg: backtrackMsgObj,
        },
      ];
    }).then(forwardMessages => {
      return this._reportLoop(incomingMsgObj.treeToken, incomingMsgObj.pathToken, forwardMessages); // for new in-neighbor and path
    });
  case 'my-probe-backtracked':
  case 'backtrack':
    return Promise.resolve(this._tokensModule.generateToken()).then(newPathToken => {
      console.log({ newPathToken });
      return this._tryNextNeighborOrParent(incomingMsgObj.treeToken, incomingMsgObj.pathToken, newPathToken, activeNeighbors);
    }).then(forwardMessages => {
      console.log({ forwardMessages });
      return { forwardMessages, cycleFound: null }; // next out-neighbor or fail if none left
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
