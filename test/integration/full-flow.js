['keypairs', 'challenges', 'signatures', 'settlement-engine', 'agents'].map(file => {
  delete require.cache[require.resolve(`../../src/${file}`)];
});
var rewire = require('rewire');
var keypairs = rewire('../../src/keypairs');
var Challenge = rewire('../../src/challenges');
var Signatures = rewire('../../src/signatures');
var SettlementEngine = rewire('../../src/settlement-engine');
var Agent = rewire('../../src/agents');
var messaging = require('../../src/messaging');
var debug = require('../../src/debug');
var assert = require('assert');

var bufferUtils = require('../../src/buffer-utils');
fromBase64 = bufferUtils.fromBase64;
toBase64 = bufferUtils.toBase64;
str2ab = bufferUtils.str2ab;
ab2str = bufferUtils.ab2str;

// TODO: spy on the mocked window.crypto methods
// var sinon = require('sinon');

// TODO: put this sort of code in helpers instead of copied into each test:
var counter = 0;
var verifyShouldFail = false;
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
        if(verifyShouldFail) {
          return Promise.resolve(false);
        }
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
Signatures.__set__('Challenge', Challenge);
SettlementEngine.__set__('signatures', Signatures);
Agent.__set__('SettlementEngine', SettlementEngine);

debug.setLevel(false);

function messageTypes(traffic) {
  var msgType = [];
  for (var i=0; i<traffic.length; i++) {
    msgType.push([traffic[i].fromNick, traffic[i].toNick, JSON.parse(traffic[i].msg).msgType]);
    if (msgType[msgType.length-1][2] === 'update-status') {
      msgType[msgType.length-1].push(JSON.parse(traffic[i].msg).value);
      msgType[msgType.length-1].push(JSON.parse(traffic[i].msg).isReply);
    }
  }
  return msgType;
}

describe('three agents staggered', function() {
  var agents = {
    alice: new Agent('alice'),
    bob: new Agent('bob'),
    charlie: new Agent('charlie'),
  };
  it('should setlle debt loop', function() {  
    return agents.alice.sendIOU('bob', 0.1, 'USD').then(() => {
      console.log('IOU alice to bob sent');
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'alice', 'bob', 'initiate-update' ],
      ]);
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'bob', 'alice', 'confirm-update' ],
      ]);
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
      ]);
      return agents.bob.sendIOU('charlie', 0.1, 'USD');
    }).then(() => {
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'bob', 'charlie', 'initiate-update' ],
      ]);
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'charlie', 'bob', 'confirm-update' ],
      ]);
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'bob', 'alice', 'update-status', true, false ],// bob is now connected on both sides and goes looking for the inTree of his new charlie-link
      ]);
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'alice', 'bob', 'update-status', false, true ],// but alice says she's a dead end.
      ]);
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'bob', 'charlie', 'update-status', false, false ],
      ]);
      assert.deepEqual(agents.alice._search._neighbors,
          { 'in': { },
             out: { '["bob","USD"]':     { myPingPending: null, theirPingPending: false } } });
      assert.deepEqual(agents.bob._search._neighbors,
          { 'in': { '["alice","USD"]': { myPingPending: false, theirPingPending: null } },
           out: { '["charlie","USD"]': { myPingPending: false, theirPingPending: null } } });
      assert.deepEqual(agents.charlie._search._neighbors,
          { 'in': { '["bob","USD"]':   { myPingPending: false, theirPingPending: false } },
           out: { } });
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
      ]);
      return agents.charlie.sendIOU('alice', 0.1, 'USD'); // charlie sends his IOU to alice, closing the debt loop
    }).then(() => {
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'charlie', 'alice', 'initiate-update' ],
      ]);
