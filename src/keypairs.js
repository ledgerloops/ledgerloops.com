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
    return generateKeypair().then(newKey => {
      return exportPublicKey(newKey).then(publicKeyBase64 => {
        keyStore[publicKeyBase64] = keyObj;
        return publicKeyBase64;
      });
    });
  },
  useKey: function(publicKeyBase64, cleartext) {
    var keyObj = keyStore[publicKeyBase64];
    return sign(keyObj, cleartext);
  },
};
