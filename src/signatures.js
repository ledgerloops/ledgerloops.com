// just a mock, so far:
var keypairs = {};
module.exports = {
  generateKeypair: function() {
    keypairs.pub = 'priv';
    return 'pub';
  },
  haveKeypair: function(pubkey) {
    return (typeof keypairs[pubkey] !== 'undefined');
  },
  proofOfOwnership: function(pubkey) {
    if (typeof keypairs[pubkey] !== 'undefined') {
      return 'proof';
    } else {
      return 'I don\'t really have that keypair, actually';
    }
  },
  sign: function(clearText, pubkey) {
    var privkey = keypairs[pubkey];
    return 'signature';
  },
};
