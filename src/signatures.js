// just a mock, so far:

function Signatures() {
  this.keypairs = {};
}

Signatures.prototype.generateKeypair = function() {
  this.keypairs.pub = 'priv';
  return 'pub';
};

Signatures.prototype.haveKeypair = function(pubkey) {
  return (typeof keypairs[pubkey] !== 'undefined');
};

Signatures.prototype.proofOfOwnership = function(pubkey) {
  if (typeof keypairs[pubkey] !== 'undefined') {
    return 'proof';
  } else {
    return 'I don\'t really have that keypair, actually';
  }
};

Signatures.prototype.sign = function(clearText, pubkey) {
  var privkey = keypairs[pubkey];
  return 'signature';
};

module.exports = Signatures;
