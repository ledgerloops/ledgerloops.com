var debug = require('./debug');
var Agent = require('./agents');
var messaging = require('./messaging');

var agents = {
  alice: new Agent('alice'),
  bob: new Agent('bob'),
  charlie: new Agent('charlie'),
};

// in this demo, all agents live within the same nodejs process, and send
// messages to each other through src/simulator.js.
// in a real-world implementation, agents would run on different computers,
// and communicate through whatever secure peer-to-peer channels they have
// (the communications layer, including peer discovery, is currently still
// out-of-scope, but could be provided by plugins in later versions of this
// library).

debug.setLevel(true);

messaging.autoFlush();

agents.alice.sendIOU('bob', 0.1, 'USD');
// alice will notify bob, and both will update their peer ledger.
agents.bob.sendIOU('charlie', 0.1, 'USD');
agents.charlie.sendIOU('alice', 0.1, 'USD');
// at this point, charlie will notify alice, and alice can use her credit with charlie to settle her debt with bob.
// each agent only knows, only interacts with, and only trusts their own direct debtors and creditors.
// Yet the network can still find a second-order promise loop where all peer-to-peer debts are settled.
// See console output for a log of the messages each agent sends in the process.
