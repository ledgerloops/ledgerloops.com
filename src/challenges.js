var keypairs = require('./keypairs');

// TODO: find browserify modules for window.crypto.subtle so this also works in nodejs

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
console.log('importPublicKey', { pubkey, base64 });
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
