var Agent = LedgerLoops.Agent;

var agents = {
};

function ensureAgent(nick) {
  if (typeof agents[nick] === 'undefined') {
    agents[nick] = new Agent(nick);
  }
}

function sendAdd(from, to, amount) {
  ensureAgent(from);
  ensureAgent(to);
  console.log('sendAdd calling addTransaction');
  agents[from].addTransaction(to, amount);
}

if (typeof window !== 'undefined') {
  window.agents = agents;
  console.log('See window.agents.alice._peerHandlers');
}

function displayAgents() {
  let html = '';
  for (let nick in agents) {
    html += `<h1>${nick} sees</h1><h2>Balances:</h2><ul>`;
    const balances = agents[nick].getBalances();
    for (let neighbor in balances) {
      html += `<li>${neighbor}: ${balances[neighbor].current} +(${balances[neighbor].payable}) -(${balances[neighbor].receivable})</li>`;
    }
    html += '</ul><h2>Committed Transactions:</h2><ul>';
    const transactions = agents[nick].getTransactions();
    for (let peerName in transactions) {
      for (let k in transactions[peerName]) {
        const entry = transactions[peerName][k].request;
        html += `<li><strong>Entry ${peerName} ${k}: ${entry.msgType} ${entry.amount} (${(entry.routeId + ' : ' + entry.condition).substring(0,50)})</strong></li>`;
      }
    }
    html += `</ul>`;
  }
  html += `</ul>`;
  document.getElementById('data').innerHTML = html;
}


function sendButton(amount) {
  var from = document.getElementById('sender').value;
  var to = document.getElementById('receiver').value;
  if (from.length === 0) {
    pickButton('sender');
    from = document.getElementById('sender').value;
  }
  if (to.length === 0) {
    pickButton('receiver');
    to = document.getElementById('receiver').value;
  }
  if (from === to) {
    window.alert('Receiver nick should be different from sender nick');
  } else {
    sendAdd(from, to, amount);
  }
}

function pickAgent(actor) {
  var nicks = [
    'Marsellus',
    'Mia',
    'Vincent',
    'Jules',
    'Pumpkin',
    'Honeybunny',
    'Butch',
    'Fabienne',
  ];
  return nicks[Math.floor(Math.random()*nicks.length)];
}

function pickAgents(num, have = []) {
  if (num === 0) {
    return have;
  }
  var newAgent = pickAgent();
  if (have.indexOf(newAgent) !== -1) {
    // try again to pick one we don't have yet:
    return pickAgents(num, have);
  }
  have.push(newAgent);
  return pickAgents(num-1, have);
}

function pickButton(actor) {
  document.getElementById(actor).value = pickAgent();
}

document.getElementById('pick-sender').onclick = function() {
  pickButton('sender');
};

document.getElementById('pick-receiver').onclick = function() {
  pickButton('receiver');
};

document.getElementById('switch').onclick = function() {
  var oldSender = document.getElementById('sender').value;
  document.getElementById('sender').value = document.getElementById('receiver').value;
  document.getElementById('receiver').value = oldSender;
};

document.getElementById('send-1').onclick = function() {
  sendButton(1);
};

document.getElementById('send-5').onclick = function() {
  sendButton(5);
};

var initialAgents = ['Mia', 'Vincent', 'Marsellus'];
setTimeout(() => sendAdd(initialAgents[0], initialAgents[1], 100), 0);   // Mia sends 100 to Vincent
setTimeout(() => sendAdd(initialAgents[1], initialAgents[2], 100), 100); // Vincent sends 100 to Marsellus
setTimeout(() => sendAdd(initialAgents[2], initialAgents[0], 100), 200); // Marsellus sends 100 to Mia`
setTimeout(() => {
  for (let agentName in agents) {
    agents[agentName]._loops.forwardProbes();
    agents[agentName]._loops.sendProbes();
  }
  displayAgents();
}, 1000);
setTimeout(() => {
  for (let agentName in agents) {
    agents[agentName]._loops.forwardProbes();
    agents[agentName]._loops.sendProbes();
  }
  displayAgents();
}, 2000);
setTimeout(() => {
  for (let agentName in agents) {
    agents[agentName]._loops.forwardProbes();
    agents[agentName]._loops.sendProbes();
  }
  displayAgents();
}, 3000);
setTimeout(() => {
  for (let agentName in agents) {
    agents[agentName]._loops.forwardProbes();
    agents[agentName]._loops.sendProbes();
  }
  displayAgents();
}, 4000);
