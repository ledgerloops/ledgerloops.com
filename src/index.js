var simulator = require('./simulator');
var Agent = require('./agents');

var agents = {
};

function react(agentNick, debtorNick, creditorNick, senderPeerType, text) {
  console.log('react', agentNick, debtorNick, creditorNick, senderPeerType, text);
  return agents[agentNick].generateReactions(text, senderPeerType).then((reactions) => {
    console.log(reactions);
    for (var i=0; i<reactions.length; i++) {
      if (reactions[i].to === 'debtor') {
        simulator.simulateMessage(agentNick, debtorNick, reactions[i].msg);
      } else {
        simulator.simulateMessage(agentNick, creditorNick, reactions[i].msg);
      }
    }
  });
}

function connectEngine(agentNick, debtorNick, creditorNick) {
  simulator.setMessageHandler(agentNick, function(fromNick, text) {
    console.log(`${agentNick} received this message from ${fromNick}: ${text}`);
    var senderPeerType = (fromNick === debtorNick ? 'debtor' : 'creditor');
    react(agentNick, debtorNick, creditorNick, senderPeerType, text);
  });
}

function createAgents(nicks) {
  for (var i=0; i<nicks.length; i++) {
    simulator.addAgent(nicks[i]);
    agents[nicks[i]] = new Agent();
  }
}


//...
// set up simulator:
createAgents(['alice', 'bob', 'charlie', 'daphne', 'edward', 'fred', 'geraldine']);

// define who knows who (these connections are symmetrical in the simulator):
simulator.addConnection('alice', 'bob');
simulator.addConnection('bob', 'charlie');
simulator.addConnection('charlie', 'daphne');
simulator.addConnection('daphne', 'edward');
simulator.addConnection('edward', 'fred');
simulator.addConnection('fred', 'geraldine');
simulator.addConnection('geraldine', 'alice');


// Let's say Alice owes Bob owes ... owes Geraldine owes Alice 0.01 USD.
// That means Alice's creditor (to whom she owes) is Bob, and Alice's debtor (who owes her) is Geraldine.

// define who owes, and initialize each agent:
            //	agent:		debtor:		creditor:
connectEngine(	'alice',	'geraldine',	'bob');
connectEngine(	'bob',		'alice',	'charlie');
connectEngine(	'charlie',	'bob',	     	'daphne');
connectEngine(	'daphne',      	'charlie',   	'edward');
connectEngine(	'edward',      	'daphne',    	'fred');
connectEngine(	'fred',        	'edward',    	'geraldine');
connectEngine(	'geraldine',   	'fred',      	'alice');

// Not really a reaction, but hack to tell Alice to kickstart the process:
react('alice', 'geraldine', 'bob', undefined, '{}');
