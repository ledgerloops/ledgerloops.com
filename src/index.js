var debug = require('./debug');
var Agent = require('./agents');
var messaging = require('./messaging');

var agents = {
};

function ensureAgent(nick) {
  if (typeof agents[nick] === 'undefined') {
    agents[nick] = new Agent(nick);
  }
}

debug.setLevel(true);

messaging.autoFlush();

function sendIOU(from, to, amount, currency) {
  [from, to].map(nick => {
    ensureAgent(nick);
  });
  agents[from].sendIOU(to, amount, currency);
}

if (typeof window !== 'undefined') {
  window.agents = agents;
  debug.log('See window.agents.alice._ledgers');
}

function displayLedger(ledger) {
  if (typeof ledger._debts.USD === 'undefined') {
    return `Quits`;
  }
  return `${ledger._debts.USD.debtor} now owes ${(Math.floor(100*ledger._debts.USD.amount+0.5))/100}`;
}

function displayAgents() {
  var html = '';
  for (var nick in agents) {
    html += `<p>${nick}:</p><ul>`;
    for (var neighbor in agents[nick]._ledgers) {
      html += `<li>Ledger with ${neighbor}: ${displayLedger(agents[nick]._ledgers[neighbor])}</li>`;
    }
    html += `</ul>`;
  }
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
  sendIOU(from, to, amount, 'USD');
}

function pickButton(actor) {
  var nicks = [
    'Mia',
    'Vincent',
    'Pumpkin',
    'Honeybunny',
    'Jules',
    'Butch',
    'Marsellus',
    'Jody',
    'Lance',
  ];
  document.getElementById(actor).value = nicks[Math.floor(Math.random()*nicks.length)];
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

document.getElementById('send-10').onclick = function() {
  sendButton(0.10);
};

document.getElementById('send-100').onclick = function() {
  sendButton(1.00);
};


sendIOU('Alice', 'Bob', 1, 'USD');
sendIOU('Bob', 'Charlie', 1, 'USD');
sendIOU('Charlie', 'Alice', 1, 'USD');
setInterval(displayAgents, 1000);
