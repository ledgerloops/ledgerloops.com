var Db = function() {
  this._data = {};
};

Db.prototype.store = function(key, value) {
  this._data[key] = value;
  return Promise.resolve();
};

Db.prototype.retrieve = function(key) {
  return Promise.resolve(this._data[key]);
};

Db.prototype.list = function(prefix, callback) {
  var promises = [];
  for (var key in this._data) {
    if (key.substr(prefix.length) === prefix) {
      promises.push(callback(key, value));
    }
  }
  return Promise.all(promises);
};

var db = new Db();

const TASKS = 'TASK_';
const IDENTITIES = 'IDENTITY_';

function createTaskDescription(taskTxt) {
  var taskIdentifier = crypto.createRandomBytes(60).toString('base64');
  return db.store(TASKS+taskIdentifier, taskTxt).then(() => {
    return taskIdentifier;
  });
}

function generateKeyPair() {
  // TODO: implement
  return Promise.resolve(
    crypto.createRandomBytes(1024).toString('base64'),
    crypto.createRandomBytes(256).toString('base64'),
  );
}

function createIdentity() {
  return generateKeyPair().then((pubkey, privkey) => {
    return db.store(IDENTITY+pubkey, {
      owner: 'ME',
      pubkey,
      privkey, //FIXME: when adding persistence to Db (or maybe even when not), will need to encrypt this at rest
    });
  }).then(() => {
    return pubkey;
  });
}

function rememberIdentity(peer, pub) {
  return db.store(IDENTITY+pub, {
    owner: peer,
    pub,
  });
}

function ifSignatureCorrect(obj, signature) {
  var canonical = JSON.stringify({ pubkey: obj.pubkey, task: obj.task, conditions: obj.conditions });
  // TODO: implement
  return Promise.resolve(true);
}

// unlike in the current version of the whitepaper, conditions are OR
// rather than AND.
// unconditional is expressed as conditions === [ true ].
function rememberPromise(peer, pubkey, task, conditions, signature) {
  return ifSignatureCorrect({ pubkey, task, conditions }, signature).then(() => {
    db.store(PROMISES+signature, {
      peer,
      pubkey,
      task,
    });
  });
});

// FIXME: find a better name for Second Order Promise Object
function Sopo(peer, pubkey, task) {
  this._peer = peer;
  this._pubkey = pubkey;
  this._task = task;
  this._conditions = [];
}

Sopo.prototype.addCondition = function(pubkey, task) {
  this._conditions.push({ pubkey, task });
  return Promise.resolve();
});

Sopo.prototype.sign = function() {
  return db.retrieve(IDENTITY+this._pubkey).then((identityObj) => {
    if (identityObj === 'undefined') {
      Promise.reject('Don\'t have an identity for that pubkey in the database!');
    }
    if (identityObj.owner !== 'ME') {
      Promise.reject('You are not the owner of the identity behind the pubkey of this promise! Was it made by a peer instead of you?');
    }
    return createSignature({ pubkey: this._pubkey, task: this._task, conditions: this._conditions }, identityObj.privkey);
  }).then((sig) => {
    this._signature = sig;
  });
};

