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

module.exports = Signatures;

