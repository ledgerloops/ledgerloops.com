var Challenge = require('./challenges');

function Signatures() {
  this._challenges = {};
}

Signatures.prototype.generateChallenge = function() {
  var newChallenge = new Challenge();
  return newChallenge.fromScratch().then(obj => {
    this._challenges[obj.pubkey] = newChallenge;
    return {
      pubkey: obj.pubkey,
      cleartext: obj.cleartext,
    };
  });
};

Signatures.prototype.haveKeypair = function(publicKeyBase64) {
  return (typeof this._challenges[publicKeyBase64] !== 'undefined');
};

Signatures.prototype.solve = function(publicKeyBase64) {
  return this._challenges[publicKeyBase64].solve();
};

Signatures.prototype.verify = function(cleartext, publicKeyBase64, signatureBase64) {
  var tmpChallenge = new Challenge();
  return tmpChallenge.fromData({
    pubkey: publicKeyBase64,
    cleartext: cleartext,
  }).then(() => {
    return tmpChallenge.verifySolution(signatureBase64);
  });
};

module.exports = Signatures;

