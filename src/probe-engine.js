var Signatures = require('./signatures');

function ProbeEngine() {
  this._probes = {};
}

ProbeEngine.prototype._createProbeObj = function(inNeighbor, outNeighbor) {
  var treeToken = Signatures.generateToken();
  var pathToken = Signatures.generateToken();
  this._probes[treeToken] = {
    pathToken,
    inNeighbor,
    outNeighbor,
  };
  return Promise.resolve({ peerNick: outNeighbor.peerNick, currency: outNeighbor.currency, treeToken, pathToken });
};
 
ProbeEngine.prototype.handleIncomingProbe  = function(fromNick, incomingMsgObj, activeNeighbors) {
  console.log('ProbeEngine.prototype.handleIncomingProbe', { fromNick, incomingMsgObj, activeNeighbors });
  
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
        to: this._probes[incomingMsgObj.treeToken],
        msg: incomingMsgObj, // TODO: check what format agent.js expects here
      } ],
      initiateNegotiations: null,
    });
  } else {
    return Promise.resolve({
      forwardMessages: [],
      initiateNegotiations: this._probes[incomingMsgObj.treeToken].outNeighbor
    });
  }
};

ProbeEngine.prototype.maybeSendProbes = function(neighbors) {
  if ((neighbors['in'].length === 0) || (neighbors.out.length === 0)) {
    return Promise.resolve([]);
  }
  return this._createProbeObj(neighbors['in'][0], neighbors.out[0]).then(obj => {  // TODO: send to other neighbor pairs too
    return [ obj ];
  });
};

module.exports = ProbeEngine;
