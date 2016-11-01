(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var keypairs = require('./keypairs');

function fromBase64( base64 ) {
  var binary_string =  window.atob(base64);
  var len = binary_string.length;
  var bytes = new Uint8Array( len );
  for (var i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

function toBase64( buffer ) {
  var binary = '';
  var bytes = new Uint8Array(buffer);
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode( bytes[ i ] );
  }
  return window.btoa( binary );
}

function importPublicKey(base64) {
  var pubkey = fromBase64(base64);
  return window.crypto.subtle.importKey(
      "spki", //can be "jwk" (public or private), "spki" (public only), or "pkcs8" (private only)
      pubkey, //can be a publicKey or privateKey, as long as extractable was true
      {   //these are the algorithm options
          name: "ECDSA",
          namedCurve: "P-256", //can be "P-256", "P-384", or "P-521"
      },
      false, //whether the key is extractable (i.e. can be used in exportKey)
      ["verify"] //"verify" for public key import, "sign" for private key imports
      ).catch(function(err){
    console.error(err);
  });
}

function verifySignature(pubkeyObj, cleartext, signature) {
  return window.crypto.subtle.verify(
      {
        name: "ECDSA",
        hash: {name: "SHA-256"}, //can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
      },
      pubkeyObj, //from generateKey or importKey above
      fromBase64(signature), //ArrayBuffer of the signature
      fromBase64(cleartext) //ArrayBuffer of the data
      ).catch(function(err){
    console.error(err);
  });
}

function createCleartext() {
  var charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var i;
  var result = "";
  var length = 256;
  values = new Uint32Array(length);
  window.crypto.getRandomValues(values);
  for(i=0; i<length; i++) {
      result += charset[values[i] % charset.length];
  }
  return Promise.resolve(result);
}

function Challenge() {
  this._publicKeyBase64 = null;
  this._cleartext = null;
}

Challenge.prototype.fromScratch = function() {
  return keypairs.createKey().then(publicKeyBase64 => {
    this._publicKeyBase64 = publicKeyBase64;
    this._havePrivateKey = true; // but it stays in the keypairs module
    return createCleartext();
  }).then(cleartext => {
    this._cleartext = cleartext;
    return {
      name: "ECDSA",
      namedCurve: "P-256", //can be "P-256", "P-384", or "P-521"
      pubkey: this._publicKeyBase64,
      cleartext: this._cleartext,
    };
  });
};

Challenge.prototype.fromData = function(obj) {
  this._publicKeyBase64 = obj.pubkey;
  this._cleartext = obj.cleartext;
  this._havePrivateKey = false;
  return Promise.resolve({
    name: "ECDSA",
    namedCurve: "P-256", //can be "P-256", "P-384", or "P-521"
    pubkey: this._publicKeyBase64,
    cleartext: this._cleartext,
  });
};

Challenge.prototype.havePrivateKey = function() {
  return this._havePrivateKey;
};

Challenge.prototype.solve = function() {
  if (!this._havePrivateKey) {
    return Promise.reject(new Error('Don\'t have private key'));
  }
  return keypairs.useKey(this._publicKeyBase64, this._cleartext);
};

Challenge.prototype.verifySolution = function(solution) {
  console.log('verifying solution');
  return importPublicKey(this._publicKeyBase64).then(pubkeyObj => {
    return verifySignature(pubkeyObj, this._cleartext, solution);
  });
};

module.exports = Challenge;

},{"./keypairs":3}],2:[function(require,module,exports){
var Challenge = require('./challenges');

function Sender() {
};

function Receiver() {
};

Sender.prototype.createChallenge = function() {
  this._challenge = new Challenge();
  return this._challenge.fromScratch();
};

Sender.prototype.solveChallenge = function() {
  console.log('solving challenge');
  return this._challenge.solve();
};

Receiver.prototype.rememberChallenge = function(obj) {
  this._challenge = new Challenge();
  return this._challenge.fromData(obj);
};

Receiver.prototype.verifySolution = function(solution) {
  return this._challenge.verifySolution(solution);
};

function demo() {
  var sender = new Sender();
  var receiver = new Receiver();
  sender.createChallenge().then(challenge => {
    console.log({ challenge });
    receiver.rememberChallenge(challenge);
  }).then(() => {
    return receiver.verifySolution('asdf');
  }).then(verdictForWrongSolution => {
    console.log({ verdictForWrongSolution });
    return sender.solveChallenge();
  }).then(solution => {
    console.log({ solution });
    return receiver.verifySolution(solution);
  }).then(verdictForSenderSolution => {
    console.log({ verdictForSenderSolution });
  });
}

//...
demo();

},{"./challenges":1}],3:[function(require,module,exports){
function fromBase64( base64 ) {
  var binary_string =  window.atob(base64);
  var len = binary_string.length;
  var bytes = new Uint8Array( len );
  for (var i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

function toBase64( buffer ) {
  var binary = '';
  var bytes = new Uint8Array(buffer);
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode( bytes[ i ] );
  }
  return window.btoa( binary );
}

function exportPublicKey(key) {
  return window.crypto.subtle.exportKey(
      "spki", //can be "jwk" (public or private), "spki" (public only), or "pkcs8" (private only)
      key.publicKey //can be a publicKey or privateKey, as long as extractable was true
      ).then(buffer => {
     return toBase64(buffer);
   }).catch(function(err){
    console.error(err);
  });
}

function sign(keyObj, cleartext) {
  return window.crypto.subtle.sign({
        name: "ECDSA",
        hash: {name: "SHA-256"}, //can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
      },
      keyObj.privateKey, //from generateKey or importKey above
      fromBase64(cleartext) //ArrayBuffer of data you want to sign
      ).then(function(signature){
    return toBase64(signature);
  }).catch(function(err){
    console.error(err);
  });
}

function generateKeypair() {
  return window.crypto.subtle.generateKey({
        name: "ECDSA",
        namedCurve: "P-256", //can be "P-256", "P-384", or "P-521"
      },
      false, //whether the key is extractable (i.e. can be used in exportKey)

//  the API always allows public keys to be exported, regardless of how they are created or imported. That’s because public keys are not sensitive information. They are intended to be shared. - https://blog.engelke.com/2014/09/19/saving-cryptographic-keys-in-the-browser/

      ["sign", "verify"] //can be any combination of "sign" and "verify"
      );
}

var keyStore = {};

module.exports = {
  createKey: function() {
    return generateKeypair().then(newKeyObj => {
      return exportPublicKey(newKeyObj).then(publicKeyBase64 => {
        keyStore[publicKeyBase64] = newKeyObj;
        return publicKeyBase64;
      });
    });
  },
  useKey: function(publicKeyBase64, cleartext) {
    var keyObj = keyStore[publicKeyBase64];
    return sign(keyObj, cleartext);
  },
};

},{}]},{},[2]);
