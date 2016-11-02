// FIXME: this test passes when run separately, but when included in mochaTest, it messes up the full-flow integration test :(
// 
// var rewire = require('rewire');
// var keypairs = rewire('../../src/keypairs');
// var Challenge = rewire('../../src/challenges');
// var Signatures = rewire('../../src/signatures');
// var assert = require('assert');
// 
// var bufferUtils = require('../../src/buffer-utils');
// fromBase64 = bufferUtils.fromBase64;
// toBase64 = bufferUtils.toBase64;
// str2ab = bufferUtils.str2ab;
// ab2str = bufferUtils.ab2str;
// 
// // TOOD: spy on the mocked window.crypto methods
// // var sinon = require('sinon');
// 
// var counter = 0;
// var WindowMock = {
//   atob: require('atob'),
//   btoa: require('btoa'),
//   crypto: {
//     getRandomValues: function(bufView) {
//       var str = `bin:random-${counter++}`;
//       for (var i=0, strLen=str.length; i<strLen; i++) {
//         bufView[i] = str.charCodeAt(i);
//       }
//       console.log('random values filled', ab2str(bufView.buffer));
//       return bufView;
//     },
//     subtle: {
//       generateKey: function(keytypeobj, extractable, purposes) {
//         assert.equal(keytypeobj.name, 'ECDSA');
//         assert.equal(keytypeobj.namedCurve, 'P-256');
//         assert.equal(extractable, false);
//         assert.deepEqual(purposes, ['sign', 'verify']);
//         var keyNum = counter++;
//         var ret = {
//           privateKey: { priv: keyNum },
//           publicKey: { pub: keyNum },
//         };
//         console.log('generateKey returns:', ret);
//         return Promise.resolve(ret);
//       },
//       exportKey: function(format, pubkeyobj) {
//         assert.equal(format, 'spki');
//         console.log('exportKey called:', format, pubkeyobj);
//         var ret = str2ab(`ab-pubkey:${pubkeyobj.pub}`);
//         console.log('exportKey returns:', pubkeyobj, ab2str(ret));
//         return Promise.resolve(ret);
//       },
//       // pubkey will be of form str2ab(`ab-pubkey:i`)
//       importKey: function(format, pubkey, keytypeobj, extractable, purposes) {
//         assert.equal(format, 'spki');
//         assert.equal(keytypeobj.name, 'ECDSA');
//         assert.equal(keytypeobj.namedCurve, 'P-256');
//         assert.equal(extractable, false);
//         assert.deepEqual(purposes, ['verify']);
//         console.log('crypto.subtle importing key', ab2str(pubkey));
//         var ret = { privateKey: null, publicKey: { pub: ab2str(pubkey) } };
//         console.log('importKey returns:', ab2str(pubkey), ret);
//         return Promise.resolve(ret);
//       },
//       sign: function(algobj, privkeyobj, cleartext) {
//         assert.equal(algobj.name, 'ECDSA');
//         assert.equal(algobj.hash.name, 'SHA-256');
//         console.log('crypto.subtle.sign', privkeyobj, ab2str(cleartext));
//         var ret = str2ab(`bin:signature-${privkeyobj.priv}-${ab2str(cleartext)}`);
//         console.log('sign returns:', privkeyobj, ab2str(cleartext), ab2str(ret));
//         return Promise.resolve(ret);
//       },
//       verify: function(algobj, pubkeyObj, signature, cleartext) {
//         // FIXME: looks like cleartext that gets passed into here is not a ArrayBuffer?
//         
//         console.log('verify types:', typeof algobj, typeof pubkeyObj, typeof signature, typeof cleartext);
//         console.log('verify', { algobj, pubkeyObj, signature2str: ab2str(signature), cleartext2str: ab2str(cleartext) });
// 
//         assert.equal(algobj.name, 'ECDSA');
//         assert.equal(algobj.hash.name, 'SHA-256');
//         var keyNum = pubkeyObj.publicKey.pub.substring('ab:public-'.length);
//         var cleartextStr = ab2str(cleartext);
//         var targetStr = `bin:signature-${keyNum}-${cleartextStr}`;
//         var signatureStr = ab2str(fromBase64(signature));
//         console.log('comparing', { signatureStr, keyNum, cleartextStr, targetStr });
//         var ret = (signatureStr === targetStr);
//         console.log('verify returns', pubkeyObj, ab2str(cleartext), ab2str(signature), ret);
//         return Promise.resolve(ret);
//       },
//     },
//   },
// };
// 
// keypairs.__set__('window', WindowMock);
// Challenge.__set__('keypairs', keypairs);
// Challenge.__set__('window', WindowMock);
// Signatures.__set__('Challenge', Challenge);
// 
// describe('Signatures', function() {
//   var solver = new Signatures();
//   var checker = new Signatures();
// console.log(solver, checker);
//   it('should generate, solve, and verify challenges', function() {
//     return solver.generateChallenge().then(obj => {
//       return solver.solve(obj.pubkey).then(solution => {
//         return checker.verify(obj.cleartext, obj.pubkey, solution);
//       });
//     }).then(verdict => {
//       assert.equal(verdict, true);
//     });
//   });
//   it('should reject a random solution', function() {
//     return solver.generateChallenge().then(obj => {
//       return solver.solve(obj.pubkey).then(solution => {
//         assert.equal(typeof solution, 'string');
//         return checker.verify(obj.cleartext, obj.pubkey, solution.substring(1));
//       });
//     }).then(verdict => {
//       assert.equal(verdict, false);
//     });
//   });
// });
