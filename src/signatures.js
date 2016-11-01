var Challenge = require('./challenges');

function Signatures() {
  this._challenges = {};
}

Signatures.prototype.generateKeypair = function() {
  var newChallenge = new Challenge();
  return newChallenge.fromScratch().then(obj => {
    this._challenges[obj.publicKeyBase64] = newChallenge;
    return obj.publicKeyBase64;
  });
};

Signatures.prototype.haveKeypair = function(publicKeyBase64) {
  return (typeof this._challenges[publicKeyBase64] !== 'undefined');
};

Signatures.prototype.sign = function(cleartextStr, publicKeyBase64) {
  return this._challenges[publickKeyBase64].solve();
};

Signatures.prototype.verify = function(cleartext, publicKeyBase64, signatureBase64) {
  var tmpChallenge = new Challenge();
  return tmpChallenge.fromData({
    pubkey: publickeyBase64,
    cleartext: cleartext,
  }).then(() => {
    return tmpChallenge.verifySolution(signatureBase64);
  });
};

module.exports = Signatures;

