var debug = require('./debug');
var Agent = require('./agents');

var agents = {
  alice: new Agent('alice'),
  bob: new Agent('bob'),
  charlie: new Agent('charlie'),
  daphne: new Agent('daphne'),
  edward: new Agent('edward'),
  fred: new Agent('fred'),
  geraldine: new Agent('geraldine'),
};

// in this demo, all agents live within the same nodejs process, and send
// messages to each other through src/simulator.js.
// in a real-world implementation, agents would run on different computers,
// and communicate through whatever secure peer-to-peer channels they have
// (the communications layer, including peer discovery, is currently still
// out-of-scope, but could be provided by plugins in later versions of this
// library).

agents.alice.sendIOU('bob', 0.01, 'USD');
// alice will notify bob, and both will update their peer ledger.
agents.bob.sendIOU('charlie', 0.01, 'USD');
agents.charlie.sendIOU('daphne', 0.01, 'USD');
agents.daphne.sendIOU('edward', 0.01, 'USD');
agents.edward.sendIOU('fred', 0.01, 'USD');
agents.fred.sendIOU('geraldine', 0.01, 'USD');
agents.geraldine.sendIOU('alice', 0.01, 'USD');
// at this point, geraldine will notify alice, and alice can use her credit with geraldine to settle her debt with bob.
// note that alice does not know about the existence of charlie, daphne, edward, and fred.
// each agent only knows, only interacts with, and only trusts their own direct debtors and creditors.
// Yet the network can still find a second-order promise loop where all peer-to-peer debts are settled.
// See console output for a log of the messages each agent sends in the process.
