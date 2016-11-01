function ab2str(buffer) {
  var binary = '';
  var bytes = new Uint8Array(buffer);
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode( bytes[ i ] );
  }
  return binary;
}

function str2ab(str) {
  var buf = new ArrayBuffer(str.length);
  var bufView = new Uint8Array(buf);
  for (var i=0, strLen=str.length; i<strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

function fromBase64( base64 ) {
  var binary_string =  window.atob(base64);
  return str2ab(binary_string);
}
function toBase64( buffer ) {
  return window.btoa( ab2str(buffer) );
}

module.exports = {
  ab2str,
  str2ab,
  fromBase64,
  toBase64,
};