console.log(agents.alice._search);
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'alice', 'charlie', 'confirm-update' ],
        [ 'alice', 'bob', 'update-status', true, false ], // alice pings bob
      ]);
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'charlie', 'bob', 'update-status', true, false ], // charlie pings bob
        [ 'bob', 'charlie', 'update-status', true, false ], // bob forwards alice's ping to charlie
      ]);
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'bob', 'alice', 'update-status', true, false ], // bob forwards charlie's ping to alice
        [ 'charlie', 'alice', 'update-status', true, false ], // charlie forwards alice's own ping back to alice
      ]);
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'alice', 'charlie', 'update-status', true, false ], // alice forward charlie's own ping back to charlie
        [ 'alice', 'charlie', 'update-status', true, true ],
      ]);
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'charlie', 'alice', 'update-status', true, true ],
      ]);
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
      ]);
      assert.deepEqual(agents.alice._search._neighbors,
          { 'in': { '["charlie","USD"]': { myPingPending: true, theirPingPending: true } },
             out: { '["bob","USD"]':     { myPingPending: true, theirPingPending: true } } });
      assert.deepEqual(agents.bob._search._neighbors,
          { 'in': { '["alice","USD"]': { myPingPending: true, theirPingPending: true } },
           out: { '["charlie","USD"]': { myPingPending: true, theirPingPending: true } } });
      assert.deepEqual(agents.charlie._search._neighbors,
          { 'in': { '["bob","USD"]':   { myPingPending: true, theirPingPending: true } },
             out: { '["alice","USD"]': { myPingPending: true, theirPingPending: true } } });
      return agents.alice._probeTimerHandler();
    }).then(() => {
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'alice', 'bob', 'probe' ],
      ]);
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'bob', 'charlie', 'probe' ],
      ]);
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'charlie', 'alice', 'probe' ],
      ]);
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'alice', 'charlie', 'conditional-promise' ],
      ]);
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'charlie', 'bob', 'conditional-promise' ],
      ]);
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'bob', 'alice', 'conditional-promise' ],
      ]);
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'alice', 'bob', 'satisfy-condition' ],
      ]);
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'bob', 'alice', 'initiate-update' ],
        [ 'bob', 'charlie', 'satisfy-condition' ],
      ]);
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'alice', 'bob', 'confirm-update' ],
        [ 'charlie', 'bob', 'initiate-update' ],
        [ 'charlie', 'alice', 'satisfy-condition' ],
      ]);
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'bob', 'charlie', 'confirm-update' ],
        [ 'alice', 'charlie', 'initiate-update' ],
      ]);
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'charlie', 'alice', 'confirm-update' ],
      ]);
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
      ]);
      return messaging.flush();
    });
  });
});

