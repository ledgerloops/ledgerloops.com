// FIXME: keep private keys out of JavaScript scope

var crypto = require("crypto");
var eccrypto = require("eccrypto");
var base64 = require('base64-js');

function Signatures() {
  this._keypairs = {};
}

Signatures.prototype.generateKeypair = function() {
  // FIXME: keep private keys out of JavaScript scope, yikes
  var privateKey = crypto.randomBytes(32); // A new random 32-byte private key. 
  var privateKeyBase64 = base64.fromByteArray(privateKey);
  var publicKey = eccrypto.getPublic(privateKey); // Corresponding uncompressed (65-byte) public key. 
  var publicKeyBase64 = base64.fromByteArray(publicKey);
  this._keypairs[publicKeyBase64] = { privateKeyBase64, privateKey, publicKey };
  return publicKeyBase64;
};

Signatures.prototype.haveKeypair = function(publicKeyBase64) {
  return (typeof keypairs[publicKeyBase64] !== 'undefined');
};

Signatures.prototype.proofOfOwnership = function(publicKeyBase64) {
  if (typeof keypairs[publicKeyBase64] !== 'undefined') {
    return this.sign('proof of ownership, yes, you see?', publicKeyBase64).toString('bas64'); // TODO: look at how proof of ownership is actually done properly
  } else {
    return 'I don\'t really have that keypair, actually';
  }
};

Signatures.prototype.sign = function(clearText, publicKeyBase64) {
  // Always hash you message to sign! 
  var msg = crypto.createHash('sha256').update(clearText).digest();
  var privateKey = keypairs[publicKeyBase64].privateKey;
  var publicKey = keypairs[publicKeyBase64].publicKey;
  return eccrypto.sign(privateKey, msg).then(sig => {
    return sig.toString();
  });
};

Signatures.prototype.verify = function(clearText, publicKeyBase64, sig) {
  var publicKey = base64.toByteArray(publicKeyBase64);
  // Always hash you message to sign! 
  var msg = crypto.createHash('sha256').update(clearText).digest();
  return eccrypto.verify(publicKey, msg, sig).then(function() {
    return true;
  }).catch(function() {
    return false;
  });
};

module.exports = Signatures;