function onReceivePromise(peer, peerPubkey, peerTaskId, peerSig, taskTxt) {
  if (worthFixingBicycleInExchange(peer, taskTxt) {
    createIdentity.then(pubkey => {
      createTaskDescription('fix a bicycle').then(taskId => {
        var sopo = new Sopo('neighbor', pubkey, taskId);
        return sopo.addCondition(peerPubKey, peerTaskId).then(() => {
          return sopo.sign();
        }).then(() => {
          return sopo;
        });
      });
    });
  } else {
    return db.store(PROMISES+peerSig, { peer, peerTaskId, peerSig, taskTxt }).then(() => {
      return 'received promise was stored, but did not find it worth promising to fix a bicycle in echange';
    });
  }
};

datastructure:
* list of peers, for each peer (key: nickname):
  * way to message them
  * proposed tasks for them, with for each:
    * one-time keypair for this task
    * list of conditions [ { pubkey, taskId, mySig  } ]
  * proposed tasks from them, with for each:
    * one-time pubkey for this task
    * list of conditions [ { pubkey, taskId, theirSig } ]
* list of trades:
    * taskId you are interested in
    * taskId you will perform in exchange

//                                                                                                           (taskDescr, taskId, oneTimePubKey)
// actions:                                                                                                                     |
// * addPeer(nickname, wayToMessage)                                                                                            v
// * defineTaskForPeer(nickname, taskDescr) -> taskId // one-time keypair & taskId are gen., prop. stored, peer.wayToMessage(taskObj) is called
// * addConditionalPromise(taskId, conditionTaskId, conditionPubKey) // signature is generated, peer.wayToMessage(promiseObj) is called
// * commitPromise(taskId) // signature is generated, message is sent (taskId, keypair.pub, true, mySig)                  ^
// * onTaskFromPeer(nickname, taskObj) // taskObj is added to that peer's 'proposed tasks from'                           |
// * onPromiseFromPeer(nickname, promiseObj) // promise is added to list of conditions for that task,                     (taskId, keypair.pub,
//                                           // think1(promiseObj) is called.                               [conditionTaskId, conditionPubKey],
//                                                                                                                                       mySig)
// * linkTasks(requestedTaskId, offeredTaskId) -> added to list of trades, think2(requestedTaskId, offeredTaskId) is called.
//
// think1(promiseObj) function:
// for each entry in list of trades where requestedTask === promiseObj.taskId, take the offeredTask;
//   * add promiseObj.condition to the offeredTask (messages are automatically sent)
//
// think2(requestedTaskId, offeredTaskId) function:
// * take the conditions of the requestedTask
// * add them to the offeredTask (messages are automatically sent)

problem: if you are interested in these trades:
* request apple, offer orange
* request apple, offer banana
* request pear, offer orange
then sending both "i will give an orange if I get an apple" and "i will give a banana if I get an apple" will endebt you for both an orange
and a banana if you get promised an apple, and that is not what you meant: you meant "i will give either an orange or a banana if I get an apple". you may also prefer the pear over the apple, i.e. only accept the apple of the pear is truly unavailable.

maybe the easiest way to solve this is to strictly separate search from negotiation: first, you send "I *might* be willing to give ... if ...",
and only if a candidate loop is found, you can temporarily make the statement.

the search problem may be easier to solve for debt clearance than for trade negotiation: you would only indicate which identity owes you "something", and which identity you owe "something". the promise loop could then always be for 1 US dollar or a similar small unit in a given currency (conversion rates could also be handled automatically while writing down the change in each peer-to-peer ledger).

so you might first have a system of peer-to-peer ledgers:

var peers = {
  'james': {
    debtor: 'mike',
    creditor: 'james',
    wayToMessagePeer: function(txt) { ... },
    ledger: {
      debts: {
        'EUR':  -8,
      },
      history: [
        {
          note: 'Settle dinner bill Fri 01/01/2016',
          addedDebts: {
            'USD': -10,
          },
        },
        {
          note: 'Same-peer settlement 01/01/2016 (1 USD = 0.8 EUR)',
          addedDebts: {
            'USD': 10,
            'EUR': -8,
          },
        },
      ],
    },
  },
};

samePeerSettlement('james', 'USD', 10, 'EUR', 8), '01/01/2016');


function updateLedger(peerNickname, historyEntry) {
  if (typeof peers[peerNickname] === 'undefined') {
    throw new Error('unkown peer');
  }
  for (var currency in historyEntry.addedDebts) {
    var addedDebt = historyEntry.addedDebts[i];
    if (typeof peers[peerNickname].debts[currency] === 'undefined') {
      peers[peerNickname].debts[currency] = 0;
    }
    peers[peerNickname].debts[currency] += historyEntry.addedDebts[currency];
    if (peers[peerNickname].debts[currency] === 0) {
      delete peers[peerNickname].debts[currency];
    }
  }
  peers[peerNickname].ledger.history.push(historyEntry);
}

