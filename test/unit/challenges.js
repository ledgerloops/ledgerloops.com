var rewire = require('rewire');
var keypairs = rewire('../../src/keypairs');
var Challenge = rewire('../../src/challenges');
var assert = require('assert');

function ab2str(buf) {
  return String.fromCharCode.apply(null, new Uint8Array(buf));
}

function str2ab(str) {
  var buf = new ArrayBuffer(str.length);
  var bufView = new Uint8Array(buf);
  for (var i=0, strLen=str.length; i<strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

// TOOD: spy on the mocked window.crypto methods
// var sinon = require('sinon');

var counter = 0;
var WindowMock = {
  atob: require('atob'),
  btoa: require('btoa'),
  crypto: {
    getRandomValues: function() {
      var ret = str2ab(`bin:random-${counter++}`);
      console.log('getRandomValues returns:', ab2str(ret));
      return Promise.resolve(ret);
    },
    subtle: {
      generateKey: function() {
        var keyNum = counter++;
        var ret = {
          privateKey: { priv: keyNum },
          publicKey: { pub: keyNum },
        };
        console.log('generateKey returns:', ret);
        return Promise.resolve(ret);
      },
      exportKey: function(format, pubkeyobj) {
        assert.equal(format, 'spki');
        console.log('exportKey called:', format, pubkeyobj);
        var ret = str2ab(`ab-pubkey:${pubkeyobj.pub}`);
        console.log('exportKey returns:', pubkeyobj, ab2str(ret));
        return Promise.resolve(ret);
      },
      // pubkey will be of form str2ab(`bin:pub-from-key-obj:pub-i`)
      importKey: function(format, pubkey) {
        assert.equal(format, 'spki');
        console.log('crypto.subtle importing key', ab2str(pubkey));
        var ret = { privateKey: null, publicKey: pubkey };
        console.log('importKey returns:', pubkey, ret);
        return Promise.resolve(ret);
      },
      sign: function(algobj, privkeyobj, cleartext) {
        assert.equal(algobj.name, 'ECDSA');
        assert.equal(algobj.hash.name, 'SHA-256');
        console.log('crypto.subtle.sign', privkeyobj, cleartext, typeof cleartext, ab2str(cleartext));
        var ret = str2ab(`bin:signature-${privkeyobj.priv}-${ab2str(cleartext)}`);
        console.log('sign returns:', privkeyobj, ab2str(cleartext), ret);
        return Promise.resolve(ret);
      },
      verify: function(algobj, pubkeyObj, cleartext, signature) {
        assert.equal(algobj.name, 'ECDSA');
        assert.equal(algobj.hash.name, 'SHA-256');
        var keyobj = ab2str(pubkeyObj).substring('bin:pub-from-'.length);
        var ret = (ab2str(signature) === `bin:signature-${keyobj}-${cleartext}`);
        console.log('verify returns', pubkeyObj, ab2str(cleartext), ab2str(signature), ret);
        return Promise.resolve(ret);
      },
    },
  },
};

keypairs.__set__('window', WindowMock);
Challenge.__set__('keypairs', keypairs);
Challenge.__set__('window', WindowMock);

describe('Challenges test mocks', function() {
  it('should btoa and atob correctly', function() {
    assert.equal('aGVsbG8gdGhlcmU=', WindowMock.btoa('hello there'));
    assert.equal('hello there', WindowMock.atob('aGVsbG8gdGhlcmU='));
  });
  it('should str2ab and ab2str correctly', function() {
    assert.equal('hello there', ab2str(str2ab('hello there')));
  });
});

describe('keypairs', function() {
  it('should generate first key', function() {
    return keypairs.createKey().then(pubkeyBase64 => {
      assert.equal('ab-pubkey:0', WindowMock.atob(pubkeyBase64));
    });
  });
  it('should allow signing a cleartext', function() {
    return keypairs.useKey(WindowMock.btoa('ab-pubkey:0'), 'my clear text').then(signatureBase64 => {
      return assert.equal('bin:signature-0-my clear text', WindowMock.atob(signatureBase64));
    });
  });
});

function Sender() {
}

function Receiver() {
}

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

describe('Challenges', function() {
  var sender = new Sender();
  var receiver = new Receiver();
  it('should correctly verify its own solution', function() {
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
  });
});
