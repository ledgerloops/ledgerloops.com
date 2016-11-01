var rewire = require('rewire');
var keypairs = rewire('../../src/keypairs');
var Challenge = rewire('../../src/challenges');
var assert = require('assert');

var bufferUtils = require('../../src/buffer-utils');
fromBase64 = bufferUtils.fromBase64;
toBase64 = bufferUtils.toBase64;
str2ab = bufferUtils.str2ab;
ab2str = bufferUtils.ab2str;

// TOOD: spy on the mocked window.crypto methods
// var sinon = require('sinon');

var counter = 0;
var WindowMock = {
  atob: require('atob'),
  btoa: require('btoa'),
  crypto: {
    getRandomValues: function(bufView) {
      var str = `bin:random-${counter++}`;
      for (var i=0, strLen=str.length; i<strLen; i++) {
        bufView[i] = str.charCodeAt(i);
      }
      console.log('random values filled', ab2str(bufView.buffer));
      return bufView;
    },
    subtle: {
      generateKey: function(keytypeobj, extractable, purposes) {
        assert.equal(keytypeobj.name, 'ECDSA');
        assert.equal(keytypeobj.namedCurve, 'P-256');
        assert.equal(extractable, false);
        assert.deepEqual(purposes, ['sign', 'verify']);
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
      // pubkey will be of form str2ab(`ab-pubkey:i`)
      importKey: function(format, pubkey, keytypeobj, extractable, purposes) {
        assert.equal(format, 'spki');
        assert.equal(keytypeobj.name, 'ECDSA');
        assert.equal(keytypeobj.namedCurve, 'P-256');
        assert.equal(extractable, false);
        assert.deepEqual(purposes, ['verify']);
        console.log('crypto.subtle importing key', ab2str(pubkey));
        var ret = { privateKey: null, publicKey: { pub: ab2str(pubkey) } };
        console.log('importKey returns:', ab2str(pubkey), ret);
        return Promise.resolve(ret);
      },
      sign: function(algobj, privkeyobj, cleartext) {
        assert.equal(algobj.name, 'ECDSA');
        assert.equal(algobj.hash.name, 'SHA-256');
        console.log('crypto.subtle.sign', privkeyobj, ab2str(cleartext));
        var ret = str2ab(`bin:signature-${privkeyobj.priv}-${ab2str(cleartext)}`);
        console.log('sign returns:', privkeyobj, ab2str(cleartext), ab2str(ret));
        return Promise.resolve(ret);
      },
      verify: function(algobj, pubkeyObj, signature, cleartext) {
        console.log('verify', { algobj, pubkeyObj, cleartext2str: ab2str(cleartext), signature2str: ab2str(signature) });
        assert.equal(algobj.name, 'ECDSA');
        assert.equal(algobj.hash.name, 'SHA-256');
        var keyNum = pubkeyObj.publicKey.pub.substring('ab:public-'.length);
        var cleartextStr = ab2str(cleartext);
        var targetStr = `bin:signature-${keyNum}-${cleartextStr}`;
        var signatureStr = ab2str(fromBase64(signature));
        console.log('comparing', { signatureStr, keyNum, cleartextStr, targetStr });
        var ret = (signatureStr === targetStr);
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
console.log('here comes the test', sender, receiver);
      return receiver.verifySolution(WindowMock.btoa('asdf'));
    }).then(verdictForWrongSolution => {
      console.log({ verdictForWrongSolution });
      assert.equal(verdictForWrongSolution, false);
      return sender.solveChallenge();
    }).then(solution => {
      console.log({ solution });
      return receiver.verifySolution(solution);
    }).then(verdictForSenderSolution => {
      assert.equal(verdictForSenderSolution, true);
      console.log({ verdictForSenderSolution });
    });
  });
});
