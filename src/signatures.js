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
  sign: function(clearText, pubkey) {
    var privkey = keypairs[pubkey];
    return 'signature';
  },
};
