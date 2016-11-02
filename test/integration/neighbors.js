// var rewire = require('rewire');
// var tokens = rewire('../../src/tokens');
// var Ledger = rewire('../../src/ledgers');
// var Agent = rewire('../../src/agents');
// var messaging = require('../../src/messaging');
// var protocolVersions = require('../../src/messages').protocolVersions;
// var debug = require('../../src/debug');
// var assert = require('assert');
// // var sinon = require('sinon');
// var stringify = require('canonical-json');
// 
// // FIXME: these tests only work because messages are flushed in the same synchronous code
// // that creates them. Otherwise, messages from one test would end up at the other test.
// // Should use multiple instances of the messaging simulator, see
// // https://github.com/michielbdejong/ledgerloops/issues/26
// 
// debug.setLevel(false);
// 
// var DateMock = function() {
// };
// DateMock.prototype.toString = function() {
//   return 'the now time';
// };
// Agent.__set__('Date', DateMock);
// 
// function CryptoMock() {
//   this.counter = 0;
// }
// CryptoMock.prototype.randomBytes = function() {
//   return {
//     toString: () => {
//       return `token-${this.counter++}`;
//     },
//   };
// };
// var cryptoMock = new CryptoMock();
// tokens.__set__('crypto', cryptoMock);
// Ledger.__set__('tokens', tokens);
// Agent.__set__('Ledger', Ledger);
// 
// describe('IOUs between Alice and Bob', function() {
//   afterEach(function() {
//     messaging.discardQueue();
//   });
//   var agents = {
//     alice: new Agent('alice'),
//     bob: new Agent('bob'),
//   };
//   it('should update search neighbors', function() {
//     agents.alice.sendIOU('bob', 0.01, 'USD');
//     // Alice  -------->    Bob
//     //        sends IOU
//     // debtor   --->     creditor
//     //          owes
//     // [in] [out]      [in]    [out]
//     return messaging.flush().then(messagesSent => {
//       assert.deepEqual(messagesSent, [
//         {
//           fromNick: 'alice',
//           msg: stringify({
//             protocol: protocolVersions.ledger,
//             transactionId: 'token-0',
//             msgType: 'initiate-update',
//             debtor: 'alice',
//             note: 'IOU sent from alice to bob on the now time',
//             addedDebts: {
//               USD: 0.01,
//             },
//           }),
//           toNick: 'bob'
//         },
//       ]);
// 
// 
//       // Bob already created Alice as an awake in-neighbor, but did not
//       // wake himself, and immediately put her to sleep,
//       // because he has no out-neighbors
//       // He sends his new in-neighbor Alice a message to tell her. That way, Alice knows that her new out-tree is very small.
// 
//       // TODO: not access private vars here
//       assert.deepEqual(agents.alice._search._neighbors['in'], {});
//       assert.deepEqual(agents.alice._search._neighbors.out, {});
//       assert.deepEqual(agents.bob._search._neighbors['in'], { '["alice","USD"]': { awake: false } });
//       assert.deepEqual(agents.bob._search._neighbors.out, {});
// console.log(messaging.getQueue());
//       return messaging.flush();
//     }).then(messagesSent => {
//       assert.deepEqual(messagesSent, [
//         {
//           fromNick: 'bob',
//           msg: stringify({
//             protocol: protocolVersions.ledger,
//             transactionId: 'token-0',
//             msgType: 'confirm-update',
//           }),
//           toNick: 'alice'
//         },
//         {
//           fromNick: 'bob',
//           msg: stringify({
//             protocol: protocolVersions.routing,
//             msgType: 'update-status',
//             currency: 'USD',
//             value: false,
//           }),
//           toNick: 'alice'
//         },
//       ]);
// 
//       // After the first message, Alice also created Bob as an awake out-neighbor, but did not
//       // wake herself, and immediately puts him to sleep,
//       //  because she has no in-neighbors.
//       // She sends her new neighbor Bob a message to tell him. That way, Bob knows that his new in-tree is very small.
//       // The second message, which indicates that Bob has no out-neighbors, is ingored, because she had already marked Bob
//       // as a sleeping out-neighbor. The GO_TO_SLEEP messages will cross each other, and Bob will also ignore hers.
// 
//       // TODO: not access private vars here
//       assert.deepEqual(agents.alice._search._neighbors['in'], {});
//       assert.deepEqual(agents.alice._search._neighbors.out, { '["bob","USD"]': { awake: false } });
//       assert.deepEqual(agents.bob._search._neighbors['in'], { '["alice","USD"]': { awake: false } });
//       assert.deepEqual(agents.bob._search._neighbors.out, {});
// 
//       return messaging.flush();
//     }).then(messagesSent => {
//       assert.deepEqual(messagesSent, [
//         {
//           fromNick: 'alice',
//           msg: stringify({
//             protocol: protocolVersions.routing,
//             msgType: 'update-status',
//             currency: 'USD',
//             value: false,
//           }),
//           toNick: 'bob'
//         },
//       ]);
// 
//       // TODO: not access private vars here
//       assert.deepEqual(agents.alice._search._neighbors['in'], {});
//       assert.deepEqual(agents.alice._search._neighbors.out, { '["bob","USD"]': { awake: false } });
//       assert.deepEqual(agents.bob._search._neighbors['in'], { '["alice","USD"]': { awake: false } });
//       assert.deepEqual(agents.bob._search._neighbors.out, {});
// 
//       agents.bob.sendIOU('alice', 0.02, 'USD');
//       return messaging.flush();
//     }).then(messagesSent => {
//       assert.deepEqual(messagesSent, [
//         {
//           fromNick: 'bob',
//           msg: stringify({
//             protocol: protocolVersions.ledger,
//             msgType: 'initiate-update',
//             transactionId: 'token-1',
//             debtor: 'bob',
//             note: 'IOU sent from bob to alice on the now time',
//             addedDebts: {
//               USD: 0.02,
//             },
//           }),
//           toNick: 'alice'
//         },
//       ]);
//       // Alice has switched Bob to be debtor, but Bob still has Alice as debtor too:
//       assert.deepEqual(agents.alice._search._neighbors['in'], { '["bob","USD"]': { awake: false } });
//       assert.deepEqual(agents.alice._search._neighbors.out, {});
//       assert.deepEqual(agents.bob._search._neighbors['in'], { '["alice","USD"]': { awake: false } });
//       assert.deepEqual(agents.bob._search._neighbors.out, {});
// 
//       return messaging.flush();
//     }).then(messagesSent => {
//       assert.deepEqual(messagesSent, [
//         {
//           fromNick: 'alice',
//           msg: stringify({
//             protocol: protocolVersions.ledger,
//             msgType: 'confirm-update',
//             transactionId: 'token-1',
//           }),
//           toNick: 'bob'
//         },
//         {
//           fromNick: 'alice',
//           msg: stringify({
//             protocol: protocolVersions.routing,
//             msgType: 'update-status',
//             currency: 'USD',
//             value: false,
//           }),
//           toNick: 'bob'
//         },
//       ]);
//       // Now both Alice and Bob have updated the debt direction between them:
//       assert.deepEqual(agents.alice._search._neighbors['in'], { '["bob","USD"]': { awake: false } });
//       assert.deepEqual(agents.alice._search._neighbors.out, {});
//       assert.deepEqual(agents.bob._search._neighbors['in'], {});
//       assert.deepEqual(agents.bob._search._neighbors.out, { '["alice","USD"]': { awake: false } });
// 
//       return messaging.flush();
//     }).then(messagesSent => {
//       assert.deepEqual(messagesSent, [
//         {
//           fromNick: 'bob',
//           msg: stringify({
//             protocol: protocolVersions.routing,
//             msgType: 'update-status',
//             currency: 'USD',
//             value: false,
//           }),
//           toNick: 'alice'
//         },
//       ]);
//       assert.deepEqual(agents.alice._search._neighbors['in'], { '["bob","USD"]': { awake: false } });
//       assert.deepEqual(agents.alice._search._neighbors.out, {});
//       assert.deepEqual(agents.bob._search._neighbors['in'], {});
//       assert.deepEqual(agents.bob._search._neighbors.out, { '["alice","USD"]': { awake: false } });
// 
//       return messaging.flush();
//     }).then(messagesSent => {
//       assert.deepEqual(messagesSent, []);
//       assert.deepEqual(agents.alice._search._neighbors['in'], { '["bob","USD"]': { awake: false } });
//       assert.deepEqual(agents.alice._search._neighbors.out, {});
//       assert.deepEqual(agents.bob._search._neighbors['in'], {});
//       assert.deepEqual(agents.bob._search._neighbors.out, { '["alice","USD"]': { awake: false } });
// 
//       agents.alice.sendIOU('bob', 0.01, 'USD');
//       return messaging.flush();
//     }).then(messagesSent => {
//       assert.deepEqual(messagesSent, [
//         {
//           fromNick: 'alice',
//           msg: stringify({
//             protocol: protocolVersions.ledger,
//             msgType: 'initiate-update',
//             transactionId: 'token-2',
//             debtor: 'alice',
//             note: 'IOU sent from alice to bob on the now time',
//             addedDebts: {
//               USD: 0.01,
//             },
//           }),
//           toNick: 'bob'
//         },
//       ]);
//       // Bob has removed Alice as a neighbor, but Alice is still waiting for confirm-update
//       assert.deepEqual(agents.alice._search._neighbors['in'], { '["bob","USD"]': { awake: false } });
//       assert.deepEqual(agents.alice._search._neighbors.out, {});
//       assert.deepEqual(agents.bob._search._neighbors['in'], {});
//       assert.deepEqual(agents.bob._search._neighbors.out, {});
// 
//       return messaging.flush();
//     }).then(messagesSent => {
//       // Bob assumes Alice will delete him as a neighbor after his confirm-update
//       // message which brings their debt to zero, so he doesn't send
//       // a update-status message anymore:
//       assert.deepEqual(messagesSent, [
//         {
//           fromNick: 'bob',
//           msg: stringify({
//             protocol: protocolVersions.ledger,
//             msgType: 'confirm-update',
//             transactionId: 'token-2',
//           }),
//           toNick: 'alice'
//         },
//       ]);
//       // Now Alice also removed Bob as a neighbor:
//       assert.deepEqual(agents.alice._search._neighbors['in'], {});
//       assert.deepEqual(agents.alice._search._neighbors.out, {});
//       assert.deepEqual(agents.bob._search._neighbors['in'], {});
//       assert.deepEqual(agents.bob._search._neighbors.out, {});
// 
//       return messaging.flush();
//     }).then(messagesSent => {
//       assert.deepEqual(messagesSent, []);
//     });
//   });
// });
// 
// describe('Cycle Detection', function() {
//   afterEach(function() {
//     messaging.discardQueue();
//   });
//   var agents = {
//     charlie: new Agent('charlie'),
//     daphne: new Agent('daphne'),
//     edward: new Agent('edward'),
//     fred: new Agent('fred'),
//     geraldine: new Agent('geraldine'),
//   };
//   it('agents on a cycle should stay active, others not', function() {
//     agents.fred.sendIOU('edward', 0.01, 'USD');
//     agents.edward.sendIOU('charlie', 0.01, 'USD');
//     agents.daphne.sendIOU('edward', 0.01, 'USD');
//     // F -> E -> C
//     //     ^
//     //    /
//     //   D
//     return messaging.flush().then(messagesSent => {
//       assert.deepEqual(messagesSent, [
//         {
//           fromNick: 'fred',
//           msg: stringify({
//             protocol: protocolVersions.ledger,
//             msgType: 'initiate-update',
//             transactionId: 'token-3',
//             debtor: 'fred',
//             note: 'IOU sent from fred to edward on the now time',
//             addedDebts: {
//               USD: 0.01,
//             },
//           }),
//           toNick: 'edward'
//         },
//         {
//           fromNick: 'edward',
//           msg: stringify({
//             protocol: protocolVersions.ledger,
//             msgType: 'initiate-update',
//             transactionId: 'token-4',
//             debtor: 'edward',
//             note: 'IOU sent from edward to charlie on the now time',
//             addedDebts: {
//               USD: 0.01,
//             },
//           }),
//           toNick: 'charlie'
//         },
//         {
//           fromNick: 'daphne',
//           msg: stringify({
//             protocol: protocolVersions.ledger,
//             msgType: 'initiate-update',
//             transactionId: 'token-5',
//             debtor: 'daphne',
//             note: 'IOU sent from daphne to edward on the now time',
//             addedDebts: {
//               USD: 0.01,
//             },
//           }),
//           toNick: 'edward'
//         },
//       ]);
// 
//       return messaging.flush();
//     }).then(messagesSent => {
//       assert.deepEqual(messagesSent, [
//         {
//           fromNick: 'edward',
//           msg: stringify({
//             protocol: protocolVersions.ledger,
//             msgType: 'confirm-update',
//             transactionId: 'token-3',
//           }),
//           toNick: 'fred'
//         },
//         // Generated in response to first IOU, when Edward is still dead-end:
//         {
//           fromNick: 'edward',
//           msg: stringify({
//             protocol: protocolVersions.routing,
//              msgType: 'update-status',
//              currency: 'USD',
//              value: false,
//           }),
//           toNick: 'fred'
//         },
// 
//         {
//           fromNick: 'charlie',
//           msg: stringify({
//             protocol: protocolVersions.ledger,
//             msgType: 'confirm-update',
//             transactionId: 'token-4',
//           }),
//           toNick: 'edward'
//         },
//         {
//           fromNick: 'charlie',
//           msg: stringify({
//             protocol: protocolVersions.routing,
//             msgType: 'update-status',
//             currency: 'USD',
//             value: false,
//           }),
//           toNick: 'edward'
//         },
// 
//         {
//           fromNick: 'edward',
//           msg: stringify({
//             protocol: protocolVersions.ledger,
//             msgType: 'confirm-update',
//             transactionId: 'token-5',
//           }),
//           toNick: 'daphne'
//         },
//         // Generated before Edward got a confirm-update from Charlie, so for the moment he's still a dead-end:
//         {
//           fromNick: 'edward',
//           msg: stringify({
//             protocol: protocolVersions.routing,
//              msgType: 'update-status',
//              currency: 'USD',
//              value: false,
//           }),
//           toNick: 'daphne'
//         },
//       ]);
// 
//       return messaging.flush();
//     }).then(messagesSent => {
//       assert.deepEqual(messagesSent, [
//         // Fred responding to Edward's confirm-update, before seeing Edward's GO_TO_SLEEP msg:
//         {
//           fromNick: 'fred',
//           msg: stringify({
//             protocol: protocolVersions.routing,
//             msgType: 'update-status',
//             currency: 'USD',
//             value: false,
//           }),
//           toNick: 'edward'
//         },
//         // Edward waking up Fred because of Charlie's confirm-update:
//         {
//           fromNick: 'edward',
//           msg: stringify({
//             protocol: protocolVersions.routing,
//             msgType: 'update-status',
//             currency: 'USD',
//             value: true,
//           }),
//           toNick: 'fred'
//         },
//         // Edward waking up Daphne because of Charlie's confirm-update:
//         {
//           fromNick: 'edward',
//           msg: stringify({
//             protocol: protocolVersions.routing,
//             msgType: 'update-status',
//             currency: 'USD',
//             value: true,
//           }),
//           toNick: 'daphne'
//         },
//         // Daphne and Fred will not generate new messages in response to Edward's GO_TO_SLEEPs which followed his confirm-updates
//         // However, Edward should send 'false alarm' to Fred and Daphne, because of Charlie's GO_TO_SLEEP which followed his confirm-update:
//         {
//           fromNick: 'edward',
//           msg: stringify({
//             protocol: protocolVersions.routing,
//             msgType: 'update-status',
//             currency: 'USD',
//             value: false,
//           }),
//           toNick: 'fred'
//         },
//         {
//           fromNick: 'edward',
//           msg: stringify({
//             protocol: protocolVersions.routing,
//             msgType: 'update-status',
//             currency: 'USD',
//             value: false,
//           }),
//           toNick: 'daphne'
//         },
//         // Daphne responding to Edward's confirm-update:
//         {
//           fromNick: 'daphne',
//           msg: stringify({
//             protocol: protocolVersions.routing,
//             msgType: 'update-status',
//             currency: 'USD',
//             value: false,
//           }),
//           toNick: 'edward'
//         },
//       ]);
// 
//       return messaging.flush();
//     }).then(messagesSent => {
//       assert.deepEqual(messagesSent, [
//         {
//           fromNick: 'fred',
//           msg: stringify({
//             protocol: protocolVersions.routing,
//             msgType: 'update-status',
//             currency: 'USD',
//             value: false,
//           }),
//           toNick: 'edward'
//         },
//         {
//           fromNick: 'daphne',
//           msg: stringify({
//             protocol: protocolVersions.routing,
//             msgType: 'update-status',
//             currency: 'USD',
//             value: false,
//           }),
//           toNick: 'edward'
//         },
//       ]);
// 
//       // FIXME: not access private vars here:
//       assert.equal(agents.charlie._search._awake, false);
//       assert.equal(agents.daphne._search._awake, false);
//       assert.equal(agents.edward._search._awake, false);
//       assert.equal(agents.fred._search._awake, false);
// 
//       agents.charlie.sendIOU('daphne', 0.01, 'USD');
//       // F -> E -> C
//       //     ^    /
//       //    /    /
//       //   D  <--
// 
//       return messaging.flush();
//     }).then(messagesSent => {
//       assert.deepEqual(messagesSent, [
//         {
//           fromNick: 'charlie',
//           msg: stringify({
//             protocol: protocolVersions.ledger,
//             msgType: 'initiate-update',
//             transactionId: 'token-6',
//             debtor: 'charlie',
//             note: 'IOU sent from charlie to daphne on the now time',
//             addedDebts: {
//               USD: 0.01,
//             },
//           }),
//           toNick: 'daphne',
//         },
//       ]);
// 
//       return messaging.flush();
//     }).then(messagesSent => {
//       assert.deepEqual(messagesSent, [
//         {
//           fromNick: 'daphne',
//           msg: stringify({
//             protocol: protocolVersions.ledger,
//             msgType: 'confirm-update',
//             transactionId: 'token-6',
//           }),
//           toNick: 'charlie'
//         },
//         {
//           fromNick: 'daphne',
//           msg: stringify({
//             protocol: protocolVersions.routing,
//             msgType: 'update-status',
//             currency: 'USD',
//             value: true,
//           }),
//           toNick: 'edward'
//         },
//       ]);
// 
//       return messaging.flush();
//     }).then(messagesSent => {
//       assert.deepEqual(messagesSent, [
//         {
//           fromNick: 'charlie',
//           msg: stringify({
//             protocol: protocolVersions.routing,
//             msgType: 'update-status',
//             currency: 'USD',
//             value: true,
//           }),
//           toNick: 'edward'
//         },
//         {
//           fromNick: 'edward',
//           msg: stringify({
//             protocol: protocolVersions.routing,
//             msgType: 'update-status',
//             currency: 'USD',
//             value: true,
//           }),
//           toNick: 'charlie'
//         },
//       ]);
//       // Now, the network goes quiet...:
// 
//       return messaging.flush();
//     }).then(messagesSent => {
//       assert.deepEqual(messagesSent, [
//       ]);
// 
//       return messaging.flush();
//     }).then(messagesSent => {
//       assert.deepEqual(messagesSent, [
//       ]);
// 
//       return messaging.flush();
//     }).then(messagesSent => {
//       assert.deepEqual(messagesSent, [
//       ]);
// 
//       return messaging.flush();
//     }).then(messagesSent => {
//       assert.deepEqual(messagesSent, [
//       ]);
// 
//       return messaging.flush();
//     }).then(messagesSent => {
//       assert.deepEqual(messagesSent, [
//       ]);
// 
//       // But this cycle has been detected:
//       //
//       // F -> E -> C
//       //     ^    /
//       //    /    /
//       //   D  <--
// 
//       // FIXME: not access private vars here:
//       // not in the cycle:
//       assert.equal(agents.fred._search._awake, false);
//       // in the cycle:
//       assert.equal(agents.charlie._search._awake, true);
//       assert.equal(agents.daphne._search._awake, true);
//       assert.equal(agents.edward._search._awake, true);
//     });
//   });
// });