function samePeerSettlement(peerNickname, currencyMyDebtGrowsIn, amountMyDebtGrowsThere, currencyMyDebtShrinksIn, amountMyDebtShrinksThere,
                            dateStr) {
  var exchangeRate = amountMyDebtShrinksThere / amountMyDebtGrowsThere;
  var historyEntry =  {
    note: `Same-peer settlement ${dateStr} (1 ${currencyMyDebtGrowsIn} = ${exchangeRate} ${currencyMyDebtShrinksIn})`,
    addedDebts: {},
  };

  if (peers[peerNickname].debtor === peerNickname) {
    historyEntry.addedDebts[currencyMyDebtGrowsIn] = -amountMyDebtGrowsThere;
    historyEntry.addedDebts[currencyMyDebtShrinksIn] = amountMyDebtShrinkssThere;
  } else { // I am the debtor
    historyEntry.addedDebts[currencyMyDebtGrowsIn] = amountMyDebtGrowsThere;
    historyEntry.addedDebts[currencyMyDebtShrinksIn] = -amountMyDebtShrinkssThere;
  }
  updateLedger(peerNickname, historyEntry);
  var msg = {
    msgType: 'same-peer-settlement',
    debtor: peers[peerNickname].debtor,
    creditor: peers[peerNickname].debtor,
    historyEntry: {},
    updatedDebts: peers[peerNickname].debts,
  };
}

function getCreditors() {
}
function getDebtors() {
}
function proposeLocalTrade(creditor, debtor) {
  createOneTimeIdentity(creditor);
  createTaskDescription(creditor);
  choosePrices(creditorCurrencies, debtorCurrencies);
  offerToDebtor(id, task, prices, debtor);
}

function onOfferFromCreditor(creditor, offerId, offerTask, offerPrices) {
  addToOffersList(offerId, offerTask, offerPrice, creditor);
  if (offerWasMine(offerId, offerTask) && priceIsGood(offerPrices)) {
    accept(offerId, offerTask, creditor, currency);
  } else {
    // forward to own debtors
  }
}

function Wallet() {
}

wallet.prototype.addDebt = function(peer, amount, unit) {
};

wallet.prototype.addCredit = function(peer, amount, unit) {
;

wallet.prototype.setExchangeRate = function(fromUnit, toUnit, factor) {
};

wallet.prototype.think = function() {
};

function Peer(nickname, wayToContact, onMessage) {
  this.nickname = nickname;
  this.wayToContact = wayToContact;
  onMessage(this.handleMessage.bind(this));
}

peer.prototype.offerObligation = function(obligation, price, unit) {
  peer.wayToMessage(obligation.getDecoderMessage());  
};

peer.prototype.offerObligation = function(obligation, price, unit) {
  
};

function Obligation(creditor, amount, unit) {
  this.creditor = creditor;
  this.amount = amount;
  this.unit = unit;
  this.keypair = null;
  this.codename = null;
}

Obligation.prototype.ensureReady = function() {
  if (this.ready) {
    return Promise.resolve();
  }
  return generateKeyPair().then((pub, priv) => {
    this.keypair = { pub, priv };
    return generateCodename();
  }).then((codename) => {
    this.codename = codename;
    this.ready = true;
  });
});

Obligation.prototype.getDecoderMessage = function() {
  return this.ensureReady().then(() => {
    return new DecoderMessage(this);
  });
};

Obligation.prototype.getEncodedMessage = function() {
  return this.ensureReady().then(() => {
    return new EncodedMessage(this);
  });
};

  }).then((decoderMessage) => {
    this.creditor.wayToContact(decoderMessage);


// step 1:
* simulator for wayToConcact / on Message
* unit test to create a few peers and send some message

// step 2:
* peerDebts

// step 3:
* (amount, unit, peerNick, myNick) -> message containing newly generated keypair and task id

// step 4: searchSettlement
* 
