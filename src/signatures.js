// just a mock, so far:
module.exports = {
  generateKeypair: function() {
    return { pub: 'pub', priv: 'priv' };
  },
  sign: function(clearText, keypair) {
    return 'signature';
  },
};
