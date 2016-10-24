var signatures = require('./signatures');

function ProbeEngine() {
  this._probes = {};
}

ProbeEngine.prototype._createProbeObj = function(inNeighbor, outNeighbor) {
  var treeToken = signatures.createToken({ inNeighbor, outNeighbor, type: 'tree' });
  var pathToken = signatures.createToken({ inNeighbor, outNeighbor, type: 'path' }); // FIXME: deal with multiple paths on one tree
  this._probes[treeToken] = {
    pathToken,
    inNeighbor,
    outNeighbor,
  };
  return Promise.resolve({ treeToken, pathToken });
};
 
ProbeEngine.prototype.handleIncomingProbe  = function(fromNick, incomingMsgObj, outNeighbors) {
  if (typeof this.probes[incomingMsgObj.treeToken] === 'undefined') {
    this._probes[incomingMsgObj.treeToken] = {
      pathToken: incomingMsgObj.pathToken,
      inNeighbor: fromNick,
      outNeighbor: outNeighbors[0], // TODO: somehow pick the most promising out-neighbor
                                    // TODO: implement backtracking (requires new msgType)
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
    return { to: neighbors.out[0], msg: obj };
  });
};

module.exports = ProbeEngine;
