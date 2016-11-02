var Challenge = require('./challenges');

function Signatures() {
  this._challenges = {};
}

Signatures.prototype.generateChallenge = function() {
console.log('generating');
  var newChallenge = new Challenge();
console.log('generating');
  return newChallenge.fromScratch().then(obj => {
    this._challenges[obj.pubkey] = newChallenge;
console.log('using new challenge', obj);
    return {
      pubkey: obj.pubkey,
      cleartext: obj.cleartext,
    };
  });
};

Signatures.prototype.haveKeypair = function(publicKeyBase64) {
console.log('do I have this keypair?', publicKeyBase64, this._challenges);
  return (typeof this._challenges[publicKeyBase64] !== 'undefined');
};

Signatures.prototype.solve = function(publicKeyBase64) {
  console.log('signing with key we supposedly generated', publicKeyBase64, this._challenges);
  return this._challenges[publicKeyBase64].solve();
};

Signatures.prototype.verify = function(cleartext, publicKeyBase64, signatureBase64) {
console.log('Signatures.prototype.verify = function(', cleartext, publicKeyBase64, signatureBase64);
  var tmpChallenge = new Challenge();
  return tmpChallenge.fromData({
    pubkey: publicKeyBase64,
    cleartext: cleartext,
  }).then(() => {
    return tmpChallenge.verifySolution(signatureBase64);
  });
};

module.exports = Signatures;

