// just a mock, so far:

function Signatures() {
  this.keypairs = {};
  this.tokens = {};
}

Signatures.prototype.generateToken = function(noteObj) {
  var token = crypto.randomBytes(42).toString('base64');
  this.tokens[token] = noteObj;
};

Signatures.prototype.getNoteObj = function(token) {
  return this.tokens[token];
};

Signatures.prototype.generateKeypair = function() {
  keypairs.pub = 'priv';
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