describe('three agents racing', function() {
  var agents = {
    daphne: new Agent('daphne'),
    edward: new Agent('edward'),
    fred: new Agent('fred'),
  };
  it('should setlle debt loop', function() {  
    return agents.daphne.sendIOU('edward', 0.1, 'USD').then(() => {
      return agents.edward.sendIOU('fred', 0.1, 'USD');
    }).then(() => {
      return agents.fred.sendIOU('daphne', 0.1, 'USD');
    }).then(() => {
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'daphne', 'edward', 'initiate-update' ],
        [ 'edward', 'fred', 'initiate-update' ],
        [ 'fred', 'daphne', 'initiate-update' ],
      ]);
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'edward', 'daphne', 'confirm-update' ],
        [ 'fred', 'edward', 'confirm-update' ],
        [ 'daphne', 'fred', 'confirm-update' ],
      ]);
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'daphne', 'fred', 'update-status', true, false ],
        [ 'edward', 'daphne', 'update-status', true, false ],
        [ 'fred', 'edward', 'update-status', true, false ],
      ]);
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'fred', 'daphne', 'update-status', true, true ],
        [ 'daphne', 'edward', 'update-status', true, true ],
        [ 'edward', 'fred', 'update-status', true, true ],
      ]);
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'daphne', 'edward', 'update-status', true, false ],
        [ 'edward', 'fred', 'update-status', true, false ],
        [ 'fred', 'daphne', 'update-status', true, false ]
      ]);
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'edward', 'daphne', 'update-status', true, true ],
        [ 'fred', 'edward', 'update-status', true, true ],
        [ 'daphne', 'fred', 'update-status', true, true ] ,
      ]);
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
      ]);
      assert.deepEqual(agents.daphne._search._neighbors,
          { 'in': { '["fred","USD"]': { myPingPending: true, theirPingPending: true } },
             out: { '["edward","USD"]':     { myPingPending: true, theirPingPending: true } } });
      assert.deepEqual(agents.edward._search._neighbors,
          { 'in': { '["daphne","USD"]': { myPingPending: true, theirPingPending: true } },
           out: { '["fred","USD"]': { myPingPending: true, theirPingPending: true } } });
      assert.deepEqual(agents.fred._search._neighbors,
          { 'in': { '["edward","USD"]':   { myPingPending: true, theirPingPending: true } },
             out: { '["daphne","USD"]': { myPingPending: true, theirPingPending: true } } });
      return agents.daphne._probeTimerHandler();
    }).then(() => {
      return agents.edward._probeTimerHandler();
    }).then(() => {
      return agents.fred._probeTimerHandler();
    }).then(() => {
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'daphne', 'edward', 'probe' ],
        [ 'edward', 'fred', 'probe' ],
        [ 'fred', 'daphne', 'probe' ],
      ]);
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'edward', 'fred', 'probe' ],
        [ 'fred', 'daphne', 'probe' ],
        [ 'daphne', 'edward', 'probe' ],
      ]);
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'fred', 'daphne', 'probe' ],
        [ 'daphne', 'edward', 'probe' ],
        [ 'edward', 'fred', 'probe' ],
      ]);
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'daphne', 'fred', 'conditional-promise' ],
        [ 'edward', 'daphne', 'conditional-promise' ],
        [ 'fred', 'edward', 'conditional-promise' ],
      ]);
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'fred', 'edward', 'conditional-promise' ],
        [ 'daphne', 'fred', 'conditional-promise' ],
        [ 'edward', 'daphne', 'conditional-promise' ],
      ]);
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'edward', 'daphne', 'conditional-promise' ],
        [ 'fred', 'edward', 'conditional-promise' ],
        [ 'daphne', 'fred', 'conditional-promise' ],
      ]);
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'daphne', 'edward', 'satisfy-condition' ],
        [ 'edward', 'fred', 'satisfy-condition' ],
        [ 'fred', 'daphne', 'satisfy-condition' ],
      ]);
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      verifyShouldFail = true;
      assert.deepEqual(messageTypes(traffic), [
        [ 'edward', 'daphne', 'initiate-update' ],
        [ 'edward', 'fred', 'satisfy-condition' ],
        [ 'fred', 'edward', 'initiate-update' ],
        [ 'fred', 'daphne', 'satisfy-condition' ],
        [ 'daphne', 'fred', 'initiate-update' ],
        [ 'daphne', 'edward', 'satisfy-condition' ],
      ]);
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'daphne', 'edward', 'confirm-update' ],
        [ 'fred', 'edward', 'initiate-update' ],
        [ 'fred', 'daphne', 'satisfy-condition' ],
        [ 'edward', 'fred', 'confirm-update' ],
        [ 'daphne', 'fred', 'initiate-update' ],
        [ 'daphne', 'edward', 'satisfy-condition' ],
        [ 'fred', 'daphne', 'confirm-update' ],
        [ 'edward', 'daphne', 'initiate-update' ],
        [ 'edward', 'fred', 'satisfy-condition' ],
      ]);
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        [ 'edward', 'fred', 'confirm-update' ],
        [ 'edward', 'daphne', 'update-status', false, false ],
        // [ 'daphne', 'fred', 'initiate-update' ], ->  missing because we set verifyShouldFail = true
        [ 'fred', 'daphne', 'confirm-update' ],
        [ 'fred', 'edward', 'update-status', false, false ],
        // [ 'edward', 'daphne', 'initiate-update' ], ->  missing because we set verifyShouldFail = true
        [ 'daphne', 'edward', 'confirm-update' ],
        [ 'daphne', 'fred', 'update-status', false, false ],
        // [ 'fred', 'edward', 'initiate-update' ], ->  missing because we set verifyShouldFail = true
      ]);
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
        // [ 'fred', 'daphne', 'confirm-update' ], ->  missing because we set verifyShouldFail = true
        // [ 'daphne', 'edward', 'confirm-update' ], ->  missing because we set verifyShouldFail = true
        // [ 'edward', 'fred', 'confirm-update' ], ->  missing because we set verifyShouldFail = true
      ]);
      return messaging.flush();
    }).then(traffic => {
      console.log(messageTypes(traffic));
      assert.deepEqual(messageTypes(traffic), [
      ]);
      return messaging.flush();
    });
  });
});
